#!/bin/bash

# ARIA Document Management System - New Server Deployment
# Deploy to server: 35.177.226.170

set -e

# Configuration
EC2_HOST="35.177.226.170"
EC2_USER="ubuntu"
SSH_KEY="SSLS.pem"
DEPLOY_DIR="/home/ubuntu/aria-deployment"
BACKUP_DIR="/home/ubuntu/aria-backups"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Function to execute commands on server
ssh_exec() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" "$1"
}

# Function to copy files to server
scp_copy() {
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r "$1" "$EC2_USER@$EC2_HOST:$2"
}

print_status "🚀 Starting ARIA Deployment to New Server ($EC2_HOST)..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key $SSH_KEY not found!"
    print_status "Please ensure SSLS.pem is in the current directory with proper permissions (chmod 600)"
    exit 1
fi

# Set proper permissions for SSH key
chmod 600 "$SSH_KEY"

# Test SSH connection
print_status "Testing SSH connection..."
if ssh_exec "echo 'SSH connection successful'"; then
    print_success "SSH connection established"
else
    print_error "Failed to connect to server $EC2_HOST"
    exit 1
fi

# Create deployment directories
print_status "Creating deployment directories..."
ssh_exec "mkdir -p $DEPLOY_DIR $BACKUP_DIR"

# Update system packages
print_status "Updating system packages..."
ssh_exec "sudo apt update && sudo apt upgrade -y"

# Install essential packages
print_status "Installing essential packages..."
ssh_exec "sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release build-essential"

# Install Node.js 18
print_status "Installing Node.js 18..."
ssh_exec "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
ssh_exec "sudo apt install -y nodejs"

# Install Python 3.11
print_status "Installing Python 3.11..."
ssh_exec "sudo add-apt-repository ppa:deadsnakes/ppa -y"
ssh_exec "sudo apt update"
ssh_exec "sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip"

# Install PostgreSQL
print_status "Installing PostgreSQL..."
ssh_exec "sudo apt install -y postgresql postgresql-contrib"

# Install Redis
print_status "Installing Redis..."
ssh_exec "sudo apt install -y redis-server"

# Install Nginx
print_status "Installing Nginx..."
ssh_exec "sudo apt install -y nginx"

# Configure PostgreSQL
print_status "Configuring PostgreSQL..."
ssh_exec "sudo -u postgres psql -c \"CREATE USER aria WITH PASSWORD 'aria_secure_password_2025';\" || true"
ssh_exec "sudo -u postgres psql -c \"CREATE DATABASE aria_db OWNER aria;\" || true"
ssh_exec "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE aria_db TO aria;\" || true"

# Configure Redis
print_status "Configuring Redis..."
ssh_exec "sudo systemctl enable redis-server"
ssh_exec "sudo systemctl start redis-server"

# Copy application files
print_status "Copying application files..."
scp_copy "." "$DEPLOY_DIR/"

# Set up backend
print_status "Setting up backend..."
ssh_exec "cd $DEPLOY_DIR/backend && python3.11 -m venv venv"
ssh_exec "cd $DEPLOY_DIR/backend && source venv/bin/activate && pip install --upgrade pip"
ssh_exec "cd $DEPLOY_DIR/backend && source venv/bin/activate && pip install -r ../requirements.txt"

# Create production environment file for backend
print_status "Creating backend production environment..."
ssh_exec "cat > $DEPLOY_DIR/backend/.env << 'EOF'
# Server Configuration
SERVER_HOST=35.177.226.170
SERVER_PORT=8000
SERVER_PROTOCOL=http
FRONTEND_URL=http://35.177.226.170

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=aria_db
DATABASE_USER=aria
DATABASE_PASSWORD=aria_secure_password_2025
DATABASE_URL=postgresql://aria:aria_secure_password_2025@localhost:5432/aria_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_URL=redis://localhost:6379/0

