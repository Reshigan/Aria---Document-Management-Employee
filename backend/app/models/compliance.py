from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
import enum

class ComplianceFramework(enum.Enum):
    GDPR = "gdpr"
    HIPAA = "hipaa"
    SOX = "sox"
    ISO27001 = "iso27001"
    PCI_DSS = "pci_dss"
    CCPA = "ccpa"
    FERPA = "ferpa"
    CUSTOM = "custom"

class AuditEventType(enum.Enum):
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    DOCUMENT_ACCESS = "document_access"
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_DOWNLOAD = "document_download"
    DOCUMENT_DELETE = "document_delete"
    DOCUMENT_SHARE = "document_share"
    PERMISSION_CHANGE = "permission_change"
    SYSTEM_CONFIG = "system_config"
    DATA_EXPORT = "data_export"
    BACKUP_CREATED = "backup_created"
    BACKUP_RESTORED = "backup_restored"
    SECURITY_INCIDENT = "security_incident"
    COMPLIANCE_VIOLATION = "compliance_violation"

class RiskLevel(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplianceStatus(enum.Enum):
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PENDING_REVIEW = "pending_review"
    REMEDIATION_REQUIRED = "remediation_required"

# Compliance Framework Configuration
class ComplianceFrameworkConfig(Base):
    __tablename__ = "compliance_frameworks"
    
    id = Column(Integer, primary_key=True, index=True)
    framework = Column(Enum(ComplianceFramework), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    version = Column(String(20))
    is_active = Column(Boolean, default=True)
    
    # Configuration settings
    retention_period_days = Column(Integer, default=2555)  # 7 years default
    audit_frequency_days = Column(Integer, default=90)  # Quarterly
    risk_assessment_frequency_days = Column(Integer, default=365)  # Annual
    
    # Notification settings
    notification_enabled = Column(Boolean, default=True)
    alert_threshold_hours = Column(Integer, default=24)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    policies = relationship("CompliancePolicy", back_populates="framework")
    assessments = relationship("ComplianceAssessment", back_populates="framework")
    violations = relationship("ComplianceViolation", back_populates="framework")

# Compliance Policies
class CompliancePolicy(Base):
    __tablename__ = "compliance_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    framework_id = Column(Integer, ForeignKey("compliance_frameworks.id"), nullable=False)
    
    # Policy details
    policy_id = Column(String(50), nullable=False)  # e.g., "GDPR-ART-6"
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100))  # e.g., "Data Protection", "Access Control"
    
    # Implementation details
    implementation_guide = Column(Text)
    technical_controls = Column(JSON)  # List of technical controls
    procedural_controls = Column(JSON)  # List of procedural controls
    
    # Risk and priority
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.MEDIUM)
    priority = Column(Integer, default=5)  # 1-10 scale
    
    # Status and compliance
    is_mandatory = Column(Boolean, default=True)
    is_implemented = Column(Boolean, default=False)
    implementation_date = Column(DateTime(timezone=True))
    next_review_date = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    framework = relationship("ComplianceFrameworkConfig", back_populates="policies")
    assessments = relationship("PolicyAssessment", back_populates="policy")
    violations = relationship("ComplianceViolation", back_populates="policy")

# Audit Trail
class ComplianceAuditLog(Base):
    __tablename__ = "compliance_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Event details
    event_type = Column(Enum(AuditEventType), nullable=False)
    event_category = Column(String(50))  # Grouping for events
    event_description = Column(Text, nullable=False)
    
    # User and session information
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String(100))
    session_id = Column(String(100))
    
    # Request details
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    request_method = Column(String(10))
    request_url = Column(Text)
    request_headers = Column(JSON)
    request_body = Column(JSON)
    
    # Response details
    response_status = Column(Integer)
    response_time_ms = Column(Float)
    
    # Resource information
    resource_type = Column(String(50))  # e.g., "document", "user", "system"
    resource_id = Column(String(100))
    resource_name = Column(String(200))
    
    # Change tracking
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # Risk and compliance
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    compliance_relevant = Column(Boolean, default=False)
    retention_until = Column(DateTime(timezone=True))
    
    # Geolocation
    country = Column(String(2))  # ISO country code
    region = Column(String(100))
    city = Column(String(100))
    
    # Metadata
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# Compliance Assessments
class ComplianceAssessment(Base):
    __tablename__ = "compliance_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    framework_id = Column(Integer, ForeignKey("compliance_frameworks.id"), nullable=False)
    
    # Assessment details
    assessment_name = Column(String(200), nullable=False)
    assessment_type = Column(String(50))  # "internal", "external", "self"
    scope = Column(Text)  # Description of assessment scope
    
    # Timing
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    
    # Status and results
    status = Column(Enum(ComplianceStatus), default=ComplianceStatus.PENDING_REVIEW)
    overall_score = Column(Float)  # 0-100 compliance score
    findings_summary = Column(Text)
    recommendations = Column(JSON)
    
    # Assessor information
    assessor_name = Column(String(100))
    assessor_organization = Column(String(200))
    assessor_credentials = Column(String(200))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    framework = relationship("ComplianceFrameworkConfig", back_populates="assessments")
    policy_assessments = relationship("PolicyAssessment", back_populates="assessment")

