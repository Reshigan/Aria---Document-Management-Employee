from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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


class ActivityCreate(BaseModel):
    lead_id: int
    activity_type: str  # CALL, EMAIL, MEETING, NOTE, TASK
    subject: str
    description: Optional[str] = None
    activity_date: str
    duration_minutes: Optional[int] = None
    outcome: Optional[str] = None
    next_action: Optional[str] = None


@router.get("/lead/{lead_id}/activities")
async def get_lead_activities(
    lead_id: int,
    activity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all activities for a lead"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["la.company_id = :company_id", "la.lead_id = :lead_id"]
        params = {"company_id": company_id, "lead_id": lead_id}
        
        if activity_type:
            where_clauses.append("la.activity_type = :activity_type")
            params["activity_type"] = activity_type
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                la.id,
                la.activity_type,
                la.subject,
                la.description,
                la.activity_date,
                la.duration_minutes,
                la.outcome,
                la.next_action,
                la.created_by,
                la.created_at
            FROM lead_activities la
            WHERE {where_clause}
            ORDER BY la.activity_date DESC, la.created_at DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        activities = []
        for row in rows:
            activities.append({
                "id": row[0],
                "activity_type": row[1],
                "subject": row[2],
                "description": row[3],
                "activity_date": str(row[4]) if row[4] else None,
                "duration_minutes": row[5],
                "outcome": row[6],
                "next_action": row[7],
                "created_by": row[8],
                "created_at": str(row[9]) if row[9] else None
            })
        
        return {"activities": activities, "total_count": len(activities)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lead/{lead_id}/activity-summary")
async def get_lead_activity_summary(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get activity summary for a lead"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                la.activity_type,
                COUNT(*) as count,
                COALESCE(SUM(la.duration_minutes), 0) as total_duration
            FROM lead_activities la
            WHERE la.lead_id = :lead_id AND la.company_id = :company_id
            GROUP BY la.activity_type
            ORDER BY count DESC
        """)
        
        result = db.execute(query, {"lead_id": lead_id, "company_id": company_id})
        rows = result.fetchall()
        
        summary = []
        total_activities = 0
        total_duration = 0
        
        for row in rows:
            count = row[1]
            duration = int(row[2]) if row[2] else 0
            total_activities += count
            total_duration += duration
            
            summary.append({
                "activity_type": row[0],
                "count": count,
                "total_duration_minutes": duration
            })
        
        last_activity_query = text("""
            SELECT MAX(activity_date)
            FROM lead_activities
            WHERE lead_id = :lead_id AND company_id = :company_id
        """)
        
        last_activity_result = db.execute(last_activity_query, {
            "lead_id": lead_id,
            "company_id": company_id
        }).fetchone()
        
        return {
            "summary": summary,
            "total_activities": total_activities,
            "total_duration_minutes": total_duration,
            "last_activity_date": str(last_activity_result[0]) if last_activity_result and last_activity_result[0] else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lead/{lead_id}/activity")
async def create_lead_activity(
    lead_id: int,
    activity: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new activity for a lead"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO lead_activities (
                lead_id, activity_type, subject, description,
                activity_date, duration_minutes, outcome, next_action,
                company_id, created_by, created_at
            ) VALUES (
                :lead_id, :activity_type, :subject, :description,
                :activity_date, :duration_minutes, :outcome, :next_action,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "lead_id": lead_id,
            "activity_type": activity.activity_type,
            "subject": activity.subject,
            "description": activity.description,
            "activity_date": activity.activity_date,
            "duration_minutes": activity.duration_minutes,
            "outcome": activity.outcome,
            "next_action": activity.next_action,
            "company_id": company_id,
            "created_by": user_email
        })
        
        update_lead_query = text("""
            UPDATE leads
            SET last_contact_date = :activity_date, updated_at = NOW()
            WHERE id = :lead_id AND company_id = :company_id
        """)
        
        db.execute(update_lead_query, {
            "activity_date": activity.activity_date,
            "lead_id": lead_id,
            "company_id": company_id
        })
        
        db.commit()
        activity_id = result.fetchone()[0]
        
        return {"id": activity_id, "message": "Activity created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/activity/{activity_id}")
async def update_lead_activity(
    activity_id: int,
    outcome: Optional[str] = None,
    next_action: Optional[str] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a lead activity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        updates = []
        params = {"activity_id": activity_id, "company_id": company_id}
        
        if outcome is not None:
            updates.append("outcome = :outcome")
            params["outcome"] = outcome
        
        if next_action is not None:
            updates.append("next_action = :next_action")
            params["next_action"] = next_action
        
        if description is not None:
            updates.append("description = :description")
            params["description"] = description
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE lead_activities
            SET {update_clause}
            WHERE id = :activity_id AND company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "Activity updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/activity/{activity_id}")
async def delete_lead_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a lead activity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM lead_activities
            WHERE id = :activity_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"activity_id": activity_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Activity deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunity/{opportunity_id}/activities")
async def get_opportunity_activities(
    opportunity_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all activities for an opportunity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                oa.id,
                oa.activity_type,
                oa.subject,
                oa.description,
                oa.activity_date,
                oa.duration_minutes,
                oa.outcome,
                oa.next_action,
                oa.created_by,
                oa.created_at
            FROM opportunity_activities oa
            WHERE oa.opportunity_id = :opportunity_id AND oa.company_id = :company_id
            ORDER BY oa.activity_date DESC, oa.created_at DESC
        """)
        
        result = db.execute(query, {"opportunity_id": opportunity_id, "company_id": company_id})
        rows = result.fetchall()
        
        activities = []
        for row in rows:
            activities.append({
                "id": row[0],
                "activity_type": row[1],
                "subject": row[2],
                "description": row[3],
                "activity_date": str(row[4]) if row[4] else None,
                "duration_minutes": row[5],
                "outcome": row[6],
                "next_action": row[7],
                "created_by": row[8],
                "created_at": str(row[9]) if row[9] else None
            })
        
        return {"activities": activities, "total_count": len(activities)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
