"""
L4 API: Leave Accrual Detail
Tracks detailed leave accrual calculations and breakdowns
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import date

try:
    from core.database import get_db
except ImportError:
    try:
        from auth import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db

try:
    from core.auth import get_current_user
except ImportError:
    try:
        from app.auth import get_current_user
    except ImportError:
        from auth_integrated import get_current_user

router = APIRouter()


@router.get("/employee/{employee_id}/leave-accrual-details")
async def list_employee_leave_accrual_details(
    employee_id: int,
    leave_type: Optional[str] = Query(None, description="Filter by leave type"),
    from_date: Optional[date] = Query(None, description="Filter from date"),
    to_date: Optional[date] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List leave accrual details for an employee"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                la.id,
                la.employee_id,
                u.email as employee_name,
                la.leave_type,
                la.leave_type as leave_type_name,
                la.accrual_date,
                la.accrued_hours,
                la.balance_hours,
                la.created_at
            FROM leave_accruals la
            LEFT JOIN users u ON CAST(la.employee_id AS TEXT) = CAST(u.id AS TEXT)
            WHERE la.employee_id = :employee_id
                AND la.company_id = :company_id
                AND (:leave_type IS NULL OR la.leave_type = :leave_type)
                AND (:from_date IS NULL OR la.accrual_date >= :from_date)
                AND (:to_date IS NULL OR la.accrual_date <= :to_date)
            ORDER BY la.accrual_date DESC
        """)
        
        result = db.execute(query, {
            "employee_id": employee_id,
            "company_id": company_id,
            "leave_type": leave_type,
            "from_date": from_date,
            "to_date": to_date
        })
        
        details = []
        for row in result.fetchall():
            details.append({
                "id": row[0],
                "employee_id": row[1],
                "employee_name": row[2],
                "leave_type_id": row[3],
                "leave_type_name": row[4],
                "accrual_date": str(row[5]) if row[5] else None,
                "hours_accrued": float(row[6]) if row[6] else 0,
                "balance": float(row[7]) if row[7] else 0,
                "created_at": str(row[8]) if row[8] else None
            })
        
        return {"details": details, "count": len(details)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leave-accrual-detail/{detail_id}")
async def get_leave_accrual_detail(
    detail_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a specific leave accrual detail"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                la.id,
                la.employee_id,
                u.email as employee_name,
                u.email as employee_number,
                la.leave_type,
                la.leave_type as leave_type_name,
                la.accrual_date,
                la.accrued_hours,
                la.balance_hours,
                la.created_at
            FROM leave_accruals la
            LEFT JOIN users u ON CAST(la.employee_id AS TEXT) = CAST(u.id AS TEXT)
            WHERE la.id = :detail_id AND la.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "detail_id": detail_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Leave accrual detail not found")
        
        balance_query = text("""
            SELECT 
                SUM(la.balance_hours) as balance,
                SUM(la.used_hours) as used,
                SUM(la.balance_hours - la.used_hours) as available
            FROM leave_accruals la
            WHERE la.employee_id = :employee_id
                AND la.leave_type = :leave_type
                AND la.company_id = :company_id
        """)
        
        balance_result = db.execute(balance_query, {
            "employee_id": result[1],
            "leave_type": result[4],
            "company_id": company_id
        }).fetchone()
        
        leave_balance = None
        if balance_result:
            leave_balance = {
                "balance": float(balance_result[0]) if balance_result[0] else 0,
                "used": float(balance_result[1]) if balance_result[1] else 0,
                "available": float(balance_result[2]) if balance_result[2] else 0
            }
        
        return {
            "detail": {
                "id": result[0],
                "employee_id": result[1],
                "employee_name": result[2],
                "employee_number": result[3],
                "leave_type_id": result[4],
                "leave_type_name": result[5],
                "accrual_date": str(result[6]) if result[6] else None,
                "hours_accrued": float(result[7]) if result[7] else 0,
                "balance": float(result[8]) if result[8] else 0,
                "created_at": str(result[9]) if result[9] else None
            },
            "leave_balance": leave_balance
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/employee/{employee_id}/create-accrual-detail")
async def create_leave_accrual_detail(
    employee_id: int,
    leave_type: str,
    accrual_date: date,
    hours_accrued: float,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a manual leave accrual detail entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        employee_query = text("""
            SELECT id FROM users
            WHERE id = CAST(:employee_id AS UUID)
        """)
        
        employee_result = db.execute(employee_query, {
            "employee_id": employee_id
        }).fetchone()
        
        if not employee_result:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        balance_query = text("""
            SELECT COALESCE(balance_hours, 0)
            FROM leave_accruals
            WHERE employee_id = :employee_id
                AND leave_type = :leave_type
            ORDER BY accrual_date DESC
            LIMIT 1
        """)
        
        balance_result = db.execute(balance_query, {
            "employee_id": employee_id,
            "leave_type": leave_type
        }).fetchone()
        
        current_balance = float(balance_result[0]) if balance_result else 0
        new_balance = current_balance + hours_accrued
        
        insert_query = text("""
            INSERT INTO leave_accruals (
                employee_id, leave_type, accrual_date,
                accrued_hours, balance_hours, company_id, created_at
            ) VALUES (
                :employee_id, :leave_type, :accrual_date,
                :hours_accrued, :balance, :company_id, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "employee_id": employee_id,
            "leave_type": leave_type,
            "accrual_date": accrual_date,
            "hours_accrued": hours_accrued,
            "balance": new_balance,
            "company_id": company_id
        })
        
        detail_id = result.fetchone()[0]
        db.commit()
        
        return {
            "message": "Leave accrual detail created successfully",
            "detail_id": detail_id,
            "new_balance": new_balance
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "leave_accrual_detail"}
