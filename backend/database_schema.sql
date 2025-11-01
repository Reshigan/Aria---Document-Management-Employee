-- ============================================================================
-- ARIA ERP - COMPLETE DATABASE SCHEMA
-- Production-Grade Schema for Enterprise ERP System
-- Competitive with Xero, Odoo, SAP
-- ============================================================================

-- ============================================================================
-- CORE SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    registration_number TEXT,
    tax_number TEXT,
    vat_number TEXT,
    industry TEXT,
    employees_count INTEGER,
    currency_code TEXT DEFAULT 'ZAR',
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    timezone TEXT DEFAULT 'Africa/Johannesburg',
    fiscal_year_end TEXT DEFAULT '12-31',
    logo_url TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'South Africa',
    phone TEXT,
    email TEXT,
    website TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    user_id INTEGER,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- CREATE, UPDATE, DELETE
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- FINANCIAL MANAGEMENT MODULE
-- ============================================================================

-- Chart of Accounts (Hierarchical)
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id INTEGER,
    account_type TEXT NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    account_subtype TEXT, -- CURRENT_ASSET, FIXED_ASSET, CURRENT_LIABILITY, etc.
    currency_code TEXT DEFAULT 'ZAR',
    is_active BOOLEAN DEFAULT 1,
    is_system BOOLEAN DEFAULT 0,
    allow_manual_entry BOOLEAN DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (parent_id) REFERENCES accounts(id),
    UNIQUE(company_id, code)
);

-- Fiscal Periods
CREATE TABLE IF NOT EXISTS fiscal_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT 0,
    closed_by INTEGER,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (closed_by) REFERENCES users(id)
);

-- Journal Entries (Double-Entry Bookkeeping)
CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    fiscal_period_id INTEGER NOT NULL,
    entry_number TEXT NOT NULL,
    entry_date DATE NOT NULL,
    entry_type TEXT NOT NULL, -- MANUAL, INVOICE, PAYMENT, PAYROLL, ADJUSTMENT
    reference TEXT,
    description TEXT,
    source_document TEXT, -- Invoice number, PO number, etc.
    status TEXT DEFAULT 'DRAFT', -- DRAFT, POSTED, REVERSED
    posted_by INTEGER,
    posted_at TIMESTAMP,
    reversed_by INTEGER,
    reversed_at TIMESTAMP,
    reversal_entry_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (fiscal_period_id) REFERENCES fiscal_periods(id),
    FOREIGN KEY (posted_by) REFERENCES users(id),
    FOREIGN KEY (reversed_by) REFERENCES users(id),
    FOREIGN KEY (reversal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, entry_number)
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    description TEXT,
    debit_amount DECIMAL(15, 2) DEFAULT 0.00,
    credit_amount DECIMAL(15, 2) DEFAULT 0.00,
    currency_code TEXT DEFAULT 'ZAR',
    exchange_rate DECIMAL(10, 6) DEFAULT 1.0,
    debit_amount_base DECIMAL(15, 2) DEFAULT 0.00,
    credit_amount_base DECIMAL(15, 2) DEFAULT 0.00,
    cost_center TEXT,
    project_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Suppliers/Vendors
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    registration_number TEXT,
    tax_number TEXT,
    vat_number TEXT,
    bbbee_level INTEGER,
    bbbee_certificate_expiry DATE,
    payment_terms TEXT DEFAULT 'NET30', -- NET30, NET60, COD, etc.
    credit_limit DECIMAL(15, 2),
    account_id INTEGER, -- AP control account
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'South Africa',
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_branch_code TEXT,
    is_active BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    UNIQUE(company_id, code)
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    registration_number TEXT,
    tax_number TEXT,
    vat_number TEXT,
    payment_terms TEXT DEFAULT 'NET30',
    credit_limit DECIMAL(15, 2),
    account_id INTEGER, -- AR control account
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'South Africa',
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    is_active BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    UNIQUE(company_id, code)
);

