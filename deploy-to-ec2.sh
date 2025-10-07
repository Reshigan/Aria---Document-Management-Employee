#!/bin/bash

# ARIA Document Management System - EC2 Production Deployment
# Simplified deployment script for production environment

set -e

# Configuration
EC2_HOST="ec2-13-247-108-209.af-south-1.compute.amazonaws.com"
EC2_USER="ubuntu"
SSH_KEY="VantaX.pem"
DEPLOY_DIR="/home/ubuntu/aria-deployment"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ssh_exec() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" "$1"
}

scp_copy() {
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r "$1" "$EC2_USER@$EC2_HOST:$2"
}

print_status "🚀 Starting ARIA Production Deployment..."

# Test SSH connection
print_status "Testing SSH connection..."
if ssh_exec "echo 'Connected successfully'"; then
    print_success "SSH connection established"
else
    print_error "Failed to connect to EC2"
    exit 1
fi

# Create deployment directory
print_status "Creating deployment directory..."
ssh_exec "mkdir -p $DEPLOY_DIR"

# Copy application files
print_status "Copying application files..."
scp_copy "." "$DEPLOY_DIR/"

# Install system dependencies
print_status "Installing system dependencies..."
ssh_exec "sudo apt update && sudo apt install -y nodejs npm python3.11 python3.11-venv postgresql redis-server nginx"

# Set up database
print_status "Setting up PostgreSQL..."
ssh_exec "sudo -u postgres psql -c \"CREATE USER aria WITH PASSWORD 'aria_secure_password_2025';\" || true"
ssh_exec "sudo -u postgres psql -c \"CREATE DATABASE aria_db OWNER aria;\" || true"

# Set up backend
print_status "Setting up backend..."
ssh_exec "cd $DEPLOY_DIR/backend && python3.11 -m venv venv && source venv/bin/activate && pip install -r ../requirements.txt"

# Copy production environment
ssh_exec "cp $DEPLOY_DIR/backend/.env.production $DEPLOY_DIR/backend/.env"

# Set up frontend
print_status "Setting up frontend..."
ssh_exec "cd $DEPLOY_DIR/frontend && npm install && npm run build"

# Create systemd services
print_status "Creating systemd services..."

# Backend service
ssh_exec "sudo tee /etc/systemd/system/aria-backend.service > /dev/null << 'EOF'
[Unit]
Description=ARIA Backend
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$DEPLOY_DIR/backend
Environment=PATH=$DEPLOY_DIR/backend/venv/bin
ExecStart=$DEPLOY_DIR/backend/venv/bin/uvicorn api.gateway.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

# Frontend service
ssh_exec "sudo tee /etc/systemd/system/aria-frontend.service > /dev/null << 'EOF'
[Unit]
Description=ARIA Frontend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$DEPLOY_DIR/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF"

# Configure Nginx
print_status "Configuring Nginx..."
ssh_exec "sudo tee /etc/nginx/sites-available/aria > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF"

ssh_exec "sudo ln -sf /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/"
ssh_exec "sudo rm -f /etc/nginx/sites-enabled/default"

# Start services
print_status "Starting services..."
ssh_exec "sudo systemctl daemon-reload"
ssh_exec "sudo systemctl enable aria-backend aria-frontend nginx"
ssh_exec "sudo systemctl start postgresql redis-server"
ssh_exec "sudo systemctl restart aria-backend aria-frontend nginx"

# Configure firewall
print_status "Configuring firewall..."
ssh_exec "sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw --force enable"

print_success "🎉 Deployment completed!"
print_status "Application available at: http://$EC2_HOST"

# Health check
print_status "Performing health check..."
sleep 5
ssh_exec "curl -f http://localhost || echo 'Health check failed - check logs'"

print_status "Useful commands:"
echo "- Check logs: ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'sudo journalctl -u aria-backend -f'"
echo "- Restart services: ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'sudo systemctl restart aria-backend aria-frontend nginx'"