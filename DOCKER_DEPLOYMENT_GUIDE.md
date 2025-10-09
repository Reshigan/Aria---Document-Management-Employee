# 🐳 ARIA Docker Deployment Guide for aria.vantax.co.za

## Quick Start - Production Deployment

### Prerequisites on Server
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin
```

### 1. Clone Repository on Server
```bash
cd /var/www
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
cd Aria---Document-Management-Employee
```

### 2. Set Up SSL Certificates

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot

# Get certificates
sudo certbot certonly --standalone -d aria.vantax.co.za

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

#### Option B: Self-Signed (Development)
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=aria.vantax.co.za"
```

### 3. Configure Environment Variables
```bash
# Create .env file
cat > .env << 'EOF'
# Production Settings
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=production
LOG_LEVEL=INFO

# Database
DATABASE_URL=sqlite:///./aria.db

# CORS
ALLOWED_ORIGINS=["https://aria.vantax.co.za"]

# API Settings
NEXT_PUBLIC_API_URL=https://aria.vantax.co.za/api
NODE_ENV=production
EOF

# Generate a secure secret key
echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env
```

### 4. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose -f docker-compose.vantax.yml up -d --build

# Check logs
docker-compose -f docker-compose.vantax.yml logs -f
```

### 5. Verify Deployment
```bash
# Check running containers
docker ps

# Check backend health
curl http://localhost:8000/

# Check frontend
curl http://localhost:3000/

# Check via domain (after DNS is configured)
curl https://aria.vantax.co.za
```

---

## Production Build Details

### Included in Git Repository
✅ **Frontend Build**: `frontend/.next/` directory (468 MB optimized build)
✅ **Database**: `backend/aria.db` with admin user (admin/admin)
✅ **Corporate Assets**: Icon, colors, styling all configured
✅ **Docker Files**: Production-ready Dockerfiles and docker-compose

### Architecture
```
┌─────────────────────────────────────────────┐
│            Nginx (Port 80/443)              │
│         SSL Termination & Routing           │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│  Frontend   │  │   Backend   │
│  (Port 3000)│  │ (Port 8000) │
│  Next.js    │  │  FastAPI    │
└─────────────┘  └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │   SQLite    │
                 │   Database  │
                 └─────────────┘
```

---

## Docker Services

### Backend Service
- **Container**: aria-backend
- **Port**: 8000
- **Image**: Built from Dockerfile.backend
- **Features**:
  - FastAPI with Gunicorn
  - SQLite database included
  - OCR with Tesseract
  - PDF processing
  - Admin user pre-configured

### Frontend Service
- **Container**: aria-frontend
- **Port**: 3000
- **Image**: Built from Dockerfile.frontend.simple
- **Features**:
  - Next.js production server
  - Pre-built .next directory from git
  - Corporate theme applied
  - Optimized bundles

### Nginx Service
- **Container**: aria-nginx
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Image**: nginx:alpine
- **Features**:
  - SSL termination
  - Reverse proxy
  - Rate limiting
  - Security headers
  - Static file caching

---

## Management Commands

### Start Services
```bash
docker-compose -f docker-compose.vantax.yml up -d
```

### Stop Services
```bash
docker-compose -f docker-compose.vantax.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose.vantax.yml restart
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.vantax.yml logs -f

# Specific service
docker-compose -f docker-compose.vantax.yml logs -f backend
docker-compose -f docker-compose.vantax.yml logs -f frontend
docker-compose -f docker-compose.vantax.yml logs -f nginx
```

### Rebuild After Git Pull
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.vantax.yml up -d --build
```

### Access Container Shell
```bash
# Backend
docker exec -it aria-backend /bin/bash

# Frontend
docker exec -it aria-frontend /bin/sh
```

---

## Database Management

### Backup Database
```bash
# Create backup
docker cp aria-backend:/app/aria.db ./backups/aria-$(date +%Y%m%d-%H%M%S).db

# Or with docker-compose
docker-compose -f docker-compose.vantax.yml exec backend \
  cp /app/aria.db /app/aria-backup-$(date +%Y%m%d).db
```

### Restore Database
```bash
docker cp ./backups/aria-backup.db aria-backend:/app/aria.db
docker-compose -f docker-compose.vantax.yml restart backend
```

### Reset Admin Password
```bash
docker-compose -f docker-compose.vantax.yml exec backend \
  python simple_reset_admin.py
```

---

## Monitoring and Health Checks

