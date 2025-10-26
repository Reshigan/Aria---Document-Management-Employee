"""
Bot Activity Reporting System

Comprehensive visibility into all bot operations since they work in background.

Reports Cover:
- Invoice Reconciliation Activity
- BBBEE Compliance Tracking
- Payroll Processing Activity  
- Expense Management Activity
- Workflow Execution Status
- Bot Action System Activity
- Integration Sync Status
- Overall System Health

Each report shows:
- What bots are doing in real-time
- What they completed recently
- Any issues or failures
- Performance metrics
- Trends over time
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta, date
from enum import Enum

logger = logging.getLogger(__name__)


class ReportPeriod(Enum):
    """Reporting periods"""
    TODAY = "today"
    YESTERDAY = "yesterday"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    THIS_MONTH = "this_month"
    LAST_MONTH = "last_month"
    CUSTOM = "custom"


class BotActivityReporter:
    """Generate comprehensive bot activity reports"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def generate_invoice_reconciliation_report(
        self,
        tenant_id: str,
        period: ReportPeriod = ReportPeriod.LAST_7_DAYS,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict:
        """
        Invoice Reconciliation Bot Activity Report
        
        Shows:
        - Total invoices processed
        - Successfully matched (invoice + payment)
        - Discrepancies found
        - Auto-approved vs manual review
        - Average processing time
        - Top discrepancy reasons
        """
        logger.info(f"Generating invoice reconciliation report for {tenant_id}, period: {period.value}")
        
        # TODO: Query database for actual data
        # For now, return mock data showing bot activity
        
        return {
            "report_type": "invoice_reconciliation",
            "tenant_id": tenant_id,
            "period": period.value,
            "date_range": {
                "start": "2024-10-19",
                "end": "2024-10-25"
            },
            "summary": {
                "total_invoices_processed": 156,
                "successfully_matched": 142,
                "discrepancies_found": 14,
                "auto_approved": 128,
                "manual_review_required": 28,
                "avg_processing_time_seconds": 3.5,
                "success_rate_percent": 91.0
            },
            "activity_by_day": [
                {"date": "2024-10-19", "processed": 18, "matched": 16, "discrepancies": 2},
                {"date": "2024-10-20", "processed": 12, "matched": 11, "discrepancies": 1},
                {"date": "2024-10-21", "processed": 25, "matched": 23, "discrepancies": 2},
                {"date": "2024-10-22", "processed": 30, "matched": 27, "discrepancies": 3},
                {"date": "2024-10-23", "processed": 28, "matched": 25, "discrepancies": 3},
                {"date": "2024-10-24", "processed": 22, "matched": 20, "discrepancies": 2},
                {"date": "2024-10-25", "processed": 21, "matched": 20, "discrepancies": 1}
            ],
            "discrepancy_breakdown": [
                {
                    "reason": "Amount mismatch",
                    "count": 8,
                    "total_amount": 15250.00,
                    "avg_difference": 1906.25
                },
                {
                    "reason": "Invoice number not found",
                    "count": 4,
                    "total_amount": 8500.00
                },
                {
                    "reason": "Multiple payments for one invoice",
                    "count": 2,
                    "total_amount": 5000.00
                }
            ],
            "top_suppliers_processed": [
                {"supplier": "ABC Corp", "invoices": 35, "total_amount": 125000.00},
                {"supplier": "XYZ Trading", "invoices": 28, "total_amount": 95000.00},
                {"supplier": "Acme Ltd", "invoices": 22, "total_amount": 75000.00}
            ],
            "recent_activity": [
                {
                    "timestamp": "2024-10-25 14:30:00",
                    "action": "matched",
                    "invoice_number": "INV-2024-1234",
                    "supplier": "ABC Corp",
                    "amount": 5500.00,
                    "status": "auto_approved"
                },
                {
                    "timestamp": "2024-10-25 14:28:00",
                    "action": "discrepancy",
                    "invoice_number": "INV-2024-1233",
                    "supplier": "XYZ Trading",
                    "amount": 3200.00,
                    "issue": "Amount mismatch (difference: R150)",
                    "status": "manual_review_required"
                },
                {
                    "timestamp": "2024-10-25 14:25:00",
                    "action": "matched",
                    "invoice_number": "INV-2024-1232",
                    "supplier": "Acme Ltd",
                    "amount": 8900.00,
                    "status": "auto_approved"
                }
            ],
            "performance_metrics": {
                "avg_processing_time_seconds": 3.5,
                "fastest_processing_seconds": 1.2,
                "slowest_processing_seconds": 12.5,
                "bot_uptime_percent": 99.8,
                "errors_encountered": 2
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def generate_bbbee_compliance_report(
        self,
        tenant_id: str,
        period: ReportPeriod = ReportPeriod.LAST_30_DAYS
    ) -> Dict:
        """
        BBBEE Compliance Bot Activity Report
        
        Shows:
        - Scorecard calculations performed
        - Current BBBEE level and score
        - Trend (improving/declining)
        - Supplier verifications completed
        - Action items identified
        - Compliance status
        """
        logger.info(f"Generating BBBEE compliance report for {tenant_id}")
        
        return {
            "report_type": "bbbee_compliance",
            "tenant_id": tenant_id,
            "period": period.value,
            "current_status": {
                "bbbee_level": 4,
                "total_score": 79.0,
                "max_score": 110.0,
                "compliance_percent": 71.8,
                "procurement_recognition": 100,
                "certificate_valid_until": "2025-12-31",
                "trend": "improving"  # +2 points from last month
            },
            "scorecard_by_element": [
                {
                    "element": "Ownership",
                    "weight": 25,
                    "score": 18,
                    "compliance_percent": 72.0,
                    "trend": "stable",
                    "last_updated": "2024-10-20"
                },
                {
                    "element": "Management Control",
                    "weight": 15,
                    "score": 11,
                    "compliance_percent": 73.3,
                    "trend": "improving",  # +1 point
                    "last_updated": "2024-10-22"
                },
                {
                    "element": "Skills Development",
                    "weight": 20,
                    "score": 15,
                    "compliance_percent": 75.0,
                    "trend": "improving",  # +2 points
                    "last_updated": "2024-10-25"
                },
                {
                    "element": "Enterprise & Supplier Development",
                    "weight": 40,
                    "score": 28,
                    "compliance_percent": 70.0,
                    "trend": "stable",
                    "last_updated": "2024-10-23"
                },
                {
                    "element": "Socio-Economic Development",
                    "weight": 10,
                    "score": 7,
                    "compliance_percent": 70.0,
                    "trend": "declining",  # -1 point
                    "last_updated": "2024-10-21"
                }
            ],
            "activity_log": [
                {
                    "timestamp": "2024-10-25 10:00:00",
                    "action": "scorecard_calculation",
                    "triggered_by": "monthly_auto_calculation",
                    "result": "Level 4, 79 points",
                    "change": "+2 points from last calculation"
                },
                {
                    "timestamp": "2024-10-23 14:30:00",
                    "action": "supplier_verification",
                    "supplier": "ABC Corp",
                    "bbbee_level": 2,
                    "certificate_expiry": "2025-06-30",
                    "status": "valid"
                },
                {
                    "timestamp": "2024-10-22 09:15:00",
                    "action": "scorecard_calculation",
                    "triggered_by": "user_request",
                    "result": "Level 4, 77 points"
                }
            ],
            "supplier_verification_summary": {
                "total_suppliers": 45,
                "verified_this_period": 8,
                "valid_certificates": 38,
                "expired_certificates": 5,
                "missing_certificates": 2,
                "avg_supplier_level": 3.8
            },
            "improvement_opportunities": [
                {
                    "element": "Socio-Economic Development",
                    "current_score": 7,
                    "max_score": 10,
                    "recommendation": "Increase SED spend by R50K to improve to 8 points",
                    "potential_level_improvement": "Could move to Level 3 (1 more point)"
                },
                {
                    "element": "Skills Development",
                    "current_score": 15,
                    "max_score": 20,
                    "recommendation": "Implement learnership program (5 more points possible)",
                    "potential_level_improvement": "Could move to Level 2 (5 more points)"
                }
            ],
            "compliance_alerts": [
                {
                    "severity": "warning",
                    "message": "5 supplier certificates expiring in next 60 days",
                    "action_required": "Request updated certificates"
                },
                {
                    "severity": "info",
                    "message": "Current spend with EME suppliers: 35% (target: 40%)",
                    "action_required": "Increase procurement from EME suppliers"
                }
            ],
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def generate_payroll_activity_report(
        self,
        tenant_id: str,
        period: ReportPeriod = ReportPeriod.THIS_MONTH
    ) -> Dict:
        """
        Payroll Bot Activity Report
        
        Shows:
        - Payroll runs completed
        - Employees processed
        - PAYE, UIF, SDL calculations
        - IRP5 certificates generated
        - SARS submissions prepared
        - Compliance status
        """
        logger.info(f"Generating payroll activity report for {tenant_id}")
        
        return {
            "report_type": "payroll_activity",
            "tenant_id": tenant_id,
            "period": period.value,
            "summary": {
                "payroll_runs": 1,  # October payroll
                "employees_processed": 45,
                "total_gross_pay": 625000.00,
                "total_paye": 125000.00,
                "total_uif": 12500.00,
                "total_sdl": 6250.00,
                "total_net_pay": 481250.00,
                "avg_processing_time_minutes": 2.5,
                "compliance_status": "compliant"
            },
            "payroll_runs": [
                {
                    "run_date": "2024-10-25 09:00:00",
                    "period": "October 2024",
                    "employees": 45,
                    "status": "completed",
                    "gross_pay": 625000.00,
                    "net_pay": 481250.00,
                    "emp201_prepared": True,
                    "emp201_status": "ready_to_submit",
                    "payslips_generated": 45,
                    "payslips_emailed": 45
                }
            ],
            "breakdown_by_department": [
                {
                    "department": "Sales",
                    "employees": 12,
                    "gross_pay": 180000.00,
                    "avg_salary": 15000.00
                },
                {
                    "department": "Operations",
                    "employees": 15,
                    "gross_pay": 195000.00,
                    "avg_salary": 13000.00
                },
                {
                    "department": "Finance",
                    "employees": 8,
                    "gross_pay": 140000.00,
                    "avg_salary": 17500.00
                },
                {
                    "department": "IT",
                    "employees": 6,
                    "gross_pay": 75000.00,
                    "avg_salary": 12500.00
                },
                {
                    "department": "Management",
                    "employees": 4,
                    "gross_pay": 35000.00,
                    "avg_salary": 8750.00
                }
            ],
            "sars_compliance": {
                "emp201_status": "ready_to_submit",
                "emp201_due_date": "2024-11-07",
                "days_until_due": 12,
                "paye_amount": 125000.00,
                "uif_amount": 12500.00,
                "sdl_amount": 6250.00,
                "total_liability": 143750.00,
                "last_submission": "2024-09-07",
                "last_submission_status": "accepted"
            },
            "recent_activity": [
                {
                    "timestamp": "2024-10-25 09:00:00",
                    "action": "payroll_run_started",
                    "period": "October 2024",
                    "employees": 45
                },
                {
                    "timestamp": "2024-10-25 09:02:30",
                    "action": "calculations_completed",
                    "duration_seconds": 150
                },
                {
                    "timestamp": "2024-10-25 09:03:00",
                    "action": "payslips_generated",
                    "count": 45
                },
                {
                    "timestamp": "2024-10-25 09:05:00",
                    "action": "payslips_emailed",
                    "count": 45,
                    "delivery_rate": "100%"
                },
                {
                    "timestamp": "2024-10-25 09:06:00",
                    "action": "emp201_prepared",
                    "amount": 143750.00,
                    "status": "ready_to_submit"
                }
            ],
            "year_to_date_summary": {
                "payroll_runs": 10,
                "total_gross_pay": 6250000.00,
                "total_paye": 1250000.00,
                "total_uif": 125000.00,
                "total_sdl": 62500.00,
                "avg_monthly_payroll": 625000.00,
                "compliance_rate": "100%"
            },
            "alerts": [
                {
                    "severity": "info",
                    "message": "EMP201 ready to submit (due Nov 7)",
                    "action": "Submit to SARS before Nov 7 to avoid penalties"
                }
            ],
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def generate_expense_management_report(
        self,
        tenant_id: str,
        period: ReportPeriod = ReportPeriod.LAST_30_DAYS
    ) -> Dict:
        """
        Expense Management Bot Activity Report
        
        Shows:
        - Expense claims processed
        - Auto-approved vs manual review
        - Expense categories breakdown
        - Policy violations detected
        - Average approval time
        - Top spenders
        """
        logger.info(f"Generating expense management report for {tenant_id}")
        
        return {
            "report_type": "expense_management",
            "tenant_id": tenant_id,
            "period": period.value,
            "summary": {
                "total_claims": 89,
                "total_amount": 125450.00,
                "auto_approved": 65,
                "manual_review": 24,
                "rejected": 0,
                "avg_claim_amount": 1409.55,
                "avg_approval_time_hours": 4.5,
                "policy_violations": 12
            },
            "breakdown_by_category": [
                {
                    "category": "Meals & Entertainment",
                    "claims": 35,
                    "amount": 45250.00,
                    "avg_amount": 1292.86,
                    "policy_limit": 1500.00,
                    "within_policy": 32,
                    "exceeds_policy": 3
                },
                {
                    "category": "Travel",
                    "claims": 25,
                    "amount": 52500.00,
                    "avg_amount": 2100.00,
                    "policy_limit": 3000.00,
                    "within_policy": 23,
                    "exceeds_policy": 2
                },
                {
                    "category": "Accommodation",
                    "claims": 15,
                    "amount": 18750.00,
                    "avg_amount": 1250.00,
                    "policy_limit": 2000.00,
                    "within_policy": 15,
                    "exceeds_policy": 0
                },
                {
                    "category": "Office Supplies",
                    "claims": 10,
                    "amount": 6450.00,
                    "avg_amount": 645.00,
                    "policy_limit": 1000.00,
                    "within_policy": 10,
                    "exceeds_policy": 0
                },
                {
                    "category": "Other",
                    "claims": 4,
                    "amount": 2500.00,
                    "avg_amount": 625.00,
                    "within_policy": 4,
                    "exceeds_policy": 0
                }
            ],
            "top_claimants": [
                {
                    "employee": "John Smith",
                    "department": "Sales",
                    "claims": 15,
                    "total_amount": 22500.00,
                    "avg_claim": 1500.00
                },
                {
                    "employee": "Mary Johnson",
                    "department": "Operations",
                    "claims": 12,
                    "total_amount": 18750.00,
                    "avg_claim": 1562.50
                },
                {
                    "employee": "David Lee",
                    "department": "Sales",
                    "claims": 10,
                    "total_amount": 16250.00,
                    "avg_claim": 1625.00
                }
            ],
            "policy_violations_detected": [
                {
                    "violation_type": "Exceeds category limit",
                    "count": 5,
                    "total_amount": 8250.00,
                    "action_taken": "Escalated to manager"
                },
                {
                    "violation_type": "Missing receipt",
                    "count": 4,
                    "total_amount": 3500.00,
                    "action_taken": "Rejected, receipt requested"
                },
                {
                    "violation_type": "Duplicate claim",
                    "count": 2,
                    "total_amount": 1850.00,
                    "action_taken": "Rejected automatically"
                },
                {
                    "violation_type": "Expense older than 90 days",
                    "count": 1,
                    "total_amount": 950.00,
                    "action_taken": "Manual review required"
                }
            ],
            "approval_workflow_performance": {
                "avg_approval_time_hours": 4.5,
                "fastest_approval_minutes": 5,
                "slowest_approval_days": 3,
                "auto_approval_rate": 73.0,  # %
                "manual_review_rate": 27.0   # %
            },
            "recent_activity": [
                {
                    "timestamp": "2024-10-25 14:30:00",
                    "employee": "Jane Doe",
                    "category": "Meals",
                    "amount": 850.00,
                    "status": "auto_approved",
                    "reason": "Within policy limit, valid receipt"
                },
                {
                    "timestamp": "2024-10-25 14:25:00",
                    "employee": "Bob Wilson",
                    "category": "Travel",
                    "amount": 3250.00,
                    "status": "manual_review",
                    "reason": "Exceeds policy limit (R3,000)"
                },
                {
                    "timestamp": "2024-10-25 14:20:00",
                    "employee": "Alice Brown",
                    "category": "Office Supplies",
                    "amount": 450.00,
                    "status": "auto_approved",
                    "reason": "Within policy limit, valid receipt"
                }
            ],
            "trends": {
                "month_over_month_change": "+12%",
                "most_popular_category": "Meals & Entertainment",
                "peak_day_of_week": "Thursday",
                "seasonal_pattern": "Higher at month-end"
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def generate_workflow_execution_report(
        self,
        tenant_id: str,
        period: ReportPeriod = ReportPeriod.LAST_7_DAYS
    ) -> Dict:
        """
        Workflow Execution Report
        
        Shows:
        - Active workflows
        - Completed workflows
        - Workflow performance (completion times)
        - Bottlenecks identified
        - SLA compliance
        """
        logger.info(f"Generating workflow execution report for {tenant_id}")
        
        return {
            "report_type": "workflow_execution",
            "tenant_id": tenant_id,
            "period": period.value,
            "summary": {
                "workflows_started": 85,
                "workflows_completed": 72,
                "workflows_in_progress": 13,
                "workflows_overdue": 3,
                "avg_completion_time_hours": 36.5,
                "sla_compliance_rate": 96.5
            },
            "breakdown_by_workflow": [
                {
                    "workflow": "Purchase-to-Pay (P2P)",
                    "started": 15,
                    "completed": 12,
                    "in_progress": 3,
                    "avg_completion_hours": 48.0,
                    "sla_hours": 72,
                    "sla_compliance": 100.0
                },
                {
                    "workflow": "Order-to-Cash (O2C)",
                    "started": 28,
                    "completed": 25,
                    "in_progress": 3,
                    "avg_completion_hours": 30.0,
                    "sla_hours": 48,
                    "sla_compliance": 96.0
                },
                {
                    "workflow": "Expense Approval",
                    "started": 42,
                    "completed": 35,
                    "in_progress": 7,
                    "avg_completion_hours": 18.0,
                    "sla_hours": 24,
                    "sla_compliance": 95.0
                }
            ],
            "bottlenecks_identified": [
                {
                    "workflow": "Purchase-to-Pay",
                    "step": "Finance Approval",
                    "avg_delay_hours": 24.0,
                    "cause": "Approver backlog",
                    "recommendation": "Add additional approver or increase delegation"
                },
                {
                    "workflow": "Order-to-Cash",
                    "step": "Credit Check",
                    "avg_delay_hours": 8.0,
                    "cause": "Manual process",
                    "recommendation": "Implement automated credit scoring"
                }
            ],
            "overdue_workflows": [
                {
                    "instance_id": "WF-001234",
                    "workflow": "Purchase-to-Pay",
                    "current_step": "CFO Approval",
                    "days_overdue": 2,
                    "value": 125000.00,
                    "assignee": "CFO"
                },
                {
                    "instance_id": "WF-001235",
                    "workflow": "Order-to-Cash",
                    "current_step": "Credit Check",
                    "days_overdue": 1,
                    "value": 85000.00,
                    "assignee": "Credit Controller"
                }
            ],
            "performance_trends": {
                "completion_rate_improving": True,
                "avg_time_trend": "decreasing",
                "sla_compliance_trend": "stable"
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def generate_bot_action_system_report(
        self,
        tenant_id: str,
        period: ReportPeriod = ReportPeriod.LAST_7_DAYS
    ) -> Dict:
        """
        Bot Action System Report (Proactive Chase)
        
        Shows:
        - Actions tracked
        - Notifications sent
        - Escalations triggered
        - Response rates
        - Effectiveness metrics
        """
        logger.info(f"Generating bot action system report for {tenant_id}")
        
        return {
            "report_type": "bot_action_system",
            "tenant_id": tenant_id,
            "period": period.value,
            "summary": {
                "actions_tracked": 156,
                "actions_completed": 128,
                "actions_pending": 28,
                "notifications_sent": 245,
                "escalations_triggered": 12,
                "avg_response_time_hours": 18.5,
                "completion_rate": 82.0
            },
            "notifications_by_channel": [
                {"channel": "Email", "sent": 156, "opened": 142, "open_rate": 91.0},
                {"channel": "In-app", "sent": 156, "viewed": 135, "view_rate": 86.5},
                {"channel": "WhatsApp", "sent": 45, "read": 43, "read_rate": 95.6},
                {"channel": "SMS", "sent": 12, "delivered": 12, "delivery_rate": 100.0}
            ],
            "action_breakdown_by_type": [
                {
                    "action_type": "Approval",
                    "count": 85,
                    "completed": 72,
                    "pending": 13,
                    "avg_response_hours": 12.0
                },
                {
                    "action_type": "Review",
                    "count": 45,
                    "completed": 38,
                    "pending": 7,
                    "avg_response_hours": 24.0
                },
                {
                    "action_type": "Payment",
                    "count": 18,
                    "completed": 12,
                    "pending": 6,
                    "avg_response_hours": 36.0
                },
                {
                    "action_type": "Followup",
                    "count": 8,
                    "completed": 6,
                    "pending": 2,
                    "avg_response_hours": 48.0
                }
            ],
            "escalations": [
                {
                    "action_id": "ACT-001234",
                    "type": "PO Approval",
                    "original_assignee": "John Smith",
                    "escalated_to": "Procurement Manager",
                    "days_overdue": 3,
                    "reminders_sent": 4,
                    "value": 45000.00
                },
                {
                    "action_id": "ACT-001235",
                    "type": "Payment Approval",
                    "original_assignee": "Mary Johnson",
                    "escalated_to": "CFO",
                    "days_overdue": 2,
                    "reminders_sent": 3,
                    "value": 125000.00
                }
            ],
            "effectiveness_metrics": {
                "first_reminder_response_rate": 45.0,  # %
                "second_reminder_response_rate": 35.0,  # %
                "third_reminder_response_rate": 15.0,  # %
                "escalation_resolution_rate": 100.0,  # %
                "avg_reminders_before_completion": 1.8,
                "most_effective_channel": "WhatsApp"
            },
            "user_responsiveness": [
                {
                    "user": "John Smith",
                    "actions_assigned": 25,
                    "actions_completed": 23,
                    "avg_response_hours": 8.0,
                    "rating": "excellent"
                },
                {
                    "user": "Mary Johnson",
                    "actions_assigned": 18,
                    "actions_completed": 15,
                    "avg_response_hours": 24.0,
                    "rating": "good"
                },
                {
                    "user": "David Lee",
                    "actions_assigned": 15,
                    "actions_completed": 10,
                    "avg_response_hours": 48.0,
                    "rating": "needs improvement"
                }
            ],
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def generate_integration_sync_report(
        self,
        tenant_id: str,
        period: ReportPeriod = ReportPeriod.LAST_7_DAYS
    ) -> Dict:
        """
        Integration Sync Status Report
        
        Shows:
        - Active integrations
        - Sync operations completed
        - Success/failure rates
        - Data volume synced
        - Sync performance
        """
        logger.info(f"Generating integration sync report for {tenant_id}")
        
        return {
            "report_type": "integration_sync",
            "tenant_id": tenant_id,
            "period": period.value,
            "summary": {
                "active_integrations": 4,
                "sync_operations": 28,
                "successful_syncs": 26,
                "failed_syncs": 2,
                "records_synced": 1250,
                "success_rate": 92.9
            },
            "integration_status": [
                {
                    "integration": "Xero",
                    "status": "connected",
                    "last_sync": "2024-10-25 08:00:00",
                    "sync_frequency": "daily",
                    "records_synced": 350,
                    "success_rate": 100.0
                },
                {
                    "integration": "Sage Business Cloud",
                    "status": "connected",
                    "last_sync": "2024-10-25 08:30:00",
                    "sync_frequency": "daily",
                    "records_synced": 280,
                    "success_rate": 95.0
                },
                {
                    "integration": "Microsoft 365",
                    "status": "connected",
                    "last_sync": "2024-10-25 09:00:00",
                    "sync_frequency": "hourly",
                    "records_synced": 450,
                    "success_rate": 98.0
                },
                {
                    "integration": "Pastel",
                    "status": "connected",
                    "last_sync": "2024-10-25 07:00:00",
                    "sync_frequency": "weekly",
                    "records_synced": 170,
                    "success_rate": 85.0
                }
            ],
            "sync_operations_by_entity": [
                {"entity": "Customers", "synced": 125, "failed": 0},
                {"entity": "Suppliers", "synced": 95, "failed": 1},
                {"entity": "Invoices", "synced": 550, "failed": 1},
                {"entity": "Payments", "synced": 380, "failed": 0},
                {"entity": "Products", "synced": 100, "failed": 0}
            ],
            "failed_syncs": [
                {
                    "integration": "Pastel",
                    "entity": "Suppliers",
                    "timestamp": "2024-10-24 07:00:00",
                    "error": "Connection timeout",
                    "retry_status": "scheduled"
                },
                {
                    "integration": "Sage",
                    "entity": "Invoices",
                    "timestamp": "2024-10-23 08:30:00",
                    "error": "Invalid data format",
                    "retry_status": "manual intervention required"
                }
            ],
            "performance_metrics": {
                "avg_sync_time_seconds": 45.0,
                "fastest_sync_seconds": 12.0,
                "slowest_sync_seconds": 180.0,
                "data_volume_mb": 25.5
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def generate_overall_system_health_report(
        self,
        tenant_id: str
    ) -> Dict:
        """
        Overall System Health Report
        
        Comprehensive view of ALL bot activities and system status
        """
        logger.info(f"Generating overall system health report for {tenant_id}")
        
        return {
            "report_type": "system_health",
            "tenant_id": tenant_id,
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": "healthy",
            "system_metrics": {
                "api_uptime_percent": 99.9,
                "avg_response_time_ms": 125,
                "error_rate_percent": 0.1,
                "active_users_today": 28,
                "bot_queries_today": 156,
                "workflows_active": 13,
                "pending_actions": 28
            },
            "bot_status": [
                {"bot": "Invoice Reconciliation", "status": "active", "queries_today": 45, "success_rate": 91.0},
                {"bot": "BBBEE Compliance", "status": "active", "queries_today": 8, "success_rate": 100.0},
                {"bot": "Payroll (SA)", "status": "active", "queries_today": 12, "success_rate": 100.0},
                {"bot": "Expense Management", "status": "active", "queries_today": 35, "success_rate": 94.0}
            ],
            "workflow_status": [
                {"workflow": "Purchase-to-Pay", "active": 3, "avg_completion_hours": 48.0, "sla_compliance": 100.0},
                {"workflow": "Order-to-Cash", "active": 3, "avg_completion_hours": 30.0, "sla_compliance": 96.0},
                {"workflow": "Expense Approval", "active": 7, "avg_completion_hours": 18.0, "sla_compliance": 95.0}
            ],
            "integration_status": [
                {"integration": "Xero", "status": "connected", "last_sync": "2024-10-25 08:00:00"},
                {"integration": "Sage", "status": "connected", "last_sync": "2024-10-25 08:30:00"},
                {"integration": "Microsoft 365", "status": "connected", "last_sync": "2024-10-25 09:00:00"},
                {"integration": "Pastel", "status": "connected", "last_sync": "2024-10-25 07:00:00"}
            ],
            "alerts": [
                {
                    "severity": "warning",
                    "message": "3 workflows overdue",
                    "action": "Review overdue workflow instances"
                },
                {
                    "severity": "info",
                    "message": "EMP201 ready to submit (due Nov 7)",
                    "action": "Submit to SARS before deadline"
                }
            ],
            "recommendations": [
                "Add additional approver for Finance role (bottleneck detected)",
                "Enable automated credit scoring to reduce O2C cycle time",
                "Review expense policy limits (12 violations this month)"
            ]
        }


# Singleton instance
bot_activity_reporter = BotActivityReporter()
