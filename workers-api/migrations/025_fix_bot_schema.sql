-- Migration 025: Fix all DB schema mismatches between bot-executor.ts and actual tables
-- Each ALTER TABLE is wrapped to handle "duplicate column" errors gracefully in SQLite
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN, so we rely on
-- the D1 migration runner executing each statement independently.

-- ============================================
-- 1. purchase_orders: bot uses 'order_date', table has 'po_date'
-- ============================================
ALTER TABLE purchase_orders ADD COLUMN order_date TEXT;

-- ============================================
-- 2. tasks: bot uses 'updated_at' and 'priority'
-- ============================================
ALTER TABLE tasks ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium';

-- ============================================
-- 3. production_runs: bot uses 'actual_quantity', 'status', 'planned_quantity', 'start_time', 'end_time'
--    Table (005) has quantity_produced, run_date, shift but NOT these columns
-- ============================================
ALTER TABLE production_runs ADD COLUMN actual_quantity REAL DEFAULT 0;
ALTER TABLE production_runs ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE production_runs ADD COLUMN planned_quantity REAL DEFAULT 0;
ALTER TABLE production_runs ADD COLUMN start_time TEXT;
ALTER TABLE production_runs ADD COLUMN end_time TEXT;

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

-- ============================================
-- 7. payroll_runs: bot uses 'payroll_number', 'pay_period_start', 'pay_period_end',
--    'processed_by', 'total_gross', 'total_deductions', 'total_net', 'employee_count'
--    Migration 005 schema has payroll_period, run_date
--    Migration 014 schema has pay_period_start, pay_period_end but different structure
--    Add columns that may be missing depending on which CREATE TABLE ran first
-- ============================================
ALTER TABLE payroll_runs ADD COLUMN payroll_number TEXT;
ALTER TABLE payroll_runs ADD COLUMN pay_period_start TEXT;
ALTER TABLE payroll_runs ADD COLUMN pay_period_end TEXT;
ALTER TABLE payroll_runs ADD COLUMN processed_by TEXT;
ALTER TABLE payroll_runs ADD COLUMN total_gross REAL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN total_deductions REAL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN total_net REAL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN employee_count INTEGER DEFAULT 0;

-- ============================================
-- 8. employees: bot uses 'salary' (table has basic_salary) and 'status' (table has is_active)
-- ============================================
ALTER TABLE employees ADD COLUMN salary REAL DEFAULT 0;
ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'active';

-- ============================================
-- 9. bank_transactions: bot uses 'reconciled' (table has is_reconciled) and 'amount'
--    Migration 005 has debit_amount/credit_amount and is_reconciled
--    Migration 014 has amount but no reconciled
-- ============================================
ALTER TABLE bank_transactions ADD COLUMN reconciled INTEGER DEFAULT 0;
ALTER TABLE bank_transactions ADD COLUMN amount REAL DEFAULT 0;

-- ============================================
-- 10. leads: bot uses 'lead_name' (table has contact_name) and 'score'
-- ============================================
ALTER TABLE leads ADD COLUMN lead_name TEXT;
ALTER TABLE leads ADD COLUMN score INTEGER;

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

-- ============================================
-- 14. bank_accounts: bot uses 'balance' (table has current_balance)
-- ============================================
ALTER TABLE bank_accounts ADD COLUMN balance REAL DEFAULT 0;

-- ============================================
-- 15. expense_claims: bot uses 'amount' and 'category' (table has total_amount, no category)
-- ============================================
ALTER TABLE expense_claims ADD COLUMN amount REAL DEFAULT 0;
ALTER TABLE expense_claims ADD COLUMN category TEXT;

-- ============================================
-- 16. opportunities: bot inserts 'created_by'
-- ============================================
ALTER TABLE opportunities ADD COLUMN created_by TEXT;

-- ============================================
-- 17. work_orders: bot uses 'updated_at' (ensure it exists)
-- ============================================
ALTER TABLE work_orders ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
