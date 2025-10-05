# ARIA Deployment Troubleshooting Guide

## 🚨 Connection Issues

If you cannot connect to your EC2 instance, follow these steps:

### 1. Check EC2 Instance Status

**In AWS Console:**
1. Go to EC2 Dashboard
2. Check if instance `ec2-13-247-72-117.af-south-1.compute.amazonaws.com` is:
   - ✅ **Running** (not stopped/terminated)
   - ✅ **Status checks passed** (2/2 checks)
   - ✅ **Has public IP assigned**

### 2. Verify Security Group Settings

**Required inbound rules:**
```
Type        Protocol    Port Range    Source
SSH         TCP         22           Your IP/0.0.0.0/0
HTTP        TCP         80           0.0.0.0/0
HTTPS       TCP         443          0.0.0.0/0
Custom TCP  TCP         3000         0.0.0.0/0 (for frontend)
Custom TCP  TCP         8000         0.0.0.0/0 (for backend API)
```

### 3. Check Network ACLs

Ensure your subnet's Network ACL allows:
- Inbound: SSH (22), HTTP (80), HTTPS (443)
- Outbound: All traffic

### 4. Verify Key Pair

Ensure you're using the correct key pair:
```bash
# Check key permissions
ls -la VantaX.pem
# Should show: -rw------- (600 permissions)

# If not, fix permissions:
chmod 600 VantaX.pem
```

## 🔧 Alternative Connection Methods

### Method 1: AWS Systems Manager Session Manager

If SSH is blocked, use Session Manager:

1. **Install Session Manager Plugin:**
   ```bash
   # On Ubuntu/Debian
   curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
   sudo dpkg -i session-manager-plugin.deb
   ```

2. **Connect via Session Manager:**
   ```bash
   aws ssm start-session --target i-1234567890abcdef0
   ```

### Method 2: EC2 Instance Connect

1. Go to AWS Console → EC2 → Instances
2. Select your instance
3. Click "Connect" → "EC2 Instance Connect"
4. Use browser-based terminal

### Method 3: Serial Console (if enabled)

1. Go to AWS Console → EC2 → Instances
2. Select your instance
3. Actions → Monitor and troubleshoot → EC2 Serial Console

## 🚀 Manual Deployment Steps

Once connected to your server, run these commands:

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Download Deployment Script
```bash
cd /home/ubuntu
wget https://raw.githubusercontent.com/Reshigan/Aria---Document-Management-Employee/production-deployment-v1/deploy-production.sh
chmod +x deploy-production.sh
```

### Step 3: Run Deployment
```bash
./deploy-production.sh
```

### Step 4: Check Services
```bash
sudo systemctl status aria-backend
sudo systemctl status aria-frontend
sudo systemctl status nginx
```

## 🐛 Common Issues & Solutions

### Issue 1: "Permission denied (publickey)"
**Solution:**
```bash
# Ensure correct key permissions
chmod 600 VantaX.pem

# Try with verbose output
ssh -v -i "VantaX.pem" ubuntu@ec2-13-247-72-117.af-south-1.compute.amazonaws.com
```

### Issue 2: "Connection timed out"
**Solutions:**
1. Check security group allows SSH (port 22)
2. Verify instance is running
3. Check if instance has public IP
4. Try connecting from different network

### Issue 3: "Host key verification failed"
**Solution:**
```bash
ssh-keygen -R ec2-13-247-72-117.af-south-1.compute.amazonaws.com
```

### Issue 4: Database connection errors
**Solution:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Reset database if needed
sudo -u postgres psql -c "DROP DATABASE IF EXISTS aria_db;"
sudo -u postgres psql -c "CREATE DATABASE aria_db OWNER aria;"
```

### Issue 5: Frontend build fails
**Solution:**
```bash
cd /home/ubuntu/Aria---Document-Management-Employee/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📊 Health Check Commands

After deployment, verify everything is working:

```bash
# Check all services
sudo systemctl status aria-backend aria-frontend nginx postgresql redis

# Check ports are listening
sudo netstat -tlnp | grep -E ':(22|80|443|3000|8000|5432|6379)'

# Test API endpoint
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000

# Check logs
sudo journalctl -u aria-backend --since "10 minutes ago"
sudo journalctl -u aria-frontend --since "10 minutes ago"
```

## 🔒 Security Hardening

After successful deployment:

1. **Change default passwords:**
   ```bash
   # Edit backend .env file
   nano /home/ubuntu/Aria---Document-Management-Employee/backend/.env
   ```

2. **Configure firewall:**
   ```bash
   sudo ufw status
   sudo ufw enable
   ```

3. **Set up SSL certificate:**
   ```bash
   ./setup-ssl.sh your-domain.com your-email@domain.com
   ```

## 📞 Getting Help

If you continue to have issues:

1. **Check AWS CloudWatch logs**
2. **Review EC2 instance system logs**
3. **Verify billing/account status**
4. **Contact AWS support if infrastructure issues persist**

## 🎯 Quick Deployment Checklist

- [ ] EC2 instance is running
- [ ] Security group allows SSH, HTTP, HTTPS
- [ ] Key pair permissions are correct (600)
- [ ] Can connect via SSH or Session Manager
- [ ] Deployment script downloaded and executed
- [ ] All services are running
- [ ] Application accessible via browser
- [ ] SSL certificate configured (optional)
- [ ] Environment variables updated
- [ ] Database migrations completed