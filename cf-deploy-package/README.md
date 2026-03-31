# ARIA ERP - Cloudflare Deployment Package

This package contains only the essential files needed for Cloudflare Pages deployment.

## Contents:
- `frontend-v2/` - The React/Vite frontend with revolutionary UI
- `wrangler.toml` - Cloudflare configuration (alternative)
- `wrangler.pages.toml` - Cloudflare Pages configuration (primary)

## Deployment Instructions:

### Option 1: GitHub Integration (Recommended)
1. Push this package to a GitHub repository
2. Connect Cloudflare Pages to the repository
3. Set build settings:
   - Build command: `cd frontend-v2 && npm install && npm run build`
   - Build output directory: `frontend-v2/dist`
   - Root directory: `/`
4. Add environment variables in Cloudflare dashboard:
   ```
   VITE_API_URL = "https://aria.vantax.co.za/api"
   VITE_APP_NAME = "Aria ERP"
   VITE_APP_VERSION = "2.0.0"
   ```

### Option 2: Direct Upload
1. Build the frontend: `cd frontend-v2 && npm run build`
2. Upload the contents of `frontend-v2/dist/` to Cloudflare Pages
3. Configure environment variables as shown above

## Revolutionary UI Features Included:

✅ Holographic 3D Navigation System  
✅ Avatar-Powered Bot Intelligence  
✅ Glass-Morphism Interface Effects  
✅ Zero-Slop System Compliance  
✅ Neuro-Inspired Animations  
✅ Gesture-Controlled Interface  
✅ Visual Confirmation Banner  

## What's Removed:
- Old frontend directory (frontend/)
- Redundant Docker files
- Unnecessary deployment scripts
- Excess documentation files
- Unused configuration files

## Verification:
After deployment, visit your site and look for:
- Bright red banner saying "REVOLUTIONARY-UI-ACTIVE-HOLOGRAPHIC-FLOATING-MODULES" 
- 3D floating module nodes instead of traditional sidebar
- Avatar companion replacing error messages
- Glass-morphism UI effects throughout
