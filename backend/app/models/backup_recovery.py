from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class BackupJob(Base):
    __tablename__ = "backup_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Job identification
    job_name = Column(String(255), nullable=False, index=True)
    job_type = Column(String(50), nullable=False, index=True)  # full, incremental, differential
    backup_scope = Column(String(50), nullable=False, index=True)  # database, files, system, all
    
    # Backup configuration
    backup_path = Column(Text, nullable=False)
    compression_enabled = Column(Boolean, default=True)
    encryption_enabled = Column(Boolean, default=True)
    encryption_key_id = Column(String(255))
    
    # Scheduling
    schedule_type = Column(String(50), default='manual')  # manual, daily, weekly, monthly
    schedule_config = Column(JSON, default=dict)  # cron expression, frequency settings
    next_run_at = Column(DateTime)
    
    # Status and progress
    status = Column(String(50), default='pending', index=True)  # pending, running, completed, failed, cancelled
    progress_percentage = Column(Float, default=0.0)
    current_operation = Column(String(255))
    
    # Size and performance metrics
    total_size = Column(Integer, default=0)
    compressed_size = Column(Integer, default=0)
    compression_ratio = Column(Float, default=0.0)
    backup_duration = Column(Float, default=0.0)  # seconds
    
    # Retention policy
    retention_days = Column(Integer, default=30)
    max_backups = Column(Integer, default=10)
    auto_cleanup = Column(Boolean, default=True)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Metadata
    backup_metadata = Column(JSON, default=dict)
    file_count = Column(Integer, default=0)
    database_tables = Column(JSON, default=list)
    
    # Timestamps
    created_by = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    backup_files = relationship("BackupFile", back_populates="backup_job", cascade="all, delete-orphan")
    restore_jobs = relationship("RestoreJob", back_populates="backup_job")

class BackupFile(Base):
    __tablename__ = "backup_files"
    
    id = Column(Integer, primary_key=True, index=True)
    backup_job_id = Column(Integer, ForeignKey("backup_jobs.id"), nullable=False, index=True)
    
    # File information
    file_name = Column(String(255), nullable=False, index=True)
    file_path = Column(Text, nullable=False)
    file_type = Column(String(50), nullable=False, index=True)  # database, documents, system, config
    
    # File properties
    original_size = Column(Integer, nullable=False)
    compressed_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    compression_method = Column(String(50), default='gzip')
    
    # Encryption details
    is_encrypted = Column(Boolean, default=False)
    encryption_method = Column(String(50))
    encryption_key_id = Column(String(255))
    
    # Storage information
    storage_backend = Column(String(50), default='local')  # local, s3, gcs, azure
    storage_path = Column(Text, nullable=False)
    storage_metadata = Column(JSON, default=dict)
    
    # Verification
    checksum = Column(String(64), nullable=False)
    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    backup_job = relationship("BackupJob", back_populates="backup_files")

class RestoreJob(Base):
    __tablename__ = "restore_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    backup_job_id = Column(Integer, ForeignKey("backup_jobs.id"), nullable=False, index=True)
    
    # Restore configuration
    restore_name = Column(String(255), nullable=False, index=True)
    restore_type = Column(String(50), nullable=False, index=True)  # full, selective, point_in_time
    restore_scope = Column(String(50), nullable=False, index=True)  # database, files, system, all
    
    # Target configuration
    restore_path = Column(Text)
    overwrite_existing = Column(Boolean, default=False)
    restore_permissions = Column(Boolean, default=True)
    
    # Point-in-time restore
    target_timestamp = Column(DateTime)
    restore_point_type = Column(String(50))  # backup, transaction_log, snapshot
    
    # Status and progress
    status = Column(String(50), default='pending', index=True)  # pending, running, completed, failed, cancelled
    progress_percentage = Column(Float, default=0.0)
    current_operation = Column(String(255))
    
    # Performance metrics
    restore_duration = Column(Float, default=0.0)  # seconds
    files_restored = Column(Integer, default=0)
    data_restored = Column(Integer, default=0)  # bytes
    
    # Validation
    validation_enabled = Column(Boolean, default=True)
    validation_status = Column(String(50), default='pending')  # pending, passed, failed
    validation_errors = Column(JSON, default=list)
    
    # Error handling
    error_message = Column(Text)
    warnings = Column(JSON, default=list)
    
    # Metadata
    restore_metadata = Column(JSON, default=dict)
    selected_files = Column(JSON, default=list)  # For selective restore
    
    # Timestamps
    created_by = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    backup_job = relationship("BackupJob", back_populates="restore_jobs")

