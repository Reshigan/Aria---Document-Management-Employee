"""
Reporting & Analytics Models
Track performance, accuracy, ROI for B2B clients
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .base import Base


class BotType(enum.Enum):
    """Bot types for tracking"""
    DOCUMENT_SCANNER = "document_scanner"
    HELPDESK = "helpdesk"
    SALES_ORDER = "sales_order"
    CUSTOM = "custom"


class ProcessingStatus(enum.Enum):
    """Processing status for tracking"""
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    REQUIRES_REVIEW = "requires_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class BotInteractionLog(Base):
    """Log every bot interaction for analytics"""
    __tablename__ = "bot_interaction_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    bot_type = Column(Enum(BotType), nullable=False)
    
    # Interaction details
    interaction_id = Column(String(100), unique=True, nullable=False)  # Unique tracking ID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Input/Output
    input_channel = Column(String(50))  # email, whatsapp, web, api
    input_text = Column(Text)
    input_metadata = Column(JSON)  # Files, images, etc.
    
    output_text = Column(Text)
    output_data = Column(JSON)  # Structured extracted data
    
    # Performance metrics
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    confidence_score = Column(Float)  # 0.0 - 1.0
    processing_time_ms = Column(Integer)  # Milliseconds
    
    # AI/Model details
    model_used = Column(String(50))  # ollama:mistral, ollama:llama2
    tokens_used = Column(Integer)
    cost = Column(Float, default=0.0)  # With Ollama this is mostly 0!
    
    # Quality tracking
    required_human_review = Column(Boolean, default=False)
    human_reviewed = Column(Boolean, default=False)
    human_approved = Column(Boolean, nullable=True)
    feedback_score = Column(Integer)  # 1-5 stars
    feedback_comment = Column(Text)
    
    # Error handling
    error_occurred = Column(Boolean, default=False)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    reviewed_at = Column(DateTime)
    
    # Relationships
    organization = relationship("Organization", back_populates="bot_interactions")


class DocumentProcessingMetrics(Base):
    """Specific metrics for SAP Document Scanner"""
    __tablename__ = "document_processing_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    interaction_log_id = Column(Integer, ForeignKey("bot_interaction_logs.id"))
    
    # Document details
    document_type = Column(String(50))  # invoice, purchase_order, receipt, etc.
    document_number = Column(String(100))
    vendor_name = Column(String(255))
    
    # Extraction accuracy
    fields_extracted = Column(Integer)
    fields_confident = Column(Integer)  # High confidence extractions
    fields_corrected = Column(Integer)  # Human corrections needed
    
    # OCR quality
    ocr_quality_score = Column(Float)  # 0.0 - 1.0
    pages_processed = Column(Integer)
    has_tables = Column(Boolean, default=False)
    table_extraction_success = Column(Boolean)
    
    # SAP integration
    sap_posted = Column(Boolean, default=False)
    sap_document_number = Column(String(100))
    sap_posting_time_ms = Column(Integer)
    sap_validation_passed = Column(Boolean)
    sap_error = Column(Text)
    
    # Financial data
    total_amount = Column(Float)
    currency = Column(String(3))
    tax_amount = Column(Float)
    
    # Time savings (calculated)
    manual_entry_time_min = Column(Integer)  # Estimated time saved
    automated_time_min = Column(Integer)
    time_saved_min = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class HelpdeskMetrics(Base):
    """Specific metrics for WhatsApp Helpdesk"""
    __tablename__ = "helpdesk_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    interaction_log_id = Column(Integer, ForeignKey("bot_interaction_logs.id"))
    
    # Conversation details
    conversation_id = Column(String(100))
    customer_phone = Column(String(20))
    customer_name = Column(String(255))
    
    # Classification
    query_type = Column(String(50))  # order_status, refund, complaint, etc.
    priority_level = Column(String(20))  # low, medium, high, urgent
    sentiment = Column(String(20))  # positive, neutral, negative, angry
    
    # Resolution tracking
    resolved_by_bot = Column(Boolean, default=False)
    escalated_to_human = Column(Boolean, default=False)
    escalation_reason = Column(String(255))
    assigned_agent_id = Column(Integer, ForeignKey("users.id"))
    
    # Timing
    first_response_time_sec = Column(Integer)
    total_resolution_time_min = Column(Integer)
    messages_exchanged = Column(Integer)
    
    # Quality
    customer_satisfied = Column(Boolean)
    satisfaction_rating = Column(Integer)  # 1-5
    resolved_on_first_contact = Column(Boolean)
    
    # SLA compliance
    sla_target_min = Column(Integer)
    sla_met = Column(Boolean)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)


class SalesOrderMetrics(Base):
    """Specific metrics for Sales Order Bot"""
    __tablename__ = "sales_order_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    interaction_log_id = Column(Integer, ForeignKey("bot_interaction_logs.id"))
    
    # Order details
    order_number = Column(String(100))
    customer_id = Column(String(100))
    customer_name = Column(String(255))
    
    # Order data
    order_value = Column(Float)
    currency = Column(String(3))
    line_items_count = Column(Integer)
    
    # Processing
    order_created_in_erp = Column(Boolean, default=False)
    erp_order_number = Column(String(100))
    validation_checks_passed = Column(Integer)
    validation_checks_failed = Column(Integer)
    
    # Inventory impact
    stock_available = Column(Boolean)
    backorder_items = Column(Integer)
    
    # Customer credit
    credit_check_passed = Column(Boolean)
    credit_limit = Column(Float)
    outstanding_amount = Column(Float)
    
    # Reminders sent
    confirmation_sent = Column(Boolean, default=False)
    reminder_count = Column(Integer, default=0)
    last_reminder_sent = Column(DateTime)
    
    # Conversion tracking
    quote_converted_to_order = Column(Boolean, default=False)
    conversion_time_hours = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    order_date = Column(DateTime)


class DailyPerformanceMetrics(Base):
    """Aggregated daily metrics per organization"""
    __tablename__ = "daily_performance_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    bot_type = Column(Enum(BotType), nullable=False)
    date = Column(DateTime, nullable=False)
    
    # Volume
    total_interactions = Column(Integer, default=0)
    successful_interactions = Column(Integer, default=0)
    failed_interactions = Column(Integer, default=0)
    pending_review = Column(Integer, default=0)
    
    # Performance
    avg_confidence_score = Column(Float)
    avg_processing_time_ms = Column(Integer)
    success_rate = Column(Float)  # Percentage
    
    # Quality
    human_review_rate = Column(Float)  # Percentage needing review
    approval_rate = Column(Float)  # Percentage approved after review
    avg_feedback_score = Column(Float)  # 1-5 stars
    
    # Efficiency
    total_time_saved_min = Column(Integer)
    total_cost_saved = Column(Float)
    
    # Specific to bot type
    documents_processed = Column(Integer)  # DocuBot
    tickets_resolved = Column(Integer)  # Helpdesk
    orders_processed = Column(Integer)  # OrderBot
    
    # Financial
    revenue_generated = Column(Float)  # For OrderBot
    cost_per_interaction = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class AccuracyTracking(Base):
    """Track accuracy over time with human feedback"""
    __tablename__ = "accuracy_tracking"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    bot_type = Column(Enum(BotType), nullable=False)
    
    # What was being extracted/classified
    field_name = Column(String(100))  # invoice_number, customer_name, etc.
    expected_value = Column(Text)  # Human corrected value
    predicted_value = Column(Text)  # Bot predicted value
    
    # Accuracy
    is_correct = Column(Boolean)
    confidence_at_prediction = Column(Float)
    
    # Context
    interaction_log_id = Column(Integer, ForeignKey("bot_interaction_logs.id"))
    document_type = Column(String(50))
    
    # Learning
    used_for_training = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class ClientROIMetrics(Base):
    """Calculate and track ROI for each client"""
    __tablename__ = "client_roi_metrics"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    calculation_date = Column(DateTime, default=datetime.utcnow)
    period_days = Column(Integer, default=30)  # Calculation period
    
    # Costs
    subscription_cost = Column(Float)  # What client pays us
    usage_cost = Column(Float)  # Per-transaction costs
    total_cost_to_client = Column(Float)
    
    # Savings
    manual_hours_saved = Column(Float)  # Total hours saved
    hourly_rate = Column(Float)  # Client's internal cost per hour
    labor_cost_saved = Column(Float)
    
    error_reduction_value = Column(Float)  # Value of reduced errors
    faster_processing_value = Column(Float)  # Value of speed improvements
    
    # Revenue impact (for OrderBot)
    additional_orders_captured = Column(Integer)
    revenue_from_additional_orders = Column(Float)
    
    # Total ROI
    total_value_generated = Column(Float)
    net_benefit = Column(Float)  # total_value - total_cost
    roi_percentage = Column(Float)  # (net_benefit / total_cost) * 100
    payback_period_days = Column(Integer)
    
    # Projections
    projected_annual_savings = Column(Float)
    projected_annual_roi = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class AlertRule(Base):
    """Configurable alerts for performance issues"""
    __tablename__ = "alert_rules"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Trigger conditions
    bot_type = Column(Enum(BotType))
    metric_name = Column(String(100))  # success_rate, avg_confidence, etc.
    operator = Column(String(20))  # <, >, ==, <=, >=
    threshold_value = Column(Float)
    time_window_minutes = Column(Integer, default=60)
    
    # Alert settings
    severity = Column(String(20))  # info, warning, critical
    notification_channels = Column(JSON)  # ["email", "sms", "slack"]
    recipient_emails = Column(JSON)
    
    # State
    last_triggered = Column(DateTime)
    trigger_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)


class DashboardWidget(Base):
    """Customizable dashboard widgets per organization"""
    __tablename__ = "dashboard_widgets"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    widget_type = Column(String(50))  # kpi, chart, table, map
    title = Column(String(255))
    description = Column(Text)
    
    # Configuration
    data_source = Column(String(100))  # Which metric to display
    bot_type_filter = Column(Enum(BotType))
    time_range = Column(String(20))  # today, week, month, year
    visualization_type = Column(String(50))  # line, bar, pie, gauge
    
    # Layout
    position = Column(Integer)
    size = Column(String(20))  # small, medium, large
    
    # Display settings
    config = Column(JSON)  # Custom configuration
    
    is_visible = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
