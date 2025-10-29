# 🔧 ARIA PRODUCTION CONFIGURATION

## ⚠️ **CRITICAL: READ BEFORE EVERY DEPLOYMENT**

This document defines the **SINGLE SOURCE OF TRUTH** for production configuration.
All deployments MUST use these exact settings to avoid recurring issues.

---

## 🎯 Production Environment Settings

### Server Details
- **IP Address:** `3.8.139.178`
- **Domain:** `aria.vantax.co.za`
- **SSH Key:** `Vantax-2.pem`
- **SSH User:** `ubuntu`

### Directory Structure
```
/opt/aria/                          # Backend application root
├── aria_production_complete.py     # Main application file
├── database.py                     # Database helper functions
├── auth_integrated.py              # Authentication module
├── bot_registry.py                 # Bot definitions
├── erp_complete.py                 # ERP module
├── aria_production.db              # PRIMARY DATABASE (DO NOT USE aria.db)
├── .env                            # Environment configuration
├── venv/                           # Python virtual environment
└── uploads/                        # User uploaded files

/var/www/aria/frontend/dist/        # Frontend build output
├── index.html
├── assets/
└── ...
```

### Critical Files
- **Backend Entry Point:** `/opt/aria/aria_production_complete.py`
- **Database File:** `/opt/aria/aria_production.db` ← **USE THIS ONE ONLY**
- **Environment File:** `/opt/aria/.env`
- **Frontend Dist:** `/var/www/aria/frontend/dist/`

---

## 🔐 Database Configuration

### ⚠️ CRITICAL: Database File
**ALWAYS USE:** `aria_production.db`
**NEVER USE:** `aria.db` (wrong schema, wrong location)

### Database Path in Code
```python
# backend/database.py - Line 12
DATABASE_PATH = Path(__file__).parent / "aria_production.db"
```

### Database Schema (Production)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    organization_id INTEGER,
    role TEXT DEFAULT 'user',
    subscription_tier TEXT DEFAULT 'free',
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

**Note:** Production schema does NOT have `username` or `is_superuser` fields!

---

## 🌐 API Configuration

### Backend Routes
**All API routes use `/api` prefix (NO `/v1`)**

Examples:
- ✅ `/api/auth/login`
- ✅ `/api/auth/register`
- ✅ `/api/bots`
- ✅ `/api/erp/modules`
- ❌ `/api/v1/auth/login` (WRONG - DO NOT USE)

### Frontend API Configuration
**File:** `frontend/src/lib/api.ts` and `frontend/src/services/api.ts`

```typescript
// CORRECT CONFIGURATION
const API_BASE_URL = '/api';  // NO /v1 suffix

// All API calls should use:
axios.defaults.baseURL = '/api';
```

### Nginx Configuration
```nginx
# API Routes
location /api/ {
    proxy_pass http://localhost:8000/;  # Note: trailing slash removes /api prefix
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

**Important:** The trailing slash in `proxy_pass http://localhost:8000/;` removes the `/api` prefix,
so backend routes are registered without `/api` prefix.

---

## 🚀 Deployment Process

### Pre-Deployment Checklist
- [ ] All frontend files use `/api` (not `/api/v1`)
- [ ] Backend `database.py` uses `aria_production.db`
- [ ] Environment variables are in `/opt/aria/.env`
- [ ] Backend location is `/opt/aria/` (not `/var/www/aria/backend/`)
- [ ] Git repository is up to date with these changes

### Step 1: Build Frontend
```bash
cd /workspace/project/Aria---Document-Management-Employee/frontend
npm install
npm run build
```

### Step 2: Deploy Frontend
```bash
scp -i Vantax-2.pem -r dist/* ubuntu@3.8.139.178:/var/www/aria/frontend/dist/
```

### Step 3: Deploy Backend
```bash
# Sync backend code (excluding venv and uploads)
rsync -avz --exclude='venv' --exclude='uploads' --exclude='__pycache__' \
  -e "ssh -i Vantax-2.pem" \
  backend/ ubuntu@3.8.139.178:/opt/aria/
```

### Step 4: Restart Backend
```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178 '
  pkill -f aria_production_complete
  cd /opt/aria
  nohup /opt/aria/venv/bin/python aria_production_complete.py > /tmp/aria_production_$(date +%Y%m%d_%H%M%S).log 2>&1 &
  echo "Backend PID: $(pgrep -f aria_production_complete)"
'
```

### Step 5: Verify Deployment
```bash
# Test API endpoint
curl -s https://aria.vantax.co.za/api/auth/login | jq .

# Test bots endpoint
curl -s https://aria.vantax.co.za/api/bots | jq '.total'

# Test ERP endpoint
curl -s https://aria.vantax.co.za/api/erp/modules | jq '.total'
```

---

## 🔍 Common Issues & Solutions