class BackupSchedule(Base):
    __tablename__ = "backup_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Schedule identification
    schedule_name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    
    # Schedule configuration
    schedule_type = Column(String(50), nullable=False, index=True)  # daily, weekly, monthly, custom
    cron_expression = Column(String(100))
    timezone = Column(String(50), default='UTC')
    
    # Backup configuration template
    backup_config = Column(JSON, nullable=False)  # Template for backup jobs
    
    # Status and control
    is_active = Column(Boolean, default=True, index=True)
    last_run_at = Column(DateTime)
    next_run_at = Column(DateTime, index=True)
    
    # Statistics
    total_runs = Column(Integer, default=0)
    successful_runs = Column(Integer, default=0)
    failed_runs = Column(Integer, default=0)
    
    # Error handling
    consecutive_failures = Column(Integer, default=0)
    max_consecutive_failures = Column(Integer, default=3)
    failure_notification_sent = Column(Boolean, default=False)
    
    # Timestamps
    created_by = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class BackupStorage(Base):
    __tablename__ = "backup_storage"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Storage configuration
    storage_name = Column(String(255), nullable=False, index=True)
    storage_type = Column(String(50), nullable=False, index=True)  # local, s3, gcs, azure, ftp
    storage_config = Column(JSON, nullable=False)  # Connection details, credentials
    
    # Storage properties
    base_path = Column(Text, nullable=False)
    max_storage_size = Column(Integer)  # bytes
    current_usage = Column(Integer, default=0)  # bytes
    
    # Status and health
    is_active = Column(Boolean, default=True, index=True)
    is_healthy = Column(Boolean, default=True, index=True)
    last_health_check = Column(DateTime)
    health_check_error = Column(Text)
    
    # Performance metrics
    avg_upload_speed = Column(Float, default=0.0)  # MB/s
    avg_download_speed = Column(Float, default=0.0)  # MB/s
    total_uploads = Column(Integer, default=0)
    total_downloads = Column(Integer, default=0)
    
    # Security
    encryption_enabled = Column(Boolean, default=True)
    encryption_key_id = Column(String(255))
    access_control = Column(JSON, default=dict)
    
    # Timestamps
    created_by = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class BackupVerification(Base):
    __tablename__ = "backup_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    backup_job_id = Column(Integer, ForeignKey("backup_jobs.id"), nullable=False, index=True)
    
    # Verification configuration
    verification_type = Column(String(50), nullable=False, index=True)  # checksum, restore_test, integrity
    verification_scope = Column(String(50), nullable=False)  # full, sample, critical
    
    # Verification results
    status = Column(String(50), default='pending', index=True)  # pending, running, passed, failed
    verification_score = Column(Float, default=0.0)  # 0.0 to 1.0
    
    # Test results
    files_verified = Column(Integer, default=0)
    files_failed = Column(Integer, default=0)
    checksum_matches = Column(Integer, default=0)
    checksum_mismatches = Column(Integer, default=0)
    
    # Performance
    verification_duration = Column(Float, default=0.0)  # seconds
    data_verified = Column(Integer, default=0)  # bytes
    
    # Error details
    error_message = Column(Text)
    failed_files = Column(JSON, default=list)
    warnings = Column(JSON, default=list)
    
    # Metadata
    verification_metadata = Column(JSON, default=dict)
    test_restore_path = Column(Text)  # For restore tests
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)

class BackupAlert(Base):
    __tablename__ = "backup_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Alert identification
    alert_type = Column(String(50), nullable=False, index=True)  # failure, success, warning, storage_full
    alert_level = Column(String(20), nullable=False, index=True)  # info, warning, error, critical
    
    # Alert content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSON, default=dict)
    
    # Related entities
    backup_job_id = Column(Integer, ForeignKey("backup_jobs.id"), nullable=True, index=True)
    restore_job_id = Column(Integer, ForeignKey("restore_jobs.id"), nullable=True, index=True)
    
    # Alert status
    is_read = Column(Boolean, default=False, index=True)
    is_acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_by = Column(Integer)
    acknowledged_at = Column(DateTime)
    
    # Notification status
    notification_sent = Column(Boolean, default=False)
    notification_methods = Column(JSON, default=list)  # email, sms, webhook
    notification_attempts = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class BackupMetrics(Base):
    __tablename__ = "backup_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Metric identification
    metric_date = Column(DateTime, nullable=False, index=True)
    metric_type = Column(String(50), nullable=False, index=True)  # daily, weekly, monthly
    
    # Backup statistics
    total_backups = Column(Integer, default=0)
    successful_backups = Column(Integer, default=0)
    failed_backups = Column(Integer, default=0)
    cancelled_backups = Column(Integer, default=0)
    
    # Size statistics
    total_data_backed_up = Column(Integer, default=0)  # bytes
    total_compressed_size = Column(Integer, default=0)  # bytes
    avg_compression_ratio = Column(Float, default=0.0)
    
    # Performance statistics
    avg_backup_duration = Column(Float, default=0.0)  # seconds
    avg_backup_speed = Column(Float, default=0.0)  # MB/s
    fastest_backup_time = Column(Float, default=0.0)
    slowest_backup_time = Column(Float, default=0.0)
    
    # Storage statistics
    storage_usage = Column(Integer, default=0)  # bytes
    storage_growth = Column(Integer, default=0)  # bytes change from previous period
    
    # Restore statistics
    total_restores = Column(Integer, default=0)
    successful_restores = Column(Integer, default=0)
    failed_restores = Column(Integer, default=0)
    avg_restore_duration = Column(Float, default=0.0)
    
    # Health metrics
    verification_success_rate = Column(Float, default=0.0)
    storage_health_score = Column(Float, default=0.0)
    system_reliability_score = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())