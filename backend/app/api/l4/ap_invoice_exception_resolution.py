from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

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


class ExceptionResolution(BaseModel):
    resolution_action: str
    resolution_notes: str


@router.get("/ap-invoice-exception/{exception_id}/detail")
async def get_ap_invoice_exception_detail(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for an AP invoice exception"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                aie.id,
                aie.exception_number,
                aie.exception_type,
                aie.exception_date,
                aie.ap_invoice_id,
                ai.invoice_number,
                ai.invoice_date,
                ai.supplier_id,
                s.name as supplier_name,
                ai.total_amount,
                aie.exception_description,
                aie.severity,
                aie.status,
                aie.assigned_to,
                aie.resolution_action,
                aie.resolution_notes,
                aie.resolved_by,
                aie.resolved_at,
                aie.created_by,
                aie.created_at
            FROM ap_invoice_exceptions aie
            JOIN ap_invoices ai ON aie.ap_invoice_id = ai.id
            JOIN suppliers s ON ai.supplier_id = s.id
            WHERE aie.id = :exception_id AND aie.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "exception_id": exception_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="AP invoice exception not found")
        
        related_docs_query = text("""
            SELECT 
                po.id as po_id,
                po.po_number,
                gr.id as gr_id,
                gr.receipt_number
            FROM ap_invoices ai
            LEFT JOIN purchase_orders po ON ai.purchase_order_id = po.id
            LEFT JOIN goods_receipts gr ON ai.goods_receipt_id = gr.id
            WHERE ai.id = :ap_invoice_id AND ai.company_id = :company_id
        """)
        
        related_result = db.execute(related_docs_query, {
            "ap_invoice_id": result[4],
            "company_id": company_id
        }).fetchone()
        
        related_documents = None
        if related_result:
            related_documents = {
                "po_id": related_result[0],
                "po_number": related_result[1],
                "gr_id": related_result[2],
                "receipt_number": related_result[3]
            }
        
        history_query = text("""
            SELECT 
                ah.id,
                ah.action,
                ah.approver_email,
                ah.approval_date,
                ah.comments
            FROM approval_history ah
            WHERE ah.entity_type = 'AP_INVOICE_EXCEPTION'
                AND ah.entity_id = :exception_id
                AND ah.company_id = :company_id
            ORDER BY ah.approval_date DESC
        """)
        
        history_result = db.execute(history_query, {
            "exception_id": exception_id,
            "company_id": company_id
        })
        
        exception_history = []
        for row in history_result.fetchall():
            exception_history.append({
                "id": row[0],
                "action": row[1],
                "approver_email": row[2],
                "approval_date": str(row[3]) if row[3] else None,
                "comments": row[4]
            })
        
        return {
            "exception": {
                "id": result[0],
                "exception_number": result[1],
                "exception_type": result[2],
                "exception_date": str(result[3]) if result[3] else None,
                "ap_invoice_id": result[4],
                "invoice_number": result[5],
                "invoice_date": str(result[6]) if result[6] else None,
                "supplier_id": result[7],
                "supplier_name": result[8],
                "total_amount": float(result[9]) if result[9] else 0,
                "exception_description": result[10],
                "severity": result[11],
                "status": result[12],
                "assigned_to": result[13],
                "resolution_action": result[14],
                "resolution_notes": result[15],
                "resolved_by": result[16],
                "resolved_at": str(result[17]) if result[17] else None,
                "created_by": result[18],
                "created_at": str(result[19]) if result[19] else None
            },
            "related_documents": related_documents,
            "exception_history": exception_history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ap-invoice-exception/{exception_id}/resolve")
async def resolve_ap_invoice_exception(
    exception_id: int,
    resolution: ExceptionResolution,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Resolve an AP invoice exception"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE ap_invoice_exceptions
            SET 
                status = 'RESOLVED',
                resolution_action = :resolution_action,
                resolution_notes = :resolution_notes,
                resolved_by = :resolved_by,
                resolved_at = NOW(),
                updated_at = NOW()
            WHERE id = :exception_id
                AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "resolution_action": resolution.resolution_action,
            "resolution_notes": resolution.resolution_notes,
            "resolved_by": user_email,
            "exception_id": exception_id,
            "company_id": company_id
        })
        
        history_query = text("""
            INSERT INTO approval_history (
                entity_type, entity_id, action,
                approver_email, approval_date, comments,
                company_id, created_at
            ) VALUES (
                'AP_INVOICE_EXCEPTION', :exception_id, 'RESOLVED',
                :approver_email, NOW(), :comments,
                :company_id, NOW()
            )
        """)
        
        db.execute(history_query, {
            "exception_id": exception_id,
            "approver_email": user_email,
            "comments": f"{resolution.resolution_action}: {resolution.resolution_notes}",
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "AP invoice exception resolved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
