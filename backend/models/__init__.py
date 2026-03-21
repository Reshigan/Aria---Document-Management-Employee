"""
Database models package
"""
from .base import Base
from .user import User, PasswordResetToken
from .document import Document, DocumentType, DocumentStatus
from .advanced import (
    Folder, FolderPermission, Tag, DocumentVersionSimple, ShareLink, DocumentShare, Comment,
    Workflow, WorkflowTemplate, WorkflowStep, WorkflowStepTemplate,
    ActivityLog, SearchQuery, DocumentFavorite,
    DocumentView, ShareLinkType, WorkflowStatus,
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
    Notification, NotificationDelivery, NotificationTemplate, 
    NotificationPreference, NotificationSubscription,
    NotificationType, NotificationPriority, NotificationChannel
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
from .integration_models import (
    Integration, IntegrationSyncLog, WebhookEndpoint, WebhookDelivery,
    IntegrationType, IntegrationStatus, WebhookEventType
)
from .document_processing_models import (
    DocumentProcessingJob, OCRResult, DocumentClassificationResult,
    ContentExtractionResult, DocumentConversionResult, AIAnalysisResult,
    ProcessingType, ProcessingStatus
)
from .accounting import (
    ChartOfAccounts, GeneralLedger, GeneralLedgerLine, TaxRate, FiscalPeriod,
    AccountType, AccountSubType, JournalEntryType, JournalStatus
)
from .transactions import (
    Customer, Supplier, Invoice, InvoiceLine, Bill, BillLine, Payment, PaymentAllocation,
    InvoiceStatus, PaymentStatus, PaymentMethod, VATType
)
from .inventory import (
    Product, Warehouse, StockLevel, StockMovement, StockAdjustment, StockAdjustmentLine,
    ProductType, StockValuationMethod, StockMovementType
)
from .crm import (
    Lead, Opportunity, Quote, QuoteLine, CRMActivity, Pipeline,
    LeadStatus, LeadSource, OpportunityStage, QuoteStatus, CRMActivityType
)
from .hr import (
    Employee, PayrollPeriod, PayrollEntry, LeaveRequest, IRP5Certificate, Recruitment, JobApplication,
    EmploymentType, EmployeeStatus, LeaveType, LeaveRequestStatus, PayrollStatus
)

__all__ = [
    "Base",
    # User models
    "User", "PasswordResetToken",
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
    # Notification models
    "Notification", "NotificationDelivery", "NotificationTemplate", 
    "NotificationPreference", "NotificationSubscription",
    # Analytics models
    "DocumentAnalytics", "UserActivityLog", "SystemMetrics", "WorkflowAnalytics",
    "ReportTemplate", "GeneratedReport", "DashboardWidget", "AlertRule",
    # Security models
    "SecurityPermission", "SecurityRole", "RolePermission", "SecurityUserRole",
    "SecurityUserSession", "PasswordHistory", "TwoFactorAuth", "SecurityEvent", "AuditLog",
    "SecurityAPIKey", "LoginAttempt", "AccountLockout", "SecurityPolicy",
    # Integration models
    "Integration", "IntegrationSyncLog", "WebhookEndpoint", "WebhookDelivery",
    # Document processing models
    "DocumentProcessingJob", "OCRResult", "DocumentClassificationResult",
    "ContentExtractionResult", "DocumentConversionResult", "AIAnalysisResult",
    # Enums
    "ShareLinkType", "WorkflowStatus", "WorkflowStepType", 
    "WorkflowStepStatus", "WorkflowTaskStatus", "TagType", "TagCategory",
    "NotificationType", "NotificationPriority", "NotificationChannel",
    "SessionStatus", "SecurityEventType", "AuditAction",
    "VersionStatus", "MergeStatus", "ConflictType", "ChangeType",
    "IntegrationType", "IntegrationStatus", "WebhookEventType",
    "ProcessingType", "ProcessingStatus",
    # Accounting models
    "ChartOfAccounts", "GeneralLedger", "GeneralLedgerLine", "TaxRate", "FiscalPeriod",
    "AccountType", "AccountSubType", "JournalEntryType", "JournalStatus",
    # Transaction models
    "Customer", "Supplier", "Invoice", "InvoiceLine", "Bill", "BillLine", "Payment", "PaymentAllocation",
    "InvoiceStatus", "PaymentStatus", "PaymentMethod", "VATType",
    # Inventory models
    "Product", "Warehouse", "StockLevel", "StockMovement", "StockAdjustment", "StockAdjustmentLine",
    "ProductType", "StockValuationMethod", "StockMovementType",
    # CRM models
    "Lead", "Opportunity", "Quote", "QuoteLine", "CRMActivity", "Pipeline",
    "LeadStatus", "LeadSource", "OpportunityStage", "QuoteStatus", "CRMActivityType",
    # HR models
    "Employee", "PayrollPeriod", "PayrollEntry", "LeaveRequest", "IRP5Certificate", "Recruitment", "JobApplication",
    "EmploymentType", "EmployeeStatus", "LeaveType", "LeaveRequestStatus", "PayrollStatus",
    # Association tables
    "document_tags", "document_shares", "folder_permissions", "document_enhanced_tags"
]