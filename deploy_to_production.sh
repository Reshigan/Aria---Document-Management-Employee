#!/bin/bash

# ARIA Production Deployment Script
# Deploy to: ubuntu@3.8.139.178

set -e

SERVER="ubuntu@3.8.139.178"
KEY="/workspace/project/Vantax-2.pem"
REMOTE_DIR="/home/ubuntu/aria"

echo "════════════════════════════════════════════════════════════"
echo "  🚀 ARIA Production Deployment"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Create deployment package
echo "📦 Step 1: Creating deployment package..."
cd /workspace/project/Aria---Document-Management-Employee

# Create a clean deployment directory
rm -rf /tmp/aria-deploy
mkdir -p /tmp/aria-deploy

# Copy backend files
echo "  → Copying backend files..."
cp -r backend /tmp/aria-deploy/
cp requirements.txt /tmp/aria-deploy/

# Copy frontend build
echo "  → Copying frontend build..."
cp -r frontend/dist /tmp/aria-deploy/frontend-dist

# Copy deployment scripts
echo "  → Copying deployment scripts..."
cp DEPLOY_NOW.sh /tmp/aria-deploy/ || true
cp STOP_ALL.sh /tmp/aria-deploy/ || true

# Create production deployment script for remote server
cat > /tmp/aria-deploy/setup_production.sh << 'REMOTE_SCRIPT'
#!/bin/bash

set -e

echo "════════════════════════════════════════════════════════════"
echo "  🔧 Setting up ARIA on Production Server"
echo "════════════════════════════════════════════════════════════"
echo ""

# Update system
echo "📦 Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y python3-pip python3-venv nginx -qq

# Create Python virtual environment
echo "🐍 Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python packages..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Create systemd service for backend API
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/aria-api.service > /dev/null << 'SERVICE'
[Unit]
Description=ARIA Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/aria
Environment="PATH=/home/ubuntu/aria/venv/bin"
ExecStart=/home/ubuntu/aria/venv/bin/python backend/api_expanded.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/aria > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /home/ubuntu/aria/frontend-dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
NGINX

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

echo "♻️  Reloading Nginx..."
sudo systemctl reload nginx

# Start and enable ARIA service
echo "🚀 Starting ARIA service..."
sudo systemctl daemon-reload
sudo systemctl enable aria-api
sudo systemctl restart aria-api

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 5

# Check status
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Deployment Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Service Status:"
sudo systemctl status aria-api --no-pager | head -20
echo ""
echo "🌐 Access your application at: http://3.8.139.178"
echo ""
echo "Useful commands:"
echo "  • Check logs: sudo journalctl -u aria-api -f"
echo "  • Restart: sudo systemctl restart aria-api"
echo "  • Stop: sudo systemctl stop aria-api"
echo ""
REMOTE_SCRIPT

chmod +x /tmp/aria-deploy/setup_production.sh

echo "✅ Deployment package created!"
echo ""

# Step 2: Transfer to server
echo "📤 Step 2: Transferring to production server..."
ssh -i "$KEY" -o StrictHostKeyChecking=no "$SERVER" "rm -rf $REMOTE_DIR && mkdir -p $REMOTE_DIR"

echo "  → Creating deployment archive..."
cd /tmp
tar czf aria-deploy.tar.gz aria-deploy/

echo "  → Transferring archive (this may take a minute)..."
scp -i "$KEY" -o StrictHostKeyChecking=no aria-deploy.tar.gz "$SERVER:/tmp/"

echo "  → Extracting on server..."
ssh -i "$KEY" -o StrictHostKeyChecking=no "$SERVER" "cd /tmp && tar xzf aria-deploy.tar.gz && mv aria-deploy/* $REMOTE_DIR/ && rm -rf aria-deploy aria-deploy.tar.gz"

echo "✅ Files transferred!"
echo ""

# Step 3: Run setup on server
echo "🔧 Step 3: Running setup on production server..."
ssh -i "$KEY" -o StrictHostKeyChecking=no "$SERVER" "cd $REMOTE_DIR && bash setup_production.sh"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  🎉 PRODUCTION DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Your application is now live at: http://3.8.139.178"
echo ""
echo "📊 Quick Tests:"
echo "  curl http://3.8.139.178/health"
echo "  curl http://3.8.139.178/api/bots"
echo ""
echo "🔍 Monitor logs:"
echo "  ssh -i $KEY $SERVER 'sudo journalctl -u aria-api -f'"
echo ""
