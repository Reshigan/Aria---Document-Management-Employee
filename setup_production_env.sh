#!/bin/bash

################################################################################
# ARIA Production Environment Setup
# Version: 1.0.0
# Date: October 30, 2025
# Purpose: Complete production environment configuration
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
echo -e "${PURPLE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🔧 ARIA Production Environment Setup 🔧                         ║
║                                                                              ║
║                    Automated Infrastructure Setup                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.production"

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
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

################################################################################
# System Checks
################################################################################

echo ""
log_info "Checking system requirements..."
echo ""

# Check OS
OS=$(uname -s)
log_info "Operating System: $OS"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_warning "Running as root - this is not recommended for development"
fi

################################################################################
# PostgreSQL Setup
################################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗄️  PostgreSQL Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if command -v psql &> /dev/null; then
    log_success "PostgreSQL client found"
    
    # Prompt for database configuration
    read -p "PostgreSQL host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "PostgreSQL port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Database name [aria_production]: " DB_NAME
    DB_NAME=${DB_NAME:-aria_production}
    
    read -p "Database user [aria_user]: " DB_USER
    DB_USER=${DB_USER:-aria_user}
    
    read -sp "Database password: " DB_PASSWORD
    echo ""
    
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        log_warning "Generated random password: $DB_PASSWORD"
    fi
    
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    
    log_success "Database configuration saved"
else
    log_warning "PostgreSQL client not found - using SQLite fallback"
    DATABASE_URL="sqlite:///./aria_production.db"
fi

################################################################################
# Redis Setup
################################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚡ Redis Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if command -v redis-cli &> /dev/null; then
    log_success "Redis client found"
    
    read -p "Redis host [localhost]: " REDIS_HOST
    REDIS_HOST=${REDIS_HOST:-localhost}
    
    read -p "Redis port [6379]: " REDIS_PORT
    REDIS_PORT=${REDIS_PORT:-6379}
    
    read -p "Redis password (leave empty if none): " REDIS_PASSWORD
    
    if [ -n "$REDIS_PASSWORD" ]; then
        REDIS_URL="redis://:$REDIS_PASSWORD@$REDIS_HOST:$REDIS_PORT"
    else
        REDIS_URL="redis://$REDIS_HOST:$REDIS_PORT"
    fi
    
    log_success "Redis configuration saved"
else
    log_warning "Redis client not found - caching will be disabled"
    REDIS_URL=""
fi

################################################################################
# Application Configuration
################################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚙️  Application Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Generate secret key
SECRET_KEY=$(openssl rand -hex 32)
log_success "Generated secure secret key"

# Environment selection
read -p "Environment [production]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-production}

# Debug mode
read -p "Enable debug mode? (y/n) [n]: " DEBUG_MODE
if [[ $DEBUG_MODE =~ ^[Yy]$ ]]; then
    DEBUG="True"
else
    DEBUG="False"
fi

# CORS origins
read -p "Allowed CORS origins (comma-separated) [*]: " CORS_ORIGINS
CORS_ORIGINS=${CORS_ORIGINS:-"*"}

# API settings
read -p "Backend port [8000]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-8000}

read -p "Frontend URL [http://localhost:3000]: " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}

################################################################################
# Create Environment File
################################################################################

echo ""
log_info "Creating production environment file..."

cat > "$ENV_FILE" << EOF
# ARIA Production Environment Configuration
# Generated: $(date)
# WARNING: Keep this file secure and never commit to version control!

# ============================================================================
# Database Configuration
# ============================================================================
DATABASE_URL=$DATABASE_URL

# ============================================================================
# Redis Configuration
# ============================================================================
REDIS_URL=$REDIS_URL

# ============================================================================
# Application Settings
# ============================================================================
SECRET_KEY=$SECRET_KEY
ENVIRONMENT=$ENVIRONMENT
DEBUG=$DEBUG

# ============================================================================
# API Configuration
# ============================================================================
API_HOST=0.0.0.0
API_PORT=$BACKEND_PORT
CORS_ORIGINS=$CORS_ORIGINS

# ============================================================================
# Frontend Configuration
# ============================================================================
FRONTEND_URL=$FRONTEND_URL
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT

# ============================================================================
# Bot Configuration
# ============================================================================
BOT_EXECUTION_TIMEOUT=300
BOT_MAX_CONCURRENT=10
BOT_RETRY_ATTEMPTS=3

# ============================================================================
# File Upload Configuration
# ============================================================================
MAX_UPLOAD_SIZE=52428800
UPLOAD_DIR=./uploads
ALLOWED_EXTENSIONS=pdf,docx,xlsx,csv,txt,jpg,png

