
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    type VARCHAR(50) NOT NULL, -- 'invoice', 'delivery_note', 'quote', 'sales_order', 'purchase_order', 'credit_note'
    name VARCHAR(200) NOT NULL,
    template_format VARCHAR(20) DEFAULT 'html', -- 'html', 'json'
    html_template TEXT NOT NULL, -- Jinja2 HTML template
    variables_schema JSONB, -- JSON schema defining available variables
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Default template for this type and company
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    UNIQUE(company_id, type, name)
);

CREATE INDEX idx_document_templates_company ON document_templates(company_id);
CREATE INDEX idx_document_templates_type ON document_templates(type);
CREATE INDEX idx_document_templates_active ON document_templates(is_active);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name VARCHAR(200);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(200);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(200);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'South Africa';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR(200);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_branch_code VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS swift_code VARCHAR(50);

CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    template_id UUID REFERENCES document_templates(id),
    document_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL, -- ID of the source record (invoice, delivery, etc.)
    source_table VARCHAR(100) NOT NULL, -- Table name of source
    document_number VARCHAR(100), -- Document reference number
    file_path TEXT, -- Path to generated PDF
    file_size INTEGER, -- File size in bytes
    qr_code_data TEXT, -- QR code embedded data
    checksum VARCHAR(64), -- SHA256 hash for idempotency
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID,
    UNIQUE(company_id, document_type, source_id, checksum)
);

CREATE INDEX idx_generated_documents_company ON generated_documents(company_id);
CREATE INDEX idx_generated_documents_source ON generated_documents(source_table, source_id);
CREATE INDEX idx_generated_documents_checksum ON generated_documents(checksum);

COMMENT ON TABLE document_templates IS 'Document templates for generating PDFs with company branding and QR codes';
COMMENT ON TABLE generated_documents IS 'Tracking table for all generated documents with idempotency via checksum';
