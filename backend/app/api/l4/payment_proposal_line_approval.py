from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class LineApproval(BaseModel):
    action: str  # APPROVE, REJECT
    comments: str = None


@router.get("/payment-proposal-line/{line_id}/approval-detail")
async def get_payment_proposal_line_approval_detail(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed approval information for a payment proposal line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ppl.id,
                ppl.payment_proposal_id,
                pp.proposal_number,
                pp.proposal_date,
                pp.payment_date,
                ppl.supplier_id,
                s.name as supplier_name,
                ppl.ap_invoice_id,
                ai.invoice_number,
                ai.invoice_date,
                ai.total_amount as invoice_amount,
                ppl.payment_amount,
                ppl.discount_amount,
                ppl.net_payment_amount,
                ppl.approval_status,
                ppl.approved_by,
                ppl.approved_at,
                ppl.rejection_reason,
                pp.bank_account_id,
                ba.account_name,
                ba.account_number
            FROM payment_proposal_lines ppl
            JOIN payment_proposals pp ON ppl.payment_proposal_id = pp.id
            JOIN suppliers s ON ppl.supplier_id = s.id
            JOIN ap_invoices ai ON ppl.ap_invoice_id = ai.id
            LEFT JOIN bank_accounts ba ON pp.bank_account_id = ba.id
            WHERE ppl.id = :line_id AND pp.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Payment proposal line not found")
        
        workflow_query = text("""
            SELECT 
                aw.id,
                aw.workflow_name,
                aw.status,
                aw.current_step,
                aw.total_steps
            FROM approval_workflows aw
            WHERE aw.entity_type = 'PAYMENT_PROPOSAL_LINE'
                AND aw.entity_id = :line_id
                AND aw.company_id = :company_id
        """)
        
        workflow_result = db.execute(workflow_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        approval_workflow = None
        if workflow_result:
            approval_workflow = {
                "id": workflow_result[0],
                "workflow_name": workflow_result[1],
                "status": workflow_result[2],
                "current_step": workflow_result[3],
                "total_steps": workflow_result[4]
            }
        
        history_query = text("""
            SELECT 
                ah.id,
                ah.step_number,
                ah.approver_email,
                ah.action,
                ah.approval_date,
                ah.comments
            FROM approval_history ah
            WHERE ah.entity_type = 'PAYMENT_PROPOSAL_LINE'
                AND ah.entity_id = :line_id
                AND ah.company_id = :company_id
            ORDER BY ah.step_number, ah.approval_date
        """)
        
        history_result = db.execute(history_query, {
            "line_id": line_id,
            "company_id": company_id
        })
        
        approval_history = []
        for row in history_result.fetchall():
            approval_history.append({
                "id": row[0],
                "step_number": row[1],
                "approver_email": row[2],
                "action": row[3],
                "approval_date": str(row[4]) if row[4] else None,
                "comments": row[5]
            })
        
        return {
            "payment_proposal_line": {
                "id": result[0],
                "payment_proposal_id": result[1],
                "proposal_number": result[2],
                "proposal_date": str(result[3]) if result[3] else None,
                "payment_date": str(result[4]) if result[4] else None,
                "supplier_id": result[5],
                "supplier_name": result[6],
                "ap_invoice_id": result[7],
                "invoice_number": result[8],
                "invoice_date": str(result[9]) if result[9] else None,
                "invoice_amount": float(result[10]) if result[10] else 0,
                "payment_amount": float(result[11]) if result[11] else 0,
                "discount_amount": float(result[12]) if result[12] else 0,
                "net_payment_amount": float(result[13]) if result[13] else 0,
                "approval_status": result[14],
                "approved_by": result[15],
                "approved_at": str(result[16]) if result[16] else None,
                "rejection_reason": result[17],
                "bank_account_id": result[18],
                "account_name": result[19],
                "account_number": result[20]
            },
            "approval_workflow": approval_workflow,
            "approval_history": approval_history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment-proposal-line/{line_id}/approve")
async def approve_payment_proposal_line(
    line_id: int,
    approval: LineApproval,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject a payment proposal line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        if approval.action == "APPROVE":
            update_query = text("""
                UPDATE payment_proposal_lines ppl
                SET 
                    approval_status = 'APPROVED',
                    approved_by = :approved_by,
                    approved_at = NOW(),
                    updated_at = NOW()
                FROM payment_proposals pp
                WHERE ppl.payment_proposal_id = pp.id
                    AND ppl.id = :line_id
                    AND pp.company_id = :company_id
            """)
            
            db.execute(update_query, {
                "approved_by": user_email,
                "line_id": line_id,
                "company_id": company_id
            })
        else:
            update_query = text("""
                UPDATE payment_proposal_lines ppl
                SET 
                    approval_status = 'REJECTED',
                    rejection_reason = :rejection_reason,
                    updated_at = NOW()
                FROM payment_proposals pp
                WHERE ppl.payment_proposal_id = pp.id
                    AND ppl.id = :line_id
                    AND pp.company_id = :company_id
            """)
            
            db.execute(update_query, {
                "rejection_reason": approval.comments,
                "line_id": line_id,
                "company_id": company_id
            })
        
        history_query = text("""
            INSERT INTO approval_history (
                entity_type, entity_id, action,
                approver_email, approval_date, comments,
                company_id, created_at
            ) VALUES (
                'PAYMENT_PROPOSAL_LINE', :line_id, :action,
                :approver_email, NOW(), :comments,
                :company_id, NOW()
            )
        """)
        
        db.execute(history_query, {
            "line_id": line_id,
            "action": approval.action,
            "approver_email": user_email,
            "comments": approval.comments,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": f"Payment proposal line {approval.action.lower()}d successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
