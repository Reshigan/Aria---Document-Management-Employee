# ARIA Production Deployment Guide

## 🚀 Deploying to Your Production Server (3.8.139.178)

This guide will walk you through deploying ARIA to your production server.

---

## Prerequisites

- ✅ AWS EC2 instance running Ubuntu
- ✅ PEM key file: `VantaX-2.pem`
- ✅ Server IP: `3.8.139.178`
- ✅ SSH access to the server

---

## Step 1: Prepare Local Files

Make the deployment script executable:

```bash
cd /workspace/project/Aria---Document-Management-Employee
chmod +x deploy_production.sh
chmod +x test_production.py
chmod 400 VantaX-2.pem  # Secure the PEM file
```

---

## Step 2: Transfer Files to Production Server

### Option A: Using SCP (Recommended)

```bash
# Create a deployment package
cd /workspace/project
tar -czf aria-deployment.tar.gz Aria---Document-Management-Employee/

# Transfer to server
scp -i VantaX-2.pem aria-deployment.tar.gz ubuntu@3.8.139.178:/home/ubuntu/

# Transfer deployment scripts
scp -i VantaX-2.pem Aria---Document-Management-Employee/deploy_production.sh ubuntu@3.8.139.178:/home/ubuntu/
scp -i VantaX-2.pem Aria---Document-Management-Employee/test_production.py ubuntu@3.8.139.178:/home/ubuntu/
```

### Option B: Using Git (If you have a repository)

```bash
# SSH into server
ssh -i VantaX-2.pem ubuntu@3.8.139.178

# Clone repository
git clone <your-repository-url>
cd Aria---Document-Management-Employee
```

---

## Step 3: SSH into Production Server

```bash
ssh -i VantaX-2.pem ubuntu@3.8.139.178
```

---

## Step 4: Extract and Prepare Files (If using SCP)

```bash
# Extract the deployment package
cd /home/ubuntu
tar -xzf aria-deployment.tar.gz
cd Aria---Document-Management-Employee

# Make scripts executable
chmod +x deploy_production.sh
chmod +x test_production.py
```

---

## Step 5: Run Deployment Script

```bash
# Run the automated deployment
./deploy_production.sh
```

This script will:
1. Update system packages
2. Install required software (Python, Node.js, Nginx, PostgreSQL)
3. Create application directory
4. Set up Python virtual environment
5. Install backend dependencies
6. Install and build frontend
7. Configure environment variables
8. Set up systemd services
9. Start the application

**Expected Duration:** 5-10 minutes

---

## Step 6: Verify Deployment

After deployment completes, the script will display:
- Frontend URL
- Backend API URL
- API Documentation URL

### Manual Verification

```bash
# Check backend service
sudo systemctl status aria-backend

# Check frontend service
sudo systemctl status aria-frontend

# Check if services are listening
sudo netstat -tulpn | grep -E ':(8000|3000)'

# Test backend health
curl http://localhost:8000/api/v1/health
```

---

## Step 7: Run End-to-End Tests

```bash
# Run the production test suite
python3 test_production.py --server 3.8.139.178
```

Expected output:
```
============================================================
ARIA Production Server - End-to-End Test
============================================================
Server: 3.8.139.178
Backend: http://3.8.139.178:8000/api/v1
Frontend: http://3.8.139.178:3000
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

## Step 8: Configure Firewall (AWS Security Group)

Ensure these ports are open in your AWS Security Group:

- **Port 22** (SSH) - Your IP only
- **Port 80** (HTTP) - 0.0.0.0/0
- **Port 443** (HTTPS) - 0.0.0.0/0
- **Port 3000** (Frontend) - 0.0.0.0/0 (temporary, will be behind Nginx)
- **Port 8000** (Backend API) - 0.0.0.0/0 (temporary, will be behind Nginx)

### From AWS Console:
1. Go to EC2 → Security Groups
2. Select your instance's security group
3. Edit Inbound Rules
4. Add the rules above

### Or using AWS CLI:
```bash
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxx \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxx \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

