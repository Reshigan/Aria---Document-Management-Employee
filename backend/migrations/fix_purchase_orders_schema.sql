-- ============================================================================
-- ARIA ERP - Purchase Orders Schema Fix Migration
-- ============================================================================
-- This migration fixes schema mismatches between the database and backend code.
-- The backend expects certain column names that differ from the original migration.
-- 
-- Safe to run multiple times (uses IF NOT EXISTS and exception handling).
-- ============================================================================

-- ============================================================================
-- 1. FIX PURCHASE_ORDERS TABLE - Add missing columns expected by backend
-- ============================================================================

DO $$
BEGIN
    -- Add po_date column if it doesn't exist (backend expects this instead of order_date)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'po_date') THEN
        ALTER TABLE purchase_orders ADD COLUMN po_date DATE;
        -- Copy data from order_date if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'order_date') THEN
            UPDATE purchase_orders SET po_date = order_date WHERE po_date IS NULL;
        END IF;
        RAISE NOTICE 'Added po_date column to purchase_orders';
    END IF;
    
    -- Add expected_delivery_date column if it doesn't exist (backend expects this instead of required_date)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'expected_delivery_date') THEN
        ALTER TABLE purchase_orders ADD COLUMN expected_delivery_date DATE;
        -- Copy data from required_date if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'required_date') THEN
            UPDATE purchase_orders SET expected_delivery_date = required_date WHERE expected_delivery_date IS NULL;
        END IF;
        RAISE NOTICE 'Added expected_delivery_date column to purchase_orders';
    END IF;
    
    -- Add delivery_date column if it doesn't exist (some backend code uses this)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'delivery_date') THEN
        ALTER TABLE purchase_orders ADD COLUMN delivery_date DATE;
        RAISE NOTICE 'Added delivery_date column to purchase_orders';
    END IF;
    
    -- Add buyer_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'buyer_name') THEN
        ALTER TABLE purchase_orders ADD COLUMN buyer_name VARCHAR(255);
        RAISE NOTICE 'Added buyer_name column to purchase_orders';
    END IF;
    
    -- Add shipping_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'shipping_address') THEN
        ALTER TABLE purchase_orders ADD COLUMN shipping_address TEXT;
        RAISE NOTICE 'Added shipping_address column to purchase_orders';
    END IF;
    
    -- Add billing_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'billing_address') THEN
        ALTER TABLE purchase_orders ADD COLUMN billing_address TEXT;
        RAISE NOTICE 'Added billing_address column to purchase_orders';
    END IF;
    
    -- Add terms_and_conditions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'terms_and_conditions') THEN
        ALTER TABLE purchase_orders ADD COLUMN terms_and_conditions TEXT;
        RAISE NOTICE 'Added terms_and_conditions column to purchase_orders';
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_date ON purchase_orders(po_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery ON purchase_orders(expected_delivery_date);

-- ============================================================================
-- 2. FIX SUPPLIERS TABLE - Ensure it exists with required columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    supplier_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'South Africa',
    vat_number VARCHAR(50),
    tax_number VARCHAR(50),
    registration_number VARCHAR(100),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_branch_code VARCHAR(20),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ZAR',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for suppliers table
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- ============================================================================
-- 3. FIX CUSTOMERS TABLE - Ensure it exists with required columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    customer_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'South Africa',
    vat_number VARCHAR(50),
    tax_number VARCHAR(50),
    registration_number VARCHAR(100),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ZAR',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- ============================================================================
-- 4. FIX SALES_ORDERS TABLE - Ensure it exists with required columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    so_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL,
    quote_id UUID,
    order_date DATE NOT NULL,
    required_date DATE,
    delivery_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ZAR',
    payment_terms VARCHAR(100),
    delivery_address TEXT,
    billing_address TEXT,
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sales_orders table
CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_number ON sales_orders(so_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date);

-- ============================================================================
-- 5. FIX PRODUCTS/ITEMS TABLE - Ensure it exists with required columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    product_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    unit_price DECIMAL(15,2) DEFAULT 0,
    cost_price DECIMAL(15,2) DEFAULT 0,
    tax_code VARCHAR(20),
    tax_rate DECIMAL(5,2) DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    is_stockable BOOLEAN DEFAULT TRUE,
    reorder_level DECIMAL(15,3) DEFAULT 0,
    reorder_quantity DECIMAL(15,3) DEFAULT 0,
    gl_revenue_account VARCHAR(20),
    gl_expense_account VARCHAR(20),
    gl_inventory_account VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Purchase Orders Schema Fix Complete';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Fixed/Created:';
    RAISE NOTICE '  - purchase_orders (added po_date, expected_delivery_date, etc.)';
    RAISE NOTICE '  - suppliers (master data)';
    RAISE NOTICE '  - customers (master data)';
    RAISE NOTICE '  - sales_orders (O2C workflow)';
    RAISE NOTICE '  - products (master data)';
    RAISE NOTICE '============================================';
END $$;
