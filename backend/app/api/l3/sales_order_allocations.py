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
        from core.database_pg import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class AllocationCreate(BaseModel):
    sales_order_line_id: int
    warehouse_id: int
    quantity_allocated: float
    bin_location: Optional[str] = None
    lot_number: Optional[str] = None
    serial_number: Optional[str] = None


@router.get("/sales-order/{order_id}/allocations")
async def get_sales_order_allocations(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all line allocations for a sales order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                sol.id as line_id,
                sol.product_id,
                p.name as product_name,
                sol.quantity,
                COALESCE(sol.quantity_delivered, 0) as quantity_delivered,
                COALESCE(SUM(sla.quantity_allocated), 0) as quantity_allocated,
                sol.quantity - COALESCE(SUM(sla.quantity_allocated), 0) as quantity_remaining
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            JOIN products p ON sol.product_id = p.id
            LEFT JOIN sales_line_allocations sla ON sol.id = sla.sales_order_line_id
            WHERE so.id = :order_id AND so.company_id = :company_id
            GROUP BY sol.id, p.name, sol.quantity, sol.quantity_delivered
            ORDER BY sol.line_number
        """)
        
        result = db.execute(query, {"order_id": order_id, "company_id": company_id})
        rows = result.fetchall()
        
        allocations = []
        for row in rows:
            allocations.append({
                "line_id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "quantity": float(row[3]) if row[3] else 0,
                "quantity_delivered": float(row[4]) if row[4] else 0,
                "quantity_allocated": float(row[5]) if row[5] else 0,
                "quantity_remaining": float(row[6]) if row[6] else 0
            })
        
        return {"allocations": allocations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sales-order-line/{line_id}/allocate")
async def create_allocation(
    line_id: int,
    allocation: AllocationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new allocation for a sales order line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO sales_line_allocations (
                sales_order_line_id, warehouse_id, quantity_allocated,
                bin_location, lot_number, serial_number,
                company_id, created_by, created_at
            ) VALUES (
                :line_id, :warehouse_id, :quantity_allocated,
                :bin_location, :lot_number, :serial_number,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "line_id": line_id,
            "warehouse_id": allocation.warehouse_id,
            "quantity_allocated": allocation.quantity_allocated,
            "bin_location": allocation.bin_location,
            "lot_number": allocation.lot_number,
            "serial_number": allocation.serial_number,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        allocation_id = result.fetchone()[0]
        
        return {"id": allocation_id, "message": "Allocation created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/allocation/{allocation_id}")
async def delete_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM sales_line_allocations
            WHERE id = :allocation_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"allocation_id": allocation_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Allocation deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
