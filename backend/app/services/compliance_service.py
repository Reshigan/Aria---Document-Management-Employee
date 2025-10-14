from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import json
import hashlib
import logging
from pathlib import Path

from app.models.compliance import (
    ComplianceFrameworkConfig, CompliancePolicy, AuditLog, ComplianceAssessment,
    PolicyAssessment, ComplianceViolation, DataClassification, DocumentCompliance,
    ComplianceReport, ComplianceMetric, ComplianceFramework, AuditEventType,
    RiskLevel, ComplianceStatus
)

logger = logging.getLogger(__name__)

class ComplianceService:
    def __init__(self, db: Session):
        self.db = db
    
    # Framework Management
    async def create_compliance_framework(self, framework_data: Dict[str, Any], user_id: int) -> ComplianceFrameworkConfig:
        """Create a new compliance framework configuration"""
        try:
            framework = ComplianceFrameworkConfig(
                framework=ComplianceFramework(framework_data["framework"]),
                name=framework_data["name"],
                description=framework_data.get("description"),
                version=framework_data.get("version", "1.0"),
                retention_period_days=framework_data.get("retention_period_days", 2555),
                audit_frequency_days=framework_data.get("audit_frequency_days", 90),
                risk_assessment_frequency_days=framework_data.get("risk_assessment_frequency_days", 365),
                notification_enabled=framework_data.get("notification_enabled", True),
                alert_threshold_hours=framework_data.get("alert_threshold_hours", 24),
                created_by=user_id
            )
            
            self.db.add(framework)
            self.db.commit()
            self.db.refresh(framework)
            
            # Log framework creation
            await self.log_audit_event(
                event_type=AuditEventType.SYSTEM_CONFIG,
                description=f"Created compliance framework: {framework.name}",
                user_id=user_id,
                resource_type="compliance_framework",
                resource_id=str(framework.id),
                new_values=framework_data
            )
            
            return framework
            
        except Exception as e:
            logger.error(f"Error creating compliance framework: {str(e)}")
            self.db.rollback()
            raise
    
    async def get_compliance_frameworks(self, active_only: bool = True) -> List[ComplianceFrameworkConfig]:
        """Get all compliance frameworks"""
        query = self.db.query(ComplianceFrameworkConfig)
        if active_only:
            query = query.filter(ComplianceFrameworkConfig.is_active == True)
        return query.all()
    
    async def update_framework_config(self, framework_id: int, updates: Dict[str, Any], user_id: int) -> ComplianceFrameworkConfig:
        """Update compliance framework configuration"""
        framework = self.db.query(ComplianceFrameworkConfig).filter(
            ComplianceFrameworkConfig.id == framework_id
        ).first()
        
        if not framework:
            raise ValueError("Compliance framework not found")
        
        old_values = {
            "retention_period_days": framework.retention_period_days,
            "audit_frequency_days": framework.audit_frequency_days,
            "notification_enabled": framework.notification_enabled
        }
        
        # Update fields
        for key, value in updates.items():
            if hasattr(framework, key):
                setattr(framework, key, value)
        
        self.db.commit()
        self.db.refresh(framework)
        
        # Log configuration change
        await self.log_audit_event(
            event_type=AuditEventType.SYSTEM_CONFIG,
            description=f"Updated compliance framework configuration: {framework.name}",
            user_id=user_id,
            resource_type="compliance_framework",
            resource_id=str(framework.id),
            old_values=old_values,
            new_values=updates
        )
        
        return framework
    
    # Policy Management
    async def create_compliance_policy(self, policy_data: Dict[str, Any], user_id: int) -> CompliancePolicy:
        """Create a new compliance policy"""
        try:
            policy = CompliancePolicy(
                framework_id=policy_data["framework_id"],
                policy_id=policy_data["policy_id"],
                title=policy_data["title"],
                description=policy_data["description"],
                category=policy_data.get("category"),
                implementation_guide=policy_data.get("implementation_guide"),
                technical_controls=policy_data.get("technical_controls", []),
                procedural_controls=policy_data.get("procedural_controls", []),
                risk_level=RiskLevel(policy_data.get("risk_level", "medium")),
                priority=policy_data.get("priority", 5),
                is_mandatory=policy_data.get("is_mandatory", True),
                created_by=user_id
            )
            
            self.db.add(policy)
            self.db.commit()
            self.db.refresh(policy)
            
            # Log policy creation
            await self.log_audit_event(
                event_type=AuditEventType.SYSTEM_CONFIG,
                description=f"Created compliance policy: {policy.title}",
                user_id=user_id,
                resource_type="compliance_policy",
                resource_id=str(policy.id),
                new_values=policy_data
            )
            
            return policy
            
        except Exception as e:
            logger.error(f"Error creating compliance policy: {str(e)}")
            self.db.rollback()
            raise
    
    async def get_policies_by_framework(self, framework_id: int) -> List[CompliancePolicy]:
        """Get all policies for a specific framework"""
        return self.db.query(CompliancePolicy).filter(
            CompliancePolicy.framework_id == framework_id
        ).order_by(CompliancePolicy.priority.desc()).all()
    
    async def update_policy_implementation(self, policy_id: int, is_implemented: bool, user_id: int) -> CompliancePolicy:
        """Update policy implementation status"""
        policy = self.db.query(CompliancePolicy).filter(
            CompliancePolicy.id == policy_id
        ).first()
        
        if not policy:
            raise ValueError("Policy not found")
        
        old_status = policy.is_implemented
        policy.is_implemented = is_implemented
        
        if is_implemented:
            policy.implementation_date = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(policy)
        
        # Log implementation status change
        await self.log_audit_event(
            event_type=AuditEventType.SYSTEM_CONFIG,
            description=f"Updated policy implementation status: {policy.title}",
            user_id=user_id,
            resource_type="compliance_policy",
            resource_id=str(policy.id),
            old_values={"is_implemented": old_status},
            new_values={"is_implemented": is_implemented}
        )
        
        return policy
    
    # Audit Logging
    async def log_audit_event(
        self,
        event_type: AuditEventType,
        description: str,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_url: Optional[str] = None,
        request_headers: Optional[Dict] = None,
        request_body: Optional[Dict] = None,
        response_status: Optional[int] = None,
        response_time_ms: Optional[float] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None,
        risk_level: RiskLevel = RiskLevel.LOW,
        compliance_relevant: bool = False,
        country: Optional[str] = None,
        region: Optional[str] = None,
        city: Optional[str] = None
    ) -> AuditLog:
        """Log an audit event"""
        try:
            # Calculate retention date based on compliance requirements
            retention_until = datetime.utcnow() + timedelta(days=2555)  # 7 years default
            
            audit_log = AuditLog(
                event_type=event_type,
                event_description=description,
                user_id=user_id,
                username=username,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_url=request_url,
                request_headers=request_headers,
                request_body=request_body,
                response_status=response_status,
                response_time_ms=response_time_ms,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_name=resource_name,
                old_values=old_values,
                new_values=new_values,
                risk_level=risk_level,
                compliance_relevant=compliance_relevant,
                retention_until=retention_until,
                country=country,
                region=region,
                city=city
            )
            
            self.db.add(audit_log)
            self.db.commit()
            self.db.refresh(audit_log)
            
            # Check for potential compliance violations
            await self._check_compliance_violations(audit_log)
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Error logging audit event: {str(e)}")
            self.db.rollback()
            raise
    
    async def get_audit_logs(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[int] = None,
        event_types: Optional[List[AuditEventType]] = None,
        resource_type: Optional[str] = None,
        risk_level: Optional[RiskLevel] = None,
        compliance_relevant: Optional[bool] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> List[AuditLog]:
        """Get audit logs with filtering"""
        query = self.db.query(AuditLog)
        
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if event_types:
            query = query.filter(AuditLog.event_type.in_(event_types))
        if resource_type:
            query = query.filter(AuditLog.resource_type == resource_type)
        if risk_level:
            query = query.filter(AuditLog.risk_level == risk_level)
        if compliance_relevant is not None:
            query = query.filter(AuditLog.compliance_relevant == compliance_relevant)
        
        return query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()
    
    # Compliance Assessments
    async def create_compliance_assessment(self, assessment_data: Dict[str, Any], user_id: int) -> ComplianceAssessment:
        """Create a new compliance assessment"""
        try:
            assessment = ComplianceAssessment(
                framework_id=assessment_data["framework_id"],
                assessment_name=assessment_data["assessment_name"],
                assessment_type=assessment_data.get("assessment_type", "internal"),
                scope=assessment_data.get("scope"),
                start_date=datetime.fromisoformat(assessment_data["start_date"]),
                due_date=datetime.fromisoformat(assessment_data["due_date"]) if assessment_data.get("due_date") else None,
                assessor_name=assessment_data.get("assessor_name"),
                assessor_organization=assessment_data.get("assessor_organization"),
                assessor_credentials=assessment_data.get("assessor_credentials"),
                created_by=user_id
            )
            
            self.db.add(assessment)
            self.db.commit()
            self.db.refresh(assessment)
            
            # Log assessment creation
            await self.log_audit_event(
                event_type=AuditEventType.SYSTEM_CONFIG,
                description=f"Created compliance assessment: {assessment.assessment_name}",
                user_id=user_id,
                resource_type="compliance_assessment",
                resource_id=str(assessment.id),
                new_values=assessment_data,
                compliance_relevant=True
            )
            
            return assessment
            
        except Exception as e:
            logger.error(f"Error creating compliance assessment: {str(e)}")
            self.db.rollback()
            raise
    
    async def conduct_policy_assessment(
        self,
        assessment_id: int,
        policy_id: int,
        assessment_data: Dict[str, Any],
        user_id: int
    ) -> PolicyAssessment:
        """Conduct assessment for a specific policy"""
        try:
            policy_assessment = PolicyAssessment(
                assessment_id=assessment_id,
                policy_id=policy_id,
                compliance_status=ComplianceStatus(assessment_data["compliance_status"]),
                compliance_score=assessment_data.get("compliance_score"),
                findings=assessment_data.get("findings"),
                evidence=assessment_data.get("evidence", []),
                gaps_identified=assessment_data.get("gaps_identified", []),
                remediation_required=assessment_data.get("remediation_required", False),
                remediation_plan=assessment_data.get("remediation_plan"),
                remediation_due_date=datetime.fromisoformat(assessment_data["remediation_due_date"]) if assessment_data.get("remediation_due_date") else None,
                remediation_owner=assessment_data.get("remediation_owner"),
                risk_level=RiskLevel(assessment_data.get("risk_level", "medium")),
                risk_description=assessment_data.get("risk_description"),
                created_by=user_id
            )
            
            self.db.add(policy_assessment)
            self.db.commit()
            self.db.refresh(policy_assessment)
            
            # Update overall assessment score
            await self._update_assessment_score(assessment_id)
            
            # Log policy assessment
            await self.log_audit_event(
                event_type=AuditEventType.SYSTEM_CONFIG,
                description=f"Conducted policy assessment for policy ID: {policy_id}",
                user_id=user_id,
                resource_type="policy_assessment",
                resource_id=str(policy_assessment.id),
                new_values=assessment_data,
                compliance_relevant=True
            )
            
            return policy_assessment
            
        except Exception as e:
            logger.error(f"Error conducting policy assessment: {str(e)}")
            self.db.rollback()
            raise
    
    # Violation Management
    async def create_compliance_violation(self, violation_data: Dict[str, Any], user_id: int) -> ComplianceViolation:
        """Create a new compliance violation"""
        try:
            violation = ComplianceViolation(
                framework_id=violation_data["framework_id"],
                policy_id=violation_data.get("policy_id"),
                violation_type=violation_data["violation_type"],
                title=violation_data["title"],
                description=violation_data["description"],
                severity=RiskLevel(violation_data["severity"]),
                impact_description=violation_data.get("impact_description"),
                affected_systems=violation_data.get("affected_systems", []),
                affected_data_types=violation_data.get("affected_data_types", []),
                detected_at=datetime.fromisoformat(violation_data["detected_at"]),
                detected_by=violation_data.get("detected_by"),
                detection_method=violation_data.get("detection_method", "manual"),
                related_audit_logs=violation_data.get("related_audit_logs", []),
                assigned_to=violation_data.get("assigned_to"),
                response_plan=violation_data.get("response_plan"),
                remediation_steps=violation_data.get("remediation_steps", []),
                response_due_date=datetime.fromisoformat(violation_data["response_due_date"]) if violation_data.get("response_due_date") else None,
                created_by=user_id
            )
            
            self.db.add(violation)
            self.db.commit()
            self.db.refresh(violation)
            
            # Log violation creation
            await self.log_audit_event(
                event_type=AuditEventType.COMPLIANCE_VIOLATION,
                description=f"Created compliance violation: {violation.title}",
                user_id=user_id,
                resource_type="compliance_violation",
                resource_id=str(violation.id),
                new_values=violation_data,
                risk_level=violation.severity,
                compliance_relevant=True
            )
            
            return violation
            
        except Exception as e:
            logger.error(f"Error creating compliance violation: {str(e)}")
            self.db.rollback()
            raise
    
    async def update_violation_status(self, violation_id: int, status: str, user_id: int) -> ComplianceViolation:
        """Update violation status"""
        violation = self.db.query(ComplianceViolation).filter(
            ComplianceViolation.id == violation_id
        ).first()
        
        if not violation:
            raise ValueError("Violation not found")
        
        old_status = violation.status
        violation.status = status
        
        if status == "resolved":
            violation.resolved_at = datetime.utcnow()
        elif status == "closed":
            violation.closed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(violation)
        
        # Log status change
        await self.log_audit_event(
            event_type=AuditEventType.COMPLIANCE_VIOLATION,
            description=f"Updated violation status: {violation.title}",
            user_id=user_id,
            resource_type="compliance_violation",
            resource_id=str(violation.id),
            old_values={"status": old_status},
            new_values={"status": status},
            compliance_relevant=True
        )
        
        return violation
    
    # Data Classification
    async def create_data_classification(self, classification_data: Dict[str, Any], user_id: int) -> DataClassification:
        """Create a new data classification"""
        try:
            classification = DataClassification(
                classification_name=classification_data["classification_name"],
                classification_level=classification_data["classification_level"],
                description=classification_data.get("description"),
                access_requirements=classification_data.get("access_requirements", {}),
                storage_requirements=classification_data.get("storage_requirements", {}),
                transmission_requirements=classification_data.get("transmission_requirements", {}),
                retention_requirements=classification_data.get("retention_requirements", {}),
                disposal_requirements=classification_data.get("disposal_requirements", {}),
                applicable_frameworks=classification_data.get("applicable_frameworks", []),
                created_by=user_id
            )
            
            self.db.add(classification)
            self.db.commit()
            self.db.refresh(classification)
            
            return classification
            
        except Exception as e:
            logger.error(f"Error creating data classification: {str(e)}")
            self.db.rollback()
            raise
    
    async def classify_document(self, document_id: int, classification_data: Dict[str, Any], user_id: int) -> DocumentCompliance:
        """Classify a document for compliance"""
        try:
            doc_compliance = DocumentCompliance(
                document_id=document_id,
                classification_id=classification_data.get("classification_id"),
                compliance_status=ComplianceStatus(classification_data.get("compliance_status", "pending_review")),
                contains_personal_data=classification_data.get("contains_personal_data", False),
                data_subjects=classification_data.get("data_subjects", []),
                processing_purposes=classification_data.get("processing_purposes", []),
                legal_basis=classification_data.get("legal_basis", []),
                retention_period_years=classification_data.get("retention_period_years"),
                created_by=user_id
            )
            
            self.db.add(doc_compliance)
            self.db.commit()
            self.db.refresh(doc_compliance)
            
            # Log document classification
            await self.log_audit_event(
                event_type=AuditEventType.DOCUMENT_ACCESS,
                description=f"Classified document for compliance: {document_id}",
                user_id=user_id,
                resource_type="document",
                resource_id=str(document_id),
                new_values=classification_data,
                compliance_relevant=True
            )
            
            return doc_compliance
            
        except Exception as e:
            logger.error(f"Error classifying document: {str(e)}")
            self.db.rollback()
            raise
    
    # Reporting
    async def generate_compliance_report(self, report_data: Dict[str, Any], user_id: int) -> ComplianceReport:
        """Generate a compliance report"""
        try:
            # Calculate metrics and findings
            metrics = await self._calculate_compliance_metrics(
                report_data.get("framework_id"),
                datetime.fromisoformat(report_data["report_period_start"]),
                datetime.fromisoformat(report_data["report_period_end"])
            )
            
            findings = await self._generate_compliance_findings(
                report_data.get("framework_id"),
                datetime.fromisoformat(report_data["report_period_start"]),
                datetime.fromisoformat(report_data["report_period_end"])
            )
            
            report = ComplianceReport(
                framework_id=report_data.get("framework_id"),
                report_name=report_data["report_name"],
                report_type=report_data.get("report_type", "periodic"),
                report_period_start=datetime.fromisoformat(report_data["report_period_start"]),
                report_period_end=datetime.fromisoformat(report_data["report_period_end"]),
                executive_summary=report_data.get("executive_summary"),
                findings=findings,
                metrics=metrics,
                recommendations=report_data.get("recommendations", []),
                recipients=report_data.get("recipients", []),
                created_by=user_id
            )
            
            self.db.add(report)
            self.db.commit()
            self.db.refresh(report)
            
            # Log report generation
            await self.log_audit_event(
                event_type=AuditEventType.SYSTEM_CONFIG,
                description=f"Generated compliance report: {report.report_name}",
                user_id=user_id,
                resource_type="compliance_report",
                resource_id=str(report.id),
                compliance_relevant=True
            )
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating compliance report: {str(e)}")
            self.db.rollback()
            raise
    
    # Statistics and Analytics
    async def get_compliance_dashboard_stats(self, framework_id: Optional[int] = None) -> Dict[str, Any]:
        """Get compliance dashboard statistics"""
        try:
            stats = {}
            
            # Framework stats
            if framework_id:
                framework_query = self.db.query(ComplianceFrameworkConfig).filter(
                    ComplianceFrameworkConfig.id == framework_id
                )
            else:
                framework_query = self.db.query(ComplianceFrameworkConfig).filter(
                    ComplianceFrameworkConfig.is_active == True
                )
            
            stats["active_frameworks"] = framework_query.count()
            
            # Policy stats
            policy_query = self.db.query(CompliancePolicy)
            if framework_id:
                policy_query = policy_query.filter(CompliancePolicy.framework_id == framework_id)
            
            stats["total_policies"] = policy_query.count()
            stats["implemented_policies"] = policy_query.filter(CompliancePolicy.is_implemented == True).count()
            stats["pending_policies"] = policy_query.filter(CompliancePolicy.is_implemented == False).count()
            
            # Violation stats
            violation_query = self.db.query(ComplianceViolation)
            if framework_id:
                violation_query = violation_query.filter(ComplianceViolation.framework_id == framework_id)
            
            stats["total_violations"] = violation_query.count()
            stats["open_violations"] = violation_query.filter(ComplianceViolation.status == "open").count()
            stats["critical_violations"] = violation_query.filter(ComplianceViolation.severity == RiskLevel.CRITICAL).count()
            
            # Assessment stats
            assessment_query = self.db.query(ComplianceAssessment)
            if framework_id:
                assessment_query = assessment_query.filter(ComplianceAssessment.framework_id == framework_id)
            
            stats["total_assessments"] = assessment_query.count()
            stats["pending_assessments"] = assessment_query.filter(
                ComplianceAssessment.status == ComplianceStatus.PENDING_REVIEW
            ).count()
            
            # Recent activity
            recent_logs = await self.get_audit_logs(
                start_date=datetime.utcnow() - timedelta(days=7),
                compliance_relevant=True,
                limit=10
            )
            stats["recent_activity"] = len(recent_logs)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting compliance dashboard stats: {str(e)}")
            raise
    
    # Private helper methods
    async def _check_compliance_violations(self, audit_log: AuditLog):
        """Check if an audit event indicates a potential compliance violation"""
        # Implement violation detection logic based on audit events
        # This is a simplified example - real implementation would be more sophisticated
        
        if audit_log.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            # Check for patterns that might indicate violations
            violation_patterns = [
                "unauthorized access",
                "data breach",
                "policy violation",
                "security incident"
            ]
            
            if any(pattern in audit_log.event_description.lower() for pattern in violation_patterns):
                # Create automatic violation record
                violation_data = {
                    "framework_id": 1,  # Default framework
                    "violation_type": "Automatic Detection",
                    "title": f"Potential violation detected: {audit_log.event_type.value}",
                    "description": f"Automatic violation detection based on audit log: {audit_log.event_description}",
                    "severity": audit_log.risk_level.value,
                    "detected_at": audit_log.timestamp.isoformat(),
                    "detected_by": "System",
                    "detection_method": "automated",
                    "related_audit_logs": [audit_log.id]
                }
                
                await self.create_compliance_violation(violation_data, audit_log.user_id or 1)
    
    async def _update_assessment_score(self, assessment_id: int):
        """Update overall assessment score based on policy assessments"""
        policy_assessments = self.db.query(PolicyAssessment).filter(
            PolicyAssessment.assessment_id == assessment_id
        ).all()
        
        if policy_assessments:
            scores = [pa.compliance_score for pa in policy_assessments if pa.compliance_score is not None]
            if scores:
                overall_score = sum(scores) / len(scores)
                
                assessment = self.db.query(ComplianceAssessment).filter(
                    ComplianceAssessment.id == assessment_id
                ).first()
                
                if assessment:
                    assessment.overall_score = overall_score
                    self.db.commit()
    
    async def _calculate_compliance_metrics(self, framework_id: Optional[int], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate compliance metrics for reporting"""
        metrics = {}
        
        # Policy compliance rate
        policy_query = self.db.query(CompliancePolicy)
        if framework_id:
            policy_query = policy_query.filter(CompliancePolicy.framework_id == framework_id)
        
        total_policies = policy_query.count()
        implemented_policies = policy_query.filter(CompliancePolicy.is_implemented == True).count()
        
        metrics["policy_compliance_rate"] = (implemented_policies / total_policies * 100) if total_policies > 0 else 0
        
        # Violation metrics
        violation_query = self.db.query(ComplianceViolation).filter(
            and_(
                ComplianceViolation.detected_at >= start_date,
                ComplianceViolation.detected_at <= end_date
            )
        )
        if framework_id:
            violation_query = violation_query.filter(ComplianceViolation.framework_id == framework_id)
        
        metrics["total_violations"] = violation_query.count()
        metrics["critical_violations"] = violation_query.filter(ComplianceViolation.severity == RiskLevel.CRITICAL).count()
        metrics["resolved_violations"] = violation_query.filter(ComplianceViolation.status == "resolved").count()
        
        # Audit activity
        audit_query = self.db.query(AuditLog).filter(
            and_(
                AuditLog.timestamp >= start_date,
                AuditLog.timestamp <= end_date,
                AuditLog.compliance_relevant == True
            )
        )
        
        metrics["audit_events"] = audit_query.count()
        metrics["high_risk_events"] = audit_query.filter(AuditLog.risk_level == RiskLevel.HIGH).count()
        
        return metrics
    
    async def _generate_compliance_findings(self, framework_id: Optional[int], start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Generate compliance findings for reporting"""
        findings = []
        
        # Policy implementation gaps
        policy_query = self.db.query(CompliancePolicy).filter(
            CompliancePolicy.is_implemented == False
        )
        if framework_id:
            policy_query = policy_query.filter(CompliancePolicy.framework_id == framework_id)
        
        unimplemented_policies = policy_query.all()
        if unimplemented_policies:
            findings.append({
                "type": "Policy Implementation Gap",
                "severity": "Medium",
                "description": f"{len(unimplemented_policies)} policies are not yet implemented",
                "recommendations": ["Prioritize policy implementation", "Assign implementation owners"]
            })
        
        # Recent violations
        violation_query = self.db.query(ComplianceViolation).filter(
            and_(
                ComplianceViolation.detected_at >= start_date,
                ComplianceViolation.detected_at <= end_date,
                ComplianceViolation.status != "closed"
            )
        )
        if framework_id:
            violation_query = violation_query.filter(ComplianceViolation.framework_id == framework_id)
        
        open_violations = violation_query.all()
        if open_violations:
            findings.append({
                "type": "Open Violations",
                "severity": "High",
                "description": f"{len(open_violations)} violations require attention",
                "recommendations": ["Review and resolve open violations", "Implement preventive measures"]
            })
        
        return findings