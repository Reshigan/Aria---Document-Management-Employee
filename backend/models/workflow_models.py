"""
Workflow Engine Models - RAPID IMPLEMENTATION
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base
import enum

class WorkflowStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ERROR = "error"

class StepStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"

class ActionType(enum.Enum):
    APPROVAL = "approval"
    REVIEW = "review"
    NOTIFICATION = "notification"
    PROCESSING = "processing"
    VALIDATION = "validation"
    CUSTOM = "custom"

class WorkflowTaskStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class WorkflowStepType(enum.Enum):
    APPROVAL = "approval"
    REVIEW = "review"
    NOTIFICATION = "notification"
    PROCESSING = "processing"
    VALIDATION = "validation"
    CUSTOM = "custom"

class WorkflowStepStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"

# WorkflowTemplate is imported from advanced.py to avoid duplication

class WorkflowTemplateStep(Base):
    __tablename__ = "workflow_template_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workflow_templates.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    action_type = Column(SQLEnum(ActionType), nullable=False)
    
    # Step configuration
    config = Column(JSON, default=dict)
    conditions = Column(JSON, default=dict)
    timeout_hours = Column(Integer, default=24)
    is_required = Column(Boolean, default=True)
    
    # Assignment
    assigned_role = Column(String(100))
    assigned_user_id = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships - will be set up via back_populates from WorkflowTemplate in advanced.py

# Workflow is imported from advanced.py to avoid duplication

# WorkflowStep is imported from advanced.py to avoid duplication

class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("workflow_steps.id"))
    
    action = Column(String(100), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Execution details
    execution_data = Column(JSON, default=dict)
    result = Column(String(50))
    error_message = Column(Text)
    
    # Timing
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    duration_seconds = Column(Integer)
    
    # Relationships
    workflow = relationship("Workflow")
    step = relationship("WorkflowStep")
    actor = relationship("User")

class WorkflowTask(Base):
    __tablename__ = "workflow_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(WorkflowTaskStatus), default=WorkflowTaskStatus.PENDING, index=True)
    
    # Workflow and step references
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("workflow_steps.id"))
    
    # Assignment
    assigned_to = Column(Integer, ForeignKey("users.id"))
    assigned_by = Column(Integer, ForeignKey("users.id"))
    
    # Timing
    due_date = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Task data
    task_data = Column(JSON, default=dict)
    result_data = Column(JSON, default=dict)
    
    # Relationships
    workflow = relationship("Workflow")
    step = relationship("WorkflowStep")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    assigner = relationship("User", foreign_keys=[assigned_by])
    
    # Notification relationships
    notifications = relationship("Notification", back_populates="task")


class WorkflowNotification(Base):
    __tablename__ = "workflow_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("workflow_steps.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workflow = relationship("Workflow")
    step = relationship("WorkflowStep")
    user = relationship("User")