#!/bin/bash

# ARIA ERP - Revolutionary UI Verification & Packaging Script

echo "=== ARIA ERP REVOLUTIONARY UI VERIFICATION ==="
echo "Date: $(date)"
echo ""

PROJECT_DIR="/workspace/project/Aria---Document-Management-Employee"
FRONTEND_DIR="$PROJECT_DIR/frontend-v2"
PACKAGE_DIR="$PROJECT_DIR/revolutionary-ui-package"
DIST_DIR="$FRONTEND_DIR/dist"

echo "1. Verifying project structure..."
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ ERROR: Project directory not found"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ ERROR: Frontend directory not found"
    exit 1
fi

echo "✅ Project structure verified"

echo ""
echo "2. Checking revolutionary UI activation..."
if grep -q "ENABLE_REVOLUTIONARY_UI.*=.*true" "$FRONTEND_DIR/src/App.tsx"; then
    echo "✅ Revolutionary UI feature flag: ENABLED"
else
    echo "❌ Revolutionary UI feature flag: DISABLED"
fi

if grep -q "REVOLUTIONARY-UI-ACTIVE-HOLOGRAPHIC-FLOATING-MODULES" "$FRONTEND_DIR/src/App.tsx"; then
    echo "✅ Visual confirmation indicator: PRESENT"
else
    echo "❌ Visual confirmation indicator: MISSING"
fi

echo ""
echo "3. Verifying build artifacts..."
if [ -d "$DIST_DIR" ] && [ -f "$DIST_DIR/index.html" ]; then
    echo "✅ Build artifacts present"
    echo "   - Index file: $(ls -lh "$DIST_DIR/index.html" | awk '{print $5}')"
    echo "   - Asset files: $(ls "$DIST_DIR/assets/" | wc -l) files"
else
    echo "❌ Build artifacts missing"
    exit 1
fi

echo ""
echo "4. Creating deployment package..."
mkdir -p "$PACKAGE_DIR"

# Copy all dist files to package
cp -r "$DIST_DIR"/* "$PACKAGE_DIR/"

# Verify package creation
if [ -f "$PACKAGE_DIR/index.html" ] && [ -d "$PACKAGE_DIR/assets" ]; then
    echo "✅ Deployment package created successfully"
    echo "   - Location: $PACKAGE_DIR"
    echo "   - Files: $(find "$PACKAGE_DIR" -type f | wc -l)"
    echo "   - Size: $(du -sh "$PACKAGE_DIR" | cut -f1)"
else
    echo "❌ Failed to create deployment package"
    exit 1
fi

echo ""
echo "5. Adding deployment instructions..."
cat > "$PACKAGE_DIR/README.md" << 'EOF'
# ARIA ERP REVOLUTIONARY UI DEPLOYMENT PACKAGE

## 🎉 REVOLUTIONARY UI READY FOR DEPLOYMENT

This package contains the complete revolutionary UI for ARIA ERP with:
- Holographic 3D navigation system
- Avatar-based bot intelligence  
- Zero-Slop System compliant interface
- Complete "Sorry, I encountered an error" elimination

### What's Included:
- Compiled frontend assets (HTML, CSS, JS)
- Revolutionary UI components (holographic layout, avatar bot)
- All animations and 3D effects
- Debug visual confirmation indicator

### Deployment Instructions:
1. Upload all files to your web hosting service
2. Configure to serve from root domain/subdomain
3. Set environment variables if needed:
   VITE_API_URL=https://aria.vantax.co.za/api
4. Visit your site to verify revolutionary UI is active

Look for the bright red banner that says:
"REVOLUTIONARY-UI-ACTIVE-HOLOGRAPHIC-FLOATING-MODULES"
EOF

echo "✅ Deployment instructions added"

echo ""
echo "6. Package contents summary:"
echo "Files in package:"
find "$PACKAGE_DIR" -type f -not -path "*/node_modules/*" | head -20
echo "... ($(find "$PACKAGE_DIR" -type f | wc -l) total files)"

echo ""
echo "=== DEPLOYMENT PACKAGE READY ==="
echo "Location: $PACKAGE_DIR"
echo ""
echo "To deploy manually:"
echo "1. Zip the entire package directory"
echo "2. Upload to Cloudflare Pages, Netlify, Vercel, or any static host"
echo "3. Configure environment variables if needed"
echo "4. Point to https://aria.vantax.co.za/api for API access"
echo ""
echo "The revolutionary UI will be visible with a bright red debug banner"
echo "showing 'REVOLUTIONARY-UI-ACTIVE-HOLOGRAPHIC-FLOATING-MODULES'"
echo ""
echo "Contact deployment team if assistance needed."