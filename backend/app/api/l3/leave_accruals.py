from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class LeaveAccrualCreate(BaseModel):
    employee_id: int
    leave_type: str
    accrual_date: str
    accrued_hours: float
    notes: Optional[str] = None


@router.get("/employee/{employee_id}/leave-accruals")
async def get_employee_leave_accruals(
    employee_id: int,
    leave_type: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get leave accrual history for an employee"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["la.company_id = :company_id", "la.employee_id = :employee_id"]
        params = {"company_id": company_id, "employee_id": employee_id}
        
        if leave_type:
            where_clauses.append("la.leave_type = :leave_type")
            params["leave_type"] = leave_type
        
        if year:
            where_clauses.append("EXTRACT(YEAR FROM la.accrual_date) = :year")
            params["year"] = year
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                la.id,
                la.leave_type,
                la.accrual_date,
                la.accrued_hours,
                la.used_hours,
                la.balance_hours,
                la.notes,
                la.created_at
            FROM leave_accruals la
            WHERE {where_clause}
            ORDER BY la.accrual_date DESC, la.created_at DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        accruals = []
        for row in rows:
            accruals.append({
                "id": row[0],
                "leave_type": row[1],
                "accrual_date": str(row[2]) if row[2] else None,
                "accrued_hours": float(row[3]) if row[3] else 0,
                "used_hours": float(row[4]) if row[4] else 0,
                "balance_hours": float(row[5]) if row[5] else 0,
                "notes": row[6],
                "created_at": str(row[7]) if row[7] else None
            })
        
        return {"accruals": accruals, "total_count": len(accruals)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee/{employee_id}/leave-balance")
async def get_employee_leave_balance(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current leave balance for an employee by leave type"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                la.leave_type,
                SUM(la.accrued_hours) as total_accrued,
                SUM(la.used_hours) as total_used,
                SUM(la.balance_hours) as current_balance
            FROM leave_accruals la
            WHERE la.employee_id = :employee_id AND la.company_id = :company_id
            GROUP BY la.leave_type
            ORDER BY la.leave_type
        """)
        
        result = db.execute(query, {"employee_id": employee_id, "company_id": company_id})
        rows = result.fetchall()
        
        balances = []
        for row in rows:
            balances.append({
                "leave_type": row[0],
                "total_accrued": float(row[1]) if row[1] else 0,
                "total_used": float(row[2]) if row[2] else 0,
                "current_balance": float(row[3]) if row[3] else 0
            })
        
        return {"balances": balances}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/employee/{employee_id}/leave-accrual")
async def create_leave_accrual(
    employee_id: int,
    accrual: LeaveAccrualCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a leave accrual entry"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        balance_query = text("""
            SELECT COALESCE(SUM(balance_hours), 0)
            FROM leave_accruals
            WHERE employee_id = :employee_id 
                AND leave_type = :leave_type
                AND company_id = :company_id
        """)
        
        balance_result = db.execute(balance_query, {
            "employee_id": employee_id,
            "leave_type": accrual.leave_type,
            "company_id": company_id
        }).fetchone()
        
        current_balance = float(balance_result[0]) if balance_result[0] else 0
        new_balance = current_balance + accrual.accrued_hours
        
        insert_query = text("""
            INSERT INTO leave_accruals (
                employee_id, leave_type, accrual_date, accrued_hours,
                used_hours, balance_hours, notes, company_id, created_by, created_at
            ) VALUES (
                :employee_id, :leave_type, :accrual_date, :accrued_hours,
                0, :balance_hours, :notes, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "employee_id": employee_id,
            "leave_type": accrual.leave_type,
            "accrual_date": accrual.accrual_date,
            "accrued_hours": accrual.accrued_hours,
            "balance_hours": new_balance,
            "notes": accrual.notes,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        accrual_id = result.fetchone()[0]
        
        return {
            "id": accrual_id,
            "message": "Leave accrual created successfully",
            "new_balance": new_balance
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/employee/{employee_id}/use-leave")
async def use_leave(
    employee_id: int,
    leave_type: str,
    hours_used: float,
    usage_date: str,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record leave usage"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        balance_query = text("""
            SELECT COALESCE(SUM(balance_hours), 0)
            FROM leave_accruals
            WHERE employee_id = :employee_id 
                AND leave_type = :leave_type
                AND company_id = :company_id
        """)
        
        balance_result = db.execute(balance_query, {
            "employee_id": employee_id,
            "leave_type": leave_type,
            "company_id": company_id
        }).fetchone()
        
        current_balance = float(balance_result[0]) if balance_result[0] else 0
        
        if current_balance < hours_used:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient leave balance. Available: {current_balance} hours, Requested: {hours_used} hours"
            )
        
        new_balance = current_balance - hours_used
        
        insert_query = text("""
            INSERT INTO leave_accruals (
                employee_id, leave_type, accrual_date, accrued_hours,
                used_hours, balance_hours, notes, company_id, created_by, created_at
            ) VALUES (
                :employee_id, :leave_type, :usage_date, 0,
                :hours_used, :balance_hours, :notes, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "employee_id": employee_id,
            "leave_type": leave_type,
            "usage_date": usage_date,
            "hours_used": hours_used,
            "balance_hours": new_balance,
            "notes": notes,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        usage_id = result.fetchone()[0]
        
        return {
            "id": usage_id,
            "message": "Leave usage recorded successfully",
            "new_balance": new_balance
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leave-accruals/upcoming-expirations")
async def get_upcoming_expirations(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get leave balances that are expiring soon"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                la.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                la.leave_type,
                SUM(la.balance_hours) as balance_hours,
                la.expiry_date
            FROM leave_accruals la
            JOIN employees e ON la.employee_id = e.id
            WHERE la.company_id = :company_id
                AND la.expiry_date IS NOT NULL
                AND la.expiry_date <= CURRENT_DATE + INTERVAL ':days days'
                AND la.balance_hours > 0
            GROUP BY la.employee_id, e.first_name, e.last_name, la.leave_type, la.expiry_date
            ORDER BY la.expiry_date
        """)
        
        result = db.execute(query, {"company_id": company_id, "days": days})
        rows = result.fetchall()
        
        expirations = []
        for row in rows:
            expirations.append({
                "employee_id": row[0],
                "employee_name": row[1],
                "leave_type": row[2],
                "balance_hours": float(row[3]) if row[3] else 0,
                "expiry_date": str(row[4]) if row[4] else None
            })
        
        return {"expirations": expirations, "total_count": len(expirations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leave-accruals/summary")
async def get_leave_accruals_summary(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get leave accruals summary across all employees"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["la.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if year:
            where_clauses.append("EXTRACT(YEAR FROM la.accrual_date) = :year")
            params["year"] = year
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                la.leave_type,
                COUNT(DISTINCT la.employee_id) as employee_count,
                SUM(la.accrued_hours) as total_accrued,
                SUM(la.used_hours) as total_used,
                SUM(la.balance_hours) as total_balance
            FROM leave_accruals la
            WHERE {where_clause}
            GROUP BY la.leave_type
            ORDER BY la.leave_type
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        summary = []
        for row in rows:
            summary.append({
                "leave_type": row[0],
                "employee_count": row[1],
                "total_accrued": float(row[2]) if row[2] else 0,
                "total_used": float(row[3]) if row[3] else 0,
                "total_balance": float(row[4]) if row[4] else 0
            })
        
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
