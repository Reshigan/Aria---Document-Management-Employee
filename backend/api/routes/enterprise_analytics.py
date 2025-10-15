"""
Enterprise Analytics API Router
Provides comprehensive business intelligence endpoints for Fortune 500 companies
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import logging

from auth import get_db, get_current_user
from models import User
from services.enterprise_analytics_service import enterprise_analytics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enterprise-analytics", tags=["Enterprise Analytics"])

@router.get("/executive")
async def get_executive_dashboard(
    date_range: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get executive-level dashboard with high-level KPIs and insights
    """
    try:
        logger.info(f"🎯 Generating executive dashboard for user {current_user.id}")
        
        dashboard_data = await enterprise_analytics.get_executive_dashboard(
            db=db,
            user_id=current_user.id,
            date_range=date_range
        )
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"❌ Executive dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")

@router.get("/operational")
async def get_operational_analytics(
    date_range: int = Query(7, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get operational analytics for day-to-day management
    """
    try:
        logger.info(f"⚙️ Generating operational analytics for user {current_user.id}")
        
        analytics_data = await enterprise_analytics.get_operational_analytics(
            db=db,
            user_id=current_user.id,
            date_range=date_range
        )
        
        return analytics_data
        
    except Exception as e:
        logger.error(f"❌ Operational analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analytics generation failed: {str(e)}")

@router.get("/financial")
async def get_financial_analytics(
    date_range: int = Query(90, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get financial analytics and cost optimization insights
    """
    try:
        logger.info(f"💰 Generating financial analytics for user {current_user.id}")
        
        financial_data = await enterprise_analytics.get_financial_analytics(
            db=db,
            user_id=current_user.id,
            date_range=date_range
        )
        
        return financial_data
        
    except Exception as e:
        logger.error(f"❌ Financial analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Financial analytics failed: {str(e)}")

@router.get("/compliance")
async def get_compliance_analytics(
    date_range: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get compliance and audit analytics
    """
    try:
        logger.info(f"🛡️ Generating compliance analytics for user {current_user.id}")
        
        compliance_data = await enterprise_analytics.get_compliance_analytics(
            db=db,
            user_id=current_user.id,
            date_range=date_range
        )
        
        return compliance_data
        
    except Exception as e:
        logger.error(f"❌ Compliance analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Compliance analytics failed: {str(e)}")

@router.get("/predictive")
async def get_predictive_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get predictive analytics using machine learning
    """
    try:
        logger.info(f"🔮 Generating predictive analytics for user {current_user.id}")
        
        predictive_data = await enterprise_analytics.get_predictive_analytics(
            db=db,
            user_id=current_user.id
        )
        
        return predictive_data
        
    except Exception as e:
        logger.error(f"❌ Predictive analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Predictive analytics failed: {str(e)}")

@router.get("/realtime")
async def get_realtime_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get real-time system metrics and status
    """
    try:
        # Mock real-time data - in production this would come from monitoring systems
        realtime_data = {
            "timestamp": "2024-01-15T10:30:00Z",
            "system_status": "operational",
            "active_users": 42,
            "documents_processing": 3,
            "queue_length": 7,
            "cpu_usage": 65.2,
            "memory_usage": 72.8,
            "storage_usage": 45.1,
            "recent_activities": [
                {
                    "type": "document_processed",
                    "message": "Invoice INV-2024-001 classified successfully",
                    "timestamp": "2024-01-15T10:29:45Z"
                },
                {
                    "type": "integration_sync",
                    "message": "SAP integration synchronized",
                    "timestamp": "2024-01-15T10:28:30Z"
                },
                {
                    "type": "user_login",
                    "message": "User admin logged in",
                    "timestamp": "2024-01-15T10:25:15Z"
                }
            ]
        }
        
        return realtime_data
        
    except Exception as e:
        logger.error(f"❌ Real-time data error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Real-time data retrieval failed: {str(e)}")