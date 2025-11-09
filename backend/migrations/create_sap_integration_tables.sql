
CREATE TABLE IF NOT EXISTS sap_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    connection_name VARCHAR(200) NOT NULL,
    sap_system_type VARCHAR(50) NOT NULL, -- 'ecc', 's4hana'
    connection_type VARCHAR(50) NOT NULL, -- 'rfc', 'odata', 'rest', 'csv'
    host VARCHAR(200),
    port INTEGER,
    client VARCHAR(10), -- SAP client (e.g., '100')
    system_number VARCHAR(10),
    username VARCHAR(100),
    password_encrypted TEXT, -- Encrypted password
    api_key TEXT, -- For OData/REST
    company_code VARCHAR(10), -- SAP company code
    is_active BOOLEAN DEFAULT true,
    last_connection_test TIMESTAMP,
    connection_status VARCHAR(50), -- 'connected', 'disconnected', 'error'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, connection_name)
);

CREATE INDEX idx_sap_connections_company ON sap_connections(company_id);
CREATE INDEX idx_sap_connections_active ON sap_connections(is_active);

CREATE TABLE IF NOT EXISTS sap_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    mapping_name VARCHAR(200) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'journal_entry', 'goods_movement', 'invoice', 'payment'
    sap_transaction_code VARCHAR(20), -- 'FB01', 'MIGO', 'F-43', etc.
    sap_bapi_name VARCHAR(100), -- 'BAPI_ACC_DOCUMENT_POST', 'BAPI_GOODSMVT_CREATE', etc.
    field_mappings JSONB NOT NULL, -- JSON mapping of ARIA fields to SAP fields
    default_values JSONB, -- Default values for SAP fields
    validation_rules JSONB, -- Custom validation rules
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, document_type, mapping_name)
);

CREATE INDEX idx_sap_field_mappings_company ON sap_field_mappings(company_id);
CREATE INDEX idx_sap_field_mappings_document_type ON sap_field_mappings(document_type);

CREATE TABLE IF NOT EXISTS sap_gl_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    aria_gl_account VARCHAR(20) NOT NULL,
    sap_gl_account VARCHAR(20) NOT NULL,
    sap_company_code VARCHAR(10) NOT NULL,
    description VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, aria_gl_account, sap_company_code)
);

CREATE INDEX idx_sap_gl_mappings_company ON sap_gl_mappings(company_id);
CREATE INDEX idx_sap_gl_mappings_aria_account ON sap_gl_mappings(aria_gl_account);

CREATE TABLE IF NOT EXISTS sap_export_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    sap_connection_id UUID NOT NULL REFERENCES sap_connections(id),
    document_type VARCHAR(50) NOT NULL,
    document_id UUID NOT NULL,
    document_number VARCHAR(100),
    export_type VARCHAR(50) NOT NULL, -- 'bapi', 'idoc', 'csv', 'odata'
    sap_transaction_code VARCHAR(20),
    sap_bapi_name VARCHAR(100),
    payload JSONB NOT NULL, -- Data to export
    csv_data TEXT, -- For CSV exports
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'processing', 'sent', 'confirmed', 'failed'
    priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    sap_document_number VARCHAR(100), -- Document number returned by SAP
    sap_fiscal_year VARCHAR(10),
    sap_response JSONB, -- Full response from SAP
    error_message TEXT,
    validation_errors JSONB, -- Validation errors before sending
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sap_export_queue_company ON sap_export_queue(company_id);
CREATE INDEX idx_sap_export_queue_connection ON sap_export_queue(sap_connection_id);
CREATE INDEX idx_sap_export_queue_status ON sap_export_queue(status);
CREATE INDEX idx_sap_export_queue_document ON sap_export_queue(document_type, document_id);
CREATE INDEX idx_sap_export_queue_priority ON sap_export_queue(priority, queued_at);

CREATE TABLE IF NOT EXISTS sap_import_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    sap_connection_id UUID NOT NULL REFERENCES sap_connections(id),
    import_type VARCHAR(50) NOT NULL, -- 'master_data', 'transactions', 'balances'
    data_type VARCHAR(50) NOT NULL, -- 'customers', 'suppliers', 'products', 'gl_accounts', 'journal_entries'
    import_method VARCHAR(50) NOT NULL, -- 'bapi', 'odata', 'csv'
    file_name VARCHAR(500),
    records_total INTEGER DEFAULT 0,
    records_success INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    import_data JSONB, -- Imported data
    error_log JSONB, -- Errors per record
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_by UUID
);