### Check Service Health
```bash
# All services
docker-compose -f docker-compose.vantax.yml ps

# Health check endpoints
curl http://localhost:8000/          # Backend
curl http://localhost:3000/          # Frontend
curl https://aria.vantax.co.za       # Public URL
```

### Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df
```

---

## Troubleshooting

### Containers Not Starting
```bash
# Check logs
docker-compose -f docker-compose.vantax.yml logs

# Check if ports are in use
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000
sudo lsof -i :8000
```

### SSL Certificate Issues
```bash
# Check certificate files
ls -la nginx/ssl/

# Test nginx configuration
docker-compose -f docker-compose.vantax.yml exec nginx nginx -t

# Renew Let's Encrypt certificates
sudo certbot renew
sudo cp /etc/letsencrypt/live/aria.vantax.co.za/*.pem nginx/ssl/
docker-compose -f docker-compose.vantax.yml restart nginx
```

### Frontend Not Loading
```bash
# Check if .next directory exists
ls -la frontend/.next/

# Rebuild frontend
docker-compose -f docker-compose.vantax.yml up -d --build frontend
```

### Backend API Errors
```bash
# Check database
docker-compose -f docker-compose.vantax.yml exec backend \
  sqlite3 aria.db ".tables"

# Check environment variables
docker-compose -f docker-compose.vantax.yml exec backend env
```

---

## Security Checklist

After deployment:

- [ ] Change admin password (default: admin/admin)
- [ ] Generate secure SECRET_KEY in .env
- [ ] Configure proper SSL certificates
- [ ] Set up firewall rules (UFW)
- [ ] Enable automatic security updates
- [ ] Configure backup automation
- [ ] Set up monitoring and alerts
- [ ] Review nginx security headers
- [ ] Enable rate limiting
- [ ] Configure log rotation

### Firewall Setup
```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Automated Deployment Script

Create `/var/www/deploy-aria.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying ARIA to aria.vantax.co.za..."

cd /var/www/Aria---Document-Management-Employee

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Backup database
echo "💾 Backing up database..."
mkdir -p backups
docker cp aria-backend:/app/aria.db ./backups/aria-$(date +%Y%m%d-%H%M%S).db

# Rebuild and restart
echo "🔨 Rebuilding services..."
docker-compose -f docker-compose.vantax.yml up -d --build

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Checking health..."
curl -f http://localhost:8000/ || echo "⚠️  Backend health check failed"
curl -f http://localhost:3000/ || echo "⚠️  Frontend health check failed"

echo "✅ Deployment complete!"
echo "🌐 Access at: https://aria.vantax.co.za"
```

Make it executable:
```bash
chmod +x /var/www/deploy-aria.sh
```

---

## Quick Reference

### Service URLs
- **Public**: https://aria.vantax.co.za
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **Backend Health**: http://localhost:8000/
- **API Docs**: http://localhost:8000/docs

### Default Credentials
- **Username**: admin
- **Password**: admin
- **⚠️ CHANGE IMMEDIATELY IN PRODUCTION**

### Important Paths
- **Frontend Build**: `frontend/.next/`
- **Database**: `backend/aria.db`
- **SSL Certs**: `nginx/ssl/`
- **Uploads**: Docker volume `aria-uploads`
- **Logs**: Docker volume `aria-logs`

### Docker Images
- **Backend**: Built from Dockerfile.backend
- **Frontend**: Built from Dockerfile.frontend.simple
- **Nginx**: nginx:alpine (official)

---

## Production Checklist

Before going live:

1. ✅ Clone repository on server
2. ✅ Set up SSL certificates
3. ✅ Configure environment variables
4. ✅ Start Docker services
5. ✅ Verify all containers running
6. ✅ Test backend API
7. ✅ Test frontend loading
8. ✅ Configure DNS (A record to server IP)
9. ✅ Test HTTPS access
10. ✅ Change admin password
11. ✅ Set up firewall
12. ✅ Configure backups
13. ✅ Set up monitoring

---

## Support

For issues:
1. Check logs: `docker-compose -f docker-compose.vantax.yml logs -f`
2. Verify health: `docker-compose -f docker-compose.vantax.yml ps`
3. Check this guide's troubleshooting section
4. Review `PRODUCTION_BUILD_SUMMARY.md` for build details

---

**Build Date**: October 9, 2025  
**Version**: 2.0.0  
**Status**: Production Ready ✅  
**Pre-built**: .next directory included in git  
**Database**: SQLite with admin user configured
