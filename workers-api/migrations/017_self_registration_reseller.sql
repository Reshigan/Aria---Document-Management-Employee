-- Self-Registration and Reseller System Migration
-- Adds tables for: subscription plans, Stripe integration, resellers, commissions, payouts

-- =====================================================
-- SUBSCRIPTION PLANS (with new market-leading pricing)
-- =====================================================

-- Drop and recreate subscription_plans with proper structure
DROP TABLE IF EXISTS subscription_plans;
CREATE TABLE subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    price_monthly REAL NOT NULL,
    price_yearly REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    features TEXT NOT NULL DEFAULT '{}',  -- JSON: modules, bots_enabled, api_access, etc.
    limits TEXT NOT NULL DEFAULT '{}',    -- JSON: users, storage_gb, bot_runs_monthly, etc.
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert market-leading pricing plans
INSERT INTO subscription_plans (id, name, code, description, price_monthly, price_yearly, currency, features, limits, sort_order) VALUES
(
    'plan_starter',
    'Starter',
    'starter',
    'Perfect for micro businesses and freelancers getting started with ERP',
    29.00,
    290.00,
    'USD',
    '{"modules":["o2c","p2p","inventory","accounting"],"bots_enabled":true,"api_access":false,"webhooks":false,"custom_reports":false,"multi_currency":false,"multi_warehouse":false,"audit_logs":false,"sso":false,"priority_support":false}',
    '{"users":3,"storage_gb":5,"api_calls_monthly":0,"bot_runs_monthly":50,"documents_monthly":100,"transactions_monthly":500}',
    1
),
(
    'plan_growth',
    'Growth',
    'growth',
    'For growing SMBs with automation needs',
    79.00,
    790.00,
    'USD',
    '{"modules":["o2c","p2p","inventory","accounting","hr","manufacturing","crm"],"bots_enabled":true,"api_access":true,"webhooks":true,"custom_reports":true,"multi_currency":false,"multi_warehouse":false,"audit_logs":true,"sso":false,"priority_support":false}',
    '{"users":10,"storage_gb":25,"api_calls_monthly":10000,"bot_runs_monthly":500,"documents_monthly":500,"transactions_monthly":2500}',
    2
),
(
    'plan_scale',
    'Scale',
    'scale',
    'For established businesses needing full ERP capabilities',
    199.00,
    1990.00,
    'USD',
    '{"modules":["o2c","p2p","inventory","accounting","hr","manufacturing","crm","bi","governance","helpdesk","field_service"],"bots_enabled":true,"api_access":true,"webhooks":true,"custom_reports":true,"multi_currency":true,"multi_warehouse":true,"audit_logs":true,"sso":true,"priority_support":true}',
    '{"users":25,"storage_gb":100,"api_calls_monthly":100000,"bot_runs_monthly":2500,"documents_monthly":5000,"transactions_monthly":-1}',
    3
),
(
    'plan_enterprise',
    'Enterprise',
    'enterprise',
    'Custom solution for large organizations with dedicated support',
    0.00,
    0.00,
    'USD',
    '{"modules":["o2c","p2p","inventory","accounting","hr","manufacturing","crm","bi","governance","helpdesk","field_service","all"],"bots_enabled":true,"api_access":true,"webhooks":true,"custom_reports":true,"multi_currency":true,"multi_warehouse":true,"audit_logs":true,"sso":true,"priority_support":true}',
    '{"users":-1,"storage_gb":-1,"api_calls_monthly":-1,"bot_runs_monthly":-1,"documents_monthly":-1,"transactions_monthly":-1}',
    4
);

