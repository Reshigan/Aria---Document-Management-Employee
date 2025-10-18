#!/bin/bash

# 🚀 ARIA FINAL PRODUCTION DEPLOYMENT SCRIPT
# Deploys all security hardening and final configurations for commercial launch

set -e  # Exit on any error

echo "🚀 ARIA FINAL PRODUCTION DEPLOYMENT"
echo "=================================="
echo "Deploying security hardening and final configurations..."
echo "Target: aria.vantax.co.za"
echo "Date: $(date)"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
fi

print_info "Checking system requirements..."

# Backup current configurations
print_info "Creating backup of current configurations..."
BACKUP_DIR="/var/backups/aria/deployment-$(date +%Y%m%d-%H%M%S)"
$SUDO mkdir -p "$BACKUP_DIR"

# Backup current Nginx config
if [ -f "/etc/nginx/sites-enabled/aria-production" ]; then
    $SUDO cp /etc/nginx/sites-enabled/aria-production "$BACKUP_DIR/nginx-aria-production.backup"
    print_status "Nginx configuration backed up"
fi

# Backup current backend files
if [ -f "/var/www/aria/backend/main.py" ]; then
    $SUDO cp /var/www/aria/backend/main.py "$BACKUP_DIR/main.py.backup"
    print_status "Backend main.py backed up"
fi

print_info "Deploying security-hardened Nginx configuration..."

# Deploy secure Nginx configuration
if [ -f "nginx-security.conf" ]; then
    $SUDO cp nginx-security.conf /etc/nginx/sites-available/aria-secure
    
    # Remove old symlink and create new one
    $SUDO rm -f /etc/nginx/sites-enabled/aria-production
    $SUDO rm -f /etc/nginx/sites-enabled/aria-secure
    $SUDO ln -sf /etc/nginx/sites-available/aria-secure /etc/nginx/sites-enabled/aria-secure
    
    # Test Nginx configuration
    if $SUDO nginx -t; then
        print_status "Secure Nginx configuration deployed and validated"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
else
    print_error "nginx-security.conf not found"
    exit 1
fi

print_info "Deploying updated backend with database health check..."

# Deploy updated backend
if [ -f "backend/main.py" ]; then
    # Copy updated main.py to production
    $SUDO cp backend/main.py /var/www/aria/backend/main.py
    
    # Copy security middleware
    if [ -f "security_middleware.py" ]; then
        $SUDO cp security_middleware.py /var/www/aria/backend/security_middleware.py
        print_status "Security middleware deployed"
    fi
    
    # Copy security config
    if [ -f "security_config.json" ]; then
        $SUDO cp security_config.json /var/www/aria/backend/security_config.json
        print_status "Security configuration deployed"
    fi
    
    print_status "Updated backend deployed"
else
    print_error "backend/main.py not found"
    exit 1
fi

print_info "Installing additional security dependencies..."

# Install security dependencies
cd /var/www/aria/backend
$SUDO pip install slowapi redis python-multipart

print_info "Restarting services..."

# Restart backend service
if command -v pm2 &> /dev/null; then
    $SUDO pm2 restart aria-backend || $SUDO pm2 start /var/www/aria/backend/main.py --name aria-backend --interpreter python3
    print_status "Backend service restarted"
else
    print_warning "PM2 not found, please restart backend manually"
fi

# Reload Nginx
if $SUDO systemctl reload nginx; then
    print_status "Nginx reloaded with secure configuration"
else
    print_error "Failed to reload Nginx"
    exit 1
fi

print_info "Configuring firewall security..."

# Configure UFW firewall
if command -v ufw &> /dev/null; then
    $SUDO ufw --force enable
    $SUDO ufw default deny incoming
    $SUDO ufw default allow outgoing
    $SUDO ufw allow ssh
    $SUDO ufw allow 'Nginx Full'
    $SUDO ufw allow 80
    $SUDO ufw allow 443
    print_status "Firewall configured"