---

## Step 9: Access Your Application

Once deployed, access your ARIA system:

- **Frontend**: `http://3.8.139.178:3000`
- **Backend API**: `http://3.8.139.178:8000/api/v1`
- **API Docs**: `http://3.8.139.178:8000/api/v1/docs`

---

## Step 10: (Optional) Configure Nginx Reverse Proxy

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/aria
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name 3.8.139.178;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Now access via: `http://3.8.139.178` (port 80)

---

## Step 11: (Optional) Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain if you have one)
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
sudo journalctl -u aria-backend -n 50 --no-pager

# Check if port is already in use
sudo lsof -i :8000

# Restart service
sudo systemctl restart aria-backend
```

### Frontend Won't Start

```bash
# Check logs
sudo journalctl -u aria-frontend -n 50 --no-pager

# Check if port is already in use
sudo lsof -i :3000

# Restart service
sudo systemctl restart aria-frontend
```

### Database Issues

```bash
# Check database permissions
ls -la /var/www/aria/backend/aria.db

# Fix permissions if needed
sudo chown ubuntu:ubuntu /var/www/aria/backend/aria.db
```

### Can't Access from Browser

1. Check AWS Security Group rules
2. Check Ubuntu firewall: `sudo ufw status`
3. Test local access: `curl http://localhost:3000`
4. Check service status: `systemctl status aria-*`

---

## Maintenance Commands

### View Logs

```bash
# Backend logs (real-time)
sudo journalctl -u aria-backend -f

# Frontend logs (real-time)
sudo journalctl -u aria-frontend -f

# Last 100 lines
sudo journalctl -u aria-backend -n 100 --no-pager
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart aria-backend

# Restart frontend
sudo systemctl restart aria-frontend

# Restart both
sudo systemctl restart aria-backend aria-frontend
```

### Stop Services

```bash
sudo systemctl stop aria-backend aria-frontend
```

### Update Application

```bash
# Pull latest changes
cd /var/www/aria
git pull

# Restart services
sudo systemctl restart aria-backend aria-frontend
```

---

## Production Checklist

After deployment, verify:

- [ ] Backend service running (`systemctl status aria-backend`)
- [ ] Frontend service running (`systemctl status aria-frontend`)
- [ ] Can access frontend in browser
- [ ] Can access API docs
- [ ] Can register new user
- [ ] Can login with user
- [ ] Can upload document
- [ ] Can view documents
- [ ] AI chat working
- [ ] All 10 E2E tests passing
- [ ] Firewall configured
- [ ] (Optional) Nginx reverse proxy configured
- [ ] (Optional) SSL certificate installed
- [ ] (Optional) Monitoring set up

---

## Quick Command Reference

```bash
# SSH to server
ssh -i VantaX-2.pem ubuntu@3.8.139.178

# Check service status
sudo systemctl status aria-backend aria-frontend

# View logs
sudo journalctl -u aria-backend -f

# Restart services
sudo systemctl restart aria-backend aria-frontend

# Run tests
python3 test_production.py --server 3.8.139.178

# Check listening ports
sudo netstat -tulpn | grep -E ':(8000|3000)'
```

---

## Support

If you encounter issues:

1. Check the logs: `sudo journalctl -u aria-backend -n 100`
2. Verify services are running: `systemctl status aria-*`
3. Test local connectivity: `curl http://localhost:8000/api/v1/health`
4. Check firewall: `sudo ufw status` and AWS Security Group
5. Review the deployment script output for errors

---

## Success Criteria

Your deployment is successful when:

✅ All services are running  
✅ All 10 E2E tests pass  
✅ Frontend accessible from browser  
✅ Can register and login users  
✅ Can upload and manage documents  
✅ AI chat responds correctly  

---

**Version**: 2.0.0  
**Last Updated**: 2025-10-07  
**Status**: Production Ready

**Ready to deploy! 🚀**
