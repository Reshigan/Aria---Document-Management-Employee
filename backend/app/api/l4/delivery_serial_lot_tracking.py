from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class SerialNumberAssignment(BaseModel):
    serial_number: str
    status: Optional[str] = "ACTIVE"
    warranty_expiry: Optional[str] = None


class LotNumberAssignment(BaseModel):
    lot_number: str
    quantity: float
    expiry_date: Optional[str] = None
    manufacture_date: Optional[str] = None


@router.get("/delivery-line/{line_id}/serial-lot-tracking")
async def get_delivery_line_tracking(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get serial/lot tracking details for a delivery line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                dl.id,
                dl.delivery_id,
                d.delivery_number,
                d.delivery_date,
                dl.product_id,
                p.product_code,
                p.name as product_name,
                p.tracking_type,
                dl.quantity,
                dl.warehouse_id,
                w.name as warehouse_name,
                d.sales_order_id,
                so.order_number
            FROM delivery_lines dl
            JOIN deliveries d ON dl.delivery_id = d.id
            JOIN products p ON dl.product_id = p.id
            LEFT JOIN warehouses w ON dl.warehouse_id = w.id
            LEFT JOIN sales_orders so ON d.sales_order_id = so.id
            WHERE dl.id = :line_id AND d.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Delivery line not found")
        
        tracking_type = line_result[7]
        
        serial_tracking = []
        if tracking_type in ['SERIAL', 'SERIAL_LOT']:
            serial_query = text("""
                SELECT 
                    ist.id,
                    ist.serial_number,
                    ist.status,
                    ist.warranty_expiry,
                    ist.last_transaction_date,
                    ist.current_location
                FROM inventory_serial_tracking ist
                WHERE ist.product_id = :product_id
                    AND ist.warehouse_id = :warehouse_id
                    AND ist.reference_type = 'DELIVERY_LINE'
                    AND ist.reference_id = :line_id
                    AND ist.company_id = :company_id
                ORDER BY ist.serial_number
            """)
            
            serial_result = db.execute(serial_query, {
                "product_id": line_result[4],
                "warehouse_id": line_result[9],
                "line_id": line_id,
                "company_id": company_id
            })
            
            for row in serial_result.fetchall():
                serial_tracking.append({
                    "id": row[0],
                    "serial_number": row[1],
                    "status": row[2],
                    "warranty_expiry": str(row[3]) if row[3] else None,
                    "last_transaction_date": str(row[4]) if row[4] else None,
                    "current_location": row[5]
                })
        
        lot_tracking = []
        if tracking_type in ['LOT', 'SERIAL_LOT']:
            lot_query = text("""
                SELECT 
                    ilt.id,
                    ilt.lot_number,
                    ilt.quantity_on_hand,
                    ilt.expiry_date,
                    ilt.manufacture_date,
                    ilt.quality_status
                FROM inventory_lot_tracking ilt
                WHERE ilt.product_id = :product_id
                    AND ilt.warehouse_id = :warehouse_id
                    AND ilt.reference_type = 'DELIVERY_LINE'
                    AND ilt.reference_id = :line_id
                    AND ilt.company_id = :company_id
                ORDER BY ilt.lot_number
            """)
            
            lot_result = db.execute(lot_query, {
                "product_id": line_result[4],
                "warehouse_id": line_result[9],
                "line_id": line_id,
                "company_id": company_id
            })
            
            for row in lot_result.fetchall():
                lot_tracking.append({
                    "id": row[0],
                    "lot_number": row[1],
                    "quantity": float(row[2]) if row[2] else 0,
                    "expiry_date": str(row[3]) if row[3] else None,
                    "manufacture_date": str(row[4]) if row[4] else None,
                    "quality_status": row[5]
                })
        
        return {
            "delivery_line": {
                "id": line_result[0],
                "delivery_id": line_result[1],
                "delivery_number": line_result[2],
                "delivery_date": str(line_result[3]) if line_result[3] else None,
                "product_id": line_result[4],
                "product_code": line_result[5],
                "product_name": line_result[6],
                "tracking_type": tracking_type,
                "quantity": float(line_result[8]) if line_result[8] else 0,
                "warehouse_id": line_result[9],
                "warehouse_name": line_result[10],
                "sales_order_id": line_result[11],
                "order_number": line_result[12]
            },
            "serial_tracking": serial_tracking,
            "lot_tracking": lot_tracking,
            "tracking_summary": {
                "total_serials": len(serial_tracking),
                "total_lots": len(lot_tracking),
                "total_tracked_quantity": sum(lot["quantity"] for lot in lot_tracking) if lot_tracking else len(serial_tracking)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delivery-line/{line_id}/assign-serial-numbers")
async def assign_serial_numbers(
    line_id: int,
    serial_numbers: List[SerialNumberAssignment],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Assign serial numbers to a delivery line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT 
                dl.product_id,
                dl.warehouse_id,
                dl.quantity,
                p.tracking_type
            FROM delivery_lines dl
            JOIN deliveries d ON dl.delivery_id = d.id
            JOIN products p ON dl.product_id = p.id
            WHERE dl.id = :line_id AND d.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Delivery line not found")
        
        if line_result[3] not in ['SERIAL', 'SERIAL_LOT']:
            raise HTTPException(status_code=400, detail="Product does not use serial number tracking")
        
        if len(serial_numbers) != int(line_result[2]):
            raise HTTPException(
                status_code=400,
                detail=f"Number of serial numbers ({len(serial_numbers)}) must match quantity ({line_result[2]})"
            )
        
        insert_query = text("""
            INSERT INTO inventory_serial_tracking (
                product_id, warehouse_id, serial_number,
                status, warranty_expiry, reference_type, reference_id,
                last_transaction_date, company_id, created_by, created_at
            ) VALUES (
                :product_id, :warehouse_id, :serial_number,
                :status, :warranty_expiry, 'DELIVERY_LINE', :line_id,
                CURRENT_DATE, :company_id, :created_by, NOW()
            )
        """)
        
        for sn in serial_numbers:
            db.execute(insert_query, {
                "product_id": line_result[0],
                "warehouse_id": line_result[1],
                "serial_number": sn.serial_number,
                "status": sn.status,
                "warranty_expiry": sn.warranty_expiry,
                "line_id": line_id,
                "company_id": company_id,
                "created_by": user_email
            })
        
        db.commit()
        
        return {
            "message": f"Successfully assigned {len(serial_numbers)} serial numbers",
            "serial_numbers": [sn.serial_number for sn in serial_numbers]
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delivery-line/{line_id}/assign-lot-numbers")
async def assign_lot_numbers(
    line_id: int,
    lot_numbers: List[LotNumberAssignment],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Assign lot numbers to a delivery line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT 
                dl.product_id,
                dl.warehouse_id,
                dl.quantity,
                p.tracking_type
            FROM delivery_lines dl
            JOIN deliveries d ON dl.delivery_id = d.id
            JOIN products p ON dl.product_id = p.id
            WHERE dl.id = :line_id AND d.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Delivery line not found")
        
        if line_result[3] not in ['LOT', 'SERIAL_LOT']:
            raise HTTPException(status_code=400, detail="Product does not use lot number tracking")
        
        total_lot_qty = sum(lot.quantity for lot in lot_numbers)
        if abs(total_lot_qty - float(line_result[2])) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Total lot quantity ({total_lot_qty}) must match line quantity ({line_result[2]})"
            )
        
        insert_query = text("""
            INSERT INTO inventory_lot_tracking (
                product_id, warehouse_id, lot_number,
                quantity_on_hand, expiry_date, manufacture_date,
                reference_type, reference_id, quality_status,
                company_id, created_by, created_at
            ) VALUES (
                :product_id, :warehouse_id, :lot_number,
                :quantity, :expiry_date, :manufacture_date,
                'DELIVERY_LINE', :line_id, 'APPROVED',
                :company_id, :created_by, NOW()
            )
        """)
        
        for lot in lot_numbers:
            db.execute(insert_query, {
                "product_id": line_result[0],
                "warehouse_id": line_result[1],
                "lot_number": lot.lot_number,
                "quantity": lot.quantity,
                "expiry_date": lot.expiry_date,
                "manufacture_date": lot.manufacture_date,
                "line_id": line_id,
                "company_id": company_id,
                "created_by": user_email
            })
        
        db.commit()
        
        return {
            "message": f"Successfully assigned {len(lot_numbers)} lot numbers",
            "lot_numbers": [lot.lot_number for lot in lot_numbers],
            "total_quantity": total_lot_qty
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/serial-number/{serial_number}/history")
async def get_serial_number_history(
    serial_number: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get transaction history for a specific serial number"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.reference_type,
                il.reference_id,
                p.product_code,
                p.name as product_name,
                w.name as warehouse_name,
                il.created_by
            FROM item_ledger il
            JOIN products p ON il.product_id = p.id
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.serial_number = :serial_number
                AND il.company_id = :company_id
            ORDER BY il.transaction_date DESC, il.created_at DESC
        """)
        
        result = db.execute(query, {
            "serial_number": serial_number,
            "company_id": company_id
        })
        
        history = []
        for row in result.fetchall():
            history.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "reference_type": row[3],
                "reference_id": row[4],
                "product_code": row[5],
                "product_name": row[6],
                "warehouse_name": row[7],
                "created_by": row[8]
            })
        
        return {"serial_number_history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
