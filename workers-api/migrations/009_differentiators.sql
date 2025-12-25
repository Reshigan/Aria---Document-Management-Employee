-- Migration 009: Phase D Differentiators
-- WhatsApp workflows, Mobile/Offline sync, Spreadsheet migration

-- ==================== WHATSAPP WORKFLOWS ====================

-- WhatsApp message log
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id),
    phone_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_text TEXT,
    message_id TEXT,
    template_name TEXT,
    status TEXT DEFAULT 'received',
    created_at TEXT DEFAULT (datetime('now'))
);

-- ==================== MOBILE/OFFLINE SYNC ====================

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    company_id TEXT NOT NULL REFERENCES companies(id),
    endpoint TEXT NOT NULL,
    p256dh_key TEXT,
    auth_key TEXT,
    device_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, endpoint)
);

-- Offline sync queue
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    company_id TEXT NOT NULL REFERENCES companies(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    payload TEXT,
    client_timestamp TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    result TEXT,
    processed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ==================== SPREADSHEET MIGRATION ====================

-- Migration jobs
CREATE TABLE IF NOT EXISTS migration_jobs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    entity_type TEXT NOT NULL,
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'completed_with_errors', 'failed', 'rolled_back')),
    uploaded_data TEXT,
    errors TEXT,
    import_errors TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON whatsapp_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_user ON offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_status ON offline_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_company ON migration_jobs(company_id);
