import os
import sys
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_BACKEND_ENV = os.path.join(_BASE_DIR, ".env")

class Settings(BaseSettings):
    """
    Strict DevSecOps settings configuration (Zero-Leak Posture).
    Validates that secrets are strictly loaded from environment variables or .env file.
    """
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(default=None, description="Supabase service role secret")
    SUPABASE_SERVICE_KEY: Optional[str] = Field(default=None, description="Legacy fallback for service key")
    SUPABASE_BUCKET: str = Field(default="product-images", description="Storage bucket name")
    
    OPENROUTER_API_KEY: str = Field(default="", description="OpenRouter API key for LLM queries")
    RESEND_API_KEY: str = Field(default="", description="Resend API key for transaction emails")
    FROM_EMAIL: str = Field(default="Vernacular AI <onboarding@resend.dev>", description="Sender email")

    ENVIRONMENT: str = Field(default="development", description="Current environment")
    TESTING: bool = Field(default=False, description="Whether running in test mode")

    model_config = SettingsConfigDict(
        env_file=(_BACKEND_ENV, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def effective_service_role_key(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_SERVICE_KEY or ""

    def validate_secrets(self) -> None:
        """
        Fail-fast validation for critical credentials.
        Aborts startup if any required secret is missing or set to a placeholder.
        """
        if self.TESTING or os.environ.get("TESTING", "").lower() in ("true", "1"):
            return

        missing = []
        if not self.SUPABASE_URL or "placeholder" in self.SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not self.effective_service_role_key or "placeholder" in self.effective_service_role_key:
            missing.append("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)")
        if not self.OPENROUTER_API_KEY or "placeholder" in self.OPENROUTER_API_KEY:
            missing.append("OPENROUTER_API_KEY")
        if not self.RESEND_API_KEY or "placeholder" in self.RESEND_API_KEY:
            missing.append("RESEND_API_KEY")

        if missing:
            msg = (
                "\n" + "=" * 80 + "\n"
                "CRITICAL DEVSECOPS SECURITY ERROR: MISSING REQUIRED BACKEND SECRETS\n"
                "=" * 80 + "\n"
                "Vernacular AI Zero-Leak Policy has blocked server execution.\n"
                "The following required secrets are missing or invalid in backend/.env:\n"
                + "".join(f"  - [FAIL] {item}\n" for item in missing)
                + "\nPlease populate backend/.env or your host environment with valid credentials.\n"
                "Do NOT attempt to hardcode secrets into Python source code.\n"
                + "=" * 80 + "\n"
            )
            print(msg, file=sys.stderr)
            raise RuntimeError(f"Zero-Leak Policy: Missing required backend secrets: {', '.join(missing)}")

settings = Settings()
