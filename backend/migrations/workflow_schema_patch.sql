
ALTER TABLE workflow_instances
  ADD COLUMN IF NOT EXISTS correlation_keys jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS conversation_id uuid,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;

ALTER TABLE workflow_events
  ADD COLUMN IF NOT EXISTS processed boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS correlation_keys jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_instances_company ON workflow_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_correlation ON workflow_instances USING gin(correlation_keys);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_conversation ON workflow_instances(conversation_id);

CREATE INDEX IF NOT EXISTS idx_workflow_events_instance ON workflow_events(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_type ON workflow_events(event_type);
CREATE INDEX IF NOT EXISTS idx_workflow_events_processed ON workflow_events(processed);
CREATE INDEX IF NOT EXISTS idx_workflow_events_correlation ON workflow_events USING gin(correlation_keys);

COMMENT ON COLUMN workflow_instances.correlation_keys IS 'JSON keys for correlating external events (quote_id, po_number, etc)';
COMMENT ON COLUMN workflow_instances.conversation_id IS 'Optional link to Ask Aria conversation';
COMMENT ON COLUMN workflow_instances.last_activity_at IS 'Timestamp of last workflow activity';
COMMENT ON COLUMN workflow_events.processed IS 'Whether this event has been processed';
COMMENT ON COLUMN workflow_events.correlation_keys IS 'JSON keys for matching events to workflow instances';
