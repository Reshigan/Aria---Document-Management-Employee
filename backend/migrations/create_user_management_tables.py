"""
Create User Management Tables Migration
"""

import sqlite3
import os
import hashlib
import secrets
from datetime import datetime

def create_user_management_tables():
    """Create all user management related tables"""
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'aria_document_management.db')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                display_name VARCHAR(200),
                password_hash VARCHAR(255) NOT NULL,
                password_salt VARCHAR(255) NOT NULL,
                password_reset_token VARCHAR(255),
                password_reset_expires DATETIME,
                is_active BOOLEAN DEFAULT 1,
                is_verified BOOLEAN DEFAULT 0,
                is_locked BOOLEAN DEFAULT 0,
                lock_reason VARCHAR(255),
                locked_until DATETIME,
                avatar_url VARCHAR(500),
                phone_number VARCHAR(20),
                job_title VARCHAR(100),
                department VARCHAR(100),
                manager_id INTEGER,
                timezone VARCHAR(50) DEFAULT 'UTC',
                language VARCHAR(10) DEFAULT 'en',
                theme VARCHAR(20) DEFAULT 'light',
                notification_preferences JSON DEFAULT '{}',
                two_factor_enabled BOOLEAN DEFAULT 0,
                two_factor_secret VARCHAR(255),
                backup_codes JSON DEFAULT '[]',
                security_questions JSON DEFAULT '[]',
                last_login_at DATETIME,
                last_login_ip VARCHAR(45),
                login_count INTEGER DEFAULT 0,
                failed_login_attempts INTEGER DEFAULT 0,
                last_failed_login DATETIME,
                api_key_hash VARCHAR(255),
                api_key_created_at DATETIME,
                api_rate_limit INTEGER DEFAULT 1000,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME,
                FOREIGN KEY (manager_id) REFERENCES users (id)
            )
        ''')
        
        # Create indexes for Users
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_is_locked ON users(is_locked)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)')
        
        # Create Roles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                display_name VARCHAR(200) NOT NULL,
                description TEXT,
                is_system_role BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                priority INTEGER DEFAULT 0,
                color VARCHAR(7) DEFAULT '#6B7280',
                icon VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Roles
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_roles_is_system_role ON roles(is_system_role)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority)')
        
        # Create Permissions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                display_name VARCHAR(200) NOT NULL,
                description TEXT,
                category VARCHAR(50) NOT NULL,
                resource VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                is_system_permission BOOLEAN DEFAULT 0,
                is_dangerous BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for Permissions
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_permissions_is_system_permission ON permissions(is_system_permission)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_permissions_is_dangerous ON permissions(is_dangerous)')
        
        # Create User Roles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role_id INTEGER NOT NULL,
                assigned_by INTEGER NOT NULL,
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                assignment_reason TEXT,
                is_temporary BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_by) REFERENCES users (id)
            )
        ''')
        
        # Create indexes for User Roles
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON user_roles(assigned_by)')
        
        # Create Role Permissions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role_id INTEGER NOT NULL,
                permission_id INTEGER NOT NULL,
                granted_by INTEGER NOT NULL,
                granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
                FOREIGN KEY (granted_by) REFERENCES users (id)
            )
        ''')
        
        # Create indexes for Role Permissions
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_role_permissions_granted_by ON role_permissions(granted_by)')
        
        # Create User Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token VARCHAR(255) NOT NULL UNIQUE,
                refresh_token VARCHAR(255) UNIQUE,
                ip_address VARCHAR(45) NOT NULL,
                user_agent TEXT,
                device_info JSON DEFAULT '{}',
                location_info JSON DEFAULT '{}',
                is_active BOOLEAN DEFAULT 1,
                is_mobile BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                terminated_at DATETIME,
                termination_reason VARCHAR(100),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for User Sessions
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_address ON user_sessions(ip_address)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)')
        
        # Create User Audit Logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(50) NOT NULL,
                resource_id VARCHAR(100),
                description TEXT NOT NULL,
                old_values JSON DEFAULT '{}',
                new_values JSON DEFAULT '{}',
                ip_address VARCHAR(45),
                user_agent TEXT,
                session_id VARCHAR(255),
                success BOOLEAN NOT NULL,
                error_message TEXT,
                metadata JSON DEFAULT '{}',
                severity VARCHAR(20) DEFAULT 'info',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )
        ''')
        
        # Create indexes for User Audit Logs
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action ON user_audit_logs(action)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_resource_type ON user_audit_logs(resource_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_resource_id ON user_audit_logs(resource_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_ip_address ON user_audit_logs(ip_address)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_session_id ON user_audit_logs(session_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_success ON user_audit_logs(success)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_severity ON user_audit_logs(severity)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs(created_at)')
        
        # Create User Groups table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                display_name VARCHAR(200) NOT NULL,
                description TEXT,
                group_type VARCHAR(50) DEFAULT 'custom',
                is_active BOOLEAN DEFAULT 1,
                auto_join_rules JSON DEFAULT '{}',
                max_members INTEGER,
                color VARCHAR(7) DEFAULT '#6B7280',
                icon VARCHAR(50),
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')
        
        # Create indexes for User Groups
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_groups_name ON user_groups(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_groups_group_type ON user_groups(group_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_groups_is_active ON user_groups(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_groups_created_by ON user_groups(created_by)')
        
        # Create User Group Members table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_group_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                group_id INTEGER NOT NULL,
                role_in_group VARCHAR(50) DEFAULT 'member',
                added_by INTEGER NOT NULL,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES user_groups (id) ON DELETE CASCADE,
                FOREIGN KEY (added_by) REFERENCES users (id)
            )
        ''')
        
        # Create indexes for User Group Members
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_group_members_user_id ON user_group_members(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_group_members_group_id ON user_group_members(group_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_group_members_role_in_group ON user_group_members(role_in_group)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_group_members_added_by ON user_group_members(added_by)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_group_members_is_active ON user_group_members(is_active)')
        
        # Create User Preferences table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category VARCHAR(50) NOT NULL,
                key VARCHAR(100) NOT NULL,
                value TEXT NOT NULL,
                value_type VARCHAR(20) DEFAULT 'string',
                is_system_preference BOOLEAN DEFAULT 0,
                is_encrypted BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for User Preferences
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(key)')
        
        # Create User Notifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                notification_type VARCHAR(50) NOT NULL,
                priority VARCHAR(20) DEFAULT 'normal',
                category VARCHAR(50) NOT NULL,
                is_read BOOLEAN DEFAULT 0,
                is_dismissed BOOLEAN DEFAULT 0,
                read_at DATETIME,
                data JSON DEFAULT '{}',
                action_url VARCHAR(500),
                delivery_methods JSON DEFAULT '[]',
                delivered_at JSON DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for User Notifications
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_type ON user_notifications(notification_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON user_notifications(priority)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_notifications_category ON user_notifications(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_notifications_is_dismissed ON user_notifications(is_dismissed)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at)')
        
        # Create User Activities table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                activity_type VARCHAR(50) NOT NULL,
                activity_name VARCHAR(100) NOT NULL,
                description TEXT,
                resource_type VARCHAR(50),
                resource_id VARCHAR(100),
                metadata JSON DEFAULT '{}',
                duration REAL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                session_id VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for User Activities
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_activities_resource_type ON user_activities(resource_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_activities_resource_id ON user_activities(resource_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_activities_ip_address ON user_activities(ip_address)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON user_activities(session_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at)')
        
        # Create triggers for updated_at timestamps
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_users_updated_at
            AFTER UPDATE ON users
            FOR EACH ROW
            BEGIN
                UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_roles_updated_at
            AFTER UPDATE ON roles
            FOR EACH ROW
            BEGIN
                UPDATE roles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_permissions_updated_at
            AFTER UPDATE ON permissions
            FOR EACH ROW
            BEGIN
                UPDATE permissions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_user_groups_updated_at
            AFTER UPDATE ON user_groups
            FOR EACH ROW
            BEGIN
                UPDATE user_groups SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        cursor.execute('''
            CREATE TRIGGER IF NOT EXISTS update_user_preferences_updated_at
            AFTER UPDATE ON user_preferences
            FOR EACH ROW
            BEGIN
                UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        ''')
        
        # Insert default roles
        cursor.execute('''
            INSERT OR IGNORE INTO roles (id, name, display_name, description, is_system_role, priority, color) VALUES
            (1, 'admin', 'Administrator', 'Full system access with all permissions', 1, 100, '#DC2626'),
            (2, 'manager', 'Manager', 'Management access with user and content management permissions', 1, 75, '#059669'),
            (3, 'editor', 'Editor', 'Content editing and document management permissions', 1, 50, '#2563EB'),
            (4, 'user', 'User', 'Basic user access with read and limited write permissions', 1, 25, '#6B7280'),
            (5, 'viewer', 'Viewer', 'Read-only access to documents and content', 1, 10, '#9CA3AF')
        ''')
        
        # Insert default permissions
        permissions = [
            # User management permissions
            ('users.create', 'Create Users', 'Create new user accounts', 'users', 'user', 'create', 1, 0),
            ('users.read', 'View Users', 'View user information and profiles', 'users', 'user', 'read', 1, 0),
            ('users.update', 'Update Users', 'Update user information and profiles', 'users', 'user', 'update', 1, 0),
            ('users.delete', 'Delete Users', 'Delete user accounts', 'users', 'user', 'delete', 1, 1),
            ('users.statistics', 'User Statistics', 'View user management statistics', 'users', 'user', 'statistics', 1, 0),
            
            # Role management permissions
            ('roles.create', 'Create Roles', 'Create new roles', 'users', 'role', 'create', 1, 0),
            ('roles.read', 'View Roles', 'View role information', 'users', 'role', 'read', 1, 0),
            ('roles.update', 'Update Roles', 'Update role information', 'users', 'role', 'update', 1, 0),
            ('roles.delete', 'Delete Roles', 'Delete roles', 'users', 'role', 'delete', 1, 1),
            ('roles.assign', 'Assign Roles', 'Assign roles to users', 'users', 'role', 'assign', 1, 0),
            
            # Document management permissions
            ('documents.create', 'Create Documents', 'Create new documents', 'documents', 'document', 'create', 1, 0),
            ('documents.read', 'View Documents', 'View documents and content', 'documents', 'document', 'read', 1, 0),
            ('documents.update', 'Update Documents', 'Update document content and metadata', 'documents', 'document', 'update', 1, 0),
            ('documents.delete', 'Delete Documents', 'Delete documents', 'documents', 'document', 'delete', 1, 0),
            ('documents.share', 'Share Documents', 'Share documents with others', 'documents', 'document', 'share', 1, 0),
            
            # System administration permissions
            ('system.backup', 'System Backup', 'Create and manage system backups', 'system', 'backup', 'manage', 1, 0),
            ('system.restore', 'System Restore', 'Restore system from backups', 'system', 'backup', 'restore', 1, 1),
            ('system.settings', 'System Settings', 'Manage system configuration', 'system', 'settings', 'manage', 1, 1),
            ('system.logs', 'System Logs', 'View system logs and audit trails', 'system', 'logs', 'read', 1, 0),
            ('system.health', 'System Health', 'View system health and monitoring', 'system', 'health', 'read', 1, 0)
        ]
        
        for perm in permissions:
            cursor.execute('''
                INSERT OR IGNORE INTO permissions 
                (name, display_name, description, category, resource, action, is_system_permission, is_dangerous)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', perm)
        
        # Assign permissions to roles
        role_permissions = [
            # Admin gets all permissions
            (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
            (1, 11), (1, 12), (1, 13), (1, 14), (1, 15), (1, 16), (1, 17), (1, 18), (1, 19), (1, 20),
            
            # Manager gets user and document management permissions
            (2, 2), (2, 3), (2, 5), (2, 7), (2, 10), (2, 11), (2, 12), (2, 13), (2, 14), (2, 15), (2, 19), (2, 20),
            
            # Editor gets document permissions
            (3, 2), (3, 7), (3, 11), (3, 12), (3, 13), (3, 15), (3, 20),
            
            # User gets basic permissions
            (4, 2), (4, 7), (4, 11), (4, 12), (4, 15), (4, 20),
            
            # Viewer gets read-only permissions
            (5, 2), (5, 7), (5, 12), (5, 20)
        ]
        
        for role_id, perm_id in role_permissions:
            cursor.execute('''
                INSERT OR IGNORE INTO role_permissions (role_id, permission_id, granted_by)
                VALUES (?, ?, 1)
            ''', (role_id, perm_id))
        
        # Create default admin user
        admin_password = "admin123"
        admin_salt = secrets.token_hex(32)
        admin_hash = hashlib.pbkdf2_hmac('sha256', admin_password.encode(), admin_salt.encode(), 100000).hex()
        
        cursor.execute('''
            INSERT OR IGNORE INTO users (
                id, username, email, first_name, last_name, display_name,
                password_hash, password_salt, is_active, is_verified
            ) VALUES (
                1, 'admin', 'admin@aria-docs.com', 'System', 'Administrator', 'System Administrator',
                ?, ?, 1, 1
            )
        ''', (admin_hash, admin_salt))
        
        # Assign admin role to admin user
        cursor.execute('''
            INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_by)
            VALUES (1, 1, 1)
        ''')
        
        # Create default user groups
        cursor.execute('''
            INSERT OR IGNORE INTO user_groups (
                id, name, display_name, description, group_type, created_by
            ) VALUES 
            (1, 'administrators', 'Administrators', 'System administrators group', 'system', 1),
            (2, 'managers', 'Managers', 'Management team group', 'department', 1),
            (3, 'employees', 'Employees', 'All employees group', 'department', 1)
        ''')
        
        # Add admin to administrators group
        cursor.execute('''
            INSERT OR IGNORE INTO user_group_members (user_id, group_id, role_in_group, added_by)
            VALUES (1, 1, 'admin', 1)
        ''')
        
        # Commit changes
        conn.commit()
        print("✅ User Management tables created successfully!")
        
        # Print table info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%user%' OR name LIKE '%role%' OR name LIKE '%permission%')")
        tables = cursor.fetchall()
        print(f"📊 Created {len(tables)} user management tables:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"   - {table[0]}: {count} records")
        
        print("\n🔐 Default admin user created:")
        print("   Username: admin")
        print("   Email: admin@aria-docs.com")
        print("   Password: admin123")
        print("   ⚠️  Please change the default password after first login!")
            
    except Exception as e:
        print(f"❌ Error creating user management tables: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_user_management_tables()