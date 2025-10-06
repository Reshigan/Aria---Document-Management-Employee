# ARIA Document Management - New Server Deployment Guide

## Server Details
- **IP Address**: 35.177.226.170
- **SSH Key**: SSLS.pem
- **User**: ubuntu
- **OS**: Ubuntu (assumed)

## Quick Deployment

### Prerequisites
1. Ensure the `SSLS.pem` file is available in the project directory
2. The server should be running Ubuntu with SSH access enabled
3. Port 22 (SSH) should be accessible

### Automated Deployment
```bash
# 1. Upload SSLS.pem to the project directory
# 2. Run the deployment checker
./check-and-deploy.sh

# OR run deployment directly (if SSLS.pem is already in place)
./deploy-to-new-server.sh
```

## What Gets Deployed

### System Components
- ✅ **Node.js 18** - Frontend runtime
- ✅ **Python 3.11** - Backend runtime  
- ✅ **PostgreSQL** - Primary database
- ✅ **Redis** - Caching and session storage
- ✅ **Nginx** - Reverse proxy and web server

### Application Services
- ✅ **Backend API** - FastAPI application on port 8000
- ✅ **Frontend** - Next.js application on port 3000
- ✅ **Database** - PostgreSQL with dedicated `aria` user
- ✅ **File Storage** - Upload directory with proper permissions

### Configuration
- ✅ **Environment Variables** - All URLs and endpoints configurable
- ✅ **Systemd Services** - Auto-start on boot
- ✅ **Nginx Reverse Proxy** - Routes traffic to appropriate services
- ✅ **Firewall** - UFW configured with necessary ports
- ✅ **Security Headers** - XSS protection, content type sniffing prevention

## Environment Configuration

### Server URLs (Configurable)
All URLs and endpoints are configurable through environment variables:

```bash
# Server Configuration
SERVER_HOST=35.177.226.170
SERVER_PORT=8000
SERVER_PROTOCOL=http
FRONTEND_URL=http://35.177.226.170

# API Endpoints
NEXT_PUBLIC_API_URL=http://35.177.226.170/api
UPLOAD_ENDPOINT=/api/documents/upload
DOWNLOAD_ENDPOINT=/api/documents/download

# External Service URLs
SUPPORT_URL=mailto:support@aria-dms.com
DOCUMENTATION_URL=/docs
HELP_URL=/help
```

### Database Configuration
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=aria_db
DATABASE_USER=aria
DATABASE_PASSWORD=aria_secure_password_2025
```

### Feature Flags
```bash
ENABLE_AI_FEATURES=false
ENABLE_OCR=true
ENABLE_SAP_INTEGRATION=false
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_CHAT=true
```

## Post-Deployment Access

### Application URLs
- **Main Application**: http://35.177.226.170
- **API Documentation**: http://35.177.226.170/api/docs
- **Health Check**: http://35.177.226.170/api/health

### System Monitoring
```bash
# SSH into server
ssh -i "SSLS.pem" ubuntu@35.177.226.170

# Run system monitor
/home/ubuntu/aria-deployment/monitor.sh

# Check service status
sudo systemctl status aria-backend
sudo systemctl status aria-frontend
sudo systemctl status nginx

# View logs
sudo journalctl -u aria-backend -f
sudo journalctl -u aria-frontend -f
sudo tail -f /var/log/nginx/error.log
```

## Service Management

### Start/Stop Services
```bash
# Start all services
sudo systemctl start aria-backend aria-frontend nginx

# Stop all services  
sudo systemctl stop aria-backend aria-frontend nginx

# Restart all services
sudo systemctl restart aria-backend aria-frontend nginx

# Enable auto-start on boot
sudo systemctl enable aria-backend aria-frontend nginx
```

### Update Application
```bash
# SSH into server
ssh -i "SSLS.pem" ubuntu@35.177.226.170

# Navigate to deployment directory
cd /home/ubuntu/aria-deployment

# Pull latest changes (if using git)
git pull origin main

