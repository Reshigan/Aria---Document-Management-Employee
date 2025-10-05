#!/bin/bash

# ARIA Document Management System - SSL Setup Script
# This script sets up Let's Encrypt SSL certificate for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <your-domain.com>"
    print_error "Example: $0 aria.yourcompany.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

print_status "Setting up SSL certificate for domain: $DOMAIN"
print_status "Email for Let's Encrypt: $EMAIL"

# Install Certbot
print_status "Installing Certbot..."
sudo apt update
sudo apt install -y snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Stop nginx temporarily
print_status "Stopping Nginx temporarily..."
sudo systemctl stop nginx

# Obtain SSL certificate
print_status "Obtaining SSL certificate..."
sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# Update Nginx configuration with SSL
print_status "Updating Nginx configuration with SSL..."
sudo tee /etc/nginx/sites-available/aria > /dev/null << EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

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

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
EOF

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Start Nginx
print_status "Starting Nginx..."
sudo systemctl start nginx

# Set up automatic renewal
print_status "Setting up automatic SSL renewal..."
sudo crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx"; } | sudo crontab -

# Update frontend environment for HTTPS
print_status "Updating frontend environment for HTTPS..."
cd /home/ubuntu/Aria---Document-Management-Employee/frontend
sudo -u ubuntu tee .env.production > /dev/null << EOF
# ARIA Frontend - Production Environment Configuration

# API Configuration
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
NEXT_PUBLIC_APP_NAME=ARIA Document Management
NEXT_PUBLIC_APP_VERSION=1.0.0

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=production

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true

# Security
NEXT_PUBLIC_ENABLE_CSP=true

# Performance
NEXT_PUBLIC_ENABLE_SW=true
NEXT_PUBLIC_ENABLE_COMPRESSION=true

# Branding
NEXT_PUBLIC_COMPANY_NAME=Your Company
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourcompany.com

# External Services (configure as needed)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_HOTJAR_ID=
EOF

# Rebuild frontend with new environment
print_status "Rebuilding frontend with HTTPS configuration..."
cd /home/ubuntu/Aria---Document-Management-Employee/frontend
sudo -u ubuntu npm run build

# Restart services
print_status "Restarting services..."
sudo systemctl restart aria-frontend
sudo systemctl restart nginx

print_success "🔒 SSL certificate successfully installed!"
print_success "🌐 Your ARIA application is now accessible at: https://$DOMAIN"

print_status "📋 SSL Certificate Information:"
sudo certbot certificates

print_status "🔧 SSL Renewal Test:"
sudo certbot renew --dry-run

print_warning "⚠️  Remember to:"
echo "1. Update your DNS records to point to this server"
echo "2. Update CORS settings in backend .env file"
echo "3. Test the application thoroughly"
echo "4. Monitor SSL certificate expiration"