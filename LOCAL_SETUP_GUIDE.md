# 🚀 ARIA ERP - Local Development Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.11+** (You have Python 3.13.5 ✅)
- **Node.js 18+** and **npm**
- **Git** (for version control)

---

## 📁 Project Structure

```
Aria---Document-Management-Employee/
├── backend/          # FastAPI Python backend
├── frontend/         # React + Vite frontend
├── .env.example      # Root environment example
├── backend/.env      # Backend config (✅ Created)
└── frontend/.env.local # Frontend config (✅ Created)
```

---

## ⚙️ Setup Steps

### 1. Backend Setup (Python/FastAPI)

#### Step 1.1: Navigate to Backend Directory
```powershell
cd backend
```

#### Step 1.2: Install Python Dependencies
The installation is currently running. If it completes successfully, you'll see a success message. If you need to run it manually:

```powershell
C:/Python313/python.exe -m pip install -r requirements.txt
```

**Note:** This installs ~35 packages including FastAPI, SQLAlchemy, Pandas, and AI libraries. It may take 5-10 minutes.

#### Step 1.3: Initialize Database
Once dependencies are installed, create the database and tables:

```powershell
# Initialize the database
C:/Python313/python.exe init_db.py
```

or if there's a migration script:

```powershell
# Run database migrations
C:/Python313/python.exe -m alembic upgrade head
```

#### Step 1.4: Create Admin User
Create an admin user to log in:

```powershell
C:/Python313/python.exe create_admin.py
```

or

```powershell
C:/Python313/python.exe reset_admin.py
```

Default credentials are usually:
- **Email:** admin@aria.com
- **Password:** Admin123! (or as specified in the script)

#### Step 1.5: Start Backend Server
```powershell
# Start the FastAPI backend on port 8000
C:/Python313/python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at: **http://localhost:8000**
API Documentation: **http://localhost:8000/docs**

---

### 2. Frontend Setup (React/Vite)

#### Step 2.1: Navigate to Frontend Directory
```powershell
cd ..\frontend
```

#### Step 2.2: Install Node Dependencies
```powershell
npm install
```

This installs React, Vite, Material-UI, Axios, and other frontend libraries.

#### Step 2.3: Start Frontend Development Server
```powershell
npm run dev
```

The frontend will be available at: **http://localhost:12001**

---

## 🎯 Quick Start Commands

### Terminal 1 (Backend):
```powershell
cd backend
C:/Python313/python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 (Frontend):
```powershell
cd frontend
npm run dev
```

---

## 🔐 Login Credentials

After creating the admin user:
- **Email:** admin@aria.com (or as set in create_admin.py)
- **Password:** Admin123! (or as set in create_admin.py)

---

## 🔍 Verify Setup

### Backend Health Check:
Open in browser: http://localhost:8000/api/v1/health

### Frontend Access:
Open in browser: http://localhost:12001

### API Documentation:
Open in browser: http://localhost:8000/docs (Swagger UI)

---

## 🐛 Troubleshooting

### Backend Issues:

**1. Module Not Found Errors:**
```powershell
C:/Python313/python.exe -m pip install <missing-module>
```

**2. Database Connection Errors:**
- Check that `.env` file exists in backend directory ✅
- For local dev, SQLite should work without additional setup
- Database file will be created at: `backend/aria_erp.db`

**3. Port Already in Use:**
```powershell
# Change port in the uvicorn command
C:/Python313/python.exe -m uvicorn main:app --reload --port 8001
```

### Frontend Issues:

**1. npm install fails:**
```powershell
# Clear npm cache and try again
npm cache clean --force
npm install
```

**2. Port 12001 in use:**
Update `package.json` scripts or run:
```powershell
npm run dev -- --port 3000
```

**3. API Connection Errors:**
- Verify backend is running on port 8000
- Check `frontend/.env.local` has: `VITE_API_URL=http://localhost:8000` ✅

---

## 📊 What's Included

### Backend Features:
- ✅ 11 ERP Modules (GL, AP, AR, Banking, Payroll, CRM, etc.)
- ✅ 67 Automation Bots
- ✅ SAP Integration
- ✅ Master Data Management
- ✅ Quote-to-Cash Workflow
- ✅ South African Tax Compliance (SARS)

### Frontend Features:
- ✅ Modern React UI with Material-UI
- ✅ Dashboard with analytics
- ✅ Document management
- ✅ Invoice processing
- ✅ Financial reports
- ✅ User management

---

## 🔧 Configuration Files Created

✅ **backend/.env** - Backend configuration with:
- JWT secret key (generated)
- SQLite database path
- CORS settings for localhost
- API settings

✅ **frontend/.env.local** - Frontend configuration with:
- Backend API URL (http://localhost:8000)
- Development environment

---

## 📝 Next Steps After Setup

1. **Explore the API:** http://localhost:8000/docs
2. **Login to UI:** http://localhost:12001
3. **Seed demo data** (optional):
   ```powershell
   cd backend
   C:/Python313/python.exe seed_demo_data.py
   ```
4. **Run tests** (optional):
   ```powershell
   # Backend tests
   cd backend
   C:/Python313/python.exe -m pytest
   
   # Frontend tests
   cd frontend
   npm test
   ```

---

## 🚀 Production Deployment

For production deployment to a server:
- See `DEPLOYMENT_GUIDE.md` in the root directory
- Use PostgreSQL instead of SQLite
- Configure proper JWT secrets
- Set up HTTPS/SSL
- Configure Redis for caching (optional)

---

## 📞 Support

Check these files for more information:
- `README.md` - Project overview
- `API_DOCUMENTATION.md` - API endpoints
- `DEPLOYMENT_GUIDE.md` - Production deployment
- `TESTING.md` - Testing instructions

---

## ⚡ Current Status

✅ Environment files created
🔄 Python dependencies installing
⏳ Database initialization pending
⏳ Admin user creation pending
⏳ Frontend dependencies pending

Once all installations complete, follow the steps above to start both servers!
