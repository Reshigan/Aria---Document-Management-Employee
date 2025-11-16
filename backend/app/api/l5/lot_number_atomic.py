from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/lot-number/{lot_id}/atomic-detail")
async def get_lot_number_atomic_detail(
    lot_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single lot number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ilt.id,
                ilt.lot_number,
                ilt.product_id,
                p.product_code,
                p.name as product_name,
                ilt.warehouse_id,
                w.name as warehouse_name,
                ilt.quantity_on_hand,
                ilt.manufacture_date,
                ilt.expiry_date,
                ilt.quality_status,
                ilt.reference_type,
                ilt.reference_id,
                ilt.created_at,
                ilt.created_by
            FROM inventory_lot_tracking ilt
            JOIN products p ON ilt.product_id = p.id
            JOIN warehouses w ON ilt.warehouse_id = w.id
            WHERE ilt.id = :lot_id AND ilt.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "lot_id": lot_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Lot number not found")
        
        expiry_date = result[9]
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
        
        transactions_query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.quantity,
                il.reference_type,
                il.reference_id,
                il.created_by
            FROM item_ledger il
            WHERE il.lot_number = :lot_number
                AND il.company_id = :company_id
            ORDER BY il.transaction_date DESC
        """)
        
        transactions_result = db.execute(transactions_query, {
            "lot_number": result[1],
            "company_id": company_id
        })
        
        transactions = []
        total_in = 0
        total_out = 0
        
        for row in transactions_result.fetchall():
            qty = float(row[3]) if row[3] else 0
            trans_type = row[2]
            
            if trans_type == "IN":
                total_in += qty
            elif trans_type == "OUT":
                total_out += qty
            
            transactions.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": trans_type,
                "quantity": qty,
                "reference_type": row[4],
                "reference_id": row[5],
                "created_by": row[6]
            })
        
        inspections_query = text("""
            SELECT 
                qi.id,
                qi.inspection_number,
                qi.inspection_date,
                qi.overall_result,
                qi.status
            FROM quality_inspections qi
            WHERE qi.lot_number = :lot_number
                AND qi.company_id = :company_id
            ORDER BY qi.inspection_date DESC
        """)
        
        inspections_result = db.execute(inspections_query, {
            "lot_number": result[1],
            "company_id": company_id
        })
        
        inspections = []
        for row in inspections_result.fetchall():
            inspections.append({
                "id": row[0],
                "inspection_number": row[1],
                "inspection_date": str(row[2]) if row[2] else None,
                "overall_result": row[3],
                "status": row[4]
            })
        
        return {
            "lot_number": {
                "id": result[0],
                "lot_number": result[1],
                "product_id": result[2],
                "product_code": result[3],
                "product_name": result[4],
                "warehouse_id": result[5],
                "warehouse_name": result[6],
                "quantity_on_hand": float(result[7]) if result[7] else 0,
                "manufacture_date": str(result[8]) if result[8] else None,
                "expiry_date": str(expiry_date) if expiry_date else None,
                "quality_status": result[10],
                "reference_type": result[11],
                "reference_id": result[12],
                "created_at": str(result[13]) if result[13] else None,
                "created_by": result[14]
            },
            "expiry_info": {
                "days_until_expiry": days_until_expiry,
                "expiry_status": expiry_status,
                "is_expired": expiry_status == "EXPIRED",
                "requires_action": expiry_status in ["EXPIRED", "EXPIRING_SOON"]
            },
            "transaction_summary": {
                "total_in": total_in,
                "total_out": total_out,
                "net_quantity": total_in - total_out,
                "transaction_count": len(transactions)
            },
            "transactions": transactions,
            "quality_inspections": inspections
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
