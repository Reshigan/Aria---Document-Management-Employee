-- Migration 018: Database tables for new pages (60+ pages)
-- Adds tables for Financial, Operations, People, Services, and Compliance modules

-- ============================================
-- FINANCIAL MODULE - Additional Tables
-- ============================================

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  budget_code TEXT NOT NULL,
  budget_name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  department_id TEXT,
  cost_center TEXT,
  total_amount REAL DEFAULT 0,
  allocated_amount REAL DEFAULT 0,
  spent_amount REAL DEFAULT 0,
  remaining_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, approved, active, closed
  approved_by TEXT,
  approved_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, budget_code, fiscal_year)
);

-- Budget Lines (monthly breakdown)
CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id TEXT,
  period TEXT NOT NULL, -- YYYY-MM
  budgeted_amount REAL DEFAULT 0,
  actual_amount REAL DEFAULT 0,
  variance REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  cost_center_code TEXT NOT NULL,
  cost_center_name TEXT NOT NULL,
  parent_id TEXT,
  manager_id TEXT,
  department_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, cost_center_code)
);

-- Payment Batches
CREATE TABLE IF NOT EXISTS payment_batches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  batch_date TEXT NOT NULL,
  bank_account_id TEXT,
  payment_method TEXT DEFAULT 'eft', -- eft, cheque, cash
  total_amount REAL DEFAULT 0,
  payment_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, pending_approval, approved, processed, cancelled
  approved_by TEXT,
  approved_at TEXT,
  processed_by TEXT,
  processed_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, batch_number)
);

-- Payment Batch Items
CREATE TABLE IF NOT EXISTS payment_batch_items (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
  supplier_id TEXT,
  invoice_id TEXT,
  amount REAL NOT NULL,
  reference TEXT,
  status TEXT DEFAULT 'pending', -- pending, processed, failed
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Expense Claims
CREATE TABLE IF NOT EXISTS expense_claims (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  claim_number TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  claim_date TEXT NOT NULL,
  description TEXT,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'draft', -- draft, submitted, approved, rejected, paid
  submitted_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  rejected_reason TEXT,
  paid_at TEXT,
  payment_reference TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, claim_number)
);

-- Expense Claim Lines
CREATE TABLE IF NOT EXISTS expense_claim_lines (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL, -- travel, meals, accommodation, supplies, other
  description TEXT,
  amount REAL NOT NULL,
  receipt_url TEXT,
  is_billable INTEGER DEFAULT 0,
  project_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Credit Notes
CREATE TABLE IF NOT EXISTS credit_notes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  credit_note_number TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  invoice_id TEXT, -- Original invoice if applicable
  credit_note_date TEXT NOT NULL,
  reason TEXT,
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'draft', -- draft, issued, applied, cancelled
  applied_amount REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, credit_note_number)
);

-- Collections (AR Collections tracking)
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  collection_number TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  invoice_id TEXT,
  contact_date TEXT NOT NULL,
  contact_method TEXT, -- phone, email, letter, visit
  contact_person TEXT,
  amount_outstanding REAL DEFAULT 0,
  promise_to_pay_date TEXT,
  promise_to_pay_amount REAL,
  outcome TEXT, -- promised, partial, disputed, no_response, paid
  follow_up_date TEXT,
  assigned_to TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, collection_number)
);

-- Cash Forecasts
CREATE TABLE IF NOT EXISTS cash_forecasts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  forecast_name TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  opening_balance REAL DEFAULT 0,
  projected_inflows REAL DEFAULT 0,
  projected_outflows REAL DEFAULT 0,
  closing_balance REAL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, final
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Cash Forecast Lines
CREATE TABLE IF NOT EXISTS cash_forecast_lines (
  id TEXT PRIMARY KEY,
  forecast_id TEXT NOT NULL REFERENCES cash_forecasts(id) ON DELETE CASCADE,
  line_date TEXT NOT NULL,
  category TEXT NOT NULL, -- ar_receipts, ap_payments, payroll, other_income, other_expense
  description TEXT,
  amount REAL NOT NULL,
  is_confirmed INTEGER DEFAULT 0,
  source_type TEXT, -- invoice, bill, payroll_run, manual
  source_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Bank Transfers
CREATE TABLE IF NOT EXISTS bank_transfers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  transfer_number TEXT NOT NULL,
  transfer_date TEXT NOT NULL,
  from_account_id TEXT NOT NULL,
  to_account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  exchange_rate REAL DEFAULT 1,
  reference TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  completed_at TEXT,
  journal_entry_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, transfer_number)
);

