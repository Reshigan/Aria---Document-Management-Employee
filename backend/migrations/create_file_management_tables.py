"""
Create File Management Tables Migration
"""

import sqlite3
import os
from datetime import datetime

def create_file_management_tables():
    """Create all file management related tables"""
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'aria_document_management.db')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create File Metadata table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER NOT NULL UNIQUE,
                filename VARCHAR(255) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                file_extension VARCHAR(10) NOT NULL,
                md5_hash VARCHAR(32) NOT NULL,
                sha256_hash VARCHAR(64) NOT NULL,
                content_type VARCHAR(50) NOT NULL,
                encoding VARCHAR(50),
                language VARCHAR(10),
                width INTEGER,
                height INTEGER,
                duration REAL,
                bitrate INTEGER,
                page_count INTEGER,
                word_count INTEGER,
                character_count INTEGER,
                extended_metadata JSON DEFAULT '{}',
                is_processed BOOLEAN DEFAULT 0,
                processing_status VARCHAR(50) DEFAULT 'pending',
                processing_error TEXT,
                is_scanned BOOLEAN DEFAULT 0,
                scan_status VARCHAR(50) DEFAULT 'pending',
                scan_result JSON DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for File Metadata
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_file_id ON file_metadata(file_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_filename ON file_metadata(filename)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_size ON file_metadata(file_size)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_mime_type ON file_metadata(mime_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_extension ON file_metadata(file_extension)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_md5 ON file_metadata(md5_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_sha256 ON file_metadata(sha256_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_content_type ON file_metadata(content_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_processed ON file_metadata(is_processed)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_processing_status ON file_metadata(processing_status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_scanned ON file_metadata(is_scanned)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_scan_status ON file_metadata(scan_status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_created ON file_metadata(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_hash ON file_metadata(md5_hash, sha256_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_type_size ON file_metadata(content_type, file_size)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_metadata_status ON file_metadata(processing_status, scan_status)')
        
        # Create File Chunks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_metadata_id INTEGER NOT NULL,
                chunk_number INTEGER NOT NULL,
                chunk_size INTEGER NOT NULL,
                chunk_hash VARCHAR(64) NOT NULL,
                is_uploaded BOOLEAN DEFAULT 0,
                upload_id VARCHAR(255),
                storage_path TEXT,
                storage_backend VARCHAR(50) DEFAULT 'local',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                uploaded_at DATETIME,
                FOREIGN KEY (file_metadata_id) REFERENCES file_metadata (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for File Chunks
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_file_metadata_id ON file_chunks(file_metadata_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_chunk_number ON file_chunks(chunk_number)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_chunk_hash ON file_chunks(chunk_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_uploaded ON file_chunks(is_uploaded)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_upload_id ON file_chunks(upload_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_file_number ON file_chunks(file_metadata_id, chunk_number)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_chunks_upload ON file_chunks(upload_id, is_uploaded)')
        
        # Create File Shares table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_shares (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_metadata_id INTEGER NOT NULL,
                share_token VARCHAR(255) NOT NULL UNIQUE,
                share_type VARCHAR(50) NOT NULL,
                password_hash VARCHAR(255),
                allowed_users JSON DEFAULT '[]',
                allowed_emails JSON DEFAULT '[]',
                can_download BOOLEAN DEFAULT 1,
                can_view BOOLEAN DEFAULT 1,
                can_comment BOOLEAN DEFAULT 0,
                max_downloads INTEGER,
                download_count INTEGER DEFAULT 0,
                expires_at DATETIME,
                is_active BOOLEAN DEFAULT 1,
                last_accessed DATETIME,
                access_count INTEGER DEFAULT 0,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (file_metadata_id) REFERENCES file_metadata (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for File Shares
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_shares_file_metadata_id ON file_shares(file_metadata_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_shares_share_token ON file_shares(share_token)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_shares_share_type ON file_shares(share_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_shares_is_active ON file_shares(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_shares_created_by ON file_shares(created_by)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_shares_token_active ON file_shares(share_token, is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_shares_type_expires ON file_shares(share_type, expires_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_shares_creator ON file_shares(created_by, created_at)')
        
        # Create File Versions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_metadata_id INTEGER NOT NULL,
                version_number INTEGER NOT NULL,
                version_name VARCHAR(255),
                version_description TEXT,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                file_hash VARCHAR(64) NOT NULL,
                changes_summary TEXT,
                change_type VARCHAR(50) DEFAULT 'update',
                is_current BOOLEAN DEFAULT 0,
                is_archived BOOLEAN DEFAULT 0,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (file_metadata_id) REFERENCES file_metadata (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for File Versions
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_versions_file_metadata_id ON file_versions(file_metadata_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_versions_version_number ON file_versions(version_number)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_versions_is_current ON file_versions(is_current)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_versions_is_archived ON file_versions(is_archived)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_versions_created_by ON file_versions(created_by)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_versions_file_number ON file_versions(file_metadata_id, version_number)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_versions_current ON file_versions(file_metadata_id, is_current)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_versions_creator ON file_versions(created_by, created_at)')
        
        # Create File Access Logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_access_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_metadata_id INTEGER NOT NULL,
                file_share_id INTEGER,
                access_type VARCHAR(50) NOT NULL,
                user_id INTEGER,
                session_id VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                referer TEXT,
                status_code INTEGER NOT NULL,
                response_size INTEGER,
                response_time_ms REAL,
                access_method VARCHAR(50),
                client_info JSON DEFAULT '{}',
                accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (file_metadata_id) REFERENCES file_metadata (id) ON DELETE CASCADE,
                FOREIGN KEY (file_share_id) REFERENCES file_shares (id) ON DELETE SET NULL
            )
        ''')
        
        # Create indexes for File Access Logs
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_metadata_id ON file_access_logs(file_metadata_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_share_id ON file_access_logs(file_share_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_access_type ON file_access_logs(access_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON file_access_logs(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_session_id ON file_access_logs(session_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_ip_address ON file_access_logs(ip_address)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_status_code ON file_access_logs(status_code)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_accessed_at ON file_access_logs(accessed_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_type ON file_access_logs(file_metadata_id, access_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_time ON file_access_logs(user_id, accessed_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_ip_time ON file_access_logs(ip_address, accessed_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_access_logs_status ON file_access_logs(status_code, accessed_at)')
        
        # Create File Archives table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_archives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                archive_name VARCHAR(255) NOT NULL,
                archive_type VARCHAR(50) NOT NULL,
                archive_path TEXT NOT NULL,
                file_count INTEGER DEFAULT 0,
                total_size INTEGER DEFAULT 0,
                compressed_size INTEGER DEFAULT 0,
                compression_ratio REAL DEFAULT 0.0,
                file_list JSON DEFAULT '[]',
                archive_hash VARCHAR(64) NOT NULL,
                compression_level INTEGER DEFAULT 6,
                is_encrypted BOOLEAN DEFAULT 0,
                password_protected BOOLEAN DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                progress_percentage REAL DEFAULT 0.0,
                error_message TEXT,
                retention_days INTEGER,
                expires_at DATETIME,
                is_permanent BOOLEAN DEFAULT 0,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            )
        ''')
        
        # Create indexes for File Archives
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_archive_name ON file_archives(archive_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_archive_type ON file_archives(archive_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_status ON file_archives(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_created_by ON file_archives(created_by)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_expires_at ON file_archives(expires_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_name_type ON file_archives(archive_name, archive_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_status_created ON file_archives(status, created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_creator ON file_archives(created_by, created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_archives_expires ON file_archives(expires_at, is_permanent)')
        
        # Create File Duplicates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_duplicates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                duplicate_group_id VARCHAR(64) NOT NULL,
                file_metadata_id INTEGER NOT NULL,
                similarity_score REAL NOT NULL,
                detection_method VARCHAR(50) NOT NULL,
                hash_match BOOLEAN DEFAULT 0,
                size_match BOOLEAN DEFAULT 0,
                name_similarity REAL DEFAULT 0.0,
                content_similarity REAL DEFAULT 0.0,
                is_resolved BOOLEAN DEFAULT 0,
                resolution_action VARCHAR(50),
                resolved_by INTEGER,
                resolved_at DATETIME,
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                detection_algorithm VARCHAR(100),
                FOREIGN KEY (file_metadata_id) REFERENCES file_metadata (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for File Duplicates
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_duplicates_duplicate_group_id ON file_duplicates(duplicate_group_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_duplicates_file_metadata_id ON file_duplicates(file_metadata_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_duplicates_similarity_score ON file_duplicates(similarity_score)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_duplicates_detection_method ON file_duplicates(detection_method)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_duplicates_is_resolved ON file_duplicates(is_resolved)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_duplicates_group_score ON file_duplicates(duplicate_group_id, similarity_score)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_duplicates_resolved ON file_duplicates(is_resolved, detected_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_duplicates_method ON file_duplicates(detection_method, similarity_score)')
        
        # Create File Previews table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_previews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_metadata_id INTEGER NOT NULL,
                preview_type VARCHAR(50) NOT NULL,
                preview_format VARCHAR(20) NOT NULL,
                preview_path TEXT NOT NULL,
                preview_size INTEGER NOT NULL,
                preview_width INTEGER,
                preview_height INTEGER,
                generation_method VARCHAR(50),
                generation_settings JSON DEFAULT '{}',
                is_generated BOOLEAN DEFAULT 0,
                generation_status VARCHAR(50) DEFAULT 'pending',
                quality_score REAL,
                generation_error TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                generated_at DATETIME,
                FOREIGN KEY (file_metadata_id) REFERENCES file_metadata (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for File Previews
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_previews_file_metadata_id ON file_previews(file_metadata_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_previews_preview_type ON file_previews(preview_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_previews_is_generated ON file_previews(is_generated)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_previews_generation_status ON file_previews(generation_status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_previews_file_type ON file_previews(file_metadata_id, preview_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_previews_status ON file_previews(generation_status, created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_previews_generated ON file_previews(is_generated, generated_at)')
        
        # Create triggers for updated_at timestamps
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_file_metadata_updated_at
            AFTER UPDATE ON file_metadata
            FOR EACH ROW
            BEGIN
                UPDATE file_metadata SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_file_shares_updated_at
            AFTER UPDATE ON file_shares
            FOR EACH ROW
            BEGIN
                UPDATE file_shares SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_file_archives_updated_at
            AFTER UPDATE ON file_archives
            FOR EACH ROW
            BEGIN
                UPDATE file_archives SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        # Commit changes
        conn.commit()
        print("✅ File Management tables created successfully!")
        
        # Print table info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%file_%'")
        tables = cursor.fetchall()
        print(f"📊 Created {len(tables)} file management tables:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"   - {table[0]}: {count} records")
            
    except Exception as e:
        print(f"❌ Error creating file management tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_file_management_tables()