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


class NonconformanceUpdate(BaseModel):
    status: str
    resolution_notes: str = None


@router.get("/nonconformance/{nc_id}/atomic-detail")
async def get_nonconformance_atomic_detail(
    nc_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single nonconformance record"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                nc.id,
                nc.nc_number,
                nc.nc_date,
                nc.product_id,
                p.product_code,
                p.name as product_name,
                nc.lot_number,
                nc.serial_number,
                nc.nonconformance_type,
                nc.severity,
                nc.description,
                nc.root_cause,
                nc.status,
                nc.detected_by,
                nc.detected_at,
                nc.resolved_by,
                nc.resolved_at,
                nc.resolution_notes,
                nc.created_at,
                nc.created_by
            FROM nonconformance_records nc
            LEFT JOIN products p ON nc.product_id = p.id
            WHERE nc.id = :nc_id AND nc.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "nc_id": nc_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Nonconformance record not found")
        
        actions_query = text("""
            SELECT 
                nca.id,
                nca.action_type,
                nca.action_description,
                nca.assigned_to,
                nca.due_date,
                nca.completed_date,
                nca.status,
                nca.effectiveness_verified
            FROM nonconformance_corrective_actions nca
            WHERE nca.nonconformance_id = :nc_id
                AND nca.company_id = :company_id
            ORDER BY nca.due_date
        """)
        
        actions_result = db.execute(actions_query, {
            "nc_id": nc_id,
            "company_id": company_id
        })
        
        corrective_actions = []
        for row in actions_result.fetchall():
            corrective_actions.append({
                "id": row[0],
                "action_type": row[1],
                "action_description": row[2],
                "assigned_to": row[3],
                "due_date": str(row[4]) if row[4] else None,
                "completed_date": str(row[5]) if row[5] else None,
                "status": row[6],
                "effectiveness_verified": row[7]
            })
        
        impacted_docs_query = text("""
            SELECT 
                nci.id,
                nci.document_type,
                nci.document_id,
                nci.impact_description
            FROM nonconformance_impacts nci
            WHERE nci.nonconformance_id = :nc_id
                AND nci.company_id = :company_id
        """)
        
        impacted_docs_result = db.execute(impacted_docs_query, {
            "nc_id": nc_id,
            "company_id": company_id
        })
        
        impacted_documents = []
        for row in impacted_docs_result.fetchall():
            impacted_documents.append({
                "id": row[0],
                "document_type": row[1],
                "document_id": row[2],
                "impact_description": row[3]
            })
        
        similar_query = text("""
            SELECT 
                nc.id,
                nc.nc_number,
                nc.nc_date,
                nc.nonconformance_type,
                nc.severity,
                nc.status
            FROM nonconformance_records nc
            WHERE nc.product_id = :product_id
                AND nc.nonconformance_type = :nonconformance_type
                AND nc.id != :nc_id
                AND nc.company_id = :company_id
            ORDER BY nc.nc_date DESC
            LIMIT 10
        """)
        
        similar_result = db.execute(similar_query, {
            "product_id": result[3],
            "nonconformance_type": result[8],
            "nc_id": nc_id,
            "company_id": company_id
        })
        
        similar_nonconformances = []
        for row in similar_result.fetchall():
            similar_nonconformances.append({
                "id": row[0],
                "nc_number": row[1],
                "nc_date": str(row[2]) if row[2] else None,
                "nonconformance_type": row[3],
                "severity": row[4],
                "status": row[5]
            })
        
        return {
            "nonconformance": {
                "id": result[0],
                "nc_number": result[1],
                "nc_date": str(result[2]) if result[2] else None,
                "product_id": result[3],
                "product_code": result[4],
                "product_name": result[5],
                "lot_number": result[6],
                "serial_number": result[7],
                "nonconformance_type": result[8],
                "severity": result[9],
                "description": result[10],
                "root_cause": result[11],
                "status": result[12],
                "detected_by": result[13],
                "detected_at": str(result[14]) if result[14] else None,
                "resolved_by": result[15],
                "resolved_at": str(result[16]) if result[16] else None,
                "resolution_notes": result[17],
                "created_at": str(result[18]) if result[18] else None,
                "created_by": result[19]
            },
            "corrective_actions": corrective_actions,
            "impacted_documents": impacted_documents,
            "similar_nonconformances": similar_nonconformances,
            "action_summary": {
                "total_actions": len(corrective_actions),
                "completed_actions": sum(1 for a in corrective_actions if a["status"] == "COMPLETED"),
                "pending_actions": sum(1 for a in corrective_actions if a["status"] == "PENDING")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/nonconformance/{nc_id}")
async def update_nonconformance(
    nc_id: int,
    update_data: NonconformanceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a nonconformance record"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE nonconformance_records
            SET 
                status = :status,
                resolution_notes = COALESCE(:resolution_notes, resolution_notes),
                resolved_by = CASE WHEN :status = 'RESOLVED' THEN :resolved_by ELSE resolved_by END,
                resolved_at = CASE WHEN :status = 'RESOLVED' THEN NOW() ELSE resolved_at END,
                updated_at = NOW()
            WHERE id = :nc_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "status": update_data.status,
            "resolution_notes": update_data.resolution_notes,
            "resolved_by": user_email,
            "nc_id": nc_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Nonconformance record updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
