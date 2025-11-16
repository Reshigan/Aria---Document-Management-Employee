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


class ApprovalAction(BaseModel):
    action: str  # APPROVE, REJECT
    comments: str = None


@router.get("/timesheet-entry/{entry_id}/approval-detail")
async def get_timesheet_entry_approval_detail(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed approval information for a timesheet entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                te.id,
                te.timesheet_id,
                ts.timesheet_number,
                ts.period_start,
                ts.period_end,
                te.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                e.employee_number,
                te.work_date,
                te.hours_worked,
                te.project_id,
                p.project_name,
                te.task_description,
                te.approval_status,
                te.approved_by,
                te.approved_at,
                te.rejection_reason,
                te.created_by,
                te.created_at
            FROM timesheet_entries te
            JOIN timesheets ts ON te.timesheet_id = ts.id
            JOIN employees e ON te.employee_id = e.id
            LEFT JOIN projects p ON te.project_id = p.id
            WHERE te.id = :entry_id AND ts.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Timesheet entry not found")
        
        history_query = text("""
            SELECT 
                ah.id,
                ah.action,
                ah.approver_email,
                ah.approval_date,
                ah.comments
            FROM approval_history ah
            WHERE ah.entity_type = 'TIMESHEET_ENTRY'
                AND ah.entity_id = :entry_id
                AND ah.company_id = :company_id
            ORDER BY ah.approval_date DESC
        """)
        
        history_result = db.execute(history_query, {
            "entry_id": entry_id,
            "company_id": company_id
        })
        
        approval_history = []
        for row in history_result.fetchall():
            approval_history.append({
                "id": row[0],
                "action": row[1],
                "approver_email": row[2],
                "approval_date": str(row[3]) if row[3] else None,
                "comments": row[4]
            })
        
        return {
            "timesheet_entry": {
                "id": result[0],
                "timesheet_id": result[1],
                "timesheet_number": result[2],
                "period_start": str(result[3]) if result[3] else None,
                "period_end": str(result[4]) if result[4] else None,
                "employee_id": result[5],
                "employee_name": result[6],
                "employee_number": result[7],
                "work_date": str(result[8]) if result[8] else None,
                "hours_worked": float(result[9]) if result[9] else 0,
                "project_id": result[10],
                "project_name": result[11],
                "task_description": result[12],
                "approval_status": result[13],
                "approved_by": result[14],
                "approved_at": str(result[15]) if result[15] else None,
                "rejection_reason": result[16],
                "created_by": result[17],
                "created_at": str(result[18]) if result[18] else None
            },
            "approval_history": approval_history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timesheet-entry/{entry_id}/approve")
async def approve_timesheet_entry(
    entry_id: int,
    approval_data: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject a timesheet entry"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        if approval_data.action == "APPROVE":
            update_query = text("""
                UPDATE timesheet_entries te
                SET 
                    approval_status = 'APPROVED',
                    approved_by = :approved_by,
                    approved_at = NOW(),
                    updated_at = NOW()
                FROM timesheets ts
                WHERE te.timesheet_id = ts.id
                    AND te.id = :entry_id
                    AND ts.company_id = :company_id
            """)
            
            db.execute(update_query, {
                "approved_by": user_email,
                "entry_id": entry_id,
                "company_id": company_id
            })
        else:
            update_query = text("""
                UPDATE timesheet_entries te
                SET 
                    approval_status = 'REJECTED',
                    rejection_reason = :rejection_reason,
                    updated_at = NOW()
                FROM timesheets ts
                WHERE te.timesheet_id = ts.id
                    AND te.id = :entry_id
                    AND ts.company_id = :company_id
            """)
            
            db.execute(update_query, {
                "rejection_reason": approval_data.comments,
                "entry_id": entry_id,
                "company_id": company_id
            })
        
        history_query = text("""
            INSERT INTO approval_history (
                entity_type, entity_id, action,
                approver_email, approval_date, comments,
                company_id, created_at
            ) VALUES (
                'TIMESHEET_ENTRY', :entry_id, :action,
                :approver_email, NOW(), :comments,
                :company_id, NOW()
            )
        """)
        
        db.execute(history_query, {
            "entry_id": entry_id,
            "action": approval_data.action,
            "approver_email": user_email,
            "comments": approval_data.comments,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": f"Timesheet entry {approval_data.action.lower()}d successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
