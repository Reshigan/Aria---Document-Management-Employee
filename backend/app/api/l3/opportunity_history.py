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


class StageChangeCreate(BaseModel):
    opportunity_id: int
    from_stage: str
    to_stage: str
    probability: Optional[float] = None
    notes: Optional[str] = None


@router.get("/opportunity/{opportunity_id}/stage-history")
async def get_opportunity_stage_history(
    opportunity_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete stage history for an opportunity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                osh.id,
                osh.from_stage,
                osh.to_stage,
                osh.probability,
                osh.expected_value,
                osh.notes,
                osh.changed_by,
                osh.changed_at,
                osh.days_in_stage
            FROM opportunity_stage_history osh
            JOIN opportunities o ON osh.opportunity_id = o.id
            WHERE osh.opportunity_id = :opportunity_id AND o.company_id = :company_id
            ORDER BY osh.changed_at DESC
        """)
        
        result = db.execute(query, {"opportunity_id": opportunity_id, "company_id": company_id})
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "from_stage": row[1],
                "to_stage": row[2],
                "probability": float(row[3]) if row[3] else 0,
                "expected_value": float(row[4]) if row[4] else 0,
                "notes": row[5],
                "changed_by": row[6],
                "changed_at": str(row[7]) if row[7] else None,
                "days_in_stage": row[8]
            })
        
        return {"stage_history": history, "total_count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/{opportunity_id}/stage-change")
async def record_stage_change(
    opportunity_id: int,
    stage_change: StageChangeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record a stage change for an opportunity"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        opp_query = text("""
            SELECT 
                o.current_stage,
                o.expected_value,
                o.last_stage_change_date
            FROM opportunities o
            WHERE o.id = :opportunity_id AND o.company_id = :company_id
        """)
        
        opp_result = db.execute(opp_query, {
            "opportunity_id": opportunity_id,
            "company_id": company_id
        }).fetchone()
        
        if not opp_result:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        days_in_stage = 0
        if opp_result[2]:
            from datetime import datetime, date
            last_change = opp_result[2]
            if isinstance(last_change, str):
                last_change = datetime.fromisoformat(last_change).date()
            days_in_stage = (date.today() - last_change).days
        
        insert_query = text("""
            INSERT INTO opportunity_stage_history (
                opportunity_id, from_stage, to_stage, probability,
                expected_value, notes, changed_by, changed_at,
                days_in_stage, company_id
            ) VALUES (
                :opportunity_id, :from_stage, :to_stage, :probability,
                :expected_value, :notes, :changed_by, NOW(),
                :days_in_stage, :company_id
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "opportunity_id": opportunity_id,
            "from_stage": stage_change.from_stage,
            "to_stage": stage_change.to_stage,
            "probability": stage_change.probability,
            "expected_value": opp_result[1],
            "notes": stage_change.notes,
            "changed_by": user_email,
            "days_in_stage": days_in_stage,
            "company_id": company_id
        })
        
        update_query = text("""
            UPDATE opportunities
            SET 
                current_stage = :to_stage,
                probability = :probability,
                last_stage_change_date = NOW(),
                updated_at = NOW()
            WHERE id = :opportunity_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "to_stage": stage_change.to_stage,
            "probability": stage_change.probability,
            "opportunity_id": opportunity_id,
            "company_id": company_id
        })
        
        db.commit()
        history_id = result.fetchone()[0]
        
        return {"id": history_id, "message": "Stage change recorded successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunity/{opportunity_id}/value-history")
async def get_opportunity_value_history(
    opportunity_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get value change history for an opportunity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ovh.id,
                ovh.old_value,
                ovh.new_value,
                ovh.reason,
                ovh.changed_by,
                ovh.changed_at
            FROM opportunity_value_history ovh
            JOIN opportunities o ON ovh.opportunity_id = o.id
            WHERE ovh.opportunity_id = :opportunity_id AND o.company_id = :company_id
            ORDER BY ovh.changed_at DESC
        """)
        
        result = db.execute(query, {"opportunity_id": opportunity_id, "company_id": company_id})
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "old_value": float(row[1]) if row[1] else 0,
                "new_value": float(row[2]) if row[2] else 0,
                "change": float(row[2] - row[1]) if row[1] and row[2] else 0,
                "reason": row[3],
                "changed_by": row[4],
                "changed_at": str(row[5]) if row[5] else None
            })
        
        return {"value_history": history, "total_count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunity/{opportunity_id}/timeline")
async def get_opportunity_timeline(
    opportunity_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete timeline for an opportunity (stages, activities, value changes)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        stages_query = text("""
            SELECT 
                'STAGE_CHANGE' as event_type,
                osh.changed_at as event_date,
                osh.from_stage || ' → ' || osh.to_stage as description,
                osh.changed_by as user_email,
                osh.notes
            FROM opportunity_stage_history osh
            JOIN opportunities o ON osh.opportunity_id = o.id
            WHERE osh.opportunity_id = :opportunity_id AND o.company_id = :company_id
        """)
        
        activities_query = text("""
            SELECT 
                'ACTIVITY' as event_type,
                oa.activity_date as event_date,
                oa.activity_type || ': ' || oa.subject as description,
                oa.created_by as user_email,
                oa.outcome as notes
            FROM opportunity_activities oa
            JOIN opportunities o ON oa.opportunity_id = o.id
            WHERE oa.opportunity_id = :opportunity_id AND o.company_id = :company_id
        """)
        
        values_query = text("""
            SELECT 
                'VALUE_CHANGE' as event_type,
                ovh.changed_at as event_date,
                'Value changed from ' || ovh.old_value || ' to ' || ovh.new_value as description,
                ovh.changed_by as user_email,
                ovh.reason as notes
            FROM opportunity_value_history ovh
            JOIN opportunities o ON ovh.opportunity_id = o.id
            WHERE ovh.opportunity_id = :opportunity_id AND o.company_id = :company_id
        """)
        
        combined_query = text(f"""
            ({stages_query.text})
            UNION ALL
            ({activities_query.text})
            UNION ALL
            ({values_query.text})
            ORDER BY event_date DESC
        """)
        
        result = db.execute(combined_query, {"opportunity_id": opportunity_id, "company_id": company_id})
        rows = result.fetchall()
        
        timeline = []
        for row in rows:
            timeline.append({
                "event_type": row[0],
                "event_date": str(row[1]) if row[1] else None,
                "description": row[2],
                "user_email": row[3],
                "notes": row[4]
            })
        
        return {"timeline": timeline, "total_count": len(timeline)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunities/conversion-funnel")
async def get_conversion_funnel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get opportunity conversion funnel statistics"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["o.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("o.created_at >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("o.created_at <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                o.current_stage,
                COUNT(*) as count,
                SUM(o.expected_value) as total_value,
                AVG(o.probability) as avg_probability
            FROM opportunities o
            WHERE {where_clause}
            GROUP BY o.current_stage
            ORDER BY 
                CASE o.current_stage
                    WHEN 'LEAD' THEN 1
                    WHEN 'QUALIFIED' THEN 2
                    WHEN 'PROPOSAL' THEN 3
                    WHEN 'NEGOTIATION' THEN 4
                    WHEN 'CLOSED_WON' THEN 5
                    WHEN 'CLOSED_LOST' THEN 6
                    ELSE 7
                END
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        funnel = []
        for row in rows:
            funnel.append({
                "stage": row[0],
                "count": row[1],
                "total_value": float(row[2]) if row[2] else 0,
                "avg_probability": float(row[3]) if row[3] else 0
            })
        
        return {"funnel": funnel}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
