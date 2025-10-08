# ARIA Deployment Guide - Corporate Redesign & Password Reset Feature

## 🎯 Deployment Overview

This deployment includes:
1. **New Corporate Color Scheme** - Professional navy, slate, teal, and gold palette
2. **New Professional Icons** - Elegant document management icon with AI badge
3. **Password Reset Feature** - Complete forgot password & reset password flows
4. **Database Migration** - New `password_reset_tokens` table
5. **Frontend Rebuild** - All pages updated with corporate styling

## 📦 What's Changed

### New Files Added
```
frontend/public/aria-corporate-icon.svg       # Premium corporate icon
frontend/public/favicon-corporate.svg         # Browser favicon
frontend/src/styles/corporate-colors.ts       # Color palette definitions
backend/alembic/versions/002_add_password_reset_tokens.py  # Database migration
```

### Modified Files
```
frontend/src/app/globals.css                  # Corporate CSS variables
frontend/src/app/layout.tsx                   # Icon references
frontend/src/app/page.tsx                     # Landing page colors
frontend/src/app/login/page.tsx               # Login page colors & icon
frontend/src/app/register/page.tsx            # Register page colors & icon
frontend/src/app/forgot-password/page.tsx     # New colors & icon
frontend/src/app/reset-password/page.tsx      # New colors & icon
frontend/src/styles/theme.ts                  # Ant Design theme colors
backend/api/gateway/routers/auth.py           # Password reset endpoints
backend/models/user.py                        # PasswordResetToken model
backend/schemas/user.py                       # Password reset schemas
backend/core/config.py                        # FRONTEND_URL configuration
```

## 🚀 Deployment Steps

### Step 1: Connect to Server
```bash
# SSH into the production server
ssh ubuntu@3.8.139.178

# Navigate to application directory
cd /var/www/aria
# OR if different path:
cd /path/to/Aria---Document-Management-Employee
```

### Step 2: Pull Latest Code
```bash
# Ensure we're on main branch
git branch

# Pull latest changes
git pull origin main

# Verify commit
git log --oneline -3
# Should show:
# a5723dc 🎨 Update to Corporate Color Scheme & New Professional Icon
# 59eba07 Add database migration for password reset tokens
# a47702a (previous commit)
```

### Step 3: Backend - Run Database Migration
```bash
# Navigate to backend
cd backend

# Activate virtual environment
source venv/bin/activate

# Run migration
alembic upgrade head

# Verify migration succeeded
alembic current
# Should show: 002_password_reset

# Check database table created
sqlite3 aria.db "SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens';"
# OR for PostgreSQL:
psql -U aria_user -d aria_db -c "\dt password_reset_tokens"
```

### Step 4: Backend - Verify Environment Variables
```bash
# Check .env file has FRONTEND_URL
cat .env | grep FRONTEND_URL

# If not present, add it:
echo "FRONTEND_URL=https://aria.vantax.co.za" >> .env

# Verify all required variables present
cat .env
```

### Step 5: Backend - Restart Service
```bash
# Check current backend process
ps aux | grep uvicorn

# Restart using systemd (if configured)
sudo systemctl restart aria-backend
sudo systemctl status aria-backend

# OR restart manually
pkill -f "uvicorn.*aria"
cd /var/www/aria/backend
source venv/bin/activate
nohup python -m uvicorn api.gateway.main:app --host 0.0.0.0 --port 8000 > /var/log/aria-backend.log 2>&1 &

# Verify backend running
curl http://localhost:8000/api/health
```

### Step 6: Frontend - Install Dependencies (if needed)
```bash
cd /var/www/aria/frontend

# Check if node_modules exists and is up-to-date
npm ci
# OR if updating packages:
npm install
```

### Step 7: Frontend - Build Production Version
```bash
# Build frontend with new corporate design
npm run build

# Verify build succeeded
ls -lh .next/
# Should see .next/static and .next/server directories

# Check build output for errors
cat /tmp/frontend-build.log
```

### Step 8: Frontend - Restart Service
```bash
# Stop current frontend process
ps aux | grep next
pkill -f "next start"

# Start production server
nohup npm start > /var/log/aria-frontend.log 2>&1 &

# OR if using PM2
pm2 restart aria-frontend
pm2 status

# Verify frontend running
curl http://localhost:3000
```

