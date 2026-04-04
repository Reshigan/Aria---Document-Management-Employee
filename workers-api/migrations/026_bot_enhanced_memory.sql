-- ARIA ERP - Enhanced Bot Memory and Learning System
-- Adds memory and learning capabilities to the bot framework

-- Bot Memory Storage - Persistent memory for each bot/company combination
CREATE TABLE IF NOT EXISTS bot_memories (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    memory_type TEXT NOT NULL, -- 'experience', 'pattern', 'preference', 'context', 'knowledge_base'
    content TEXT NOT NULL, -- JSON-serialized memory content
    importance INTEGER DEFAULT 5, -- 1-10 scale (10 = highest importance)
    accessed_count INTEGER DEFAULT 0,
    last_accessed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Memory Indexes
CREATE INDEX IF NOT EXISTS idx_bot_memories_bot ON bot_memories(bot_id, company_id);
CREATE INDEX IF NOT EXISTS idx_bot_memories_type ON bot_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_bot_memories_importance ON bot_memories(importance);
CREATE INDEX IF NOT EXISTS idx_bot_memories_accessed ON bot_memories(last_accessed_at);

-- Bot Learning Journal - Tracks lessons learned from bot executions
CREATE TABLE IF NOT EXISTS bot_learning_journal (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    run_id TEXT,
    lesson_type TEXT NOT NULL, -- 'success_pattern', 'error_analysis', 'optimization', 'edge_case', 'best_practice'
    title TEXT NOT NULL,
    description TEXT,
    solution TEXT,
    impact TEXT, -- 'low', 'medium', 'high', 'critical'
    related_memory_ids TEXT, -- Comma-separated list of memory item IDs
    confidence_score REAL, -- 0-1 confidence in the learning
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (run_id) REFERENCES bot_runs(id)
);

-- Learning Journal Indexes
CREATE INDEX IF NOT EXISTS idx_bot_learning_bot ON bot_learning_journal(bot_id, company_id);
CREATE INDEX IF NOT EXISTS idx_bot_learning_type ON bot_learning_journal(lesson_type);
CREATE INDEX IF NOT EXISTS idx_bot_learning_impact ON bot_learning_journal(impact);
CREATE INDEX IF NOT EXISTS idx_bot_learning_archived ON bot_learning_journal(archived);

-- Bot Performance Metrics - Historical performance tracking
CREATE TABLE IF NOT EXISTS bot_performance_metrics (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    metric_name TEXT NOT NULL, -- 'execution_time', 'success_rate', 'error_frequency', 'data_volume_processed'
    value REAL NOT NULL,
    context TEXT, -- JSON context about conditions under which metric was captured
    recorded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Performance Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_bot_performance_bot ON bot_performance_metrics(bot_id, company_id);
CREATE INDEX IF NOT EXISTS idx_bot_performance_metric ON bot_performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_bot_performance_recorded ON bot_performance_metrics(recorded_at);

-- Bot Collaboration Context - Shared context between bots in workflows
CREATE TABLE IF NOT EXISTS bot_collaboration_context (
    id TEXT PRIMARY KEY,
    workflow_id TEXT, -- Associated workflow ID if part of workflow
    run_id TEXT, -- Specific workflow/bot run
    initiator_bot_id TEXT,
    collaborating_bot_ids TEXT NOT NULL, -- Comma-separated list
    shared_data TEXT NOT NULL, -- JSON data being shared
    context_ttl INTEGER DEFAULT 3600, -- Time-to-live in seconds (default 1 hour)
    expires_at TEXT NOT NULL, -- Calculated expiration time
    created_at TEXT DEFAULT (datetime('now'))
);

-- Collaboration Context Indexes
CREATE INDEX IF NOT EXISTS idx_bot_collaboration_workflow ON bot_collaboration_context(workflow_id);
CREATE INDEX IF NOT EXISTS idx_bot_collaboration_run ON bot_collaboration_context(run_id);
CREATE INDEX IF NOT EXISTS idx_bot_collaboration_expires ON bot_collaboration_context(expires_at);

-- Bot Preference Templates - Saved configurations and preferences
CREATE TABLE IF NOT EXISTS bot_preference_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bot_id TEXT,
    company_id TEXT,
    category TEXT NOT NULL, -- 'configuration', 'strategy', 'filtering', 'reporting'
    preferences TEXT NOT NULL, -- JSON serialized preferences
    is_default INTEGER DEFAULT 0,
    shared_with_teams TEXT, -- JSON array of team IDs that can access
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Preference Templates Indexes
CREATE INDEX IF NOT EXISTS idx_bot_preferences_bot ON bot_preference_templates(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_preferences_company ON bot_preference_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_bot_preferences_category ON bot_preference_templates(category);
CREATE INDEX IF NOT EXISTS idx_bot_preferences_default ON bot_preference_templates(is_default);

-- Insert sample data for demonstration
INSERT OR IGNORE INTO bot_preference_templates 
(id, name, bot_id, company_id, category, preferences, is_default, created_by)
VALUES 
('template-default-ar-collections', 'Standard Collections Strategy', 'ar_collections', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'strategy', 
  '{"follow_up_sequence": ["email", "sms", "call"], "min_balance_threshold": 500, "max_follow_ups": 3}', 1, 'SYSTEM'),
('template-default-bank-recon', 'Monthly Bank Recon Process', 'bank_reconciliation', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'configuration', 
  '{"match_threshold": 0.95, "auto_match_types": ["direct", "range", "partial"], "review_required_above": 10000}', 1, 'SYSTEM'),
('template-default-expense-mgmt', 'Corporate Expense Policy', 'expense_management', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'configuration', 
  '{"auto_approve_limit": 500, "require_receipt_amount": 250, "policy_violation_action": "escalate"}', 1, 'SYSTEM');

-- Analytics Views for Bot Performance Dashboards
CREATE VIEW IF NOT EXISTS v_bot_performance_summary AS
SELECT 
    bot_id,
    COUNT(*) as total_executions,
    AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_rate,
    AVG(CAST((strftime('%s', completed_at) - strftime('%s', started_at)) AS REAL)) as avg_execution_seconds,
    MIN(started_at) as first_execution,
    MAX(started_at) as last_execution
FROM bot_runs 
WHERE started_at IS NOT NULL AND completed_at IS NOT NULL
GROUP BY bot_id;

-- Extended bot run details view
CREATE VIEW IF NOT EXISTS v_bot_runs_extended AS
SELECT 
    br.id,
    br.bot_id,
    br.company_id,
    br.status,
    br.started_at,
    br.completed_at,
    CAST((strftime('%s', br.completed_at) - strftime('%s', br.started_at)) AS REAL) as execution_duration_seconds,
    CASE 
        WHEN br.status = 'completed' THEN 'Success'
        WHEN br.status = 'failed' THEN 'Failure'
        WHEN br.status = 'running' THEN 'In Progress'
        ELSE 'Other'
    END as execution_outcome,
    substr(br.created_at, 1, 7) as execution_month
FROM bot_runs br
WHERE br.started_at IS NOT NULL AND br.completed_at IS NOT NULL;