from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/leave-accrual-transaction/{transaction_id}/detail")
async def get_leave_accrual_transaction_detail(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a leave accrual transaction"""
    try:
        company_id = current_user.get("company_id", "default")
        
        transaction_query = text("""
            SELECT 
                lat.id,
                lat.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                e.employee_number,
                lat.leave_type_id,
                lt.leave_type_name,
                lat.transaction_date,
                lat.transaction_type,
                lat.hours_accrued,
                lat.hours_used,
                lat.hours_balance,
                lat.reference_type,
                lat.reference_id,
                lat.notes,
                lat.created_by,
                lat.created_at
            FROM leave_accrual_transactions lat
            JOIN employees e ON lat.employee_id = e.id
            JOIN leave_types lt ON lat.leave_type_id = lt.id
            WHERE lat.id = :transaction_id AND lat.company_id = :company_id
        """)
        
        transaction_result = db.execute(transaction_query, {
            "transaction_id": transaction_id,
            "company_id": company_id
        }).fetchone()
        
        if not transaction_result:
            raise HTTPException(status_code=404, detail="Leave accrual transaction not found")
        
        balance_query = text("""
            SELECT 
                lat.id,
                lat.transaction_date,
                lat.transaction_type,
                lat.hours_accrued,
                lat.hours_used,
                lat.hours_balance
            FROM leave_accrual_transactions lat
            WHERE lat.employee_id = :employee_id
                AND lat.leave_type_id = :leave_type_id
                AND lat.company_id = :company_id
            ORDER BY lat.transaction_date DESC, lat.id DESC
            LIMIT 10
        """)
        
        balance_result = db.execute(balance_query, {
            "employee_id": transaction_result[1],
            "leave_type_id": transaction_result[4],
            "company_id": company_id
        })
        
        balance_history = []
        for row in balance_result.fetchall():
            balance_history.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "hours_accrued": float(row[3]) if row[3] else 0,
                "hours_used": float(row[4]) if row[4] else 0,
                "hours_balance": float(row[5]) if row[5] else 0
            })
        
        reference_document = None
        if transaction_result[11] and transaction_result[12]:
            ref_type = transaction_result[11]
            ref_id = transaction_result[12]
            
            if ref_type == "LEAVE_REQUEST":
                ref_query = text("""
                    SELECT 
                        lr.request_number,
                        lr.start_date,
                        lr.end_date,
                        lr.total_hours,
                        lr.status
                    FROM leave_requests lr
                    WHERE lr.id = :ref_id AND lr.company_id = :company_id
                """)
                
                ref_result = db.execute(ref_query, {
                    "ref_id": ref_id,
                    "company_id": company_id
                }).fetchone()
                
                if ref_result:
                    reference_document = {
                        "type": "LEAVE_REQUEST",
                        "request_number": ref_result[0],
                        "start_date": str(ref_result[1]) if ref_result[1] else None,
                        "end_date": str(ref_result[2]) if ref_result[2] else None,
                        "total_hours": float(ref_result[3]) if ref_result[3] else 0,
                        "status": ref_result[4]
                    }
            
            elif ref_type == "PAYSLIP":
                ref_query = text("""
                    SELECT 
                        ps.payslip_number,
                        ps.pay_period_start,
                        ps.pay_period_end,
                        ps.payment_date
                    FROM payslips ps
                    WHERE ps.id = :ref_id AND ps.company_id = :company_id
                """)
                
                ref_result = db.execute(ref_query, {
                    "ref_id": ref_id,
                    "company_id": company_id
                }).fetchone()
                
                if ref_result:
                    reference_document = {
                        "type": "PAYSLIP",
                        "payslip_number": ref_result[0],
                        "pay_period_start": str(ref_result[1]) if ref_result[1] else None,
                        "pay_period_end": str(ref_result[2]) if ref_result[2] else None,
                        "payment_date": str(ref_result[3]) if ref_result[3] else None
                    }
        
        policy_query = text("""
            SELECT 
                lp.id,
                lp.policy_name,
                lp.accrual_rate,
                lp.accrual_frequency,
                lp.max_accrual,
                lp.carryover_allowed,
                lp.max_carryover
            FROM leave_policies lp
            WHERE lp.leave_type_id = :leave_type_id
                AND lp.company_id = :company_id
            LIMIT 1
        """)
        
        policy_result = db.execute(policy_query, {
            "leave_type_id": transaction_result[4],
            "company_id": company_id
        }).fetchone()
        
        leave_policy = None
        if policy_result:
            leave_policy = {
                "id": policy_result[0],
                "policy_name": policy_result[1],
                "accrual_rate": float(policy_result[2]) if policy_result[2] else 0,
                "accrual_frequency": policy_result[3],
                "max_accrual": float(policy_result[4]) if policy_result[4] else 0,
                "carryover_allowed": policy_result[5],
                "max_carryover": float(policy_result[6]) if policy_result[6] else 0
            }
        
        return {
            "transaction": {
                "id": transaction_result[0],
                "employee_id": transaction_result[1],
                "employee_name": transaction_result[2],
                "employee_number": transaction_result[3],
                "leave_type_id": transaction_result[4],
                "leave_type_name": transaction_result[5],
                "transaction_date": str(transaction_result[6]) if transaction_result[6] else None,
                "transaction_type": transaction_result[7],
                "hours_accrued": float(transaction_result[8]) if transaction_result[8] else 0,
                "hours_used": float(transaction_result[9]) if transaction_result[9] else 0,
                "hours_balance": float(transaction_result[10]) if transaction_result[10] else 0,
                "reference_type": transaction_result[11],
                "reference_id": transaction_result[12],
                "notes": transaction_result[13],
                "created_by": transaction_result[14],
                "created_at": str(transaction_result[15]) if transaction_result[15] else None
            },
            "balance_history": balance_history,
            "reference_document": reference_document,
            "leave_policy": leave_policy
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/employee/{employee_id}/accrue-leave")
async def accrue_leave(
    employee_id: int,
    leave_type_id: int,
    hours_accrued: float,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Accrue leave for an employee"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        balance_query = text("""
            SELECT COALESCE(hours_balance, 0)
            FROM leave_accrual_transactions
            WHERE employee_id = :employee_id
                AND leave_type_id = :leave_type_id
                AND company_id = :company_id
            ORDER BY transaction_date DESC, id DESC
            LIMIT 1
        """)
        
        balance_result = db.execute(balance_query, {
            "employee_id": employee_id,
            "leave_type_id": leave_type_id,
            "company_id": company_id
        }).fetchone()
        
        current_balance = float(balance_result[0]) if balance_result else 0
        new_balance = current_balance + hours_accrued
        
        insert_query = text("""
            INSERT INTO leave_accrual_transactions (
                employee_id, leave_type_id, transaction_date,
                transaction_type, hours_accrued, hours_used,
                hours_balance, notes, company_id,
                created_by, created_at
            ) VALUES (
                :employee_id, :leave_type_id, CURRENT_DATE,
                'ACCRUAL', :hours_accrued, 0,
                :new_balance, :notes, :company_id,
                :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "employee_id": employee_id,
            "leave_type_id": leave_type_id,
            "hours_accrued": hours_accrued,
            "new_balance": new_balance,
            "notes": notes,
            "company_id": company_id,
            "created_by": user_email
        })
        
        transaction_id = result.fetchone()[0]
        
        db.commit()
        
        return {
            "message": "Leave accrued successfully",
            "transaction_id": transaction_id,
            "new_balance": new_balance
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
