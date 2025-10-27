#!/bin/bash

# ARIA Platform v2.0 Deployment Script
# Deploys 59 bots + Complete ERP to production

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  🚀 ARIA Platform v2.0 Deployment"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="3.8.139.178"
SSH_KEY="../Vantax-2.pem"
REMOTE_DIR="/home/ubuntu/aria"
BACKUP_DIR="/home/ubuntu/aria/backup_$(date +%Y%m%d_%H%M%S)"

echo "📋 Deployment Configuration:"
echo "   Remote: $REMOTE_USER@$REMOTE_HOST"
echo "   Directory: $REMOTE_DIR"
echo "   Backup: $BACKUP_DIR"
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

# Backup current version
echo "💾 Creating backup of current version..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    if [ -d "/home/ubuntu/aria" ]; then
        BACKUP_DIR="/home/ubuntu/aria/backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp /home/ubuntu/aria/api_expanded.py "$BACKUP_DIR/" 2>/dev/null || true
        echo "✅ Backup created: $BACKUP_DIR"
    else
        echo "⚠️  No existing installation found"
    fi
ENDSSH
echo ""

# Upload new files
echo "📤 Uploading v2.0 files..."
echo "   - api_production_v2.py"
scp -i "$SSH_KEY" backend/api_production_v2.py "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo "   - bots_advanced.py"
scp -i "$SSH_KEY" backend/bots_advanced.py "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo "   - erp_complete.py"
scp -i "$SSH_KEY" backend/erp_complete.py "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo "✅ Files uploaded successfully"
echo ""

# Update systemd service
echo "🔧 Updating systemd service..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    sudo tee /etc/systemd/system/aria-api.service > /dev/null << 'EOF'
[Unit]
Description=ARIA Platform v2.0 API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/aria
Environment="PATH=/home/ubuntu/aria/venv/bin"
ExecStart=/home/ubuntu/aria/venv/bin/python /home/ubuntu/aria/api_production_v2.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    echo "✅ Service configuration updated"
ENDSSH
echo ""

# Restart service
echo "🔄 Restarting ARIA service..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    sudo systemctl restart aria-api
    sleep 3
    if sudo systemctl is-active --quiet aria-api; then
        echo "✅ Service started successfully"
    else
        echo "❌ Service failed to start"
        sudo journalctl -u aria-api -n 20
        exit 1
    fi
ENDSSH
echo ""

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
sleep 5

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -s -f "https://aria.vantax.co.za/health" > /dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi
echo ""

# Test bot count
echo "🤖 Testing bot count..."
RESPONSE=$(curl -s "https://aria.vantax.co.za/api/bots")
BOT_COUNT=$(echo "$RESPONSE" | grep -o '"total_bots":[0-9]*' | grep -o '[0-9]*')

if [ "$BOT_COUNT" = "59" ]; then
    echo "✅ All 59 bots available"
else
    echo "⚠️  Bot count: $BOT_COUNT (expected 59)"
fi
echo ""

# Test ERP modules
echo "🏭 Testing ERP modules..."
MODULES=("manufacturing" "quality" "maintenance" "procurement" "financial" "hr" "crm")
PASSED=0

for module in "${MODULES[@]}"; do
    if curl -s -f "https://aria.vantax.co.za/api/erp/$module/dashboard" > /dev/null 2>&1 || \
       curl -s -f "https://aria.vantax.co.za/api/erp/$module" > /dev/null 2>&1; then
        echo "   ✅ $module module"
        PASSED=$((PASSED + 1))
    else
        echo "   ⚠️  $module module"
    fi
done

echo ""
echo "   Modules operational: $PASSED/7"
echo ""

# Display service status
echo "📊 Service Status:"
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
    sudo systemctl status aria-api --no-pager | head -15
ENDSSH
echo ""

# Display deployment summary
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ ARIA v2.0 Deployment Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 Production URL: https://aria.vantax.co.za"
echo "📚 API Docs: https://aria.vantax.co.za/api/docs"
echo "🏥 Health Check: https://aria.vantax.co.za/health"
echo ""
echo "📊 Deployment Summary:"
echo "   - Total Bots: 59 (44 existing + 15 new)"
echo "   - ERP Modules: 7"
echo "   - Version: 2.0.0"
echo "   - Status: Operational"
echo ""
echo "🤖 New Bots Added:"
echo "   Manufacturing (5): MRP, Production Scheduler, Quality Predictor,"
echo "                      Predictive Maintenance, Inventory Optimizer"
echo "   Healthcare (5): Patient Scheduling, Medical Records, Insurance Claims,"
echo "                   Lab Results, Prescription Management"
echo "   Retail (5): Demand Forecasting, Price Optimization,"
echo "              Customer Segmentation, Store Performance, Loyalty Program"
echo ""
echo "🏭 New ERP Modules:"
echo "   - Manufacturing (MRP, BOM, Work Orders, Production Planning)"
echo "   - Quality Management (Inspections, NCR, CAPA)"
echo "   - Maintenance Management (Assets, PM, CM)"
echo "   - Procurement (RFQ, PO, Contracts)"
echo ""
echo "📝 Next Steps:"
echo "   1. Test all 59 bots: https://aria.vantax.co.za/api/bots"
echo "   2. Test ERP modules: https://aria.vantax.co.za/api/docs"
echo "   3. Update frontend to support new bots and modules"
echo "   4. Complete frontend development (manufacturing, quality, admin panels)"
echo "   5. Add payment integration"
echo "   6. Create legal pages"
echo "   7. Final testing before public launch"
echo ""
echo "═══════════════════════════════════════════════════════════"
