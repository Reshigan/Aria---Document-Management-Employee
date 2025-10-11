"""Add enhanced tag management system

Revision ID: 003_enhanced_tag_system
Revises: b381a2b6b9ba
Create Date: 2025-10-10 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_enhanced_tag_system'
down_revision = 'b381a2b6b9ba'
branch_labels = None
depends_on = None


def upgrade():
    # Create enhanced_tags table
    op.create_table('enhanced_tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('tag_type', sa.Enum('MANUAL', 'SYSTEM', 'AUTO', 'CATEGORY', 'METADATA', name='tagtype'), nullable=False),
        sa.Column('category', sa.Enum('GENERAL', 'DOCUMENT_TYPE', 'DEPARTMENT', 'PROJECT', 'STATUS', 'PRIORITY', 'VENDOR', 'FINANCIAL', 'COMPLIANCE', 'CUSTOM', name='tagcategory'), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('level', sa.Integer(), nullable=True),
        sa.Column('path', sa.String(length=1000), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False),
        sa.Column('is_auto_taggable', sa.Boolean(), nullable=False),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('document_count', sa.Integer(), nullable=True),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('auto_tag_keywords', sa.JSON(), nullable=True),
        sa.Column('auto_tag_patterns', sa.JSON(), nullable=True),
        sa.Column('confidence_threshold', sa.Float(), nullable=True),
        sa.Column('tag_metadata', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['parent_id'], ['enhanced_tags.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'parent_id', name='unique_tag_name_parent')
    )
    op.create_index(op.f('ix_enhanced_tags_name'), 'enhanced_tags', ['name'], unique=False)

    # Create document_enhanced_tags association table
    op.create_table('document_enhanced_tags',
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('applied_by', sa.String(length=50), nullable=True),
        sa.Column('applied_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['tag_id'], ['enhanced_tags.id'], ),
        sa.PrimaryKeyConstraint('document_id', 'tag_id')
    )

    # Create tag_hierarchies table
    op.create_table('tag_hierarchies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('parent_tag_id', sa.Integer(), nullable=False),
        sa.Column('child_tag_id', sa.Integer(), nullable=False),
        sa.Column('relationship_type', sa.String(length=50), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['child_tag_id'], ['enhanced_tags.id'], ),
        sa.ForeignKeyConstraint(['parent_tag_id'], ['enhanced_tags.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('parent_tag_id', 'child_tag_id', name='unique_tag_hierarchy')
    )

    # Create tag_analytics table
    op.create_table('tag_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('document_count', sa.Integer(), nullable=True),
        sa.Column('user_count', sa.Integer(), nullable=True),
        sa.Column('search_count', sa.Integer(), nullable=True),
        sa.Column('click_through_rate', sa.Float(), nullable=True),
        sa.Column('auto_applied_count', sa.Integer(), nullable=True),
        sa.Column('auto_confidence_avg', sa.Float(), nullable=True),
        sa.Column('manual_corrections', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['tag_id'], ['enhanced_tags.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tag_id', 'date', name='unique_tag_date_analytics')
    )

    # Create auto_tag_rules table
    op.create_table('auto_tag_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('rule_type', sa.String(length=50), nullable=False),
        sa.Column('conditions', sa.JSON(), nullable=False),
        sa.Column('confidence_threshold', sa.Float(), nullable=True),
        sa.Column('tag_ids', sa.JSON(), nullable=True),
        sa.Column('applications_count', sa.Integer(), nullable=True),
        sa.Column('success_rate', sa.Float(), nullable=True),
        sa.Column('last_applied', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create tag_suggestions table
    op.create_table('tag_suggestions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('suggestion_source', sa.String(length=50), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=True),
        sa.Column('is_accepted', sa.Boolean(), nullable=True),
        sa.Column('is_rejected', sa.Boolean(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['tag_id'], ['enhanced_tags.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create tag_templates table
    op.create_table('tag_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('tag_ids', sa.JSON(), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Set default values for new columns
    op.execute("UPDATE enhanced_tags SET level = 0 WHERE level IS NULL")
    op.execute("UPDATE enhanced_tags SET usage_count = 0 WHERE usage_count IS NULL")
    op.execute("UPDATE enhanced_tags SET document_count = 0 WHERE document_count IS NULL")
    op.execute("UPDATE enhanced_tags SET confidence_threshold = 0.8 WHERE confidence_threshold IS NULL")
    op.execute("UPDATE enhanced_tags SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE enhanced_tags SET is_system = false WHERE is_system IS NULL")
    op.execute("UPDATE enhanced_tags SET is_public = true WHERE is_public IS NULL")
    op.execute("UPDATE enhanced_tags SET is_auto_taggable = true WHERE is_auto_taggable IS NULL")

    # Make columns non-nullable after setting defaults
    op.alter_column('enhanced_tags', 'level', nullable=False)
    op.alter_column('enhanced_tags', 'usage_count', nullable=False)
    op.alter_column('enhanced_tags', 'document_count', nullable=False)
    op.alter_column('enhanced_tags', 'confidence_threshold', nullable=False)

    # Create some default system tags
    op.execute("""
        INSERT INTO enhanced_tags (name, display_name, description, tag_type, category, is_system, is_active, is_public, level, usage_count, document_count, confidence_threshold)
        VALUES 
        ('urgent', 'Urgent', 'High priority documents requiring immediate attention', 'SYSTEM', 'PRIORITY', true, true, true, 0, 0, 0, 0.8),
        ('invoice', 'Invoice', 'Invoice documents', 'SYSTEM', 'DOCUMENT_TYPE', true, true, true, 0, 0, 0, 0.8),
        ('contract', 'Contract', 'Contract documents', 'SYSTEM', 'DOCUMENT_TYPE', true, true, true, 0, 0, 0, 0.8),
        ('finance', 'Finance', 'Financial documents', 'SYSTEM', 'DEPARTMENT', true, true, true, 0, 0, 0, 0.8),
        ('hr', 'Human Resources', 'HR related documents', 'SYSTEM', 'DEPARTMENT', true, true, true, 0, 0, 0, 0.8),
        ('approved', 'Approved', 'Approved documents', 'SYSTEM', 'STATUS', true, true, true, 0, 0, 0, 0.8),
        ('pending', 'Pending', 'Documents pending review', 'SYSTEM', 'STATUS', true, true, true, 0, 0, 0, 0.8),
        ('confidential', 'Confidential', 'Confidential documents', 'SYSTEM', 'COMPLIANCE', true, true, true, 0, 0, 0, 0.8)
    """)


def downgrade():
    # Drop tables in reverse order
    op.drop_table('tag_templates')
    op.drop_table('tag_suggestions')
    op.drop_table('auto_tag_rules')
    op.drop_table('tag_analytics')
    op.drop_table('tag_hierarchies')
    op.drop_table('document_enhanced_tags')
    op.drop_index(op.f('ix_enhanced_tags_name'), table_name='enhanced_tags')
    op.drop_table('enhanced_tags')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS tagtype')
    op.execute('DROP TYPE IF EXISTS tagcategory')