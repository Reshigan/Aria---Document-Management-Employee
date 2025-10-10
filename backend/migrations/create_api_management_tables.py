"""
Create API Management Tables Migration
"""

import sqlite3
import os
from datetime import datetime

def create_api_management_tables():
    """Create all API management related tables"""
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'aria_document_management.db')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create API Keys table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                key_hash VARCHAR(255) UNIQUE NOT NULL,
                key_prefix VARCHAR(50) NOT NULL,
                description TEXT,
                user_id INTEGER NOT NULL,
                scopes JSON DEFAULT '[]',
                rate_limit_requests INTEGER DEFAULT 1000,
                rate_limit_window INTEGER DEFAULT 3600,
                is_active BOOLEAN DEFAULT 1,
                expires_at DATETIME,
                last_used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER NOT NULL
            )
        ''')
        
        # Create indexes for API Keys
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)')
        
        # Create API Usage Logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_key_id INTEGER NOT NULL,
                endpoint VARCHAR(500) NOT NULL,
                method VARCHAR(10) NOT NULL,
                status_code INTEGER NOT NULL,
                response_time_ms REAL NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                user_agent TEXT,
                request_size INTEGER DEFAULT 0,
                response_size INTEGER DEFAULT 0,
                error_message TEXT,
                error_type VARCHAR(100),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for API Usage Logs
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_id ON api_usage_logs(api_key_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint ON api_usage_logs(endpoint)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_status_code ON api_usage_logs(status_code)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON api_usage_logs(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_ip_address ON api_usage_logs(ip_address)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_key_timestamp ON api_usage_logs(api_key_id, timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint_timestamp ON api_usage_logs(endpoint, timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_logs_status_timestamp ON api_usage_logs(status_code, timestamp)')
        
        # Create Rate Limit Entries table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rate_limit_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_key_id INTEGER NOT NULL,
                window_start DATETIME NOT NULL,
                window_end DATETIME NOT NULL,
                request_count INTEGER DEFAULT 0,
                limit_exceeded_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for Rate Limit Entries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rate_limits_api_key_id ON rate_limit_entries(api_key_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limit_entries(window_start)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limit_entries(window_end)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON rate_limit_entries(api_key_id, window_start, window_end)')
        
        # Create API Endpoints table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_endpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path VARCHAR(500) NOT NULL,
                method VARCHAR(10) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                requires_auth BOOLEAN DEFAULT 1,
                required_scopes JSON DEFAULT '[]',
                custom_rate_limit INTEGER,
                custom_rate_window INTEGER,
                is_monitored BOOLEAN DEFAULT 1,
                alert_on_errors BOOLEAN DEFAULT 1,
                error_threshold REAL DEFAULT 0.05,
                request_schema JSON,
                response_schema JSON,
                examples JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER NOT NULL,
                UNIQUE(path, method)
            )
        ''')
        
        # Create indexes for API Endpoints
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_endpoints_path ON api_endpoints(path)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_endpoints_is_active ON api_endpoints(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_endpoints_path_method ON api_endpoints(path, method)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_endpoints_active_auth ON api_endpoints(is_active, requires_auth)')
        
        # Create Endpoint Usage Stats table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS endpoint_usage_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint_id INTEGER NOT NULL,
                date DATETIME NOT NULL,
                hour INTEGER NOT NULL,
                total_requests INTEGER DEFAULT 0,
                successful_requests INTEGER DEFAULT 0,
                failed_requests INTEGER DEFAULT 0,
                error_requests INTEGER DEFAULT 0,
                avg_response_time REAL DEFAULT 0.0,
                min_response_time REAL DEFAULT 0.0,
                max_response_time REAL DEFAULT 0.0,
                p95_response_time REAL DEFAULT 0.0,
                total_request_size INTEGER DEFAULT 0,
                total_response_size INTEGER DEFAULT 0,
                rate_limited_requests INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (endpoint_id) REFERENCES api_endpoints (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for Endpoint Usage Stats
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_stats_endpoint_id ON endpoint_usage_stats(endpoint_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON endpoint_usage_stats(date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_stats_hour ON endpoint_usage_stats(hour)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_stats_endpoint_date ON endpoint_usage_stats(endpoint_id, date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_stats_date_hour ON endpoint_usage_stats(date, hour)')
        
        # Create API Quotas table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_quotas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                requests_per_minute INTEGER DEFAULT 60,
                requests_per_hour INTEGER DEFAULT 1000,
                requests_per_day INTEGER DEFAULT 10000,
                requests_per_month INTEGER DEFAULT 100000,
                data_transfer_per_day INTEGER DEFAULT 1073741824,
                data_transfer_per_month INTEGER DEFAULT 10737418240,
                max_concurrent_requests INTEGER DEFAULT 10,
                max_request_size INTEGER DEFAULT 10485760,
                max_response_size INTEGER DEFAULT 52428800,
                allowed_endpoints JSON DEFAULT '[]',
                blocked_endpoints JSON DEFAULT '[]',
                allowed_methods JSON DEFAULT '["GET", "POST", "PUT", "DELETE"]',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER NOT NULL
            )
        ''')
        
        # Create indexes for API Quotas
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_quotas_is_active ON api_quotas(is_active)')
        
        # Create API Alerts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                alert_type VARCHAR(50) NOT NULL,
                threshold_value REAL NOT NULL,
                comparison_operator VARCHAR(10) DEFAULT '>=',
                endpoint_id INTEGER,
                api_key_id INTEGER,
                evaluation_window INTEGER DEFAULT 300,
                notification_channels JSON DEFAULT '[]',
                notification_recipients JSON DEFAULT '[]',
                is_active BOOLEAN DEFAULT 1,
                last_triggered_at DATETIME,
                trigger_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER NOT NULL,
                FOREIGN KEY (endpoint_id) REFERENCES api_endpoints (id) ON DELETE SET NULL,
                FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE SET NULL
            )
        ''')
        
        # Create indexes for API Alerts
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON api_alerts(alert_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON api_alerts(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_endpoint_id ON api_alerts(endpoint_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_api_key_id ON api_alerts(api_key_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_type_active ON api_alerts(alert_type, is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_endpoint_active ON api_alerts(endpoint_id, is_active)')
        
        # Create trigger to update updated_at timestamp
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_api_keys_updated_at
            AFTER UPDATE ON api_keys
            FOR EACH ROW
            BEGIN
                UPDATE api_keys SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_rate_limit_entries_updated_at
            AFTER UPDATE ON rate_limit_entries
            FOR EACH ROW
            BEGIN
                UPDATE rate_limit_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_api_endpoints_updated_at
            AFTER UPDATE ON api_endpoints
            FOR EACH ROW
            BEGIN
                UPDATE api_endpoints SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_endpoint_usage_stats_updated_at
            AFTER UPDATE ON endpoint_usage_stats
            FOR EACH ROW
            BEGIN
                UPDATE endpoint_usage_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_api_quotas_updated_at
            AFTER UPDATE ON api_quotas
            FOR EACH ROW
            BEGIN
                UPDATE api_quotas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_api_alerts_updated_at
            AFTER UPDATE ON api_alerts
            FOR EACH ROW
            BEGIN
                UPDATE api_alerts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        # Insert some default API endpoints
        default_endpoints = [
            ('/api/documents', 'GET', 'List Documents', 'Get list of documents', 1, 1, '["documents:read"]'),
            ('/api/documents', 'POST', 'Create Document', 'Create a new document', 1, 1, '["documents:write"]'),
            ('/api/documents/{id}', 'GET', 'Get Document', 'Get document by ID', 1, 1, '["documents:read"]'),
            ('/api/documents/{id}', 'PUT', 'Update Document', 'Update document by ID', 1, 1, '["documents:write"]'),
            ('/api/documents/{id}', 'DELETE', 'Delete Document', 'Delete document by ID', 1, 1, '["documents:delete"]'),
            ('/api/users', 'GET', 'List Users', 'Get list of users', 1, 1, '["users:read"]'),
            ('/api/analytics', 'GET', 'Get Analytics', 'Get analytics data', 1, 1, '["analytics:read"]'),
            ('/api/version-control/versions', 'GET', 'List Versions', 'Get document versions', 1, 1, '["documents:read"]'),
            ('/api/document-processing/ocr', 'POST', 'OCR Processing', 'Process document with OCR', 1, 1, '["documents:write"]'),
            ('/api/integrations/external', 'GET', 'External Integrations', 'Get external integrations', 1, 1, '["admin:read"]')
        ]
        
        for endpoint_data in default_endpoints:
            cursor.execute('''
                INSERT OR IGNORE INTO api_endpoints 
                (path, method, name, description, is_active, requires_auth, required_scopes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ''', endpoint_data)
        
        # Insert default API quota
        cursor.execute('''
            INSERT OR IGNORE INTO api_quotas 
            (name, description, created_by)
            VALUES ('Default Quota', 'Default API quota for new users', 1)
        ''')
        
        # Commit changes
        conn.commit()
        print("✅ API Management tables created successfully!")
        
        # Print table info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'api_%'")
        tables = cursor.fetchall()
        print(f"📊 Created {len(tables)} API management tables:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"   - {table[0]}: {count} records")
            
    except Exception as e:
        print(f"❌ Error creating API management tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_api_management_tables()