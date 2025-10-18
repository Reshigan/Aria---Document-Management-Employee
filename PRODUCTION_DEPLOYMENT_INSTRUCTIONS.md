# 🚀 ARIA PRODUCTION DEPLOYMENT INSTRUCTIONS

## Complete End-to-End Single Server Deployment with CI/CD

---

## 📋 DEPLOYMENT OVERVIEW

This document provides complete instructions for deploying the Aria Document Management System to a single production server with full CI/CD automation.

### ✨ What's Included:
- **Complete Full-Stack Application**: Backend (FastAPI) + Frontend (Next.js)
- **Automated CI/CD Pipeline**: GitHub Actions with automated testing
- **Production Security**: SSL, firewall, fail2ban, monitoring
- **Health Monitoring**: Automated health checks and service recovery
- **Backup System**: Automated backups and rollback capabilities
- **Performance Optimization**: PM2 process management, Nginx reverse proxy

---

## 🎯 QUICK DEPLOYMENT (5 Minutes)

### Option 1: Direct Server Deployment

```bash
# 1. SSH to your server
ssh root@your-server.com

# 2. Download and run deployment script
curl -sSL https://raw.githubusercontent.com/Reshigan/Aria---Document-Management-Employee/main/deploy_full_stack_single_server.sh | bash

# 3. Access your application
# https://your-domain.com
```

### Option 2: Local Deployment Script

```bash
# 1. Clone repository
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
cd Aria---Document-Management-Employee

# 2. Configure server details
nano deploy_full_stack_single_server.sh
# Update SERVER_HOST="your-server.com"

# 3. Run deployment
chmod +x deploy_full_stack_single_server.sh
./deploy_full_stack_single_server.sh
```

---

## 🔧 DETAILED DEPLOYMENT PROCESS

### Phase 1: Server Requirements

**Minimum Server Specifications:**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 20GB minimum, 50GB recommended
- **CPU**: 2 cores minimum
- **Network**: Public IP with ports 80, 443, 22 open

**Required Software** (auto-installed by script):
- Node.js 18+
- Python 3.8+
- Nginx
- Git
- PM2
- UFW Firewall
- Fail2ban

### Phase 2: Pre-Deployment Checklist

```bash
# 1. Verify server access
ssh root@your-server.com

# 2. Update system
apt update && apt upgrade -y

# 3. Install basic requirements
apt install -y curl wget git nginx python3 python3-pip nodejs npm

# 4. Configure domain (if using)
# Point your domain A record to server IP
```

### Phase 3: Automated Deployment

The deployment script performs these actions automatically:

1. **🧹 Server Cleanup**: Removes old installations, creates backups
2. **📦 Code Deployment**: Clones latest code from GitHub main branch
3. **🔧 Backend Setup**: Python environment, dependencies, database
4. **🎨 Frontend Setup**: Node.js dependencies, production build
5. **🔐 Security Hardening**: Firewall, SSL, fail2ban configuration
6. **📊 Monitoring Setup**: Health checks, log rotation, alerts
7. **🚀 Service Startup**: PM2 process management, Nginx configuration
8. **✅ Validation**: Comprehensive health checks and testing

### Phase 4: Post-Deployment Verification

```bash
# Check service status
pm2 status

# View logs
pm2 logs

# Check health endpoints
curl https://your-domain.com/api/health

# Monitor system
tail -f /var/log/aria/monitor.log
```

---

## 🔐 SECURITY FEATURES

### Implemented Security Measures:
- **SSL/TLS Encryption**: Automatic HTTPS with Let's Encrypt
- **Firewall Protection**: UFW with minimal open ports
- **Intrusion Prevention**: Fail2ban for SSH and web attacks
- **Rate Limiting**: API rate limiting and DDoS protection
- **Security Headers**: HSTS, CSP, X-Frame-Options
- **Input Validation**: Comprehensive input sanitization
- **Authentication**: JWT-based secure authentication
- **Database Security**: SQL injection prevention

### Security Configuration Files:
- `nginx-security.conf`: Nginx security configuration
- `security_config.json`: Application security settings
- `security_hardening.py`: Security audit and hardening script

---

## 📊 MONITORING & MAINTENANCE

### Health Monitoring:
- **Automated Health Checks**: Every 5 minutes
- **Service Recovery**: Automatic restart on failure
- **Log Rotation**: Daily log rotation with 7-day retention
- **Disk Space Monitoring**: Alerts at 90% usage
- **Performance Metrics**: Response time and error tracking

### Maintenance Commands:
```bash
# View system status
pm2 status
systemctl status nginx

# Restart services
pm2 restart all
systemctl restart nginx

# View logs
pm2 logs
tail -f /var/log/aria/*.log

# Update application
cd /var/www/aria
git pull origin main
pm2 restart all

# Backup database
cp /var/www/aria/backend/aria.db /var/backups/aria/aria-$(date +%Y%m%d).db
```

