"""
Workflow Orchestration Models
Database schema for Aria workflow orchestration with approval gates
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any

Base = declarative_base()


class WorkflowStatus(str, Enum):
    """Workflow instance status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING_APPROVAL = "waiting_approval"
    WAITING_EXTERNAL = "waiting_external"  # waiting for email, etc.
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepStatus(str, Enum):
    """Workflow step status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class ApprovalStatus(str, Enum):
    """Approval decision status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class EventType(str, Enum):
    """Workflow event types"""
    WORKFLOW_STARTED = "workflow_started"
    STEP_STARTED = "step_started"
    STEP_COMPLETED = "step_completed"
    STEP_FAILED = "step_failed"
    APPROVAL_REQUESTED = "approval_requested"
    APPROVAL_DECIDED = "approval_decided"
    EMAIL_RECEIVED = "email_received"
    EMAIL_SENT = "email_sent"
    AGENT_EXECUTED = "agent_executed"
    ERROR_OCCURRED = "error_occurred"
    WORKFLOW_COMPLETED = "workflow_completed"


class WorkflowInstance(Base):
    """
    Workflow instance - represents a single execution of a workflow
    """
    __tablename__ = "workflow_instances"

    id = Column(String(36), primary_key=True)  # UUID
    type = Column(String(100), nullable=False, index=True)  # e.g., "quote_to_cash"
    status = Column(SQLEnum(WorkflowStatus), nullable=False, default=WorkflowStatus.PENDING, index=True)
    current_step = Column(String(100), nullable=True)
    
    context = Column(JSON, nullable=False, default=dict)
    
    tenant_id = Column(Integer, nullable=False, index=True)
    initiated_by_user_id = Column(Integer, nullable=False)
    correlation_id = Column(String(100), nullable=True, index=True)  # for email matching
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    
    # Relationships
    steps = relationship("WorkflowStep", back_populates="instance", cascade="all, delete-orphan")
    approvals = relationship("WorkflowApproval", back_populates="instance", cascade="all, delete-orphan")
    events = relationship("WorkflowEvent", back_populates="instance", cascade="all, delete-orphan")
    messages = relationship("WorkflowMessage", back_populates="instance", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_workflow_tenant_status', 'tenant_id', 'status'),
        Index('idx_workflow_correlation', 'correlation_id'),
    )


class WorkflowStep(Base):
    """
    Workflow step - represents a single step in a workflow
    """
    __tablename__ = "workflow_steps"

    id = Column(String(36), primary_key=True)  # UUID
    instance_id = Column(String(36), ForeignKey('workflow_instances.id'), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # e.g., "agent_execution", "approval", "email_send"
    status = Column(SQLEnum(StepStatus), nullable=False, default=StepStatus.PENDING, index=True)
    
    config = Column(JSON, nullable=False, default=dict)  # step-specific config
    input_data = Column(JSON, nullable=True)  # input to this step
    output_data = Column(JSON, nullable=True)  # output from this step
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    
    idempotency_key = Column(String(100), nullable=True, unique=True)
    
    # Relationships
    instance = relationship("WorkflowInstance", back_populates="steps")
    
    __table_args__ = (
        Index('idx_step_instance_status', 'instance_id', 'status'),
    )


class WorkflowApproval(Base):
    """
    Workflow approval - represents an approval gate in a workflow
    """
    __tablename__ = "workflow_approvals"

    id = Column(String(36), primary_key=True)  # UUID
    instance_id = Column(String(36), ForeignKey('workflow_instances.id'), nullable=False, index=True)
    step_id = Column(String(36), ForeignKey('workflow_steps.id'), nullable=True)
    
    approver_user_id = Column(Integer, nullable=False)
    status = Column(SQLEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.PENDING, index=True)
    
    token = Column(String(100), nullable=False, unique=True, index=True)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    context_data = Column(JSON, nullable=True)  # data to display for approval
    
    decision = Column(String(20), nullable=True)  # "approve", "reject", "change"
    decision_note = Column(Text, nullable=True)
    decided_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    instance = relationship("WorkflowInstance", back_populates="approvals")
    
    __table_args__ = (
        Index('idx_approval_token', 'token'),
        Index('idx_approval_status', 'status'),
    )


class WorkflowEvent(Base):
    """
    Workflow event - represents an event in a workflow
    """
    __tablename__ = "workflow_events"

    id = Column(String(36), primary_key=True)  # UUID
    instance_id = Column(String(36), ForeignKey('workflow_instances.id'), nullable=False, index=True)
    
    type = Column(SQLEnum(EventType), nullable=False, index=True)
    payload = Column(JSON, nullable=False, default=dict)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    processed_at = Column(DateTime, nullable=True)
    
    trace_id = Column(String(100), nullable=True, index=True)
    
    # Relationships
    instance = relationship("WorkflowInstance", back_populates="events")
    
    __table_args__ = (
        Index('idx_event_instance_type', 'instance_id', 'type'),
        Index('idx_event_created', 'created_at'),
    )


class WorkflowMessage(Base):
    """
    Workflow message - represents a message (chat or email) in a workflow
    """
    __tablename__ = "workflow_messages"

    id = Column(String(36), primary_key=True)  # UUID
    instance_id = Column(String(36), ForeignKey('workflow_instances.id'), nullable=False, index=True)
    
    channel = Column(String(20), nullable=False)  # "chat", "email"
    direction = Column(String(10), nullable=False)  # "inbound", "outbound"
    
    content = Column(JSON, nullable=False)  # message body, subject, etc.
    meta = Column(JSON, nullable=True)  # channel-specific metadata
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Relationships
    instance = relationship("WorkflowInstance", back_populates="messages")
    
    __table_args__ = (
        Index('idx_message_instance_channel', 'instance_id', 'channel'),
    )


class WorkflowOutbox(Base):
    """
    Workflow outbox - for reliable side effects (emails, notifications)
    """
    __tablename__ = "workflow_outbox"

    id = Column(String(36), primary_key=True)  # UUID
    kind = Column(String(50), nullable=False, index=True)  # "email", "notification", "webhook"
    payload = Column(JSON, nullable=False)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    processed_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    
    __table_args__ = (
        Index('idx_outbox_kind_processed', 'kind', 'processed_at'),
    )
