-- Migration 024: Back-office Finance Process Flow fixes
-- Addresses: Customer PO fields, warehouse location, delivery POD/driver, picking slips, customer statements

-- 1. Add missing fields to sales_orders (Customer PO Number, Customer Reference, delivery address, shipping method)
ALTER TABLE sales_orders ADD COLUMN customer_po_number TEXT;
ALTER TABLE sales_orders ADD COLUMN customer_reference TEXT;
ALTER TABLE sales_orders ADD COLUMN delivery_address TEXT;
ALTER TABLE sales_orders ADD COLUMN shipping_method TEXT;

-- 2. Add location/capacity columns to warehouses if missing
ALTER TABLE warehouses ADD COLUMN location TEXT DEFAULT '';
ALTER TABLE warehouses ADD COLUMN capacity INTEGER DEFAULT 0;
ALTER TABLE warehouses ADD COLUMN current_stock_value REAL DEFAULT 0;

-- 3. Add POD, driver, and picking slip fields to deliveries
ALTER TABLE deliveries ADD COLUMN driver_name TEXT;
ALTER TABLE deliveries ADD COLUMN driver_phone TEXT;
ALTER TABLE deliveries ADD COLUMN pod_uploaded INTEGER DEFAULT 0;
ALTER TABLE deliveries ADD COLUMN pod_file_url TEXT;
ALTER TABLE deliveries ADD COLUMN pod_uploaded_by TEXT;
ALTER TABLE deliveries ADD COLUMN pod_uploaded_at TEXT;
ALTER TABLE deliveries ADD COLUMN picking_slip_generated INTEGER DEFAULT 0;
ALTER TABLE deliveries ADD COLUMN picking_slip_generated_at TEXT;
ALTER TABLE deliveries ADD COLUMN waybill_number TEXT;
ALTER TABLE deliveries ADD COLUMN waybill_url TEXT;

-- 4. Customer statements table
CREATE TABLE IF NOT EXISTS customer_statements (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    statement_date TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    opening_balance REAL DEFAULT 0,
    total_invoiced REAL DEFAULT 0,
    total_payments REAL DEFAULT 0,
    total_credit_notes REAL DEFAULT 0,
    closing_balance REAL DEFAULT 0,
    current_amount REAL DEFAULT 0,
    days_30 REAL DEFAULT 0,
    days_60 REAL DEFAULT 0,
    days_90 REAL DEFAULT 0,
    days_over_90 REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    sent_at TEXT,
    sent_to TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Document attachments for sales orders
CREATE TABLE IF NOT EXISTS sales_order_attachments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    sales_order_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER DEFAULT 0,
    file_url TEXT,
    attachment_type TEXT DEFAULT 'general',
    uploaded_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
