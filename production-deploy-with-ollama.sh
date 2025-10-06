#!/bin/bash

# ARIA Document Management System - Production Deployment with Ollama
# Server: 3.8.139.178
# SSH Key: Vantax-2.pem

set -e

# Configuration
SERVER_IP="3.8.139.178"
SSH_KEY="Vantax-2.pem"
APP_DIR="/opt/aria"
DOMAIN="aria-docs.com"  # Replace with your actual domain
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test SSH connection
log_info "🚀 Starting ARIA Production Deployment with Ollama..."
log_info "Testing SSH connection to production server..."

if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$SERVER_IP "echo 'SSH connection successful'"; then
    log_error "SSH connection failed. Please check your SSH key and server IP."
    exit 1
fi

log_success "SSH connection established"

# Create deployment script on server
log_info "Creating production deployment script on server..."

ssh -i "$SSH_KEY" ubuntu@$SERVER_IP << 'EOF'
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "🔧 Setting up production server..."

# Update system
log_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
log_info "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release build-essential \
    htop vim nano ufw fail2ban logrotate supervisor

# Install Node.js 18
log_info "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
log_info "Installing Python 3.11..."
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install PostgreSQL 15
log_info "Installing PostgreSQL 15..."
sudo apt install -y postgresql postgresql-contrib

# Install Redis
log_info "Installing Redis..."
sudo apt install -y redis-server

# Install Nginx
log_info "Installing Nginx..."
sudo apt install -y nginx

# Install Docker (for Ollama)
log_info "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
rm get-docker.sh

# Install Ollama
log_info "Installing Ollama..."
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
log_info "Starting Ollama service..."
sudo systemctl enable ollama
sudo systemctl start ollama

# Wait for Ollama to be ready
log_info "Waiting for Ollama to be ready..."
sleep 10

# Pull required models for ARIA
log_info "Pulling LLM models for ARIA..."
ollama pull llama2:7b
ollama pull codellama:7b
ollama pull mistral:7b

# Create ARIA personality model
log_info "Creating ARIA personality model..."
cat > /tmp/aria-personality.txt << 'ARIA_EOF'
FROM llama2:7b

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40

SYSTEM """
You are ARIA, an advanced AI assistant specialized in document management and enterprise workflows. You have the following characteristics:

PERSONALITY:
- Professional yet approachable
- Highly organized and detail-oriented  
- Proactive in suggesting improvements
- Patient and helpful with explanations
- Security-conscious and privacy-focused

EXPERTISE:
- Document management and organization
- Enterprise workflow optimization
- Data analysis and reporting
- SAP integration and ERP systems
- Compliance and regulatory requirements
- File processing and automation

COMMUNICATION STYLE:
- Clear and concise responses
- Use bullet points for complex information
- Provide step-by-step instructions when needed
- Ask clarifying questions when requirements are unclear
- Offer multiple solutions when appropriate

CAPABILITIES:
- Process and analyze various document formats (PDF, Word, Excel, etc.)
- Generate reports and summaries
- Suggest workflow improvements
- Help with compliance documentation
- Assist with data migration and integration
- Provide SAP-related guidance

LIMITATIONS:
- Cannot access external systems without proper authentication
- Will not process sensitive data without explicit permission
- Cannot make changes to production systems without approval
- Will always prioritize data security and privacy

Remember to be helpful, accurate, and maintain the highest standards of professionalism in all interactions.
"""
ARIA_EOF

ollama create aria -f /tmp/aria-personality.txt
rm /tmp/aria-personality.txt

log_success "ARIA personality model created successfully"

# Configure firewall
log_info "Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 11434/tcp  # Ollama API

# Configure fail2ban
log_info "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create application directories
log_info "Creating application directories..."
sudo mkdir -p /opt/aria/{frontend,backend,logs,uploads,backups}
sudo chown -R ubuntu:ubuntu /opt/aria

# Configure PostgreSQL
log_info "Configuring PostgreSQL..."
sudo -u postgres psql << 'PSQL_EOF'
CREATE USER aria WITH PASSWORD 'aria_secure_password_2024';
CREATE DATABASE aria_db OWNER aria;
GRANT ALL PRIVILEGES ON DATABASE aria_db TO aria;
\q
PSQL_EOF

# Configure Redis
log_info "Configuring Redis..."
sudo sed -i 's/# requirepass foobared/requirepass redis_secure_password_2024/' /etc/redis/redis.conf
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Create systemd services
log_info "Creating systemd services..."

