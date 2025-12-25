-- Migration 006: Onboarding and Master Data Tables
-- Adds tables for guided setup wizard and additional master data
-- Note: Some tables already exist from migration 005, so we only add new ones

-- Company Onboarding State Machine
CREATE TABLE IF NOT EXISTS company_onboarding (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, skipped
    current_step TEXT,
    completed_steps TEXT DEFAULT '[]', -- JSON array of completed step IDs
    configuration TEXT, -- JSON object with selected options
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(company_id)
);

-- Payment Terms (new table)
CREATE TABLE IF NOT EXISTS payment_terms (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    days INTEGER NOT NULL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    discount_days INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(company_id, code)
);

-- Document Numbering Sequences (new table)
CREATE TABLE IF NOT EXISTS numbering_sequences (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    document_type TEXT NOT NULL, -- quote, sales_order, delivery, customer_invoice, purchase_order, goods_receipt, supplier_invoice, journal_entry, payment
    prefix TEXT NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1,
    suffix TEXT,
    min_digits INTEGER DEFAULT 4,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(company_id, document_type)
);

-- GL Accounts (Chart of Accounts) - separate from chart_of_accounts for GL routes
CREATE TABLE IF NOT EXISTS gl_accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- asset, liability, equity, revenue, expense
    account_category TEXT,
    parent_account_id TEXT REFERENCES gl_accounts(id),
    is_active INTEGER DEFAULT 1,
    is_system INTEGER DEFAULT 0, -- System accounts cannot be deleted
    opening_balance REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(company_id, account_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_onboarding_company ON company_onboarding(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_terms_company ON payment_terms(company_id);
CREATE INDEX IF NOT EXISTS idx_numbering_sequences_company ON numbering_sequences(company_id);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_company ON gl_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_type ON gl_accounts(company_id, account_type);

-- Insert default data for demo company
INSERT OR IGNORE INTO company_onboarding (id, company_id, status, current_step, completed_steps, created_at, updated_at)
VALUES ('onboard-demo', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'completed', NULL, '["company_profile","fiscal_settings","chart_of_accounts","tax_rates","bank_accounts","warehouses","document_numbering","products","customers_suppliers","payment_terms","users","demo_data"]', datetime('now'), datetime('now'));

-- Default tax rates for demo company (using existing tax_rates table schema from migration 005)
INSERT OR IGNORE INTO tax_rates (id, company_id, tax_code, tax_name, rate, is_default, is_active, created_at)
VALUES 
('tax-vat15', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'VAT15', 'VAT 15%', 15.0, 1, 1, datetime('now')),
('tax-vat0', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'VAT0', 'Zero Rated', 0.0, 0, 1, datetime('now')),
('tax-exempt', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EXEMPT', 'VAT Exempt', 0.0, 0, 1, datetime('now'));

-- Default payment terms for demo company
INSERT OR IGNORE INTO payment_terms (id, company_id, code, name, days, is_default, is_active, created_at, updated_at)
VALUES 
('term-cod', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'COD', 'Cash on Delivery', 0, 0, 1, datetime('now'), datetime('now')),
('term-net7', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'NET7', 'Net 7 Days', 7, 0, 1, datetime('now'), datetime('now')),
('term-net14', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'NET14', 'Net 14 Days', 14, 0, 1, datetime('now'), datetime('now')),
('term-net30', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'NET30', 'Net 30 Days', 30, 1, 1, datetime('now'), datetime('now')),
('term-net60', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'NET60', 'Net 60 Days', 60, 0, 1, datetime('now'), datetime('now'));

-- Default numbering sequences for demo company
INSERT OR IGNORE INTO numbering_sequences (id, company_id, document_type, prefix, next_number, created_at, updated_at)
VALUES 
('seq-quote', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'quote', 'QT-', 1, datetime('now'), datetime('now')),
('seq-so', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'sales_order', 'SO-', 1, datetime('now'), datetime('now')),
('seq-del', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'delivery', 'DN-', 1, datetime('now'), datetime('now')),
('seq-inv', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'customer_invoice', 'INV-', 1, datetime('now'), datetime('now')),
('seq-po', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'purchase_order', 'PO-', 1, datetime('now'), datetime('now')),
('seq-grn', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'goods_receipt', 'GRN-', 1, datetime('now'), datetime('now')),
('seq-bill', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'supplier_invoice', 'BILL-', 1, datetime('now'), datetime('now')),
('seq-je', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'journal_entry', 'JE-', 1, datetime('now'), datetime('now')),
('seq-pay', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'payment', 'PAY-', 1, datetime('now'), datetime('now'));

-- Default warehouse for demo company (using existing warehouses table schema from migration 005)
INSERT OR IGNORE INTO warehouses (id, company_id, warehouse_code, warehouse_name, is_default, is_active, created_at, updated_at)
VALUES ('wh-main', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'MAIN', 'Main Warehouse', 1, 1, datetime('now'), datetime('now'));

-- Default chart of accounts for demo company
INSERT OR IGNORE INTO gl_accounts (id, company_id, account_code, account_name, account_type, account_category, is_active, created_at, updated_at)
VALUES 
-- Assets
('gl-1000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1000', 'Cash', 'asset', 'Current Assets', 1, datetime('now'), datetime('now')),
('gl-1100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1100', 'Bank Account', 'asset', 'Current Assets', 1, datetime('now'), datetime('now')),
('gl-1200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1200', 'Accounts Receivable', 'asset', 'Current Assets', 1, datetime('now'), datetime('now')),
('gl-1300', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1300', 'Inventory', 'asset', 'Current Assets', 1, datetime('now'), datetime('now')),
('gl-1400', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1400', 'Prepaid Expenses', 'asset', 'Current Assets', 1, datetime('now'), datetime('now')),
('gl-1500', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1500', 'Fixed Assets', 'asset', 'Non-Current Assets', 1, datetime('now'), datetime('now')),
('gl-1510', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1510', 'Accumulated Depreciation', 'asset', 'Non-Current Assets', 1, datetime('now'), datetime('now')),
-- Liabilities
('gl-2000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2000', 'Accounts Payable', 'liability', 'Current Liabilities', 1, datetime('now'), datetime('now')),
('gl-2100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2100', 'VAT Payable', 'liability', 'Current Liabilities', 1, datetime('now'), datetime('now')),
('gl-2200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2200', 'Accrued Expenses', 'liability', 'Current Liabilities', 1, datetime('now'), datetime('now')),
('gl-2300', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2300', 'Short-term Loans', 'liability', 'Current Liabilities', 1, datetime('now'), datetime('now')),
('gl-2500', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2500', 'Long-term Loans', 'liability', 'Non-Current Liabilities', 1, datetime('now'), datetime('now')),
-- Equity
('gl-3000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '3000', 'Share Capital', 'equity', 'Equity', 1, datetime('now'), datetime('now')),
('gl-3100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '3100', 'Retained Earnings', 'equity', 'Equity', 1, datetime('now'), datetime('now')),
('gl-3200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '3200', 'Current Year Earnings', 'equity', 'Equity', 1, datetime('now'), datetime('now')),
-- Revenue
('gl-4000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '4000', 'Sales Revenue', 'revenue', 'Operating Revenue', 1, datetime('now'), datetime('now')),
('gl-4100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '4100', 'Service Revenue', 'revenue', 'Operating Revenue', 1, datetime('now'), datetime('now')),
('gl-4200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '4200', 'Other Income', 'revenue', 'Other Revenue', 1, datetime('now'), datetime('now')),
-- Expenses
('gl-5000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '5000', 'Cost of Goods Sold', 'expense', 'Cost of Sales', 1, datetime('now'), datetime('now')),
('gl-6000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6000', 'Salaries & Wages', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6100', 'Rent Expense', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6200', 'Utilities', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6300', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6300', 'Office Supplies', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6400', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6400', 'Depreciation Expense', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6500', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6500', 'Insurance', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6600', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6600', 'Professional Fees', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6700', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6700', 'Marketing & Advertising', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6800', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6800', 'Bank Charges', 'expense', 'Operating Expenses', 1, datetime('now'), datetime('now')),
('gl-6900', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6900', 'Interest Expense', 'expense', 'Finance Costs', 1, datetime('now'), datetime('now'));

-- Default departments for demo company (using existing departments table schema from migration 005)
INSERT OR IGNORE INTO departments (id, company_id, department_code, department_name, is_active, created_at, updated_at)
VALUES 
('dept-exec', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EXEC', 'Executive', 1, datetime('now'), datetime('now')),
('dept-fin', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'FIN', 'Finance', 1, datetime('now'), datetime('now')),
('dept-sales', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SALES', 'Sales', 1, datetime('now'), datetime('now')),
('dept-ops', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'OPS', 'Operations', 1, datetime('now'), datetime('now')),
('dept-hr', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'HR', 'Human Resources', 1, datetime('now'), datetime('now')),
('dept-it', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'IT', 'IT', 1, datetime('now'), datetime('now'));
