#!/bin/bash
################################################################################
# ARIA SSL Setup for aria.vantax.co.za
# 
# This script configures Nginx with SSL for the production domain
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="aria.vantax.co.za"
EMAIL="admin@vantax.co.za"  # Change this to your email

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}ARIA SSL Configuration for ${DOMAIN}${NC}"
echo -e "${BLUE}============================================================${NC}\n"

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

# 1. Install Certbot
print_info "Step 1/6: Installing Certbot..."
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
print_status "Certbot installed"

# 2. Backup existing Nginx configuration
print_info "Step 2/6: Backing up existing Nginx configuration..."
if [ -f /etc/nginx/sites-available/aria ]; then
    cp /etc/nginx/sites-available/aria /etc/nginx/sites-available/aria.backup.$(date +%Y%m%d_%H%M%S)
    print_status "Backup created"
fi

# 3. Create Nginx configuration for the domain
print_info "Step 3/6: Creating Nginx configuration..."
cat > /etc/nginx/sites-available/aria << EOF
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Allow Let's Encrypt challenges
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS - Main configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL certificates (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /var/log/nginx/aria_access.log;
    error_log /var/log/nginx/aria_error.log;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://${DOMAIN}' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }

    # API Documentation
    location /api/v1/docs {
        proxy_pass http://localhost:8000/api/v1/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Static files with caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/api/v1/health;
        access_log off;
    }
}
EOF

print_status "Nginx configuration created"

# 4. Enable the site
print_info "Step 4/6: Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/aria
rm -f /etc/nginx/sites-enabled/default
print_status "Site enabled"

# 5. Test Nginx configuration
print_info "Step 5/6: Testing Nginx configuration..."
if nginx -t > /dev/null 2>&1; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    nginx -t
    exit 1
fi

# 6. Obtain SSL certificate
print_info "Step 6/6: Obtaining SSL certificate from Let's Encrypt..."
echo ""
echo -e "${YELLOW}NOTE: Make sure ${DOMAIN} DNS points to this server's IP address${NC}"
echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel...${NC}"
read

# Reload Nginx first to serve the challenge
systemctl reload nginx

# Request certificate
certbot --nginx \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    --redirect \
    --staple-ocsp

if [ $? -eq 0 ]; then
    print_status "SSL certificate obtained and configured"
else
    print_error "Failed to obtain SSL certificate"
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo "  1. DNS not pointing to this server"
    echo "  2. Firewall blocking port 80/443"
    echo "  3. Another service using port 80"
    echo ""
    echo "Check DNS: dig ${DOMAIN} +short"
    echo "Check ports: sudo netstat -tulpn | grep -E ':(80|443)'"
    exit 1
fi

# Setup auto-renewal
print_info "Setting up automatic renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer
print_status "Auto-renewal configured"

# Update backend environment to use HTTPS
print_info "Updating backend configuration for HTTPS..."
if [ -f /var/www/aria/backend/.env ]; then
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}|g" /var/www/aria/backend/.env
    print_status "Backend environment updated"
fi

# Update frontend environment to use HTTPS
print_info "Updating frontend configuration for HTTPS..."
if [ -f /var/www/aria/frontend/.env.local ]; then
    sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://${DOMAIN}/api/v1|g" /var/www/aria/frontend/.env.local
    print_status "Frontend environment updated"
fi

# Restart services
print_info "Restarting services..."
systemctl restart aria-backend aria-frontend nginx
print_status "Services restarted"

# Display results
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}SSL Configuration Complete!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "Your ARIA system is now available at:"
echo -e "  ${GREEN}https://${DOMAIN}${NC}"
echo -e "  ${GREEN}https://www.${DOMAIN}${NC}"
echo ""
echo -e "API Documentation:"
echo -e "  ${GREEN}https://${DOMAIN}/api/v1/docs${NC}"
echo ""
echo -e "SSL Certificate Info:"
certbot certificates | grep -A 3 ${DOMAIN}
echo ""
echo -e "Certificate will auto-renew. Check with:"
echo -e "  ${YELLOW}sudo certbot renew --dry-run${NC}"
echo ""
echo -e "View Nginx logs:"
echo -e "  ${YELLOW}sudo tail -f /var/log/nginx/aria_access.log${NC}"
echo -e "  ${YELLOW}sudo tail -f /var/log/nginx/aria_error.log${NC}"
echo ""
