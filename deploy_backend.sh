#!/bin/bash
#
# ARIA v3.0 Backend Deployment Script
# This script deploys the aria_production_complete.py backend to the production server
#

set -e  # Exit on error

echo "========================================="
echo "ARIA v3.0 Backend Deployment"
echo "========================================="
echo ""

# Configuration
SERVER="3.8.139.178"
SERVER_USER="aria"  # or your SSH user
BACKEND_FILE="backend/aria_production_complete.py"
REMOTE_PATH="/opt/aria/"
SERVICE_NAME="aria.service"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend file exists
if [ ! -f "$BACKEND_FILE" ]; then
    echo -e "${RED}Error: $BACKEND_FILE not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Backend file found: $BACKEND_FILE"
echo ""

# Show file info
echo "File size: $(du -h $BACKEND_FILE | cut -f1)"
echo "Last modified: $(date -r $BACKEND_FILE '+%Y-%m-%d %H:%M:%S')"
echo ""

# Confirm deployment
echo -e "${YELLOW}This will deploy the backend to:${NC}"
echo "  Server: $SERVER"
echo "  Path: $REMOTE_PATH"
echo "  Service: $SERVICE_NAME"
echo ""
read -p "Continue with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "========================================="
echo "Step 1: Copying backend file..."
echo "========================================="

# Copy backend file to server
scp $BACKEND_FILE $SERVER_USER@$SERVER:$REMOTE_PATH
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backend file copied successfully"
else
    echo -e "${RED}✗${NC} Failed to copy backend file"
    exit 1
fi

echo ""
echo "========================================="
echo "Step 2: Restarting service..."
echo "========================================="

# Restart the service on the server
ssh $SERVER_USER@$SERVER "sudo systemctl restart $SERVICE_NAME"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Service restarted successfully"
else
    echo -e "${RED}✗${NC} Failed to restart service"
    exit 1
fi

# Wait for service to start
echo "Waiting for service to start..."
sleep 3

echo ""
echo "========================================="
echo "Step 3: Checking service status..."
echo "========================================="

# Check service status
ssh $SERVER_USER@$SERVER "sudo systemctl status $SERVICE_NAME --no-pager | head -15"

echo ""
echo "========================================="
echo "Step 4: Testing health endpoint..."
echo "========================================="

# Test health endpoint
HEALTH_CHECK=$(curl -s https://aria.vantax.co.za/api/health)
echo "Health check response: $HEALTH_CHECK"

if echo "$HEALTH_CHECK" | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} Backend is responding correctly!"
    echo ""
    
    # Extract version info if available
    VERSION=$(echo "$HEALTH_CHECK" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    BOTS=$(echo "$HEALTH_CHECK" | grep -o '"bots":[0-9]*' | cut -d':' -f2)
    ERP=$(echo "$HEALTH_CHECK" | grep -o '"erp_modules":[0-9]*' | cut -d':' -f2)
    
    if [ ! -z "$VERSION" ]; then
        echo "  Version: $VERSION"
    fi
    if [ ! -z "$BOTS" ]; then
        echo "  Bots: $BOTS"
    fi
    if [ ! -z "$ERP" ]; then
        echo "  ERP Modules: $ERP"
    fi
else
    echo -e "${YELLOW}⚠${NC} Backend may not be responding correctly"
    echo "Please check the logs with:"
    echo "  ssh $SERVER_USER@$SERVER 'sudo journalctl -u $SERVICE_NAME -n 50'"
fi

echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="
echo -e "${GREEN}✓${NC} Backend file deployed"
echo -e "${GREEN}✓${NC} Service restarted"
echo -e "${GREEN}✓${NC} Health check complete"
echo ""
echo "Next steps:"
echo "1. Test the frontend: https://aria.vantax.co.za/login"
echo "2. Run test suite: python3 test_aria_complete.py"
echo "3. Check logs if needed: ssh $SERVER_USER@$SERVER 'sudo journalctl -u $SERVICE_NAME -f'"
echo ""
echo -e "${GREEN}Deployment complete!${NC}"