CREATE INDEX idx_sap_import_log_company ON sap_import_log(company_id);
CREATE INDEX idx_sap_import_log_connection ON sap_import_log(sap_connection_id);
CREATE INDEX idx_sap_import_log_status ON sap_import_log(status);
CREATE INDEX idx_sap_import_log_started ON sap_import_log(started_at DESC);

CREATE TABLE IF NOT EXISTS sap_document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    template_name VARCHAR(200) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    sap_transaction_code VARCHAR(20),
    file_format VARCHAR(50) DEFAULT 'csv', -- 'csv', 'xlsx', 'txt'
    delimiter VARCHAR(10) DEFAULT ',',
    has_header BOOLEAN DEFAULT true,
    column_mappings JSONB NOT NULL, -- Column order and field mappings
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
    number_format VARCHAR(50) DEFAULT '0.00',
    encoding VARCHAR(20) DEFAULT 'UTF-8',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, document_type, template_name)
);

CREATE INDEX idx_sap_document_templates_company ON sap_document_templates(company_id);
CREATE INDEX idx_sap_document_templates_document_type ON sap_document_templates(document_type);

CREATE TABLE IF NOT EXISTS sap_partner_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    aria_partner_id UUID NOT NULL,
    aria_partner_type VARCHAR(50) NOT NULL, -- 'customer', 'supplier'
    sap_partner_number VARCHAR(50) NOT NULL,
    sap_company_code VARCHAR(10),
    sap_sales_org VARCHAR(10),
    sap_distribution_channel VARCHAR(10),
    sap_division VARCHAR(10),
    sap_purchasing_org VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, aria_partner_id, aria_partner_type)
);

CREATE INDEX idx_sap_partner_mappings_company ON sap_partner_mappings(company_id);
CREATE INDEX idx_sap_partner_mappings_aria_partner ON sap_partner_mappings(aria_partner_id, aria_partner_type);
CREATE INDEX idx_sap_partner_mappings_sap_partner ON sap_partner_mappings(sap_partner_number);

CREATE TABLE IF NOT EXISTS sap_material_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    aria_product_id UUID NOT NULL,
    sap_material_number VARCHAR(50) NOT NULL,
    sap_plant VARCHAR(10),
    sap_storage_location VARCHAR(10),
    sap_valuation_type VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, aria_product_id, sap_plant)
);

CREATE INDEX idx_sap_material_mappings_company ON sap_material_mappings(company_id);
CREATE INDEX idx_sap_material_mappings_aria_product ON sap_material_mappings(aria_product_id);
CREATE INDEX idx_sap_material_mappings_sap_material ON sap_material_mappings(sap_material_number);

CREATE TABLE IF NOT EXISTS sap_cost_center_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    aria_cost_center_id UUID NOT NULL,
    sap_cost_center VARCHAR(20) NOT NULL,
    sap_controlling_area VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, aria_cost_center_id)
);

CREATE INDEX idx_sap_cost_center_mappings_company ON sap_cost_center_mappings(company_id);
CREATE INDEX idx_sap_cost_center_mappings_aria_cc ON sap_cost_center_mappings(aria_cost_center_id);

CREATE TABLE IF NOT EXISTS sap_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    exchange_rate_type VARCHAR(10) DEFAULT 'M', -- SAP exchange rate type
    effective_date DATE NOT NULL,
    exchange_rate DECIMAL(15,6) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, from_currency, to_currency, exchange_rate_type, effective_date)
);

CREATE INDEX idx_sap_exchange_rates_company ON sap_exchange_rates(company_id);
CREATE INDEX idx_sap_exchange_rates_currencies ON sap_exchange_rates(from_currency, to_currency);
CREATE INDEX idx_sap_exchange_rates_date ON sap_exchange_rates(effective_date DESC);

COMMENT ON TABLE sap_connections IS 'SAP system connection configurations per company';
COMMENT ON TABLE sap_field_mappings IS 'Field mappings from ARIA to SAP per document type';
COMMENT ON TABLE sap_gl_mappings IS 'GL account mappings from ARIA to SAP';
COMMENT ON TABLE sap_export_queue IS 'Queue for exporting documents to SAP with retry logic';
COMMENT ON TABLE sap_import_log IS 'Log of data imported from SAP';
COMMENT ON TABLE sap_document_templates IS 'CSV/Excel templates for SAP uploads';
COMMENT ON TABLE sap_partner_mappings IS 'Customer/Supplier mappings to SAP partner numbers';
COMMENT ON TABLE sap_material_mappings IS 'Product mappings to SAP material numbers';
