from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging

from backend.core.database import get_db
from backend.app.services.compliance_service import ComplianceService
from backend.app.models.compliance import (
    ComplianceFramework, AuditEventType, RiskLevel, ComplianceStatus
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compliance", tags=["compliance"])

# Pydantic models for request/response
class ComplianceFrameworkCreate(BaseModel):
    framework: str = Field(..., description="Framework type (gdpr, hipaa, sox, etc.)")
    name: str = Field(..., description="Framework display name")
    description: Optional[str] = None
    version: Optional[str] = "1.0"
    retention_period_days: Optional[int] = 2555
    audit_frequency_days: Optional[int] = 90
    risk_assessment_frequency_days: Optional[int] = 365
    notification_enabled: Optional[bool] = True
    alert_threshold_hours: Optional[int] = 24

class CompliancePolicyCreate(BaseModel):
    framework_id: int
    policy_id: str = Field(..., description="Unique policy identifier")
    title: str = Field(..., description="Policy title")
    description: str = Field(..., description="Policy description")
    category: Optional[str] = None
    implementation_guide: Optional[str] = None
    technical_controls: Optional[List[str]] = []
    procedural_controls: Optional[List[str]] = []
    risk_level: Optional[str] = "medium"
    priority: Optional[int] = Field(5, ge=1, le=10)
    is_mandatory: Optional[bool] = True

class AuditLogCreate(BaseModel):
    event_type: str
    description: str
    user_id: Optional[int] = None
    username: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_method: Optional[str] = None
    request_url: Optional[str] = None
    request_headers: Optional[Dict[str, Any]] = None
    request_body: Optional[Dict[str, Any]] = None
    response_status: Optional[int] = None
    response_time_ms: Optional[float] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    risk_level: Optional[str] = "low"
    compliance_relevant: Optional[bool] = False
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None

class ComplianceAssessmentCreate(BaseModel):
    framework_id: int
    assessment_name: str
    assessment_type: Optional[str] = "internal"
    scope: Optional[str] = None
    start_date: str
    due_date: Optional[str] = None
    assessor_name: Optional[str] = None
    assessor_organization: Optional[str] = None
    assessor_credentials: Optional[str] = None

class PolicyAssessmentCreate(BaseModel):
    compliance_status: str
    compliance_score: Optional[float] = Field(None, ge=0, le=100)
    findings: Optional[str] = None
    evidence: Optional[List[Dict[str, Any]]] = []
    gaps_identified: Optional[List[str]] = []
    remediation_required: Optional[bool] = False
    remediation_plan: Optional[str] = None
    remediation_due_date: Optional[str] = None
    remediation_owner: Optional[int] = None
    risk_level: Optional[str] = "medium"
    risk_description: Optional[str] = None

class ComplianceViolationCreate(BaseModel):
    framework_id: int
    policy_id: Optional[int] = None
    violation_type: str
    title: str
    description: str
    severity: str
    impact_description: Optional[str] = None
    affected_systems: Optional[List[str]] = []
    affected_data_types: Optional[List[str]] = []
    detected_at: str
    detected_by: Optional[str] = None
    detection_method: Optional[str] = "manual"
    related_audit_logs: Optional[List[int]] = []
    assigned_to: Optional[int] = None
    response_plan: Optional[str] = None
    remediation_steps: Optional[List[str]] = []
    response_due_date: Optional[str] = None

class DataClassificationCreate(BaseModel):
    classification_name: str
    classification_level: int = Field(..., ge=1, le=5)
    description: Optional[str] = None
    access_requirements: Optional[Dict[str, Any]] = {}
    storage_requirements: Optional[Dict[str, Any]] = {}
    transmission_requirements: Optional[Dict[str, Any]] = {}
    retention_requirements: Optional[Dict[str, Any]] = {}
    disposal_requirements: Optional[Dict[str, Any]] = {}
    applicable_frameworks: Optional[List[int]] = []

class DocumentClassificationCreate(BaseModel):
    classification_id: Optional[int] = None
    compliance_status: Optional[str] = "pending_review"
    contains_personal_data: Optional[bool] = False
    data_subjects: Optional[List[str]] = []
    processing_purposes: Optional[List[str]] = []
    legal_basis: Optional[List[str]] = []
    retention_period_years: Optional[int] = None

class ComplianceReportCreate(BaseModel):
    framework_id: Optional[int] = None
    report_name: str
    report_type: Optional[str] = "periodic"
    report_period_start: str
    report_period_end: str
    executive_summary: Optional[str] = None
    recommendations: Optional[List[Dict[str, Any]]] = []
    recipients: Optional[List[str]] = []

# Dependency to get current user (simplified for demo)
async def get_current_user():
    return {"id": 1, "username": "admin"}  # Mock user

# Framework Management Endpoints
@router.post("/frameworks")
async def create_compliance_framework(
    framework_data: ComplianceFrameworkCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new compliance framework"""
    try:
        service = ComplianceService(db)
        framework = await service.create_compliance_framework(
            framework_data.dict(),
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Compliance framework created successfully",
            "framework": {
                "id": framework.id,
                "framework": framework.framework.value,
                "name": framework.name,
                "description": framework.description,
                "version": framework.version,
                "is_active": framework.is_active,
                "created_at": framework.created_at
            }
        }
    except Exception as e:
        logger.error(f"Error creating compliance framework: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/frameworks")
async def get_compliance_frameworks(
    active_only: bool = Query(True, description="Return only active frameworks"),
    db: Session = Depends(get_db)
):
    """Get all compliance frameworks"""
    try:
        service = ComplianceService(db)
        frameworks = await service.get_compliance_frameworks(active_only)
        return {
            "success": True,
            "frameworks": [
                {
                    "id": f.id,
                    "framework": f.framework.value,
                    "name": f.name,
                    "description": f.description,
                    "version": f.version,
                    "is_active": f.is_active,
                    "retention_period_days": f.retention_period_days,
                    "audit_frequency_days": f.audit_frequency_days,
                    "created_at": f.created_at
                }
                for f in frameworks
            ]
        }
    except Exception as e:
        logger.error(f"Error getting compliance frameworks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/frameworks/{framework_id}")
async def update_framework_config(
    framework_id: int,
    updates: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update compliance framework configuration"""
    try:
        service = ComplianceService(db)
        framework = await service.update_framework_config(
            framework_id,
            updates,
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Framework configuration updated successfully",
            "framework": {
                "id": framework.id,
                "name": framework.name,
                "retention_period_days": framework.retention_period_days,
                "audit_frequency_days": framework.audit_frequency_days,
                "notification_enabled": framework.notification_enabled,
                "updated_at": framework.updated_at
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating framework config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Policy Management Endpoints
@router.post("/policies")
async def create_compliance_policy(
    policy_data: CompliancePolicyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new compliance policy"""
    try:
        service = ComplianceService(db)
        policy = await service.create_compliance_policy(
            policy_data.dict(),
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Compliance policy created successfully",
            "policy": {
                "id": policy.id,
                "policy_id": policy.policy_id,
                "title": policy.title,
                "description": policy.description,
                "category": policy.category,
                "risk_level": policy.risk_level.value,
                "priority": policy.priority,
                "is_mandatory": policy.is_mandatory,
                "is_implemented": policy.is_implemented,
                "created_at": policy.created_at
            }
        }
    except Exception as e:
        logger.error(f"Error creating compliance policy: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/frameworks/{framework_id}/policies")
async def get_policies_by_framework(
    framework_id: int,
    db: Session = Depends(get_db)
):
    """Get all policies for a specific framework"""
    try:
        service = ComplianceService(db)
        policies = await service.get_policies_by_framework(framework_id)
        return {
            "success": True,
            "policies": [
                {
                    "id": p.id,
                    "policy_id": p.policy_id,
                    "title": p.title,
                    "description": p.description,
                    "category": p.category,
                    "risk_level": p.risk_level.value,
                    "priority": p.priority,
                    "is_mandatory": p.is_mandatory,
                    "is_implemented": p.is_implemented,
                    "implementation_date": p.implementation_date,
                    "next_review_date": p.next_review_date,
                    "created_at": p.created_at
                }
                for p in policies
            ]
        }
    except Exception as e:
        logger.error(f"Error getting policies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/policies/{policy_id}/implementation")
async def update_policy_implementation(
    policy_id: int,
    is_implemented: bool,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update policy implementation status"""
    try:
        service = ComplianceService(db)
        policy = await service.update_policy_implementation(
            policy_id,
            is_implemented,
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Policy implementation status updated",
            "policy": {
                "id": policy.id,
                "title": policy.title,
                "is_implemented": policy.is_implemented,
                "implementation_date": policy.implementation_date
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating policy implementation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Audit Logging Endpoints
@router.post("/audit-logs")
async def create_audit_log(
    audit_data: AuditLogCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new audit log entry"""
    try:
        service = ComplianceService(db)
        
        # Extract request information if not provided
        if not audit_data.ip_address:
            audit_data.ip_address = request.client.host
        if not audit_data.user_agent:
            audit_data.user_agent = request.headers.get("user-agent")
        
        audit_log = await service.log_audit_event(
            event_type=AuditEventType(audit_data.event_type),
            description=audit_data.description,
            user_id=audit_data.user_id,
            username=audit_data.username,
            session_id=audit_data.session_id,
            ip_address=audit_data.ip_address,
            user_agent=audit_data.user_agent,
            request_method=audit_data.request_method,
            request_url=audit_data.request_url,
            request_headers=audit_data.request_headers,
            request_body=audit_data.request_body,
            response_status=audit_data.response_status,
            response_time_ms=audit_data.response_time_ms,
            resource_type=audit_data.resource_type,
            resource_id=audit_data.resource_id,
            resource_name=audit_data.resource_name,
            old_values=audit_data.old_values,
            new_values=audit_data.new_values,
            risk_level=RiskLevel(audit_data.risk_level),
            compliance_relevant=audit_data.compliance_relevant,
            country=audit_data.country,
            region=audit_data.region,
            city=audit_data.city
        )
        
        return {
            "success": True,
            "message": "Audit log created successfully",
            "audit_log_id": audit_log.id
        }
    except Exception as e:
        logger.error(f"Error creating audit log: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit-logs")
async def get_audit_logs(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    event_types: Optional[str] = Query(None, description="Comma-separated event types"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    compliance_relevant: Optional[bool] = Query(None, description="Filter by compliance relevance"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db)
):
    """Get audit logs with filtering"""
    try:
        service = ComplianceService(db)
        
        # Parse parameters
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None
        event_type_list = [AuditEventType(et.strip()) for et in event_types.split(",")] if event_types else None
        risk_level_enum = RiskLevel(risk_level) if risk_level else None
        
        audit_logs = await service.get_audit_logs(
            start_date=start_dt,
            end_date=end_dt,
            user_id=user_id,
            event_types=event_type_list,
            resource_type=resource_type,
            risk_level=risk_level_enum,
            compliance_relevant=compliance_relevant,
            limit=limit,
            offset=offset
        )
        
        return {
            "success": True,
            "audit_logs": [
                {
                    "id": log.id,
                    "event_type": log.event_type.value,
                    "event_description": log.event_description,
                    "user_id": log.user_id,
                    "username": log.username,
                    "ip_address": log.ip_address,
                    "resource_type": log.resource_type,
                    "resource_id": log.resource_id,
                    "resource_name": log.resource_name,
                    "risk_level": log.risk_level.value,
                    "compliance_relevant": log.compliance_relevant,
                    "timestamp": log.timestamp,
                    "old_values": log.old_values,
                    "new_values": log.new_values
                }
                for log in audit_logs
            ],
            "total": len(audit_logs),
            "offset": offset,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Assessment Endpoints
@router.post("/assessments")
async def create_compliance_assessment(
    assessment_data: ComplianceAssessmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new compliance assessment"""
    try:
        service = ComplianceService(db)
        assessment = await service.create_compliance_assessment(
            assessment_data.dict(),
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Compliance assessment created successfully",
            "assessment": {
                "id": assessment.id,
                "assessment_name": assessment.assessment_name,
                "assessment_type": assessment.assessment_type,
                "scope": assessment.scope,
                "start_date": assessment.start_date,
                "due_date": assessment.due_date,
                "status": assessment.status.value,
                "created_at": assessment.created_at
            }
        }
    except Exception as e:
        logger.error(f"Error creating compliance assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assessments/{assessment_id}/policies/{policy_id}")
async def conduct_policy_assessment(
    assessment_id: int,
    policy_id: int,
    assessment_data: PolicyAssessmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Conduct assessment for a specific policy"""
    try:
        service = ComplianceService(db)
        policy_assessment = await service.conduct_policy_assessment(
            assessment_id,
            policy_id,
            assessment_data.dict(),
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Policy assessment completed successfully",
            "assessment": {
                "id": policy_assessment.id,
                "compliance_status": policy_assessment.compliance_status.value,
                "compliance_score": policy_assessment.compliance_score,
                "findings": policy_assessment.findings,
                "remediation_required": policy_assessment.remediation_required,
                "risk_level": policy_assessment.risk_level.value,
                "assessed_at": policy_assessment.assessed_at
            }
        }
    except Exception as e:
        logger.error(f"Error conducting policy assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Violation Management Endpoints
@router.post("/violations")
async def create_compliance_violation(
    violation_data: ComplianceViolationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new compliance violation"""
    try:
        service = ComplianceService(db)
        violation = await service.create_compliance_violation(
            violation_data.dict(),
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Compliance violation created successfully",
            "violation": {
                "id": violation.id,
                "title": violation.title,
                "violation_type": violation.violation_type,
                "severity": violation.severity.value,
                "status": violation.status,
                "detected_at": violation.detected_at,
                "response_due_date": violation.response_due_date,
                "created_at": violation.created_at
            }
        }
    except Exception as e:
        logger.error(f"Error creating compliance violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/violations/{violation_id}/status")
async def update_violation_status(
    violation_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update violation status"""
    try:
        service = ComplianceService(db)
        violation = await service.update_violation_status(
            violation_id,
            status,
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Violation status updated successfully",
            "violation": {
                "id": violation.id,
                "title": violation.title,
                "status": violation.status,
                "resolved_at": violation.resolved_at,
                "closed_at": violation.closed_at
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating violation status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Data Classification Endpoints
@router.post("/data-classifications")
async def create_data_classification(
    classification_data: DataClassificationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new data classification"""
    try:
        service = ComplianceService(db)
        classification = await service.create_data_classification(
            classification_data.dict(),
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Data classification created successfully",
            "classification": {
                "id": classification.id,
                "classification_name": classification.classification_name,
                "classification_level": classification.classification_level,
                "description": classification.description,
                "created_at": classification.created_at
            }
        }
    except Exception as e:
        logger.error(f"Error creating data classification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/{document_id}/classify")
async def classify_document(
    document_id: int,
    classification_data: DocumentClassificationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Classify a document for compliance"""
    try:
        service = ComplianceService(db)
        doc_compliance = await service.classify_document(
            document_id,
            classification_data.dict(),
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Document classified successfully",
            "classification": {
                "id": doc_compliance.id,
                "document_id": doc_compliance.document_id,
                "compliance_status": doc_compliance.compliance_status.value,
                "contains_personal_data": doc_compliance.contains_personal_data,
                "retention_period_years": doc_compliance.retention_period_years,
                "created_at": doc_compliance.created_at
            }
        }
    except Exception as e:
        logger.error(f"Error classifying document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Reporting Endpoints
@router.post("/reports")
async def generate_compliance_report(
    report_data: ComplianceReportCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate a compliance report"""
    try:
        service = ComplianceService(db)
        report = await service.generate_compliance_report(
            report_data.dict(),
            current_user["id"]
        )
        return {
            "success": True,
            "message": "Compliance report generated successfully",
            "report": {
                "id": report.id,
                "report_name": report.report_name,
                "report_type": report.report_type,
                "report_period_start": report.report_period_start,
                "report_period_end": report.report_period_end,
                "status": report.status,
                "metrics": report.metrics,
                "findings": report.findings,
                "created_at": report.created_at
            }
        }
    except Exception as e:
        logger.error(f"Error generating compliance report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Dashboard and Statistics
@router.get("/dashboard")
async def get_compliance_dashboard(
    framework_id: Optional[int] = Query(None, description="Filter by framework ID"),
    db: Session = Depends(get_db)
):
    """Get compliance dashboard statistics"""
    try:
        service = ComplianceService(db)
        stats = await service.get_compliance_dashboard_stats(framework_id)
        return {
            "success": True,
            "dashboard": stats
        }
    except Exception as e:
        logger.error(f"Error getting compliance dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health Check
@router.get("/health")
async def compliance_health_check():
    """Health check for compliance system"""
    return {
        "success": True,
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "service": "compliance",
        "version": "1.0.0"
    }