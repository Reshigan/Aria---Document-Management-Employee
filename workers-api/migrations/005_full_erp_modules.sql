-- ARIA ERP - Full ERP Modules Migration
-- Adds GL/Accounting, HR, Manufacturing, Inventory, Bank, CRM, and Governance tables
-- This completes the ERP system for full bot integration

-- ========================================
-- GENERAL LEDGER / ACCOUNTING
-- ========================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- asset, liability, equity, revenue, expense
    parent_account_id TEXT REFERENCES chart_of_accounts(id),
    is_header INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    normal_balance TEXT DEFAULT 'debit', -- debit or credit
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, account_code)
);

-- Journal Entries (header)
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    entry_number TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    description TEXT,
    reference_type TEXT, -- sales_invoice, purchase_invoice, payment, receipt, manual
    reference_id TEXT,
    status TEXT DEFAULT 'draft', -- draft, posted, reversed
    total_debit REAL DEFAULT 0,
    total_credit REAL DEFAULT 0,
    posted_by TEXT REFERENCES users(id),
    posted_at TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, entry_number)
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT,
    debit_amount REAL DEFAULT 0,
    credit_amount REAL DEFAULT 0,
    cost_center TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- GL Transactions (posted entries for reporting)
CREATE TABLE IF NOT EXISTS gl_transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    journal_entry_id TEXT REFERENCES journal_entries(id),
    transaction_date TEXT NOT NULL,
    period TEXT NOT NULL, -- YYYY-MM format
    description TEXT,
    debit_amount REAL DEFAULT 0,
    credit_amount REAL DEFAULT 0,
    running_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Financial Periods
CREATE TABLE IF NOT EXISTS financial_periods (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    period_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    period_number INTEGER NOT NULL,
    status TEXT DEFAULT 'open', -- open, closed, locked
    closed_by TEXT REFERENCES users(id),
    closed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, fiscal_year, period_number)
);

-- Tax Rates
CREATE TABLE IF NOT EXISTS tax_rates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    tax_code TEXT NOT NULL,
    tax_name TEXT NOT NULL,
    rate REAL NOT NULL,
    tax_type TEXT DEFAULT 'vat', -- vat, sales_tax, withholding
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    effective_from TEXT,
    effective_to TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, tax_code)
);

-- ========================================
-- BANK / CASH MANAGEMENT
-- ========================================

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    branch_code TEXT,
    swift_code TEXT,
    currency TEXT DEFAULT 'ZAR',
    gl_account_id TEXT REFERENCES chart_of_accounts(id),
    current_balance REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, account_number)
);

-- Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
    transaction_date TEXT NOT NULL,
    value_date TEXT,
    description TEXT,
    reference TEXT,
    debit_amount REAL DEFAULT 0,
    credit_amount REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    transaction_type TEXT, -- deposit, withdrawal, transfer, fee, interest
    is_reconciled INTEGER DEFAULT 0,
    reconciled_at TEXT,
    matched_payment_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Bank Statements
CREATE TABLE IF NOT EXISTS bank_statements (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
    statement_date TEXT NOT NULL,
    opening_balance REAL NOT NULL,
    closing_balance REAL NOT NULL,
    total_debits REAL DEFAULT 0,
    total_credits REAL DEFAULT 0,
    status TEXT DEFAULT 'imported', -- imported, reconciling, reconciled
    reconciled_by TEXT REFERENCES users(id),
    reconciled_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- HUMAN RESOURCES
-- ========================================

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    department_code TEXT NOT NULL,
    department_name TEXT NOT NULL,
    parent_department_id TEXT REFERENCES departments(id),
    manager_id TEXT,
    cost_center TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, department_code)
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_code TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    id_number TEXT,
    tax_number TEXT,
    date_of_birth TEXT,
    gender TEXT,
    marital_status TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'South Africa',
    department_id TEXT REFERENCES departments(id),
    job_title TEXT,
    employment_type TEXT DEFAULT 'permanent', -- permanent, contract, temporary, intern
    hire_date TEXT NOT NULL,
    termination_date TEXT,
    manager_id TEXT REFERENCES employees(id),
    basic_salary REAL DEFAULT 0,
    pay_frequency TEXT DEFAULT 'monthly', -- weekly, bi-weekly, monthly
    bank_name TEXT,
    bank_account TEXT,
    bank_branch TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, employee_code)
);

-- Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    payroll_period TEXT NOT NULL, -- YYYY-MM
    run_date TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- draft, calculated, approved, paid
    total_gross REAL DEFAULT 0,
    total_deductions REAL DEFAULT 0,
    total_net REAL DEFAULT 0,
    total_employer_cost REAL DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    paid_at TEXT,
    journal_entry_id TEXT REFERENCES journal_entries(id),
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, payroll_period)
);

