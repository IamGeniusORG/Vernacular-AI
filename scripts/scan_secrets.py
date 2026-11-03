#!/usr/bin/env python3
"""
Automated DevSecOps Secret Scanner & Pre-Commit Enforcement Engine
Protects Vernacular AI from leaking API keys, credentials, JWTs, and environment files.
Can run in full workspace audit mode or staged pre-commit mode (--staged).
"""

import os
import re
import sys
import subprocess
from typing import List, Tuple, Set

# High-risk secret regex patterns
PATTERNS = [
    (re.compile(r"\bsb_secret_[a-zA-Z0-9_-]+\b"), "Supabase Service Role Key (sb_secret_...)"),
    (re.compile(r"\bsb_publishable_[a-zA-Z0-9_-]+\b"), "Supabase Publishable Key (sb_publishable_...)"),
    (re.compile(r"\bre_[a-zA-Z0-9_]{20,}\b"), "Resend API Key (re_...)"),
    (re.compile(r"\bsk-or-v1-[a-f0-9]{64}\b"), "OpenRouter Production Key (sk-or-v1-...)"),
    (re.compile(r"\bsk-[a-zA-Z0-9_-]{20,}\b"), "OpenAI/API Secret Key (sk-...)"),
    (re.compile(r"\bsk_test_[a-zA-Z0-9_-]+\b"), "Stripe Test Secret Key (sk_test_...)"),
    (re.compile(r"\bsk_live_[a-zA-Z0-9_-]+\b"), "Stripe Live Secret Key (sk_live_...)"),
    (re.compile(r"\beyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\b"), "Hardcoded JWT Token (eyJ...)"),
    (re.compile(r"\bAIza[0-9A-Za-z-_]{35}\b"), "Google Cloud / Gemini API Key (AIza...)"),
    (re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----"), "Private Key Header"),
]

# Directories to skip during full scans
SKIP_DIRS: Set[str] = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    ".next",
    "build",
    "out",
    "dist",
    "__pycache__",
    ".pytest_cache",
    ".husky",
}

# Explicitly allowed files / templates
ALLOWED_TEMPLATE_FILES: Set[str] = {
    ".env.example",
    "package-lock.json",
    "scan_secrets.py",
}

# Prohibited file extensions & patterns for commit
FORBIDDEN_FILE_PATTERNS = [
    re.compile(r"^\.env(\..+)?$", re.IGNORECASE),          # .env, .env.local, .env.production, etc.
    re.compile(r"\.(pem|key)$", re.IGNORECASE),              # Private keys / certs
    re.compile(r"(^|[\/\\]).*secret.*\.(json|yaml|yml|txt|toml)$", re.IGNORECASE),
    re.compile(r"\.(sqlite|sqlite3|dump|db)$", re.IGNORECASE) # Local SQLite/database dumps
]

SAFE_PLACEHOLDERS = [
    "your-",
    "your_",
    "placeholder",
    "example",
    "test-key",
    "xxx",
    "<your_",
    "your_supabase",
    "your_resend",
]

def is_safe_placeholder(line: str) -> bool:
    line_lower = line.lower()
    return any(p in line_lower for p in SAFE_PLACEHOLDERS)

def is_forbidden_filename(rel_path: str) -> Tuple[bool, str]:
    norm_path = rel_path.replace("\\", "/")
    filename = os.path.basename(norm_path)
    
    # Allow explicit example files
    if filename in ALLOWED_TEMPLATE_FILES:
        return False, ""
    
    for pattern in FORBIDDEN_FILE_PATTERNS:
        if pattern.search(filename) or pattern.search(norm_path):
            # Exempt tooling scripts
            if "scan_secrets" in filename:
                continue
            return True, f"Prohibited file type/name: '{rel_path}' matches {pattern.pattern}"
            
    return False, ""

