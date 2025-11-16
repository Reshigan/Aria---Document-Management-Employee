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


@router.get("/payment-allocation/{allocation_id}")
async def get_payment_allocation_detail(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a specific payment allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                pa.id,
                pa.payment_id,
                cp.payment_number,
                cp.payment_date,
                cp.payment_amount as total_payment_amount,
                cp.customer_id,
                c.name as customer_name,
                pa.invoice_id,
                i.invoice_number,
                i.invoice_date,
                i.total_amount as invoice_total,
                i.amount_paid as invoice_paid,
                pa.allocated_amount,
                pa.discount_taken,
                pa.allocation_date,
                pa.allocated_by,
                pa.notes,
                i.due_date,
                CASE 
                    WHEN i.due_date < CURRENT_DATE THEN true
                    ELSE false
                END as was_overdue
            FROM payment_allocations pa
            JOIN customer_payments cp ON pa.payment_id = cp.id
            JOIN customers c ON cp.customer_id = c.id
            JOIN invoices i ON pa.invoice_id = i.id
            WHERE pa.id = :allocation_id AND cp.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Payment allocation not found")
        
        invoice_age_days = None
        if result[7] and result[9]:  # invoice_id and invoice_date
            age_query = text("""
                SELECT EXTRACT(DAY FROM (:payment_date - :invoice_date))
            """)
            age_result = db.execute(age_query, {
                "payment_date": result[3],
                "invoice_date": result[9]
            }).fetchone()
            invoice_age_days = int(age_result[0]) if age_result else 0
        
        gl_query = text("""
            SELECT 
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.source_document_type = 'PAYMENT_ALLOCATION'
                AND je.source_document_id = :allocation_id
                AND je.company_id = :company_id
            ORDER BY jel.line_number
        """)
        
        gl_result = db.execute(gl_query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        gl_impact = []
        for row in gl_result.fetchall():
            gl_impact.append({
                "account_id": row[0],
                "account_code": row[1],
                "account_name": row[2],
                "debit_amount": float(row[3]) if row[3] else 0,
                "credit_amount": float(row[4]) if row[4] else 0
            })
        
        return {
            "allocation": {
                "id": result[0],
                "payment_id": result[1],
                "payment_number": result[2],
                "payment_date": str(result[3]) if result[3] else None,
                "total_payment_amount": float(result[4]) if result[4] else 0,
                "customer_id": result[5],
                "customer_name": result[6],
                "invoice_id": result[7],
                "invoice_number": result[8],
                "invoice_date": str(result[9]) if result[9] else None,
                "invoice_total": float(result[10]) if result[10] else 0,
                "invoice_paid": float(result[11]) if result[11] else 0,
                "allocated_amount": float(result[12]) if result[12] else 0,
                "discount_taken": float(result[13]) if result[13] else 0,
                "allocation_date": str(result[14]) if result[14] else None,
                "allocated_by": result[15],
                "notes": result[16],
                "invoice_due_date": str(result[17]) if result[17] else None,
                "was_overdue": result[18]
            },
            "aging_info": {
                "invoice_age_days": invoice_age_days,
                "days_overdue": max(0, invoice_age_days - 30) if invoice_age_days else 0
            },
            "gl_impact": gl_impact
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/payment-allocation/{allocation_id}")
async def update_payment_allocation(
    allocation_id: int,
    allocated_amount: Optional[float] = None,
    discount_taken: Optional[float] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a payment allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE payment_allocations pa
            SET 
                allocated_amount = COALESCE(:allocated_amount, allocated_amount),
                discount_taken = COALESCE(:discount_taken, discount_taken),
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            FROM customer_payments cp
            WHERE pa.payment_id = cp.id
                AND pa.id = :allocation_id
                AND cp.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "allocated_amount": allocated_amount,
            "discount_taken": discount_taken,
            "notes": notes,
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        if allocated_amount is not None:
            update_invoice_query = text("""
                UPDATE invoices i
                SET amount_paid = (
                    SELECT COALESCE(SUM(pa.allocated_amount), 0)
                    FROM payment_allocations pa
                    WHERE pa.invoice_id = i.id
                )
                WHERE i.id = (
                    SELECT pa.invoice_id
                    FROM payment_allocations pa
                    JOIN customer_payments cp ON pa.payment_id = cp.id
                    WHERE pa.id = :allocation_id AND cp.company_id = :company_id
                )
            """)
            
            db.execute(update_invoice_query, {
                "allocation_id": allocation_id,
                "company_id": company_id
            })
        
        db.commit()
        
        return {"message": "Payment allocation updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/payment-allocation/{allocation_id}")
async def delete_payment_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a payment allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_invoice_query = text("""
            SELECT pa.invoice_id
            FROM payment_allocations pa
            JOIN customer_payments cp ON pa.payment_id = cp.id
            WHERE pa.id = :allocation_id AND cp.company_id = :company_id
        """)
        
        invoice_result = db.execute(get_invoice_query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        }).fetchone()
        
        if not invoice_result:
            raise HTTPException(status_code=404, detail="Payment allocation not found")
        
        invoice_id = invoice_result[0]
        
        delete_query = text("""
            DELETE FROM payment_allocations pa
            USING customer_payments cp
            WHERE pa.payment_id = cp.id
                AND pa.id = :allocation_id
                AND cp.company_id = :company_id
        """)
        
        db.execute(delete_query, {"allocation_id": allocation_id, "company_id": company_id})
        
        update_invoice_query = text("""
            UPDATE invoices
            SET amount_paid = (
                SELECT COALESCE(SUM(pa.allocated_amount), 0)
                FROM payment_allocations pa
                WHERE pa.invoice_id = :invoice_id
            )
            WHERE id = :invoice_id
        """)
        
        db.execute(update_invoice_query, {"invoice_id": invoice_id})
        
        db.commit()
        
        return {"message": "Payment allocation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-allocation/{allocation_id}/audit-trail")
async def get_allocation_audit_trail(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get audit trail for a payment allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                at.id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at,
                at.ip_address
            FROM audit_trail at
            WHERE at.entity_type = 'PAYMENT_ALLOCATION'
                AND at.entity_id = :allocation_id
                AND at.company_id = :company_id
            ORDER BY at.changed_at DESC
        """)
        
        result = db.execute(query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        audit_trail = []
        for row in result.fetchall():
            audit_trail.append({
                "id": row[0],
                "action": row[1],
                "field_name": row[2],
                "old_value": row[3],
                "new_value": row[4],
                "changed_by": row[5],
                "changed_at": str(row[6]) if row[6] else None,
                "ip_address": row[7]
            })
        
        return {"audit_trail": audit_trail}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