### Step 9: Nginx - Restart (if needed)
```bash
# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl status nginx

# Verify port forwarding
curl -I https://aria.vantax.co.za
# Should return 200 OK
```

### Step 10: Verify Deployment
```bash
# Check all services running
sudo systemctl status aria-backend
sudo systemctl status nginx
pm2 status  # If using PM2 for frontend

# Check logs for errors
tail -50 /var/log/aria-backend.log
tail -50 /var/log/aria-frontend.log
tail -50 /var/log/nginx/error.log

# Test API endpoints
curl https://aria.vantax.co.za/api/health
curl https://aria.vantax.co.za/api/auth/forgot-password
```

## ✅ Post-Deployment Testing

### Quick Smoke Tests
1. **Visit Homepage**
   ```
   https://aria.vantax.co.za
   ```
   - ✅ Page loads without errors
   - ✅ Corporate icon displays
   - ✅ Colors match new scheme

2. **Test Login Page**
   ```
   https://aria.vantax.co.za/login
   ```
   - ✅ Gradient uses navy/slate/teal colors
   - ✅ Corporate icon displays
   - ✅ "Forgot your password?" link present

3. **Test Forgot Password (NEW)**
   ```
   https://aria.vantax.co.za/forgot-password
   ```
   - ✅ Page loads (no 404 error!)
   - ✅ Corporate styling applied
   - ✅ Form functional
   - ✅ Submit button works

4. **Test Reset Password (NEW)**
   ```
   https://aria.vantax.co.za/reset-password?token=test
   ```
   - ✅ Page loads (no 404 error!)
   - ✅ Corporate styling applied
   - ✅ Form displays password requirements

5. **Check Browser Console**
   - Open DevTools (F12)
   - Check Console tab
   - ✅ No error messages
   - ✅ No 404s for assets

6. **Check Favicon**
   - Look at browser tab
   - ✅ Corporate favicon displays
   - ✅ Icon is clear and professional

### Full Testing
Run through complete test plan:
```bash
cat SYSTEM_TEST_PLAN.md
```

## 🐛 Troubleshooting

### Issue: Frontend 404 errors
**Symptoms:** Pages show "404 Not Found"
**Solution:**
```bash
cd /var/www/aria/frontend
npm run build
pm2 restart aria-frontend
```

### Issue: Database migration fails
**Symptoms:** `alembic upgrade head` errors
**Solution:**
```bash
# Check current revision
alembic current

# If stuck, force to previous
alembic downgrade -1
alembic upgrade head

# Check database connection
cat .env | grep DATABASE_URL
```

### Issue: Backend won't start
**Symptoms:** API endpoints return 502
**Solution:**
```bash
# Check logs
tail -100 /var/log/aria-backend.log

# Check if port already in use
sudo lsof -i :8000

# Kill old process
pkill -f uvicorn

# Start fresh
cd /var/www/aria/backend
source venv/bin/activate
python -m uvicorn api.gateway.main:app --host 0.0.0.0 --port 8000 --reload
```

### Issue: Colors not updating
**Symptoms:** Old blue colors still showing
**Solution:**
```bash
# Clear browser cache
# In browser: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)

# Rebuild frontend
cd /var/www/aria/frontend
rm -rf .next
npm run build
pm2 restart aria-frontend
```

### Issue: Icons not displaying
**Symptoms:** Broken image icons
**Solution:**
```bash
# Verify icon files exist
ls -lh /var/www/aria/frontend/public/*.svg

# Check nginx is serving static files
curl https://aria.vantax.co.za/aria-corporate-icon.svg

# Check nginx config
sudo nginx -t
cat /etc/nginx/sites-available/aria
```

### Issue: Password reset emails not sending
**Symptoms:** No error, but no email received
**Solution:**
```bash
# Check email configuration
cat backend/.env | grep -E "SMTP|EMAIL"

# Check backend logs for email errors
tail -100 /var/log/aria-backend.log | grep -i email

# Test SMTP connection
python -c "import smtplib; print('SMTP OK')"
```

## 🔒 Security Checklist

- ✅ HTTPS enabled and working
- ✅ SSL certificate valid
- ✅ Database credentials in .env (not in code)
- ✅ CORS configured properly
- ✅ Password reset tokens expire after 48 hours
- ✅ Tokens are random and unpredictable
- ✅ No email enumeration vulnerability
- ✅ Rate limiting on password reset endpoints

