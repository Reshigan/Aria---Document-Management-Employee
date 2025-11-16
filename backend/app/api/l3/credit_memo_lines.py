from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class CreditMemoLineCreate(BaseModel):
    credit_memo_id: int
    invoice_line_id: Optional[int] = None
    product_id: int
    description: Optional[str] = None
    quantity: float
    unit_price: float
    reason_code: str


@router.get("/credit-memo/{credit_memo_id}/lines")
async def get_credit_memo_lines(
    credit_memo_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lines for a credit memo"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                cm.memo_number,
                cm.memo_date,
                cm.customer_id,
                c.name as customer_name,
                cm.invoice_id,
                i.invoice_number,
                cm.status,
                cm.reason
            FROM credit_memos cm
            LEFT JOIN customers c ON cm.customer_id = c.id
            LEFT JOIN invoices i ON cm.invoice_id = i.id
            WHERE cm.id = :credit_memo_id AND cm.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "credit_memo_id": credit_memo_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Credit memo not found")
        
        lines_query = text("""
            SELECT 
                cml.id,
                cml.line_number,
                cml.product_id,
                p.name as product_name,
                p.product_code,
                cml.description,
                cml.quantity,
                cml.unit_price,
                cml.line_total,
                cml.reason_code,
                cml.invoice_line_id,
                il.line_number as original_invoice_line
            FROM credit_memo_lines cml
            JOIN credit_memos cm ON cml.credit_memo_id = cm.id
            JOIN products p ON cml.product_id = p.id
            LEFT JOIN invoice_lines il ON cml.invoice_line_id = il.id
            WHERE cm.id = :credit_memo_id AND cm.company_id = :company_id
            ORDER BY cml.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "credit_memo_id": credit_memo_id,
            "company_id": company_id
        })
        
        lines = []
        total_amount = 0
        
        for row in lines_result.fetchall():
            line_total = float(row[8]) if row[8] else 0
            total_amount += line_total
            
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "product_code": row[4],
                "description": row[5],
                "quantity": float(row[6]) if row[6] else 0,
                "unit_price": float(row[7]) if row[7] else 0,
                "line_total": line_total,
                "reason_code": row[9],
                "invoice_line_id": row[10],
                "original_invoice_line": row[11]
            })
        
        return {
            "credit_memo": {
                "memo_number": header_result[0],
                "memo_date": str(header_result[1]) if header_result[1] else None,
                "customer_id": header_result[2],
                "customer_name": header_result[3],
                "invoice_id": header_result[4],
                "invoice_number": header_result[5],
                "status": header_result[6],
                "reason": header_result[7]
            },
            "lines": lines,
            "total_amount": total_amount
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credit-memo/{credit_memo_id}/line")
async def add_credit_memo_line(
    credit_memo_id: int,
    line: CreditMemoLineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to a credit memo"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM credit_memo_lines cml
            JOIN credit_memos cm ON cml.credit_memo_id = cm.id
            WHERE cm.id = :credit_memo_id AND cm.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "credit_memo_id": credit_memo_id,
            "company_id": company_id
        }).fetchone()
        next_line = line_result[0] if line_result else 1
        
        line_total = line.quantity * line.unit_price
        
        insert_query = text("""
            INSERT INTO credit_memo_lines (
                credit_memo_id, line_number, product_id, description,
                quantity, unit_price, line_total, reason_code,
                invoice_line_id, company_id, created_by, created_at
            ) VALUES (
                :credit_memo_id, :line_number, :product_id, :description,
                :quantity, :unit_price, :line_total, :reason_code,
                :invoice_line_id, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "credit_memo_id": credit_memo_id,
            "line_number": next_line,
            "product_id": line.product_id,
            "description": line.description,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "line_total": line_total,
            "reason_code": line.reason_code,
            "invoice_line_id": line.invoice_line_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        update_query = text("""
            UPDATE credit_memos cm
            SET 
                total_amount = (
                    SELECT COALESCE(SUM(line_total), 0)
                    FROM credit_memo_lines
                    WHERE credit_memo_id = cm.id
                ),
                updated_at = NOW()
            WHERE cm.id = :credit_memo_id AND cm.company_id = :company_id
        """)
        
        db.execute(update_query, {"credit_memo_id": credit_memo_id, "company_id": company_id})
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "Credit memo line added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/credit-memo-line/{line_id}")
async def update_credit_memo_line(
    line_id: int,
    quantity: Optional[float] = None,
    unit_price: Optional[float] = None,
    reason_code: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a credit memo line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT cml.credit_memo_id, cml.quantity, cml.unit_price
            FROM credit_memo_lines cml
            JOIN credit_memos cm ON cml.credit_memo_id = cm.id
            WHERE cml.id = :line_id AND cm.company_id = :company_id
        """)
        
        memo_result = db.execute(get_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not memo_result:
            raise HTTPException(status_code=404, detail="Credit memo line not found")
        
        credit_memo_id = memo_result[0]
        current_qty = float(memo_result[1]) if memo_result[1] else 0
        current_price = float(memo_result[2]) if memo_result[2] else 0
        
        updates = []
        params = {"line_id": line_id, "company_id": company_id}
        
        new_qty = quantity if quantity is not None else current_qty
        new_price = unit_price if unit_price is not None else current_price
        
        if quantity is not None:
            updates.append("quantity = :quantity")
            params["quantity"] = quantity
        
        if unit_price is not None:
            updates.append("unit_price = :unit_price")
            params["unit_price"] = unit_price
        
        if reason_code is not None:
            updates.append("reason_code = :reason_code")
            params["reason_code"] = reason_code
        
        if quantity is not None or unit_price is not None:
            updates.append("line_total = :line_total")
            params["line_total"] = new_qty * new_price
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE credit_memo_lines cml
            SET {update_clause}
            FROM credit_memos cm
            WHERE cml.credit_memo_id = cm.id
                AND cml.id = :line_id
                AND cm.company_id = :company_id
        """)
        
        db.execute(query, params)
        
        update_total_query = text("""
            UPDATE credit_memos cm
            SET 
                total_amount = (
                    SELECT COALESCE(SUM(line_total), 0)
                    FROM credit_memo_lines
                    WHERE credit_memo_id = cm.id
                ),
                updated_at = NOW()
            WHERE cm.id = :credit_memo_id AND cm.company_id = :company_id
        """)
        
        db.execute(update_total_query, {"credit_memo_id": credit_memo_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Credit memo line updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/credit-memo-line/{line_id}")
async def delete_credit_memo_line(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a credit memo line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT cml.credit_memo_id
            FROM credit_memo_lines cml
            JOIN credit_memos cm ON cml.credit_memo_id = cm.id
            WHERE cml.id = :line_id AND cm.company_id = :company_id
        """)
        
        memo_result = db.execute(get_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not memo_result:
            raise HTTPException(status_code=404, detail="Credit memo line not found")
        
        credit_memo_id = memo_result[0]
        
        delete_query = text("""
            DELETE FROM credit_memo_lines cml
            USING credit_memos cm
            WHERE cml.credit_memo_id = cm.id
                AND cml.id = :line_id
                AND cm.company_id = :company_id
        """)
        
        db.execute(delete_query, {"line_id": line_id, "company_id": company_id})
        
        update_query = text("""
            UPDATE credit_memos cm
            SET 
                total_amount = (
                    SELECT COALESCE(SUM(line_total), 0)
                    FROM credit_memo_lines
                    WHERE credit_memo_id = cm.id
                ),
                updated_at = NOW()
            WHERE cm.id = :credit_memo_id AND cm.company_id = :company_id
        """)
        
        db.execute(update_query, {"credit_memo_id": credit_memo_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Credit memo line deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/credit-memo/{credit_memo_id}/reason-analysis")
async def get_credit_memo_reason_analysis(
    credit_memo_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get analysis of credit memo reasons"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                cml.reason_code,
                COUNT(*) as line_count,
                SUM(cml.quantity) as total_quantity,
                SUM(cml.line_total) as total_amount
            FROM credit_memo_lines cml
            JOIN credit_memos cm ON cml.credit_memo_id = cm.id
            WHERE cm.id = :credit_memo_id AND cm.company_id = :company_id
            GROUP BY cml.reason_code
            ORDER BY total_amount DESC
        """)
        
        result = db.execute(query, {"credit_memo_id": credit_memo_id, "company_id": company_id})
        rows = result.fetchall()
        
        analysis = []
        for row in rows:
            analysis.append({
                "reason_code": row[0],
                "line_count": row[1],
                "total_quantity": float(row[2]) if row[2] else 0,
                "total_amount": float(row[3]) if row[3] else 0
            })
        
        return {"reason_analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer/{customer_id}/credit-memo-history")
async def get_customer_credit_memo_history(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get credit memo history for a customer"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                cm.id,
                cm.memo_number,
                cm.memo_date,
                cm.total_amount,
                cm.status,
                cm.reason,
                COUNT(cml.id) as line_count
            FROM credit_memos cm
            LEFT JOIN credit_memo_lines cml ON cm.id = cml.credit_memo_id
            WHERE cm.customer_id = :customer_id AND cm.company_id = :company_id
            GROUP BY cm.id, cm.memo_number, cm.memo_date, cm.total_amount, cm.status, cm.reason
            ORDER BY cm.memo_date DESC
            LIMIT 50
        """)
        
        result = db.execute(query, {"customer_id": customer_id, "company_id": company_id})
        rows = result.fetchall()
        
        history = []
        total_credited = 0
        
        for row in rows:
            amount = float(row[3]) if row[3] else 0
            total_credited += amount
            
            history.append({
                "id": row[0],
                "memo_number": row[1],
                "memo_date": str(row[2]) if row[2] else None,
                "total_amount": amount,
                "status": row[4],
                "reason": row[5],
                "line_count": row[6]
            })
        
        return {
            "credit_memos": history,
            "total_count": len(history),
            "total_credited": total_credited
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
