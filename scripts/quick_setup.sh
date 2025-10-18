#!/bin/bash

# Quick Production Setup for Aria Document Management System
# This script sets up the production environment without interactive prompts

set -e

PROJECT_ROOT="/workspace/project/Aria---Document-Management-Employee"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] $2"
}

log "INFO" "Starting Aria quick production setup..."
log "INFO" "Project root: $PROJECT_ROOT"

# Check if backend dependencies are installed
log "INFO" "Checking backend dependencies..."
cd "$BACKEND_DIR"

# Install/upgrade Python dependencies (using system Python in container)
log "INFO" "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check database
log "INFO" "Checking database..."
if [ -f "aria.db" ]; then
    log "INFO" "Database exists, running migration check..."
    python scripts/data_migration.py --action stats
else
    log "INFO" "Database not found, creating and seeding..."
    python scripts/data_migration.py --action seed-all
fi

# Check frontend dependencies
log "INFO" "Checking frontend dependencies..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    log "INFO" "Installing Node.js dependencies..."
    npm install
fi

# Build frontend for production
log "INFO" "Building frontend for production..."
npm run build

log "INFO" "Quick setup completed successfully!"
log "INFO" "Backend: $BACKEND_DIR"
log "INFO" "Frontend: $FRONTEND_DIR"
log "INFO" "Database: $BACKEND_DIR/aria.db"

# Show current status
cd "$BACKEND_DIR"
log "INFO" "Current database statistics:"
python scripts/data_migration.py --action stats

log "SUCCESS" "Aria production environment is ready!"