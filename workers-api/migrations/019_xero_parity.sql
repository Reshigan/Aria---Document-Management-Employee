-- Xero Parity Features Migration
-- Adds tables for: Recurring Invoices, Invoice Reminders, Customer Statements, 
-- Customer Portal, Budgets, and Bank Feeds (Plaid)

-- ==================== RECURRING INVOICES ====================

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  next_invoice_date TEXT NOT NULL,
  last_invoice_date TEXT,
  currency TEXT DEFAULT 'ZAR',
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  payment_terms_days INTEGER DEFAULT 30,
  notes TEXT,
  auto_send INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  invoices_generated INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS recurring_invoice_items (
  id TEXT PRIMARY KEY,
  recurring_invoice_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  unit_price REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  line_total REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (recurring_invoice_id) REFERENCES recurring_invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_company ON recurring_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_customer ON recurring_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_status ON recurring_invoices(status);

-- ==================== INVOICE REMINDERS ====================

CREATE TABLE IF NOT EXISTS invoice_reminder_schedules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('before_due', 'on_due', 'overdue')),
  days_offset INTEGER NOT NULL,
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS invoice_reminder_history (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  schedule_id TEXT,
  reminder_type TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  sent_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (invoice_id) REFERENCES customer_invoices(id),
  FOREIGN KEY (schedule_id) REFERENCES invoice_reminder_schedules(id)
);

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_company ON invoice_reminder_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_invoice ON invoice_reminder_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_company ON invoice_reminder_history(company_id);

-- ==================== CUSTOMER STATEMENTS ====================

CREATE TABLE IF NOT EXISTS customer_statement_history (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  statement_date TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  opening_balance REAL DEFAULT 0,
  total_invoiced REAL DEFAULT 0,
  total_paid REAL DEFAULT 0,
  closing_balance REAL DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  emailed_to TEXT,
  emailed_at TEXT,
  pdf_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_statement_history_company ON customer_statement_history(company_id);
CREATE INDEX IF NOT EXISTS idx_statement_history_customer ON customer_statement_history(customer_id);

-- ==================== CUSTOMER PORTAL ====================

CREATE TABLE IF NOT EXISTS portal_invites (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS portal_access (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  login_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id TEXT PRIMARY KEY,
  portal_access_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (portal_access_id) REFERENCES portal_access(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  portal_access_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (portal_access_id) REFERENCES portal_access(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_invites_token ON portal_invites(token);
CREATE INDEX IF NOT EXISTS idx_portal_invites_company ON portal_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_email ON portal_access(email);
CREATE INDEX IF NOT EXISTS idx_portal_access_customer ON portal_access(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions(token);

-- ==================== BUDGETS ====================

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fiscal_year INTEGER NOT NULL,
  budget_type TEXT DEFAULT 'annual' CHECK (budget_type IN ('annual', 'quarterly', 'monthly', 'project')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'closed')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL,
  gl_account_id TEXT NOT NULL,
  gl_account_code TEXT,
  gl_account_name TEXT,
  department_id TEXT,
  project_id TEXT,
  period_1 REAL DEFAULT 0,
  period_2 REAL DEFAULT 0,
  period_3 REAL DEFAULT 0,
  period_4 REAL DEFAULT 0,
  period_5 REAL DEFAULT 0,
  period_6 REAL DEFAULT 0,
  period_7 REAL DEFAULT 0,
  period_8 REAL DEFAULT 0,
  period_9 REAL DEFAULT 0,
  period_10 REAL DEFAULT 0,
  period_11 REAL DEFAULT 0,
  period_12 REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_company ON budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account ON budget_lines(gl_account_id);

-- ==================== BANK FEEDS (PLAID) ====================

CREATE TABLE IF NOT EXISTS bank_connections (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  bank_account_id TEXT NOT NULL,
  provider TEXT DEFAULT 'plaid' CHECK (provider IN ('plaid', 'yodlee', 'truelayer', 'manual')),
  access_token_encrypted TEXT,
  item_id TEXT,
  institution_id TEXT,
  institution_name TEXT,
  account_id TEXT,
  account_name TEXT,
  account_type TEXT,
  account_subtype TEXT,
  account_mask TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'error', 'disconnected')),
  last_sync_at TEXT,
  last_sync_status TEXT,
  sync_frequency_hours INTEGER DEFAULT 24,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS bank_feed_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  bank_account_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  posted_date TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  description TEXT NOT NULL,
  merchant_name TEXT,
  category TEXT,
  subcategory TEXT,
  pending INTEGER DEFAULT 0,
  transaction_type TEXT CHECK (transaction_type IN ('debit', 'credit')),
  check_number TEXT,
  location TEXT,
  is_matched INTEGER DEFAULT 0,
  matched_to_type TEXT,
  matched_to_id TEXT,
  suggested_gl_account_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id)
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_company ON bank_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_account ON bank_connections(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_item ON bank_connections(item_id);
CREATE INDEX IF NOT EXISTS idx_bank_feed_txn_company ON bank_feed_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_feed_txn_account ON bank_feed_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_feed_txn_external ON bank_feed_transactions(external_id, connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_feed_txn_matched ON bank_feed_transactions(is_matched);
CREATE INDEX IF NOT EXISTS idx_bank_feed_txn_date ON bank_feed_transactions(transaction_date);

-- Add connector_id column to bank_accounts if it doesn't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so this may fail if column exists
-- ALTER TABLE bank_accounts ADD COLUMN connector_id TEXT;
