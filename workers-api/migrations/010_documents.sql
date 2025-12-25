-- Migration 010: Documents and Email Tracking
-- Company branded documents for all document types with print/email functionality

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  document_date TEXT NOT NULL,
  due_date TEXT,
  recipient_id TEXT,
  recipient_type TEXT,
  recipient_name TEXT,
  subtotal REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'draft',
  line_items_json TEXT,
  metadata_json TEXT,
  source_transaction_type TEXT,
  source_transaction_id TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(company_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(company_id, document_date);
CREATE INDEX IF NOT EXISTS idx_documents_recipient ON documents(company_id, recipient_id);

-- Document email tracking
CREATE TABLE IF NOT EXISTS document_emails (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  to_email TEXT NOT NULL,
  cc_email TEXT,
  bcc_email TEXT,
  subject TEXT,
  message TEXT,
  attachment_url TEXT,
  sent_at TEXT,
  delivered_at TEXT,
  opened_at TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE INDEX IF NOT EXISTS idx_document_emails_document ON document_emails(document_id);
CREATE INDEX IF NOT EXISTS idx_document_emails_company ON document_emails(company_id);

-- Document templates (for custom templates per company)
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  header_html TEXT,
  footer_html TEXT,
  css_overrides TEXT,
  logo_position TEXT DEFAULT 'left',
  show_bank_details INTEGER DEFAULT 1,
  show_terms INTEGER DEFAULT 1,
  show_signature_block INTEGER DEFAULT 0,
  custom_terms TEXT,
  custom_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_templates_company ON document_templates(company_id, document_type);

-- Document numbering sequences
CREATE TABLE IF NOT EXISTS document_sequences (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  prefix TEXT NOT NULL,
  current_number INTEGER DEFAULT 0,
  year INTEGER,
  format TEXT DEFAULT '{PREFIX}-{YEAR}-{NUMBER:6}',
  reset_yearly INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, document_type, year)
);

CREATE INDEX IF NOT EXISTS idx_document_sequences_company ON document_sequences(company_id);

-- Bank reconciliation tables
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  branch_code TEXT,
  swift_code TEXT,
  iban TEXT,
  currency TEXT DEFAULT 'ZAR',
  gl_account_id TEXT,
  is_primary INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  last_reconciled_date TEXT,
  last_reconciled_balance REAL,
  feed_provider TEXT,
  feed_account_id TEXT,
  feed_last_sync TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);

