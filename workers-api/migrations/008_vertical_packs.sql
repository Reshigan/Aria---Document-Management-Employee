-- Migration 008: Vertical Industry Packs
-- Distribution, Retail, and Services/Projects tables

-- ==================== DISTRIBUTION VERTICAL ====================

-- Add country column to warehouses if it doesn't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- The warehouses table already exists from a previous migration

-- Warehouse bins/locations
CREATE TABLE IF NOT EXISTS warehouse_bins (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    bin_code TEXT NOT NULL,
    zone TEXT,
    aisle TEXT,
    rack TEXT,
    shelf TEXT,
    bin_type TEXT DEFAULT 'storage',
    max_weight REAL,
    max_volume REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(warehouse_id, bin_code)
);

-- Inventory by bin location
CREATE TABLE IF NOT EXISTS bin_inventory (
    id TEXT PRIMARY KEY,
    bin_id TEXT NOT NULL REFERENCES warehouse_bins(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity REAL DEFAULT 0,
    reserved_quantity REAL DEFAULT 0,
    last_count_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(bin_id, product_id)
);

-- Shipments
CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    shipment_number TEXT NOT NULL,
    shipment_type TEXT NOT NULL,
    source_warehouse_id TEXT REFERENCES warehouses(id),
    destination_warehouse_id TEXT REFERENCES warehouses(id),
    customer_id TEXT REFERENCES customers(id),
    supplier_id TEXT REFERENCES suppliers(id),
    ship_date TEXT,
    expected_delivery_date TEXT,
    actual_delivery_date TEXT,
    carrier TEXT,
    tracking_number TEXT,
    freight_cost REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, shipment_number)
);

-- Shipment lines
CREATE TABLE IF NOT EXISTS shipment_lines (
    id TEXT PRIMARY KEY,
    shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    source_bin_id TEXT REFERENCES warehouse_bins(id),
    destination_bin_id TEXT REFERENCES warehouse_bins(id),
    serial_numbers TEXT,
    lot_numbers TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Landed costs
CREATE TABLE IF NOT EXISTS landed_costs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    purchase_order_id TEXT REFERENCES purchase_orders(id),
    shipment_id TEXT REFERENCES shipments(id),
    cost_type TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    allocation_method TEXT DEFAULT 'value',
    created_at TEXT DEFAULT (datetime('now'))
);

-- ==================== RETAIL VERTICAL ====================

-- POS Registers
CREATE TABLE IF NOT EXISTS pos_registers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    register_code TEXT NOT NULL,
    register_name TEXT NOT NULL,
    location TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, register_code)
);

-- POS Transactions
CREATE TABLE IF NOT EXISTS pos_transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    register_id TEXT REFERENCES pos_registers(id),
    transaction_number TEXT NOT NULL,
    transaction_type TEXT DEFAULT 'sale',
    customer_id TEXT REFERENCES customers(id),
    subtotal REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    payment_method TEXT,
    payment_reference TEXT,
    cashier_id TEXT REFERENCES users(id),
    status TEXT DEFAULT 'completed',
    transaction_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, transaction_number)
);

-- POS Transaction Lines
CREATE TABLE IF NOT EXISTS pos_transaction_lines (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    line_total REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Loyalty Programs
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    program_name TEXT NOT NULL,
    points_per_currency REAL DEFAULT 1,
    currency_per_point REAL DEFAULT 0.01,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Loyalty Tiers
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    min_points INTEGER NOT NULL,
    points_multiplier REAL DEFAULT 1,
    benefits TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Customer Loyalty Points
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    program_id TEXT NOT NULL REFERENCES loyalty_programs(id),
    current_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    tier_id TEXT REFERENCES loyalty_tiers(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(customer_id, program_id)
);

-- Loyalty Transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    program_id TEXT NOT NULL REFERENCES loyalty_programs(id),
    transaction_type TEXT NOT NULL,
    points INTEGER NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    promotion_code TEXT NOT NULL,
    promotion_name TEXT NOT NULL,
    promotion_type TEXT NOT NULL,
    discount_value REAL,
    discount_percent REAL,
    min_purchase REAL,
    max_discount REAL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    conditions TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, promotion_code)
);

-- ==================== SERVICES/PROJECTS VERTICAL ====================

-- Note: Projects table already exists from previous migration, skipping creation

