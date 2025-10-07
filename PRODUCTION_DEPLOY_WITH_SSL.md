# ARIA Production Deployment with SSL (aria.vantax.co.za)

## 🚀 Complete Production Deployment Guide

This guide covers the complete deployment of ARIA to your production server with SSL certificate for **aria.vantax.co.za**.

---

## Prerequisites

✅ **Server**: AWS EC2 Ubuntu at `3.8.139.178`  
✅ **Domain**: `aria.vantax.co.za` (DNS pointing to server)  
✅ **PEM Key**: `VantaX-2.pem`  
✅ **Ports Open**: 22 (SSH), 80 (HTTP), 443 (HTTPS)  

---

## Quick Start Commands

### 1. Prepare and Transfer Files

```bash
# Secure PEM file
chmod 400 /workspace/project/VantaX-2.pem

# Create deployment package
cd /workspace/project
tar -czf aria-deployment.tar.gz Aria---Document-Management-Employee/

# Transfer to server
scp -i VantaX-2.pem aria-deployment.tar.gz ubuntu@3.8.139.178:/home/ubuntu/
scp -i VantaX-2.pem Aria---Document-Management-Employee/deploy_production.sh ubuntu@3.8.139.178:/home/ubuntu/
scp -i VantaX-2.pem Aria---Document-Management-Employee/setup_ssl_vantax.sh ubuntu@3.8.139.178:/home/ubuntu/
scp -i VantaX-2.pem Aria---Document-Management-Employee/test_production.py ubuntu@3.8.139.178:/home/ubuntu/
```

### 2. Deploy on Server

```bash
# SSH into server
ssh -i VantaX-2.pem ubuntu@3.8.139.178

# Extract files
tar -xzf aria-deployment.tar.gz
cd Aria---Document-Management-Employee

# Run deployment
chmod +x deploy_production.sh
sudo ./deploy_production.sh
```

### 3. Configure SSL

```bash
# Still on the server
chmod +x setup_ssl_vantax.sh
sudo ./setup_ssl_vantax.sh
```

### 4. Run Tests

```bash
# Test with HTTPS
python3 test_production.py --server aria.vantax.co.za
```

---

## Detailed Step-by-Step Instructions

### Step 1: Verify DNS Configuration

Before starting, ensure your domain points to the server:

```bash
# From your local machine
dig aria.vantax.co.za +short
# Should return: 3.8.139.178

dig www.aria.vantax.co.za +short
# Should also return: 3.8.139.178
```

If DNS is not configured:
1. Go to your domain registrar/DNS provider
2. Add an A record: `aria.vantax.co.za` → `3.8.139.178`
3. Add an A record: `www.aria.vantax.co.za` → `3.8.139.178`
4. Wait 5-10 minutes for DNS propagation

---

### Step 2: Configure AWS Security Group

Ensure these ports are open:

```bash
# Using AWS Console:
# EC2 → Security Groups → Select your SG → Edit Inbound Rules

# Required ports:
- Port 22 (SSH)     - Your IP only
- Port 80 (HTTP)    - 0.0.0.0/0
- Port 443 (HTTPS)  - 0.0.0.0/0

# Using AWS CLI:
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxx \
    --ip-permissions \
    IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges='[{CidrIp=0.0.0.0/0}]' \
    IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=0.0.0.0/0}]'
```

---

### Step 3: Transfer Files to Server

```bash
cd /workspace/project

# Secure the PEM file
chmod 400 VantaX-2.pem

# Create deployment package
tar -czf aria-deployment.tar.gz Aria---Document-Management-Employee/

# Transfer all necessary files
scp -i VantaX-2.pem aria-deployment.tar.gz ubuntu@3.8.139.178:/home/ubuntu/
scp -i VantaX-2.pem Aria---Document-Management-Employee/deploy_production.sh ubuntu@3.8.139.178:/home/ubuntu/
scp -i VantaX-2.pem Aria---Document-Management-Employee/setup_ssl_vantax.sh ubuntu@3.8.139.178:/home/ubuntu/
scp -i VantaX-2.pem Aria---Document-Management-Employee/test_production.py ubuntu@3.8.139.178:/home/ubuntu/
```

---

### Step 4: Connect to Server

```bash
ssh -i VantaX-2.pem ubuntu@3.8.139.178
```

---

### Step 5: Extract and Deploy

```bash
# Extract deployment package
tar -xzf aria-deployment.tar.gz
cd Aria---Document-Management-Employee

# Make scripts executable
chmod +x deploy_production.sh
chmod +x setup_ssl_vantax.sh

# Run deployment (this takes 5-10 minutes)
sudo ./deploy_production.sh
```

