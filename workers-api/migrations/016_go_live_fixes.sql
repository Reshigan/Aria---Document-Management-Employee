-- Go-Live Fixes Migration
-- Adds pending_invoice_lines table for timesheet→invoice workflow

CREATE TABLE IF NOT EXISTS pending_invoice_lines (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 15,
    line_total REAL NOT NULL DEFAULT 0,
    source_type TEXT,
    source_id TEXT,
    project_id TEXT,
    date TEXT,
    invoice_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pending_invoice_lines_company ON pending_invoice_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_invoice_lines_source ON pending_invoice_lines(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_pending_invoice_lines_project ON pending_invoice_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_pending_invoice_lines_status ON pending_invoice_lines(status);
