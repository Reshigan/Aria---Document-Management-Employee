
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'trial_balance', 'balance_sheet', 'pl', 'cash_flow', 'ar_aging', 'ap_aging', etc.
    report_category VARCHAR(50), -- 'financial', 'operational', 'compliance', 'executive'
    parameters JSONB, -- Report parameters (date range, filters, etc.)
    schedule JSONB, -- Scheduled report settings
    is_scheduled BOOLEAN DEFAULT false,
    recipients TEXT[], -- Email recipients for scheduled reports
    file_format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'xlsx', 'csv'
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_reports_company ON saved_reports(company_id);
CREATE INDEX idx_saved_reports_type ON saved_reports(report_type);
CREATE INDEX idx_saved_reports_scheduled ON saved_reports(is_scheduled);

CREATE TABLE IF NOT EXISTS report_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_report_id UUID REFERENCES saved_reports(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    report_type VARCHAR(50) NOT NULL,
    report_name VARCHAR(200),
    parameters JSONB,
    execution_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'scheduled', 'api'
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed'
    file_path TEXT, -- Path to generated report file
    file_size INTEGER,
    row_count INTEGER, -- Number of rows in report
    execution_time_ms INTEGER, -- Execution time in milliseconds
    error_message TEXT,
    executed_by UUID,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_report_execution_log_saved_report ON report_execution_log(saved_report_id);
CREATE INDEX idx_report_execution_log_company ON report_execution_log(company_id);
CREATE INDEX idx_report_execution_log_type ON report_execution_log(report_type);
CREATE INDEX idx_report_execution_log_started ON report_execution_log(started_at DESC);

CREATE TABLE IF NOT EXISTS kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    kpi_code VARCHAR(50) UNIQUE NOT NULL,
    kpi_name VARCHAR(200) NOT NULL,
    kpi_category VARCHAR(50), -- 'financial', 'operational', 'sales', 'procurement', 'inventory'
    description TEXT,
    calculation_formula TEXT, -- SQL or formula for calculation
    unit_of_measure VARCHAR(50), -- 'currency', 'percentage', 'days', 'count'
    target_value DECIMAL(15,2), -- Target/goal value
    warning_threshold DECIMAL(15,2), -- Warning threshold
    critical_threshold DECIMAL(15,2), -- Critical threshold
    is_higher_better BOOLEAN DEFAULT true, -- True if higher values are better
    refresh_frequency VARCHAR(50) DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly', 'monthly'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kpi_definitions_company ON kpi_definitions(company_id);
CREATE INDEX idx_kpi_definitions_category ON kpi_definitions(kpi_category);
CREATE INDEX idx_kpi_definitions_active ON kpi_definitions(is_active);

CREATE TABLE IF NOT EXISTS kpi_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID NOT NULL REFERENCES kpi_definitions(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    period_date DATE NOT NULL,
    period_type VARCHAR(50) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    value DECIMAL(15,2) NOT NULL,
    target_value DECIMAL(15,2),
    variance DECIMAL(15,2), -- Actual - Target
    variance_percentage DECIMAL(5,2), -- (Actual - Target) / Target * 100
    status VARCHAR(50), -- 'good', 'warning', 'critical'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kpi_id, company_id, period_date, period_type)
);

CREATE INDEX idx_kpi_values_kpi ON kpi_values(kpi_id);
CREATE INDEX idx_kpi_values_company ON kpi_values(company_id);
CREATE INDEX idx_kpi_values_period ON kpi_values(period_date DESC);

CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    dashboard_name VARCHAR(200) NOT NULL,
    dashboard_type VARCHAR(50) DEFAULT 'executive', -- 'executive', 'financial', 'operational', 'sales', 'custom'
    layout JSONB NOT NULL, -- Dashboard layout configuration (widgets, positions, sizes)
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false, -- Visible to all users
    owner_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboards_company ON dashboards(company_id);
CREATE INDEX idx_dashboards_owner ON dashboards(owner_id);
CREATE INDEX idx_dashboards_default ON dashboards(is_default);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL, -- 'kpi', 'chart', 'table', 'report', 'custom'
    widget_title VARCHAR(200),
    data_source VARCHAR(50), -- 'kpi', 'report', 'query', 'api'
    data_source_id UUID, -- KPI ID or Report ID
    configuration JSONB, -- Widget-specific configuration
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 3,
    refresh_interval INTEGER DEFAULT 300, -- Seconds
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(widget_type);

CREATE TABLE IF NOT EXISTS report_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id),
    report_type VARCHAR(50),
    saved_report_id UUID REFERENCES saved_reports(id),
    dashboard_id UUID REFERENCES dashboards(id),
    favorite_type VARCHAR(50) NOT NULL, -- 'report', 'dashboard'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, favorite_type, saved_report_id, dashboard_id)
);

CREATE INDEX idx_report_favorites_user ON report_favorites(user_id);
CREATE INDEX idx_report_favorites_company ON report_favorites(company_id);

CREATE TABLE IF NOT EXISTS data_export_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    export_type VARCHAR(50) NOT NULL, -- 'report', 'data', 'backup'
    data_type VARCHAR(50), -- 'customers', 'invoices', 'transactions', etc.
    file_format VARCHAR(20) NOT NULL, -- 'csv', 'xlsx', 'pdf', 'json'
    file_name VARCHAR(500),
    file_path TEXT,
    file_size INTEGER,
    record_count INTEGER,
    filters JSONB, -- Export filters/parameters
    status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    error_message TEXT,
    exported_by UUID,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_data_export_log_company ON data_export_log(company_id);
CREATE INDEX idx_data_export_log_user ON data_export_log(exported_by);
CREATE INDEX idx_data_export_log_started ON data_export_log(started_at DESC);

COMMENT ON TABLE saved_reports IS 'Saved report configurations with scheduling';
COMMENT ON TABLE report_execution_log IS 'Log of all report executions';
COMMENT ON TABLE kpi_definitions IS 'KPI definitions with targets and thresholds';
COMMENT ON TABLE kpi_values IS 'Time series KPI values for trending';
COMMENT ON TABLE dashboards IS 'Dashboard configurations per user/company';
COMMENT ON TABLE dashboard_widgets IS 'Widgets within dashboards';
COMMENT ON TABLE data_export_log IS 'Log of all data exports';
