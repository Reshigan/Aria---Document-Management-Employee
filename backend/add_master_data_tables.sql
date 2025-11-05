
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) NOT NULL DEFAULT 'company', -- individual, company, government
    parent_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_number VARCHAR(50),
    vat_number VARCHAR(50),
    credit_limit DECIMAL(18, 2) DEFAULT 0.00,
    payment_terms_days INTEGER DEFAULT 30,
    currency_code VARCHAR(3) DEFAULT 'ZAR',
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state_province VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100) DEFAULT 'South Africa',
    shipping_address_line1 VARCHAR(255),
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state_province VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100) DEFAULT 'South Africa',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_parent ON customers(parent_customer_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_code ON customers(code);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    supplier_type VARCHAR(50) NOT NULL DEFAULT 'manufacturer', -- manufacturer, distributor, service_provider
    parent_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_number VARCHAR(50),
    vat_number VARCHAR(50),
    bbbee_level VARCHAR(50), -- level_1 to level_8, non_compliant
    bbbee_certificate_number VARCHAR(100),
    bbbee_expiry_date DATE,
    payment_terms_days INTEGER DEFAULT 30,
    currency_code VARCHAR(3) DEFAULT 'ZAR',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'South Africa',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_suppliers_parent ON suppliers(parent_supplier_id);
CREATE INDEX idx_suppliers_email ON suppliers(email);
CREATE INDEX idx_suppliers_bbbee ON suppliers(bbbee_level);
CREATE INDEX idx_suppliers_code ON suppliers(code);

CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_product_categories_company ON product_categories(company_id);
CREATE INDEX idx_product_categories_parent ON product_categories(parent_category_id);

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5, 2) DEFAULT 15.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_vat_exempt BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_list_type VARCHAR(50) NOT NULL DEFAULT 'standard', -- standard, customer_specific, customer_hierarchy, promotional, volume_based
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_hierarchy_id UUID REFERENCES customers(id) ON DELETE CASCADE, -- parent customer for hierarchy pricing
    valid_from DATE NOT NULL,
    valid_to DATE,
    currency_code VARCHAR(3) DEFAULT 'ZAR',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_price_lists_company ON price_lists(company_id);
CREATE INDEX idx_price_lists_customer ON price_lists(customer_id);
CREATE INDEX idx_price_lists_hierarchy ON price_lists(customer_hierarchy_id);
CREATE INDEX idx_price_lists_dates ON price_lists(valid_from, valid_to);

CREATE TABLE IF NOT EXISTS price_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_price DECIMAL(18, 4) NOT NULL,
    min_quantity DECIMAL(18, 3) DEFAULT 1.000,
    max_quantity DECIMAL(18, 3),
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(price_list_id, product_id, min_quantity)
);

CREATE INDEX idx_price_list_items_list ON price_list_items(price_list_id);
CREATE INDEX idx_price_list_items_product ON price_list_items(product_id);

CREATE TABLE IF NOT EXISTS tax_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    tax_type VARCHAR(50) NOT NULL, -- VAT, WHT, Excise, etc.
    rate DECIMAL(5, 2) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_tax_codes_company ON tax_codes(company_id);

CREATE TABLE IF NOT EXISTS payment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    days INTEGER NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    discount_days INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_payment_terms_company ON payment_terms(company_id);

CREATE TABLE IF NOT EXISTS cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    manager_name VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX idx_cost_centers_parent ON cost_centers(parent_cost_center_id);

CREATE TABLE IF NOT EXISTS units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    uom_type VARCHAR(50) NOT NULL, -- quantity, weight, volume, length, area, time
    base_uom_id UUID REFERENCES units_of_measure(id) ON DELETE SET NULL,
    conversion_factor DECIMAL(18, 6) DEFAULT 1.000000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_uom_company ON units_of_measure(company_id);

