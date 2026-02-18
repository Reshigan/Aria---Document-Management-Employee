-- Migration 022: Reverse Logistics Tables (Sales Returns, Return Items, Customer Refunds)

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  return_number TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  sales_order_id TEXT,
  invoice_id TEXT,
  credit_note_id TEXT,
  return_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  return_type TEXT DEFAULT 'full', -- full, partial, exchange
  status TEXT DEFAULT 'draft', -- draft, pending_approval, approved, received, inspected, completed, rejected, cancelled
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  warehouse_id TEXT,
  received_date TEXT,
  received_by TEXT,
  inspection_notes TEXT,
  resolution TEXT, -- refund, credit_note, exchange, repair
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, return_number)
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT NOT NULL,
  quantity_returned INTEGER NOT NULL DEFAULT 0,
  quantity_received INTEGER DEFAULT 0,
  quantity_accepted INTEGER DEFAULT 0,
  quantity_rejected INTEGER DEFAULT 0,
  unit_price REAL DEFAULT 0,
  tax_rate REAL DEFAULT 15,
  line_total REAL DEFAULT 0,
  condition TEXT DEFAULT 'unknown', -- new, good, damaged, defective, unknown
  rejection_reason TEXT,
  restock TEXT DEFAULT 'yes', -- yes, no, partial
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (return_id) REFERENCES sales_returns(id)
);

CREATE TABLE IF NOT EXISTS customer_refunds (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  refund_number TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  return_id TEXT,
  credit_note_id TEXT,
  invoice_id TEXT,
  refund_date TEXT NOT NULL,
  refund_method TEXT NOT NULL DEFAULT 'bank_transfer', -- bank_transfer, credit_card, cash, store_credit, offset
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'pending', -- pending, approved, processing, completed, failed, cancelled
  reference TEXT,
  bank_account_id TEXT,
  transaction_reference TEXT,
  processed_date TEXT,
  processed_by TEXT,
  reason TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, refund_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_company ON sales_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns(company_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON sales_returns(company_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON sales_returns(company_id, return_date);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_customer_refunds_company ON customer_refunds(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_refunds_customer ON customer_refunds(company_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_refunds_status ON customer_refunds(company_id, status);
