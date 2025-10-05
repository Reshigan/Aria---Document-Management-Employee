#!/bin/bash

# ARIA Quick Deployment - One-liner script
# Run this command once you're connected to your server:
# curl -sSL https://raw.githubusercontent.com/Reshigan/Aria---Document-Management-Employee/production-deployment-v1/quick-deploy.sh | bash

set -e

echo "🚀 ARIA Quick Deployment Starting..."

# Download and run the main deployment script
cd /home/ubuntu
curl -sSL https://raw.githubusercontent.com/Reshigan/Aria---Document-Management-Employee/production-deployment-v1/deploy-production.sh -o deploy-production.sh
chmod +x deploy-production.sh

echo "📥 Running deployment script..."
./deploy-production.sh

echo "✅ Deployment completed!"
echo "🌐 Your ARIA application should be accessible at:"
echo "   http://$(curl -s ifconfig.me)"
echo "   http://$(hostname -I | awk '{print $1}')"

echo ""
echo "🔧 Quick status check:"
sudo systemctl is-active aria-backend aria-frontend nginx || true

echo ""
echo "📋 Next steps:"
echo "1. Configure your domain name"
echo "2. Set up SSL certificate: ./setup-ssl.sh your-domain.com"
echo "3. Update environment variables in backend/.env"
echo "4. Test the application in your browser"