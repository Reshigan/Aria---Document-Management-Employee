
CREATE TABLE IF NOT EXISTS tax_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    code VARCHAR(20) UNIQUE NOT NULL,
    description VARCHAR(200) NOT NULL,
    tax_type VARCHAR(50) NOT NULL, -- 'vat', 'withholding', 'excise', 'customs'
    rate DECIMAL(5,2) NOT NULL,
    is_input_tax BOOLEAN DEFAULT false, -- Input VAT (purchases)
    is_output_tax BOOLEAN DEFAULT false, -- Output VAT (sales)
    gl_account_payable VARCHAR(20), -- VAT payable account
    gl_account_receivable VARCHAR(20), -- VAT receivable account
    is_exempt BOOLEAN DEFAULT false,
    is_zero_rated BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_codes_company ON tax_codes(company_id);
CREATE INDEX idx_tax_codes_type ON tax_codes(tax_type);
CREATE INDEX idx_tax_codes_active ON tax_codes(is_active);

CREATE TABLE IF NOT EXISTS vat_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    transaction_date DATE NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'sales_invoice', 'purchase_invoice', 'credit_note', 'journal_entry'
    document_id UUID NOT NULL,
    document_number VARCHAR(100),
    tax_code VARCHAR(20) NOT NULL,
    tax_type VARCHAR(50) NOT NULL, -- 'input', 'output'
    base_amount DECIMAL(15,2) NOT NULL, -- Amount before VAT
    tax_amount DECIMAL(15,2) NOT NULL, -- VAT amount
    total_amount DECIMAL(15,2) NOT NULL, -- Amount including VAT
    currency VARCHAR(3) DEFAULT 'ZAR',
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    partner_id UUID, -- Customer or supplier
    partner_name VARCHAR(200),
    partner_vat_number VARCHAR(50),
    gl_posted BOOLEAN DEFAULT false,
    gl_posted_at TIMESTAMP,
    vat_period VARCHAR(10), -- 'YYYY-MM' format
    is_reversed BOOLEAN DEFAULT false,
    reversed_by UUID REFERENCES vat_transactions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vat_transactions_company ON vat_transactions(company_id);
CREATE INDEX idx_vat_transactions_date ON vat_transactions(transaction_date);
CREATE INDEX idx_vat_transactions_period ON vat_transactions(vat_period);
CREATE INDEX idx_vat_transactions_type ON vat_transactions(tax_type);
CREATE INDEX idx_vat_transactions_document ON vat_transactions(document_type, document_id);

CREATE TABLE IF NOT EXISTS vat_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    period VARCHAR(10) NOT NULL, -- 'YYYY-MM' format
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'paid', 'cancelled'
    
    output_tax DECIMAL(15,2) DEFAULT 0, -- Box 1: Output tax
    input_tax DECIMAL(15,2) DEFAULT 0, -- Box 2: Input tax
    vat_payable DECIMAL(15,2) DEFAULT 0, -- Box 3: VAT payable (output - input)
    vat_refundable DECIMAL(15,2) DEFAULT 0, -- Box 4: VAT refundable (input - output)
    
    zero_rated_supplies DECIMAL(15,2) DEFAULT 0, -- Box 5: Zero-rated supplies
    exempt_supplies DECIMAL(15,2) DEFAULT 0, -- Box 6: Exempt supplies
    total_supplies DECIMAL(15,2) DEFAULT 0, -- Box 7: Total supplies
    
    capital_goods_adjustment DECIMAL(15,2) DEFAULT 0, -- Box 8
    
    bad_debts_written_off DECIMAL(15,2) DEFAULT 0, -- Box 9
    
    adjustments DECIMAL(15,2) DEFAULT 0, -- Box 10
    
    net_vat DECIMAL(15,2) DEFAULT 0, -- Final VAT payable/refundable
    
    payment_reference VARCHAR(100),
    payment_date DATE,
    submitted_by UUID,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, period)
);

CREATE INDEX idx_vat_returns_company ON vat_returns(company_id);
CREATE INDEX idx_vat_returns_period ON vat_returns(period);
CREATE INDEX idx_vat_returns_status ON vat_returns(status);

