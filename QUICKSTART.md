# ARIA v2.0.0 - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Docker and Docker Compose installed
- Git installed
- 8GB RAM minimum

### Quick Setup

```bash
# 1. Clone the repository
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
cd Aria---Document-Management-Employee

# 2. Copy environment file and configure
cp .env.example .env
# Edit .env with your settings (optional for testing)

# 3. Start all services
docker-compose up -d

# 4. Wait for services to be ready (~30 seconds)
docker-compose logs -f backend

# 5. Access the application
# API Documentation: http://localhost:8000/api/v1/docs
# Backend API: http://localhost:8000
```

### Test the API

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Login (test credentials)
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo&password=demo"
```

### Access Services

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| API Docs | http://localhost:8000/api/v1/docs | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| RabbitMQ Management | http://localhost:15672 | guest / guest |
| Flower (Celery Monitor) | http://localhost:5555 | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3001 | admin / admin |

### Stop Services

```bash
docker-compose down
```

## 📚 Next Steps

- Read [INSTALLATION.md](INSTALLATION.md) for detailed setup
- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
- Read [CONFIGURATION.md](CONFIGURATION.md) for configuration options
- Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for complete overview

## 🎯 Key Features to Try

1. **Upload a Document**
   - Go to http://localhost:8000/api/v1/docs
   - Try POST /api/v1/documents/upload

2. **Chat with ARIA**
   - Try POST /api/v1/chat/message
   - Send natural language queries

3. **Monitor System**
   - Check Prometheus: http://localhost:9090
   - View Grafana dashboards: http://localhost:3001

## 🐛 Troubleshooting

**Services not starting?**
```bash
docker-compose ps
docker-compose logs
```

**Port conflicts?**
Edit `docker-compose.yml` and change the port mappings.

**Need help?**
Open an issue: https://github.com/Reshigan/Aria---Document-Management-Employee/issues

## 🔒 Production Deployment

⚠️ **Warning**: Default credentials are for development only!

For production deployment:
1. Change all passwords in `.env`
2. Generate secure SECRET_KEY
3. Configure HTTPS
4. See [INSTALLATION.md](INSTALLATION.md) for details

---

**Happy document processing! 🎉**
