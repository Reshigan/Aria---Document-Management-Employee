-- Migration 014: Critical Features for World-Class ERP
-- Encrypted token storage, bank feeds, tax/VAT, SSO, integrations, fixed assets, payroll, e-invoicing

-- ============================================
-- ENCRYPTED TOKEN STORAGE (Foundation for OAuth)
-- ============================================

CREATE TABLE IF NOT EXISTS secure_tokens (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'linkedin', 'facebook', 'quickbooks', 'xero', 'shopify', 'stripe', etc.
  token_type TEXT NOT NULL, -- 'access', 'refresh', 'api_key'
  encrypted_value TEXT NOT NULL, -- AES-256-GCM encrypted token
  encryption_iv TEXT NOT NULL, -- Initialization vector for decryption
  scopes TEXT, -- JSON array of granted scopes
  expires_at TEXT,
  refresh_token_id TEXT, -- Reference to refresh token if this is access token
  metadata TEXT, -- JSON for provider-specific data
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_secure_tokens_company ON secure_tokens(company_id, provider);
CREATE INDEX IF NOT EXISTS idx_secure_tokens_expires ON secure_tokens(expires_at);

-- ============================================
-- CONNECTOR/JOB FRAMEWORK
-- ============================================

CREATE TABLE IF NOT EXISTS integration_connectors (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  connector_type TEXT NOT NULL, -- 'bank', 'accounting', 'ecommerce', 'shipping', 'social', 'payment'
  provider TEXT NOT NULL, -- 'plaid', 'quickbooks', 'xero', 'shopify', 'fedex', 'linkedin', etc.
  name TEXT NOT NULL,
  config TEXT, -- JSON configuration
  credentials_token_id TEXT, -- Reference to secure_tokens
  status TEXT DEFAULT 'pending', -- 'pending', 'connected', 'error', 'disabled'
  last_sync_at TEXT,
  sync_frequency TEXT DEFAULT 'hourly', -- 'realtime', 'hourly', 'daily', 'manual'
  error_message TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (credentials_token_id) REFERENCES secure_tokens(id)
);

CREATE TABLE IF NOT EXISTS integration_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  connector_id TEXT,
  job_type TEXT NOT NULL, -- 'sync', 'export', 'import', 'post', 'webhook'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  priority INTEGER DEFAULT 5,
  payload TEXT, -- JSON job data
  result TEXT, -- JSON result data
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (connector_id) REFERENCES integration_connectors(id)
);

CREATE INDEX IF NOT EXISTS idx_integration_jobs_status ON integration_jobs(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_integration_jobs_company ON integration_jobs(company_id, job_type);

-- ============================================
-- BANK FEEDS & RECONCILIATION
-- ============================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  connector_id TEXT,
  account_name TEXT NOT NULL,
  account_number TEXT, -- Last 4 digits only for display
  account_type TEXT, -- 'checking', 'savings', 'credit', 'loan'
  currency TEXT DEFAULT 'USD',
  current_balance REAL DEFAULT 0,
  available_balance REAL,
  institution_name TEXT,
  institution_id TEXT,
  gl_account_id TEXT, -- Link to chart of accounts
  is_active INTEGER DEFAULT 1,
  last_sync_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  bank_account_id TEXT NOT NULL,
  external_id TEXT, -- ID from bank/provider
  transaction_date TEXT NOT NULL,
  post_date TEXT,
  description TEXT,
  amount REAL NOT NULL,
  transaction_type TEXT, -- 'debit', 'credit'
  category TEXT,
  merchant_name TEXT,
  pending INTEGER DEFAULT 0,
  reconciliation_status TEXT DEFAULT 'unmatched', -- 'unmatched', 'matched', 'reconciled', 'excluded'
  matched_transaction_id TEXT, -- Link to AR/AP payment or journal entry
  matched_transaction_type TEXT, -- 'payment', 'receipt', 'journal', 'invoice'
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  reconciled_at TEXT,
  reconciled_by TEXT,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(reconciliation_status);

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
  difference REAL DEFAULT 0,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'approved'
  completed_at TEXT,
  completed_by TEXT,
  approved_at TEXT,
  approved_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- TAX/VAT HANDLING
-- ============================================

CREATE TABLE IF NOT EXISTS tax_rates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- 'VAT_STANDARD', 'VAT_REDUCED', 'GST', 'SALES_TAX', etc.
  rate REAL NOT NULL, -- Percentage (e.g., 15 for 15%)
  tax_type TEXT NOT NULL, -- 'vat', 'gst', 'sales_tax', 'withholding'
  country TEXT NOT NULL,
  region TEXT, -- State/province for regional taxes
  is_compound INTEGER DEFAULT 0, -- Tax on tax
  is_inclusive INTEGER DEFAULT 0, -- Price includes tax
  applies_to TEXT DEFAULT 'all', -- 'all', 'goods', 'services'
  effective_from TEXT,
  effective_to TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tax_exemptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'customer', 'supplier', 'product'
  entity_id TEXT NOT NULL,
  tax_rate_id TEXT,
  exemption_type TEXT NOT NULL, -- 'full', 'partial', 'zero_rated', 'exempt'
  exemption_reason TEXT,
  certificate_number TEXT,
  valid_from TEXT,
  valid_to TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id)
);

