-- Price Lists Schema for ARIA ERP
-- Supports standard pricing, customer-specific pricing, customer hierarchy pricing, promotional pricing, and volume-based pricing

-- Price Lists table
CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'standard',
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_group_id UUID,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_price_list_type CHECK (type IN ('standard', 'customer', 'customer_group', 'promotional', 'volume')),
    CONSTRAINT valid_date_range CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_price_lists_company ON price_lists(company_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_customer ON price_lists(customer_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_active ON price_lists(is_active, valid_from, valid_to);

-- Price List Items table
CREATE TABLE IF NOT EXISTS price_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_price NUMERIC(15,2) NOT NULL,
    min_quantity NUMERIC(15,3) DEFAULT 1,
    max_quantity NUMERIC(15,3),
    discount_percent NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_quantity_range CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
    CONSTRAINT valid_discount CHECK (discount_percent >= 0 AND discount_percent <= 100),
    UNIQUE (price_list_id, product_id, min_quantity)
);

CREATE INDEX IF NOT EXISTS idx_price_list_items_price_list ON price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_product ON price_list_items(product_id);

-- Insert default standard price list
INSERT INTO price_lists (company_id, name, description, type, valid_from, is_active, priority)
SELECT id, 'Standard Price List', 'Default standard pricing for all products', 'standard', CURRENT_DATE, true, 1
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM price_lists WHERE type = 'standard' AND company_id = companies.id)
LIMIT 1;

COMMENT ON TABLE price_lists IS 'Price lists for different pricing strategies (standard, customer-specific, promotional, volume-based)';
COMMENT ON TABLE price_list_items IS 'Individual product prices within price lists with quantity breaks';