-- Project Tasks
CREATE TABLE IF NOT EXISTS project_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_code TEXT NOT NULL,
    task_name TEXT NOT NULL,
    parent_task_id TEXT REFERENCES project_tasks(id),
    assigned_to TEXT REFERENCES users(id),
    start_date TEXT,
    due_date TEXT,
    estimated_hours REAL,
    actual_hours REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    project_id TEXT NOT NULL REFERENCES projects(id),
    task_id TEXT REFERENCES project_tasks(id),
    employee_id TEXT REFERENCES employees(id),
    entry_date TEXT NOT NULL,
    hours REAL NOT NULL,
    description TEXT,
    billable INTEGER DEFAULT 1,
    hourly_rate REAL,
    billable_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'submitted',
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    invoiced INTEGER DEFAULT 0,
    invoice_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Project Expenses
CREATE TABLE IF NOT EXISTS project_expenses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    project_id TEXT NOT NULL REFERENCES projects(id),
    expense_date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    billable INTEGER DEFAULT 1,
    markup_percent REAL DEFAULT 0,
    billable_amount REAL,
    receipt_url TEXT,
    status TEXT DEFAULT 'submitted',
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    invoiced INTEGER DEFAULT 0,
    invoice_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Resource Allocations
CREATE TABLE IF NOT EXISTS resource_allocations (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    employee_id TEXT NOT NULL REFERENCES employees(id),
    project_id TEXT NOT NULL REFERENCES projects(id),
    role TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    hours_per_day REAL DEFAULT 8,
    allocation_percent REAL DEFAULT 100,
    hourly_rate REAL,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS project_milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_name TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    completed_date TEXT,
    billing_amount REAL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

-- ==================== SEED DATA (only for new tables) ====================

-- Demo POS register
INSERT OR IGNORE INTO pos_registers (id, company_id, register_code, register_name, location, is_active)
VALUES 
    ('pos-1', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'POS-001', 'Main Register', 'Store Front', 1),
    ('pos-2', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'POS-002', 'Backup Register', 'Store Front', 1);

-- Demo loyalty program
INSERT OR IGNORE INTO loyalty_programs (id, company_id, program_name, points_per_currency, currency_per_point, is_active)
VALUES ('loyalty-1', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'ARIA Rewards', 1, 0.01, 1);

-- Demo loyalty tiers
INSERT OR IGNORE INTO loyalty_tiers (id, program_id, tier_name, min_points, points_multiplier, benefits)
VALUES 
    ('tier-bronze', 'loyalty-1', 'Bronze', 0, 1, 'Basic rewards'),
    ('tier-silver', 'loyalty-1', 'Silver', 1000, 1.25, '25% bonus points'),
    ('tier-gold', 'loyalty-1', 'Gold', 5000, 1.5, '50% bonus points, free shipping'),
    ('tier-platinum', 'loyalty-1', 'Platinum', 10000, 2, 'Double points, priority support');

-- Demo promotions
INSERT OR IGNORE INTO promotions (id, company_id, promotion_code, promotion_name, promotion_type, discount_percent, min_purchase, start_date, end_date, is_active)
VALUES 
    ('promo-summer', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SUMMER20', 'Summer Sale', 'percentage', 20, 500, '2025-12-01', '2025-12-31', 1),
    ('promo-welcome', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'WELCOME10', 'Welcome Discount', 'percentage', 10, 0, '2025-01-01', '2025-12-31', 1);

-- Note: Projects table already exists, skipping project seed data

-- Demo project tasks (will only work if proj-1 exists)
INSERT OR IGNORE INTO project_tasks (id, project_id, task_code, task_name, estimated_hours, status, priority)
VALUES 
    ('task-1', 'proj-1', 'T001', 'Requirements Gathering', 40, 'completed', 'high'),
    ('task-2', 'proj-1', 'T002', 'System Design', 80, 'in_progress', 'high'),
    ('task-3', 'proj-1', 'T003', 'Development', 200, 'pending', 'medium'),
    ('task-4', 'proj-1', 'T004', 'Testing', 60, 'pending', 'medium'),
    ('task-5', 'proj-1', 'T005', 'Training & Go-Live', 40, 'pending', 'high');

-- Demo time entries
INSERT OR IGNORE INTO time_entries (id, company_id, project_id, task_id, entry_date, hours, description, billable, hourly_rate, billable_amount, status)
VALUES 
    ('time-1', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-1', 'task-1', '2025-01-15', 8, 'Client workshop - requirements', 1, 1500, 12000, 'approved'),
    ('time-2', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-1', 'task-1', '2025-01-16', 8, 'Requirements documentation', 1, 1500, 12000, 'approved'),
    ('time-3', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'proj-1', 'task-2', '2025-01-20', 6, 'System architecture design', 1, 1500, 9000, 'submitted');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_bins_warehouse ON warehouse_bins(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_shipments_company ON shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_company ON pos_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON pos_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_employee ON resource_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_project ON resource_allocations(project_id);
