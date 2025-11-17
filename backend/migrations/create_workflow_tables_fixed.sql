
CREATE TABLE IF NOT EXISTS workflow_instances (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_step VARCHAR(100),
    context JSONB NOT NULL DEFAULT '{}',
    tenant_id INTEGER NOT NULL,
    initiated_by_user_id INTEGER NOT NULL,
    correlation_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workflow_type ON workflow_instances(type);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tenant_status ON workflow_instances(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_correlation ON workflow_instances(correlation_id);
CREATE INDEX IF NOT EXISTS idx_workflow_created ON workflow_instances(created_at);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    config JSONB NOT NULL DEFAULT '{}',
    input_data JSONB,
    output_data JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(100) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_step_instance ON workflow_steps(instance_id);
CREATE INDEX IF NOT EXISTS idx_step_status ON workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_step_instance_status ON workflow_steps(instance_id, status);
CREATE INDEX IF NOT EXISTS idx_step_idempotency ON workflow_steps(idempotency_key);

CREATE TABLE IF NOT EXISTS workflow_approvals (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id VARCHAR(36) REFERENCES workflow_steps(id) ON DELETE SET NULL,
    approver_user_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    token VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    context_data JSONB,
    decision VARCHAR(20),
    decision_note TEXT,
    decided_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_instance ON workflow_approvals(instance_id);
CREATE INDEX IF NOT EXISTS idx_approval_token ON workflow_approvals(token);
CREATE INDEX IF NOT EXISTS idx_approval_status ON workflow_approvals(status);
CREATE INDEX IF NOT EXISTS idx_approval_approver ON workflow_approvals(approver_user_id);

CREATE TABLE IF NOT EXISTS workflow_events (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    trace_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_event_instance ON workflow_events(instance_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON workflow_events(type);
CREATE INDEX IF NOT EXISTS idx_event_instance_type ON workflow_events(instance_id, type);
CREATE INDEX IF NOT EXISTS idx_event_created ON workflow_events(created_at);
CREATE INDEX IF NOT EXISTS idx_event_trace ON workflow_events(trace_id);

CREATE TABLE IF NOT EXISTS workflow_messages (
    id VARCHAR(36) PRIMARY KEY,
    instance_id VARCHAR(36) NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    content JSONB NOT NULL,
    meta JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_instance ON workflow_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_message_channel ON workflow_messages(channel);
CREATE INDEX IF NOT EXISTS idx_message_instance_channel ON workflow_messages(instance_id, channel);
CREATE INDEX IF NOT EXISTS idx_message_created ON workflow_messages(created_at);

CREATE TABLE IF NOT EXISTS workflow_outbox (
    id VARCHAR(36) PRIMARY KEY,
    kind VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_kind ON workflow_outbox(kind);
CREATE INDEX IF NOT EXISTS idx_outbox_processed ON workflow_outbox(processed_at);
CREATE INDEX IF NOT EXISTS idx_outbox_kind_processed ON workflow_outbox(kind, processed_at);
CREATE INDEX IF NOT EXISTS idx_outbox_created ON workflow_outbox(created_at);

COMMENT ON TABLE workflow_instances IS 'Workflow instances - each row represents one execution of a workflow';
COMMENT ON TABLE workflow_steps IS 'Workflow steps - individual steps within a workflow instance';
COMMENT ON TABLE workflow_approvals IS 'Workflow approvals - approval gates within workflows';
COMMENT ON TABLE workflow_events IS 'Workflow events - audit trail of all workflow events';
COMMENT ON TABLE workflow_messages IS 'Workflow messages - chat and email messages associated with workflows';
COMMENT ON TABLE workflow_outbox IS 'Workflow outbox - reliable delivery of side effects (emails, notifications)';
