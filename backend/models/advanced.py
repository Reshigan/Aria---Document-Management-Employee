"""
Advanced models for document management features
"""
import enum
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, JSON, Table, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel


# Association tables for many-to-many relationships
document_tags = Table(
    'document_tags',
    BaseModel.metadata,
    Column('document_id', Integer, ForeignKey('documents.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

document_shares = Table(
    'document_shares',
    BaseModel.metadata,
    Column('document_id', Integer, ForeignKey('documents.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('permission', String(20), default='read')  # read, write, admin
)

folder_permissions = Table(
    'folder_permissions',
    BaseModel.metadata,
    Column('folder_id', Integer, ForeignKey('folders.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('permission', String(20), default='read')  # read, write, admin
)


class FolderPermission(BaseModel):
    """Folder permission model for detailed folder access control"""
    __tablename__ = "folder_permissions_detailed"
    
    folder_id = Column(Integer, ForeignKey('folders.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Granular permissions
    can_read = Column(Boolean, default=True, nullable=False)
    can_write = Column(Boolean, default=False, nullable=False)
    can_delete = Column(Boolean, default=False, nullable=False)
    can_share = Column(Boolean, default=False, nullable=False)
    can_manage_permissions = Column(Boolean, default=False, nullable=False)
    
    # Inheritance settings
    inherit_permissions = Column(Boolean, default=True, nullable=False)
    apply_to_children = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    folder = relationship("Folder", back_populates="detailed_permissions")
    user = relationship("User", foreign_keys=[user_id], back_populates="folder_permissions")
    granted_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    grantor = relationship("User", foreign_keys=[granted_by])
    
    __table_args__ = (
        UniqueConstraint('folder_id', 'user_id', name='unique_folder_user_permission'),
    )
    
    def __repr__(self):
        return f"<FolderPermission(id={self.id}, folder_id={self.folder_id}, user_id={self.user_id})>"


class ShareLinkType(str, enum.Enum):
    """Share link type enumeration"""
    PUBLIC = "public"
    PRIVATE = "private"
    PASSWORD_PROTECTED = "password_protected"


class NotificationType(str, enum.Enum):
    """Notification type enumeration"""
    DOCUMENT_UPLOADED = "document_uploaded"
    DOCUMENT_PROCESSED = "document_processed"
    DOCUMENT_APPROVED = "document_approved"
    DOCUMENT_REJECTED = "document_rejected"
    DOCUMENT_SHARED = "document_shared"
    COMMENT_ADDED = "comment_added"
    WORKFLOW_ASSIGNED = "workflow_assigned"
    WORKFLOW_COMPLETED = "workflow_completed"
    SYSTEM_ALERT = "system_alert"


class WorkflowStatus(str, enum.Enum):
    """Workflow status enumeration"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WorkflowStepType(str, enum.Enum):
    """Workflow step type enumeration"""
    APPROVAL = "approval"
    REVIEW = "review"
    NOTIFICATION = "notification"
    AUTOMATION = "automation"
    CONDITION = "condition"


class WorkflowStepStatus(str, enum.Enum):
    """Workflow step status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    REJECTED = "rejected"


class Folder(BaseModel):
    """Folder model for document organization"""
    __tablename__ = "folders"
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey('folders.id'))
    path = Column(String(1000), nullable=False, index=True)  # Full path for quick lookups
    is_system = Column(Boolean, default=False)  # System folders (Trash, Favorites, etc.)
    is_public = Column(Boolean, default=False)  # Public access
    color = Column(String(7))  # Hex color code
    
    # Relationships
    parent = relationship("Folder", remote_side="Folder.id", back_populates="children")
    children = relationship("Folder", back_populates="parent")
    documents = relationship("Document", back_populates="folder")
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User")
    permissions = relationship("User", secondary=folder_permissions)
    detailed_permissions = relationship("FolderPermission", back_populates="folder")
    
    def __repr__(self):
        return f"<Folder(id={self.id}, name='{self.name}', path='{self.path}')>"


class Tag(BaseModel):
    """Tag model for document categorization"""
    __tablename__ = "tags"
    
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    color = Column(String(7))  # Hex color code
    is_system = Column(Boolean, default=False)  # System tags vs user-created
    usage_count = Column(Integer, default=0)  # Track tag usage
    
    # Relationships
    documents = relationship("Document", secondary=document_tags, back_populates="tags")
    created_by = Column(Integer, ForeignKey('users.id'))
    creator = relationship("User")
    
    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.name}')>"


class DocumentVersionSimple(BaseModel):
    """Simple document version model for basic version tracking"""
    __tablename__ = "document_versions_simple"
    
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    version_number = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Version metadata
    version_notes = Column(Text)
    is_current = Column(Boolean, default=False)
    
    # Relationships
    document = relationship("Document")
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User")
    
    __table_args__ = (
        UniqueConstraint('document_id', 'version_number', name='unique_document_version'),
    )
    
    def __repr__(self):
        return f"<DocumentVersionSimple(id={self.id}, document_id={self.document_id}, version={self.version_number})>"


class ShareLink(BaseModel):
    """Share link model for document sharing"""
    __tablename__ = "share_links"
    
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    token = Column(String(100), unique=True, nullable=False, index=True)
    link_type = Column(Enum(ShareLinkType), default=ShareLinkType.PRIVATE, nullable=False)
    password_hash = Column(String(255))  # For password-protected links
    
    # Access control
    expires_at = Column(DateTime)
    max_downloads = Column(Integer)
    download_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Permissions
    can_download = Column(Boolean, default=True)
    can_view = Column(Boolean, default=True)
    can_comment = Column(Boolean, default=False)
    
    # Relationships
    document = relationship("Document", back_populates="share_links")
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User")
    
    def __repr__(self):
        return f"<ShareLink(id={self.id}, token='{self.token}', document_id={self.document_id})>"


class DocumentShare(BaseModel):
    """Document share model for user-to-user sharing"""
    __tablename__ = "document_shares_detailed"
    
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    shared_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    can_view = Column(Boolean, default=True, nullable=False)
    can_edit = Column(Boolean, default=False, nullable=False)
    can_download = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime)
    message = Column(Text)
    
    # Relationships
    document = relationship("Document")
    shared_by = relationship("User", foreign_keys=[shared_by_user_id])
    shared_with = relationship("User", foreign_keys=[shared_with_user_id])
    
    def __repr__(self):
        return f"<DocumentShare(id={self.id}, document_id={self.document_id}, shared_with={self.shared_with_user_id})>"


class Comment(BaseModel):
    """Comment model for document collaboration"""
    __tablename__ = "comments"
    
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    parent_id = Column(Integer, ForeignKey('comments.id'))  # For threaded comments
    content = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    
    # Position in document (for annotations)
    page_number = Column(Integer)
    x_position = Column(Integer)
    y_position = Column(Integer)
    
    # Relationships
    document = relationship("Document", back_populates="comments")
    parent = relationship("Comment", remote_side="Comment.id", back_populates="replies")
    replies = relationship("Comment", back_populates="parent")
    author = Column(Integer, ForeignKey('users.id'), nullable=False)
    author_user = relationship("User")
    
    def __repr__(self):
        return f"<Comment(id={self.id}, document_id={self.document_id}, author={self.author})>"


# Notification class is imported from notification_models.py to avoid duplication


class Workflow(BaseModel):
    """Workflow model for document approval processes"""
    __tablename__ = "workflows"
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT, nullable=False)
    
    # Template reference
    template_id = Column(Integer, ForeignKey('workflow_templates.id'))
    
    # Document reference
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    
    # Execution tracking
    current_step = Column(Integer, default=0)
    progress_percentage = Column(Integer, default=0)
    
    # Assignment and timing
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    assigned_to = Column(Integer, ForeignKey('users.id'))
    
    # Timestamps
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    due_date = Column(DateTime)
    
    # Configuration
    auto_start = Column(Boolean, default=False)
    parallel_execution = Column(Boolean, default=False)
    
    # Metadata
    workflow_data = Column(JSON, default=dict)
    
    # Relationships
    document = relationship("Document", back_populates="workflows")
    steps = relationship("WorkflowStep", back_populates="workflow", cascade="all, delete-orphan")
    
    # Notification relationships
    notifications = relationship("Notification", back_populates="workflow")
    notification_subscriptions = relationship("NotificationSubscription", back_populates="workflow")
    template = relationship("WorkflowTemplate")
    creator = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<Workflow(id={self.id}, name='{self.name}', status='{self.status}')>"


class WorkflowTemplate(BaseModel):
    """Workflow template model for reusable workflows"""
    __tablename__ = "workflow_templates"
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # e.g., 'invoice_approval', 'contract_review'
    
    # Configuration
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    auto_trigger_conditions = Column(JSON)  # Conditions for auto-triggering
    
    # Relationships
    workflows = relationship("Workflow", back_populates="template")
    step_templates = relationship("WorkflowStepTemplate", back_populates="template", order_by="WorkflowStepTemplate.order")
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User")
    
    def __repr__(self):
        return f"<WorkflowTemplate(id={self.id}, name='{self.name}')>"


class WorkflowStep(BaseModel):
    """Workflow step model for individual workflow steps"""
    __tablename__ = "workflow_steps"
    
    workflow_id = Column(Integer, ForeignKey('workflows.id'), nullable=False)
    template_step_id = Column(Integer, ForeignKey('workflow_step_templates.id'))
    
    # Step details
    step_number = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    step_type = Column(Enum(WorkflowStepType), nullable=False)
    order = Column(Integer, nullable=False)
    
    # Assignment
    assigned_to = Column(Integer, ForeignKey('users.id'))
    assigned_role = Column(String(100))  # Alternative to specific user assignment
    
    # Status and timing
    status = Column(Enum(WorkflowStepStatus), default=WorkflowStepStatus.PENDING, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    due_date = Column(DateTime)
    
    # Configuration
    is_required = Column(Boolean, default=True)
    auto_complete = Column(Boolean, default=False)
    timeout_hours = Column(Integer)
    
    # Step data
    step_data = Column(JSON, default=dict)
    result_data = Column(JSON, default=dict)  # Store step results
    comments = Column(Text)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="steps")
    template_step = relationship("WorkflowStepTemplate")
    assignee = relationship("User")
    
    def __repr__(self):
        return f"<WorkflowStep(id={self.id}, name='{self.name}', status='{self.status}')>"


class WorkflowStepTemplate(BaseModel):
    """Workflow step template model for reusable workflow steps"""
    __tablename__ = "workflow_step_templates"
    
    template_id = Column(Integer, ForeignKey('workflow_templates.id'), nullable=False)
    
    # Step details
    name = Column(String(255), nullable=False)
    description = Column(Text)
    step_type = Column(Enum(WorkflowStepType), nullable=False)
    order = Column(Integer, nullable=False)
    
    # Default assignment
    default_assigned_role = Column(String(100))
    
    # Configuration
    is_required = Column(Boolean, default=True)
    auto_complete = Column(Boolean, default=False)
    timeout_hours = Column(Integer)
    conditions = Column(JSON)  # Conditions for step execution
    
    # Relationships
    template = relationship("WorkflowTemplate", back_populates="step_templates")
    steps = relationship("WorkflowStep", back_populates="template_step")
    
    def __repr__(self):
        return f"<WorkflowStepTemplate(id={self.id}, name='{self.name}', type='{self.step_type}')>"


class ActivityLog(BaseModel):
    """Activity log model for audit trail"""
    __tablename__ = "activity_logs"
    
    user_id = Column(Integer, ForeignKey('users.id'))
    action = Column(String(100), nullable=False)  # e.g., 'document_uploaded', 'user_login'
    resource_type = Column(String(50))  # e.g., 'document', 'user', 'workflow'
    resource_id = Column(Integer)
    
    # Details
    description = Column(Text)
    extra_data = Column(JSON)  # Additional context data
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<ActivityLog(id={self.id}, action='{self.action}', user_id={self.user_id})>"





class SearchQuery(BaseModel):
    """Search query model for search analytics"""
    __tablename__ = "search_queries"
    
    user_id = Column(Integer, ForeignKey('users.id'))
    query = Column(String(500), nullable=False)
    filters = Column(JSON)  # Applied filters
    
    # Results
    result_count = Column(Integer, default=0)
    execution_time = Column(Integer)  # Milliseconds
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<SearchQuery(id={self.id}, query='{self.query}', results={self.result_count})>"


class DocumentFavorite(BaseModel):
    """Document favorite model for user favorites"""
    __tablename__ = "document_favorites"
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    
    # Relationships
    user = relationship("User")
    document = relationship("Document")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'document_id', name='unique_user_document_favorite'),
    )
    
    def __repr__(self):
        return f"<DocumentFavorite(user_id={self.user_id}, document_id={self.document_id})>"


class DocumentView(BaseModel):
    """Document view model for tracking document access"""
    __tablename__ = "document_views"
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    view_duration = Column(Integer)  # Seconds
    
    # Relationships
    user = relationship("User")
    document = relationship("Document")
    
    def __repr__(self):
        return f"<DocumentView(user_id={self.user_id}, document_id={self.document_id})>"