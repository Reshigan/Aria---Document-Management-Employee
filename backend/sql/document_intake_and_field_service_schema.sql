
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(50) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) NOT NULL UNIQUE,
    file_size INTEGER NOT NULL,
    file_path TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vendor VARCHAR(50),
    document_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,4),
    company_id VARCHAR(50),
    parsed_data JSONB,
    summary JSONB,
    suggested_action VARCHAR(10),
    status VARCHAR(20) DEFAULT 'parsed',
    posted_at TIMESTAMP,
    posted_by VARCHAR(100),
    posted_target VARCHAR(10),
    transaction_ids TEXT[],
    export_file_path TEXT,
    errors TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

CREATE TABLE IF NOT EXISTS customer_payments (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100) NOT NULL,
    customer_id VARCHAR(50),
    customer_code VARCHAR(50),
    customer_name VARCHAR(255),
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    bank_account VARCHAR(50),
    payment_method VARCHAR(50),
    document_id VARCHAR(50) REFERENCES documents(id),
    status VARCHAR(20) DEFAULT 'unallocated',
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    unallocated_amount DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, payment_reference)
);

CREATE INDEX IF NOT EXISTS idx_customer_payments_company_id ON customer_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_payment_date ON customer_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_customer_payments_status ON customer_payments(status);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    payment_id INTEGER NOT NULL REFERENCES customer_payments(id),
    invoice_id VARCHAR(50),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    invoice_amount DECIMAL(15,2),
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_date DATE NOT NULL,
    allocation_type VARCHAR(20) DEFAULT 'full',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_company_id ON payment_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);


CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    request_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(50),
    customer_name VARCHAR(255),
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    site_id VARCHAR(50),
    site_name VARCHAR(255),
    site_address TEXT,
    asset_id VARCHAR(50),
    asset_description VARCHAR(255),
    request_type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    required_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'new',
    assigned_to VARCHAR(100),
    work_order_id INTEGER,
    resolution TEXT,
    closed_date TIMESTAMP,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_requests_company_id ON service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_priority ON service_requests(priority);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to ON service_requests(assigned_to);

CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    work_order_number VARCHAR(50) NOT NULL UNIQUE,
    service_request_id INTEGER REFERENCES service_requests(id),
    customer_id VARCHAR(50),
    customer_name VARCHAR(255),
    site_id VARCHAR(50),
    site_name VARCHAR(255),
    site_address TEXT,
    asset_id VARCHAR(50),
    asset_description VARCHAR(255),
    work_type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    scheduled_date TIMESTAMP,
    scheduled_duration INTEGER,
    technician_id VARCHAR(50),
    technician_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft',
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    actual_duration INTEGER,
    labor_hours DECIMAL(10,2),
    labor_cost DECIMAL(15,2),
    parts_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    customer_signature TEXT,
    customer_signed_at TIMESTAMP,
    completion_notes TEXT,
    invoice_id VARCHAR(50),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id ON work_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON work_orders(scheduled_date);

CREATE TABLE IF NOT EXISTS technicians (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    skills TEXT[],
    certifications TEXT[],
    hourly_rate DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    last_location_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON technicians(company_id);
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);

