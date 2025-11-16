from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/inventory-valuation")
async def get_inventory_valuation(
    as_of_date: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get inventory valuation summary"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["p.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if warehouse_id:
            where_clauses.append("il.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id
        
        if as_of_date:
            where_clauses.append("il.transaction_date <= :as_of_date")
            params["as_of_date"] = as_of_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                p.id as product_id,
                p.product_code,
                p.name as product_name,
                p.product_type,
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity
                        WHEN 'OUT' THEN -il.quantity
                        ELSE 0
                    END
                ), 0) as current_quantity,
                COALESCE(AVG(il.unit_cost), 0) as average_cost,
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity * il.unit_cost
                        WHEN 'OUT' THEN -il.quantity * il.unit_cost
                        ELSE 0
                    END
                ), 0) as total_value
            FROM products p
            LEFT JOIN item_ledger il ON p.id = il.product_id
            WHERE {where_clause}
            GROUP BY p.id, p.product_code, p.name, p.product_type
            HAVING COALESCE(SUM(
                CASE il.transaction_type
                    WHEN 'IN' THEN il.quantity
                    WHEN 'OUT' THEN -il.quantity
                    ELSE 0
                END
            ), 0) > 0
            ORDER BY total_value DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        valuation = []
        total_inventory_value = 0
        
        for row in rows:
            quantity = float(row[4]) if row[4] else 0
            avg_cost = float(row[5]) if row[5] else 0
            value = float(row[6]) if row[6] else 0
            
            total_inventory_value += value
            
            valuation.append({
                "product_id": row[0],
                "product_code": row[1],
                "product_name": row[2],
                "product_type": row[3],
                "current_quantity": quantity,
                "average_cost": avg_cost,
                "total_value": value
            })
        
        return {
            "inventory_valuation": valuation,
            "summary": {
                "total_products": len(valuation),
                "total_inventory_value": total_inventory_value
            },
            "as_of_date": as_of_date,
            "warehouse_id": warehouse_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/cost-layers")
async def get_product_cost_layers(
    product_id: int,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get cost layers for a product (FIFO/LIFO tracking)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["cl.product_id = :product_id", "p.company_id = :company_id", "cl.remaining_quantity > 0"]
        params = {"product_id": product_id, "company_id": company_id}
        
        if warehouse_id:
            where_clauses.append("cl.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                cl.id,
                cl.receipt_date,
                cl.receipt_reference,
                cl.original_quantity,
                cl.remaining_quantity,
                cl.unit_cost,
                cl.remaining_quantity * cl.unit_cost as layer_value,
                cl.warehouse_id,
                w.name as warehouse_name
            FROM cost_layers cl
            JOIN products p ON cl.product_id = p.id
            LEFT JOIN warehouses w ON cl.warehouse_id = w.id
            WHERE {where_clause}
            ORDER BY cl.receipt_date, cl.id
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        layers = []
        total_quantity = 0
        total_value = 0
        
        for row in rows:
            remaining_qty = float(row[4]) if row[4] else 0
            unit_cost = float(row[5]) if row[5] else 0
            layer_value = float(row[6]) if row[6] else 0
            
            total_quantity += remaining_qty
            total_value += layer_value
            
            layers.append({
                "id": row[0],
                "receipt_date": str(row[1]) if row[1] else None,
                "receipt_reference": row[2],
                "original_quantity": float(row[3]) if row[3] else 0,
                "remaining_quantity": remaining_qty,
                "unit_cost": unit_cost,
                "layer_value": layer_value,
                "warehouse_id": row[7],
                "warehouse_name": row[8]
            })
        
        return {
            "cost_layers": layers,
            "summary": {
                "total_layers": len(layers),
                "total_quantity": total_quantity,
                "total_value": total_value,
                "weighted_average_cost": (total_value / total_quantity) if total_quantity > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory-valuation/by-category")
async def get_inventory_valuation_by_category(
    as_of_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get inventory valuation grouped by product category"""
    try:
        company_id = current_user.get("company_id", "default")
        
        date_filter = ""
        params = {"company_id": company_id}
        
        if as_of_date:
            date_filter = "AND il.transaction_date <= :as_of_date"
            params["as_of_date"] = as_of_date
        
        query = text(f"""
            SELECT 
                p.category,
                COUNT(DISTINCT p.id) as product_count,
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity
                        WHEN 'OUT' THEN -il.quantity
                        ELSE 0
                    END
                ), 0) as total_quantity,
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity * il.unit_cost
                        WHEN 'OUT' THEN -il.quantity * il.unit_cost
                        ELSE 0
                    END
                ), 0) as total_value
            FROM products p
            LEFT JOIN item_ledger il ON p.id = il.product_id
            WHERE p.company_id = :company_id {date_filter}
            GROUP BY p.category
            ORDER BY total_value DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        by_category = []
        grand_total = 0
        
        for row in rows:
            value = float(row[3]) if row[3] else 0
            grand_total += value
            
            by_category.append({
                "category": row[0] or "Uncategorized",
                "product_count": row[1],
                "total_quantity": float(row[2]) if row[2] else 0,
                "total_value": value
            })
        
        return {
            "valuation_by_category": by_category,
            "grand_total_value": grand_total,
            "as_of_date": as_of_date
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory-valuation/by-warehouse")
async def get_inventory_valuation_by_warehouse(
    as_of_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get inventory valuation grouped by warehouse"""
    try:
        company_id = current_user.get("company_id", "default")
        
        date_filter = ""
        params = {"company_id": company_id}
        
        if as_of_date:
            date_filter = "AND il.transaction_date <= :as_of_date"
            params["as_of_date"] = as_of_date
        
        query = text(f"""
            SELECT 
                w.id as warehouse_id,
                w.name as warehouse_name,
                COUNT(DISTINCT il.product_id) as product_count,
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity
                        WHEN 'OUT' THEN -il.quantity
                        ELSE 0
                    END
                ), 0) as total_quantity,
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity * il.unit_cost
                        WHEN 'OUT' THEN -il.quantity * il.unit_cost
                        ELSE 0
                    END
                ), 0) as total_value
            FROM warehouses w
            LEFT JOIN item_ledger il ON w.id = il.warehouse_id
            LEFT JOIN products p ON il.product_id = p.id
            WHERE w.company_id = :company_id {date_filter}
            GROUP BY w.id, w.name
            ORDER BY total_value DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        by_warehouse = []
        grand_total = 0
        
        for row in rows:
            value = float(row[4]) if row[4] else 0
            grand_total += value
            
            by_warehouse.append({
                "warehouse_id": row[0],
                "warehouse_name": row[1],
                "product_count": row[2],
                "total_quantity": float(row[3]) if row[3] else 0,
                "total_value": value
            })
        
        return {
            "valuation_by_warehouse": by_warehouse,
            "grand_total_value": grand_total,
            "as_of_date": as_of_date
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory-valuation/aging")
async def get_inventory_aging(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get inventory aging analysis"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                p.id as product_id,
                p.product_code,
                p.name as product_name,
                cl.receipt_date,
                cl.remaining_quantity,
                cl.unit_cost,
                cl.remaining_quantity * cl.unit_cost as layer_value,
                EXTRACT(DAY FROM (CURRENT_DATE - cl.receipt_date)) as days_in_stock,
                CASE 
                    WHEN EXTRACT(DAY FROM (CURRENT_DATE - cl.receipt_date)) <= 30 THEN '0-30 days'
                    WHEN EXTRACT(DAY FROM (CURRENT_DATE - cl.receipt_date)) <= 60 THEN '31-60 days'
                    WHEN EXTRACT(DAY FROM (CURRENT_DATE - cl.receipt_date)) <= 90 THEN '61-90 days'
                    WHEN EXTRACT(DAY FROM (CURRENT_DATE - cl.receipt_date)) <= 180 THEN '91-180 days'
                    ELSE '180+ days'
                END as aging_bucket
            FROM cost_layers cl
            JOIN products p ON cl.product_id = p.id
            WHERE p.company_id = :company_id AND cl.remaining_quantity > 0
            ORDER BY cl.receipt_date
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        aging_data = []
        aging_summary = {
            "0-30 days": 0,
            "31-60 days": 0,
            "61-90 days": 0,
            "91-180 days": 0,
            "180+ days": 0
        }
        
        for row in rows:
            value = float(row[6]) if row[6] else 0
            bucket = row[8]
            
            aging_summary[bucket] += value
            
            aging_data.append({
                "product_id": row[0],
                "product_code": row[1],
                "product_name": row[2],
                "receipt_date": str(row[3]) if row[3] else None,
                "remaining_quantity": float(row[4]) if row[4] else 0,
                "unit_cost": float(row[5]) if row[5] else 0,
                "layer_value": value,
                "days_in_stock": int(row[7]) if row[7] else 0,
                "aging_bucket": bucket
            })
        
        return {
            "aging_detail": aging_data,
            "aging_summary": aging_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory-valuation/movement-analysis")
async def get_inventory_movement_analysis(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get inventory movement and valuation changes over a period"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                p.id as product_id,
                p.product_code,
                p.name as product_name,
                SUM(CASE WHEN il.transaction_type = 'IN' THEN il.quantity ELSE 0 END) as quantity_in,
                SUM(CASE WHEN il.transaction_type = 'OUT' THEN il.quantity ELSE 0 END) as quantity_out,
                SUM(CASE WHEN il.transaction_type = 'IN' THEN il.quantity * il.unit_cost ELSE 0 END) as value_in,
                SUM(CASE WHEN il.transaction_type = 'OUT' THEN il.quantity * il.unit_cost ELSE 0 END) as value_out,
                COUNT(*) as transaction_count
            FROM item_ledger il
            JOIN products p ON il.product_id = p.id
            WHERE p.company_id = :company_id
                AND il.transaction_date BETWEEN :start_date AND :end_date
            GROUP BY p.id, p.product_code, p.name
            ORDER BY value_in + value_out DESC
        """)
        
        result = db.execute(query, {
            "company_id": company_id,
            "start_date": start_date,
            "end_date": end_date
        })
        rows = result.fetchall()
        
        movement_data = []
        total_value_in = 0
        total_value_out = 0
        
        for row in rows:
            value_in = float(row[5]) if row[5] else 0
            value_out = float(row[6]) if row[6] else 0
            
            total_value_in += value_in
            total_value_out += value_out
            
            movement_data.append({
                "product_id": row[0],
                "product_code": row[1],
                "product_name": row[2],
                "quantity_in": float(row[3]) if row[3] else 0,
                "quantity_out": float(row[4]) if row[4] else 0,
                "value_in": value_in,
                "value_out": value_out,
                "net_value_change": value_in - value_out,
                "transaction_count": row[7]
            })
        
        return {
            "movement_analysis": movement_data,
            "summary": {
                "total_value_in": total_value_in,
                "total_value_out": total_value_out,
                "net_value_change": total_value_in - total_value_out
            },
            "period": {
                "start_date": start_date,
                "end_date": end_date
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
