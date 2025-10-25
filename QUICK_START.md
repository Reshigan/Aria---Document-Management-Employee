# 🚀 Aria AI Platform - Quick Start Guide

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- OpenAI API key (or Anthropic API key)

## Option 1: Full Docker Deploy (Recommended)

### 1. Clone & Configure

```bash
cd Aria---Document-Management-Employee

# Create environment file
cat > .env << EOF
SECRET_KEY=your-super-secret-key-change-this-in-production
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
DATABASE_URL=postgresql://aria:aria_password@postgres:5432/aria_db
REDIS_URL=redis://redis:6379
EOF
```

### 2. Start Everything

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Backend API** on port 8000
- **Frontend App** on port 12000

### 3. Access the Platform

- **Frontend**: https://work-1-kplwrkwvtseormkt.prod-runtime.all-hands.dev
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 4. Create Your Account

1. Go to the frontend URL
2. Click "Get Started" or "Sign Up"
3. Fill in your details:
   - Full Name
   - Email
   - Organization Name
   - Password (min 8 characters)
4. Start using Aria!

## Option 2: Local Development

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database migrations (if using Alembic)
alembic upgrade head

# Start backend
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Default Credentials

**Admin Account** (pre-seeded):
- Email: admin@vantax.co.za
- Username: admin
- Password: admin123

## Quick Feature Tour

### 1. Chat with Aria

```bash
curl -X POST http://localhost:8000/api/v1/aria/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Aria, what can you do?"}'
```

### 2. List Available Bots

```bash
curl http://localhost:8000/api/v1/bot/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check Growth Opportunities

```bash
curl http://localhost:8000/api/v1/aria/growth/opportunities \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │  React + TypeScript + Tailwind
│   (Port 12000)  │  Modern, responsive, dark mode
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │  FastAPI + Python
│   (Port 8000)   │  JWT Auth, Multi-tenant
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Postgres│ │ Redis  │
│  5432  │ │  6379  │
└────────┘ └────────┘
```

## Core Features

### ✅ Authentication & Authorization
- JWT-based auth
- Organization multi-tenancy
- Role-based access control

### ✅ Aria AI Controller
- Voice interaction (STT/TTS)
- Realistic avatar interface
- Bot orchestration
- Process execution

### ✅ Multi-Bot System
- 10+ specialized bot templates
- Sales, Legal, HR, Finance, etc.
- Custom bot creation

### ✅ Customer Growth Engine
- Embedding score tracking
- Cross-sell opportunities
- Health scoring
- Churn prediction

### ✅ Usage & Billing
- Real-time usage tracking
- Multiple billing models
- Subscription management
- Invoice generation

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 8000
sudo lsof -ti:8000 | xargs kill -9

# Kill process on port 12000
sudo lsof -ti:12000 | xargs kill -9
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# View logs
docker-compose logs postgres
```

### Frontend Not Loading

```bash
# Rebuild frontend container
docker-compose build frontend
docker-compose up -d frontend

# Check logs
docker-compose logs frontend
```

## Development Workflow

### 1. Make Changes

Edit files in your local directory - Docker volumes will sync automatically.

### 2. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### 3. Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### 4. Database Migrations

```bash
# Create migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Run migrations
docker-compose exec backend alembic upgrade head
```

## Production Deployment

### Environment Variables

```bash
# Required in production
SECRET_KEY=<generate-with-openssl-rand-hex-32>
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional
REDIS_URL=redis://host:6379
ELEVENLABS_API_KEY=...
SENTRY_DSN=...
STRIPE_API_KEY=...
```

### Security Checklist

- [ ] Change SECRET_KEY
- [ ] Use strong database passwords
- [ ] Enable HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Regular backups

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Support

- **Documentation**: See `ARIA_TRANSFORMATION.md`
- **Issues**: GitHub Issues
- **Email**: support@vantax.co.za

## License

© 2025 Vanta X Pty Ltd. All rights reserved.

---

**Ready to transform your business? Let's go! 🚀**
