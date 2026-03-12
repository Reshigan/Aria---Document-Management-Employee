"""
Database Migration - Module Management and Security Enhancements
Creates tables for module assignment, enhanced security, and audit trails
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import datetime


def upgrade():
    """
    Apply migration - Create module management and security tables
    """
    
    # Create modules table
    op.create_table(
        'modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('category', sa.Enum(
            'FINANCIAL', 'HR', 'OPERATIONS', 'SALES', 'PROCUREMENT',
            'MANUFACTURING', 'QUALITY', 'MAINTENANCE', 'WAREHOUSE',
            'ANALYTICS', 'ADMINISTRATION', name='modulecategory'
        ), nullable=False),
        sa.Column('status', sa.Enum(
            'ACTIVE', 'INACTIVE', 'BETA', 'DEPRECATED', name='modulestatus'
        ), server_default='ACTIVE'),
        sa.Column('icon', sa.String(length=50)),
        sa.Column('route_path', sa.String(length=200)),
        sa.Column('api_endpoint', sa.String(length=200)),
        sa.Column('requires_approval', sa.Boolean(), server_default='false'),
        sa.Column('approval_limit', sa.Integer()),
        sa.Column('permissions', sa.JSON()),
        sa.Column('features', sa.JSON()),
        sa.Column('dependencies', sa.JSON()),
        sa.Column('requires_license', sa.Boolean(), server_default='false'),
        sa.Column('license_level', sa.String(length=50)),
        sa.Column('max_users', sa.Integer()),
        sa.Column('version', sa.String(length=20)),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_modules_id', 'modules', ['id'])
    op.create_index('ix_modules_name', 'modules', ['name'])
    
    # Create user_modules table
    op.create_table(
        'user_modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('module_id', sa.Integer(), sa.ForeignKey('modules.id'), nullable=False),
        sa.Column('assigned_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('activated_at', sa.DateTime(timezone=True)),
        sa.Column('deactivated_at', sa.DateTime(timezone=True)),
        sa.Column('deactivated_by', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('deactivation_reason', sa.Text()),
        sa.Column('custom_permissions', sa.JSON()),
        sa.Column('approval_limit', sa.Integer()),
        sa.Column('access_level', sa.String(length=50)),
        sa.Column('last_accessed', sa.DateTime(timezone=True)),
        sa.Column('access_count', sa.Integer(), server_default='0'),
        sa.Column('notes', sa.Text()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_modules_user_id', 'user_modules', ['user_id'])
    op.create_index('ix_user_modules_module_id', 'user_modules', ['module_id'])
    
    # Create module_access_logs table
    op.create_table(
        'module_access_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('module_id', sa.Integer(), sa.ForeignKey('modules.id'), nullable=False),
        sa.Column('user_module_id', sa.Integer(), sa.ForeignKey('user_modules.id')),
        sa.Column('action', sa.String(length=50)),
        sa.Column('feature_name', sa.String(length=100)),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('user_sessions.id')),
        sa.Column('ip_address', sa.String(length=45)),
        sa.Column('user_agent', sa.Text()),
        sa.Column('response_time_ms', sa.Integer()),
        sa.Column('success', sa.Boolean(), server_default='true'),
        sa.Column('error_message', sa.Text()),
        sa.Column('accessed_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('request_data', sa.JSON()),
        sa.Column('response_data', sa.JSON()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create module_licenses table
    op.create_table(
        'module_licenses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), sa.ForeignKey('modules.id'), nullable=False),
        sa.Column('license_key', sa.String(length=255), nullable=False),
        sa.Column('license_type', sa.String(length=50)),
        sa.Column('max_users', sa.Integer()),
        sa.Column('current_users', sa.Integer(), server_default='0'),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('valid_until', sa.DateTime(timezone=True)),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('organization_name', sa.String(length=200)),
        sa.Column('organization_id', sa.String(length=100)),
        sa.Column('metadata', sa.JSON()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('license_key')
    )
    
    # Insert default modules
    op.execute("""
        INSERT INTO modules (name, display_name, description, category, status, icon) VALUES
        ('documents', 'Document Management', 'Manage and organize documents', 'ADMINISTRATION', 'ACTIVE', 'file-text'),
        ('financial_accounting', 'Financial Accounting', 'General ledger, accounts payable/receivable', 'FINANCIAL', 'ACTIVE', 'dollar-sign'),
        ('fixed_assets', 'Fixed Assets', 'Manage company fixed assets', 'FINANCIAL', 'ACTIVE', 'briefcase'),
        ('payroll', 'Payroll', 'Employee payroll processing', 'HR', 'ACTIVE', 'users'),
        ('hr_management', 'HR Management', 'Employee records and HR functions', 'HR', 'ACTIVE', 'user-check'),
        ('procurement', 'Procurement', 'Purchase orders and vendor management', 'PROCUREMENT', 'ACTIVE', 'shopping-cart'),
        ('inventory', 'Inventory Management', 'Stock control and warehouse management', 'WAREHOUSE', 'ACTIVE', 'package'),
        ('manufacturing', 'Manufacturing', 'Production planning and execution', 'MANUFACTURING', 'ACTIVE', 'settings'),
        ('quality_control', 'Quality Control', 'Quality assurance and testing', 'QUALITY', 'ACTIVE', 'check-circle'),
        ('maintenance', 'Maintenance', 'Equipment and facility maintenance', 'MAINTENANCE', 'ACTIVE', 'tool'),
        ('sales', 'Sales Management', 'Sales orders and customer management', 'SALES', 'ACTIVE', 'trending-up'),
        ('analytics', 'Analytics & Reporting', 'Business intelligence and reports', 'ANALYTICS', 'ACTIVE', 'bar-chart'),
        ('workflow', 'Workflow Management', 'Automated workflows and approvals', 'ADMINISTRATION', 'ACTIVE', 'git-branch');
    """)


def downgrade():
    """
    Rollback migration - Drop module management tables
    """
    op.drop_table('module_licenses')
    op.drop_table('module_access_logs')
    op.drop_index('ix_user_modules_module_id')
    op.drop_index('ix_user_modules_user_id')
    op.drop_table('user_modules')
    op.drop_index('ix_modules_name')
    op.drop_index('ix_modules_id')
    op.drop_table('modules')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS modulecategory')
    op.execute('DROP TYPE IF EXISTS modulestatus')
