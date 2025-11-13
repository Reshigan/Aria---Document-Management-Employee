-- Fix chart_of_accounts table schema to match GAAP setup script expectations
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add unique constraint needed for foreign key in gl_account_mappings
ALTER TABLE chart_of_accounts 
DROP CONSTRAINT IF EXISTS chart_of_accounts_code_company_id_key;

ALTER TABLE chart_of_accounts 
ADD CONSTRAINT chart_of_accounts_code_company_id_key UNIQUE (code, company_id);

-- Update existing accounts with category based on account_type
UPDATE chart_of_accounts 
SET category = CASE 
    WHEN account_type = 'asset' THEN 'Assets'
    WHEN account_type = 'liability' THEN 'Liabilities'
    WHEN account_type = 'equity' THEN 'Equity'
    WHEN account_type = 'revenue' THEN 'Revenue'
    WHEN account_type = 'expense' THEN 'Expenses'
    ELSE 'Other'
END
WHERE category IS NULL;