# Policy-specific assessments
class PolicyAssessment(Base):
    __tablename__ = "policy_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("compliance_assessments.id"), nullable=False)
    policy_id = Column(Integer, ForeignKey("compliance_policies.id"), nullable=False)
    
    # Assessment results
    compliance_status = Column(Enum(ComplianceStatus), nullable=False)
    compliance_score = Column(Float)  # 0-100
    
    # Findings
    findings = Column(Text)
    evidence = Column(JSON)  # Supporting evidence/documentation
    gaps_identified = Column(JSON)  # List of compliance gaps
    
    # Remediation
    remediation_required = Column(Boolean, default=False)
    remediation_plan = Column(Text)
    remediation_due_date = Column(DateTime(timezone=True))
    remediation_owner = Column(Integer, ForeignKey("users.id"))
    
    # Risk assessment
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.MEDIUM)
    risk_description = Column(Text)
    
    # Metadata
    assessed_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    assessment = relationship("ComplianceAssessment", back_populates="policy_assessments")
    policy = relationship("CompliancePolicy", back_populates="assessments")

# Compliance Violations
class ComplianceViolation(Base):
    __tablename__ = "compliance_violations"
    
    id = Column(Integer, primary_key=True, index=True)
    framework_id = Column(Integer, ForeignKey("compliance_frameworks.id"), nullable=False)
    policy_id = Column(Integer, ForeignKey("compliance_policies.id"))
    
    # Violation details
    violation_type = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Severity and impact
    severity = Column(Enum(RiskLevel), nullable=False)
    impact_description = Column(Text)
    affected_systems = Column(JSON)
    affected_data_types = Column(JSON)
    
    # Detection
    detected_at = Column(DateTime(timezone=True), nullable=False)
    detected_by = Column(String(100))  # System, user, or external
    detection_method = Column(String(100))  # automated, manual, audit
    
    # Related audit events
    related_audit_logs = Column(JSON)  # List of audit log IDs
    
    # Response and remediation
    status = Column(String(50), default="open")  # open, investigating, resolved, closed
    assigned_to = Column(Integer, ForeignKey("users.id"))
    response_plan = Column(Text)
    remediation_steps = Column(JSON)
    
    # Timeline
    response_due_date = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    
    # Reporting
    reported_to_authorities = Column(Boolean, default=False)
    authority_reference = Column(String(100))
    external_notifications = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    framework = relationship("ComplianceFrameworkConfig", back_populates="violations")
    policy = relationship("CompliancePolicy", back_populates="violations")

# Data Classification
class DataClassification(Base):
    __tablename__ = "data_classifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Classification details
    classification_name = Column(String(100), nullable=False, unique=True)
    classification_level = Column(Integer, nullable=False)  # 1-5 (public to top secret)
    description = Column(Text)
    
    # Handling requirements
    access_requirements = Column(JSON)
    storage_requirements = Column(JSON)
    transmission_requirements = Column(JSON)
    retention_requirements = Column(JSON)
    disposal_requirements = Column(JSON)
    
    # Compliance mapping
    applicable_frameworks = Column(JSON)  # List of framework IDs
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

# Document Compliance Tracking
class DocumentCompliance(Base):
    __tablename__ = "document_compliance"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    classification_id = Column(Integer, ForeignKey("data_classifications.id"))
    
    # Compliance status
    compliance_status = Column(Enum(ComplianceStatus), default=ComplianceStatus.PENDING_REVIEW)
    last_reviewed = Column(DateTime(timezone=True))
    next_review_due = Column(DateTime(timezone=True))
    
    # Data subject information (for GDPR, etc.)
    contains_personal_data = Column(Boolean, default=False)
    data_subjects = Column(JSON)  # List of data subject categories
    processing_purposes = Column(JSON)  # List of processing purposes
    legal_basis = Column(JSON)  # Legal basis for processing
    
    # Retention and disposal
    retention_period_years = Column(Integer)
    disposal_date = Column(DateTime(timezone=True))
    disposal_method = Column(String(100))
    
    # Access tracking
    access_log_retention_days = Column(Integer, default=2555)  # 7 years
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

# Compliance Reports
class ComplianceReport(Base):
    __tablename__ = "compliance_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    framework_id = Column(Integer, ForeignKey("compliance_frameworks.id"))
    
    # Report details
    report_name = Column(String(200), nullable=False)
    report_type = Column(String(50))  # "periodic", "incident", "audit", "custom"
    report_period_start = Column(DateTime(timezone=True))
    report_period_end = Column(DateTime(timezone=True))
    
    # Content
    executive_summary = Column(Text)
    findings = Column(JSON)
    metrics = Column(JSON)
    recommendations = Column(JSON)
    
    # Status
    status = Column(String(50), default="draft")  # draft, review, approved, published
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    
    # Distribution
    recipients = Column(JSON)  # List of recipient emails/users
    published_at = Column(DateTime(timezone=True))
    
    # File information
    file_path = Column(String(500))
    file_size = Column(Integer)
    file_hash = Column(String(64))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

# Compliance Metrics
class ComplianceMetric(Base):
    __tablename__ = "compliance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    framework_id = Column(Integer, ForeignKey("compliance_frameworks.id"))
    
    # Metric details
    metric_name = Column(String(100), nullable=False)
    metric_type = Column(String(50))  # "percentage", "count", "duration", "score"
    description = Column(Text)
    
    # Value and targets
    current_value = Column(Float)
    target_value = Column(Float)
    threshold_warning = Column(Float)
    threshold_critical = Column(Float)
    
    # Calculation
    calculation_method = Column(Text)
    data_sources = Column(JSON)
    update_frequency = Column(String(50))  # "daily", "weekly", "monthly"
    
    # Status
    last_calculated = Column(DateTime(timezone=True))
    next_calculation = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))