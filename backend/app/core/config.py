from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "NZCompanies API"
    API_V1_STR: str = "/api/v1"

    # Database - Load from environment variable
    # e.g. postgresql+psycopg://user:password@127.0.0.1:5432/nzcompanies
    DATABASE_URL: str

    # Comma-separated list of allowed CORS origins ("*" allows all)
    BACKEND_CORS_ORIGINS: str = "*"

    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