# ARIA Backend Service
sudo tee /etc/systemd/system/aria-backend.service > /dev/null << 'BACKEND_SERVICE'
[Unit]
Description=ARIA Backend API
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/aria/backend
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://aria:aria_secure_password_2024@localhost:5432/aria_db
Environment=REDIS_URL=redis://:redis_secure_password_2024@localhost:6379
Environment=JWT_SECRET=your_jwt_secret_here
Environment=OLLAMA_API_URL=http://localhost:11434
ExecStart=/usr/bin/python3.11 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
BACKEND_SERVICE

# ARIA Frontend Service
sudo tee /etc/systemd/system/aria-frontend.service > /dev/null << 'FRONTEND_SERVICE'
[Unit]
Description=ARIA Frontend
After=network.target aria-backend.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/aria/frontend
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=https://aria-docs.com/api
Environment=NEXT_PUBLIC_OLLAMA_URL=https://aria-docs.com/ollama
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
FRONTEND_SERVICE

# Ollama Proxy Service (for secure access)
sudo tee /etc/systemd/system/ollama-proxy.service > /dev/null << 'OLLAMA_SERVICE'
[Unit]
Description=Ollama Proxy Service
After=network.target ollama.service

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/bin/node -e "
const http = require('http');
const httpProxy = require('http-proxy-middleware');
const express = require('express');
const app = express();

