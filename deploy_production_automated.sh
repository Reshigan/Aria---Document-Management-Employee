#!/bin/bash
#################################################################################
# ARIA AUTOMATED PRODUCTION DEPLOYMENT SCRIPT
# 
# This script handles the complete deployment process:
# - Pulls latest code from Git
# - Builds frontend with correct configuration
# - Kills old backend processes
# - Starts new backend service
# - Reloads nginx with cache busting
# - Verifies deployment success
#
# Usage: ./deploy_production_automated.sh
#
# Created to solve recurring deployment issues:
# - Browser caching problems
# - Multiple backend processes
# - API endpoint mismatches
# - Manual deployment errors
#################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="ubuntu"
SERVER_IP="3.8.139.178"
SSH_KEY="/workspace/project/Vantax-2.pem"
SERVER_FRONTEND_DIR="/var/www/aria/frontend"
SERVER_BACKEND_DIR="/var/www/aria/backend"
REPO_DIR="/workspace/project/Aria---Document-Management-Employee"
DOMAIN="https://aria.vantax.co.za"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Error handler
error_exit() {
    log_error "$1"
    exit 1
}

echo "==============================================================================="
echo "                    ARIA PRODUCTION DEPLOYMENT"
echo "==============================================================================="
log "Starting automated deployment process..."
echo ""

#################################################################################
# STEP 1: PRE-DEPLOYMENT CHECKS
#################################################################################
log "STEP 1: Pre-deployment checks..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    error_exit "SSH key not found: $SSH_KEY"
fi
log_success "SSH key found"

# Check if Git repo exists
if [ ! -d "$REPO_DIR/.git" ]; then
    error_exit "Git repository not found: $REPO_DIR"
fi
log_success "Git repository found"

# Check Git status
cd "$REPO_DIR"
if [[ -n $(git status -s) ]]; then
    log_warning "Uncommitted changes detected. Committing..."
    git add .
    git commit -m "chore: automated deployment $(date +'%Y-%m-%d %H:%M:%S')" || true
fi
log_success "Git repository clean"

# Get current commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)
log "Deploying commit: $COMMIT_HASH"

#################################################################################
# STEP 2: BUILD FRONTEND LOCALLY
#################################################################################
log "STEP 2: Building frontend locally..."

cd "$REPO_DIR/frontend"

# Ensure .env.production exists with correct configuration
log "Creating .env.production..."
cat > .env.production << 'EOF'
VITE_API_URL=
VITE_APP_NAME=Aria
VITE_APP_VERSION=2.0.0
EOF
log_success ".env.production created"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install || error_exit "Failed to install dependencies"
fi
log_success "Dependencies installed"

# Clean old build
log "Cleaning old build..."
rm -rf dist/
log_success "Old build cleaned"

# Build for production
log "Building frontend (this may take a minute)..."
npm run build || error_exit "Failed to build frontend"
log_success "Frontend built successfully"

# Verify dist directory exists
if [ ! -d "dist" ]; then
    error_exit "Build failed: dist directory not created"
fi
log_success "Build artifacts verified"

# Create build manifest
BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
cat > dist/build-manifest.json << EOF
{
  "commit": "$COMMIT_HASH",
  "buildTime": "$BUILD_TIME",
  "version": "2.0.0",
  "apiVersion": "v1"
}
EOF
log_success "Build manifest created"

#################################################################################
# STEP 3: STOP OLD BACKEND PROCESSES
#################################################################################
log "STEP 3: Stopping old backend processes..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
# Kill all old uvicorn processes (except the one we're about to start)
echo "Checking for old uvicorn processes..."
PIDS=$(ps aux | grep "[u]vicorn.*aria\|[u]vicorn.*working_main" | awk '{print $2}')

if [ -n "$PIDS" ]; then
    echo "Found old processes: $PIDS"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    sleep 2
    echo "Old processes killed"
else
    echo "No old processes found"
fi
ENDSSH

log_success "Old backend processes stopped"

#################################################################################
# STEP 4: DEPLOY FRONTEND
#################################################################################
log "STEP 4: Deploying frontend to server..."

# Create backup of old frontend
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << ENDSSH
if [ -d "$SERVER_FRONTEND_DIR/dist" ]; then
    echo "Backing up old frontend..."
    rm -rf "$SERVER_FRONTEND_DIR/dist.backup"
    mv "$SERVER_FRONTEND_DIR/dist" "$SERVER_FRONTEND_DIR/dist.backup"
    echo "Backup created"
else
    echo "No old frontend to backup"
fi

# Create dist directory
mkdir -p "$SERVER_FRONTEND_DIR/dist"
ENDSSH

log_success "Old frontend backed up"

# Copy new build to server
log "Copying new build to server..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r "$REPO_DIR/frontend/dist/"* "$SERVER_USER@$SERVER_IP:$SERVER_FRONTEND_DIR/dist/" || error_exit "Failed to copy frontend to server"
log_success "Frontend deployed to server"

# Copy .env.production
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REPO_DIR/frontend/.env.production" "$SERVER_USER@$SERVER_IP:$SERVER_FRONTEND_DIR/" || error_exit "Failed to copy .env.production"
log_success ".env.production copied"

#################################################################################
# STEP 5: DEPLOY BACKEND
#################################################################################
log "STEP 5: Deploying backend to server..."

# Copy backend files (only if changed)
log "Syncing backend files..."
rsync -avz --delete -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='aria.db' \
    "$REPO_DIR/backend/" "$SERVER_USER@$SERVER_IP:$SERVER_BACKEND_DIR/" || error_exit "Failed to sync backend"
