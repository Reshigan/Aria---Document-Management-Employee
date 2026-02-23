# 🌐 Running Cloudflare Production System Locally

## Overview

Your ARIA ERP system is deployed on:
- **Frontend:** Cloudflare Pages (https://aria.vantax.co.za)
- **Backend API:** Cloudflare Workers (https://aria-api.vantax.co.za)
- **Database:** Cloudflare D1 (SQLite-based)
- **Storage:** Cloudflare R2 (S3-compatible)

This guide shows how to run the **same production code** locally for development.

---

## 🚀 Quick Start (2 Options)

### Option 1: Use Cloudflare Wrangler (Recommended)

This runs the actual Cloudflare Workers code locally with dev database.

### Option 2: Use Local FastAPI Backend

Use the minimal local backend we already set up (simpler, faster).

---

## 📋 Prerequisites

- ✅ Python 3.13.5 (installed)
- ✅ Node.js (installed)
- ⚠️ Cloudflare Wrangler CLI (need to install)

---

## 🔧 Option 1: Run with Cloudflare Wrangler

### Step 1: Install Wrangler CLI

```powershell
npm install -g wrangler
```

### Step 2: Authenticate with Cloudflare (Optional for local dev)

```powershell
# Only needed if you want to sync with production database
wrangler login
```

### Step 3: Start Backend API (Cloudflare Workers)

```powershell
cd workers-api
npm install
wrangler dev --local
```

This starts the Workers API on: **http://localhost:8787**

### Step 4: Start Frontend

```powershell
cd frontend

# Set environment to use local API
$env:VITE_API_URL="http://localhost:8787"

# Install dependencies (if not done already)
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Frontend runs on: **http://localhost:12001**

### Step 5: Access the Application

- **Frontend:** http://localhost:12001
- **Backend API:** http://localhost:8787
- **Login:** admin / admin123

---

## 🔧 Option 2: Run with Local FastAPI Backend (Simpler)

**✅ This is what we already set up!**

### Step 1: Start Minimal Local Backend

```powershell
.\start-backend.ps1
```

**OR manually:**
```powershell
cd backend
C:/Python313/python.exe -m uvicorn minimal_local:app --reload --host 0.0.0.0 --port 8000
```

Backend runs on: **http://localhost:8000**

### Step 2: Start Frontend with Local API

```powershell
cd frontend

# Make sure .env.local points to local backend
# (Already configured: VITE_API_URL=http://localhost:8000)

npm run dev
```

Frontend runs on: **http://localhost:12001**

### Step 3: Access the Application

- **Frontend:** http://localhost:12001
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Login:** admin / admin123

**✅ This is the easiest way and already working!**

---

## 📊 Architecture Comparison

### Production (Cloudflare)
```
Frontend (Cloudflare Pages)
    ↓
Backend API (Cloudflare Workers)
    ↓
D1 Database (Cloudflare SQLite)
R2 Storage (Cloudflare Object Storage)
```

### Local Development (Option 1 - Wrangler)
```
Frontend (Vite Dev Server on :12001)
    ↓
Backend API (Wrangler Dev on :8787)
    ↓
Local D1 Database (SQLite)
Local R2 Storage (Simulated)
```

### Local Development (Option 2 - FastAPI)
```
Frontend (Vite Dev Server on :12001)
    ↓
Backend API (FastAPI on :8000)
    ↓
Local SQLite Database
Local File Storage
```

---

## 🔄 Syncing with Production

### Get Production Database Locally

```powershell
cd workers-api

# Export production database
wrangler d1 export aria-erp-db --output=production.sql

# Import to local
wrangler d1 execute aria-erp-db --local --file=production.sql
```

### Get Production Secrets

```powershell
# List production secrets
wrangler secret list

# Create .dev.vars file for local development
# workers-api/.dev.vars
JWT_SECRET=your-secret-here
DATABASE_URL=local
```

---

## 🛠️ Development Workflow

### Make Changes Locally

1. Start local servers (Option 1 or 2)
2. Make code changes
3. Test locally
4. Commit changes

### Deploy to Cloudflare

```powershell
# Deploy frontend
cd frontend
npm run build
wrangler pages deploy dist --project-name=aria-erp

# Deploy backend
cd workers-api
wrangler deploy
```

---

## 📁 Project Structure

```
Aria-ERP/
├── frontend/                    # React + Vite frontend
│   ├── .env.local              # ✅ Local: http://localhost:8000
│   ├── .env.cloudflare         # Production: https://aria-api.vantax.co.za
│   └── package.json
├── backend/                     # FastAPI backend (local dev)
│   ├── minimal_local.py        # ✅ Minimal API for local dev
│   ├── main.py                 # Full production backend
│   └── aria_erp.db            # ✅ Local SQLite database
├── workers-api/                 # Cloudflare Workers (production)
│   ├── wrangler.toml           # Cloudflare config
│   ├── src/index.ts            # Workers API code
│   └── .dev.vars               # Local secrets (create this)
├── start-backend.ps1           # ✅ Start local FastAPI
└── start-frontend.ps1          # ✅ Start local frontend
```

---

## ⚡ Quick Commands Reference

### Using Local FastAPI (Easiest - Already Set Up)

```powershell
# Terminal 1 - Start backend
.\start-backend.ps1

# Terminal 2 - Start frontend
.\start-frontend.ps1

# Access
http://localhost:12001
```

### Using Cloudflare Wrangler (Production-like)

```powershell
# Terminal 1 - Start Workers API
cd workers-api
wrangler dev --local

# Terminal 2 - Start frontend with Wrangler API
cd frontend
$env:VITE_API_URL="http://localhost:8787"
npm run dev

# Access
http://localhost:12001
```

### Deploy to Production

```powershell
# Deploy everything
cd frontend && npm run build && wrangler pages deploy dist --project-name=aria-erp
cd ../workers-api && wrangler deploy
```

---

## 🔐 Environment Variables

### Local Development (.env.local)
```env
VITE_API_URL=http://localhost:8000
NODE_ENV=development
```

### Cloudflare Production (.env.cloudflare)
```env
VITE_API_URL=https://aria-api.vantax.co.za
VITE_APP_NAME=Aria ERP
VITE_APP_VERSION=2.0.0
```

### Backend (.env)
```env
SECRET_KEY=your-jwt-secret
DATABASE_URL=sqlite:///./aria_erp.db
CORS_ORIGINS=http://localhost:12001,http://localhost:3000
```

---

## ✅ Current Status - What's Already Working

- ✅ **Backend running:** http://localhost:8000 (minimal_local.py)
- ✅ **Database initialized:** aria_erp.db with admin user
- ✅ **Environment configured:** .env and .env.local created
- ⏳ **Frontend installing:** npm install --legacy-peer-deps (in progress)
- ✅ **Scripts ready:** start-backend.ps1 and start-frontend.ps1

---

## 🎯 Recommended Approach

**For quick local development:**
```powershell
# Use the FastAPI backend we already set up
.\start-backend.ps1    # Terminal 1
.\start-frontend.ps1   # Terminal 2
```

**For testing production-like environment:**
```powershell
# Use Cloudflare Wrangler
cd workers-api && wrangler dev --local
cd frontend && npm run dev
```

**For deployment:**
```powershell
# Deploy to Cloudflare
wrangler pages deploy frontend/dist --project-name=aria-erp
wrangler deploy  # from workers-api directory
```

---

## 🐛 Troubleshooting

### Wrangler not found
```powershell
npm install -g wrangler
```

### D1 Database not found
```powershell
cd workers-api
wrangler d1 create aria-erp-db  # Creates new local database
```

### Frontend can't connect to API
```powershell
# Check which API URL frontend is using
cd frontend
Get-Content .env.local

# Should be: VITE_API_URL=http://localhost:8000
# Or: VITE_API_URL=http://localhost:8787 (if using Wrangler)
```

### Backend port already in use
```powershell
# Find and kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
```

---

## 📚 Additional Resources

- **Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
- **Wrangler CLI Docs:** https://developers.cloudflare.com/workers/wrangler/
- **D1 Database Docs:** https://developers.cloudflare.com/d1/
- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/

---

## 🎉 You're Ready!

The simplest way to run your Cloudflare-based system locally is **already set up**:

```powershell
.\start-backend.ps1    # ✅ Working
.\start-frontend.ps1   # ⏳ Once npm install completes
```

This gives you a local FastAPI backend that mimics your Cloudflare Workers API, making development fast and easy!
