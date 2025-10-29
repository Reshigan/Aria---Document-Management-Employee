# 🚀 ARIA DEPLOYMENT GUIDE

## ⚠️ **READ THIS BEFORE EVERY DEPLOYMENT**

This guide will help you avoid the recurring issues we've had in the last 10 deployments.

---

## 🎯 Quick Start

**For a standard deployment, just run:**

```bash
./deploy_foolproof.sh
```

This script handles everything automatically including:
- Pre-flight configuration checks
- Frontend build
- Backend and frontend deployment
- Service restart
- Post-deployment validation

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] You have the `Vantax-2.pem` SSH key
- [ ] You have access to production server (3.8.139.178)
- [ ] All changes are committed to Git
- [ ] You've pulled the latest changes from main branch
- [ ] You've read `PRODUCTION_CONFIG.md`

---

## 🔧 Manual Deployment (Step by Step)

If you need to deploy manually, follow these steps:

### 1. Verify Configuration

```bash
# Check for API path issues
grep -r "api/v1" frontend/src/
# Should return nothing. If it finds files, fix them:
# sed -i 's|/api/v1|/api|g' filename

# Check database configuration
grep "DATABASE_PATH" backend/database.py
# Should output: DATABASE_PATH = Path(__file__).parent / "aria_production.db"
```

### 2. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Deploy Files

```bash
# Deploy backend
rsync -avz --exclude='venv' --exclude='uploads' --exclude='__pycache__' \
  -e "ssh -i Vantax-2.pem" \
  backend/ ubuntu@3.8.139.178:/opt/aria/

# Deploy frontend
scp -i Vantax-2.pem -r frontend/dist/* ubuntu@3.8.139.178:/var/www/aria/frontend/dist/
```

### 4. Restart Backend

```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178 '
  pkill -f aria_production_complete
  cd /opt/aria
  nohup /opt/aria/venv/bin/python aria_production_complete.py > /tmp/aria_production_$(date +%Y%m%d_%H%M%S).log 2>&1 &
  echo "Backend PID: $(pgrep -f aria_production_complete)"
'
```

### 5. Validate Deployment

```bash
./validate_deployment.sh
```

---

## 🔍 Troubleshooting

### Issue: Login fails with "Incorrect email or password"

**Cause:** User doesn't exist in `aria_production.db`

**Solution:**
```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178 'cd /opt/aria && /opt/aria/venv/bin/python << EOF
import sys
sys.path.insert(0, "/opt/aria")
from passlib.context import CryptContext
import sqlite3

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash("admin123")

conn = sqlite3.connect("/opt/aria/aria_production.db")
cursor = conn.cursor()
cursor.execute("INSERT OR REPLACE INTO users (email, hashed_password, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)",
               ("admin@vantax.co.za", hashed, "System Administrator", "admin", 1))
conn.commit()
conn.close()
print("Admin user created/updated")
EOF
'
```

### Issue: API endpoints return 404

**Cause:** Frontend using wrong API paths

**Solution:**
```bash
# Fix all /api/v1 to /api
cd frontend/src
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|/api/v1|/api|g'
cd ../..
npm run build
# Redeploy frontend
```

### Issue: Backend not starting

**Cause:** Port 8000 already in use or multiple instances running

**Solution:**
```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178 '
  # Kill all instances
  pkill -9 -f aria_production_complete
  
  # Check port
  lsof -i :8000
  
  # Start fresh
  cd /opt/aria
  nohup /opt/aria/venv/bin/python aria_production_complete.py > /tmp/aria_production_$(date +%Y%m%d_%H%M%S).log 2>&1 &
'
```

### Issue: Wrong database being used

**Check which database is active:**
```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178 '
  # Check database path in code
  grep DATABASE_PATH /opt/aria/database.py
  
  # List database files
  ls -lh /opt/aria/*.db
  
  # Check which one has users
  sqlite3 /opt/aria/aria_production.db "SELECT COUNT(*) FROM users;"
'
```

---

## 🛡️ Prevention Measures

### 1. Install Pre-Commit Hook

```bash
ln -sf ../../.git-hooks/pre-commit .git/hooks/pre-commit
```

This hook will:
- Check for `/api/v1` paths before committing
- Verify database configuration
- Ensure correct production paths

### 2. Use Validation Script

After every deployment:
```bash
./validate_deployment.sh
```

This validates:
- All API endpoints are responding
- Frontend is accessible
- SSL/HTTPS is working
- Configuration is correct

### 3. Review Production Config

Before each deployment, review:
```bash
cat PRODUCTION_CONFIG.md
```

---

## 📊 Deployment History

Keep track of deployments to identify patterns:

| Date | Issue | Root Cause | Solution |
|------|-------|------------|----------|
| Oct 29, 2025 | Login failing | Wrong database file | Created user in aria_production.db |
| Oct 28, 2025 | API 404 errors | /api/v1 vs /api | Fixed frontend paths |
| Oct 27, 2025 | Backend not found | Wrong directory | Updated to /opt/aria/ |
| ... | ... | ... | ... |

---

## 🎯 Key Production Settings

### Directories
- **Backend:** `/opt/aria/`
- **Frontend:** `/var/www/aria/frontend/dist/`
- **Logs:** `/tmp/aria_production_*.log`

### Database
- **File:** `/opt/aria/aria_production.db`
- **DO NOT USE:** `aria.db` (wrong schema)

### API Paths
- **Correct:** `/api/auth/login`, `/api/bots`, `/api/erp/modules`
- **Wrong:** `/api/v1/auth/login` (deprecated)

### Nginx Configuration
- **Routes:** `/api/*` → `http://localhost:8000/`
- **HTTPS:** Let's Encrypt SSL
- **Domain:** `aria.vantax.co.za`

---

## 🔗 Related Documents

- **PRODUCTION_CONFIG.md** - Complete production configuration reference
- **DEPLOYMENT_SUCCESS.md** - Last successful deployment details
- **deploy_foolproof.sh** - Automated deployment script
- **validate_deployment.sh** - Post-deployment validation

---

## 🆘 Emergency Rollback

If deployment goes wrong:

```bash
ssh -i Vantax-2.pem ubuntu@3.8.139.178 '
  # Find latest backup
  BACKUP=$(ls -t /tmp/aria_backend_backup_*.tar.gz | head -1)
  
  # Stop current backend
  pkill -f aria_production_complete
  
  # Restore backup
  cd /opt/aria
  tar -xzf $BACKUP
  
  # Restart
  nohup /opt/aria/venv/bin/python aria_production_complete.py > /tmp/aria_production_rollback.log 2>&1 &
  
  echo "Rolled back to: $BACKUP"
'
```

---

## 📞 Support

**Production URL:** https://aria.vantax.co.za  
**Admin Email:** admin@vantax.co.za  
**Server IP:** 3.8.139.178  

---

**Last Updated:** October 29, 2025  
**Version:** 2.0 (After fixing recurring deployment issues)
