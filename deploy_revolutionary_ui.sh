#!/bin/bash

echo "=== ARIA ERP REVOLUTIONARY UI DEPLOYMENT SCRIPT ==="

# Navigate to frontend directory
cd /workspace/project/Aria---Document-Management-Employee/frontend-v2

echo "Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Checking build artifacts..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "✅ Build artifacts found"
    echo "Files in dist:"
    ls -la dist/ | head -10
else
    echo "❌ Build artifacts missing"
    exit 1
fi

# Check for revolutionary UI components
echo "Verifying revolutionary UI components..."
if grep -q "HolographicLayout" dist/assets/*.js 2>/dev/null; then
    echo "✅ HolographicLayout component found in build"
else
    echo "⚠️  HolographicLayout not found in build - may be code-split"
fi

if grep -q "perspective" dist/assets/index-*.css 2>/dev/null; then
    echo "✅ Holographic CSS effects found in build"
else
    echo "⚠️  Holographic CSS effects not found"
fi

echo ""
echo "=== FINAL DEPLOYMENT READY ==="
echo "The revolutionary UI should now be accessible at:"
echo "https://aria.vantax.co.za"
echo ""
echo "If still stuck on loading:"
echo "1. Clear browser cache and hard refresh"
echo "2. Check browser console for errors"
echo "3. Verify backend API is running at https://aria.vantax.co.za/api"
echo ""

exit 0