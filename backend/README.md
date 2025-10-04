# ARIA Backend

## Quick Start

### Local Development

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements/dev.txt
   ```

3. **Set up environment variables**
   ```bash
   cp ../.env.example ../.env
   # Edit .env with your configuration
   ```

4. **Run the server**
   ```bash
   cd api/gateway
   python main.py
   ```

   Or with uvicorn directly:
   ```bash
   uvicorn api.gateway.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Access API Documentation**
   - Swagger UI: http://localhost:8000/api/v1/docs
   - ReDoc: http://localhost:8000/api/v1/redoc

## Project Structure

```
backend/
├── api/                    # API services
│   ├── gateway/           # Main API gateway
│   ├── auth/              # Authentication service
│   ├── document/          # Document processing service
│   ├── nlp/               # NLP service
│   ├── sap/               # SAP connector service
│   └── communication/     # Communication service
├── core/                  # Core configuration
├── models/                # Data models
├── processors/            # Document processors
├── ml/                    # ML models
├── communication/         # Communication modules
├── tasks/                 # Celery tasks
├── utils/                 # Utilities
└── tests/                 # Tests
```

## Running Tests

```bash
pytest
pytest --cov=. --cov-report=html
```

## Code Quality

```bash
# Format code
black .
isort .

# Lint code
flake8 .

# Type check
mypy api/ core/ models/
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get token
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### Documents
- `POST /api/v1/documents/upload` - Upload document
- `GET /api/v1/documents` - List documents
- `GET /api/v1/documents/{id}` - Get document details
- `POST /api/v1/documents/{id}/reprocess` - Reprocess document
- `POST /api/v1/documents/{id}/post-to-sap` - Post to SAP

### Chat
- `POST /api/v1/chat/message` - Send message to ARIA
- `GET /api/v1/chat/conversations` - Get conversations

### Health
- `GET /api/v1/health` - Health check
- `GET /api/v1/health/ready` - Readiness check
- `GET /api/v1/health/live` - Liveness check
