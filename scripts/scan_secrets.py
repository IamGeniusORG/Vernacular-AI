#!/usr/bin/env python3
"""
Automated DevSecOps Secret Scanner & Pre-Commit Validator
Prevents accidental commits of API keys, tokens, and service credentials.
"""

import os
import re
import sys

# Regex rules for high-risk secret patterns
PATTERNS = [
    (re.compile(r"sb_secret_[a-zA-Z0-9_-]{10,}"), "Supabase Secret Key (sb_secret_...)"),
    (re.compile(r"eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}"), "Hardcoded JWT Token"),
    (re.compile(r"sk-or-v1-[a-f0-9]{64}"), "OpenRouter Production API Key"),
    (re.compile(r"re_[a-zA-Z0-9_]{20,}"), "Resend Production API Key"),
    (re.compile(r"AIza[0-9A-Za-z-_]{35}"), "Google Service API Key"),
]

SKIP_DIRS = {
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
}

# Known safe files or ignored templates
SKIP_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "package-lock.json",
    "scan_secrets.py",  # self
}

SAFE_PLACEHOLDERS = [
    "your-",
    "your_",
    "placeholder",
    "example",
    "test-key",
]

def scan_file(filepath: str) -> list:
    violations = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line_no, line in enumerate(f, start=1):
                # Skip comments explaining placeholders
                if any(p in line.lower() for p in SAFE_PLACEHOLDERS):
                    continue
                for regex, rule_name in PATTERNS:
                    match = regex.search(line)
                    if match:
                        snippet = match.group(0)
                        violations.append((line_no, rule_name, snippet[:8] + "..." + snippet[-4:]))
    except Exception as e:
        pass
    return violations

def main() -> int:
    print("[*] Running DevSecOps secret leak audit...")
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    total_violations = 0

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if f in SKIP_FILES:
                continue
            # Skip media and binary files
            ext = os.path.splitext(f)[1].lower()
            if ext in {".png", ".jpg", ".jpeg", ".ico", ".mp3", ".wav", ".pdf", ".zip", ".pyc"}:
                continue

            filepath = os.path.join(root, f)
            rel_path = os.path.relpath(filepath, root_dir)
            violations = scan_file(filepath)
            for line_no, rule, snippet in violations:
                print(f"[!] LEAK DETECTED: {rel_path}:{line_no} -> {rule} [{snippet}]")
                total_violations += 1

    if total_violations > 0:
        print(f"\n[FAIL] AUDIT FAILED: {total_violations} secret(s) found! Commit blocked.")
        return 1

    print("[SUCCESS] AUDIT PASSED: Zero secrets detected across workspace.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
