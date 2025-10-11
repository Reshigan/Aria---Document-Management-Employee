#!/usr/bin/env python3
"""
Database Backup Utility for ARIA Document Management System
"""
import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseBackup:
    def __init__(self, db_path="aria.db", backup_dir="backups"):
        self.db_path = Path(db_path)
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
    
    def create_backup(self):
        """Create a backup of the database"""
        try:
            if not self.db_path.exists():
                logger.error(f"Database file not found: {self.db_path}")
                return False
            
            # Generate backup filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"aria_backup_{timestamp}.db"
            backup_path = self.backup_dir / backup_filename
            
            # Copy database file
            shutil.copy2(self.db_path, backup_path)
            
            # Create metadata file
            metadata = {
                "backup_time": datetime.now().isoformat(),
                "original_db": str(self.db_path),
                "backup_file": str(backup_path),
                "file_size": backup_path.stat().st_size
            }
            
            metadata_path = self.backup_dir / f"aria_backup_{timestamp}.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Database backup created: {backup_path}")
            logger.info(f"Backup size: {backup_path.stat().st_size} bytes")
            
            return True
            
        except Exception as e:
            logger.error(f"Backup failed: {str(e)}")
            return False
    
    def list_backups(self):
        """List all available backups"""
        backups = []
        for backup_file in self.backup_dir.glob("aria_backup_*.db"):
            metadata_file = backup_file.with_suffix('.json')
            
            backup_info = {
                "filename": backup_file.name,
                "path": str(backup_file),
                "size": backup_file.stat().st_size,
                "created": datetime.fromtimestamp(backup_file.stat().st_mtime).isoformat()
            }
            
            # Add metadata if available
            if metadata_file.exists():
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                        backup_info.update(metadata)
                except Exception as e:
                    logger.warning(f"Could not read metadata for {backup_file}: {e}")
            
            backups.append(backup_info)
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x['created'], reverse=True)
        return backups
    
    def restore_backup(self, backup_filename):
        """Restore database from backup"""
        try:
            backup_path = self.backup_dir / backup_filename
            
            if not backup_path.exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            # Create backup of current database before restore
            if self.db_path.exists():
                current_backup = f"pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
                shutil.copy2(self.db_path, self.backup_dir / current_backup)
                logger.info(f"Current database backed up as: {current_backup}")
            
            # Restore from backup
            shutil.copy2(backup_path, self.db_path)
            
            logger.info(f"Database restored from: {backup_filename}")
            return True
            
        except Exception as e:
            logger.error(f"Restore failed: {str(e)}")
            return False
    
    def cleanup_old_backups(self, keep_count=10):
        """Remove old backups, keeping only the specified number"""
        try:
            backups = self.list_backups()
            
            if len(backups) <= keep_count:
                logger.info(f"Only {len(backups)} backups found, no cleanup needed")
                return
            
            # Remove oldest backups
            backups_to_remove = backups[keep_count:]
            
            for backup in backups_to_remove:
                backup_path = Path(backup['path'])
                metadata_path = backup_path.with_suffix('.json')
                
                # Remove backup file
                if backup_path.exists():
                    backup_path.unlink()
                    logger.info(f"Removed old backup: {backup_path.name}")
                
                # Remove metadata file
                if metadata_path.exists():
                    metadata_path.unlink()
            
            logger.info(f"Cleanup completed. Kept {keep_count} most recent backups")
            
        except Exception as e:
            logger.error(f"Cleanup failed: {str(e)}")
    
    def verify_backup(self, backup_filename):
        """Verify backup integrity"""
        try:
            backup_path = self.backup_dir / backup_filename
            
            if not backup_path.exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            # Try to open and query the backup database
            conn = sqlite3.connect(backup_path)
            cursor = conn.cursor()
            
            # Check if main tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            expected_tables = ['users', 'documents', 'chat_history']
            missing_tables = [table for table in expected_tables if table not in tables]
            
            if missing_tables:
                logger.warning(f"Missing tables in backup: {missing_tables}")
            
            # Check record counts
            for table in ['users', 'documents']:
                if table in tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    logger.info(f"Table {table}: {count} records")
            
            conn.close()
            logger.info(f"Backup verification completed: {backup_filename}")
            return True
            
        except Exception as e:
            logger.error(f"Backup verification failed: {str(e)}")
            return False

def main():
    """Command line interface for backup utility"""
    import argparse
    
    parser = argparse.ArgumentParser(description="ARIA Database Backup Utility")
    parser.add_argument("action", choices=["backup", "list", "restore", "cleanup", "verify"],
                       help="Action to perform")
    parser.add_argument("--file", help="Backup filename for restore/verify operations")
    parser.add_argument("--keep", type=int, default=10, help="Number of backups to keep during cleanup")
    parser.add_argument("--db-path", default="aria.db", help="Path to database file")
    parser.add_argument("--backup-dir", default="backups", help="Backup directory")
    
    args = parser.parse_args()
    
    backup_util = DatabaseBackup(args.db_path, args.backup_dir)
    
    if args.action == "backup":
        success = backup_util.create_backup()
        exit(0 if success else 1)
    
    elif args.action == "list":
        backups = backup_util.list_backups()
        if backups:
            print(f"Found {len(backups)} backups:")
            for backup in backups:
                print(f"  {backup['filename']} - {backup['created']} ({backup['size']} bytes)")
        else:
            print("No backups found")
    
    elif args.action == "restore":
        if not args.file:
            print("Error: --file parameter required for restore")
            exit(1)
        success = backup_util.restore_backup(args.file)
        exit(0 if success else 1)
    
    elif args.action == "cleanup":
        backup_util.cleanup_old_backups(args.keep)
    
    elif args.action == "verify":
        if not args.file:
            print("Error: --file parameter required for verify")
            exit(1)
        success = backup_util.verify_backup(args.file)
        exit(0 if success else 1)

if __name__ == "__main__":
    main()