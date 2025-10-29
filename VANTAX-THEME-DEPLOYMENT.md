# Vanta X Theme Deployment Guide for ARIA Dashboard

## 🎨 Theme Overview

The ARIA dashboard has been updated to match the professional, corporate design of **vantax.co.za** with the following branding elements:

### Color Palette
- **Primary Navy Blue**: `#1a1f3a` - Main brand color for sidebar and dark backgrounds
- **Accent Gold**: `#f5b800` - Highlights and active states
- **Background**: `#f8f9fa` - Clean, light gray background
- **Text**: `#1a1f3a` - Dark navy for readability

### Design Changes
1. **Sidebar**: Navy blue background with gold accents
2. **Logo**: Gold "AR" badge with white ARIA text
3. **Active Menu Items**: Gold text color
4. **Hover States**: Lighter navy background
5. **Overall Feel**: Professional, corporate, clean

## 📦 What's Been Updated

### Files Modified
1. `frontend/src/index.css` - CSS variables for theme colors
2. `frontend/src/theme/vantaxTheme.ts` - Theme configuration (NEW)
3. `frontend/src/components/layout/MainLayout.tsx` - Sidebar styling updated
4. `frontend/dist/` - New production build with theme

### Build Output
- **CSS**: `index-BMS17rwp.css` (60.27 kB)
- **JavaScript**: `index-D6RXvib8.js` (962.39 kB)

## 🚀 Deployment Methods

### Method 1: Automated Script (Recommended)
```bash
cd /workspace/project/Aria---Document-Management-Employee
./deploy-themed-frontend.sh
```

### Method 2: Manual Deployment via SCP
```bash
# From your local machine or this workspace
cd /workspace/project/Aria---Document-Management-Employee/frontend

# Create temp directory on server
ssh ubuntu@3.8.139.178 "mkdir -p /tmp/aria-dist-new"

# Upload new build
scp -r dist/* ubuntu@3.8.139.178:/tmp/aria-dist-new/

# SSH into server and deploy
ssh ubuntu@3.8.139.178

# Backup current version
sudo cp -r /var/www/aria/frontend/dist /var/www/aria/frontend/dist.backup-$(date +%Y%m%d-%H%M%S)

# Deploy new version
sudo rm -rf /var/www/aria/frontend/dist/*
sudo mv /tmp/aria-dist-new/* /var/www/aria/frontend/dist/

# Set permissions
sudo chown -R www-data:www-data /var/www/aria/frontend/dist
sudo chmod -R 755 /var/www/aria/frontend/dist

# Cleanup
rm -rf /tmp/aria-dist-new

exit
```

### Method 3: Direct Server Build (If SSH access available)
```bash
ssh ubuntu@3.8.139.178

cd /opt/aria/frontend

# Pull latest changes
git pull origin main

# Install dependencies (if needed)
npm install

# Build with production environment
npm run build

# Copy to web root
sudo rm -rf /var/www/aria/frontend/dist.backup
sudo mv /var/www/aria/frontend/dist /var/www/aria/frontend/dist.backup
sudo cp -r dist /var/www/aria/frontend/

# Set permissions
sudo chown -R www-data:www-data /var/www/aria/frontend/dist
sudo chmod -R 755 /var/www/aria/frontend/dist
```

## ✅ Verification Steps

After deployment:

1. **Clear Browser Cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private window

2. **Check Theme Elements**
   - [ ] Sidebar is navy blue (`#1a1f3a`)
   - [ ] Logo "AR" badge is gold (`#f5b800`)
   - [ ] Active menu items show gold text
   - [ ] Hover states show lighter navy background
   - [ ] Main content area has light gray background

3. **Test Functionality**
   - [ ] Navigation works correctly
   - [ ] Menu expansion/collapse works
   - [ ] Dashboard loads properly
   - [ ] All pages accessible

4. **Verify Production URL**
   ```bash
   curl -I https://aria.vantax.co.za
   # Should return: HTTP/2 200
   ```

## 🔄 Rollback Procedure

If you need to revert to the previous version:

```bash
ssh ubuntu@3.8.139.178

# Find backup
ls -la /var/www/aria/frontend/ | grep backup

# Restore (replace with your backup filename)
sudo rm -rf /var/www/aria/frontend/dist
sudo cp -r /var/www/aria/frontend/dist.backup-YYYYMMDD-HHMMSS /var/www/aria/frontend/dist

# Set permissions
sudo chown -R www-data:www-data /var/www/aria/frontend/dist
```

## 📊 System Status

### Current Production Environment
- **URL**: https://aria.vantax.co.za
- **Server**: 3.8.139.178
- **Backend PID**: 2170854 (Running)
- **67 Bots**: ✅ Deployed
- **8 ERP Modules**: ✅ Active
- **SSL**: ✅ Active (Let's Encrypt)
- **Nginx**: ✅ Running

### No Backend Changes Required
The theme update is **frontend-only**. No backend, API, or database changes are needed.

## 🎯 Expected Result

After deployment, the ARIA dashboard will have:
- Professional navy blue and gold color scheme matching vantax.co.za
- Clean, corporate aesthetic
- Enhanced brand consistency
- All existing functionality preserved

## 📞 Support

If you encounter any issues:
1. Check browser console for JavaScript errors
2. Verify Nginx is serving the new files: `curl https://aria.vantax.co.za/assets/index-D6RXvib8.js -I`
3. Check file permissions on server
4. Clear browser cache completely

## 🏗️ Development Notes

### Future Theme Customization
Edit the theme colors in:
```typescript
// frontend/src/index.css
:root {
  --color-primary: #1a1f3a;     // Navy blue
  --color-accent: #f5b800;       // Gold
  --color-bg-default: #f8f9fa;   // Light gray
}
```

### Rebuild After Changes
```bash
cd frontend
npm run build
# Then redeploy using one of the methods above
```

---

**Build Date**: 2025-10-29  
**Build Version**: index-D6RXvib8.js  
**Theme**: Vanta X Corporate  
**Status**: ✅ Ready for Production
