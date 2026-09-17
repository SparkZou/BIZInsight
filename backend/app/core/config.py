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
    # Public origin of the site, used for absolute URLs in sitemaps and emails.
    SITE_URL: str = "https://companies.aicloud.co.nz"
    SITE_NAME: str = "NZ Company Intelligence"

    # Who runs the site - shown in the privacy statement, the terms and the footer.
    OPERATOR_NAME: str = "AICLOUD LIMITED"
    OPERATOR_EMAIL: str = "privacy@aicloud.co.nz"
    OPERATOR_ADDRESS: str = ""

    # Visitor accounts: how long a sign-in lasts, and the mailbox that sends verification and
    # password-reset links. With no SMTP_HOST the emails are only logged and addresses stay unverified.
    USER_SESSION_DAYS: int = 30
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None  # e.g. "NZ Company Intelligence <noreply@aicloud.co.nz>"
    SMTP_SSL: bool = False  # true for port 465 (implicit TLS); otherwise STARTTLS is used

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
