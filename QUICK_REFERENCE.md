# 🚀 ARIA ERP - Quick Reference Guide

**Production Server:** aria.vantax.co.za (3.8.139.178)  
**Last Deployed:** October 29, 2025 12:08 SAST

---

## 🌐 Access URLs

### Frontend
- **Main Dashboard:** https://aria.vantax.co.za
- **Bot Dashboard:** https://aria.vantax.co.za/bots
- **ERP Modules:** https://aria.vantax.co.za/erp
- **Theme Preview:** https://aria.vantax.co.za/theme-preview

### Backend API
- **Base API:** https://aria.vantax.co.za/api
- **Health Check:** https://aria.vantax.co.za/api/health
- **API Docs:** https://aria.vantax.co.za/api/docs
- **Bot Registry:** https://aria.vantax.co.za/api/bots
- **ERP Endpoints:** https://aria.vantax.co.za/api/erp/*

---

## 🔑 SSH Access

```bash
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
```

---

## 📂 Server Directory Structure

```
/var/www/aria/
├── frontend/
│   └── dist/              # React frontend (Vanta X theme)
└── backend/
    ├── main.py            # FastAPI application
    ├── working_main.py    # Symlink to main.py
    ├── bots/              # 65 AI bot files
    ├── erp/               # 12 ERP module directories
    ├── venv/              # Python virtual environment
    ├── aria_production.db # Production database
    └── .env               # Environment configuration
```

---

## 🔧 Service Management

### Check Service Status
```bash
sudo systemctl status aria-backend
sudo systemctl status nginx
```

### Restart Services
```bash
sudo systemctl restart aria-backend
sudo systemctl restart nginx
```

### View Logs
```bash
# Backend logs
sudo tail -f /var/log/aria-backend.log

# Error logs
sudo tail -f /var/log/aria-backend-error.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check Port Usage
```bash
sudo lsof -i :8000  # Backend API
sudo lsof -i :80    # HTTP
sudo lsof -i :443   # HTTPS
```

---

## 📦 Deployment Commands

### Frontend Deployment
```bash
# Upload frontend package
scp -i /path/to/Vantax-2.pem aria-themed-frontend.tar.gz ubuntu@3.8.139.178:/tmp/

