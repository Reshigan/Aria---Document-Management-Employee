-- GO-LIVE Migration: Additional tables and demo data for state-changing bots
-- This migration adds tables needed for Tier-1 bots and seeds demo data
-- Schema matches existing tables from migration 002_erp_tables.sql

-- ============================================
-- ADDITIONAL TABLES FOR STATE-CHANGING BOTS
-- ============================================

-- Tasks table for workflow automation
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  company_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  assigned_to TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Payments table for payment processing bot
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  company_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'eft',
  status TEXT NOT NULL DEFAULT 'pending',
  batch_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON tasks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_batch ON payments(batch_id);

-- ============================================
-- ADDITIONAL DEMO DATA FOR GO-LIVE
-- Uses existing demo data from migration 002, adds more records
-- ============================================

-- Additional demo quotes (approved status for sales order bot to convert)
INSERT OR IGNORE INTO quotes (id, company_id, quote_number, customer_id, quote_date, valid_until, status, total_amount, created_at)
VALUES 
  ('quote-go-live-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'QT-GL-001', 'cust-001', date('now'), date('now', '+30 days'), 'approved', 45000.00, datetime('now')),
  ('quote-go-live-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'QT-GL-002', 'cust-002', date('now'), date('now', '+30 days'), 'draft', 28000.00, datetime('now')),
  ('quote-go-live-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'QT-GL-003', 'cust-003', date('now'), date('now', '+30 days'), 'approved', 85000.00, datetime('now'));

-- Additional demo sales orders
INSERT OR IGNORE INTO sales_orders (id, company_id, order_number, customer_id, order_date, status, total_amount, created_at)
VALUES 
  ('so-go-live-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SO-GL-001', 'cust-001', date('now'), 'confirmed', 45000.00, datetime('now')),
  ('so-go-live-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SO-GL-002', 'cust-002', date('now'), 'shipped', 32000.00, datetime('now'));

-- Additional demo purchase orders (pending status for goods receipt bot)
INSERT OR IGNORE INTO purchase_orders (id, company_id, po_number, supplier_id, po_date, expected_delivery_date, status, total_amount, created_at)
VALUES 
  ('po-go-live-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PO-GL-001', 'supp-001', date('now'), date('now', '+14 days'), 'pending', 15000.00, datetime('now')),
  ('po-go-live-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PO-GL-002', 'supp-002', date('now'), date('now', '+21 days'), 'pending', 44000.00, datetime('now')),
  ('po-go-live-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'PO-GL-003', 'supp-003', date('now', '-7 days'), date('now'), 'received', 8500.00, datetime('now'));

-- Additional demo customer invoices (sent status for reconciliation and collections bots)
INSERT OR IGNORE INTO customer_invoices (id, company_id, invoice_number, customer_id, sales_order_id, invoice_date, due_date, status, total_amount, created_at)
VALUES 
  ('cinv-go-live-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'INV-GL-001', 'cust-001', 'so-go-live-001', date('now'), date('now', '+30 days'), 'sent', 45000.00, datetime('now')),
  ('cinv-go-live-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'INV-GL-002', 'cust-002', 'so-go-live-002', date('now', '-14 days'), date('now', '-7 days'), 'sent', 32000.00, datetime('now')),
  ('cinv-go-live-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'INV-GL-003', 'cust-003', NULL, date('now', '-7 days'), date('now', '+15 days'), 'sent', 18500.00, datetime('now')),
  ('cinv-go-live-004', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'INV-GL-004', 'cust-001', NULL, date('now', '-30 days'), date('now', '-14 days'), 'paid', 28000.00, datetime('now')),
  ('cinv-go-live-005', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'INV-GL-005', 'cust-002', NULL, date('now', '-45 days'), date('now', '-21 days'), 'sent', 12500.00, datetime('now'));

-- Additional demo supplier invoices (pending status for payment processing bot)
INSERT OR IGNORE INTO supplier_invoices (id, company_id, invoice_number, supplier_id, purchase_order_id, invoice_date, due_date, status, total_amount, created_at)
VALUES 
  ('sinv-go-live-001', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SI-GL-001', 'supp-003', 'po-go-live-003', date('now'), date('now', '+30 days'), 'pending', 8500.00, datetime('now')),
  ('sinv-go-live-002', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SI-GL-002', 'supp-001', NULL, date('now', '-7 days'), date('now', '+15 days'), 'pending', 5200.00, datetime('now')),
  ('sinv-go-live-003', 'b0598135-52fd-4f67-ac56-8f0237e6355e', 'SI-GL-003', 'supp-002', NULL, date('now', '-14 days'), date('now', '-7 days'), 'paid', 3800.00, datetime('now'));