-- ============================================
-- OPERATIONS MODULE - Additional Tables
-- ============================================

-- Price Lists
CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  price_list_code TEXT NOT NULL,
  price_list_name TEXT NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  is_default INTEGER DEFAULT 0,
  valid_from TEXT,
  valid_to TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, price_list_code)
);

-- Price List Items
CREATE TABLE IF NOT EXISTS price_list_items (
  id TEXT PRIMARY KEY,
  price_list_id TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  unit_price REAL NOT NULL,
  min_quantity REAL DEFAULT 1,
  discount_percent REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Discounts
CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  discount_code TEXT NOT NULL,
  discount_name TEXT NOT NULL,
  discount_type TEXT NOT NULL, -- percentage, fixed, buy_x_get_y
  discount_value REAL NOT NULL,
  applies_to TEXT DEFAULT 'all', -- all, category, product, customer
  applies_to_id TEXT,
  min_order_amount REAL,
  max_discount_amount REAL,
  valid_from TEXT,
  valid_to TEXT,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, discount_code)
);

-- Sales Targets
CREATE TABLE IF NOT EXISTS sales_targets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  target_period TEXT NOT NULL, -- YYYY or YYYY-MM
  target_type TEXT NOT NULL, -- revenue, units, customers
  employee_id TEXT,
  team_id TEXT,
  product_category TEXT,
  target_amount REAL NOT NULL,
  achieved_amount REAL DEFAULT 0,
  achievement_percent REAL DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, achieved, missed
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Commissions
CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  period TEXT NOT NULL, -- YYYY-MM
  sales_amount REAL DEFAULT 0,
  commission_rate REAL NOT NULL,
  commission_amount REAL DEFAULT 0,
  adjustments REAL DEFAULT 0,
  final_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'calculated', -- calculated, approved, paid
  approved_by TEXT,
  approved_at TEXT,
  paid_at TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  adjustment_number TEXT NOT NULL,
  adjustment_date TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  adjustment_type TEXT NOT NULL, -- count, damage, theft, expiry, other
  reason TEXT,
  status TEXT DEFAULT 'draft', -- draft, pending_approval, approved, posted
  approved_by TEXT,
  approved_at TEXT,
  journal_entry_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, adjustment_number)
);

-- Stock Adjustment Lines
CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
  id TEXT PRIMARY KEY,
  adjustment_id TEXT NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  system_quantity REAL DEFAULT 0,
  counted_quantity REAL DEFAULT 0,
  adjustment_quantity REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  transfer_number TEXT NOT NULL,
  transfer_date TEXT NOT NULL,
  from_warehouse_id TEXT NOT NULL,
  to_warehouse_id TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, in_transit, received, cancelled
  shipped_at TEXT,
  received_at TEXT,
  shipped_by TEXT,
  received_by TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, transfer_number)
);

-- Stock Transfer Lines
CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity_requested REAL NOT NULL,
  quantity_shipped REAL DEFAULT 0,
  quantity_received REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Reorder Points
CREATE TABLE IF NOT EXISTS reorder_points (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT,
  reorder_level REAL NOT NULL,
  reorder_quantity REAL NOT NULL,
  max_stock_level REAL,
  lead_time_days INTEGER DEFAULT 7,
  safety_stock REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_reorder_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, product_id, warehouse_id)
);

