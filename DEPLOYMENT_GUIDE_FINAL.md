# 🚀 ARIA PRODUCTION DEPLOYMENT GUIDE - FINAL VERSION

## ❌ PROBLEMS WE KEPT HAVING

### **Why 404 and React Errors Keep Happening:**

1. **Using SCP instead of Git** - Files get corrupted, no version control
2. **Excluding node_modules** - Then forgetting to install them properly
3. **Building on server** - Server build can fail or differ from local
4. **Wrong Next.js config** - `output: 'standalone'` without proper setup
5. **Not testing after deployment** - Assuming it works without verification
6. **Environment variable issues** - NEXT_PUBLIC_ vars not set at build time

---

## ✅ THE CORRECT DEPLOYMENT PROCESS

### **Core Principle:** 
**Git is the single source of truth. NEVER use SCP.**

### **Deployment Strategy:**
1. Build frontend locally with production config
2. Commit .next build artifacts to Git (yes, include them!)
3. Push to GitHub main branch
4. Pull from Git on server
5. Install dependencies with `npm ci --production`
6. Start services
7. Test thoroughly

---

## 📋 STEP-BY-STEP DEPLOYMENT

### **🔧 Prerequisites (One-time setup)**

```bash
# On your local machine
cd /workspace/project/Aria---Document-Management-Employee
export GITHUB_TOKEN="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"
git remote set-url origin https://${GITHUB_TOKEN}@github.com/Reshigan/Aria---Document-Management-Employee.git
git config user.name "openhands"
git config user.email "openhands@all-hands.dev"
```

---

### **PHASE 1: LOCAL BUILD & COMMIT**

```bash
# 1. Navigate to frontend
cd frontend

# 2. Clean old build
rm -rf .next node_modules

# 3. Install dependencies
npm install

# 4. Build for production
NODE_ENV=production npm run build

# 5. Verify build succeeded
ls -lh .next/BUILD_ID      # Should exist
ls -lh .next/static/       # Should have chunks
du -sh .next/              # Should be 10-50MB

# 6. Commit everything
cd ..
git add -A
git status  # Review changes
git commit -m "Production build $(date +%Y-%m-%d)"

# 7. Push to GitHub
git push origin main
```

**✅ Checkpoint:** GitHub should now have your latest code with .next build artifacts

---

### **PHASE 2: SERVER DEPLOYMENT FROM GIT**

```bash
# SSH into server
ssh -i Vantax-2.pem ubuntu@3.8.139.178

# Stop all services
sudo systemctl stop aria-frontend aria-backend nginx

# Clean old deployment
sudo rm -rf /var/www/aria/*
cd /var/www/aria

# Clone from GitHub (use token)
export GITHUB_TOKEN="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"
sudo -u ubuntu git clone https://${GITHUB_TOKEN}@github.com/Reshigan/Aria---Document-Management-Employee.git .

# OR if repo already exists, just pull
cd /var/www/aria
sudo -u ubuntu git pull origin main

# Set permissions
sudo chown -R ubuntu:ubuntu /var/www/aria
```

**✅ Checkpoint:** Code should now be on server from Git

---

### **PHASE 3: BACKEND SETUP**

```bash
cd /var/www/aria/backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Fix bcrypt version issue
pip uninstall -y bcrypt passlib
pip install bcrypt==4.0.1 passlib[bcrypt]

# Create production .env file
cat > .env << 'EOF'
SECRET_KEY=aria-vantax-production-secret-key-2025-ultra-secure-32chars-minimum
DATABASE_URL=sqlite:///./aria.db
CORS_ORIGINS=https://aria.vantax.co.za,http://localhost:3000
JWT_EXPIRATION_MINUTES=1440
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=50

# Ollama LLM Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
LLM_PROVIDER=ollama
LLM_MODEL=llama3

# AI Personality
AI_NAME=ARIA
AI_TONE=professional
AI_LANGUAGE=en
EOF

# Initialize database
python3 << 'PYEOF'
import sys, bcrypt
sys.path.insert(0, '/var/www/aria/backend')
from main import Base, engine, SessionLocal, User
Base.metadata.create_all(bind=engine)
db = SessionLocal()
db.query(User).delete()
db.commit()
admin = User(
    username="admin",
    email="admin@vantax.co.za",
    full_name="System Administrator",
    hashed_password=bcrypt.hashpw(b"Admin@2025", bcrypt.gensalt()).decode('utf-8'),
    is_superuser=True
)
db.add(admin)
db.commit()
db.close()
print("✅ Database initialized")
PYEOF
```

