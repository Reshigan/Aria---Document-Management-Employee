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


class QuoteLineCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float
    discount_percent: Optional[float] = 0


@router.post("/opportunity/{opportunity_id}/generate-quote")
async def generate_quote_from_opportunity(
    opportunity_id: int,
    valid_until: str,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate a quote from an opportunity"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        opp_query = text("""
            SELECT 
                o.customer_id,
                o.name,
                o.amount,
                o.probability
            FROM opportunities o
            WHERE o.id = :opportunity_id AND o.company_id = :company_id
        """)
        
        opp_result = db.execute(opp_query, {
            "opportunity_id": opportunity_id,
            "company_id": company_id
        }).fetchone()
        
        if not opp_result:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        customer_id = opp_result[0]
        opp_name = opp_result[1]
        
        quote_query = text("""
            INSERT INTO quotes (
                quote_number, quote_date, customer_id, valid_until,
                opportunity_id, notes, status,
                company_id, created_by, created_at
            ) VALUES (
                'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('quote_seq')::TEXT, 5, '0'),
                CURRENT_DATE, :customer_id, :valid_until,
                :opportunity_id, :notes, 'DRAFT',
                :company_id, :created_by, NOW()
            ) RETURNING id, quote_number
        """)
        
        db.execute(text("CREATE SEQUENCE IF NOT EXISTS quote_seq START 1"))
        
        quote_result = db.execute(quote_query, {
            "customer_id": customer_id,
            "valid_until": valid_until,
            "opportunity_id": opportunity_id,
            "notes": notes or f"Quote generated from opportunity: {opp_name}",
            "company_id": company_id,
            "created_by": user_email
        })
        
        quote_row = quote_result.fetchone()
        quote_id = quote_row[0]
        quote_number = quote_row[1]
        
        opp_products_query = text("""
            SELECT 
                op.product_id,
                op.quantity,
                op.unit_price
            FROM opportunity_products op
            WHERE op.opportunity_id = :opportunity_id AND op.company_id = :company_id
        """)
        
        opp_products_result = db.execute(opp_products_query, {
            "opportunity_id": opportunity_id,
            "company_id": company_id
        })
        
        line_number = 1
        for row in opp_products_result.fetchall():
            line_query = text("""
                INSERT INTO quote_lines (
                    quote_id, line_number, product_id, quantity,
                    unit_price, discount_percent, line_total,
                    company_id, created_by, created_at
                ) VALUES (
                    :quote_id, :line_number, :product_id, :quantity,
                    :unit_price, 0, :line_total,
                    :company_id, :created_by, NOW()
                )
            """)
            
            quantity = float(row[1]) if row[1] else 0
            unit_price = float(row[2]) if row[2] else 0
            line_total = quantity * unit_price
            
            db.execute(line_query, {
                "quote_id": quote_id,
                "line_number": line_number,
                "product_id": row[0],
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
                "company_id": company_id,
                "created_by": user_email
            })
            
            line_number += 1
        
        update_query = text("""
            UPDATE quotes
            SET total_amount = (
                SELECT COALESCE(SUM(line_total), 0)
                FROM quote_lines
                WHERE quote_id = :quote_id
            )
            WHERE id = :quote_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"quote_id": quote_id, "company_id": company_id})
        
        db.commit()
        
        return {
            "quote_id": quote_id,
            "quote_number": quote_number,
            "lines_generated": line_number - 1,
            "message": "Quote generated successfully from opportunity"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunity/{opportunity_id}/quote-history")
async def get_opportunity_quote_history(
    opportunity_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all quotes generated from an opportunity"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                q.id,
                q.quote_number,
                q.quote_date,
                q.valid_until,
                q.total_amount,
                q.status,
                COUNT(ql.id) as line_count
            FROM quotes q
            LEFT JOIN quote_lines ql ON q.id = ql.quote_id
            WHERE q.opportunity_id = :opportunity_id AND q.company_id = :company_id
            GROUP BY q.id, q.quote_number, q.quote_date, q.valid_until, q.total_amount, q.status
            ORDER BY q.quote_date DESC
        """)
        
        result = db.execute(query, {"opportunity_id": opportunity_id, "company_id": company_id})
        rows = result.fetchall()
        
        quotes = []
        for row in rows:
            quotes.append({
                "id": row[0],
                "quote_number": row[1],
                "quote_date": str(row[2]) if row[2] else None,
                "valid_until": str(row[3]) if row[3] else None,
                "total_amount": float(row[4]) if row[4] else 0,
                "status": row[5],
                "line_count": row[6] if row[6] else 0
            })
        
        return {
            "quotes": quotes,
            "total_count": len(quotes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quote/{quote_id}/add-line")
async def add_quote_line(
    quote_id: int,
    line: QuoteLineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to a quote"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM quote_lines
            WHERE quote_id = :quote_id
        """)
        
        line_result = db.execute(line_query, {"quote_id": quote_id}).fetchone()
        next_line = line_result[0] if line_result else 1
        
        discount_multiplier = 1 - (line.discount_percent / 100)
        line_total = line.quantity * line.unit_price * discount_multiplier
        
        insert_query = text("""
            INSERT INTO quote_lines (
                quote_id, line_number, product_id, quantity,
                unit_price, discount_percent, line_total,
                company_id, created_by, created_at
            ) VALUES (
                :quote_id, :line_number, :product_id, :quantity,
                :unit_price, :discount_percent, :line_total,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "quote_id": quote_id,
            "line_number": next_line,
            "product_id": line.product_id,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "discount_percent": line.discount_percent,
            "line_total": line_total,
            "company_id": company_id,
            "created_by": user_email
        })
        
        update_query = text("""
            UPDATE quotes
            SET 
                total_amount = (
                    SELECT COALESCE(SUM(line_total), 0)
                    FROM quote_lines
                    WHERE quote_id = :quote_id
                ),
                updated_at = NOW()
            WHERE id = :quote_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"quote_id": quote_id, "company_id": company_id})
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "Quote line added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quote/{quote_id}/convert-to-sales-order")
async def convert_quote_to_sales_order(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Convert a quote to a sales order"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        quote_query = text("""
            SELECT 
                q.customer_id,
                q.quote_number,
                q.notes,
                q.status
            FROM quotes q
            WHERE q.id = :quote_id AND q.company_id = :company_id
        """)
        
        quote_result = db.execute(quote_query, {
            "quote_id": quote_id,
            "company_id": company_id
        }).fetchone()
        
        if not quote_result:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        if quote_result[3] != "APPROVED":
            raise HTTPException(status_code=400, detail="Only approved quotes can be converted to sales orders")
        
        so_query = text("""
            INSERT INTO sales_orders (
                order_number, order_date, customer_id, status,
                notes, quote_id, company_id, created_by, created_at
            ) VALUES (
                'SO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('sales_order_seq')::TEXT, 5, '0'),
                CURRENT_DATE, :customer_id, 'PENDING',
                :notes, :quote_id, :company_id, :created_by, NOW()
            ) RETURNING id, order_number
        """)
        
        db.execute(text("CREATE SEQUENCE IF NOT EXISTS sales_order_seq START 1"))
        
        so_result = db.execute(so_query, {
            "customer_id": quote_result[0],
            "notes": f"Converted from quote {quote_result[1]}. {quote_result[2] or ''}",
            "quote_id": quote_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        so_row = so_result.fetchone()
        so_id = so_row[0]
        so_number = so_row[1]
        
        copy_lines_query = text("""
            INSERT INTO sales_order_lines (
                sales_order_id, line_number, product_id, quantity,
                unit_price, discount_percent, line_total,
                company_id, created_by, created_at
            )
            SELECT 
                :sales_order_id, line_number, product_id, quantity,
                unit_price, discount_percent, line_total,
                :company_id, :created_by, NOW()
            FROM quote_lines
            WHERE quote_id = :quote_id
        """)
        
        db.execute(copy_lines_query, {
            "sales_order_id": so_id,
            "quote_id": quote_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        update_so_query = text("""
            UPDATE sales_orders
            SET total_amount = (
                SELECT COALESCE(SUM(line_total), 0)
                FROM sales_order_lines
                WHERE sales_order_id = :sales_order_id
            )
            WHERE id = :sales_order_id AND company_id = :company_id
        """)
        
        db.execute(update_so_query, {"sales_order_id": so_id, "company_id": company_id})
        
        update_quote_query = text("""
            UPDATE quotes
            SET status = 'CONVERTED', updated_at = NOW()
            WHERE id = :quote_id AND company_id = :company_id
        """)
        
        db.execute(update_quote_query, {"quote_id": quote_id, "company_id": company_id})
        
        db.commit()
        
        return {
            "sales_order_id": so_id,
            "sales_order_number": so_number,
            "message": "Quote converted to sales order successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quote/{quote_id}/comparison")
async def get_quote_comparison(
    quote_id: int,
    compare_with_quote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Compare two quotes"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                q.id,
                q.quote_number,
                q.quote_date,
                q.total_amount,
                COUNT(ql.id) as line_count
            FROM quotes q
            LEFT JOIN quote_lines ql ON q.id = ql.quote_id
            WHERE q.id IN (:quote_id, :compare_with_quote_id) AND q.company_id = :company_id
            GROUP BY q.id, q.quote_number, q.quote_date, q.total_amount
        """)
        
        result = db.execute(query, {
            "quote_id": quote_id,
            "compare_with_quote_id": compare_with_quote_id,
            "company_id": company_id
        })
        
        quotes = {}
        for row in result.fetchall():
            quotes[row[0]] = {
                "quote_number": row[1],
                "quote_date": str(row[2]) if row[2] else None,
                "total_amount": float(row[3]) if row[3] else 0,
                "line_count": row[4] if row[4] else 0
            }
        
        if len(quotes) != 2:
            raise HTTPException(status_code=404, detail="One or both quotes not found")
        
        lines_query = text("""
            SELECT 
                p.id as product_id,
                p.name as product_name,
                ql1.quantity as qty1,
                ql1.unit_price as price1,
                ql1.line_total as total1,
                ql2.quantity as qty2,
                ql2.unit_price as price2,
                ql2.line_total as total2
            FROM products p
            LEFT JOIN quote_lines ql1 ON p.id = ql1.product_id AND ql1.quote_id = :quote_id
            LEFT JOIN quote_lines ql2 ON p.id = ql2.product_id AND ql2.quote_id = :compare_with_quote_id
            WHERE (ql1.id IS NOT NULL OR ql2.id IS NOT NULL)
            ORDER BY p.name
        """)
        
        lines_result = db.execute(lines_query, {
            "quote_id": quote_id,
            "compare_with_quote_id": compare_with_quote_id
        })
        
        line_comparison = []
        for row in lines_result.fetchall():
            line_comparison.append({
                "product_id": row[0],
                "product_name": row[1],
                "quote1": {
                    "quantity": float(row[2]) if row[2] else 0,
                    "unit_price": float(row[3]) if row[3] else 0,
                    "line_total": float(row[4]) if row[4] else 0
                },
                "quote2": {
                    "quantity": float(row[5]) if row[5] else 0,
                    "unit_price": float(row[6]) if row[6] else 0,
                    "line_total": float(row[7]) if row[7] else 0
                }
            })
        
        return {
            "quote1": quotes[quote_id],
            "quote2": quotes[compare_with_quote_id],
            "line_comparison": line_comparison,
            "total_difference": quotes[quote_id]["total_amount"] - quotes[compare_with_quote_id]["total_amount"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
