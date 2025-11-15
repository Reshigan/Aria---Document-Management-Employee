
INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('GL', 'view', 'View general ledger entries', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('GL', 'create', 'Create journal entries', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('GL', 'edit', 'Edit draft journal entries', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('GL', 'delete', 'Delete draft journal entries', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('GL', 'post', 'Post journal entries to ledger', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('GL', 'reverse', 'Reverse posted journal entries', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AR', 'view', 'View AR transactions', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AR', 'create', 'Create AR invoices', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AR', 'edit', 'Edit AR invoices', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AR', 'delete', 'Delete AR invoices', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AR', 'post', 'Post AR invoices', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AP', 'view', 'View AP transactions', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AP', 'create', 'Create AP invoices', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AP', 'edit', 'Edit AP invoices', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AP', 'delete', 'Delete AP invoices', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('AP', 'post', 'Post AP invoices', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Sales', 'view', 'View sales transactions', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Sales', 'create', 'Create quotes and sales orders', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Sales', 'edit', 'Edit sales transactions', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Sales', 'delete', 'Delete sales transactions', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Sales', 'approve', 'Approve sales orders', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Purchase', 'view', 'View purchase transactions', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Purchase', 'create', 'Create purchase orders', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Purchase', 'edit', 'Edit purchase orders', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Purchase', 'delete', 'Delete purchase orders', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Purchase', 'approve', 'Approve purchase orders', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Inventory', 'view', 'View inventory', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Inventory', 'create', 'Create inventory transactions', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Inventory', 'edit', 'Edit inventory transactions', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Inventory', 'delete', 'Delete inventory transactions', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Manufacturing', 'view', 'View manufacturing orders', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Manufacturing', 'create', 'Create work orders', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Manufacturing', 'edit', 'Edit work orders', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Manufacturing', 'delete', 'Delete work orders', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Reports', 'view', 'View reports', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Reports', 'financial', 'View financial reports', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Reports', 'operational', 'View operational reports', false) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Admin', 'users', 'Manage users', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Admin', 'roles', 'Manage roles and permissions', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Admin', 'settings', 'Manage system settings', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description, is_high_risk) 
VALUES ('Admin', 'full', 'Full administrative access', true) ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (p.module, p.action) IN (
  ('GL', 'view'), ('GL', 'create'), ('GL', 'edit'), ('GL', 'post'), ('GL', 'reverse'),
  ('AR', 'view'), ('AR', 'create'), ('AR', 'edit'), ('AR', 'post'),
  ('AP', 'view'), ('AP', 'create'), ('AP', 'edit'), ('AP', 'post'),
  ('Reports', 'view'), ('Reports', 'financial')
)
WHERE r.name = 'Accountant'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (p.module, p.action) IN (
  ('Sales', 'view'), ('Sales', 'create'), ('Sales', 'edit'), ('Sales', 'delete'), ('Sales', 'approve'),
  ('AR', 'view'), ('AR', 'create'),
  ('Reports', 'view'), ('Reports', 'operational')
)
WHERE r.name = 'Sales Manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (p.module, p.action) IN (
  ('Purchase', 'view'), ('Purchase', 'create'), ('Purchase', 'edit'), ('Purchase', 'delete'), ('Purchase', 'approve'),
  ('AP', 'view'), ('AP', 'create'),
  ('Inventory', 'view'),
  ('Reports', 'view'), ('Reports', 'operational')
)
WHERE r.name = 'Purchasing Officer'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (p.module, p.action) IN (
  ('Inventory', 'view'), ('Inventory', 'create'), ('Inventory', 'edit'), ('Inventory', 'delete'),
  ('Manufacturing', 'view'),
  ('Reports', 'view'), ('Reports', 'operational')
)
WHERE r.name = 'Warehouse Manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (p.module, p.action) IN (
  ('Sales', 'view'), ('Purchase', 'view'), ('Inventory', 'view'), ('Reports', 'view')
)
WHERE r.name = 'User'
ON CONFLICT DO NOTHING;

SELECT 'Permissions seeded successfully!' as status;
SELECT COUNT(*) as total_permissions FROM permissions;
SELECT COUNT(*) as total_role_permissions FROM role_permissions;
