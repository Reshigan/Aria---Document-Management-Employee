"""Add analytics models

Revision ID: 005_add_analytics_models
Revises: 004_add_notification_system_tables
Create Date: 2024-10-10 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '005_add_analytics_models'
down_revision = '004_add_notification_system_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create document_analytics table
    op.create_table('document_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('views_count', sa.Integer(), nullable=False, default=0),
        sa.Column('downloads_count', sa.Integer(), nullable=False, default=0),
        sa.Column('shares_count', sa.Integer(), nullable=False, default=0),
        sa.Column('last_viewed_at', sa.DateTime(), nullable=True),
        sa.Column('last_downloaded_at', sa.DateTime(), nullable=True),
        sa.Column('last_shared_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_analytics_document_id'), 'document_analytics', ['document_id'], unique=False)
    op.create_index(op.f('ix_document_analytics_user_id'), 'document_analytics', ['user_id'], unique=False)

    # Create user_activity_log table
    op.create_table('user_activity_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, default=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_activity_log_user_id'), 'user_activity_log', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_activity_log_action'), 'user_activity_log', ['action'], unique=False)
    op.create_index(op.f('ix_user_activity_log_timestamp'), 'user_activity_log', ['timestamp'], unique=False)

    # Create system_metrics table
    op.create_table('system_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('metric_value', sa.Float(), nullable=False),
        sa.Column('metric_unit', sa.String(length=20), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_system_metrics_metric_name'), 'system_metrics', ['metric_name'], unique=False)
    op.create_index(op.f('ix_system_metrics_timestamp'), 'system_metrics', ['timestamp'], unique=False)
    op.create_index(op.f('ix_system_metrics_category'), 'system_metrics', ['category'], unique=False)

    # Create workflow_analytics table
    op.create_table('workflow_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('execution_count', sa.Integer(), nullable=False, default=0),
        sa.Column('success_count', sa.Integer(), nullable=False, default=0),
        sa.Column('failure_count', sa.Integer(), nullable=False, default=0),
        sa.Column('avg_execution_time', sa.Float(), nullable=True),
        sa.Column('last_executed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['workflow_templates.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_analytics_workflow_id'), 'workflow_analytics', ['workflow_id'], unique=False)
    op.create_index(op.f('ix_workflow_analytics_template_id'), 'workflow_analytics', ['template_id'], unique=False)

    # Create report_templates table
    op.create_table('report_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('report_type', sa.String(length=50), nullable=False),
        sa.Column('query_config', sa.JSON(), nullable=False),
        sa.Column('visualization_config', sa.JSON(), nullable=True),
        sa.Column('schedule_config', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_report_templates_name'), 'report_templates', ['name'], unique=False)
    op.create_index(op.f('ix_report_templates_report_type'), 'report_templates', ['report_type'], unique=False)
    op.create_index(op.f('ix_report_templates_created_by'), 'report_templates', ['created_by'], unique=False)

    # Create generated_reports table
    op.create_table('generated_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('report_data', sa.JSON(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_format', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('generated_by', sa.Integer(), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['template_id'], ['report_templates.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['generated_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_generated_reports_template_id'), 'generated_reports', ['template_id'], unique=False)
    op.create_index(op.f('ix_generated_reports_generated_by'), 'generated_reports', ['generated_by'], unique=False)
    op.create_index(op.f('ix_generated_reports_status'), 'generated_reports', ['status'], unique=False)

    # Create dashboard_widgets table
    op.create_table('dashboard_widgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('widget_type', sa.String(length=50), nullable=False),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.Column('position_x', sa.Integer(), nullable=False, default=0),
        sa.Column('position_y', sa.Integer(), nullable=False, default=0),
        sa.Column('width', sa.Integer(), nullable=False, default=4),
        sa.Column('height', sa.Integer(), nullable=False, default=3),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_dashboard_widgets_widget_type'), 'dashboard_widgets', ['widget_type'], unique=False)
    op.create_index(op.f('ix_dashboard_widgets_created_by'), 'dashboard_widgets', ['created_by'], unique=False)

    # Create alert_rules table
    op.create_table('alert_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('condition_type', sa.String(length=20), nullable=False),
        sa.Column('threshold_value', sa.Float(), nullable=False),
        sa.Column('comparison_period', sa.Integer(), nullable=False, default=300),
        sa.Column('notification_channels', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('last_triggered_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alert_rules_metric_name'), 'alert_rules', ['metric_name'], unique=False)
    op.create_index(op.f('ix_alert_rules_created_by'), 'alert_rules', ['created_by'], unique=False)
    op.create_index(op.f('ix_alert_rules_is_active'), 'alert_rules', ['is_active'], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_table('alert_rules')
    op.drop_table('dashboard_widgets')
    op.drop_table('generated_reports')
    op.drop_table('report_templates')
    op.drop_table('workflow_analytics')
    op.drop_table('system_metrics')
    op.drop_table('user_activity_log')
    op.drop_table('document_analytics')