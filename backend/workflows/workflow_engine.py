"""
Workflow Engine - SAP S/4 HANA-style business process flows
Supports: Purchase-to-Pay, Order-to-Cash, Hire-to-Retire, and custom workflows

This is ARIA's enterprise ERP foundation - comparable to SAP workflows but AI-driven!

Key Features:
- Pre-built enterprise workflows (Purchase-to-Pay, Order-to-Cash, etc.)
- Custom workflow builder
- Approval routing (sequential, parallel, dynamic)
- Status tracking (pending, approved, rejected, escalated)
- SLA tracking (deadlines, auto-escalation)
- Bot integration (AI-driven decision making)
- Audit trail (complete history)
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Workflow instance status"""
    DRAFT = "draft"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    ESCALATED = "escalated"


class StepStatus(Enum):
    """Workflow step status"""
    NOT_STARTED = "not_started"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"


class ApprovalType(Enum):
    """Approval routing type"""
    SEQUENTIAL = "sequential"  # One after another
    PARALLEL = "parallel"      # All at same time
    DYNAMIC = "dynamic"         # AI-driven routing


@dataclass
class WorkflowStep:
    """Single step in a workflow"""
    step_id: str
    name: str
    description: str
    step_type: str  # "approval", "action", "bot_query", "decision"
    assignee_role: Optional[str] = None
    assignee_user: Optional[str] = None
    bot_id: Optional[str] = None
    status: StepStatus = StepStatus.NOT_STARTED
    sla_hours: Optional[int] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    notes: Optional[str] = None
    metadata: Dict = field(default_factory=dict)


@dataclass
class WorkflowDefinition:
    """Workflow template definition"""
    workflow_id: str
    name: str
    description: str
    category: str  # "procurement", "sales", "hr", "finance", "custom"
    steps: List[WorkflowStep]
    approval_type: ApprovalType = ApprovalType.SEQUENTIAL
    auto_escalate: bool = True
    escalation_hours: int = 24
    metadata: Dict = field(default_factory=dict)


@dataclass
class WorkflowInstance:
    """Running workflow instance"""
    instance_id: str
    workflow_id: str
    workflow_name: str
    tenant_id: str
    status: WorkflowStatus
    current_step_index: int
    steps: List[WorkflowStep]
    created_at: datetime
    created_by: str
    updated_at: datetime
    completed_at: Optional[datetime] = None
    data: Dict = field(default_factory=dict)  # Workflow-specific data
    audit_log: List[Dict] = field(default_factory=list)


