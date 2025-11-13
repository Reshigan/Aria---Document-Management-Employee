-- Create ERP Settings Table for per-company configuration
-- Replaces hardcoded values with configurable settings

CREATE TABLE IF NOT EXISTS erp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, setting_key),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_erp_settings_company ON erp_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_erp_settings_key ON erp_settings(setting_key);

-- Insert default settings for all companies
-- Default labor product ID (to be replaced with actual product IDs)
INSERT INTO erp_settings (company_id, setting_key, setting_value, setting_type, description)
SELECT 
    id,
    'default_labor_product_id',
    '00000000-0000-0000-0000-000000000001',
    'uuid',
    'Default product ID for labor/service items in field service'
FROM companies
ON CONFLICT (company_id, setting_key) DO NOTHING;

-- Default service supplier ID (to be replaced with actual supplier IDs)
INSERT INTO erp_settings (company_id, setting_key, setting_value, setting_type, description)
SELECT 
    id,
    'default_service_supplier_id',
    '00000000-0000-0000-0000-000000000001',
    'uuid',
    'Default supplier ID for service parts procurement'
FROM companies
ON CONFLICT (company_id, setting_key) DO NOTHING;

-- Verify settings
SELECT 
    c.name as company_name,
    es.setting_key,
    es.setting_value,
    es.setting_type,
    es.description
FROM erp_settings es
JOIN companies c ON es.company_id = c.id
ORDER BY c.name, es.setting_key;
