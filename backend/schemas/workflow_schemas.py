"""
Workflow Schemas - RAPID IMPLEMENTATION
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ERROR = "error"

class StepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"

class ActionType(str, Enum):
    APPROVAL = "approval"
    REVIEW = "review"
    NOTIFICATION = "notification"
    PROCESSING = "processing"
    VALIDATION = "validation"
    CUSTOM = "custom"

# Template Schemas
class WorkflowTemplateStepBase(BaseModel):
    step_number: int
    name: str
    description: Optional[str] = None
    action_type: ActionType
    config: Dict[str, Any] = Field(default_factory=dict)
    conditions: Dict[str, Any] = Field(default_factory=dict)
    timeout_hours: int = 24
    is_required: bool = True
    assigned_role: Optional[str] = None
    assigned_user_id: Optional[int] = None

class WorkflowTemplateStepCreate(WorkflowTemplateStepBase):
    pass

class WorkflowTemplateStep(WorkflowTemplateStepBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    template_id: int
    created_at: datetime

class WorkflowTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True
    is_system: bool = False
    version: str = "1.0"
    config: Dict[str, Any] = Field(default_factory=dict)
    trigger_conditions: Dict[str, Any] = Field(default_factory=dict)

class WorkflowTemplateCreate(WorkflowTemplateBase):
    steps: List[WorkflowTemplateStepCreate] = []

class WorkflowTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None
    trigger_conditions: Optional[Dict[str, Any]] = None

class WorkflowTemplate(WorkflowTemplateBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    steps: List[WorkflowTemplateStep] = []

# Workflow Schemas
class WorkflowStepBase(BaseModel):
    step_number: int
    name: str
    description: Optional[str] = None
    action_type: ActionType
    status: StepStatus = StepStatus.PENDING
    assigned_to: Optional[int] = None
    assigned_role: Optional[str] = None
    due_date: Optional[datetime] = None
    step_data: Dict[str, Any] = Field(default_factory=dict)
    result_data: Dict[str, Any] = Field(default_factory=dict)
    comments: Optional[str] = None

class WorkflowStepCreate(WorkflowStepBase):
    pass

class WorkflowStepUpdate(BaseModel):
    status: Optional[StepStatus] = None
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None
    step_data: Optional[Dict[str, Any]] = None
    result_data: Optional[Dict[str, Any]] = None
    comments: Optional[str] = None

class WorkflowStep(WorkflowStepBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    workflow_id: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: WorkflowStatus = WorkflowStatus.DRAFT
    template_id: Optional[int] = None
    document_id: int
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None
    workflow_data: Dict[str, Any] = Field(default_factory=dict)

class WorkflowCreate(WorkflowBase):
    steps: List[WorkflowStepCreate] = []

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[WorkflowStatus] = None
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None
    workflow_data: Optional[Dict[str, Any]] = None

class Workflow(WorkflowBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    current_step: int = 0
    progress_percentage: int = 0
    created_by: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    steps: List[WorkflowStep] = []

# Execution Schemas
class WorkflowExecutionBase(BaseModel):
    action: str
    execution_data: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[str] = None
    error_message: Optional[str] = None

class WorkflowExecutionCreate(WorkflowExecutionBase):
    workflow_id: int
    step_id: Optional[int] = None

class WorkflowExecution(WorkflowExecutionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    workflow_id: int
    step_id: Optional[int] = None
    actor_id: int
    executed_at: datetime
    duration_seconds: Optional[int] = None

# Notification Schemas
class WorkflowNotificationBase(BaseModel):
    notification_type: str
    title: str
    message: str

class WorkflowNotificationCreate(WorkflowNotificationBase):
    workflow_id: int
    step_id: Optional[int] = None
    user_id: int

class WorkflowNotification(WorkflowNotificationBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    workflow_id: int
    step_id: Optional[int] = None
    user_id: int
    is_sent: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime

# Response Schemas
class WorkflowListResponse(BaseModel):
    workflows: List[Workflow]
    total: int
    page: int
    size: int

class WorkflowTemplateListResponse(BaseModel):
    templates: List[WorkflowTemplate]
    total: int
    page: int
    size: int

class WorkflowStepAction(BaseModel):
    action: str
    step_data: Optional[Dict[str, Any]] = None
    comments: Optional[str] = None

class WorkflowStats(BaseModel):
    total_workflows: int
    active_workflows: int
    completed_workflows: int
    pending_steps: int
    overdue_steps: int
    avg_completion_time: Optional[float] = None