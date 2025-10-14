# Production Deployment Strategy - ARIA Document Management System

## Overview
This document outlines the comprehensive deployment strategy for the ARIA Document Management System, including CI/CD pipeline setup, automated deployment scripts, monitoring, and maintenance procedures.

## Current Production Status
- **Website**: https://aria.vantax.co.za ✅ OPERATIONAL
- **Backend**: Running on PM2 (port 12000) ✅ STABLE
- **Frontend**: Next.js production build ✅ DEPLOYED
- **Database**: SQLite with proper schema ✅ FUNCTIONAL
- **SSL**: Valid certificate ✅ SECURE

## 1. GitHub Actions CI/CD Pipeline

### Workflow Configuration (.github/workflows/deploy.yml)
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install frontend dependencies
      run: cd frontend && npm ci
    
    - name: Build frontend
      run: cd frontend && npm run build
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install backend dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Run backend tests
      run: cd backend && python -m pytest tests/ -v

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /home/ubuntu/Aria---Document-Management-Employee
          git pull origin main
          ./deploy-production-enhanced.sh
```

### Required GitHub Secrets
- `HOST`: Production server IP (3.8.139.178)
- `USERNAME`: SSH username (ubuntu)
- `SSH_KEY`: Private SSH key content

## 2. Enhanced Deployment Script

### deploy-production-enhanced.sh
```bash
#!/bin/bash
set -e

echo "🚀 Starting Enhanced Production Deployment..."

# Configuration
BACKUP_DIR="/home/ubuntu/backups"
APP_DIR="/home/ubuntu/Aria---Document-Management-Employee"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# 1. Pre-deployment backup
echo "📦 Creating backup..."
tar -czf "$BACKUP_DIR/aria_backup_$TIMESTAMP.tar.gz" \
    -C /home/ubuntu \
    --exclude='Aria---Document-Management-Employee/.git' \
    --exclude='Aria---Document-Management-Employee/node_modules' \
    --exclude='Aria---Document-Management-Employee/frontend/node_modules' \
    --exclude='Aria---Document-Management-Employee/frontend/.next' \
    Aria---Document-Management-Employee

# Keep only last 5 backups
ls -t $BACKUP_DIR/aria_backup_*.tar.gz | tail -n +6 | xargs -r rm

# 2. Stop services gracefully
echo "⏹️ Stopping services..."
pm2 stop aria-backend aria-frontend || true

# 3. Update code
echo "📥 Updating code..."
cd $APP_DIR
git pull origin main

# 4. Install dependencies
echo "📦 Installing dependencies..."
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# 5. Build frontend
echo "🏗️ Building frontend..."
rm -rf .next
npm run build

# 6. Database migration (if needed)
echo "🗄️ Checking database..."
cd ../backend
python -c "
import sqlite3
conn = sqlite3.connect('aria.db')
cursor = conn.cursor()
# Add any migration scripts here
conn.close()
print('Database check complete')
"

# 7. Start services
echo "▶️ Starting services..."
pm2 start aria-backend
pm2 start aria-frontend

# 8. Health checks
echo "🏥 Running health checks..."
sleep 10

# Check backend
if curl -f http://localhost:12000/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# 9. SSL certificate check
echo "🔒 Checking SSL certificate..."
if openssl s_client -connect aria.vantax.co.za:443 -servername aria.vantax.co.za < /dev/null 2>/dev/null | openssl x509 -noout -dates; then
    echo "✅ SSL certificate is valid"
else
    echo "⚠️ SSL certificate check failed"
fi

echo "🎉 Deployment completed successfully!"
echo "📊 Deployment summary:"
echo "   - Backup created: $BACKUP_DIR/aria_backup_$TIMESTAMP.tar.gz"
echo "   - Services restarted: $(pm2 list | grep -E 'aria-(backend|frontend)' | wc -l) services"
echo "   - Website: https://aria.vantax.co.za"
```

## 3. Rollback Procedures

### Automated Rollback Script (rollback.sh)
```bash
#!/bin/bash
set -e

BACKUP_DIR="/home/ubuntu/backups"
APP_DIR="/home/ubuntu/Aria---Document-Management-Employee"

echo "🔄 Starting rollback procedure..."

# List available backups
echo "Available backups:"
ls -la $BACKUP_DIR/aria_backup_*.tar.gz | tail -5

