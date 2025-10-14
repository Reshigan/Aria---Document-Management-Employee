"""
Database models package
"""
from .base import Base
from .user import User, PasswordResetToken, UserActivity
from .document import Document, DocumentType, DocumentStatus
from .advanced import (
    Folder, FolderPermission, Tag, DocumentVersionSimple, ShareLink, DocumentShare, Comment,
    Workflow, WorkflowTemplate, WorkflowStep, WorkflowStepTemplate,
    ActivityLog, SearchQuery, DocumentFavorite,
    DocumentView, ShareLinkType, NotificationType, WorkflowStatus,
    WorkflowStepType, WorkflowStepStatus, document_tags, document_shares,
    folder_permissions
)
from .tag_models import (
    EnhancedTag, TagHierarchy, TagAnalytics, AutoTagRule, TagSuggestion, TagTemplate,
    TagType, TagCategory, document_enhanced_tags
)
from .workflow_models import (
    WorkflowTask,
    WorkflowStatus, WorkflowStepType, WorkflowStepStatus, WorkflowTaskStatus
)
from .advanced import Workflow, WorkflowTemplate, WorkflowStep, WorkflowStepTemplate
from .notification_models import (
    Notification as EnhancedNotification, NotificationDelivery, NotificationTemplate, 
    NotificationPreference, NotificationSubscription,
    NotificationType as EnhancedNotificationType, NotificationPriority, NotificationChannel
)
from .analytics_models import (
    DocumentAnalytics, UserActivityLog, SystemMetrics, WorkflowAnalytics,
    ReportTemplate, GeneratedReport, DashboardWidget, AlertRule
)
from .security_models import (
    Permission as SecurityPermission, Role as SecurityRole, RolePermission, UserRole as SecurityUserRole,
    UserSession as SecurityUserSession, PasswordHistory, TwoFactorAuth, SecurityEvent, AuditLog,
    APIKey as SecurityAPIKey, LoginAttempt, AccountLockout, SecurityPolicy,
    SessionStatus, SecurityEventType, AuditAction
)
from .version_control import (
    DocumentVersion, DocumentBranch, DocumentChange, MergeRequest, 
    VersionComparison, MergeConflict, VersionStatus, MergeStatus, ConflictType, ChangeType
)

__all__ = [
    "Base",
    # User models
    "User", "PasswordResetToken", "UserActivity",
    # Document models
    "Document", "DocumentType", "DocumentStatus",
    # Advanced models
    "Folder", "FolderPermission", "Tag", "DocumentVersionSimple", "ShareLink", "DocumentShare", "Comment",
    "ActivityLog", "SearchQuery", "DocumentFavorite",
    "DocumentView",
    # Version control models
    "DocumentVersion", "DocumentBranch", "DocumentChange", "MergeRequest", 
    "VersionComparison", "MergeConflict",
    # Enhanced Tag models
    "EnhancedTag", "TagHierarchy", "TagAnalytics", "AutoTagRule", "TagSuggestion", "TagTemplate",
    # Workflow models
    "Workflow", "WorkflowTemplate", "WorkflowStep", "WorkflowStepTemplate", "WorkflowTask",
    # Enhanced Notification models
    "EnhancedNotification", "NotificationDelivery", "NotificationTemplate", 
    "NotificationPreference", "NotificationSubscription",
    # Analytics models
    "DocumentAnalytics", "UserActivityLog", "SystemMetrics", "WorkflowAnalytics",
    "ReportTemplate", "GeneratedReport", "DashboardWidget", "AlertRule",
    # Security models
    "SecurityPermission", "SecurityRole", "RolePermission", "SecurityUserRole",
    "SecurityUserSession", "PasswordHistory", "TwoFactorAuth", "SecurityEvent", "AuditLog",
    "SecurityAPIKey", "LoginAttempt", "AccountLockout", "SecurityPolicy",
    # Enums
    "ShareLinkType", "NotificationType", "WorkflowStatus", "WorkflowStepType", 
    "WorkflowStepStatus", "WorkflowTaskStatus", "TagType", "TagCategory",
    "EnhancedNotificationType", "NotificationPriority", "NotificationChannel",
    "SessionStatus", "SecurityEventType", "AuditAction",
    "VersionStatus", "MergeStatus", "ConflictType", "ChangeType",
    # Association tables
    "document_tags", "document_shares", "folder_permissions", "document_enhanced_tags"
]