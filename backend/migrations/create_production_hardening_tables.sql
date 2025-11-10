
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(200) NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- 'document_processing', 'email_sending', 'report_generation', 'data_sync', 'cleanup'
    job_category VARCHAR(50), -- 'scheduled', 'triggered', 'manual'
    company_id UUID REFERENCES companies(id),
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
    priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    payload JSONB, -- Job parameters
    result JSONB, -- Job result data
    error_message TEXT,
    error_traceback TEXT,
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_type ON background_jobs(job_type);
CREATE INDEX idx_background_jobs_priority ON background_jobs(priority, created_at);
CREATE INDEX idx_background_jobs_company ON background_jobs(company_id);
CREATE INDEX idx_background_jobs_created ON background_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name VARCHAR(200) NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- 'report', 'backup', 'cleanup', 'sync', 'notification'
    company_id UUID REFERENCES companies(id),
    schedule_type VARCHAR(50) NOT NULL, -- 'cron', 'interval', 'daily', 'weekly', 'monthly'
    schedule_expression VARCHAR(200) NOT NULL, -- Cron expression or interval
    task_parameters JSONB,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    last_run_status VARCHAR(50), -- 'success', 'failed'
    next_run_at TIMESTAMP,
    run_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_tasks_company ON scheduled_tasks(company_id);
CREATE INDEX idx_scheduled_tasks_active ON scheduled_tasks(is_active);
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at);

CREATE TABLE IF NOT EXISTS system_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_name VARCHAR(200) NOT NULL,
    check_type VARCHAR(50) NOT NULL, -- 'database', 'api', 'storage', 'email', 'external_service'
    status VARCHAR(50) NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
    response_time_ms INTEGER,
    details JSONB, -- Check-specific details
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_health_checks_type ON system_health_checks(check_type);
CREATE INDEX idx_system_health_checks_status ON system_health_checks(status);
CREATE INDEX idx_system_health_checks_checked ON system_health_checks(checked_at DESC);

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'counter', 'gauge', 'histogram'
    metric_category VARCHAR(50), -- 'performance', 'usage', 'errors', 'business'
    value DECIMAL(15,2) NOT NULL,
    unit VARCHAR(50), -- 'ms', 'count', 'bytes', 'percentage'
    tags JSONB, -- Additional tags/dimensions
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_category ON system_metrics(metric_category);
CREATE INDEX idx_system_metrics_recorded ON system_metrics(recorded_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    user_id UUID,
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'post', 'export', 'login', 'logout'
    entity_type VARCHAR(50) NOT NULL, -- 'journal_entry', 'invoice', 'payment', 'user', 'company', etc.
    entity_id UUID,
    entity_description VARCHAR(500),
    old_values JSONB, -- Previous values (for updates)
    new_values JSONB, -- New values (for creates/updates)
    ip_address VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(100),
    is_high_risk BOOLEAN DEFAULT false, -- High-risk actions (deletions, approvals, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_company ON audit_log(company_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_high_risk ON audit_log(is_high_risk);

CREATE TABLE IF NOT EXISTS error_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    user_id UUID,
    error_type VARCHAR(50) NOT NULL, -- 'validation', 'database', 'api', 'integration', 'system'
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    error_traceback TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    request_params JSONB,
    response_status INTEGER,
    severity VARCHAR(50) DEFAULT 'error', -- 'debug', 'info', 'warning', 'error', 'critical'
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_error_log_company ON error_log(company_id);
CREATE INDEX idx_error_log_user ON error_log(user_id);
CREATE INDEX idx_error_log_type ON error_log(error_type);
CREATE INDEX idx_error_log_severity ON error_log(severity);
CREATE INDEX idx_error_log_created ON error_log(created_at DESC);
CREATE INDEX idx_error_log_resolved ON error_log(is_resolved);

CREATE TABLE IF NOT EXISTS backup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'differential'
    backup_scope VARCHAR(50) NOT NULL, -- 'database', 'files', 'complete'
    backup_method VARCHAR(50) NOT NULL, -- 'pg_dump', 'snapshot', 'replication'
    file_path TEXT,
    file_size INTEGER, -- Bytes
    compression_type VARCHAR(50), -- 'gzip', 'bzip2', 'none'
    encryption_enabled BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed'
    records_count INTEGER,
    tables_backed_up TEXT[], -- Array of table names
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    retention_until DATE -- When this backup can be deleted
);

CREATE INDEX idx_backup_log_type ON backup_log(backup_type);
CREATE INDEX idx_backup_log_status ON backup_log(status);
CREATE INDEX idx_backup_log_started ON backup_log(started_at DESC);
CREATE INDEX idx_backup_log_retention ON backup_log(retention_until);

CREATE TABLE IF NOT EXISTS restore_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id UUID REFERENCES backup_log(id),
    restore_type VARCHAR(50) NOT NULL, -- 'full', 'partial', 'table'
    restore_scope VARCHAR(50) NOT NULL, -- 'database', 'files', 'complete'
    tables_restored TEXT[], -- Array of table names
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed'
    records_restored INTEGER,
    error_message TEXT,
    restored_by UUID,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_restore_log_backup ON restore_log(backup_id);
CREATE INDEX idx_restore_log_status ON restore_log(status);
CREATE INDEX idx_restore_log_started ON restore_log(started_at DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(200) NOT NULL, -- IP address, user ID, API key
    identifier_type VARCHAR(50) NOT NULL, -- 'ip', 'user', 'api_key'
    endpoint VARCHAR(500), -- API endpoint or action
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    is_blocked BOOLEAN DEFAULT false,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identifier, identifier_type, endpoint, window_start)
);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, identifier_type);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_end);
CREATE INDEX idx_rate_limits_blocked ON rate_limits(is_blocked);

CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    policy_name VARCHAR(200) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    retention_period_days INTEGER NOT NULL,
    retention_type VARCHAR(50) DEFAULT 'archive', -- 'archive', 'delete'
    archive_location VARCHAR(500), -- For archived data
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_retention_policies_company ON data_retention_policies(company_id);
CREATE INDEX idx_data_retention_policies_table ON data_retention_policies(table_name);
CREATE INDEX idx_data_retention_policies_active ON data_retention_policies(is_active);

COMMENT ON TABLE background_jobs IS 'Background job queue with retry logic';
COMMENT ON TABLE scheduled_tasks IS 'Scheduled tasks (cron jobs) configuration';
COMMENT ON TABLE system_health_checks IS 'System health check results';
COMMENT ON TABLE system_metrics IS 'Time series system metrics for monitoring';
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all user actions';
COMMENT ON TABLE error_log IS 'Application error log with resolution tracking';
COMMENT ON TABLE backup_log IS 'Database backup log with retention tracking';
COMMENT ON TABLE restore_log IS 'Database restore log';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking per identifier';
COMMENT ON TABLE data_retention_policies IS 'Data retention and archival policies';
