
CREATE TABLE IF NOT EXISTS customer_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    invoice_number VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, approved, posted, cancelled
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid, partial, paid
    sales_order_id UUID REFERENCES sales_orders(id),
    delivery_id UUID REFERENCES deliveries(id),
    reference VARCHAR(100),
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    amount_outstanding DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    terms_and_conditions TEXT,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    posted_by UUID REFERENCES users(id),
    posted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_customer_invoices_company ON customer_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer ON customer_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_status ON customer_invoices(status);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_payment_status ON customer_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_date ON customer_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_so ON customer_invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_delivery ON customer_invoices(delivery_id);

CREATE TABLE IF NOT EXISTS customer_invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES customer_invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(18,3) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    line_total DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) NOT NULL,
    account_code VARCHAR(20), -- Revenue account override
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(invoice_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_customer_invoice_lines_invoice ON customer_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoice_lines_product ON customer_invoice_lines(product_id);

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    receipt_number VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    payment_date DATE NOT NULL,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    payment_method VARCHAR(20) NOT NULL, -- cash, cheque, eft, card
    reference VARCHAR(100),
    amount DECIMAL(18,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, posted
    notes TEXT,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES users(id),
    posted_by UUID REFERENCES users(id),
    posted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_receipts_company ON receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(payment_date);
CREATE INDEX IF NOT EXISTS idx_receipts_bank_account ON receipts(bank_account_id);

CREATE TABLE IF NOT EXISTS receipt_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES customer_invoices(id),
    amount DECIMAL(18,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipt_allocations_receipt ON receipt_allocations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_allocations_invoice ON receipt_allocations(invoice_id);

COMMENT ON TABLE customer_invoices IS 'Customer invoices with GL posting support';
COMMENT ON TABLE customer_invoice_lines IS 'Customer invoice line items with product and tax details';
COMMENT ON TABLE receipts IS 'Customer payments/receipts with bank account tracking';
COMMENT ON TABLE receipt_allocations IS 'Allocation of customer payments to invoices';
