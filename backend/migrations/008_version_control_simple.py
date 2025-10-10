"""
Version Control System Migration - Simple SQLite Version
Creates basic tables for document version control
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine

# Database configuration
DATABASE_URL = "sqlite:///./aria.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def upgrade():
    """Create version control tables"""
    
    with engine.connect() as conn:
        # Create document_versions table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            version_number VARCHAR(50) NOT NULL,
            branch_name VARCHAR(100) NOT NULL DEFAULT 'main',
            parent_version_id INTEGER,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
            is_current BOOLEAN DEFAULT 0,
            is_published BOOLEAN DEFAULT 0,
            file_path VARCHAR(500) NOT NULL,
            file_size INTEGER NOT NULL,
            file_hash VARCHAR(64) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            change_summary TEXT,
            change_type VARCHAR(20) NOT NULL DEFAULT 'UPDATE',
            changes_count INTEGER DEFAULT 0,
            created_by INTEGER NOT NULL,
            committed_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            committed_at DATETIME,
            updated_at DATETIME,
            metadata TEXT,
            tags TEXT
        )
        """))
        
        # Create document_branches table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_branches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            is_default BOOLEAN DEFAULT 0,
            is_protected BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            source_version_id INTEGER,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            metadata TEXT
        )
        """))
        
        # Create document_changes table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_changes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version_id INTEGER NOT NULL,
            change_type VARCHAR(20) NOT NULL,
            field_name VARCHAR(100),
            old_value TEXT,
            new_value TEXT,
            line_number INTEGER,
            character_position INTEGER,
            section VARCHAR(200),
            description TEXT,
            impact_level VARCHAR(20) DEFAULT 'LOW',
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT
        )
        """))
        
        # Create merge_requests table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS merge_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            source_version_id INTEGER NOT NULL,
            target_version_id INTEGER NOT NULL,
            source_branch VARCHAR(100) NOT NULL,
            target_branch VARCHAR(100) NOT NULL,
            merged_version_id INTEGER,
            has_conflicts BOOLEAN DEFAULT 0,
            conflicts_resolved BOOLEAN DEFAULT 0,
            auto_mergeable BOOLEAN DEFAULT 1,
            created_by INTEGER NOT NULL,
            assigned_to INTEGER,
            merged_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            merged_at DATETIME,
            metadata TEXT,
            merge_strategy VARCHAR(50) DEFAULT 'auto'
        )
        """))
        
        # Create merge_conflicts table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS merge_conflicts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merge_request_id INTEGER NOT NULL,
            conflict_type VARCHAR(20) NOT NULL,
            field_name VARCHAR(100),
            section VARCHAR(200),
            source_value TEXT,
            target_value TEXT,
            resolved_value TEXT,
            is_resolved BOOLEAN DEFAULT 0,
            resolution_strategy VARCHAR(50),
            resolved_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            metadata TEXT
        )
        """))
        
        # Create version_comparisons table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS version_comparisons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            version_a_id INTEGER NOT NULL,
            version_b_id INTEGER NOT NULL,
            differences_count INTEGER DEFAULT 0,
            similarity_score INTEGER DEFAULT 0,
            diff_data BLOB,
            summary TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME
        )
        """))
        
        # Create version_tags table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS version_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            version_id INTEGER NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            tag_type VARCHAR(50) DEFAULT 'release',
            is_protected BOOLEAN DEFAULT 0,
            color VARCHAR(7),
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT
        )
        """))
        
        # Create indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_document_version ON document_versions(document_id, version_number)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_document_branch ON document_versions(document_id, branch_name)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_version_status ON document_versions(status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_version_current ON document_versions(is_current)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_branch_document ON document_branches(document_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_change_version ON document_changes(version_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_merge_document ON merge_requests(document_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_merge_status ON merge_requests(status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_conflict_merge ON merge_conflicts(merge_request_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_comparison_document ON version_comparisons(document_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tag_document ON version_tags(document_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tag_version ON version_tags(version_id)"))
        
        conn.commit()
        print("Version control tables created successfully!")


def downgrade():
    """Drop version control tables"""
    
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS version_tags"))
        conn.execute(text("DROP TABLE IF EXISTS version_comparisons"))
        conn.execute(text("DROP TABLE IF EXISTS merge_conflicts"))
        conn.execute(text("DROP TABLE IF EXISTS merge_requests"))
        conn.execute(text("DROP TABLE IF EXISTS document_changes"))
        conn.execute(text("DROP TABLE IF EXISTS document_branches"))
        conn.execute(text("DROP TABLE IF EXISTS document_versions"))
        conn.commit()
        print("Version control tables dropped successfully!")


if __name__ == "__main__":
    print("Running version control system migration...")
    upgrade()
    print("Migration completed!")