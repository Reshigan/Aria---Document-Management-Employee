#!/bin/bash

# ARIA SSL Setup Script for aria.vantax.co.za
# This script will setup HTTPS using Let's Encrypt

set -e

SERVER="ubuntu@3.8.139.178"
KEY="/workspace/project/Vantax-2.pem"
DOMAIN="aria.vantax.co.za"

echo "═══════════════════════════════════════════════════════════"
echo "  🔐 Setting up SSL for ARIA Platform"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Domain: $DOMAIN"
echo "Server: $SERVER"
echo ""

# Create SSL setup script for remote server
cat > /tmp/setup_ssl_remote.sh << 'REMOTE_SCRIPT'
#!/bin/bash

set -e

DOMAIN="aria.vantax.co.za"
EMAIL="admin@vantax.co.za"

echo "📦 Installing Certbot..."
sudo apt-get update -qq
sudo apt-get install -y certbot python3-certbot-nginx -qq

echo "🔒 Obtaining SSL certificate for $DOMAIN..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

echo "⚙️  Updating Nginx configuration..."
sudo tee /etc/nginx/sites-available/aria > /dev/null << 'NGINX'
server {
    server_name aria.vantax.co.za;

    # Frontend
    location / {
        root /home/ubuntu/aria/frontend-dist;
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "ALLOWALL" always;
        add_header Access-Control-Allow-Origin "*" always;
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
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/aria.vantax.co.za/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/aria.vantax.co.za/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = aria.vantax.co.za) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name aria.vantax.co.za;
    return 404; # managed by Certbot
}
NGINX

echo "🔍 Testing Nginx configuration..."
sudo nginx -t

echo "♻️  Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ SSL setup complete!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🎉 HTTPS is now enabled!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 Your application is now accessible at:"
echo "   https://aria.vantax.co.za"
echo ""
echo "🔒 SSL Certificate Details:"
sudo certbot certificates
echo ""
echo "📅 Auto-renewal is configured and will renew before expiry"
echo ""
REMOTE_SCRIPT

# Transfer and execute SSL setup script
echo "📤 Transferring SSL setup script to server..."
scp -i "$KEY" -o StrictHostKeyChecking=no /tmp/setup_ssl_remote.sh "$SERVER:/tmp/"

echo "🔧 Running SSL setup on production server..."
echo ""
ssh -i "$KEY" -o StrictHostKeyChecking=no "$SERVER" "chmod +x /tmp/setup_ssl_remote.sh && sudo bash /tmp/setup_ssl_remote.sh"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ SSL Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 HTTPS URL: https://aria.vantax.co.za"
echo ""
echo "Test with:"
echo "  curl https://aria.vantax.co.za/health"
echo ""
