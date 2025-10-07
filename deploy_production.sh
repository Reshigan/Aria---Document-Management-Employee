#!/bin/bash
################################################################################
# ARIA Document Management System - Production Deployment Script
# 
# This script automates the deployment of ARIA to a production server
# 
# Usage: 
#   Local: ./deploy_production.sh
#   Remote: Run this on your production server after transferring files
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/aria"
BACKEND_PORT=8000
FRONTEND_PORT=3000
DB_PATH="$APP_DIR/backend/aria.db"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}ARIA Document Management System - Production Deployment${NC}"
echo -e "${BLUE}============================================================${NC}\n"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_warning "Running as root. This is okay for initial setup."
fi

# 1. System Update
print_info "Step 1/10: Updating system packages..."
sudo apt-get update -qq
print_status "System packages updated"

# 2. Install Required Packages
print_info "Step 2/10: Installing required packages..."
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    git \
    curl \
    build-essential \
    postgresql \
    postgresql-contrib \
    > /dev/null 2>&1
print_status "Required packages installed"

# 3. Check Node.js version
print_info "Step 3/10: Checking Node.js version..."
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# 4. Create application directory
print_info "Step 4/10: Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
print_status "Application directory created: $APP_DIR"

# 5. Setup Python Virtual Environment
print_info "Step 5/10: Setting up Python virtual environment..."
cd $APP_DIR
python3 -m venv venv
source venv/bin/activate
print_status "Python virtual environment created"

# 6. Install Python Dependencies
print_info "Step 6/10: Installing Python dependencies..."
pip install --upgrade pip > /dev/null
cd backend
pip install -r requirements.txt > /dev/null
print_status "Python dependencies installed"

# 7. Install Frontend Dependencies
print_info "Step 7/10: Installing frontend dependencies..."
cd ../frontend
npm install > /dev/null 2>&1
print_status "Frontend dependencies installed"

# 8. Build Frontend
print_info "Step 8/10: Building frontend for production..."
npm run build > /dev/null 2>&1
print_status "Frontend built successfully"

# 9. Setup Environment Variables
print_info "Step 9/10: Setting up environment variables..."
cd $APP_DIR

# Backend .env
cat > backend/.env << EOF
DATABASE_URL=sqlite:///$DB_PATH
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
ALLOWED_ORIGINS=http://localhost:$FRONTEND_PORT,http://$(hostname -I | awk '{print $1}'):$FRONTEND_PORT
EOF
print_status "Backend environment configured"

# Frontend .env.local
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):$BACKEND_PORT/api/v1
EOF
print_status "Frontend environment configured"

# 10. Setup Systemd Services
print_info "Step 10/10: Setting up systemd services..."

# Backend service
sudo tee /etc/systemd/system/aria-backend.service > /dev/null << EOF
[Unit]
Description=ARIA Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/uvicorn api.gateway.main:app --host 0.0.0.0 --port $BACKEND_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee /etc/systemd/system/aria-frontend.service > /dev/null << EOF
[Unit]
Description=ARIA Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/frontend
Environment="PATH=/usr/bin:/usr/local/bin"
Environment="PORT=$FRONTEND_PORT"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start services
sudo systemctl daemon-reload
sudo systemctl enable aria-backend aria-frontend
sudo systemctl restart aria-backend aria-frontend

print_status "Systemd services configured and started"

# Wait for services to start
sleep 5

# Check service status
echo ""
print_info "Checking service status..."
if systemctl is-active --quiet aria-backend; then
    print_status "Backend service is running"
else
    print_error "Backend service failed to start"
    sudo journalctl -u aria-backend -n 20 --no-pager
fi

if systemctl is-active --quiet aria-frontend; then
    print_status "Frontend service is running"
else
    print_error "Frontend service failed to start"
    sudo journalctl -u aria-frontend -n 20 --no-pager
fi

# Display access information
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "Access your ARIA system at:"
echo -e "  Frontend: ${GREEN}http://$(hostname -I | awk '{print $1}'):$FRONTEND_PORT${NC}"
echo -e "  Backend API: ${GREEN}http://$(hostname -I | awk '{print $1}'):$BACKEND_PORT/api/v1${NC}"
echo -e "  API Docs: ${GREEN}http://$(hostname -I | awk '{print $1}'):$BACKEND_PORT/api/v1/docs${NC}"
echo ""
echo -e "Service Management:"
echo -e "  View backend logs: ${YELLOW}sudo journalctl -u aria-backend -f${NC}"
echo -e "  View frontend logs: ${YELLOW}sudo journalctl -u aria-frontend -f${NC}"
echo -e "  Restart backend: ${YELLOW}sudo systemctl restart aria-backend${NC}"
echo -e "  Restart frontend: ${YELLOW}sudo systemctl restart aria-frontend${NC}"
echo ""
echo -e "Next Steps:"
echo -e "  1. Configure Nginx reverse proxy (optional)"
echo -e "  2. Set up SSL certificates"
echo -e "  3. Configure firewall rules"
echo -e "  4. Run the test script: ${YELLOW}python3 test_production.py${NC}"
echo ""
