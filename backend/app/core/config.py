from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = "" # User added this
    SUPABASE_BUCKET: str = "product-images"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
