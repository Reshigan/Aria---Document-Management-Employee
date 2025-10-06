#!/bin/bash

# ARIA Production Deployment Script
# Deploys the production build to the server

set -e

echo "🚀 ARIA Production Deployment Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_HOST="13.247.108.209"
SERVER_USER="ubuntu"
SSH_KEY="/workspace/project/VantaX.pem"
REMOTE_DIR="/home/ubuntu/aria-production"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}Server: $SERVER_USER@$SERVER_HOST${NC}"
echo -e "${BLUE}Remote Directory: $REMOTE_DIR${NC}"
echo -e "${BLUE}SSH Key: $SSH_KEY${NC}"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    exit 1
fi

# Test SSH connection
echo -e "\n${YELLOW}🔍 Testing SSH connection...${NC}"
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER_USER@$SERVER_HOST" "echo 'SSH connection successful'"; then
    echo -e "${RED}❌ SSH connection failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"

# Create remote directory
echo -e "\n${YELLOW}📁 Creating remote directory...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_DIR"

# Stop existing services
echo -e "\n${YELLOW}🛑 Stopping existing services...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'EOF'
# Stop any running processes
sudo pkill -f "python3 simple_main.py" 2>/dev/null || true
sudo pkill -f "npm run dev" 2>/dev/null || true
sudo pkill -f "node" 2>/dev/null || true
sleep 3

# Stop Docker containers if running
docker-compose -f /home/ubuntu/aria-production/docker-compose.production.yml down 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true

echo "✅ Services stopped"
EOF

# Copy production files
echo -e "\n${YELLOW}📦 Copying production files...${NC}"

# Copy main application files
echo "Copying backend files..."
scp -i "$SSH_KEY" -r "$PROJECT_ROOT/backend" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"

echo "Copying frontend files..."
scp -i "$SSH_KEY" -r "$PROJECT_ROOT/frontend" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"

# Copy configuration files
echo "Copying configuration files..."
scp -i "$SSH_KEY" "$PROJECT_ROOT/docker-compose.production.yml" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"
scp -i "$SSH_KEY" "$PROJECT_ROOT/.env.production" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"
scp -i "$SSH_KEY" "$PROJECT_ROOT/next.config.js" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"

# Copy Docker files
echo "Copying Docker files..."
scp -i "$SSH_KEY" "$PROJECT_ROOT/Dockerfile.frontend" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"
scp -i "$SSH_KEY" "$PROJECT_ROOT/Dockerfile.backend" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"

# Copy nginx configuration
echo "Copying nginx configuration..."
scp -i "$SSH_KEY" -r "$PROJECT_ROOT/nginx" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"

# Copy scripts
echo "Copying deployment scripts..."
scp -i "$SSH_KEY" -r "$PROJECT_ROOT/scripts" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"

echo -e "${GREEN}✅ Files copied successfully${NC}"

# Install dependencies and setup
echo -e "\n${YELLOW}🔧 Setting up production environment...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << EOF
cd $REMOTE_DIR

# Make scripts executable
chmod +x scripts/*.sh

# Update system packages
sudo apt-get update -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Setup backend virtual environment
echo "Setting up backend environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --no-cache-dir -r requirements.txt
pip install --no-cache-dir gunicorn uvicorn[standard]
deactivate
cd ..

# Setup frontend dependencies
echo "Setting up frontend environment..."
cd frontend
npm ci --only=production
cd ..

# Create necessary directories
sudo mkdir -p /data/uploads /var/log/aria
sudo chown -R ubuntu:ubuntu /data /var/log/aria

echo "✅ Environment setup completed"
EOF

# Build and start services
echo -e "\n${YELLOW}🐳 Building and starting production services...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << EOF
cd $REMOTE_DIR

# Build Docker images
echo "Building Docker images..."
docker build -f Dockerfile.frontend -t aria-frontend:latest .
docker build -f Dockerfile.backend -t aria-backend:latest .

# Start services with Docker Compose
echo "Starting services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 30

# Check service status
echo "Checking service status..."
docker-compose -f docker-compose.production.yml ps

echo "✅ Production services started"
EOF

# Update Nginx configuration
echo -e "\n${YELLOW}🌐 Updating Nginx configuration...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'EOF'
# Backup existing nginx config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup 2>/dev/null || true

# Copy production nginx config
sudo cp /home/ubuntu/aria-production/nginx/nginx.prod.conf /etc/nginx/nginx.conf

# Test nginx configuration
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration error, restoring backup"
    sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf 2>/dev/null || true
    exit 1
fi
EOF

# Verify deployment
echo -e "\n${YELLOW}🧪 Verifying deployment...${NC}"
sleep 10

# Test health endpoints
echo "Testing health endpoints..."
if curl -f "http://$SERVER_HOST/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx health check passed${NC}"
else
    echo -e "${RED}❌ Nginx health check failed${NC}"
fi

if curl -f "http://$SERVER_HOST/api/v1/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API health check passed${NC}"
else
    echo -e "${RED}❌ Backend API health check failed${NC}"
fi

if curl -f "http://$SERVER_HOST" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Final status
echo -e "\n${GREEN}🎉 Production Deployment Completed!${NC}"
echo -e "${GREEN}=================================${NC}"
echo -e "${BLUE}🌐 Access Points:${NC}"
echo -e "  Frontend: http://$SERVER_HOST"
echo -e "  Backend API: http://$SERVER_HOST/api/v1"
echo -e "  API Docs: http://$SERVER_HOST/docs"
echo -e "  Health Check: http://$SERVER_HOST/health"

echo -e "\n${YELLOW}📋 Post-Deployment Tasks:${NC}"
echo "1. Configure SSL certificates for HTTPS"
echo "2. Set up monitoring and alerting"
echo "3. Configure automated backups"
echo "4. Set up log rotation"
echo "5. Configure firewall rules"

echo -e "\n${BLUE}🔧 Management Commands:${NC}"
echo "  Start: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'cd $REMOTE_DIR && ./scripts/start.sh'"
echo "  Stop: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'cd $REMOTE_DIR && ./scripts/stop.sh'"
echo "  Logs: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'cd $REMOTE_DIR && docker-compose logs -f'"

echo -e "\n${GREEN}✅ ARIA Production System is now live!${NC}"