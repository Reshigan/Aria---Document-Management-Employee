"""
Create integration tables for external system integrations
"""

import sqlite3
from datetime import datetime

def create_integration_tables(db_path: str):
    """Create all integration-related tables"""
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create integrations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS integrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'inactive',
                description TEXT,
                config JSON DEFAULT '{}',
                credentials JSON DEFAULT '{}',
                endpoint_url VARCHAR(500),
                api_version VARCHAR(20),
                timeout INTEGER DEFAULT 30,
                retry_count INTEGER DEFAULT 3,
                last_sync DATETIME,
                last_error TEXT,
                error_count INTEGER DEFAULT 0,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create integration_sync_logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS integration_sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_id INTEGER NOT NULL,
                sync_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                records_processed INTEGER DEFAULT 0,
                records_created INTEGER DEFAULT 0,
                records_updated INTEGER DEFAULT 0,
                records_failed INTEGER DEFAULT 0,
                started_at DATETIME NOT NULL,
                completed_at DATETIME,
                duration_seconds INTEGER,
                error_message TEXT,
                error_details JSON,
                triggered_by INTEGER,
                FOREIGN KEY (integration_id) REFERENCES integrations (id) ON DELETE CASCADE,
                FOREIGN KEY (triggered_by) REFERENCES users (id)
            )
        """)
        
        # Create webhook_endpoints table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS webhook_endpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_id INTEGER,
                name VARCHAR(100) NOT NULL,
                url VARCHAR(500) NOT NULL,
                secret VARCHAR(100),
                events JSON NOT NULL DEFAULT '[]',
                is_active BOOLEAN DEFAULT 1,
                retry_count INTEGER DEFAULT 3,
                timeout INTEGER DEFAULT 30,
                headers JSON DEFAULT '{}',
                auth_type VARCHAR(20) DEFAULT 'none',
                auth_config JSON DEFAULT '{}',
                last_triggered DATETIME,
                last_success DATETIME,
                last_error TEXT,
                success_count INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (integration_id) REFERENCES integrations (id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create webhook_deliveries table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS webhook_deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                webhook_id INTEGER NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                payload JSON NOT NULL,
                request_headers JSON,
                request_body TEXT,
                response_status INTEGER,
                response_headers JSON,
                response_body TEXT,
                triggered_at DATETIME NOT NULL,
                delivered_at DATETIME,
                duration_ms INTEGER,
                status VARCHAR(20) NOT NULL,
                retry_count INTEGER DEFAULT 0,
                error_message TEXT,
                FOREIGN KEY (webhook_id) REFERENCES webhook_endpoints (id) ON DELETE CASCADE
            )
        """)
        
        # Create sap_connections table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sap_connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_id INTEGER NOT NULL,
                system_id VARCHAR(10) NOT NULL,
                client VARCHAR(3) NOT NULL,
                host VARCHAR(100) NOT NULL,
                port INTEGER DEFAULT 3300,
                username VARCHAR(50) NOT NULL,
                password_encrypted VARCHAR(500),
                language VARCHAR(2) DEFAULT 'EN',
                pool_size INTEGER DEFAULT 5,
                is_active BOOLEAN DEFAULT 1,
                last_connection DATETIME,
                connection_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (integration_id) REFERENCES integrations (id) ON DELETE CASCADE
            )
        """)
        
        # Create email_configurations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS email_configurations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_id INTEGER NOT NULL,
                smtp_host VARCHAR(100) NOT NULL,
                smtp_port INTEGER DEFAULT 587,
                use_tls BOOLEAN DEFAULT 1,
                use_ssl BOOLEAN DEFAULT 0,
                username VARCHAR(100) NOT NULL,
                password_encrypted VARCHAR(500),
                from_email VARCHAR(100) NOT NULL,
                from_name VARCHAR(100),
                reply_to VARCHAR(100),
                templates JSON DEFAULT '{}',
                is_active BOOLEAN DEFAULT 1,
                last_test DATETIME,
                test_status VARCHAR(20),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (integration_id) REFERENCES integrations (id) ON DELETE CASCADE
            )
        """)
        
        # Create cloud_storage_connections table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cloud_storage_connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_id INTEGER NOT NULL,
                provider VARCHAR(20) NOT NULL,
                connection_config JSON NOT NULL DEFAULT '{}',
                auth_config JSON NOT NULL DEFAULT '{}',
                default_bucket VARCHAR(100),
                default_folder VARCHAR(200),
                sync_enabled BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                last_sync DATETIME,
                sync_status VARCHAR(20),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (integration_id) REFERENCES integrations (id) ON DELETE CASCADE
            )
        """)
        
        # Create slack_teams_connections table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS slack_teams_connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_id INTEGER NOT NULL,
                platform VARCHAR(10) NOT NULL,
                workspace_id VARCHAR(50),
                workspace_name VARCHAR(100),
                access_token VARCHAR(500),
                refresh_token VARCHAR(500),
                token_expires_at DATETIME,
                bot_user_id VARCHAR(50),
                app_id VARCHAR(50),
                default_channel VARCHAR(50),
                notification_channels JSON DEFAULT '[]',
                is_active BOOLEAN DEFAULT 1,
                last_activity DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (integration_id) REFERENCES integrations (id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_integrations_created_by ON integrations (created_by)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations (type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations (status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_logs_integration_id ON integration_sync_logs (integration_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON integration_sync_logs (started_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_integration_id ON webhook_endpoints (integration_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries (webhook_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_triggered_at ON webhook_deliveries (triggered_at)")
        
        conn.commit()
        print("✅ Integration tables created successfully")
        
        # Insert sample data for testing
        insert_sample_data(cursor)
        conn.commit()
        print("✅ Sample integration data inserted")
        
    except Exception as e:
        print(f"❌ Error creating integration tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def insert_sample_data(cursor):
    """Insert sample integration data for testing"""
    
    # Check if we already have sample data
    cursor.execute("SELECT COUNT(*) FROM integrations")
    if cursor.fetchone()[0] > 0:
        return
    
    # Get a user ID for the sample data
    cursor.execute("SELECT id FROM users LIMIT 1")
    user_result = cursor.fetchone()
    if not user_result:
        print("⚠️ No users found, skipping sample integration data")
        return
    
    user_id = user_result[0]
    
    # Sample integrations
    sample_integrations = [
        {
            'name': 'Company Email Server',
            'type': 'email',
            'status': 'active',
            'description': 'Main SMTP server for sending notifications',
            'config': '{"smtp_host": "smtp.company.com", "smtp_port": 587, "use_tls": true}',
            'endpoint_url': 'smtp.company.com',
            'created_by': user_id
        },
        {
            'name': 'Slack Notifications',
            'type': 'slack',
            'status': 'inactive',
            'description': 'Slack workspace for team notifications',
            'config': '{"workspace": "company-workspace", "default_channel": "#general"}',
            'endpoint_url': 'https://hooks.slack.com/services/...',
            'created_by': user_id
        },
        {
            'name': 'AWS S3 Storage',
            'type': 'aws_s3',
            'status': 'active',
            'description': 'Document backup and archival storage',
            'config': '{"bucket": "company-documents", "region": "us-east-1"}',
            'endpoint_url': 'https://s3.amazonaws.com',
            'created_by': user_id
        },
        {
            'name': 'Document Processing Webhook',
            'type': 'webhook',
            'status': 'active',
            'description': 'External document processing service',
            'config': '{"events": ["document_created", "document_updated"]}',
            'endpoint_url': 'https://api.docprocessor.com/webhook',
            'created_by': user_id
        }
    ]
    
    for integration in sample_integrations:
        cursor.execute("""
            INSERT INTO integrations (name, type, status, description, config, endpoint_url, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            integration['name'],
            integration['type'],
            integration['status'],
            integration['description'],
            integration['config'],
            integration['endpoint_url'],
            integration['created_by']
        ))
    
    # Sample email configuration
    cursor.execute("""
        INSERT INTO email_configurations (
            integration_id, smtp_host, smtp_port, use_tls, username, 
            from_email, from_name, is_active
        ) VALUES (1, 'smtp.company.com', 587, 1, 'notifications@company.com', 
                 'notifications@company.com', 'ARIA Document System', 1)
    """)
    
    # Sample webhook endpoint
    cursor.execute("""
        INSERT INTO webhook_endpoints (
            integration_id, name, url, events, is_active, created_by
        ) VALUES (4, 'Document Processing', 'https://api.docprocessor.com/webhook', 
                 '["document_created", "document_updated"]', 1, ?)
    """, (user_id,))
    
    # Sample sync logs
    cursor.execute("""
        INSERT INTO integration_sync_logs (
            integration_id, sync_type, status, records_processed, 
            records_created, records_updated, started_at, completed_at, duration_seconds
        ) VALUES (3, 'full', 'success', 150, 25, 125, 
                 datetime('now', '-1 hour'), datetime('now', '-55 minutes'), 300)
    """)

if __name__ == "__main__":
    # For testing
    create_integration_tables("aria.db")