-- Purchase Requisitions
CREATE TABLE IF NOT EXISTS requisitions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  requisition_number TEXT NOT NULL,
  requisition_date TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  department_id TEXT,
  required_date TEXT,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'draft', -- draft, submitted, approved, rejected, converted
  approved_by TEXT,
  approved_at TEXT,
  purchase_order_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, requisition_number)
);

-- Requisition Lines
CREATE TABLE IF NOT EXISTS requisition_lines (
  id TEXT PRIMARY KEY,
  requisition_id TEXT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  product_id TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_of_measure TEXT DEFAULT 'Each',
  estimated_unit_price REAL,
  estimated_total REAL,
  preferred_supplier_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- RFQs (Request for Quotation)
CREATE TABLE IF NOT EXISTS rfqs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  rfq_number TEXT NOT NULL,
  rfq_date TEXT NOT NULL,
  requisition_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  submission_deadline TEXT,
  status TEXT DEFAULT 'draft', -- draft, sent, received, evaluated, awarded, cancelled
  awarded_supplier_id TEXT,
  awarded_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, rfq_number)
);

-- RFQ Suppliers (suppliers invited to quote)
CREATE TABLE IF NOT EXISTS rfq_suppliers (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  sent_at TEXT,
  response_received_at TEXT,
  quoted_amount REAL,
  delivery_days INTEGER,
  payment_terms TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, quoted, declined
  created_at TEXT DEFAULT (datetime('now'))
);

-- Supplier Portal Access
CREATE TABLE IF NOT EXISTS supplier_portal_access (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  user_id TEXT,
  email TEXT NOT NULL,
  access_token TEXT,
  token_expires_at TEXT,
  last_login_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, supplier_id, email)
);

-- Production Plans
CREATE TABLE IF NOT EXISTS production_plans (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  plan_number TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_period TEXT NOT NULL, -- YYYY-MM or YYYY-Qn
  status TEXT DEFAULT 'draft', -- draft, approved, in_progress, completed
  total_planned_quantity REAL DEFAULT 0,
  total_completed_quantity REAL DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, plan_number)
);

-- Production Plan Lines
CREATE TABLE IF NOT EXISTS production_plan_lines (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  planned_quantity REAL NOT NULL,
  completed_quantity REAL DEFAULT 0,
  planned_start_date TEXT,
  planned_end_date TEXT,
  work_order_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Machine Maintenance
CREATE TABLE IF NOT EXISTS machine_maintenance (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  maintenance_number TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL, -- preventive, corrective, predictive
  scheduled_date TEXT,
  completed_date TEXT,
  technician_id TEXT,
  description TEXT,
  parts_used TEXT, -- JSON array
  labor_hours REAL DEFAULT 0,
  parts_cost REAL DEFAULT 0,
  labor_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  next_maintenance_date TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, maintenance_number)
);

-- ============================================
-- PEOPLE MODULE - Additional Tables
-- ============================================

-- Positions (Job Positions)
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  position_code TEXT NOT NULL,
  position_title TEXT NOT NULL,
  department_id TEXT,
  reports_to_position_id TEXT,
  job_description TEXT,
  requirements TEXT,
  min_salary REAL,
  max_salary REAL,
  headcount INTEGER DEFAULT 1,
  filled_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, position_code)
);

-- Salary Structures
CREATE TABLE IF NOT EXISTS salary_structures (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  structure_code TEXT NOT NULL,
  structure_name TEXT NOT NULL,
  base_salary REAL NOT NULL,
  housing_allowance REAL DEFAULT 0,
  transport_allowance REAL DEFAULT 0,
  medical_allowance REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  total_package REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, structure_code)
);

-- Deductions (Payroll Deductions)
CREATE TABLE IF NOT EXISTS deductions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  deduction_code TEXT NOT NULL,
  deduction_name TEXT NOT NULL,
  deduction_type TEXT NOT NULL, -- statutory, voluntary, loan, garnishment
  calculation_type TEXT NOT NULL, -- fixed, percentage, tiered
  amount REAL,
  percentage REAL,
  max_amount REAL,
  is_pre_tax INTEGER DEFAULT 0,
  is_employer_contribution INTEGER DEFAULT 0,
  employer_amount REAL,
  employer_percentage REAL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, deduction_code)
);

