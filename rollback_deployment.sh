#!/bin/bash
#################################################################################
# ARIA ROLLBACK SCRIPT
# 
# This script rolls back to the previous deployment
# Usage: ./rollback_deployment.sh
#################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER_USER="ubuntu"
SERVER_IP="3.8.139.178"
SSH_KEY="/workspace/project/Vantax-2.pem"

echo -e "${RED}==============================================================================="
echo "                    ARIA DEPLOYMENT ROLLBACK"
echo "===============================================================================${NC}"
echo ""
echo -e "${YELLOW}WARNING: This will rollback to the previous deployment!${NC}"
echo ""
read -p "Are you sure you want to rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}[✓]${NC} Starting rollback..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
set -e

echo "Checking for backup..."
if [ ! -d "/var/www/aria/frontend/dist.backup" ]; then
    echo "ERROR: No backup found!"
    exit 1
fi

echo "Restoring previous frontend..."
rm -rf /var/www/aria/frontend/dist
mv /var/www/aria/frontend/dist.backup /var/www/aria/frontend/dist

echo "Restarting backend service..."
sudo systemctl restart aria-backend

echo "Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "Rollback complete!"
echo "Previous deployment has been restored."
ENDSSH

echo ""
echo -e "${GREEN}==============================================================================="
echo "                    ROLLBACK COMPLETE"
echo "===============================================================================${NC}"
echo ""
echo "The previous deployment has been restored."
echo "Please test: https://aria.vantax.co.za"
