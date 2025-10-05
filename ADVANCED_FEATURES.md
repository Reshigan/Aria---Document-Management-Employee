# ARIA Advanced Features Documentation

## 📋 Table of Contents
1. [Document Processing Pipeline](#document-processing-pipeline)
2. [SAP Integration](#sap-integration)
3. [Communication Services](#communication-services)
4. [AI Chat Interface](#ai-chat-interface)
5. [Configuration](#configuration)
6. [Deployment](#deployment)

---

## 🔄 Document Processing Pipeline

### Overview
Automated document processing with OCR, data extraction, and background task queue.

### Components

#### 1. OCR Service (`backend/services/processing/ocr_service.py`)
Extracts text from images and PDFs using Tesseract OCR.

**Features:**
- Image text extraction (JPG, PNG, BMP, TIFF)
- PDF multi-page processing
- Confidence scoring for extracted text
- Bounding box detection

**Usage:**
```python
from backend.services.processing.ocr_service import ocr_service

# Process a document
result = ocr_service.process_document('/path/to/document.pdf')
print(result['full_text'])
```

#### 2. Data Extraction Service (`backend/services/processing/extraction_service.py`)
Extracts structured data from OCR text using pattern matching and rules.

**Extracted Fields:**
- Invoice number
- Invoice date
- Vendor name
- Total amount
- Currency
- Purchase order number
- Line items

**Usage:**
```python
from backend.services.processing.extraction_service import extraction_service

# Extract invoice data
data = extraction_service.extract_invoice_data(ocr_text)
print(f"Invoice: {data['invoice_number']}")
print(f"Amount: ${data['total_amount']}")
```

#### 3. Celery Tasks (`backend/services/processing/tasks.py`)
Background processing tasks for document OCR and extraction.

**Tasks:**
- `process_document_task`: Full document processing
- `reprocess_document_task`: Reprocess failed documents
- `batch_process_documents_task`: Batch processing

**Configuration:**
```bash
# Start Celery worker
celery -A backend.core.celery_app worker --loglevel=info -Q processing

# Start Celery beat (for scheduled tasks)
celery -A backend.core.celery_app beat --loglevel=info
```

### Installation

```bash
# Install system dependencies
sudo apt-get install tesseract-ocr
sudo apt-get install poppler-utils  # For PDF to image conversion

# Install Python packages
pip install pytesseract pdf2image celery redis
```

### Configuration

Add to `.env`:
```env
# OCR
TESSERACT_CMD=/usr/bin/tesseract  # Optional, path to tesseract
OCR_LANGUAGES=eng  # Comma-separated language codes

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

---

## 🔗 SAP Integration

### Overview
Direct integration with SAP ERP systems via RFC/BAPI for automated document posting.

### Components

#### SAP Connector (`backend/services/sap/sap_connector.py`)
Provides RFC/BAPI connectivity to SAP systems.

**Features:**
- Invoice posting (BAPI_ACC_DOCUMENT_POST)
- Vendor validation (BAPI_VENDOR_GETDETAIL)
- GL account verification (BAPI_GL_ACC_GETDETAIL)
- Purchase order lookup (BAPI_PO_GETDETAIL)

**Usage:**
```python
from backend.services.sap.sap_connector import sap_connector

# Post invoice to SAP
with sap_connector as sap:
    result = sap.post_invoice({
        'invoice_number': 'INV-2024-001',
        'total_amount': 1500.00,
        'currency': 'USD',
        'vendor_code': 'V0001'
    })
    
    if result['success']:
        print(f"SAP Document: {result['sap_document_number']}")
```

### Installation

**Important:** SAP RFC integration requires SAP NetWeaver RFC SDK.

1. Download SAP NW RFC SDK from SAP Service Marketplace
2. Install the SDK:
```bash
# Extract SDK
unzip nwrfc750P_8-70002755.zip -d /usr/local/sap/nwrfcsdk

# Set environment variables
export SAPNWRFC_HOME=/usr/local/sap/nwrfcsdk
export LD_LIBRARY_PATH=$SAPNWRFC_HOME/lib:$LD_LIBRARY_PATH

# Install PyRFC
pip install pyrfc
```

### Configuration

Add to `.env`:
```env
# SAP Connection
SAP_ASHOST=sap-server.company.com
SAP_SYSNR=00
SAP_CLIENT=100
SAP_USER=RFC_USER
SAP_PASSWORD=secure_password
SAP_LANG=EN
```

### API Endpoints

```bash
# Post document to SAP (planned)
POST /api/v1/documents/{document_id}/post-to-sap

# Validate vendor
POST /api/v1/sap/validate-vendor
{
  "vendor_code": "V0001"
}
```

---

## 📧 Communication Services

### Overview
Multi-channel notifications: Email, Slack, and Microsoft Teams.

### Components

#### Notification Service (`backend/services/notifications/notification_service.py`)

**Supported Channels:**
- Email (SMTP)
- Slack (Bot API)
- Microsoft Teams (Webhooks)

**Features:**
- Document processing notifications
- SAP posting status alerts
- Error notifications
- Multi-channel broadcasting

**Usage:**
```python
from backend.services.notifications.notification_service import notification_service

# Send notification to all channels
await notification_service.notify_document_processed(
    document_id=123,
    filename="invoice.pdf",
    status="completed",
    confidence=95.5,
    email_to="user@company.com"
)
```

### Email Configuration

Add to `.env`:
```env
# Email/SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-app-password
SMTP_TLS=true
EMAILS_FROM_EMAIL=noreply@company.com
EMAILS_FROM_NAME=ARIA Notifications
```

**Gmail Setup:**
1. Enable 2FA on your Google Account
2. Generate an App Password
3. Use the app password in `SMTP_PASSWORD`

### Slack Configuration

Add to `.env`:
```env
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL=#aria-notifications
SLACK_ENABLED=true
```

**Setup Steps:**
1. Create a Slack App at https://api.slack.com/apps
2. Add Bot Token Scopes: `chat:write`, `chat:write.public`
3. Install app to workspace
4. Copy Bot User OAuth Token
5. Invite bot to channel: `/invite @ARIA`

### Microsoft Teams Configuration

Add to `.env`:
```env
# Microsoft Teams
TEAMS_WEBHOOK_URL=https://your-org.webhook.office.com/webhookb2/...
TEAMS_ENABLED=true
```

**Setup Steps:**
1. Open Teams channel
2. Click "..." → "Connectors"
3. Search for "Incoming Webhook"
4. Configure and copy webhook URL

---

## 🤖 AI Chat Interface

### Overview
Natural language document Q&A powered by internal LLM (Llama, Mistral, etc.).

### Components

#### LLM Service (`backend/services/ai/llm_service.py`)

**Features:**
- Document Q&A
- Field extraction
- Document summarization
- Document comparison
- Multi-turn conversations

**Supported LLMs:**
- Llama 3
- Mistral
- Mixtral
- Any OpenAI-compatible API

**Usage:**
```python
from backend.services.ai.llm_service import llm_service

# Ask question about document
result = await llm_service.query_document(
    document_text=doc_text,
    question="What is the total amount?",
    document_metadata={'filename': 'invoice.pdf'}
)

print(result['answer'])
```

### API Endpoints

#### 1. General Chat
```bash
POST /api/v1/chat/message
{
  "message": "What documents are currently processing?",
  "context": {},
  "conversation_id": "conv-123"
}
```

#### 2. Document Q&A
```bash
POST /api/v1/chat/document/question
{
  "document_id": "123",
  "question": "What is the vendor name on this invoice?"
}
```

#### 3. Document Summary
```bash
GET /api/v1/chat/document/{document_id}/summary?max_words=150
```

#### 4. Field Extraction
```bash
POST /api/v1/chat/document/extract
{
  "document_id": "123",
  "fields": ["invoice_number", "vendor_name", "total_amount", "due_date"]
}
```

#### 5. Document Comparison
```bash
POST /api/v1/chat/documents/compare
{
  "document_id_1": "123",
  "document_id_2": "124"
}
```

### Configuration

Add to `.env`:
```env
# Internal LLM API
LLM_API_URL=http://your-llm-server:8000
LLM_API_KEY=your-api-key  # Optional
LLM_MODEL=llama-3-70b
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
LLM_TIMEOUT=30
```

### LLM Server Setup Options

#### Option 1: Ollama (Recommended for local)
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull model
ollama pull llama3

# Start server (runs on http://localhost:11434)
ollama serve
```

Update `.env`:
```env
LLM_API_URL=http://localhost:11434
LLM_MODEL=llama3
```

#### Option 2: vLLM (Production)
```bash
# Install vLLM
pip install vllm

# Start server
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-70b-chat-hf \
  --port 8000
```

Update `.env`:
```env
LLM_API_URL=http://localhost:8000
LLM_MODEL=meta-llama/Llama-3-70b-chat-hf
```

#### Option 3: LM Studio
1. Download LM Studio from https://lmstudio.ai/
2. Download a model (Llama 3, Mistral, etc.)
3. Start local server (usually http://localhost:1234)

Update `.env`:
```env
LLM_API_URL=http://localhost:1234
LLM_MODEL=llama-3
```

---

## ⚙️ Configuration

### Complete `.env` Example

```env
# Application
APP_NAME=ARIA
APP_VERSION=2.0.0
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Security
SECRET_KEY=your-secret-key-min-32-chars-long-for-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/aria
# Or SQLite for development:
# DATABASE_URL=sqlite+aiosqlite:///./aria.db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# OCR
TESSERACT_CMD=/usr/bin/tesseract
OCR_LANGUAGES=eng

# SAP
SAP_ASHOST=sap-server.company.com
SAP_SYSNR=00
SAP_CLIENT=100
SAP_USER=RFC_USER
SAP_PASSWORD=secure_password
SAP_LANG=EN

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-app-password
SMTP_TLS=true
EMAILS_FROM_EMAIL=noreply@company.com
EMAILS_FROM_NAME=ARIA

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL=#aria-notifications
SLACK_ENABLED=true

# Teams
TEAMS_WEBHOOK_URL=https://your-org.webhook.office.com/...
TEAMS_ENABLED=true

# LLM
LLM_API_URL=http://localhost:11434
LLM_API_KEY=
LLM_MODEL=llama3
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
LLM_TIMEOUT=30

# CORS
BACKEND_CORS_ORIGINS=http://localhost:3000,https://your-frontend.com
```

---

## 🚀 Deployment

### Prerequisites

```bash
# System packages
sudo apt-get update
sudo apt-get install -y \
  tesseract-ocr \
  poppler-utils \
  redis-server \
  postgresql

# Python dependencies
pip install -r requirements.txt
```

### Services Setup

#### 1. Redis (for Celery)
```bash
# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping  # Should return PONG
```

#### 2. Celery Workers
```bash
# Processing queue worker
celery -A backend.core.celery_app worker \
  --loglevel=info \
  -Q processing \
  -n worker-processing@%h

# Notifications queue worker
celery -A backend.core.celery_app worker \
  --loglevel=info \
  -Q notifications \
  -n worker-notifications@%h

# Beat scheduler (for periodic tasks)
celery -A backend.core.celery_app beat --loglevel=info
```

#### 3. Application Server
```bash
# Development
uvicorn backend.api.gateway.main:app --reload --host 0.0.0.0 --port 8000

# Production (with Gunicorn)
gunicorn backend.api.gateway.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: aria
      POSTGRES_USER: aria
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
  
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://aria:secure_password@postgres:5432/aria
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
      - postgres
  
  celery-worker:
    build: .
    command: celery -A backend.core.celery_app worker --loglevel=info -Q processing
    environment:
      - DATABASE_URL=postgresql+asyncpg://aria:secure_password@postgres:5432/aria
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
      - postgres
```

---

## 📊 Monitoring

### Celery Monitoring (Flower)

```bash
# Install
pip install flower

# Start
celery -A backend.core.celery_app flower --port=5555

# Access at http://localhost:5555
```

### Health Checks

```bash
# Application health
curl http://localhost:8000/api/v1/health

# Redis health
redis-cli ping

# Celery workers
celery -A backend.core.celery_app inspect active
```

---

## 🔍 Testing

### Run Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific tests
pytest tests/test_ocr.py
pytest tests/test_sap.py
pytest tests/test_llm.py
```

### Test Examples

```python
# Test OCR
import pytest
from backend.services.processing.ocr_service import ocr_service

def test_ocr_extraction():
    result = ocr_service.process_document('tests/fixtures/sample_invoice.pdf')
    assert result['full_text']
    assert len(result['full_text']) > 100

# Test AI Chat
@pytest.mark.asyncio
async def test_document_question():
    from backend.services.ai.llm_service import llm_service
    
    result = await llm_service.query_document(
        document_text="Invoice #123, Amount: $500",
        question="What is the invoice number?",
        document_metadata={}
    )
    
    assert result['success']
    assert '123' in result['answer']
```

---

## 📝 API Documentation

Once the server is running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🆘 Troubleshooting

### OCR Issues
```bash
# Verify Tesseract installation
tesseract --version

# Install additional languages
sudo apt-get install tesseract-ocr-deu  # German
sudo apt-get install tesseract-ocr-fra  # French
```

### Celery Issues
```bash
# Check broker connection
celery -A backend.core.celery_app inspect ping

# Purge all tasks
celery -A backend.core.celery_app purge
```

### SAP Connection Issues
```bash
# Test SAP connectivity
python -c "from pyrfc import Connection; conn = Connection(...); print(conn.ping())"
```

### LLM Issues
```bash
# Test LLM endpoint
curl http://localhost:11434/v1/models

# Test completion
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"Hello"}]}'
```

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
- [SAP PyRFC](https://sap.github.io/PyRFC/)
- [Ollama](https://ollama.ai/)
- [vLLM](https://vllm.readthedocs.io/)

---

**Version**: 2.0.0  
**Last Updated**: October 4, 2025  
**Status**: ✅ Production Ready
