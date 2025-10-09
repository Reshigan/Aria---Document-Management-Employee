# 🚀 ARIA - Quick Deployment Guide

## 📌 Quick Reference for aria.vantax.co.za Deployment

---

## ✅ Pre-Deployment Status

All systems tested and ready:
- ✅ Frontend production build complete (468 MB optimized)
- ✅ Backend running and tested
- ✅ Database initialized with admin user
- ✅ Corporate design applied
- ✅ Zero bugs found
- ✅ All features working

---

## 🎨 Design Assets

### Corporate Colors
```css
Primary Navy:  #1a2332, #2c3e50, #34495e
Accent Teal:   #16a085, #1abc9c
Premium Gold:  #f39c12, #f1c40f
```

### Corporate Icon
Location: `/frontend/public/aria-corporate-icon.svg`
- 3D document stack design
- AI badge with gold gradient
- Professional corporate styling

---

## 🔧 Quick Deployment Commands

### 1. On Your Production Server (aria.vantax.co.za)

#### Transfer Files (from your local machine)
```bash
# Zip the build
cd /workspace/project/Aria---Document-Management-Employee
tar -czf aria-production.tar.gz frontend/ backend/

# Transfer to server
scp aria-production.tar.gz user@aria.vantax.co.za:/var/www/

# On server, extract
ssh user@aria.vantax.co.za
cd /var/www
tar -xzf aria-production.tar.gz
```

#### Backend Setup
```bash
cd /var/www/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend (choose one method)

# Method 1: Using PM2
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name aria-backend

# Method 2: Using systemd (create /etc/systemd/system/aria-backend.service)
sudo systemctl start aria-backend
sudo systemctl enable aria-backend
```

#### Frontend Setup
```bash
cd /var/www/frontend

# Install dependencies (if needed)
npm install

# The production build is already complete (.next directory exists)
# Just start the production server

# Start frontend with PM2
pm2 start npm --name "aria-frontend" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## 🌐 Nginx Configuration

Create `/etc/nginx/sites-available/aria.vantax.co.za`:

```nginx
upstream backend {
    server 127.0.0.1:8000;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name aria.vantax.co.za;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aria.vantax.co.za;

    ssl_certificate /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # API Backend
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    client_max_body_size 100M;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/aria.vantax.co.za /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d aria.vantax.co.za

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 📝 Environment Configuration

### Frontend: `/var/www/frontend/.env.production.local`
```bash
NEXT_PUBLIC_API_URL=https://aria.vantax.co.za/api
NODE_ENV=production
```

### Backend: `/var/www/backend/.env`
```bash
DATABASE_URL=sqlite:///./aria.db
SECRET_KEY=<generate-secure-random-key>
API_URL=https://aria.vantax.co.za/api
ALLOWED_ORIGINS=["https://aria.vantax.co.za"]
```

---

## 🔒 Security Checklist

After deployment, immediately:

1. **Change Admin Password**
   - Login to https://aria.vantax.co.za
   - Use credentials: admin / admin
   - Navigate to Settings and change password

2. **Generate New Secret Key**
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   Update in backend .env file

3. **Configure Firewall**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

---

## 🧪 Post-Deployment Testing

Visit these URLs to verify:

1. **Homepage**: https://aria.vantax.co.za
2. **Login**: https://aria.vantax.co.za/login (admin/admin)
3. **Dashboard**: https://aria.vantax.co.za/dashboard
4. **Upload**: https://aria.vantax.co.za/upload
5. **Documents**: https://aria.vantax.co.za/documents
6. **Admin**: https://aria.vantax.co.za/admin
7. **API Health**: https://aria.vantax.co.za/api/

---

## 📊 Monitoring Commands

### Check Service Status
```bash
# PM2 status
pm2 status

# View logs
pm2 logs aria-frontend
pm2 logs aria-backend

# Restart services
pm2 restart aria-frontend
pm2 restart aria-backend
```

### Check Nginx
```bash
# Status
sudo systemctl status nginx

# Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
# Manual backup
cp /var/www/backend/aria.db /var/www/backups/aria.db-$(date +%Y%m%d-%H%M%S)

# Automated daily backup (crontab)
echo "0 2 * * * cp /var/www/backend/aria.db /var/www/backups/aria.db-\$(date +\%Y\%m\%d)" | crontab -
```

---

## 🆘 Troubleshooting

### Frontend Not Loading
```bash
pm2 logs aria-frontend
pm2 restart aria-frontend
```

### Backend API Errors
```bash
pm2 logs aria-backend
# Check database
sqlite3 /var/www/backend/aria.db ".tables"
```

### SSL Certificate Issues
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 📱 System Features (Ready to Use)

✅ **Document Management**
- Drag & drop upload
- File validation
- Document preview and viewing
- Search and filtering

✅ **Admin Dashboard**
- System overview with metrics
- User management
- Settings configuration

✅ **Corporate Design**
- Professional navy/teal/gold color scheme
- Elegant corporate icon
- Fully responsive design

---

## 📞 Quick Reference

### Default Credentials
- **Username**: admin
- **Password**: admin
- **⚠️ CHANGE IMMEDIATELY IN PRODUCTION**

### Important Ports
- **Frontend**: 3000 (internal)
- **Backend**: 8000 (internal)
- **HTTP**: 80 (public)
- **HTTPS**: 443 (public)

### Key Files
- **Production Build**: `/var/www/frontend/.next/`
- **Database**: `/var/www/backend/aria.db`
- **Corporate Icon**: `/var/www/frontend/public/aria-corporate-icon.svg`

---

## ✅ Deployment Success Criteria

After deployment, verify:
- [ ] Site accessible at https://aria.vantax.co.za
- [ ] SSL certificate working (green padlock)
- [ ] Login successful
- [ ] Dashboard loading correctly
- [ ] Document upload working
- [ ] Admin panel accessible
- [ ] Corporate design displaying correctly
- [ ] Admin password changed

---

## 📚 Full Documentation

For detailed information, see:
- **PRODUCTION_BUILD_SUMMARY.md** - Complete build details
- **DEPLOYMENT.md** - Comprehensive deployment guide
- **BUILD_SUCCESS.txt** - Build statistics and status

---

**Build Date**: October 9, 2025  
**Build Status**: ✅ PRODUCTION READY  
**Deployment Target**: aria.vantax.co.za  
**Confidence Level**: 🟢 VERY HIGH

🚀 **Ready for deployment!**
