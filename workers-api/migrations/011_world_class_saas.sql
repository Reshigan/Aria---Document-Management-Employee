-- World-Class SaaS ERP Features Migration
-- Creates tables for: API Keys, Webhooks, Audit Logs, Subscriptions, Reports, Multi-Currency, Inventory Valuation, Three-Way Match

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('AUTH', 'PERMISSION', 'DATA', 'APPROVAL', 'DOCUMENT', 'BOT', 'API_KEY', 'WEBHOOK', 'SYSTEM', 'SECURITY')),
  resource_type TEXT,
  resource_id TEXT,
  action TEXT NOT NULL,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  correlation_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id);

-- ============================================
-- API KEYS
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT '["read"]',
  rate_limit INTEGER NOT NULL DEFAULT 100,
  expires_at TEXT,
  last_used_at TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  revoked_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE TABLE IF NOT EXISTS api_key_usage (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_company ON api_key_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created ON api_key_usage(created_at);

-- ============================================
-- WEBHOOKS
-- ============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhooks_company ON webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_attempt_at TEXT,
  next_retry_at TEXT,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_company ON webhook_deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at);

-- ============================================
-- SUBSCRIPTIONS & USAGE METERING
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly REAL NOT NULL,
  price_yearly REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  features TEXT NOT NULL DEFAULT '{}',
  limits TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'suspended', 'cancelled')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  trial_ends_at TEXT,
  cancelled_at TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('api_calls', 'storage_bytes', 'users', 'bot_runs', 'documents', 'transactions', 'webhooks', 'reports')),
  value INTEGER NOT NULL DEFAULT 0,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_records_company ON usage_records(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_metric ON usage_records(metric);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(period_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_records_unique ON usage_records(company_id, metric, period_start);

-- ============================================
-- REPORT BUILDER
-- ============================================
CREATE TABLE IF NOT EXISTS report_definitions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('sales', 'purchases', 'inventory', 'financial', 'hr', 'manufacturing', 'custom')),
  data_source TEXT NOT NULL,
  columns TEXT NOT NULL DEFAULT '[]',
  filters TEXT NOT NULL DEFAULT '[]',
  grouping TEXT NOT NULL DEFAULT '[]',
  sorting TEXT NOT NULL DEFAULT '[]',
  aggregations TEXT NOT NULL DEFAULT '[]',
  is_public INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_report_definitions_company ON report_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_type ON report_definitions(report_type);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'excel', 'pdf')),
  recipients TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  next_run_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES report_definitions(id)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_company ON scheduled_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);

-- ============================================
-- MULTI-CURRENCY
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  rate_type TEXT NOT NULL DEFAULT 'spot' CHECK (rate_type IN ('spot', 'average', 'closing')),
  effective_date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'bank')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_company ON exchange_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date);

CREATE TABLE IF NOT EXISTS currency_revaluations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period_end_date TEXT NOT NULL,
  currency TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ar', 'ap', 'bank')),
  original_amount REAL NOT NULL,
  original_rate REAL NOT NULL,
  revalued_amount REAL NOT NULL,
  revaluation_rate REAL NOT NULL,
  gain_loss REAL NOT NULL,
  gl_entry_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_currency_revaluations_company ON currency_revaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_currency_revaluations_period ON currency_revaluations(period_end_date);

