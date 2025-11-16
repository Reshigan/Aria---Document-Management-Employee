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


class TimesheetEntryCreate(BaseModel):
    timesheet_id: int
    date: str
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    hours: float
    description: Optional[str] = None
    billable: bool = True


@router.get("/timesheet/{timesheet_id}/entries")
async def get_timesheet_entries(
    timesheet_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all entries for a timesheet"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                t.timesheet_number,
                t.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                t.period_start,
                t.period_end,
                t.status,
                t.total_hours
            FROM timesheets t
            JOIN employees e ON t.employee_id = e.id
            WHERE t.id = :timesheet_id AND t.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "timesheet_id": timesheet_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Timesheet not found")
        
        entries_query = text("""
            SELECT 
                te.id,
                te.date,
                te.project_id,
                p.name as project_name,
                te.task_id,
                tk.name as task_name,
                te.hours,
                te.description,
                te.billable,
                te.status,
                te.approved_by,
                te.approved_at
            FROM timesheet_entries te
            JOIN timesheets t ON te.timesheet_id = t.id
            LEFT JOIN projects p ON te.project_id = p.id
            LEFT JOIN tasks tk ON te.task_id = tk.id
            WHERE t.id = :timesheet_id AND t.company_id = :company_id
            ORDER BY te.date, te.id
        """)
        
        entries_result = db.execute(entries_query, {
            "timesheet_id": timesheet_id,
            "company_id": company_id
        })
        
        entries = []
        total_hours = 0
        billable_hours = 0
        
        for row in entries_result.fetchall():
            hours = float(row[6]) if row[6] else 0
            is_billable = row[8]
            
            total_hours += hours
            if is_billable:
                billable_hours += hours
            
            entries.append({
                "id": row[0],
                "date": str(row[1]) if row[1] else None,
                "project_id": row[2],
                "project_name": row[3],
                "task_id": row[4],
                "task_name": row[5],
                "hours": hours,
                "description": row[7],
                "billable": is_billable,
                "status": row[9],
                "approved_by": row[10],
                "approved_at": str(row[11]) if row[11] else None
            })
        
        return {
            "timesheet": {
                "timesheet_number": header_result[0],
                "employee_id": header_result[1],
                "employee_name": header_result[2],
                "period_start": str(header_result[3]) if header_result[3] else None,
                "period_end": str(header_result[4]) if header_result[4] else None,
                "status": header_result[5],
                "total_hours": float(header_result[6]) if header_result[6] else 0
            },
            "entries": entries,
            "summary": {
                "total_hours": total_hours,
                "billable_hours": billable_hours,
                "non_billable_hours": total_hours - billable_hours
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timesheet/{timesheet_id}/entry")
async def create_timesheet_entry(
    timesheet_id: int,
    entry: TimesheetEntryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add an entry to a timesheet"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO timesheet_entries (
                timesheet_id, date, project_id, task_id, hours,
                description, billable, company_id, created_by, created_at
            ) VALUES (
                :timesheet_id, :date, :project_id, :task_id, :hours,
                :description, :billable, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "timesheet_id": timesheet_id,
            "date": entry.date,
            "project_id": entry.project_id,
            "task_id": entry.task_id,
            "hours": entry.hours,
            "description": entry.description,
            "billable": entry.billable,
            "company_id": company_id,
            "created_by": user_email
        })
        
        update_query = text("""
            UPDATE timesheets t
            SET 
                total_hours = (
                    SELECT COALESCE(SUM(hours), 0)
                    FROM timesheet_entries
                    WHERE timesheet_id = t.id
                ),
                updated_at = NOW()
            WHERE t.id = :timesheet_id AND t.company_id = :company_id
        """)
        
        db.execute(update_query, {"timesheet_id": timesheet_id, "company_id": company_id})
        
        db.commit()
        entry_id = result.fetchone()[0]
        
        return {"id": entry_id, "message": "Timesheet entry created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/timesheet-entry/{entry_id}")
async def update_timesheet_entry(
    entry_id: int,
    hours: Optional[float] = None,
    description: Optional[str] = None,
    billable: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a timesheet entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT te.timesheet_id
            FROM timesheet_entries te
            JOIN timesheets t ON te.timesheet_id = t.id
            WHERE te.id = :entry_id AND t.company_id = :company_id
        """)
        
        timesheet_result = db.execute(get_query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not timesheet_result:
            raise HTTPException(status_code=404, detail="Timesheet entry not found")
        
        timesheet_id = timesheet_result[0]
        
        updates = []
        params = {"entry_id": entry_id, "company_id": company_id}
        
        if hours is not None:
            updates.append("hours = :hours")
            params["hours"] = hours
        
        if description is not None:
            updates.append("description = :description")
            params["description"] = description
        
        if billable is not None:
            updates.append("billable = :billable")
            params["billable"] = billable
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE timesheet_entries te
            SET {update_clause}
            FROM timesheets t
            WHERE te.timesheet_id = t.id
                AND te.id = :entry_id
                AND t.company_id = :company_id
        """)
        
        db.execute(query, params)
        
        update_timesheet_query = text("""
            UPDATE timesheets t
            SET 
                total_hours = (
                    SELECT COALESCE(SUM(hours), 0)
                    FROM timesheet_entries
                    WHERE timesheet_id = t.id
                ),
                updated_at = NOW()
            WHERE t.id = :timesheet_id AND t.company_id = :company_id
        """)
        
        db.execute(update_timesheet_query, {"timesheet_id": timesheet_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Timesheet entry updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/timesheet-entry/{entry_id}")
async def delete_timesheet_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a timesheet entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT te.timesheet_id
            FROM timesheet_entries te
            JOIN timesheets t ON te.timesheet_id = t.id
            WHERE te.id = :entry_id AND t.company_id = :company_id
        """)
        
        timesheet_result = db.execute(get_query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not timesheet_result:
            raise HTTPException(status_code=404, detail="Timesheet entry not found")
        
        timesheet_id = timesheet_result[0]
        
        delete_query = text("""
            DELETE FROM timesheet_entries te
            USING timesheets t
            WHERE te.timesheet_id = t.id
                AND te.id = :entry_id
                AND t.company_id = :company_id
        """)
        
        db.execute(delete_query, {"entry_id": entry_id, "company_id": company_id})
        
        update_query = text("""
            UPDATE timesheets t
            SET 
                total_hours = (
                    SELECT COALESCE(SUM(hours), 0)
                    FROM timesheet_entries
                    WHERE timesheet_id = t.id
                ),
                updated_at = NOW()
            WHERE t.id = :timesheet_id AND t.company_id = :company_id
        """)
        
        db.execute(update_query, {"timesheet_id": timesheet_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Timesheet entry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timesheet-entry/{entry_id}/approve")
async def approve_timesheet_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve a timesheet entry"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE timesheet_entries te
            SET 
                status = 'APPROVED',
                approved_by = :approved_by,
                approved_at = NOW(),
                updated_at = NOW()
            FROM timesheets t
            WHERE te.timesheet_id = t.id
                AND te.id = :entry_id
                AND t.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "entry_id": entry_id,
            "approved_by": user_email,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Timesheet entry approved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee/{employee_id}/timesheet-summary")
async def get_employee_timesheet_summary(
    employee_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get timesheet summary for an employee"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["t.company_id = :company_id", "t.employee_id = :employee_id"]
        params = {"company_id": company_id, "employee_id": employee_id}
        
        if start_date:
            where_clauses.append("t.period_start >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("t.period_end <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                COUNT(DISTINCT t.id) as timesheet_count,
                COALESCE(SUM(te.hours), 0) as total_hours,
                COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END), 0) as billable_hours,
                COUNT(DISTINCT te.project_id) as project_count
            FROM timesheets t
            LEFT JOIN timesheet_entries te ON t.id = te.timesheet_id
            WHERE {where_clause}
        """)
        
        result = db.execute(query, params).fetchone()
        
        return {
            "timesheet_count": result[0] if result[0] else 0,
            "total_hours": float(result[1]) if result[1] else 0,
            "billable_hours": float(result[2]) if result[2] else 0,
            "non_billable_hours": float(result[1] - result[2]) if result[1] and result[2] else 0,
            "project_count": result[3] if result[3] else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
