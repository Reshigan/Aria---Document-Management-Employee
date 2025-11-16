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


class PickListLineUpdate(BaseModel):
    picked_quantity: float
    bin_location: Optional[str] = None
    lot_number: Optional[str] = None
    serial_number: Optional[str] = None


@router.get("/sales-order/{order_id}/pick-list")
async def get_pick_list(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get pick list for a sales order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                so.order_number,
                so.order_date,
                so.customer_id,
                c.name as customer_name,
                so.warehouse_id,
                w.name as warehouse_name,
                so.status
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            LEFT JOIN warehouses w ON so.warehouse_id = w.id
            WHERE so.id = :order_id AND so.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "order_id": order_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Sales order not found")
        
        lines_query = text("""
            SELECT 
                pll.id,
                pll.line_number,
                pll.product_id,
                p.name as product_name,
                p.product_code,
                pll.quantity_to_pick,
                pll.quantity_picked,
                pll.bin_location,
                pll.lot_number,
                pll.serial_number,
                pll.status,
                pll.picked_by,
                pll.picked_at,
                sol.unit_price
            FROM pick_list_lines pll
            JOIN sales_order_lines sol ON pll.sales_order_line_id = sol.id
            JOIN sales_orders so ON sol.sales_order_id = so.id
            JOIN products p ON pll.product_id = p.id
            WHERE so.id = :order_id AND so.company_id = :company_id
            ORDER BY pll.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "order_id": order_id,
            "company_id": company_id
        })
        
        lines = []
        total_to_pick = 0
        total_picked = 0
        
        for row in lines_result.fetchall():
            qty_to_pick = float(row[5]) if row[5] else 0
            qty_picked = float(row[6]) if row[6] else 0
            
            total_to_pick += qty_to_pick
            total_picked += qty_picked
            
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "product_code": row[4],
                "quantity_to_pick": qty_to_pick,
                "quantity_picked": qty_picked,
                "bin_location": row[7],
                "lot_number": row[8],
                "serial_number": row[9],
                "status": row[10],
                "picked_by": row[11],
                "picked_at": str(row[12]) if row[12] else None,
                "unit_price": float(row[13]) if row[13] else 0
            })
        
        return {
            "order": {
                "order_number": header_result[0],
                "order_date": str(header_result[1]) if header_result[1] else None,
                "customer_id": header_result[2],
                "customer_name": header_result[3],
                "warehouse_id": header_result[4],
                "warehouse_name": header_result[5],
                "status": header_result[6]
            },
            "pick_list_lines": lines,
            "summary": {
                "total_lines": len(lines),
                "total_quantity_to_pick": total_to_pick,
                "total_quantity_picked": total_picked,
                "pick_completion_percent": (total_picked / total_to_pick * 100) if total_to_pick > 0 else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sales-order/{order_id}/generate-pick-list")
async def generate_pick_list(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate pick list from sales order lines"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        check_query = text("""
            SELECT COUNT(*)
            FROM pick_list_lines pll
            JOIN sales_order_lines sol ON pll.sales_order_line_id = sol.id
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE so.id = :order_id AND so.company_id = :company_id
        """)
        
        existing = db.execute(check_query, {
            "order_id": order_id,
            "company_id": company_id
        }).fetchone()[0]
        
        if existing > 0:
            raise HTTPException(
                status_code=400,
                detail="Pick list already exists for this order"
            )
        
        lines_query = text("""
            SELECT 
                sol.id,
                sol.product_id,
                sol.quantity,
                sol.quantity_delivered,
                so.warehouse_id
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE so.id = :order_id AND so.company_id = :company_id
        """)
        
        lines_result = db.execute(lines_query, {
            "order_id": order_id,
            "company_id": company_id
        })
        
        line_number = 1
        for row in lines_result.fetchall():
            sol_id = row[0]
            product_id = row[1]
            quantity = float(row[2]) if row[2] else 0
            qty_delivered = float(row[3]) if row[3] else 0
            warehouse_id = row[4]
            
            qty_to_pick = quantity - qty_delivered
            
            if qty_to_pick <= 0:
                continue
            
            stock_query = text("""
                SELECT bin_location, lot_number
                FROM inventory_stock
                WHERE product_id = :product_id
                    AND warehouse_id = :warehouse_id
                    AND quantity_on_hand > 0
                    AND company_id = :company_id
                ORDER BY lot_number, bin_location
                LIMIT 1
            """)
            
            stock_result = db.execute(stock_query, {
                "product_id": product_id,
                "warehouse_id": warehouse_id,
                "company_id": company_id
            }).fetchone()
            
            bin_location = stock_result[0] if stock_result else None
            lot_number = stock_result[1] if stock_result else None
            
            insert_query = text("""
                INSERT INTO pick_list_lines (
                    sales_order_line_id, line_number, product_id,
                    quantity_to_pick, quantity_picked, bin_location,
                    lot_number, company_id, created_by, created_at
                ) VALUES (
                    :sol_id, :line_number, :product_id,
                    :quantity_to_pick, 0, :bin_location,
                    :lot_number, :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(insert_query, {
                "sol_id": sol_id,
                "line_number": line_number,
                "product_id": product_id,
                "quantity_to_pick": qty_to_pick,
                "bin_location": bin_location,
                "lot_number": lot_number,
                "company_id": company_id,
                "created_by": user_email
            })
            
            line_number += 1
        
        db.commit()
        
        return {"message": f"Pick list generated with {line_number - 1} lines"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/pick-list-line/{line_id}/pick")
async def record_pick(
    line_id: int,
    pick_data: PickListLineUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record picked quantity for a pick list line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE pick_list_lines pll
            SET 
                quantity_picked = :picked_quantity,
                bin_location = COALESCE(:bin_location, pll.bin_location),
                lot_number = COALESCE(:lot_number, pll.lot_number),
                serial_number = COALESCE(:serial_number, pll.serial_number),
                status = CASE 
                    WHEN :picked_quantity >= quantity_to_pick THEN 'PICKED'
                    WHEN :picked_quantity > 0 THEN 'PARTIAL'
                    ELSE 'PENDING'
                END,
                picked_by = :picked_by,
                picked_at = NOW(),
                updated_at = NOW()
            FROM sales_order_lines sol, sales_orders so
            WHERE pll.sales_order_line_id = sol.id
                AND sol.sales_order_id = so.id
                AND pll.id = :line_id
                AND so.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "picked_quantity": pick_data.picked_quantity,
            "bin_location": pick_data.bin_location,
            "lot_number": pick_data.lot_number,
            "serial_number": pick_data.serial_number,
            "picked_by": user_email,
            "line_id": line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Pick recorded successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/warehouse/{warehouse_id}/pick-lists")
async def get_warehouse_pick_lists(
    warehouse_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all pick lists for a warehouse"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["so.warehouse_id = :warehouse_id", "so.company_id = :company_id"]
        params = {"warehouse_id": warehouse_id, "company_id": company_id}
        
        if status:
            where_clauses.append("pll.status = :status")
            params["status"] = status
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                so.id,
                so.order_number,
                so.order_date,
                c.name as customer_name,
                COUNT(pll.id) as total_lines,
                SUM(CASE WHEN pll.status = 'PICKED' THEN 1 ELSE 0 END) as picked_lines,
                SUM(pll.quantity_to_pick) as total_quantity,
                SUM(pll.quantity_picked) as picked_quantity
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            JOIN sales_order_lines sol ON so.id = sol.sales_order_id
            JOIN pick_list_lines pll ON sol.id = pll.sales_order_line_id
            WHERE {where_clause}
            GROUP BY so.id, so.order_number, so.order_date, c.name
            ORDER BY so.order_date DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        pick_lists = []
        for row in rows:
            total_lines = row[4]
            picked_lines = row[5]
            
            pick_lists.append({
                "order_id": row[0],
                "order_number": row[1],
                "order_date": str(row[2]) if row[2] else None,
                "customer_name": row[3],
                "total_lines": total_lines,
                "picked_lines": picked_lines,
                "total_quantity": float(row[6]) if row[6] else 0,
                "picked_quantity": float(row[7]) if row[7] else 0,
                "completion_percent": (picked_lines / total_lines * 100) if total_lines > 0 else 0
            })
        
        return {"pick_lists": pick_lists, "total_count": len(pick_lists)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pick-list/{order_id}/complete")
async def complete_pick_list(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark pick list as complete and ready for packing"""
    try:
        company_id = current_user.get("company_id", "default")
        
        check_query = text("""
            SELECT COUNT(*)
            FROM pick_list_lines pll
            JOIN sales_order_lines sol ON pll.sales_order_line_id = sol.id
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE so.id = :order_id 
                AND so.company_id = :company_id
                AND pll.status != 'PICKED'
        """)
        
        unpicked = db.execute(check_query, {
            "order_id": order_id,
            "company_id": company_id
        }).fetchone()[0]
        
        if unpicked > 0:
            raise HTTPException(
                status_code=400,
                detail=f"{unpicked} lines have not been fully picked"
            )
        
        update_query = text("""
            UPDATE sales_orders
            SET status = 'READY_TO_PACK', updated_at = NOW()
            WHERE id = :order_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"order_id": order_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Pick list completed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