-- Supplier Invoices (Accounts Payable)
CREATE TABLE IF NOT EXISTS supplier_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    purchase_order_id INTEGER,
    currency_code TEXT DEFAULT 'ZAR',
    exchange_rate DECIMAL(10, 6) DEFAULT 1.0,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0.00,
    amount_outstanding DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, APPROVED, POSTED, PAID, CANCELLED
    journal_entry_id INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    posted_by INTEGER,
    posted_at TIMESTAMP,
    payment_status TEXT DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (posted_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, invoice_number, supplier_id)
);

-- Supplier Invoice Lines
CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    line_total DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 15.00, -- SA VAT rate
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    account_id INTEGER, -- Expense account
    cost_center TEXT,
    project_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES supplier_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Customer Invoices (Accounts Receivable)
CREATE TABLE IF NOT EXISTS customer_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    sales_order_id INTEGER,
    currency_code TEXT DEFAULT 'ZAR',
    exchange_rate DECIMAL(10, 6) DEFAULT 1.0,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0.00,
    amount_outstanding DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, APPROVED, SENT, POSTED, PAID, CANCELLED
    journal_entry_id INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    posted_by INTEGER,
    posted_at TIMESTAMP,
    sent_date TIMESTAMP,
    payment_status TEXT DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (posted_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, invoice_number)
);

-- Customer Invoice Lines
CREATE TABLE IF NOT EXISTS customer_invoice_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    line_total DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 15.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    account_id INTEGER, -- Revenue account
    cost_center TEXT,
    project_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES customer_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Payments (Both AP and AR)
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    payment_number TEXT NOT NULL,
    payment_date DATE NOT NULL,
    payment_type TEXT NOT NULL, -- SUPPLIER, CUSTOMER
    supplier_id INTEGER,
    customer_id INTEGER,
    bank_account_id INTEGER NOT NULL,
    payment_method TEXT NOT NULL, -- EFT, CHEQUE, CASH, CARD
    reference TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    currency_code TEXT DEFAULT 'ZAR',
    exchange_rate DECIMAL(10, 6) DEFAULT 1.0,
    amount_base DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, POSTED, RECONCILED, CANCELLED
    journal_entry_id INTEGER,
    reconciled_date DATE,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, payment_number)
);

-- Payment Allocations (Link payments to invoices)
CREATE TABLE IF NOT EXISTS payment_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    supplier_invoice_id INTEGER,
    customer_invoice_id INTEGER,
    amount_allocated DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_invoice_id) REFERENCES supplier_invoices(id),
    FOREIGN KEY (customer_invoice_id) REFERENCES customer_invoices(id)
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL, -- GL account
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT, -- CURRENT, SAVINGS, CREDIT_CARD
    branch_code TEXT,
    currency_code TEXT DEFAULT 'ZAR',
    opening_balance DECIMAL(15, 2) DEFAULT 0.00,
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    UNIQUE(company_id, account_number)
);

-- Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_account_id INTEGER NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference TEXT,
    debit_amount DECIMAL(15, 2) DEFAULT 0.00,
    credit_amount DECIMAL(15, 2) DEFAULT 0.00,
    balance DECIMAL(15, 2),
    is_reconciled BOOLEAN DEFAULT 0,
    reconciled_date DATE,
    journal_entry_id INTEGER,
    payment_id INTEGER,
    imported_from TEXT, -- CSV, API, MANUAL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- Tax Rates
CREATE TABLE IF NOT EXISTS tax_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    rate DECIMAL(5, 2) NOT NULL,
    account_id INTEGER NOT NULL, -- Tax payable/receivable account
    is_active BOOLEAN DEFAULT 1,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    UNIQUE(company_id, code)
);

