
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    definition JSONB NOT NULL, -- YAML converted to JSON
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_definition_id UUID REFERENCES workflow_definitions(id),
    company_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    conversation_id UUID, -- Link to ask_aria conversation
    
    current_state VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, paused, completed, failed, cancelled
    
    context JSONB NOT NULL DEFAULT '{}',
    
    correlation_keys JSONB DEFAULT '{}', -- {quote_id, po_number, customer_id, etc}
    
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_instances_company ON workflow_instances(company_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_correlation ON workflow_instances USING gin(correlation_keys);
CREATE INDEX idx_workflow_instances_conversation ON workflow_instances(conversation_id);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- bot_task, human_approval, wait_event, decision, timer
    step_order INTEGER NOT NULL,
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, skipped
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_steps_instance ON workflow_steps(workflow_instance_id);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);

CREATE TABLE IF NOT EXISTS workflow_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    workflow_step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
    
    approval_type VARCHAR(100) NOT NULL, -- send_quote, create_sales_order, send_invoice, etc
    description TEXT,
    
    requested_from_user_id UUID REFERENCES users(id),
    requested_from_role VARCHAR(100), -- manager, finance_manager, etc
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
    decision_by_user_id UUID REFERENCES users(id),
    decision_at TIMESTAMP,
    decision_notes TEXT,
    
    approval_data JSONB DEFAULT '{}', -- Document details, amounts, etc
    
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Optional timeout
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_approvals_instance ON workflow_approvals(workflow_instance_id);
CREATE INDEX idx_workflow_approvals_status ON workflow_approvals(status);
CREATE INDEX idx_workflow_approvals_user ON workflow_approvals(requested_from_user_id);

CREATE TABLE IF NOT EXISTS workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    
    event_type VARCHAR(100) NOT NULL, -- po_received, delivery_confirmed, payment_received, etc
    event_source VARCHAR(100), -- email, upload, webhook, manual, etc
    
    event_data JSONB NOT NULL DEFAULT '{}',
    
    correlation_keys JSONB DEFAULT '{}',
    
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_events_instance ON workflow_events(workflow_instance_id);
CREATE INDEX idx_workflow_events_type ON workflow_events(event_type);
CREATE INDEX idx_workflow_events_processed ON workflow_events(processed);
CREATE INDEX idx_workflow_events_correlation ON workflow_events USING gin(correlation_keys);

CREATE TABLE IF NOT EXISTS workflow_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    workflow_step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
    
    attachment_type VARCHAR(100) NOT NULL, -- quote_pdf, invoice_pdf, po_document, delivery_note, etc
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    document_id UUID, -- Reference to quotes, invoices, etc
    document_type VARCHAR(100), -- quote, sales_order, invoice, etc
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_workflow_attachments_instance ON workflow_attachments(workflow_instance_id);
CREATE INDEX idx_workflow_attachments_type ON workflow_attachments(attachment_type);
CREATE INDEX idx_workflow_attachments_document ON workflow_attachments(document_id);

CREATE TABLE IF NOT EXISTS workflow_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    
    action VARCHAR(100) NOT NULL, -- started, state_changed, approved, rejected, completed, failed, etc
    actor_user_id UUID REFERENCES users(id),
    actor_type VARCHAR(50), -- user, system, bot, timer
    
    old_state VARCHAR(100),
    new_state VARCHAR(100),
    changes JSONB DEFAULT '{}',
    
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_audit_instance ON workflow_audit_log(workflow_instance_id);
CREATE INDEX idx_workflow_audit_action ON workflow_audit_log(action);
CREATE INDEX idx_workflow_audit_created ON workflow_audit_log(created_at);

COMMENT ON TABLE workflow_definitions IS 'Declarative workflow definitions (YAML/JSON)';
COMMENT ON TABLE workflow_instances IS 'Running workflow instances with state and context';
COMMENT ON TABLE workflow_steps IS 'Execution log of workflow steps';
COMMENT ON TABLE workflow_approvals IS 'Approval requests and decisions';
COMMENT ON TABLE workflow_events IS 'External events that trigger workflow transitions';
COMMENT ON TABLE workflow_attachments IS 'Documents generated/received during workflow';
COMMENT ON TABLE workflow_audit_log IS 'Complete audit trail of workflow actions';
