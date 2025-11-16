from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

try:
    from app.auth import get_db, get_current_user
except ImportError:
    try:
        from auth_integrated import get_db, get_current_user
    except ImportError:
        from core.database_pg import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


@router.get("/audit-trail/{entity_type}/{entity_id}")
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete audit trail for an entity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                at.id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.user_email,
                at.user_name,
                at.timestamp,
                at.ip_address,
                at.user_agent
            FROM audit_trail at
            WHERE at.entity_type = :entity_type 
                AND at.entity_id = :entity_id 
                AND at.company_id = :company_id
            ORDER BY at.timestamp DESC
        """)
        
        result = db.execute(query, {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "company_id": company_id
        })
        rows = result.fetchall()
        
        trail = []
        for row in rows:
            trail.append({
                "id": row[0],
                "action": row[1],
                "field_name": row[2],
                "old_value": row[3],
                "new_value": row[4],
                "user_email": row[5],
                "user_name": row[6],
                "timestamp": str(row[7]) if row[7] else None,
                "ip_address": row[8],
                "user_agent": row[9]
            })
        
        return {"audit_trail": trail, "total_count": len(trail)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-trail/user/{user_email}")
async def get_user_audit_trail(
    user_email: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get audit trail for a specific user"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["at.company_id = :company_id", "at.user_email = :user_email"]
        params = {"company_id": company_id, "user_email": user_email}
        
        if start_date:
            where_clauses.append("at.timestamp >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("at.timestamp <= :end_date")
            params["end_date"] = end_date
        
        if action:
            where_clauses.append("at.action = :action")
            params["action"] = action
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                at.id,
                at.entity_type,
                at.entity_id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.timestamp
            FROM audit_trail at
            WHERE {where_clause}
            ORDER BY at.timestamp DESC
            LIMIT 1000
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        trail = []
        for row in rows:
            trail.append({
                "id": row[0],
                "entity_type": row[1],
                "entity_id": row[2],
                "action": row[3],
                "field_name": row[4],
                "old_value": row[5],
                "new_value": row[6],
                "timestamp": str(row[7]) if row[7] else None
            })
        
        return {"audit_trail": trail, "total_count": len(trail)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-trail/recent")
async def get_recent_audit_trail(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get recent audit trail entries"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["at.company_id = :company_id"]
        params = {"company_id": company_id, "limit": limit}
        
        if entity_type:
            where_clauses.append("at.entity_type = :entity_type")
            params["entity_type"] = entity_type
        
        if action:
            where_clauses.append("at.action = :action")
            params["action"] = action
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                at.id,
                at.entity_type,
                at.entity_id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.user_email,
                at.user_name,
                at.timestamp
            FROM audit_trail at
            WHERE {where_clause}
            ORDER BY at.timestamp DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        trail = []
        for row in rows:
            trail.append({
                "id": row[0],
                "entity_type": row[1],
                "entity_id": row[2],
                "action": row[3],
                "field_name": row[4],
                "old_value": row[5],
                "new_value": row[6],
                "user_email": row[7],
                "user_name": row[8],
                "timestamp": str(row[9]) if row[9] else None
            })
        
        return {"audit_trail": trail, "total_count": len(trail)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-trail/statistics")
async def get_audit_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get audit trail statistics"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["at.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("at.timestamp >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("at.timestamp <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        actions_query = text(f"""
            SELECT 
                at.action,
                COUNT(*) as count
            FROM audit_trail at
            WHERE {where_clause}
            GROUP BY at.action
            ORDER BY count DESC
        """)
        
        actions_result = db.execute(actions_query, params)
        
        actions_by_type = {}
        for row in actions_result.fetchall():
            actions_by_type[row[0]] = row[1]
        
        entities_query = text(f"""
            SELECT 
                at.entity_type,
                COUNT(*) as count
            FROM audit_trail at
            WHERE {where_clause}
            GROUP BY at.entity_type
            ORDER BY count DESC
        """)
        
        entities_result = db.execute(entities_query, params)
        
        actions_by_entity = {}
        for row in entities_result.fetchall():
            actions_by_entity[row[0]] = row[1]
        
        users_query = text(f"""
            SELECT 
                at.user_email,
                at.user_name,
                COUNT(*) as count
            FROM audit_trail at
            WHERE {where_clause}
            GROUP BY at.user_email, at.user_name
            ORDER BY count DESC
            LIMIT 10
        """)
        
        users_result = db.execute(users_query, params)
        
        top_users = []
        for row in users_result.fetchall():
            top_users.append({
                "user_email": row[0],
                "user_name": row[1],
                "action_count": row[2]
            })
        
        total_query = text(f"""
            SELECT COUNT(*) FROM audit_trail at WHERE {where_clause}
        """)
        
        total_result = db.execute(total_query, params).fetchone()
        total_count = total_result[0] if total_result else 0
        
        return {
            "total_actions": total_count,
            "actions_by_type": actions_by_type,
            "actions_by_entity": actions_by_entity,
            "top_users": top_users
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-trail/compare/{entity_type}/{entity_id}")
async def compare_entity_versions(
    entity_type: str,
    entity_id: int,
    timestamp1: str,
    timestamp2: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Compare two versions of an entity at different timestamps"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                at.field_name,
                at.old_value,
                at.new_value,
                at.timestamp,
                at.user_email
            FROM audit_trail at
            WHERE at.entity_type = :entity_type 
                AND at.entity_id = :entity_id 
                AND at.company_id = :company_id
                AND at.timestamp BETWEEN :timestamp1 AND :timestamp2
            ORDER BY at.timestamp
        """)
        
        result = db.execute(query, {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "company_id": company_id,
            "timestamp1": timestamp1,
            "timestamp2": timestamp2
        })
        rows = result.fetchall()
        
        changes = []
        for row in rows:
            changes.append({
                "field_name": row[0],
                "old_value": row[1],
                "new_value": row[2],
                "timestamp": str(row[3]) if row[3] else None,
                "user_email": row[4]
            })
        
        return {"changes": changes, "total_changes": len(changes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
