"""Add missing User columns only

Revision ID: ab5c40e2e5d9
Revises: dc12a8f685ac
Create Date: 2024-10-14 20:06:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'ab5c40e2e5d9'
down_revision = 'dc12a8f685ac'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing User columns
    op.add_column('users', sa.Column('first_name', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('avatar_filename', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('location', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('website', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('linkedin_url', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('github_url', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('push_notifications', sa.Boolean(), nullable=True, default=True))
    op.add_column('users', sa.Column('date_format', sa.String(length=20), nullable=True, default='YYYY-MM-DD'))
    op.add_column('users', sa.Column('time_format', sa.String(length=10), nullable=True, default='24h'))
    op.add_column('users', sa.Column('ui_preferences', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('privacy_settings', sa.JSON(), nullable=True))


def downgrade():
    # Remove added User columns
    op.drop_column('users', 'privacy_settings')
    op.drop_column('users', 'ui_preferences')
    op.drop_column('users', 'time_format')
    op.drop_column('users', 'date_format')
    op.drop_column('users', 'push_notifications')
    op.drop_column('users', 'github_url')
    op.drop_column('users', 'linkedin_url')
    op.drop_column('users', 'website')
    op.drop_column('users', 'location')
    op.drop_column('users', 'avatar_filename')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
