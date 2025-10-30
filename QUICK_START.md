# 🚀 ARIA ERP - Quick Start Guide

Get ARIA ERP running in under 5 minutes!

---

## Option 1: Docker (Fastest) 🐳

```bash
# 1. Clone repository
git clone https://github.com/yourusername/aria-erp.git
cd aria-erp

# 2. Start services
docker-compose up -d

# 3. Done! Access your application
# Frontend: http://localhost:5173
# Backend: http://localhost:8000/docs
```

**Login with:**
- Email: `admin@example.com`
- Password: `admin123`

---

## Option 2: Local Development 💻

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start backend server
uvicorn app.main:app --reload --port 12000

# ✅ Backend running at http://localhost:12000
```

### Frontend Setup (New Terminal)

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# ✅ Frontend running at http://localhost:12001
```

---

## Option 3: Production Deploy 🚀

### On Ubuntu/Debian Server

```bash
# 1. Clone repository
git clone https://github.com/yourusername/aria-erp.git
cd aria-erp

# 2. Run deployment script
sudo bash deploy/deploy.sh

# 3. Follow the prompts
# - Configure environment variables
# - Setup domain name
# - Enable SSL (optional)

# ✅ Production deployed!
```

---

## 📋 First Steps After Installation

### 1. Login to System
- Open http://localhost:5173 (or http://localhost:12001)
- Use default credentials:
  - Email: `admin@example.com`
  - Password: `admin123`

### 2. Explore Dashboard
- View real-time metrics
- Check revenue charts
- See customer statistics

### 3. Create Your First Customer
- Navigate to "Customers" in sidebar
- Click "Add Customer" button
- Fill in customer details
- Click "Create Customer"

### 4. Explore AI Bots
- Navigate to "AI Bots" in sidebar
- Browse 67 intelligent automation bots
- Filter by category
- Click on a bot to see details
- Try executing a bot

### 5. Check API Documentation
- Open http://localhost:8000/docs (or http://localhost:12000/docs)
- Explore 33+ REST API endpoints
- Try interactive API testing

---

## 🎯 Common Tasks

### Create a Customer
```bash
# Via API
curl -X POST http://localhost:8000/api/v1/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "phone": "+27123456789",
    "company": "Acme Corporation"
  }'
```

### Create an Invoice
```bash
# Via API
curl -X POST http://localhost:8000/api/v1/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customer_id": 1,
    "invoice_number": "INV-001",
    "total_amount": 1000.00,
    "status": "pending"
  }'
```

### List All Bots
```bash
# Via API
curl http://localhost:8000/api/v1/bots \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Troubleshooting

### Backend Won't Start

**Problem**: Port 8000/12000 already in use

**Solution**:
```bash
# Find process using port
lsof -i :8000  # or :12000

# Kill the process
kill -9 <PID>

# Or use different port
uvicorn app.main:app --reload --port 8001
```

### Frontend Won't Start

**Problem**: Port 5173/12001 already in use

**Solution**:
```bash
# Vite will automatically try next available port
# Or specify port manually in package.json
```

### Database Not Found

**Problem**: `aria_erp.db` not created

**Solution**:
```bash
# Database is created automatically on first run
# Just restart the backend server
cd backend
uvicorn app.main:app --reload --port 12000
```

### Docker Issues

**Problem**: Docker containers won't start

**Solution**:
```bash
# Check Docker is running
docker --version

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# View logs
docker-compose logs -f
```

### Authentication Errors

**Problem**: "Unauthorized" errors

**Solution**:
```bash
# 1. Get access token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# 2. Use token in requests
curl http://localhost:8000/api/v1/customers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📊 System Status Check

Run this command to check if everything is working:

```bash
bash check-system.sh
```

This will verify:
- ✅ Backend API is running
- ✅ Frontend is accessible
- ✅ Database exists
- ✅ Docker status
- ✅ Dependencies installed

---

## 🌐 Access Points

### Development
| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:12001 | Main application UI |
| Backend API | http://localhost:12000 | REST API server |
| API Docs | http://localhost:12000/docs | Interactive API documentation |
| Health Check | http://localhost:12000/health | System health status |

### Production (after deployment)
| Service | URL | Description |
|---------|-----|-------------|
| Application | https://your-domain.com | Main application |
| API | https://your-domain.com/api | REST API |
| Docs | https://your-domain.com/docs | API documentation |

---

## 🎓 Learning Resources

### Documentation
- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [PRODUCTION_READY.md](PRODUCTION_READY.md) - Build status

### API Documentation
- Interactive Swagger UI: http://localhost:12000/docs
- OpenAPI JSON: http://localhost:12000/openapi.json

### Video Tutorials (Coming Soon)
- System Overview
- Creating Your First Customer
- Managing Invoices
- Using AI Bots
- Deployment Guide

---

## 💡 Tips & Best Practices

### Development
1. **Always use virtual environments** for Python
2. **Run backend and frontend in separate terminals**
3. **Check API docs** before making API calls
4. **Use dev tools** in browser for debugging
5. **Keep dependencies updated**

### Production
1. **Change default credentials** immediately
2. **Use environment variables** for secrets
3. **Enable SSL/HTTPS** with Let's Encrypt
4. **Setup automated backups** for database
5. **Monitor logs** regularly
6. **Use PostgreSQL** instead of SQLite

### Security
1. **Never commit .env files** to git
2. **Use strong passwords** for admin accounts
3. **Enable rate limiting** in production
4. **Keep system updated** with security patches
5. **Use firewall rules** to protect services

---

## 🚀 Next Steps

After getting the system running:

1. ✅ **Change Admin Password**
   - Login → Profile → Change Password

2. ✅ **Configure Environment**
   - Edit `.env` file
   - Set database credentials
   - Configure email (SMTP)
   - Add API keys

3. ✅ **Add Your Data**
   - Import customers
   - Create products/services
   - Setup accounts
   - Configure suppliers

4. ✅ **Explore AI Bots**
   - Browse bot categories
   - Read bot descriptions
   - Test bot execution
   - Configure bot workflows

5. ✅ **Customize Settings**
   - Company information
   - Tax settings
   - Currency preferences
   - Email templates

---

## 📞 Get Help

### Having Issues?

1. **Check System Status**
   ```bash
   bash check-system.sh
   ```

2. **View Logs**
   ```bash
   # Backend logs
   cd backend && tail -f app.log
   
   # Frontend logs
   cd frontend && npm run dev
   
   # Docker logs
   docker-compose logs -f
   ```

3. **Search Issues**
   - GitHub Issues: https://github.com/yourusername/aria-erp/issues

4. **Contact Support**
   - Email: support@aria-erp.com
   - Discord: https://discord.gg/aria-erp

---

## ✨ You're All Set!

ARIA ERP is now running. Start exploring the world's first AI-native ERP system!

**Key Features to Try:**
- 📊 Real-time Dashboard
- 👥 Customer Management
- 💼 Invoice Generation
- 🤖 67 AI Bots
- 📈 Analytics & Reports

**Happy Automating! 🎉**

---

**Built with ❤️ for South African SMEs**

*Empowering businesses with AI-native automation*
