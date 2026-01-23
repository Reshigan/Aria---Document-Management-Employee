-- Admin Configuration Features Migration
-- Chart of Accounts, Invoice Templates, Lock Dates, Payment Terms, Tax Rates, Email Templates, Tracking Categories

-- Chart of Accounts (enhanced)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'bank', 'current_asset', 'fixed_asset', 'current_liability', 'long_term_liability', 'other_income', 'other_expense', 'cost_of_goods_sold')),
  tax_rate_id TEXT,
  description TEXT,
  parent_account_id TEXT,
  is_system_account INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  show_in_expense_claims INTEGER DEFAULT 0,
  enable_payments INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id),
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coa_company ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_account_id);

-- Invoice Templates
CREATE TABLE IF NOT EXISTS invoice_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  template_type TEXT NOT NULL CHECK (template_type IN ('invoice', 'quote', 'credit_note', 'purchase_order', 'statement')),
  logo_url TEXT,
  logo_position TEXT DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right')),
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#64748b',
  font_family TEXT DEFAULT 'Inter',
  show_logo INTEGER DEFAULT 1,
  show_payment_advice INTEGER DEFAULT 1,
  show_tax_summary INTEGER DEFAULT 1,
  show_discount_column INTEGER DEFAULT 0,
  show_unit_price INTEGER DEFAULT 1,
  show_quantity INTEGER DEFAULT 1,
  header_text TEXT,
  footer_text TEXT,
  terms_and_conditions TEXT,
  payment_instructions TEXT,
  custom_css TEXT,
  layout_config TEXT, -- JSON for advanced layout settings
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_company ON invoice_templates(company_id);

-- Lock Dates
CREATE TABLE IF NOT EXISTS lock_dates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  lock_type TEXT NOT NULL CHECK (lock_type IN ('all_users', 'non_admin', 'advisor_only')),
  lock_date TEXT NOT NULL,
  reason TEXT,
  locked_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (locked_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_lock_dates_company ON lock_dates(company_id);

-- Payment Terms
CREATE TABLE IF NOT EXISTS payment_terms (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  days INTEGER NOT NULL,
  term_type TEXT NOT NULL CHECK (term_type IN ('net_days', 'day_of_month', 'day_of_following_month', 'due_on_receipt', 'custom')),
  day_of_month INTEGER,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  description TEXT,
  early_payment_discount_percent REAL,
  early_payment_discount_days INTEGER,
  late_fee_percent REAL,
  late_fee_grace_days INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_terms_company ON payment_terms(company_id);

-- Tax Rates
CREATE TABLE IF NOT EXISTS tax_rates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rate REAL NOT NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('output', 'input', 'exempt', 'zero_rated', 'reverse_charge', 'custom')),
  tax_component TEXT DEFAULT 'single' CHECK (tax_component IN ('single', 'compound')),
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  effective_from TEXT,
  effective_to TEXT,
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'sales', 'purchases')),
  report_code TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_company ON tax_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_type ON tax_rates(tax_type);

-- Compound Tax Components (for compound taxes)
CREATE TABLE IF NOT EXISTS tax_rate_components (
  id TEXT PRIMARY KEY,
  tax_rate_id TEXT NOT NULL,
  component_name TEXT NOT NULL,
  component_rate REAL NOT NULL,
  is_compounding INTEGER DEFAULT 0,
  calculation_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id) ON DELETE CASCADE
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('invoice', 'quote', 'credit_note', 'statement', 'payment_reminder', 'payment_received', 'purchase_order', 'welcome', 'password_reset', 'custom')),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  variables TEXT, -- JSON array of available variables
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_company ON email_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);