---

## 🧪 AUTOMATED TESTING

### Test Suite Features:
- **Backend Health Tests**: API endpoint validation
- **Authentication Tests**: Login and security validation
- **Document Management Tests**: File operations testing
- **Performance Tests**: Response time validation
- **Error Handling Tests**: Error response validation
- **Frontend Build Tests**: Build process validation

### Running Tests:
```bash
# Run full test suite
cd /var/www/aria
python3 automated_testing_suite.py

# Run production tests
python3 automated_testing_suite.py --production

# View test results
cat automated_test_results.json
```

---

## 🔄 CI/CD PIPELINE

### GitHub Actions Workflow:
1. **Code Push**: Triggers on push to main branch
2. **Automated Testing**: Runs comprehensive test suite
3. **Build Validation**: Validates frontend and backend builds
4. **Security Scanning**: Runs security audit
5. **Deployment**: Deploys to production server
6. **Health Validation**: Verifies deployment success
7. **Rollback**: Automatic rollback on failure

### Workflow Configuration:
- `.github/workflows/deploy.yml`: Main deployment workflow
- Automated testing before deployment
- Zero-downtime deployment with health checks
- Automatic rollback on failure

---

## 🚨 TROUBLESHOOTING

### Common Issues:

**1. Services Not Starting:**
```bash
# Check logs
pm2 logs
journalctl -u nginx

# Restart services
pm2 restart all
systemctl restart nginx
```

**2. Database Issues:**
```bash
# Check database
cd /var/www/aria/backend
python3 -c "from main import *; print('Database OK')"

# Reset database
rm aria.db
python3 -c "from main import *; Base.metadata.create_all(bind=engine)"
```

**3. SSL Certificate Issues:**
```bash
# Renew certificate
certbot renew --force-renewal
systemctl reload nginx
```

**4. Port Conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :8000
netstat -tulpn | grep :12001

# Kill conflicting processes
pkill -f "port 8000"
```

### Support Contacts:
- **Technical Support**: admin@aria.vantax.co.za
- **Documentation**: https://github.com/Reshigan/Aria---Document-Management-Employee
- **Issues**: https://github.com/Reshigan/Aria---Document-Management-Employee/issues

---

## 📈 PERFORMANCE OPTIMIZATION

### Recommended Optimizations:
- **Database**: Consider PostgreSQL for high-volume usage
- **Caching**: Implement Redis for session and data caching
- **CDN**: Use CloudFlare or similar for static asset delivery
- **Load Balancing**: Implement for multiple server deployments
- **Monitoring**: Add Prometheus/Grafana for advanced monitoring

### Scaling Options:
- **Vertical Scaling**: Increase server resources
- **Horizontal Scaling**: Add multiple server instances
- **Database Scaling**: Separate database server
- **Microservices**: Split into separate services

---

## 🎯 ACCESS INFORMATION

### Default Credentials:
- **Admin User**: admin@aria.vantax.co.za / admin123
- **Demo User**: demo@aria.vantax.co.za / demo123

### Application URLs:
- **Main Application**: https://your-domain.com
- **API Documentation**: https://your-domain.com/api/docs
- **Admin Panel**: https://your-domain.com/admin
- **Health Check**: https://your-domain.com/api/health

### File Locations:
- **Application**: `/var/www/aria/`
- **Logs**: `/var/log/aria/`
- **Backups**: `/var/backups/aria/`
- **SSL Certificates**: `/etc/letsencrypt/live/your-domain.com/`

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] Server meets minimum requirements
- [ ] Domain DNS configured (if applicable)
- [ ] SSH access to server confirmed
- [ ] Backup of existing data (if applicable)

### During Deployment:
- [ ] Run deployment script
- [ ] Monitor deployment logs
- [ ] Verify service startup
- [ ] Test health endpoints

### Post-Deployment:
- [ ] Access application via browser
- [ ] Test login functionality
- [ ] Upload test document
- [ ] Verify SSL certificate
- [ ] Configure monitoring alerts
- [ ] Update DNS if needed
- [ ] Document admin credentials

---

## 🎉 SUCCESS CRITERIA

Your deployment is successful when:
- ✅ Application accessible via HTTPS
- ✅ Login functionality working
- ✅ Document upload/download working
- ✅ API endpoints responding
- ✅ SSL certificate valid
- ✅ Services auto-starting on reboot
- ✅ Health monitoring active
- ✅ Logs being generated properly

---

**🚀 Ready for Production Deployment!**

The Aria Document Management System is now ready for immediate production deployment with full CI/CD automation, comprehensive security, and enterprise-grade monitoring.

For support or questions, contact: admin@aria.vantax.co.za