-- ARIA ERP - World-Beating Phase A: Core Accounting Foundation
-- This migration adds the accounting integrity layer that makes ARIA production-ready

-- ========================================
-- FISCAL PERIODS & PERIOD CONTROLS
-- ========================================

-- Ensure financial_periods has all needed columns
-- Already exists from 005, but add period_status tracking
CREATE TABLE IF NOT EXISTS period_locks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    period TEXT NOT NULL, -- YYYY-MM format
    module TEXT NOT NULL, -- gl, ar, ap, inventory, payroll
    is_locked INTEGER DEFAULT 0,
    locked_by TEXT REFERENCES users(id),
    locked_at TEXT,
    unlock_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, period, module)
);

-- ========================================
-- TRANSACTION LIFECYCLE & AUDIT
-- ========================================

-- Transaction status history for full audit trail
CREATE TABLE IF NOT EXISTS transaction_status_history (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    transaction_type TEXT NOT NULL, -- customer_invoice, supplier_invoice, payment, journal_entry, etc.
    transaction_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by TEXT REFERENCES users(id),
    changed_at TEXT DEFAULT (datetime('now')),
    reason TEXT,
    ip_address TEXT
);

-- Approval workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    workflow_name TEXT NOT NULL,
    document_type TEXT NOT NULL, -- purchase_order, payment, journal_entry, leave_request
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, document_type)
);

-- Approval workflow steps
CREATE TABLE IF NOT EXISTS approval_workflow_steps (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    approver_type TEXT NOT NULL, -- role, user, manager, department_head
    approver_id TEXT, -- specific user/role id if applicable
    min_amount REAL DEFAULT 0,
    max_amount REAL,
    is_required INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Pending approvals
CREATE TABLE IF NOT EXISTS pending_approvals (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    workflow_id TEXT NOT NULL REFERENCES approval_workflows(id),
    step_id TEXT NOT NULL REFERENCES approval_workflow_steps(id),
    document_type TEXT NOT NULL,
    document_id TEXT NOT NULL,
    document_number TEXT,
    amount REAL DEFAULT 0,
    requested_by TEXT REFERENCES users(id),
    requested_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, escalated
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    rejection_reason TEXT,
    notes TEXT
);

-- ========================================
-- RBAC - ROLES & PERMISSIONS
-- ========================================

-- Roles (beyond basic user role)
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    role_name TEXT NOT NULL,
    role_code TEXT NOT NULL,
    description TEXT,
    is_system INTEGER DEFAULT 0, -- system roles can't be deleted
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, role_code)
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    permission_code TEXT NOT NULL UNIQUE,
    permission_name TEXT NOT NULL,
    module TEXT NOT NULL, -- gl, ar, ap, inventory, hr, manufacturing, etc.
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    can_create INTEGER DEFAULT 0,
    can_read INTEGER DEFAULT 1,
    can_update INTEGER DEFAULT 0,
    can_delete INTEGER DEFAULT 0,
    can_approve INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(role_id, permission_id)
);

-- User-Role mapping
CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL REFERENCES companies(id),
    assigned_by TEXT REFERENCES users(id),
    assigned_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, role_id, company_id)
);

-- ========================================
-- MULTI-CURRENCY SUPPORT
-- ========================================

-- Currencies
CREATE TABLE IF NOT EXISTS currencies (
    id TEXT PRIMARY KEY,
    currency_code TEXT NOT NULL UNIQUE,
    currency_name TEXT NOT NULL,
    symbol TEXT,
    decimal_places INTEGER DEFAULT 2,
    is_active INTEGER DEFAULT 1
);

-- Exchange rates
CREATE TABLE IF NOT EXISTS exchange_rates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    rate_date TEXT NOT NULL,
    rate_type TEXT DEFAULT 'spot', -- spot, average, closing
    source TEXT, -- manual, api, bank
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, from_currency, to_currency, rate_date, rate_type)
);

-- Currency revaluation history
CREATE TABLE IF NOT EXISTS currency_revaluations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    revaluation_date TEXT NOT NULL,
    period TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    exchange_rate REAL NOT NULL,
    unrealized_gain_loss REAL DEFAULT 0,
    journal_entry_id TEXT REFERENCES journal_entries(id),
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- GL POSTING RULES ENGINE
-- ========================================

