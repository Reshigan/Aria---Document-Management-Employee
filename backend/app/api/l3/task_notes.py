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


class TaskNoteCreate(BaseModel):
    task_id: int
    note_text: str
    is_internal: Optional[bool] = False


class TaskAttachmentCreate(BaseModel):
    task_id: int
    file_name: str
    file_path: str
    file_size: int
    file_type: str


@router.get("/task/{task_id}/notes")
async def get_task_notes(
    task_id: int,
    include_internal: bool = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all notes for a task"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["tn.task_id = :task_id", "t.company_id = :company_id"]
        params = {"task_id": task_id, "company_id": company_id}
        
        if not include_internal:
            where_clauses.append("tn.is_internal = false")
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                tn.id,
                tn.note_text,
                tn.is_internal,
                tn.created_by,
                tn.created_at,
                tn.updated_at
            FROM task_notes tn
            JOIN tasks t ON tn.task_id = t.id
            WHERE {where_clause}
            ORDER BY tn.created_at DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        notes = []
        for row in rows:
            notes.append({
                "id": row[0],
                "note_text": row[1],
                "is_internal": row[2],
                "created_by": row[3],
                "created_at": str(row[4]) if row[4] else None,
                "updated_at": str(row[5]) if row[5] else None
            })
        
        return {
            "notes": notes,
            "total_count": len(notes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/task/{task_id}/note")
async def add_task_note(
    task_id: int,
    note: TaskNoteCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a note to a task"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        task_query = text("""
            SELECT id
            FROM tasks
            WHERE id = :task_id AND company_id = :company_id
        """)
        
        task_result = db.execute(task_query, {
            "task_id": task_id,
            "company_id": company_id
        }).fetchone()
        
        if not task_result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        insert_query = text("""
            INSERT INTO task_notes (
                task_id, note_text, is_internal,
                created_by, created_at
            ) VALUES (
                :task_id, :note_text, :is_internal,
                :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "task_id": task_id,
            "note_text": note.note_text,
            "is_internal": note.is_internal,
            "created_by": user_email
        })
        
        db.commit()
        note_id = result.fetchone()[0]
        
        return {"id": note_id, "message": "Task note added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/task-note/{note_id}")
async def update_task_note(
    note_id: int,
    note_text: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a task note"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE task_notes tn
            SET note_text = :note_text, updated_at = NOW()
            FROM tasks t
            WHERE tn.task_id = t.id
                AND tn.id = :note_id
                AND t.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "note_text": note_text,
            "note_id": note_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Task note updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/task-note/{note_id}")
async def delete_task_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a task note"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM task_notes tn
            USING tasks t
            WHERE tn.task_id = t.id
                AND tn.id = :note_id
                AND t.company_id = :company_id
        """)
        
        db.execute(delete_query, {"note_id": note_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Task note deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}/attachments")
async def get_task_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all attachments for a task"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ta.id,
                ta.file_name,
                ta.file_path,
                ta.file_size,
                ta.file_type,
                ta.uploaded_by,
                ta.uploaded_at
            FROM task_attachments ta
            JOIN tasks t ON ta.task_id = t.id
            WHERE ta.task_id = :task_id AND t.company_id = :company_id
            ORDER BY ta.uploaded_at DESC
        """)
        
        result = db.execute(query, {"task_id": task_id, "company_id": company_id})
        rows = result.fetchall()
        
        attachments = []
        total_size = 0
        
        for row in rows:
            file_size = row[3] if row[3] else 0
            total_size += file_size
            
            attachments.append({
                "id": row[0],
                "file_name": row[1],
                "file_path": row[2],
                "file_size": file_size,
                "file_type": row[4],
                "uploaded_by": row[5],
                "uploaded_at": str(row[6]) if row[6] else None
            })
        
        return {
            "attachments": attachments,
            "total_count": len(attachments),
            "total_size": total_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/task/{task_id}/attachment")
async def add_task_attachment(
    task_id: int,
    attachment: TaskAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add an attachment to a task"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        task_query = text("""
            SELECT id
            FROM tasks
            WHERE id = :task_id AND company_id = :company_id
        """)
        
        task_result = db.execute(task_query, {
            "task_id": task_id,
            "company_id": company_id
        }).fetchone()
        
        if not task_result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        insert_query = text("""
            INSERT INTO task_attachments (
                task_id, file_name, file_path, file_size, file_type,
                uploaded_by, uploaded_at
            ) VALUES (
                :task_id, :file_name, :file_path, :file_size, :file_type,
                :uploaded_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "task_id": task_id,
            "file_name": attachment.file_name,
            "file_path": attachment.file_path,
            "file_size": attachment.file_size,
            "file_type": attachment.file_type,
            "uploaded_by": user_email
        })
        
        db.commit()
        attachment_id = result.fetchone()[0]
        
        return {"id": attachment_id, "message": "Task attachment added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/task-attachment/{attachment_id}")
async def delete_task_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a task attachment"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM task_attachments ta
            USING tasks t
            WHERE ta.task_id = t.id
                AND ta.id = :attachment_id
                AND t.company_id = :company_id
        """)
        
        db.execute(delete_query, {"attachment_id": attachment_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Task attachment deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}/activity-summary")
async def get_task_activity_summary(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get activity summary for a task"""
    try:
        company_id = current_user.get("company_id", "default")
        
        notes_query = text("""
            SELECT COUNT(*)
            FROM task_notes tn
            JOIN tasks t ON tn.task_id = t.id
            WHERE tn.task_id = :task_id AND t.company_id = :company_id
        """)
        
        notes_result = db.execute(notes_query, {
            "task_id": task_id,
            "company_id": company_id
        }).fetchone()
        
        attachments_query = text("""
            SELECT COUNT(*), COALESCE(SUM(file_size), 0)
            FROM task_attachments ta
            JOIN tasks t ON ta.task_id = t.id
            WHERE ta.task_id = :task_id AND t.company_id = :company_id
        """)
        
        attachments_result = db.execute(attachments_query, {
            "task_id": task_id,
            "company_id": company_id
        }).fetchone()
        
        last_activity_query = text("""
            SELECT MAX(activity_date) as last_activity
            FROM (
                SELECT MAX(created_at) as activity_date
                FROM task_notes tn
                JOIN tasks t ON tn.task_id = t.id
                WHERE tn.task_id = :task_id AND t.company_id = :company_id
                UNION ALL
                SELECT MAX(uploaded_at) as activity_date
                FROM task_attachments ta
                JOIN tasks t ON ta.task_id = t.id
                WHERE ta.task_id = :task_id AND t.company_id = :company_id
            ) activities
        """)
        
        last_activity_result = db.execute(last_activity_query, {
            "task_id": task_id,
            "company_id": company_id
        }).fetchone()
        
        return {
            "note_count": notes_result[0] if notes_result else 0,
            "attachment_count": attachments_result[0] if attachments_result else 0,
            "total_attachment_size": int(attachments_result[1]) if attachments_result else 0,
            "last_activity": str(last_activity_result[0]) if last_activity_result and last_activity_result[0] else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_email}/task-notes")
async def get_user_task_notes(
    user_email: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all task notes created by a user"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                tn.id,
                t.id as task_id,
                t.title as task_title,
                tn.note_text,
                tn.is_internal,
                tn.created_at
            FROM task_notes tn
            JOIN tasks t ON tn.task_id = t.id
            WHERE tn.created_by = :user_email AND t.company_id = :company_id
            ORDER BY tn.created_at DESC
            LIMIT 50
        """)
        
        result = db.execute(query, {"user_email": user_email, "company_id": company_id})
        rows = result.fetchall()
        
        notes = []
        for row in rows:
            notes.append({
                "id": row[0],
                "task_id": row[1],
                "task_title": row[2],
                "note_text": row[3],
                "is_internal": row[4],
                "created_at": str(row[5]) if row[5] else None
            })
        
        return {
            "notes": notes,
            "total_count": len(notes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