CREATE TABLE IF NOT EXISTS tax_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  return_type TEXT NOT NULL, -- 'vat', 'gst', 'sales_tax', 'withholding'
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'calculated', 'filed', 'paid'
  total_sales REAL DEFAULT 0,
  total_purchases REAL DEFAULT 0,
  output_tax REAL DEFAULT 0, -- Tax collected
  input_tax REAL DEFAULT 0, -- Tax paid
  net_tax REAL DEFAULT 0, -- Amount due/refund
  adjustments REAL DEFAULT 0,
  penalties REAL DEFAULT 0,
  filed_at TEXT,
  filed_reference TEXT,
  paid_at TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SSO / OIDC AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS sso_providers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- 'oidc', 'saml', 'google', 'microsoft', 'okta'
  name TEXT NOT NULL,
  client_id TEXT,
  client_secret_token_id TEXT, -- Reference to secure_tokens
  issuer_url TEXT,
  authorization_url TEXT,
  token_url TEXT,
  userinfo_url TEXT,
  jwks_url TEXT,
  scopes TEXT DEFAULT 'openid profile email',
  domain_restriction TEXT, -- Allowed email domains (JSON array)
  auto_provision_users INTEGER DEFAULT 0,
  default_role TEXT DEFAULT 'user',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sso_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  external_user_id TEXT, -- User ID from SSO provider
  state TEXT, -- OAuth state parameter
  nonce TEXT, -- OIDC nonce
  id_token TEXT,
  access_token_id TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES sso_providers(id)
);

-- ============================================
-- ACCOUNTING EXPORTS (QuickBooks/Xero)
-- ============================================

CREATE TABLE IF NOT EXISTS accounting_sync_mappings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  local_entity_type TEXT NOT NULL, -- 'customer', 'supplier', 'product', 'invoice', 'payment', 'account'
  local_entity_id TEXT NOT NULL,
  remote_entity_type TEXT NOT NULL,
  remote_entity_id TEXT NOT NULL,
  sync_direction TEXT DEFAULT 'bidirectional', -- 'push', 'pull', 'bidirectional'
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'error', 'conflict'
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (connector_id) REFERENCES integration_connectors(id)
);

CREATE TABLE IF NOT EXISTS accounting_sync_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'entity'
  direction TEXT NOT NULL, -- 'push', 'pull'
  entities_processed INTEGER DEFAULT 0,
  entities_created INTEGER DEFAULT 0,
  entities_updated INTEGER DEFAULT 0,
  entities_failed INTEGER DEFAULT 0,
  error_details TEXT, -- JSON array of errors
  started_at TEXT,
  completed_at TEXT,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- E-COMMERCE CONNECTORS (Shopify/WooCommerce)
-- ============================================

CREATE TABLE IF NOT EXISTS ecommerce_stores (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'shopify', 'woocommerce', 'magento', 'bigcommerce'
  store_name TEXT NOT NULL,
  store_url TEXT,
  store_id TEXT, -- Platform-specific store ID
  default_warehouse_id TEXT,
  default_price_list_id TEXT,
  sync_products INTEGER DEFAULT 1,
  sync_orders INTEGER DEFAULT 1,
  sync_customers INTEGER DEFAULT 1,
  sync_inventory INTEGER DEFAULT 1,
  order_prefix TEXT, -- Prefix for imported orders
  last_order_sync_at TEXT,
  last_product_sync_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (connector_id) REFERENCES integration_connectors(id)
);

CREATE TABLE IF NOT EXISTS ecommerce_order_mappings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  ecommerce_order_id TEXT NOT NULL,
  ecommerce_order_number TEXT,
  sales_order_id TEXT,
  invoice_id TEXT,
  fulfillment_status TEXT, -- 'pending', 'partial', 'fulfilled', 'cancelled'
  payment_status TEXT, -- 'pending', 'paid', 'refunded', 'partial_refund'
  sync_status TEXT DEFAULT 'synced',
  last_synced_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES ecommerce_stores(id)
);

