from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/user-session/{session_id}/atomic-detail")
async def get_user_session_atomic_detail(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single user session"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                us.session_id,
                us.user_id,
                u.email as user_email,
                u.first_name || ' ' || u.last_name as user_name,
                us.login_time,
                us.logout_time,
                us.ip_address,
                us.user_agent,
                us.is_active,
                us.last_activity_at
            FROM user_sessions us
            JOIN users u ON us.user_id = u.id
            WHERE us.session_id = :session_id AND us.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "session_id": session_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="User session not found")
        
        session_duration = None
        logout_time = result[5]
        login_time = result[4]
        
        if logout_time and login_time:
            duration_query = text("""
                SELECT EXTRACT(EPOCH FROM (:logout_time - :login_time))
            """)
            
            duration_result = db.execute(duration_query, {
                "logout_time": logout_time,
                "login_time": login_time
            }).fetchone()
            
            session_duration = float(duration_result[0]) if duration_result else 0
        
        pages_query = text("""
            SELECT 
                spa.id,
                spa.page_path,
                spa.page_title,
                spa.accessed_at,
                spa.time_spent_seconds
            FROM session_page_accesses spa
            WHERE spa.session_id = :session_id
                AND spa.company_id = :company_id
            ORDER BY spa.accessed_at
        """)
        
        pages_result = db.execute(pages_query, {
            "session_id": session_id,
            "company_id": company_id
        })
        
        pages_accessed = []
        total_pages = 0
        
        for row in pages_result.fetchall():
            total_pages += 1
            pages_accessed.append({
                "id": row[0],
                "page_path": row[1],
                "page_title": row[2],
                "accessed_at": str(row[3]) if row[3] else None,
                "time_spent_seconds": row[4]
            })
        
        actions_query = text("""
            SELECT 
                sa.id,
                sa.action_type,
                sa.entity_type,
                sa.entity_id,
                sa.action_description,
                sa.performed_at
            FROM session_actions sa
            WHERE sa.session_id = :session_id
                AND sa.company_id = :company_id
            ORDER BY sa.performed_at
            LIMIT 100
        """)
        
        actions_result = db.execute(actions_query, {
            "session_id": session_id,
            "company_id": company_id
        })
        
        actions_performed = []
        for row in actions_result.fetchall():
            actions_performed.append({
                "id": row[0],
                "action_type": row[1],
                "entity_type": row[2],
                "entity_id": row[3],
                "action_description": row[4],
                "performed_at": str(row[5]) if row[5] else None
            })
        
        other_sessions_query = text("""
            SELECT 
                session_id,
                login_time,
                logout_time,
                ip_address
            FROM user_sessions
            WHERE user_id = :user_id
                AND session_id != :session_id
                AND company_id = :company_id
            ORDER BY login_time DESC
            LIMIT 10
        """)
        
        other_sessions_result = db.execute(other_sessions_query, {
            "user_id": result[1],
            "session_id": session_id,
            "company_id": company_id
        })
        
        other_sessions = []
        for row in other_sessions_result.fetchall():
            other_sessions.append({
                "session_id": row[0],
                "login_time": str(row[1]) if row[1] else None,
                "logout_time": str(row[2]) if row[2] else None,
                "ip_address": row[3]
            })
        
        return {
            "user_session": {
                "session_id": result[0],
                "user_id": result[1],
                "user_email": result[2],
                "user_name": result[3],
                "login_time": str(login_time) if login_time else None,
                "logout_time": str(logout_time) if logout_time else None,
                "ip_address": result[6],
                "user_agent": result[7],
                "is_active": result[8],
                "last_activity_at": str(result[9]) if result[9] else None
            },
            "session_metrics": {
                "session_duration_seconds": session_duration,
                "session_duration_minutes": session_duration / 60 if session_duration else None,
                "pages_accessed_count": total_pages,
                "actions_performed_count": len(actions_performed)
            },
            "pages_accessed": pages_accessed,
            "actions_performed": actions_performed,
            "user_session_history": other_sessions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
