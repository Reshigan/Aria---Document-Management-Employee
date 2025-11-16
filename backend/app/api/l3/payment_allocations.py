from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class PaymentAllocationCreate(BaseModel):
    payment_id: int
    invoice_id: int
    amount_allocated: float
    notes: Optional[str] = None


@router.get("/payment/{payment_id}/allocations")
async def get_payment_allocations(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all allocations for a payment"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                pa.id,
                pa.invoice_id,
                ci.invoice_number,
                ci.customer_id,
                c.name as customer_name,
                ci.total_amount as invoice_amount,
                ci.amount_paid as invoice_paid,
                pa.amount_allocated,
                pa.allocated_at,
                pa.notes
            FROM payment_allocations pa
            JOIN customer_payments cp ON pa.payment_id = cp.id
            JOIN customer_invoices ci ON pa.invoice_id = ci.id
            JOIN customers c ON ci.customer_id = c.id
            WHERE pa.payment_id = :payment_id AND cp.company_id = :company_id
            ORDER BY pa.allocated_at DESC
        """)
        
        result = db.execute(query, {"payment_id": payment_id, "company_id": company_id})
        rows = result.fetchall()
        
        allocations = []
        for row in rows:
            allocations.append({
                "id": row[0],
                "invoice_id": row[1],
                "invoice_number": row[2],
                "customer_id": row[3],
                "customer_name": row[4],
                "invoice_amount": float(row[5]) if row[5] else 0,
                "invoice_paid": float(row[6]) if row[6] else 0,
                "amount_allocated": float(row[7]) if row[7] else 0,
                "allocated_at": str(row[8]) if row[8] else None,
                "notes": row[9]
            })
        
        return {"allocations": allocations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoice/{invoice_id}/unallocated")
async def get_unallocated_amount(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get unallocated amount for an invoice"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ci.total_amount,
                COALESCE(SUM(pa.amount_allocated), 0) as allocated,
                ci.total_amount - COALESCE(SUM(pa.amount_allocated), 0) as unallocated
            FROM customer_invoices ci
            LEFT JOIN payment_allocations pa ON ci.id = pa.invoice_id
            WHERE ci.id = :invoice_id AND ci.company_id = :company_id
            GROUP BY ci.id, ci.total_amount
        """)
        
        result = db.execute(query, {"invoice_id": invoice_id, "company_id": company_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return {
            "total_amount": float(result[0]) if result[0] else 0,
            "allocated": float(result[1]) if result[1] else 0,
            "unallocated": float(result[2]) if result[2] else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment/{payment_id}/allocate")
async def create_payment_allocation(
    payment_id: int,
    allocation: PaymentAllocationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Allocate payment to an invoice"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        payment_query = text("""
            SELECT 
                cp.amount,
                COALESCE(SUM(pa.amount_allocated), 0) as allocated,
                cp.amount - COALESCE(SUM(pa.amount_allocated), 0) as unallocated
            FROM customer_payments cp
            LEFT JOIN payment_allocations pa ON cp.id = pa.payment_id
            WHERE cp.id = :payment_id AND cp.company_id = :company_id
            GROUP BY cp.id, cp.amount
        """)
        
        payment_result = db.execute(payment_query, {
            "payment_id": payment_id,
            "company_id": company_id
        }).fetchone()
        
        if not payment_result:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        unallocated = float(payment_result[2]) if payment_result[2] else 0
        
        if unallocated < allocation.amount_allocated:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient unallocated amount. Available: {unallocated}, Requested: {allocation.amount_allocated}"
            )
        
        insert_query = text("""
            INSERT INTO payment_allocations (
                payment_id, invoice_id, amount_allocated, notes,
                company_id, allocated_by, allocated_at
            ) VALUES (
                :payment_id, :invoice_id, :amount_allocated, :notes,
                :company_id, :allocated_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "payment_id": payment_id,
            "invoice_id": allocation.invoice_id,
            "amount_allocated": allocation.amount_allocated,
            "notes": allocation.notes,
            "company_id": company_id,
            "allocated_by": user_email
        })
        
        update_invoice_query = text("""
            UPDATE customer_invoices
            SET amount_paid = amount_paid + :amount_allocated
            WHERE id = :invoice_id AND company_id = :company_id
        """)
        
        db.execute(update_invoice_query, {
            "amount_allocated": allocation.amount_allocated,
            "invoice_id": allocation.invoice_id,
            "company_id": company_id
        })
        
        db.commit()
        allocation_id = result.fetchone()[0]
        
        return {"id": allocation_id, "message": "Payment allocated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/allocation/{allocation_id}")
async def delete_payment_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a payment allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT pa.invoice_id, pa.amount_allocated
            FROM payment_allocations pa
            JOIN customer_payments cp ON pa.payment_id = cp.id
            WHERE pa.id = :allocation_id AND cp.company_id = :company_id
        """)
        
        allocation_result = db.execute(get_query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        }).fetchone()
        
        if not allocation_result:
            raise HTTPException(status_code=404, detail="Allocation not found")
        
        invoice_id, amount_allocated = allocation_result
        
        delete_query = text("""
            DELETE FROM payment_allocations
            WHERE id = :allocation_id
        """)
        
        db.execute(delete_query, {"allocation_id": allocation_id})
        
        update_invoice_query = text("""
            UPDATE customer_invoices
            SET amount_paid = amount_paid - :amount_allocated
            WHERE id = :invoice_id AND company_id = :company_id
        """)
        
        db.execute(update_invoice_query, {
            "amount_allocated": amount_allocated,
            "invoice_id": invoice_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Allocation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
