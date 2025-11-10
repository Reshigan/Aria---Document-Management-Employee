
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'South Africa',
    warehouse_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'transit', 'consignment', 'returns'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouses_company ON warehouses(company_id);
CREATE INDEX idx_warehouses_code ON warehouses(code);

CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    location_type VARCHAR(50) DEFAULT 'storage', -- 'receiving', 'storage', 'picking', 'packing', 'shipping', 'quarantine'
    capacity_units DECIMAL(15,3), -- Maximum capacity
    current_utilization DECIMAL(5,2) DEFAULT 0, -- Percentage
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, code)
);

CREATE INDEX idx_storage_locations_warehouse ON storage_locations(warehouse_id);
CREATE INDEX idx_storage_locations_company ON storage_locations(company_id);
CREATE INDEX idx_storage_locations_type ON storage_locations(location_type);

CREATE TABLE IF NOT EXISTS stock_on_hand (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    storage_location_id UUID REFERENCES storage_locations(id),
    batch_number VARCHAR(50),
    serial_number VARCHAR(100),
    quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(20),
    unit_cost DECIMAL(15,2), -- Current unit cost (FIFO or Moving Average)
    total_value DECIMAL(15,2), -- Quantity * Unit Cost
    last_movement_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, product_id, warehouse_id, storage_location_id, batch_number, serial_number)
);

CREATE INDEX idx_stock_on_hand_company ON stock_on_hand(company_id);
CREATE INDEX idx_stock_on_hand_product ON stock_on_hand(product_id);
CREATE INDEX idx_stock_on_hand_warehouse ON stock_on_hand(warehouse_id);
CREATE INDEX idx_stock_on_hand_location ON stock_on_hand(storage_location_id);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    movement_number VARCHAR(50) UNIQUE NOT NULL,
    movement_date DATE NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'gr', 'gi', 'transfer', 'adjustment', 'cycle_count'
    movement_subtype VARCHAR(50), -- SAP movement types: '101' (GR PO), '601' (GI SO), '311' (Transfer), etc.
    product_id UUID NOT NULL,
    from_warehouse_id UUID REFERENCES warehouses(id),
    from_location_id UUID REFERENCES storage_locations(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    to_location_id UUID REFERENCES storage_locations(id),
    quantity DECIMAL(15,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    unit_cost DECIMAL(15,2),
    total_value DECIMAL(15,2),
    batch_number VARCHAR(50),
    serial_number VARCHAR(100),
    reference_document_type VARCHAR(50), -- 'purchase_order', 'sales_order', 'goods_receipt', 'delivery'
    reference_document_id UUID,
    reference_document_number VARCHAR(100),
    reason_code VARCHAR(50), -- For adjustments
    notes TEXT,
    gl_posted BOOLEAN DEFAULT false,
    gl_posted_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date DESC);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_document_type, reference_document_id);

CREATE TABLE IF NOT EXISTS pick_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    pick_list_number VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    sales_order_id UUID,
    delivery_id UUID,
    pick_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'picked', 'cancelled'
    priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority
    picker_id UUID, -- User assigned to pick
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pick_lists_company ON pick_lists(company_id);
CREATE INDEX idx_pick_lists_warehouse ON pick_lists(warehouse_id);
CREATE INDEX idx_pick_lists_status ON pick_lists(status);
CREATE INDEX idx_pick_lists_date ON pick_lists(pick_date);

CREATE TABLE IF NOT EXISTS pick_list_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_id UUID NOT NULL REFERENCES pick_lists(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id UUID NOT NULL,
    storage_location_id UUID REFERENCES storage_locations(id),
    batch_number VARCHAR(50),
    serial_number VARCHAR(100),
    quantity_required DECIMAL(15,3) NOT NULL,
    quantity_picked DECIMAL(15,3) DEFAULT 0,
    unit_of_measure VARCHAR(20),
    pick_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'picked', 'short', 'cancelled'
    picked_by UUID,
    picked_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pick_list_id, line_number)
);

CREATE INDEX idx_pick_list_lines_pick_list ON pick_list_lines(pick_list_id);
CREATE INDEX idx_pick_list_lines_product ON pick_list_lines(product_id);
CREATE INDEX idx_pick_list_lines_location ON pick_list_lines(storage_location_id);

CREATE TABLE IF NOT EXISTS packing_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    packing_list_number VARCHAR(50) UNIQUE NOT NULL,
    pick_list_id UUID REFERENCES pick_lists(id),
    delivery_id UUID,
    pack_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'packed', 'shipped'
    packer_id UUID,
    number_of_packages INTEGER DEFAULT 1,
    total_weight DECIMAL(15,3),
    weight_unit VARCHAR(20) DEFAULT 'kg',
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_packing_lists_company ON packing_lists(company_id);
CREATE INDEX idx_packing_lists_pick_list ON packing_lists(pick_list_id);
CREATE INDEX idx_packing_lists_status ON packing_lists(status);
CREATE INDEX idx_packing_lists_date ON packing_lists(pack_date);

