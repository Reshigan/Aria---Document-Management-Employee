
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'standard',
    parent_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),
    vat_number VARCHAR(50),
    tax_reference VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    currency_code VARCHAR(3) DEFAULT 'USD',
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),
    shipping_address_line1 VARCHAR(255),
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    UNIQUE(company_id, customer_number)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    supplier_type VARCHAR(50) DEFAULT 'standard',
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    website VARCHAR(255),
    vat_number VARCHAR(50),
    tax_reference VARCHAR(50),
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    currency_code VARCHAR(3) DEFAULT 'USD',
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_branch_code VARCHAR(50),
    swift_code VARCHAR(50),
    bbbee_level VARCHAR(20),
    bbbee_certificate_number VARCHAR(100),
    bbbee_certificate_expiry DATE,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    UNIQUE(company_id, supplier_number)
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    product_type VARCHAR(50) DEFAULT 'finished_good',
    category VARCHAR(100),
    subcategory VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    barcode VARCHAR(100),
    sku VARCHAR(100),
    standard_cost DECIMAL(15,4) DEFAULT 0.0000,
    selling_price DECIMAL(15,4) DEFAULT 0.0000,
    currency_code VARCHAR(3) DEFAULT 'USD',
    weight DECIMAL(10,3),
    weight_unit VARCHAR(10),
    dimensions VARCHAR(100),
    reorder_level DECIMAL(15,3) DEFAULT 0.000,
    reorder_quantity DECIMAL(15,3) DEFAULT 0.000,
    lead_time_days INTEGER DEFAULT 0,
    tax_code VARCHAR(50),
    gl_revenue_account VARCHAR(50),
    gl_cogs_account VARCHAR(50),
    gl_inventory_account VARCHAR(50),
    manufacturer VARCHAR(255),
    manufacturer_part_number VARCHAR(100),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_part_number VARCHAR(100),
    image_url VARCHAR(500),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    is_purchasable BOOLEAN DEFAULT true,
    is_saleable BOOLEAN DEFAULT true,
    is_stockable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    UNIQUE(company_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_number ON suppliers(supplier_number);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

COMMENT ON TABLE customers IS 'Customer master data for all companies';
COMMENT ON TABLE suppliers IS 'Supplier master data for all companies';
COMMENT ON TABLE products IS 'Product master data for all companies';

GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO aria_user;
