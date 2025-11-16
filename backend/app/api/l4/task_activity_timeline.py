from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/task/{task_id}/activity-timeline")
async def get_task_activity_timeline(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete activity timeline for a task"""
    try:
        company_id = current_user.get("company_id", "default")
        
        task_query = text("""
            SELECT 
                t.id,
                t.task_number,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.assigned_to,
                t.created_by,
                t.created_at,
                t.due_date,
                t.completed_at
            FROM tasks t
            WHERE t.id = :task_id AND t.company_id = :company_id
        """)
        
        task_result = db.execute(task_query, {
            "task_id": task_id,
            "company_id": company_id
        }).fetchone()
        
        if not task_result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        activities = []
        
        status_query = text("""
            SELECT 
                'STATUS_CHANGE' as activity_type,
                at.id,
                at.changed_at as activity_date,
                at.changed_by as actor,
                at.old_value,
                at.new_value,
                at.change_reason as notes
            FROM audit_trail at
            WHERE at.entity_type = 'TASK'
                AND at.entity_id = :task_id
                AND at.field_name = 'status'
                AND at.company_id = :company_id
        """)
        
        status_result = db.execute(status_query, {
            "task_id": task_id,
            "company_id": company_id
        })
        
        for row in status_result.fetchall():
            activities.append({
                "activity_type": row[0],
                "id": row[1],
                "activity_date": str(row[2]) if row[2] else None,
                "actor": row[3],
                "old_value": row[4],
                "new_value": row[5],
                "notes": row[6]
            })
        
        comments_query = text("""
            SELECT 
                'COMMENT' as activity_type,
                c.id,
                c.created_at as activity_date,
                c.created_by as actor,
                c.comment_text,
                NULL as old_value,
                NULL as new_value
            FROM comments c
            WHERE c.entity_type = 'TASK'
                AND c.entity_id = :task_id
                AND c.company_id = :company_id
        """)
        
        comments_result = db.execute(comments_query, {
            "task_id": task_id,
            "company_id": company_id
        })
        
        for row in comments_result.fetchall():
            activities.append({
                "activity_type": row[0],
                "id": row[1],
                "activity_date": str(row[2]) if row[2] else None,
                "actor": row[3],
                "notes": row[4],
                "old_value": row[5],
                "new_value": row[6]
            })
        
        attachments_query = text("""
            SELECT 
                'ATTACHMENT' as activity_type,
                a.id,
                a.uploaded_at as activity_date,
                a.uploaded_by as actor,
                a.file_name,
                a.file_size,
                NULL as old_value
            FROM attachments a
            WHERE a.entity_type = 'TASK'
                AND a.entity_id = :task_id
                AND a.company_id = :company_id
        """)
        
        attachments_result = db.execute(attachments_query, {
            "task_id": task_id,
            "company_id": company_id
        })
        
        for row in attachments_result.fetchall():
            activities.append({
                "activity_type": row[0],
                "id": row[1],
                "activity_date": str(row[2]) if row[2] else None,
                "actor": row[3],
                "notes": f"Uploaded {row[4]} ({row[5]} bytes)",
                "old_value": row[6],
                "new_value": row[4]
            })
        
        assignment_query = text("""
            SELECT 
                'ASSIGNMENT_CHANGE' as activity_type,
                at.id,
                at.changed_at as activity_date,
                at.changed_by as actor,
                at.old_value,
                at.new_value,
                at.change_reason
            FROM audit_trail at
            WHERE at.entity_type = 'TASK'
                AND at.entity_id = :task_id
                AND at.field_name = 'assigned_to'
                AND at.company_id = :company_id
        """)
        
        assignment_result = db.execute(assignment_query, {
            "task_id": task_id,
            "company_id": company_id
        })
        
        for row in assignment_result.fetchall():
            activities.append({
                "activity_type": row[0],
                "id": row[1],
                "activity_date": str(row[2]) if row[2] else None,
                "actor": row[3],
                "old_value": row[4],
                "new_value": row[5],
                "notes": row[6]
            })
        
        priority_query = text("""
            SELECT 
                'PRIORITY_CHANGE' as activity_type,
                at.id,
                at.changed_at as activity_date,
                at.changed_by as actor,
                at.old_value,
                at.new_value,
                at.change_reason
            FROM audit_trail at
            WHERE at.entity_type = 'TASK'
                AND at.entity_id = :task_id
                AND at.field_name = 'priority'
                AND at.company_id = :company_id
        """)
        
        priority_result = db.execute(priority_query, {
            "task_id": task_id,
            "company_id": company_id
        })
        
        for row in priority_result.fetchall():
            activities.append({
                "activity_type": row[0],
                "id": row[1],
                "activity_date": str(row[2]) if row[2] else None,
                "actor": row[3],
                "old_value": row[4],
                "new_value": row[5],
                "notes": row[6]
            })
        
        activities.sort(key=lambda x: x["activity_date"] if x["activity_date"] else "", reverse=True)
        
        return {
            "task": {
                "id": task_result[0],
                "task_number": task_result[1],
                "title": task_result[2],
                "description": task_result[3],
                "status": task_result[4],
                "priority": task_result[5],
                "assigned_to": task_result[6],
                "created_by": task_result[7],
                "created_at": str(task_result[8]) if task_result[8] else None,
                "due_date": str(task_result[9]) if task_result[9] else None,
                "completed_at": str(task_result[10]) if task_result[10] else None
            },
            "activity_timeline": activities,
            "summary": {
                "total_activities": len(activities),
                "status_changes": len([a for a in activities if a["activity_type"] == "STATUS_CHANGE"]),
                "comments": len([a for a in activities if a["activity_type"] == "COMMENT"]),
                "attachments": len([a for a in activities if a["activity_type"] == "ATTACHMENT"]),
                "assignment_changes": len([a for a in activities if a["activity_type"] == "ASSIGNMENT_CHANGE"]),
                "priority_changes": len([a for a in activities if a["activity_type"] == "PRIORITY_CHANGE"])
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
