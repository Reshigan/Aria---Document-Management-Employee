-- Migration 012: Schema Compatibility Fixes
-- This migration adds missing columns to pre-existing tables to ensure compatibility
-- with the new world-class SaaS services. All columns are nullable to support existing data.

-- ============================================
-- FIX audit_logs TABLE
-- ============================================
-- The new audit service expects additional columns that weren't in the original schema

-- Add event_type column (AUTH, DATA, SYSTEM, etc.)
ALTER TABLE audit_logs ADD COLUMN event_type TEXT DEFAULT 'SYSTEM';

-- Add old_values column for tracking changes
ALTER TABLE audit_logs ADD COLUMN old_values TEXT;

-- Add new_values column for tracking changes
ALTER TABLE audit_logs ADD COLUMN new_values TEXT;

-- Add correlation_id column for request tracing
ALTER TABLE audit_logs ADD COLUMN correlation_id TEXT;

-- Add metadata column for additional context
ALTER TABLE audit_logs ADD COLUMN metadata TEXT;

-- ============================================
-- FIX exchange_rates TABLE
-- ============================================
-- The multi-currency service uses effective_date, but the original table has rate_date

-- Add effective_date column (service will use this, rate_date kept for backward compatibility)
ALTER TABLE exchange_rates ADD COLUMN effective_date TEXT;

-- ============================================
-- FIX usage_records TABLE
-- ============================================
-- The subscription service uses metric and value, but the original table has metric_name and metric_value

-- Add metric column (service will use this, metric_name kept for backward compatibility)
ALTER TABLE usage_records ADD COLUMN metric TEXT;

-- Add value column (service will use this, metric_value kept for backward compatibility)
ALTER TABLE usage_records ADD COLUMN value INTEGER DEFAULT 0;

-- ============================================
-- FIX currency_revaluations TABLE
-- ============================================
-- The multi-currency service expects additional columns for revaluation tracking

-- Add period_end_date column
ALTER TABLE currency_revaluations ADD COLUMN period_end_date TEXT;

-- Add currency column (service uses this, currency_code kept for backward compatibility)
ALTER TABLE currency_revaluations ADD COLUMN currency TEXT;

-- Add account_type column (ar, ap, bank)
ALTER TABLE currency_revaluations ADD COLUMN account_type TEXT DEFAULT 'ar';

-- Add original_amount column
ALTER TABLE currency_revaluations ADD COLUMN original_amount REAL DEFAULT 0;

-- Add original_rate column
ALTER TABLE currency_revaluations ADD COLUMN original_rate REAL DEFAULT 1;

-- Add revalued_amount column
ALTER TABLE currency_revaluations ADD COLUMN revalued_amount REAL DEFAULT 0;

-- Add revaluation_rate column
ALTER TABLE currency_revaluations ADD COLUMN revaluation_rate REAL DEFAULT 1;

-- Add gain_loss column
ALTER TABLE currency_revaluations ADD COLUMN gain_loss REAL DEFAULT 0;

-- Add gl_entry_id column for linking to GL entries
ALTER TABLE currency_revaluations ADD COLUMN gl_entry_id TEXT;
