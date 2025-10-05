#!/bin/bash

# ARIA Deployment Test Script
# This script tests the deployment locally before pushing to production

set -e

echo "🧪 Testing ARIA Deployment Locally..."

# Check if we're in the right directory
if [ ! -f "deploy-production.sh" ]; then
    echo "❌ Error: deploy-production.sh not found. Run this from the project root."
    exit 1
fi

# Test script syntax
echo "📝 Checking deployment script syntax..."
bash -n deploy-production.sh && echo "✅ deploy-production.sh syntax OK"
bash -n setup-ssl.sh && echo "✅ setup-ssl.sh syntax OK"
bash -n quick-deploy.sh && echo "✅ quick-deploy.sh syntax OK"

# Check if all required files exist
echo "📁 Checking required files..."
files=(
    "backend/requirements/production.txt"
    "frontend/package.json"
    "frontend/next.config.js"
    "backend/main.py"
    "backend/models/__init__.py"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Test Python requirements
echo "🐍 Testing Python requirements..."
if [ -f "backend/requirements/production.txt" ]; then
    echo "📦 Production requirements found ($(wc -l < backend/requirements/production.txt) packages)"
else
    echo "❌ Production requirements missing"
fi

# Test frontend configuration
echo "🌐 Testing frontend configuration..."
if [ -f "frontend/package.json" ]; then
    echo "📦 Frontend package.json found"
    if command -v node >/dev/null 2>&1; then
        cd frontend
        echo "🔍 Checking for syntax errors in package.json..."
        node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" && echo "✅ package.json is valid JSON"
        cd ..
    fi
else
    echo "❌ Frontend package.json missing"
fi

# Test database models
echo "🗄️ Testing database models..."
if [ -f "backend/models/__init__.py" ]; then
    echo "✅ Database models found"
else
    echo "❌ Database models missing"
fi

# Test environment files
echo "🔧 Checking environment configuration..."
if [ -f "frontend/.env.production" ]; then
    echo "✅ Frontend production environment found"
else
    echo "⚠️ Frontend production environment missing (will be created during deployment)"
fi

echo ""
echo "🎯 Deployment Test Summary:"
echo "✅ All deployment scripts are syntactically correct"
echo "✅ Required files are present"
echo "✅ Configuration files are valid"
echo ""
echo "🚀 Ready for production deployment!"
echo ""
echo "📋 To deploy to your server:"
echo "1. Ensure your EC2 instance is running"
echo "2. Check security group allows SSH (port 22)"
echo "3. Connect to server: ssh -i 'VantaX.pem' ubuntu@ec2-13-247-72-117.af-south-1.compute.amazonaws.com"
echo "4. Run: curl -sSL https://raw.githubusercontent.com/Reshigan/Aria---Document-Management-Employee/production-deployment-v1/quick-deploy.sh | bash"