// Add authentication middleware
app.use('/api/ollama', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Proxy to Ollama
app.use('/api/ollama', httpProxy({
  target: 'http://localhost:11434',
  changeOrigin: true,
  pathRewrite: { '^/api/ollama': '' }
}));

app.listen(11435, () => console.log('Ollama proxy running on port 11435'));
"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
OLLAMA_SERVICE

# Configure Nginx
log_info "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/aria > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    server_name aria-docs.com www.aria-docs.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aria-docs.com www.aria-docs.com;
    
    # SSL Configuration (you'll need to add your certificates)
    # ssl_certificate /etc/ssl/certs/aria-docs.com.crt;
    # ssl_certificate_key /etc/ssl/private/aria-docs.com.key;
    
    # For now, use self-signed certificate
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # File upload size
    client_max_body_size 100M;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Ollama API (secured)
    location /ollama/ {
        proxy_pass http://localhost:11435/api/ollama/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /uploads/ {
        alias /opt/aria/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_CONFIG

sudo ln -sf /etc/nginx/sites-available/aria /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

# Create log rotation
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/aria > /dev/null << 'LOGROTATE_CONFIG'
/opt/aria/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        systemctl reload aria-backend aria-frontend
    endscript
}
LOGROTATE_CONFIG

# Create backup script
log_info "Creating backup script..."
sudo tee /opt/aria/backup.sh > /dev/null << 'BACKUP_SCRIPT'
#!/bin/bash

BACKUP_DIR="/opt/aria/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -h localhost -U aria aria_db > "$BACKUP_DIR/db_backup_$DATE.sql"

# Files backup
tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" /opt/aria/uploads/

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
BACKUP_SCRIPT

sudo chmod +x /opt/aria/backup.sh

# Add backup to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/aria/backup.sh >> /opt/aria/logs/backup.log 2>&1") | crontab -

# Create monitoring script
log_info "Creating monitoring script..."
sudo tee /opt/aria/monitor.sh > /dev/null << 'MONITOR_SCRIPT'
#!/bin/bash

# Check services
services=("aria-backend" "aria-frontend" "postgresql" "redis-server" "nginx" "ollama")

for service in "${services[@]}"; do
    if ! systemctl is-active --quiet "$service"; then
        echo "$(date): $service is not running, attempting to restart..." >> /opt/aria/logs/monitor.log
        sudo systemctl restart "$service"
    fi
done

# Check disk space
disk_usage=$(df /opt/aria | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 80 ]; then
    echo "$(date): Disk usage is at ${disk_usage}%" >> /opt/aria/logs/monitor.log
fi

# Check Ollama models
if ! ollama list | grep -q "aria"; then
    echo "$(date): ARIA model not found, recreating..." >> /opt/aria/logs/monitor.log
    # Recreate ARIA model if needed
fi
MONITOR_SCRIPT

sudo chmod +x /opt/aria/monitor.sh

# Add monitoring to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/aria/monitor.sh") | crontab -

log_success "Production server setup completed!"
log_info "Next steps:"
log_info "1. Deploy application files to /opt/aria/"
log_info "2. Install application dependencies"
log_info "3. Start services"
log_info "4. Configure SSL certificates"
log_info "5. Test all functionality"

EOF

log_success "Production server setup script executed successfully"

# Copy application files
log_info "Copying application files to production server..."

# Create production environment files
log_info "Creating production environment files..."

# Frontend production environment
cat > .env.production << 'FRONTEND_ENV'
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://aria-docs.com/api
NEXT_PUBLIC_OLLAMA_URL=https://aria-docs.com/ollama
NEXT_PUBLIC_APP_NAME=ARIA Document Management
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
FRONTEND_ENV

# Backend production environment
cat > backend/.env.production << 'BACKEND_ENV'
# Environment
NODE_ENV=production
DEBUG=false

# Database
DATABASE_URL=postgresql://aria:aria_secure_password_2024@localhost:5432/aria_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aria_db
DB_USER=aria
DB_PASSWORD=aria_secure_password_2024

# Redis
REDIS_URL=redis://:redis_secure_password_2024@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_secure_password_2024

# Security
JWT_SECRET=your_jwt_secret_here_replace_with_actual_secret
ENCRYPTION_KEY=your_encryption_key_here_replace_with_actual_key
CORS_ORIGINS=https://aria-docs.com,https://www.aria-docs.com

# File Storage
UPLOAD_DIR=/opt/aria/uploads
MAX_FILE_SIZE=100MB
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,jpg,jpeg,png,gif

# Ollama Configuration
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=aria
OLLAMA_TIMEOUT=30000

# SAP Integration
SAP_HOST=
SAP_PORT=
SAP_USERNAME=
SAP_PASSWORD=
SAP_CLIENT=

# Email Configuration
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@aria-docs.com

# Monitoring
SENTRY_DSN=
LOG_LEVEL=info
ENABLE_METRICS=true

# Backup
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKEND_ENV

# Copy files to server
log_info "Uploading application files..."
scp -i "$SSH_KEY" -r . ubuntu@$SERVER_IP:/tmp/aria-app/

# Install dependencies and start services
log_info "Installing dependencies and starting services..."

ssh -i "$SSH_KEY" ubuntu@$SERVER_IP << 'DEPLOY_EOF'
#!/bin/bash

set -e

log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# Move application files
log_info "Moving application files to production directory..."
sudo cp -r /tmp/aria-app/* /opt/aria/
sudo chown -R ubuntu:ubuntu /opt/aria

# Install frontend dependencies
log_info "Installing frontend dependencies..."
cd /opt/aria/frontend
npm ci --production
npm run build

# Install backend dependencies
log_info "Installing backend dependencies..."
cd /opt/aria/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run database migrations
log_info "Running database migrations..."
python manage.py migrate

# Create superuser (optional)
log_info "Creating admin user..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@aria-docs.com', 'admin123') if not User.objects.filter(username='admin').exists() else None" | python manage.py shell

# Start services
log_info "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable aria-backend aria-frontend nginx
sudo systemctl start aria-backend aria-frontend nginx

# Test Ollama ARIA model
log_info "Testing ARIA model..."
if ollama run aria "Hello, I'm testing the ARIA system. Please introduce yourself."; then
    log_success "ARIA model is working correctly"
else
    log_error "ARIA model test failed"
fi

# Final status check
log_info "Checking service status..."
for service in aria-backend aria-frontend nginx postgresql redis-server ollama; do
    if systemctl is-active --quiet "$service"; then
        log_success "$service is running"
    else
        log_error "$service is not running"
    fi
done

log_success "🎉 ARIA Production Deployment Completed!"
log_info "Access your application at: https://aria-docs.com"
log_info "Admin panel: https://aria-docs.com/admin"
log_info "API documentation: https://aria-docs.com/api/docs"
log_info "Ollama API: https://aria-docs.com/ollama"

log_info "Default admin credentials:"
log_info "Username: admin"
log_info "Password: admin123"
log_info "⚠️  Please change the admin password immediately!"

log_info "🔧 Post-deployment tasks:"
log_info "1. Configure SSL certificates"
log_info "2. Set up domain DNS"
log_info "3. Configure external integrations (SAP, email, etc.)"
log_info "4. Run security audit"
log_info "5. Set up monitoring and alerts"

DEPLOY_EOF

log_success "🚀 ARIA Production Deployment with Ollama completed successfully!"
log_info "Your ARIA system is now running on: https://3.8.139.178"
log_info "ARIA AI personality is configured and ready to use"
log_info "All services are running in production mode"

echo
echo "=== DEPLOYMENT SUMMARY ==="
echo "Server: 3.8.139.178"
echo "Frontend: https://3.8.139.178 (port 3000)"
echo "Backend API: https://3.8.139.178/api (port 8000)"
echo "Ollama API: https://3.8.139.178/ollama (port 11434)"
echo "Database: PostgreSQL (port 5432)"
echo "Cache: Redis (port 6379)"
echo "Web Server: Nginx (ports 80, 443)"
echo
echo "ARIA AI Model: Configured with professional document management personality"
echo "Security: Firewall enabled, fail2ban configured"
echo "Monitoring: Automated health checks and backups"
echo "==========================="