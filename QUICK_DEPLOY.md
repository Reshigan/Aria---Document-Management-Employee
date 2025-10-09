# 🚀 Quick Deployment Guide

## ⚡ Single-Command Deployment

### On Production Server (3.8.139.178)

```bash
# SSH to server
ssh ubuntu@3.8.139.178

# Navigate to app directory
cd /var/www/aria

# Pull latest code
git pull origin main

# Run automated deployment
./deploy.sh
```

**That's it!** The script will:
1. ✅ Create automatic backup
2. ✅ Pull latest code
3. ✅ Run database migrations
4. ✅ Restart backend service
5. ✅ Build and restart frontend
6. ✅ Restart nginx
7. ✅ Run health checks
8. ✅ Test password reset endpoints
9. ✅ Rollback automatically if anything fails

---

## 📋 What Gets Fixed

### Immediate Fixes
1. **Password Reset API Endpoints**
   - `/api/v1/auth/forgot-password` ✅
   - `/api/v1/auth/reset-password` ✅
   - No more 404 errors!

2. **Database Migration**
   - `password_reset_tokens` table created automatically
   - Indexes created for performance

3. **Backend Service**
   - Latest code with all routes
   - Proper error handling
   - Health monitoring

4. **Frontend**
   - Latest build with corporate colors
   - All pages functional
   - New icon visible

---

## 🔍 Verification Steps

After deployment completes, test these:

### 1. Backend Health
```bash
curl https://aria.vantax.co.za/api/v1/health
# Should return: {"status":"healthy"}
```

### 2. Password Reset Flow
```bash
# Test forgot password endpoint
curl -X POST https://aria.vantax.co.za/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'

# Should return:
# {
#   "message": "Password reset link sent to your email",
#   "email": "your-email@example.com",
#   "token": "...",
#   "reset_url": "..."
# }
```

### 3. Frontend Pages
Visit these URLs and verify they load without errors:
- ✅ https://aria.vantax.co.za (Home)
- ✅ https://aria.vantax.co.za/login
- ✅ https://aria.vantax.co.za/register
- ✅ https://aria.vantax.co.za/forgot-password
- ✅ https://aria.vantax.co.za/reset-password
- ✅ https://aria.vantax.co.za/dashboard
- ✅ https://aria.vantax.co.za/documents
- ✅ https://aria.vantax.co.za/chat
- ✅ https://aria.vantax.co.za/admin

