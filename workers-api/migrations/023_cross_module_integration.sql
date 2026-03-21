-- Cross-Module Integration Tables
-- Enables: payment auto-allocation, approval workflows, recurring invoices,
-- intercompany eliminations — matching/exceeding Odoo, NetSuite, SAP B1, Xero

CREATE TABLE IF NOT EXISTS payment_allocations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  allocated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS approval_rules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  min_amount REAL NOT NULL DEFAULT 0,
  max_amount REAL,
  approver_id TEXT,
  approver_role TEXT,
  step_order INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 1,
  approver_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  comments TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_invoice_date TEXT NOT NULL,
  end_date TEXT,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  invoices_generated INTEGER NOT NULL DEFAULT 0,
  last_generated_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_invoice_lines (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  discount_percent REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 15,
  line_total REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intercompany_eliminations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  source_company_id TEXT NOT NULL,
  target_company_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_company ON payment_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_approval_rules_company ON approval_rules(company_id, document_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_company ON approval_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_request ON approval_steps(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_company ON recurring_invoice_templates(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_lines_template ON recurring_invoice_lines(template_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_elim_company ON intercompany_eliminations(company_id);
