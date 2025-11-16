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


@router.get("/audit-trail/{audit_id}/field-change-detail")
async def get_field_change_detail(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed field change information from audit trail"""
    try:
        company_id = current_user.get("company_id", "default")
        
        audit_query = text("""
            SELECT 
                at.id,
                at.entity_type,
                at.entity_id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at,
                at.change_reason,
                at.ip_address,
                at.user_agent,
                at.session_id
            FROM audit_trail at
            WHERE at.id = :audit_id AND at.company_id = :company_id
        """)
        
        audit_result = db.execute(audit_query, {
            "audit_id": audit_id,
            "company_id": company_id
        }).fetchone()
        
        if not audit_result:
            raise HTTPException(status_code=404, detail="Audit trail record not found")
        
        entity_type = audit_result[1]
        entity_id = audit_result[2]
        
        entity_details = None
        
        if entity_type == "SALES_ORDER":
            entity_query = text("""
                SELECT 
                    so.order_number,
                    so.order_date,
                    so.customer_id,
                    c.name as customer_name,
                    so.status
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                WHERE so.id = :entity_id AND so.company_id = :company_id
            """)
            
            entity_result = db.execute(entity_query, {
                "entity_id": entity_id,
                "company_id": company_id
            }).fetchone()
            
            if entity_result:
                entity_details = {
                    "type": "SALES_ORDER",
                    "order_number": entity_result[0],
                    "order_date": str(entity_result[1]) if entity_result[1] else None,
                    "customer_id": entity_result[2],
                    "customer_name": entity_result[3],
                    "status": entity_result[4]
                }
        
        elif entity_type == "INVOICE":
            entity_query = text("""
                SELECT 
                    i.invoice_number,
                    i.invoice_date,
                    i.customer_id,
                    c.name as customer_name,
                    i.status
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.id = :entity_id AND i.company_id = :company_id
            """)
            
            entity_result = db.execute(entity_query, {
                "entity_id": entity_id,
                "company_id": company_id
            }).fetchone()
            
            if entity_result:
                entity_details = {
                    "type": "INVOICE",
                    "invoice_number": entity_result[0],
                    "invoice_date": str(entity_result[1]) if entity_result[1] else None,
                    "customer_id": entity_result[2],
                    "customer_name": entity_result[3],
                    "status": entity_result[4]
                }
        
        elif entity_type == "PRODUCT":
            entity_query = text("""
                SELECT 
                    p.product_code,
                    p.name,
                    p.category,
                    p.status
                FROM products p
                WHERE p.id = :entity_id AND p.company_id = :company_id
            """)
            
            entity_result = db.execute(entity_query, {
                "entity_id": entity_id,
                "company_id": company_id
            }).fetchone()
            
            if entity_result:
                entity_details = {
                    "type": "PRODUCT",
                    "product_code": entity_result[0],
                    "product_name": entity_result[1],
                    "category": entity_result[2],
                    "status": entity_result[3]
                }
        
        related_query = text("""
            SELECT 
                at.id,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_at
            FROM audit_trail at
            WHERE at.entity_type = :entity_type
                AND at.entity_id = :entity_id
                AND at.session_id = :session_id
                AND at.id != :audit_id
                AND at.company_id = :company_id
            ORDER BY at.changed_at
        """)
        
        related_result = db.execute(related_query, {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "session_id": audit_result[12],
            "audit_id": audit_id,
            "company_id": company_id
        })
        
        related_changes = []
        for row in related_result.fetchall():
            related_changes.append({
                "id": row[0],
                "field_name": row[1],
                "old_value": row[2],
                "new_value": row[3],
                "changed_at": str(row[4]) if row[4] else None
            })
        
        user_query = text("""
            SELECT 
                u.email,
                u.first_name,
                u.last_name,
                u.role
            FROM users u
            WHERE u.email = :email AND u.company_id = :company_id
        """)
        
        user_result = db.execute(user_query, {
            "email": audit_result[7],
            "company_id": company_id
        }).fetchone()
        
        user_details = None
        if user_result:
            user_details = {
                "email": user_result[0],
                "first_name": user_result[1],
                "last_name": user_result[2],
                "role": user_result[3]
            }
        
        field_history_query = text("""
            SELECT 
                at.id,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at,
                at.change_reason
            FROM audit_trail at
            WHERE at.entity_type = :entity_type
                AND at.entity_id = :entity_id
                AND at.field_name = :field_name
                AND at.company_id = :company_id
            ORDER BY at.changed_at DESC
            LIMIT 10
        """)
        
        field_history_result = db.execute(field_history_query, {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "field_name": audit_result[4],
            "company_id": company_id
        })
        
        field_history = []
        for row in field_history_result.fetchall():
            field_history.append({
                "id": row[0],
                "old_value": row[1],
                "new_value": row[2],
                "changed_by": row[3],
                "changed_at": str(row[4]) if row[4] else None,
                "change_reason": row[5]
            })
        
        return {
            "audit_record": {
                "id": audit_result[0],
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action": audit_result[3],
                "field_name": audit_result[4],
                "old_value": audit_result[5],
                "new_value": audit_result[6],
                "changed_by": audit_result[7],
                "changed_at": str(audit_result[8]) if audit_result[8] else None,
                "change_reason": audit_result[9],
                "ip_address": audit_result[10],
                "user_agent": audit_result[11],
                "session_id": audit_result[12]
            },
            "entity_details": entity_details,
            "user_details": user_details,
            "related_changes_in_session": related_changes,
            "field_change_history": field_history
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entity/{entity_type}/{entity_id}/field-changes")
async def get_entity_field_changes(
    entity_type: str,
    entity_id: int,
    field_name: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all field changes for a specific entity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clause = "at.entity_type = :entity_type AND at.entity_id = :entity_id AND at.company_id = :company_id"
        params = {
            "entity_type": entity_type.upper(),
            "entity_id": entity_id,
            "company_id": company_id
        }
        
        if field_name:
            where_clause += " AND at.field_name = :field_name"
            params["field_name"] = field_name
        
        query = text(f"""
            SELECT 
                at.id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at,
                at.change_reason
            FROM audit_trail at
            WHERE {where_clause}
            ORDER BY at.changed_at DESC
        """)
        
        result = db.execute(query, params)
        
        changes = []
        for row in result.fetchall():
            changes.append({
                "id": row[0],
                "action": row[1],
                "field_name": row[2],
                "old_value": row[3],
                "new_value": row[4],
                "changed_by": row[5],
                "changed_at": str(row[6]) if row[6] else None,
                "change_reason": row[7]
            })
        
        return {"field_changes": changes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_email}/recent-changes")
async def get_user_recent_changes(
    user_email: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get recent changes made by a specific user"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                at.id,
                at.entity_type,
                at.entity_id,
                at.action,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_at,
                at.change_reason
            FROM audit_trail at
            WHERE at.changed_by = :user_email
                AND at.company_id = :company_id
            ORDER BY at.changed_at DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, {
            "user_email": user_email,
            "company_id": company_id,
            "limit": limit
        })
        
        changes = []
        for row in result.fetchall():
            changes.append({
                "id": row[0],
                "entity_type": row[1],
                "entity_id": row[2],
                "action": row[3],
                "field_name": row[4],
                "old_value": row[5],
                "new_value": row[6],
                "changed_at": str(row[7]) if row[7] else None,
                "change_reason": row[8]
            })
        
        return {"recent_changes": changes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audit-trail/{audit_id}/revert")
async def revert_field_change(
    audit_id: int,
    revert_reason: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Revert a field change to its previous value"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        audit_query = text("""
            SELECT 
                entity_type,
                entity_id,
                field_name,
                old_value,
                new_value
            FROM audit_trail
            WHERE id = :audit_id AND company_id = :company_id
        """)
        
        audit_result = db.execute(audit_query, {
            "audit_id": audit_id,
            "company_id": company_id
        }).fetchone()
        
        if not audit_result:
            raise HTTPException(status_code=404, detail="Audit record not found")
        
        entity_type = audit_result[0]
        entity_id = audit_result[1]
        field_name = audit_result[2]
        old_value = audit_result[3]
        
        revert_audit_query = text("""
            INSERT INTO audit_trail (
                entity_type, entity_id, action,
                field_name, old_value, new_value,
                changed_by, changed_at, change_reason,
                company_id
            ) VALUES (
                :entity_type, :entity_id, 'REVERTED',
                :field_name, :new_value, :old_value,
                :changed_by, NOW(), :change_reason,
                :company_id
            )
        """)
        
        db.execute(revert_audit_query, {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "field_name": field_name,
            "new_value": audit_result[4],
            "old_value": old_value,
            "changed_by": user_email,
            "change_reason": f"REVERT: {revert_reason}",
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "Field change reverted successfully",
            "reverted_to": old_value
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