-- Employee Deductions (link employees to deductions)
CREATE TABLE IF NOT EXISTS employee_deductions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  deduction_id TEXT NOT NULL,
  amount REAL,
  percentage REAL,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(employee_id, deduction_id)
);

-- PAYE Returns
CREATE TABLE IF NOT EXISTS paye_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  return_period TEXT NOT NULL, -- YYYY-MM
  submission_date TEXT,
  total_employees INTEGER DEFAULT 0,
  total_gross_remuneration REAL DEFAULT 0,
  total_paye REAL DEFAULT 0,
  total_uif_employee REAL DEFAULT 0,
  total_uif_employer REAL DEFAULT 0,
  total_sdl REAL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, calculated, submitted, accepted
  emp201_reference TEXT,
  submitted_at TEXT,
  submitted_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, return_period)
);

-- UIF Returns
CREATE TABLE IF NOT EXISTS uif_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  return_period TEXT NOT NULL, -- YYYY-MM
  submission_date TEXT,
  total_employees INTEGER DEFAULT 0,
  total_remuneration REAL DEFAULT 0,
  total_uif_employee REAL DEFAULT 0,
  total_uif_employer REAL DEFAULT 0,
  total_uif REAL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, calculated, submitted, accepted
  uif_reference TEXT,
  submitted_at TEXT,
  submitted_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, return_period)
);

-- Job Postings
CREATE TABLE IF NOT EXISTS job_postings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  job_code TEXT NOT NULL,
  position_id TEXT,
  job_title TEXT NOT NULL,
  department_id TEXT,
  location TEXT,
  employment_type TEXT DEFAULT 'permanent', -- permanent, contract, temporary, intern
  description TEXT,
  requirements TEXT,
  salary_range_min REAL,
  salary_range_max REAL,
  show_salary INTEGER DEFAULT 0,
  posted_date TEXT,
  closing_date TEXT,
  status TEXT DEFAULT 'draft', -- draft, open, closed, filled, cancelled
  applicant_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, job_code)
);

-- Applicants
CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  applicant_number TEXT NOT NULL,
  job_posting_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  cover_letter TEXT,
  source TEXT, -- website, linkedin, referral, agency
  applied_date TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- new, screening, interview, offer, hired, rejected
  rating INTEGER, -- 1-5
  interview_date TEXT,
  interviewer_id TEXT,
  interview_notes TEXT,
  offer_amount REAL,
  offer_date TEXT,
  hired_date TEXT,
  rejection_reason TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, applicant_number)
);

-- Onboarding Tasks
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_category TEXT, -- documentation, training, equipment, access, introduction
  description TEXT,
  assigned_to TEXT,
  due_date TEXT,
  completed_date TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, skipped
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  review_period TEXT NOT NULL, -- YYYY or YYYY-Qn
  reviewer_id TEXT,
  review_date TEXT,
  overall_rating INTEGER, -- 1-5
  goals_achieved INTEGER DEFAULT 0,
  goals_total INTEGER DEFAULT 0,
  strengths TEXT,
  improvements TEXT,
  comments TEXT,
  employee_comments TEXT,
  status TEXT DEFAULT 'draft', -- draft, self_review, manager_review, completed, acknowledged
  acknowledged_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Training Courses
CREATE TABLE IF NOT EXISTS training_courses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  category TEXT, -- technical, soft_skills, compliance, leadership, safety
  description TEXT,
  duration_hours REAL,
  instructor TEXT,
  max_participants INTEGER,
  is_mandatory INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, course_code)
);

-- Training Sessions
CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES training_courses(id),
  session_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  instructor TEXT,
  max_participants INTEGER,
  enrolled_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Training Enrollments
CREATE TABLE IF NOT EXISTS training_enrollments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES training_sessions(id),
  employee_id TEXT NOT NULL,
  enrolled_date TEXT NOT NULL,
  attended INTEGER DEFAULT 0,
  completion_date TEXT,
  score REAL,
  certificate_url TEXT,
  status TEXT DEFAULT 'enrolled', -- enrolled, attended, completed, no_show, cancelled
  created_at TEXT DEFAULT (datetime('now'))
);