-- GL Posting templates (defines how transactions post to GL)
CREATE TABLE IF NOT EXISTS gl_posting_templates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    template_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- customer_invoice, supplier_invoice, payment, receipt, inventory_receipt, etc.
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, transaction_type)
);

-- GL Posting template lines
CREATE TABLE IF NOT EXISTS gl_posting_template_lines (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES gl_posting_templates(id) ON DELETE CASCADE,
    line_order INTEGER NOT NULL,
    description TEXT NOT NULL,
    account_type TEXT NOT NULL, -- fixed (specific account), dynamic (from transaction)
    account_code TEXT, -- for fixed accounts
    account_source TEXT, -- for dynamic: customer_receivable, supplier_payable, bank, revenue, cogs, inventory, tax
    debit_formula TEXT, -- amount, tax_amount, discount_amount, or expression
    credit_formula TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- SUBLEDGER LINKS
-- ========================================

-- Links transactions to their GL postings
CREATE TABLE IF NOT EXISTS subledger_gl_links (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    subledger_type TEXT NOT NULL, -- ar, ap, inventory, payroll, fixed_assets
    transaction_type TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id),
    posted_at TEXT DEFAULT (datetime('now')),
    UNIQUE(subledger_type, transaction_type, transaction_id)
);

-- ========================================
-- INVENTORY COSTING
-- ========================================

-- Inventory costing method per product
ALTER TABLE products ADD COLUMN costing_method TEXT DEFAULT 'weighted_average'; -- fifo, lifo, weighted_average, standard

-- Inventory cost layers (for FIFO/LIFO)
CREATE TABLE IF NOT EXISTS inventory_cost_layers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    receipt_date TEXT NOT NULL,
    reference_type TEXT, -- purchase_order, production, adjustment
    reference_id TEXT,
    original_quantity REAL NOT NULL,
    remaining_quantity REAL NOT NULL,
    unit_cost REAL NOT NULL,
    total_cost REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Inventory valuation snapshots
CREATE TABLE IF NOT EXISTS inventory_valuations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    valuation_date TEXT NOT NULL,
    period TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id),
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    quantity_on_hand REAL NOT NULL,
    unit_cost REAL NOT NULL,
    total_value REAL NOT NULL,
    costing_method TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- COUNTRY LOCALIZATION FRAMEWORK
-- ========================================

