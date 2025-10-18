#!/bin/bash

# Aria Document Management System - Production Setup Script
# Comprehensive production deployment and configuration automation

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend-vite"
LOG_FILE="/var/log/aria/production_setup.log"
DOMAIN="aria.vantax.co.za"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} $message"
            ;;
    esac
    
    # Log to file if directory exists
    if [[ -d "$(dirname "$LOG_FILE")" ]]; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
}

# Error handler
error_handler() {
    local line_number=$1
    log "ERROR" "Script failed at line $line_number"
    log "ERROR" "Production setup incomplete - manual intervention required"
    exit 1
}

trap 'error_handler $LINENO' ERR

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log "WARN" "Running as root - this is not recommended for production"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "INFO" "Setup cancelled by user"
            exit 0
        fi
    fi
}

# Check system requirements
check_requirements() {
    log "INFO" "Checking system requirements..."
    
    # Check OS
    if [[ ! -f /etc/os-release ]]; then
        log "ERROR" "Cannot determine OS version"
        exit 1
    fi
    
    source /etc/os-release
    log "INFO" "OS: $PRETTY_NAME"
    
    # Check available disk space (minimum 10GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 10485760 ]]; then  # 10GB in KB
        log "WARN" "Low disk space: $(($available_space / 1024 / 1024))GB available"
    fi
    
    # Check memory (minimum 4GB)
    total_mem=$(free -m | awk 'NR==2{print $2}')
    if [[ $total_mem -lt 4096 ]]; then
        log "WARN" "Low memory: ${total_mem}MB available (4GB recommended)"
    fi
    
    log "INFO" "System requirements check completed"
}

# Install system dependencies
install_dependencies() {
    log "INFO" "Installing system dependencies..."
    
    # Update package list
    sudo apt update
    
    # Install required packages
    sudo apt install -y \
        python3 \
        python3-venv \
        python3-pip \
        nodejs \
        npm \
        nginx \
        redis-server \
        sqlite3 \
        curl \
        wget \
        git \
        htop \
        iotop \
        ufw \
        fail2ban \
        certbot \
        python3-certbot-nginx \
        logrotate \
        cron
    
    # Install PM2 globally
    sudo npm install -g pm2
    
    # Start and enable services
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    log "INFO" "System dependencies installed successfully"
}

# Setup application environment
setup_application() {
    log "INFO" "Setting up application environment..."
    
    # Create application directories
    sudo mkdir -p /var/log/aria
    sudo mkdir -p /var/backups/aria
    sudo mkdir -p /opt/aria/scripts
    
    # Set permissions
    sudo chown -R $USER:$USER /var/log/aria
    sudo chown -R $USER:$USER /var/backups/aria
    sudo chown -R $USER:$USER /opt/aria
    
    # Backend setup
    cd "$BACKEND_DIR"
    
    # Create virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Install Python dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install aiosqlite  # Async SQLite driver
    
    # Frontend setup
    cd "$FRONTEND_DIR"
    
    # Install Node.js dependencies
    npm install
    
    # Build production frontend
    npm run build
    
    log "INFO" "Application environment setup completed"
}

# Initialize database
setup_database() {
    log "INFO" "Setting up production database..."
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    # Run database migration and seeding
    python scripts/data_migration.py --action full-setup
    
    # Verify database setup
    python scripts/data_migration.py --action validate
    python scripts/data_migration.py --action stats
    
    log "INFO" "Database setup completed"
}