-- Skills Matrix
CREATE TABLE IF NOT EXISTS employee_skills (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_category TEXT,
  proficiency_level INTEGER DEFAULT 1, -- 1-5 (Beginner to Expert)
  certified INTEGER DEFAULT 0,
  certification_date TEXT,
  certification_expiry TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(employee_id, skill_name)
);

-- ============================================
-- SERVICES MODULE - Additional Tables
-- ============================================

-- Route Plans
CREATE TABLE IF NOT EXISTS route_plans (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  route_number TEXT NOT NULL,
  route_date TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  vehicle_id TEXT,
  start_location TEXT,
  end_location TEXT,
  total_stops INTEGER DEFAULT 0,
  total_distance REAL DEFAULT 0,
  estimated_duration REAL DEFAULT 0,
  actual_duration REAL,
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  started_at TEXT,
  completed_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, route_number)
);

-- Route Stops
CREATE TABLE IF NOT EXISTS route_stops (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  service_order_id TEXT,
  customer_id TEXT,
  address TEXT NOT NULL,
  scheduled_arrival TEXT,
  actual_arrival TEXT,
  scheduled_departure TEXT,
  actual_departure TEXT,
  status TEXT DEFAULT 'pending', -- pending, arrived, completed, skipped
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Service Contracts
CREATE TABLE IF NOT EXISTS service_contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  contract_number TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  contract_name TEXT NOT NULL,
  contract_type TEXT, -- maintenance, support, warranty, sla
  start_date TEXT NOT NULL,
  end_date TEXT,
  billing_frequency TEXT DEFAULT 'monthly', -- monthly, quarterly, annually
  contract_value REAL DEFAULT 0,
  monthly_value REAL DEFAULT 0,
  response_time_hours INTEGER,
  resolution_time_hours INTEGER,
  included_visits INTEGER,
  used_visits INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, active, expired, cancelled
  auto_renew INTEGER DEFAULT 0,
  renewal_notice_days INTEGER DEFAULT 30,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, contract_number)
);

-- Knowledge Base Articles
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  article_code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  tags TEXT, -- JSON array
  is_public INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  published_at TEXT,
  author_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, article_code)
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS project_milestones (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  milestone_code TEXT NOT NULL,
  milestone_name TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  completed_date TEXT,
  budget REAL DEFAULT 0,
  actual_cost REAL DEFAULT 0,
  deliverables TEXT,
  owner_id TEXT,
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed, delayed
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- COMPLIANCE MODULE - Additional Tables
-- ============================================

-- VAT Returns (extends tax_returns for SA-specific)
CREATE TABLE IF NOT EXISTS vat_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  return_period TEXT NOT NULL, -- YYYY-MM
  vat_period TEXT, -- Category A (monthly), B (bi-monthly), C (6-monthly)
  output_vat_standard REAL DEFAULT 0,
  output_vat_zero_rated REAL DEFAULT 0,
  output_vat_exempt REAL DEFAULT 0,
  input_vat REAL DEFAULT 0,
  net_vat REAL DEFAULT 0,
  adjustments REAL DEFAULT 0,
  amount_payable REAL DEFAULT 0,
  amount_refundable REAL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, calculated, submitted, paid
  vat201_reference TEXT,
  submitted_at TEXT,
  submitted_by TEXT,
  paid_at TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, return_period)
);

-- B-BBEE Scorecards
CREATE TABLE IF NOT EXISTS bbbee_scorecards (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  scorecard_year INTEGER NOT NULL,
  verification_date TEXT,
  certificate_number TEXT,
  certificate_expiry TEXT,
  overall_score REAL DEFAULT 0,
  bbbee_level INTEGER, -- 1-8 or NC (non-compliant)
  ownership_score REAL DEFAULT 0,
  management_control_score REAL DEFAULT 0,
  skills_development_score REAL DEFAULT 0,
  enterprise_development_score REAL DEFAULT 0,
  supplier_development_score REAL DEFAULT 0,
  socio_economic_score REAL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, verified, expired
  verification_agency TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, scorecard_year)
);