### 4. Corporate Branding
Check these are visible:
- ✅ Navy blue (#2c3e50) header
- ✅ Corporate green (#27ae60) accent colors
- ✅ New elegant icon in tab
- ✅ Professional gradient backgrounds

---

## 🔧 Troubleshooting

### If Deployment Fails

The script will **automatically rollback** to the previous working version.

Check the logs:
```bash
tail -50 /var/log/aria-deployment.log
```

Manual rollback if needed:
```bash
cd /var/www/aria
git checkout <previous-commit-hash>
systemctl restart aria-backend
pm2 restart aria-frontend
systemctl restart nginx
```

### If Backend Won't Start

```bash
# Check service status
systemctl status aria-backend

# View logs
journalctl -u aria-backend -n 50 --no-pager

# Check if port is in use
sudo netstat -tlnp | grep 8000

# Restart manually
systemctl restart aria-backend
```

### If Frontend Won't Start

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs aria-frontend --lines 50

# Restart manually
cd /var/www/aria/frontend
pm2 restart aria-frontend
```

### If Nginx Issues

```bash
# Test config
nginx -t

# Check status
systemctl status nginx

# View logs
tail -50 /var/log/nginx/error.log

# Restart
systemctl restart nginx
```

---

## 📊 What's New in This Deployment

### ✅ Completed
1. **Automated Deployment Script**
   - Single command deployment
   - Automatic rollback on failure
   - Health checks and verification

2. **Backend Testing Framework**
   - 18 auth API integration tests
   - Test fixtures and helpers
   - Easy to add more tests

3. **Comprehensive Documentation**
   - Refactoring plan
   - Test scenarios
   - Deployment guides

4. **Password Reset Feature**
   - Complete backend implementation
   - Frontend pages built
   - Database migration ready

5. **Corporate Redesign**
   - Professional color scheme
   - Elegant icon design
   - Premium look and feel

### 🔄 In Progress
1. **Additional Tests**
   - Documents API tests (planned)
   - Frontend component tests (planned)
   - E2E tests with Playwright (planned)

2. **CI/CD Pipeline**
   - GitHub Actions workflow (planned)
   - Automated testing on PR (planned)
   - Auto-deploy on merge (planned)

---

## 🧪 Running Tests Locally

### Backend Tests
```bash
cd /var/www/aria
source backend/venv/bin/activate

# Install test dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# Run all tests
pytest backend/tests/ -v

# Run with coverage
pytest backend/tests/ -v --cov=backend --cov-report=html

# Run specific test file
pytest backend/tests/integration/test_auth_api.py -v

# View coverage report
open htmlcov/index.html  # or xdg-open on Linux
```

### Frontend Tests (Coming Soon)
```bash
cd /var/www/aria/frontend

# Install test dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

---

## 📈 Success Metrics

After deployment, verify these metrics:

### Performance
- [ ] Backend health check responds in < 100ms
- [ ] Frontend loads in < 2 seconds
- [ ] API requests complete in < 500ms
- [ ] Database queries run in < 50ms

### Functionality
- [ ] All 13 pages load without errors
- [ ] Login/logout works
- [ ] Password reset flow complete
- [ ] Document upload functional
- [ ] Chat interface working
- [ ] Admin panel accessible

### Quality
- [ ] No console errors in browser
- [ ] No 404 or 500 errors
- [ ] All backend tests passing (18/18)
- [ ] Corporate branding visible
- [ ] Mobile responsive

---

## 🆘 Emergency Contacts

### If Something Goes Wrong

1. **Check Backups**
   ```bash
   ls -lh /var/backups/aria/
   ```

2. **View Last Backup Location**
   ```bash
   cat /tmp/aria_last_backup.txt
   ```

3. **Restore from Backup**
   ```bash
   BACKUP_PATH=$(cat /tmp/aria_last_backup.txt)
   cp $BACKUP_PATH/aria.db /var/www/aria/backend/aria.db
   cd /var/www/aria
   git checkout $(cat $BACKUP_PATH/commit_hash.txt)
   systemctl restart aria-backend
   pm2 restart aria-frontend
   systemctl restart nginx
   ```

---

## 🎯 Next Steps

After successful deployment:

1. **Test Password Reset Flow**
   - Try forgot password with real email
   - Check email gets sent (if configured)
   - Test reset with token
   - Verify new password works

2. **Test All Features**
   - Login as different users
   - Upload documents
   - Use chat interface
   - Check admin features

3. **Monitor Logs**
   ```bash
   # Backend logs
   journalctl -u aria-backend -f
   
   # Frontend logs
   pm2 logs aria-frontend --lines 50
   
   # Nginx logs
   tail -f /var/log/nginx/access.log
   ```

4. **Run Tests**
   ```bash
   cd /var/www/aria
   source backend/venv/bin/activate
   pytest backend/tests/ -v
   ```

---

## 📚 Additional Documentation

- **Full Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Test Plan:** `SYSTEM_TEST_PLAN.md`
- **Refactoring Plan:** `REFACTORING_PLAN.md`
- **Visual Comparison:** `VISUAL_COMPARISON.md`
- **Deployment Summary:** `DEPLOYMENT_SUMMARY.md`
- **Changelog:** `CHANGELOG.md`

---

**Last Updated:** 2025-10-07  
**Version:** 2.1.0  
**Status:** Ready for Production Deployment
