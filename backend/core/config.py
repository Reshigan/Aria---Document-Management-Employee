"""
Application configuration management
"""
from typing import List, Optional
from pydantic import BaseSettings, Field, validator
from enum import Enum


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class Settings(BaseSettings):
    """Application settings with validation"""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"
    
    # Application
    APP_NAME: str = Field(default="ARIA", description="Application name")
    APP_VERSION: str = Field(default="2.0.0", description="Application version")
    ENVIRONMENT: Environment = Field(default=Environment.DEVELOPMENT)
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://localhost:12000", "https://work-1-eevyydwkiormocjq.prod-runtime.all-hands.dev"])
    FRONTEND_URL: str = Field(default="http://localhost:12000")
    
    # Security
    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_PORT: int = 5432
    
    def get_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.POSTGRES_SERVER and self.POSTGRES_USER and self.POSTGRES_PASSWORD and self.POSTGRES_DB:
            return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        # Default to SQLite for development
        return "sqlite+aiosqlite:///./aria.db"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # MinIO
    MINIO_ENDPOINT: Optional[str] = None
    MINIO_ACCESS_KEY: Optional[str] = None
    MINIO_SECRET_KEY: Optional[str] = None
    MINIO_USE_SSL: bool = False
    MINIO_BUCKET_DOCUMENTS: str = "documents"
    
    # SAP
    SAP_ASHOST: Optional[str] = None
    SAP_SYSNR: Optional[str] = None
    SAP_CLIENT: Optional[str] = None
    SAP_USER: Optional[str] = None
    SAP_PASSWORD: Optional[str] = None
    SAP_LANG: str = "EN"
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: str = "ARIA"
    
    # ML Models
    USE_GPU: bool = True
    BATCH_SIZE: int = 8
    MODEL_CACHE_DIR: str = "/app/models"
    
    # Celery
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/0")
    
    # OCR
    TESSERACT_CMD: Optional[str] = None  # Path to tesseract executable
    OCR_LANGUAGES: str = "eng"  # Languages for OCR (comma-separated)
    
    # Slack
    SLACK_BOT_TOKEN: Optional[str] = None
    SLACK_CHANNEL: str = "#aria-notifications"
    SLACK_ENABLED: bool = False
    
    # Microsoft Teams
    TEAMS_WEBHOOK_URL: Optional[str] = None
    TEAMS_ENABLED: bool = False
    
    # Internal LLM
    LLM_API_URL: Optional[str] = None  # Internal LLM endpoint
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "llama-3"  # Default model name
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2000
    LLM_TIMEOUT: int = 30  # seconds
    
    # External LLM Services
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2023-12-01-preview"
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_FILE_TYPES: List[str] = Field(default_factory=lambda: [
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "jpg", "jpeg", "png", "gif", "bmp", "tiff",
        "txt", "csv", "xml", "json"
    ])
    
    # Document Processing
    ENABLE_OCR: bool = True
    ENABLE_AUTO_CLASSIFICATION: bool = True
    ENABLE_DATA_EXTRACTION: bool = True
    OCR_CONFIDENCE_THRESHOLD: float = 0.7
    CLASSIFICATION_CONFIDENCE_THRESHOLD: float = 0.8
    
    # Search Configuration
    ENABLE_FULL_TEXT_SEARCH: bool = True
    SEARCH_RESULTS_PER_PAGE: int = 20
    MAX_SEARCH_RESULTS: int = 1000
    
    # Workflow Configuration
    DEFAULT_WORKFLOW_TIMEOUT_HOURS: int = 72
    MAX_WORKFLOW_STEPS: int = 20
    ENABLE_PARALLEL_WORKFLOWS: bool = True
    
    # Notification Configuration
    ENABLE_EMAIL_NOTIFICATIONS: bool = True
    ENABLE_PUSH_NOTIFICATIONS: bool = True
    ENABLE_SLACK_NOTIFICATIONS: bool = False
    ENABLE_TEAMS_NOTIFICATIONS: bool = False
    NOTIFICATION_BATCH_SIZE: int = 100
    
    # Security Configuration
    ENABLE_2FA: bool = True
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SYMBOLS: bool = True
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 30
    SESSION_TIMEOUT_MINUTES: int = 480  # 8 hours
    
    # API Configuration
    API_RATE_LIMIT_PER_MINUTE: int = 100
    API_RATE_LIMIT_PER_HOUR: int = 1000
    ENABLE_API_VERSIONING: bool = True
    ENABLE_WEBHOOKS: bool = True
    
    # Monitoring and Analytics
    ENABLE_ANALYTICS: bool = True
    ENABLE_PERFORMANCE_MONITORING: bool = True
    ANALYTICS_RETENTION_DAYS: int = 90
    
    # Backup Configuration
    ENABLE_AUTO_BACKUP: bool = True
    BACKUP_INTERVAL_HOURS: int = 24
    BACKUP_RETENTION_DAYS: int = 30
    BACKUP_LOCATION: Optional[str] = None
    
    # Cache Configuration
    CACHE_TTL_SECONDS: int = 3600  # 1 hour
    CACHE_MAX_SIZE: int = 1000
    ENABLE_QUERY_CACHE: bool = True
    
    # Feature Flags
    ENABLE_DOCUMENT_VERSIONING: bool = True
    ENABLE_DOCUMENT_SHARING: bool = True
    ENABLE_DOCUMENT_COMMENTS: bool = True
    ENABLE_BULK_OPERATIONS: bool = True
    ENABLE_ADVANCED_SEARCH: bool = True
    ENABLE_WORKFLOW_DESIGNER: bool = True
    ENABLE_MOBILE_APP: bool = True
    
    @validator('BACKEND_CORS_ORIGINS', pre=True)
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v


settings = Settings()
