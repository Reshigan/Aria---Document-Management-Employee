"""
Create security tables migration
"""

from sqlalchemy import create_engine, text
from core.config import Settings
import logging

logger = logging.getLogger(__name__)

def create_security_tables():
    """Create all security-related tables"""
    settings = Settings()
    database_url = settings.get_database_url()
    
    # Convert async URL to sync URL for migration
    if database_url.startswith("sqlite+aiosqlite"):
        database_url = database_url.replace("sqlite+aiosqlite", "sqlite")
    elif database_url.startswith("postgresql+asyncpg"):
        database_url = database_url.replace("postgresql+asyncpg", "postgresql")
    
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        try:
            # Create permissions table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS permissions (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    resource_type VARCHAR(50) NOT NULL,
                    permission_type VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                );
                CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
            """))
            
            # Create roles table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS roles (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50) UNIQUE NOT NULL,
                    description TEXT,
                    is_system_role BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                );
                CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
            """))
            
            # Create role_permissions table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS role_permissions (
                    id SERIAL PRIMARY KEY,
                    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                    granted_by INTEGER REFERENCES users(id),
                    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(role_id, permission_id)
                );
            """))
            
            # Create user_roles table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_roles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                    assigned_by INTEGER REFERENCES users(id),
                    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP WITH TIME ZONE,
                    is_active BOOLEAN DEFAULT TRUE,
                    UNIQUE(user_id, role_id)
                );
                CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
            """))
            
            # Create user_sessions table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    refresh_token VARCHAR(255) UNIQUE NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    device_info JSONB,
                    location JSONB,
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    revoked_at TIMESTAMP WITH TIME ZONE,
                    revoked_by INTEGER REFERENCES users(id)
                );
                CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
                CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
                CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
            """))
            
            # Create password_history table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS password_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
            """))
            
            # Create two_factor_auth table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS two_factor_auth (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    secret_key VARCHAR(255) NOT NULL,
                    backup_codes JSONB,
                    is_enabled BOOLEAN DEFAULT FALSE,
                    enabled_at TIMESTAMP WITH TIME ZONE,
                    last_used TIMESTAMP WITH TIME ZONE
                );
            """))
            
            # Create security_events table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS security_events (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    event_type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) DEFAULT 'medium',
                    description TEXT NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    additional_data JSONB,
                    resolved BOOLEAN DEFAULT FALSE,
                    resolved_by INTEGER REFERENCES users(id),
                    resolved_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
                CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
                CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
            """))
            
            # Create audit_logs table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    session_id INTEGER REFERENCES user_sessions(id),
                    action VARCHAR(50) NOT NULL,
                    resource_type VARCHAR(50),
                    resource_id INTEGER,
                    resource_name VARCHAR(255),
                    description TEXT,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    request_data JSONB,
                    response_data JSONB,
                    success BOOLEAN DEFAULT TRUE,
                    error_message TEXT,
                    execution_time_ms INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
                CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
                CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
                CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
            """))
            
            # Create api_keys table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    key_hash VARCHAR(255) UNIQUE NOT NULL,
                    key_prefix VARCHAR(10) NOT NULL,
                    permissions JSONB,
                    rate_limit INTEGER DEFAULT 1000,
                    is_active BOOLEAN DEFAULT TRUE,
                    last_used TIMESTAMP WITH TIME ZONE,
                    usage_count INTEGER DEFAULT 0,
                    expires_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                );
                CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
                CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
            """))
            
            # Create login_attempts table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    ip_address VARCHAR(45) NOT NULL,
                    user_agent TEXT,
                    success BOOLEAN NOT NULL,
                    failure_reason VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
                CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
                CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
            """))
            
            # Create account_lockouts table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS account_lockouts (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    reason VARCHAR(100) NOT NULL,
                    locked_by INTEGER REFERENCES users(id),
                    locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    unlock_at TIMESTAMP WITH TIME ZONE,
                    unlocked_by INTEGER REFERENCES users(id),
                    unlocked_at TIMESTAMP WITH TIME ZONE,
                    is_active BOOLEAN DEFAULT TRUE
                );
                CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);
            """))
            
            # Create security_policies table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS security_policies (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    policy_type VARCHAR(50) NOT NULL,
                    settings JSONB NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE
                );
            """))
            
            # Add password_changed_at column to users table if it doesn't exist
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;
            """))
            
            # Insert default permissions
            conn.execute(text("""
                INSERT INTO permissions (name, description, resource_type, permission_type) VALUES
                ('documents.read', 'Read documents', 'document', 'read'),
                ('documents.write', 'Create and edit documents', 'document', 'write'),
                ('documents.delete', 'Delete documents', 'document', 'delete'),
                ('documents.share', 'Share documents', 'document', 'execute'),
                ('folders.read', 'Read folders', 'folder', 'read'),
                ('folders.write', 'Create and edit folders', 'folder', 'write'),
                ('folders.delete', 'Delete folders', 'folder', 'delete'),
                ('workflows.read', 'Read workflows', 'workflow', 'read'),
                ('workflows.write', 'Create and edit workflows', 'workflow', 'write'),
                ('workflows.execute', 'Execute workflows', 'workflow', 'execute'),
                ('workflows.delete', 'Delete workflows', 'workflow', 'delete'),
                ('users.read', 'Read user information', 'user', 'read'),
                ('users.write', 'Create and edit users', 'user', 'write'),
                ('users.delete', 'Delete users', 'user', 'delete'),
                ('admin.roles.read', 'Read roles', 'role', 'read'),
                ('admin.roles.create', 'Create roles', 'role', 'write'),
                ('admin.roles.delete', 'Delete roles', 'role', 'delete'),
                ('admin.users.manage_roles', 'Manage user roles', 'user', 'admin'),
                ('admin.security.dashboard', 'Access security dashboard', 'security', 'read'),
                ('admin.security.events', 'View security events', 'security', 'read'),
                ('admin.audit.read', 'Read audit logs', 'audit', 'read'),
                ('admin.system.settings', 'Manage system settings', 'system', 'admin')
                ON CONFLICT (name) DO NOTHING;
            """))
            
            # Insert default roles
            conn.execute(text("""
                INSERT INTO roles (name, description, is_system_role) VALUES
                ('super_admin', 'Super Administrator with full access', true),
                ('admin', 'Administrator with management access', true),
                ('manager', 'Manager with team oversight', true),
                ('user', 'Regular user with standard access', true),
                ('viewer', 'Read-only access', true)
                ON CONFLICT (name) DO NOTHING;
            """))
            
            # Assign permissions to roles
            conn.execute(text("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r, permissions p
                WHERE r.name = 'super_admin'
                ON CONFLICT (role_id, permission_id) DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r, permissions p
                WHERE r.name = 'admin' AND p.name NOT LIKE 'admin.system.%'
                ON CONFLICT (role_id, permission_id) DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r, permissions p
                WHERE r.name = 'user' AND p.name IN (
                    'documents.read', 'documents.write', 'documents.share',
                    'folders.read', 'folders.write',
                    'workflows.read', 'workflows.execute'
                )
                ON CONFLICT (role_id, permission_id) DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r, permissions p
                WHERE r.name = 'viewer' AND p.name IN (
                    'documents.read', 'folders.read', 'workflows.read'
                )
                ON CONFLICT (role_id, permission_id) DO NOTHING;
            """))
            
            conn.commit()
            logger.info("Security tables created successfully")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Error creating security tables: {str(e)}")
            raise

if __name__ == "__main__":
    create_security_tables()