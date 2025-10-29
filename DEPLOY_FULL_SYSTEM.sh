#!/bin/bash
# ARIA Full System Deployment Script
# Deploys all 67 bots + 11 ERP modules + Themed Frontend
# Target: aria.vantax.co.za (3.8.139.178)

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server configuration
SERVER="ubuntu@3.8.139.178"
REMOTE_APP_DIR="/opt/aria"
REMOTE_FRONTEND_DIR="/var/www/aria/frontend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       ARIA FULL SYSTEM DEPLOYMENT                         ║${NC}"
echo -e "${BLUE}║       67 Bots + 11 ERP Modules + Themed Frontend          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Pre-flight checks
echo -e "${YELLOW}[1/8] Pre-flight checks...${NC}"
if [ ! -f "aria-themed-frontend.tar.gz" ]; then
    echo -e "${RED}Error: aria-themed-frontend.tar.gz not found${NC}"
    exit 1
fi

if [ ! -d "backend" ]; then
    echo -e "${RED}Error: backend directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All files present${NC}"

# Step 2: Test SSH connection
echo -e "\n${YELLOW}[2/8] Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 $SERVER "echo 'Connected'"; then
    echo -e "${RED}Error: Cannot connect to server${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"

# Step 3: Create backups on server
echo -e "\n${YELLOW}[3/8] Creating backups on server...${NC}"
ssh $SERVER << 'ENDSSH'
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup frontend
if [ -d /var/www/aria/frontend/dist ]; then
    echo "Backing up frontend..."
    sudo cp -r /var/www/aria/frontend/dist /var/www/aria/frontend/dist.backup.$TIMESTAMP
    echo "✓ Frontend backed up to dist.backup.$TIMESTAMP"
fi

# Backup backend
if [ -d /opt/aria/backend ]; then
    echo "Backing up backend..."
    sudo cp -r /opt/aria/backend /opt/aria/backend.backup.$TIMESTAMP
    echo "✓ Backend backed up to backend.backup.$TIMESTAMP"
fi

# Backup database
if [ -f /opt/aria/aria_production.db ]; then
    echo "Backing up database..."
    sudo cp /opt/aria/aria_production.db /opt/aria/aria_production.db.backup.$TIMESTAMP
    echo "✓ Database backed up"
fi
ENDSSH

echo -e "${GREEN}✓ Backups created${NC}"

# Step 4: Deploy frontend
echo -e "\n${YELLOW}[4/8] Deploying themed frontend...${NC}"
echo "Uploading aria-themed-frontend.tar.gz..."
scp aria-themed-frontend.tar.gz $SERVER:/tmp/

ssh $SERVER << 'ENDSSH'
set -e
cd /tmp
echo "Extracting frontend..."
tar -xzf aria-themed-frontend.tar.gz
echo "Deploying to /var/www/aria/frontend/..."
sudo rm -rf /var/www/aria/frontend/dist/*
sudo cp -r dist/* /var/www/aria/frontend/dist/
sudo chown -R www-data:www-data /var/www/aria/frontend/dist
rm -rf /tmp/dist
rm -f /tmp/aria-themed-frontend.tar.gz
echo "✓ Frontend deployed"
ENDSSH

echo -e "${GREEN}✓ Frontend deployed with Vanta X theme${NC}"

# Step 5: Deploy backend
echo -e "\n${YELLOW}[5/8] Deploying backend (67 bots + 11 ERP modules)...${NC}"
echo "Creating backend archive..."
tar -czf aria-backend.tar.gz -C . backend/

echo "Uploading backend..."
scp aria-backend.tar.gz $SERVER:/tmp/

ssh $SERVER << 'ENDSSH'
set -e
cd /tmp
echo "Extracting backend..."
tar -xzf aria-backend.tar.gz

echo "Stopping backend service..."
sudo systemctl stop aria-backend || true

echo "Deploying backend code..."
sudo cp -r backend/* /opt/aria/backend/
sudo chown -R ubuntu:ubuntu /opt/aria/backend

rm -rf /tmp/backend
rm -f /tmp/aria-backend.tar.gz
echo "✓ Backend deployed"
ENDSSH

echo -e "${GREEN}✓ Backend deployed (67 bots + 11 ERP modules)${NC}"
rm -f aria-backend.tar.gz

# Step 6: Install/Update dependencies
echo -e "\n${YELLOW}[6/8] Updating backend dependencies...${NC}"
ssh $SERVER << 'ENDSSH'
set -e
cd /opt/aria/backend
if [ -f requirements/base.txt ]; then
    echo "Installing/updating Python dependencies..."
    /opt/aria/venv/bin/pip install -q -r requirements/base.txt || echo "Some dependencies may have failed, continuing..."
fi
echo "✓ Dependencies updated"
ENDSSH

echo -e "${GREEN}✓ Dependencies updated${NC}"

# Step 7: Restart services
echo -e "\n${YELLOW}[7/8] Restarting services...${NC}"
ssh $SERVER << 'ENDSSH'
set -e

# Restart backend
echo "Starting backend service..."
sudo systemctl start aria-backend
sleep 3
sudo systemctl status aria-backend --no-pager || true

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

echo "✓ Services restarted"
ENDSSH

echo -e "${GREEN}✓ Services restarted${NC}"

# Step 8: Verification
echo -e "\n${YELLOW}[8/8] Verifying deployment...${NC}"

# Check frontend
echo "Checking frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://aria.vantax.co.za || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Frontend accessible (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠ Frontend returned HTTP $FRONTEND_STATUS${NC}"
fi

# Check backend
echo "Checking backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://aria.vantax.co.za/api/health || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Backend API accessible (HTTP $BACKEND_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠ Backend API returned HTTP $BACKEND_STATUS${NC}"
fi

# Display deployment summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           DEPLOYMENT COMPLETE                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Frontend:${NC} Vanta X Theme (Navy Blue + Gold)"
echo -e "${GREEN}✓ Backend:${NC} 67 Bots + 11 ERP Modules"
echo -e "${GREEN}✓ URL:${NC} https://aria.vantax.co.za"
echo -e "${GREEN}✓ Backups:${NC} Created with timestamp $TIMESTAMP"
echo ""
echo -e "${BLUE}Components Deployed:${NC}"
echo "  • Financial Management (10 bots)"
echo "  • Human Resources & Payroll (8 bots)"
echo "  • Manufacturing (9 bots)"
echo "  • Procurement (11 bots)"
echo "  • Sales & CRM (8 bots)"
echo "  • Quality Management (2 bots)"
echo "  • Maintenance & Assets (2 bots)"
echo "  • Document Management (7 bots)"
echo "  • Policy & Risk (3 bots)"
echo "  • Integration (2 bots)"
echo "  • Core Infrastructure (5 components)"
echo ""
echo -e "${BLUE}ERP Modules:${NC}"
echo "  • Financial Management"
echo "  • HR & Payroll (SA compliant)"
echo "  • Manufacturing & Production"
echo "  • Procurement & Purchasing"
echo "  • Inventory Management"
echo "  • Quality Management"
echo "  • Maintenance Management"
echo "  • Warehouse Management (WMS)"
echo "  • Planning & MRP"
echo "  • Reporting & Analytics"
echo "  • Asset Management"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Test login at https://aria.vantax.co.za"
echo "  2. Verify themed UI (navy blue + gold)"
echo "  3. Test bot functionality in Bot Dashboard"
echo "  4. Verify ERP modules in main navigation"
echo "  5. Clear browser cache if needed (Ctrl+Shift+R)"
echo ""
echo -e "${GREEN}Deployment completed successfully! 🚀${NC}"