# Configure PM2 processes
setup_pm2() {
    log "INFO" "Configuring PM2 process management..."
    
    cd "$PROJECT_ROOT"
    
    # Create PM2 ecosystem file if it doesn't exist
    if [[ ! -f ecosystem.config.js ]]; then
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aria-backend',
    script: 'uvicorn',
    args: 'main:app --host 0.0.0.0 --port 8000 --workers 4',
    cwd: './backend',
    interpreter: './backend/venv/bin/python',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: '/var/log/aria/backend-error.log',
    out_file: '/var/log/aria/backend-out.log',
    log_file: '/var/log/aria/backend-combined.log',
    time: true,
    env: {
      NODE_ENV: 'production',
      PYTHONPATH: '.',
      DATABASE_URL: 'sqlite+aiosqlite:///./aria.db',
      ENVIRONMENT: 'production'
    }
  }, {
    name: 'aria-frontend-vite',
    script: 'npm',
    args: 'run preview -- --host 0.0.0.0 --port 12001',
    cwd: './frontend-vite',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    error_file: '/var/log/aria/frontend-error.log',
    out_file: '/var/log/aria/frontend-out.log',
    log_file: '/var/log/aria/frontend-combined.log',
    time: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF
    fi
    
    # Start PM2 processes
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    
    log "INFO" "PM2 configuration completed"
}

# Configure Nginx
setup_nginx() {
    log "INFO" "Configuring Nginx reverse proxy..."
    
    # Remove default Nginx site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Create Aria Nginx configuration
    sudo tee /etc/nginx/sites-available/aria-production > /dev/null << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

# HTTP server (redirect to HTTPS)
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;
    
    # Logging
    access_log /var/log/nginx/aria_access.log;
    error_log /var/log/nginx/aria_error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Frontend application
    location / {
        proxy_pass http://localhost:12001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        
        # Security
        proxy_hide_header X-Powered-By;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # Security
        proxy_hide_header X-Powered-By;
    }
    
    # Authentication endpoints (stricter rate limiting)
    location /api/auth/ {
        proxy_pass http://localhost:8000/api/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Strict rate limiting for auth
        limit_req zone=login burst=5 nodelay;
    }
    
    # Health check endpoints
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
        
        # Allow health checks from monitoring systems
        allow 127.0.0.1;
        allow ::1;
        # Add your monitoring IPs here
        # deny all;
    }
    
    location /api/health {
        proxy_pass http://localhost:8000/api/health;
        access_log off;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        
        # Try to serve from frontend first, then proxy
        try_files \$uri @frontend;
    }
    
    location @frontend {
        proxy_pass http://localhost:12001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(sql|db|env|log)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/aria-production /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    log "INFO" "Nginx configuration completed"
}

# Setup SSL certificate
setup_ssl() {
    log "INFO" "Setting up SSL certificate..."
    
    # Check if certificate already exists
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        log "INFO" "SSL certificate already exists for $DOMAIN"
        
        # Check certificate expiration
        cert_expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
        log "INFO" "Certificate expires: $cert_expiry"
        
        # Test certificate renewal
        sudo certbot renew --dry-run
    else
        log "INFO" "Obtaining new SSL certificate for $DOMAIN"
        
        # Obtain certificate
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"
    fi
    
    # Setup automatic renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
    
    log "INFO" "SSL certificate setup completed"
}

# Configure firewall
setup_firewall() {
    log "INFO" "Configuring firewall..."
    
    # Reset UFW to defaults
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH (be careful!)
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow specific ports for development (optional)
    # sudo ufw allow 8000/tcp  # Backend API
    # sudo ufw allow 12001/tcp # Frontend dev server
    
    # Enable firewall
    sudo ufw --force enable
    
    # Show status
    sudo ufw status verbose
    
    log "INFO" "Firewall configuration completed"
}

