#!/bin/bash

# 🚀 ARIA FULL-STACK SINGLE SERVER DEPLOYMENT SCRIPT
# Complete end-to-end deployment with CI/CD automation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="root"
SERVER_HOST="aria.vantax.co.za"
DEPLOY_PATH="/var/www/aria"
BACKUP_PATH="/var/backups/aria"
LOG_FILE="/var/log/aria/deployment.log"

# Function to print colored output
print_status() {
    local message="$1"
    local status="${2:-INFO}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ [$timestamp] $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ [$timestamp] $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  [$timestamp] $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  [$timestamp] $message${NC}"
            ;;
        "DEPLOY")
            echo -e "${PURPLE}🚀 [$timestamp] $message${NC}"
            ;;
        *)
            echo "[$timestamp] $message"
            ;;
    esac
    
    # Also log to file if we're on the server
    if [[ -f "$LOG_FILE" ]]; then
        echo "[$timestamp] [$status] $message" >> "$LOG_FILE"
    fi
}

# Function to check if we're running on the server
is_server() {
    [[ "$(hostname)" == *"aria"* ]] || [[ "$(whoami)" == "root" ]] || [[ -d "/var/www" ]]
}

# Function to execute commands on server
execute_on_server() {
    local command="$1"
    if is_server; then
        eval "$command"
    else
        ssh "$SERVER_USER@$SERVER_HOST" "$command"
    fi
}

# Function to copy files to server
copy_to_server() {
    local source="$1"
    local destination="$2"
    if is_server; then
        cp -r "$source" "$destination"
    else
        scp -r "$source" "$SERVER_USER@$SERVER_HOST:$destination"
    fi
}

