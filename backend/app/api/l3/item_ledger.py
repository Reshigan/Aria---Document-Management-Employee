from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime, date

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/product/{product_id}/ledger")
async def get_item_ledger(
    product_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete movement history for an item (Item Ledger)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["il.company_id = :company_id", "il.product_id = :product_id"]
        params = {"company_id": company_id, "product_id": product_id}
        
        if start_date:
            where_clauses.append("il.transaction_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("il.transaction_date <= :end_date")
            params["end_date"] = end_date
        
        if warehouse_id:
            where_clauses.append("il.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.document_type,
                il.document_number,
                il.document_id,
                il.warehouse_id,
                w.name as warehouse_name,
                il.bin_location,
                il.lot_number,
                il.serial_number,
                il.quantity_in,
                il.quantity_out,
                il.quantity_balance,
                il.unit_cost,
                il.total_cost,
                il.reference,
                il.notes,
                il.created_by,
                il.created_at
            FROM item_ledger_entries il
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            WHERE {where_clause}
            ORDER BY il.transaction_date DESC, il.created_at DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        entries = []
        for row in rows:
            entries.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "document_type": row[3],
                "document_number": row[4],
                "document_id": row[5],
                "warehouse_id": row[6],
                "warehouse_name": row[7],
                "bin_location": row[8],
                "lot_number": row[9],
                "serial_number": row[10],
                "quantity_in": float(row[11]) if row[11] else 0,
                "quantity_out": float(row[12]) if row[12] else 0,
                "quantity_balance": float(row[13]) if row[13] else 0,
                "unit_cost": float(row[14]) if row[14] else 0,
                "total_cost": float(row[15]) if row[15] else 0,
                "reference": row[16],
                "notes": row[17],
                "created_by": row[18],
                "created_at": str(row[19]) if row[19] else None
            })
        
        return {"entries": entries, "total_count": len(entries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/stock-summary")
async def get_stock_summary(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current stock summary by warehouse for a product"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                il.warehouse_id,
                w.name as warehouse_name,
                SUM(il.quantity_in - il.quantity_out) as current_stock,
                AVG(il.unit_cost) as avg_cost,
                MAX(il.transaction_date) as last_movement_date
            FROM item_ledger_entries il
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.product_id = :product_id AND il.company_id = :company_id
            GROUP BY il.warehouse_id, w.name
            HAVING SUM(il.quantity_in - il.quantity_out) != 0
            ORDER BY w.name
        """)
        
        result = db.execute(query, {"product_id": product_id, "company_id": company_id})
        rows = result.fetchall()
        
        summary = []
        total_stock = 0
        
        for row in rows:
            stock = float(row[2]) if row[2] else 0
            total_stock += stock
            
            summary.append({
                "warehouse_id": row[0],
                "warehouse_name": row[1],
                "current_stock": stock,
                "avg_cost": float(row[3]) if row[3] else 0,
                "last_movement_date": str(row[4]) if row[4] else None
            })
        
        return {
            "summary": summary,
            "total_stock": total_stock
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/warehouse/{warehouse_id}/movements")
async def get_warehouse_movements(
    warehouse_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    transaction_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all inventory movements for a warehouse"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["il.company_id = :company_id", "il.warehouse_id = :warehouse_id"]
        params = {"company_id": company_id, "warehouse_id": warehouse_id}
        
        if start_date:
            where_clauses.append("il.transaction_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("il.transaction_date <= :end_date")
            params["end_date"] = end_date
        
        if transaction_type:
            where_clauses.append("il.transaction_type = :transaction_type")
            params["transaction_type"] = transaction_type
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.product_id,
                p.name as product_name,
                il.quantity_in,
                il.quantity_out,
                il.document_type,
                il.document_number,
                il.reference,
                il.created_by
            FROM item_ledger_entries il
            JOIN products p ON il.product_id = p.id
            WHERE {where_clause}
            ORDER BY il.transaction_date DESC, il.created_at DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        movements = []
        for row in rows:
            movements.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "product_id": row[3],
                "product_name": row[4],
                "quantity_in": float(row[5]) if row[5] else 0,
                "quantity_out": float(row[6]) if row[6] else 0,
                "document_type": row[7],
                "document_number": row[8],
                "reference": row[9],
                "created_by": row[10]
            })
        
        return {"movements": movements, "total_count": len(movements)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
