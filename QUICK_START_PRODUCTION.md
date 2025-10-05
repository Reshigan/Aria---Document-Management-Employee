# 🚀 ARIA - Quick Start Production Guide

**Get ARIA up and running in production in 15 minutes!**

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] Linux server (Ubuntu 20.04+ recommended) or macOS
- [ ] Docker & Docker Compose installed
- [ ] 4GB+ RAM available
- [ ] 20GB+ disk space
- [ ] sudo/root access
- [ ] Domain name (optional, for HTTPS)

---

## ⚡ Option 1: Automated Setup (Recommended)

### Step 1: Clone Repository

```bash
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
cd Aria---Document-Management-Employee
```

### Step 2: Run Setup Script

```bash
./setup-production.sh
```

The script will:
1. ✅ Check prerequisites
2. ✅ Create environment configuration
3. ✅ Configure core services (PostgreSQL, Redis, Storage)
4. ✅ Setup optional services (LLM, Email, Slack, Teams, SAP)
5. ✅ Install system dependencies
6. ✅ Pull Docker images
7. ✅ Build services
8. ✅ Initialize database
9. ✅ Create admin user
10. ✅ Start all services

**Time**: ~10-15 minutes

### Step 3: Access Application

```
Frontend:    http://localhost:3000
Backend API: http://localhost:8000
API Docs:    http://localhost:8000/docs
```

**Done! 🎉**

---

## 🔧 Option 2: Manual Setup

### Step 1: Environment Configuration

```bash
# Copy environment template
cp .env.production .env

# Generate secret key
openssl rand -hex 32

# Edit .env file
nano .env
```

**Required settings:**
```bash
SECRET_KEY=<your-generated-key>
POSTGRES_PASSWORD=<secure-password>
REDIS_PASSWORD=<secure-password>
```

### Step 2: Start Core Services

```bash
# Pull images
docker-compose pull

# Build services
docker-compose build

# Start database
docker-compose up -d postgres redis

# Wait for services to be ready
sleep 10

# Run migrations
docker-compose run --rm backend alembic upgrade head
```

### Step 3: Create Admin User

```bash
docker-compose run --rm backend python -c "
from backend.core.database import SessionLocal
from backend.models.user import User
from backend.core.security import get_password_hash

db = SessionLocal()
user = User(
    username='admin',
    email='admin@example.com',
    hashed_password=get_password_hash('changeme'),
    is_active=True,
    is_superuser=True
)
db.add(user)
db.commit()
print('Admin created!')
"
```

### Step 4: Start All Services

```bash
docker-compose up -d

# Check status
docker-compose ps
```

### Step 5: Verify Installation

```bash
# Test backend
curl http://localhost:8000/api/v1/health

# View logs
docker-compose logs -f backend
```

**Done! 🎉**

---

## 🔐 Optional Services Setup

### 1. AI Chat (LLM)

#### Option A: Ollama (Local, Free)

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve &

# Pull model
ollama pull llama3

# Update .env
echo "LLM_PROVIDER=ollama" >> .env
echo "LLM_API_URL=http://localhost:11434" >> .env
echo "LLM_MODEL=llama3" >> .env

# Restart backend
docker-compose restart backend celery-worker
```

#### Option B: OpenAI (Cloud, Paid)

```bash
# Update .env
echo "LLM_PROVIDER=openai" >> .env
echo "LLM_API_URL=https://api.openai.com/v1" >> .env
echo "LLM_API_KEY=sk-your-key-here" >> .env
echo "LLM_MODEL=gpt-4" >> .env

# Restart backend
docker-compose restart backend celery-worker
```

### 2. Email Notifications

```bash
# Gmail example (use App Password)
cat >> .env << EOF
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_USE_TLS=true
EOF

docker-compose restart backend celery-worker
```

### 3. Slack Integration

```bash
# Get bot token from https://api.slack.com/apps
cat >> .env << EOF
SLACK_ENABLED=true
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_DEFAULT_CHANNEL=#aria-notifications
EOF

docker-compose restart backend celery-worker
```

### 4. Microsoft Teams

```bash
# Create webhook in Teams channel
cat >> .env << EOF
TEAMS_ENABLED=true
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/your-webhook-url
EOF

docker-compose restart backend celery-worker
```

### 5. SAP Integration

```bash
# Requires SAP NetWeaver RFC SDK installed
cat >> .env << EOF
SAP_ENABLED=true
SAP_ASHOST=sap-server.company.com
SAP_SYSNR=00
SAP_CLIENT=100
SAP_USER=your-username
SAP_PASSWORD=your-password
SAP_COMPANY_CODE=1000
EOF

docker-compose restart backend celery-worker
```

---

## 🔍 Verification Checklist

After setup, verify everything works:

### Backend Tests
```bash
# Health check
curl http://localhost:8000/api/v1/health
# Expected: {"status": "healthy"}

# API docs
open http://localhost:8000/docs
```

### Frontend Tests
```bash
# Access frontend
open http://localhost:3000

# Login with admin credentials
# Upload a test document
# Check dashboard statistics
```

### Service Tests
```bash
# Check all services are running
docker-compose ps

