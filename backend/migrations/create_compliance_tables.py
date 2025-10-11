"""Create compliance and audit tables

Revision ID: 006_compliance_system
Revises: b381a2b6b9ba
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers
revision = '006_compliance_system'
down_revision = 'b381a2b6b9ba'
branch_labels = None
depends_on = None

def upgrade():
    # Create compliance_frameworks table
    op.create_table('compliance_frameworks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('framework', sa.Enum('GDPR', 'HIPAA', 'SOX', 'ISO27001', 'PCI_DSS', 'CCPA', 'FERPA', 'CUSTOM', name='complianceframework'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('version', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('retention_period_days', sa.Integer(), nullable=True),
        sa.Column('audit_frequency_days', sa.Integer(), nullable=True),
        sa.Column('risk_assessment_frequency_days', sa.Integer(), nullable=True),
        sa.Column('notification_enabled', sa.Boolean(), nullable=True),
        sa.Column('alert_threshold_hours', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('framework')
    )
    op.create_index(op.f('ix_compliance_frameworks_id'), 'compliance_frameworks', ['id'], unique=False)

    # Create compliance_policies table
    op.create_table('compliance_policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('framework_id', sa.Integer(), nullable=False),
        sa.Column('policy_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('implementation_guide', sa.Text(), nullable=True),
        sa.Column('technical_controls', sa.JSON(), nullable=True),
        sa.Column('procedural_controls', sa.JSON(), nullable=True),
        sa.Column('risk_level', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='risklevel'), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True),
        sa.Column('is_mandatory', sa.Boolean(), nullable=True),
        sa.Column('is_implemented', sa.Boolean(), nullable=True),
        sa.Column('implementation_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_review_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['framework_id'], ['compliance_frameworks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compliance_policies_id'), 'compliance_policies', ['id'], unique=False)

    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.Enum('USER_LOGIN', 'USER_LOGOUT', 'DOCUMENT_ACCESS', 'DOCUMENT_UPLOAD', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_DELETE', 'DOCUMENT_SHARE', 'PERMISSION_CHANGE', 'SYSTEM_CONFIG', 'DATA_EXPORT', 'BACKUP_CREATED', 'BACKUP_RESTORED', 'SECURITY_INCIDENT', 'COMPLIANCE_VIOLATION', name='auditeventtype'), nullable=False),
        sa.Column('event_category', sa.String(length=50), nullable=True),
        sa.Column('event_description', sa.Text(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('username', sa.String(length=100), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_url', sa.Text(), nullable=True),
        sa.Column('request_headers', sa.JSON(), nullable=True),
        sa.Column('request_body', sa.JSON(), nullable=True),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('response_time_ms', sa.Float(), nullable=True),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('resource_name', sa.String(length=200), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('risk_level', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='risklevel'), nullable=True),
        sa.Column('compliance_relevant', sa.Boolean(), nullable=True),
        sa.Column('retention_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=True),
        sa.Column('region', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)

    # Create compliance_assessments table
    op.create_table('compliance_assessments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('framework_id', sa.Integer(), nullable=False),
        sa.Column('assessment_name', sa.String(length=200), nullable=False),
        sa.Column('assessment_type', sa.String(length=50), nullable=True),
        sa.Column('scope', sa.Text(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('COMPLIANT', 'NON_COMPLIANT', 'PENDING_REVIEW', 'REMEDIATION_REQUIRED', name='compliancestatus'), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=True),
        sa.Column('findings_summary', sa.Text(), nullable=True),
        sa.Column('recommendations', sa.JSON(), nullable=True),
        sa.Column('assessor_name', sa.String(length=100), nullable=True),
        sa.Column('assessor_organization', sa.String(length=200), nullable=True),
        sa.Column('assessor_credentials', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['framework_id'], ['compliance_frameworks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compliance_assessments_id'), 'compliance_assessments', ['id'], unique=False)

    # Create policy_assessments table
    op.create_table('policy_assessments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=False),
        sa.Column('policy_id', sa.Integer(), nullable=False),
        sa.Column('compliance_status', sa.Enum('COMPLIANT', 'NON_COMPLIANT', 'PENDING_REVIEW', 'REMEDIATION_REQUIRED', name='compliancestatus'), nullable=False),
        sa.Column('compliance_score', sa.Float(), nullable=True),
        sa.Column('findings', sa.Text(), nullable=True),
        sa.Column('evidence', sa.JSON(), nullable=True),
        sa.Column('gaps_identified', sa.JSON(), nullable=True),
        sa.Column('remediation_required', sa.Boolean(), nullable=True),
        sa.Column('remediation_plan', sa.Text(), nullable=True),
        sa.Column('remediation_due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('remediation_owner', sa.Integer(), nullable=True),
        sa.Column('risk_level', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='risklevel'), nullable=True),
        sa.Column('risk_description', sa.Text(), nullable=True),
        sa.Column('assessed_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['assessment_id'], ['compliance_assessments.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['policy_id'], ['compliance_policies.id'], ),
        sa.ForeignKeyConstraint(['remediation_owner'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_policy_assessments_id'), 'policy_assessments', ['id'], unique=False)

    # Create compliance_violations table
    op.create_table('compliance_violations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('framework_id', sa.Integer(), nullable=False),
        sa.Column('policy_id', sa.Integer(), nullable=True),
        sa.Column('violation_type', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('severity', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='risklevel'), nullable=False),
        sa.Column('impact_description', sa.Text(), nullable=True),
        sa.Column('affected_systems', sa.JSON(), nullable=True),
        sa.Column('affected_data_types', sa.JSON(), nullable=True),
        sa.Column('detected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('detected_by', sa.String(length=100), nullable=True),
        sa.Column('detection_method', sa.String(length=100), nullable=True),
        sa.Column('related_audit_logs', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('response_plan', sa.Text(), nullable=True),
        sa.Column('remediation_steps', sa.JSON(), nullable=True),
        sa.Column('response_due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reported_to_authorities', sa.Boolean(), nullable=True),
        sa.Column('authority_reference', sa.String(length=100), nullable=True),
        sa.Column('external_notifications', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['framework_id'], ['compliance_frameworks.id'], ),
        sa.ForeignKeyConstraint(['policy_id'], ['compliance_policies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compliance_violations_id'), 'compliance_violations', ['id'], unique=False)

    # Create data_classifications table
    op.create_table('data_classifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('classification_name', sa.String(length=100), nullable=False),
        sa.Column('classification_level', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('access_requirements', sa.JSON(), nullable=True),
        sa.Column('storage_requirements', sa.JSON(), nullable=True),
        sa.Column('transmission_requirements', sa.JSON(), nullable=True),
        sa.Column('retention_requirements', sa.JSON(), nullable=True),
        sa.Column('disposal_requirements', sa.JSON(), nullable=True),
        sa.Column('applicable_frameworks', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('classification_name')
    )
    op.create_index(op.f('ix_data_classifications_id'), 'data_classifications', ['id'], unique=False)

    # Create document_compliance table
    op.create_table('document_compliance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('classification_id', sa.Integer(), nullable=True),
        sa.Column('compliance_status', sa.Enum('COMPLIANT', 'NON_COMPLIANT', 'PENDING_REVIEW', 'REMEDIATION_REQUIRED', name='compliancestatus'), nullable=True),
        sa.Column('last_reviewed', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_review_due', sa.DateTime(timezone=True), nullable=True),
        sa.Column('contains_personal_data', sa.Boolean(), nullable=True),
        sa.Column('data_subjects', sa.JSON(), nullable=True),
        sa.Column('processing_purposes', sa.JSON(), nullable=True),
        sa.Column('legal_basis', sa.JSON(), nullable=True),
        sa.Column('retention_period_years', sa.Integer(), nullable=True),
        sa.Column('disposal_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('disposal_method', sa.String(length=100), nullable=True),
        sa.Column('access_log_retention_days', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['classification_id'], ['data_classifications.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_compliance_id'), 'document_compliance', ['id'], unique=False)

    # Create compliance_reports table
    op.create_table('compliance_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('framework_id', sa.Integer(), nullable=True),
        sa.Column('report_name', sa.String(length=200), nullable=False),
        sa.Column('report_type', sa.String(length=50), nullable=True),
        sa.Column('report_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('report_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('executive_summary', sa.Text(), nullable=True),
        sa.Column('findings', sa.JSON(), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('recommendations', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('recipients', sa.JSON(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_hash', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['framework_id'], ['compliance_frameworks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compliance_reports_id'), 'compliance_reports', ['id'], unique=False)

    # Create compliance_metrics table
    op.create_table('compliance_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('framework_id', sa.Integer(), nullable=True),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('metric_type', sa.String(length=50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('current_value', sa.Float(), nullable=True),
        sa.Column('target_value', sa.Float(), nullable=True),
        sa.Column('threshold_warning', sa.Float(), nullable=True),
        sa.Column('threshold_critical', sa.Float(), nullable=True),
        sa.Column('calculation_method', sa.Text(), nullable=True),
        sa.Column('data_sources', sa.JSON(), nullable=True),
        sa.Column('update_frequency', sa.String(length=50), nullable=True),
        sa.Column('last_calculated', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_calculation', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['framework_id'], ['compliance_frameworks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compliance_metrics_id'), 'compliance_metrics', ['id'], unique=False)

    # Insert default compliance frameworks
    op.execute("""
        INSERT INTO compliance_frameworks (framework, name, description, version, is_active, retention_period_days, audit_frequency_days, risk_assessment_frequency_days, notification_enabled, alert_threshold_hours, created_by)
        VALUES 
        ('GDPR', 'General Data Protection Regulation', 'EU data protection regulation for personal data processing', '2018', 1, 2555, 90, 365, 1, 24, 1),
        ('HIPAA', 'Health Insurance Portability and Accountability Act', 'US healthcare data protection regulation', '1996', 1, 2555, 90, 365, 1, 24, 1),
        ('SOX', 'Sarbanes-Oxley Act', 'US financial reporting and corporate governance regulation', '2002', 1, 2555, 90, 365, 1, 24, 1),
        ('ISO27001', 'ISO/IEC 27001', 'International information security management standard', '2013', 1, 2555, 90, 365, 1, 24, 1)
    """)

    # Insert default data classifications
    op.execute("""
        INSERT INTO data_classifications (classification_name, classification_level, description, access_requirements, storage_requirements, retention_requirements, created_by)
        VALUES 
        ('Public', 1, 'Information that can be freely shared with the public', '{}', '{}', '{"years": 1}', 1),
        ('Internal', 2, 'Information for internal use within the organization', '{"authentication": "required"}', '{"encryption": "recommended"}', '{"years": 3}', 1),
        ('Confidential', 3, 'Sensitive information requiring protection', '{"authentication": "required", "authorization": "role_based"}', '{"encryption": "required"}', '{"years": 7}', 1),
        ('Restricted', 4, 'Highly sensitive information with strict access controls', '{"authentication": "multi_factor", "authorization": "explicit_approval"}', '{"encryption": "required", "location": "secure_facility"}', '{"years": 10}', 1),
        ('Top Secret', 5, 'Most sensitive information requiring highest level of protection', '{"authentication": "multi_factor", "authorization": "need_to_know", "clearance": "required"}', '{"encryption": "military_grade", "location": "classified_facility"}', '{"years": 25}', 1)
    """)

    print("✅ Compliance and audit system tables created successfully")
    print("✅ Default compliance frameworks inserted: GDPR, HIPAA, SOX, ISO27001")
    print("✅ Default data classifications inserted: Public, Internal, Confidential, Restricted, Top Secret")

def downgrade():
    # Drop tables in reverse order
    op.drop_table('compliance_metrics')
    op.drop_table('compliance_reports')
    op.drop_table('document_compliance')
    op.drop_table('data_classifications')
    op.drop_table('compliance_violations')
    op.drop_table('policy_assessments')
    op.drop_table('compliance_assessments')
    op.drop_table('audit_logs')
    op.drop_table('compliance_policies')
    op.drop_table('compliance_frameworks')
    
    # Drop custom enums
    op.execute('DROP TYPE IF EXISTS complianceframework')
    op.execute('DROP TYPE IF EXISTS auditeventtype')
    op.execute('DROP TYPE IF EXISTS risklevel')
    op.execute('DROP TYPE IF EXISTS compliancestatus')
    
    print("✅ Compliance and audit system tables dropped successfully")