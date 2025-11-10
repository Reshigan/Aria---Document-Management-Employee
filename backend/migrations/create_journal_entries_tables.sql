
DROP TABLE IF EXISTS journal_entry_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    reference VARCHAR(50) NOT NULL UNIQUE,
    
    entry_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    
    description TEXT NOT NULL,
    
    source VARCHAR(50) NOT NULL DEFAULT 'MANUAL',  -- MANUAL, AP, AR, DOCUMENT_UPLOAD, PAYROLL, etc.
    source_document_hash VARCHAR(64),  -- SHA256 hash for idempotency
    source_document_name VARCHAR(255),
    
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, POSTED, REVERSED, CANCELLED
    
    total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    reversed_by UUID REFERENCES journal_entries(id),
    reversal_date DATE,
    reversal_reason TEXT,
    
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    posted_by VARCHAR(100),
    posted_at TIMESTAMP,
    
    CONSTRAINT journal_entries_balanced CHECK (ABS(total_debit - total_credit) < 0.01),
    CONSTRAINT journal_entries_status_check CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED'))
);

CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    account_code VARCHAR(20) NOT NULL,
    
    debit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    description TEXT,
    
    cost_center VARCHAR(20),
    department VARCHAR(20),
    project_code VARCHAR(20),
    
    CONSTRAINT journal_entry_lines_amounts_check CHECK (debit_amount >= 0 AND credit_amount >= 0),
    CONSTRAINT journal_entry_lines_not_both_zero CHECK (debit_amount > 0 OR credit_amount > 0),
    CONSTRAINT journal_entry_lines_not_both_nonzero CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
);

CREATE INDEX idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_posting_date ON journal_entries(posting_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entries_source ON journal_entries(source);
CREATE INDEX idx_journal_entries_reference ON journal_entries(reference);
CREATE INDEX idx_journal_entries_source_hash ON journal_entries(source_document_hash) WHERE source_document_hash IS NOT NULL;

CREATE INDEX idx_journal_entry_lines_journal_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account_code ON journal_entry_lines(account_code);
CREATE INDEX idx_journal_entry_lines_line_number ON journal_entry_lines(journal_entry_id, line_number);

COMMENT ON TABLE journal_entries IS 'Journal entries header with double-entry validation and audit trail';
COMMENT ON TABLE journal_entry_lines IS 'Journal entry line items with account postings';
COMMENT ON COLUMN journal_entries.source_document_hash IS 'SHA256 hash of source document for idempotency (prevents duplicate postings)';
COMMENT ON COLUMN journal_entries.status IS 'DRAFT: can be edited/deleted, POSTED: immutable (can only reverse), REVERSED: reversed entry, CANCELLED: cancelled draft';

GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entry_lines TO aria_user;