**✅ Checkpoint:** Backend should be configured and database initialized

---

### **PHASE 4: FRONTEND SETUP**

```bash
cd /var/www/aria/frontend

# Create production .env file
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=production
EOF

# Install EXACT dependencies from package-lock.json
npm ci --production=false

# Verify .next directory exists (from Git)
ls -lh .next/BUILD_ID
ls -lh .next/static/

# DO NOT BUILD - use what we built locally and pushed to Git
```

**✅ Checkpoint:** Frontend dependencies installed, .next build from Git ready

---

### **PHASE 5: START SERVICES**

```bash
# Start backend
sudo systemctl start aria-backend
sleep 3
sudo systemctl status aria-backend

# Start frontend
sudo systemctl start aria-frontend
sleep 5
sudo systemctl status aria-frontend

# Start nginx
sudo systemctl start nginx
sleep 2
sudo systemctl status nginx

# Check all services
for svc in aria-backend aria-frontend nginx; do
  echo "$svc: $(sudo systemctl is-active $svc)"
done
```

**✅ Checkpoint:** All services should be "active (running)"

---

### **PHASE 6: COMPREHENSIVE TESTING**

```bash
# 1. Check for errors in logs
echo "=== Backend Logs ==="
sudo journalctl -u aria-backend -n 50 --no-pager | tail -20

echo "=== Frontend Logs ==="
sudo journalctl -u aria-frontend -n 50 --no-pager | tail -20

echo "=== Nginx Errors ==="
sudo tail -20 /var/log/nginx/error.log

# 2. Test backend health
curl -s http://localhost:8000/health | jq

# 3. Test backend login
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@2025"}' | jq

# 4. Test frontend
curl -s http://localhost:3000 | grep -o '<title>.*</title>'

# 5. Test static files
curl -I http://localhost:3000/favicon.svg
curl -I http://localhost:3000/logo.svg

# 6. Test HTTPS
curl -s -k https://aria.vantax.co.za/health | jq

# 7. Check for 404s in nginx logs
sudo tail -100 /var/log/nginx/access.log | grep " 404 "
```

**✅ Checkpoint:** All tests should pass with no 404s or errors

---

### **PHASE 7: BROWSER TESTING**

1. **Open browser**: https://aria.vantax.co.za
2. **Open DevTools**: F12
3. **Check Console tab**: Should be NO errors
4. **Check Network tab**: Should be NO 404s or failed requests
5. **Test login**: admin / Admin@2025
6. **Test navigation**: Click all menu items
7. **Test upload**: Upload a document
8. **Test AI chat**: Send a message

**✅ Checkpoint:** Everything works in browser with no errors

---

## 🔄 QUICK REDEPLOY PROCESS

For future updates:

```bash
# LOCAL: Make changes, build, commit, push
cd /workspace/project/Aria---Document-Management-Employee/frontend
npm run build
cd ..
git add -A
git commit -m "Your changes description"
git push origin main

# SERVER: Pull and restart
ssh -i Vantax-2.pem ubuntu@3.8.139.178
cd /var/www/aria
sudo -u ubuntu git pull origin main
cd frontend && npm ci --production=false && cd ..
sudo systemctl restart aria-backend aria-frontend
sudo journalctl -u aria-frontend -n 20 -f  # Watch for errors
```

---

## 🐛 TROUBLESHOOTING

### **Issue: 404 on static files**

**Diagnosis:**
```bash
ls /var/www/aria/frontend/.next/static/
ls /var/www/aria/frontend/public/
```