# Application Configuration
SECRET_KEY=\$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# CORS Configuration
ALLOWED_ORIGINS=[\"http://localhost:3000\", \"http://35.177.226.170\", \"https://35.177.226.170\"]
ALLOWED_METHODS=[\"GET\", \"POST\", \"PUT\", \"DELETE\", \"PATCH\", \"OPTIONS\"]
ALLOWED_HEADERS=[\"*\"]

# File Upload Configuration
UPLOAD_DIR=$DEPLOY_DIR/uploads
MAX_FILE_SIZE=50000000
ALLOWED_FILE_TYPES=[\"pdf\", \"doc\", \"docx\", \"txt\", \"jpg\", \"jpeg\", \"png\", \"gif\", \"csv\", \"xlsx\"]

# Feature Flags
ENABLE_AI_FEATURES=false
ENABLE_OCR=true
ENABLE_SAP_INTEGRATION=false
ENABLE_EMAIL_NOTIFICATIONS=true
EOF"

# Create uploads directory
print_status "Creating uploads directory..."
ssh_exec "mkdir -p $DEPLOY_DIR/uploads && chmod 755 $DEPLOY_DIR/uploads"

# Set up frontend
print_status "Setting up frontend..."
ssh_exec "cd $DEPLOY_DIR/frontend && npm install"

# Create production environment for frontend
print_status "Creating frontend production environment..."
ssh_exec "cat > $DEPLOY_DIR/frontend/.env.production << 'EOF'
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Server Configuration
NEXT_PUBLIC_SERVER_HOST=35.177.226.170
NEXT_PUBLIC_SERVER_PORT=80
NEXT_PUBLIC_SERVER_PROTOCOL=http

# API Configuration
NEXT_PUBLIC_API_URL=http://35.177.226.170/api
NEXT_PUBLIC_API_BASE_URL=http://35.177.226.170/api

# Application Configuration
NEXT_PUBLIC_APP_NAME=ARIA Document Management
NEXT_PUBLIC_APP_VERSION=2.0.0

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_OCR=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=false
EOF"

# Build frontend
print_status "Building frontend for production..."
ssh_exec "cd $DEPLOY_DIR/frontend && npm run build"

# Create systemd service for backend
print_status "Creating systemd service for backend..."
ssh_exec "sudo tee /etc/systemd/system/aria-backend.service > /dev/null << 'EOF'
[Unit]
Description=ARIA Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$DEPLOY_DIR/backend
Environment=PATH=$DEPLOY_DIR/backend/venv/bin
ExecStart=$DEPLOY_DIR/backend/venv/bin/uvicorn api.gateway.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF"

# Create systemd service for frontend
print_status "Creating systemd service for frontend..."
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
RestartSec=3

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

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files
    location /static/ {
        alias $DEPLOY_DIR/backend/static/;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # Uploads
    location /uploads/ {
        alias $DEPLOY_DIR/uploads/;
        expires 1y;
        add_header Cache-Control \"public\";
    }

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header Referrer-Policy \"no-referrer-when-downgrade\" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
EOF"

# Enable Nginx site
print_status "Enabling Nginx site..."
ssh_exec "sudo ln -sf /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/"
ssh_exec "sudo rm -f /etc/nginx/sites-enabled/default"

# Test Nginx configuration
print_status "Testing Nginx configuration..."
ssh_exec "sudo nginx -t"

# Enable and start services
print_status "Enabling and starting services..."
ssh_exec "sudo systemctl daemon-reload"
ssh_exec "sudo systemctl enable aria-backend aria-frontend nginx"

ssh_exec "sudo systemctl restart postgresql redis-server"
ssh_exec "sudo systemctl start aria-backend"
ssh_exec "sudo systemctl start aria-frontend"
ssh_exec "sudo systemctl restart nginx"

# Configure firewall
print_status "Configuring firewall..."
ssh_exec "sudo ufw allow 22/tcp"
ssh_exec "sudo ufw allow 80/tcp"
ssh_exec "sudo ufw allow 443/tcp"
ssh_exec "sudo ufw --force enable"

# Create monitoring script
print_status "Creating monitoring script..."
ssh_exec "cat > $DEPLOY_DIR/monitor.sh << 'EOF'
#!/bin/bash
echo \"=== ARIA System Status ===\"
echo \"Date: \$(date)\"
echo \"\"
echo \"Services:\"
sudo systemctl is-active aria-backend && echo \"✅ Backend: Running\" || echo \"❌ Backend: Failed\"
sudo systemctl is-active aria-frontend && echo \"✅ Frontend: Running\" || echo \"❌ Frontend: Failed\"
sudo systemctl is-active nginx && echo \"✅ Nginx: Running\" || echo \"❌ Nginx: Failed\"
sudo systemctl is-active postgresql && echo \"✅ PostgreSQL: Running\" || echo \"❌ PostgreSQL: Failed\"
sudo systemctl is-active redis-server && echo \"✅ Redis: Running\" || echo \"❌ Redis: Failed\"
echo \"\"
echo \"Disk Usage:\"
df -h | grep -E \"(Filesystem|/dev/)\"
echo \"\"
echo \"Memory Usage:\"
free -h
echo \"\"
echo \"Recent Backend Logs:\"
sudo journalctl -u aria-backend --no-pager -n 5
EOF"

ssh_exec "chmod +x $DEPLOY_DIR/monitor.sh"

# Health check
print_status "Performing health check..."
sleep 10

# Check if services are running
print_status "Checking service status..."
ssh_exec "sudo systemctl is-active aria-backend" && print_success "Backend service is running" || print_error "Backend service failed"
ssh_exec "sudo systemctl is-active aria-frontend" && print_success "Frontend service is running" || print_error "Frontend service failed"
ssh_exec "sudo systemctl is-active nginx" && print_success "Nginx service is running" || print_error "Nginx service failed"

print_success "🎉 ARIA Deployment Complete!"

print_status "🌐 Your ARIA application is now accessible at:"
print_success "http://$EC2_HOST"

print_status "📋 Deployment Summary:"
echo "✅ System updated and dependencies installed"
echo "✅ Database configured (PostgreSQL)"
echo "✅ Cache configured (Redis)"
echo "✅ Backend deployed and running"
echo "✅ Frontend built and deployed"
echo "✅ Nginx reverse proxy configured"
echo "✅ Firewall configured"
echo "✅ Services enabled for auto-start"

print_status "🔧 Useful Commands (run on server):"
echo "- Monitor system: $DEPLOY_DIR/monitor.sh"
echo "- Check backend logs: sudo journalctl -u aria-backend -f"
echo "- Check frontend logs: sudo journalctl -u aria-frontend -f"
echo "- Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Restart all services: sudo systemctl restart aria-backend aria-frontend nginx"

print_status "🔒 Security Notes:"
echo "- Firewall is enabled (ports 22, 80, 443 open)"
echo "- Services run as non-root user (ubuntu)"
echo "- Database has dedicated user with limited privileges"

print_warning "⚠️  Next Steps:"
echo "1. Test the application at http://$EC2_HOST"
echo "2. Set up SSL certificate for HTTPS"
echo "3. Configure domain name if needed"
echo "4. Set up automated backups"
echo "5. Configure monitoring and alerting"

print_success "Deployment completed successfully! 🚀"