-- Bank transactions (from feeds or manual import)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  bank_account_id TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  value_date TEXT,
  description TEXT,
  reference TEXT,
  amount REAL NOT NULL,
  balance_after REAL,
  transaction_type TEXT,
  category TEXT,
  is_reconciled INTEGER DEFAULT 0,
  reconciled_at TEXT,
  reconciled_by TEXT,
  matched_transaction_id TEXT,
  matched_transaction_type TEXT,
  match_confidence REAL,
  is_manual INTEGER DEFAULT 0,
  import_batch_id TEXT,
  external_id TEXT,
  raw_data_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_company ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(company_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(company_id, is_reconciled);

-- Bank reconciliation sessions
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  bank_account_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  opening_balance REAL NOT NULL,
  closing_balance REAL NOT NULL,
  statement_balance REAL,
  reconciled_balance REAL,
  difference REAL,
  status TEXT DEFAULT 'in_progress',
  completed_at TEXT,
  completed_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_company ON bank_reconciliations(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_account ON bank_reconciliations(bank_account_id);

-- Bank matching rules
CREATE TABLE IF NOT EXISTS bank_matching_rules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  match_field TEXT NOT NULL,
  match_operator TEXT NOT NULL,
  match_value TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_category TEXT,
  action_gl_account_id TEXT,
  action_tax_code TEXT,
  auto_reconcile INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_matching_rules_company ON bank_matching_rules(company_id);

-- Payment integrations
CREATE TABLE IF NOT EXISTS payment_integrations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  api_key_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  is_active INTEGER DEFAULT 1,
  is_test_mode INTEGER DEFAULT 0,
  supported_currencies TEXT,
  settings_json TEXT,
  last_sync_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_integrations_company ON payment_integrations(company_id);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  integration_id TEXT,
  external_id TEXT,
  payment_type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'pending',
  payer_name TEXT,
  payer_email TEXT,
  payer_reference TEXT,
  invoice_id TEXT,
  document_id TEXT,
  bank_account_id TEXT,
  payment_method TEXT,
  payment_date TEXT,
  processed_at TEXT,
  failure_reason TEXT,
  metadata_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_company ON payment_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);

-- Bot execution logs (for observability)
CREATE TABLE IF NOT EXISTS bot_executions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_source TEXT,
  status TEXT DEFAULT 'running',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  input_json TEXT,
  output_json TEXT,
  error_message TEXT,
  error_stack TEXT,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  is_dry_run INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_executions_company ON bot_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_bot_executions_bot ON bot_executions(company_id, bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_executions_status ON bot_executions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_bot_executions_date ON bot_executions(company_id, started_at);

-- Bot exceptions (human-in-the-loop inbox)
CREATE TABLE IF NOT EXISTS bot_exceptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  execution_id TEXT,
  bot_id TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  exception_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  affected_record_type TEXT,
  affected_record_id TEXT,
  affected_record_data_json TEXT,
  suggested_action TEXT,
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  resolution_action TEXT,
  resolution_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES bot_executions(id)
);

CREATE INDEX IF NOT EXISTS idx_bot_exceptions_company ON bot_exceptions(company_id);
CREATE INDEX IF NOT EXISTS idx_bot_exceptions_status ON bot_exceptions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_bot_exceptions_bot ON bot_exceptions(company_id, bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_exceptions_severity ON bot_exceptions(company_id, severity);

-- Onboarding progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  current_step TEXT DEFAULT 'company_profile',
  completed_steps TEXT DEFAULT '[]',
  skipped_steps TEXT DEFAULT '[]',
  company_profile_complete INTEGER DEFAULT 0,
  branding_complete INTEGER DEFAULT 0,
  chart_of_accounts_complete INTEGER DEFAULT 0,
  bank_accounts_complete INTEGER DEFAULT 0,
  opening_balances_complete INTEGER DEFAULT 0,
  customers_imported INTEGER DEFAULT 0,
  suppliers_imported INTEGER DEFAULT 0,
  products_imported INTEGER DEFAULT 0,
  users_invited INTEGER DEFAULT 0,
  first_invoice_created INTEGER DEFAULT 0,
  bank_connected INTEGER DEFAULT 0,
  payment_gateway_connected INTEGER DEFAULT 0,
  go_live_date TEXT,
  onboarding_completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company ON onboarding_progress(company_id);

-- Data import batches
CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  import_type TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT,
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  mapping_json TEXT,
  errors_json TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_batches_company ON import_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(company_id, status);

-- Subscription and billing (commercial readiness)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  billing_cycle TEXT DEFAULT 'monthly',
  price_per_cycle REAL NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  current_period_start TEXT,
  current_period_end TEXT,
  trial_ends_at TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT,
  payment_method_id TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Usage metering
CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_records_company ON usage_records(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_metric ON usage_records(company_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(company_id, period_start);

-- Audit log (comprehensive)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  old_values_json TEXT,
  new_values_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(company_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(company_id, created_at);

-- Insert default document sequences for demo company
INSERT OR IGNORE INTO document_sequences (id, company_id, document_type, prefix, current_number, year)
VALUES 
  ('seq-quote', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'quote', 'QT', 0, 2025),
  ('seq-so', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'sales_order', 'SO', 0, 2025),
  ('seq-inv', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'tax_invoice', 'INV', 0, 2025),
  ('seq-cn', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'credit_note', 'CN', 0, 2025),
  ('seq-dn', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'debit_note', 'DN', 0, 2025),
  ('seq-del', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'delivery_note', 'DEL', 0, 2025),
  ('seq-po', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'purchase_order', 'PO', 0, 2025),
  ('seq-grn', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'goods_receipt', 'GRN', 0, 2025),
  ('seq-pv', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'payment_voucher', 'PV', 0, 2025),
  ('seq-rv', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'receipt_voucher', 'RV', 0, 2025);

-- Insert demo bank account
INSERT OR IGNORE INTO bank_accounts (id, company_id, account_name, bank_name, account_number, branch_code, currency, is_primary, opening_balance, current_balance)
VALUES ('bank-demo-1', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'Main Operating Account', 'First National Bank', '62123456789', '250655', 'ZAR', 1, 100000, 850000);

-- Insert onboarding progress for demo company
INSERT OR IGNORE INTO onboarding_progress (id, company_id, current_step, company_profile_complete, branding_complete, chart_of_accounts_complete, bank_accounts_complete, customers_imported, suppliers_imported, products_imported)
VALUES ('onboard-demo', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'complete', 1, 1, 1, 1, 1, 1, 1);

-- Insert demo subscription
INSERT OR IGNORE INTO subscriptions (id, company_id, plan_id, plan_name, status, price_per_cycle, currency, current_period_start, current_period_end)
VALUES ('sub-demo', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'professional', 'Professional', 'active', 999, 'ZAR', '2025-01-01', '2025-01-31');
