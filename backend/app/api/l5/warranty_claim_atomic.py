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


class WarrantyClaimUpdate(BaseModel):
    claim_status: str
    resolution_notes: str = None


@router.get("/warranty-claim/{claim_id}/atomic-detail")
async def get_warranty_claim_atomic_detail(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single warranty claim"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                wc.id,
                wc.claim_number,
                wc.claim_date,
                wc.serial_number,
                sn.product_id,
                p.product_code,
                p.name as product_name,
                wc.customer_id,
                c.name as customer_name,
                wc.claim_reason,
                wc.claim_description,
                wc.claim_status,
                wc.resolution_date,
                wc.resolution_notes,
                wc.parts_cost,
                wc.labor_cost,
                wc.total_cost,
                wc.created_by,
                wc.created_at
            FROM warranty_claims wc
            LEFT JOIN serial_numbers sn ON wc.serial_number = sn.serial_number AND wc.company_id = sn.company_id
            LEFT JOIN products p ON sn.product_id = p.id
            LEFT JOIN customers c ON wc.customer_id = c.id
            WHERE wc.id = :claim_id AND wc.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "claim_id": claim_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Warranty claim not found")
        
        serial_number = result[3]
        
        warranty_info = None
        if serial_number:
            warranty_query = text("""
                SELECT 
                    warranty_start_date,
                    warranty_end_date,
                    manufacture_date
                FROM serial_numbers
                WHERE serial_number = :serial_number
                    AND company_id = :company_id
            """)
            
            warranty_result = db.execute(warranty_query, {
                "serial_number": serial_number,
                "company_id": company_id
            }).fetchone()
            
            if warranty_result:
                warranty_info = {
                    "warranty_start_date": str(warranty_result[0]) if warranty_result[0] else None,
                    "warranty_end_date": str(warranty_result[1]) if warranty_result[1] else None,
                    "manufacture_date": str(warranty_result[2]) if warranty_result[2] else None
                }
        
        parts_query = text("""
            SELECT 
                wcp.id,
                wcp.product_id,
                p.product_code,
                p.name as product_name,
                wcp.quantity,
                wcp.unit_cost,
                wcp.total_cost
            FROM warranty_claim_parts wcp
            JOIN products p ON wcp.product_id = p.id
            WHERE wcp.warranty_claim_id = :claim_id
                AND wcp.company_id = :company_id
        """)
        
        parts_result = db.execute(parts_query, {
            "claim_id": claim_id,
            "company_id": company_id
        })
        
        parts_used = []
        for row in parts_result.fetchall():
            parts_used.append({
                "id": row[0],
                "product_id": row[1],
                "product_code": row[2],
                "product_name": row[3],
                "quantity": float(row[4]) if row[4] else 0,
                "unit_cost": float(row[5]) if row[5] else 0,
                "total_cost": float(row[6]) if row[6] else 0
            })
        
        labor_query = text("""
            SELECT 
                wcl.id,
                wcl.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                wcl.hours_worked,
                wcl.hourly_rate,
                wcl.total_cost,
                wcl.work_description
            FROM warranty_claim_labor wcl
            LEFT JOIN employees e ON wcl.employee_id = e.id
            WHERE wcl.warranty_claim_id = :claim_id
                AND wcl.company_id = :company_id
        """)
        
        labor_result = db.execute(labor_query, {
            "claim_id": claim_id,
            "company_id": company_id
        })
        
        labor_entries = []
        for row in labor_result.fetchall():
            labor_entries.append({
                "id": row[0],
                "employee_id": row[1],
                "employee_name": row[2],
                "hours_worked": float(row[3]) if row[3] else 0,
                "hourly_rate": float(row[4]) if row[4] else 0,
                "total_cost": float(row[5]) if row[5] else 0,
                "work_description": row[6]
            })
        
        related_claims_query = text("""
            SELECT 
                id,
                claim_number,
                claim_date,
                claim_reason,
                claim_status,
                total_cost
            FROM warranty_claims
            WHERE serial_number = :serial_number
                AND id != :claim_id
                AND company_id = :company_id
            ORDER BY claim_date DESC
        """)
        
        related_claims_result = db.execute(related_claims_query, {
            "serial_number": serial_number,
            "claim_id": claim_id,
            "company_id": company_id
        })
        
        related_claims = []
        for row in related_claims_result.fetchall():
            related_claims.append({
                "id": row[0],
                "claim_number": row[1],
                "claim_date": str(row[2]) if row[2] else None,
                "claim_reason": row[3],
                "claim_status": row[4],
                "total_cost": float(row[5]) if row[5] else 0
            })
        
        parts_cost = float(result[14]) if result[14] else 0
        labor_cost = float(result[15]) if result[15] else 0
        total_cost = float(result[16]) if result[16] else 0
        
        return {
            "warranty_claim": {
                "id": result[0],
                "claim_number": result[1],
                "claim_date": str(result[2]) if result[2] else None,
                "serial_number": serial_number,
                "product_id": result[4],
                "product_code": result[5],
                "product_name": result[6],
                "customer_id": result[7],
                "customer_name": result[8],
                "claim_reason": result[9],
                "claim_description": result[10],
                "claim_status": result[11],
                "resolution_date": str(result[12]) if result[12] else None,
                "resolution_notes": result[13],
                "parts_cost": parts_cost,
                "labor_cost": labor_cost,
                "total_cost": total_cost,
                "created_by": result[17],
                "created_at": str(result[18]) if result[18] else None
            },
            "warranty_info": warranty_info,
            "parts_used": parts_used,
            "labor_entries": labor_entries,
            "cost_breakdown": {
                "parts_percent": (parts_cost / total_cost * 100) if total_cost > 0 else 0,
                "labor_percent": (labor_cost / total_cost * 100) if total_cost > 0 else 0
            },
            "related_claims": related_claims,
            "claim_history_count": len(related_claims)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/warranty-claim/{claim_id}")
async def update_warranty_claim(
    claim_id: int,
    update_data: WarrantyClaimUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a warranty claim"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE warranty_claims
            SET 
                claim_status = :claim_status,
                resolution_notes = COALESCE(:resolution_notes, resolution_notes),
                resolution_date = CASE WHEN :claim_status = 'RESOLVED' THEN NOW() ELSE resolution_date END,
                updated_at = NOW()
            WHERE id = :claim_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "claim_status": update_data.claim_status,
            "resolution_notes": update_data.resolution_notes,
            "claim_id": claim_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Warranty claim updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