-- Payroll Items (individual employee payslips)
CREATE TABLE IF NOT EXISTS payroll_items (
    id TEXT PRIMARY KEY,
    payroll_run_id TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    basic_salary REAL DEFAULT 0,
    overtime_hours REAL DEFAULT 0,
    overtime_amount REAL DEFAULT 0,
    allowances REAL DEFAULT 0,
    bonuses REAL DEFAULT 0,
    gross_pay REAL DEFAULT 0,
    paye_tax REAL DEFAULT 0,
    uif_employee REAL DEFAULT 0,
    uif_employer REAL DEFAULT 0,
    pension_employee REAL DEFAULT 0,
    pension_employer REAL DEFAULT 0,
    medical_aid REAL DEFAULT 0,
    other_deductions REAL DEFAULT 0,
    total_deductions REAL DEFAULT 0,
    net_pay REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_id TEXT NOT NULL REFERENCES employees(id),
    entry_date TEXT NOT NULL,
    clock_in TEXT,
    clock_out TEXT,
    break_minutes INTEGER DEFAULT 0,
    total_hours REAL DEFAULT 0,
    overtime_hours REAL DEFAULT 0,
    entry_type TEXT DEFAULT 'regular', -- regular, overtime, holiday
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_id TEXT NOT NULL REFERENCES employees(id),
    leave_type TEXT NOT NULL, -- annual, sick, family, maternity, unpaid
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_requested REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, cancelled
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    rejection_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_id TEXT NOT NULL REFERENCES employees(id),
    leave_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    entitled_days REAL DEFAULT 0,
    taken_days REAL DEFAULT 0,
    pending_days REAL DEFAULT 0,
    balance_days REAL DEFAULT 0,
    carried_forward REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, employee_id, leave_type, year)
);

-- ========================================
-- MANUFACTURING
-- ========================================

-- Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS bill_of_materials (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    bom_code TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id),
    bom_name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'active', -- draft, active, obsolete
    standard_quantity REAL DEFAULT 1,
    unit_of_measure TEXT DEFAULT 'Each',
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, bom_code)
);

-- BOM Components
CREATE TABLE IF NOT EXISTS bom_components (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    component_product_id TEXT NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    unit_of_measure TEXT DEFAULT 'Each',
    scrap_percent REAL DEFAULT 0,
    is_critical INTEGER DEFAULT 0,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    work_order_number TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id),
    bom_id TEXT REFERENCES bill_of_materials(id),
    sales_order_id TEXT REFERENCES sales_orders(id),
    planned_quantity REAL NOT NULL,
    completed_quantity REAL DEFAULT 0,
    scrapped_quantity REAL DEFAULT 0,
    planned_start_date TEXT,
    planned_end_date TEXT,
    actual_start_date TEXT,
    actual_end_date TEXT,
    status TEXT DEFAULT 'planned', -- planned, released, in_progress, completed, cancelled
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    work_center TEXT,
    assigned_to TEXT REFERENCES employees(id),
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, work_order_number)
);

-- Production Runs (actual production records)
CREATE TABLE IF NOT EXISTS production_runs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    work_order_id TEXT NOT NULL REFERENCES work_orders(id),
    run_date TEXT NOT NULL,
    shift TEXT,
    operator_id TEXT REFERENCES employees(id),
    machine_id TEXT,
    quantity_produced REAL DEFAULT 0,
    quantity_scrapped REAL DEFAULT 0,
    start_time TEXT,
    end_time TEXT,
    downtime_minutes INTEGER DEFAULT 0,
    downtime_reason TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Quality Checks
CREATE TABLE IF NOT EXISTS quality_checks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    reference_type TEXT NOT NULL, -- work_order, production_run, goods_receipt
    reference_id TEXT NOT NULL,
    check_date TEXT NOT NULL,
    inspector_id TEXT REFERENCES employees(id),
    check_type TEXT, -- incoming, in_process, final
    sample_size INTEGER DEFAULT 1,
    passed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    result TEXT DEFAULT 'pending', -- pending, passed, failed, conditional
    defect_codes TEXT, -- JSON array of defect codes
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Machines/Equipment
CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    machine_code TEXT NOT NULL,
    machine_name TEXT NOT NULL,
    machine_type TEXT,
    work_center TEXT,
    capacity_per_hour REAL DEFAULT 0,
    status TEXT DEFAULT 'operational', -- operational, maintenance, breakdown, retired
    last_maintenance_date TEXT,
    next_maintenance_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, machine_code)
);

-- ========================================
-- INVENTORY MANAGEMENT
-- ========================================

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    warehouse_code TEXT NOT NULL,
    warehouse_name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, warehouse_code)
);