-- ============================================
-- SHIPPING CARRIERS
-- ============================================

CREATE TABLE IF NOT EXISTS shipping_carriers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  connector_id TEXT,
  carrier_code TEXT NOT NULL, -- 'fedex', 'ups', 'dhl', 'usps', 'shippo', 'easypost'
  carrier_name TEXT NOT NULL,
  account_number TEXT,
  is_aggregator INTEGER DEFAULT 0, -- True for Shippo/EasyPost
  supported_services TEXT, -- JSON array of service codes
  default_service TEXT,
  markup_type TEXT DEFAULT 'none', -- 'none', 'percentage', 'fixed'
  markup_value REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  carrier_id TEXT NOT NULL,
  quote_id TEXT, -- External quote ID
  service_code TEXT NOT NULL,
  service_name TEXT,
  origin_postal TEXT,
  destination_postal TEXT,
  destination_country TEXT,
  weight REAL,
  weight_unit TEXT DEFAULT 'lb',
  dimensions TEXT, -- JSON {length, width, height}
  rate REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  estimated_days INTEGER,
  valid_until TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(id)
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  carrier_id TEXT NOT NULL,
  sales_order_id TEXT,
  delivery_note_id TEXT,
  tracking_number TEXT,
  carrier_tracking_url TEXT,
  service_code TEXT,
  label_url TEXT,
  label_format TEXT DEFAULT 'pdf',
  ship_date TEXT,
  estimated_delivery TEXT,
  actual_delivery TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'label_created', 'in_transit', 'delivered', 'exception', 'returned'
  shipping_cost REAL,
  insurance_cost REAL,
  weight REAL,
  dimensions TEXT,
  from_address TEXT, -- JSON
  to_address TEXT, -- JSON
  packages TEXT, -- JSON array of package details
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(id)
);

-- ============================================
-- MONITORING & ALERTING
-- ============================================

CREATE TABLE IF NOT EXISTS system_alerts (
  id TEXT PRIMARY KEY,
  company_id TEXT, -- NULL for system-wide alerts
  alert_type TEXT NOT NULL, -- 'error', 'warning', 'info', 'critical'
  category TEXT NOT NULL, -- 'job_failure', 'sync_error', 'security', 'performance', 'threshold'
  title TEXT NOT NULL,
  message TEXT,
  source TEXT, -- 'bot', 'webhook', 'sync', 'api', 'scheduled'
  source_id TEXT,
  metadata TEXT, -- JSON additional context
  status TEXT DEFAULT 'new', -- 'new', 'acknowledged', 'resolved', 'ignored'
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status, created_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_company ON system_alerts(company_id, category);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  condition_type TEXT NOT NULL, -- 'threshold', 'pattern', 'absence', 'rate'
  condition_config TEXT NOT NULL, -- JSON condition parameters
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
  notification_channels TEXT, -- JSON array: ['email', 'webhook', 'slack']
  notification_config TEXT, -- JSON with channel-specific config
  cooldown_minutes INTEGER DEFAULT 60,
  is_active INTEGER DEFAULT 1,
  last_triggered_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- ADMIN TOOLING
-- ============================================

CREATE TABLE IF NOT EXISTS admin_impersonation_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_company_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  actions_performed TEXT, -- JSON array of actions
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'bug', 'feature', 'question', 'billing', 'integration'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'waiting', 'resolved', 'closed'
  assigned_to TEXT,
  resolution TEXT,
  first_response_at TEXT,
  resolved_at TEXT,
  satisfaction_rating INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- FIXED ASSETS & DEPRECIATION
-- ============================================

CREATE TABLE IF NOT EXISTS asset_categories (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  depreciation_method TEXT DEFAULT 'straight_line', -- 'straight_line', 'declining_balance', 'units_of_production', 'sum_of_years'
  useful_life_years INTEGER,
  salvage_value_percent REAL DEFAULT 0,
  asset_account_id TEXT, -- GL account for asset
  depreciation_account_id TEXT, -- GL account for depreciation expense
  accumulated_depreciation_account_id TEXT, -- GL account for accumulated depreciation
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  asset_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  serial_number TEXT,
  location TEXT,
  custodian TEXT,
  purchase_date TEXT NOT NULL,
  in_service_date TEXT,
  purchase_cost REAL NOT NULL,
  salvage_value REAL DEFAULT 0,
  useful_life_months INTEGER,
  depreciation_method TEXT,
  current_value REAL,
  accumulated_depreciation REAL DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'disposed', 'fully_depreciated', 'impaired'
  disposal_date TEXT,
  disposal_amount REAL,
  disposal_method TEXT, -- 'sale', 'scrap', 'donation', 'trade_in'
  warranty_expiry TEXT,
  insurance_policy TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES asset_categories(id)
);

CREATE TABLE IF NOT EXISTS asset_depreciation_schedule (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  depreciation_amount REAL NOT NULL,
  accumulated_depreciation REAL NOT NULL,
  book_value REAL NOT NULL,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'posted', 'adjusted'
  journal_entry_id TEXT,
  posted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES fixed_assets(id)
);

-- ============================================
-- E-INVOICING
-- ============================================

CREATE TABLE IF NOT EXISTS einvoice_configs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  country TEXT NOT NULL,
  scheme TEXT NOT NULL, -- 'peppol', 'facturae', 'fatturaPA', 'ubl', 'cii', 'zatca', 'gstn'
  sender_id TEXT, -- Peppol ID, VAT number, etc.
  endpoint_id TEXT,
  certificate_token_id TEXT, -- Reference to secure_tokens for signing cert
  access_point_url TEXT,
  test_mode INTEGER DEFAULT 1,
  auto_send INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS einvoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  config_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL, -- Reference to invoices table
  direction TEXT NOT NULL, -- 'outbound', 'inbound'
  document_type TEXT NOT NULL, -- 'invoice', 'credit_note', 'debit_note'
  xml_content TEXT, -- Generated XML
  hash TEXT, -- Document hash for integrity
  signature TEXT, -- Digital signature
  status TEXT DEFAULT 'pending', -- 'pending', 'validated', 'sent', 'delivered', 'accepted', 'rejected', 'failed'
  recipient_id TEXT, -- Peppol ID or similar
  transmission_id TEXT, -- ID from access point
  response_code TEXT,
  response_message TEXT,
  sent_at TEXT,
  delivered_at TEXT,
  response_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (config_id) REFERENCES einvoice_configs(id)
);