def scan_file_contents(filepath: str, root_dir: str) -> List[Tuple[int, str, str]]:
    violations = []
    if not os.path.exists(filepath):
        return violations

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line_no, line in enumerate(f, start=1):
                if is_safe_placeholder(line):
                    continue
                for regex, rule_name in PATTERNS:
                    match = regex.search(line)
                    if match:
                        snippet = match.group(0)
                        # Avoid flagging safe placeholders that regex caught
                        if is_safe_placeholder(snippet):
                            continue
                        redacted = snippet[:6] + "..." + snippet[-4:] if len(snippet) > 10 else "***"
                        violations.append((line_no, rule_name, redacted))
    except Exception as e:
        # Binary or unreadable file
        pass
    return violations

def get_staged_files(root_dir: str) -> List[str]:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            cwd=root_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        return [f.strip() for f in result.stdout.splitlines() if f.strip()]
    except Exception as e:
        print(f"[!] Warning: Unable to inspect git index via git command: {e}")
        return []

def run_staged_scan(root_dir: str) -> int:
    staged_files = get_staged_files(root_dir)
    if not staged_files:
        print("[*] Pre-commit: No staged files to scan.")
        return 0

    print(f"[*] Pre-commit: Scanning {len(staged_files)} staged file(s) for secrets...")
    violations_count = 0

    for rel_path in staged_files:
        # Check forbidden file names
        forbidden, reason = is_forbidden_filename(rel_path)
        if forbidden:
            print(f"[!] SECURITY LEAK PREVENTED: Staging blocked for '{rel_path}' -> {reason}")
            violations_count += 1
            continue

        # Check file extension to skip binaries
        ext = os.path.splitext(rel_path)[1].lower()
        if ext in {".png", ".jpg", ".jpeg", ".ico", ".mp3", ".wav", ".pdf", ".zip", ".pyc", ".woff", ".woff2"}:
            continue

        abs_path = os.path.join(root_dir, rel_path)
        violations = scan_file_contents(abs_path, root_dir)
        for line_no, rule, snippet in violations:
            print(f"[!] LEAK DETECTED in staged file: {rel_path}:{line_no} -> {rule} [{snippet}]")
            violations_count += 1

    if violations_count > 0:
        print(f"\n[FAIL] PRE-COMMIT BLOCKED: Found {violations_count} secret(s) or forbidden file(s)!")
        print("Please remove secrets / untrack sensitive files before committing.")
        return 1

    print("[SUCCESS] PRE-COMMIT PASSED: Staged files are clean of secrets.")
    return 0

def run_workspace_scan(root_dir: str) -> int:
    print("[*] Running DevSecOps global secret audit across workspace...")
    total_violations = 0

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            filepath = os.path.join(root, f)
            rel_path = os.path.relpath(filepath, root_dir)

            forbidden, reason = is_forbidden_filename(rel_path)
            # In workspace scan, .env files exist locally on disk, but check if tracked by git
            if forbidden and not f.startswith(".env"):
                print(f"[!] UNTRACKED / FORBIDDEN FILE PRESENT: {rel_path} -> {reason}")
                total_violations += 1

            # Skip media and binary files
            ext = os.path.splitext(f)[1].lower()
            if ext in {".png", ".jpg", ".jpeg", ".ico", ".mp3", ".wav", ".pdf", ".zip", ".pyc", ".woff", ".woff2"}:
                continue

            # Skip local .env files from scanning during local workspace audit
            if f.startswith(".env") and not f.endswith(".example"):
                continue

            violations = scan_file_contents(filepath, root_dir)
            for line_no, rule, snippet in violations:
                print(f"[!] LEAK DETECTED: {rel_path}:{line_no} -> {rule} [{snippet}]")
                total_violations += 1

    if total_violations > 0:
        print(f"\n[FAIL] AUDIT FAILED: {total_violations} secret(s) detected across workspace!")
        return 1

    print("[SUCCESS] AUDIT PASSED: Zero secrets detected across workspace.")
    return 0

def main() -> int:
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if "--staged" in sys.argv:
        return run_staged_scan(root_dir)
    return run_workspace_scan(root_dir)

if __name__ == "__main__":
    sys.exit(main())
