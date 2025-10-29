# 🚀 ARIA DEPLOYMENT GUIDE

## Quick Start

### Deploy to Production (Automated)
```bash
./deploy_production_automated.sh
```

### Rollback Deployment
```bash
./rollback_deployment.sh
```

---

## Critical Fix Applied

### Problem: `/api/auth/login` vs `/api/v1/auth/login`

**Root Cause:** Line 9 of `frontend/src/services/api.ts` was missing `/v1`:
```typescript
// WRONG (was causing "Not Found" errors)
baseURL: `${API_BASE_URL}/api`

// CORRECT (fixed)
baseURL: `${API_BASE_URL}/api/v1`
```

**This single typo caused 10+ failed deployments!**

---

## Automated Deployment Features

✅ **One-Command Deployment** - No manual steps  
✅ **Git-First Workflow** - All changes committed  
✅ **Cache Busting** - Forces browser reload  
✅ **Process Cleanup** - Kills old backends  
✅ **Build Verification** - Tests after deploy  
✅ **Automatic Rollback** - If anything fails  
✅ **Build Manifest** - Tracks deployment version  

---

## Usage

```bash
# Deploy to production
./deploy_production_automated.sh

# If deployment fails, rollback
./rollback_deployment.sh
```

---

## What The Script Does

1. ✅ Commits any uncommitted Git changes
2. ✅ Builds frontend with correct API config (`/api/v1`)
3. ✅ Creates build manifest with commit hash
4. ✅ Kills all old uvicorn processes
5. ✅ Backs up current deployment
6. ✅ Deploys new frontend and backend
7. ✅ Restarts backend service
8. ✅ Reloads nginx with cache-busting headers
9. ✅ Tests all critical endpoints
10. ✅ Reports success/failure

---

## Verification After Deployment

### Must Pass These Tests:
```bash
# Health check
curl https://aria.vantax.co.za/api/v1/health
# Expected: {"status":"healthy","bots":67,"modules":8}

# Login test
curl -X POST https://aria.vantax.co.za/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vantax.co.za","password":"Admin@123"}'
# Expected: {"access_token":"..."}

# Frontend test
curl -I https://aria.vantax.co.za/
# Expected: HTTP/1.1 200 OK
```

### Browser Test:
1. Open https://aria.vantax.co.za/login
2. **Hard refresh:** `Ctrl+Shift+R` (Linux/Windows) or `Cmd+Shift+R` (Mac)
3. Login with: admin@vantax.co.za / Admin@123
4. Should work without "Not Found" error

---

## Troubleshooting

### Still getting "Not Found" after deployment?

**Problem:** Browser cached old JavaScript  
**Solution:** Hard refresh multiple times:
- Chrome: `Ctrl+Shift+R` or `Ctrl+F5`
- Firefox: `Ctrl+Shift+R` or `Ctrl+F5`
- Safari: `Cmd+Option+R`
- Or: Open in incognito/private mode

### Multiple backend processes running?

```bash
ssh -i /workspace/project/Vantax-2.pem ubuntu@3.8.139.178 \
  'ps aux | grep uvicorn | grep -v grep'
  
# Kill them all
ssh -i /workspace/project/Vantax-2.pem ubuntu@3.8.139.178 \
  'pkill -9 -f uvicorn && sudo systemctl restart aria-backend'
```

### API endpoint mismatch?

Verify the deployed frontend has `/v1`:
```bash
ssh -i /workspace/project/Vantax-2.pem ubuntu@3.8.139.178 \
  'grep -oP "baseURL.*?v1" /var/www/aria/frontend/dist/assets/*.js'
# Should output: baseURL:..."/api/v1"
```

---

## Files Modified

### Fixed Files (Committed to Git):
1. ✅ `frontend/src/services/api.ts` - Added `/v1` to baseURL
2. ✅ `deploy_production_automated.sh` - Full automation
3. ✅ `rollback_deployment.sh` - One-command rollback
4. ✅ `DEPLOYMENT.md` - This documentation
5. ✅ `DEPLOYMENT_ISSUES_ANALYSIS.md` - Root cause analysis

---

## Important Notes

### ⚠️ Never Edit These Files on the Server:
- Frontend files in `/var/www/aria/frontend/`
- Backend files in `/var/www/aria/backend/`
- **Always make changes in Git, then deploy!**

### ✅ Always Do This:
1. Edit files in the Git repository
2. Commit changes
3. Run `./deploy_production_automated.sh`
4. Test in browser (with hard refresh)

---

## Monitoring

```bash
# Backend logs
ssh -i /workspace/project/Vantax-2.pem ubuntu@3.8.139.178 \
  'sudo journalctl -u aria-backend -f'

# Nginx logs
ssh -i /workspace/project/Vantax-2.pem ubuntu@3.8.139.178 \
  'sudo tail -f /var/log/nginx/access.log'
```

---

## Production System Status

**✅ DEPLOYED AND READY:**
- 67 AI Bots operational
- 8 ERP Modules configured
- Backend API: `/api/v1/*`
- Frontend: React + Vite
- SSL: Let's Encrypt
- Domain: https://aria.vantax.co.za

---

**Last Updated:** October 29, 2025  
**Production URL:** https://aria.vantax.co.za  
**Status:** ✅ READY FOR PRODUCTION