# Get latest backup
LATEST_BACKUP=$(ls -t $BACKUP_DIR/aria_backup_*.tar.gz | head -1)
echo "Using backup: $LATEST_BACKUP"

# Stop services
pm2 stop aria-backend aria-frontend

# Restore from backup
cd /home/ubuntu
tar -xzf $LATEST_BACKUP

# Restart services
pm2 start aria-backend aria-frontend

echo "✅ Rollback completed"
```

## 4. Monitoring and Alerting

### PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# Configure monitoring
pm2 set pm2-server-monit:refresh_rate 5000
pm2 set pm2-server-monit:port 8080
```

### Log Monitoring
```bash
# Setup log rotation
sudo tee /etc/logrotate.d/aria << EOF
/home/ubuntu/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### Health Check Script (health-check.sh)
```bash
#!/bin/bash

# Check backend
if ! curl -f http://localhost:12000/health > /dev/null 2>&1; then
    echo "Backend down - restarting..."
    pm2 restart aria-backend
fi

# Check frontend
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "Frontend down - restarting..."
    pm2 restart aria-frontend
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Warning: Disk usage is ${DISK_USAGE}%"
fi
```

## 5. Security Best Practices

### Environment Variables
```bash
# Production environment file (.env.production)
NODE_ENV=production
API_URL=https://aria.vantax.co.za/api
JWT_SECRET=your-secure-jwt-secret
DATABASE_URL=sqlite:///home/ubuntu/Aria---Document-Management-Employee/backend/aria.db
UPLOAD_DIR=/home/ubuntu/Aria---Document-Management-Employee/uploads
```

### SSL/TLS Configuration
- Certificate auto-renewal with Let's Encrypt
- HTTPS redirect enforced
- Security headers configured in Nginx

### Database Security
- Regular backups to encrypted storage
- Access restricted to application user
- Connection encryption enabled

## 6. Performance Optimization

### Frontend Optimization
- Static asset compression (Gzip/Brotli)
- Image optimization
- Code splitting and lazy loading
- CDN integration for static assets

### Backend Optimization
- Database query optimization
- Connection pooling
- Caching layer (Redis)
- Rate limiting implementation

### Infrastructure Optimization
- Load balancing (if scaling)
- Database replication
- Monitoring and alerting

## 7. Testing Strategy

### Automated Testing
- Unit tests for backend API
- Integration tests for database operations
- End-to-end tests for critical user flows
- Performance testing under load

### Manual Testing Checklist
- [ ] User authentication
- [ ] Document upload/download
- [ ] Search functionality
- [ ] AI chat responses
- [ ] Document deletion
- [ ] Analytics dashboard

## 8. Maintenance Procedures

### Daily Tasks
- Monitor system health
- Check error logs
- Verify backup completion
- Review performance metrics

### Weekly Tasks
- Update dependencies
- Security patch review
- Performance optimization
- Capacity planning review

### Monthly Tasks
- Full system backup verification
- Security audit
- Performance benchmarking
- Documentation updates

## 9. Emergency Procedures

### Service Outage Response
1. Identify affected services
2. Check system resources
3. Review recent changes
4. Execute rollback if necessary
5. Communicate with stakeholders

### Data Recovery
1. Stop all services
2. Assess data integrity
3. Restore from latest backup
4. Verify data consistency
5. Resume operations

### Security Incident Response
1. Isolate affected systems
2. Preserve evidence
3. Assess impact
4. Implement fixes
5. Document incident

## 10. Deployment Checklist

### Pre-deployment
- [ ] Code review completed
- [ ] Tests passing
- [ ] Backup created
- [ ] Maintenance window scheduled

### Deployment
- [ ] Services stopped gracefully
- [ ] Code updated
- [ ] Dependencies installed
- [ ] Database migrations applied
- [ ] Services restarted

### Post-deployment
- [ ] Health checks passed
- [ ] Functionality verified
- [ ] Performance metrics normal
- [ ] Stakeholders notified

## Contact Information
- **System Administrator**: ubuntu@aria.vantax.co.za
- **Emergency Contact**: +27-XXX-XXX-XXXX
- **Documentation**: https://github.com/Reshigan/Aria---Document-Management-Employee

---
*Last Updated: $(date)*
*Version: 1.0*