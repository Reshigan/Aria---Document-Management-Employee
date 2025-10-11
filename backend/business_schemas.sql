-- Business Data Tables for ERP Integration
-- These tables store structured business data extracted from documents

-- Invoice structured data
CREATE TABLE IF NOT EXISTS invoice_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    due_date DATE,
    po_number VARCHAR(100),
    
    -- Vendor information
    vendor_name VARCHAR(255),
    vendor_address TEXT,
    vendor_phone VARCHAR(50),
    vendor_email VARCHAR(100),
    vendor_tax_id VARCHAR(50),
    
    -- Customer information
    customer_name VARCHAR(255),
    customer_address TEXT,
    customer_id VARCHAR(100),
    
    -- Financial data
    subtotal DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Payment information
    payment_terms VARCHAR(255),
    payment_method VARCHAR(100),
    
    -- SAP integration fields
    sap_posted BOOLEAN DEFAULT FALSE,
    sap_document_number VARCHAR(100),
    sap_posting_date TIMESTAMP,
    sap_error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_data_id INTEGER NOT NULL,
    line_number INTEGER,
    description TEXT,
    quantity DECIMAL(10,3),
    unit_price DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    tax_rate DECIMAL(5,2),
    gl_account VARCHAR(50),  -- For SAP posting
    cost_center VARCHAR(50), -- For SAP posting
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invoice_data_id) REFERENCES invoice_data(id) ON DELETE CASCADE
);

-- Remittance structured data
CREATE TABLE IF NOT EXISTS remittance_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    remittance_number VARCHAR(100),
    payment_date DATE,
    
    -- Payer information
    payer_name VARCHAR(255),
    payer_account_number VARCHAR(100),
    payer_reference VARCHAR(100),
    
    -- Payment information
    payment_method VARCHAR(100),
    total_payment_amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Bank details
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_routing_number VARCHAR(50),
    bank_reference_number VARCHAR(100),
    
    -- SAP integration fields
    sap_posted BOOLEAN DEFAULT FALSE,
    sap_document_number VARCHAR(100),
    sap_posting_date TIMESTAMP,
    sap_error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Remittance invoice payments
CREATE TABLE IF NOT EXISTS remittance_invoice_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remittance_data_id INTEGER NOT NULL,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    original_amount DECIMAL(15,2),
    payment_amount DECIMAL(15,2),
    discount_taken DECIMAL(15,2),
    balance_remaining DECIMAL(15,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (remittance_data_id) REFERENCES remittance_data(id) ON DELETE CASCADE
);

-- Proof of Delivery structured data
CREATE TABLE IF NOT EXISTS pod_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    pod_number VARCHAR(100),
    delivery_date DATE,
    delivery_time TIME,
    tracking_number VARCHAR(100),
    
    -- Carrier information
    carrier_name VARCHAR(255),
    driver_name VARCHAR(255),
    vehicle_id VARCHAR(100),
    
    -- Shipper information
    shipper_name VARCHAR(255),
    shipper_address TEXT,
    
    -- Recipient information
    recipient_name VARCHAR(255),
    recipient_address TEXT,
    contact_person VARCHAR(255),
    signature_captured BOOLEAN DEFAULT FALSE,
    
    -- Delivery status
    delivery_status VARCHAR(50),
    special_instructions TEXT,
    damages_noted TEXT,
    
    -- SAP integration fields
    sap_posted BOOLEAN DEFAULT FALSE,
    sap_document_number VARCHAR(100),
    sap_posting_date TIMESTAMP,
    sap_error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- POD delivered items
CREATE TABLE IF NOT EXISTS pod_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pod_data_id INTEGER NOT NULL,
    item_number INTEGER,
    description TEXT,
    quantity_shipped DECIMAL(10,3),
    quantity_delivered DECIMAL(10,3),
    unit VARCHAR(50),
    condition_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pod_data_id) REFERENCES pod_data(id) ON DELETE CASCADE
);

-- Contract structured data
CREATE TABLE IF NOT EXISTS contract_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    contract_number VARCHAR(100),
    contract_date DATE,
    effective_date DATE,
    expiration_date DATE,
    
    -- Contract value
    contract_value DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Terms
    payment_terms TEXT,
    renewal_terms TEXT,
    termination_clause TEXT,
    
    -- SAP integration fields
    sap_posted BOOLEAN DEFAULT FALSE,
    sap_document_number VARCHAR(100),
    sap_posting_date TIMESTAMP,
    sap_error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Contract parties
CREATE TABLE IF NOT EXISTS contract_parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_data_id INTEGER NOT NULL,
    party_name VARCHAR(255),
    party_role VARCHAR(100),
    party_address TEXT,
    contact_person VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_data_id) REFERENCES contract_data(id) ON DELETE CASCADE
);

-- Contract key terms
CREATE TABLE IF NOT EXISTS contract_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_data_id INTEGER NOT NULL,
    term_description TEXT,
    term_category VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_data_id) REFERENCES contract_data(id) ON DELETE CASCADE
);

-- SAP Integration Log
CREATE TABLE IF NOT EXISTS sap_integration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    document_type VARCHAR(50),
    business_data_id INTEGER,
    
    -- Integration details
    sap_transaction_code VARCHAR(20),
    sap_document_type VARCHAR(10),
    sap_company_code VARCHAR(10),
    
    -- Status
    integration_status VARCHAR(50), -- pending, success, error, retry
    sap_document_number VARCHAR(100),
    sap_response TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Excel Remittance Processing Log
CREATE TABLE IF NOT EXISTS excel_remittance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    file_name VARCHAR(255),
    total_records INTEGER,
    processed_records INTEGER,
    failed_records INTEGER,
    processing_status VARCHAR(50),
    error_details TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_data_document_id ON invoice_data(document_id);
CREATE INDEX IF NOT EXISTS idx_invoice_data_invoice_number ON invoice_data(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_data_sap_posted ON invoice_data(sap_posted);

CREATE INDEX IF NOT EXISTS idx_remittance_data_document_id ON remittance_data(document_id);
CREATE INDEX IF NOT EXISTS idx_remittance_data_remittance_number ON remittance_data(remittance_number);
CREATE INDEX IF NOT EXISTS idx_remittance_data_sap_posted ON remittance_data(sap_posted);

CREATE INDEX IF NOT EXISTS idx_pod_data_document_id ON pod_data(document_id);
CREATE INDEX IF NOT EXISTS idx_pod_data_pod_number ON pod_data(pod_number);
CREATE INDEX IF NOT EXISTS idx_pod_data_sap_posted ON pod_data(sap_posted);

CREATE INDEX IF NOT EXISTS idx_contract_data_document_id ON contract_data(document_id);
CREATE INDEX IF NOT EXISTS idx_contract_data_contract_number ON contract_data(contract_number);

CREATE INDEX IF NOT EXISTS idx_sap_integration_log_document_id ON sap_integration_log(document_id);
CREATE INDEX IF NOT EXISTS idx_sap_integration_log_status ON sap_integration_log(integration_status);