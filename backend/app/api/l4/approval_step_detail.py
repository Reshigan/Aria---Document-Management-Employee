from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class ApprovalDecision(BaseModel):
    decision: str  # APPROVED, REJECTED, DELEGATED
    comments: str
    delegate_to: Optional[str] = None


@router.get("/approval-step/{step_id}/detail")
async def get_approval_step_detail(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a specific approval step"""
    try:
        company_id = current_user.get("company_id", "default")
        
        step_query = text("""
            SELECT 
                aw.id,
                aw.workflow_name,
                aw.entity_type,
                aw.entity_id,
                aw.current_step,
                aw.total_steps,
                aw.status as workflow_status,
                aw.initiated_by,
                aw.initiated_at,
                ah.id as history_id,
                ah.step_number,
                ah.approver_email,
                ah.action,
                ah.approval_date,
                ah.comments,
                ah.time_taken_hours,
                ah.delegated_from,
                ah.ip_address
            FROM approval_workflows aw
            LEFT JOIN approval_history ah ON aw.id = ah.workflow_id 
                AND ah.step_number = :step_id
            WHERE aw.id = (
                SELECT workflow_id FROM approval_history 
                WHERE id = :step_id AND company_id = :company_id
            )
            AND aw.company_id = :company_id
        """)
        
        step_result = db.execute(step_query, {
            "step_id": step_id,
            "company_id": company_id
        }).fetchone()
        
        if not step_result:
            raise HTTPException(status_code=404, detail="Approval step not found")
        
        config_query = text("""
            SELECT 
                asc.id,
                asc.step_number,
                asc.approver_role,
                asc.approver_email,
                asc.approval_type,
                asc.required_approvers,
                asc.timeout_hours,
                asc.escalation_email
            FROM approval_step_config asc
            WHERE asc.workflow_name = :workflow_name
                AND asc.step_number = :step_number
                AND asc.company_id = :company_id
        """)
        
        config_result = db.execute(config_query, {
            "workflow_name": step_result[1],
            "step_number": step_result[10],
            "company_id": company_id
        }).fetchone()
        
        entity_details = None
        entity_type = step_result[2]
        entity_id = step_result[3]
        
        if entity_type == "SALES_ORDER":
            entity_query = text("""
                SELECT 
                    so.order_number,
                    so.order_date,
                    so.customer_id,
                    c.name as customer_name,
                    so.total_amount,
                    so.status
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                WHERE so.id = :entity_id AND so.company_id = :company_id
            """)
            
            entity_result = db.execute(entity_query, {
                "entity_id": entity_id,
                "company_id": company_id
            }).fetchone()
            
            if entity_result:
                entity_details = {
                    "type": "SALES_ORDER",
                    "order_number": entity_result[0],
                    "order_date": str(entity_result[1]) if entity_result[1] else None,
                    "customer_id": entity_result[2],
                    "customer_name": entity_result[3],
                    "total_amount": float(entity_result[4]) if entity_result[4] else 0,
                    "status": entity_result[5]
                }
        
        elif entity_type == "PURCHASE_ORDER":
            entity_query = text("""
                SELECT 
                    po.po_number,
                    po.order_date,
                    po.supplier_id,
                    s.name as supplier_name,
                    po.total_amount,
                    po.status
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = :entity_id AND po.company_id = :company_id
            """)
            
            entity_result = db.execute(entity_query, {
                "entity_id": entity_id,
                "company_id": company_id
            }).fetchone()
            
            if entity_result:
                entity_details = {
                    "type": "PURCHASE_ORDER",
                    "po_number": entity_result[0],
                    "order_date": str(entity_result[1]) if entity_result[1] else None,
                    "supplier_id": entity_result[2],
                    "supplier_name": entity_result[3],
                    "total_amount": float(entity_result[4]) if entity_result[4] else 0,
                    "status": entity_result[5]
                }
        
        elif entity_type == "INVOICE":
            entity_query = text("""
                SELECT 
                    i.invoice_number,
                    i.invoice_date,
                    i.customer_id,
                    c.name as customer_name,
                    i.total_amount,
                    i.status
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.id = :entity_id AND i.company_id = :company_id
            """)
            
            entity_result = db.execute(entity_query, {
                "entity_id": entity_id,
                "company_id": company_id
            }).fetchone()
            
            if entity_result:
                entity_details = {
                    "type": "INVOICE",
                    "invoice_number": entity_result[0],
                    "invoice_date": str(entity_result[1]) if entity_result[1] else None,
                    "customer_id": entity_result[2],
                    "customer_name": entity_result[3],
                    "total_amount": float(entity_result[4]) if entity_result[4] else 0,
                    "status": entity_result[5]
                }
        
        attachments_query = text("""
            SELECT 
                a.id,
                a.file_name,
                a.file_size,
                a.file_type,
                a.uploaded_by,
                a.uploaded_at
            FROM attachments a
            WHERE a.entity_type = 'APPROVAL_STEP'
                AND a.entity_id = :step_id
                AND a.company_id = :company_id
            ORDER BY a.uploaded_at DESC
        """)
        
        attachments_result = db.execute(attachments_query, {
            "step_id": step_id,
            "company_id": company_id
        })
        
        attachments = []
        for row in attachments_result.fetchall():
            attachments.append({
                "id": row[0],
                "file_name": row[1],
                "file_size": row[2],
                "file_type": row[3],
                "uploaded_by": row[4],
                "uploaded_at": str(row[5]) if row[5] else None
            })
        
        comments_query = text("""
            SELECT 
                c.id,
                c.comment_text,
                c.created_by,
                c.created_at
            FROM comments c
            WHERE c.entity_type = 'APPROVAL_STEP'
                AND c.entity_id = :step_id
                AND c.company_id = :company_id
            ORDER BY c.created_at DESC
        """)
        
        comments_result = db.execute(comments_query, {
            "step_id": step_id,
            "company_id": company_id
        })
        
        comments = []
        for row in comments_result.fetchall():
            comments.append({
                "id": row[0],
                "comment_text": row[1],
                "created_by": row[2],
                "created_at": str(row[3]) if row[3] else None
            })
        
        return {
            "approval_step": {
                "id": step_result[9],
                "workflow_id": step_result[0],
                "workflow_name": step_result[1],
                "entity_type": entity_type,
                "entity_id": entity_id,
                "step_number": step_result[10],
                "current_step": step_result[4],
                "total_steps": step_result[5],
                "workflow_status": step_result[6],
                "initiated_by": step_result[7],
                "initiated_at": str(step_result[8]) if step_result[8] else None,
                "approver_email": step_result[11],
                "action": step_result[12],
                "approval_date": str(step_result[13]) if step_result[13] else None,
                "comments": step_result[14],
                "time_taken_hours": float(step_result[15]) if step_result[15] else None,
                "delegated_from": step_result[16],
                "ip_address": step_result[17]
            },
            "step_configuration": {
                "id": config_result[0] if config_result else None,
                "step_number": config_result[1] if config_result else None,
                "approver_role": config_result[2] if config_result else None,
                "approver_email": config_result[3] if config_result else None,
                "approval_type": config_result[4] if config_result else None,
                "required_approvers": config_result[5] if config_result else None,
                "timeout_hours": config_result[6] if config_result else None,
                "escalation_email": config_result[7] if config_result else None
            } if config_result else None,
            "entity_details": entity_details,
            "attachments": attachments,
            "comments": comments
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approval-step/{step_id}/decide")
async def make_approval_decision(
    step_id: int,
    decision: ApprovalDecision,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Make an approval decision for a step"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        history_query = text("""
            SELECT 
                ah.workflow_id,
                ah.step_number,
                aw.total_steps,
                aw.entity_type,
                aw.entity_id
            FROM approval_history ah
            JOIN approval_workflows aw ON ah.workflow_id = aw.id
            WHERE ah.id = :step_id AND ah.company_id = :company_id
        """)
        
        history_result = db.execute(history_query, {
            "step_id": step_id,
            "company_id": company_id
        }).fetchone()
        
        if not history_result:
            raise HTTPException(status_code=404, detail="Approval step not found")
        
        workflow_id = history_result[0]
        step_number = history_result[1]
        total_steps = history_result[2]
        
        update_query = text("""
            UPDATE approval_history
            SET 
                action = :decision,
                approval_date = NOW(),
                comments = :comments,
                time_taken_hours = EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600,
                updated_at = NOW()
            WHERE id = :step_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "decision": decision.decision,
            "comments": decision.comments,
            "step_id": step_id,
            "company_id": company_id
        })
        
        if decision.decision == "APPROVED":
            if step_number >= total_steps:
                workflow_update = text("""
                    UPDATE approval_workflows
                    SET 
                        status = 'APPROVED',
                        completed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = :workflow_id AND company_id = :company_id
                """)
                
                db.execute(workflow_update, {
                    "workflow_id": workflow_id,
                    "company_id": company_id
                })
                
                entity_type = history_result[3]
                entity_id = history_result[4]
                
                if entity_type == "SALES_ORDER":
                    entity_update = text("""
                        UPDATE sales_orders
                        SET status = 'APPROVED', updated_at = NOW()
                        WHERE id = :entity_id AND company_id = :company_id
                    """)
                    db.execute(entity_update, {"entity_id": entity_id, "company_id": company_id})
                
                elif entity_type == "PURCHASE_ORDER":
                    entity_update = text("""
                        UPDATE purchase_orders
                        SET status = 'APPROVED', updated_at = NOW()
                        WHERE id = :entity_id AND company_id = :company_id
                    """)
                    db.execute(entity_update, {"entity_id": entity_id, "company_id": company_id})
            else:
                workflow_update = text("""
                    UPDATE approval_workflows
                    SET 
                        current_step = current_step + 1,
                        updated_at = NOW()
                    WHERE id = :workflow_id AND company_id = :company_id
                """)
                
                db.execute(workflow_update, {
                    "workflow_id": workflow_id,
                    "company_id": company_id
                })
        
        elif decision.decision == "REJECTED":
            workflow_update = text("""
                UPDATE approval_workflows
                SET 
                    status = 'REJECTED',
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = :workflow_id AND company_id = :company_id
            """)
            
            db.execute(workflow_update, {
                "workflow_id": workflow_id,
                "company_id": company_id
            })
            
            entity_type = history_result[3]
            entity_id = history_result[4]
            
            if entity_type == "SALES_ORDER":
                entity_update = text("""
                    UPDATE sales_orders
                    SET status = 'REJECTED', updated_at = NOW()
                    WHERE id = :entity_id AND company_id = :company_id
                """)
                db.execute(entity_update, {"entity_id": entity_id, "company_id": company_id})
            
            elif entity_type == "PURCHASE_ORDER":
                entity_update = text("""
                    UPDATE purchase_orders
                    SET status = 'REJECTED', updated_at = NOW()
                    WHERE id = :entity_id AND company_id = :company_id
                """)
                db.execute(entity_update, {"entity_id": entity_id, "company_id": company_id})
        
        elif decision.decision == "DELEGATED":
            if not decision.delegate_to:
                raise HTTPException(status_code=400, detail="delegate_to email required for delegation")
            
            delegate_query = text("""
                INSERT INTO approval_history (
                    workflow_id, step_number, approver_email,
                    action, delegated_from, comments,
                    company_id, created_at
                ) VALUES (
                    :workflow_id, :step_number, :delegate_to,
                    'PENDING', :delegated_from, :comments,
                    :company_id, NOW()
                )
            """)
            
            db.execute(delegate_query, {
                "workflow_id": workflow_id,
                "step_number": step_number,
                "delegate_to": decision.delegate_to,
                "delegated_from": user_email,
                "comments": decision.comments,
                "company_id": company_id
            })
        
        db.commit()
        
        return {
            "message": f"Approval decision recorded: {decision.decision}",
            "decision": decision.decision
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/approval-step/{step_id}/timeline")
async def get_approval_step_timeline(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get timeline of events for an approval step"""
    try:
        company_id = current_user.get("company_id", "default")
        
        workflow_query = text("""
            SELECT workflow_id FROM approval_history
            WHERE id = :step_id AND company_id = :company_id
        """)
        
        workflow_result = db.execute(workflow_query, {
            "step_id": step_id,
            "company_id": company_id
        }).fetchone()
        
        if not workflow_result:
            raise HTTPException(status_code=404, detail="Approval step not found")
        
        timeline_query = text("""
            SELECT 
                ah.id,
                ah.step_number,
                ah.approver_email,
                ah.action,
                ah.approval_date,
                ah.comments,
                ah.created_at
            FROM approval_history ah
            WHERE ah.workflow_id = :workflow_id
                AND ah.company_id = :company_id
            ORDER BY ah.step_number, ah.created_at
        """)
        
        timeline_result = db.execute(timeline_query, {
            "workflow_id": workflow_result[0],
            "company_id": company_id
        })
        
        timeline = []
        for row in timeline_result.fetchall():
            timeline.append({
                "id": row[0],
                "step_number": row[1],
                "approver_email": row[2],
                "action": row[3],
                "approval_date": str(row[4]) if row[4] else None,
                "comments": row[5],
                "created_at": str(row[6]) if row[6] else None,
                "is_current_step": row[0] == step_id
            })
        
        return {"timeline": timeline}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
