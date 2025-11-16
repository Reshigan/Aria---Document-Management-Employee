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


class UoMConversionCreate(BaseModel):
    product_id: int
    from_uom: str
    to_uom: str
    conversion_factor: float
    is_default: bool = False


@router.get("/product/{product_id}/uom-conversions")
async def get_product_uom_conversions(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all UoM conversions for a product"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                uc.id,
                uc.from_uom,
                uc.to_uom,
                uc.conversion_factor,
                uc.is_default,
                uc.is_active
            FROM uom_conversions uc
            WHERE uc.product_id = :product_id AND uc.company_id = :company_id
            ORDER BY uc.is_default DESC, uc.from_uom, uc.to_uom
        """)
        
        result = db.execute(query, {"product_id": product_id, "company_id": company_id})
        rows = result.fetchall()
        
        conversions = []
        for row in rows:
            conversions.append({
                "id": row[0],
                "from_uom": row[1],
                "to_uom": row[2],
                "conversion_factor": float(row[3]) if row[3] else 1,
                "is_default": row[4],
                "is_active": row[5]
            })
        
        return {"conversions": conversions, "total_count": len(conversions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/product/{product_id}/uom-conversion")
async def create_uom_conversion(
    product_id: int,
    conversion: UoMConversionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a UoM conversion for a product"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        check_query = text("""
            SELECT id
            FROM uom_conversions
            WHERE product_id = :product_id
                AND from_uom = :from_uom
                AND to_uom = :to_uom
                AND company_id = :company_id
        """)
        
        existing = db.execute(check_query, {
            "product_id": product_id,
            "from_uom": conversion.from_uom,
            "to_uom": conversion.to_uom,
            "company_id": company_id
        }).fetchone()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="UoM conversion already exists for this product"
            )
        
        if conversion.is_default:
            unset_query = text("""
                UPDATE uom_conversions
                SET is_default = false, updated_at = NOW()
                WHERE product_id = :product_id AND company_id = :company_id
            """)
            
            db.execute(unset_query, {"product_id": product_id, "company_id": company_id})
        
        insert_query = text("""
            INSERT INTO uom_conversions (
                product_id, from_uom, to_uom, conversion_factor,
                is_default, company_id, created_by, created_at
            ) VALUES (
                :product_id, :from_uom, :to_uom, :conversion_factor,
                :is_default, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "product_id": product_id,
            "from_uom": conversion.from_uom,
            "to_uom": conversion.to_uom,
            "conversion_factor": conversion.conversion_factor,
            "is_default": conversion.is_default,
            "company_id": company_id,
            "created_by": user_email
        })
        
        reverse_insert_query = text("""
            INSERT INTO uom_conversions (
                product_id, from_uom, to_uom, conversion_factor,
                is_default, company_id, created_by, created_at
            ) VALUES (
                :product_id, :from_uom, :to_uom, :conversion_factor,
                false, :company_id, :created_by, NOW()
            )
        """)
        
        db.execute(reverse_insert_query, {
            "product_id": product_id,
            "from_uom": conversion.to_uom,
            "to_uom": conversion.from_uom,
            "conversion_factor": 1.0 / conversion.conversion_factor,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        conversion_id = result.fetchone()[0]
        
        return {"id": conversion_id, "message": "UoM conversion created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/uom-conversion/{conversion_id}")
async def update_uom_conversion(
    conversion_id: int,
    conversion_factor: Optional[float] = None,
    is_default: Optional[bool] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a UoM conversion"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if is_default:
            get_product_query = text("""
                SELECT product_id
                FROM uom_conversions
                WHERE id = :conversion_id AND company_id = :company_id
            """)
            
            product_result = db.execute(get_product_query, {
                "conversion_id": conversion_id,
                "company_id": company_id
            }).fetchone()
            
            if product_result:
                unset_query = text("""
                    UPDATE uom_conversions
                    SET is_default = false, updated_at = NOW()
                    WHERE product_id = :product_id 
                        AND company_id = :company_id
                        AND id != :conversion_id
                """)
                
                db.execute(unset_query, {
                    "product_id": product_result[0],
                    "company_id": company_id,
                    "conversion_id": conversion_id
                })
        
        updates = []
        params = {"conversion_id": conversion_id, "company_id": company_id}
        
        if conversion_factor is not None:
            updates.append("conversion_factor = :conversion_factor")
            params["conversion_factor"] = conversion_factor
        
        if is_default is not None:
            updates.append("is_default = :is_default")
            params["is_default"] = is_default
        
        if is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = is_active
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE uom_conversions
            SET {update_clause}
            WHERE id = :conversion_id AND company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "UoM conversion updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/uom-conversion/{conversion_id}")
async def delete_uom_conversion(
    conversion_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a UoM conversion"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM uom_conversions
            WHERE id = :conversion_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"conversion_id": conversion_id, "company_id": company_id})
        db.commit()
        
        return {"message": "UoM conversion deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/convert")
async def convert_quantity(
    product_id: int,
    from_uom: str,
    to_uom: str,
    quantity: float,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Convert a quantity from one UoM to another"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if from_uom == to_uom:
            return {
                "from_quantity": quantity,
                "from_uom": from_uom,
                "to_quantity": quantity,
                "to_uom": to_uom,
                "conversion_factor": 1.0
            }
        
        query = text("""
            SELECT conversion_factor
            FROM uom_conversions
            WHERE product_id = :product_id
                AND from_uom = :from_uom
                AND to_uom = :to_uom
                AND company_id = :company_id
                AND is_active = true
            LIMIT 1
        """)
        
        result = db.execute(query, {
            "product_id": product_id,
            "from_uom": from_uom,
            "to_uom": to_uom,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No conversion found from {from_uom} to {to_uom}"
            )
        
        conversion_factor = float(result[0]) if result[0] else 1
        converted_quantity = quantity * conversion_factor
        
        return {
            "from_quantity": quantity,
            "from_uom": from_uom,
            "to_quantity": converted_quantity,
            "to_uom": to_uom,
            "conversion_factor": conversion_factor
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/uom/list")
async def list_available_uoms(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get list of all available UoMs in the system"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT DISTINCT from_uom as uom
            FROM uom_conversions
            WHERE company_id = :company_id
            UNION
            SELECT DISTINCT to_uom as uom
            FROM uom_conversions
            WHERE company_id = :company_id
            ORDER BY uom
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        uoms = [row[0] for row in rows]
        
        return {"uoms": uoms, "total_count": len(uoms)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
