# Aria AI Bot - API Documentation

## 🚀 Quick Start

Base URL: `https://api.aria.com/v1` or `http://localhost:8000/api/v1`

All endpoints require authentication via Bearer token:
```bash
Authorization: Bearer <your_access_token>
```

---

## 🤖 Bot Endpoints

### Chat with Bot

**POST** `/api/v1/bot/chat`

Send a message to the bot and get a response.

```json
{
  "message": "What is this document about?",
  "conversation_id": "conv_123",
  "bot_template_id": "document-qa",
  "context": {
    "document_id": "doc_456"
  }
}
```

**Response:**
```json
{
  "response": "This document is an invoice from Acme Corp...",
  "conversation_id": "conv_123",
  "message_id": "msg_789",
  "timestamp": "2025-10-25T10:30:00Z"
}
```

---

### Stream Chat (Server-Sent Events)

**POST** `/api/v1/bot/chat/stream`

Stream bot responses in real-time.

```bash
curl -N -X POST https://api.aria.com/v1/bot/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Summarize this contract"}'
```

**Response Stream:**
```
data: {"type": "token", "content": "This"}
data: {"type": "token", "content": " contract"}
data: {"type": "done", "conversation_id": "conv_123"}
```

---

### Bot Templates

**GET** `/api/v1/bot/templates`

List all available bot templates.

**Response:**
```json
[
  {
    "id": "document-qa",
    "name": "Document Q&A Assistant",
    "description": "Ask questions about documents",
    "category": "documents",
    "capabilities": ["qa", "summarization"]
  }
]
```

---

## 📊 Analytics Endpoints

### Dashboard Statistics

**GET** `/api/v1/analytics/dashboard`

Get overview statistics for dashboard.

**Response:**
```json
{
  "totalDocuments": 1247,
  "processedToday": 89,
  "activeConversations": 23,
  "successRate": 98.5,
  "documentsByDay": [
    {"date": "2025-10-25", "count": 89}
  ]
}
```

---

### Bot Performance

**GET** `/api/v1/analytics/bot-performance`

Get bot performance metrics.

**Response:**
```json
{
  "totalConversations": 1523,
  "averageResponseTime": 1.8,
  "satisfactionScore": 4.6,
  "commonQueries": [
    {"query": "Extract invoice data", "count": 234}
  ]
}
```

---

## ⚡ Workflow Endpoints

### Create Workflow

**POST** `/api/v1/workflows`

Create a new automated workflow.

```json
{
  "name": "Invoice Processing",
  "description": "Auto-process invoices",
  "trigger": "document_uploaded",
  "nodes": [
    {
      "id": "1",
      "type": "extract_data",
      "config": {"fields": ["amount", "date"]}
    }
  ],
  "edges": [
    {"source": "1", "target": "2"}
  ]
}
```

---

### List Workflows

**GET** `/api/v1/workflows`

Get all workflows for current user.

---

### Execute Workflow

**POST** `/api/v1/workflows/{workflow_id}/execute`

Manually trigger a workflow execution.

```json
{
  "document_id": "doc_123"
}
```

---

### Workflow Templates

**GET** `/api/v1/workflows/templates`

Get pre-built workflow templates.

**Response:**
```json
[
  {
    "id": "invoice-approval",
    "name": "Invoice Approval Flow",
    "description": "Extract → Approve → Update accounting",
    "category": "finance"
  }
]
```

---

## 🔗 Webhook Endpoints

### Create Webhook

**POST** `/api/v1/webhooks`

Register a new webhook for events.

```json
{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/services/xxx",
  "events": ["document.uploaded", "bot.response"],
  "secret": "your_secret_key"
}
```

---

### List Webhooks

**GET** `/api/v1/webhooks`

Get all registered webhooks.

---

### Delete Webhook

**DELETE** `/api/v1/webhooks/{webhook_id}`

Remove a webhook.

---

## 🔐 Authentication

### Login

**POST** `/api/v1/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

## 📝 Webhook Events

Aria sends the following events to registered webhooks:

| Event | Description |
|-------|-------------|
| `document.uploaded` | New document uploaded |
| `document.processed` | Document processing completed |
| `bot.response` | Bot generated a response |
| `workflow.completed` | Workflow finished execution |
| `conversation.started` | New conversation started |

**Webhook Payload Example:**
```json
{
  "event": "document.uploaded",
  "timestamp": "2025-10-25T10:30:00Z",
  "data": {
    "document_id": "doc_123",
    "filename": "invoice.pdf",
    "user_id": "user_456"
  }
}
```

---

## 🚦 Rate Limits

- **Free Tier:** 100 requests/minute
- **Pro Tier:** 1000 requests/minute
- **Enterprise:** Unlimited

---

## 📚 SDKs

### Python SDK
```python
from aria import AriaClient

client = AriaClient(api_key="your_key")
response = client.bot.chat("Hello, analyze this invoice")
print(response.text)
```

### JavaScript SDK
```javascript
import { AriaClient } from '@aria/sdk';

const client = new AriaClient({ apiKey: 'your_key' });
const response = await client.bot.chat('Hello!');
console.log(response.text);
```

---

## 🔧 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

---

## 📮 Support

- **Documentation:** https://docs.aria.com
- **Email:** support@aria.com
- **Discord:** https://discord.gg/aria
