from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class FieldChangeRevert(BaseModel):
    revert_reason: str


@router.get("/field-change/{change_id}/atomic-detail")
async def get_field_change_atomic_detail(
    change_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single field change"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                at.id,
                at.entity_type,
                at.entity_id,
                at.field_name,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at,
                at.change_reason,
                at.ip_address,
                at.user_agent,
                at.is_reverted,
                at.reverted_by,
                at.reverted_at,
                at.revert_reason
            FROM audit_trail at
            WHERE at.id = :change_id AND at.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "change_id": change_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Field change not found")
        
        entity_details = None
        entity_type = result[1]
        entity_id = result[2]
        
        if entity_type == "SALES_ORDER":
            entity_query = text("""
                SELECT order_number, order_date, status
                FROM sales_orders
                WHERE id = :entity_id AND company_id = :company_id
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
                    "status": entity_result[2]
                }
        
        related_changes_query = text("""
            SELECT 
                at.id,
                at.old_value,
                at.new_value,
                at.changed_by,
                at.changed_at
            FROM audit_trail at
            WHERE at.entity_type = :entity_type
                AND at.entity_id = :entity_id
                AND at.field_name = :field_name
                AND at.id != :change_id
                AND at.company_id = :company_id
            ORDER BY at.changed_at DESC
            LIMIT 10
        """)
        
        related_result = db.execute(related_changes_query, {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "field_name": result[3],
            "change_id": change_id,
            "company_id": company_id
        })
        
        related_changes = []
        for row in related_result.fetchall():
            related_changes.append({
                "id": row[0],
                "old_value": row[1],
                "new_value": row[2],
                "changed_by": row[3],
                "changed_at": str(row[4]) if row[4] else None
            })
        
        return {
            "field_change": {
                "id": result[0],
                "entity_type": entity_type,
                "entity_id": entity_id,
                "field_name": result[3],
                "old_value": result[4],
                "new_value": result[5],
                "changed_by": result[6],
                "changed_at": str(result[7]) if result[7] else None,
                "change_reason": result[8],
                "ip_address": result[9],
                "user_agent": result[10],
                "is_reverted": result[11],
                "reverted_by": result[12],
                "reverted_at": str(result[13]) if result[13] else None,
                "revert_reason": result[14]
            },
            "entity_details": entity_details,
            "related_changes": related_changes
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/field-change/{change_id}/revert")
async def revert_field_change(
    change_id: int,
    revert_data: FieldChangeRevert,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Revert a field change"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        change_query = text("""
            SELECT entity_type, entity_id, field_name, old_value
            FROM audit_trail
            WHERE id = :change_id AND company_id = :company_id
        """)
        
        change_result = db.execute(change_query, {
            "change_id": change_id,
            "company_id": company_id
        }).fetchone()
        
        if not change_result:
            raise HTTPException(status_code=404, detail="Field change not found")
        
        update_query = text("""
            UPDATE audit_trail
            SET 
                is_reverted = TRUE,
                reverted_by = :reverted_by,
                reverted_at = NOW(),
                revert_reason = :revert_reason
            WHERE id = :change_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "reverted_by": user_email,
            "revert_reason": revert_data.revert_reason,
            "change_id": change_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Field change reverted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