-- ============================================
-- PAYROLL & HR STATUTORY REPORTING
-- ============================================

CREATE TABLE IF NOT EXISTS payroll_configs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  country TEXT NOT NULL,
  pay_frequency TEXT DEFAULT 'monthly', -- 'weekly', 'biweekly', 'semimonthly', 'monthly'
  pay_day INTEGER, -- Day of month/week
  tax_year_start TEXT, -- Month-day (e.g., '04-01' for April)
  currency TEXT DEFAULT 'USD',
  overtime_multiplier REAL DEFAULT 1.5,
  statutory_deductions TEXT, -- JSON array of required deductions
  employer_contributions TEXT, -- JSON array of employer contributions
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employee_payroll (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  pay_type TEXT DEFAULT 'salary', -- 'salary', 'hourly', 'commission'
  base_salary REAL,
  hourly_rate REAL,
  pay_frequency TEXT,
  bank_account_name TEXT,
  bank_account_number_encrypted TEXT,
  bank_routing_number TEXT,
  tax_id_encrypted TEXT, -- SSN, NI number, etc.
  tax_filing_status TEXT,
  allowances INTEGER DEFAULT 0,
  additional_withholding REAL DEFAULT 0,
  deductions TEXT, -- JSON array of voluntary deductions
  benefits TEXT, -- JSON array of benefits
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  config_id TEXT NOT NULL,
  pay_period_start TEXT NOT NULL,
  pay_period_end TEXT NOT NULL,
  pay_date TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'calculated', 'approved', 'paid', 'cancelled'
  total_gross REAL DEFAULT 0,
  total_deductions REAL DEFAULT 0,
  total_employer_cost REAL DEFAULT 0,
  total_net REAL DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  paid_at TEXT,
  journal_entry_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (config_id) REFERENCES payroll_configs(id)
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  payroll_run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_payroll_id TEXT NOT NULL,
  regular_hours REAL DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  gross_pay REAL NOT NULL,
  deductions TEXT, -- JSON breakdown
  employer_contributions TEXT, -- JSON breakdown
  net_pay REAL NOT NULL,
  payment_method TEXT DEFAULT 'direct_deposit',
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  payment_reference TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id),
  FOREIGN KEY (employee_payroll_id) REFERENCES employee_payroll(id)
);

