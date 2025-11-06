-- Priority 2: Multi-Company RBAC Tables
-- User-Company-Role mapping for multi-tenant access control

-- Roles table (per company)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,  -- GL, AP, AR, Inventory, Payroll, etc.
    action VARCHAR(50) NOT NULL,  -- view, create, edit, delete, post, approve
    description TEXT,
    is_high_risk BOOLEAN DEFAULT FALSE,  -- Requires approval workflow
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(module, action)
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- User-Company-Role mapping (users can have different roles in different companies)
CREATE TABLE IF NOT EXISTS user_company_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- References users table
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, company_id, role_id)
);

-- Approval workflows for high-risk actions
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permission_id UUID NOT NULL REFERENCES permissions(id),
    required_approvers INT DEFAULT 1,
    approver_role_id UUID REFERENCES roles(id),  -- Role that can approve
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Approval requests
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL,  -- User ID
    request_type VARCHAR(50) NOT NULL,  -- GL_POSTING, PAYMENT, etc.
    request_data JSONB,  -- Serialized request data
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, CANCELLED
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Approval responses
CREATE TABLE IF NOT EXISTS approval_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL,  -- User ID
    status VARCHAR(20) NOT NULL,  -- APPROVED, REJECTED
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id ON user_company_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id ON user_company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_company_id ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);

-- Seed default roles and permissions
DO $$
DECLARE
    v_company_id UUID;
    v_admin_role_id UUID;
    v_accountant_role_id UUID;
    v_user_role_id UUID;
    v_perm_id UUID;
BEGIN
    -- Get first company
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF v_company_id IS NOT NULL THEN
        -- Create default roles
        INSERT INTO roles (company_id, name, description, is_system_role) VALUES
        (v_company_id, 'Admin', 'Full system access', true),
        (v_company_id, 'Accountant', 'Financial module access with posting rights', true),
        (v_company_id, 'User', 'Basic user access', true)
        ON CONFLICT (company_id, name) DO NOTHING
        RETURNING id INTO v_admin_role_id;
        
        SELECT id INTO v_admin_role_id FROM roles WHERE company_id = v_company_id AND name = 'Admin';
        SELECT id INTO v_accountant_role_id FROM roles WHERE company_id = v_company_id AND name = 'Accountant';
        SELECT id INTO v_user_role_id FROM roles WHERE company_id = v_company_id AND name = 'User';
        
        -- Create permissions
        INSERT INTO permissions (module, action, description, is_high_risk) VALUES
        ('GL', 'view', 'View general ledger', false),
        ('GL', 'create', 'Create journal entries', false),
        ('GL', 'edit', 'Edit draft journal entries', false),
        ('GL', 'delete', 'Delete draft journal entries', false),
        ('GL', 'post', 'Post journal entries to GL', true),
        ('GL', 'reverse', 'Reverse posted entries', true),
        ('AP', 'view', 'View accounts payable', false),
        ('AP', 'create', 'Create supplier invoices', false),
        ('AP', 'approve', 'Approve supplier invoices', true),
        ('AP', 'pay', 'Process payments', true),
        ('AR', 'view', 'View accounts receivable', false),
        ('AR', 'create', 'Create customer invoices', false),
        ('AR', 'approve', 'Approve customer invoices', true),
        ('Inventory', 'view', 'View inventory', false),
        ('Inventory', 'create', 'Create stock movements', false),
        ('Inventory', 'adjust', 'Adjust stock levels', true),
        ('Payroll', 'view', 'View payroll', false),
        ('Payroll', 'create', 'Create payroll runs', false),
        ('Payroll', 'approve', 'Approve payroll', true),
        ('Payroll', 'pay', 'Process payroll payments', true),
        ('Banking', 'view', 'View bank accounts', false),
        ('Banking', 'reconcile', 'Reconcile bank statements', true),
        ('Reports', 'view', 'View financial reports', false),
        ('Reports', 'export', 'Export reports', false),
        ('Admin', 'manage_users', 'Manage users', true),
        ('Admin', 'manage_companies', 'Manage companies', true),
        ('Admin', 'manage_roles', 'Manage roles and permissions', true)
        ON CONFLICT (module, action) DO NOTHING;
        
        -- Grant all permissions to Admin role
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_admin_role_id, id FROM permissions
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Grant accounting permissions to Accountant role
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_accountant_role_id, id FROM permissions 
        WHERE module IN ('GL', 'AP', 'AR', 'Banking', 'Reports')
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        -- Grant view permissions to User role
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_user_role_id, id FROM permissions 
        WHERE action = 'view'
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON role_permissions TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_company_roles TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_workflows TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_requests TO aria_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_responses TO aria_user;

COMMENT ON TABLE roles IS 'Roles per company for RBAC';
COMMENT ON TABLE permissions IS 'System-wide permissions for modules and actions';
COMMENT ON TABLE user_company_roles IS 'User-Company-Role mapping for multi-tenant access';
COMMENT ON TABLE approval_workflows IS 'Approval workflows for high-risk actions';
