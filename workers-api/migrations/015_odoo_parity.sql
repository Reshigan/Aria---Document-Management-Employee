-- Migration 015: Odoo Parity Features
-- Product Hierarchy, Pricing Engine, Service Fulfillment, Helpdesk, Field Service

-- ============================================
-- PRODUCT HIERARCHY & VARIANTS
-- ============================================

-- Multi-level product categories (tree structure)
CREATE TABLE IF NOT EXISTS product_category_tree (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  parent_id TEXT REFERENCES product_category_tree(id),
  level INTEGER DEFAULT 0,
  path TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_category_tree_company ON product_category_tree(company_id);
CREATE INDEX IF NOT EXISTS idx_product_category_tree_parent ON product_category_tree(parent_id);

-- Product templates (base products with variants)
CREATE TABLE IF NOT EXISTS product_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku_prefix TEXT,
  description TEXT,
  category_id TEXT REFERENCES product_category_tree(id),
  product_type TEXT CHECK(product_type IN ('physical', 'service', 'consumable', 'bundle')) DEFAULT 'physical',
  list_price REAL DEFAULT 0,
  cost_price REAL DEFAULT 0,
  can_be_sold INTEGER DEFAULT 1,
  can_be_purchased INTEGER DEFAULT 1,
  track_inventory INTEGER DEFAULT 1,
  weight REAL,
  volume REAL,
  uom_id TEXT,
  purchase_uom_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_templates_company ON product_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_product_templates_category ON product_templates(category_id);

-- Product attributes (e.g., Size, Color)
CREATE TABLE IF NOT EXISTS product_attributes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_type TEXT CHECK(display_type IN ('radio', 'select', 'color', 'pills')) DEFAULT 'select',
  create_variant TEXT CHECK(create_variant IN ('always', 'dynamic', 'no_variant')) DEFAULT 'always',
  sequence INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_attributes_company ON product_attributes(company_id);

-- Attribute values (e.g., Small, Medium, Large for Size)
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id TEXT PRIMARY KEY,
  attribute_id TEXT NOT NULL REFERENCES product_attributes(id),
  name TEXT NOT NULL,
  html_color TEXT,
  sequence INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_attribute_values_attr ON product_attribute_values(attribute_id);

-- Template-Attribute lines (which attributes apply to which template)
CREATE TABLE IF NOT EXISTS product_template_attribute_lines (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES product_templates(id),
  attribute_id TEXT NOT NULL REFERENCES product_attributes(id),
  value_ids TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_template_attr_lines_template ON product_template_attribute_lines(template_id);

-- Product variants (actual sellable products)
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES product_templates(id),
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  attribute_value_ids TEXT,
  list_price REAL,
  cost_price REAL,
  weight REAL,
  volume REAL,
  quantity_on_hand REAL DEFAULT 0,
  quantity_reserved REAL DEFAULT 0,
  quantity_available REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_variants_company ON product_variants(company_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_template ON product_variants(template_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

-- ============================================
-- PRICING ENGINE
-- ============================================

-- Customer groups/segments
CREATE TABLE IF NOT EXISTS customer_groups (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_groups_company ON customer_groups(company_id);

-- Customer-group membership
CREATE TABLE IF NOT EXISTS customer_group_members (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  group_id TEXT NOT NULL REFERENCES customer_groups(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_group_members_customer ON customer_group_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_group ON customer_group_members(group_id);

-- Pricelists
CREATE TABLE IF NOT EXISTS pricelists (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  currency TEXT DEFAULT 'USD',
  is_default INTEGER DEFAULT 0,
  customer_group_id TEXT REFERENCES customer_groups(id),
  valid_from TEXT,
  valid_to TEXT,
  priority INTEGER DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricelists_company ON pricelists(company_id);
CREATE INDEX IF NOT EXISTS idx_pricelists_group ON pricelists(customer_group_id);

-- Pricelist rules
CREATE TABLE IF NOT EXISTS pricelist_rules (
  id TEXT PRIMARY KEY,
  pricelist_id TEXT NOT NULL REFERENCES pricelists(id),
  name TEXT,
  applied_on TEXT CHECK(applied_on IN ('all', 'category', 'template', 'variant')) DEFAULT 'all',
  category_id TEXT REFERENCES product_category_tree(id),
  template_id TEXT REFERENCES product_templates(id),
  variant_id TEXT REFERENCES product_variants(id),
  min_quantity REAL DEFAULT 1,
  compute_price TEXT CHECK(compute_price IN ('fixed', 'percentage', 'formula')) DEFAULT 'fixed',
  fixed_price REAL,
  percent_discount REAL,
  base TEXT CHECK(base IN ('list_price', 'cost_price', 'other_pricelist')) DEFAULT 'list_price',
  base_pricelist_id TEXT REFERENCES pricelists(id),
  price_surcharge REAL DEFAULT 0,
  price_round REAL,
  price_min_margin REAL,
  price_max_margin REAL,
  valid_from TEXT,
  valid_to TEXT,
  sequence INTEGER DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pricelist_rules_pricelist ON pricelist_rules(pricelist_id);
CREATE INDEX IF NOT EXISTS idx_pricelist_rules_category ON pricelist_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_pricelist_rules_template ON pricelist_rules(template_id);

-- Customer pricelist assignments
CREATE TABLE IF NOT EXISTS customer_pricelists (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  pricelist_id TEXT NOT NULL REFERENCES pricelists(id),
  is_default INTEGER DEFAULT 0,
  valid_from TEXT,
  valid_to TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_pricelists_customer ON customer_pricelists(customer_id);

-- Contract pricing (special agreements)
CREATE TABLE IF NOT EXISTS contract_prices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  variant_id TEXT REFERENCES product_variants(id),
  template_id TEXT REFERENCES product_templates(id),
  fixed_price REAL NOT NULL,
  min_quantity REAL DEFAULT 1,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL,
  contract_reference TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contract_prices_customer ON contract_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_contract_prices_variant ON contract_prices(variant_id);

-- Price history/audit
CREATE TABLE IF NOT EXISTS price_audit_log (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  order_line_id TEXT,
  variant_id TEXT,
  customer_id TEXT,
  quantity REAL,
  unit_price REAL,
  rule_applied TEXT,
  pricelist_id TEXT,
  explanation TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_audit_log_order ON price_audit_log(order_line_id);

-- ============================================
-- SERVICE FULFILLMENT
-- ============================================

-- Service projects
CREATE TABLE IF NOT EXISTS service_projects (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  sales_order_id TEXT,
  status TEXT CHECK(status IN ('draft', 'in_progress', 'on_hold', 'completed', 'cancelled')) DEFAULT 'draft',
  start_date TEXT,
  end_date TEXT,
  budget_hours REAL,
  budget_amount REAL,
  billing_type TEXT CHECK(billing_type IN ('fixed', 'time_materials', 'milestone')) DEFAULT 'time_materials',
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_projects_company ON service_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_service_projects_customer ON service_projects(customer_id);

-- Service milestones
CREATE TABLE IF NOT EXISTS service_milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES service_projects(id),
  name TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  amount REAL,
  percentage REAL,
  status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'invoiced')) DEFAULT 'pending',
  completed_at TEXT,
  invoice_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_milestones_project ON service_milestones(project_id);

-- Timesheets
CREATE TABLE IF NOT EXISTS timesheets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  project_id TEXT REFERENCES service_projects(id),
  task_description TEXT,
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  hourly_rate REAL,
  billable INTEGER DEFAULT 1,
  status TEXT CHECK(status IN ('draft', 'submitted', 'approved', 'invoiced', 'rejected')) DEFAULT 'draft',
  approved_by TEXT,
  approved_at TEXT,
  invoice_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timesheets_company ON timesheets(company_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_project ON timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(date);

-- Service deliverables
CREATE TABLE IF NOT EXISTS service_deliverables (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES service_projects(id),
  name TEXT NOT NULL,
  description TEXT,
  quantity REAL DEFAULT 1,
  unit_price REAL,
  status TEXT CHECK(status IN ('pending', 'delivered', 'accepted', 'rejected')) DEFAULT 'pending',
  delivered_at TEXT,
  accepted_at TEXT,
  accepted_by TEXT,
  invoice_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_deliverables_project ON service_deliverables(project_id);

-- ============================================
-- HELPDESK
-- ============================================

-- Helpdesk teams
CREATE TABLE IF NOT EXISTS helpdesk_teams (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email_alias TEXT,
  description TEXT,
  manager_id TEXT,
  auto_assign INTEGER DEFAULT 0,
  assignment_method TEXT CHECK(assignment_method IN ('manual', 'round_robin', 'load_balanced')) DEFAULT 'manual',
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_teams_company ON helpdesk_teams(company_id);

-- Helpdesk team members
CREATE TABLE IF NOT EXISTS helpdesk_team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES helpdesk_teams(id),
  user_id TEXT NOT NULL,
  is_leader INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_team_members_team ON helpdesk_team_members(team_id);

-- Ticket stages
CREATE TABLE IF NOT EXISTS helpdesk_stages (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES helpdesk_teams(id),
  name TEXT NOT NULL,
  sequence INTEGER DEFAULT 0,
  is_close_stage INTEGER DEFAULT 0,
  fold INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_stages_team ON helpdesk_stages(team_id);

-- SLA policies
CREATE TABLE IF NOT EXISTS helpdesk_sla_policies (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES helpdesk_teams(id),
  name TEXT NOT NULL,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  ticket_type TEXT,
  time_to_first_response_hours REAL,
  time_to_resolve_hours REAL,
  target_stage_id TEXT REFERENCES helpdesk_stages(id),
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_sla_team ON helpdesk_sla_policies(team_id);

-- Helpdesk tickets
CREATE TABLE IF NOT EXISTS helpdesk_tickets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  team_id TEXT NOT NULL REFERENCES helpdesk_teams(id),
  ticket_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  customer_id TEXT,
  customer_email TEXT,
  customer_name TEXT,
  contact_id TEXT,
  assigned_to TEXT,
  stage_id TEXT REFERENCES helpdesk_stages(id),
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  ticket_type TEXT,
  source TEXT CHECK(source IN ('email', 'web', 'phone', 'chat', 'api')) DEFAULT 'web',
  sla_policy_id TEXT REFERENCES helpdesk_sla_policies(id),
  sla_deadline TEXT,
  sla_first_response_deadline TEXT,
  sla_first_response_at TEXT,
  sla_status TEXT CHECK(sla_status IN ('on_track', 'at_risk', 'breached', 'achieved')) DEFAULT 'on_track',
  closed_at TEXT,
  closed_by TEXT,
  rating INTEGER,
  rating_comment TEXT,
  tags TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_company ON helpdesk_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_team ON helpdesk_tickets(team_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_customer ON helpdesk_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_assigned ON helpdesk_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_stage ON helpdesk_tickets(stage_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_number ON helpdesk_tickets(ticket_number);

-- Ticket messages
CREATE TABLE IF NOT EXISTS helpdesk_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES helpdesk_tickets(id),
  author_id TEXT,
  author_name TEXT,
  author_email TEXT,
  message_type TEXT CHECK(message_type IN ('comment', 'internal_note', 'email_in', 'email_out')) DEFAULT 'comment',
  body TEXT NOT NULL,
  attachments TEXT,
  is_internal INTEGER DEFAULT 0,
  email_message_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_messages_ticket ON helpdesk_messages(ticket_id);

-- Ticket activity log
CREATE TABLE IF NOT EXISTS helpdesk_activity_log (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES helpdesk_tickets(id),
  user_id TEXT,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_activity_ticket ON helpdesk_activity_log(ticket_id);

-- ============================================
-- FIELD SERVICE
-- ============================================

-- Field service locations
CREATE TABLE IF NOT EXISTS field_service_locations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  customer_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude REAL,
  longitude REAL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  access_instructions TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_field_locations_company ON field_service_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_field_locations_customer ON field_service_locations(customer_id);

-- Field technicians
CREATE TABLE IF NOT EXISTS field_technicians (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  skills TEXT,
  certifications TEXT,
  home_location_id TEXT REFERENCES field_service_locations(id),
  max_jobs_per_day INTEGER DEFAULT 8,
  hourly_rate REAL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_field_technicians_company ON field_technicians(company_id);

-- Field service orders (work orders)
CREATE TABLE IF NOT EXISTS field_service_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  location_id TEXT REFERENCES field_service_locations(id),
  sales_order_id TEXT,
  helpdesk_ticket_id TEXT REFERENCES helpdesk_tickets(id),
  service_type TEXT,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('draft', 'scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
  scheduled_date TEXT,
  scheduled_time_start TEXT,
  scheduled_time_end TEXT,
  estimated_duration_hours REAL,
  assigned_technician_id TEXT REFERENCES field_technicians(id),
  description TEXT,
  customer_notes TEXT,
  internal_notes TEXT,
  started_at TEXT,
  completed_at TEXT,
  customer_signature TEXT,
  rating INTEGER,
  rating_comment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_field_orders_company ON field_service_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_field_orders_customer ON field_service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_field_orders_technician ON field_service_orders(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_field_orders_date ON field_service_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_field_orders_status ON field_service_orders(status);

-- Field service tasks (checklist items)
CREATE TABLE IF NOT EXISTS field_service_tasks (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES field_service_orders(id),
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER DEFAULT 0,
  is_required INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  completed_by TEXT,
  notes TEXT,
  photo_urls TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_field_tasks_order ON field_service_tasks(order_id);

-- Field service time entries
CREATE TABLE IF NOT EXISTS field_service_time_entries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES field_service_orders(id),
  technician_id TEXT NOT NULL REFERENCES field_technicians(id),
  entry_type TEXT CHECK(entry_type IN ('travel', 'work', 'break')) DEFAULT 'work',
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_hours REAL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_field_time_order ON field_service_time_entries(order_id);

-- Field service parts used
CREATE TABLE IF NOT EXISTS field_service_parts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES field_service_orders(id),
  variant_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL,
  total_price REAL,
  from_inventory INTEGER DEFAULT 1,
  warehouse_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_field_parts_order ON field_service_parts(order_id);

-- Technician schedule/availability
CREATE TABLE IF NOT EXISTS technician_availability (
  id TEXT PRIMARY KEY,
  technician_id TEXT NOT NULL REFERENCES field_technicians(id),
  date TEXT NOT NULL,
  available_from TEXT,
  available_to TEXT,
  is_available INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tech_availability_tech ON technician_availability(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_availability_date ON technician_availability(date);

-- ============================================
-- DATA MIGRATION
-- ============================================

-- Migration jobs
CREATE TABLE IF NOT EXISTS migration_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_version TEXT,
  job_type TEXT CHECK(job_type IN ('full', 'incremental', 'validation')) DEFAULT 'full',
  status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  started_at TEXT,
  completed_at TEXT,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_log TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_migration_jobs_company ON migration_jobs(company_id);

-- Migration mappings (source ID to ARIA ID)
CREATE TABLE IF NOT EXISTS migration_mappings (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES migration_jobs(id),
  entity_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'migrated', 'failed', 'skipped')) DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_migration_mappings_job ON migration_mappings(job_id);
CREATE INDEX IF NOT EXISTS idx_migration_mappings_source ON migration_mappings(source_id);
CREATE INDEX IF NOT EXISTS idx_migration_mappings_target ON migration_mappings(target_id);

-- Migration validation results
CREATE TABLE IF NOT EXISTS migration_validations (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES migration_jobs(id),
  validation_type TEXT NOT NULL,
  entity_type TEXT,
  source_value TEXT,
  target_value TEXT,
  difference TEXT,
  status TEXT CHECK(status IN ('pass', 'fail', 'warning')) DEFAULT 'pass',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_migration_validations_job ON migration_validations(job_id);