CREATE TABLE IF NOT EXISTS work_order_parts (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
    product_id VARCHAR(50),
    product_code VARCHAR(100),
    product_name VARCHAR(255),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(15,2),
    total_price DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'reserved',
    issued_at TIMESTAMP,
    returned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_order_parts_company_id ON work_order_parts(company_id);
CREATE INDEX IF NOT EXISTS idx_work_order_parts_work_order_id ON work_order_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_parts_product_id ON work_order_parts(product_id);

CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    asset_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(50),
    site_id VARCHAR(50),
    asset_type VARCHAR(50),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(100),
    installation_date DATE,
    warranty_expiry_date DATE,
    maintenance_contract_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_company_id ON assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_customer_id ON assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

CREATE TABLE IF NOT EXISTS sla_contracts (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(50),
    customer_name VARCHAR(255),
    contract_type VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    response_time_hours INTEGER,
    resolution_time_hours INTEGER,
    coverage_hours VARCHAR(50),
    monthly_fee DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sla_contracts_company_id ON sla_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_sla_contracts_customer_id ON sla_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_sla_contracts_status ON sla_contracts(status);


CREATE OR REPLACE VIEW v_document_intake_summary AS
SELECT 
    company_id,
    vendor,
    document_type,
    DATE(uploaded_at) as upload_date,
    COUNT(*) as document_count,
    SUM((summary->>'total_amount')::DECIMAL) as total_amount,
    AVG(confidence) as avg_confidence,
    COUNT(CASE WHEN status = 'posted' THEN 1 END) as posted_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
FROM documents
GROUP BY company_id, vendor, document_type, DATE(uploaded_at);

CREATE OR REPLACE VIEW v_customer_payment_summary AS
SELECT 
    company_id,
    customer_id,
    customer_name,
    DATE(payment_date) as payment_date,
    COUNT(*) as payment_count,
    SUM(payment_amount) as total_payments,
    SUM(allocated_amount) as total_allocated,
    SUM(unallocated_amount) as total_unallocated,
    COUNT(CASE WHEN status = 'fully_allocated' THEN 1 END) as fully_allocated_count,
    COUNT(CASE WHEN status = 'partially_allocated' THEN 1 END) as partially_allocated_count,
    COUNT(CASE WHEN status = 'unallocated' THEN 1 END) as unallocated_count
FROM customer_payments
GROUP BY company_id, customer_id, customer_name, DATE(payment_date);

CREATE OR REPLACE VIEW v_field_service_kpis AS
SELECT 
    company_id,
    DATE(scheduled_date) as service_date,
    COUNT(*) as total_work_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
    AVG(CASE WHEN actual_duration IS NOT NULL THEN actual_duration END) as avg_duration_minutes,
    SUM(labor_cost) as total_labor_cost,
    SUM(parts_cost) as total_parts_cost,
    SUM(total_cost) as total_cost,
    COUNT(CASE WHEN customer_signature IS NOT NULL THEN 1 END) as signed_off_count
FROM work_orders
GROUP BY company_id, DATE(scheduled_date);

CREATE OR REPLACE VIEW v_technician_utilization AS
SELECT 
    company_id,
    technician_id,
    technician_name,
    DATE(scheduled_date) as work_date,
    COUNT(*) as work_order_count,
    SUM(scheduled_duration) as scheduled_minutes,
    SUM(actual_duration) as actual_minutes,
    SUM(labor_hours) as total_labor_hours,
    SUM(labor_cost) as total_labor_cost,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) as completion_rate
FROM work_orders
WHERE technician_id IS NOT NULL
GROUP BY company_id, technician_id, technician_name, DATE(scheduled_date);

CREATE OR REPLACE VIEW v_service_request_aging AS
SELECT 
    company_id,
    status,
    priority,
    COUNT(*) as request_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(closed_date, CURRENT_TIMESTAMP) - reported_date))/3600) as avg_age_hours,
    COUNT(CASE WHEN EXTRACT(EPOCH FROM (COALESCE(closed_date, CURRENT_TIMESTAMP) - reported_date))/3600 > 24 THEN 1 END) as overdue_24h_count,
    COUNT(CASE WHEN EXTRACT(EPOCH FROM (COALESCE(closed_date, CURRENT_TIMESTAMP) - reported_date))/3600 > 48 THEN 1 END) as overdue_48h_count
FROM service_requests
GROUP BY company_id, status, priority;

COMMENT ON TABLE documents IS 'Document intake audit trail with vendor detection and parsing results';
COMMENT ON TABLE customer_payments IS 'Customer payment records from remittance advices';
COMMENT ON TABLE payment_allocations IS 'Payment-to-invoice allocations for AR clearing';
COMMENT ON TABLE service_requests IS 'Customer service requests for field service';
COMMENT ON TABLE work_orders IS 'Field service work orders with scheduling and completion tracking';
COMMENT ON TABLE technicians IS 'Field service technicians with skills and location';
COMMENT ON TABLE work_order_parts IS 'Parts used in work orders';
COMMENT ON TABLE assets IS 'Customer assets requiring maintenance and support';
COMMENT ON TABLE sla_contracts IS 'Service level agreement contracts with customers';
