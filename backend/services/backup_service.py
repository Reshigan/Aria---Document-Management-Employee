"""
Backup and Restore Service
Handles database backups, restore operations, and disaster recovery
"""
import os
import shutil
import gzip
import tarfile
import subprocess
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import logging
import json
from pathlib import Path
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class BackupService:
    """Service for database backup and restore operations"""
    
    def __init__(
        self,
        backup_dir: str = "/var/backups/aria",
        db_host: str = "localhost",
        db_port: int = 5432,
        db_name: str = "aria_db",
        db_user: str = "postgres",
        db_password: str = "",
        s3_bucket: Optional[str] = None,
        s3_region: Optional[str] = "us-east-1"
    ):
        """
        Initialize backup service
        
        Args:
            backup_dir: Local directory for backups
            db_host: Database host
            db_port: Database port
            db_name: Database name
            db_user: Database user
            db_password: Database password
            s3_bucket: Optional S3 bucket for remote backups
            s3_region: AWS region for S3
        """
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        self.db_host = db_host
        self.db_port = db_port
        self.db_name = db_name
        self.db_user = db_user
        self.db_password = db_password
        
        self.s3_bucket = s3_bucket
        self.s3_region = s3_region
        
        if s3_bucket:
            self.s3_client = boto3.client('s3', region_name=s3_region)
        else:
            self.s3_client = None
        
        # Backup metadata file
        self.metadata_file = self.backup_dir / "backup_metadata.json"
        self.metadata = self._load_metadata()
    
    # ==================== Backup Operations ====================
    
    def create_backup(
        self,
        backup_type: str = "full",
        compress: bool = True,
        upload_to_s3: bool = True,
        retention_days: int = 30
    ) -> Dict[str, Any]:
        """
        Create a database backup
        
        Args:
            backup_type: Type of backup (full, incremental, differential)
            compress: Whether to compress the backup
            upload_to_s3: Whether to upload to S3
            retention_days: Number of days to retain backup
            
        Returns:
            Dictionary with backup information
        """
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_name = f"{self.db_name}_{backup_type}_{timestamp}"
            
            # Create backup file path
            backup_file = self.backup_dir / f"{backup_name}.sql"
            compressed_file = self.backup_dir / f"{backup_name}.sql.gz"
            
            logger.info(f"Creating {backup_type} backup: {backup_name}")
            
            # Perform database backup using pg_dump
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password
            
            dump_command = [
                'pg_dump',
                '-h', self.db_host,
                '-p', str(self.db_port),
                '-U', self.db_user,
                '-d', self.db_name,
                '-F', 'p',  # Plain text format
                '-f', str(backup_file)
            ]
            
            # Add options based on backup type
            if backup_type == "schema_only":
                dump_command.append('--schema-only')
            elif backup_type == "data_only":
                dump_command.append('--data-only')
            
            # Execute backup
            result = subprocess.run(
                dump_command,
                env=env,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"Backup failed: {result.stderr}")
            
            # Get backup file size
            backup_size = backup_file.stat().st_size
            
            # Compress if requested
            if compress:
                logger.info("Compressing backup...")
                with open(backup_file, 'rb') as f_in:
                    with gzip.open(compressed_file, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                # Remove uncompressed file
                backup_file.unlink()
                final_file = compressed_file
                compressed_size = compressed_file.stat().st_size
            else:
                final_file = backup_file
                compressed_size = backup_size
            
            # Upload to S3 if requested
            s3_location = None
            if upload_to_s3 and self.s3_client:
                logger.info("Uploading backup to S3...")
                s3_location = self._upload_to_s3(final_file, backup_name)
            
            # Calculate expiration date
            expires_at = datetime.utcnow() + timedelta(days=retention_days)
            
            # Save backup metadata
            backup_info = {
                "backup_id": backup_name,
                "backup_type": backup_type,
                "database_name": self.db_name,
                "created_at": datetime.utcnow().isoformat(),
                "expires_at": expires_at.isoformat(),
                "file_path": str(final_file),
                "file_size": backup_size,
                "compressed_size": compressed_size,
                "compressed": compress,
                "s3_location": s3_location,
                "status": "completed"
            }
            
            self._save_backup_metadata(backup_info)
            
            logger.info(f"Backup completed successfully: {backup_name}")
            return backup_info
            
        except Exception as e:
            logger.error(f"Backup error: {str(e)}")
            raise
    
    def create_automated_backup(self) -> Dict[str, Any]:
        """
        Create automated daily backup
        
        Returns:
            Backup information
        """
        return self.create_backup(
            backup_type="full",
            compress=True,
            upload_to_s3=True,
            retention_days=30
        )
    
    # ==================== Restore Operations ====================
    
    def restore_backup(
        self,
        backup_id: Optional[str] = None,
        backup_file: Optional[str] = None,
        from_s3: bool = False
    ) -> Dict[str, Any]:
        """
        Restore database from backup
        
        Args:
            backup_id: ID of backup to restore
            backup_file: Path to backup file
            from_s3: Whether to download from S3
            
        Returns:
            Restore information
        """
        try:
            # Get backup file
            if backup_id:
                backup_meta = self._get_backup_metadata(backup_id)
                if not backup_meta:
                    raise ValueError(f"Backup {backup_id} not found")
                
                if from_s3 and backup_meta.get('s3_location'):
                    backup_file = self._download_from_s3(backup_meta['s3_location'])
                else:
                    backup_file = backup_meta['file_path']
            
            if not backup_file or not os.path.exists(backup_file):
                raise ValueError("Backup file not found")
            
            logger.info(f"Restoring database from backup: {backup_file}")
            
            # Decompress if needed
            if backup_file.endswith('.gz'):
                logger.info("Decompressing backup...")
                uncompressed_file = backup_file[:-3]
                with gzip.open(backup_file, 'rb') as f_in:
                    with open(uncompressed_file, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                restore_file = uncompressed_file
            else:
                restore_file = backup_file
            
            # Perform restore using psql
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password
            
            restore_command = [
                'psql',
                '-h', self.db_host,
                '-p', str(self.db_port),
                '-U', self.db_user,
                '-d', self.db_name,
                '-f', restore_file
            ]
            
            result = subprocess.run(
                restore_command,
                env=env,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"Restore failed: {result.stderr}")
            
            # Clean up decompressed file if created
            if backup_file.endswith('.gz') and os.path.exists(uncompressed_file):
                os.remove(uncompressed_file)
            
            restore_info = {
                "restored_at": datetime.utcnow().isoformat(),
                "backup_file": backup_file,
                "database_name": self.db_name,
                "status": "completed"
            }
            
            logger.info("Restore completed successfully")
            return restore_info
            
        except Exception as e:
            logger.error(f"Restore error: {str(e)}")
            raise
    
    # ==================== Backup Management ====================
    
    def list_backups(
        self,
        backup_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        List available backups
        
        Args:
            backup_type: Filter by backup type
            limit: Maximum number of backups to return
            
        Returns:
            List of backup information
        """
        backups = self.metadata.get('backups', [])
        
        if backup_type:
            backups = [b for b in backups if b['backup_type'] == backup_type]
        
        # Sort by creation date (newest first)
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        
        return backups[:limit]
    
    def delete_backup(self, backup_id: str, delete_from_s3: bool = True) -> bool:
        """
        Delete a backup
        
        Args:
            backup_id: ID of backup to delete
            delete_from_s3: Whether to delete from S3 as well
            
        Returns:
            True if successful
        """
        try:
            backup_meta = self._get_backup_metadata(backup_id)
            if not backup_meta:
                raise ValueError(f"Backup {backup_id} not found")
            
            # Delete local file
            backup_file = Path(backup_meta['file_path'])
            if backup_file.exists():
                backup_file.unlink()
                logger.info(f"Deleted local backup file: {backup_file}")
            
            # Delete from S3
            if delete_from_s3 and backup_meta.get('s3_location') and self.s3_client:
                self._delete_from_s3(backup_meta['s3_location'])
            
            # Remove from metadata
            self.metadata['backups'] = [
                b for b in self.metadata['backups'] 
                if b['backup_id'] != backup_id
            ]
            self._save_metadata()
            
            logger.info(f"Deleted backup: {backup_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting backup: {str(e)}")
            raise
    
    def cleanup_expired_backups(self) -> Dict[str, Any]:
        """
        Clean up expired backups
        
        Returns:
            Cleanup summary
        """
        now = datetime.utcnow()
        deleted_count = 0
        errors = []
        
        for backup in self.metadata.get('backups', []):
            try:
                expires_at = datetime.fromisoformat(backup['expires_at'])
                if expires_at < now:
                    self.delete_backup(backup['backup_id'])
                    deleted_count += 1
            except Exception as e:
                errors.append({
                    "backup_id": backup['backup_id'],
                    "error": str(e)
                })
        
        return {
            "deleted_count": deleted_count,
            "errors": errors,
            "cleaned_at": now.isoformat()
        }
    
    def get_backup_status(self) -> Dict[str, Any]:
        """
        Get backup system status
        
        Returns:
            Backup system status
        """
        backups = self.metadata.get('backups', [])
        total_size = sum(b.get('compressed_size', 0) for b in backups)
        
        # Get latest backup
        latest_backup = None
        if backups:
            latest_backup = max(backups, key=lambda x: x['created_at'])
        
        return {
            "total_backups": len(backups),
            "total_size_bytes": total_size,
            "total_size_gb": round(total_size / (1024**3), 2),
            "latest_backup": latest_backup,
            "backup_location": str(self.backup_dir),
            "s3_bucket": self.s3_bucket,
            "s3_enabled": self.s3_client is not None
        }
    
    # ==================== S3 Operations ====================
    
    def _upload_to_s3(self, file_path: Path, backup_name: str) -> str:
        """Upload backup to S3"""
        try:
            s3_key = f"backups/{backup_name}{file_path.suffix}"
            
            self.s3_client.upload_file(
                str(file_path),
                self.s3_bucket,
                s3_key
            )
            
            logger.info(f"Uploaded to S3: s3://{self.s3_bucket}/{s3_key}")
            return f"s3://{self.s3_bucket}/{s3_key}"
            
        except ClientError as e:
            logger.error(f"S3 upload error: {str(e)}")
            raise
    
    def _download_from_s3(self, s3_location: str) -> str:
        """Download backup from S3"""
        try:
            # Parse S3 location
            parts = s3_location.replace('s3://', '').split('/', 1)
            bucket = parts[0]
            key = parts[1]
            
            # Download to local file
            filename = Path(key).name
            local_file = self.backup_dir / filename
            
            self.s3_client.download_file(bucket, key, str(local_file))
            
            logger.info(f"Downloaded from S3: {local_file}")
            return str(local_file)
            
        except ClientError as e:
            logger.error(f"S3 download error: {str(e)}")
            raise
    
    def _delete_from_s3(self, s3_location: str):
        """Delete backup from S3"""
        try:
            parts = s3_location.replace('s3://', '').split('/', 1)
            bucket = parts[0]
            key = parts[1]
            
            self.s3_client.delete_object(Bucket=bucket, Key=key)
            logger.info(f"Deleted from S3: {s3_location}")
            
        except ClientError as e:
            logger.error(f"S3 delete error: {str(e)}")
            raise
    
    # ==================== Metadata Management ====================
    
    def _load_metadata(self) -> Dict[str, Any]:
        """Load backup metadata"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        return {"backups": []}
    
    def _save_metadata(self):
        """Save backup metadata"""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def _save_backup_metadata(self, backup_info: Dict[str, Any]):
        """Add backup to metadata"""
        if 'backups' not in self.metadata:
            self.metadata['backups'] = []
        
        self.metadata['backups'].append(backup_info)
        self._save_metadata()
    
    def _get_backup_metadata(self, backup_id: str) -> Optional[Dict[str, Any]]:
        """Get backup metadata by ID"""
        for backup in self.metadata.get('backups', []):
            if backup['backup_id'] == backup_id:
                return backup
        return None


# ==================== Backup Scheduler ====================

class BackupScheduler:
    """Scheduler for automated backups"""
    
    def __init__(self, backup_service: BackupService):
        self.backup_service = backup_service
        self.schedules = {
            "daily": {"hour": 2, "minute": 0},  # 2 AM daily
            "weekly": {"day": 0, "hour": 3, "minute": 0},  # Sunday 3 AM
            "monthly": {"day": 1, "hour": 4, "minute": 0}  # 1st of month 4 AM
        }
    
    def should_run_backup(self, schedule_type: str) -> bool:
        """
        Check if backup should run based on schedule
        
        Args:
            schedule_type: Type of schedule (daily, weekly, monthly)
            
        Returns:
            True if backup should run
        """
        now = datetime.utcnow()
        schedule = self.schedules.get(schedule_type)
        
        if not schedule:
            return False
        
        if schedule_type == "daily":
            return now.hour == schedule["hour"] and now.minute == schedule["minute"]
        elif schedule_type == "weekly":
            return (now.weekday() == schedule["day"] and 
                    now.hour == schedule["hour"] and 
                    now.minute == schedule["minute"])
        elif schedule_type == "monthly":
            return (now.day == schedule["day"] and 
                    now.hour == schedule["hour"] and 
                    now.minute == schedule["minute"])
        
        return False
    
    def run_scheduled_backups(self):
        """Run scheduled backups"""
        logger.info("Checking scheduled backups...")
        
        # Daily backup
        if self.should_run_backup("daily"):
            logger.info("Running daily backup...")
            self.backup_service.create_backup(
                backup_type="full",
                retention_days=7
            )
        
        # Weekly backup
        if self.should_run_backup("weekly"):
            logger.info("Running weekly backup...")
            self.backup_service.create_backup(
                backup_type="full",
                retention_days=30
            )
        
        # Monthly backup
        if self.should_run_backup("monthly"):
            logger.info("Running monthly backup...")
            self.backup_service.create_backup(
                backup_type="full",
                retention_days=365
            )
        
        # Cleanup expired backups
        self.backup_service.cleanup_expired_backups()