-- =====================================================
-- STRIPE CUSTOMERS (link companies to Stripe)
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_customers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    email TEXT,
    name TEXT,
    metadata TEXT DEFAULT '{}',  -- JSON for additional data
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_company ON stripe_customers(company_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe ON stripe_customers(stripe_customer_id);

-- =====================================================
-- SUBSCRIPTIONS (enhanced with Stripe fields)
-- =====================================================

-- Add reseller_id to companies if not exists
ALTER TABLE companies ADD COLUMN reseller_id TEXT REFERENCES resellers(id);

-- Ensure subscriptions table has all needed fields
DROP TABLE IF EXISTS subscriptions_new;
CREATE TABLE subscriptions_new (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, trial, active, past_due, suspended, cancelled
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',  -- monthly, yearly
    current_period_start TEXT,
    current_period_end TEXT,
    trial_ends_at TEXT,
    cancelled_at TEXT,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    referral_code TEXT,  -- Track which reseller referred this subscription
    reseller_id TEXT,    -- Direct link to reseller
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- Migrate existing data if subscriptions table exists
INSERT OR IGNORE INTO subscriptions_new (id, company_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at, cancelled_at, stripe_subscription_id, stripe_customer_id, created_at, updated_at)
SELECT id, company_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at, cancelled_at, stripe_subscription_id, stripe_customer_id, created_at, updated_at
FROM subscriptions WHERE EXISTS (SELECT 1 FROM subscriptions LIMIT 1);

DROP TABLE IF EXISTS subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reseller ON subscriptions(reseller_id);

-- =====================================================
-- RESELLERS
-- =====================================================

CREATE TABLE IF NOT EXISTS resellers (
    id TEXT PRIMARY KEY,
    user_id TEXT,  -- Optional link to a user account
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tax_number TEXT,  -- VAT/Tax registration number
    bank_name TEXT,
    bank_account_number TEXT,
    bank_routing_number TEXT,
    bank_swift_code TEXT,
    commission_rate REAL NOT NULL DEFAULT 0.15,  -- 15% default
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, active, suspended, terminated
    approved_at TEXT,
    approved_by TEXT,
    notes TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_resellers_email ON resellers(email);
CREATE INDEX IF NOT EXISTS idx_resellers_status ON resellers(status);

-- =====================================================
-- RESELLER APPLICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS reseller_applications (
    id TEXT PRIMARY KEY,
    reseller_id TEXT,  -- Set when application is approved and reseller created
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tax_number TEXT,
    website TEXT,
    business_description TEXT,
    target_market TEXT,
    expected_monthly_referrals INTEGER,
    status TEXT NOT NULL DEFAULT 'submitted',  -- submitted, under_review, approved, rejected
    rejection_reason TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    terms_accepted INTEGER NOT NULL DEFAULT 0,
    terms_accepted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (reseller_id) REFERENCES resellers(id)
);

CREATE INDEX IF NOT EXISTS idx_reseller_applications_email ON reseller_applications(email);
CREATE INDEX IF NOT EXISTS idx_reseller_applications_status ON reseller_applications(status);

-- =====================================================
-- RESELLER DOCUMENTS (stored in R2)
-- =====================================================

CREATE TABLE IF NOT EXISTS reseller_documents (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    reseller_id TEXT,
    document_type TEXT NOT NULL,  -- business_registration, tax_certificate, bank_proof, id_document, address_proof, signed_agreement
    file_name TEXT NOT NULL,
    r2_key TEXT NOT NULL,  -- R2 object key
    file_size INTEGER,
    mime_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, verified, rejected
    verified_by TEXT,
    verified_at TEXT,
    rejection_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES reseller_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (reseller_id) REFERENCES resellers(id)
);

CREATE INDEX IF NOT EXISTS idx_reseller_documents_application ON reseller_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_reseller_documents_reseller ON reseller_documents(reseller_id);

-- =====================================================
-- REFERRAL CODES
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_codes (
    id TEXT PRIMARY KEY,
    reseller_id TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,  -- e.g., "PARTNER123"
    description TEXT,
    discount_percent REAL DEFAULT 0,  -- Optional discount for referred customers
    is_active INTEGER NOT NULL DEFAULT 1,
    usage_count INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER,  -- NULL = unlimited
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_reseller ON referral_codes(reseller_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- =====================================================
-- COMMISSION LEDGER
-- =====================================================

CREATE TABLE IF NOT EXISTS commission_ledger (
    id TEXT PRIMARY KEY,
    reseller_id TEXT NOT NULL,
    company_id TEXT NOT NULL,  -- The referred company
    subscription_id TEXT,
    stripe_invoice_id TEXT,
    stripe_event_id TEXT UNIQUE,  -- For idempotency
    period_start TEXT,
    period_end TEXT,
    gross_amount REAL NOT NULL,  -- Invoice amount before tax
    tax_amount REAL DEFAULT 0,
    net_amount REAL NOT NULL,  -- Amount after tax
    commission_rate REAL NOT NULL,  -- Rate at time of calculation (e.g., 0.15)
    commission_amount REAL NOT NULL,  -- Actual commission earned
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'accrued',  -- accrued, approved, paid, void, refunded
    payout_id TEXT,  -- Set when included in a payout
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (reseller_id) REFERENCES resellers(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_reseller ON commission_ledger(reseller_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_company ON commission_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_status ON commission_ledger(status);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_payout ON commission_ledger(payout_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_stripe_event ON commission_ledger(stripe_event_id);

-- =====================================================
-- PAYOUTS
-- =====================================================

CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    reseller_id TEXT NOT NULL,
    payout_number TEXT NOT NULL UNIQUE,  -- e.g., "PAY-2024-001"
    total_amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    commission_count INTEGER NOT NULL,  -- Number of commission entries included
    period_start TEXT,  -- Earliest commission date
    period_end TEXT,    -- Latest commission date
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, processing, paid, failed, cancelled
    payment_method TEXT,  -- bank_transfer, paypal, stripe_connect, manual
    payment_reference TEXT,  -- Bank reference, PayPal transaction ID, etc.
    payment_proof_r2_key TEXT,  -- R2 key for payment proof document
    approved_by TEXT,
    approved_at TEXT,
    paid_by TEXT,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (reseller_id) REFERENCES resellers(id)
);

CREATE INDEX IF NOT EXISTS idx_payouts_reseller ON payouts(reseller_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- =====================================================
-- PAYOUT ITEMS (links payouts to commission entries)
-- =====================================================

CREATE TABLE IF NOT EXISTS payout_items (
    id TEXT PRIMARY KEY,
    payout_id TEXT NOT NULL,
    commission_id TEXT NOT NULL UNIQUE,  -- Each commission can only be in one payout
    amount REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE,
    FOREIGN KEY (commission_id) REFERENCES commission_ledger(id)
);

CREATE INDEX IF NOT EXISTS idx_payout_items_payout ON payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_commission ON payout_items(commission_id);

-- =====================================================
-- WEBHOOK EVENTS (for idempotency)
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id TEXT PRIMARY KEY,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload TEXT,  -- JSON payload
    processing_status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON stripe_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON stripe_webhook_events(event_type);

-- =====================================================
-- PROMO CODES (for launch offers)
-- =====================================================

CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percent',  -- percent, fixed
    discount_value REAL NOT NULL,  -- e.g., 50 for 50% or 50 for $50
    duration_months INTEGER,  -- How many months the discount applies
    stripe_coupon_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    usage_count INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER,
    valid_from TEXT,
    valid_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- Insert launch promo code (50% off first 3 months)
INSERT INTO promo_codes (id, code, description, discount_type, discount_value, duration_months, is_active) VALUES
('promo_launch50', 'LAUNCH50', '50% off your first 3 months - Launch Special', 'percent', 50, 3, 1);

-- =====================================================
-- PENDING REGISTRATIONS (before payment)
-- =====================================================

CREATE TABLE IF NOT EXISTS pending_registrations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT,
    country TEXT,
    plan_id TEXT NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    referral_code TEXT,
    promo_code TEXT,
    stripe_checkout_session_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, expired, cancelled
    expires_at TEXT,
    completed_at TEXT,
    company_id TEXT,  -- Set when registration completes
    user_id TEXT,     -- Set when registration completes
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_session ON pending_registrations(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status ON pending_registrations(status);
