"""Add reporting models for B2B capabilities

Revision ID: 003_reporting_models
Revises: 002_initial_schema
Create Date: 2025-10-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003_reporting_models'
down_revision = '002_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    # BotInteractionLog
    op.create_table(
        'bot_interaction_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('bot_type', sa.String(50), nullable=False),
        sa.Column('interaction_id', sa.String(100), nullable=False, unique=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('input_channel', sa.String(50), nullable=True),
        sa.Column('input_text', sa.Text(), nullable=True),
        sa.Column('input_metadata', postgresql.JSONB(), nullable=True),
        sa.Column('output_text', sa.Text(), nullable=True),
        sa.Column('output_data', postgresql.JSONB(), nullable=True),
        sa.Column('processing_status', sa.String(50), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('tokens_used', sa.Integer(), default=0),
        sa.Column('cost', sa.Numeric(10, 4), default=0.0),
        sa.Column('required_human_review', sa.Boolean(), default=False),
        sa.Column('human_reviewed', sa.Boolean(), default=False),
        sa.Column('human_approved', sa.Boolean(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('feedback_score', sa.Integer(), nullable=True),
        sa.Column('feedback_comment', sa.Text(), nullable=True),
        sa.Column('error_occurred', sa.Boolean(), default=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )
    op.create_index('idx_bot_logs_org_bot', 'bot_interaction_logs', ['organization_id', 'bot_type'])
    op.create_index('idx_bot_logs_status', 'bot_interaction_logs', ['processing_status'])
    op.create_index('idx_bot_logs_review', 'bot_interaction_logs', ['required_human_review'])
    
    # DocumentProcessingMetrics
    op.create_table(
        'document_processing_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('interaction_log_id', sa.Integer(), nullable=False),
        sa.Column('document_type', sa.String(50), nullable=True),
        sa.Column('document_number', sa.String(100), nullable=True),
        sa.Column('vendor_name', sa.String(255), nullable=True),
        sa.Column('fields_extracted', sa.Integer(), default=0),
        sa.Column('fields_confident', sa.Integer(), default=0),
        sa.Column('fields_corrected', sa.Integer(), default=0),
        sa.Column('pages_processed', sa.Integer(), default=1),
        sa.Column('ocr_quality_score', sa.Float(), nullable=True),
        sa.Column('sap_posted', sa.Boolean(), default=False),
        sa.Column('sap_document_number', sa.String(100), nullable=True),
        sa.Column('sap_validation_passed', sa.Boolean(), nullable=True),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=True),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('manual_entry_time_min', sa.Integer(), nullable=True),
        sa.Column('automated_time_min', sa.Integer(), nullable=True),
        sa.Column('time_saved_min', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['interaction_log_id'], ['bot_interaction_logs.id'])
    )
    op.create_index('idx_doc_metrics_org', 'document_processing_metrics', ['organization_id'])
    
    # HelpdeskMetrics
    op.create_table(
        'helpdesk_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('interaction_log_id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.String(100), nullable=True),
        sa.Column('customer_phone', sa.String(50), nullable=True),
        sa.Column('customer_name', sa.String(255), nullable=True),
        sa.Column('query_type', sa.String(50), nullable=True),
        sa.Column('priority_level', sa.String(20), nullable=True),
        sa.Column('sentiment', sa.String(20), nullable=True),
        sa.Column('resolved_by_bot', sa.Boolean(), default=False),
        sa.Column('escalated_to_human', sa.Boolean(), default=False),
        sa.Column('escalation_reason', sa.String(255), nullable=True),
        sa.Column('ticket_id', sa.String(100), nullable=True),
        sa.Column('first_response_time_sec', sa.Integer(), nullable=True),
        sa.Column('total_resolution_time_min', sa.Integer(), nullable=True),
        sa.Column('messages_exchanged', sa.Integer(), default=1),
        sa.Column('resolved_on_first_contact', sa.Boolean(), nullable=True),
        sa.Column('customer_satisfied', sa.Boolean(), nullable=True),
        sa.Column('satisfaction_rating', sa.Integer(), nullable=True),
        sa.Column('sla_target_min', sa.Integer(), default=120),
        sa.Column('sla_met', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['interaction_log_id'], ['bot_interaction_logs.id'])
    )
    op.create_index('idx_helpdesk_org_conv', 'helpdesk_metrics', ['organization_id', 'conversation_id'])
    
    # SalesOrderMetrics
    op.create_table(
        'sales_order_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('interaction_log_id', sa.Integer(), nullable=False),
        sa.Column('order_number', sa.String(100), nullable=True),
        sa.Column('customer_id', sa.String(100), nullable=True),
        sa.Column('customer_name', sa.String(255), nullable=True),
        sa.Column('order_value', sa.Numeric(15, 2), nullable=True),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('line_items_count', sa.Integer(), default=0),
        sa.Column('order_created_in_erp', sa.Boolean(), default=False),
        sa.Column('erp_order_number', sa.String(100), nullable=True),
        sa.Column('validation_checks_passed', sa.Integer(), default=0),
        sa.Column('validation_checks_failed', sa.Integer(), default=0),
        sa.Column('stock_available', sa.Boolean(), nullable=True),
        sa.Column('credit_check_passed', sa.Boolean(), nullable=True),
        sa.Column('upsell_offered', sa.Boolean(), default=False),
        sa.Column('upsell_accepted', sa.Boolean(), nullable=True),
        sa.Column('upsell_value', sa.Numeric(15, 2), nullable=True),
        sa.Column('confirmation_sent', sa.Boolean(), default=False),
        sa.Column('payment_received', sa.Boolean(), nullable=True),
        sa.Column('order_date', sa.DateTime(), nullable=True),
        sa.Column('delivery_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['interaction_log_id'], ['bot_interaction_logs.id'])
    )
    op.create_index('idx_sales_org', 'sales_order_metrics', ['organization_id'])
    
    # DailyPerformanceMetrics
    op.create_table(
        'daily_performance_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('bot_type', sa.String(50), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('total_interactions', sa.Integer(), default=0),
        sa.Column('successful_interactions', sa.Integer(), default=0),
        sa.Column('failed_interactions', sa.Integer(), default=0),
        sa.Column('average_confidence', sa.Float(), nullable=True),
        sa.Column('average_processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('human_reviews_required', sa.Integer(), default=0),
        sa.Column('human_approvals', sa.Integer(), default=0),
        sa.Column('total_cost', sa.Numeric(10, 2), default=0.0),
        sa.Column('time_saved_hours', sa.Float(), nullable=True),
        sa.Column('revenue_impact', sa.Numeric(15, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'])
    )
    op.create_index('idx_daily_perf_org_date', 'daily_performance_metrics', ['organization_id', 'date', 'bot_type'])
    
    # AccuracyTracking
    op.create_table(
        'accuracy_tracking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('bot_type', sa.String(50), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('expected_value', sa.Text(), nullable=True),
        sa.Column('predicted_value', sa.Text(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('confidence_at_prediction', sa.Float(), nullable=True),
        sa.Column('interaction_log_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['interaction_log_id'], ['bot_interaction_logs.id'])
    )
    op.create_index('idx_accuracy_org_bot', 'accuracy_tracking', ['organization_id', 'bot_type'])
    
    # ClientROIMetrics
    op.create_table(
        'client_roi_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('subscription_cost', sa.Numeric(10, 2), nullable=False),
        sa.Column('usage_cost', sa.Numeric(10, 2), default=0.0),
        sa.Column('total_cost', sa.Numeric(10, 2), nullable=False),
        sa.Column('manual_labor_cost_saved', sa.Numeric(15, 2), nullable=True),
        sa.Column('error_reduction_value', sa.Numeric(15, 2), nullable=True),
        sa.Column('speed_improvement_value', sa.Numeric(15, 2), nullable=True),
        sa.Column('revenue_impact', sa.Numeric(15, 2), nullable=True),
        sa.Column('total_value_generated', sa.Numeric(15, 2), nullable=True),
        sa.Column('net_benefit', sa.Numeric(15, 2), nullable=True),
        sa.Column('roi_percentage', sa.Float(), nullable=True),
        sa.Column('payback_period_days', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'])
    )
    op.create_index('idx_roi_org_period', 'client_roi_metrics', ['organization_id', 'period_start', 'period_end'])
    
    # AlertRule
    op.create_table(
        'alert_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('bot_type', sa.String(50), nullable=True),
        sa.Column('metric_type', sa.String(50), nullable=False),
        sa.Column('threshold_value', sa.Float(), nullable=False),
        sa.Column('comparison_operator', sa.String(10), nullable=False),
        sa.Column('notification_channels', postgresql.JSONB(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'])
    )
    
    # DashboardWidget
    op.create_table(
        'dashboard_widgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('widget_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('configuration', postgresql.JSONB(), nullable=True),
        sa.Column('position', sa.Integer(), nullable=True),
        sa.Column('size', sa.String(20), nullable=True),
        sa.Column('is_visible', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'])
    )


def downgrade():
    op.drop_table('dashboard_widgets')
    op.drop_table('alert_rules')
    op.drop_table('client_roi_metrics')
    op.drop_table('accuracy_tracking')
    op.drop_table('daily_performance_metrics')
    op.drop_table('sales_order_metrics')
    op.drop_table('helpdesk_metrics')
    op.drop_table('document_processing_metrics')
    op.drop_table('bot_interaction_logs')