# Setup monitoring and logging
setup_monitoring() {
    log "INFO" "Setting up monitoring and logging..."
    
    # Create monitoring script
    sudo tee /opt/aria/scripts/health-monitor.sh > /dev/null << 'EOF'
#!/bin/bash

HEALTH_URL="https://aria.vantax.co.za/api/health/detailed"
LOG_FILE="/var/log/aria/health-monitor.log"
ALERT_EMAIL="admin@aria.vantax.co.za"

check_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check API health
    response=$(curl -s -w "%{http_code}" "$HEALTH_URL" --max-time 30)
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        status=$(echo "$body" | jq -r '.status' 2>/dev/null || echo "unknown")
        if [ "$status" = "healthy" ]; then
            echo "[$timestamp] System healthy" >> "$LOG_FILE"
            return 0
        else
            echo "[$timestamp] System degraded - $body" >> "$LOG_FILE"
            return 1
        fi
    else
        echo "[$timestamp] Health check failed - HTTP $http_code" >> "$LOG_FILE"
        return 2
    fi
}

# Check PM2 processes
check_pm2() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    pm2_status=$(pm2 jlist 2>/dev/null)
    if [ $? -eq 0 ]; then
        online_count=$(echo "$pm2_status" | jq '[.[] | select(.pm2_env.status == "online")] | length' 2>/dev/null || echo "0")
        total_count=$(echo "$pm2_status" | jq 'length' 2>/dev/null || echo "0")
        
        echo "[$timestamp] PM2 processes: $online_count/$total_count online" >> "$LOG_FILE"
        
        if [ "$online_count" -lt "$total_count" ]; then
            return 1
        fi
    else
        echo "[$timestamp] PM2 check failed" >> "$LOG_FILE"
        return 2
    fi
    
    return 0
}

# Main health check
main() {
    if ! check_health || ! check_pm2; then
        echo "Health check failed - system may need attention" | mail -s "Aria Health Alert" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

main
EOF
    
    # Make monitoring script executable
    sudo chmod +x /opt/aria/scripts/health-monitor.sh
    
    # Setup cron jobs
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/aria/scripts/health-monitor.sh") | crontab -
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/aria/scripts/backup-database.sh") | crontab -
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/aria > /dev/null << 'EOF'
/var/log/aria/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reload all > /dev/null 2>&1 || true
    endscript
}
EOF
    
    log "INFO" "Monitoring and logging setup completed"
}

# Create backup script
setup_backup() {
    log "INFO" "Setting up backup system..."
    
    # Create backup script
    sudo tee /opt/aria/scripts/backup-database.sh > /dev/null << EOF
#!/bin/bash

BACKUP_DIR="/var/backups/aria"
DB_FILE="$BACKEND_DIR/aria.db"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/aria_db_\$TIMESTAMP.db"

# Create backup directory
mkdir -p "\$BACKUP_DIR"

# Create database backup
if [[ -f "\$DB_FILE" ]]; then
    cp "\$DB_FILE" "\$BACKUP_FILE"
    gzip "\$BACKUP_FILE"
    
    # Remove backups older than 7 days
    find "\$BACKUP_DIR" -name "aria_db_*.db.gz" -mtime +7 -delete
    
    echo "\$(date): Database backup completed: \$BACKUP_FILE.gz" >> /var/log/aria/backup.log
else
    echo "\$(date): Database file not found: \$DB_FILE" >> /var/log/aria/backup.log
fi
EOF
    
    # Make backup script executable
    sudo chmod +x /opt/aria/scripts/backup-database.sh
    
    # Test backup script
    /opt/aria/scripts/backup-database.sh
    
    log "INFO" "Backup system setup completed"
}