# ============================================================================
# Email Configuration (Optional)
# ============================================================================
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@aria.local

# ============================================================================
# Monitoring & Logging
# ============================================================================
LOG_LEVEL=INFO
LOG_FILE=./logs/aria.log

# ============================================================================
# Security
# ============================================================================
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
PASSWORD_MIN_LENGTH=8

# ============================================================================
# External Services (Optional)
# ============================================================================
# SAP_HOST=
# SAP_USER=
# SAP_PASSWORD=
# ODOO_URL=
# ODOO_DATABASE=
# ODOO_USERNAME=
# ODOO_PASSWORD=

# ============================================================================
# Feature Flags
# ============================================================================
ENABLE_BOT_ANALYTICS=True
ENABLE_AUTO_BACKUP=True
ENABLE_EMAIL_NOTIFICATIONS=False
ENABLE_WEBHOOKS=False

EOF

log_success "Environment file created: $ENV_FILE"

################################################################################
# Create .gitignore
################################################################################

echo ""
log_info "Updating .gitignore..."

GITIGNORE="$SCRIPT_DIR/.gitignore"

# Add environment files to .gitignore if not already present
if [ -f "$GITIGNORE" ]; then
    if ! grep -q ".env.production" "$GITIGNORE"; then
        echo "" >> "$GITIGNORE"
        echo "# Production environment files" >> "$GITIGNORE"
        echo ".env.production" >> "$GITIGNORE"
        echo ".env.local" >> "$GITIGNORE"
        log_success "Updated .gitignore"
    else
        log_info ".gitignore already configured"
    fi
else
    cat > "$GITIGNORE" << EOF
# Environment files
.env
.env.production
.env.local
.env.*.local

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
*.egg-info/

# Node
node_modules/
npm-debug.log*
.next/
out/
build/
dist/

# Logs
logs/
*.log

# Database
*.db
*.sqlite
*.sqlite3

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Uploads
uploads/
temp/

EOF
    log_success "Created .gitignore"
fi

################################################################################
# Create directory structure
################################################################################

echo ""
log_info "Creating directory structure..."

mkdir -p "$SCRIPT_DIR/logs"
mkdir -p "$SCRIPT_DIR/uploads"
mkdir -p "$SCRIPT_DIR/backups"
mkdir -p "$SCRIPT_DIR/temp"

log_success "Directory structure created"

################################################################################
# Create systemd service (Linux only)
################################################################################

if [ "$OS" = "Linux" ]; then
    echo ""
    read -p "Create systemd service for auto-start? (y/n) [n]: " CREATE_SERVICE
    
    if [[ $CREATE_SERVICE =~ ^[Yy]$ ]]; then
        SERVICE_FILE="/tmp/aria.service"
        
        cat > "$SERVICE_FILE" << EOF
[Unit]
Description=ARIA Document Management and ERP System
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
Environment="PATH=$PATH"
EnvironmentFile=$ENV_FILE
ExecStart=$SCRIPT_DIR/deploy_complete.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        log_success "Systemd service file created: $SERVICE_FILE"
        log_info "To install, run: sudo cp $SERVICE_FILE /etc/systemd/system/"
        log_info "Then: sudo systemctl enable aria && sudo systemctl start aria"
    fi
fi

################################################################################
# Summary
################################################################################

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ PRODUCTION ENVIRONMENT SETUP COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

log_success "Production environment configured successfully!"
echo ""
echo -e "${CYAN}📋 Configuration Summary:${NC}"
echo "  • Environment file: $ENV_FILE"
echo "  • Database: $(echo $DATABASE_URL | cut -d'@' -f2 2>/dev/null || echo 'SQLite')"
echo "  • Redis: $REDIS_HOST:$REDIS_PORT"
echo "  • Backend port: $BACKEND_PORT"
echo "  • Environment: $ENVIRONMENT"
echo "  • Debug mode: $DEBUG"
echo ""

echo -e "${CYAN}🚀 Next Steps:${NC}"
echo "  1. Review and edit: $ENV_FILE"
echo "  2. Configure external services (SAP, ODOO, etc.) if needed"
echo "  3. Run deployment: ./deploy_complete.sh"
echo "  4. Access API docs: http://localhost:$BACKEND_PORT/docs"
echo ""

echo -e "${YELLOW}⚠️  SECURITY WARNINGS:${NC}"
echo "  • Never commit $ENV_FILE to version control"
echo "  • Keep SECRET_KEY secure and private"
echo "  • Change default passwords in production"
echo "  • Enable HTTPS/TLS for production deployment"
echo "  • Configure firewall rules appropriately"
echo ""

log_success "Setup complete! Ready to deploy."
echo ""

exit 0
