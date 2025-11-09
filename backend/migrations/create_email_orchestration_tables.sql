
CREATE TABLE IF NOT EXISTS email_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name VARCHAR(200) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- 'inbound_email', 'document_status', 'approval', 'scheduled'
    trigger_conditions JSONB, -- Conditions to trigger workflow
    workflow_steps JSONB NOT NULL, -- Array of workflow steps
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_email_workflows_company ON email_workflows(company_id);
CREATE INDEX idx_email_workflows_trigger ON email_workflows(trigger_type);
CREATE INDEX idx_email_workflows_active ON email_workflows(is_active);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES email_workflows(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    trigger_data JSONB, -- Data that triggered the workflow
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'paused'
    execution_log JSONB, -- Log of each step execution
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_company ON workflow_executions(company_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at DESC);

CREATE TABLE IF NOT EXISTS inbound_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    message_id VARCHAR(500) UNIQUE NOT NULL, -- Email message ID
    from_address VARCHAR(500) NOT NULL,
    to_address VARCHAR(500) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB, -- Array of attachment metadata
    received_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    intent VARCHAR(100), -- Detected intent (e.g., 'quote_request', 'invoice_query', 'order_approval')
    confidence DECIMAL(5,2), -- Intent confidence score (0-100)
    extracted_data JSONB, -- Extracted entities and data
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inbound_emails_company ON inbound_emails(company_id);
CREATE INDEX idx_inbound_emails_status ON inbound_emails(processing_status);
CREATE INDEX idx_inbound_emails_received ON inbound_emails(received_at DESC);
CREATE INDEX idx_inbound_emails_from ON inbound_emails(from_address);

CREATE TABLE IF NOT EXISTS outbound_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    to_address VARCHAR(500) NOT NULL,
    cc_address TEXT,
    bcc_address TEXT,
    subject TEXT NOT NULL,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB, -- Array of attachment paths/data
    priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'sending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    source_document_type VARCHAR(50), -- 'invoice', 'quote', etc.
    source_document_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_outbound_emails_company ON outbound_emails(company_id);
CREATE INDEX idx_outbound_emails_status ON outbound_emails(status);
CREATE INDEX idx_outbound_emails_priority ON outbound_emails(priority, created_at);
CREATE INDEX idx_outbound_emails_workflow ON outbound_emails(workflow_execution_id);

CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    document_type VARCHAR(50) NOT NULL, -- 'sales_order', 'purchase_order', 'journal_entry', etc.
    document_id UUID NOT NULL,
    approval_steps JSONB NOT NULL, -- Array of approval steps with approvers
    current_step INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    requested_by UUID,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approval_workflows_company ON approval_workflows(company_id);
CREATE INDEX idx_approval_workflows_document ON approval_workflows(document_type, document_id);
CREATE INDEX idx_approval_workflows_status ON approval_workflows(status);

CREATE TABLE IF NOT EXISTS approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_workflow_id UUID NOT NULL REFERENCES approval_workflows(id),
    step_number INTEGER NOT NULL,
    approver_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'delegated'
    comments TEXT,
    delegated_to UUID,
    actioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approval_actions_workflow ON approval_actions(approval_workflow_id);
CREATE INDEX idx_approval_actions_approver ON approval_actions(approver_id);

COMMENT ON TABLE email_workflows IS 'Configurable email-driven workflow definitions';
COMMENT ON TABLE workflow_executions IS 'Runtime execution tracking for workflows';
COMMENT ON TABLE inbound_emails IS 'Inbound email processing with NLP intent detection';
COMMENT ON TABLE outbound_emails IS 'Outbound email queue with retry logic';
COMMENT ON TABLE approval_workflows IS 'Multi-step approval workflows for documents';
COMMENT ON TABLE approval_actions IS 'Individual approval actions within workflows';
