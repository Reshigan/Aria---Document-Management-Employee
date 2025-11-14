#!/bin/bash
# Automated Database Backup Script for Aria ERP
# Run this script daily via cron: 0 2 * * * /var/www/aria/backend/scripts/automated_backup.sh

# Configuration
DB_NAME="aria_erp"
DB_USER="aria_user"
DB_PASSWORD="AriaSecure2025!"
BACKUP_DIR="/var/backups/aria_erp"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/aria_erp_$DATE.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
echo "Starting backup of $DB_NAME at $(date)"
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"
    
    # Remove old backups
    find $BACKUP_DIR -name "aria_erp_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Old backups removed (older than $RETENTION_DAYS days)"
else
    echo "Backup failed!"
    exit 1
fi

# Optional: Upload to cloud storage (uncomment and configure)
# aws s3 cp $BACKUP_FILE s3://your-bucket/backups/
# gsutil cp $BACKUP_FILE gs://your-bucket/backups/

echo "Backup process completed at $(date)"
