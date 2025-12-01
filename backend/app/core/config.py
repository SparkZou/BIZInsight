from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "NZCompanies API"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "mysql+pymysql://root:38LRh430@139.180.167.165:3306/nzcompanies"
    
    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()
