-- Create GL Account Mappings table for configurable account codes
CREATE TABLE IF NOT EXISTS gl_account_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    role VARCHAR(100) NOT NULL,  -- e.g., 'AR', 'REVENUE', 'COGS', 'VAT_PAYABLE'
    account_code VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, role),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (account_code, company_id) REFERENCES chart_of_accounts(code, company_id)
);

CREATE INDEX IF NOT EXISTS idx_gl_account_mappings_company_role 
ON gl_account_mappings(company_id, role) WHERE is_active = true;

-- Insert default mappings for existing companies
INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'AR', '1200', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'REVENUE', '4000', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'COGS', '5000', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'INVENTORY', '1400', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'AP', '2000', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'VAT_PAYABLE', '2200', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'VAT_RECOVERABLE', '1450', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'GR_IR_CLEARING', '2100', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'PAYROLL_LIABILITY', '2500', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'SALARY_EXPENSE', '6000', true FROM companies c
ON CONFLICT (company_id, role) DO NOTHING;
