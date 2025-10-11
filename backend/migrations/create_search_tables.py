"""
Create Search & Indexing Tables Migration
"""

import sqlite3
import os
from datetime import datetime

def create_search_tables():
    """Create all search and indexing related tables"""
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'aria_document_management.db')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create Search Indexes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_indexes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                content_type VARCHAR(50) NOT NULL,
                title TEXT,
                content TEXT,
                metadata JSON DEFAULT '{}',
                tags JSON DEFAULT '[]',
                title_vector TEXT,
                content_vector TEXT,
                search_keywords TEXT,
                language VARCHAR(10) DEFAULT 'en',
                word_count INTEGER DEFAULT 0,
                character_count INTEGER DEFAULT 0,
                is_indexed BOOLEAN DEFAULT 0,
                index_version INTEGER DEFAULT 1,
                last_indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Search Indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_document_id ON search_indexes(document_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_content_type ON search_indexes(content_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_is_indexed ON search_indexes(is_indexed)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_language ON search_indexes(language)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_document_type ON search_indexes(document_id, content_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_indexed_status ON search_indexes(is_indexed, last_indexed_at)')
        
        # Create Search Logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                search_index_id INTEGER,
                query TEXT NOT NULL,
                query_type VARCHAR(50) DEFAULT 'full_text',
                filters JSON DEFAULT '{}',
                results_count INTEGER DEFAULT 0,
                response_time_ms REAL NOT NULL,
                user_id INTEGER,
                session_id VARCHAR(255),
                ip_address VARCHAR(45),
                search_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                result_clicked BOOLEAN DEFAULT 0,
                clicked_result_id INTEGER,
                FOREIGN KEY (search_index_id) REFERENCES search_indexes (id) ON DELETE SET NULL
            )
        ''')
        
        # Create indexes for Search Logs
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_logs_query_type ON search_logs(query_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_logs_session_id ON search_logs(session_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_logs_timestamp ON search_logs(search_timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_logs_query_type_timestamp ON search_logs(query_type, search_timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_logs_user_session ON search_logs(user_id, session_id)')
        
        # Create Search Suggestions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                suggestion VARCHAR(255) NOT NULL UNIQUE,
                category VARCHAR(50) NOT NULL,
                usage_count INTEGER DEFAULT 0,
                last_used_at DATETIME,
                source VARCHAR(50) DEFAULT 'user_query',
                language VARCHAR(10) DEFAULT 'en',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Search Suggestions
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_suggestions_suggestion ON search_suggestions(suggestion)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_suggestions_category ON search_suggestions(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_suggestions_is_active ON search_suggestions(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_suggestions_category_active ON search_suggestions(category, is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_suggestions_usage ON search_suggestions(usage_count, last_used_at)')
        
        # Create Search Facets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_facets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                display_name VARCHAR(255) NOT NULL,
                facet_type VARCHAR(50) NOT NULL,
                field_path VARCHAR(255) NOT NULL,
                is_filterable BOOLEAN DEFAULT 1,
                is_sortable BOOLEAN DEFAULT 0,
                display_order INTEGER DEFAULT 0,
                max_values INTEGER DEFAULT 10,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER NOT NULL
            )
        ''')
        
        # Create indexes for Search Facets
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_facets_name ON search_facets(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_facets_is_active ON search_facets(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_facets_name_active ON search_facets(name, is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_facets_type_order ON search_facets(facet_type, display_order)')
        
        # Create Search Facet Values table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_facet_values (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                facet_id INTEGER NOT NULL,
                value VARCHAR(255) NOT NULL,
                display_value VARCHAR(255) NOT NULL,
                document_count INTEGER DEFAULT 0,
                value_type VARCHAR(50) NOT NULL,
                sort_order INTEGER DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (facet_id) REFERENCES search_facets (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for Search Facet Values
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_facet_values_facet_id ON search_facet_values(facet_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_facet_values_value ON search_facet_values(value)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_facet_values_facet_value ON search_facet_values(facet_id, value)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_facet_values_count ON search_facet_values(document_count, sort_order)')
        
        # Create Saved Searches table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS saved_searches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                query TEXT NOT NULL,
                filters JSON DEFAULT '{}',
                sort_by VARCHAR(100),
                sort_order VARCHAR(10) DEFAULT 'desc',
                user_id INTEGER NOT NULL,
                is_public BOOLEAN DEFAULT 0,
                is_alert BOOLEAN DEFAULT 0,
                usage_count INTEGER DEFAULT 0,
                last_used_at DATETIME,
                alert_frequency VARCHAR(20) DEFAULT 'daily',
                last_alert_sent DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Saved Searches
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_saved_searches_is_public ON saved_searches(is_public)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_saved_searches_is_alert ON saved_searches(is_alert)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_saved_searches_user_public ON saved_searches(user_id, is_public)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_saved_searches_alert ON saved_searches(is_alert, alert_frequency)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_saved_searches_usage ON saved_searches(usage_count, last_used_at)')
        
        # Create Search Analytics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATETIME NOT NULL,
                hour INTEGER NOT NULL,
                total_searches INTEGER DEFAULT 0,
                unique_queries INTEGER DEFAULT 0,
                unique_users INTEGER DEFAULT 0,
                avg_response_time REAL DEFAULT 0.0,
                slow_searches INTEGER DEFAULT 0,
                avg_results_per_search REAL DEFAULT 0.0,
                zero_result_searches INTEGER DEFAULT 0,
                searches_with_clicks INTEGER DEFAULT 0,
                avg_click_position REAL DEFAULT 0.0,
                popular_queries JSON DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Search Analytics
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_analytics_hour ON search_analytics(hour)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_search_analytics_date_hour ON search_analytics(date, hour)')
        
        # Create triggers for updated_at timestamps
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_search_indexes_updated_at
            AFTER UPDATE ON search_indexes
            FOR EACH ROW
            BEGIN
                UPDATE search_indexes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_search_suggestions_updated_at
            AFTER UPDATE ON search_suggestions
            FOR EACH ROW
            BEGIN
                UPDATE search_suggestions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_search_facets_updated_at
            AFTER UPDATE ON search_facets
            FOR EACH ROW
            BEGIN
                UPDATE search_facets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_saved_searches_updated_at
            AFTER UPDATE ON saved_searches
            FOR EACH ROW
            BEGIN
                UPDATE saved_searches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_search_analytics_updated_at
            AFTER UPDATE ON search_analytics
            FOR EACH ROW
            BEGIN
                UPDATE search_analytics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        # Insert default search facets
        default_facets = [
            ('content_type', 'Content Type', 'text', 'content_type', 1, 1, 0, 10),
            ('file_type', 'File Type', 'text', 'metadata.file_type', 1, 1, 1, 15),
            ('created_date', 'Created Date', 'date', 'metadata.created_date', 1, 1, 2, 10),
            ('author', 'Author', 'text', 'metadata.author', 1, 0, 3, 20),
            ('department', 'Department', 'text', 'metadata.department', 1, 0, 4, 15),
            ('tags', 'Tags', 'list', 'tags', 1, 0, 5, 25)
        ]
        
        for facet_data in default_facets:
            cursor.execute('''
                INSERT OR IGNORE INTO search_facets 
                (name, display_name, facet_type, field_path, is_filterable, is_sortable, 
                 display_order, max_values, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ''', facet_data)
        
        # Insert default search suggestions
        default_suggestions = [
            ('document', 'query', 'user_query'),
            ('report', 'query', 'user_query'),
            ('contract', 'query', 'user_query'),
            ('invoice', 'query', 'user_query'),
            ('presentation', 'query', 'user_query'),
            ('spreadsheet', 'query', 'user_query'),
            ('pdf', 'tag', 'auto_generated'),
            ('word', 'tag', 'auto_generated'),
            ('excel', 'tag', 'auto_generated'),
            ('powerpoint', 'tag', 'auto_generated')
        ]
        
        for suggestion_data in default_suggestions:
            cursor.execute('''
                INSERT OR IGNORE INTO search_suggestions 
                (suggestion, category, source)
                VALUES (?, ?, ?)
            ''', suggestion_data)
        
        # Commit changes
        conn.commit()
        print("✅ Search & Indexing tables created successfully!")
        
        # Print table info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%search%'")
        tables = cursor.fetchall()
        print(f"📊 Created {len(tables)} search-related tables:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"   - {table[0]}: {count} records")
            
    except Exception as e:
        print(f"❌ Error creating search tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_search_tables()