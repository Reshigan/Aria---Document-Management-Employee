# 🚀 ARIA - Quick Deployment Guide

**Version:** 2.0  
**Status:** ✅ Ready for Production

---

## ⚡ Quick Start (5 Minutes)

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL (recommended) or SQLite

---

## 📦 Step 1: Clone & Setup (2 min)

```bash
# Clone repository
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
cd Aria---Document-Management-Employee

# Backend setup
cd backend
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

---

## 🔧 Step 2: Configure Environment (1 min)

### Backend (.env)
```bash
cd backend
cat > .env << EOF
DATABASE_URL=sqlite:///./aria.db
SECRET_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=*
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=52428800
EOF
```

### Frontend (.env.local)
```bash
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:12000
NEXT_PUBLIC_APP_NAME=ARIA
NEXT_PUBLIC_VERSION=2.0
EOF
```

---

## 🚀 Step 3: Start Services (1 min)

### Terminal 1: Backend
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 12000 --reload
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev -- -p 12001
```

---

## ✅ Step 4: Verify (1 min)

### Access Application
```
Frontend: http://localhost:12001
Backend:  http://localhost:12000
API Docs: http://localhost:12000/docs
```

### Test Login
```
Username: admin
Password: admin
```

---

## 🌐 Production Deployment

### Using Docker (Recommended)

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name aria-backend

# Build and start frontend
cd frontend
npm run build
pm2 start "npm start" --name aria-frontend

# Save PM2 config
pm2 save
pm2 startup
```

---

## 🔐 Security Checklist

### Before Going Live:
- [ ] Change admin password from "admin" to strong password
- [ ] Generate new SECRET_KEY for production
- [ ] Set CORS_ORIGINS to your domain only
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Configure backup system
- [ ] Enable logging and monitoring

---

## 📊 System URLs

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | http://localhost:12001 | https://your-domain.com |
| Backend API | http://localhost:12000 | https://api.your-domain.com |
| API Docs | http://localhost:12000/docs | https://api.your-domain.com/docs |

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check port availability
lsof -i :12000

# Check logs
tail -f backend/logs/app.log
```

### Frontend won't start
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run dev
```

### Database issues
```bash
# Reset database
cd backend
rm aria.db
python init_db.py
```

### Login fails
```bash
# Reset admin password
cd backend
python reset_admin.py
```

---

## 📈 Performance Tips

1. **Database:** Use PostgreSQL in production
2. **Cache:** Add Redis for session storage
3. **CDN:** Use CloudFlare or similar for static assets
4. **Load Balancer:** Use Nginx for multiple instances
5. **Monitoring:** Set up health checks and alerts

---

## 🎯 Default Credentials

```
Admin User:
  Username: admin
  Email: admin@aria.com
  Password: admin

⚠️ IMPORTANT: Change these in production!
```

---

## 📞 Support

- **Documentation:** See DEPLOYMENT_READINESS_REPORT.md
- **Issues:** Check backend/logs/ and browser console
- **Health Check:** http://localhost:12000/api/health

---

## ✨ Features Verified

✅ Authentication & Authorization  
✅ Document Upload & Processing  
✅ OCR Text Extraction  
✅ Search & Filters  
✅ Admin User Management  
✅ Corporate Styling  
✅ Elegant Logo/Branding  
✅ Responsive Design  
✅ API Documentation  

---

**Ready to Deploy! 🚀**

**Questions?** Check the full DEPLOYMENT_READINESS_REPORT.md for detailed information.

