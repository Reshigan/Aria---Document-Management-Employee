# ARIA Configuration Reference

## Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [Application Settings](#application-settings)
- [Database Configuration](#database-configuration)
- [SAP Configuration](#sap-configuration)
- [Communication Settings](#communication-settings)
- [ML Model Configuration](#ml-model-configuration)
- [Security Settings](#security-settings)
- [Performance Tuning](#performance-tuning)

## Overview

ARIA uses environment variables and configuration files for all settings. This guide provides a complete reference for all available configuration options.

## Environment Variables

### Core Application Settings

```bash
# Application
APP_NAME=ARIA                           # Application name
APP_VERSION=2.0.0                       # Version
ENVIRONMENT=production                  # development | staging | production | testing
DEBUG=false                             # Enable debug mode (never use in production)
LOG_LEVEL=INFO                          # DEBUG | INFO | WARNING | ERROR | CRITICAL

# API Configuration
API_V1_PREFIX=/api/v1                   # API version 1 prefix
API_V2_PREFIX=/api/v2                   # API version 2 prefix
BACKEND_CORS_ORIGINS=["http://localhost:3000","https://aria.example.com"]
ALLOWED_HOSTS=["*"]                     # Comma-separated list of allowed hosts
```

### Security Configuration

```bash
# Authentication
SECRET_KEY=your-secret-key-minimum-32-characters-long  # JWT secret key
ALGORITHM=HS256                                        # JWT algorithm
ACCESS_TOKEN_EXPIRE_MINUTES=30                         # Access token lifetime
REFRESH_TOKEN_EXPIRE_DAYS=7                           # Refresh token lifetime

# Password Policy
PASSWORD_MIN_LENGTH=8                   # Minimum password length
PASSWORD_REQUIRE_UPPERCASE=true         # Require uppercase letters
PASSWORD_REQUIRE_NUMBERS=true           # Require numbers
PASSWORD_REQUIRE_SPECIAL=true           # Require special characters

# Rate Limiting
RATE_LIMIT_ENABLED=true                 # Enable rate limiting
RATE_LIMIT_PER_MINUTE=60               # Requests per minute per user
RATE_LIMIT_PER_HOUR=1000               # Requests per hour per user

# Two-Factor Authentication
ENABLE_2FA=false                        # Enable 2FA requirement
2FA_ISSUER_NAME=ARIA                    # 2FA issuer name for authenticator apps
```

### Database Configuration

```bash
# PostgreSQL
POSTGRES_SERVER=postgres                # Database host
POSTGRES_USER=aria_user                 # Database username
POSTGRES_PASSWORD=secure_password       # Database password
POSTGRES_DB=aria_db                     # Database name
POSTGRES_PORT=5432                      # Database port

# Database Pool Settings
DB_POOL_SIZE=20                         # Connection pool size
DB_MAX_OVERFLOW=40                      # Maximum overflow connections
DB_POOL_PRE_PING=true                   # Test connections before using
DB_ECHO=false                           # Log SQL queries (debug only)

# Database URL (auto-generated if not provided)
DATABASE_URL=postgresql://aria_user:secure_password@postgres:5432/aria_db
```

### Redis Configuration

```bash
# Redis
REDIS_HOST=redis                        # Redis host
REDIS_PORT=6379                         # Redis port
REDIS_DB=0                              # Redis database number
REDIS_PASSWORD=redis_password           # Redis password (optional)
REDIS_POOL_SIZE=10                      # Connection pool size
REDIS_DECODE_RESPONSES=true             # Decode responses to strings

# Redis URL (auto-generated if not provided)
REDIS_URL=redis://:redis_password@redis:6379/0
```

### MinIO (Object Storage) Configuration

```bash
# MinIO
MINIO_ENDPOINT=minio:9000               # MinIO endpoint
MINIO_ACCESS_KEY=minioadmin             # Access key
MINIO_SECRET_KEY=minioadmin_password    # Secret key
MINIO_USE_SSL=false                     # Use SSL (true for production)
MINIO_BUCKET_DOCUMENTS=documents        # Documents bucket name
MINIO_BUCKET_MODELS=models              # ML models bucket name
MINIO_BUCKET_BACKUPS=backups            # Backups bucket name
```

### Elasticsearch Configuration

```bash
# Elasticsearch
ELASTICSEARCH_HOST=elasticsearch        # Elasticsearch host
ELASTICSEARCH_PORT=9200                 # Elasticsearch port
ELASTICSEARCH_USER=elastic              # Username (optional)
ELASTICSEARCH_PASSWORD=elastic_pass     # Password (optional)
ELASTICSEARCH_INDEX_PREFIX=aria         # Index prefix
```

### SAP Configuration

```bash
# SAP RFC Connection
SAP_ASHOST=sap.example.com              # SAP application server host
SAP_SYSNR=00                            # SAP system number
SAP_CLIENT=100                          # SAP client
SAP_USER=sap_username                   # SAP username
SAP_PASSWORD=sap_password               # SAP password
SAP_LANG=EN                             # Language (EN, DE, FR, etc.)
SAP_ROUTER=/H/saprouter.example.com/S/3299/H/  # SAP router string (optional)

# SAP REST API (for S/4HANA)
SAP_USE_REST=false                      # Use REST API instead of RFC
SAP_REST_URL=https://sap-s4.example.com/sap/opu/odata/  # REST API URL
SAP_REST_USERNAME=rest_user             # REST API username
SAP_REST_PASSWORD=rest_password         # REST API password

# SAP Connection Pool
SAP_MAX_CONNECTIONS=5                   # Maximum concurrent connections
SAP_CONNECTION_TIMEOUT=30               # Connection timeout in seconds

# SAP Transaction Settings
SAP_AUTO_COMMIT=true                    # Auto-commit transactions
SAP_BATCH_SIZE=100                      # Batch processing size
```

### Email Configuration

```bash
# SMTP Settings
SMTP_TLS=true                           # Use TLS
SMTP_PORT=587                           # SMTP port (587 for TLS, 465 for SSL)
SMTP_HOST=smtp.gmail.com                # SMTP server
SMTP_USER=your_email@gmail.com          # SMTP username
SMTP_PASSWORD=your_app_password         # SMTP password

# Email Settings
EMAILS_FROM_EMAIL=noreply@example.com   # From email address
EMAILS_FROM_NAME=ARIA                   # From name
EMAIL_RESET_TOKEN_EXPIRE_HOURS=48       # Password reset token expiration
EMAIL_TEMPLATES_DIR=templates/email     # Email templates directory
EMAIL_MAX_BATCH_SIZE=100                # Maximum batch size for bulk emails

# Email Features
EMAIL_ENABLE_HTML=true                  # Send HTML emails
EMAIL_ENABLE_ATTACHMENTS=true           # Allow attachments
EMAIL_MAX_ATTACHMENT_SIZE=10485760      # Max attachment size (10MB)
```

### Slack Configuration

```bash
# Slack API
SLACK_BOT_TOKEN=xoxb-your-bot-token                    # Bot token
SLACK_SIGNING_SECRET=your-signing-secret               # Signing secret
SLACK_DEFAULT_CHANNEL=#general                         # Default channel
SLACK_ERROR_CHANNEL=#errors                            # Error notifications channel

# Slack Features
SLACK_ENABLE_INTERACTIVE=true                          # Enable interactive messages
SLACK_ENABLE_NOTIFICATIONS=true                        # Enable notifications
SLACK_NOTIFICATION_PRIORITY=high                       # low | medium | high
```

### Microsoft Teams Configuration

```bash
# Teams Webhook
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...  # Webhook URL

# Teams OAuth (for advanced features)
TEAMS_TENANT_ID=your-tenant-id                         # Azure AD tenant ID
TEAMS_CLIENT_ID=your-client-id                         # Application client ID
TEAMS_CLIENT_SECRET=your-client-secret                 # Application secret

# Teams Features
TEAMS_ENABLE_ADAPTIVE_CARDS=true                       # Use adaptive cards
TEAMS_ENABLE_MENTIONS=true                             # Enable @mentions
```

### ML Model Configuration

```bash
# Model Settings
MODEL_CACHE_DIR=/app/models             # Model cache directory
USE_GPU=true                            # Use GPU if available
CUDA_VISIBLE_DEVICES=0                  # GPU device IDs (comma-separated)
BATCH_SIZE=8                            # Batch size for inference
MAX_SEQUENCE_LENGTH=512                 # Maximum sequence length
MODEL_INFERENCE_TIMEOUT=60              # Inference timeout in seconds

# Model Selection
DONUT_MODEL=naver-clova-ix/donut-base-finetuned-docvqa
LAYOUTLM_MODEL=microsoft/layoutlmv3-base
TROCR_MODEL=microsoft/trocr-base-printed

# OCR Settings
OCR_ENGINE=paddleocr                    # paddleocr | tesseract | trocr
OCR_CONFIDENCE_THRESHOLD=0.85           # Minimum OCR confidence
ENABLE_HANDWRITING_RECOGNITION=true     # Enable handwriting OCR
```

### Document Processing Configuration

```bash
# Upload Settings
MAX_UPLOAD_SIZE=52428800                # Max upload size (50MB)
ALLOWED_EXTENSIONS=["pdf","png","jpg","jpeg","xlsx","xls","csv","docx"]

# Processing Settings
EXTRACTION_CONFIDENCE_THRESHOLD=0.90    # Minimum extraction confidence
AUTO_VALIDATE=true                      # Auto-validate extracted data
AUTO_POST_TO_SAP=false                  # Auto-post to SAP (requires manual approval if false)

# Document Types
SUPPORTED_DOCUMENT_TYPES=["invoice","purchase_order","remittance","proof_of_delivery"]

# Processing Limits
MAX_CONCURRENT_PROCESSING=10            # Max documents processing simultaneously
PROCESSING_TIMEOUT=300                  # Processing timeout (seconds)
MAX_RETRY_ATTEMPTS=3                    # Max retry attempts for failed processing
```

### Celery Configuration

```bash
# Celery Broker
CELERY_BROKER_URL=amqp://guest:guest@rabbitmq:5672//  # RabbitMQ URL
CELERY_RESULT_BACKEND=redis://redis:6379/1             # Redis result backend

# Celery Settings
CELERY_TASK_SERIALIZER=json             # Task serialization format
CELERY_RESULT_SERIALIZER=json           # Result serialization format
CELERY_ACCEPT_CONTENT=["json"]          # Accepted content types
CELERY_TIMEZONE=UTC                     # Timezone
CELERY_ENABLE_UTC=true                  # Enable UTC

# Celery Workers
CELERY_WORKERS=4                        # Number of worker processes
CELERY_TASK_TRACK_STARTED=true          # Track task start time
CELERY_TASK_TIME_LIMIT=300              # Task time limit (seconds)
CELERY_TASK_SOFT_TIME_LIMIT=270         # Soft time limit (seconds)

# Celery Queues
CELERY_DEFAULT_QUEUE=default            # Default queue name
CELERY_QUEUES=["default","document_processing","sap_posting","notifications"]
```

### Monitoring Configuration

```bash
# Prometheus
PROMETHEUS_PORT=9090                    # Prometheus port
PROMETHEUS_METRICS_PATH=/metrics        # Metrics endpoint path
PROMETHEUS_ENABLE=true                  # Enable Prometheus metrics

# Grafana
GRAFANA_PORT=3001                       # Grafana port
GRAFANA_ADMIN_USER=admin                # Admin username
GRAFANA_ADMIN_PASSWORD=admin            # Admin password (change in production!)

# Logging
LOG_FORMAT=json                         # json | text
LOG_FILE_PATH=logs/app.log              # Log file path
LOG_MAX_SIZE=100                        # Max log file size (MB)
LOG_BACKUP_COUNT=10                     # Number of backup files
LOG_ROTATE=true                         # Enable log rotation

# Sentry (Error Tracking)
SENTRY_DSN=https://...@sentry.io/...    # Sentry DSN (optional)
SENTRY_ENVIRONMENT=production           # Environment name
SENTRY_SAMPLE_RATE=1.0                  # Error sample rate (0.0-1.0)
```

## Application Settings

### Configuration File (config.yaml)

Create a `config.yaml` file for additional application settings:

```yaml
# config.yaml
application:
  name: "ARIA"
  version: "2.0.0"
  description: "Automated Revenue & Invoice Assistant"
  
personality:
  name: "ARIA"
  tone: "professional"        # professional | friendly | casual
  language: "en"
  working_hours:
    enabled: true
    timezone: "America/New_York"
    start: "09:00"
    end: "17:00"
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
  
features:
  auto_learning: true
  proactive_notifications: true
  batch_processing: true
  multi_language: true
  handwriting_recognition: true
  
notifications:
  email:
    enabled: true
    events: ["document_processed", "error_occurred", "sap_posted"]
  slack:
    enabled: true
    events: ["document_processed", "error_occurred"]
  teams:
    enabled: false
    events: ["document_processed"]
    
sap:
  modules:
    fi: true    # Finance
    mm: true    # Materials Management
    sd: true    # Sales & Distribution
    wm: true    # Warehouse Management
  
  field_mappings:
    invoice:
      invoice_number: "BELNR"
      invoice_date: "BLDAT"
      vendor_id: "LIFNR"
      amount: "WRBTR"
    
document_processing:
  rules:
    - type: "invoice"
      required_fields: ["invoice_number", "invoice_date", "amount", "vendor_id"]
      validation: "strict"
    - type: "purchase_order"
      required_fields: ["po_number", "vendor_id", "items"]
      validation: "standard"
```

## Performance Tuning

### Production Optimization

```bash
# Worker Configuration
WORKERS=4                               # Number of Uvicorn workers
WORKER_CLASS=uvicorn.workers.UvicornWorker
WORKER_CONNECTIONS=1000                 # Max connections per worker
KEEPALIVE=5                             # Keep-alive timeout

# Database Optimization
DB_POOL_SIZE=50                         # Increase for high traffic
DB_MAX_OVERFLOW=100
DB_POOL_RECYCLE=3600                    # Recycle connections after 1 hour
DB_POOL_TIMEOUT=30                      # Connection timeout

# Cache Configuration
CACHE_TTL=300                           # Default cache TTL (seconds)
CACHE_MAX_SIZE=1000                     # Max cache entries
REDIS_POOL_SIZE=20                      # Increase for high traffic

# ML Performance
BATCH_SIZE=16                           # Increase with more GPU memory
USE_FP16=true                           # Use mixed precision (faster)
NUM_THREADS=8                           # PyTorch thread count
```

### Memory Settings

```bash
# Python Memory
MALLOC_ARENA_MAX=2                      # Reduce memory fragmentation
PYTHONHASHSEED=0                        # Reproducible hashing

# ML Model Memory
MODEL_CACHE_SIZE=4096                   # Model cache size (MB)
EMBEDDING_CACHE_SIZE=2048               # Embedding cache size (MB)
```

## Environment-Specific Configurations

### Development (.env.development)

```bash
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
DB_ECHO=true
USE_GPU=false
AUTO_RELOAD=true
```

### Staging (.env.staging)

```bash
ENVIRONMENT=staging
DEBUG=false
LOG_LEVEL=INFO
USE_GPU=true
SENTRY_SAMPLE_RATE=0.5
```

### Production (.env.production)

```bash
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING
USE_GPU=true
RATE_LIMIT_ENABLED=true
ENABLE_2FA=true
SENTRY_SAMPLE_RATE=1.0
```

## Validation

Validate your configuration:

```bash
# Check configuration
docker-compose exec backend python scripts/validate_config.py

# Test connections
docker-compose exec backend python scripts/test_connections.py

# Verify SAP connectivity
docker-compose exec backend python scripts/test_sap.py
```

## Best Practices

1. **Never commit .env files** to version control
2. **Use strong secrets** for production (minimum 32 characters)
3. **Rotate credentials** regularly
4. **Use separate databases** for each environment
5. **Enable 2FA** for production systems
6. **Monitor rate limits** and adjust as needed
7. **Regular backups** of configuration
8. **Document custom settings** in your deployment notes
9. **Use SSL/TLS** for all external connections
10. **Audit log** all configuration changes

## Configuration Templates

Template files are provided in the repository:

- `.env.example` - Base configuration template
- `.env.development` - Development settings
- `.env.production` - Production settings
- `config.yaml.example` - Application config template

## Further Reading

- [Installation Guide](INSTALLATION.md)
- [Security Guide](SECURITY.md)
- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](API_DOCUMENTATION.md)
