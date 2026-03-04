"""
ARIA ERP - Configuration Management
"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "ARIA ERP"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_12345678901234567890"
    JWT_SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_12345678901234567890"
    JWT_REFRESH_SECRET_KEY: str = "CHANGE_THIS_REFRESH_SECRET_12345678901234567890"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str  # Must be set via environment variable or .env
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # File Upload
    MAX_FILE_SIZE_MB: int = 10
    UPLOAD_DIR: str = "./uploads"

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@aria-erp.com"

    # AI/OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4-turbo-preview"

    # Sentry
    SENTRY_DSN: str = ""

    # South Africa Specific
    SARS_API_URL: str = "https://api.sarsefiling.co.za"
    SARS_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # Allow extra environment variables


# Standalone function for CORS origins
def get_cors_origins(settings: 'Settings') -> List[str]:
    cors_origins = getattr(settings, 'CORS_ORIGINS', None)
    if cors_origins is None:
        # fallback to default
        cors_origins = "http://localhost:3000,http://localhost:5173"
    print(f"[DEBUG] CORS_ORIGINS value: {cors_origins}")
    if isinstance(cors_origins, str):
        return [i.strip() for i in cors_origins.split(",")]
    return cors_origins

settings = Settings()