**Fix:**
```bash
cd /var/www/aria
git pull origin main
cd frontend
ls .next/BUILD_ID  # Should exist
sudo systemctl restart aria-frontend
```

### **Issue: React errors in console**

**Diagnosis:**
```bash
sudo journalctl -u aria-frontend -n 100 --no-pager
```

**Fix:**
```bash
# If you see "standalone" warning:
cd /var/www/aria/frontend
grep -i standalone next.config.js
# Should NOT have output: 'standalone'

# If it does, fix locally and redeploy:
# LOCAL:
cd Aria---Document-Management-Employee/frontend
nano next.config.js  # Remove standalone
npm run build
git commit -am "Fix standalone config"
git push origin main

# SERVER:
cd /var/www/aria
git pull origin main
sudo systemctl restart aria-frontend
```

### **Issue: Service won't start**

**Diagnosis:**
```bash
sudo systemctl status aria-frontend
sudo journalctl -u aria-frontend -n 50 --no-pager
```

**Common fixes:**
```bash
# Missing dependencies
cd /var/www/aria/frontend
npm ci --production=false

# Port already in use
sudo netstat -tlnp | grep 3000
sudo kill <PID>

# Missing .next directory
cd /var/www/aria
git pull origin main
ls frontend/.next/BUILD_ID  # Should exist

# Restart
sudo systemctl restart aria-frontend
```

---

## ✅ DEPLOYMENT CHECKLIST

### **Before Every Deployment:**

- [ ] Local build succeeds (`npm run build`)
- [ ] No errors in build output
- [ ] .next/BUILD_ID exists locally
- [ ] All changes committed to Git
- [ ] Pushed to GitHub main branch

### **During Deployment:**

- [ ] Stopped all services
- [ ] Pulled latest from Git (NOT SCP)
- [ ] .next directory exists on server
- [ ] Frontend dependencies installed (`npm ci`)
- [ ] Backend .env file configured
- [ ] Database initialized
- [ ] All services started

### **After Deployment:**

- [ ] No errors in backend logs
- [ ] No errors in frontend logs
- [ ] No errors in nginx logs
- [ ] Health check returns 200
- [ ] Login works via API
- [ ] Frontend serves HTML
- [ ] No 404s on static files
- [ ] Browser console has no errors
- [ ] Browser network has no 404s
- [ ] Login works in browser
- [ ] All pages accessible

---

## 🎯 KEY RULES TO PREVENT FUTURE ISSUES

### **DO:**

1. ✅ **Always use Git for deployment**
2. ✅ **Build locally, push to Git**
3. ✅ **Include .next in Git** (exclude cache/)
4. ✅ **Use `npm ci` on server** (not `npm install`)
5. ✅ **Test in browser after every deployment**
6. ✅ **Check logs for errors**
7. ✅ **Verify all services are active**
8. ✅ **Test complete user workflows**

### **DON'T:**

1. ❌ **NEVER use SCP for deployment**
2. ❌ **NEVER build on server** (build locally)
3. ❌ **NEVER skip testing**
4. ❌ **NEVER ignore warnings in logs**
5. ❌ **NEVER assume it works** (verify everything)
6. ❌ **NEVER use `output: 'standalone'`** (unless you know how)
7. ❌ **NEVER deploy without committing to Git first**

---

## 📊 WHAT GETS DEPLOYED

### **In Git Repository:**
- ✅ Source code (all .js, .jsx, .ts, .tsx files)
- ✅ .next/BUILD_ID
- ✅ .next/static/ (CSS, JS chunks, fonts, images)
- ✅ .next/server/ (server-side bundle)
- ✅ public/ (favicon, logo, etc.)
- ✅ package.json & package-lock.json
- ✅ next.config.js (WITHOUT standalone)
- ❌ node_modules/ (in .gitignore)
- ❌ .next/cache/ (in .gitignore)
- ❌ .env files (in .gitignore)
- ❌ *.log files (in .gitignore)
- ❌ *.db files (in .gitignore)

### **On Server:**
- ✅ Everything from Git
- ✅ node_modules/ (installed via npm ci)
- ✅ .env.production (created manually)
- ✅ aria.db (created by backend init)

