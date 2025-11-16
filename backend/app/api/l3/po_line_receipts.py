from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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


class POLineReceiptCreate(BaseModel):
    purchase_order_line_id: int
    goods_receipt_id: int
    quantity_received: float
    warehouse_id: int
    bin_location: Optional[str] = None
    lot_number: Optional[str] = None
    serial_number: Optional[str] = None
    quality_status: Optional[str] = "ACCEPTED"
    notes: Optional[str] = None


@router.get("/purchase-order/{po_id}/line-receipts")
async def get_po_line_receipts(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all line receipts for a purchase order with partial/over receipt tracking"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                pol.id as line_id,
                pol.product_id,
                p.name as product_name,
                pol.quantity as ordered_quantity,
                COALESCE(SUM(polr.quantity_received), 0) as total_received,
                pol.quantity - COALESCE(SUM(polr.quantity_received), 0) as quantity_remaining,
                CASE 
                    WHEN COALESCE(SUM(polr.quantity_received), 0) = 0 THEN 'NOT_RECEIVED'
                    WHEN COALESCE(SUM(polr.quantity_received), 0) < pol.quantity THEN 'PARTIAL'
                    WHEN COALESCE(SUM(polr.quantity_received), 0) = pol.quantity THEN 'COMPLETE'
                    WHEN COALESCE(SUM(polr.quantity_received), 0) > pol.quantity THEN 'OVER_RECEIVED'
                END as receipt_status,
                pol.unit_price,
                pol.line_total
            FROM purchase_order_lines pol
            JOIN purchase_orders po ON pol.purchase_order_id = po.id
            JOIN products p ON pol.product_id = p.id
            LEFT JOIN po_line_receipts polr ON pol.id = polr.purchase_order_line_id
            WHERE po.id = :po_id AND po.company_id = :company_id
            GROUP BY pol.id, p.name, pol.quantity, pol.unit_price, pol.line_total
            ORDER BY pol.line_number
        """)
        
        result = db.execute(query, {"po_id": po_id, "company_id": company_id})
        rows = result.fetchall()
        
        lines = []
        for row in rows:
            lines.append({
                "line_id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "ordered_quantity": float(row[3]) if row[3] else 0,
                "total_received": float(row[4]) if row[4] else 0,
                "quantity_remaining": float(row[5]) if row[5] else 0,
                "receipt_status": row[6],
                "unit_price": float(row[7]) if row[7] else 0,
                "line_total": float(row[8]) if row[8] else 0
            })
        
        return {"lines": lines}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/purchase-order-line/{line_id}/receipts")
async def get_line_receipt_history(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get receipt history for a specific PO line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                polr.id,
                polr.goods_receipt_id,
                gr.receipt_number,
                gr.receipt_date,
                polr.quantity_received,
                polr.warehouse_id,
                w.name as warehouse_name,
                polr.bin_location,
                polr.lot_number,
                polr.serial_number,
                polr.quality_status,
                polr.notes,
                polr.received_by,
                polr.received_at
            FROM po_line_receipts polr
            JOIN purchase_order_lines pol ON polr.purchase_order_line_id = pol.id
            JOIN purchase_orders po ON pol.purchase_order_id = po.id
            JOIN goods_receipts gr ON polr.goods_receipt_id = gr.id
            LEFT JOIN warehouses w ON polr.warehouse_id = w.id
            WHERE pol.id = :line_id AND po.company_id = :company_id
            ORDER BY polr.received_at DESC
        """)
        
        result = db.execute(query, {"line_id": line_id, "company_id": company_id})
        rows = result.fetchall()
        
        receipts = []
        for row in rows:
            receipts.append({
                "id": row[0],
                "goods_receipt_id": row[1],
                "receipt_number": row[2],
                "receipt_date": str(row[3]) if row[3] else None,
                "quantity_received": float(row[4]) if row[4] else 0,
                "warehouse_id": row[5],
                "warehouse_name": row[6],
                "bin_location": row[7],
                "lot_number": row[8],
                "serial_number": row[9],
                "quality_status": row[10],
                "notes": row[11],
                "received_by": row[12],
                "received_at": str(row[13]) if row[13] else None
            })
        
        return {"receipts": receipts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/purchase-order-line/{line_id}/receive")
async def create_line_receipt(
    line_id: int,
    receipt: POLineReceiptCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record a receipt for a PO line"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        check_query = text("""
            SELECT 
                pol.quantity,
                COALESCE(SUM(polr.quantity_received), 0) as total_received
            FROM purchase_order_lines pol
            JOIN purchase_orders po ON pol.purchase_order_id = po.id
            LEFT JOIN po_line_receipts polr ON pol.id = polr.purchase_order_line_id
            WHERE pol.id = :line_id AND po.company_id = :company_id
            GROUP BY pol.id, pol.quantity
        """)
        
        check_result = db.execute(check_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not check_result:
            raise HTTPException(status_code=404, detail="Purchase order line not found")
        
        ordered_qty = float(check_result[0]) if check_result[0] else 0
        total_received = float(check_result[1]) if check_result[1] else 0
        
        if total_received + receipt.quantity_received > ordered_qty:
            pass
        
        insert_query = text("""
            INSERT INTO po_line_receipts (
                purchase_order_line_id, goods_receipt_id, quantity_received,
                warehouse_id, bin_location, lot_number, serial_number,
                quality_status, notes, company_id, received_by, received_at
            ) VALUES (
                :line_id, :goods_receipt_id, :quantity_received,
                :warehouse_id, :bin_location, :lot_number, :serial_number,
                :quality_status, :notes, :company_id, :received_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "line_id": line_id,
            "goods_receipt_id": receipt.goods_receipt_id,
            "quantity_received": receipt.quantity_received,
            "warehouse_id": receipt.warehouse_id,
            "bin_location": receipt.bin_location,
            "lot_number": receipt.lot_number,
            "serial_number": receipt.serial_number,
            "quality_status": receipt.quality_status,
            "notes": receipt.notes,
            "company_id": company_id,
            "received_by": user_email
        })
        
        db.commit()
        receipt_id = result.fetchone()[0]
        
        return {
            "id": receipt_id,
            "message": "Receipt recorded successfully",
            "over_receipt": total_received + receipt.quantity_received > ordered_qty
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/line-receipt/{receipt_id}")
async def delete_line_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a line receipt"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM po_line_receipts polr
            USING purchase_order_lines pol, purchase_orders po
            WHERE polr.purchase_order_line_id = pol.id
                AND pol.purchase_order_id = po.id
                AND polr.id = :receipt_id
                AND po.company_id = :company_id
        """)
        
        db.execute(delete_query, {"receipt_id": receipt_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Receipt deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
