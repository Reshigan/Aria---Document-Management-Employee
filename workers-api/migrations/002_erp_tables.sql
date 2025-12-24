-- ARIA ERP - D1 Database Schema for ERP Tables (Phase 2)
-- This migration creates the core ERP tables for customers, suppliers, products, and transactions

-- ========================================
-- MASTER DATA TABLES
-- ========================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    customer_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'South Africa',
    tax_number TEXT,
    credit_limit REAL DEFAULT 0,
    payment_terms TEXT DEFAULT 'Net 30',
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, customer_code)
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    supplier_code TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'South Africa',
    tax_number TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    bank_name TEXT,
    bank_account TEXT,
    bank_branch TEXT,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, supplier_code)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit_of_measure TEXT DEFAULT 'Each',
    unit_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    tax_rate REAL DEFAULT 15,
    quantity_on_hand REAL DEFAULT 0,
    reorder_level REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_service INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, product_code)
);

-- ========================================
-- ORDER TO CASH (O2C) TABLES
-- ========================================

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    quote_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    quote_date TEXT NOT NULL,
    valid_until TEXT,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    notes TEXT,
    terms TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, quote_number)
);

-- Quote line items
CREATE TABLE IF NOT EXISTS quote_items (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 15,
    line_total REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Sales Orders table
CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    order_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    quote_id TEXT REFERENCES quotes(id),
    order_date TEXT NOT NULL,
    expected_delivery_date TEXT,
    status TEXT DEFAULT 'pending',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    shipping_address TEXT,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, order_number)
);

-- Sales Order line items
CREATE TABLE IF NOT EXISTS sales_order_items (
    id TEXT PRIMARY KEY,
    sales_order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 15,
    line_total REAL DEFAULT 0,
    quantity_delivered REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Customer Invoices table
CREATE TABLE IF NOT EXISTS customer_invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    invoice_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    sales_order_id TEXT REFERENCES sales_orders(id),
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    balance_due REAL DEFAULT 0,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, invoice_number)
);

-- Customer Invoice line items
CREATE TABLE IF NOT EXISTS customer_invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES customer_invoices(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 15,
    line_total REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- PROCURE TO PAY (P2P) TABLES
-- ========================================

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    po_number TEXT NOT NULL,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    po_date TEXT NOT NULL,
    expected_delivery_date TEXT,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    shipping_address TEXT,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, po_number)
);

-- Purchase Order line items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    tax_rate REAL DEFAULT 15,
    line_total REAL DEFAULT 0,
    quantity_received REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Supplier Invoices table
CREATE TABLE IF NOT EXISTS supplier_invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    invoice_number TEXT NOT NULL,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    purchase_order_id TEXT REFERENCES purchase_orders(id),
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    balance_due REAL DEFAULT 0,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, invoice_number)
);

-- ========================================
-- PAYMENTS TABLES
-- ========================================

-- Customer Payments (Receipts)
CREATE TABLE IF NOT EXISTS customer_payments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    payment_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    invoice_id TEXT REFERENCES customer_invoices(id),
    payment_date TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'bank_transfer',
    reference TEXT,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, payment_number)
);

-- Supplier Payments
CREATE TABLE IF NOT EXISTS supplier_payments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    payment_number TEXT NOT NULL,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    invoice_id TEXT REFERENCES supplier_invoices(id),
    payment_date TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'bank_transfer',
    reference TEXT,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, payment_number)
);

-- ========================================
-- INDEXES
-- ========================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);

-- Supplier indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);

-- Quote indexes
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Sales Order indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_company_id ON sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);

-- Customer Invoice indexes
CREATE INDEX IF NOT EXISTS idx_customer_invoices_company_id ON customer_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer_id ON customer_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_status ON customer_invoices(status);

-- Purchase Order indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Supplier Invoice indexes
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_company_id ON supplier_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier_id ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);

-- ========================================
-- DEMO DATA
-- ========================================

-- Insert demo customers
INSERT OR IGNORE INTO customers (id, company_id, customer_code, customer_name, email, phone, address, city, country, credit_limit, payment_terms)
VALUES 
    ('cust-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'CUS-00001', 'Acme Corporation', 'accounts@acme.co.za', '+27 11 123 4567', '123 Main Street', 'Johannesburg', 'South Africa', 100000, 'Net 30'),
    ('cust-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'CUS-00002', 'TechStart Solutions', 'billing@techstart.co.za', '+27 21 987 6543', '456 Innovation Drive', 'Cape Town', 'South Africa', 50000, 'Net 15'),
    ('cust-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'CUS-00003', 'Global Traders Ltd', 'finance@globaltraders.co.za', '+27 31 555 1234', '789 Commerce Road', 'Durban', 'South Africa', 75000, 'Net 30');

-- Insert demo suppliers
INSERT OR IGNORE INTO suppliers (id, company_id, supplier_code, supplier_name, email, phone, address, city, country, payment_terms)
VALUES 
    ('supp-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SUP-00001', 'Office Supplies Co', 'orders@officesupplies.co.za', '+27 11 222 3333', '100 Industrial Park', 'Johannesburg', 'South Africa', 'Net 30'),
    ('supp-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SUP-00002', 'Tech Hardware Inc', 'sales@techhardware.co.za', '+27 21 444 5555', '200 Tech Boulevard', 'Cape Town', 'South Africa', 'Net 45'),
    ('supp-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SUP-00003', 'Raw Materials Ltd', 'procurement@rawmaterials.co.za', '+27 31 666 7777', '300 Factory Lane', 'Durban', 'South Africa', 'Net 30');

-- Insert demo products
INSERT OR IGNORE INTO products (id, company_id, product_code, product_name, description, category, unit_of_measure, unit_price, cost_price, tax_rate, quantity_on_hand)
VALUES 
    ('prod-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PRD-00001', 'Standard Widget', 'High-quality standard widget', 'Widgets', 'Each', 150.00, 75.00, 15, 500),
    ('prod-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PRD-00002', 'Premium Widget', 'Premium grade widget with extended warranty', 'Widgets', 'Each', 250.00, 125.00, 15, 200),
    ('prod-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PRD-00003', 'Consulting Service', 'Professional consulting service', 'Services', 'Hour', 500.00, 0, 15, 0),
    ('prod-004', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PRD-00004', 'Office Chair', 'Ergonomic office chair', 'Furniture', 'Each', 2500.00, 1500.00, 15, 50),
    ('prod-005', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PRD-00005', 'Laptop Computer', 'Business laptop with 3-year warranty', 'Electronics', 'Each', 15000.00, 12000.00, 15, 25);
