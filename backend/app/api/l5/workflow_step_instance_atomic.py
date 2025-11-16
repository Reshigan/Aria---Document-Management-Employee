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


@router.get("/workflow-step-instance/{instance_id}/atomic-detail")
async def get_workflow_step_instance_atomic_detail(
    instance_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single workflow step instance"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                wsi.id,
                wsi.workflow_instance_id,
                wi.workflow_name,
                wi.entity_type,
                wi.entity_id,
                wsi.step_number,
                wsi.step_name,
                wsi.step_type,
                wsi.assigned_to,
                wsi.status,
                wsi.started_at,
                wsi.completed_at,
                wsi.outcome,
                wsi.next_step_number,
                wsi.notes,
                wsi.created_at
            FROM workflow_step_instances wsi
            JOIN workflow_instances wi ON wsi.workflow_instance_id = wi.id
            WHERE wsi.id = :instance_id AND wsi.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "instance_id": instance_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Workflow step instance not found")
        
        duration_seconds = None
        if result[10] and result[11]:
            duration_query = text("""
                SELECT EXTRACT(EPOCH FROM (:completed_at - :started_at))
            """)
            
            duration_result = db.execute(duration_query, {
                "completed_at": result[11],
                "started_at": result[10]
            }).fetchone()
            
            duration_seconds = float(duration_result[0]) if duration_result else 0
        
        step_definition_query = text("""
            SELECT 
                wsd.id,
                wsd.step_name,
                wsd.step_type,
                wsd.expected_duration_minutes,
                wsd.required_role,
                wsd.auto_advance
            FROM workflow_step_definitions wsd
            WHERE wsd.workflow_name = :workflow_name
                AND wsd.step_number = :step_number
                AND wsd.company_id = :company_id
        """)
        
        step_def_result = db.execute(step_definition_query, {
            "workflow_name": result[2],
            "step_number": result[5],
            "company_id": company_id
        }).fetchone()
        
        step_definition = None
        if step_def_result:
            step_definition = {
                "id": step_def_result[0],
                "step_name": step_def_result[1],
                "step_type": step_def_result[2],
                "expected_duration_minutes": step_def_result[3],
                "required_role": step_def_result[4],
                "auto_advance": step_def_result[5]
            }
        
        all_steps_query = text("""
            SELECT 
                wsi.id,
                wsi.step_number,
                wsi.step_name,
                wsi.status,
                wsi.started_at,
                wsi.completed_at
            FROM workflow_step_instances wsi
            WHERE wsi.workflow_instance_id = :workflow_instance_id
            ORDER BY wsi.step_number
        """)
        
        all_steps_result = db.execute(all_steps_query, {
            "workflow_instance_id": result[1]
        })
        
        all_steps = []
        for row in all_steps_result.fetchall():
            all_steps.append({
                "id": row[0],
                "step_number": row[1],
                "step_name": row[2],
                "status": row[3],
                "started_at": str(row[4]) if row[4] else None,
                "completed_at": str(row[5]) if row[5] else None
            })
        
        actions_query = text("""
            SELECT 
                wsa.id,
                wsa.action_type,
                wsa.action_description,
                wsa.performed_by,
                wsa.performed_at
            FROM workflow_step_actions wsa
            WHERE wsa.step_instance_id = :instance_id
                AND wsa.company_id = :company_id
            ORDER BY wsa.performed_at
        """)
        
        actions_result = db.execute(actions_query, {
            "instance_id": instance_id,
            "company_id": company_id
        })
        
        actions = []
        for row in actions_result.fetchall():
            actions.append({
                "id": row[0],
                "action_type": row[1],
                "action_description": row[2],
                "performed_by": row[3],
                "performed_at": str(row[4]) if row[4] else None
            })
        
        return {
            "workflow_step_instance": {
                "id": result[0],
                "workflow_instance_id": result[1],
                "workflow_name": result[2],
                "entity_type": result[3],
                "entity_id": result[4],
                "step_number": result[5],
                "step_name": result[6],
                "step_type": result[7],
                "assigned_to": result[8],
                "status": result[9],
                "started_at": str(result[10]) if result[10] else None,
                "completed_at": str(result[11]) if result[11] else None,
                "outcome": result[12],
                "next_step_number": result[13],
                "notes": result[14],
                "created_at": str(result[15]) if result[15] else None
            },
            "execution_metrics": {
                "duration_seconds": duration_seconds,
                "duration_minutes": duration_seconds / 60 if duration_seconds else None,
                "is_completed": result[9] == "COMPLETED",
                "is_overdue": False
            },
            "step_definition": step_definition,
            "workflow_progress": {
                "total_steps": len(all_steps),
                "current_step": result[5],
                "all_steps": all_steps
            },
            "actions_taken": actions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
