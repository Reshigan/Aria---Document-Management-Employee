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


@router.get("/approval-decision/{decision_id}/atomic-detail")
async def get_approval_decision_atomic_detail(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single approval decision"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ah.id,
                ah.entity_type,
                ah.entity_id,
                ah.step_number,
                ah.approver_email,
                ah.action,
                ah.approval_date,
                ah.comments,
                ah.delegated_from,
                ah.delegation_reason,
                ah.time_taken_minutes,
                ah.ip_address
            FROM approval_history ah
            WHERE ah.id = :decision_id AND ah.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "decision_id": decision_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Approval decision not found")
        
        attachments_query = text("""
            SELECT 
                a.id,
                a.file_name,
                a.file_size,
                a.file_type,
                a.uploaded_at
            FROM attachments a
            WHERE a.entity_type = 'APPROVAL_DECISION'
                AND a.entity_id = :decision_id
                AND a.company_id = :company_id
        """)
        
        attachments_result = db.execute(attachments_query, {
            "decision_id": decision_id,
            "company_id": company_id
        })
        
        attachments = []
        for row in attachments_result.fetchall():
            attachments.append({
                "id": row[0],
                "file_name": row[1],
                "file_size": row[2],
                "file_type": row[3],
                "uploaded_at": str(row[4]) if row[4] else None
            })
        
        workflow_query = text("""
            SELECT 
                aw.id,
                aw.workflow_name,
                aw.status,
                aw.current_step,
                aw.total_steps
            FROM approval_workflows aw
            WHERE aw.entity_type = :entity_type
                AND aw.entity_id = :entity_id
                AND aw.company_id = :company_id
        """)
        
        workflow_result = db.execute(workflow_query, {
            "entity_type": result[1],
            "entity_id": result[2],
            "company_id": company_id
        }).fetchone()
        
        workflow_context = None
        if workflow_result:
            workflow_context = {
                "id": workflow_result[0],
                "workflow_name": workflow_result[1],
                "status": workflow_result[2],
                "current_step": workflow_result[3],
                "total_steps": workflow_result[4]
            }
        
        approver_history_query = text("""
            SELECT 
                ah.id,
                ah.entity_type,
                ah.action,
                ah.approval_date,
                COUNT(*) OVER() as total_decisions
            FROM approval_history ah
            WHERE ah.approver_email = :approver_email
                AND ah.id != :decision_id
                AND ah.company_id = :company_id
            ORDER BY ah.approval_date DESC
            LIMIT 5
        """)
        
        approver_history_result = db.execute(approver_history_query, {
            "approver_email": result[4],
            "decision_id": decision_id,
            "company_id": company_id
        })
        
        approver_history = []
        total_decisions = 0
        
        for row in approver_history_result.fetchall():
            total_decisions = row[4] if row[4] else 0
            approver_history.append({
                "id": row[0],
                "entity_type": row[1],
                "action": row[2],
                "approval_date": str(row[3]) if row[3] else None
            })
        
        return {
            "approval_decision": {
                "id": result[0],
                "entity_type": result[1],
                "entity_id": result[2],
                "step_number": result[3],
                "approver_email": result[4],
                "action": result[5],
                "approval_date": str(result[6]) if result[6] else None,
                "comments": result[7],
                "delegated_from": result[8],
                "delegation_reason": result[9],
                "time_taken_minutes": result[10],
                "ip_address": result[11]
            },
            "attachments": attachments,
            "workflow_context": workflow_context,
            "approver_statistics": {
                "total_decisions": total_decisions,
                "recent_decisions": approver_history
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