-- Tracking Categories (Dimensions)
CREATE TABLE IF NOT EXISTS tracking_categories (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  is_required_for_sales INTEGER DEFAULT 0,
  is_required_for_purchases INTEGER DEFAULT 0,
  is_required_for_expenses INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_tracking_categories_company ON tracking_categories(company_id);

-- Tracking Category Options
CREATE TABLE IF NOT EXISTS tracking_category_options (
  id TEXT PRIMARY KEY,
  tracking_category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tracking_category_id) REFERENCES tracking_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracking_options_category ON tracking_category_options(tracking_category_id);

-- Financial Settings (for lock dates and other settings)
CREATE TABLE IF NOT EXISTS financial_settings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  financial_year_start_month INTEGER DEFAULT 1,
  financial_year_start_day INTEGER DEFAULT 1,
  lock_date_all_users TEXT,
  lock_date_non_admin TEXT,
  conversion_date TEXT,
  conversion_balances_entered INTEGER DEFAULT 0,
  default_sales_account_id TEXT,
  default_purchases_account_id TEXT,
  default_tax_rate_id TEXT,
  default_payment_term_id TEXT,
  multi_currency_enabled INTEGER DEFAULT 0,
  base_currency TEXT DEFAULT 'ZAR',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Insert default payment terms
INSERT OR IGNORE INTO payment_terms (id, company_id, name, days, term_type, is_default, display_order) VALUES
  ('pt-due-on-receipt', 'demo-company', 'Due on Receipt', 0, 'due_on_receipt', 0, 1),
  ('pt-net-7', 'demo-company', 'Net 7', 7, 'net_days', 0, 2),
  ('pt-net-14', 'demo-company', 'Net 14', 14, 'net_days', 0, 3),
  ('pt-net-30', 'demo-company', 'Net 30', 30, 'net_days', 1, 4),
  ('pt-net-60', 'demo-company', 'Net 60', 60, 'net_days', 0, 5),
  ('pt-net-90', 'demo-company', 'Net 90', 90, 'net_days', 0, 6),
  ('pt-eom', 'demo-company', 'End of Month', 0, 'day_of_month', 0, 7),
  ('pt-20th-following', 'demo-company', '20th of Following Month', 20, 'day_of_following_month', 0, 8);

-- Insert default tax rates (South Africa)
INSERT OR IGNORE INTO tax_rates (id, company_id, name, rate, tax_type, is_default, display_order) VALUES
  ('tax-vat-15', 'demo-company', 'VAT 15%', 15.0, 'output', 1, 1),
  ('tax-vat-0', 'demo-company', 'VAT 0% (Zero Rated)', 0.0, 'zero_rated', 0, 2),
  ('tax-exempt', 'demo-company', 'VAT Exempt', 0.0, 'exempt', 0, 3),
  ('tax-input-15', 'demo-company', 'Input VAT 15%', 15.0, 'input', 0, 4);

-- Insert default email templates
INSERT OR IGNORE INTO email_templates (id, company_id, template_type, name, subject, body_html, is_default, variables) VALUES
  ('et-invoice', 'demo-company', 'invoice', 'Invoice Email', 'Invoice {{invoice_number}} from {{company_name}}', 
   '<p>Dear {{customer_name}},</p><p>Please find attached invoice {{invoice_number}} for {{total_amount}}.</p><p>Payment is due by {{due_date}}.</p><p>Thank you for your business.</p><p>{{company_name}}</p>', 
   1, '["invoice_number", "customer_name", "company_name", "total_amount", "due_date", "invoice_date"]'),
  ('et-quote', 'demo-company', 'quote', 'Quote Email', 'Quote {{quote_number}} from {{company_name}}',
   '<p>Dear {{customer_name}},</p><p>Please find attached quote {{quote_number}} for {{total_amount}}.</p><p>This quote is valid until {{expiry_date}}.</p><p>{{company_name}}</p>',
   1, '["quote_number", "customer_name", "company_name", "total_amount", "expiry_date"]'),
  ('et-reminder', 'demo-company', 'payment_reminder', 'Payment Reminder', 'Payment Reminder: Invoice {{invoice_number}} is overdue',
   '<p>Dear {{customer_name}},</p><p>This is a friendly reminder that invoice {{invoice_number}} for {{total_amount}} was due on {{due_date}}.</p><p>Please arrange payment at your earliest convenience.</p><p>{{company_name}}</p>',
   1, '["invoice_number", "customer_name", "company_name", "total_amount", "due_date", "days_overdue"]'),
  ('et-payment-received', 'demo-company', 'payment_received', 'Payment Received', 'Payment Received - Thank You',
   '<p>Dear {{customer_name}},</p><p>We have received your payment of {{payment_amount}} for invoice {{invoice_number}}.</p><p>Thank you for your prompt payment.</p><p>{{company_name}}</p>',
   1, '["invoice_number", "customer_name", "company_name", "payment_amount", "payment_date"]');

-- Insert default tracking categories
INSERT OR IGNORE INTO tracking_categories (id, company_id, name, is_required_for_sales, display_order) VALUES
  ('tc-department', 'demo-company', 'Department', 0, 1),
  ('tc-region', 'demo-company', 'Region', 0, 2),
  ('tc-project', 'demo-company', 'Project', 0, 3);

-- Insert default tracking category options
INSERT OR IGNORE INTO tracking_category_options (id, tracking_category_id, name, code, display_order) VALUES
  ('tco-sales', 'tc-department', 'Sales', 'SALES', 1),
  ('tco-marketing', 'tc-department', 'Marketing', 'MKT', 2),
  ('tco-operations', 'tc-department', 'Operations', 'OPS', 3),
  ('tco-finance', 'tc-department', 'Finance', 'FIN', 4),
  ('tco-hr', 'tc-department', 'Human Resources', 'HR', 5),
  ('tco-gauteng', 'tc-region', 'Gauteng', 'GP', 1),
  ('tco-wc', 'tc-region', 'Western Cape', 'WC', 2),
  ('tco-kzn', 'tc-region', 'KwaZulu-Natal', 'KZN', 3),
  ('tco-ec', 'tc-region', 'Eastern Cape', 'EC', 4);

-- Insert default invoice template
INSERT OR IGNORE INTO invoice_templates (id, company_id, name, is_default, template_type, primary_color, footer_text, terms_and_conditions) VALUES
  ('it-default', 'demo-company', 'Standard Invoice', 1, 'invoice', '#1e40af', 'Thank you for your business!', 'Payment is due within the specified terms. Late payments may incur interest charges.');
