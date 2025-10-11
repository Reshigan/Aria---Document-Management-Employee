"""
Create Backup & Recovery Tables Migration
"""

import sqlite3
import os
from datetime import datetime

def create_backup_recovery_tables():
    """Create all backup and recovery related tables"""
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'aria_document_management.db')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create Backup Jobs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_name VARCHAR(255) NOT NULL,
                job_type VARCHAR(50) NOT NULL,
                backup_scope VARCHAR(50) NOT NULL,
                backup_path TEXT NOT NULL,
                compression_enabled BOOLEAN DEFAULT 1,
                encryption_enabled BOOLEAN DEFAULT 1,
                encryption_key_id VARCHAR(255),
                schedule_type VARCHAR(50) DEFAULT 'manual',
                schedule_config JSON DEFAULT '{}',
                next_run_at DATETIME,
                status VARCHAR(50) DEFAULT 'pending',
                progress_percentage REAL DEFAULT 0.0,
                current_operation VARCHAR(255),
                total_size INTEGER DEFAULT 0,
                compressed_size INTEGER DEFAULT 0,
                compression_ratio REAL DEFAULT 0.0,
                backup_duration REAL DEFAULT 0.0,
                retention_days INTEGER DEFAULT 30,
                max_backups INTEGER DEFAULT 10,
                auto_cleanup BOOLEAN DEFAULT 1,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                backup_metadata JSON DEFAULT '{}',
                file_count INTEGER DEFAULT 0,
                database_tables JSON DEFAULT '[]',
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                completed_at DATETIME,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Backup Jobs
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_jobs_job_name ON backup_jobs(job_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_jobs_job_type ON backup_jobs(job_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_jobs_backup_scope ON backup_jobs(backup_scope)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_jobs_created_by ON backup_jobs(created_by)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_jobs_created_at ON backup_jobs(created_at)')
        
        # Create Backup Files table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backup_job_id INTEGER NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                original_size INTEGER NOT NULL,
                compressed_size INTEGER NOT NULL,
                file_hash VARCHAR(64) NOT NULL,
                compression_method VARCHAR(50) DEFAULT 'gzip',
                is_encrypted BOOLEAN DEFAULT 0,
                encryption_method VARCHAR(50),
                encryption_key_id VARCHAR(255),
                storage_backend VARCHAR(50) DEFAULT 'local',
                storage_path TEXT NOT NULL,
                storage_metadata JSON DEFAULT '{}',
                checksum VARCHAR(64) NOT NULL,
                is_verified BOOLEAN DEFAULT 0,
                verification_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (backup_job_id) REFERENCES backup_jobs (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for Backup Files
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_files_backup_job_id ON backup_files(backup_job_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_files_file_name ON backup_files(file_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_files_file_type ON backup_files(file_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_files_file_hash ON backup_files(file_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_files_is_verified ON backup_files(is_verified)')
        
        # Create Restore Jobs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS restore_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backup_job_id INTEGER NOT NULL,
                restore_name VARCHAR(255) NOT NULL,
                restore_type VARCHAR(50) NOT NULL,
                restore_scope VARCHAR(50) NOT NULL,
                restore_path TEXT,
                overwrite_existing BOOLEAN DEFAULT 0,
                restore_permissions BOOLEAN DEFAULT 1,
                target_timestamp DATETIME,
                restore_point_type VARCHAR(50),
                status VARCHAR(50) DEFAULT 'pending',
                progress_percentage REAL DEFAULT 0.0,
                current_operation VARCHAR(255),
                restore_duration REAL DEFAULT 0.0,
                files_restored INTEGER DEFAULT 0,
                data_restored INTEGER DEFAULT 0,
                validation_enabled BOOLEAN DEFAULT 1,
                validation_status VARCHAR(50) DEFAULT 'pending',
                validation_errors JSON DEFAULT '[]',
                error_message TEXT,
                warnings JSON DEFAULT '[]',
                restore_metadata JSON DEFAULT '{}',
                selected_files JSON DEFAULT '[]',
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                completed_at DATETIME,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (backup_job_id) REFERENCES backup_jobs (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for Restore Jobs
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_restore_jobs_backup_job_id ON restore_jobs(backup_job_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_restore_jobs_restore_name ON restore_jobs(restore_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_restore_jobs_restore_type ON restore_jobs(restore_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_restore_jobs_restore_scope ON restore_jobs(restore_scope)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_restore_jobs_status ON restore_jobs(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_restore_jobs_created_by ON restore_jobs(created_by)')
        
        # Create Backup Schedules table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                schedule_name VARCHAR(255) NOT NULL,
                description TEXT,
                schedule_type VARCHAR(50) NOT NULL,
                cron_expression VARCHAR(100),
                timezone VARCHAR(50) DEFAULT 'UTC',
                backup_config JSON NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                last_run_at DATETIME,
                next_run_at DATETIME,
                total_runs INTEGER DEFAULT 0,
                successful_runs INTEGER DEFAULT 0,
                failed_runs INTEGER DEFAULT 0,
                consecutive_failures INTEGER DEFAULT 0,
                max_consecutive_failures INTEGER DEFAULT 3,
                failure_notification_sent BOOLEAN DEFAULT 0,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Backup Schedules
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_schedules_schedule_name ON backup_schedules(schedule_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_schedules_schedule_type ON backup_schedules(schedule_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_schedules_is_active ON backup_schedules(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run_at ON backup_schedules(next_run_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_schedules_created_by ON backup_schedules(created_by)')
        
        # Create Backup Storage table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_storage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                storage_name VARCHAR(255) NOT NULL,
                storage_type VARCHAR(50) NOT NULL,
                storage_config JSON NOT NULL,
                base_path TEXT NOT NULL,
                max_storage_size INTEGER,
                current_usage INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                is_healthy BOOLEAN DEFAULT 1,
                last_health_check DATETIME,
                health_check_error TEXT,
                avg_upload_speed REAL DEFAULT 0.0,
                avg_download_speed REAL DEFAULT 0.0,
                total_uploads INTEGER DEFAULT 0,
                total_downloads INTEGER DEFAULT 0,
                encryption_enabled BOOLEAN DEFAULT 1,
                encryption_key_id VARCHAR(255),
                access_control JSON DEFAULT '{}',
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Backup Storage
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_storage_storage_name ON backup_storage(storage_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_storage_storage_type ON backup_storage(storage_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_storage_is_active ON backup_storage(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_storage_is_healthy ON backup_storage(is_healthy)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_storage_created_by ON backup_storage(created_by)')
        
        # Create Backup Verifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backup_job_id INTEGER NOT NULL,
                verification_type VARCHAR(50) NOT NULL,
                verification_scope VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                verification_score REAL DEFAULT 0.0,
                files_verified INTEGER DEFAULT 0,
                files_failed INTEGER DEFAULT 0,
                checksum_matches INTEGER DEFAULT 0,
                checksum_mismatches INTEGER DEFAULT 0,
                verification_duration REAL DEFAULT 0.0,
                data_verified INTEGER DEFAULT 0,
                error_message TEXT,
                failed_files JSON DEFAULT '[]',
                warnings JSON DEFAULT '[]',
                verification_metadata JSON DEFAULT '{}',
                test_restore_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                completed_at DATETIME,
                FOREIGN KEY (backup_job_id) REFERENCES backup_jobs (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for Backup Verifications
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_verifications_backup_job_id ON backup_verifications(backup_job_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_verifications_verification_type ON backup_verifications(verification_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_verifications_status ON backup_verifications(status)')
        
        # Create Backup Alerts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type VARCHAR(50) NOT NULL,
                alert_level VARCHAR(20) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                details JSON DEFAULT '{}',
                backup_job_id INTEGER,
                restore_job_id INTEGER,
                is_read BOOLEAN DEFAULT 0,
                is_acknowledged BOOLEAN DEFAULT 0,
                acknowledged_by INTEGER,
                acknowledged_at DATETIME,
                notification_sent BOOLEAN DEFAULT 0,
                notification_methods JSON DEFAULT '[]',
                notification_attempts INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (backup_job_id) REFERENCES backup_jobs (id) ON DELETE SET NULL,
                FOREIGN KEY (restore_job_id) REFERENCES restore_jobs (id) ON DELETE SET NULL
            )
        ''')
        
        # Create indexes for Backup Alerts
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_alerts_alert_type ON backup_alerts(alert_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_alerts_alert_level ON backup_alerts(alert_level)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_alerts_backup_job_id ON backup_alerts(backup_job_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_alerts_restore_job_id ON backup_alerts(restore_job_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_alerts_is_read ON backup_alerts(is_read)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_alerts_created_at ON backup_alerts(created_at)')
        
        # Create Backup Metrics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS backup_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_date DATETIME NOT NULL,
                metric_type VARCHAR(50) NOT NULL,
                total_backups INTEGER DEFAULT 0,
                successful_backups INTEGER DEFAULT 0,
                failed_backups INTEGER DEFAULT 0,
                cancelled_backups INTEGER DEFAULT 0,
                total_data_backed_up INTEGER DEFAULT 0,
                total_compressed_size INTEGER DEFAULT 0,
                avg_compression_ratio REAL DEFAULT 0.0,
                avg_backup_duration REAL DEFAULT 0.0,
                avg_backup_speed REAL DEFAULT 0.0,
                fastest_backup_time REAL DEFAULT 0.0,
                slowest_backup_time REAL DEFAULT 0.0,
                storage_usage INTEGER DEFAULT 0,
                storage_growth INTEGER DEFAULT 0,
                total_restores INTEGER DEFAULT 0,
                successful_restores INTEGER DEFAULT 0,
                failed_restores INTEGER DEFAULT 0,
                avg_restore_duration REAL DEFAULT 0.0,
                verification_success_rate REAL DEFAULT 0.0,
                storage_health_score REAL DEFAULT 0.0,
                system_reliability_score REAL DEFAULT 0.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Backup Metrics
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_metrics_metric_date ON backup_metrics(metric_date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_backup_metrics_metric_type ON backup_metrics(metric_type)')
        
        # Create triggers for updated_at timestamps
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_backup_jobs_updated_at
            AFTER UPDATE ON backup_jobs
            FOR EACH ROW
            BEGIN
                UPDATE backup_jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_restore_jobs_updated_at
            AFTER UPDATE ON restore_jobs
            FOR EACH ROW
            BEGIN
                UPDATE restore_jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_backup_schedules_updated_at
            AFTER UPDATE ON backup_schedules
            FOR EACH ROW
            BEGIN
                UPDATE backup_schedules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_backup_storage_updated_at
            AFTER UPDATE ON backup_storage
            FOR EACH ROW
            BEGIN
                UPDATE backup_storage SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_backup_alerts_updated_at
            AFTER UPDATE ON backup_alerts
            FOR EACH ROW
            BEGIN
                UPDATE backup_alerts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_backup_metrics_updated_at
            AFTER UPDATE ON backup_metrics
            FOR EACH ROW
            BEGIN
                UPDATE backup_metrics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        # Insert default backup storage configuration
        cursor.execute('''
            INSERT OR IGNORE INTO backup_storage (
                id, storage_name, storage_type, storage_config, base_path, 
                is_active, is_healthy, created_by
            ) VALUES (
                1, 'Local Storage', 'local', '{"path": "/tmp/aria_backups"}', '/tmp/aria_backups',
                1, 1, 1
            )
        ''')
        
        # Insert sample backup schedules
        cursor.execute('''
            INSERT OR IGNORE INTO backup_schedules (
                id, schedule_name, description, schedule_type, backup_config,
                is_active, created_by
            ) VALUES (
                1, 'Daily Database Backup', 'Automated daily backup of the database',
                'daily', '{"job_type": "full", "backup_scope": "database", "compression_enabled": true}',
                1, 1
            )
        ''')
        
        cursor.execute('''
            INSERT OR IGNORE INTO backup_schedules (
                id, schedule_name, description, schedule_type, backup_config,
                is_active, created_by
            ) VALUES (
                2, 'Weekly Full Backup', 'Comprehensive weekly backup of all components',
                'weekly', '{"job_type": "full", "backup_scope": "all", "compression_enabled": true}',
                1, 1
            )
        ''')
        
        # Commit changes
        conn.commit()
        print("✅ Backup & Recovery tables created successfully!")
        
        # Print table info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%backup%'")
        tables = cursor.fetchall()
        print(f"📊 Created {len(tables)} backup & recovery tables:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"   - {table[0]}: {count} records")
            
    except Exception as e:
        print(f"❌ Error creating backup & recovery tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_backup_recovery_tables()