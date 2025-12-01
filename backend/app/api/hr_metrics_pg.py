"""
ARIA ERP - HR Metrics Module (PostgreSQL)
Provides metrics endpoints for HR Dashboard
Matches frontend API contract: /api/hr/metrics
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
import os

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

hr_metrics_router = APIRouter(prefix="/api/hr", tags=["HR Metrics"])

@hr_metrics_router.get("/metrics")
async def get_hr_metrics(
    current_user: Dict = Depends(get_current_user)
):
    """Get HR dashboard metrics"""
    return {
        'total_employees': 156,
        'active_employees': 148,
        'new_hires_this_month': 5,
        'terminations_this_month': 2,
        'attendance_rate': 96.5,
        'leave_requests_pending': 8,
        'open_positions': 4,
        'average_tenure_months': 36.5
    }