# Should show:
# ✓ postgres (healthy)
# ✓ redis (healthy)
# ✓ backend (healthy)
# ✓ frontend (healthy)
# ✓ celery-worker (running)
# ✓ minio (healthy)
```

### Document Processing Test
```bash
# Upload a PDF via UI
# Check processing status
# Verify OCR extraction (if configured)
```

### AI Chat Test (if enabled)
```bash
# Go to /chat page
# Ask: "Hello, what can you do?"
# Should receive AI response
```

---

## 🐛 Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]

# Rebuild and restart
docker-compose up -d --build [service-name]
```

### Database issues

```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
sleep 10
docker-compose run --rm backend alembic upgrade head
```

### Port conflicts

```bash
# Check what's using port
sudo lsof -i :8000

# Change port in docker-compose.yml
# Example: "8080:8000" instead of "8000:8000"
```

### Permission errors

```bash
# Fix storage permissions
sudo chown -R $USER:$USER storage/
chmod -R 755 storage/
```

### Celery not processing

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping
# Expected: PONG

# Restart Celery worker
docker-compose restart celery-worker

# Check Celery logs
docker-compose logs -f celery-worker
```

### LLM not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Check model is pulled
ollama list

# Test LLM directly
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check Resource Usage

```bash
# Docker stats
docker stats

# Disk usage
docker system df
```

### Celery Monitoring

```bash
# Access Flower UI
open http://localhost:5555

# Check task queue
docker-compose exec redis redis-cli LLEN processing
```

---

## 🔒 Security Hardening

### Essential (Do This Now!)

1. **Change default passwords**
   ```bash
   # Edit .env and change:
   # - SECRET_KEY
   # - POSTGRES_PASSWORD
   # - REDIS_PASSWORD
   # - Admin password
   ```

2. **Configure firewall**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **Disable debug mode**
   ```bash
   # In .env
   DEBUG=false
   ENVIRONMENT=production
   ```

### Recommended

4. **Setup HTTPS with Let's Encrypt**
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get certificate
   sudo certbot --nginx -d yourdomain.com
   ```

5. **Enable rate limiting**
   ```bash
   # Configure in nginx.conf
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   ```

6. **Regular backups**
   ```bash
   # Database backup
   docker-compose exec postgres pg_dump -U aria_user aria > backup.sql
   
   # Storage backup
   tar -czf storage_backup.tar.gz storage/
   ```

---

## 🚀 Production Deployment

### For Production Server

1. **Use production domain**
   ```bash
   # Update .env
   BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

2. **Configure reverse proxy (Nginx)**
   ```nginx
   server {
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
       }
   }
   ```

3. **Setup SSL certificate**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

4. **Configure auto-restart**
   ```bash
   # Create systemd service
   sudo nano /etc/systemd/system/aria.service
   
   # Add:
   [Unit]
   Description=ARIA Document Management
   Requires=docker.service
   After=docker.service
   
   [Service]
   Type=oneshot
   RemainAfterExit=yes
   WorkingDirectory=/opt/aria
   ExecStart=/usr/local/bin/docker-compose up -d
   ExecStop=/usr/local/bin/docker-compose down
   
   [Install]
   WantedBy=multi-user.target
   ```

5. **Enable service**
   ```bash
   sudo systemctl enable aria
   sudo systemctl start aria
   ```

---

## 📚 Next Steps

1. **Read full documentation**
   - `README_COMPLETE.md` - Complete overview
   - `ADVANCED_FEATURES.md` - Feature documentation
   - `ROADMAP_TO_PRODUCTION.md` - Detailed deployment guide

2. **Configure optional services**
   - Setup LLM for AI chat
   - Configure email notifications
   - Setup Slack/Teams integration
   - Configure SAP connection

3. **Customize for your needs**
   - Add custom document types
   - Configure extraction patterns
   - Setup custom workflows
   - Brand the frontend

4. **Setup monitoring**
   - Configure Prometheus
   - Setup Grafana dashboards
   - Enable Sentry error tracking

---

## 🆘 Getting Help

### Resources
- **Documentation**: Check all `.md` files in repo
- **API Docs**: http://localhost:8000/docs
- **Logs**: `docker-compose logs -f`

### Common Issues
- Service not starting: Check logs and verify .env
- Can't connect: Verify ports and firewall
- Processing not working: Check Celery worker logs
- AI chat not working: Verify LLM service is running

---

## ✅ Success Checklist

- [ ] All Docker services running
- [ ] Can access frontend (port 3000)
- [ ] Can access backend API (port 8000)
- [ ] Can login with admin credentials
- [ ] Can upload a document
- [ ] Dashboard shows statistics
- [ ] (Optional) AI chat responding
- [ ] (Optional) Document processing working
- [ ] (Optional) Notifications configured

---

**🎉 Congratulations! ARIA is now running in production!**

For questions or issues, check the troubleshooting section or review the full documentation.

---

**Quick Commands Reference:**

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Update code
git pull
docker-compose up -d --build

# Backup database
docker-compose exec postgres pg_dump -U aria_user aria > backup.sql

# Restore database
docker-compose exec -T postgres psql -U aria_user aria < backup.sql
```
