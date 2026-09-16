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
    # Public origin of the site, used for absolute URLs in sitemaps.
    SITE_URL: str = "https://companies.aicloud.co.nz"

    # Admin page (/admin). Login stays disabled until ADMIN_PASSWORD is set.
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: Optional[str] = None
    # Signs admin session cookies; without it sessions end whenever the API restarts.
    ADMIN_SECRET_KEY: Optional[str] = None
    ADMIN_SESSION_HOURS: int = 12
    # Secure cookies are only sent over HTTPS; set to false for plain-http local development.
    ADMIN_COOKIE_SECURE: bool = True
    # Where bulk data uploaded through /admin is stored.
    DATA_DIR: str = "/data"

    # Contact details job: pause between requests to the Companies Office website, and how the
    # requests identify themselves.
    CO_WEB_DELAY_SECONDS: float = 3.0
    CO_WEB_USER_AGENT: str = "BIZInsight data enrichment (+https://companies.aicloud.co.nz)"

    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
