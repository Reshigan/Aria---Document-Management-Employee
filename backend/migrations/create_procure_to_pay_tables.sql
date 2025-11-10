
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    rfq_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    requested_by UUID,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'responses_received', 'awarded', 'cancelled'
    issue_date DATE NOT NULL,
    response_deadline DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rfqs_company ON rfqs(company_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_number ON rfqs(rfq_number);

CREATE TABLE IF NOT EXISTS rfq_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_of_measure VARCHAR(20),
    required_date DATE,
    specifications TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rfq_id, line_number)
);

CREATE INDEX idx_rfq_lines_rfq ON rfq_lines(rfq_id);

CREATE TABLE IF NOT EXISTS rfq_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    response_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'responded', 'declined'
    UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX idx_rfq_suppliers_rfq ON rfq_suppliers(rfq_id);
CREATE INDEX idx_rfq_suppliers_supplier ON rfq_suppliers(supplier_id);

CREATE TABLE IF NOT EXISTS supplier_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id),
    supplier_id UUID NOT NULL,
    quotation_number VARCHAR(50),
    quotation_date DATE NOT NULL,
    validity_date DATE,
    total_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'ZAR',
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    notes TEXT,
    is_awarded BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_quotations_rfq ON supplier_quotations(rfq_id);
CREATE INDEX idx_supplier_quotations_supplier ON supplier_quotations(supplier_id);

CREATE TABLE IF NOT EXISTS quotation_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES supplier_quotations(id) ON DELETE CASCADE,
    rfq_line_id UUID NOT NULL REFERENCES rfq_lines(id),
    unit_price DECIMAL(15,2) NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    delivery_lead_time INTEGER, -- Days
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotation_lines_quotation ON quotation_lines(quotation_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL,
    rfq_id UUID REFERENCES rfqs(id),
    quotation_id UUID REFERENCES supplier_quotations(id),
    order_date DATE NOT NULL,
    required_date DATE,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'sent', 'acknowledged', 'partially_received', 'received', 'cancelled'
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    payment_terms VARCHAR(100),
    delivery_address TEXT,
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_code VARCHAR(20),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    quantity_received DECIMAL(15,3) DEFAULT 0,
    quantity_invoiced DECIMAL(15,3) DEFAULT 0,
    gl_account VARCHAR(20), -- Expense account
    cost_center_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(po_id, line_number)
);

CREATE INDEX idx_purchase_order_lines_po ON purchase_order_lines(po_id);
CREATE INDEX idx_purchase_order_lines_product ON purchase_order_lines(product_id);

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    gr_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID NOT NULL REFERENCES purchase_orders(id),
    receipt_date DATE NOT NULL,
    warehouse_id UUID,
    storage_location_id UUID,
    received_by UUID,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'posted', 'reversed'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    posted_at TIMESTAMP
);

CREATE INDEX idx_goods_receipts_company ON goods_receipts(company_id);
CREATE INDEX idx_goods_receipts_po ON goods_receipts(po_id);
CREATE INDEX idx_goods_receipts_status ON goods_receipts(status);
CREATE INDEX idx_goods_receipts_number ON goods_receipts(gr_number);

CREATE TABLE IF NOT EXISTS goods_receipt_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gr_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    po_line_id UUID NOT NULL REFERENCES purchase_order_lines(id),
    line_number INTEGER NOT NULL,
    quantity_received DECIMAL(15,3) NOT NULL,
    quantity_accepted DECIMAL(15,3) NOT NULL,
    quantity_rejected DECIMAL(15,3) DEFAULT 0,
    rejection_reason TEXT,
    storage_location_id UUID,
    batch_number VARCHAR(50),
    serial_numbers TEXT[], -- Array of serial numbers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(gr_id, line_number)
);

CREATE INDEX idx_goods_receipt_lines_gr ON goods_receipt_lines(gr_id);
CREATE INDEX idx_goods_receipt_lines_po_line ON goods_receipt_lines(po_line_id);

CREATE TABLE IF NOT EXISTS supplier_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    invoice_number VARCHAR(50) NOT NULL,
    supplier_id UUID NOT NULL,
    po_id UUID REFERENCES purchase_orders(id),
    gr_id UUID REFERENCES goods_receipts(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'matched', 'approved', 'posted', 'paid', 'cancelled'
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'ZAR',
    payment_terms VARCHAR(100),
    gl_posted BOOLEAN DEFAULT false,
    gl_posted_at TIMESTAMP,
    three_way_match_status VARCHAR(50), -- 'pending', 'matched', 'variance', 'override'
    match_variance DECIMAL(15,2), -- Difference between PO, GR, and Invoice
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, supplier_id, invoice_number)
);

CREATE INDEX idx_supplier_invoices_company ON supplier_invoices(company_id);
CREATE INDEX idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_po ON supplier_invoices(po_id);
CREATE INDEX idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX idx_supplier_invoices_due_date ON supplier_invoices(due_date);

CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
    po_line_id UUID REFERENCES purchase_order_lines(id),
    gr_line_id UUID REFERENCES goods_receipt_lines(id),
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_code VARCHAR(20),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    gl_account VARCHAR(20), -- Expense account
    cost_center_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(invoice_id, line_number)
);

CREATE INDEX idx_supplier_invoice_lines_invoice ON supplier_invoice_lines(invoice_id);
CREATE INDEX idx_supplier_invoice_lines_po_line ON supplier_invoice_lines(po_line_id);

CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50), -- 'eft', 'cheque', 'cash', 'credit_card'
    bank_account_id UUID,
    reference VARCHAR(100),
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'processed', 'cleared', 'cancelled'
    gl_posted BOOLEAN DEFAULT false,
    gl_posted_at TIMESTAMP,
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_payments_company ON supplier_payments(company_id);
CREATE INDEX idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_status ON supplier_payments(status);
CREATE INDEX idx_supplier_payments_date ON supplier_payments(payment_date);

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES supplier_invoices(id),
    allocated_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payment_id, invoice_id)
);

CREATE INDEX idx_supplier_payment_allocations_payment ON supplier_payment_allocations(payment_id);
CREATE INDEX idx_supplier_payment_allocations_invoice ON supplier_payment_allocations(invoice_id);

COMMENT ON TABLE rfqs IS 'Request for Quotation - first step in procurement';
COMMENT ON TABLE purchase_orders IS 'Purchase Orders with approval workflow';
COMMENT ON TABLE goods_receipts IS 'Goods Receipt - physical receipt of goods';
COMMENT ON TABLE supplier_invoices IS 'Supplier invoices with 3-way matching (PO-GR-Invoice)';
COMMENT ON TABLE supplier_payments IS 'Supplier payments with invoice allocation';
