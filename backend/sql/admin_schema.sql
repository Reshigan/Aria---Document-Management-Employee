
CREATE TABLE IF NOT EXISTS bot_config (
    bot_id VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    auto_approval_limit DECIMAL(15,2),
    notification_email BOOLEAN DEFAULT true,
    notification_whatsapp BOOLEAN DEFAULT false,
    notification_in_app BOOLEAN DEFAULT true,
    custom_settings JSONB,
    executions_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_config_enabled ON bot_config(enabled);
CREATE INDEX IF NOT EXISTS idx_bot_config_last_executed ON bot_config(last_executed);

CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    email_notifications BOOLEAN DEFAULT true,
    whatsapp_notifications BOOLEAN DEFAULT false,
    sms_notifications BOOLEAN DEFAULT false,
    password_min_length INTEGER DEFAULT 8,
    password_require_uppercase BOOLEAN DEFAULT true,
    password_require_number BOOLEAN DEFAULT true,
    password_require_special BOOLEAN DEFAULT false,
    session_timeout_minutes INTEGER DEFAULT 60,
    require_2fa BOOLEAN DEFAULT false,
    auto_backup_enabled BOOLEAN DEFAULT true,
    backup_frequency VARCHAR(20) DEFAULT 'daily',
    backup_retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT single_row_check CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id INTEGER,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255),
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);

CREATE TABLE IF NOT EXISTS bot_executions (
    id SERIAL PRIMARY KEY,
    bot_id VARCHAR(100) NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    executed_by VARCHAR(255),
    company_id VARCHAR(50),
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(20) DEFAULT 'success',
    execution_time_ms INTEGER,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_bot_executions_bot_id ON bot_executions(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_executions_executed_at ON bot_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_executions_status ON bot_executions(status);
CREATE INDEX IF NOT EXISTS idx_bot_executions_company_id ON bot_executions(company_id);

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20),
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB,
    rate_limit_per_hour INTEGER DEFAULT 1000
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

CREATE TABLE IF NOT EXISTS system_health_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    metric_unit VARCHAR(20),
    details JSONB
);

CREATE INDEX IF NOT EXISTS idx_system_health_metrics_timestamp ON system_health_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_metric_name ON system_health_metrics(metric_name);

INSERT INTO system_settings (id, email_notifications, whatsapp_notifications, sms_notifications,
    password_min_length, password_require_uppercase, password_require_number, password_require_special,
    session_timeout_minutes, require_2fa, auto_backup_enabled, backup_frequency)
VALUES (1, true, false, false, 8, true, true, false, 60, false, true, 'daily')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bot_config (bot_id, enabled, auto_approval_limit) VALUES
    ('mrp_bot', true, NULL),
    ('production_scheduler_bot', true, NULL),
    ('quality_predictor_bot', true, NULL),
    ('predictive_maintenance_bot', true, NULL),
    ('inventory_optimizer_bot', true, NULL),
    ('patient_scheduling_bot', true, NULL),
    ('medical_records_bot', true, NULL),
    ('insurance_claims_bot', true, 10000.00),
    ('lab_results_bot', true, NULL),
    ('prescription_management_bot', true, NULL),
    ('demand_forecasting_bot', true, NULL),
    ('price_optimization_bot', true, NULL),
    ('customer_segmentation_bot', true, NULL),
    ('store_performance_bot', true, NULL),
    ('loyalty_program_bot', true, NULL),
    ('customer_support_bot', true, NULL),
    ('accounts_payable_bot', true, 5000.00),
    ('accounts_receivable_bot', true, 5000.00),
    ('bank_reconciliation_bot', true, NULL),
    ('invoice_reconciliation_bot', true, 10000.00),
    ('expense_management_bot', true, 2000.00),
    ('payroll_sa_bot', true, NULL),
    ('general_ledger_bot', true, NULL),
    ('financial_reporting_bot', true, NULL),
    ('tax_filing_bot', true, NULL),
    ('asset_management_bot', true, NULL),
    ('cashflow_forecasting_bot', true, NULL),
    ('budget_planning_bot', true, NULL),
    ('bbbee_compliance_bot', true, NULL),
    ('paye_compliance_bot', true, NULL),
    ('uif_compliance_bot', true, NULL),
    ('vat_reporting_bot', true, NULL),
    ('audit_trail_bot', true, NULL),
    ('quote_generation_bot', true, 50000.00),
    ('sales_approval_bot', true, 25000.00),
    ('sales_bot', true, 10000.00),
    ('crm_bot', true, NULL),
    ('lead_scoring_bot', true, NULL),
    ('opportunity_tracking_bot', true, NULL),
    ('customer_onboarding_bot', true, NULL),
    ('contract_management_bot', true, NULL),
    ('recruitment_bot', true, NULL),
    ('onboarding_bot', true, NULL),
    ('leave_bot', true, NULL),
    ('performance_review_bot', true, NULL),
    ('training_bot', true, NULL),
    ('benefits_administration_bot', true, NULL),
    ('time_attendance_bot', true, NULL),
    ('offboarding_bot', true, NULL),
    ('procurement_bot', true, 15000.00),
    ('supplier_evaluation_bot', true, NULL),
    ('receiving_bot', true, NULL),
    ('ap_bot', true, 5000.00),
    ('invoice_matching_bot', true, 10000.00),
    ('purchase_order_bot', true, 20000.00),
    ('supplier_onboarding_bot', true, NULL),
    ('wms_bot', true, NULL),
    ('delivery_bot', true, NULL),
    ('ar_bot', true, 5000.00),
    ('gl_bot', true, NULL),
    ('field_service_intake_bot', true, NULL),
    ('scheduling_optimizer_bot', true, NULL),
    ('dispatch_bot', true, NULL),
    ('sla_monitor_bot', true, NULL),
    ('parts_reservation_bot', true, NULL),
    ('remittance_bot', true, NULL),
    ('master_data_bot', true, NULL)
