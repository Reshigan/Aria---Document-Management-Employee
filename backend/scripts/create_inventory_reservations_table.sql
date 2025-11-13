-- Create inventory reservations table for soft allocation
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    product_id UUID NOT NULL,
    warehouse_id UUID,
    quantity DECIMAL(15,4) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,  -- 'work_order', 'sales_order', 'field_service'
    reference_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active',  -- 'active', 'fulfilled', 'released', 'expired'
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product 
ON inventory_reservations(product_id, warehouse_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_reference 
ON inventory_reservations(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_company 
ON inventory_reservations(company_id, status);
