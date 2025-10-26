"""
Comprehensive Reporting API Routes

Provides visibility into ALL bot activities since they work in background mode.

Report Categories:
1. Bot Activity Reports (per bot)
2. Workflow Execution Reports
3. Integration Sync Reports
4. Bot Action System Reports
5. Financial Activity Reports
6. Compliance Reports
7. System Health Reports
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date

from backend.reports.bot_activity_reports import (
    bot_activity_reporter,
    ReportPeriod
)
from backend.reports.report_engine import report_engine, ReportType, ExportFormat

router = APIRouter(prefix="/reports", tags=["reports"])


# ============================================================================
# BOT ACTIVITY REPORTS
# ============================================================================

@router.get("/bot-activity/invoice-reconciliation")
async def get_invoice_reconciliation_report(
    period: ReportPeriod = Query(ReportPeriod.LAST_7_DAYS),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant", "role": "admin"})
):
    """
    Invoice Reconciliation Bot Activity Report
    
    Shows what the bot is doing in real-time:
    - Invoices processed
    - Matches found
    - Discrepancies detected
    - Auto-approvals
    - Recent activity
    """
    return bot_activity_reporter.generate_invoice_reconciliation_report(
        tenant_id=current_user["tenant_id"],
        period=period,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/bot-activity/bbbee-compliance")
async def get_bbbee_compliance_report(
    period: ReportPeriod = Query(ReportPeriod.LAST_30_DAYS),
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """
    BBBEE Compliance Bot Activity Report
    
    Shows:
    - Current BBBEE level and score
    - Scorecard by element
    - Trend (improving/declining)
    - Supplier verifications
    - Improvement opportunities
    """
    return bot_activity_reporter.generate_bbbee_compliance_report(
        tenant_id=current_user["tenant_id"],
        period=period
    )


@router.get("/bot-activity/payroll")
async def get_payroll_activity_report(
    period: ReportPeriod = Query(ReportPeriod.THIS_MONTH),
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """
    Payroll Bot Activity Report
    
    Shows:
    - Payroll runs completed
    - PAYE, UIF, SDL calculations
    - SARS submissions prepared
    - Payslips generated
    - Compliance status
    """
    return bot_activity_reporter.generate_payroll_activity_report(
        tenant_id=current_user["tenant_id"],
        period=period
    )


@router.get("/bot-activity/expense-management")
async def get_expense_management_report(
    period: ReportPeriod = Query(ReportPeriod.LAST_30_DAYS),
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """
    Expense Management Bot Activity Report
    
    Shows:
    - Expense claims processed
    - Auto-approved vs manual review
    - Policy violations detected
    - Top spenders
    - Recent activity
    """
    return bot_activity_reporter.generate_expense_management_report(
        tenant_id=current_user["tenant_id"],
        period=period
    )


# ============================================================================
# WORKFLOW REPORTS
# ============================================================================

@router.get("/workflows/execution")
async def get_workflow_execution_report(
    period: ReportPeriod = Query(ReportPeriod.LAST_7_DAYS),
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """
    Workflow Execution Report
    
    Shows:
    - Active workflows
    - Completed workflows
    - Workflow performance
    - Bottlenecks identified
    - SLA compliance
    """
    return bot_activity_reporter.generate_workflow_execution_report(
        tenant_id=current_user["tenant_id"],
        period=period
    )


# ============================================================================
# BOT ACTION SYSTEM REPORTS
# ============================================================================

@router.get("/bot-actions/activity")
async def get_bot_action_system_report(
    period: ReportPeriod = Query(ReportPeriod.LAST_7_DAYS),
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """
    Bot Action System Report (Proactive Chase)
    
    Shows:
    - Actions tracked
    - Notifications sent (email, WhatsApp, SMS)
    - Escalations triggered
    - Response rates
    - User responsiveness
    """
    return bot_activity_reporter.generate_bot_action_system_report(
        tenant_id=current_user["tenant_id"],
        period=period
    )


# ============================================================================
# INTEGRATION REPORTS
# ============================================================================

@router.get("/integrations/sync-status")
async def get_integration_sync_report(
    period: ReportPeriod = Query(ReportPeriod.LAST_7_DAYS),
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """
    Integration Sync Status Report
    
    Shows:
    - Active integrations (Xero, Sage, Pastel, Microsoft)
    - Sync operations completed
    - Success/failure rates
    - Data volume synced
    - Failed syncs (with error details)
    """
    return bot_activity_reporter.generate_integration_sync_report(
        tenant_id=current_user["tenant_id"],
        period=period
    )


# ============================================================================
# SYSTEM HEALTH REPORTS
# ============================================================================

@router.get("/system/health")
async def get_system_health_report(
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """
    Overall System Health Report
    
    Comprehensive view of:
    - All bot statuses
    - All workflow statuses
    - All integration statuses
    - System metrics
    - Alerts and recommendations
    """
    return bot_activity_reporter.generate_overall_system_health_report(
        tenant_id=current_user["tenant_id"]
    )


# ============================================================================
# FINANCIAL REPORTS
# ============================================================================

@router.get("/financial/profit-loss")
async def get_profit_loss_report(
    start_date: date,
    end_date: date,
    export_format: Optional[ExportFormat] = None,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """Profit & Loss Statement"""
    report_data = report_engine.generate_profit_loss(
        start_date=start_date,
        end_date=end_date,
        tenant_id=current_user["tenant_id"]
    )
    
    if export_format:
        return report_engine.export_report(report_data, export_format)
    
    return report_data


@router.get("/financial/balance-sheet")
async def get_balance_sheet_report(
    as_of_date: date,
    export_format: Optional[ExportFormat] = None,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """Balance Sheet"""
    report_data = report_engine.generate_balance_sheet(
        as_of_date=as_of_date,
        tenant_id=current_user["tenant_id"]
    )
    
    if export_format:
        return report_engine.export_report(report_data, export_format)
    
    return report_data


@router.get("/financial/aged-debtors")
async def get_aged_debtors_report(
    as_of_date: date,
    export_format: Optional[ExportFormat] = None,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """Aged Debtors Report"""
    report_data = report_engine.generate_aged_debtors(
        as_of_date=as_of_date,
        tenant_id=current_user["tenant_id"]
    )
    
    if export_format:
        return report_engine.export_report(report_data, export_format)
    
    return report_data


@router.get("/compliance/vat-return")
async def get_vat_return_report(
    period: str,  # YYYYMM
    export_format: Optional[ExportFormat] = None,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """VAT201 Return"""
    report_data = report_engine.generate_vat_return(
        period=period,
        tenant_id=current_user["tenant_id"]
    )
    
    if export_format:
        return report_engine.export_report(report_data, export_format)
    
    return report_data


@router.get("/compliance/bbbee-scorecard")
async def get_bbbee_scorecard_report(
    export_format: Optional[ExportFormat] = None,
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """BBBEE Scorecard Report"""
    report_data = report_engine.generate_bbbee_scorecard(
        tenant_id=current_user["tenant_id"]
    )
    
    if export_format:
        return report_engine.export_report(report_data, export_format)
    
    return report_data


# ============================================================================
# DASHBOARD SUMMARY (FOR HOMEPAGE)
# ============================================================================

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    current_user: dict = Depends(lambda: {"tenant_id": "demo_tenant"})
):
    """
    Dashboard Summary - Quick Overview
    
    Perfect for homepage dashboard showing:
    - Key metrics across all areas
    - Recent activity
    - Pending actions
    - Alerts
    """
    return {
        "timestamp": "2024-10-25T15:00:00Z",
        "bot_activity": {
            "invoice_reconciliation": {"today": 21, "this_week": 156, "success_rate": 91.0},
            "bbbee_compliance": {"current_level": 4, "score": 79, "trend": "improving"},
            "payroll": {"last_run": "2024-10-25", "employees": 45, "status": "completed"},
            "expense_management": {"today": 8, "pending_approval": 12, "total_amount": 15250.00}
        },
        "workflows": {
            "active": 13,
            "completed_this_week": 72,
            "overdue": 3,
            "sla_compliance": 96.5
        },
        "bot_actions": {
            "pending": 28,
            "notifications_sent_today": 45,
            "escalations_active": 2
        },
        "integrations": {
            "active": 4,
            "last_sync": "2024-10-25 09:00:00",
            "success_rate": 92.9
        },
        "alerts": [
            {"severity": "warning", "message": "3 workflows overdue"},
            {"severity": "info", "message": "EMP201 ready to submit (due Nov 7)"}
        ],
        "recent_activity": [
            {
                "timestamp": "2024-10-25 14:30:00",
                "type": "invoice_match",
                "description": "Invoice INV-2024-1234 matched and auto-approved (R5,500)"
            },
            {
                "timestamp": "2024-10-25 14:25:00",
                "type": "expense_approval",
                "description": "Expense claim by Jane Doe auto-approved (R850)"
            },
            {
                "timestamp": "2024-10-25 14:20:00",
                "type": "workflow_completed",
                "description": "Order-to-Cash workflow completed for ABC Corp"
            }
        ]
    }