class WorkflowEngine:
    """Enterprise workflow engine"""
    
    # Pre-built enterprise workflows (SAP-like)
    ENTERPRISE_WORKFLOWS = {
        "purchase_to_pay": {
            "name": "Purchase-to-Pay (P2P)",
            "description": "Complete procurement cycle from requisition to payment",
            "category": "procurement",
            "steps": [
                {"id": "create_pr", "name": "Create Purchase Requisition", "type": "action", "role": "requester"},
                {"id": "approve_pr", "name": "Approve Requisition", "type": "approval", "role": "manager", "sla_hours": 24},
                {"id": "verify_budget", "name": "Verify Budget", "type": "bot_query", "bot_id": "budget_forecasting"},
                {"id": "create_po", "name": "Create Purchase Order", "type": "action", "role": "procurement"},
                {"id": "approve_po", "name": "Approve PO", "type": "approval", "role": "finance_manager", "sla_hours": 48},
                {"id": "receive_goods", "name": "Receive Goods", "type": "action", "role": "warehouse"},
                {"id": "match_invoice", "name": "Match Invoice to PO", "type": "bot_query", "bot_id": "invoice_reconciliation"},
                {"id": "approve_payment", "name": "Approve Payment", "type": "approval", "role": "cfo", "sla_hours": 24},
                {"id": "process_payment", "name": "Process Payment", "type": "action", "role": "accounts_payable"}
            ]
        },
        "order_to_cash": {
            "name": "Order-to-Cash (O2C)",
            "description": "Complete sales cycle from quote to payment receipt",
            "category": "sales",
            "steps": [
                {"id": "create_quote", "name": "Create Quote", "type": "bot_query", "bot_id": "quote_generation"},
                {"id": "approve_quote", "name": "Approve Quote", "type": "approval", "role": "sales_manager", "sla_hours": 24},
                {"id": "send_quote", "name": "Send Quote to Customer", "type": "action", "role": "sales_rep"},
                {"id": "receive_order", "name": "Receive Customer Order", "type": "action", "role": "sales_rep"},
                {"id": "check_inventory", "name": "Check Inventory", "type": "bot_query", "bot_id": "inventory_management"},
                {"id": "approve_credit", "name": "Approve Credit", "type": "approval", "role": "credit_controller", "sla_hours": 12},
                {"id": "process_order", "name": "Process Order", "type": "bot_query", "bot_id": "order_processing"},
                {"id": "ship_goods", "name": "Ship Goods", "type": "action", "role": "warehouse"},
                {"id": "create_invoice", "name": "Create Invoice", "type": "bot_query", "bot_id": "invoice_reconciliation"},
                {"id": "receive_payment", "name": "Receive Payment", "type": "action", "role": "accounts_receivable"}
            ]
        },
        "hire_to_retire": {
            "name": "Hire-to-Retire (H2R)",
            "description": "Complete employee lifecycle from recruitment to retirement",
            "category": "hr",
            "steps": [
                {"id": "create_requisition", "name": "Create Job Requisition", "type": "action", "role": "hiring_manager"},
                {"id": "approve_hiring", "name": "Approve Hiring", "type": "approval", "role": "hr_director", "sla_hours": 48},
                {"id": "post_job", "name": "Post Job", "type": "bot_query", "bot_id": "recruitment"},
                {"id": "screen_candidates", "name": "Screen Candidates", "type": "bot_query", "bot_id": "recruitment"},
                {"id": "interview", "name": "Conduct Interviews", "type": "action", "role": "hiring_manager"},
                {"id": "make_offer", "name": "Make Job Offer", "type": "action", "role": "hr"},
                {"id": "onboard", "name": "Onboard Employee", "type": "action", "role": "hr"},
                {"id": "setup_payroll", "name": "Setup Payroll", "type": "bot_query", "bot_id": "payroll_sa"},
                {"id": "manage_performance", "name": "Manage Performance", "type": "action", "role": "manager"},
                {"id": "offboard", "name": "Offboard Employee (when leaving)", "type": "action", "role": "hr"}
            ]
        },
        "expense_approval": {
            "name": "Expense Approval",
            "description": "Employee expense claim approval workflow",
            "category": "finance",
            "steps": [
                {"id": "submit_expense", "name": "Submit Expense Claim", "type": "bot_query", "bot_id": "expense_management"},
                {"id": "verify_policy", "name": "Verify Policy Compliance", "type": "bot_query", "bot_id": "expense_management"},
                {"id": "approve_manager", "name": "Manager Approval", "type": "approval", "role": "manager", "sla_hours": 24},
                {"id": "approve_finance", "name": "Finance Approval", "type": "approval", "role": "finance", "sla_hours": 48},
                {"id": "process_reimbursement", "name": "Process Reimbursement", "type": "action", "role": "payroll"}
            ]
        },
        "bbbee_verification": {
            "name": "BBBEE Verification 🇿🇦",
            "description": "BBBEE scorecard calculation and verification workflow",
            "category": "compliance",
            "steps": [
                {"id": "collect_data", "name": "Collect BBBEE Data", "type": "action", "role": "compliance_officer"},
                {"id": "calculate_scorecard", "name": "Calculate Scorecard", "type": "bot_query", "bot_id": "bbbee_compliance"},
                {"id": "review_scorecard", "name": "Review Scorecard", "type": "approval", "role": "ceo", "sla_hours": 48},
                {"id": "submit_verification", "name": "Submit for Verification", "type": "action", "role": "compliance_officer"},
                {"id": "receive_certificate", "name": "Receive Certificate", "type": "action", "role": "compliance_officer"},
                {"id": "update_records", "name": "Update Company Records", "type": "action", "role": "admin"}
            ]
        }
    }
    
    def __init__(self):
        self.workflows: Dict[str, WorkflowDefinition] = {}
        self.instances: Dict[str, WorkflowInstance] = {}
        self._load_enterprise_workflows()
    
    def _load_enterprise_workflows(self):
        """Load pre-built enterprise workflows"""
        for workflow_id, config in self.ENTERPRISE_WORKFLOWS.items():
            steps = [
                WorkflowStep(
                    step_id=step["id"],
                    name=step["name"],
                    description="",
                    step_type=step["type"],
                    assignee_role=step.get("role"),
                    bot_id=step.get("bot_id"),
                    sla_hours=step.get("sla_hours")
                )
                for step in config["steps"]
            ]
            
            workflow = WorkflowDefinition(
                workflow_id=workflow_id,
                name=config["name"],
                description=config["description"],
                category=config["category"],
                steps=steps
            )
            
            self.workflows[workflow_id] = workflow
            logger.info(f"Loaded enterprise workflow: {workflow_id}")
    
    def list_workflows(self, category: Optional[str] = None) -> List[Dict]:
        """List available workflows"""
        workflows = list(self.workflows.values())
        
        if category:
            workflows = [w for w in workflows if w.category == category]
        
        return [
            {
                "workflow_id": w.workflow_id,
                "name": w.name,
                "description": w.description,
                "category": w.category,
                "steps_count": len(w.steps)
            }
            for w in workflows
        ]
    
    def get_workflow(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """Get workflow definition"""
        return self.workflows.get(workflow_id)
    
    def create_instance(
        self,
        workflow_id: str,
        tenant_id: str,
        created_by: str,
        initial_data: Optional[Dict] = None
    ) -> WorkflowInstance:
        """Create a new workflow instance"""
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow not found: {workflow_id}")
        
        # Generate instance ID
        instance_id = f"{workflow_id}_{tenant_id}_{int(datetime.utcnow().timestamp())}"
        
        # Create instance with copies of steps
        steps_copy = [
            WorkflowStep(
                step_id=step.step_id,
                name=step.name,
                description=step.description,
                step_type=step.step_type,
                assignee_role=step.assignee_role,
                assignee_user=step.assignee_user,
                bot_id=step.bot_id,
                sla_hours=step.sla_hours
            )
            for step in workflow.steps
        ]
        
        instance = WorkflowInstance(
            instance_id=instance_id,
            workflow_id=workflow_id,
            workflow_name=workflow.name,
            tenant_id=tenant_id,
            status=WorkflowStatus.PENDING,
            current_step_index=0,
            steps=steps_copy,
            created_at=datetime.utcnow(),
            created_by=created_by,
            updated_at=datetime.utcnow(),
            data=initial_data or {}
        )
        
        # Set due dates for steps with SLAs
        for step in instance.steps:
            if step.sla_hours:
                step.due_date = datetime.utcnow() + timedelta(hours=step.sla_hours)
        
        # Add audit log entry
        instance.audit_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "workflow_created",
            "user": created_by,
            "details": f"Created workflow instance: {instance_id}"
        })
        
        # Mark first step as pending
        if instance.steps:
            instance.steps[0].status = StepStatus.PENDING
            instance.status = WorkflowStatus.IN_PROGRESS
        
        self.instances[instance_id] = instance
        
        logger.info(f"Created workflow instance: {instance_id}")
        
        return instance
    
    def get_instance(self, instance_id: str) -> Optional[WorkflowInstance]:
        """Get workflow instance"""
        return self.instances.get(instance_id)
    
    def complete_step(
        self,
        instance_id: str,
        step_id: str,
        completed_by: str,
        notes: Optional[str] = None,
        approved: bool = True
    ) -> WorkflowInstance:
        """Complete a workflow step"""
        instance = self.get_instance(instance_id)
        if not instance:
            raise ValueError(f"Workflow instance not found: {instance_id}")
        
        # Find the step
        step = next((s for s in instance.steps if s.step_id == step_id), None)
        if not step:
            raise ValueError(f"Step not found: {step_id}")
        
        # Update step
        step.status = StepStatus.COMPLETED
        step.completed_at = datetime.utcnow()
        step.completed_by = completed_by
        step.notes = notes
        
        # Add audit log
        instance.audit_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "step_completed",
            "step_id": step_id,
            "user": completed_by,
            "approved": approved,
            "notes": notes
        })
        
        # If step is approval and rejected, mark workflow as rejected
        if step.step_type == "approval" and not approved:
            instance.status = WorkflowStatus.REJECTED
            instance.completed_at = datetime.utcnow()
            logger.info(f"Workflow rejected at step {step_id}: {instance_id}")
            return instance
        
        # Move to next step
        current_index = instance.steps.index(step)
        if current_index < len(instance.steps) - 1:
            # Mark next step as pending
            next_step = instance.steps[current_index + 1]
            next_step.status = StepStatus.PENDING
            instance.current_step_index = current_index + 1
        else:
            # All steps completed
            instance.status = WorkflowStatus.COMPLETED
            instance.completed_at = datetime.utcnow()
            logger.info(f"Workflow completed: {instance_id}")
        
        instance.updated_at = datetime.utcnow()
        
        return instance
    
    def get_pending_actions(
        self,
        tenant_id: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> List[Dict]:
        """Get pending workflow actions for a user/tenant"""
        pending_actions = []
        
        for instance in self.instances.values():
            # Filter by tenant
            if tenant_id and instance.tenant_id != tenant_id:
                continue
            
            # Only pending/in-progress workflows
            if instance.status not in [WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS]:
                continue
            
            # Get current step
            if instance.current_step_index < len(instance.steps):
                current_step = instance.steps[instance.current_step_index]
                
                # Filter by role
                if user_role and current_step.assignee_role != user_role:
                    continue
                
                # Check if overdue
                is_overdue = False
                days_overdue = 0
                if current_step.due_date:
                    now = datetime.utcnow()
                    if now > current_step.due_date:
                        is_overdue = True
                        days_overdue = (now - current_step.due_date).days
                
                pending_actions.append({
                    "instance_id": instance.instance_id,
                    "workflow_name": instance.workflow_name,
                    "step_id": current_step.step_id,
                    "step_name": current_step.step_name,
                    "step_type": current_step.step_type,
                    "assignee_role": current_step.assignee_role,
                    "due_date": current_step.due_date.isoformat() if current_step.due_date else None,
                    "is_overdue": is_overdue,
                    "days_overdue": days_overdue,
                    "created_at": instance.created_at.isoformat(),
                    "created_by": instance.created_by
                })
        
        # Sort by due date (overdue first)
        pending_actions.sort(key=lambda x: (not x["is_overdue"], x["due_date"] or ""))
        
        return pending_actions
    
    def escalate_overdue(self) -> List[Dict]:
        """Find and escalate overdue workflow steps"""
        escalated = []
        
        for instance in self.instances.values():
            # Only active workflows
            if instance.status != WorkflowStatus.IN_PROGRESS:
                continue
            
            # Get current step
            if instance.current_step_index < len(instance.steps):
                current_step = instance.steps[instance.current_step_index]
                
                # Check if overdue
                if current_step.due_date and datetime.utcnow() > current_step.due_date:
                    # Escalate
                    instance.status = WorkflowStatus.ESCALATED
                    instance.audit_log.append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "action": "escalated",
                        "step_id": current_step.step_id,
                        "reason": "Overdue SLA"
                    })
                    
                    escalated.append({
                        "instance_id": instance.instance_id,
                        "workflow_name": instance.workflow_name,
                        "step_name": current_step.name,
                        "assignee_role": current_step.assignee_role,
                        "days_overdue": (datetime.utcnow() - current_step.due_date).days
                    })
                    
                    logger.warning(f"Escalated workflow: {instance.instance_id}")
        
        return escalated


# Singleton instance
workflow_engine = WorkflowEngine()
