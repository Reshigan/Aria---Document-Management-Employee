
CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    document_id UUID REFERENCES generated_documents(id),
    document_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    printer_name VARCHAR(200),
    provider VARCHAR(50) DEFAULT 'manual', -- 'printnode', 'qz_tray', 'manual'
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'printing', 'completed', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    pdf_data BYTEA, -- Store PDF bytes for retry
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    printed_at TIMESTAMP,
    created_by UUID
);

CREATE INDEX idx_print_jobs_company ON print_jobs(company_id);
CREATE INDEX idx_print_jobs_status ON print_jobs(status);
CREATE INDEX idx_print_jobs_created ON print_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(200) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'printnode', 'qz_tray'
    provider_printer_id VARCHAR(200), -- External printer ID from provider
    location VARCHAR(200), -- Warehouse, Office, etc.
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    settings JSONB, -- Provider-specific settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_printers_company ON printers(company_id);
CREATE INDEX idx_printers_active ON printers(is_active);

CREATE TABLE IF NOT EXISTS print_provider_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    provider VARCHAR(50) NOT NULL, -- 'printnode', 'qz_tray'
    api_key TEXT, -- Encrypted API key for PrintNode
    api_endpoint TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, provider)
);

CREATE INDEX idx_print_provider_config_company ON print_provider_config(company_id);

COMMENT ON TABLE print_jobs IS 'Queue for automatic document printing with retry logic';
COMMENT ON TABLE printers IS 'Printer configuration per company and location';
COMMENT ON TABLE print_provider_config IS 'Print provider API configuration per company';
