-- Migration: Create tables for new modules (Projects, HR Extensions, Field Service, Compliance, Quality)
-- Date: 2025-12-01
-- Description: Creates database tables for all 28 missing pages with full CRUD support

-- ========================================
-- PROJECTS MODULE
-- ========================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_number VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES customers(id),
    project_manager_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'PLANNING',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2) DEFAULT 0,
    actual_cost DECIMAL(15,2) DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'TODO',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    due_date DATE,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2) DEFAULT 0,
    parent_task_id UUID REFERENCES project_tasks(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    timesheet_number VARCHAR(50) NOT NULL UNIQUE,
    employee_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    task_id UUID REFERENCES project_tasks(id),
    date DATE NOT NULL,
    hours DECIMAL(10,2) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- HR EXTENSIONS
-- ========================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_code VARCHAR(50) NOT NULL,
    department_name VARCHAR(200) NOT NULL,
    manager_id UUID REFERENCES users(id),
    parent_department_id UUID REFERENCES departments(id),
    budget DECIMAL(15,2) DEFAULT 0,
    budget_spent DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, department_code)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(50) DEFAULT 'PRESENT',
    hours_worked DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, employee_id, date)
);

-- ========================================
-- TAX FILINGS
-- ========================================

CREATE TABLE IF NOT EXISTS tax_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    filing_number VARCHAR(50) NOT NULL UNIQUE,
    tax_type VARCHAR(50) NOT NULL,
    period VARCHAR(7) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    filed_date DATE,
    payment_reference VARCHAR(100),
    sars_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ========================================
-- FIELD SERVICE
-- ========================================

CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    service_type VARCHAR(100),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'PENDING',
    technician_id UUID REFERENCES users(id),
    scheduled_date DATE,
    scheduled_time TIME,
    estimated_duration DECIMAL(5,2),
    actual_duration DECIMAL(5,2),
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS service_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    schedule_number VARCHAR(50) NOT NULL UNIQUE,
    service_order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- COMPLIANCE
-- ========================================

CREATE TABLE IF NOT EXISTS tax_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    obligation_number VARCHAR(50) NOT NULL UNIQUE,
    tax_type VARCHAR(50) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_number VARCHAR(50) NOT NULL UNIQUE,
    document_type VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    renewal_required BOOLEAN DEFAULT FALSE,
    document_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ========================================
-- QUALITY MANAGEMENT
-- ========================================

CREATE TABLE IF NOT EXISTS quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    inspection_number VARCHAR(50) NOT NULL UNIQUE,
    inspection_type VARCHAR(100) NOT NULL,
    product_id UUID REFERENCES products(id),
    batch_number VARCHAR(100),
    inspector_id UUID REFERENCES users(id),
    inspection_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    defects_found INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS non_conformances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nc_number VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'MINOR',
    status VARCHAR(50) DEFAULT 'OPEN',
    reported_by UUID REFERENCES users(id),
    reported_date DATE NOT NULL,
    corrective_action TEXT,
    due_date DATE,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON project_timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_project ON project_timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON project_timesheets(date);
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_tax_filings_company ON tax_filings(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_filings_period ON tax_filings(period);
CREATE INDEX IF NOT EXISTS idx_service_orders_company ON service_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_technician ON service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_schedules_technician ON service_schedules(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_schedules_date ON service_schedules(date);
CREATE INDEX IF NOT EXISTS idx_tax_obligations_company ON tax_obligations(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_company ON legal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_company ON quality_inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_non_conformances_company ON non_conformances(company_id);
