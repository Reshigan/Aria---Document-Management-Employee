"""
Core configuration settings for the Aria application.

This module provides centralized configuration management using Pydantic Settings.
All configuration is loaded from environment variables with sensible defaults.
"""

import secrets
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, EmailStr, Field, PostgresDsn, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Aria Document Management System"
    VERSION: str = "2.0.0"
    DESCRIPTION: str = "World-class document management system with enterprise features"
    
    # Security
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000",  # React dev server
        "http://localhost:8000",  # FastAPI dev server
        "http://localhost:12000", # Vite dev server
        "http://localhost:12001", # Vite dev server alt
        "https://work-1-czpjnhgxrrmdnkmu.prod-runtime.all-hands.dev",  # Production frontend
        "https://work-2-czpjnhgxrrmdnkmu.prod-runtime.all-hands.dev",  # Production backend
    ]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Database
    DATABASE_URL: Optional[str] = "sqlite+aiosqlite:///./aria.db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_POOL_RECYCLE: int = 3600
    
    @validator("DATABASE_URL", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        # Fallback to SQLite for development
        return "sqlite+aiosqlite:///./aria.db"
    
    # Redis (for caching and background tasks)
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES: List[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    
    # Email Configuration
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    @validator("EMAILS_FROM_NAME")
    def get_project_name(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        if not v:
            return values["PROJECT_NAME"]
        return v
    
    # Monitoring & Logging
    LOG_LEVEL: str = "INFO"
    SENTRY_DSN: Optional[str] = None
    ENVIRONMENT: str = "development"
    
    # Background Tasks
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # API Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 100
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # SAP Integration
    SAP_ENABLED: bool = False
    SAP_HOST: Optional[str] = None
    SAP_CLIENT: Optional[str] = None
    SAP_USERNAME: Optional[str] = None
    SAP_PASSWORD: Optional[str] = None
    
    # Admin User (for initial setup)
    FIRST_SUPERUSER_EMAIL: EmailStr = "admin@aria.com"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()


# Database URL for Alembic (sync version)
def get_sync_database_url() -> str:
    """Get synchronous database URL for Alembic migrations."""
    if settings.DATABASE_URL:
        # Convert async URL to sync for Alembic
        if "sqlite+aiosqlite" in settings.DATABASE_URL:
            return settings.DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
        elif "postgresql+asyncpg" in settings.DATABASE_URL:
            return settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
    return "sqlite:///./aria.db"