-- ============================================================================
-- HUMAN RESOURCES MODULE
-- ============================================================================

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    employee_number TEXT NOT NULL,
    user_id INTEGER,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    id_number TEXT, -- SA ID number
    passport_number TEXT,
    date_of_birth DATE,
    gender TEXT,
    marital_status TEXT,
    nationality TEXT DEFAULT 'South African',
    job_title TEXT,
    department TEXT,
    manager_id INTEGER,
    employment_type TEXT, -- PERMANENT, CONTRACT, TEMPORARY, INTERN
    start_date DATE NOT NULL,
    end_date DATE,
    tax_number TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_branch_code TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (manager_id) REFERENCES employees(id),
    UNIQUE(company_id, employee_number)
);

-- Payroll Configurations
CREATE TABLE IF NOT EXISTS payroll_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    basic_salary DECIMAL(15, 2) NOT NULL,
    salary_frequency TEXT DEFAULT 'MONTHLY', -- WEEKLY, BIWEEKLY, MONTHLY
    payment_method TEXT DEFAULT 'EFT', -- EFT, CASH, CHEQUE
    medical_aid_contribution DECIMAL(15, 2) DEFAULT 0.00,
    pension_contribution_percent DECIMAL(5, 2) DEFAULT 0.00,
    travel_allowance DECIMAL(15, 2) DEFAULT 0.00,
    housing_allowance DECIMAL(15, 2) DEFAULT 0.00,
    other_allowances DECIMAL(15, 2) DEFAULT 0.00,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    run_number TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, CALCULATED, APPROVED, PAID, POSTED
    total_gross_pay DECIMAL(15, 2) DEFAULT 0.00,
    total_deductions DECIMAL(15, 2) DEFAULT 0.00,
    total_net_pay DECIMAL(15, 2) DEFAULT 0.00,
    total_paye DECIMAL(15, 2) DEFAULT 0.00,
    total_uif DECIMAL(15, 2) DEFAULT 0.00,
    total_sdl DECIMAL(15, 2) DEFAULT 0.00,
    journal_entry_id INTEGER,
    calculated_by INTEGER,
    calculated_at TIMESTAMP,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    posted_by INTEGER,
    posted_at TIMESTAMP,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (calculated_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (posted_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, run_number)
);

-- Payslips
CREATE TABLE IF NOT EXISTS payslips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payroll_run_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    payslip_number TEXT NOT NULL,
    gross_pay DECIMAL(15, 2) NOT NULL,
    basic_salary DECIMAL(15, 2) NOT NULL,
    allowances DECIMAL(15, 2) DEFAULT 0.00,
    overtime DECIMAL(15, 2) DEFAULT 0.00,
    bonuses DECIMAL(15, 2) DEFAULT 0.00,
    paye DECIMAL(15, 2) DEFAULT 0.00,
    uif_employee DECIMAL(15, 2) DEFAULT 0.00,
    uif_employer DECIMAL(15, 2) DEFAULT 0.00,
    sdl DECIMAL(15, 2) DEFAULT 0.00,
    medical_aid DECIMAL(15, 2) DEFAULT 0.00,
    pension DECIMAL(15, 2) DEFAULT 0.00,
    other_deductions DECIMAL(15, 2) DEFAULT 0.00,
    total_deductions DECIMAL(15, 2) DEFAULT 0.00,
    net_pay DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    UNIQUE(payroll_run_id, employee_id)
);

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    days_per_year DECIMAL(5, 2) DEFAULT 0.00,
    carry_forward BOOLEAN DEFAULT 0,
    max_carry_forward_days DECIMAL(5, 2) DEFAULT 0.00,
    requires_approval BOOLEAN DEFAULT 1,
    is_paid BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE(company_id, code)
);

-- Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    leave_type_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    opening_balance DECIMAL(5, 2) DEFAULT 0.00,
    accrued DECIMAL(5, 2) DEFAULT 0.00,
    taken DECIMAL(5, 2) DEFAULT 0.00,
    closing_balance DECIMAL(5, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
    UNIQUE(company_id, employee_id, leave_type_id, year)
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    leave_type_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ============================================================================
-- CRM MODULE
-- ============================================================================

-- Leads
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    lead_number TEXT NOT NULL,
    company_name TEXT,
    contact_name TEXT NOT NULL,
    job_title TEXT,
    email TEXT,
    phone TEXT,
    source TEXT, -- WEBSITE, REFERRAL, COLD_CALL, etc.
    industry TEXT,
    employee_count TEXT,
    revenue_estimate DECIMAL(15, 2),
    lead_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'NEW', -- NEW, CONTACTED, QUALIFIED, UNQUALIFIED
    assigned_to INTEGER,
    notes TEXT,
    converted_to_opportunity_id INTEGER,
    converted_at TIMESTAMP,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (converted_to_opportunity_id) REFERENCES opportunities(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, lead_number)
);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    opportunity_number TEXT NOT NULL,
    customer_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    value DECIMAL(15, 2) NOT NULL,
    probability INTEGER DEFAULT 50,
    expected_close_date DATE,
    stage TEXT DEFAULT 'PROSPECTING', -- PROSPECTING, QUALIFICATION, PROPOSAL, NEGOTIATION, WON, LOST
    status TEXT DEFAULT 'OPEN', -- OPEN, WON, LOST
    won_date DATE,
    lost_date DATE,
    lost_reason TEXT,
    assigned_to INTEGER,
    lead_source TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, opportunity_number)
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    quote_number TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    opportunity_id INTEGER,
    quote_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
    sent_date DATE,
    accepted_date DATE,
    rejected_date DATE,
    rejection_reason TEXT,
    converted_to_order_id INTEGER,
    notes TEXT,
    terms_and_conditions TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
    FOREIGN KEY (converted_to_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, quote_number)
);

-- Quote Lines
CREATE TABLE IF NOT EXISTS quote_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    line_total DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 15.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- Activities (Tasks, Calls, Meetings, Emails)
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL, -- TASK, CALL, MEETING, EMAIL
    subject TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    completed_date TIMESTAMP,
    status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    priority TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    related_to_type TEXT, -- LEAD, OPPORTUNITY, CUSTOMER
    related_to_id INTEGER,
    assigned_to INTEGER,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================================
-- INVENTORY & WAREHOUSE MODULE
-- ============================================================================

-- Products
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    product_type TEXT DEFAULT 'STOCK', -- STOCK, SERVICE, CONSUMABLE
    category TEXT,
    unit_of_measure TEXT DEFAULT 'UNIT',
    cost_price DECIMAL(15, 2) DEFAULT 0.00,
    selling_price DECIMAL(15, 2) DEFAULT 0.00,
    tax_rate_id INTEGER,
    inventory_account_id INTEGER,
    cogs_account_id INTEGER,
    revenue_account_id INTEGER,
    reorder_level DECIMAL(10, 2) DEFAULT 0.00,
    reorder_quantity DECIMAL(10, 2) DEFAULT 0.00,
    preferred_supplier_id INTEGER,
    barcode TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id),
    FOREIGN KEY (inventory_account_id) REFERENCES accounts(id),
    FOREIGN KEY (cogs_account_id) REFERENCES accounts(id),
    FOREIGN KEY (revenue_account_id) REFERENCES accounts(id),
    FOREIGN KEY (preferred_supplier_id) REFERENCES suppliers(id),
    UNIQUE(company_id, sku)
);

-- Warehouses/Locations
CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    address_line1 TEXT,
    city TEXT,
    province TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE(company_id, code)
);

-- Stock Levels
CREATE TABLE IF NOT EXISTS stock_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity_on_hand DECIMAL(10, 2) DEFAULT 0.00,
    quantity_reserved DECIMAL(10, 2) DEFAULT 0.00,
    quantity_available DECIMAL(10, 2) DEFAULT 0.00,
    last_cost DECIMAL(15, 2) DEFAULT 0.00,
    average_cost DECIMAL(15, 2) DEFAULT 0.00,
    total_value DECIMAL(15, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    UNIQUE(company_id, product_id, warehouse_id)
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    movement_number TEXT NOT NULL,
    movement_date DATE NOT NULL,
    movement_type TEXT NOT NULL, -- IN, OUT, TRANSFER, ADJUSTMENT
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(15, 2) DEFAULT 0.00,
    reference TEXT,
    reference_type TEXT, -- PO, SO, ADJUSTMENT, TRANSFER
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, movement_number)
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    po_number TEXT NOT NULL,
    supplier_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    warehouse_id INTEGER NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, CONFIRMED, RECEIVED, CANCELLED
    sent_date DATE,
    confirmed_date DATE,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, po_number)
);

