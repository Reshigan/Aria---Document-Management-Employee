from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/credit-memo-allocation/{allocation_id}/detail")
async def get_credit_memo_allocation_detail(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a credit memo allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                cma.id,
                cma.credit_memo_id,
                cm.memo_number,
                cm.memo_date,
                cm.total_amount as memo_total,
                cma.invoice_id,
                i.invoice_number,
                i.invoice_date,
                i.total_amount as invoice_total,
                cma.allocated_amount,
                cma.allocation_date,
                cma.allocated_by,
                cma.notes,
                cm.customer_id,
                c.name as customer_name,
                cm.reason
            FROM credit_memo_allocations cma
            JOIN credit_memos cm ON cma.credit_memo_id = cm.id
            JOIN invoices i ON cma.invoice_id = i.id
            JOIN customers c ON cm.customer_id = c.id
            WHERE cma.id = :allocation_id AND cm.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Credit memo allocation not found")
        
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
            WHERE je.source_document_type = 'CREDIT_MEMO_ALLOCATION'
                AND je.source_document_id = :allocation_id
                AND je.company_id = :company_id
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
                "credit_memo_id": result[1],
                "memo_number": result[2],
                "memo_date": str(result[3]) if result[3] else None,
                "memo_total": float(result[4]) if result[4] else 0,
                "invoice_id": result[5],
                "invoice_number": result[6],
                "invoice_date": str(result[7]) if result[7] else None,
                "invoice_total": float(result[8]) if result[8] else 0,
                "allocated_amount": float(result[9]) if result[9] else 0,
                "allocation_date": str(result[10]) if result[10] else None,
                "allocated_by": result[11],
                "notes": result[12],
                "customer_id": result[13],
                "customer_name": result[14],
                "reason": result[15]
            },
            "gl_impact": gl_impact
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/credit-memo-allocation/{allocation_id}")
async def update_credit_memo_allocation(
    allocation_id: int,
    allocated_amount: float,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a credit memo allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE credit_memo_allocations cma
            SET 
                allocated_amount = :allocated_amount,
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            FROM credit_memos cm
            WHERE cma.credit_memo_id = cm.id
                AND cma.id = :allocation_id
                AND cm.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "allocated_amount": allocated_amount,
            "notes": notes,
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Credit memo allocation updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/credit-memo-allocation/{allocation_id}")
async def delete_credit_memo_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a credit memo allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM credit_memo_allocations cma
            USING credit_memos cm
            WHERE cma.credit_memo_id = cm.id
                AND cma.id = :allocation_id
                AND cm.company_id = :company_id
        """)
        
        db.execute(delete_query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Credit memo allocation deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
