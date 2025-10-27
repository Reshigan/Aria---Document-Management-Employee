-- Performance Optimization: Database Indexes
-- Day 7: Final Polish
-- Target: API response <200ms (95th percentile)

-- Financial Module Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_date ON invoices(tenant_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date ON payments(tenant_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- CRM Module Indexes
CREATE INDEX IF NOT EXISTS idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_date ON quotes(tenant_id, quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_stage ON opportunities(tenant_id, stage);

-- Procurement Module Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_date ON purchase_orders(tenant_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_name ON suppliers(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- HR Module Indexes
CREATE INDEX IF NOT EXISTS idx_employees_tenant_name ON employees(tenant_id, first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_period ON payroll_runs(tenant_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll_items(employee_id);

-- Document Module Indexes
CREATE INDEX IF NOT EXISTS idx_documents_tenant_type ON documents(tenant_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);

-- Audit & Activity Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Bot Activity Indexes
CREATE INDEX IF NOT EXISTS idx_bot_runs_tenant_date ON bot_runs(tenant_id, run_date DESC);
CREATE INDEX IF NOT EXISTS idx_bot_runs_bot_type ON bot_runs(bot_type);
CREATE INDEX IF NOT EXISTS idx_bot_runs_status ON bot_runs(status);

-- Composite Indexes for Common Queries
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status_date ON invoices(tenant_id, status, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status_date ON payments(tenant_id, status, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_status_name ON employees(tenant_id, status, first_name, last_name);

-- Full-text Search Indexes (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_customers_name_fts ON customers USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_name_fts ON products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_suppliers_name_fts ON suppliers USING gin(to_tsvector('english', name));

COMMENT ON INDEX idx_invoices_tenant_date IS 'Performance: Invoice list queries';
COMMENT ON INDEX idx_payments_tenant_date IS 'Performance: Payment list queries';
COMMENT ON INDEX idx_employees_tenant_name IS 'Performance: Employee search queries';
COMMENT ON INDEX idx_documents_tenant_type IS 'Performance: Document filtering queries';