-- ============================================
-- INVENTORY VALUATION
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_layers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  total_cost REAL NOT NULL,
  receipt_date TEXT NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('purchase', 'production', 'adjustment', 'opening')),
  reference_id TEXT,
  remaining_quantity REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_layers_company ON inventory_layers(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_layers_product ON inventory_layers(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_layers_warehouse ON inventory_layers(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_layers_remaining ON inventory_layers(remaining_quantity);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'issue', 'transfer', 'adjustment')),
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  total_cost REAL NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT,
  layers_consumed TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_company ON inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  quantity_change REAL NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_company ON inventory_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product ON inventory_adjustments(product_id);

-- ============================================
-- THREE-WAY MATCH
-- ============================================
CREATE TABLE IF NOT EXISTS company_settings (
  company_id TEXT PRIMARY KEY,
  matching_config TEXT,
  base_currency TEXT DEFAULT 'USD',
  fiscal_year_start TEXT DEFAULT '01-01',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_results (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  purchase_order_id TEXT NOT NULL,
  goods_receipt_id TEXT,
  supplier_invoice_id TEXT NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'pending' CHECK (match_status IN ('matched', 'partial', 'exception', 'pending')),
  match_type TEXT NOT NULL DEFAULT 'three_way' CHECK (match_type IN ('two_way', 'three_way')),
  po_amount REAL NOT NULL,
  grn_amount REAL,
  invoice_amount REAL NOT NULL,
  quantity_variance REAL NOT NULL DEFAULT 0,
  price_variance REAL NOT NULL DEFAULT 0,
  total_variance REAL NOT NULL DEFAULT 0,
  variance_percentage REAL NOT NULL DEFAULT 0,
  within_tolerance INTEGER NOT NULL DEFAULT 0,
  exception_reason TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_match_results_company ON match_results(company_id);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(match_status);
CREATE INDEX IF NOT EXISTS idx_match_results_po ON match_results(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_match_results_invoice ON match_results(supplier_invoice_id);

CREATE TABLE IF NOT EXISTS match_line_items (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  po_quantity REAL NOT NULL DEFAULT 0,
  po_unit_price REAL NOT NULL DEFAULT 0,
  grn_quantity REAL,
  invoice_quantity REAL NOT NULL DEFAULT 0,
  invoice_unit_price REAL NOT NULL DEFAULT 0,
  quantity_variance REAL NOT NULL DEFAULT 0,
  price_variance REAL NOT NULL DEFAULT 0,
  line_variance REAL NOT NULL DEFAULT 0,
  match_status TEXT NOT NULL DEFAULT 'matched' CHECK (match_status IN ('matched', 'exception')),
  FOREIGN KEY (match_id) REFERENCES match_results(id)
);

CREATE INDEX IF NOT EXISTS idx_match_line_items_match ON match_line_items(match_id);
CREATE INDEX IF NOT EXISTS idx_match_line_items_product ON match_line_items(product_id);

CREATE TABLE IF NOT EXISTS match_approvals (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'approved' CHECK (action IN ('approved', 'rejected')),
  comments TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (match_id) REFERENCES match_results(id)
);

CREATE INDEX IF NOT EXISTS idx_match_approvals_match ON match_approvals(match_id);

-- ============================================
-- ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add costing_method to products table if not exists
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- This will fail silently if column already exists

-- Add currency and exchange_rate to customer_invoices if not exists
-- Add currency and exchange_rate to supplier_invoices if not exists

-- ============================================
-- SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================
INSERT OR IGNORE INTO subscription_plans (id, name, code, description, price_monthly, price_yearly, currency, features, limits, is_active, sort_order)
VALUES 
  ('plan_starter', 'Starter', 'starter', 'Perfect for small businesses getting started', 49, 490, 'USD', 
   '{"modules":["o2c","p2p"],"bots_enabled":false,"api_access":false,"webhooks":false,"custom_reports":false,"multi_currency":false,"multi_warehouse":false,"audit_logs":false,"sso":false,"priority_support":false}',
   '{"users":3,"storage_gb":5,"api_calls_monthly":0,"bot_runs_monthly":0,"documents_monthly":100,"transactions_monthly":500}',
   1, 1),
  ('plan_professional', 'Professional', 'professional', 'For growing businesses with automation needs', 149, 1490, 'USD',
   '{"modules":["o2c","p2p","inventory","hr"],"bots_enabled":true,"api_access":true,"webhooks":true,"custom_reports":true,"multi_currency":false,"multi_warehouse":false,"audit_logs":true,"sso":false,"priority_support":false}',
   '{"users":10,"storage_gb":25,"api_calls_monthly":10000,"bot_runs_monthly":1000,"documents_monthly":500,"transactions_monthly":2500}',
   1, 2),
  ('plan_enterprise', 'Enterprise', 'enterprise', 'Full-featured ERP for larger organizations', 499, 4990, 'USD',
   '{"modules":["o2c","p2p","inventory","hr","manufacturing","bi","governance"],"bots_enabled":true,"api_access":true,"webhooks":true,"custom_reports":true,"multi_currency":true,"multi_warehouse":true,"audit_logs":true,"sso":true,"priority_support":true}',
   '{"users":-1,"storage_gb":100,"api_calls_monthly":100000,"bot_runs_monthly":10000,"documents_monthly":5000,"transactions_monthly":-1}',
   1, 3);