-- Purchase Order Lines
CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    description TEXT,
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    quantity_received DECIMAL(10, 2) DEFAULT 0.00,
    unit_price DECIMAL(15, 2) NOT NULL,
    line_total DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 15.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    so_number TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    quote_id INTEGER,
    order_date DATE NOT NULL,
    delivery_date DATE,
    warehouse_id INTEGER NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, IN_PROGRESS, DELIVERED, INVOICED, CANCELLED
    confirmed_date DATE,
    delivery_address TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (quote_id) REFERENCES quotes(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, so_number)
);

-- Sales Order Lines
CREATE TABLE IF NOT EXISTS sales_order_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    so_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    description TEXT,
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    quantity_delivered DECIMAL(10, 2) DEFAULT 0.00,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    line_total DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 15.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================================================
-- BOT EXECUTION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    bot_id TEXT NOT NULL,
    bot_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT 1,
    schedule_type TEXT, -- MANUAL, SCHEDULED, EVENT_DRIVEN
    schedule_cron TEXT,
    configuration_json TEXT, -- JSON with bot-specific config
    last_run_at TIMESTAMP,
    last_run_status TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(company_id, bot_id)
);

CREATE TABLE IF NOT EXISTS bot_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    bot_configuration_id INTEGER NOT NULL,
    execution_number TEXT NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status TEXT DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED, CANCELLED
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    execution_log TEXT,
    error_message TEXT,
    triggered_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (bot_configuration_id) REFERENCES bot_configurations(id),
    FOREIGN KEY (triggered_by) REFERENCES users(id),
    UNIQUE(company_id, execution_number)
);

-- ============================================================================
-- COMPLIANCE TRACKING (South African Specific)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bbbee_scorecards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    assessment_date DATE NOT NULL,
    ownership_points DECIMAL(5, 2) DEFAULT 0.00,
    ownership_max DECIMAL(5, 2) DEFAULT 25.00,
    management_points DECIMAL(5, 2) DEFAULT 0.00,
    management_max DECIMAL(5, 2) DEFAULT 19.00,
    skills_points DECIMAL(5, 2) DEFAULT 0.00,
    skills_max DECIMAL(5, 2) DEFAULT 20.00,
    enterprise_points DECIMAL(5, 2) DEFAULT 0.00,
    enterprise_max DECIMAL(5, 2) DEFAULT 40.00,
    socioeconomic_points DECIMAL(5, 2) DEFAULT 0.00,
    socioeconomic_max DECIMAL(5, 2) DEFAULT 5.00,
    total_points DECIMAL(5, 2) DEFAULT 0.00,
    bbbee_level INTEGER,
    certificate_issued_date DATE,
    certificate_expiry_date DATE,
    assessment_agency TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(company_id, code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);

CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(company_id, code);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(company_id, code);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_company ON supplier_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_date ON supplier_invoices(invoice_date);

CREATE INDEX IF NOT EXISTS idx_customer_invoices_company ON customer_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer ON customer_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_status ON customer_invoices(status);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_date ON customer_invoices(invoice_date);

CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(is_reconciled);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_number ON employees(company_id, employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_dates ON payroll_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);

CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned ON opportunities(assigned_to);

CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(company_id, sku);
CREATE INDEX IF NOT EXISTS idx_stock_levels_product ON stock_levels(product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_bot_executions_company ON bot_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_bot_executions_config ON bot_executions(bot_configuration_id);
CREATE INDEX IF NOT EXISTS idx_bot_executions_started ON bot_executions(started_at);