-- Country configurations
CREATE TABLE IF NOT EXISTS country_configs (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL UNIQUE,
    country_name TEXT NOT NULL,
    default_currency TEXT NOT NULL,
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    decimal_separator TEXT DEFAULT '.',
    thousands_separator TEXT DEFAULT ',',
    fiscal_year_start_month INTEGER DEFAULT 1,
    has_vat INTEGER DEFAULT 1,
    has_withholding_tax INTEGER DEFAULT 0,
    has_e_invoicing INTEGER DEFAULT 0,
    e_invoice_provider TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tax configurations per country
CREATE TABLE IF NOT EXISTS country_tax_configs (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL REFERENCES country_configs(country_code),
    tax_type TEXT NOT NULL, -- vat, gst, sales_tax, withholding
    tax_code TEXT NOT NULL,
    tax_name TEXT NOT NULL,
    rate REAL NOT NULL,
    is_default INTEGER DEFAULT 0,
    applies_to TEXT, -- sales, purchases, both
    gl_account_code TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(country_code, tax_code)
);

-- ========================================
-- SEED DATA: PERMISSIONS
-- ========================================

INSERT OR IGNORE INTO permissions (id, permission_code, permission_name, module, description) VALUES
-- GL Permissions
('perm-gl-accounts', 'gl.accounts', 'Chart of Accounts', 'gl', 'Manage chart of accounts'),
('perm-gl-journals', 'gl.journals', 'Journal Entries', 'gl', 'Create and post journal entries'),
('perm-gl-periods', 'gl.periods', 'Period Management', 'gl', 'Open/close financial periods'),
('perm-gl-reports', 'gl.reports', 'Financial Reports', 'gl', 'View financial reports'),
-- AR Permissions
('perm-ar-invoices', 'ar.invoices', 'Customer Invoices', 'ar', 'Manage customer invoices'),
('perm-ar-payments', 'ar.payments', 'Customer Payments', 'ar', 'Record customer payments'),
('perm-ar-credit', 'ar.credit', 'Credit Notes', 'ar', 'Issue credit notes'),
-- AP Permissions
('perm-ap-invoices', 'ap.invoices', 'Supplier Invoices', 'ap', 'Manage supplier invoices'),
('perm-ap-payments', 'ap.payments', 'Supplier Payments', 'ap', 'Process supplier payments'),
-- Inventory Permissions
('perm-inv-products', 'inventory.products', 'Products', 'inventory', 'Manage products'),
('perm-inv-stock', 'inventory.stock', 'Stock Levels', 'inventory', 'View and adjust stock'),
('perm-inv-movements', 'inventory.movements', 'Stock Movements', 'inventory', 'Record stock movements'),
-- HR Permissions
('perm-hr-employees', 'hr.employees', 'Employees', 'hr', 'Manage employees'),
('perm-hr-payroll', 'hr.payroll', 'Payroll', 'hr', 'Process payroll'),
('perm-hr-leave', 'hr.leave', 'Leave Management', 'hr', 'Manage leave requests'),
-- Manufacturing Permissions
('perm-mfg-bom', 'manufacturing.bom', 'Bill of Materials', 'manufacturing', 'Manage BOMs'),
('perm-mfg-workorders', 'manufacturing.workorders', 'Work Orders', 'manufacturing', 'Manage work orders'),
('perm-mfg-production', 'manufacturing.production', 'Production', 'manufacturing', 'Record production'),
-- Admin Permissions
('perm-admin-users', 'admin.users', 'User Management', 'admin', 'Manage users'),
('perm-admin-roles', 'admin.roles', 'Role Management', 'admin', 'Manage roles and permissions'),
('perm-admin-company', 'admin.company', 'Company Settings', 'admin', 'Manage company settings');

-- ========================================
-- SEED DATA: CURRENCIES
-- ========================================

INSERT OR IGNORE INTO currencies (id, currency_code, currency_name, symbol, decimal_places) VALUES
('cur-zar', 'ZAR', 'South African Rand', 'R', 2),
('cur-usd', 'USD', 'US Dollar', '$', 2),
('cur-eur', 'EUR', 'Euro', '€', 2),
('cur-gbp', 'British Pound', 'GBP', '£', 2),
('cur-inr', 'INR', 'Indian Rupee', '₹', 2),
('cur-sar', 'SAR', 'Saudi Riyal', 'ر.س', 2),
('cur-aed', 'AED', 'UAE Dirham', 'د.إ', 2),
('cur-mxn', 'MXN', 'Mexican Peso', '$', 2),
('cur-idr', 'IDR', 'Indonesian Rupiah', 'Rp', 0),
('cur-brl', 'BRL', 'Brazilian Real', 'R$', 2),
('cur-ngn', 'NGN', 'Nigerian Naira', '₦', 2),
('cur-egp', 'EGP', 'Egyptian Pound', 'E£', 2),
('cur-kes', 'KES', 'Kenyan Shilling', 'KSh', 2);

-- ========================================
-- SEED DATA: COUNTRY CONFIGS
-- ========================================

INSERT OR IGNORE INTO country_configs (id, country_code, country_name, default_currency, fiscal_year_start_month, has_vat, has_withholding_tax, has_e_invoicing) VALUES
('cc-za', 'ZA', 'South Africa', 'ZAR', 3, 1, 0, 0),
('cc-sa', 'SA', 'Saudi Arabia', 'SAR', 1, 1, 1, 1),
('cc-ae', 'AE', 'United Arab Emirates', 'AED', 1, 1, 0, 0),
('cc-in', 'IN', 'India', 'INR', 4, 1, 1, 1),
('cc-mx', 'MX', 'Mexico', 'MXN', 1, 1, 1, 1),
('cc-id', 'ID', 'Indonesia', 'IDR', 1, 1, 1, 1),
('cc-ng', 'NG', 'Nigeria', 'NGN', 1, 1, 1, 0),
('cc-eg', 'EG', 'Egypt', 'EGP', 7, 1, 1, 1),
('cc-ke', 'KE', 'Kenya', 'KES', 7, 1, 1, 1),
('cc-br', 'BR', 'Brazil', 'BRL', 1, 1, 1, 1);

-- ========================================
-- SEED DATA: COUNTRY TAX CONFIGS
-- ========================================

-- South Africa
INSERT OR IGNORE INTO country_tax_configs (id, country_code, tax_type, tax_code, tax_name, rate, is_default, applies_to) VALUES
('tax-za-vat', 'ZA', 'vat', 'VAT15', 'VAT 15%', 15.0, 1, 'both'),
('tax-za-vat0', 'ZA', 'vat', 'VAT0', 'VAT Zero Rated', 0.0, 0, 'both'),
('tax-za-exempt', 'ZA', 'vat', 'EXEMPT', 'VAT Exempt', 0.0, 0, 'both');

-- Saudi Arabia
INSERT OR IGNORE INTO country_tax_configs (id, country_code, tax_type, tax_code, tax_name, rate, is_default, applies_to) VALUES
('tax-sa-vat', 'SA', 'vat', 'VAT15', 'VAT 15%', 15.0, 1, 'both'),
('tax-sa-vat0', 'SA', 'vat', 'VAT0', 'Zero Rated', 0.0, 0, 'both'),
('tax-sa-wht', 'SA', 'withholding', 'WHT5', 'Withholding Tax 5%', 5.0, 0, 'purchases');

-- UAE
INSERT OR IGNORE INTO country_tax_configs (id, country_code, tax_type, tax_code, tax_name, rate, is_default, applies_to) VALUES
('tax-ae-vat', 'AE', 'vat', 'VAT5', 'VAT 5%', 5.0, 1, 'both'),
('tax-ae-vat0', 'AE', 'vat', 'VAT0', 'Zero Rated', 0.0, 0, 'both');

-- India (GST)
INSERT OR IGNORE INTO country_tax_configs (id, country_code, tax_type, tax_code, tax_name, rate, is_default, applies_to) VALUES
('tax-in-gst18', 'IN', 'gst', 'GST18', 'GST 18%', 18.0, 1, 'both'),
('tax-in-gst12', 'IN', 'gst', 'GST12', 'GST 12%', 12.0, 0, 'both'),
('tax-in-gst5', 'IN', 'gst', 'GST5', 'GST 5%', 5.0, 0, 'both'),
('tax-in-gst0', 'IN', 'gst', 'GST0', 'GST Exempt', 0.0, 0, 'both'),
('tax-in-tds', 'IN', 'withholding', 'TDS10', 'TDS 10%', 10.0, 0, 'purchases');

-- Mexico
INSERT OR IGNORE INTO country_tax_configs (id, country_code, tax_type, tax_code, tax_name, rate, is_default, applies_to) VALUES
('tax-mx-iva', 'MX', 'vat', 'IVA16', 'IVA 16%', 16.0, 1, 'both'),
('tax-mx-iva0', 'MX', 'vat', 'IVA0', 'IVA 0%', 0.0, 0, 'both'),
('tax-mx-isr', 'MX', 'withholding', 'ISR10', 'ISR 10%', 10.0, 0, 'purchases');

-- Indonesia
INSERT OR IGNORE INTO country_tax_configs (id, country_code, tax_type, tax_code, tax_name, rate, is_default, applies_to) VALUES
('tax-id-ppn', 'ID', 'vat', 'PPN11', 'PPN 11%', 11.0, 1, 'both'),
('tax-id-ppn0', 'ID', 'vat', 'PPN0', 'PPN 0%', 0.0, 0, 'both'),
('tax-id-pph', 'ID', 'withholding', 'PPH23', 'PPh 23 2%', 2.0, 0, 'purchases');

-- ========================================
-- SEED DATA: GL POSTING TEMPLATES FOR DEMO COMPANY
-- ========================================

INSERT OR IGNORE INTO gl_posting_templates (id, company_id, template_name, transaction_type) VALUES
('gpt-ci', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Customer Invoice Posting', 'customer_invoice'),
('gpt-si', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Supplier Invoice Posting', 'supplier_invoice'),
('gpt-cp', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Customer Payment Posting', 'customer_payment'),
('gpt-sp', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Supplier Payment Posting', 'supplier_payment'),
('gpt-gr', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Goods Receipt Posting', 'goods_receipt'),
('gpt-gi', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Goods Issue Posting', 'goods_issue');

-- Customer Invoice: DR Accounts Receivable, CR Revenue, CR VAT
INSERT OR IGNORE INTO gl_posting_template_lines (id, template_id, line_order, description, account_type, account_source, debit_formula, credit_formula) VALUES
('gptl-ci-1', 'gpt-ci', 1, 'Accounts Receivable', 'dynamic', 'customer_receivable', 'total_amount', NULL),
('gptl-ci-2', 'gpt-ci', 2, 'Sales Revenue', 'fixed', NULL, NULL, 'subtotal'),
('gptl-ci-3', 'gpt-ci', 3, 'VAT Output', 'fixed', NULL, NULL, 'tax_amount');

-- Supplier Invoice: DR Expense/Inventory, DR VAT Input, CR Accounts Payable
INSERT OR IGNORE INTO gl_posting_template_lines (id, template_id, line_order, description, account_type, account_source, debit_formula, credit_formula) VALUES
('gptl-si-1', 'gpt-si', 1, 'Expense/Inventory', 'dynamic', 'expense_or_inventory', 'subtotal', NULL),
('gptl-si-2', 'gpt-si', 2, 'VAT Input', 'fixed', NULL, 'tax_amount', NULL),
('gptl-si-3', 'gpt-si', 3, 'Accounts Payable', 'dynamic', 'supplier_payable', NULL, 'total_amount');

-- Customer Payment: DR Bank, CR Accounts Receivable
INSERT OR IGNORE INTO gl_posting_template_lines (id, template_id, line_order, description, account_type, account_source, debit_formula, credit_formula) VALUES
('gptl-cp-1', 'gpt-cp', 1, 'Bank Account', 'dynamic', 'bank', 'amount', NULL),
('gptl-cp-2', 'gpt-cp', 2, 'Accounts Receivable', 'dynamic', 'customer_receivable', NULL, 'amount');

-- Supplier Payment: DR Accounts Payable, CR Bank
INSERT OR IGNORE INTO gl_posting_template_lines (id, template_id, line_order, description, account_type, account_source, debit_formula, credit_formula) VALUES
('gptl-sp-1', 'gpt-sp', 1, 'Accounts Payable', 'dynamic', 'supplier_payable', 'amount', NULL),
('gptl-sp-2', 'gpt-sp', 2, 'Bank Account', 'dynamic', 'bank', NULL, 'amount');

-- ========================================
-- SEED DATA: DEFAULT ROLES FOR DEMO COMPANY
-- ========================================

INSERT OR IGNORE INTO roles (id, company_id, role_name, role_code, description, is_system) VALUES
('role-admin', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Administrator', 'ADMIN', 'Full system access', 1),
('role-accountant', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Accountant', 'ACCOUNTANT', 'Financial management access', 1),
('role-sales', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Sales', 'SALES', 'Sales and customer management', 1),
('role-purchasing', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Purchasing', 'PURCHASING', 'Procurement and supplier management', 1),
('role-warehouse', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Warehouse', 'WAREHOUSE', 'Inventory and stock management', 1),
('role-hr', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'HR Manager', 'HR', 'Human resources management', 1),
('role-viewer', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Viewer', 'VIEWER', 'Read-only access', 1);

-- Admin gets all permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, can_create, can_read, can_update, can_delete, can_approve)
SELECT 'rp-admin-' || p.id, 'role-admin', p.id, 1, 1, 1, 1, 1
FROM permissions p;

-- Accountant gets GL, AR, AP permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, can_create, can_read, can_update, can_delete, can_approve)
SELECT 'rp-acc-' || p.id, 'role-accountant', p.id, 1, 1, 1, 0, 1
FROM permissions p WHERE p.module IN ('gl', 'ar', 'ap');

-- Sales gets AR and inventory read permissions
INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id, can_create, can_read, can_update, can_delete, can_approve)
SELECT 'rp-sales-' || p.id, 'role-sales', p.id, 
    CASE WHEN p.module = 'ar' THEN 1 ELSE 0 END,
    1,
    CASE WHEN p.module = 'ar' THEN 1 ELSE 0 END,
    0, 0
FROM permissions p WHERE p.module IN ('ar', 'inventory');

-- ========================================
-- SEED DATA: EXCHANGE RATES FOR DEMO
-- ========================================

INSERT OR IGNORE INTO exchange_rates (id, company_id, from_currency, to_currency, rate, rate_date, rate_type) VALUES
('er-usd-zar', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'USD', 'ZAR', 18.50, '2025-12-25', 'spot'),
('er-eur-zar', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EUR', 'ZAR', 19.80, '2025-12-25', 'spot'),
('er-gbp-zar', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'GBP', 'ZAR', 23.20, '2025-12-25', 'spot'),
('er-sar-zar', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SAR', 'ZAR', 4.93, '2025-12-25', 'spot'),
('er-inr-zar', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'INR', 'ZAR', 0.22, '2025-12-25', 'spot');
