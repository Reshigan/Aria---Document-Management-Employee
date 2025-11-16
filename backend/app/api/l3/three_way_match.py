from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List

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


class ThreeWayMatchResult(BaseModel):
    purchase_order_line_id: int
    goods_receipt_line_id: Optional[int] = None
    invoice_line_id: Optional[int] = None
    match_status: str
    variance_quantity: float = 0
    variance_price: float = 0
    variance_amount: float = 0


@router.get("/purchase-order/{po_id}/three-way-match")
async def get_three_way_match(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Perform 3-way match between PO, Goods Receipt, and AP Invoice"""
    try:
        company_id = current_user.get("company_id", "default")
        
        po_query = text("""
            SELECT 
                po.po_number,
                po.supplier_id,
                s.name as supplier_name,
                po.total_amount,
                po.status
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = :po_id AND po.company_id = :company_id
        """)
        
        po_result = db.execute(po_query, {"po_id": po_id, "company_id": company_id}).fetchone()
        
        if not po_result:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        
        match_query = text("""
            SELECT 
                pol.id as po_line_id,
                pol.product_id,
                p.name as product_name,
                pol.quantity as po_quantity,
                pol.unit_price as po_unit_price,
                pol.line_total as po_line_total,
                
                COALESCE(SUM(grl.quantity), 0) as gr_quantity,
                COALESCE(AVG(grl.unit_price), pol.unit_price) as gr_unit_price,
                
                COALESCE(SUM(ail.quantity), 0) as invoice_quantity,
                COALESCE(AVG(ail.unit_price), pol.unit_price) as invoice_unit_price,
                COALESCE(SUM(ail.line_total), 0) as invoice_line_total,
                
                pol.quantity - COALESCE(SUM(grl.quantity), 0) as qty_variance_gr,
                pol.quantity - COALESCE(SUM(ail.quantity), 0) as qty_variance_invoice,
                pol.unit_price - COALESCE(AVG(grl.unit_price), pol.unit_price) as price_variance_gr,
                pol.unit_price - COALESCE(AVG(ail.unit_price), pol.unit_price) as price_variance_invoice,
                
                CASE 
                    WHEN COALESCE(SUM(grl.quantity), 0) = 0 THEN 'NO_RECEIPT'
                    WHEN COALESCE(SUM(ail.quantity), 0) = 0 THEN 'NO_INVOICE'
                    WHEN ABS(pol.quantity - COALESCE(SUM(grl.quantity), 0)) > 0.01 THEN 'QTY_MISMATCH_GR'
                    WHEN ABS(pol.quantity - COALESCE(SUM(ail.quantity), 0)) > 0.01 THEN 'QTY_MISMATCH_INVOICE'
                    WHEN ABS(pol.unit_price - COALESCE(AVG(ail.unit_price), pol.unit_price)) > 0.01 THEN 'PRICE_MISMATCH'
                    ELSE 'MATCHED'
                END as match_status
                
            FROM purchase_order_lines pol
            JOIN purchase_orders po ON pol.purchase_order_id = po.id
            JOIN products p ON pol.product_id = p.id
            LEFT JOIN goods_receipt_lines grl ON pol.id = grl.purchase_order_line_id
            LEFT JOIN goods_receipts gr ON grl.goods_receipt_id = gr.id AND gr.purchase_order_id = po.id
            LEFT JOIN ap_invoice_lines ail ON pol.id = ail.purchase_order_line_id
            LEFT JOIN ap_invoices ai ON ail.ap_invoice_id = ai.id AND ai.purchase_order_id = po.id
            WHERE po.id = :po_id AND po.company_id = :company_id
            GROUP BY pol.id, p.name, pol.quantity, pol.unit_price, pol.line_total
            ORDER BY pol.line_number
        """)
        
        result = db.execute(match_query, {"po_id": po_id, "company_id": company_id})
        rows = result.fetchall()
        
        matches = []
        total_variance = 0
        
        for row in rows:
            qty_variance = float(row[12]) if row[12] else 0
            price_variance = float(row[14]) if row[14] else 0
            amount_variance = qty_variance * float(row[4]) if row[4] else 0 + price_variance * float(row[3]) if row[3] else 0
            total_variance += amount_variance
            
            matches.append({
                "po_line_id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "po_quantity": float(row[3]) if row[3] else 0,
                "po_unit_price": float(row[4]) if row[4] else 0,
                "po_line_total": float(row[5]) if row[5] else 0,
                "gr_quantity": float(row[6]) if row[6] else 0,
                "gr_unit_price": float(row[7]) if row[7] else 0,
                "invoice_quantity": float(row[8]) if row[8] else 0,
                "invoice_unit_price": float(row[9]) if row[9] else 0,
                "invoice_line_total": float(row[10]) if row[10] else 0,
                "qty_variance_gr": float(row[11]) if row[11] else 0,
                "qty_variance_invoice": float(row[12]) if row[12] else 0,
                "price_variance_gr": float(row[13]) if row[13] else 0,
                "price_variance_invoice": float(row[14]) if row[14] else 0,
                "match_status": row[15]
            })
        
        matched_count = sum(1 for m in matches if m["match_status"] == "MATCHED")
        mismatch_count = len(matches) - matched_count
        
        return {
            "purchase_order": {
                "po_number": po_result[0],
                "supplier_id": po_result[1],
                "supplier_name": po_result[2],
                "total_amount": float(po_result[3]) if po_result[3] else 0,
                "status": po_result[4]
            },
            "matches": matches,
            "summary": {
                "total_lines": len(matches),
                "matched_lines": matched_count,
                "mismatch_lines": mismatch_count,
                "total_variance": total_variance,
                "match_percentage": (matched_count / len(matches) * 100) if matches else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/three-way-match/exceptions")
async def get_match_exceptions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all 3-way match exceptions across all POs"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                po.id as po_id,
                po.po_number,
                po.supplier_id,
                s.name as supplier_name,
                pol.id as po_line_id,
                pol.product_id,
                p.name as product_name,
                pol.quantity as po_quantity,
                COALESCE(SUM(grl.quantity), 0) as gr_quantity,
                COALESCE(SUM(ail.quantity), 0) as invoice_quantity,
                pol.unit_price as po_unit_price,
                COALESCE(AVG(ail.unit_price), pol.unit_price) as invoice_unit_price,
                CASE 
                    WHEN COALESCE(SUM(grl.quantity), 0) = 0 THEN 'NO_RECEIPT'
                    WHEN COALESCE(SUM(ail.quantity), 0) = 0 THEN 'NO_INVOICE'
                    WHEN ABS(pol.quantity - COALESCE(SUM(grl.quantity), 0)) > 0.01 THEN 'QTY_MISMATCH_GR'
                    WHEN ABS(pol.quantity - COALESCE(SUM(ail.quantity), 0)) > 0.01 THEN 'QTY_MISMATCH_INVOICE'
                    WHEN ABS(pol.unit_price - COALESCE(AVG(ail.unit_price), pol.unit_price)) > 0.01 THEN 'PRICE_MISMATCH'
                END as exception_type
            FROM purchase_order_lines pol
            JOIN purchase_orders po ON pol.purchase_order_id = po.id
            JOIN suppliers s ON po.supplier_id = s.id
            JOIN products p ON pol.product_id = p.id
            LEFT JOIN goods_receipt_lines grl ON pol.id = grl.purchase_order_line_id
            LEFT JOIN ap_invoice_lines ail ON pol.id = ail.purchase_order_line_id
            WHERE po.company_id = :company_id
                AND po.status IN ('APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED')
            GROUP BY po.id, po.po_number, s.name, pol.id, p.name, pol.quantity, pol.unit_price, po.supplier_id, pol.product_id
            HAVING 
                COALESCE(SUM(grl.quantity), 0) = 0
                OR COALESCE(SUM(ail.quantity), 0) = 0
                OR ABS(pol.quantity - COALESCE(SUM(grl.quantity), 0)) > 0.01
                OR ABS(pol.quantity - COALESCE(SUM(ail.quantity), 0)) > 0.01
                OR ABS(pol.unit_price - COALESCE(AVG(ail.unit_price), pol.unit_price)) > 0.01
            ORDER BY po.po_number, pol.line_number
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        exceptions = []
        for row in rows:
            exceptions.append({
                "po_id": row[0],
                "po_number": row[1],
                "supplier_id": row[2],
                "supplier_name": row[3],
                "po_line_id": row[4],
                "product_id": row[5],
                "product_name": row[6],
                "po_quantity": float(row[7]) if row[7] else 0,
                "gr_quantity": float(row[8]) if row[8] else 0,
                "invoice_quantity": float(row[9]) if row[9] else 0,
                "po_unit_price": float(row[10]) if row[10] else 0,
                "invoice_unit_price": float(row[11]) if row[11] else 0,
                "exception_type": row[12]
            })
        
        return {"exceptions": exceptions, "total_count": len(exceptions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/three-way-match/{po_id}/approve")
async def approve_three_way_match(
    po_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve 3-way match with variances"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO three_way_match_approvals (
                purchase_order_id, approved_by, approved_at, notes, company_id
            ) VALUES (
                :po_id, :approved_by, NOW(), :notes, :company_id
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "po_id": po_id,
            "approved_by": user_email,
            "notes": notes,
            "company_id": company_id
        })
        
        db.commit()
        approval_id = result.fetchone()[0]
        
        return {"id": approval_id, "message": "3-way match approved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
