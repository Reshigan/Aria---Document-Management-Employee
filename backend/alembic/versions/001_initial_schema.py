"""Initial database schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2025-01-05 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=True),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('job_title', sa.String(length=100), nullable=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('email_notifications', sa.Boolean(), nullable=True),
        sa.Column('slack_notifications', sa.Boolean(), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('theme', sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Create roles table
    op.create_table('roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)

    # Create permissions table
    op.create_table('permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('resource', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)

    # Create documents table
    op.create_table('documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=True),
        sa.Column('document_type', sa.Enum('INVOICE', 'RECEIPT', 'CONTRACT', 'PURCHASE_ORDER', 'DELIVERY_NOTE', 'CREDIT_NOTE', 'STATEMENT', 'OTHER', name='documenttype'), nullable=False),
        sa.Column('status', sa.Enum('UPLOADED', 'PROCESSING', 'PROCESSED', 'VALIDATED', 'APPROVED', 'REJECTED', 'POSTED_TO_SAP', 'ERROR', name='documentstatus'), nullable=False),
        sa.Column('ocr_text', sa.Text(), nullable=True),
        sa.Column('extracted_data', sa.JSON(), nullable=True),
        sa.Column('invoice_number', sa.String(length=100), nullable=True),
        sa.Column('invoice_date', sa.DateTime(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('vendor_name', sa.String(length=255), nullable=True),
        sa.Column('vendor_code', sa.String(length=50), nullable=True),
        sa.Column('vendor_address', sa.Text(), nullable=True),
        sa.Column('vendor_tax_id', sa.String(length=50), nullable=True),
        sa.Column('subtotal_amount', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('tax_amount', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('po_number', sa.String(length=100), nullable=True),
        sa.Column('po_line_items', sa.JSON(), nullable=True),
        sa.Column('confidence_score', sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column('processing_started_at', sa.DateTime(), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(), nullable=True),
        sa.Column('processing_duration', sa.Integer(), nullable=True),
        sa.Column('processing_errors', sa.JSON(), nullable=True),
        sa.Column('validation_status', sa.String(length=50), nullable=True),
        sa.Column('validation_errors', sa.JSON(), nullable=True),
        sa.Column('validated_by', sa.Integer(), nullable=True),
        sa.Column('validated_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approval_comments', sa.Text(), nullable=True),
        sa.Column('sap_document_number', sa.String(length=100), nullable=True),
        sa.Column('sap_fiscal_year', sa.String(length=4), nullable=True),
        sa.Column('sap_company_code', sa.String(length=4), nullable=True),
        sa.Column('posted_to_sap', sa.Boolean(), nullable=False),
        sa.Column('posted_to_sap_at', sa.DateTime(), nullable=True),
        sa.Column('posted_to_sap_by', sa.Integer(), nullable=True),
        sa.Column('sap_posting_errors', sa.JSON(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['posted_to_sap_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['validated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_file_hash'), 'documents', ['file_hash'], unique=False)
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)
    op.create_index(op.f('ix_documents_invoice_number'), 'documents', ['invoice_number'], unique=False)
    op.create_index(op.f('ix_documents_po_number'), 'documents', ['po_number'], unique=False)
    op.create_index(op.f('ix_documents_sap_document_number'), 'documents', ['sap_document_number'], unique=False)
    op.create_index(op.f('ix_documents_total_amount'), 'documents', ['total_amount'], unique=False)
    op.create_index(op.f('ix_documents_vendor_code'), 'documents', ['vendor_code'], unique=False)
    op.create_index(op.f('ix_documents_vendor_name'), 'documents', ['vendor_name'], unique=False)

    # Create association tables
    op.create_table('user_roles',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )

    op.create_table('role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )


def downgrade() -> None:
    op.drop_table('role_permissions')
    op.drop_table('user_roles')
    op.drop_index(op.f('ix_documents_vendor_name'), table_name='documents')
    op.drop_index(op.f('ix_documents_vendor_code'), table_name='documents')
    op.drop_index(op.f('ix_documents_total_amount'), table_name='documents')
    op.drop_index(op.f('ix_documents_sap_document_number'), table_name='documents')
    op.drop_index(op.f('ix_documents_po_number'), table_name='documents')
    op.drop_index(op.f('ix_documents_invoice_number'), table_name='documents')
    op.drop_index(op.f('ix_documents_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_file_hash'), table_name='documents')
    op.drop_table('documents')
    op.drop_index(op.f('ix_permissions_id'), table_name='permissions')
    op.drop_table('permissions')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')