### Issue 1: "401 Incorrect email or password"
**Cause:** User doesn't exist in `aria_production.db` OR wrong database file being used
**Solution:**
```bash
# Check which database is being used
ssh -i Vantax-2.pem ubuntu@3.8.139.178 'grep DATABASE_PATH /opt/aria/database.py'

# Check if user exists
ssh -i Vantax-2.pem ubuntu@3.8.139.178 'sqlite3 /opt/aria/aria_production.db "SELECT email FROM users WHERE email = '\''admin@vantax.co.za'\'';"'

# If user doesn't exist, create one
ssh -i Vantax-2.pem ubuntu@3.8.139.178 'cd /opt/aria && /opt/aria/venv/bin/python -c "
import sys
sys.path.insert(0, \"/opt/aria\")
from passlib.context import CryptContext
import sqlite3

pwd_context = CryptContext(schemes=[\"bcrypt\"], deprecated=\"auto\")
hashed = pwd_context.hash(\"admin123\")

conn = sqlite3.connect(\"/opt/aria/aria_production.db\")
cursor = conn.cursor()
cursor.execute(\"INSERT INTO users (email, hashed_password, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)\",
               (\"admin@vantax.co.za\", hashed, \"System Administrator\", \"admin\", 1))
conn.commit()
conn.close()
print(\"User created successfully\")
"'
```

### Issue 2: "API endpoint not found"
**Cause:** Frontend using `/api/v1` instead of `/api`
**Solution:** Update all frontend files:
```bash
cd /workspace/project/Aria---Document-Management-Employee/frontend
grep -r "/api/v1" src/ --files-with-matches | while read file; do
  sed -i 's|/api/v1|/api|g' "$file"
done
git add . && git commit -m "Fix API paths: /api/v1 → /api"
```

### Issue 3: "Backend not starting"
**Cause:** Multiple instances running OR port 8000 occupied
**Solution:**
```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178 '
  # Kill all backend processes
  pkill -f aria_production_complete
  
  # Wait a moment
  sleep 2
  
  # Check if port is free
  lsof -i :8000
  
  # Start fresh
  cd /opt/aria
  nohup /opt/aria/venv/bin/python aria_production_complete.py > /tmp/aria_production_$(date +%Y%m%d_%H%M%S).log 2>&1 &
'
```

### Issue 4: "Wrong backend directory"
**Cause:** Deployment script pointing to `/var/www/aria/backend/`
**Solution:** Backend is at `/opt/aria/` - Update deployment scripts

---

## 📋 Environment Variables

**File:** `/opt/aria/.env`

```env
# Database (this is often ignored - database.py has hardcoded path)
DATABASE_URL=sqlite:///./aria_production.db

# JWT Secret
SECRET_KEY=your-secret-key-here-change-in-production

# CORS Origins
ALLOWED_ORIGINS=https://aria.vantax.co.za,http://localhost:3000

# Application
ENVIRONMENT=production
DEBUG=false
```

**⚠️ Note:** The `DATABASE_URL` in `.env` is often ignored because `database.py` has a hardcoded path.
The actual database used is defined in `backend/database.py` line 12.

---

## 🔄 Git Workflow

### Before Every Deployment

1. **Ensure Git is up to date:**
```bash
cd /workspace/project/Aria---Document-Management-Employee
git pull origin main
```

2. **Verify configuration matches production:**
```bash
# Check API paths in frontend
grep -r "api/v1" frontend/src/ && echo "❌ FOUND /api/v1 - FIX THIS" || echo "✅ All using /api"

# Check database path in backend
grep "DATABASE_PATH" backend/database.py
# Should output: DATABASE_PATH = Path(__file__).parent / "aria_production.db"
```

3. **Commit any configuration fixes:**
```bash
git add .
git commit -m "Ensure production configuration is correct"
git push origin main
```

---

## ✅ Deployment Validation Script

**File:** `validate_deployment.sh`

```bash
#!/bin/bash
set -e

echo "🔍 Validating ARIA deployment..."

# Test API endpoints
echo "Testing /api/auth/login..."
curl -s -f https://aria.vantax.co.za/api/auth/login > /dev/null && echo "✅ Auth endpoint accessible" || echo "❌ Auth endpoint failed"

echo "Testing /api/bots..."
BOTS=$(curl -s https://aria.vantax.co.za/api/bots | jq -r '.total // 0')
[[ $BOTS -eq 67 ]] && echo "✅ All 67 bots available" || echo "❌ Expected 67 bots, got $BOTS"

echo "Testing /api/erp/modules..."
MODULES=$(curl -s https://aria.vantax.co.za/api/erp/modules | jq -r '.total // 0')
[[ $MODULES -eq 8 ]] && echo "✅ All 8 ERP modules available" || echo "❌ Expected 8 modules, got $MODULES"

echo "Testing frontend..."
curl -s -f https://aria.vantax.co.za/ > /dev/null && echo "✅ Frontend accessible" || echo "❌ Frontend failed"

echo ""
echo "✅ Deployment validation complete!"
```

---

## 🎯 Summary

### ✅ DO:
- Use `/api` for all API paths (backend and frontend)
- Use `/opt/aria/` for backend location
- Use `aria_production.db` for database
- Test after every deployment
- Keep Git repository updated with production configuration

### ❌ DON'T:
- Use `/api/v1` paths
- Deploy to `/var/www/aria/backend/`
- Use `aria.db` database
- Assume environment variables are being read (check hardcoded paths)
- Deploy without testing endpoints

---

**Last Updated:** October 29, 2025
**Deployment Count:** 11 (this configuration should prevent issue #12!)
