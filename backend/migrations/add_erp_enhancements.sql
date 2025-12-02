-- Migration: Add ERP Enhancements for Document Printing, Reporting, and Workflows
-- Date: 2025-12-02
-- Description: Adds missing columns and indexes to support comprehensive ERP features

-- ============================================================================
-- 1. Add missing columns to journal_entry_lines for account lookup
-- ============================================================================

-- Check if we need to add account_id column for foreign key relationship
-- Note: Production uses account_code (VARCHAR), but we'll add account_id as optional
-- for future migration to UUID-based relationships

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entry_lines' 
        AND column_name = 'account_id'
    ) THEN
        ALTER TABLE journal_entry_lines 
        ADD COLUMN account_id UUID REFERENCES chart_of_accounts(id);
        
        CREATE INDEX idx_journal_entry_lines_account_id 
        ON journal_entry_lines(account_id);
        
        RAISE NOTICE 'Added account_id column to journal_entry_lines';
    END IF;
END $$;

-- ============================================================================
-- 2. Add missing columns to quotes for workflow tracking
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'converted_to_sales_order'
    ) THEN
        ALTER TABLE quotes 
        ADD COLUMN converted_to_sales_order BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added converted_to_sales_order column to quotes';
    END IF;
END $$;

-- ============================================================================
-- 3. Add missing columns to sales_orders for workflow tracking
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_orders' 
        AND column_name = 'quote_id'
    ) THEN
        ALTER TABLE sales_orders 
        ADD COLUMN quote_id UUID REFERENCES quotes(id);
        
        CREATE INDEX idx_sales_orders_quote_id 
        ON sales_orders(quote_id);
        
        RAISE NOTICE 'Added quote_id column to sales_orders';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_orders' 
        AND column_name = 'converted_to_invoice'
    ) THEN
        ALTER TABLE sales_orders 
        ADD COLUMN converted_to_invoice BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added converted_to_invoice column to sales_orders';
    END IF;
END $$;

-- ============================================================================
-- 4. Add missing columns to customer_invoices for workflow tracking
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_invoices' 
        AND column_name = 'quote_id'
    ) THEN
        ALTER TABLE customer_invoices 
        ADD COLUMN quote_id UUID REFERENCES quotes(id);
        
        CREATE INDEX idx_customer_invoices_quote_id 
        ON customer_invoices(quote_id);
        
        RAISE NOTICE 'Added quote_id column to customer_invoices';
    END IF;
END $$;

-- ============================================================================
-- 5. Add missing columns to purchase_orders for workflow tracking
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'converted_to_goods_receipt'
    ) THEN
        ALTER TABLE purchase_orders 
        ADD COLUMN converted_to_goods_receipt BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added converted_to_goods_receipt column to purchase_orders';
    END IF;
END $$;

-- ============================================================================
-- 6. Add missing columns to goods_receipts for workflow tracking
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goods_receipts' 
        AND column_name = 'receipt_number'
    ) THEN
        ALTER TABLE goods_receipts 
        ADD COLUMN receipt_number VARCHAR(50);
        
        CREATE INDEX idx_goods_receipts_receipt_number 
        ON goods_receipts(receipt_number);
        
        RAISE NOTICE 'Added receipt_number column to goods_receipts';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goods_receipts' 
        AND column_name = 'receipt_date'
    ) THEN
        ALTER TABLE goods_receipts 
        ADD COLUMN receipt_date DATE DEFAULT CURRENT_DATE;
        
        RAISE NOTICE 'Added receipt_date column to goods_receipts';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goods_receipts' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE goods_receipts 
        ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        
        CREATE INDEX idx_goods_receipts_status 
        ON goods_receipts(status);
        
        RAISE NOTICE 'Added status column to goods_receipts';
    END IF;
END $$;

-- ============================================================================
-- 7. Add indexes for financial reporting performance
-- ============================================================================

-- Index for balance sheet queries
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type_category 
ON chart_of_accounts(company_id, account_type, account_category) 
WHERE is_active = TRUE;

-- Index for income statement queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_date_status 
ON journal_entries(company_id, posting_date, status);

-- Index for aged debtors/creditors
CREATE INDEX IF NOT EXISTS idx_customer_invoices_aging 
ON customer_invoices(company_id, due_date, status) 
WHERE balance_due > 0;

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_aging 
ON supplier_invoices(company_id, due_date, status) 
WHERE balance_due > 0;

-- ============================================================================
-- 8. Create helper view for account lookups (account_code to account_id)
-- ============================================================================

CREATE OR REPLACE VIEW v_account_code_mapping AS
SELECT 
    company_id,
    code AS account_code,
    id AS account_id,
    name AS account_name,
    account_type,
    account_category
FROM chart_of_accounts
WHERE is_active = TRUE;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ERP Enhancements Migration Complete';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Added workflow tracking columns';
    RAISE NOTICE 'Added performance indexes for reporting';
    RAISE NOTICE 'Created account code mapping view';
    RAISE NOTICE '============================================';
END $$;