CREATE TABLE IF NOT EXISTS shipping_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    carrier VARCHAR(255),
    estimated_days INTEGER,
    cost_per_kg DECIMAL(18, 4),
    minimum_cost DECIMAL(18, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX idx_shipping_methods_company ON shipping_methods(company_id);

INSERT INTO tax_codes (company_id, code, name, tax_type, rate, is_default, description)
SELECT 
    c.id,
    'VAT15',
    'Standard VAT 15%',
    'VAT',
    15.00,
    true,
    'Standard South African VAT rate'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_codes WHERE code = 'VAT15' AND company_id = c.id
)
LIMIT 1;

INSERT INTO tax_codes (company_id, code, name, tax_type, rate, is_default, description)
SELECT 
    c.id,
    'VAT0',
    'Zero-rated VAT',
    'VAT',
    0.00,
    false,
    'Zero-rated supplies (exports, basic foods)'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_codes WHERE code = 'VAT0' AND company_id = c.id
)
LIMIT 1;

INSERT INTO tax_codes (company_id, code, name, tax_type, rate, is_default, description)
SELECT 
    c.id,
    'EXEMPT',
    'VAT Exempt',
    'VAT',
    0.00,
    false,
    'VAT exempt supplies (financial services, residential rent)'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_codes WHERE code = 'EXEMPT' AND company_id = c.id
)
LIMIT 1;

INSERT INTO payment_terms (company_id, code, name, days, discount_percent, discount_days, description)
SELECT 
    c.id,
    'NET30',
    'Net 30 Days',
    30,
    0.00,
    0,
    'Payment due within 30 days'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM payment_terms WHERE code = 'NET30' AND company_id = c.id
)
LIMIT 1;

INSERT INTO payment_terms (company_id, code, name, days, discount_percent, discount_days, description)
SELECT 
    c.id,
    '2/10NET30',
    '2% 10 Days, Net 30',
    30,
    2.00,
    10,
    '2% discount if paid within 10 days, otherwise net 30'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM payment_terms WHERE code = '2/10NET30' AND company_id = c.id
)
LIMIT 1;

INSERT INTO payment_terms (company_id, code, name, days, discount_percent, discount_days, description)
SELECT 
    c.id,
    'COD',
    'Cash on Delivery',
    0,
    0.00,
    0,
    'Payment due on delivery'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM payment_terms WHERE code = 'COD' AND company_id = c.id
)
LIMIT 1;

INSERT INTO units_of_measure (company_id, code, name, uom_type, conversion_factor)
SELECT 
    c.id,
    'EA',
    'Each',
    'quantity',
    1.000000
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM units_of_measure WHERE code = 'EA' AND company_id = c.id
)
LIMIT 1;

INSERT INTO units_of_measure (company_id, code, name, uom_type, conversion_factor)
SELECT 
    c.id,
    'KG',
    'Kilogram',
    'weight',
    1.000000
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM units_of_measure WHERE code = 'KG' AND company_id = c.id
)
LIMIT 1;

INSERT INTO units_of_measure (company_id, code, name, uom_type, conversion_factor)
SELECT 
    c.id,
    'L',
    'Liter',
    'volume',
    1.000000
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM units_of_measure WHERE code = 'L' AND company_id = c.id
)
LIMIT 1;

COMMENT ON TABLE customers IS 'Customer master data with hierarchical support for parent-child relationships';
COMMENT ON TABLE suppliers IS 'Supplier master data with BBBEE compliance tracking';
COMMENT ON TABLE product_categories IS 'Hierarchical product categorization';
COMMENT ON TABLE price_lists IS 'Price lists supporting customer-specific, hierarchy-based, and promotional pricing';
COMMENT ON TABLE tax_codes IS 'Tax code master data (VAT, WHT, Excise, etc.)';
COMMENT ON TABLE payment_terms IS 'Payment terms with early payment discount support';
COMMENT ON TABLE cost_centers IS 'Cost center hierarchy for financial reporting';
