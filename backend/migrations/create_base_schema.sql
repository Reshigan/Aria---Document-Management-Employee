
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_number VARCHAR(100),
    vat_number VARCHAR(100),
    
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'South Africa',
    
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_branch_code VARCHAR(50),
    
    logo_url TEXT,
    
    currency VARCHAR(3) DEFAULT 'ZAR',
    fiscal_year_end VARCHAR(5) DEFAULT '02-28',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,  -- asset, liability, equity, revenue, expense
    account_category VARCHAR(100),
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    
    currency VARCHAR(3) DEFAULT 'ZAR',
    is_reconcilable BOOLEAN DEFAULT FALSE,
    is_system_account BOOLEAN DEFAULT FALSE,
    
    opening_balance NUMERIC(15, 2) DEFAULT 0,
    current_balance NUMERIC(15, 2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_id ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_account_type ON chart_of_accounts(account_type);

INSERT INTO companies (name, legal_name, country, currency)
SELECT 'Default Company', 'Default Company (Pty) Ltd', 'South Africa', 'ZAR'
WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);

DO $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_company_id LIMIT 1) THEN
        INSERT INTO chart_of_accounts (company_id, code, name, account_type, account_category, is_active) VALUES
        (v_company_id, '1000', 'Assets', 'asset', 'Header', true),
        (v_company_id, '1100', 'Bank - Current Account', 'asset', 'Bank', true),
        (v_company_id, '1200', 'Accounts Receivable - Trade', 'asset', 'Receivables', true),
        (v_company_id, '1300', 'Inventory', 'asset', 'Inventory', true),
        (v_company_id, '1400', 'Prepaid Expenses', 'asset', 'Prepayments', true),
        (v_company_id, '1500', 'Input VAT', 'asset', 'VAT', true),
        (v_company_id, '1600', 'Fixed Assets', 'asset', 'Fixed Assets', true),
        (v_company_id, '1700', 'Accumulated Depreciation', 'asset', 'Fixed Assets', true),
        
        (v_company_id, '2000', 'Accounts Payable - Trade', 'liability', 'Payables', true),
        (v_company_id, '2100', 'Output VAT', 'liability', 'VAT', true),
        (v_company_id, '2200', 'PAYE Payable', 'liability', 'Payroll', true),
        (v_company_id, '2300', 'UIF Payable', 'liability', 'Payroll', true),
        (v_company_id, '2400', 'SDL Payable', 'liability', 'Payroll', true),
        (v_company_id, '2500', 'Accrued Expenses', 'liability', 'Accruals', true),
        (v_company_id, '2600', 'Loans Payable', 'liability', 'Loans', true),
        
        (v_company_id, '3000', 'Share Capital', 'equity', 'Capital', true),
        (v_company_id, '3100', 'Retained Earnings', 'equity', 'Retained Earnings', true),
        (v_company_id, '3200', 'Current Year Earnings', 'equity', 'Current Earnings', true),
        
        (v_company_id, '4000', 'Sales Revenue', 'revenue', 'Sales', true),
        (v_company_id, '4100', 'Service Revenue', 'revenue', 'Services', true),
        (v_company_id, '4200', 'Other Income', 'revenue', 'Other', true),
        (v_company_id, '4300', 'Interest Income', 'revenue', 'Financial', true),
        
        (v_company_id, '5000', 'Cost of Goods Sold', 'expense', 'COGS', true),
        (v_company_id, '5100', 'Operating Expenses', 'expense', 'Operating', true),
        (v_company_id, '5200', 'Salaries and Wages', 'expense', 'Payroll', true),
        (v_company_id, '5300', 'Rent Expense', 'expense', 'Operating', true),
        (v_company_id, '5400', 'Utilities', 'expense', 'Operating', true),
        (v_company_id, '5500', 'Insurance', 'expense', 'Operating', true),
        (v_company_id, '5600', 'Depreciation', 'expense', 'Non-Cash', true),
        (v_company_id, '5700', 'Interest Expense', 'expense', 'Financial', true),
        (v_company_id, '5800', 'Bank Charges', 'expense', 'Financial', true),
        (v_company_id, '6000', 'Marketing and Advertising', 'expense', 'Marketing', true),
        (v_company_id, '6100', 'Professional Fees', 'expense', 'Professional', true),
        (v_company_id, '6200', 'Travel and Entertainment', 'expense', 'Operating', true),
        (v_company_id, '9999', 'Suspense Account', 'asset', 'Suspense', true);
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON chart_of_accounts TO aria_user;

COMMENT ON TABLE companies IS 'Multi-company master data';
COMMENT ON TABLE chart_of_accounts IS 'Chart of accounts per company with SA standard accounts';
