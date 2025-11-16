from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from app.auth import get_db, get_current_user
except ImportError:
    try:
        from auth_integrated import get_db, get_current_user
    except ImportError:
        from app.database import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class ApprovalAction(BaseModel):
    document_type: str
    document_id: int
    action: str  # APPROVE, REJECT, REQUEST_CHANGES
    comments: Optional[str] = None


@router.get("/document/{document_type}/{document_id}/approval-history")
async def get_approval_history(
    document_type: str,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get approval history for a document"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ah.id,
                ah.action,
                ah.approver_email,
                ah.approver_name,
                ah.comments,
                ah.action_date,
                ah.level,
                ah.status
            FROM approval_history ah
            WHERE ah.document_type = :document_type 
                AND ah.document_id = :document_id 
                AND ah.company_id = :company_id
            ORDER BY ah.action_date DESC
        """)
        
        result = db.execute(query, {
            "document_type": document_type,
            "document_id": document_id,
            "company_id": company_id
        })
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "action": row[1],
                "approver_email": row[2],
                "approver_name": row[3],
                "comments": row[4],
                "action_date": str(row[5]) if row[5] else None,
                "level": row[6],
                "status": row[7]
            })
        
        return {"history": history, "total_count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document/approve")
async def approve_document(
    approval: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record an approval action for a document"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        user_name = current_user.get("name", user_email)
        
        insert_query = text("""
            INSERT INTO approval_history (
                document_type, document_id, action, approver_email,
                approver_name, comments, action_date, company_id
            ) VALUES (
                :document_type, :document_id, :action, :approver_email,
                :approver_name, :comments, NOW(), :company_id
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "document_type": approval.document_type,
            "document_id": approval.document_id,
            "action": approval.action,
            "approver_email": user_email,
            "approver_name": user_name,
            "comments": approval.comments,
            "company_id": company_id
        })
        
        if approval.action == "APPROVE":
            status_update = "APPROVED"
        elif approval.action == "REJECT":
            status_update = "REJECTED"
        else:
            status_update = "PENDING_CHANGES"
        
        table_map = {
            "SALES_ORDER": "sales_orders",
            "PURCHASE_ORDER": "purchase_orders",
            "CUSTOMER_INVOICE": "customer_invoices",
            "AP_INVOICE": "ap_invoices",
            "QUOTE": "quotes",
            "JOURNAL_ENTRY": "journal_entries"
        }
        
        if approval.document_type in table_map:
            table_name = table_map[approval.document_type]
            update_query = text(f"""
                UPDATE {table_name}
                SET status = :status, updated_at = NOW()
                WHERE id = :document_id AND company_id = :company_id
            """)
            
            db.execute(update_query, {
                "status": status_update,
                "document_id": approval.document_id,
                "company_id": company_id
            })
        
        db.commit()
        approval_id = result.fetchone()[0]
        
        return {"id": approval_id, "message": f"Document {approval.action.lower()}d successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-approvals")
async def get_pending_approvals(
    document_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all documents pending approval"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        
        pending = []
        
        if not document_type or document_type == "SALES_ORDER":
            so_query = text("""
                SELECT 
                    'SALES_ORDER' as doc_type,
                    so.id,
                    so.order_number as doc_number,
                    so.order_date as doc_date,
                    so.total_amount,
                    c.name as party_name,
                    so.created_by,
                    so.created_at
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                WHERE so.status = 'PENDING_APPROVAL' AND so.company_id = :company_id
                ORDER BY so.created_at DESC
                LIMIT 50
            """)
            
            result = db.execute(so_query, {"company_id": company_id})
            for row in result.fetchall():
                pending.append({
                    "document_type": row[0],
                    "document_id": row[1],
                    "document_number": row[2],
                    "document_date": str(row[3]) if row[3] else None,
                    "amount": float(row[4]) if row[4] else 0,
                    "party_name": row[5],
                    "created_by": row[6],
                    "created_at": str(row[7]) if row[7] else None
                })
        
        if not document_type or document_type == "PURCHASE_ORDER":
            po_query = text("""
                SELECT 
                    'PURCHASE_ORDER' as doc_type,
                    po.id,
                    po.po_number as doc_number,
                    po.order_date as doc_date,
                    po.total_amount,
                    s.name as party_name,
                    po.created_by,
                    po.created_at
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.status = 'PENDING_APPROVAL' AND po.company_id = :company_id
                ORDER BY po.created_at DESC
                LIMIT 50
            """)
            
            result = db.execute(po_query, {"company_id": company_id})
            for row in result.fetchall():
                pending.append({
                    "document_type": row[0],
                    "document_id": row[1],
                    "document_number": row[2],
                    "document_date": str(row[3]) if row[3] else None,
                    "amount": float(row[4]) if row[4] else 0,
                    "party_name": row[5],
                    "created_by": row[6],
                    "created_at": str(row[7]) if row[7] else None
                })
        
        if not document_type or document_type == "CUSTOMER_INVOICE":
            inv_query = text("""
                SELECT 
                    'CUSTOMER_INVOICE' as doc_type,
                    ci.id,
                    ci.invoice_number as doc_number,
                    ci.invoice_date as doc_date,
                    ci.total_amount,
                    c.name as party_name,
                    ci.created_by,
                    ci.created_at
                FROM customer_invoices ci
                JOIN customers c ON ci.customer_id = c.id
                WHERE ci.status = 'PENDING_APPROVAL' AND ci.company_id = :company_id
                ORDER BY ci.created_at DESC
                LIMIT 50
            """)
            
            result = db.execute(inv_query, {"company_id": company_id})
            for row in result.fetchall():
                pending.append({
                    "document_type": row[0],
                    "document_id": row[1],
                    "document_number": row[2],
                    "document_date": str(row[3]) if row[3] else None,
                    "amount": float(row[4]) if row[4] else 0,
                    "party_name": row[5],
                    "created_by": row[6],
                    "created_at": str(row[7]) if row[7] else None
                })
        
        return {"pending_approvals": pending, "total_count": len(pending)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_email}/approval-activity")
async def get_user_approval_activity(
    user_email: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get approval activity for a specific user"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ah.document_type,
                ah.document_id,
                ah.action,
                ah.action_date,
                ah.comments,
                COUNT(*) OVER (PARTITION BY ah.action) as action_count
            FROM approval_history ah
            WHERE ah.approver_email = :user_email 
                AND ah.company_id = :company_id
            ORDER BY ah.action_date DESC
            LIMIT 100
        """)
        
        result = db.execute(query, {"user_email": user_email, "company_id": company_id})
        rows = result.fetchall()
        
        activity = []
        for row in rows:
            activity.append({
                "document_type": row[0],
                "document_id": row[1],
                "action": row[2],
                "action_date": str(row[3]) if row[3] else None,
                "comments": row[4]
            })
        
        stats_query = text("""
            SELECT 
                action,
                COUNT(*) as count
            FROM approval_history
            WHERE approver_email = :user_email AND company_id = :company_id
            GROUP BY action
        """)
        
        stats_result = db.execute(stats_query, {"user_email": user_email, "company_id": company_id})
        
        stats = {}
        for row in stats_result.fetchall():
            stats[row[0]] = row[1]
        
        return {
            "activity": activity,
            "statistics": stats,
            "total_count": len(activity)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