# Main deployment function
main() {
    print_status "ARIA FULL-STACK DEPLOYMENT STARTING" "DEPLOY"
    echo -e "${WHITE}============================================${NC}"
    echo -e "${CYAN}Target Server: $SERVER_HOST${NC}"
    echo -e "${CYAN}Deploy Path: $DEPLOY_PATH${NC}"
    echo -e "${CYAN}Timestamp: $(date)${NC}"
    echo -e "${WHITE}============================================${NC}"
    echo ""

    # Phase 1: Pre-deployment checks
    print_status "PHASE 1: PRE-DEPLOYMENT CHECKS" "DEPLOY"
    
    # Check server connectivity
    if ! is_server; then
        print_status "Testing server connectivity..." "INFO"
        if ! ssh -o ConnectTimeout=10 "$SERVER_USER@$SERVER_HOST" "echo 'Connection successful'"; then
            print_status "Cannot connect to server $SERVER_HOST" "ERROR"
            exit 1
        fi
        print_status "Server connectivity confirmed" "SUCCESS"
    fi
    
    # Check required tools
    print_status "Checking required tools..." "INFO"
    execute_on_server "command -v git >/dev/null 2>&1 || { echo 'Git not installed'; exit 1; }"
    execute_on_server "command -v node >/dev/null 2>&1 || { echo 'Node.js not installed'; exit 1; }"
    execute_on_server "command -v python3 >/dev/null 2>&1 || { echo 'Python3 not installed'; exit 1; }"
    execute_on_server "command -v nginx >/dev/null 2>&1 || { echo 'Nginx not installed'; exit 1; }"
    print_status "All required tools available" "SUCCESS"
    
    echo ""

    # Phase 2: Server cleanup and preparation
    print_status "PHASE 2: SERVER CLEANUP AND PREPARATION" "DEPLOY"
    
    # Create backup of existing deployment
    print_status "Creating backup of existing deployment..." "INFO"
    execute_on_server "mkdir -p $BACKUP_PATH"
    if execute_on_server "[ -d '$DEPLOY_PATH' ]"; then
        backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        execute_on_server "cp -r $DEPLOY_PATH $BACKUP_PATH/$backup_name"
        print_status "Backup created: $BACKUP_PATH/$backup_name" "SUCCESS"
    fi
    
    # Clean existing deployment
    print_status "Cleaning existing deployment..." "INFO"
    execute_on_server "rm -rf $DEPLOY_PATH"
    execute_on_server "mkdir -p $DEPLOY_PATH"
    execute_on_server "mkdir -p /var/log/aria"
    execute_on_server "mkdir -p /var/backups/aria"
    print_status "Server cleaned and prepared" "SUCCESS"
    
    echo ""

    # Phase 3: Code deployment
    print_status "PHASE 3: CODE DEPLOYMENT" "DEPLOY"
    
    # Clone repository
    print_status "Cloning repository..." "INFO"
    execute_on_server "cd /var/www && git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git aria"
    execute_on_server "cd $DEPLOY_PATH && git checkout main"
    print_status "Repository cloned successfully" "SUCCESS"
    
    echo ""

    # Phase 4: Backend deployment
    print_status "PHASE 4: BACKEND DEPLOYMENT" "DEPLOY"
    
    # Setup Python environment
    print_status "Setting up Python environment..." "INFO"
    execute_on_server "cd $DEPLOY_PATH/backend && python3 -m venv venv"
    execute_on_server "cd $DEPLOY_PATH/backend && source venv/bin/activate && pip install --upgrade pip"
    
    # Install Python dependencies
    print_status "Installing Python dependencies..." "INFO"
    execute_on_server "cd $DEPLOY_PATH/backend && source venv/bin/activate && pip install -r requirements.txt"
    
    # Install additional security dependencies
    execute_on_server "cd $DEPLOY_PATH/backend && source venv/bin/activate && pip install slowapi redis python-multipart aiosqlite"
    
    # Setup database
    print_status "Setting up database..." "INFO"
    execute_on_server "cd $DEPLOY_PATH/backend && source venv/bin/activate && python -c 'from main import *; Base.metadata.create_all(bind=engine)'"
    
    # Run data migration
    if execute_on_server "[ -f '$DEPLOY_PATH/backend/scripts/data_migration.py' ]"; then
        print_status "Running data migration..." "INFO"
        execute_on_server "cd $DEPLOY_PATH/backend && source venv/bin/activate && python scripts/data_migration.py"
    fi
    
    print_status "Backend deployment completed" "SUCCESS"
    
    echo ""

    # Phase 5: Frontend deployment
    print_status "PHASE 5: FRONTEND DEPLOYMENT" "DEPLOY"
    
    # Install Node.js dependencies
    print_status "Installing Node.js dependencies..." "INFO"
    execute_on_server "cd $DEPLOY_PATH/frontend && npm install"
    
    # Build frontend
    print_status "Building frontend..." "INFO"
    execute_on_server "cd $DEPLOY_PATH/frontend && npm run build"
    
    # Create production build directory
    execute_on_server "mkdir -p $DEPLOY_PATH/frontend/dist"
    if execute_on_server "[ -d '$DEPLOY_PATH/frontend/.next' ]"; then
        execute_on_server "cp -r $DEPLOY_PATH/frontend/.next/* $DEPLOY_PATH/frontend/dist/"
    fi
    
    print_status "Frontend deployment completed" "SUCCESS"
    
    echo ""

    # Phase 6: System configuration
    print_status "PHASE 6: SYSTEM CONFIGURATION" "DEPLOY"
    
    # Configure Nginx
    print_status "Configuring Nginx..." "INFO"
    if execute_on_server "[ -f '$DEPLOY_PATH/nginx-security.conf' ]"; then
        execute_on_server "cp $DEPLOY_PATH/nginx-security.conf /etc/nginx/sites-available/aria-production"
        execute_on_server "ln -sf /etc/nginx/sites-available/aria-production /etc/nginx/sites-enabled/"
        execute_on_server "rm -f /etc/nginx/sites-enabled/default"
        execute_on_server "nginx -t"
        execute_on_server "systemctl reload nginx"
        print_status "Nginx configured successfully" "SUCCESS"
    else
        print_status "Nginx config file not found, using default" "WARNING"
    fi
    
    # Setup PM2 for process management
    print_status "Setting up PM2 process management..." "INFO"
    execute_on_server "npm install -g pm2"
    
    # Create PM2 ecosystem file
    execute_on_server "cat > $DEPLOY_PATH/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'aria-backend',
      script: 'main.py',
      cwd: '$DEPLOY_PATH/backend',
      interpreter: '$DEPLOY_PATH/backend/venv/bin/python',
      env: {
        PORT: 8000,
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/aria/backend-error.log',
      out_file: '/var/log/aria/backend-out.log',
      log_file: '/var/log/aria/backend.log'
    },
    {
      name: 'aria-frontend',
      script: 'npm',
      args: 'start',
      cwd: '$DEPLOY_PATH/frontend',
      env: {
        PORT: 12001,
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/aria/frontend-error.log',
      out_file: '/var/log/aria/frontend-out.log',
      log_file: '/var/log/aria/frontend.log'
    }
  ]
};
EOF"
    
    print_status "System configuration completed" "SUCCESS"
    
    echo ""

    # Phase 7: Security hardening
    print_status "PHASE 7: SECURITY HARDENING" "DEPLOY"
    
    # Configure firewall
    print_status "Configuring firewall..." "INFO"
    execute_on_server "ufw --force enable"
    execute_on_server "ufw default deny incoming"
    execute_on_server "ufw default allow outgoing"
    execute_on_server "ufw allow ssh"
    execute_on_server "ufw allow 'Nginx Full'"
    
    # Install and configure fail2ban
    print_status "Installing fail2ban..." "INFO"
    execute_on_server "apt update && apt install -y fail2ban"
    execute_on_server "systemctl enable fail2ban"
    execute_on_server "systemctl start fail2ban"
    
    # Set up SSL certificate renewal
    if execute_on_server "command -v certbot >/dev/null 2>&1"; then
        print_status "Setting up SSL certificate auto-renewal..." "INFO"
        execute_on_server "crontab -l 2>/dev/null | { cat; echo '0 12 * * * /usr/bin/certbot renew --quiet'; } | crontab -"
    fi
    
    print_status "Security hardening completed" "SUCCESS"
    
    echo ""

    # Phase 8: Service startup
    print_status "PHASE 8: SERVICE STARTUP" "DEPLOY"
    
    # Stop existing services
    print_status "Stopping existing services..." "INFO"
    execute_on_server "pm2 delete all || true"
    
    # Start services
    print_status "Starting services..." "INFO"
    execute_on_server "cd $DEPLOY_PATH && pm2 start ecosystem.config.js"
    execute_on_server "pm2 save"
    execute_on_server "pm2 startup"
    
    # Wait for services to start
    print_status "Waiting for services to start..." "INFO"
    sleep 10
    
    print_status "Services started successfully" "SUCCESS"
    
    echo ""

    # Phase 9: Health checks and validation
    print_status "PHASE 9: HEALTH CHECKS AND VALIDATION" "DEPLOY"
    
    # Check backend health
    print_status "Checking backend health..." "INFO"
    for i in {1..5}; do
        if execute_on_server "curl -f http://localhost:8000/api/health >/dev/null 2>&1"; then
            print_status "Backend health check passed" "SUCCESS"
            break
        else
            if [ $i -eq 5 ]; then
                print_status "Backend health check failed after 5 attempts" "ERROR"
                execute_on_server "pm2 logs aria-backend --lines 20"
                exit 1
            fi
            print_status "Backend not ready, waiting... (attempt $i/5)" "WARNING"
            sleep 5
        fi
    done
    
    # Check frontend health
    print_status "Checking frontend health..." "INFO"
    for i in {1..5}; do
        if execute_on_server "curl -f http://localhost:12001 >/dev/null 2>&1"; then
            print_status "Frontend health check passed" "SUCCESS"
            break
        else
            if [ $i -eq 5 ]; then
                print_status "Frontend health check failed after 5 attempts" "ERROR"
                execute_on_server "pm2 logs aria-frontend --lines 20"
                exit 1
            fi
            print_status "Frontend not ready, waiting... (attempt $i/5)" "WARNING"
            sleep 5
        fi
    done
    
    # Check Nginx
    print_status "Checking Nginx configuration..." "INFO"
    execute_on_server "nginx -t"
    execute_on_server "systemctl status nginx --no-pager"
    
    # Check external access
    print_status "Checking external access..." "INFO"
    if execute_on_server "curl -f https://$SERVER_HOST/api/health >/dev/null 2>&1"; then
        print_status "External access confirmed" "SUCCESS"
    else
        print_status "External access check failed" "WARNING"
    fi
    
    echo ""

    # Phase 10: Automated testing
    print_status "PHASE 10: AUTOMATED TESTING" "DEPLOY"
    
    # Run automated test suite
    if execute_on_server "[ -f '$DEPLOY_PATH/automated_testing_suite.py' ]"; then
        print_status "Running automated test suite..." "INFO"
        execute_on_server "cd $DEPLOY_PATH && python3 automated_testing_suite.py --production"
        print_status "Automated testing completed" "SUCCESS"
    else
        print_status "Automated test suite not found, skipping" "WARNING"
    fi
    
    echo ""

    # Phase 11: Monitoring and alerts setup
    print_status "PHASE 11: MONITORING AND ALERTS SETUP" "DEPLOY"
    
    # Setup log rotation
    print_status "Setting up log rotation..." "INFO"
    execute_on_server "cat > /etc/logrotate.d/aria << 'EOF'
