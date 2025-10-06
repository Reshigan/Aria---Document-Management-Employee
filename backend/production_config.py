"""
ARIA Backend Production Configuration
Optimized settings for production deployment
"""

import os
from typing import List, Optional
from pydantic import BaseSettings

class ProductionSettings(BaseSettings):
    """Production configuration settings"""
    
    # Application Settings
    app_name: str = "ARIA Document Management API"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "production"
    
    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    
    # Security Settings
    secret_key: str = "aria-production-secret-key-2024-secure"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # CORS Settings
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://13.247.108.209",
        "https://13.247.108.209",
    ]
    allowed_methods: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allowed_headers: List[str] = ["*"]
    allow_credentials: bool = True
    
    # File Upload Settings
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_file_types: List[str] = [
        ".xlsx", ".xls", ".csv", ".pdf", ".doc", ".docx"
    ]
    upload_directory: str = "/data/uploads"
    
    # Database Settings (for future use)
    database_url: str = "sqlite:///data/aria.db"
    
    # Logging Settings
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    enable_access_log: bool = True
    
    # Performance Settings
    enable_gzip: bool = True
    enable_caching: bool = True
    cache_ttl: int = 3600
    
    # Monitoring Settings
    enable_metrics: bool = True
    metrics_endpoint: str = "/metrics"
    health_check_endpoint: str = "/api/v1/health"
    
    # Excel Processing Settings
    max_excel_rows: int = 100000
    max_excel_columns: int = 1000
    excel_processing_timeout: int = 300  # 5 minutes
    
    # AI Chat Settings
    enable_ai_chat: bool = True
    ai_model: str = "gpt-3.5-turbo"
    max_chat_history: int = 50
    
    # Rate Limiting
    enable_rate_limiting: bool = True
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds
    
    class Config:
        env_file = ".env.production"
        case_sensitive = False

# Global settings instance
settings = ProductionSettings()

# Uvicorn production configuration
UVICORN_CONFIG = {
    "host": settings.host,
    "port": settings.port,
    "workers": settings.workers,
    "log_level": settings.log_level.lower(),
    "access_log": settings.enable_access_log,
    "use_colors": False,
    "server_header": False,
    "date_header": False,
}

# FastAPI production configuration
FASTAPI_CONFIG = {
    "title": settings.app_name,
    "version": settings.app_version,
    "description": "Professional Document Management System with Excel Support",
    "docs_url": "/docs" if settings.debug else None,
    "redoc_url": "/redoc" if settings.debug else None,
    "openapi_url": "/openapi.json" if settings.debug else None,
}

# Middleware configuration
MIDDLEWARE_CONFIG = {
    "cors": {
        "allow_origins": settings.allowed_origins,
        "allow_credentials": settings.allow_credentials,
        "allow_methods": settings.allowed_methods,
        "allow_headers": settings.allowed_headers,
    },
    "gzip": {
        "minimum_size": 1000,
    },
    "trusted_host": {
        "allowed_hosts": ["*"],  # Configure specific hosts in production
    }
}

# Security headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'",
}

# Logging configuration
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": settings.log_format,
        },
        "access": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
        "access": {
            "formatter": "access",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "formatter": "default",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/aria/app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
        },
    },
    "loggers": {
        "": {
            "level": settings.log_level,
            "handlers": ["default", "file"],
        },
        "uvicorn.access": {
            "handlers": ["access"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

def get_production_settings():
    """Get production settings instance"""
    return settings

def is_production():
    """Check if running in production environment"""
    return settings.environment == "production"

def get_upload_path():
    """Get the upload directory path"""
    os.makedirs(settings.upload_directory, exist_ok=True)
    return settings.upload_directory