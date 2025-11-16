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


@router.get("/product/{product_id}/bin-locations")
async def get_product_bin_locations(
    product_id: int,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all bin locations for a product"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["ist.product_id = :product_id", "ist.company_id = :company_id"]
        params = {"product_id": product_id, "company_id": company_id}
        
        if warehouse_id:
            where_clauses.append("ist.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                ist.warehouse_id,
                w.name as warehouse_name,
                ist.bin_location,
                ist.lot_number,
                SUM(ist.quantity_on_hand) as quantity,
                p.name as product_name,
                p.product_code
            FROM inventory_stock ist
            JOIN warehouses w ON ist.warehouse_id = w.id
            JOIN products p ON ist.product_id = p.id
            WHERE {where_clause}
            GROUP BY ist.warehouse_id, w.name, ist.bin_location, ist.lot_number, p.name, p.product_code
            HAVING SUM(ist.quantity_on_hand) > 0
            ORDER BY w.name, ist.bin_location, ist.lot_number
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        locations = []
        total_quantity = 0
        
        for row in rows:
            quantity = float(row[4]) if row[4] else 0
            total_quantity += quantity
            
            locations.append({
                "warehouse_id": row[0],
                "warehouse_name": row[1],
                "bin_location": row[2],
                "lot_number": row[3],
                "quantity": quantity,
                "product_name": row[5],
                "product_code": row[6]
            })
        
        return {
            "bin_locations": locations,
            "total_locations": len(locations),
            "total_quantity": total_quantity
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/lot-numbers")
async def get_product_lot_numbers(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lot numbers for a product with quantities"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ist.lot_number,
                SUM(ist.quantity_on_hand) as total_quantity,
                COUNT(DISTINCT ist.warehouse_id) as warehouse_count,
                MIN(ilt.manufacture_date) as manufacture_date,
                MIN(ilt.expiry_date) as expiry_date,
                CASE 
                    WHEN MIN(ilt.expiry_date) < CURRENT_DATE THEN true
                    ELSE false
                END as is_expired
            FROM inventory_stock ist
            LEFT JOIN inventory_lot_tracking ilt ON ist.lot_number = ilt.lot_number AND ist.product_id = ilt.product_id
            WHERE ist.product_id = :product_id 
                AND ist.company_id = :company_id
                AND ist.lot_number IS NOT NULL
            GROUP BY ist.lot_number
            HAVING SUM(ist.quantity_on_hand) > 0
            ORDER BY MIN(ilt.manufacture_date) DESC NULLS LAST
        """)
        
        result = db.execute(query, {"product_id": product_id, "company_id": company_id})
        rows = result.fetchall()
        
        lots = []
        total_quantity = 0
        expired_count = 0
        
        for row in rows:
            quantity = float(row[1]) if row[1] else 0
            total_quantity += quantity
            
            if row[5]:
                expired_count += 1
            
            lots.append({
                "lot_number": row[0],
                "total_quantity": quantity,
                "warehouse_count": row[2],
                "manufacture_date": str(row[3]) if row[3] else None,
                "expiry_date": str(row[4]) if row[4] else None,
                "is_expired": row[5]
            })
        
        return {
            "lot_numbers": lots,
            "total_lots": len(lots),
            "total_quantity": total_quantity,
            "expired_lots": expired_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/serial-numbers")
async def get_product_serial_numbers(
    product_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all serial numbers for a product"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["ist.product_id = :product_id", "ist.company_id = :company_id"]
        params = {"product_id": product_id, "company_id": company_id}
        
        if status:
            where_clauses.append("ist.status = :status")
            params["status"] = status
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                ist.serial_number,
                ist.warehouse_id,
                w.name as warehouse_name,
                ist.bin_location,
                ist.lot_number,
                ist.status,
                ist.received_date,
                ist.shipped_date,
                p.name as product_name,
                p.product_code
            FROM inventory_serial_tracking ist
            JOIN warehouses w ON ist.warehouse_id = w.id
            JOIN products p ON ist.product_id = p.id
            WHERE {where_clause}
            ORDER BY ist.received_date DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        serials = []
        for row in rows:
            serials.append({
                "serial_number": row[0],
                "warehouse_id": row[1],
                "warehouse_name": row[2],
                "bin_location": row[3],
                "lot_number": row[4],
                "status": row[5],
                "received_date": str(row[6]) if row[6] else None,
                "shipped_date": str(row[7]) if row[7] else None,
                "product_name": row[8],
                "product_code": row[9]
            })
        
        return {
            "serial_numbers": serials,
            "total_count": len(serials)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/serial-number/{serial_number}/history")
async def get_serial_number_history(
    serial_number: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get complete history for a serial number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ile.transaction_date,
                ile.transaction_type,
                ile.document_type,
                ile.document_number,
                ile.warehouse_id,
                w.name as warehouse_name,
                ile.bin_location,
                ile.quantity_in,
                ile.quantity_out,
                ile.created_by
            FROM item_ledger_entries ile
            LEFT JOIN warehouses w ON ile.warehouse_id = w.id
            WHERE ile.serial_number = :serial_number AND ile.company_id = :company_id
            ORDER BY ile.transaction_date DESC, ile.created_at DESC
        """)
        
        result = db.execute(query, {"serial_number": serial_number, "company_id": company_id})
        rows = result.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "transaction_date": str(row[0]) if row[0] else None,
                "transaction_type": row[1],
                "document_type": row[2],
                "document_number": row[3],
                "warehouse_id": row[4],
                "warehouse_name": row[5],
                "bin_location": row[6],
                "quantity_in": float(row[7]) if row[7] else 0,
                "quantity_out": float(row[8]) if row[8] else 0,
                "created_by": row[9]
            })
        
        return {
            "serial_number": serial_number,
            "history": history,
            "total_transactions": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lot-number/{lot_number}/details")
async def get_lot_number_details(
    lot_number: str,
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a lot number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        lot_query = text("""
            SELECT 
                ilt.manufacture_date,
                ilt.expiry_date,
                ilt.supplier_id,
                s.name as supplier_name,
                ilt.certificate_number,
                ilt.notes
            FROM inventory_lot_tracking ilt
            LEFT JOIN suppliers s ON ilt.supplier_id = s.id
            WHERE ilt.lot_number = :lot_number 
                AND ilt.product_id = :product_id
                AND ilt.company_id = :company_id
        """)
        
        lot_result = db.execute(lot_query, {
            "lot_number": lot_number,
            "product_id": product_id,
            "company_id": company_id
        }).fetchone()
        
        stock_query = text("""
            SELECT 
                ist.warehouse_id,
                w.name as warehouse_name,
                ist.bin_location,
                ist.quantity_on_hand
            FROM inventory_stock ist
            JOIN warehouses w ON ist.warehouse_id = w.id
            WHERE ist.lot_number = :lot_number 
                AND ist.product_id = :product_id
                AND ist.company_id = :company_id
                AND ist.quantity_on_hand > 0
            ORDER BY w.name, ist.bin_location
        """)
        
        stock_result = db.execute(stock_query, {
            "lot_number": lot_number,
            "product_id": product_id,
            "company_id": company_id
        })
        
        locations = []
        total_quantity = 0
        
        for row in stock_result.fetchall():
            quantity = float(row[3]) if row[3] else 0
            total_quantity += quantity
            
            locations.append({
                "warehouse_id": row[0],
                "warehouse_name": row[1],
                "bin_location": row[2],
                "quantity": quantity
            })
        
        lot_info = None
        if lot_result:
            lot_info = {
                "manufacture_date": str(lot_result[0]) if lot_result[0] else None,
                "expiry_date": str(lot_result[1]) if lot_result[1] else None,
                "supplier_id": lot_result[2],
                "supplier_name": lot_result[3],
                "certificate_number": lot_result[4],
                "notes": lot_result[5]
            }
        
        return {
            "lot_number": lot_number,
            "lot_info": lot_info,
            "locations": locations,
            "total_quantity": total_quantity
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/warehouse/{warehouse_id}/bin-utilization")
async def get_warehouse_bin_utilization(
    warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get bin utilization report for a warehouse"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ist.bin_location,
                COUNT(DISTINCT ist.product_id) as product_count,
                SUM(ist.quantity_on_hand) as total_quantity,
                COUNT(DISTINCT ist.lot_number) as lot_count
            FROM inventory_stock ist
            WHERE ist.warehouse_id = :warehouse_id 
                AND ist.company_id = :company_id
                AND ist.quantity_on_hand > 0
            GROUP BY ist.bin_location
            ORDER BY ist.bin_location
        """)
        
        result = db.execute(query, {"warehouse_id": warehouse_id, "company_id": company_id})
        rows = result.fetchall()
        
        bins = []
        for row in rows:
            bins.append({
                "bin_location": row[0],
                "product_count": row[1],
                "total_quantity": float(row[2]) if row[2] else 0,
                "lot_count": row[3] if row[3] else 0
            })
        
        return {
            "warehouse_id": warehouse_id,
            "bins": bins,
            "total_bins": len(bins)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expiring-lots")
async def get_expiring_lots(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get lots expiring within specified days"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                ilt.lot_number,
                ilt.product_id,
                p.name as product_name,
                p.product_code,
                ilt.expiry_date,
                SUM(ist.quantity_on_hand) as quantity,
                ilt.expiry_date - CURRENT_DATE as days_until_expiry
            FROM inventory_lot_tracking ilt
            JOIN products p ON ilt.product_id = p.id
            LEFT JOIN inventory_stock ist ON ilt.lot_number = ist.lot_number AND ilt.product_id = ist.product_id
            WHERE ilt.company_id = :company_id
                AND ilt.expiry_date IS NOT NULL
                AND ilt.expiry_date <= CURRENT_DATE + INTERVAL ':days days'
                AND ilt.expiry_date >= CURRENT_DATE
            GROUP BY ilt.lot_number, ilt.product_id, p.name, p.product_code, ilt.expiry_date
            HAVING SUM(ist.quantity_on_hand) > 0
            ORDER BY ilt.expiry_date
        """)
        
        result = db.execute(query, {"company_id": company_id, "days": days})
        rows = result.fetchall()
        
        expiring_lots = []
        for row in rows:
            expiring_lots.append({
                "lot_number": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "product_code": row[3],
                "expiry_date": str(row[4]) if row[4] else None,
                "quantity": float(row[5]) if row[5] else 0,
                "days_until_expiry": row[6]
            })
        
        return {
            "expiring_lots": expiring_lots,
            "total_count": len(expiring_lots)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