/var/log/aria/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF"
    
    # Setup monitoring cron job
    print_status "Setting up monitoring..." "INFO"
    execute_on_server "cat > /usr/local/bin/aria-monitor.sh << 'EOF'
#!/bin/bash
# Aria system monitoring script

LOG_FILE=\"/var/log/aria/monitor.log\"
TIMESTAMP=\$(date '+%Y-%m-%d %H:%M:%S')

# Check backend
if ! curl -f http://localhost:8000/api/health >/dev/null 2>&1; then
    echo \"[\$TIMESTAMP] ERROR: Backend health check failed\" >> \$LOG_FILE
    pm2 restart aria-backend
fi

# Check frontend
if ! curl -f http://localhost:12001 >/dev/null 2>&1; then
    echo \"[\$TIMESTAMP] ERROR: Frontend health check failed\" >> \$LOG_FILE
    pm2 restart aria-frontend
fi

# Check disk space
DISK_USAGE=\$(df / | awk 'NR==2 {print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    echo \"[\$TIMESTAMP] WARNING: Disk usage is \${DISK_USAGE}%\" >> \$LOG_FILE
fi

echo \"[\$TIMESTAMP] INFO: System monitoring completed\" >> \$LOG_FILE
EOF"
    
    execute_on_server "chmod +x /usr/local/bin/aria-monitor.sh"
    execute_on_server "crontab -l 2>/dev/null | { cat; echo '*/5 * * * * /usr/local/bin/aria-monitor.sh'; } | crontab -"
    
    print_status "Monitoring and alerts setup completed" "SUCCESS"
    
    echo ""

    # Final status report
    print_status "DEPLOYMENT COMPLETED SUCCESSFULLY!" "SUCCESS"
    echo -e "${WHITE}============================================${NC}"
    echo -e "${GREEN}🎉 ARIA FULL-STACK DEPLOYMENT COMPLETE${NC}"
    echo -e "${WHITE}============================================${NC}"
    echo ""
    echo -e "${CYAN}📊 DEPLOYMENT SUMMARY:${NC}"
    echo -e "   🌐 Domain: https://$SERVER_HOST"
    echo -e "   🔧 Backend: http://localhost:8000"
    echo -e "   🎨 Frontend: http://localhost:12001"
    echo -e "   📁 Deploy Path: $DEPLOY_PATH"
    echo -e "   📋 Logs: /var/log/aria/"
    echo -e "   💾 Backups: $BACKUP_PATH"
    echo ""
    echo -e "${CYAN}🔐 ACCESS CREDENTIALS:${NC}"
    echo -e "   👤 Admin: admin@aria.vantax.co.za / admin123"
    echo -e "   👤 Demo: demo@aria.vantax.co.za / demo123"
    echo ""
    echo -e "${CYAN}🛠️  MANAGEMENT COMMANDS:${NC}"
    echo -e "   📊 Status: pm2 status"
    echo -e "   📋 Logs: pm2 logs"
    echo -e "   🔄 Restart: pm2 restart all"
    echo -e "   🔍 Monitor: tail -f /var/log/aria/monitor.log"
    echo ""
    echo -e "${GREEN}✅ System is ready for production use!${NC}"
    
    # Save deployment info
    execute_on_server "cat > $DEPLOY_PATH/DEPLOYMENT_INFO.txt << 'EOF'
ARIA DEPLOYMENT INFORMATION
===========================
Deployment Date: $(date)
Deployment Path: $DEPLOY_PATH
Server: $SERVER_HOST
Backend Port: 8000
Frontend Port: 12001
Database: SQLite ($DEPLOY_PATH/backend/aria.db)
Logs: /var/log/aria/
Backups: $BACKUP_PATH

Services:
- aria-backend (PM2)
- aria-frontend (PM2)
- nginx
- fail2ban

Access:
- Admin: admin@aria.vantax.co.za / admin123
- Demo: demo@aria.vantax.co.za / demo123

Health Checks:
- Backend: https://$SERVER_HOST/api/health
- Frontend: https://$SERVER_HOST/
- API Docs: https://$SERVER_HOST/api/docs
EOF"
}

# Error handling
trap 'print_status "Deployment failed at line $LINENO" "ERROR"; exit 1' ERR

# Check if script is run with proper permissions
if [[ $EUID -ne 0 ]] && ! is_server; then
    print_status "This script should be run as root on the server or with SSH access" "WARNING"
fi

# Run main deployment
main "$@"

print_status "Deployment script completed successfully" "SUCCESS"
exit 0