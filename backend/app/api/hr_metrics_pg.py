"""
ARIA ERP - HR Metrics Module (PostgreSQL)
Provides metrics endpoints for HR Dashboard
Matches frontend API contract: /api/hr/metrics
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
import psycopg2
import psycopg2.extras
import os
from datetime import datetime, timedelta

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

hr_metrics_router = APIRouter(prefix="/api/hr", tags=["HR Metrics"])

@hr_metrics_router.get("/metrics")
async def get_hr_metrics(
    current_user: Dict = Depends(get_current_user)
):
    """Get HR dashboard metrics"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        # Get employee counts
        cursor.execute("""
            SELECT 
                COUNT(*) as total_employees,
                COUNT(*) FILTER (WHERE status = 'active') as active_employees
            FROM users
            WHERE company_id = %s AND role != 'system'
        """, (company_id,))
        employee_stats = cursor.fetchone()
        
        # Get new hires this month
        first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        cursor.execute("""
            SELECT COUNT(*) as new_hires
            FROM users
            WHERE company_id = %s AND hire_date >= %s
        """, (company_id, first_day_of_month))
        new_hires = cursor.fetchone()
        
        # Get terminations this month
        cursor.execute("""
            SELECT COUNT(*) as terminations
            FROM users
            WHERE company_id = %s AND termination_date >= %s
        """, (company_id, first_day_of_month))
        terminations = cursor.fetchone()
        
        # Get attendance rate (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        cursor.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'PRESENT') * 100.0 / NULLIF(COUNT(*), 0) as attendance_rate
            FROM attendance_records
            WHERE company_id = %s AND date >= %s
        """, (company_id, thirty_days_ago.date()))
        attendance = cursor.fetchone()
        
        # Get pending leave requests
        cursor.execute("""
            SELECT COUNT(*) as pending_requests
            FROM leave_requests
            WHERE company_id = %s AND status = 'pending'
        """, (company_id,))
        leave_requests = cursor.fetchone()
        
        # Calculate average tenure
        cursor.execute("""
            SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(termination_date, NOW()) - hire_date)) / 2592000) as avg_tenure_months
            FROM users
            WHERE company_id = %s AND hire_date IS NOT NULL
        """, (company_id,))
        tenure = cursor.fetchone()
        
        return {
            'total_employees': int(employee_stats.get('total_employees', 0)),
            'active_employees': int(employee_stats.get('active_employees', 0)),
            'new_hires_this_month': int(new_hires.get('new_hires', 0)),
            'terminations_this_month': int(terminations.get('terminations', 0)),
            'attendance_rate': float(attendance.get('attendance_rate', 0)) if attendance.get('attendance_rate') else 0.0,
            'leave_requests_pending': int(leave_requests.get('pending_requests', 0)),
            'open_positions': 0,  # Would need a separate jobs/positions table
            'average_tenure_months': float(tenure.get('avg_tenure_months', 0)) if tenure.get('avg_tenure_months') else 0.0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
