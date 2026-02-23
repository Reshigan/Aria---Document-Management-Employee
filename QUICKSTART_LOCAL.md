# 🚀 QUICKSTART - Local Development

## ⚡ Fastest Way to Get Started

### One-Command Setup

Open PowerShell in the project root directory and run:

```powershell
.\setup-local.ps1
```

This single command will:
- ✅ Verify Python and Node.js are installed
- ✅ Install all backend Python dependencies
- ✅ Install all frontend Node.js dependencies
- ✅ Initialize the SQLite database
- ✅ Create an admin user

**Time:** ~5-10 minutes depending on your internet speed

---

## 🎯 Start the Servers

After setup completes, you need **TWO terminal windows**:

### Terminal 1 - Start Backend
```powershell
.\start-backend.ps1
```
Backend will run on: http://localhost:8000

### Terminal 2 - Start Frontend
```powershell
.\start-frontend.ps1
```
Frontend will run on: http://localhost:12001

---

## 🌐 Access Your Application

Open your browser and go to:
- **Application:** http://localhost:12001
- **API Docs:** http://localhost:8000/docs

---

## 🔐 Login

Use these credentials:
```
Email: admin@aria.local
Password: admin123
```

---

## ✅ You're Done!

You now have a fully functional ARIA ERP system running locally with:
- 11 ERP Modules (GL, AP, AR, Banking, Payroll, CRM, Inventory, etc.)
- 67 Automation Bots
- SAP Integration capabilities
- Master Data Management
- South African Tax Compliance (SARS)

---

## 📚 What's Next?

1. **Explore the API:** http://localhost:8000/docs - Interactive API documentation
2. **Add demo data:** See [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md) for seeding instructions
3. **Read the docs:** Check out README.md for full system features

---

## ⚠️ Troubleshooting

**Problem:** Python not found
```powershell
# Check if Python is installed
python --version
# Should show Python 3.11 or higher
```

**Problem:** Node.js not found
```powershell
# Check if Node.js is installed
node --version
# Should show v18.0 or higher
```

**Problem:** Port already in use
- Backend: Edit `start-backend.ps1` and change port 8000 to 8001
- Frontend: Edit `start-frontend.ps1` and change port 12001 to 3000

**Problem:** Module not found errors
```powershell
# Reinstall backend dependencies
cd backend
C:/Python313/python.exe -m pip install -r requirements.txt

# Reinstall frontend dependencies
cd frontend
npm install
```

For detailed troubleshooting, see: [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md)

---

## 📂 Project Files Created

✅ `backend/.env` - Backend configuration  
✅ `frontend/.env.local` - Frontend configuration  
✅ `setup-local.ps1` - Complete setup script  
✅ `start-backend.ps1` - Backend launcher  
✅ `start-frontend.ps1` - Frontend launcher  
✅ `LOCAL_SETUP_GUIDE.md` - Detailed setup guide  

---

**Total Setup Time:** ~10 minutes  
**Difficulty:** Easy ⭐  
**Status:** Ready to develop! 🎉
