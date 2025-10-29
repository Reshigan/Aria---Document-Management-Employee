#!/bin/bash
#
# ARIA FOOLPROOF DEPLOYMENT SCRIPT
# This script ensures consistent, repeatable deployments
# preventing the issues we've had in the last 10 deployments
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production settings
PROD_SERVER="3.8.139.178"
SSH_KEY="Vantax-2.pem"
SSH_USER="ubuntu"
BACKEND_PATH="/opt/aria"
FRONTEND_PATH="/var/www/aria/frontend/dist"
DOMAIN="aria.vantax.co.za"

echo "🚀 ARIA Foolproof Deployment Script"
echo "===================================="
echo ""

# Pre-flight checks
echo "📋 Running pre-flight checks..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH key found${NC}"

# Check SSH connection
if ! ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${SSH_USER}@${PROD_SERVER}" "echo connected" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to production server${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"

# Verify we're in the right directory
if [ ! -f "PRODUCTION_CONFIG.md" ]; then
    echo -e "${RED}❌ Not in project root directory${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Project root directory confirmed${NC}"

# Check for /api/v1 in frontend (should not exist)
echo ""
echo "🔍 Checking for API path issues..."
if grep -r "api/v1" frontend/src/ --files-with-matches 2>/dev/null; then
    echo -e "${RED}❌ FOUND /api/v1 in frontend! This needs to be fixed.${NC}"
    echo -e "${YELLOW}Run: grep -r '/api/v1' frontend/src/ | sed 's|/api/v1|/api|g'${NC}"
    read -p "Do you want me to fix this automatically? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        grep -r "/api/v1" frontend/src/ --files-with-matches | while read file; do
            sed -i 's|/api/v1|/api|g' "$file"
            echo "Fixed: $file"
        done
        echo -e "${GREEN}✅ API paths fixed${NC}"
    else
        echo -e "${RED}Deployment aborted. Please fix API paths manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ No /api/v1 found in frontend${NC}"
fi

# Verify database path in backend
if ! grep -q 'aria_production.db' backend/database.py; then
    echo -e "${RED}❌ Backend database.py not using aria_production.db${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend using correct database${NC}"

echo ""
echo "✅ All pre-flight checks passed!"
echo ""

# Build frontend
echo "🔨 Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi
npm run build
cd ..
echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Ask for confirmation
echo ""
echo "⚠️  Ready to deploy to production:"
echo "   Server: $PROD_SERVER"
echo "   Domain: https://$DOMAIN"
echo "   Backend: $BACKEND_PATH"
echo "   Frontend: $FRONTEND_PATH"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Create backup timestamp
BACKUP_TS=$(date +%Y%m%d_%H%M%S)
echo ""
echo "📦 Creating backup: backup_$BACKUP_TS"

# Backup current production
ssh -i "$SSH_KEY" "${SSH_USER}@${PROD_SERVER}" "
    # Backup database
    if [ -f $BACKEND_PATH/aria_production.db ]; then
        cp $BACKEND_PATH/aria_production.db $BACKEND_PATH/aria_production.db.backup_$BACKUP_TS
        echo '✅ Database backed up'
    fi
    
    # Backup backend code
    if [ -d $BACKEND_PATH ]; then
        tar -czf /tmp/aria_backend_backup_$BACKUP_TS.tar.gz -C $BACKEND_PATH . 2>/dev/null || true
        echo '✅ Backend code backed up'
    fi
"

# Deploy backend
echo ""
echo "🚀 Deploying backend..."
rsync -avz --progress \
    --exclude='venv' \
    --exclude='uploads' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='*.db' \
    --exclude='*.log' \
    -e "ssh -i $SSH_KEY" \
    backend/ "${SSH_USER}@${PROD_SERVER}:${BACKEND_PATH}/"

echo -e "${GREEN}✅ Backend deployed${NC}"

# Deploy frontend
echo ""
echo "🚀 Deploying frontend..."
scp -i "$SSH_KEY" -r frontend/dist/* "${SSH_USER}@${PROD_SERVER}:${FRONTEND_PATH}/"
echo -e "${GREEN}✅ Frontend deployed${NC}"

# Restart backend
echo ""
echo "🔄 Restarting backend..."
ssh -i "$SSH_KEY" "${SSH_USER}@${PROD_SERVER}" "
    # Kill existing process
    pkill -f aria_production_complete || true
    sleep 2
    
    # Start new process
    cd $BACKEND_PATH
    nohup $BACKEND_PATH/venv/bin/python aria_production_complete.py > /tmp/aria_production_$BACKUP_TS.log 2>&1 &
    
    # Wait for startup
    sleep 3
    
    # Get PID
    PID=\$(pgrep -f aria_production_complete)
    if [ -z \"\$PID\" ]; then
        echo '❌ Backend failed to start!'
        echo 'Last 20 lines of log:'
        tail -20 /tmp/aria_production_$BACKUP_TS.log
        exit 1
    else
        echo \"✅ Backend started (PID: \$PID)\"
    fi
"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend restart failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend restarted${NC}"

# Verify deployment
echo ""
echo "🔍 Verifying deployment..."

# Wait for backend to be fully ready
sleep 3

# Test auth endpoint
echo -n "Testing /api/auth/login... "
if curl -s -f "https://$DOMAIN/api/auth/login" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "Auth endpoint not responding!"
fi

# Test bots
echo -n "Testing /api/bots... "
BOTS=$(curl -s "https://$DOMAIN/api/bots" | jq -r '.total // 0' 2>/dev/null)
if [ "$BOTS" = "67" ]; then
    echo -e "${GREEN}✅ ($BOTS bots)${NC}"
else
    echo -e "${YELLOW}⚠️  Got $BOTS bots (expected 67)${NC}"
fi

# Test ERP
echo -n "Testing /api/erp/modules... "
MODULES=$(curl -s "https://$DOMAIN/api/erp/modules" | jq -r '.total // 0' 2>/dev/null)
if [ "$MODULES" = "8" ]; then
    echo -e "${GREEN}✅ ($MODULES modules)${NC}"
else
    echo -e "${YELLOW}⚠️  Got $MODULES modules (expected 8)${NC}"
fi

# Test frontend
echo -n "Testing frontend... "
if curl -s -f "https://$DOMAIN/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# Show backend status
echo ""
echo "📊 Backend Status:"
ssh -i "$SSH_KEY" "${SSH_USER}@${PROD_SERVER}" "
    echo 'Process:'
    ps aux | grep aria_production_complete | grep -v grep
    echo ''
    echo 'Latest logs:'
    tail -10 /tmp/aria_production_$BACKUP_TS.log
"

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Application URL: https://$DOMAIN"
echo "🔐 Admin Login: admin@vantax.co.za / admin123"
echo "📝 Logs: /tmp/aria_production_$BACKUP_TS.log"
echo "💾 Backup: /tmp/aria_backend_backup_$BACKUP_TS.tar.gz"
echo ""
echo "⚠️  Remember to change the admin password!"
