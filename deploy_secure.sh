#!/bin/bash
# Secure Deployment Script for Aria Document Management System

set -e

echo "🔒 Starting Secure Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install security tools
echo "🛡️ Installing security tools..."
sudo apt install -y fail2ban ufw nginx-extras

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Configure fail2ban
echo "🚫 Configuring fail2ban..."
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/aria_error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/aria_error.log
maxretry = 10
EOF

# Deploy secure Nginx configuration
echo "🌐 Deploying secure Nginx configuration..."
sudo cp nginx-security.conf /etc/nginx/sites-available/aria-secure
sudo ln -sf /etc/nginx/sites-available/aria-secure /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Set secure file permissions
echo "🔐 Setting secure file permissions..."
sudo chown -R www-data:www-data /var/www/aria/
sudo chmod -R 755 /var/www/aria/
sudo chmod -R 644 /var/www/aria/frontend/*

# Remove sensitive files from web root
echo "🗑️ Removing sensitive files..."
sudo find /var/www/aria/ -name "*.env*" -delete
sudo find /var/www/aria/ -name "*.config*" -delete
sudo find /var/www/aria/ -name "*.sql*" -delete
sudo find /var/www/aria/ -name "*.log*" -delete

echo "✅ Secure deployment completed!"
echo "🔒 Security features enabled:"
echo "  - Firewall (UFW) configured"
echo "  - Fail2ban protection active"
echo "  - Secure Nginx configuration"
echo "  - Rate limiting enabled"
echo "  - Security headers configured"
echo "  - Sensitive files removed"