ON CONFLICT (bot_id) DO NOTHING;

CREATE OR REPLACE FUNCTION update_bot_execution_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bot_config
    SET executions_count = executions_count + 1,
        last_executed = NEW.executed_at
    WHERE bot_id = NEW.bot_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bot_execution_count ON bot_executions;
CREATE TRIGGER trigger_update_bot_execution_count
    AFTER INSERT ON bot_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_execution_count();

CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_email VARCHAR,
    p_action VARCHAR,
    p_resource VARCHAR,
    p_details TEXT,
    p_ip_address VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_log_id INTEGER;
BEGIN
    INSERT INTO audit_logs (user_email, action, resource, details, ip_address)
    VALUES (p_user_email, p_action, p_resource, p_details, p_ip_address)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW bot_usage_stats AS
SELECT 
    bc.bot_id,
    bc.enabled,
    bc.executions_count,
    bc.last_executed,
    COUNT(be.id) as executions_last_30_days,
    AVG(be.execution_time_ms) as avg_execution_time_ms,
    SUM(CASE WHEN be.status = 'success' THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(be.id), 0) * 100 as success_rate_percent
FROM bot_config bc
LEFT JOIN bot_executions be ON bc.bot_id = be.bot_id 
    AND be.executed_at >= NOW() - INTERVAL '30 days'
GROUP BY bc.bot_id, bc.enabled, bc.executions_count, bc.last_executed;

CREATE OR REPLACE VIEW system_health_dashboard AS
SELECT
    (SELECT COUNT(*) FROM bot_executions WHERE executed_at >= NOW() - INTERVAL '1 day') as bot_executions_today,
    (SELECT COUNT(*) FROM bot_executions WHERE executed_at >= NOW() - INTERVAL '7 days') as bot_executions_week,
    (SELECT COUNT(*) FROM bot_config WHERE enabled = true) as enabled_bots_count,
    (SELECT COUNT(*) FROM audit_logs WHERE timestamp >= NOW() - INTERVAL '1 day') as audit_events_today,
    (SELECT AVG(execution_time_ms) FROM bot_executions WHERE executed_at >= NOW() - INTERVAL '1 day') as avg_execution_time_ms_today,
    (SELECT COUNT(*) FROM user_sessions WHERE is_active = true AND expires_at > NOW()) as active_sessions_count;

COMMENT ON TABLE bot_config IS 'Configuration settings for all 67 automation bots';
COMMENT ON TABLE system_settings IS 'Global system configuration settings';
COMMENT ON TABLE audit_logs IS 'Audit trail of all system actions';
COMMENT ON TABLE bot_executions IS 'Log of all bot executions with performance metrics';
COMMENT ON TABLE api_keys IS 'API keys for external integrations';
COMMENT ON TABLE user_sessions IS 'Active user sessions for session management';
COMMENT ON TABLE system_health_metrics IS 'System health and performance metrics';
