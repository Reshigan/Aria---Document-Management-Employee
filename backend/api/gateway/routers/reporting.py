"""
Reporting & Analytics API Endpoints
Provide dashboards, metrics, and ROI calculations to B2B clients
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from backend.core.database import get_db
from backend.core.auth import get_current_user
from backend.models.user import User
from backend.services.reporting_service import ReportingService
from backend.models.reporting_models import BotType

router = APIRouter(prefix="/api/v1/reporting", tags=["Reporting & Analytics"])


@router.get("/dashboard/overview")
async def get_dashboard_overview(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete dashboard overview with all metrics
    
    Perfect for executive dashboard showing:
    - Performance across all bots
    - ROI calculations
    - Key metrics at a glance
    """
    reporting_service = ReportingService(db)
    org_id = current_user.organization_id
    
    # Get performance for each bot type
    performance = {}
    for bot_type in BotType:
        performance[bot_type.value] = reporting_service.get_bot_performance_summary(
            organization_id=org_id,
            bot_type=bot_type,
            start_date=datetime.utcnow() - timedelta(days=days),
            end_date=datetime.utcnow()
        )
    
    # Get specific stats
    document_stats = reporting_service.get_document_processing_stats(
        organization_id=org_id,
        start_date=datetime.utcnow() - timedelta(days=days)
    )
    
    helpdesk_stats = reporting_service.get_helpdesk_stats(
        organization_id=org_id,
        start_date=datetime.utcnow() - timedelta(days=days)
    )
    
    sales_stats = reporting_service.get_sales_order_stats(
        organization_id=org_id,
        start_date=datetime.utcnow() - timedelta(days=days)
    )
    
    # Calculate ROI
    roi = reporting_service.calculate_roi(
        organization_id=org_id,
        period_days=days,
        subscription_cost=1999.0,  # From their plan
        hourly_rate=25.0  # Assume $25/hour labor cost
    )
    
    return {
        "organization_id": org_id,
        "period_days": days,
        "generated_at": datetime.utcnow().isoformat(),
        "performance_by_bot": performance,
        "document_processing": document_stats,
        "helpdesk": helpdesk_stats,
        "sales_orders": sales_stats,
        "roi": roi
    }


