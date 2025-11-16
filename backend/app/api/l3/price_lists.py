from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class PriceListEntryCreate(BaseModel):
    price_list_id: int
    product_id: int
    unit_price: float
    min_quantity: Optional[float] = 1
    max_quantity: Optional[float] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None


@router.get("/price-list/{price_list_id}/entries")
async def get_price_list_entries(
    price_list_id: int,
    product_id: Optional[int] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all entries for a price list"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["ple.company_id = :company_id", "pl.id = :price_list_id"]
        params = {"company_id": company_id, "price_list_id": price_list_id}
        
        if product_id:
            where_clauses.append("ple.product_id = :product_id")
            params["product_id"] = product_id
        
        if active_only:
            where_clauses.append("(ple.valid_from IS NULL OR ple.valid_from <= CURRENT_DATE)")
            where_clauses.append("(ple.valid_to IS NULL OR ple.valid_to >= CURRENT_DATE)")
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                ple.id,
                ple.product_id,
                p.name as product_name,
                p.product_code,
                ple.unit_price,
                ple.min_quantity,
                ple.max_quantity,
                ple.valid_from,
                ple.valid_to,
                ple.is_active,
                p.unit_cost,
                (ple.unit_price - p.unit_cost) / NULLIF(p.unit_cost, 0) * 100 as margin_percent
            FROM price_list_entries ple
            JOIN price_lists pl ON ple.price_list_id = pl.id
            JOIN products p ON ple.product_id = p.id
            WHERE {where_clause}
            ORDER BY p.name, ple.min_quantity
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        entries = []
        for row in rows:
            entries.append({
                "id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "product_code": row[3],
                "unit_price": float(row[4]) if row[4] else 0,
                "min_quantity": float(row[5]) if row[5] else 1,
                "max_quantity": float(row[6]) if row[6] else None,
                "valid_from": str(row[7]) if row[7] else None,
                "valid_to": str(row[8]) if row[8] else None,
                "is_active": row[9],
                "unit_cost": float(row[10]) if row[10] else 0,
                "margin_percent": float(row[11]) if row[11] else 0
            })
        
        return {"entries": entries, "total_count": len(entries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/price-list/{price_list_id}/entry")
async def create_price_list_entry(
    price_list_id: int,
    entry: PriceListEntryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add an entry to a price list"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        overlap_query = text("""
            SELECT id
            FROM price_list_entries
            WHERE price_list_id = :price_list_id
                AND product_id = :product_id
                AND company_id = :company_id
                AND (
                    (min_quantity <= :max_quantity OR :max_quantity IS NULL)
                    AND (max_quantity >= :min_quantity OR max_quantity IS NULL)
                )
                AND (
                    (valid_from <= :valid_to OR :valid_to IS NULL OR valid_from IS NULL)
                    AND (valid_to >= :valid_from OR :valid_from IS NULL OR valid_to IS NULL)
                )
            LIMIT 1
        """)
        
        overlap_result = db.execute(overlap_query, {
            "price_list_id": price_list_id,
            "product_id": entry.product_id,
            "company_id": company_id,
            "min_quantity": entry.min_quantity,
            "max_quantity": entry.max_quantity,
            "valid_from": entry.valid_from,
            "valid_to": entry.valid_to
        }).fetchone()
        
        if overlap_result:
            raise HTTPException(
                status_code=400,
                detail="Price list entry overlaps with existing entry"
            )
        
        insert_query = text("""
            INSERT INTO price_list_entries (
                price_list_id, product_id, unit_price, min_quantity,
                max_quantity, valid_from, valid_to, company_id,
                created_by, created_at
            ) VALUES (
                :price_list_id, :product_id, :unit_price, :min_quantity,
                :max_quantity, :valid_from, :valid_to, :company_id,
                :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "price_list_id": price_list_id,
            "product_id": entry.product_id,
            "unit_price": entry.unit_price,
            "min_quantity": entry.min_quantity,
            "max_quantity": entry.max_quantity,
            "valid_from": entry.valid_from,
            "valid_to": entry.valid_to,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        entry_id = result.fetchone()[0]
        
        return {"id": entry_id, "message": "Price list entry created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/price-list-entry/{entry_id}")
async def update_price_list_entry(
    entry_id: int,
    unit_price: Optional[float] = None,
    valid_from: Optional[str] = None,
    valid_to: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a price list entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        updates = []
        params = {"entry_id": entry_id, "company_id": company_id}
        
        if unit_price is not None:
            updates.append("unit_price = :unit_price")
            params["unit_price"] = unit_price
        
        if valid_from is not None:
            updates.append("valid_from = :valid_from")
            params["valid_from"] = valid_from
        
        if valid_to is not None:
            updates.append("valid_to = :valid_to")
            params["valid_to"] = valid_to
        
        if is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = is_active
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE price_list_entries
            SET {update_clause}
            WHERE id = :entry_id AND company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "Price list entry updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/price-list-entry/{entry_id}")
async def delete_price_list_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a price list entry"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM price_list_entries
            WHERE id = :entry_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"entry_id": entry_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Price list entry deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/price-for-customer")
async def get_product_price_for_customer(
    product_id: int,
    customer_id: int,
    quantity: float = 1,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get the applicable price for a product for a specific customer"""
    try:
        company_id = current_user.get("company_id", "default")
        
        if not date:
            date = str(__import__('datetime').date.today())
        
        customer_query = text("""
            SELECT price_list_id
            FROM customers
            WHERE id = :customer_id AND company_id = :company_id
        """)
        
        customer_result = db.execute(customer_query, {
            "customer_id": customer_id,
            "company_id": company_id
        }).fetchone()
        
        if not customer_result or not customer_result[0]:
            raise HTTPException(status_code=404, detail="Customer has no price list assigned")
        
        price_list_id = customer_result[0]
        
        price_query = text("""
            SELECT 
                ple.unit_price,
                ple.min_quantity,
                ple.max_quantity
            FROM price_list_entries ple
            WHERE ple.price_list_id = :price_list_id
                AND ple.product_id = :product_id
                AND ple.company_id = :company_id
                AND ple.is_active = true
                AND (ple.valid_from IS NULL OR ple.valid_from <= :date)
                AND (ple.valid_to IS NULL OR ple.valid_to >= :date)
                AND ple.min_quantity <= :quantity
                AND (ple.max_quantity IS NULL OR ple.max_quantity >= :quantity)
            ORDER BY ple.min_quantity DESC
            LIMIT 1
        """)
        
        price_result = db.execute(price_query, {
            "price_list_id": price_list_id,
            "product_id": product_id,
            "company_id": company_id,
            "date": date,
            "quantity": quantity
        }).fetchone()
        
        if not price_result:
            raise HTTPException(status_code=404, detail="No applicable price found")
        
        return {
            "unit_price": float(price_result[0]) if price_result[0] else 0,
            "min_quantity": float(price_result[1]) if price_result[1] else 1,
            "max_quantity": float(price_result[2]) if price_result[2] else None,
            "total_price": float(price_result[0]) * quantity if price_result[0] else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
