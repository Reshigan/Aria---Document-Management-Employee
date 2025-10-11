import os
import shutil
import gzip
import tarfile
import zipfile
import hashlib
import json
import sqlite3
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from app.models.backup_recovery import (
    BackupJob, BackupFile, RestoreJob, BackupSchedule, 
    BackupStorage, BackupVerification, BackupAlert, BackupMetrics
)
from app.services.cache_service import cache_service, monitor_performance
import threading
import time

class BackupRecoveryService:
    def __init__(self, db: Session, backup_root: str = "/tmp/aria_backups"):
        self.db = db
        self.backup_root = Path(backup_root)
        self.backup_root.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.backup_root / "database").mkdir(exist_ok=True)
        (self.backup_root / "files").mkdir(exist_ok=True)
        (self.backup_root / "system").mkdir(exist_ok=True)
        (self.backup_root / "temp").mkdir(exist_ok=True)

    # Backup Operations
    @monitor_performance
    def create_backup_job(self, job_name: str, job_type: str, backup_scope: str,
                         created_by: int, **config) -> BackupJob:
        """Create a new backup job"""
        backup_path = self.backup_root / backup_scope / f"{job_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_path.mkdir(parents=True, exist_ok=True)
        
        backup_job = BackupJob(
            job_name=job_name,
            job_type=job_type,
            backup_scope=backup_scope,
            backup_path=str(backup_path),
            compression_enabled=config.get('compression_enabled', True),
            encryption_enabled=config.get('encryption_enabled', True),
            retention_days=config.get('retention_days', 30),
            max_backups=config.get('max_backups', 10),
            created_by=created_by
        )
        
        self.db.add(backup_job)
        self.db.commit()
        self.db.refresh(backup_job)
        
        return backup_job

    @monitor_performance
    def start_backup(self, backup_job_id: int) -> bool:
        """Start executing a backup job"""
        backup_job = self.db.query(BackupJob).filter(BackupJob.id == backup_job_id).first()
        if not backup_job:
            return False
        
        # Update job status
        backup_job.status = 'running'
        backup_job.started_at = datetime.utcnow()
        backup_job.progress_percentage = 0.0
        self.db.commit()
        
        # Start backup in background thread
        backup_thread = threading.Thread(target=self._execute_backup, args=(backup_job,))
        backup_thread.daemon = True
        backup_thread.start()
        
        return True

    def _execute_backup(self, backup_job: BackupJob):
        """Execute backup job in background"""
        try:
            start_time = time.time()
            
            if backup_job.backup_scope == 'database':
                self._backup_database(backup_job)
            elif backup_job.backup_scope == 'files':
                self._backup_files(backup_job)
            elif backup_job.backup_scope == 'system':
                self._backup_system(backup_job)
            elif backup_job.backup_scope == 'all':
                self._backup_all(backup_job)
            
            # Calculate metrics
            end_time = time.time()
            backup_job.backup_duration = end_time - start_time
            backup_job.status = 'completed'
            backup_job.completed_at = datetime.utcnow()
            backup_job.progress_percentage = 100.0
            
            # Calculate compression ratio
            if backup_job.total_size > 0:
                backup_job.compression_ratio = (backup_job.total_size - backup_job.compressed_size) / backup_job.total_size
            
            self.db.commit()
            
            # Create success alert
            self._create_alert('success', 'info', f'Backup completed: {backup_job.job_name}',
                             f'Backup job completed successfully in {backup_job.backup_duration:.2f} seconds',
                             backup_job_id=backup_job.id)
            
            # Schedule verification
            self._schedule_verification(backup_job)
            
        except Exception as e:
            backup_job.status = 'failed'
            backup_job.error_message = str(e)
            backup_job.completed_at = datetime.utcnow()
            self.db.commit()
            
            # Create failure alert
            self._create_alert('failure', 'error', f'Backup failed: {backup_job.job_name}',
                             f'Backup job failed with error: {str(e)}',
                             backup_job_id=backup_job.id)

    def _backup_database(self, backup_job: BackupJob):
        """Backup database"""
        backup_job.current_operation = 'Backing up database'
        self.db.commit()
        
        # Get database path
        db_path = os.path.join(os.path.dirname(__file__), '..', 'aria_document_management.db')
        
        if os.path.exists(db_path):
            # Create backup file
            backup_file_path = Path(backup_job.backup_path) / 'database.db'
            
            # Copy database file
            shutil.copy2(db_path, backup_file_path)
            
            # Compress if enabled
            if backup_job.compression_enabled:
                compressed_path = backup_file_path.with_suffix('.db.gz')
                with open(backup_file_path, 'rb') as f_in:
                    with gzip.open(compressed_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                os.remove(backup_file_path)
                backup_file_path = compressed_path
            
            # Calculate sizes and hash
            original_size = os.path.getsize(db_path)
            compressed_size = os.path.getsize(backup_file_path)
            file_hash = self._calculate_file_hash(backup_file_path)
            
            # Create backup file record
            backup_file = BackupFile(
                backup_job_id=backup_job.id,
                file_name='database.db' + ('.gz' if backup_job.compression_enabled else ''),
                file_path=str(backup_file_path),
                file_type='database',
                original_size=original_size,
                compressed_size=compressed_size,
                file_hash=file_hash,
                compression_method='gzip' if backup_job.compression_enabled else 'none',
                storage_backend='local',
                storage_path=str(backup_file_path),
                checksum=file_hash,
                is_verified=True,
                verification_date=datetime.utcnow()
            )
            
            self.db.add(backup_file)
            
            # Update job metrics
            backup_job.total_size = original_size
            backup_job.compressed_size = compressed_size
            backup_job.file_count = 1
            backup_job.progress_percentage = 100.0
            
            self.db.commit()

    def _backup_files(self, backup_job: BackupJob):
        """Backup files"""
        backup_job.current_operation = 'Backing up files'
        self.db.commit()
        
        # Define source directories to backup
        source_dirs = [
            '/tmp/aria_files',  # File storage
            '/tmp/aria_uploads',  # Upload directory
        ]
        
        total_files = 0
        total_size = 0
        compressed_size = 0
        
        for source_dir in source_dirs:
            if os.path.exists(source_dir):
                # Create tar archive
                archive_name = f"files_{Path(source_dir).name}.tar"
                if backup_job.compression_enabled:
                    archive_name += ".gz"
                
                archive_path = Path(backup_job.backup_path) / archive_name
                
                # Create archive
                mode = 'w:gz' if backup_job.compression_enabled else 'w'
                with tarfile.open(archive_path, mode) as tar:
                    tar.add(source_dir, arcname=Path(source_dir).name)
                
                # Calculate metrics
                dir_size = self._get_directory_size(source_dir)
                archive_size = os.path.getsize(archive_path)
                file_count = self._count_files_in_directory(source_dir)
                
                total_size += dir_size
                compressed_size += archive_size
                total_files += file_count
                
                # Create backup file record
                backup_file = BackupFile(
                    backup_job_id=backup_job.id,
                    file_name=archive_name,
                    file_path=str(archive_path),
                    file_type='files',
                    original_size=dir_size,
                    compressed_size=archive_size,
                    file_hash=self._calculate_file_hash(archive_path),
                    compression_method='gzip' if backup_job.compression_enabled else 'none',
                    storage_backend='local',
                    storage_path=str(archive_path),
                    checksum=self._calculate_file_hash(archive_path)
                )
                
                self.db.add(backup_file)
        
        # Update job metrics
        backup_job.total_size = total_size
        backup_job.compressed_size = compressed_size
        backup_job.file_count = total_files
        backup_job.progress_percentage = 100.0
        
        self.db.commit()

    def _backup_system(self, backup_job: BackupJob):
        """Backup system configuration"""
        backup_job.current_operation = 'Backing up system configuration'
        self.db.commit()
        
        # Create system config backup
        config_data = {
            'backup_timestamp': datetime.utcnow().isoformat(),
            'system_info': {
                'python_version': '3.9+',
                'database_version': 'SQLite',
                'application_version': '1.0.0'
            },
            'configuration': {
                'backup_settings': {
                    'retention_days': backup_job.retention_days,
                    'compression_enabled': backup_job.compression_enabled,
                    'encryption_enabled': backup_job.encryption_enabled
                }
            }
        }
        
        config_file_path = Path(backup_job.backup_path) / 'system_config.json'
        with open(config_file_path, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        # Compress if enabled
        if backup_job.compression_enabled:
            compressed_path = config_file_path.with_suffix('.json.gz')
            with open(config_file_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            os.remove(config_file_path)
            config_file_path = compressed_path
        
        # Calculate metrics
        file_size = os.path.getsize(config_file_path)
        
        # Create backup file record
        backup_file = BackupFile(
            backup_job_id=backup_job.id,
            file_name=config_file_path.name,
            file_path=str(config_file_path),
            file_type='system',
            original_size=file_size,
            compressed_size=file_size,
            file_hash=self._calculate_file_hash(config_file_path),
            compression_method='gzip' if backup_job.compression_enabled else 'none',
            storage_backend='local',
            storage_path=str(config_file_path),
            checksum=self._calculate_file_hash(config_file_path)
        )
        
        self.db.add(backup_file)
        
        # Update job metrics
        backup_job.total_size = file_size
        backup_job.compressed_size = file_size
        backup_job.file_count = 1
        backup_job.progress_percentage = 100.0
        
        self.db.commit()

    def _backup_all(self, backup_job: BackupJob):
        """Backup everything"""
        backup_job.current_operation = 'Backing up all components'
        self.db.commit()
        
        # Backup database
        backup_job.progress_percentage = 10.0
        self.db.commit()
        self._backup_database(backup_job)
        
        # Backup files
        backup_job.progress_percentage = 50.0
        self.db.commit()
        self._backup_files(backup_job)
        
        # Backup system
        backup_job.progress_percentage = 90.0
        self.db.commit()
        self._backup_system(backup_job)
        
        backup_job.progress_percentage = 100.0
        self.db.commit()

    # Restore Operations
    @monitor_performance
    def create_restore_job(self, backup_job_id: int, restore_name: str, 
                          restore_type: str, restore_scope: str, created_by: int,
                          **config) -> RestoreJob:
        """Create a new restore job"""
        restore_job = RestoreJob(
            backup_job_id=backup_job_id,
            restore_name=restore_name,
            restore_type=restore_type,
            restore_scope=restore_scope,
            restore_path=config.get('restore_path'),
            overwrite_existing=config.get('overwrite_existing', False),
            restore_permissions=config.get('restore_permissions', True),
            target_timestamp=config.get('target_timestamp'),
            validation_enabled=config.get('validation_enabled', True),
            created_by=created_by
        )
        
        self.db.add(restore_job)
        self.db.commit()
        self.db.refresh(restore_job)
        
        return restore_job

    @monitor_performance
    def start_restore(self, restore_job_id: int) -> bool:
        """Start executing a restore job"""
        restore_job = self.db.query(RestoreJob).filter(RestoreJob.id == restore_job_id).first()
        if not restore_job:
            return False
        
        # Update job status
        restore_job.status = 'running'
        restore_job.started_at = datetime.utcnow()
        restore_job.progress_percentage = 0.0
        self.db.commit()
        
        # Start restore in background thread
        restore_thread = threading.Thread(target=self._execute_restore, args=(restore_job,))
        restore_thread.daemon = True
        restore_thread.start()
        
        return True

    def _execute_restore(self, restore_job: RestoreJob):
        """Execute restore job in background"""
        try:
            start_time = time.time()
            
            backup_job = self.db.query(BackupJob).filter(BackupJob.id == restore_job.backup_job_id).first()
            if not backup_job:
                raise Exception("Backup job not found")
            
            if restore_job.restore_scope == 'database':
                self._restore_database(restore_job, backup_job)
            elif restore_job.restore_scope == 'files':
                self._restore_files(restore_job, backup_job)
            elif restore_job.restore_scope == 'system':
                self._restore_system(restore_job, backup_job)
            elif restore_job.restore_scope == 'all':
                self._restore_all(restore_job, backup_job)
            
            # Calculate metrics
            end_time = time.time()
            restore_job.restore_duration = end_time - start_time
            restore_job.status = 'completed'
            restore_job.completed_at = datetime.utcnow()
            restore_job.progress_percentage = 100.0
            
            # Validate if enabled
            if restore_job.validation_enabled:
                self._validate_restore(restore_job)
            
            self.db.commit()
            
            # Create success alert
            self._create_alert('success', 'info', f'Restore completed: {restore_job.restore_name}',
                             f'Restore job completed successfully in {restore_job.restore_duration:.2f} seconds',
                             restore_job_id=restore_job.id)
            
        except Exception as e:
            restore_job.status = 'failed'
            restore_job.error_message = str(e)
            restore_job.completed_at = datetime.utcnow()
            self.db.commit()
            
            # Create failure alert
            self._create_alert('failure', 'error', f'Restore failed: {restore_job.restore_name}',
                             f'Restore job failed with error: {str(e)}',
                             restore_job_id=restore_job.id)

    def _restore_database(self, restore_job: RestoreJob, backup_job: BackupJob):
        """Restore database from backup"""
        restore_job.current_operation = 'Restoring database'
        self.db.commit()
        
        # Find database backup file
        db_backup_file = self.db.query(BackupFile).filter(
            and_(BackupFile.backup_job_id == backup_job.id, BackupFile.file_type == 'database')
        ).first()
        
        if not db_backup_file:
            raise Exception("Database backup file not found")
        
        # Determine restore path
        if restore_job.restore_path:
            restore_path = Path(restore_job.restore_path) / 'database.db'
        else:
            restore_path = Path('/tmp/aria_restored_database.db')
        
        restore_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Decompress if needed
        backup_file_path = Path(db_backup_file.file_path)
        if backup_file_path.suffix == '.gz':
            with gzip.open(backup_file_path, 'rb') as f_in:
                with open(restore_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        else:
            shutil.copy2(backup_file_path, restore_path)
        
        restore_job.files_restored = 1
        restore_job.data_restored = os.path.getsize(restore_path)
        restore_job.progress_percentage = 100.0
        
        self.db.commit()

    def _restore_files(self, restore_job: RestoreJob, backup_job: BackupJob):
        """Restore files from backup"""
        restore_job.current_operation = 'Restoring files'
        self.db.commit()
        
        # Find file backup files
        file_backup_files = self.db.query(BackupFile).filter(
            and_(BackupFile.backup_job_id == backup_job.id, BackupFile.file_type == 'files')
        ).all()
        
        if not file_backup_files:
            raise Exception("File backup files not found")
        
        total_restored = 0
        files_restored = 0
        
        for backup_file in file_backup_files:
            # Determine restore path
            if restore_job.restore_path:
                extract_path = Path(restore_job.restore_path)
            else:
                extract_path = Path('/tmp/aria_restored_files')
            
            extract_path.mkdir(parents=True, exist_ok=True)
            
            # Extract archive
            backup_file_path = Path(backup_file.file_path)
            if backup_file_path.suffix == '.gz':
                mode = 'r:gz'
            else:
                mode = 'r'
            
            with tarfile.open(backup_file_path, mode) as tar:
                tar.extractall(extract_path)
            
            total_restored += backup_file.original_size
            files_restored += 1
        
        restore_job.files_restored = files_restored
        restore_job.data_restored = total_restored
        restore_job.progress_percentage = 100.0
        
        self.db.commit()

    def _restore_system(self, restore_job: RestoreJob, backup_job: BackupJob):
        """Restore system configuration from backup"""
        restore_job.current_operation = 'Restoring system configuration'
        self.db.commit()
        
        # Find system backup file
        system_backup_file = self.db.query(BackupFile).filter(
            and_(BackupFile.backup_job_id == backup_job.id, BackupFile.file_type == 'system')
        ).first()
        
        if not system_backup_file:
            raise Exception("System backup file not found")
        
        # Determine restore path
        if restore_job.restore_path:
            restore_path = Path(restore_job.restore_path) / 'system_config.json'
        else:
            restore_path = Path('/tmp/aria_restored_config.json')
        
        restore_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Decompress if needed
        backup_file_path = Path(system_backup_file.file_path)
        if backup_file_path.suffix == '.gz':
            with gzip.open(backup_file_path, 'rb') as f_in:
                with open(restore_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        else:
            shutil.copy2(backup_file_path, restore_path)
        
        restore_job.files_restored = 1
        restore_job.data_restored = os.path.getsize(restore_path)
        restore_job.progress_percentage = 100.0
        
        self.db.commit()

    def _restore_all(self, restore_job: RestoreJob, backup_job: BackupJob):
        """Restore all components from backup"""
        restore_job.current_operation = 'Restoring all components'
        self.db.commit()
        
        # Restore database
        restore_job.progress_percentage = 10.0
        self.db.commit()
        self._restore_database(restore_job, backup_job)
        
        # Restore files
        restore_job.progress_percentage = 50.0
        self.db.commit()
        self._restore_files(restore_job, backup_job)
        
        # Restore system
        restore_job.progress_percentage = 90.0
        self.db.commit()
        self._restore_system(restore_job, backup_job)
        
        restore_job.progress_percentage = 100.0
        self.db.commit()

    # Verification and Validation
    def _schedule_verification(self, backup_job: BackupJob):
        """Schedule backup verification"""
        verification = BackupVerification(
            backup_job_id=backup_job.id,
            verification_type='checksum',
            verification_scope='full',
            status='pending'
        )
        
        self.db.add(verification)
        self.db.commit()
        
        # Start verification in background
        verify_thread = threading.Thread(target=self._execute_verification, args=(verification,))
        verify_thread.daemon = True
        verify_thread.start()

    def _execute_verification(self, verification: BackupVerification):
        """Execute backup verification"""
        try:
            verification.status = 'running'
            verification.started_at = datetime.utcnow()
            self.db.commit()
            
            backup_files = self.db.query(BackupFile).filter(
                BackupFile.backup_job_id == verification.backup_job_id
            ).all()
            
            files_verified = 0
            files_failed = 0
            
            for backup_file in backup_files:
                if os.path.exists(backup_file.file_path):
                    # Verify checksum
                    current_hash = self._calculate_file_hash(Path(backup_file.file_path))
                    if current_hash == backup_file.checksum:
                        files_verified += 1
                    else:
                        files_failed += 1
                else:
                    files_failed += 1
            
            verification.files_verified = files_verified
            verification.files_failed = files_failed
            verification.checksum_matches = files_verified
            verification.checksum_mismatches = files_failed
            verification.verification_score = files_verified / (files_verified + files_failed) if (files_verified + files_failed) > 0 else 0
            verification.status = 'passed' if files_failed == 0 else 'failed'
            verification.completed_at = datetime.utcnow()
            
            self.db.commit()
            
        except Exception as e:
            verification.status = 'failed'
            verification.error_message = str(e)
            verification.completed_at = datetime.utcnow()
            self.db.commit()

    def _validate_restore(self, restore_job: RestoreJob):
        """Validate restored data"""
        try:
            restore_job.validation_status = 'running'
            self.db.commit()
            
            # Basic validation - check if files exist
            validation_errors = []
            
            if restore_job.restore_path:
                restore_path = Path(restore_job.restore_path)
                if not restore_path.exists():
                    validation_errors.append("Restore path does not exist")
                elif not any(restore_path.iterdir()):
                    validation_errors.append("Restore path is empty")
            
            restore_job.validation_errors = validation_errors
            restore_job.validation_status = 'passed' if not validation_errors else 'failed'
            
            self.db.commit()
            
        except Exception as e:
            restore_job.validation_status = 'failed'
            restore_job.validation_errors = [str(e)]
            self.db.commit()

    # Utility Methods
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    def _get_directory_size(self, directory: str) -> int:
        """Get total size of directory"""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(directory):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                if os.path.exists(filepath):
                    total_size += os.path.getsize(filepath)
        return total_size

    def _count_files_in_directory(self, directory: str) -> int:
        """Count files in directory"""
        count = 0
        for dirpath, dirnames, filenames in os.walk(directory):
            count += len(filenames)
        return count

    def _create_alert(self, alert_type: str, alert_level: str, title: str, message: str,
                     backup_job_id: int = None, restore_job_id: int = None):
        """Create backup/restore alert"""
        alert = BackupAlert(
            alert_type=alert_type,
            alert_level=alert_level,
            title=title,
            message=message,
            backup_job_id=backup_job_id,
            restore_job_id=restore_job_id
        )
        
        self.db.add(alert)
        self.db.commit()

    # Query Methods
    @monitor_performance
    def get_backup_jobs(self, status: str = None, limit: int = 50) -> List[BackupJob]:
        """Get backup jobs with optional filtering"""
        query = self.db.query(BackupJob)
        
        if status:
            query = query.filter(BackupJob.status == status)
        
        return query.order_by(desc(BackupJob.created_at)).limit(limit).all()

    @monitor_performance
    def get_backup_statistics(self) -> Dict[str, Any]:
        """Get comprehensive backup statistics"""
        total_backups = self.db.query(BackupJob).count()
        successful_backups = self.db.query(BackupJob).filter(BackupJob.status == 'completed').count()
        failed_backups = self.db.query(BackupJob).filter(BackupJob.status == 'failed').count()
        running_backups = self.db.query(BackupJob).filter(BackupJob.status == 'running').count()
        
        # Storage statistics
        total_storage = self.db.query(func.sum(BackupJob.compressed_size)).scalar() or 0
        avg_compression_ratio = self.db.query(func.avg(BackupJob.compression_ratio)).scalar() or 0
        
        # Recent activity
        recent_backups = self.db.query(BackupJob).order_by(desc(BackupJob.created_at)).limit(5).all()
        
        return {
            'total_backups': total_backups,
            'successful_backups': successful_backups,
            'failed_backups': failed_backups,
            'running_backups': running_backups,
            'success_rate': (successful_backups / total_backups * 100) if total_backups > 0 else 0,
            'total_storage_used': total_storage,
            'total_storage_formatted': self._format_bytes(total_storage),
            'avg_compression_ratio': avg_compression_ratio,
            'recent_backups': [
                {
                    'id': backup.id,
                    'name': backup.job_name,
                    'status': backup.status,
                    'created_at': backup.created_at.isoformat(),
                    'size': self._format_bytes(backup.compressed_size or 0)
                }
                for backup in recent_backups
            ]
        }

    def _format_bytes(self, bytes_value: int) -> str:
        """Format bytes in human readable format"""
        if bytes_value == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while bytes_value >= 1024 and i < len(size_names) - 1:
            bytes_value /= 1024.0
            i += 1
        
        return f"{bytes_value:.1f} {size_names[i]}"