## 📊 Monitoring

### Check Application Health
```bash
# Backend health
curl https://aria.vantax.co.za/api/health

# Frontend status
curl -I https://aria.vantax.co.za

# Database connections
ps aux | grep postgres  # OR sqlite3
```

### Monitor Logs
```bash
# Real-time backend logs
tail -f /var/log/aria-backend.log

# Real-time nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Search for errors
grep -i error /var/log/aria-backend.log | tail -20
```

### Check Resource Usage
```bash
# CPU and Memory
top
htop

# Disk space
df -h

# Network connections
netstat -tulpn | grep -E "8000|3000|80|443"
```

## 🔙 Rollback Procedure

If critical issues found after deployment:

### Quick Rollback
```bash
# 1. SSH to server
ssh ubuntu@3.8.139.178

# 2. Navigate to app directory
cd /var/www/aria

# 3. Check git log
git log --oneline -5

# 4. Rollback to previous commit
git checkout 59eba07  # Commit before corporate redesign

# 5. Rebuild frontend
cd frontend
npm run build

# 6. Rollback database (if needed)
cd ../backend
alembic downgrade -1

# 7. Restart services
sudo systemctl restart aria-backend
pm2 restart aria-frontend
sudo systemctl restart nginx

# 8. Verify rollback
curl https://aria.vantax.co.za
```

### Document Issues
```bash
# Create issue report
echo "Rollback performed at $(date)" >> /tmp/rollback-log.txt
echo "Reason: [DESCRIBE ISSUE]" >> /tmp/rollback-log.txt
echo "Commit rolled back from: a5723dc" >> /tmp/rollback-log.txt
echo "Commit rolled back to: 59eba07" >> /tmp/rollback-log.txt
```

## 📝 Deployment Verification Checklist

After deployment, verify these items:

### Visual Verification
- [ ] Homepage loads with corporate colors
- [ ] Login page shows navy/slate/teal gradient
- [ ] Corporate icon displays on all pages
- [ ] Favicon shows in browser tab
- [ ] All buttons use new color scheme
- [ ] No visual glitches or broken layouts

### Functional Verification
- [ ] Login/logout works
- [ ] Registration works
- [ ] Document upload works
- [ ] Document viewing works
- [ ] Chat functionality works
- [ ] Admin panel accessible (if applicable)

### Password Reset Verification
- [ ] /forgot-password loads without 404
- [ ] Can submit email on forgot password
- [ ] /reset-password?token=X loads without 404
- [ ] Password reset form functional
- [ ] API endpoints respond:
  - POST /api/auth/forgot-password
  - POST /api/auth/reset-password

### Technical Verification
- [ ] No console errors in browser
- [ ] No 404 errors in network tab
- [ ] API responses are fast (< 1 second)
- [ ] Database migration successful
- [ ] Backend logs show no errors
- [ ] Nginx logs show no errors
- [ ] All static assets loading

### Mobile Verification
- [ ] Responsive design works on phone
- [ ] Touch interactions smooth
- [ ] Forms work with mobile keyboard
- [ ] Icons display correctly on mobile

### Cross-Browser Verification
- [ ] Chrome - works
- [ ] Firefox - works
- [ ] Safari - works
- [ ] Edge - works
- [ ] Mobile browsers - work

## 🎉 Success Criteria

Deployment is successful if:
1. ✅ All pages accessible without 404 errors
2. ✅ Corporate color scheme visible throughout
3. ✅ New icons display correctly
4. ✅ Password reset feature fully functional
5. ✅ No console errors
6. ✅ All services running stable
7. ✅ Performance meets expectations
8. ✅ Mobile experience smooth
9. ✅ Security measures in place
10. ✅ Monitoring shows healthy metrics

## 📞 Support Contacts

**If issues persist:**
- Check logs first
- Review SYSTEM_TEST_PLAN.md
- Document specific error messages
- Consider rollback if critical

**Production Server:**
- IP: 3.8.139.178
- Domain: https://aria.vantax.co.za
- OS: Ubuntu (AWS EC2)

---

**Document Version:** 1.0  
**Prepared:** 2025-10-07  
**Deployment Type:** Corporate Redesign + Password Reset Feature  
**Risk Level:** Medium (UI changes + new database table)  
**Estimated Downtime:** < 5 minutes (during frontend rebuild)
