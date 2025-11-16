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


class LotQualityUpdate(BaseModel):
    quality_status: str
    notes: Optional[str] = None


@router.get("/lot-number/{lot_number}/quality-expiry-detail")
async def get_lot_quality_expiry_detail(
    lot_number: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get quality and expiry details for a lot number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        lot_query = text("""
            SELECT 
                ilt.id,
                ilt.lot_number,
                ilt.product_id,
                p.product_code,
                p.name as product_name,
                ilt.warehouse_id,
                w.name as warehouse_name,
                ilt.quantity_on_hand,
                ilt.expiry_date,
                ilt.manufacture_date,
                ilt.quality_status,
                ilt.reference_type,
                ilt.reference_id,
                ilt.created_at
            FROM inventory_lot_tracking ilt
            JOIN products p ON ilt.product_id = p.id
            LEFT JOIN warehouses w ON ilt.warehouse_id = w.id
            WHERE ilt.lot_number = :lot_number
                AND ilt.company_id = :company_id
            ORDER BY ilt.created_at DESC
            LIMIT 1
        """)
        
        lot_result = db.execute(lot_query, {
            "lot_number": lot_number,
            "company_id": company_id
        }).fetchone()
        
        if not lot_result:
            raise HTTPException(status_code=404, detail="Lot number not found")
        
        expiry_date = lot_result[8]
        days_until_expiry = None
        expiry_status = "UNKNOWN"
        
        if expiry_date:
            days_query = text("""
                SELECT EXTRACT(DAY FROM (:expiry_date - CURRENT_DATE))
            """)
            
            days_result = db.execute(days_query, {
                "expiry_date": expiry_date
            }).fetchone()
            
            days_until_expiry = int(days_result[0]) if days_result else 0
            
            if days_until_expiry < 0:
                expiry_status = "EXPIRED"
            elif days_until_expiry <= 30:
                expiry_status = "EXPIRING_SOON"
            elif days_until_expiry <= 90:
                expiry_status = "APPROACHING_EXPIRY"
            else:
                expiry_status = "VALID"
        
        inspection_query = text("""
            SELECT 
                qi.id,
                qi.inspection_number,
                qi.inspection_date,
                qi.inspector_id,
                e.first_name || ' ' || e.last_name as inspector_name,
                qi.overall_result,
                qi.status,
                qi.notes
            FROM quality_inspections qi
            LEFT JOIN employees e ON qi.inspector_id = e.id
            WHERE qi.lot_number = :lot_number
                AND qi.company_id = :company_id
            ORDER BY qi.inspection_date DESC
        """)
        
        inspection_result = db.execute(inspection_query, {
            "lot_number": lot_number,
            "company_id": company_id
        })
        
        inspections = []
        for row in inspection_result.fetchall():
            inspections.append({
                "id": row[0],
                "inspection_number": row[1],
                "inspection_date": str(row[2]) if row[2] else None,
                "inspector_id": row[3],
                "inspector_name": row[4],
                "overall_result": row[5],
                "status": row[6],
                "notes": row[7]
            })
        
        return {
            "lot_details": {
                "id": lot_result[0],
                "lot_number": lot_number,
                "product_id": lot_result[2],
                "product_code": lot_result[3],
                "product_name": lot_result[4],
                "warehouse_id": lot_result[5],
                "warehouse_name": lot_result[6],
                "quantity_on_hand": float(lot_result[7]) if lot_result[7] else 0,
                "expiry_date": str(expiry_date) if expiry_date else None,
                "manufacture_date": str(lot_result[9]) if lot_result[9] else None,
                "quality_status": lot_result[10],
                "reference_type": lot_result[11],
                "reference_id": lot_result[12],
                "created_at": str(lot_result[13]) if lot_result[13] else None
            },
            "expiry_info": {
                "days_until_expiry": days_until_expiry,
                "expiry_status": expiry_status,
                "is_expired": expiry_status == "EXPIRED",
                "requires_action": expiry_status in ["EXPIRED", "EXPIRING_SOON"]
            },
            "quality_inspections": inspections
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/lot-number/{lot_number}/update-quality-status")
async def update_lot_quality_status(
    lot_number: str,
    update_data: LotQualityUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update quality status for a lot number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE inventory_lot_tracking
            SET 
                quality_status = :quality_status,
                updated_at = NOW()
            WHERE lot_number = :lot_number
                AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "quality_status": update_data.quality_status,
            "lot_number": lot_number,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Lot quality status updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