-- Stock Levels (inventory by warehouse)
CREATE TABLE IF NOT EXISTS stock_levels (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    quantity_on_hand REAL DEFAULT 0,
    quantity_reserved REAL DEFAULT 0,
    quantity_available REAL DEFAULT 0,
    reorder_level REAL DEFAULT 0,
    reorder_quantity REAL DEFAULT 0,
    last_count_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, product_id, warehouse_id)
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    movement_date TEXT NOT NULL,
    movement_type TEXT NOT NULL, -- receipt, issue, transfer, adjustment, production
    reference_type TEXT, -- purchase_order, sales_order, work_order, adjustment
    reference_id TEXT,
    quantity REAL NOT NULL,
    unit_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    from_warehouse_id TEXT REFERENCES warehouses(id),
    to_warehouse_id TEXT REFERENCES warehouses(id),
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- CRM / SALES
-- ========================================

-- Leads
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    lead_code TEXT NOT NULL,
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT, -- website, referral, cold_call, trade_show, advertising
    status TEXT DEFAULT 'new', -- new, contacted, qualified, proposal, negotiation, won, lost
    rating TEXT DEFAULT 'warm', -- hot, warm, cold
    estimated_value REAL DEFAULT 0,
    expected_close_date TEXT,
    assigned_to TEXT REFERENCES employees(id),
    notes TEXT,
    converted_to_customer_id TEXT REFERENCES customers(id),
    converted_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, lead_code)
);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    opportunity_code TEXT NOT NULL,
    opportunity_name TEXT NOT NULL,
    customer_id TEXT REFERENCES customers(id),
    lead_id TEXT REFERENCES leads(id),
    stage TEXT DEFAULT 'qualification', -- qualification, needs_analysis, proposal, negotiation, closed_won, closed_lost
    probability INTEGER DEFAULT 50,
    estimated_value REAL DEFAULT 0,
    expected_close_date TEXT,
    actual_close_date TEXT,
    assigned_to TEXT REFERENCES employees(id),
    notes TEXT,
    won_reason TEXT,
    lost_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, opportunity_code)
);

-- Activities (CRM activities)
CREATE TABLE IF NOT EXISTS crm_activities (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    activity_type TEXT NOT NULL, -- call, email, meeting, task, note
    subject TEXT NOT NULL,
    description TEXT,
    related_type TEXT, -- lead, opportunity, customer
    related_id TEXT,
    due_date TEXT,
    completed_at TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled
    assigned_to TEXT REFERENCES employees(id),
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- GOVERNANCE / COMPLIANCE
-- ========================================

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    contract_number TEXT NOT NULL,
    contract_name TEXT NOT NULL,
    contract_type TEXT, -- customer, supplier, employment, lease, service
    party_type TEXT, -- customer, supplier, employee
    party_id TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    value REAL DEFAULT 0,
    currency TEXT DEFAULT 'ZAR',
    status TEXT DEFAULT 'draft', -- draft, active, expired, terminated
    renewal_type TEXT DEFAULT 'manual', -- manual, auto_renew
    renewal_notice_days INTEGER DEFAULT 30,
    document_id TEXT,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, contract_number)
);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    policy_code TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    category TEXT, -- hr, finance, it, operations, compliance
    version TEXT DEFAULT '1.0',
    effective_date TEXT,
    review_date TEXT,
    status TEXT DEFAULT 'draft', -- draft, active, under_review, archived
    content TEXT,
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, policy_code)
);

-- Audit Logs (detailed audit trail)
CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL, -- create, update, delete, view, export, login, logout
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Risk Register
CREATE TABLE IF NOT EXISTS risks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    risk_code TEXT NOT NULL,
    risk_name TEXT NOT NULL,
    category TEXT, -- operational, financial, compliance, strategic, reputational
    description TEXT,
    likelihood INTEGER DEFAULT 3, -- 1-5 scale
    impact INTEGER DEFAULT 3, -- 1-5 scale
    risk_score INTEGER DEFAULT 9, -- likelihood * impact
    status TEXT DEFAULT 'identified', -- identified, assessed, mitigating, accepted, closed
    owner_id TEXT REFERENCES employees(id),
    mitigation_plan TEXT,
    review_date TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, risk_code)
);

-- ========================================
-- INDEXES
-- ========================================

-- GL Indexes
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_gl_transactions_company ON gl_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_gl_transactions_account ON gl_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_transactions_period ON gl_transactions(period);

-- Bank Indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);

-- HR Indexes
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);

-- Manufacturing Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_runs_work_order ON production_runs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_reference ON quality_checks(reference_type, reference_id);

-- Inventory Indexes
CREATE INDEX IF NOT EXISTS idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);

-- CRM Indexes
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);