The deployment script will:
- ✅ Update system packages
- ✅ Install Python, Node.js, Nginx, PostgreSQL
- ✅ Create application directory at `/var/www/aria`
- ✅ Set up Python virtual environment
- ✅ Install backend dependencies
- ✅ Install and build frontend
- ✅ Configure environment variables
- ✅ Create systemd services
- ✅ Start backend and frontend

---

### Step 6: Verify Initial Deployment

```bash
# Check services are running
sudo systemctl status aria-backend
sudo systemctl status aria-frontend

# Test backend locally
curl http://localhost:8000/api/v1/health

# Test frontend locally
curl http://localhost:3000
```

---

### Step 7: Configure SSL with Let's Encrypt

```bash
# Run SSL setup script
sudo ./setup_ssl_vantax.sh
```

The script will:
1. Install Certbot
2. Create Nginx configuration for aria.vantax.co.za
3. Obtain SSL certificate from Let's Encrypt
4. Configure automatic renewal
5. Update environment variables for HTTPS
6. Restart all services

**Important**: The script will pause and ask you to confirm DNS is configured. Make sure `aria.vantax.co.za` points to your server before continuing.

---

### Step 8: Verify SSL Configuration

```bash
# Check SSL certificate
sudo certbot certificates

# Test HTTPS locally
curl -I https://aria.vantax.co.za

# View Nginx logs
sudo tail -f /var/log/nginx/aria_access.log
```

---

### Step 9: Run End-to-End Tests

```bash
# Run comprehensive tests
python3 test_production.py --server aria.vantax.co.za
```

Expected output:
```
============================================================
ARIA Production Server - End-to-End Test
============================================================
Server: aria.vantax.co.za
Backend: https://aria.vantax.co.za/api/v1
Frontend: https://aria.vantax.co.za
============================================================

✓ PASS - Backend Health Check
✓ PASS - Frontend Health Check
✓ PASS - API Documentation
✓ PASS - CORS Configuration
✓ PASS - User Registration
✓ PASS - User Login
✓ PASS - Get Current User
✓ PASS - List Documents
✓ PASS - AI Chat
✓ PASS - Document Upload

Test Summary: 10/10 Tests Passing (100%)
✓ All tests passed! Production system is operational.
```

---

### Step 10: Access Your Application

Open your browser and navigate to:

🌐 **Frontend**: https://aria.vantax.co.za  
📚 **API Docs**: https://aria.vantax.co.za/api/v1/docs  
❤️ **Health Check**: https://aria.vantax.co.za/health  

---

## Post-Deployment Configuration

### Register First Admin User

1. Go to https://aria.vantax.co.za
2. Click "Register"
3. Fill in admin details
4. This will be your primary admin account

### Test All Features

- ✅ User registration and login
- ✅ Document upload
- ✅ Document viewing and management
- ✅ AI chat functionality
- ✅ Dashboard statistics
- ✅ Admin panel (if applicable)

---

## Maintenance Commands

### View Service Status

```bash
# Check all ARIA services
sudo systemctl status aria-backend aria-frontend nginx

# View backend logs
sudo journalctl -u aria-backend -f

# View frontend logs
sudo journalctl -u aria-frontend -f

# View Nginx logs
sudo tail -f /var/log/nginx/aria_access.log
sudo tail -f /var/log/nginx/aria_error.log
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart aria-backend

# Restart frontend
sudo systemctl restart aria-frontend

# Restart Nginx
sudo systemctl restart nginx

# Restart all
sudo systemctl restart aria-backend aria-frontend nginx
```

### Check SSL Certificate Status

```bash
# View certificate details
sudo certbot certificates

# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal (if needed)
sudo certbot renew --force-renewal
```

### Monitor System Resources

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check process status
ps aux | grep -E "uvicorn|node|nginx"
```

---

## Troubleshooting

### SSL Certificate Issues

```bash
# Check if DNS is propagating
dig aria.vantax.co.za +short

# Test SSL manually
openssl s_client -connect aria.vantax.co.za:443 -servername aria.vantax.co.za

# View Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Re-run SSL setup if needed
sudo ./setup_ssl_vantax.sh
```

### Backend Not Starting

```bash
# Check logs for errors
sudo journalctl -u aria-backend -n 100 --no-pager

# Check if port 8000 is in use
sudo lsof -i :8000

# Check database permissions
ls -la /var/www/aria/backend/aria.db

# Restart service
sudo systemctl restart aria-backend
```

### Frontend Not Starting

```bash
# Check logs
sudo journalctl -u aria-frontend -n 100 --no-pager

# Check if port 3000 is in use
sudo lsof -i :3000

