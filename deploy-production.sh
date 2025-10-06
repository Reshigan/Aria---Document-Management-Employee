#!/bin/bash

# ARIA Document Management System - Production Deployment Script
# This script sets up the complete production environment on Ubuntu 20.04/22.04

set -e  # Exit on any error

echo "🚀 Starting ARIA Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as ubuntu user."
   exit 1
fi

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Python 3.11
print_status "Installing Python 3.11..."
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install Node.js 18
print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
print_status "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Install Redis
print_status "Installing Redis..."
sudo apt install -y redis-server

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install additional dependencies
print_status "Installing additional dependencies..."
sudo apt install -y build-essential libpq-dev libffi-dev libssl-dev libjpeg-dev libpng-dev libwebp-dev supervisor

# Configure PostgreSQL
print_status "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE USER aria WITH PASSWORD 'aria_secure_password_2025';" || true
sudo -u postgres psql -c "CREATE DATABASE aria_db OWNER aria;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aria_db TO aria;" || true

# Configure Redis
print_status "Configuring Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Clone/Update ARIA repository
print_status "Setting up ARIA repository..."
cd /home/ubuntu

if [ -d "Aria---Document-Management-Employee" ]; then
    print_status "Updating existing repository..."
    cd Aria---Document-Management-Employee
    git fetch origin
    git checkout production-deployment-v1
    git pull origin production-deployment-v1
else
    print_status "Cloning repository..."
    git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
    cd Aria---Document-Management-Employee
    git checkout production-deployment-v1
fi

# Set up Python virtual environment
print_status "Setting up Python virtual environment..."
cd /home/ubuntu/Aria---Document-Management-Employee/backend
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements/production.txt || pip install -r requirements.txt || pip install -r requirements-minimal.txt

# Create production environment file
print_status "Creating production environment file..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://aria:aria_secure_password_2025@localhost:5432/aria_db
POSTGRES_USER=aria
POSTGRES_PASSWORD=aria_secure_password_2025
POSTGRES_DB=aria_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Application Configuration
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
DEBUG=false

# CORS Configuration
ALLOWED_ORIGINS=["http://localhost:3000", "https://your-domain.com"]

# File Upload Configuration
UPLOAD_DIR=/home/ubuntu/Aria---Document-Management-Employee/uploads
MAX_FILE_SIZE=50000000

# Email Configuration (configure with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com

# SAP Configuration (configure with your SAP credentials)
SAP_HOST=your-sap-host
SAP_USERNAME=your-sap-username
SAP_PASSWORD=your-sap-password
SAP_CLIENT=your-sap-client

# AI/ML Configuration
OPENAI_API_KEY=your-openai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
EOF

# Create uploads directory
print_status "Creating uploads directory..."
mkdir -p /home/ubuntu/Aria---Document-Management-Employee/uploads
chmod 755 /home/ubuntu/Aria---Document-Management-Employee/uploads

# Run database migrations
print_status "Running database migrations..."
source venv/bin/activate
cd /home/ubuntu/Aria---Document-Management-Employee/backend
python -m alembic upgrade head || print_warning "Migration failed - database might need manual setup"

# Set up frontend
print_status "Setting up frontend..."
cd /home/ubuntu/Aria---Document-Management-Employee/frontend

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build frontend for production
print_status "Building frontend for production..."
npm run build

# Create systemd service for backend
print_status "Creating systemd service for backend..."
sudo tee /etc/systemd/system/aria-backend.service > /dev/null << EOF
[Unit]
Description=ARIA Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Aria---Document-Management-Employee/backend
Environment=PATH=/home/ubuntu/Aria---Document-Management-Employee/backend/venv/bin
ExecStart=/home/ubuntu/Aria---Document-Management-Employee/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for frontend
print_status "Creating systemd service for frontend..."
sudo tee /etc/systemd/system/aria-frontend.service > /dev/null << EOF
[Unit]
Description=ARIA Frontend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Aria---Document-Management-Employee/frontend
Environment=PATH=/usr/bin:/bin
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/aria > /dev/null << EOF
server {
    listen 80;
    server_name _;

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
    }

    # Static files
    location /static/ {
        alias /home/ubuntu/Aria---Document-Management-Employee/backend/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploads
    location /uploads/ {
        alias /home/ubuntu/Aria---Document-Management-Employee/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Enable and start services
print_status "Enabling and starting services..."
sudo systemctl daemon-reload
sudo systemctl enable aria-backend
sudo systemctl enable aria-frontend
sudo systemctl enable nginx

sudo systemctl restart postgresql
sudo systemctl restart redis-server
sudo systemctl restart aria-backend
sudo systemctl restart aria-frontend
sudo systemctl restart nginx

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create log directories
print_status "Creating log directories..."
sudo mkdir -p /var/log/aria
sudo chown ubuntu:ubuntu /var/log/aria

# Set up log rotation
sudo tee /etc/logrotate.d/aria > /dev/null << EOF
/var/log/aria/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
EOF

print_success "🎉 ARIA Production Deployment Complete!"
print_status "Services Status:"
sudo systemctl status aria-backend --no-pager -l
sudo systemctl status aria-frontend --no-pager -l
sudo systemctl status nginx --no-pager -l

print_status "🌐 Your ARIA application should now be accessible at:"
print_success "http://$(curl -s ifconfig.me)"
print_success "http://$(hostname -I | awk '{print $1}')"

print_status "📋 Next Steps:"
echo "1. Configure your domain name in Nginx"
echo "2. Set up SSL certificate with Let's Encrypt"
echo "3. Configure email settings in .env file"
echo "4. Configure SAP integration settings"
echo "5. Add your OpenAI API key for AI features"

print_status "🔧 Useful Commands:"
echo "- Check backend logs: sudo journalctl -u aria-backend -f"
echo "- Check frontend logs: sudo journalctl -u aria-frontend -f"
echo "- Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Restart services: sudo systemctl restart aria-backend aria-frontend nginx"

print_warning "⚠️  Remember to:"
echo "1. Change default passwords in .env file"
echo "2. Configure proper CORS origins"
echo "3. Set up SSL certificate for production"
echo "4. Configure backup strategy for database"