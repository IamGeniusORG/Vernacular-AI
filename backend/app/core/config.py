import os
from pydantic_settings import BaseSettings

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_BACKEND_ENV = os.path.join(_BASE_DIR, ".env")

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = "" # User added this
    SUPABASE_BUCKET: str = "product-images"

    class Config:
        env_file = (_BACKEND_ENV, ".env")
        extra = "ignore"

settings = Settings()
