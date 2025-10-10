"""
Version Control System Migration
Creates tables for document version control, branching, merging, and comparison
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
    
    # Create document_versions table
    create_document_versions = """
    CREATE TABLE IF NOT EXISTS document_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_number VARCHAR(50) NOT NULL,
        branch_name VARCHAR(100) NOT NULL DEFAULT 'main',
        parent_version_id INTEGER REFERENCES document_versions(id) ON DELETE SET NULL,
        
        -- Version metadata
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        is_current BOOLEAN DEFAULT 0,
        is_published BOOLEAN DEFAULT 0,
        
        -- File information
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        file_hash VARCHAR(64) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        
        -- Change tracking
        change_summary TEXT,
        change_type VARCHAR(20) NOT NULL DEFAULT 'UPDATE',
        changes_count INTEGER DEFAULT 0,
        
        -- User information
        created_by INTEGER NOT NULL REFERENCES users(id),
        committed_by INTEGER REFERENCES users(id),
        
        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        committed_at DATETIME,
        updated_at DATETIME,
        
        -- Metadata
        metadata TEXT,
        tags TEXT
    );
    """
    
    # Create document_branches table
    create_document_branches = """
    CREATE TABLE IF NOT EXISTS document_branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Branch metadata
        is_default BOOLEAN DEFAULT 0,
        is_protected BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        
        -- Branch source
        source_version_id INTEGER REFERENCES document_versions(id) ON DELETE SET NULL,
        
        -- User information
        created_by INTEGER NOT NULL REFERENCES users(id),
        
        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        
        -- Metadata
        metadata TEXT,
        
        UNIQUE(document_id, name)
    );
    """
    
    # Create document_changes table
    create_document_changes = """
    CREATE TABLE IF NOT EXISTS document_changes (
        id SERIAL PRIMARY KEY,
        version_id INTEGER NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        
        -- Change information
        change_type VARCHAR(20) NOT NULL,
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        
        -- Change location
        line_number INTEGER,
        character_position INTEGER,
        section VARCHAR(200),
        
        -- Change metadata
        description TEXT,
        impact_level VARCHAR(20) DEFAULT 'LOW',
        
        -- User information
        created_by INTEGER NOT NULL REFERENCES users(id),
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Metadata
        metadata JSONB
    );
    """
    
    # Create merge_requests table
    create_merge_requests = """
    CREATE TABLE IF NOT EXISTS merge_requests (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        
        -- Merge information
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        
        -- Source and target
        source_version_id INTEGER NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        target_version_id INTEGER NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        source_branch VARCHAR(100) NOT NULL,
        target_branch VARCHAR(100) NOT NULL,
        
        -- Merge result
        merged_version_id INTEGER REFERENCES document_versions(id) ON DELETE SET NULL,
        
        -- Conflict information
        has_conflicts BOOLEAN DEFAULT FALSE,
        conflicts_resolved BOOLEAN DEFAULT FALSE,
        auto_mergeable BOOLEAN DEFAULT TRUE,
        
        -- User information
        created_by INTEGER NOT NULL REFERENCES users(id),
        assigned_to INTEGER REFERENCES users(id),
        merged_by INTEGER REFERENCES users(id),
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE,
        merged_at TIMESTAMP WITH TIME ZONE,
        
        -- Metadata
        metadata JSONB,
        merge_strategy VARCHAR(50) DEFAULT 'auto'
    );
    """
    
    # Create merge_conflicts table
    create_merge_conflicts = """
    CREATE TABLE IF NOT EXISTS merge_conflicts (
        id SERIAL PRIMARY KEY,
        merge_request_id INTEGER NOT NULL REFERENCES merge_requests(id) ON DELETE CASCADE,
        
        -- Conflict information
        conflict_type VARCHAR(20) NOT NULL,
        field_name VARCHAR(100),
        section VARCHAR(200),
        
        -- Conflict values
        source_value TEXT,
        target_value TEXT,
        resolved_value TEXT,
        
        -- Resolution information
        is_resolved BOOLEAN DEFAULT FALSE,
        resolution_strategy VARCHAR(50),
        
        -- User information
        resolved_by INTEGER REFERENCES users(id),
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE,
        
        -- Metadata
        metadata JSONB
    );
    """
    
    # Create version_comparisons table
    create_version_comparisons = """
    CREATE TABLE IF NOT EXISTS version_comparisons (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        
        -- Comparison versions
        version_a_id INTEGER NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        version_b_id INTEGER NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        
        -- Comparison results
        differences_count INTEGER DEFAULT 0,
        similarity_score INTEGER DEFAULT 0,
        
        -- Comparison data
        diff_data BYTEA,
        summary TEXT,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        
        UNIQUE(version_a_id, version_b_id)
    );
    """
    
    # Create version_tags table
    create_version_tags = """
    CREATE TABLE IF NOT EXISTS version_tags (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_id INTEGER NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
        
        -- Tag information
        name VARCHAR(100) NOT NULL,
        description TEXT,
        tag_type VARCHAR(50) DEFAULT 'release',
        
        -- Tag metadata
        is_protected BOOLEAN DEFAULT FALSE,
        color VARCHAR(7),
        
        -- User information
        created_by INTEGER NOT NULL REFERENCES users(id),
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Metadata
        metadata JSONB,
        
        UNIQUE(document_id, name)
    );
    """
    
    # Create indexes
    create_indexes = """
    -- Document versions indexes
    CREATE INDEX IF NOT EXISTS idx_document_version ON document_versions(document_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_document_branch ON document_versions(document_id, branch_name);
    CREATE INDEX IF NOT EXISTS idx_version_status ON document_versions(status);
    CREATE INDEX IF NOT EXISTS idx_version_current ON document_versions(is_current);
    CREATE INDEX IF NOT EXISTS idx_version_created ON document_versions(created_at);
    
    -- Document branches indexes
    CREATE INDEX IF NOT EXISTS idx_branch_default ON document_branches(is_default);
    CREATE INDEX IF NOT EXISTS idx_branch_active ON document_branches(is_active);
    
    -- Document changes indexes
    CREATE INDEX IF NOT EXISTS idx_change_version ON document_changes(version_id);
    CREATE INDEX IF NOT EXISTS idx_change_type ON document_changes(change_type);
    CREATE INDEX IF NOT EXISTS idx_change_impact ON document_changes(impact_level);
    CREATE INDEX IF NOT EXISTS idx_change_created ON document_changes(created_at);
    
    -- Merge requests indexes
    CREATE INDEX IF NOT EXISTS idx_merge_document ON merge_requests(document_id);
    CREATE INDEX IF NOT EXISTS idx_merge_status ON merge_requests(status);
    CREATE INDEX IF NOT EXISTS idx_merge_source ON merge_requests(source_version_id);
    CREATE INDEX IF NOT EXISTS idx_merge_target ON merge_requests(target_version_id);
    CREATE INDEX IF NOT EXISTS idx_merge_created ON merge_requests(created_at);
    
    -- Merge conflicts indexes
    CREATE INDEX IF NOT EXISTS idx_conflict_merge ON merge_conflicts(merge_request_id);
    CREATE INDEX IF NOT EXISTS idx_conflict_type ON merge_conflicts(conflict_type);
    CREATE INDEX IF NOT EXISTS idx_conflict_resolved ON merge_conflicts(is_resolved);
    
    -- Version comparisons indexes
    CREATE INDEX IF NOT EXISTS idx_comparison_document ON version_comparisons(document_id);
    CREATE INDEX IF NOT EXISTS idx_comparison_expires ON version_comparisons(expires_at);
    
    -- Version tags indexes
    CREATE INDEX IF NOT EXISTS idx_tag_version ON version_tags(version_id);
    CREATE INDEX IF NOT EXISTS idx_tag_type ON version_tags(tag_type);
    """
    
    with engine.connect() as conn:
        # Execute table creation
        conn.execute(text(create_document_versions))
        conn.execute(text(create_document_branches))
        conn.execute(text(create_document_changes))
        conn.execute(text(create_merge_requests))
        conn.execute(text(create_merge_conflicts))
        conn.execute(text(create_version_comparisons))
        conn.execute(text(create_version_tags))
        
        # Execute index creation
        conn.execute(text(create_indexes))
        
        conn.commit()
        print("Version control tables created successfully!")


def downgrade():
    """Drop version control tables"""
    
    drop_tables = """
    DROP TABLE IF EXISTS version_tags CASCADE;
    DROP TABLE IF EXISTS version_comparisons CASCADE;
    DROP TABLE IF EXISTS merge_conflicts CASCADE;
    DROP TABLE IF EXISTS merge_requests CASCADE;
    DROP TABLE IF EXISTS document_changes CASCADE;
    DROP TABLE IF EXISTS document_branches CASCADE;
    DROP TABLE IF EXISTS document_versions CASCADE;
    """
    
    with engine.connect() as conn:
        conn.execute(text(drop_tables))
        conn.commit()
        print("Version control tables dropped successfully!")


if __name__ == "__main__":
    print("Running version control system migration...")
    upgrade()
    print("Migration completed!")