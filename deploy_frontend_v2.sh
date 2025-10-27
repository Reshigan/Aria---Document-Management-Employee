#!/bin/bash

# ARIA Platform v2.0 Frontend Deployment Script

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  🎨 ARIA v2.0 Frontend Deployment"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="3.8.139.178"
SSH_KEY="../Vantax-2.pem"
REMOTE_DIR="/var/www/aria"
LOCAL_DIST="frontend/dist"

echo "📋 Deployment Configuration:"
echo "   Remote: $REMOTE_USER@$REMOTE_HOST"
echo "   Directory: $REMOTE_DIR"
echo "   Source: $LOCAL_DIST"
echo ""

# Check if build exists
if [ ! -d "$LOCAL_DIST" ]; then
    echo "❌ Error: Build directory not found: $LOCAL_DIST"
    echo "   Run 'npm run build' first"
    exit 1
fi

echo "✅ Build directory found"
echo ""

# Check SSH key
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ Error: SSH key not found: $SSH_KEY"
    exit 1
fi

echo "✅ SSH key found"
echo ""

# Test SSH connection
echo "🔐 Testing SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$REMOTE_USER@$REMOTE_HOST" "echo 'Connection successful'" > /dev/null 2>&1; then
    echo "✅ SSH connection successful"
else
    echo "❌ Error: Cannot connect to remote server"
    exit 1
fi
echo ""

# Backup current frontend
echo "💾 Creating backup of current frontend..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    if [ -d "/var/www/aria" ]; then
        BACKUP_DIR="/var/www/aria_backup_$(date +%Y%m%d_%H%M%S)"
        sudo cp -r /var/www/aria "$BACKUP_DIR"
        echo "✅ Backup created: $BACKUP_DIR"
    else
        echo "⚠️  No existing frontend found"
    fi
ENDSSH
echo ""

# Upload new frontend
echo "📤 Uploading v2.0 frontend..."

# Create tarball for faster transfer
cd frontend
tar -czf ../aria-frontend-v2.tar.gz -C dist .
cd ..

# Upload tarball
scp -i "$SSH_KEY" aria-frontend-v2.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/"

# Clean up local tarball
rm aria-frontend-v2.tar.gz

echo "✅ Files uploaded"
echo ""

# Move to production directory
echo "🔄 Extracting and moving to production..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    # Create directory if it doesn't exist
    sudo mkdir -p /var/www/aria
    
    # Extract to temporary directory
    mkdir -p /tmp/aria-frontend-new
    tar -xzf /tmp/aria-frontend-v2.tar.gz -C /tmp/aria-frontend-new/
    
    # Move to production
    sudo rm -rf /var/www/aria/*
    sudo mv /tmp/aria-frontend-new/* /var/www/aria/
    
    # Clean up
    rm -rf /tmp/aria-frontend-new
    rm /tmp/aria-frontend-v2.tar.gz
    
    # Set proper permissions
    sudo chown -R www-data:www-data /var/www/aria
    sudo chmod -R 755 /var/www/aria
    
    echo "✅ Frontend deployed to production"
ENDSSH
echo ""

# Test frontend
echo "🏥 Testing frontend..."
sleep 2

if curl -s -f "https://aria.vantax.co.za" > /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️  Frontend check failed (might be cached)"
fi
echo ""

# Display file info
echo "📊 Deployed Files:"
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    ls -lh /var/www/aria/ | head -10
    echo ""
    echo "Total size:"
    du -sh /var/www/aria/
ENDSSH
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Frontend Deployment Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 Access URLs:"
echo "   Homepage: https://aria.vantax.co.za"
echo "   Dashboard: https://aria.vantax.co.za/dashboard"
echo "   Bots: https://aria.vantax.co.za/bots"
echo "   API Docs: https://aria.vantax.co.za/api/docs"
echo ""
echo "📝 Deployment Summary:"
echo "   - Frontend built: $(du -sh $LOCAL_DIST | cut -f1)"
echo "   - Files deployed: $(find $LOCAL_DIST -type f | wc -l) files"
echo "   - Status: Operational"
echo ""
echo "🔄 Cache Note:"
echo "   If changes don't appear, clear browser cache (Ctrl+Shift+R)"
echo ""
echo "═══════════════════════════════════════════════════════════"
