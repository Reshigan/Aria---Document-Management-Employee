# ARIA ERP - Deployment Guide

## 🚀 Quick Start Deployment

### Prerequisites
- Ubuntu 20.04+ or Debian 11+ server
- Minimum 2GB RAM, 2 CPU cores
- Docker and Docker Compose installed
- Domain name pointed to server IP (optional, for SSL)

### One-Command Deployment
```bash
sudo bash deploy/deploy.sh
```

This script will:
1. Install all dependencies (Docker, Nginx, etc.)
2. Clone/update the repository
3. Generate secure environment variables
4. Build and start all services
5. Setup systemd service
6. Configure Nginx
7. Setup automated backups

---

## 📦 Manual Deployment

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/aria-erp.git
cd aria-erp
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env  # Edit with your settings
```

### 3. Start Services
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Access Application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🏭 Production Configuration

### Database Setup
The application uses PostgreSQL in production:

```bash
# Access database
docker-compose exec postgres psql -U aria_user -d aria_erp

# Backup database
docker exec aria_postgres pg_dump -U aria_user aria_erp > backup.sql

# Restore database
docker exec -i aria_postgres psql -U aria_user -d aria_erp < backup.sql
```

### SSL/HTTPS Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### Nginx Configuration
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔧 Service Management

### Systemd Commands
```bash
# Start services
sudo systemctl start aria-erp

# Stop services
sudo systemctl stop aria-erp

# Restart services
sudo systemctl restart aria-erp

# View status
sudo systemctl status aria-erp

# Enable auto-start
sudo systemctl enable aria-erp
```

### Docker Commands
```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:5173

# Check service status
docker-compose ps
```

### Database Backups
Automated daily backups are configured in `/etc/cron.daily/aria-backup`

Manual backup:
```bash
# Create backup
docker exec aria_postgres pg_dump -U aria_user aria_erp | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore backup
gunzip < backup_20231027.sql.gz | docker exec -i aria_postgres psql -U aria_user -d aria_erp
```

### Log Management
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Clear logs
docker-compose logs --tail=0 backend

# Export logs
docker-compose logs --no-color backend > backend.log
```

### Performance Monitoring
```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Clean up unused images
docker system prune -a
```

---

## 🔒 Security Hardening

### 1. Firewall Configuration
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2. Update Environment Variables
Edit `.env` and change all default values:
- `SECRET_KEY` - Use strong random value
- `JWT_SECRET_KEY` - Use strong random value
- `POSTGRES_PASSWORD` - Use strong password
- `ALLOWED_ORIGINS` - Set to your domain only

### 3. Setup Fail2Ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 4. Regular Updates
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

---

## 🌍 Multi-Server Deployment

### Load Balancer Setup
For high-traffic deployments, use a load balancer:

```nginx
upstream backend_servers {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

upstream frontend_servers {
    server frontend1:3000;
    server frontend2:3000;
}

server {
    location / {
        proxy_pass http://frontend_servers;
    }
    
    location /api/ {
        proxy_pass http://backend_servers;
    }
}
```

### Database Replication
Set up PostgreSQL replication for high availability:
- Primary database for writes
- Read replicas for queries
- Automatic failover with pgpool

---

## 📱 Platform-Specific Deployments

### AWS Deployment
1. Launch EC2 instance (t3.medium or larger)
2. Configure security groups (ports 80, 443, 22)
3. Use RDS for PostgreSQL
4. Use ElastiCache for Redis
5. Use S3 for file storage
6. Use CloudFront for CDN

### DigitalOcean Deployment
1. Create Droplet (2GB RAM minimum)
2. Use Managed PostgreSQL
3. Use Managed Redis
4. Use Spaces for file storage
5. Use Load Balancer for scaling

### Google Cloud Deployment
1. Create Compute Engine instance
2. Use Cloud SQL for PostgreSQL
3. Use Memorystore for Redis
4. Use Cloud Storage for files
5. Use Cloud Load Balancing

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready: Wait 30s and restart
# - Port in use: Change port in docker-compose.yml
# - Missing dependencies: Rebuild image
docker-compose build --no-cache backend
```

### Frontend Won't Start
```bash
# Check logs
docker-compose logs frontend

# Common issues:
# - Node modules: Rebuild image
docker-compose build --no-cache frontend
# - API connection: Check VITE_API_URL in .env
```

### Database Connection Issues
```bash
# Test database connection
docker-compose exec backend python -c "from app.core.database import engine; print(engine.connect())"

# Reset database
docker-compose down -v
docker-compose up -d
```

### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate expiry
sudo certbot certificates
```

---

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: `cat .env`
3. Test connectivity: `curl http://localhost:8000/health`
4. Contact support: support@aria-erp.com

---

## 📝 Version History

- **v1.0.0** (2024-10-27) - Initial production release
  - 67 AI Bots integrated
  - Full ERP functionality
  - Docker deployment ready
  - Production-grade security