CREATE TABLE IF NOT EXISTS emp201_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    period VARCHAR(10) NOT NULL, -- 'YYYY-MM' format
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'paid', 'cancelled'
    
    paye_amount DECIMAL(15,2) DEFAULT 0,
    
    uif_employee DECIMAL(15,2) DEFAULT 0,
    uif_employer DECIMAL(15,2) DEFAULT 0,
    uif_total DECIMAL(15,2) DEFAULT 0,
    
    sdl_amount DECIMAL(15,2) DEFAULT 0,
    
    eti_amount DECIMAL(15,2) DEFAULT 0,
    
    total_amount DECIMAL(15,2) DEFAULT 0,
    
    payment_reference VARCHAR(100),
    payment_date DATE,
    submitted_by UUID,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, period)
);

CREATE INDEX idx_emp201_returns_company ON emp201_returns(company_id);
CREATE INDEX idx_emp201_returns_period ON emp201_returns(period);
CREATE INDEX idx_emp201_returns_status ON emp201_returns(status);

CREATE TABLE IF NOT EXISTS period_close (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    period VARCHAR(10) NOT NULL, -- 'YYYY-MM' format
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'closing', 'closed', 'reopened'
    is_locked BOOLEAN DEFAULT false,
    closed_by UUID,
    closed_at TIMESTAMP,
    reopened_by UUID,
    reopened_at TIMESTAMP,
    reopen_reason TEXT,
    checklist JSONB, -- Period close checklist items
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, period)
);

CREATE INDEX idx_period_close_company ON period_close(company_id);
CREATE INDEX idx_period_close_period ON period_close(period);
CREATE INDEX idx_period_close_status ON period_close(status);

CREATE TABLE IF NOT EXISTS bbbee_procurement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    period VARCHAR(10) NOT NULL, -- 'YYYY-MM' format
    supplier_id UUID NOT NULL,
    supplier_name VARCHAR(200) NOT NULL,
    bbbee_level INTEGER, -- 1-8
    bbbee_certificate_number VARCHAR(100),
    bbbee_expiry_date DATE,
    is_black_owned BOOLEAN DEFAULT false,
    black_ownership_percentage DECIMAL(5,2),
    is_black_women_owned BOOLEAN DEFAULT false,
    is_youth_owned BOOLEAN DEFAULT false,
    is_disabled_owned BOOLEAN DEFAULT false,
    procurement_spend DECIMAL(15,2) NOT NULL,
    recognition_percentage DECIMAL(5,2), -- Based on BBBEE level
    recognized_spend DECIMAL(15,2), -- Spend * recognition %
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bbbee_procurement_company ON bbbee_procurement(company_id);
CREATE INDEX idx_bbbee_procurement_period ON bbbee_procurement(period);
CREATE INDEX idx_bbbee_procurement_supplier ON bbbee_procurement(supplier_id);

CREATE TABLE IF NOT EXISTS bbbee_scorecard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    period VARCHAR(10) NOT NULL, -- 'YYYY-MM' or 'YYYY' for annual
    
    ownership_score DECIMAL(5,2) DEFAULT 0,
    
    management_control_score DECIMAL(5,2) DEFAULT 0,
    
    skills_development_score DECIMAL(5,2) DEFAULT 0,
    
    enterprise_development_score DECIMAL(5,2) DEFAULT 0,
    supplier_development_score DECIMAL(5,2) DEFAULT 0,
    
    socio_economic_score DECIMAL(5,2) DEFAULT 0,
    
    total_score DECIMAL(5,2) DEFAULT 0,
    
    bbbee_level INTEGER,
    
    procurement_recognition DECIMAL(5,2), -- 135%, 125%, 110%, etc.
    
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'verified', 'certified'
    certificate_number VARCHAR(100),
    certificate_issue_date DATE,
    certificate_expiry_date DATE,
    verification_agency VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, period)
);

CREATE INDEX idx_bbbee_scorecard_company ON bbbee_scorecard(company_id);
CREATE INDEX idx_bbbee_scorecard_period ON bbbee_scorecard(period);

COMMENT ON TABLE tax_codes IS 'Tax codes master data with rates and GL accounts';
COMMENT ON TABLE vat_transactions IS 'All VAT transactions aggregated from sales and purchases';
COMMENT ON TABLE vat_returns IS 'VAT201 returns for South Africa';
COMMENT ON TABLE emp201_returns IS 'EMP201 returns for PAYE, UIF, SDL';
COMMENT ON TABLE period_close IS 'Period close tracking with lock to prevent backdated postings';
COMMENT ON TABLE bbbee_procurement IS 'BBBEE procurement spend tracking per supplier';
COMMENT ON TABLE bbbee_scorecard IS 'BBBEE scorecard and certification tracking';
