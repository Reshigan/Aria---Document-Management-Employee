from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class TaxLineCreate(BaseModel):
    invoice_id: int
    tax_code: str
    tax_rate: float
    taxable_amount: float
    tax_amount: float
    description: Optional[str] = None


@router.get("/invoice/{invoice_id}/tax-breakdown")
async def get_invoice_tax_breakdown(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed tax breakdown for an invoice"""
    try:
        company_id = current_user.get("company_id", "default")
        
        invoice_query = text("""
            SELECT 
                ci.invoice_number,
                ci.customer_id,
                c.name as customer_name,
                ci.subtotal,
                ci.tax_amount,
                ci.total_amount,
                ci.status
            FROM customer_invoices ci
            JOIN customers c ON ci.customer_id = c.id
            WHERE ci.id = :invoice_id AND ci.company_id = :company_id
        """)
        
        invoice_result = db.execute(invoice_query, {
            "invoice_id": invoice_id,
            "company_id": company_id
        }).fetchone()
        
        if not invoice_result:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        tax_query = text("""
            SELECT 
                cil.id as line_id,
                cil.product_id,
                p.name as product_name,
                cil.quantity,
                cil.unit_price,
                cil.line_total,
                cil.tax_code,
                cil.tax_rate,
                cil.tax_amount,
                cil.discount_percent,
                cil.discount_amount
            FROM customer_invoice_lines cil
            JOIN customer_invoices ci ON cil.customer_invoice_id = ci.id
            JOIN products p ON cil.product_id = p.id
            WHERE ci.id = :invoice_id AND ci.company_id = :company_id
            ORDER BY cil.line_number
        """)
        
        tax_result = db.execute(tax_query, {
            "invoice_id": invoice_id,
            "company_id": company_id
        })
        
        lines = []
        tax_summary = {}
        
        for row in tax_result.fetchall():
            line_data = {
                "line_id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "quantity": float(row[3]) if row[3] else 0,
                "unit_price": float(row[4]) if row[4] else 0,
                "line_total": float(row[5]) if row[5] else 0,
                "tax_code": row[6],
                "tax_rate": float(row[7]) if row[7] else 0,
                "tax_amount": float(row[8]) if row[8] else 0,
                "discount_percent": float(row[9]) if row[9] else 0,
                "discount_amount": float(row[10]) if row[10] else 0
            }
            lines.append(line_data)
            
            tax_code = row[6] or "NO_TAX"
            if tax_code not in tax_summary:
                tax_summary[tax_code] = {
                    "tax_code": tax_code,
                    "tax_rate": float(row[7]) if row[7] else 0,
                    "taxable_amount": 0,
                    "tax_amount": 0
                }
            
            tax_summary[tax_code]["taxable_amount"] += float(row[5]) if row[5] else 0
            tax_summary[tax_code]["tax_amount"] += float(row[8]) if row[8] else 0
        
        return {
            "invoice": {
                "invoice_number": invoice_result[0],
                "customer_id": invoice_result[1],
                "customer_name": invoice_result[2],
                "subtotal": float(invoice_result[3]) if invoice_result[3] else 0,
                "tax_amount": float(invoice_result[4]) if invoice_result[4] else 0,
                "total_amount": float(invoice_result[5]) if invoice_result[5] else 0,
                "status": invoice_result[6]
            },
            "lines": lines,
            "tax_summary": list(tax_summary.values())
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoice/{invoice_id}/discount-breakdown")
async def get_invoice_discount_breakdown(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed discount breakdown for an invoice"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                cil.id as line_id,
                cil.product_id,
                p.name as product_name,
                cil.quantity,
                cil.unit_price,
                cil.discount_percent,
                cil.discount_amount,
                cil.line_total,
                cil.line_total + COALESCE(cil.discount_amount, 0) as original_amount
            FROM customer_invoice_lines cil
            JOIN customer_invoices ci ON cil.customer_invoice_id = ci.id
            JOIN products p ON cil.product_id = p.id
            WHERE ci.id = :invoice_id 
                AND ci.company_id = :company_id
                AND (cil.discount_percent > 0 OR cil.discount_amount > 0)
            ORDER BY cil.line_number
        """)
        
        result = db.execute(query, {
            "invoice_id": invoice_id,
            "company_id": company_id
        })
        
        discounts = []
        total_discount = 0
        
        for row in result.fetchall():
            discount_amount = float(row[6]) if row[6] else 0
            total_discount += discount_amount
            
            discounts.append({
                "line_id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "quantity": float(row[3]) if row[3] else 0,
                "unit_price": float(row[4]) if row[4] else 0,
                "discount_percent": float(row[5]) if row[5] else 0,
                "discount_amount": discount_amount,
                "line_total": float(row[7]) if row[7] else 0,
                "original_amount": float(row[8]) if row[8] else 0
            })
        
        return {
            "discounts": discounts,
            "total_discount": total_discount
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/invoice-line/{line_id}/tax")
async def update_line_tax(
    line_id: int,
    tax_code: str,
    tax_rate: float,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update tax code and rate for an invoice line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            UPDATE customer_invoice_lines cil
            SET 
                tax_code = :tax_code,
                tax_rate = :tax_rate,
                tax_amount = line_total * :tax_rate / 100,
                updated_at = NOW()
            FROM customer_invoices ci
            WHERE cil.customer_invoice_id = ci.id
                AND cil.id = :line_id
                AND ci.company_id = :company_id
            RETURNING cil.tax_amount
        """)
        
        result = db.execute(query, {
            "line_id": line_id,
            "tax_code": tax_code,
            "tax_rate": tax_rate,
            "company_id": company_id
        })
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invoice line not found")
        
        recalc_query = text("""
            UPDATE customer_invoices ci
            SET 
                tax_amount = (
                    SELECT COALESCE(SUM(tax_amount), 0)
                    FROM customer_invoice_lines
                    WHERE customer_invoice_id = ci.id
                ),
                total_amount = subtotal + (
                    SELECT COALESCE(SUM(tax_amount), 0)
                    FROM customer_invoice_lines
                    WHERE customer_invoice_id = ci.id
                ),
                updated_at = NOW()
            WHERE ci.id = (
                SELECT customer_invoice_id 
                FROM customer_invoice_lines 
                WHERE id = :line_id
            ) AND ci.company_id = :company_id
        """)
        
        db.execute(recalc_query, {
            "line_id": line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "Tax updated successfully",
            "new_tax_amount": float(row[0]) if row[0] else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
