# Aria Backend - World-Class FastAPI Application

A modern, high-performance FastAPI backend for the Aria Document Management System.

## 🚀 Features

- **Modern FastAPI**: Built with FastAPI 0.104+ and Python 3.11+
- **Async First**: Fully asynchronous operations for maximum performance
- **Clean Architecture**: Proper separation of concerns with layers
- **Type Safety**: Complete type hints with Pydantic v2
- **Security**: JWT authentication, role-based access control
- **Database**: SQLAlchemy 2.0 with async support
- **Background Tasks**: Celery with Redis for async processing
- **Monitoring**: Structured logging, metrics, and health checks
- **Testing**: Comprehensive test suite with pytest
- **Documentation**: Auto-generated OpenAPI docs

## 🏗️ Architecture

```
aria/
├── api/           # API layer (FastAPI routers)
├── core/          # Core configuration and utilities
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── services/      # Business logic layer
├── repositories/  # Data access layer
├── dependencies/  # FastAPI dependencies
├── middleware/    # Custom middleware
├── tasks/         # Background tasks (Celery)
└── utils/         # Utility functions
```

## 🛠️ Development Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 14+ (or SQLite for development)
- Redis 6+ (for background tasks)

### Installation

```bash
# Clone and navigate to backend
cd backend-fastapi

# Install dependencies
pip install -e ".[dev]"

# Set up pre-commit hooks
pre-commit install

# Copy environment file
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start development server
uvicorn aria.main:app --reload --host 0.0.0.0 --port 8000
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/aria
# or for SQLite: sqlite+aiosqlite:///./aria.db

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis (for background tasks)
REDIS_URL=redis://localhost:6379/0

# File storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Monitoring
SENTRY_DSN=your-sentry-dsn-here
LOG_LEVEL=INFO
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=aria --cov-report=html

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration
```

## 📊 API Documentation

Once the server is running, visit:

- **Interactive docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## 🔧 CLI Commands

```bash
# Create admin user
aria-cli create-admin --email admin@example.com --password secret

# Run database migrations
aria-cli db upgrade

# Generate migration
aria-cli db revision --autogenerate -m "Add new table"

# Start background worker
aria-cli worker start
```

## 🚀 Production Deployment

### Docker

```bash
# Build image
docker build -t aria-backend .

# Run container
docker run -p 8000:8000 aria-backend
```

### Manual Deployment

```bash
# Install production dependencies
pip install -e ".[production]"

# Run with Gunicorn
gunicorn aria.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 📈 Performance

- **Async Operations**: All database and I/O operations are async
- **Connection Pooling**: Efficient database connection management
- **Caching**: Redis-based caching for frequently accessed data
- **Background Tasks**: Heavy operations moved to background workers
- **Monitoring**: Real-time performance metrics and alerts

## 🔒 Security

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Granular permission system
- **Input Validation**: Comprehensive request validation with Pydantic
- **SQL Injection Protection**: SQLAlchemy ORM prevents SQL injection
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Rate Limiting**: API rate limiting to prevent abuse

## 📝 Code Quality

- **Type Hints**: 100% type coverage with mypy
- **Code Formatting**: Black and isort for consistent formatting
- **Linting**: Flake8 for code quality checks
- **Pre-commit Hooks**: Automated code quality checks
- **Test Coverage**: >90% test coverage requirement

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and quality checks
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.