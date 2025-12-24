-- ARIA ERP - D1 Database Schema for Authentication
-- This migration creates the core tables needed for authentication

-- Companies table (multi-tenancy)
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trading_name TEXT,
    email TEXT,
    phone TEXT,
    country TEXT DEFAULT 'South Africa',
    currency TEXT DEFAULT 'ZAR',
    is_active INTEGER DEFAULT 1,
    settings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    is_active INTEGER DEFAULT 1,
    is_superuser INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    company_id TEXT REFERENCES companies(id),
    role TEXT DEFAULT 'user',
    department TEXT,
    phone TEXT,
    avatar_url TEXT,
    last_login_at TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    preferences TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    refresh_token TEXT,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    last_activity TEXT DEFAULT (datetime('now'))
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    company_id TEXT REFERENCES companies(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Insert demo company
INSERT OR IGNORE INTO companies (id, name, trading_name, email, country, currency)
VALUES (
    'b0598135-52fd-4f67-ac56-8f0237e6355e',
    'VantaX Demo',
    'VantaX Holdings',
    'demo@vantax.co.za',
    'South Africa',
    'ZAR'
);
