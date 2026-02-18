-- Migration 021: Create tables referenced in route handlers but missing from migrations
-- These 14 tables are used by API routes but were never defined in migrations 001-020

-- Generic invoices table (used by documents.ts and go-live.ts for document printing)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    invoice_number TEXT,
    invoice_type TEXT DEFAULT 'standard',
    customer_id TEXT,
    supplier_id TEXT,
    sales_order_id TEXT,
    invoice_date TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    balance_due REAL DEFAULT 0,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Generic invoice line items (used by go-live.ts for document printing)
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id TEXT,
    description TEXT,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 15,
    line_total REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- AR invoices summary view table (used by differentiators.ts for overdue counts)
CREATE TABLE IF NOT EXISTS ar_invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    invoice_number TEXT,
    customer_id TEXT,
    invoice_date TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'draft',
    total_amount REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    balance_due REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Deliveries table (used by deliveries.ts for outbound/inbound delivery management)
CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    delivery_number TEXT,
    delivery_type TEXT DEFAULT 'outbound',
    sales_order_id TEXT,
    customer_id TEXT,
    warehouse_id TEXT,
    delivery_date TEXT,
    status TEXT DEFAULT 'draft',
    tracking_number TEXT,
    carrier TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Delivery line items (used by deliveries.ts)
CREATE TABLE IF NOT EXISTS delivery_lines (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    line_number INTEGER DEFAULT 0,
    product_id TEXT,
    description TEXT,
    quantity REAL DEFAULT 0,
    quantity_shipped REAL DEFAULT 0,
    storage_location_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Delivery items (used by go-live.ts document printing)
CREATE TABLE IF NOT EXISTS delivery_items (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id TEXT,
    description TEXT,
    quantity REAL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    line_total REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Attendance table (used by hr.ts for employee check-in/check-out)
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_id TEXT,
    date TEXT,
    check_in TEXT,
    check_out TEXT,
    status TEXT DEFAULT 'present',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Helpdesk knowledge base (used by helpdesk.ts)
CREATE TABLE IF NOT EXISTS helpdesk_knowledge_base (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    title TEXT NOT NULL,
    body TEXT,
    category TEXT DEFAULT 'General',
    tags TEXT DEFAULT '',
    is_published INTEGER DEFAULT 1,
    views INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Quality inspections (used by quality.ts)
CREATE TABLE IF NOT EXISTS quality_inspections (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    inspection_type TEXT DEFAULT 'incoming',
    product_id TEXT,
    work_order_id TEXT,
    inspector TEXT,
    status TEXT DEFAULT 'pending',
    score REAL,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Reconciliation runs (used by reconciliation.ts)
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    run_type TEXT DEFAULT 'sales_to_invoice',
    status TEXT DEFAULT 'completed',
    total_records INTEGER DEFAULT 0,
    matched_records INTEGER DEFAULT 0,
    exceptions_count INTEGER DEFAULT 0,
    run_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Goods receipts (used by differentiators.ts for procurement)
CREATE TABLE IF NOT EXISTS goods_receipts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    receipt_number TEXT,
    po_id TEXT,
    received_quantity REAL DEFAULT 0,
    status TEXT DEFAULT 'received',
    received_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Payslips (used by differentiators.ts for HR/payroll)
CREATE TABLE IF NOT EXISTS payslips (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_id TEXT,
    payslip_number TEXT,
    pay_period_start TEXT,
    pay_period_end TEXT,
    gross_pay REAL DEFAULT 0,
    deductions REAL DEFAULT 0,
    net_pay REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Customer receipts (used by reconciliation.ts for bank reconciliation matching)
CREATE TABLE IF NOT EXISTS customer_receipts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    receipt_number TEXT,
    customer_id TEXT,
    amount REAL DEFAULT 0,
    receipt_date TEXT,
    payment_method TEXT,
    reference TEXT,
    is_reconciled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Tax filings (used by differentiators.ts for compliance)
CREATE TABLE IF NOT EXISTS tax_filings (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    filing_type TEXT,
    period_start TEXT,
    period_end TEXT,
    status TEXT DEFAULT 'draft',
    total_tax REAL DEFAULT 0,
    submitted_date TEXT,
    reference_number TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
