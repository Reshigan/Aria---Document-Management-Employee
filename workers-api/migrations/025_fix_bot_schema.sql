-- Migration 025: Fix all DB schema mismatches between bot-executor.ts and actual tables
-- Adds only columns confirmed missing from production D1 (verified via PRAGMA table_info)

-- ============================================
-- 1. purchase_orders: bot uses 'order_date', table has 'po_date'
-- ============================================
ALTER TABLE purchase_orders ADD COLUMN order_date TEXT;
UPDATE purchase_orders SET order_date = po_date WHERE po_date IS NOT NULL;

-- ============================================
-- 2. tasks: bot uses 'updated_at' and 'priority'
-- ============================================
ALTER TABLE tasks ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium';

-- ============================================
-- 3. production_runs: bot uses 'actual_quantity', 'status', 'planned_quantity'
--    (start_time/end_time already exist in production)
-- ============================================
ALTER TABLE production_runs ADD COLUMN actual_quantity REAL DEFAULT 0;
ALTER TABLE production_runs ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE production_runs ADD COLUMN planned_quantity REAL DEFAULT 0;

-- ============================================
-- 4. quality_checks: bot inserts with production_run_id, work_order_id, checked_by, checked_at
-- ============================================
ALTER TABLE quality_checks ADD COLUMN production_run_id TEXT;
ALTER TABLE quality_checks ADD COLUMN work_order_id TEXT;
ALTER TABLE quality_checks ADD COLUMN checked_by TEXT;
ALTER TABLE quality_checks ADD COLUMN checked_at TEXT;

-- ============================================
-- 5. stock_movements: bot uses 'status' and 'completed_at'
-- ============================================
ALTER TABLE stock_movements ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE stock_movements ADD COLUMN completed_at TEXT;

-- ============================================
-- 6. stock_levels: bot uses 'quantity' (table has quantity_on_hand)
-- ============================================
ALTER TABLE stock_levels ADD COLUMN quantity REAL DEFAULT 0;
UPDATE stock_levels SET quantity = quantity_on_hand WHERE quantity_on_hand IS NOT NULL;

-- ============================================
-- 7. payroll_runs: bot uses payroll_number, pay_period_start, pay_period_end, processed_by
--    (total_gross, total_deductions, total_net, employee_count already exist)
-- ============================================
ALTER TABLE payroll_runs ADD COLUMN payroll_number TEXT;
ALTER TABLE payroll_runs ADD COLUMN pay_period_start TEXT;
ALTER TABLE payroll_runs ADD COLUMN pay_period_end TEXT;
ALTER TABLE payroll_runs ADD COLUMN processed_by TEXT;

-- ============================================
-- 8. employees: bot uses 'salary' (table has basic_salary) and 'status' (table has is_active)
-- ============================================
ALTER TABLE employees ADD COLUMN salary REAL DEFAULT 0;
ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'active';
UPDATE employees SET salary = basic_salary WHERE basic_salary IS NOT NULL;
UPDATE employees SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END WHERE is_active IS NOT NULL;

-- ============================================
-- 9. bank_transactions: bot uses 'reconciled' (has is_reconciled) and 'amount'
--    Note: amount may exist from migration 014 in production but not in fresh builds
--    since migration 005 creates the table first (without amount) and 014's
--    CREATE TABLE IF NOT EXISTS is a no-op.
-- ============================================
ALTER TABLE bank_transactions ADD COLUMN reconciled INTEGER DEFAULT 0;
ALTER TABLE bank_transactions ADD COLUMN amount REAL;
UPDATE bank_transactions SET reconciled = is_reconciled WHERE is_reconciled IS NOT NULL;
UPDATE bank_transactions SET amount = COALESCE(credit_amount, 0) - COALESCE(debit_amount, 0) WHERE amount IS NULL AND (debit_amount IS NOT NULL OR credit_amount IS NOT NULL);

-- ============================================
-- 10. leads: bot uses 'lead_name' (table has contact_name) and 'score'
-- ============================================
ALTER TABLE leads ADD COLUMN lead_name TEXT;
ALTER TABLE leads ADD COLUMN score INTEGER;
UPDATE leads SET lead_name = contact_name WHERE contact_name IS NOT NULL;

-- ============================================
-- 11. supplier_invoices: bot uses 'approved_by' and 'approved_at'
-- ============================================
ALTER TABLE supplier_invoices ADD COLUMN approved_by TEXT;
ALTER TABLE supplier_invoices ADD COLUMN approved_at TEXT;

-- ============================================
-- 12. financial_periods: bot uses 'period' column and ON CONFLICT(company_id, period)
-- ============================================
ALTER TABLE financial_periods ADD COLUMN period TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_periods_company_period ON financial_periods(company_id, period);

-- ============================================
-- 13. journal_entries: bot uses 'debit_amount' and 'credit_amount' (table has total_debit, total_credit)
-- ============================================
ALTER TABLE journal_entries ADD COLUMN debit_amount REAL DEFAULT 0;
ALTER TABLE journal_entries ADD COLUMN credit_amount REAL DEFAULT 0;
UPDATE journal_entries SET debit_amount = total_debit, credit_amount = total_credit WHERE total_debit IS NOT NULL;

-- ============================================
-- 14. bank_accounts: bot uses 'balance' (table has current_balance)
-- ============================================
ALTER TABLE bank_accounts ADD COLUMN balance REAL DEFAULT 0;
UPDATE bank_accounts SET balance = current_balance WHERE current_balance IS NOT NULL;

-- ============================================
-- 15. expense_claims: bot uses 'amount' and 'category'
--    (approved_by, approved_at already exist from migration 018)
-- ============================================
ALTER TABLE expense_claims ADD COLUMN amount REAL DEFAULT 0;
ALTER TABLE expense_claims ADD COLUMN category TEXT;
UPDATE expense_claims SET amount = total_amount WHERE total_amount IS NOT NULL;

-- ============================================
-- 16. opportunities: bot inserts 'created_by'
-- ============================================
ALTER TABLE opportunities ADD COLUMN created_by TEXT;