CREATE TABLE IF NOT EXISTS packing_list_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packing_list_id UUID NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id UUID NOT NULL,
    batch_number VARCHAR(50),
    serial_number VARCHAR(100),
    quantity_packed DECIMAL(15,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    package_number INTEGER, -- Which package this item is in
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(packing_list_id, line_number)
);

CREATE INDEX idx_packing_list_lines_packing_list ON packing_list_lines(packing_list_id);
CREATE INDEX idx_packing_list_lines_product ON packing_list_lines(product_id);

CREATE TABLE IF NOT EXISTS cycle_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    cycle_count_number VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    count_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'posted'
    count_type VARCHAR(50) DEFAULT 'full', -- 'full', 'partial', 'abc_analysis'
    counter_id UUID,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    posted_at TIMESTAMP,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cycle_counts_company ON cycle_counts(company_id);
CREATE INDEX idx_cycle_counts_warehouse ON cycle_counts(warehouse_id);
CREATE INDEX idx_cycle_counts_status ON cycle_counts(status);
CREATE INDEX idx_cycle_counts_date ON cycle_counts(count_date);

CREATE TABLE IF NOT EXISTS cycle_count_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_count_id UUID NOT NULL REFERENCES cycle_counts(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id UUID NOT NULL,
    storage_location_id UUID REFERENCES storage_locations(id),
    batch_number VARCHAR(50),
    serial_number VARCHAR(100),
    system_quantity DECIMAL(15,3) NOT NULL, -- Quantity per system
    counted_quantity DECIMAL(15,3), -- Actual counted quantity
    variance_quantity DECIMAL(15,3), -- Difference
    variance_value DECIMAL(15,2), -- Financial impact
    unit_of_measure VARCHAR(20),
    count_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'counted', 'variance', 'adjusted'
    counted_by UUID,
    counted_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cycle_count_id, line_number)
);

CREATE INDEX idx_cycle_count_lines_cycle_count ON cycle_count_lines(cycle_count_id);
CREATE INDEX idx_cycle_count_lines_product ON cycle_count_lines(product_id);
CREATE INDEX idx_cycle_count_lines_location ON cycle_count_lines(storage_location_id);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    adjustment_number VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    adjustment_date DATE NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL, -- 'cycle_count', 'damage', 'obsolete', 'found', 'lost'
    cycle_count_id UUID REFERENCES cycle_counts(id),
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'posted'
    total_value DECIMAL(15,2), -- Total financial impact
    reason TEXT,
    approved_by UUID,
    approved_at TIMESTAMP,
    gl_posted BOOLEAN DEFAULT false,
    gl_posted_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_adjustments_company ON stock_adjustments(company_id);
CREATE INDEX idx_stock_adjustments_warehouse ON stock_adjustments(warehouse_id);
CREATE INDEX idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX idx_stock_adjustments_date ON stock_adjustments(adjustment_date);

CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id UUID NOT NULL,
    storage_location_id UUID REFERENCES storage_locations(id),
    batch_number VARCHAR(50),
    serial_number VARCHAR(100),
    quantity_adjustment DECIMAL(15,3) NOT NULL, -- Positive or negative
    unit_cost DECIMAL(15,2),
    line_value DECIMAL(15,2), -- Quantity * Unit Cost
    unit_of_measure VARCHAR(20),
    reason_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(adjustment_id, line_number)
);

CREATE INDEX idx_stock_adjustment_lines_adjustment ON stock_adjustment_lines(adjustment_id);
CREATE INDEX idx_stock_adjustment_lines_product ON stock_adjustment_lines(product_id);

CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    storage_location_id UUID REFERENCES storage_locations(id),
    batch_number VARCHAR(50),
    serial_number VARCHAR(100),
    quantity_reserved DECIMAL(15,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    reservation_type VARCHAR(50) DEFAULT 'sales_order', -- 'sales_order', 'transfer', 'production'
    reference_document_type VARCHAR(50),
    reference_document_id UUID,
    reference_document_number VARCHAR(100),
    reserved_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_reservations_company ON stock_reservations(company_id);
CREATE INDEX idx_stock_reservations_product ON stock_reservations(product_id);
CREATE INDEX idx_stock_reservations_warehouse ON stock_reservations(warehouse_id);
CREATE INDEX idx_stock_reservations_reference ON stock_reservations(reference_document_type, reference_document_id);

COMMENT ON TABLE warehouses IS 'Warehouse master data per company';
COMMENT ON TABLE storage_locations IS 'Storage locations within warehouses (no bins, just locations)';
COMMENT ON TABLE stock_on_hand IS 'Current inventory levels per product, warehouse, and location';
COMMENT ON TABLE stock_movements IS 'All inventory movements (GR, GI, transfers, adjustments)';
COMMENT ON TABLE pick_lists IS 'Pick lists for sales order fulfillment';
COMMENT ON TABLE packing_lists IS 'Packing lists for shipping';
COMMENT ON TABLE cycle_counts IS 'Cycle count headers for inventory verification';
COMMENT ON TABLE stock_adjustments IS 'Stock adjustments from cycle counts or other reasons';
COMMENT ON TABLE stock_reservations IS 'Stock reservations for sales orders and other purposes';