-- Governance Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_policies_company ON policies(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_company ON audit_trail(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risks_company ON risks(company_id);

-- ========================================
-- DEMO DATA - Chart of Accounts
-- ========================================

INSERT OR IGNORE INTO chart_of_accounts (id, company_id, account_code, account_name, account_type, normal_balance, description) VALUES
-- Assets
('coa-1000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1000', 'Assets', 'asset', 'debit', 'Total Assets'),
('coa-1100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1100', 'Current Assets', 'asset', 'debit', 'Current Assets'),
('coa-1110', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1110', 'Cash and Bank', 'asset', 'debit', 'Cash and Bank Accounts'),
('coa-1120', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1120', 'Accounts Receivable', 'asset', 'debit', 'Trade Debtors'),
('coa-1130', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1130', 'Inventory', 'asset', 'debit', 'Stock on Hand'),
('coa-1200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '1200', 'Fixed Assets', 'asset', 'debit', 'Property, Plant & Equipment'),
-- Liabilities
('coa-2000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2000', 'Liabilities', 'liability', 'credit', 'Total Liabilities'),
('coa-2100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2100', 'Current Liabilities', 'liability', 'credit', 'Current Liabilities'),
('coa-2110', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2110', 'Accounts Payable', 'liability', 'credit', 'Trade Creditors'),
('coa-2120', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2120', 'VAT Payable', 'liability', 'credit', 'Output VAT'),
('coa-2130', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2130', 'PAYE Payable', 'liability', 'credit', 'Employee Tax Payable'),
('coa-2140', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '2140', 'UIF Payable', 'liability', 'credit', 'UIF Contributions Payable'),
-- Equity
('coa-3000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '3000', 'Equity', 'equity', 'credit', 'Shareholders Equity'),
('coa-3100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '3100', 'Share Capital', 'equity', 'credit', 'Issued Share Capital'),
('coa-3200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '3200', 'Retained Earnings', 'equity', 'credit', 'Accumulated Profits'),
-- Revenue
('coa-4000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '4000', 'Revenue', 'revenue', 'credit', 'Total Revenue'),
('coa-4100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '4100', 'Sales Revenue', 'revenue', 'credit', 'Product Sales'),
('coa-4200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '4200', 'Service Revenue', 'revenue', 'credit', 'Service Income'),
('coa-4300', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '4300', 'Other Income', 'revenue', 'credit', 'Miscellaneous Income'),
-- Expenses
('coa-5000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '5000', 'Cost of Sales', 'expense', 'debit', 'Direct Costs'),
('coa-5100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '5100', 'Purchases', 'expense', 'debit', 'Inventory Purchases'),
('coa-5200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '5200', 'Direct Labour', 'expense', 'debit', 'Production Labour'),
('coa-6000', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6000', 'Operating Expenses', 'expense', 'debit', 'Overhead Costs'),
('coa-6100', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6100', 'Salaries & Wages', 'expense', 'debit', 'Employee Compensation'),
('coa-6200', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6200', 'Rent & Utilities', 'expense', 'debit', 'Premises Costs'),
('coa-6300', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6300', 'Professional Fees', 'expense', 'debit', 'Accounting, Legal, Consulting'),
('coa-6400', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6400', 'Marketing & Advertising', 'expense', 'debit', 'Promotional Costs'),
('coa-6500', 'b0598135-52fd-4f67-ac56-8f0237e6355e', '6500', 'Depreciation', 'expense', 'debit', 'Asset Depreciation');

-- Demo Bank Accounts
INSERT OR IGNORE INTO bank_accounts (id, company_id, account_name, bank_name, account_number, branch_code, currency, gl_account_id, current_balance) VALUES
('bank-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Main Operating Account', 'First National Bank', '62012345678', '250655', 'ZAR', 'coa-1110', 850000.00),
('bank-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Savings Account', 'First National Bank', '62087654321', '250655', 'ZAR', 'coa-1110', 250000.00);

-- Demo Departments
INSERT OR IGNORE INTO departments (id, company_id, department_code, department_name, cost_center) VALUES
('dept-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EXEC', 'Executive', 'CC-EXEC'),
('dept-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'FIN', 'Finance', 'CC-FIN'),
('dept-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SALES', 'Sales', 'CC-SALES'),
('dept-004', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'OPS', 'Operations', 'CC-OPS'),
('dept-005', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'HR', 'Human Resources', 'CC-HR'),
('dept-006', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'MFG', 'Manufacturing', 'CC-MFG');

-- Demo Employees
INSERT OR IGNORE INTO employees (id, company_id, employee_code, first_name, last_name, email, department_id, job_title, employment_type, hire_date, basic_salary, pay_frequency) VALUES
('emp-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EMP-001', 'John', 'Smith', 'john.smith@vantax.co.za', 'dept-001', 'CEO', 'permanent', '2020-01-15', 150000.00, 'monthly'),
('emp-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EMP-002', 'Sarah', 'Johnson', 'sarah.johnson@vantax.co.za', 'dept-002', 'CFO', 'permanent', '2020-03-01', 120000.00, 'monthly'),
('emp-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EMP-003', 'Michael', 'Williams', 'michael.williams@vantax.co.za', 'dept-003', 'Sales Manager', 'permanent', '2021-06-15', 85000.00, 'monthly'),
('emp-004', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EMP-004', 'Emily', 'Brown', 'emily.brown@vantax.co.za', 'dept-004', 'Operations Manager', 'permanent', '2021-09-01', 75000.00, 'monthly'),
('emp-005', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EMP-005', 'David', 'Davis', 'david.davis@vantax.co.za', 'dept-005', 'HR Manager', 'permanent', '2022-01-10', 70000.00, 'monthly'),
('emp-006', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EMP-006', 'Lisa', 'Miller', 'lisa.miller@vantax.co.za', 'dept-006', 'Production Supervisor', 'permanent', '2022-04-01', 55000.00, 'monthly'),
('emp-007', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EMP-007', 'James', 'Wilson', 'james.wilson@vantax.co.za', 'dept-003', 'Sales Representative', 'permanent', '2023-02-15', 45000.00, 'monthly'),
('emp-008', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EMP-008', 'Amanda', 'Taylor', 'amanda.taylor@vantax.co.za', 'dept-002', 'Accountant', 'permanent', '2023-05-01', 50000.00, 'monthly');

-- Demo Warehouses
INSERT OR IGNORE INTO warehouses (id, company_id, warehouse_code, warehouse_name, address, city, is_default) VALUES
('wh-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'WH-MAIN', 'Main Warehouse', '100 Industrial Road', 'Johannesburg', 1),
('wh-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'WH-CPT', 'Cape Town Warehouse', '50 Harbour Drive', 'Cape Town', 0);

-- Demo Stock Levels
INSERT OR IGNORE INTO stock_levels (id, company_id, product_id, warehouse_id, quantity_on_hand, quantity_available, reorder_level, reorder_quantity) VALUES
('sl-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'prod-001', 'wh-001', 400, 400, 100, 200),
('sl-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'prod-002', 'wh-001', 150, 150, 50, 100),
('sl-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'prod-004', 'wh-001', 40, 40, 10, 20),
('sl-004', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'prod-005', 'wh-001', 20, 20, 5, 10),
('sl-005', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'prod-001', 'wh-002', 100, 100, 50, 100);

-- Demo Machines
INSERT OR IGNORE INTO machines (id, company_id, machine_code, machine_name, machine_type, work_center, capacity_per_hour, status) VALUES
('mach-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'MCH-001', 'Assembly Line A', 'Assembly', 'WC-ASSEMBLY', 50, 'operational'),
('mach-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'MCH-002', 'CNC Machine 1', 'CNC', 'WC-MACHINING', 20, 'operational'),
('mach-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'MCH-003', 'Packaging Line', 'Packaging', 'WC-PACKAGING', 100, 'operational');

-- Demo BOM
INSERT OR IGNORE INTO bill_of_materials (id, company_id, bom_code, product_id, bom_name, version, status, standard_quantity) VALUES
('bom-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'BOM-001', 'prod-001', 'Standard Widget Assembly', '1.0', 'active', 1);

-- Demo Leads
INSERT OR IGNORE INTO leads (id, company_id, lead_code, company_name, contact_name, email, phone, source, status, rating, estimated_value) VALUES
('lead-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'LEAD-001', 'Potential Corp', 'Peter Prospect', 'peter@potential.co.za', '+27 11 999 8888', 'website', 'qualified', 'hot', 150000),
('lead-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'LEAD-002', 'Maybe Industries', 'Mary Maybe', 'mary@maybe.co.za', '+27 21 777 6666', 'referral', 'contacted', 'warm', 75000),
('lead-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'LEAD-003', 'Future Solutions', 'Frank Future', 'frank@future.co.za', '+27 31 555 4444', 'trade_show', 'new', 'warm', 200000);

-- Demo Opportunities
INSERT OR IGNORE INTO opportunities (id, company_id, opportunity_code, opportunity_name, customer_id, stage, probability, estimated_value, expected_close_date) VALUES
('opp-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'OPP-001', 'Acme Corp Expansion', 'cust-001', 'proposal', 70, 250000, '2026-02-28'),
('opp-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'OPP-002', 'TechStart New Project', 'cust-002', 'negotiation', 85, 180000, '2026-01-31');

-- Demo Contracts
INSERT OR IGNORE INTO contracts (id, company_id, contract_number, contract_name, contract_type, party_type, party_id, start_date, end_date, value, status) VALUES
('con-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'CON-001', 'Acme Corp Service Agreement', 'customer', 'customer', 'cust-001', '2025-01-01', '2025-12-31', 500000, 'active'),
('con-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'CON-002', 'Office Supplies Annual Contract', 'supplier', 'supplier', 'supp-001', '2025-01-01', '2025-12-31', 120000, 'active');

-- Demo Risks
INSERT OR IGNORE INTO risks (id, company_id, risk_code, risk_name, category, description, likelihood, impact, risk_score, status, mitigation_plan) VALUES
('risk-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'RISK-001', 'Supply Chain Disruption', 'operational', 'Risk of supplier delays affecting production', 3, 4, 12, 'mitigating', 'Maintain safety stock and identify alternative suppliers'),
('risk-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'RISK-002', 'Currency Fluctuation', 'financial', 'ZAR volatility affecting import costs', 4, 3, 12, 'assessed', 'Consider forward contracts for major purchases'),
('risk-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'RISK-003', 'Data Security Breach', 'compliance', 'Risk of unauthorized access to customer data', 2, 5, 10, 'mitigating', 'Implement encryption and regular security audits');

-- Demo Tax Rates
INSERT OR IGNORE INTO tax_rates (id, company_id, tax_code, tax_name, rate, tax_type, is_default) VALUES
('tax-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'VAT15', 'VAT 15%', 15.0, 'vat', 1),
('tax-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'VAT0', 'VAT Zero Rated', 0.0, 'vat', 0),
('tax-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'EXEMPT', 'VAT Exempt', 0.0, 'vat', 0);

-- Demo Financial Period
INSERT OR IGNORE INTO financial_periods (id, company_id, period_name, start_date, end_date, fiscal_year, period_number, status) VALUES
('fp-2025-01', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'January 2025', '2025-01-01', '2025-01-31', 2025, 1, 'closed'),
('fp-2025-02', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'February 2025', '2025-02-01', '2025-02-28', 2025, 2, 'closed'),
('fp-2025-03', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'March 2025', '2025-03-01', '2025-03-31', 2025, 3, 'closed'),
('fp-2025-12', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'December 2025', '2025-12-01', '2025-12-31', 2025, 12, 'open');

-- ========================================
-- FIXED ASSETS MODULE
-- ========================================

-- Fixed Assets
CREATE TABLE IF NOT EXISTS fixed_assets (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    asset_code TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_category TEXT, -- land, buildings, vehicles, equipment, furniture, computers, intangible
    description TEXT,
    purchase_date TEXT NOT NULL,
    purchase_price REAL NOT NULL,
    supplier_id TEXT REFERENCES suppliers(id),
    invoice_reference TEXT,
    location TEXT,
    department_id TEXT REFERENCES departments(id),
    assigned_to TEXT REFERENCES employees(id),
    serial_number TEXT,
    warranty_expiry TEXT,
    depreciation_method TEXT DEFAULT 'straight_line', -- straight_line, declining_balance, units_of_production
    useful_life_years INTEGER DEFAULT 5,
    salvage_value REAL DEFAULT 0,
    accumulated_depreciation REAL DEFAULT 0,
    current_book_value REAL DEFAULT 0,
    gl_asset_account_id TEXT REFERENCES chart_of_accounts(id),
    gl_depreciation_account_id TEXT REFERENCES chart_of_accounts(id),
    gl_expense_account_id TEXT REFERENCES chart_of_accounts(id),
    status TEXT DEFAULT 'active', -- active, disposed, under_maintenance, written_off
    disposal_date TEXT,
    disposal_amount REAL,
    disposal_reason TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, asset_code)
);

-- Asset Depreciation Schedule
CREATE TABLE IF NOT EXISTS asset_depreciation (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    asset_id TEXT NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- YYYY-MM
    depreciation_amount REAL NOT NULL,
    accumulated_depreciation REAL NOT NULL,
    book_value REAL NOT NULL,
    journal_entry_id TEXT REFERENCES journal_entries(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Asset Maintenance
CREATE TABLE IF NOT EXISTS asset_maintenance (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    asset_id TEXT NOT NULL REFERENCES fixed_assets(id),
    maintenance_type TEXT, -- preventive, corrective, inspection
    scheduled_date TEXT,
    completed_date TEXT,
    description TEXT,
    cost REAL DEFAULT 0,
    performed_by TEXT,
    status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- FIELD SERVICE MODULE
-- ========================================

-- Technicians
CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_id TEXT REFERENCES employees(id),
    technician_code TEXT NOT NULL,
    specialization TEXT,
    skill_level TEXT DEFAULT 'intermediate', -- junior, intermediate, senior, expert
    hourly_rate REAL DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    current_location TEXT,
    vehicle_assigned TEXT,
    certifications TEXT, -- JSON array
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, technician_code)
);

-- Service Orders
CREATE TABLE IF NOT EXISTS service_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    service_order_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    contact_name TEXT,
    contact_phone TEXT,
    service_type TEXT, -- installation, repair, maintenance, inspection
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    description TEXT,
    service_address TEXT,
    scheduled_date TEXT,
    scheduled_time TEXT,
    estimated_duration REAL DEFAULT 1, -- hours
    assigned_technician_id TEXT REFERENCES technicians(id),
    status TEXT DEFAULT 'pending', -- pending, scheduled, in_progress, completed, cancelled
    actual_start_time TEXT,
    actual_end_time TEXT,
    work_performed TEXT,
    parts_used TEXT, -- JSON array
    labor_hours REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    parts_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    customer_signature TEXT,
    customer_rating INTEGER,
    customer_feedback TEXT,
    invoice_id TEXT REFERENCES customer_invoices(id),
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, service_order_number)
);

-- Field Service Schedule
CREATE TABLE IF NOT EXISTS field_service_schedule (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    technician_id TEXT NOT NULL REFERENCES technicians(id),
    service_order_id TEXT REFERENCES service_orders(id),
    schedule_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    schedule_type TEXT DEFAULT 'service', -- service, travel, break, training
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- PROJECTS MODULE
-- ========================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    project_code TEXT NOT NULL,
    project_name TEXT NOT NULL,
    description TEXT,
    customer_id TEXT REFERENCES customers(id),
    project_manager_id TEXT REFERENCES employees(id),
    start_date TEXT,
    planned_end_date TEXT,
    actual_end_date TEXT,
    budget REAL DEFAULT 0,
    actual_cost REAL DEFAULT 0,
    status TEXT DEFAULT 'planning', -- planning, active, on_hold, completed, cancelled
    priority TEXT DEFAULT 'normal', -- low, normal, high, critical
    completion_percentage REAL DEFAULT 0,
    billing_type TEXT DEFAULT 'fixed', -- fixed, time_and_materials, milestone
    contract_value REAL DEFAULT 0,
    invoiced_amount REAL DEFAULT 0,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, project_code)
);

-- Project Tasks
CREATE TABLE IF NOT EXISTS project_tasks (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id TEXT REFERENCES project_tasks(id),
    task_code TEXT NOT NULL,
    task_name TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT REFERENCES employees(id),
    start_date TEXT,
    due_date TEXT,
    completed_date TEXT,
    estimated_hours REAL DEFAULT 0,
    actual_hours REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, blocked, cancelled
    priority TEXT DEFAULT 'normal',
    completion_percentage REAL DEFAULT 0,
    dependencies TEXT, -- JSON array of task IDs
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Project Timesheets
CREATE TABLE IF NOT EXISTS project_timesheets (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    project_id TEXT NOT NULL REFERENCES projects(id),
    task_id TEXT REFERENCES project_tasks(id),
    employee_id TEXT NOT NULL REFERENCES employees(id),
    timesheet_date TEXT NOT NULL,
    hours_worked REAL NOT NULL,
    description TEXT,
    billable INTEGER DEFAULT 1,
    billing_rate REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, invoiced
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Project Expenses
CREATE TABLE IF NOT EXISTS project_expenses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    project_id TEXT NOT NULL REFERENCES projects(id),
    expense_date TEXT NOT NULL,
    category TEXT, -- travel, materials, equipment, subcontractor, other
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    receipt_url TEXT,
    billable INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, invoiced
    submitted_by TEXT REFERENCES employees(id),
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS project_milestones (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_name TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    completed_date TEXT,
    billing_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, completed, overdue
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- ADDITIONAL INDEXES
-- ========================================

-- Fixed Assets Indexes
CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(asset_category);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_asset ON asset_depreciation(asset_id);

-- Field Service Indexes
CREATE INDEX IF NOT EXISTS idx_technicians_company ON technicians(company_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_company ON service_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_technician ON service_orders(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_field_schedule_technician ON field_service_schedule(technician_id);

-- Projects Indexes
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_timesheets_project ON project_timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_timesheets_employee ON project_timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON project_expenses(project_id);

-- ========================================
-- DEMO DATA - Fixed Assets
-- ========================================

INSERT OR IGNORE INTO fixed_assets (id, company_id, asset_code, asset_name, asset_category, description, purchase_date, purchase_price, location, useful_life_years, salvage_value, current_book_value, status) VALUES
('fa-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'FA-001', 'Office Building', 'buildings', 'Main office building', '2020-01-01', 5000000.00, 'Johannesburg', 40, 500000, 4500000, 'active'),
('fa-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'FA-002', 'Delivery Vehicle 1', 'vehicles', 'Ford Ranger delivery truck', '2022-06-15', 450000.00, 'Main Warehouse', 5, 50000, 290000, 'active'),
('fa-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'FA-003', 'CNC Machine', 'equipment', 'Precision CNC milling machine', '2021-03-01', 850000.00, 'Manufacturing Floor', 10, 85000, 680000, 'active'),
('fa-004', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'FA-004', 'Server Room Equipment', 'computers', 'Dell PowerEdge servers and networking', '2023-01-15', 250000.00, 'IT Room', 5, 25000, 200000, 'active'),
('fa-005', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'FA-005', 'Office Furniture Set', 'furniture', 'Executive office furniture', '2022-01-01', 150000.00, 'Head Office', 10, 15000, 120000, 'active');

-- ========================================
-- DEMO DATA - Field Service
-- ========================================

INSERT OR IGNORE INTO technicians (id, company_id, employee_id, technician_code, specialization, skill_level, hourly_rate, is_available) VALUES
('tech-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'emp-006', 'TECH-001', 'Equipment Installation', 'senior', 450.00, 1),
('tech-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'emp-007', 'TECH-002', 'Maintenance & Repair', 'intermediate', 350.00, 1),
('tech-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'emp-008', 'TECH-003', 'Electrical Systems', 'expert', 550.00, 1);

INSERT OR IGNORE INTO service_orders (id, company_id, service_order_number, customer_id, contact_name, contact_phone, service_type, priority, description, service_address, scheduled_date, estimated_duration, assigned_technician_id, status) VALUES
('so-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SO-001', 'cust-001', 'John Acme', '+27 11 123 4567', 'installation', 'high', 'Install new production equipment', '123 Industrial Road, Johannesburg', '2025-12-28', 4, 'tech-001', 'scheduled'),
('so-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SO-002', 'cust-002', 'Jane Tech', '+27 21 987 6543', 'maintenance', 'normal', 'Quarterly maintenance check', '456 Tech Park, Cape Town', '2025-12-30', 2, 'tech-002', 'pending'),
('so-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SO-003', 'cust-003', 'Bob Global', '+27 31 555 1234', 'repair', 'urgent', 'Emergency equipment repair', '789 Commerce Street, Durban', '2025-12-26', 3, 'tech-003', 'in_progress');

-- ========================================
-- DEMO DATA - Projects
-- ========================================

INSERT OR IGNORE INTO projects (id, company_id, project_code, project_name, description, customer_id, start_date, planned_end_date, budget, status, priority, billing_type, contract_value) VALUES
('proj-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PROJ-001', 'Acme Corp ERP Implementation', 'Full ERP system implementation for Acme Corp', 'cust-001', '2025-10-01', '2026-03-31', 500000.00, 'active', 'high', 'milestone', 750000.00),
('proj-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PROJ-002', 'TechStart System Upgrade', 'System upgrade and migration project', 'cust-002', '2025-11-15', '2026-02-28', 200000.00, 'active', 'normal', 'time_and_materials', 250000.00),
('proj-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PROJ-003', 'Global Traders Automation', 'Process automation implementation', 'cust-003', '2026-01-01', '2026-06-30', 350000.00, 'planning', 'normal', 'fixed', 400000.00);

INSERT OR IGNORE INTO project_tasks (id, company_id, project_id, task_code, task_name, description, start_date, due_date, estimated_hours, status, priority) VALUES
('task-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-001', 'TASK-001', 'Requirements Gathering', 'Collect and document all requirements', '2025-10-01', '2025-10-31', 80, 'completed', 'high'),
('task-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-001', 'TASK-002', 'System Design', 'Design system architecture', '2025-11-01', '2025-11-30', 120, 'in_progress', 'high'),
('task-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-001', 'TASK-003', 'Development Phase 1', 'Core module development', '2025-12-01', '2026-01-31', 200, 'pending', 'normal'),
('task-004', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-002', 'TASK-004', 'Assessment', 'Current system assessment', '2025-11-15', '2025-11-30', 40, 'completed', 'high'),
('task-005', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-002', 'TASK-005', 'Migration Planning', 'Plan data migration strategy', '2025-12-01', '2025-12-15', 60, 'in_progress', 'normal');

INSERT OR IGNORE INTO project_milestones (id, company_id, project_id, milestone_name, description, due_date, billing_amount, status, sort_order) VALUES
('ms-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-001', 'Project Kickoff', 'Project initiation and planning complete', '2025-10-15', 75000.00, 'completed', 1),
('ms-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-001', 'Design Approval', 'System design approved by client', '2025-11-30', 150000.00, 'pending', 2),
('ms-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-001', 'Phase 1 Delivery', 'Core modules delivered and tested', '2026-01-31', 200000.00, 'pending', 3),
('ms-004', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-001', 'Go-Live', 'System go-live and handover', '2026-03-31', 325000.00, 'pending', 4);
