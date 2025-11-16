from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from app.auth import get_db, get_current_user
except ImportError:
    try:
        from auth_integrated import get_db, get_current_user
    except ImportError:
        from app.database import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class AddressCreate(BaseModel):
    customer_id: int
    address_type: str  # BILLING, SHIPPING, BOTH
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str
    is_default: bool = False


@router.get("/customer/{customer_id}/addresses")
async def get_customer_addresses(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all addresses for a customer"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ca.id,
                ca.address_type,
                ca.address_line1,
                ca.address_line2,
                ca.city,
                ca.state_province,
                ca.postal_code,
                ca.country,
                ca.is_default,
                ca.is_active,
                ca.created_at,
                ca.updated_at
            FROM customer_addresses ca
            WHERE ca.customer_id = :customer_id AND ca.company_id = :company_id
            ORDER BY ca.is_default DESC, ca.created_at DESC
        """)
        
        result = db.execute(query, {"customer_id": customer_id, "company_id": company_id})
        rows = result.fetchall()
        
        addresses = []
        for row in rows:
            addresses.append({
                "id": row[0],
                "address_type": row[1],
                "address_line1": row[2],
                "address_line2": row[3],
                "city": row[4],
                "state_province": row[5],
                "postal_code": row[6],
                "country": row[7],
                "is_default": row[8],
                "is_active": row[9],
                "created_at": str(row[10]) if row[10] else None,
                "updated_at": str(row[11]) if row[11] else None
            })
        
        return {"addresses": addresses, "total_count": len(addresses)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/customer/{customer_id}/address")
async def create_customer_address(
    customer_id: int,
    address: AddressCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new address for a customer"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        if address.is_default:
            unset_query = text("""
                UPDATE customer_addresses
                SET is_default = false, updated_at = NOW()
                WHERE customer_id = :customer_id 
                    AND company_id = :company_id
                    AND address_type = :address_type
            """)
            
            db.execute(unset_query, {
                "customer_id": customer_id,
                "company_id": company_id,
                "address_type": address.address_type
            })
        
        insert_query = text("""
            INSERT INTO customer_addresses (
                customer_id, address_type, address_line1, address_line2,
                city, state_province, postal_code, country, is_default,
                company_id, created_by, created_at
            ) VALUES (
                :customer_id, :address_type, :address_line1, :address_line2,
                :city, :state_province, :postal_code, :country, :is_default,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "customer_id": customer_id,
            "address_type": address.address_type,
            "address_line1": address.address_line1,
            "address_line2": address.address_line2,
            "city": address.city,
            "state_province": address.state_province,
            "postal_code": address.postal_code,
            "country": address.country,
            "is_default": address.is_default,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        address_id = result.fetchone()[0]
        
        return {"id": address_id, "message": "Address created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/customer-address/{address_id}")
async def update_customer_address(
    address_id: int,
    address_line1: Optional[str] = None,
    address_line2: Optional[str] = None,
    city: Optional[str] = None,
    state_province: Optional[str] = None,
    postal_code: Optional[str] = None,
    country: Optional[str] = None,
    is_default: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a customer address"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if is_default:
            get_address_query = text("""
                SELECT customer_id, address_type
                FROM customer_addresses
                WHERE id = :address_id AND company_id = :company_id
            """)
            
            address_result = db.execute(get_address_query, {
                "address_id": address_id,
                "company_id": company_id
            }).fetchone()
            
            if address_result:
                unset_query = text("""
                    UPDATE customer_addresses
                    SET is_default = false, updated_at = NOW()
                    WHERE customer_id = :customer_id 
                        AND company_id = :company_id
                        AND address_type = :address_type
                        AND id != :address_id
                """)
                
                db.execute(unset_query, {
                    "customer_id": address_result[0],
                    "company_id": company_id,
                    "address_type": address_result[1],
                    "address_id": address_id
                })
        
        updates = []
        params = {"address_id": address_id, "company_id": company_id}
        
        if address_line1 is not None:
            updates.append("address_line1 = :address_line1")
            params["address_line1"] = address_line1
        
        if address_line2 is not None:
            updates.append("address_line2 = :address_line2")
            params["address_line2"] = address_line2
        
        if city is not None:
            updates.append("city = :city")
            params["city"] = city
        
        if state_province is not None:
            updates.append("state_province = :state_province")
            params["state_province"] = state_province
        
        if postal_code is not None:
            updates.append("postal_code = :postal_code")
            params["postal_code"] = postal_code
        
        if country is not None:
            updates.append("country = :country")
            params["country"] = country
        
        if is_default is not None:
            updates.append("is_default = :is_default")
            params["is_default"] = is_default
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE customer_addresses
            SET {update_clause}
            WHERE id = :address_id AND company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "Address updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/customer-address/{address_id}")
async def delete_customer_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a customer address (soft delete)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            UPDATE customer_addresses
            SET is_active = false, updated_at = NOW()
            WHERE id = :address_id AND company_id = :company_id
        """)
        
        db.execute(query, {"address_id": address_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Address deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supplier/{supplier_id}/addresses")
async def get_supplier_addresses(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all addresses for a supplier"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                sa.id,
                sa.address_type,
                sa.address_line1,
                sa.address_line2,
                sa.city,
                sa.state_province,
                sa.postal_code,
                sa.country,
                sa.is_default,
                sa.is_active
            FROM supplier_addresses sa
            WHERE sa.supplier_id = :supplier_id AND sa.company_id = :company_id
            ORDER BY sa.is_default DESC, sa.created_at DESC
        """)
        
        result = db.execute(query, {"supplier_id": supplier_id, "company_id": company_id})
        rows = result.fetchall()
        
        addresses = []
        for row in rows:
            addresses.append({
                "id": row[0],
                "address_type": row[1],
                "address_line1": row[2],
                "address_line2": row[3],
                "city": row[4],
                "state_province": row[5],
                "postal_code": row[6],
                "country": row[7],
                "is_default": row[8],
                "is_active": row[9]
            })
        
        return {"addresses": addresses, "total_count": len(addresses)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