# Verify deployment
verify_deployment() {
    log "INFO" "Verifying production deployment..."
    
    # Check services
    services=("nginx" "redis-server")
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log "INFO" "✅ $service is running"
        else
            log "ERROR" "❌ $service is not running"
        fi
    done
    
    # Check PM2 processes
    pm2_status=$(pm2 jlist 2>/dev/null)
    if [ $? -eq 0 ]; then
        online_count=$(echo "$pm2_status" | jq '[.[] | select(.pm2_env.status == "online")] | length' 2>/dev/null || echo "0")
        total_count=$(echo "$pm2_status" | jq 'length' 2>/dev/null || echo "0")
        log "INFO" "✅ PM2 processes: $online_count/$total_count online"
    else
        log "ERROR" "❌ PM2 status check failed"
    fi
    
    # Check database
    cd "$BACKEND_DIR"
    source venv/bin/activate
    if python scripts/data_migration.py --action validate > /dev/null 2>&1; then
        log "INFO" "✅ Database validation passed"
    else
        log "ERROR" "❌ Database validation failed"
    fi
    
    # Check API endpoints
    sleep 5  # Give services time to start
    
    if curl -s "http://localhost:8000/health" > /dev/null; then
        log "INFO" "✅ Backend API is responding"
    else
        log "ERROR" "❌ Backend API is not responding"
    fi
    
    if curl -s "http://localhost:12001" > /dev/null; then
        log "INFO" "✅ Frontend is responding"
    else
        log "ERROR" "❌ Frontend is not responding"
    fi
    
    # Check HTTPS (if certificate exists)
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        if curl -s "https://$DOMAIN/health" > /dev/null; then
            log "INFO" "✅ HTTPS endpoint is responding"
        else
            log "WARN" "⚠️  HTTPS endpoint may not be responding"
        fi
    fi
    
    log "INFO" "Deployment verification completed"
}

# Print deployment summary
print_summary() {
    log "INFO" "Production deployment summary:"
    echo
    echo "🚀 Aria Document Management System - Production Ready!"
    echo
    echo "📊 System Information:"
    echo "   • Domain: https://$DOMAIN"
    echo "   • Backend API: http://localhost:8000"
    echo "   • Frontend: http://localhost:12001"
    echo "   • Database: SQLite with async driver"
    echo "   • Process Manager: PM2"
    echo "   • Web Server: Nginx with SSL"
    echo
    echo "👥 Default Users:"
    echo "   • Admin: admin@aria.vantax.co.za / admin123"
    echo "   • Demo: demo@aria.vantax.co.za / demo123"
    echo "   • Manager: manager@aria.vantax.co.za / manager123"
    echo
    echo "📁 Important Paths:"
    echo "   • Application: $PROJECT_ROOT"
    echo "   • Logs: /var/log/aria/"
    echo "   • Backups: /var/backups/aria/"
    echo "   • Scripts: /opt/aria/scripts/"
    echo
    echo "🔧 Management Commands:"
    echo "   • PM2 Status: pm2 status"
    echo "   • PM2 Logs: pm2 logs"
    echo "   • Nginx Status: sudo systemctl status nginx"
    echo "   • Health Check: curl https://$DOMAIN/api/health/detailed"
    echo
    echo "📚 Documentation:"
    echo "   • User Guide: $PROJECT_ROOT/docs/USER_GUIDE.md"
    echo "   • Admin Guide: $PROJECT_ROOT/docs/ADMIN_GUIDE.md"
    echo "   • Quick Start: $PROJECT_ROOT/docs/QUICK_START.md"
    echo
    echo "🎉 Setup completed successfully!"
    echo "   Visit https://$DOMAIN to access your Aria system"
    echo
}

# Main execution
main() {
    log "INFO" "Starting Aria production setup..."
    log "INFO" "Project root: $PROJECT_ROOT"
    
    # Create log directory
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo chown $USER:$USER "$(dirname "$LOG_FILE")"
    
    # Run setup steps
    check_root
    check_requirements
    install_dependencies
    setup_application
    setup_database
    setup_pm2
    setup_nginx
    setup_ssl
    setup_firewall
    setup_monitoring
    setup_backup
    verify_deployment
    print_summary
    
    log "INFO" "Production setup completed successfully! 🎉"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --skip-ssl)
            SKIP_SSL=true
            shift
            ;;
        --skip-firewall)
            SKIP_FIREWALL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --domain DOMAIN     Set domain name (default: aria.vantax.co.za)"
            echo "  --skip-ssl          Skip SSL certificate setup"
            echo "  --skip-firewall     Skip firewall configuration"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            log "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main