CREATE TABLE IF NOT EXISTS statutory_filings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  filing_type TEXT NOT NULL, -- 'p45', 'p60', 'w2', 'w3', '941', 'p11d', etc.
  country TEXT NOT NULL,
  tax_year TEXT NOT NULL,
  period TEXT, -- Quarter, month, etc.
  due_date TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'generated', 'filed', 'accepted', 'rejected'
  file_content TEXT, -- Generated file content or path
  submission_reference TEXT,
  submitted_at TEXT,
  response_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- MRP / DEMAND PLANNING
-- ============================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  forecast_date TEXT NOT NULL,
  forecast_quantity REAL NOT NULL,
  forecast_method TEXT, -- 'manual', 'moving_average', 'exponential_smoothing', 'seasonal'
  confidence_level REAL,
  actual_quantity REAL,
  variance REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reorder_rules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  min_quantity REAL NOT NULL, -- Reorder point
  max_quantity REAL, -- Maximum stock level
  reorder_quantity REAL NOT NULL, -- Quantity to order
  lead_time_days INTEGER DEFAULT 0,
  safety_stock REAL DEFAULT 0,
  preferred_supplier_id TEXT,
  is_active INTEGER DEFAULT 1,
  last_triggered_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mrp_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  run_date TEXT NOT NULL,
  planning_horizon_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  products_analyzed INTEGER DEFAULT 0,
  purchase_suggestions INTEGER DEFAULT 0,
  production_suggestions INTEGER DEFAULT 0,
  transfer_suggestions INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mrp_suggestions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  mrp_run_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL, -- 'purchase', 'production', 'transfer'
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  suggested_quantity REAL NOT NULL,
  required_date TEXT NOT NULL,
  supplier_id TEXT,
  estimated_cost REAL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'converted'
  converted_to_type TEXT, -- 'purchase_order', 'work_order', 'transfer'
  converted_to_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (mrp_run_id) REFERENCES mrp_runs(id)
);

-- ============================================
-- BACKUP/RESTORE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS backup_jobs (
  id TEXT PRIMARY KEY,
  backup_type TEXT NOT NULL, -- 'full', 'incremental', 'tables'
  tables_included TEXT, -- JSON array or 'all'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  file_path TEXT,
  file_size_bytes INTEGER,
  record_count INTEGER,
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  retention_days INTEGER DEFAULT 30,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SEED DATA
-- ============================================

-- Default tax rates for common countries
INSERT INTO tax_rates (id, company_id, name, code, rate, tax_type, country, is_active) VALUES
('tax_za_vat', 'system', 'South Africa VAT', 'ZA_VAT', 15, 'vat', 'ZA', 1),
('tax_uk_vat_std', 'system', 'UK VAT Standard', 'UK_VAT_STD', 20, 'vat', 'GB', 1),
('tax_uk_vat_red', 'system', 'UK VAT Reduced', 'UK_VAT_RED', 5, 'vat', 'GB', 1),
('tax_us_none', 'system', 'US No Federal Sales Tax', 'US_NONE', 0, 'sales_tax', 'US', 1),
('tax_eu_vat_std', 'system', 'EU VAT Standard', 'EU_VAT_STD', 21, 'vat', 'EU', 1),
('tax_in_gst', 'system', 'India GST', 'IN_GST', 18, 'gst', 'IN', 1),
('tax_ae_vat', 'system', 'UAE VAT', 'AE_VAT', 5, 'vat', 'AE', 1),
('tax_ng_vat', 'system', 'Nigeria VAT', 'NG_VAT', 7.5, 'vat', 'NG', 1),
('tax_ke_vat', 'system', 'Kenya VAT', 'KE_VAT', 16, 'vat', 'KE', 1),
('tax_gh_vat', 'system', 'Ghana VAT', 'GH_VAT', 15, 'vat', 'GH', 1);

-- Default asset categories
INSERT INTO asset_categories (id, company_id, name, code, depreciation_method, useful_life_years, salvage_value_percent) VALUES
('cat_buildings', 'system', 'Buildings', 'BLDG', 'straight_line', 40, 10),
('cat_vehicles', 'system', 'Vehicles', 'VEH', 'declining_balance', 5, 15),
('cat_equipment', 'system', 'Equipment', 'EQUIP', 'straight_line', 7, 5),
('cat_furniture', 'system', 'Furniture & Fixtures', 'FURN', 'straight_line', 10, 0),
('cat_computers', 'system', 'Computer Equipment', 'COMP', 'straight_line', 3, 0),
('cat_software', 'system', 'Software', 'SOFT', 'straight_line', 3, 0),
('cat_intangible', 'system', 'Intangible Assets', 'INTANG', 'straight_line', 10, 0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_country ON tax_rates(country, is_active);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_mrp_suggestions_status ON mrp_suggestions(status, required_date);
