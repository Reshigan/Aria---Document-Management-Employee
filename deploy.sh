#!/bin/bash
#################################################################
# ARIA Automated Deployment Script
# Single-server deployment with health checks and rollback
#################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/aria"
BACKUP_DIR="/var/backups/aria"
LOG_FILE="/var/log/aria-deployment.log"
VENV_PATH="backend/venv"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Backup current state
backup() {
    log "Creating backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database
    if [ -f "$APP_DIR/backend/aria.db" ]; then
        cp "$APP_DIR/backend/aria.db" "$BACKUP_PATH/aria.db"
        success "Database backed up"
    fi
    
    # Backup current code
    cd "$APP_DIR"
    git rev-parse HEAD > "$BACKUP_PATH/commit_hash.txt"
    
    success "Backup created at $BACKUP_PATH"
    echo "$BACKUP_PATH" > /tmp/aria_last_backup.txt
}

# Rollback function
rollback() {
    error "Deployment failed! Rolling back..."
    
    if [ -f /tmp/aria_last_backup.txt ]; then
        BACKUP_PATH=$(cat /tmp/aria_last_backup.txt)
        
        if [ -f "$BACKUP_PATH/commit_hash.txt" ]; then
            COMMIT=$(cat "$BACKUP_PATH/commit_hash.txt")
            cd "$APP_DIR"
            git checkout "$COMMIT"
            success "Code rolled back to $COMMIT"
        fi
        
        if [ -f "$BACKUP_PATH/aria.db" ]; then
            cp "$BACKUP_PATH/aria.db" "$APP_DIR/backend/aria.db"
            success "Database rolled back"
        fi
    fi
    
    # Restart services
    systemctl restart aria-backend 2>/dev/null || true
    pm2 restart aria-frontend 2>/dev/null || true
    systemctl restart nginx
    
    error "Rollback complete. Check logs for details."
    exit 1
}

# Set trap for errors
trap rollback ERR

#################################################################
# DEPLOYMENT STARTS HERE
#################################################################

log "=========================================="
log "ARIA Deployment Starting"
log "=========================================="

# 1. Check prerequisites
log "Checking prerequisites..."

if [ ! -d "$APP_DIR" ]; then
    error "Application directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

success "Prerequisites OK"

# 2. Create backup
backup

# 3. Pull latest code
log "Pulling latest code from GitHub..."
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
LATEST_COMMIT=$(git rev-parse origin/main)

if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
    warning "Already up to date"
else
    git pull origin main
    success "Code updated: $CURRENT_COMMIT → $LATEST_COMMIT"
fi

# 4. Set Python path
export PYTHONPATH="$APP_DIR:$PYTHONPATH"

# 5. Backend deployment
log "=========================================="
log "Backend Deployment"
log "=========================================="

cd "$APP_DIR"

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Run database migration
log "Running database migrations..."

python << 'PYMIGRATION'
import sys
sys.path.insert(0, '/var/www/aria')

from sqlalchemy import create_engine, text, inspect
from backend.core.config import settings

try:
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if 'password_reset_tokens' not in existing_tables:
        print("Creating password_reset_tokens table...")
        with engine.begin() as conn:
            db_url = str(settings.DATABASE_URL).lower()
            
            if 'postgresql' in db_url or 'postgres' in db_url:
                conn.execute(text("""
                    CREATE TABLE password_reset_tokens (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        token VARCHAR(100) NOT NULL UNIQUE,
                        expires_at TIMESTAMP NOT NULL,
                        used BOOLEAN DEFAULT FALSE,
                        used_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS password_reset_tokens (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        token VARCHAR(100) NOT NULL UNIQUE,
                        expires_at TIMESTAMP NOT NULL,
                        used BOOLEAN DEFAULT 0,
                        used_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    );
                """))
            
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);"))
        print("✅ Migration complete")
    else:
        print("✅ Database already up to date")
except Exception as e:
    print(f"❌ Migration failed: {e}")
    sys.exit(1)
PYMIGRATION

success "Database migration complete"

# Restart backend service
log "Restarting backend service..."
systemctl restart aria-backend
sleep 3

if systemctl is-active --quiet aria-backend; then
    success "Backend service restarted"
else
    error "Backend service failed to start"
    systemctl status aria-backend --no-pager -n 20
    exit 1
fi

# Test backend health
log "Testing backend health..."
for i in {1..5}; do
    if curl -sf http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        success "Backend health check passed"
        break
    else
        if [ $i -eq 5 ]; then
            error "Backend health check failed"
            exit 1
        fi
        warning "Attempt $i/5 failed, retrying..."
        sleep 2
    fi
done

# 6. Frontend deployment
log "=========================================="
log "Frontend Deployment"
log "=========================================="

cd "$APP_DIR/frontend"

# Build frontend
log "Building frontend..."
npm run build

success "Frontend build complete"

# Restart frontend service
log "Restarting frontend service..."
pm2 restart aria-frontend 2>/dev/null || pm2 start npm --name aria-frontend -- start

success "Frontend service restarted"

# 7. Nginx restart
log "Restarting nginx..."
nginx -t
systemctl restart nginx
success "Nginx restarted"

# 8. Final verification
log "=========================================="
log "Final Verification"
log "=========================================="

# Test password reset endpoints
log "Testing password reset endpoints..."
FORGOT_RESPONSE=$(curl -sf -X POST http://localhost:8000/api/v1/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' || echo "FAILED")

if [[ "$FORGOT_RESPONSE" != "FAILED" ]]; then
    success "Password reset endpoints are working"
else
    warning "Password reset endpoint test failed"
fi

# 9. Success!
log "=========================================="
success "🎉 Deployment Successful!"
log "=========================================="
log ""
log "Public: https://aria.vantax.co.za"
log ""
log "=========================================="

exit 0