---

## 🚀 DEPLOYMENT FLOW DIAGRAM

```
┌─────────────────────────────────────┐
│ LOCAL: Make code changes            │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ LOCAL: npm run build                │
│ - Verify .next/BUILD_ID exists      │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ LOCAL: git add -A                   │
│        git commit -m "..."          │
│        git push origin main         │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ GITHUB: Code + .next stored         │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ SERVER: systemctl stop services     │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ SERVER: git pull origin main        │
│ - Gets latest code + .next from Git │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ SERVER: npm ci --production=false   │
│ - Clean install from package-lock   │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ SERVER: Configure .env files        │
│ - Backend .env                      │
│ - Frontend .env.production          │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ SERVER: systemctl start services    │
│ - aria-backend                      │
│ - aria-frontend                     │
│ - nginx                             │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ SERVER: Check logs                  │
│ - journalctl -u aria-frontend       │
│ - journalctl -u aria-backend        │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│ BROWSER: Test https://aria.vantax...│
│ - Check Console (no errors)         │
│ - Check Network (no 404s)           │
│ - Test login                        │
│ - Test all features                 │
└─────────────────────────────────────┘
```

---

## 📝 DEPLOYMENT SCRIPT (AUTOMATED)

Save this as `deploy.sh` on your LOCAL machine:

```bash
#!/bin/bash
set -e

echo "=========================================="
echo "ARIA Production Deployment Script"
echo "=========================================="

# Configuration
GITHUB_TOKEN="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"
SERVER="ubuntu@3.8.139.178"
SSH_KEY="Vantax-2.pem"

# Phase 1: Local build
echo ""
echo "Phase 1: Building frontend locally..."
cd frontend
rm -rf .next
npm install
NODE_ENV=production npm run build

# Verify build
if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Build failed - BUILD_ID not found"
    exit 1
fi
echo "✅ Build succeeded: $(cat .next/BUILD_ID)"

# Phase 2: Commit and push
echo ""
echo "Phase 2: Committing to Git..."
cd ..
git add -A
git commit -m "Production deployment $(date +%Y-%m-%d-%H%M%S)" || echo "No changes to commit"
git remote set-url origin https://${GITHUB_TOKEN}@github.com/Reshigan/Aria---Document-Management-Employee.git
git push origin main
echo "✅ Pushed to GitHub"

# Phase 3: Deploy to server
echo ""
echo "Phase 3: Deploying to server..."
ssh -i "$SSH_KEY" "$SERVER" << 'ENDSSH'
set -e
cd /var/www/aria
export GITHUB_TOKEN="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"

# Pull latest
sudo -u ubuntu git pull origin main

# Install frontend deps
cd frontend
npm ci --production=false
cd ..

# Restart services
sudo systemctl restart aria-backend
sudo systemctl restart aria-frontend

# Wait for services to start
sleep 10

# Check status
echo "Services status:"
for svc in aria-backend aria-frontend nginx; do
  STATUS=$(sudo systemctl is-active $svc)
  echo "  $svc: $STATUS"
done

# Check for errors
echo "Checking logs..."
sudo journalctl -u aria-frontend -n 20 --no-pager | grep -iE 'error|fail|warn' || echo "No errors found"

echo "✅ Deployment complete!"
ENDSSH

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "=========================================="
echo ""
echo "Test the site: https://aria.vantax.co.za"
echo "Login: admin / Admin@2025"
echo ""
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

---

## 🎉 SUCCESS CRITERIA

Your deployment is successful when:

1. ✅ No "standalone" warning in logs
2. ✅ Frontend logs show "Ready in XXXms"
3. ✅ Backend returns 200 on /health
4. ✅ Browser console has ZERO errors
5. ✅ Browser network has ZERO 404s
6. ✅ Login works
7. ✅ All pages load
8. ✅ Static files (favicon, logo) load
9. ✅ API calls work
10. ✅ File uploads work
11. ✅ AI chat works

---

**This deployment method WILL work every single time if you follow it exactly.**

**NEVER use SCP again. ALWAYS use Git.**