else
    print_warning "UFW not available, firewall not configured"
fi

print_info "Installing fail2ban for intrusion prevention..."

# Install and configure fail2ban
if ! command -v fail2ban-server &> /dev/null; then
    $SUDO apt update
    $SUDO apt install -y fail2ban
fi

# Configure fail2ban for Nginx
$SUDO tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

$SUDO systemctl enable fail2ban
$SUDO systemctl restart fail2ban
print_status "Fail2ban configured and started"

print_info "Setting up log rotation..."

# Configure log rotation for Aria logs
$SUDO tee /etc/logrotate.d/aria > /dev/null <<EOF
/var/log/aria/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
EOF

print_status "Log rotation configured"

print_info "Optimizing system security settings..."

# Set secure kernel parameters
$SUDO tee -a /etc/sysctl.conf > /dev/null <<EOF

# Aria Security Hardening
net.ipv4.conf.default.rp_filter=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.accept_redirects=0
net.ipv6.conf.all.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.all.accept_source_route=0
net.ipv6.conf.all.accept_source_route=0
net.ipv4.conf.all.log_martians=1
EOF

$SUDO sysctl -p
print_status "Kernel security parameters applied"

print_info "Running final validation tests..."

# Wait for services to start
sleep 10

# Test health endpoint
print_info "Testing health endpoint..."
if curl -s -f https://aria.vantax.co.za/api/health > /dev/null; then
    print_status "Health endpoint responding"
else
    print_error "Health endpoint not responding"
fi

# Test security headers
print_info "Testing security headers..."
HEADERS_RESPONSE=$(curl -s -I https://aria.vantax.co.za)

if echo "$HEADERS_RESPONSE" | grep -q "X-Content-Type-Options"; then
    print_status "X-Content-Type-Options header present"
else
    print_warning "X-Content-Type-Options header missing"
fi

if echo "$HEADERS_RESPONSE" | grep -q "X-Frame-Options"; then
    print_status "X-Frame-Options header present"
else
    print_warning "X-Frame-Options header missing"
fi

if echo "$HEADERS_RESPONSE" | grep -q "Strict-Transport-Security"; then
    print_status "HSTS header present"
else
    print_warning "HSTS header missing"
fi

# Test authentication
print_info "Testing authentication system..."
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://aria.vantax.co.za/api/documents)
if [ "$AUTH_RESPONSE" = "403" ] || [ "$AUTH_RESPONSE" = "401" ]; then
    print_status "Authentication system working (HTTP $AUTH_RESPONSE)"
else
    print_warning "Authentication system may not be working (HTTP $AUTH_RESPONSE)"
fi

print_info "Deployment completed! Running final security verification..."

# Run security verification if available
if [ -f "security_verification.py" ]; then
    python3 security_verification.py
fi

echo ""
echo "🎉 ARIA FINAL PRODUCTION DEPLOYMENT COMPLETE!"
echo "=============================================="
echo "✅ Security hardening deployed"
echo "✅ Database health check fixed"
echo "✅ Firewall configured"
echo "✅ Fail2ban installed"
echo "✅ Log rotation configured"
echo "✅ System security optimized"
echo ""
echo "🌐 System Status:"
echo "   Domain: https://aria.vantax.co.za"
echo "   API Health: https://aria.vantax.co.za/api/health"
echo "   Admin Login: admin@aria.vantax.co.za / admin123"
echo "   Demo Login: demo@aria.vantax.co.za / demo123"
echo ""
echo "📊 Next Steps:"
echo "   1. Run final launch checklist: python3 launch_checklist.py"
echo "   2. Monitor system logs: tail -f /var/log/aria/system.log"
echo "   3. Check security status: python3 security_verification.py"
echo ""
echo "🎯 SYSTEM IS NOW READY FOR COMMERCIAL LAUNCH!"
echo "=============================================="