
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    account_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    bank_name VARCHAR(200) NOT NULL,
    branch_code VARCHAR(50),
    swift_code VARCHAR(50),
    iban VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'ZAR',
    account_type VARCHAR(50), -- 'current', 'savings', 'credit_card'
    gl_account VARCHAR(20) NOT NULL, -- GL account for this bank account
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, account_number)
);

CREATE INDEX idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX idx_bank_accounts_gl ON bank_accounts(gl_account);

CREATE TABLE IF NOT EXISTS bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    statement_number VARCHAR(100),
    statement_date DATE NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL,
    closing_balance DECIMAL(15,2) NOT NULL,
    total_debits DECIMAL(15,2) DEFAULT 0,
    total_credits DECIMAL(15,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    import_format VARCHAR(50), -- 'mt940', 'camt053', 'csv', 'manual'
    import_file_name VARCHAR(500),
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reconciliation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'reconciled', 'variance'
    reconciled_by UUID,
    reconciled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bank_account_id, statement_date)
);

CREATE INDEX idx_bank_statements_account ON bank_statements(bank_account_id);
CREATE INDEX idx_bank_statements_company ON bank_statements(company_id);
CREATE INDEX idx_bank_statements_date ON bank_statements(statement_date DESC);
CREATE INDEX idx_bank_statements_status ON bank_statements(reconciliation_status);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    transaction_date DATE NOT NULL,
    value_date DATE,
    description TEXT NOT NULL,
    reference VARCHAR(200),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2),
    transaction_type VARCHAR(50), -- 'payment', 'receipt', 'fee', 'interest', 'transfer'
    counterparty_name VARCHAR(200),
    counterparty_account VARCHAR(100),
    match_status VARCHAR(50) DEFAULT 'unmatched', -- 'unmatched', 'matched', 'partially_matched', 'ignored'
    match_confidence DECIMAL(5,2), -- 0-100 confidence score
    matched_document_type VARCHAR(50), -- 'customer_payment', 'supplier_payment', 'journal_entry'
    matched_document_id UUID,
    matched_by UUID,
    matched_at TIMESTAMP,
    is_reconciled BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_transactions_statement ON bank_transactions(statement_id);
CREATE INDEX idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_company ON bank_transactions(company_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date DESC);
CREATE INDEX idx_bank_transactions_match_status ON bank_transactions(match_status);
CREATE INDEX idx_bank_transactions_reference ON bank_transactions(reference);

CREATE TABLE IF NOT EXISTS bank_reconciliation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    rule_name VARCHAR(200) NOT NULL,
    priority INTEGER DEFAULT 100, -- Lower number = higher priority
    match_field VARCHAR(50) NOT NULL, -- 'reference', 'description', 'amount', 'counterparty'
    match_operator VARCHAR(50) NOT NULL, -- 'equals', 'contains', 'starts_with', 'ends_with', 'regex'
    match_value TEXT NOT NULL,
    amount_tolerance DECIMAL(15,2) DEFAULT 0, -- Allow amount variance
    date_range_days INTEGER DEFAULT 7, -- Match within N days
    document_type VARCHAR(50) NOT NULL, -- 'customer_payment', 'supplier_payment', 'journal_entry'
    auto_match BOOLEAN DEFAULT false, -- Automatically match if confidence > threshold
    confidence_threshold DECIMAL(5,2) DEFAULT 90, -- Auto-match if confidence >= this
    gl_account VARCHAR(20), -- For auto-creating GL entries
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_reconciliation_rules_company ON bank_reconciliation_rules(company_id);
CREATE INDEX idx_bank_reconciliation_rules_priority ON bank_reconciliation_rules(priority);
CREATE INDEX idx_bank_reconciliation_rules_active ON bank_reconciliation_rules(is_active);

CREATE TABLE IF NOT EXISTS bank_reconciliation_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_id UUID NOT NULL,
    matched_amount DECIMAL(15,2) NOT NULL,
    match_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto', 'suggested'
    confidence_score DECIMAL(5,2), -- 0-100
    rule_id UUID REFERENCES bank_reconciliation_rules(id),
    matched_by UUID,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bank_transaction_id, document_type, document_id)
);

CREATE INDEX idx_bank_reconciliation_matches_transaction ON bank_reconciliation_matches(bank_transaction_id);
CREATE INDEX idx_bank_reconciliation_matches_document ON bank_reconciliation_matches(document_type, document_id);

CREATE TABLE IF NOT EXISTS bank_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    fee_type VARCHAR(50) NOT NULL, -- 'transaction_fee', 'monthly_fee', 'interest', 'overdraft_fee'
    amount DECIMAL(15,2) NOT NULL,
    gl_account VARCHAR(20) NOT NULL, -- Expense account for fee
    cost_center_id UUID,
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_fees_transaction ON bank_fees(bank_transaction_id);
CREATE INDEX idx_bank_fees_company ON bank_fees(company_id);

CREATE TABLE IF NOT EXISTS bank_reconciliation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    period_end_date DATE NOT NULL,
    gl_balance DECIMAL(15,2) NOT NULL, -- Balance per GL
    bank_balance DECIMAL(15,2) NOT NULL, -- Balance per bank statement
    outstanding_deposits DECIMAL(15,2) DEFAULT 0, -- In GL but not in bank
    outstanding_checks DECIMAL(15,2) DEFAULT 0, -- In GL but not in bank
    bank_errors DECIMAL(15,2) DEFAULT 0,
    gl_errors DECIMAL(15,2) DEFAULT 0,
    reconciled_balance DECIMAL(15,2) NOT NULL,
    variance DECIMAL(15,2) DEFAULT 0,
    is_balanced BOOLEAN DEFAULT false,
    reconciled_by UUID,
    reconciled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bank_account_id, period_end_date)
);

CREATE INDEX idx_bank_reconciliation_reports_account ON bank_reconciliation_reports(bank_account_id);
CREATE INDEX idx_bank_reconciliation_reports_company ON bank_reconciliation_reports(company_id);
CREATE INDEX idx_bank_reconciliation_reports_date ON bank_reconciliation_reports(period_end_date DESC);

COMMENT ON TABLE bank_accounts IS 'Bank accounts per company with GL mapping';
COMMENT ON TABLE bank_statements IS 'Imported bank statements with reconciliation status';
COMMENT ON TABLE bank_transactions IS 'Individual bank statement transactions with auto-matching';
COMMENT ON TABLE bank_reconciliation_rules IS 'Rules for automatic transaction matching';
COMMENT ON TABLE bank_reconciliation_matches IS 'Matched bank transactions to ERP documents';
COMMENT ON TABLE bank_reconciliation_reports IS 'Period-end bank reconciliation reports';
