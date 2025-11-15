#!/bin/bash

set -e

BACKUP_DIR="/var/backups/aria"
OFFSITE_DIR="/mnt/offsite-backups/aria"  # Mount point for offsite storage
ENCRYPTION_KEY_FILE="/etc/aria/backup.key"
RETENTION_DAYS=30
DATABASE_URL="postgresql://aria_user:AriaSecure2025!@localhost/aria_erp"
LOG_FILE="/var/log/aria-backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

mkdir -p "$BACKUP_DIR"
mkdir -p "$OFFSITE_DIR"

if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
    warning "Encryption key not found. Generating new key..."
    mkdir -p "$(dirname "$ENCRYPTION_KEY_FILE")"
    openssl rand -base64 32 > "$ENCRYPTION_KEY_FILE"
    chmod 600 "$ENCRYPTION_KEY_FILE"
    success "Encryption key generated at $ENCRYPTION_KEY_FILE"
fi

perform_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/aria_backup_$timestamp.sql"
    local encrypted_file="$backup_file.enc"
    local offsite_file="$OFFSITE_DIR/aria_backup_$timestamp.sql.enc"
    
    log "Starting backup process..."
    
    log "Creating database dump..."
    if pg_dump "$DATABASE_URL" > "$backup_file"; then
        success "Database dump created: $backup_file"
    else
        error "Failed to create database dump"
        return 1
    fi
    
    log "Encrypting backup..."
    if openssl enc -aes-256-cbc -salt -in "$backup_file" -out "$encrypted_file" -pass file:"$ENCRYPTION_KEY_FILE"; then
        success "Backup encrypted: $encrypted_file"
        rm "$backup_file"  # Remove unencrypted file
    else
        error "Failed to encrypt backup"
        return 1
    fi
    
    log "Copying to offsite location..."
    if cp "$encrypted_file" "$offsite_file"; then
        success "Backup copied to offsite: $offsite_file"
    else
        warning "Failed to copy to offsite location (may not be mounted)"
    fi
    
    log "Verifying backup integrity..."
    if openssl enc -aes-256-cbc -d -in "$encrypted_file" -pass file:"$ENCRYPTION_KEY_FILE" > /dev/null 2>&1; then
        success "Backup integrity verified"
    else
        error "Backup integrity check failed"
        return 1
    fi
    
    log "Testing restore capability..."
    if test_restore "$encrypted_file"; then
        success "Restore test passed"
    else
        warning "Restore test failed - backup may not be restorable"
    fi
    
    log "Cleaning up old backups..."
    find "$BACKUP_DIR" -name "aria_backup_*.sql.enc" -mtime +$RETENTION_DAYS -delete
    find "$OFFSITE_DIR" -name "aria_backup_*.sql.enc" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    success "Old backups cleaned up (retention: $RETENTION_DAYS days)"
    
    log "Backup process completed successfully"
    return 0
}

test_restore() {
    local encrypted_file=$1
    local test_db="aria_erp_restore_test"
    
    log "Creating temporary test database..."
    
    psql -U aria_user -h localhost -c "DROP DATABASE IF EXISTS $test_db;" postgres 2>/dev/null || true
    
    if ! psql -U aria_user -h localhost -c "CREATE DATABASE $test_db;" postgres 2>/dev/null; then
        warning "Could not create test database for restore testing"
        return 1
    fi
    
    if openssl enc -aes-256-cbc -d -in "$encrypted_file" -pass file:"$ENCRYPTION_KEY_FILE" | \
       psql -U aria_user -h localhost -d "$test_db" > /dev/null 2>&1; then
        
        local table_count=$(psql -U aria_user -h localhost -d "$test_db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
        
        if [ "$table_count" -gt 0 ]; then
            log "Restore test successful: $table_count tables restored"
            psql -U aria_user -h localhost -c "DROP DATABASE $test_db;" postgres 2>/dev/null || true
            return 0
        fi
    fi
    
    psql -U aria_user -h localhost -c "DROP DATABASE $test_db;" postgres 2>/dev/null || true
    return 1
}

restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        error "No backup file specified"
        echo "Usage: $0 restore <encrypted_backup_file>"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    warning "This will restore the database from backup. Current data will be lost!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled by user"
        return 0
    fi
    
    log "Starting restore process..."
    
    if openssl enc -aes-256-cbc -d -in "$backup_file" -pass file:"$ENCRYPTION_KEY_FILE" | \
       psql "$DATABASE_URL" > /dev/null 2>&1; then
        success "Database restored successfully from $backup_file"
        return 0
    else
        error "Failed to restore database"
        return 1
    fi
}

list_backups() {
    log "Available backups:"
    echo ""
    echo "Local backups:"
    ls -lh "$BACKUP_DIR"/aria_backup_*.sql.enc 2>/dev/null || echo "  No local backups found"
    echo ""
    echo "Offsite backups:"
    ls -lh "$OFFSITE_DIR"/aria_backup_*.sql.enc 2>/dev/null || echo "  No offsite backups found (or not mounted)"
}

case "${1:-backup}" in
    backup)
        perform_backup
        ;;
    restore)
        restore_backup "$2"
        ;;
    list)
        list_backups
        ;;
    test)
        if [ -z "$2" ]; then
            error "No backup file specified for testing"
            echo "Usage: $0 test <encrypted_backup_file>"
            exit 1
        fi
        test_restore "$2"
        ;;
    *)
        echo "Usage: $0 {backup|restore|list|test} [backup_file]"
        echo ""
        echo "Commands:"
        echo "  backup          - Perform a full backup (default)"
        echo "  restore <file>  - Restore from encrypted backup file"
        echo "  list            - List available backups"
        echo "  test <file>     - Test restore capability of a backup"
        exit 1
        ;;
esac