# Restart services
sudo systemctl restart aria-backend aria-frontend
```

## Security Configuration

### Firewall Rules
```bash
# Allowed ports
- 22/tcp (SSH)
- 80/tcp (HTTP)
- 443/tcp (HTTPS - for future SSL setup)

# Check firewall status
sudo ufw status
```

### SSL Certificate Setup (Future)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Troubleshooting

### Common Issues

#### 1. SSH Connection Failed
```bash
# Check if server is running
ping 35.177.226.170

# Verify SSH key permissions
chmod 600 SSLS.pem

# Test SSH connection
ssh -i "SSLS.pem" -v ubuntu@35.177.226.170
```

#### 2. Services Not Starting
```bash
# Check service status
sudo systemctl status aria-backend
sudo systemctl status aria-frontend

# View detailed logs
sudo journalctl -u aria-backend --no-pager
sudo journalctl -u aria-frontend --no-pager

# Check port availability
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :3000
```

#### 3. Database Connection Issues
```bash
# Test PostgreSQL connection
sudo -u postgres psql -c "SELECT version();"

# Check if aria database exists
sudo -u postgres psql -l | grep aria

# Test application database connection
cd /home/ubuntu/aria-deployment/backend
source venv/bin/activate
python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://aria:aria_secure_password_2025@localhost:5432/aria_db'); print('Database connection successful')"
```

#### 4. Frontend Build Issues
```bash
# Rebuild frontend
cd /home/ubuntu/aria-deployment/frontend
npm install
npm run build

# Check build output
ls -la .next/
```

### Log Locations
- **Backend Logs**: `sudo journalctl -u aria-backend`
- **Frontend Logs**: `sudo journalctl -u aria-frontend`
- **Nginx Access**: `/var/log/nginx/access.log`
- **Nginx Error**: `/var/log/nginx/error.log`
- **System Logs**: `/var/log/syslog`

## Backup and Maintenance

### Database Backup
```bash
# Create backup
sudo -u postgres pg_dump aria_db > /home/ubuntu/aria-backups/aria_db_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
sudo -u postgres psql aria_db < /home/ubuntu/aria-backups/aria_db_backup.sql
```

### File Backup
```bash
# Backup uploads
tar -czf /home/ubuntu/aria-backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz /home/ubuntu/aria-deployment/uploads/

# Backup configuration
tar -czf /home/ubuntu/aria-backups/config_$(date +%Y%m%d_%H%M%S).tar.gz /home/ubuntu/aria-deployment/backend/.env /home/ubuntu/aria-deployment/frontend/.env.production
```

### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /home/ubuntu/aria-deployment/frontend
npm update

# Update Python packages
cd /home/ubuntu/aria-deployment/backend
source venv/bin/activate
pip install --upgrade -r ../requirements.txt
```

## Performance Optimization

### Nginx Optimization
- ✅ Gzip compression enabled
- ✅ Static file caching (1 year)
- ✅ Security headers configured
- ✅ Client max body size: 50MB

### Database Optimization
```bash
# PostgreSQL performance tuning
sudo nano /etc/postgresql/*/main/postgresql.conf

# Key settings to adjust:
# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
# maintenance_work_mem = 64MB
```

### Redis Optimization
```bash
# Redis configuration
sudo nano /etc/redis/redis.conf

# Key settings:
# maxmemory 512mb
# maxmemory-policy allkeys-lru
```

## Next Steps

1. **Test Application**: Visit http://35.177.226.170 and verify all features work
2. **SSL Setup**: Configure HTTPS with Let's Encrypt
3. **Domain Setup**: Point your domain to 35.177.226.170
4. **Monitoring**: Set up application monitoring and alerting
5. **Backups**: Configure automated daily backups
6. **Performance**: Monitor and optimize based on usage patterns

## Support

For deployment issues or questions:
- Check the troubleshooting section above
- Review service logs for error details
- Ensure all prerequisites are met
- Verify network connectivity and firewall settings

---

**Deployment Status**: Ready for execution once SSLS.pem is available
**Last Updated**: $(date)
**Server**: 35.177.226.170
**Services**: Backend (FastAPI) + Frontend (Next.js) + Database (PostgreSQL) + Cache (Redis) + Proxy (Nginx)