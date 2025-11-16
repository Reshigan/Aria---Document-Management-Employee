from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/serial-number/{serial_id}/atomic-detail")
async def get_serial_number_atomic_detail(
    serial_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single serial number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                sn.id,
                sn.serial_number,
                sn.product_id,
                p.product_code,
                p.name as product_name,
                sn.status,
                sn.current_location_type,
                sn.current_location_id,
                sn.current_owner_type,
                sn.current_owner_id,
                sn.manufacture_date,
                sn.warranty_start_date,
                sn.warranty_end_date,
                sn.last_inspection_date,
                sn.next_inspection_date,
                sn.created_at,
                sn.created_by
            FROM serial_numbers sn
            JOIN products p ON sn.product_id = p.id
            WHERE sn.id = :serial_id AND sn.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "serial_id": serial_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Serial number not found")
        
        history_query = text("""
            SELECT 
                snt.id,
                snt.transaction_date,
                snt.transaction_type,
                snt.from_location_type,
                snt.from_location_id,
                snt.to_location_type,
                snt.to_location_id,
                snt.reference_type,
                snt.reference_id,
                snt.performed_by
            FROM serial_number_transactions snt
            WHERE snt.serial_number_id = :serial_id
                AND snt.company_id = :company_id
            ORDER BY snt.transaction_date DESC
        """)
        
        history_result = db.execute(history_query, {
            "serial_id": serial_id,
            "company_id": company_id
        })
        
        transaction_history = []
        for row in history_result.fetchall():
            transaction_history.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "from_location_type": row[3],
                "from_location_id": row[4],
                "to_location_type": row[5],
                "to_location_id": row[6],
                "reference_type": row[7],
                "reference_id": row[8],
                "performed_by": row[9]
            })
        
        inspections_query = text("""
            SELECT 
                qi.id,
                qi.inspection_number,
                qi.inspection_date,
                qi.overall_result,
                qi.inspector_id,
                e.first_name || ' ' || e.last_name as inspector_name
            FROM quality_inspections qi
            LEFT JOIN employees e ON qi.inspector_id = e.id
            WHERE qi.serial_number = :serial_number
                AND qi.company_id = :company_id
            ORDER BY qi.inspection_date DESC
        """)
        
        inspections_result = db.execute(inspections_query, {
            "serial_number": result[1],
            "company_id": company_id
        })
        
        inspections = []
        for row in inspections_result.fetchall():
            inspections.append({
                "id": row[0],
                "inspection_number": row[1],
                "inspection_date": str(row[2]) if row[2] else None,
                "overall_result": row[3],
                "inspector_id": row[4],
                "inspector_name": row[5]
            })
        
        claims_query = text("""
            SELECT 
                wc.id,
                wc.claim_number,
                wc.claim_date,
                wc.claim_reason,
                wc.claim_status,
                wc.resolution_date
            FROM warranty_claims wc
            WHERE wc.serial_number = :serial_number
                AND wc.company_id = :company_id
            ORDER BY wc.claim_date DESC
        """)
        
        claims_result = db.execute(claims_query, {
            "serial_number": result[1],
            "company_id": company_id
        })
        
        warranty_claims = []
        for row in claims_result.fetchall():
            warranty_claims.append({
                "id": row[0],
                "claim_number": row[1],
                "claim_date": str(row[2]) if row[2] else None,
                "claim_reason": row[3],
                "claim_status": row[4],
                "resolution_date": str(row[5]) if row[5] else None
            })
        
        warranty_end = result[12]
        is_under_warranty = False
        days_remaining = None
        
        if warranty_end:
            days_query = text("""
                SELECT EXTRACT(DAY FROM (:warranty_end - CURRENT_DATE))
            """)
            
            days_result = db.execute(days_query, {
                "warranty_end": warranty_end
            }).fetchone()
            
            days_remaining = int(days_result[0]) if days_result else 0
            is_under_warranty = days_remaining > 0
        
        return {
            "serial_number": {
                "id": result[0],
                "serial_number": result[1],
                "product_id": result[2],
                "product_code": result[3],
                "product_name": result[4],
                "status": result[5],
                "current_location_type": result[6],
                "current_location_id": result[7],
                "current_owner_type": result[8],
                "current_owner_id": result[9],
                "manufacture_date": str(result[10]) if result[10] else None,
                "warranty_start_date": str(result[11]) if result[11] else None,
                "warranty_end_date": str(result[12]) if result[12] else None,
                "last_inspection_date": str(result[13]) if result[13] else None,
                "next_inspection_date": str(result[14]) if result[14] else None,
                "created_at": str(result[15]) if result[15] else None,
                "created_by": result[16]
            },
            "warranty_status": {
                "is_under_warranty": is_under_warranty,
                "days_remaining": days_remaining,
                "total_claims": len(warranty_claims)
            },
            "transaction_history": transaction_history,
            "quality_inspections": inspections,
            "warranty_claims": warranty_claims,
            "lifecycle_summary": {
                "total_transactions": len(transaction_history),
                "total_inspections": len(inspections),
                "total_warranty_claims": len(warranty_claims)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
