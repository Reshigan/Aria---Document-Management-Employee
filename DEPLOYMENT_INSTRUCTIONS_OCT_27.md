# 🚀 DEPLOYMENT INSTRUCTIONS - October 27, 2025
## Deploy 8 Functional Bots + Marketplace API + Updated Frontend

**Changes to Deploy:**
- ✅ 4 new bot files (AP, AR, Bank Rec, Lead Qual)
- ✅ Updated bot_manager.py (8 bots registered)
- ✅ New bot_marketplace.py API (6 endpoints)
- ✅ Updated main.py (marketplace routes)
- ✅ Updated BotShowcase.tsx (status badges, ROI)

**Server:** ubuntu@3.8.139.178  
**Path:** /var/www/aria/  
**SSH Key:** Vantax-2.pem

---

## 📋 PRE-DEPLOYMENT CHECKLIST

✅ Code pushed to GitHub (11 commits)
✅ Backend changes: 4 new bots + API
✅ Frontend changes: BotShowcase updated
✅ All changes committed and pushed

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Connect to Server
```bash
ssh -i /path/to/Vantax-2.pem ubuntu@3.8.139.178
```

### Step 2: Navigate to Application Directory
```bash
cd /var/www/aria
```

### Step 3: Pull Latest Changes
```bash
# Backend
cd backend
git pull origin main

# Frontend
cd ../frontend
git pull origin main
```

### Step 4: Install Dependencies (if needed)
```bash
# Backend (if new Python packages added)
cd /var/www/aria/backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend (if new npm packages added)
cd /var/www/aria/frontend
npm install
```

### Step 5: Rebuild Frontend
```bash
cd /var/www/aria/frontend
npm run build
```

### Step 6: Restart Backend Service
```bash
sudo systemctl restart aria-backend
sudo systemctl status aria-backend
```

### Step 7: Restart Frontend Service (if applicable)
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

### Step 8: Test Deployment
```bash
# Test backend API
curl https://aria.vantax.co.za/api/bots/marketplace/

# Test frontend
curl https://aria.vantax.co.za/bots
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Check Backend Logs
```bash
sudo journalctl -u aria-backend -f
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Test New API Endpoints
```bash
# List all bots
curl https://aria.vantax.co.za/api/bots/marketplace/

# Get bot details (BBBEE bot)
curl https://aria.vantax.co.za/api/bots/marketplace/bbbee-bot

# Get marketplace stats
curl https://aria.vantax.co.za/api/bots/marketplace/stats
```

### Test Frontend
1. Visit https://aria.vantax.co.za/bots
2. Verify 8 bots show "LIVE" badge
3. Verify 9 bots show "COMING SOON" badge
4. Verify ROI percentages display
5. Check category filtering works

---

## 🔍 TROUBLESHOOTING

### Backend Not Starting
```bash
# Check logs
sudo journalctl -u aria-backend -n 50

# Check Python errors
cd /var/www/aria/backend
source venv/bin/activate
python main.py
```

### Frontend Not Loading
```bash
# Check Nginx config
sudo nginx -t

# Rebuild frontend
cd /var/www/aria/frontend
npm run build

# Check Nginx is serving files
ls -la /var/www/aria/frontend/dist
```

### API Endpoints Not Working
```bash
# Check main.py includes marketplace routes
grep "bot_marketplace" /var/www/aria/backend/main.py

# Check bot_marketplace.py exists
ls -la /var/www/aria/backend/api/routes/bot_marketplace.py

# Test locally
cd /var/www/aria/backend
source venv/bin/activate
python -c "from api.routes.bot_marketplace import router; print('Import successful')"
```

---

## 📊 WHAT'S NEW IN THIS DEPLOYMENT

### Backend Changes:
1. **4 New Bots:**
   - `backend/bots/accounts_payable_bot.py` (650+ lines)
   - `backend/bots/ar_collections_bot.py` (620+ lines)
   - `backend/bots/bank_reconciliation_bot.py` (630+ lines)
   - `backend/bots/lead_qualification_bot.py` (640+ lines)

2. **Updated Bot Manager:**
   - `backend/bots/bot_manager.py` - Now registers 8 bots

3. **New API:**
   - `backend/api/routes/bot_marketplace.py` (580+ lines)
   - 6 new endpoints for bot marketplace

4. **Updated Main App:**
   - `backend/main.py` - Includes marketplace routes

### Frontend Changes:
1. **Updated Bot Showcase:**
   - `frontend/src/pages/BotShowcase.tsx`
   - Status badges (LIVE vs COMING SOON)
   - ROI percentages displayed
   - Visual differentiation (green for functional bots)
   - Accurate statistics

---

## 🎯 EXPECTED RESULTS

After deployment:
- ✅ 8 bots marked "LIVE" on https://aria.vantax.co.za/bots
- ✅ 9 bots marked "COMING SOON"
- ✅ ROI percentages visible (110-300%)
- ✅ Bot marketplace API accessible at /api/bots/marketplace/
- ✅ All 6 marketplace endpoints functional
- ✅ Backend logs show no errors
- ✅ Frontend loads without hydration errors

---

## 📞 SUPPORT

If issues occur:
1. Check logs (backend + nginx)
2. Verify git pull succeeded
3. Ensure frontend rebuild completed
4. Test API endpoints with curl
5. Review this document for troubleshooting steps

---

**DEPLOYMENT DATE:** October 27, 2025  
**DEPLOYED BY:** AI Development Team  
**STATUS:** Ready for deployment  
**RISK LEVEL:** LOW (backwards-compatible changes)

---

🚀 **Ready to deploy!** Follow steps 1-8 above.
