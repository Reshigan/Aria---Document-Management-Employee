

CREATE TABLE IF NOT EXISTS customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_number VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    amount DECIMAL(18, 2) NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'ZAR',
    status VARCHAR(50) DEFAULT 'pending',
    reconciled_amount DECIMAL(18, 2) DEFAULT 0.00,
    unallocated_amount DECIMAL(18, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, payment_number)
);

CREATE INDEX idx_customer_payments_company ON customer_payments(company_id);
CREATE INDEX idx_customer_payments_customer ON customer_payments(customer_id);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES customer_payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL,
    allocated_amount DECIMAL(18, 2) NOT NULL,
    allocation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payment_id, invoice_id)
);


CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    credit_note_date DATE NOT NULL,
    reason VARCHAR(255),
    total_amount DECIMAL(18, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, credit_note_number)
);

CREATE TABLE IF NOT EXISTS credit_note_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(18, 3) NOT NULL,
    unit_price DECIMAL(18, 4) NOT NULL,
    line_total DECIMAL(18, 2) NOT NULL
);


CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    return_number VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    return_date DATE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, return_number)
);

CREATE TABLE IF NOT EXISTS purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    return_number VARCHAR(50) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    return_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, return_number)
);


CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_paid BOOLEAN DEFAULT true,
    max_days_per_year DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(company_id, code)
);

INSERT INTO leave_types (company_id, code, name, is_paid, max_days_per_year)
SELECT c.id, 'ANNUAL', 'Annual Leave', true, 21.00
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'ANNUAL' AND company_id = c.id)
LIMIT 1;

INSERT INTO leave_types (company_id, code, name, is_paid, max_days_per_year)
SELECT c.id, 'SICK', 'Sick Leave', true, 30.00
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE code = 'SICK' AND company_id = c.id)
LIMIT 1;

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS bbbee_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL,
    procurement_recognition DECIMAL(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO bbbee_codes (code, name, level, procurement_recognition) VALUES
('BBBEE_L1', 'BBBEE Level 1', 'level_1', 135.00),
('BBBEE_L2', 'BBBEE Level 2', 'level_2', 125.00),
('BBBEE_L3', 'BBBEE Level 3', 'level_3', 110.00),
('BBBEE_L4', 'BBBEE Level 4', 'level_4', 100.00),
('BBBEE_L5', 'BBBEE Level 5', 'level_5', 80.00),
('BBBEE_L6', 'BBBEE Level 6', 'level_6', 60.00),
('BBBEE_L7', 'BBBEE Level 7', 'level_7', 50.00),
('BBBEE_L8', 'BBBEE Level 8', 'level_8', 10.00),
('BBBEE_NC', 'Non-Compliant', 'non_compliant', 0.00)
ON CONFLICT (code) DO NOTHING;