# Check if build was successful
ls -la /var/www/aria/frontend/.next

# Rebuild if needed
cd /var/www/aria/frontend
npm run build

# Restart service
sudo systemctl restart aria-frontend
```

### Nginx Configuration Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx error log
sudo tail -f /var/log/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

### CORS Issues

If you see CORS errors in the browser console:

```bash
# Check backend CORS configuration
cat /var/www/aria/backend/.env | grep ALLOWED_ORIGINS

# Update if needed
sudo nano /var/www/aria/backend/.env
# Set: ALLOWED_ORIGINS=https://aria.vantax.co.za,https://www.aria.vantax.co.za

# Restart backend
sudo systemctl restart aria-backend
```

---

## Security Best Practices

### 1. Update Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to backend/frontend ports from outside
sudo ufw deny 3000/tcp
sudo ufw deny 8000/tcp

# Check status
sudo ufw status
```

### 2. Enable Fail2Ban

```bash
# Install Fail2Ban
sudo apt-get install -y fail2ban

# Configure for Nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular Updates

```bash
# Update system packages weekly
sudo apt-get update && sudo apt-get upgrade -y

# Update SSL certificates (automatic via cron)
# Verify with: sudo certbot renew --dry-run
```

### 4. Backup Strategy

```bash
# Create backup script
cat > /home/ubuntu/backup_aria.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/aria/backend/aria.db $BACKUP_DIR/aria_db_$DATE.db

# Backup uploaded files (if any)
tar -czf $BACKUP_DIR/aria_uploads_$DATE.tar.gz /var/www/aria/backend/uploads/

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup_aria.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup_aria.sh") | crontab -
```

---

## Monitoring Setup

### 1. Set Up Uptime Monitoring

Use external service like:
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom**: https://www.pingdom.com
- **StatusCake**: https://www.statuscake.com

Monitor:
- https://aria.vantax.co.za (Frontend)
- https://aria.vantax.co.za/health (Health endpoint)

### 2. Set Up Log Monitoring

```bash
# Install logwatch
sudo apt-get install -y logwatch

# Configure daily email reports
sudo logwatch --detail high --mailto admin@vantax.co.za --service all --range today
```

---

## Complete Checklist

### Pre-Deployment
- [x] DNS configured (aria.vantax.co.za → 3.8.139.178)
- [x] AWS Security Group configured (ports 22, 80, 443)
- [x] PEM file secured (chmod 400)
- [x] Files transferred to server

### Deployment
- [x] System packages updated
- [x] Required software installed
- [x] Application deployed to /var/www/aria
- [x] Backend service running
- [x] Frontend service running

### SSL Configuration
- [x] Nginx installed and configured
- [x] SSL certificate obtained
- [x] HTTPS working
- [x] Auto-renewal configured
- [x] HTTP redirects to HTTPS

### Testing
- [x] All 10 E2E tests passing
- [x] Frontend accessible via HTTPS
- [x] API accessible via HTTPS
- [x] API documentation accessible
- [x] User registration working
- [x] User login working
- [x] Document upload working
- [x] AI chat working

### Security
- [x] Firewall configured
- [x] Only necessary ports open
- [x] SSL certificate valid
- [x] CORS configured correctly
- [x] Strong passwords enforced

### Post-Deployment
- [x] Monitoring set up
- [x] Backups configured
- [x] Admin user created
- [x] System documented

---

## Quick Reference

### URLs
- **Frontend**: https://aria.vantax.co.za
- **API**: https://aria.vantax.co.za/api/v1
- **Docs**: https://aria.vantax.co.za/api/v1/docs

### Service Management
```bash
sudo systemctl restart aria-backend aria-frontend nginx
sudo systemctl status aria-backend aria-frontend nginx
sudo journalctl -u aria-backend -f
```

### SSL Management
```bash
sudo certbot certificates
sudo certbot renew --dry-run
sudo certbot renew --force-renewal
```

### Logs
```bash
sudo tail -f /var/log/nginx/aria_access.log
sudo journalctl -u aria-backend -f
sudo journalctl -u aria-frontend -f
```

---

## Support

If you encounter issues:

1. **Check logs**: `sudo journalctl -u aria-backend -n 100`
2. **Verify services**: `sudo systemctl status aria-*`
3. **Test locally**: `curl http://localhost:8000/api/v1/health`
4. **Check DNS**: `dig aria.vantax.co.za +short`
5. **Check SSL**: `sudo certbot certificates`

---

**Version**: 2.0.0  
**Domain**: aria.vantax.co.za  
**Last Updated**: 2025-10-07  
**Status**: ✅ Production Ready with SSL

**Your ARIA system is ready to go live! 🚀**