# Deploy on server
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
cd /tmp
tar -xzf aria-themed-frontend.tar.gz
sudo rm -rf /var/www/aria/frontend/dist/*
sudo cp -r dist/* /var/www/aria/frontend/dist/
sudo systemctl reload nginx
```

### Backend Deployment
```bash
# Upload backend package
scp -i /path/to/Vantax-2.pem aria-backend-full.tar.gz ubuntu@3.8.139.178:/tmp/

# Deploy on server
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
cd /tmp
tar -xzf aria-backend-full.tar.gz
sudo systemctl stop aria-backend
sudo cp -r backend/bots/* /var/www/aria/backend/bots/
sudo cp -r backend/erp/* /var/www/aria/backend/erp/
sudo chown -R www-data:www-data /var/www/aria/backend/bots /var/www/aria/backend/erp
sudo systemctl start aria-backend
```

---

## 🗄️ Database Management

### Backup Database
```bash
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
cd /var/www/aria/backend
sudo cp aria_production.db aria_production.db.backup.$(date +%Y%m%d_%H%M%S)
```

### Download Database
```bash
scp -i /path/to/Vantax-2.pem ubuntu@3.8.139.178:/var/www/aria/backend/aria_production.db ./
```

### Upload Database
```bash
scp -i /path/to/Vantax-2.pem aria_production.db ubuntu@3.8.139.178:/tmp/
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
sudo systemctl stop aria-backend
sudo cp /tmp/aria_production.db /var/www/aria/backend/aria_production.db
sudo chown www-data:www-data /var/www/aria/backend/aria_production.db
sudo systemctl start aria-backend
```

---

## 🤖 Bot Management

### List All Bots
```bash
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
ls -la /var/www/aria/backend/bots/*.py
```

### Check Bot Count
```bash
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
ls /var/www/aria/backend/bots/*.py | wc -l
```

### View Bot API Registry
```bash
curl -s https://aria.vantax.co.za/api/bots | jq
```

---

## 📊 ERP Module Management

### List All ERP Modules
```bash
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
ls -la /var/www/aria/backend/erp/
```

### Check ERP Module Count
```bash
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
ls -d /var/www/aria/backend/erp/*/ | wc -l
```

---

## 🔍 Health Checks

### Backend Health Check
```bash
curl -s https://aria.vantax.co.za/api/health
```

### Frontend Check
```bash
curl -I https://aria.vantax.co.za
```

### Full System Check
```bash
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178 "
sudo systemctl status aria-backend --no-pager | head -5 && \
sudo systemctl status nginx --no-pager | head -5 && \
curl -s http://127.0.0.1:8000/health && \
echo 'Bots:' && ls /var/www/aria/backend/bots/*.py | wc -l && \
echo 'ERP Modules:' && ls -d /var/www/aria/backend/erp/*/ | wc -l
"
```

---

## 🎨 Theme Information

### Current Theme: Vanta X
- **Primary Color:** Navy Blue (#1a1f3a)
- **Accent Color:** Gold (#f5b800)
- **Background:** Dark navy gradient
- **Typography:** Clean and professional

### Theme Files Location
```
/var/www/aria/frontend/dist/
├── index.html
├── assets/
│   ├── index-*.js
│   └── index-*.css
```

---

## 🐛 Troubleshooting

### Backend Not Starting
1. Check if port 8000 is in use:
   ```bash
   sudo lsof -i :8000
   sudo kill <PID>
   ```

2. Check error logs:
   ```bash
   sudo tail -50 /var/log/aria-backend-error.log
   ```

3. Verify symlink exists:
   ```bash
   ls -la /var/www/aria/backend/working_main.py
   ```

### Frontend Not Loading
1. Check nginx status:
   ```bash
   sudo systemctl status nginx
   ```

2. Check frontend files:
   ```bash
   ls -la /var/www/aria/frontend/dist/
   ```

3. Check nginx logs:
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

### Database Issues
1. Check database permissions:
   ```bash
   ls -la /var/www/aria/backend/aria_production.db
   ```

2. Verify database is accessible:
   ```bash
   sqlite3 /var/www/aria/backend/aria_production.db "SELECT COUNT(*) FROM sqlite_master;"
   ```

---

## 📞 Emergency Contacts

**Server:** aria.vantax.co.za (3.8.139.178)  
**SSH Key:** Vantax-2.pem  
**Support:** Check logs in `/var/log/aria-backend*.log`

---

## 📝 Component Inventory

### Bots (65 files)
- Financial (10): AR Collections, AP Processing, Cash Flow, etc.
- HR (8): Onboarding, Payroll, Leave, Performance, etc.
- Manufacturing (9): Production Planning, QC, Maintenance, etc.
- Procurement (11): RFQ, Vendor Management, Contract, etc.
- Sales/CRM (8): Lead Management, Opportunity, Orders, etc.
- Quality (2): Quality Control, Quality Assurance
- Maintenance (2): Preventive, Predictive Maintenance
- Document Management (7): Archive, Classification, Version Control, etc.
- Policy/Risk (3): Policy Management, Compliance, Risk Assessment
- Integration (2): API Gateway, Data Sync
- Core (5): Orchestration, Registry, NLP, Email, Controller

### ERP Modules (12 directories)
1. Financial Management
2. HR & Payroll
3. Manufacturing
4. Procurement
5. Inventory Management
6. Quality Management
7. Maintenance Management
8. Warehouse Management System (WMS)
9. Planning & Scheduling
10. Reporting & Analytics
11. Asset Management
12. Config (configuration module)

---

**Last Updated:** October 29, 2025  
**Status:** ✅ All systems operational
