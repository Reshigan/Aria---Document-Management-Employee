# 🚀 ARIA Production Deployment Guide

**Complete guide to deploying ARIA to production**

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### **1. Infrastructure Requirements**

**Minimum Server Specifications:**
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 100GB SSD (scalable)
- **OS**: Ubuntu 22.04 LTS or later
- **Network**: Static IP, domain name (aria.vantax.co.za)

**Database:**
- PostgreSQL 14+ (managed service recommended: AWS RDS, DigitalOcean Managed DB)
- Redis 6+ (for caching and Celery)

**External Services:**
- **Stripe Account** (billing)
- **Twilio Account** (SMS, WhatsApp)
- **SMTP Service** (SendGrid, AWS SES, or Mailgun)
- **Ollama** (AI model server - can be separate instance)
- **CloudFlare** (CDN, DDoS protection)

### **2. Security Prerequisites**

✅ **SSL/TLS Certificate** (Let's Encrypt or CloudFlare)
✅ **Firewall** configured (UFW or iptables)
✅ **Secrets Manager** (AWS Secrets Manager, HashiCorp Vault, or .env)
✅ **Database Backups** (automated, daily)
✅ **Monitoring** (Sentry, Uptime Robot, DataDog)

---

## 🛠️ DEPLOYMENT STEPS

### **STEP 1: Server Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx (reverse proxy)
sudo apt install nginx -y

# Install Certbot (SSL)
sudo apt install certbot python3-certbot-nginx -y
```

### **STEP 2: Domain & DNS Setup**

```bash
# Point your domain to server IP
# DNS Records (at CloudFlare or your registrar):
# A     aria.vantax.co.za    → YOUR_SERVER_IP
# CNAME www.aria.vantax.co.za → aria.vantax.co.za

# Verify DNS propagation
dig aria.vantax.co.za
```

### **STEP 3: Clone Repository**

```bash
# Create deployment directory
sudo mkdir -p /opt/aria
sudo chown $USER:$USER /opt/aria
cd /opt/aria

# Clone repository
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git .
git checkout main

# Create production branch
git checkout -b production
```

### **STEP 4: Environment Configuration**

```bash
# Create production environment file
cp backend/.env.example backend/.env

# Edit backend/.env with production values
nano backend/.env
```

**Production .env file:**

```env
# Database
DATABASE_URL=postgresql://aria_user:STRONG_PASSWORD@db.example.com:5432/aria_production
REDIS_URL=redis://redis.example.com:6379/0

# Security
SECRET_KEY=GENERATE_STRONG_SECRET_KEY_HERE  # openssl rand -hex 32
JWT_SECRET_KEY=GENERATE_JWT_SECRET_KEY_HERE  # openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Environment
ENVIRONMENT=production
DEBUG=false
ALLOWED_HOSTS=aria.vantax.co.za,www.aria.vantax.co.za

# Stripe (Production Keys)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Twilio
TWILIO_ACCOUNT_SID=YOUR_TWILIO_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=+27XXXXXXXXX
TWILIO_WHATSAPP_NUMBER=whatsapp:+27XXXXXXXXX

# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
SMTP_FROM_EMAIL=aria@vantax.co.za
SMTP_FROM_NAME=ARIA

# Ollama (AI)
OLLAMA_BASE_URL=http://ollama-server:11434

# Monitoring
SENTRY_DSN=YOUR_SENTRY_DSN
```

### **STEP 5: Database Setup**

```bash
# Create production database
sudo -u postgres psql

CREATE DATABASE aria_production;
CREATE USER aria_user WITH PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE aria_production TO aria_user;
\q

# Run migrations
cd /opt/aria/backend
python3 -m alembic upgrade head
```

### **STEP 6: Docker Deployment**

**Create docker-compose.production.yml:**

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: aria-backend
    restart: always
    env_file:
      - backend/.env
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - uploads:/app/uploads
    depends_on:
      - redis
    networks:
      - aria-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: aria-frontend
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - aria-network

  redis:
    image: redis:7-alpine
    container_name: aria-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - aria-network

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: aria-celery
    restart: always
    command: celery -A backend.tasks.celery_app worker --loglevel=info
    env_file:
      - backend/.env
    depends_on:
      - redis
    networks:
      - aria-network

  ollama:
    image: ollama/ollama:latest
    container_name: aria-ollama
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    networks:
      - aria-network

volumes:
  uploads:
  redis-data:
  ollama-data:

networks:
  aria-network:
    driver: bridge
```

**Deploy with Docker:**

```bash
# Build and start containers
docker-compose -f docker-compose.production.yml up -d --build

# Check container status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f backend
```

### **STEP 7: Nginx Configuration**

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/aria
```

**Nginx config:**

```nginx
server {
    listen 80;
    server_name aria.vantax.co.za www.aria.vantax.co.za;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aria.vantax.co.za www.aria.vantax.co.za;
    
    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    # File uploads (increase size limit)
    client_max_body_size 100M;
}
```

**Enable site and get SSL:**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d aria.vantax.co.za -d www.aria.vantax.co.za

# Auto-renewal (Certbot sets this up automatically)
sudo certbot renew --dry-run
```

### **STEP 8: Firewall Configuration**

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Check status
sudo ufw status
```

### **STEP 9: Monitoring Setup**

**Install Sentry (Error Tracking):**

```bash
# Already configured in .env (SENTRY_DSN)
# Just need to create Sentry project at sentry.io
```

**Setup Uptime Robot:**

1. Go to https://uptimerobot.com
2. Add monitor: https://aria.vantax.co.za
3. Check interval: 5 minutes
4. Alert via: Email, SMS, Slack

**Setup Log Rotation:**

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/aria
```

```
/opt/aria/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1
    endscript
}
```

### **STEP 10: Database Backups**

```bash
# Create backup script
sudo nano /opt/aria/scripts/backup_database.sh
```

```bash
#!/bin/bash
# Database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/aria/backups"
DB_NAME="aria_production"
DB_USER="aria_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/aria_db_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "aria_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: aria_db_$DATE.sql.gz"
```

```bash
# Make executable
chmod +x /opt/aria/scripts/backup_database.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /opt/aria/scripts/backup_database.sh >> /var/log/aria_backup.log 2>&1
```

---

## 🔐 SECURITY HARDENING

### **1. SSH Security**

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no (if using SSH keys)

sudo systemctl restart sshd
```

### **2. Fail2Ban (Brute Force Protection)**

```bash
sudo apt install fail2ban -y

# Configure
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### **3. Database Security**

```bash
# PostgreSQL: Restrict access
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Only allow localhost and trusted IPs

# Redis: Require password
sudo nano /etc/redis/redis.conf
# Set: requirepass YOUR_STRONG_PASSWORD
```

---

## 📊 MONITORING & ALERTS

### **Health Check Endpoint**

```python
# backend/api/routes/health.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
```

### **Prometheus Metrics** (Optional)

```bash
# Install prometheus-client
pip install prometheus-client

# Add metrics endpoint
# backend/api/routes/metrics.py
```

---

## 🚀 DEPLOYMENT WORKFLOW

### **GitHub Actions CI/CD**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ production ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/aria
            git pull origin production
            docker-compose -f docker-compose.production.yml up -d --build
            docker-compose -f docker-compose.production.yml exec backend alembic upgrade head
```

---

## 📈 SCALING STRATEGIES

### **Vertical Scaling** (Short-term)
- Upgrade server: 8 cores, 32GB RAM
- Managed PostgreSQL (AWS RDS, DigitalOcean)
- Redis cluster

### **Horizontal Scaling** (Long-term)
- Load balancer (Nginx, HAProxy, AWS ALB)
- Multiple backend instances
- Database read replicas
- CDN for static assets (CloudFlare, AWS CloudFront)

---

## ✅ POST-DEPLOYMENT VERIFICATION

```bash
# 1. Check all services are running
docker-compose -f docker-compose.production.yml ps

# 2. Test health endpoint
curl https://aria.vantax.co.za/api/health

# 3. Test authentication
curl -X POST https://aria.vantax.co.za/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 4. Check SSL
curl -I https://aria.vantax.co.za

# 5. Monitor logs
docker-compose -f docker-compose.production.yml logs -f --tail=100

# 6. Check database connection
docker-compose -f docker-compose.production.yml exec backend python -c "from backend.database.core import engine; print(engine.connect())"
```

---

## 🆘 TROUBLESHOOTING

### **Backend won't start**
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs backend

# Common issues:
# - Database connection failed → check DATABASE_URL
# - Port already in use → kill process on port 8000
# - Missing environment variables → check .env file
```

### **502 Bad Gateway**
```bash
# Backend is down
docker-compose -f docker-compose.production.yml restart backend

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### **Database connection errors**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U aria_user -d aria_production
```

---

## 📞 SUPPORT CONTACTS

**Technical Issues:**
- Email: support@vantax.co.za
- Phone: +27 XX XXX XXXX

**Emergency (Production Down):**
- Emergency Hotline: +27 XX XXX XXXX
- Slack: #aria-prod-alerts

---

**ARIA is now LIVE in production!** 🎉🚀

**Monitor**: https://aria.vantax.co.za
**Status Page**: https://status.vantax.co.za (optional)

---

**© 2025 Vanta X Holdings**  
**Production-Ready AI-Native ERP** 🤖  
**Built for South Africa** 🇿🇦
