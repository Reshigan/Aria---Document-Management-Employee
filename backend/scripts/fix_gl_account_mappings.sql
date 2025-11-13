-- Fix GL Account Mappings FK Constraint Issue
-- Re-run idempotent INSERT for GL account mappings now that all companies have GAAP chart

-- Insert default GL account mappings for all companies
-- Only insert if the account code exists in chart_of_accounts for that company
INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'AR', '1200', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '1200' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'REVENUE', '4000', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '4000' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'COGS', '5000', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '5000' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'INVENTORY', '1400', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '1400' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'AP', '2100', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '2100' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'CASH', '1000', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '1000' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'VAT_PAYABLE', '2300', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '2300' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'PAYROLL_EXPENSE', '6200', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '6200' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

INSERT INTO gl_account_mappings (company_id, role, account_code, is_active)
SELECT c.id, 'PAYROLL_LIABILITY', '2400', true
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE code = '2400' AND company_id = c.id
)
ON CONFLICT (company_id, role) DO NOTHING;

-- Verify the mappings
SELECT 
    c.name as company_name,
    gam.role,
    gam.account_code,
    coa.name as account_name,
    gam.is_active
FROM gl_account_mappings gam
JOIN companies c ON gam.company_id = c.id
LEFT JOIN chart_of_accounts coa ON gam.account_code = coa.code AND gam.company_id = coa.company_id
ORDER BY c.name, gam.role;
