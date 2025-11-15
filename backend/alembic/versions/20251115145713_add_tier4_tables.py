"""Add TIER 4 enhancement tables

Revision ID: tier4_enhancements
Revises: 
Create Date: 2025-11-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'tier4_enhancements'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Document Attachments table
    op.create_table(
        'document_attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', sa.String(255), nullable=False),
        sa.Column('document_type', sa.String(100), nullable=False),
        sa.Column('document_id', sa.String(255), nullable=False),
        sa.Column('file_name', sa.String(500), nullable=False),
        sa.Column('file_path', sa.String(1000), nullable=False),
        sa.Column('file_size', sa.BigInteger, nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('ocr_text', sa.Text, nullable=True),
        sa.Column('classification', sa.String(50), nullable=True),
        sa.Column('uploaded_by', sa.String(255), nullable=False),
        sa.Column('uploaded_at', sa.DateTime, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_attachments_document', 'document_attachments', ['document_type', 'document_id'])
    op.create_index('idx_attachments_company', 'document_attachments', ['company_id'])

    # Document Comments table
    op.create_table(
        'document_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', sa.String(255), nullable=False),
        sa.Column('document_type', sa.String(100), nullable=False),
        sa.Column('document_id', sa.String(255), nullable=False),
        sa.Column('user_email', sa.String(255), nullable=False),
        sa.Column('comment_text', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_comments_document', 'document_comments', ['document_type', 'document_id'])
    op.create_index('idx_comments_company', 'document_comments', ['company_id'])


def downgrade():
    op.drop_table('document_comments')
    op.drop_table('document_attachments')
