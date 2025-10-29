#!/bin/bash
# Deploy Vanta X Themed Frontend to Production
# Usage: ./deploy-themed-frontend.sh

SERVER="ubuntu@3.8.139.178"
FRONTEND_PATH="/var/www/aria/frontend"

echo "🎨 Deploying Vanta X Themed Frontend to Production..."
echo "======================================================="

# Step 1: Upload the new build
echo "📤 Uploading new themed frontend..."
scp -r dist/* $SERVER:/tmp/aria-dist-new/

# Step 2: Backup current frontend and deploy new one
echo "🔄 Backing up current frontend and deploying new version..."
ssh $SERVER << 'ENDSSH'
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
    
    echo "✅ Frontend deployed successfully!"
ENDSSH

echo ""
echo "🎉 Deployment Complete!"
echo "🌐 Visit: https://aria.vantax.co.za"
echo ""