-- Controlled Documents
CREATE TABLE IF NOT EXISTS controlled_documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  document_number TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT, -- policy, sop, work_instruction, form, template
  version TEXT DEFAULT '1.0',
  description TEXT,
  content_url TEXT,
  owner_id TEXT,
  effective_date TEXT,
  review_date TEXT,
  approver_id TEXT,
  approved_at TEXT,
  status TEXT DEFAULT 'draft', -- draft, pending_approval, approved, expired, superseded
  superseded_by TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, document_number, version)
);

-- Policy Acknowledgements
CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES policies(id),
  employee_id TEXT NOT NULL,
  acknowledged_at TEXT NOT NULL,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(policy_id, employee_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_budgets_company ON budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_batches_company ON payment_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_company ON expense_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_company ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_collections_company ON collections(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_forecasts_company ON cash_forecasts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_company ON bank_transfers(company_id);

-- Operations indexes
CREATE INDEX IF NOT EXISTS idx_price_lists_company ON price_lists(company_id);
CREATE INDEX IF NOT EXISTS idx_discounts_company ON discounts(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_company ON sales_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_company ON commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_company ON stock_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_company ON stock_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_reorder_points_company ON reorder_points(company_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_company ON requisitions(company_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_company ON rfqs(company_id);
CREATE INDEX IF NOT EXISTS idx_production_plans_company ON production_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_maintenance_company ON machine_maintenance(company_id);

-- People indexes
CREATE INDEX IF NOT EXISTS idx_positions_company ON positions(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_company ON salary_structures(company_id);
CREATE INDEX IF NOT EXISTS idx_deductions_company ON deductions(company_id);
CREATE INDEX IF NOT EXISTS idx_paye_returns_company ON paye_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_uif_returns_company ON uif_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_company ON job_postings(company_id);
CREATE INDEX IF NOT EXISTS idx_applicants_company ON applicants(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_employee ON onboarding_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_company ON training_courses(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON employee_skills(employee_id);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_route_plans_company ON route_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_service_contracts_company ON service_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_company ON knowledge_base_articles(company_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_vat_returns_company ON vat_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_bbbee_scorecards_company ON bbbee_scorecards(company_id);
CREATE INDEX IF NOT EXISTS idx_controlled_documents_company ON controlled_documents(company_id);

-- ============================================
-- BOT CONFIGURATIONS FOR NEW MODULES
-- ============================================

-- Insert bot configurations for new page bots (will be enabled per company)
-- These are template configurations that can be copied to bot_configs for each company

-- Note: Bot configurations are inserted per-company in the application layer
-- The following are the bot definitions that should be available:

-- Financial Module Bots:
-- budget_monitoring - Monitors budget utilization and creates alerts when over 90%
-- expense_claim - Auto-approves expense claims under configurable threshold
-- collections - Creates collection records for overdue invoices
-- cash_forecast - Generates 30-day cash flow forecasts
-- payment_batch - Creates payment batches for due supplier invoices

-- Operations Module Bots:
-- requisition - Auto-approves requisitions under configurable threshold
-- reorder_point - Monitors stock levels and creates reorder alerts
-- stock_transfer - Auto-receives stock transfers after transit period
-- sales_target - Updates sales target achievements
-- commission - Calculates sales commissions
-- maintenance_schedule - Schedules preventive maintenance for machines

-- People Module Bots:
-- performance_review - Creates quarterly performance review records
-- onboarding - Creates onboarding tasks for new employees
-- training_reminder - Creates reminders for upcoming training sessions

-- Services Module Bots:
-- route_optimization - Creates optimized route plans for field service
-- service_contract_renewal - Alerts for expiring service contracts

-- Compliance Module Bots:
-- vat_return - Generates monthly VAT return drafts
-- document_control - Alerts for documents due for review
