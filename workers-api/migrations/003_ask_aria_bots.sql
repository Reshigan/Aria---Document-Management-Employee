-- Migration: Ask ARIA and Bots Framework Tables
-- Created: 2024-12-25

-- Ask ARIA Conversations
CREATE TABLE IF NOT EXISTS aria_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    intent TEXT,
    context TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aria_conversations_user ON aria_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_aria_conversations_company ON aria_conversations(company_id);

-- Ask ARIA Messages
CREATE TABLE IF NOT EXISTS aria_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES aria_conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_aria_messages_conversation ON aria_messages(conversation_id);

-- Ask ARIA Documents (for R2 metadata)
CREATE TABLE IF NOT EXISTS aria_documents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    r2_key TEXT NOT NULL,
    status TEXT DEFAULT 'uploaded',
    document_class TEXT,
    confidence REAL,
    extracted_data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aria_documents_company ON aria_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_aria_documents_status ON aria_documents(status);

-- Bot Configurations
CREATE TABLE IF NOT EXISTS bot_configs (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    schedule TEXT,
    config TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(bot_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_configs_company ON bot_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_bot_configs_bot ON bot_configs(bot_id);

-- Bot Run History
CREATE TABLE IF NOT EXISTS bot_runs (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    config TEXT,
    result TEXT,
    error TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bot_runs_company ON bot_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_bot_runs_bot ON bot_runs(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_runs_status ON bot_runs(status);
CREATE INDEX IF NOT EXISTS idx_bot_runs_created ON bot_runs(created_at);

-- Bot Scheduled Jobs
CREATE TABLE IF NOT EXISTS bot_schedules (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(bot_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_schedules_next_run ON bot_schedules(next_run_at);
