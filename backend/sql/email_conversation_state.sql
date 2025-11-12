-- Email Conversation State for Aria Controller Slot-Filling
-- Tracks conversation context across multiple email exchanges

CREATE TABLE IF NOT EXISTS aria_email_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) UNIQUE NOT NULL,
    thread_id VARCHAR(255),
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    subject TEXT,
    
    -- Aria Controller State
    intent VARCHAR(100),
    intent_confidence DECIMAL(5,2),
    gathered_fields JSONB DEFAULT '{}',
    missing_fields TEXT[],
    conversation_state VARCHAR(50) DEFAULT 'active',
    
    -- Metadata
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_state CHECK (conversation_state IN ('active', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_email_conv_thread ON aria_email_conversations(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_conv_from ON aria_email_conversations(from_address);
CREATE INDEX IF NOT EXISTS idx_email_conv_state ON aria_email_conversations(conversation_state);
CREATE INDEX IF NOT EXISTS idx_email_conv_updated ON aria_email_conversations(updated_at);

-- Email Processing Log
CREATE TABLE IF NOT EXISTS aria_email_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) NOT NULL,
    conversation_id UUID REFERENCES aria_email_conversations(id),
    from_address VARCHAR(255) NOT NULL,
    subject TEXT,
    body_preview TEXT,
    
    -- Processing Results
    intent_detected VARCHAR(100),
    bots_activated TEXT[],
    processing_status VARCHAR(50),
    error_message TEXT,
    
    -- Timestamps
    received_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_email_log_message ON aria_email_processing_log(message_id);
CREATE INDEX IF NOT EXISTS idx_email_log_conv ON aria_email_processing_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON aria_email_processing_log(processing_status);