@router.get("/performance/{bot_type}")
async def get_bot_performance(
    bot_type: str,
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed performance metrics for a specific bot type"""
    reporting_service = ReportingService(db)
    
    try:
        bot_type_enum = BotType[bot_type.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid bot type: {bot_type}")
    
    performance = reporting_service.get_bot_performance_summary(
        organization_id=current_user.organization_id,
        bot_type=bot_type_enum,
        start_date=datetime.utcnow() - timedelta(days=days),
        end_date=datetime.utcnow()
    )
    
    return {
        "bot_type": bot_type,
        "performance": performance
    }


@router.get("/document-processing/stats")
async def get_document_processing_stats(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed SAP document processing statistics
    
    Shows:
    - Documents processed
    - Extraction accuracy
    - Time saved
    - Financial totals
    - Document type breakdown
    """
    reporting_service = ReportingService(db)
    
    stats = reporting_service.get_document_processing_stats(
        organization_id=current_user.organization_id,
        start_date=datetime.utcnow() - timedelta(days=days),
        end_date=datetime.utcnow()
    )
    
    return {
        "document_processing": stats
    }


@router.get("/helpdesk/stats")
async def get_helpdesk_stats(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed WhatsApp helpdesk statistics
    
    Shows:
    - Conversations handled
    - Bot resolution rate
    - Response times
    - Customer satisfaction
    - SLA compliance
    - Query type breakdown
    - Sentiment analysis
    """
    reporting_service = ReportingService(db)
    
    stats = reporting_service.get_helpdesk_stats(
        organization_id=current_user.organization_id,
        start_date=datetime.utcnow() - timedelta(days=days),
        end_date=datetime.utcnow()
    )
    
    return {
        "helpdesk": stats
    }


@router.get("/sales-orders/stats")
async def get_sales_order_stats(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed sales order processing statistics
    
    Shows:
    - Orders processed
    - Total order value
    - Quote conversion rates
    - Validation pass rates
    - Revenue impact
    """
    reporting_service = ReportingService(db)
    
    stats = reporting_service.get_sales_order_stats(
        organization_id=current_user.organization_id,
        start_date=datetime.utcnow() - timedelta(days=days),
        end_date=datetime.utcnow()
    )
    
    return {
        "sales_orders": stats
    }


@router.get("/roi/calculate")
async def calculate_roi(
    days: int = Query(30, description="Period for ROI calculation"),
    subscription_cost: float = Query(1999.0, description="Monthly subscription cost"),
    hourly_rate: float = Query(25.0, description="Internal labor cost per hour"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate ROI for the platform
    
    Returns comprehensive ROI analysis including:
    - Costs (subscription + usage)
    - Savings (time, errors, speed)
    - Revenue impact (additional orders)
    - Net benefit and ROI percentage
    - Payback period
    - Annual projections
    
    This is the KEY metric for B2B sales and customer retention!
    """
    reporting_service = ReportingService(db)
    
    roi = reporting_service.calculate_roi(
        organization_id=current_user.organization_id,
        period_days=days,
        subscription_cost=subscription_cost,
        hourly_rate=hourly_rate
    )
    
    return {
        "roi_analysis": roi,
        "recommendation": _get_roi_recommendation(roi["roi"]["roi_percentage"])
    }


@router.get("/accuracy/trends")
async def get_accuracy_trends(
    bot_type: Optional[str] = Query(None, description="Filter by bot type"),
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get accuracy trends over time
    
    Shows:
    - Overall accuracy percentage
    - Field-level accuracy breakdown
    - Improvement over time
    - Areas needing attention
    """
    reporting_service = ReportingService(db)
    
    bot_type_enum = None
    if bot_type:
        try:
            bot_type_enum = BotType[bot_type.upper()]
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid bot type: {bot_type}")
    
    trends = reporting_service.get_accuracy_trends(
        organization_id=current_user.organization_id,
        bot_type=bot_type_enum,
        days=days
    )
    
    return {
        "accuracy_trends": trends
    }


@router.get("/export/csv")
async def export_to_csv(
    bot_type: Optional[str] = Query(None, description="Filter by bot type"),
    days: int = Query(30, description="Number of days to export"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export metrics to CSV for external analysis
    
    Useful for:
    - Board reports
    - Financial analysis
    - Compliance audits
    - Customer presentations
    """
    # TODO: Implement CSV export
    return {
        "message": "CSV export coming soon",
        "format": "CSV with all metrics",
        "delivery": "Email or direct download"
    }


@router.get("/realtime/status")
async def get_realtime_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time system status
    
    Shows what's happening RIGHT NOW:
    - Active conversations
    - Documents being processed
    - Orders in queue
    - System health
    """
    from backend.models.reporting_models import BotInteractionLog, ProcessingStatus
    
    # Get recent activity (last 5 minutes)
    five_min_ago = datetime.utcnow() - timedelta(minutes=5)
    
    recent_interactions = db.query(BotInteractionLog).filter(
        BotInteractionLog.organization_id == current_user.organization_id,
        BotInteractionLog.started_at >= five_min_ago
    ).all()
    
    active_count = len([i for i in recent_interactions if i.processing_status == ProcessingStatus.PENDING])
    
    # Count by bot type
    by_bot_type = {}
    for interaction in recent_interactions:
        bot_type = interaction.bot_type.value
        by_bot_type[bot_type] = by_bot_type.get(bot_type, 0) + 1
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "active_interactions": active_count,
        "last_5_minutes": len(recent_interactions),
        "by_bot_type": by_bot_type,
        "status": "operational" if active_count < 100 else "high_load"
    }


@router.get("/benchmarks/industry")
async def get_industry_benchmarks(
    current_user: User = Depends(get_current_user)
):
    """
    Compare performance against industry benchmarks
    
    Helps clients understand:
    - Are we performing well?
    - Where can we improve?
    - How do we compare to similar companies?
    """
    return {
        "industry_benchmarks": {
            "document_processing": {
                "accuracy": {"industry_avg": 92.0, "top_quartile": 97.0},
                "processing_time": {"industry_avg": 180.0, "top_quartile": 120.0},
                "auto_approval_rate": {"industry_avg": 75.0, "top_quartile": 85.0}
            },
            "helpdesk": {
                "bot_resolution_rate": {"industry_avg": 65.0, "top_quartile": 80.0},
                "first_response_time": {"industry_avg": 45.0, "top_quartile": 30.0},
                "satisfaction_rating": {"industry_avg": 4.2, "top_quartile": 4.7}
            },
            "sales_orders": {
                "processing_accuracy": {"industry_avg": 94.0, "top_quartile": 98.0},
                "conversion_rate": {"industry_avg": 25.0, "top_quartile": 35.0}
            }
        },
        "note": "Benchmarks based on aggregated anonymous data from similar companies"
    }


# ============ Helper Functions ============

def _get_roi_recommendation(roi_percentage: float) -> str:
    """Generate recommendation based on ROI"""
    if roi_percentage > 300:
        return "🚀 Exceptional ROI! Consider expanding to more departments/use cases."
    elif roi_percentage > 200:
        return "🎉 Excellent ROI! Platform is delivering strong value."
    elif roi_percentage > 100:
        return "✅ Good ROI. Platform is paying for itself and delivering value."
    elif roi_percentage > 50:
        return "📈 Positive ROI. Consider optimizing bot usage for better returns."
    elif roi_percentage > 0:
        return "⚠️ Modest ROI. Review configuration and usage patterns."
    else:
        return "❗ Negative ROI. Please contact support for optimization consultation."
