from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/three-way-match/{match_id}/variance-analysis")
async def get_three_way_match_variance_analysis(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed variance analysis for a 3-way match"""
    try:
        company_id = current_user.get("company_id", "default")
        
        match_query = text("""
            SELECT 
                twm.id,
                twm.purchase_order_id,
                po.po_number,
                twm.goods_receipt_id,
                gr.receipt_number,
                twm.ap_invoice_id,
                api.invoice_number,
                twm.product_id,
                p.product_code,
                p.name as product_name,
                twm.po_quantity,
                twm.po_unit_price,
                twm.gr_quantity,
                twm.invoice_quantity,
                twm.invoice_unit_price,
                twm.quantity_variance,
                twm.price_variance,
                twm.total_variance,
                twm.match_status,
                twm.variance_reason,
                twm.created_at
            FROM three_way_matches twm
            JOIN purchase_orders po ON twm.purchase_order_id = po.id
            JOIN goods_receipts gr ON twm.goods_receipt_id = gr.id
            JOIN ap_invoices api ON twm.ap_invoice_id = api.id
            JOIN products p ON twm.product_id = p.id
            WHERE twm.id = :match_id AND po.company_id = :company_id
        """)
        
        match_result = db.execute(match_query, {
            "match_id": match_id,
            "company_id": company_id
        }).fetchone()
        
        if not match_result:
            raise HTTPException(status_code=404, detail="3-way match not found")
        
        po_qty = float(match_result[10]) if match_result[10] else 0
        po_price = float(match_result[11]) if match_result[11] else 0
        gr_qty = float(match_result[12]) if match_result[12] else 0
        inv_qty = float(match_result[13]) if match_result[13] else 0
        inv_price = float(match_result[14]) if match_result[14] else 0
        
        po_gr_qty_variance = gr_qty - po_qty
        po_inv_qty_variance = inv_qty - po_qty
        gr_inv_qty_variance = inv_qty - gr_qty
        
        po_inv_price_variance = inv_price - po_price
        
        po_value = po_qty * po_price
        gr_value = gr_qty * po_price  # Use PO price for GR
        inv_value = inv_qty * inv_price
        
        po_gr_value_variance = gr_value - po_value
        po_inv_value_variance = inv_value - po_value
        gr_inv_value_variance = inv_value - gr_value
        
        qty_variance_pct = (po_inv_qty_variance / po_qty * 100) if po_qty > 0 else 0
        price_variance_pct = (po_inv_price_variance / po_price * 100) if po_price > 0 else 0
        value_variance_pct = (po_inv_value_variance / po_value * 100) if po_value > 0 else 0
        
        severity = "LOW"
        if abs(qty_variance_pct) > 10 or abs(price_variance_pct) > 10:
            severity = "HIGH"
        elif abs(qty_variance_pct) > 5 or abs(price_variance_pct) > 5:
            severity = "MEDIUM"
        
        tolerance_query = text("""
            SELECT 
                quantity_tolerance_percent,
                price_tolerance_percent,
                value_tolerance_amount
            FROM match_tolerance_settings
            WHERE company_id = :company_id
            LIMIT 1
        """)
        
        tolerance_result = db.execute(tolerance_query, {
            "company_id": company_id
        }).fetchone()
        
        qty_tolerance = float(tolerance_result[0]) if tolerance_result and tolerance_result[0] else 5.0
        price_tolerance = float(tolerance_result[1]) if tolerance_result and tolerance_result[1] else 5.0
        value_tolerance = float(tolerance_result[2]) if tolerance_result and tolerance_result[2] else 100.0
        
        within_tolerance = (
            abs(qty_variance_pct) <= qty_tolerance and
            abs(price_variance_pct) <= price_tolerance and
            abs(po_inv_value_variance) <= value_tolerance
        )
        
        return {
            "match": {
                "id": match_result[0],
                "purchase_order_id": match_result[1],
                "po_number": match_result[2],
                "goods_receipt_id": match_result[3],
                "receipt_number": match_result[4],
                "ap_invoice_id": match_result[5],
                "invoice_number": match_result[6],
                "product_id": match_result[7],
                "product_code": match_result[8],
                "product_name": match_result[9],
                "match_status": match_result[18],
                "variance_reason": match_result[19],
                "created_at": str(match_result[20]) if match_result[20] else None
            },
            "quantities": {
                "po_quantity": po_qty,
                "gr_quantity": gr_qty,
                "invoice_quantity": inv_qty,
                "po_gr_variance": po_gr_qty_variance,
                "po_invoice_variance": po_inv_qty_variance,
                "gr_invoice_variance": gr_inv_qty_variance
            },
            "prices": {
                "po_unit_price": po_price,
                "invoice_unit_price": inv_price,
                "price_variance": po_inv_price_variance,
                "price_variance_percent": price_variance_pct
            },
            "values": {
                "po_value": po_value,
                "gr_value": gr_value,
                "invoice_value": inv_value,
                "po_gr_value_variance": po_gr_value_variance,
                "po_invoice_value_variance": po_inv_value_variance,
                "gr_invoice_value_variance": gr_inv_value_variance,
                "value_variance_percent": value_variance_pct
            },
            "variance_analysis": {
                "quantity_variance_percent": qty_variance_pct,
                "price_variance_percent": price_variance_pct,
                "value_variance_percent": value_variance_pct,
                "severity": severity,
                "within_tolerance": within_tolerance
            },
            "tolerance_settings": {
                "quantity_tolerance_percent": qty_tolerance,
                "price_tolerance_percent": price_tolerance,
                "value_tolerance_amount": value_tolerance
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/three-way-match/{match_id}/approve-variance")
async def approve_variance(
    match_id: int,
    approval_notes: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve a 3-way match variance"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE three_way_matches twm
            SET 
                match_status = 'APPROVED',
                variance_reason = :approval_notes,
                approved_by = :approved_by,
                approved_at = NOW(),
                updated_at = NOW()
            FROM purchase_orders po
            WHERE twm.purchase_order_id = po.id
                AND twm.id = :match_id
                AND po.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "approval_notes": approval_notes,
            "approved_by": user_email,
            "match_id": match_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Variance approved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/three-way-match/{match_id}/reject-variance")
async def reject_variance(
    match_id: int,
    rejection_reason: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Reject a 3-way match variance"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE three_way_matches twm
            SET 
                match_status = 'REJECTED',
                variance_reason = :rejection_reason,
                rejected_by = :rejected_by,
                rejected_at = NOW(),
                updated_at = NOW()
            FROM purchase_orders po
            WHERE twm.purchase_order_id = po.id
                AND twm.id = :match_id
                AND po.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "rejection_reason": rejection_reason,
            "rejected_by": user_email,
            "match_id": match_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Variance rejected successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