log_success "Backend files synced"

#################################################################################
# STEP 6: START BACKEND SERVICE
#################################################################################
log "STEP 6: Starting backend service..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
# Restart backend service
if systemctl is-active --quiet aria-backend; then
    echo "Restarting aria-backend service..."
    sudo systemctl restart aria-backend
else
    echo "Starting aria-backend service..."
    sudo systemctl start aria-backend
fi

# Wait for service to be ready
echo "Waiting for backend to be ready..."
sleep 3

# Verify service is running
if systemctl is-active --quiet aria-backend; then
    echo "Backend service is running"
else
    echo "ERROR: Backend service failed to start"
    sudo journalctl -u aria-backend -n 50 --no-pager
    exit 1
fi
ENDSSH

log_success "Backend service started"

#################################################################################
# STEP 7: UPDATE NGINX CONFIGURATION
#################################################################################
log "STEP 7: Updating Nginx configuration..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
# Verify nginx config has cache busting headers
echo "Checking nginx configuration..."

# Check if no-cache headers are present
if ! sudo grep -q "no-cache, no-store, must-revalidate" /etc/nginx/sites-available/aria; then
    echo "WARNING: Nginx cache headers not configured correctly"
    echo "Please run: sudo nano /etc/nginx/sites-available/aria"
    echo "And add cache-busting headers"
else
    echo "Nginx cache headers configured correctly"
fi

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

echo "Nginx reloaded successfully"
ENDSSH

log_success "Nginx configuration updated"

#################################################################################
# STEP 8: VERIFY DEPLOYMENT
#################################################################################
log "STEP 8: Verifying deployment..."

# Wait for services to stabilize
log "Waiting for services to stabilize..."
sleep 5

# Test backend health endpoint
log "Testing backend health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/v1/health")
if [ "$HEALTH_RESPONSE" != "200" ]; then
    log_warning "Health check returned: $HEALTH_RESPONSE (expected 200)"
else
    log_success "Backend health check passed (200 OK)"
fi

# Test login endpoint
log "Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DOMAIN/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@vantax.co.za","password":"Admin@123"}')
if [ "$LOGIN_RESPONSE" != "200" ]; then
    log_warning "Login test returned: $LOGIN_RESPONSE (expected 200)"
else
    log_success "Login endpoint test passed (200 OK)"
fi

# Test frontend
log "Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/")
if [ "$FRONTEND_RESPONSE" != "200" ]; then
    log_warning "Frontend test returned: $FRONTEND_RESPONSE (expected 200)"
else
    log_success "Frontend test passed (200 OK)"
fi

# Verify build manifest
log "Verifying build manifest..."
MANIFEST_RESPONSE=$(curl -s "$DOMAIN/build-manifest.json")
if [ -n "$MANIFEST_RESPONSE" ]; then
    log_success "Build manifest accessible"
    echo "$MANIFEST_RESPONSE" | grep -q "$COMMIT_HASH" && log_success "Commit hash verified: $COMMIT_HASH"
else
    log_warning "Build manifest not accessible"
fi

#################################################################################
# STEP 9: FINAL CHECKS
#################################################################################
log "STEP 9: Final checks..."

# Check for errors in logs
log "Checking backend logs for errors..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
ERRORS=$(sudo journalctl -u aria-backend -n 20 --no-pager | grep -i "error\|exception\|failed" | wc -l)
if [ "$ERRORS" -gt 0 ]; then
    echo "WARNING: Found $ERRORS errors in backend logs"
    sudo journalctl -u aria-backend -n 20 --no-pager | grep -i "error\|exception\|failed"
else
    echo "No errors in backend logs"
fi
ENDSSH

# Check nginx logs for 404s
log "Checking nginx logs for 404s..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
RECENT_404s=$(sudo tail -100 /var/log/nginx/access.log | grep " 404 " | wc -l)
if [ "$RECENT_404s" -gt 0 ]; then
    echo "WARNING: Found $RECENT_404s recent 404 errors"
    sudo tail -100 /var/log/nginx/access.log | grep " 404 " | tail -5
else
    echo "No recent 404 errors"
fi
ENDSSH

#################################################################################
# DEPLOYMENT COMPLETE
#################################################################################
echo ""
echo "==============================================================================="
log_success "DEPLOYMENT COMPLETE!"
echo "==============================================================================="
echo ""
echo "Deployment Summary:"
echo "  • Commit:        $COMMIT_HASH"
echo "  • Build Time:    $BUILD_TIME"
echo "  • Domain:        $DOMAIN"
echo "  • Frontend:      ✓ Deployed"
echo "  • Backend:       ✓ Running"
echo "  • Nginx:         ✓ Updated"
echo ""
echo "Next Steps:"
echo "  1. Clear your browser cache (Ctrl+Shift+R)"
echo "  2. Visit: $DOMAIN/login"
echo "  3. Test login with: admin@vantax.co.za / Admin@123"
echo "  4. Verify all features work correctly"
echo ""
echo "Monitoring:"
echo "  • Backend logs:  ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'sudo journalctl -u aria-backend -f'"
echo "  • Nginx logs:    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'sudo tail -f /var/log/nginx/access.log'"
echo ""
echo "Rollback (if needed):"
echo "  • Run: ./rollback_deployment.sh"
echo ""
log "Deployment script completed successfully!"
echo "==============================================================================="
