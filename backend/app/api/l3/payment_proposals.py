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
        from app.database import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class PaymentProposalLineCreate(BaseModel):
    proposal_id: int
    ap_invoice_id: int
    payment_amount: float


@router.get("/payment-proposal/{proposal_id}/lines")
async def get_payment_proposal_lines(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lines for a payment proposal"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                pp.proposal_number,
                pp.proposal_date,
                pp.payment_date,
                pp.status,
                pp.notes
            FROM payment_proposals pp
            WHERE pp.id = :proposal_id AND pp.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "proposal_id": proposal_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Payment proposal not found")
        
        lines_query = text("""
            SELECT 
                ppl.id,
                ppl.line_number,
                ppl.ap_invoice_id,
                api.invoice_number,
                api.supplier_id,
                s.name as supplier_name,
                api.invoice_date,
                api.due_date,
                api.total_amount,
                api.amount_paid,
                ppl.payment_amount,
                api.currency,
                CASE 
                    WHEN api.due_date < CURRENT_DATE THEN true
                    ELSE false
                END as is_overdue,
                CURRENT_DATE - api.due_date as days_overdue
            FROM payment_proposal_lines ppl
            JOIN payment_proposals pp ON ppl.proposal_id = pp.id
            JOIN ap_invoices api ON ppl.ap_invoice_id = api.id
            JOIN suppliers s ON api.supplier_id = s.id
            WHERE pp.id = :proposal_id AND pp.company_id = :company_id
            ORDER BY ppl.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "proposal_id": proposal_id,
            "company_id": company_id
        })
        
        lines = []
        total_payment = 0
        overdue_count = 0
        
        for row in lines_result.fetchall():
            payment_amount = float(row[10]) if row[10] else 0
            total_payment += payment_amount
            
            if row[12]:
                overdue_count += 1
            
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "ap_invoice_id": row[2],
                "invoice_number": row[3],
                "supplier_id": row[4],
                "supplier_name": row[5],
                "invoice_date": str(row[6]) if row[6] else None,
                "due_date": str(row[7]) if row[7] else None,
                "invoice_total": float(row[8]) if row[8] else 0,
                "amount_paid": float(row[9]) if row[9] else 0,
                "payment_amount": payment_amount,
                "currency": row[11],
                "is_overdue": row[12],
                "days_overdue": row[13] if row[13] else 0
            })
        
        return {
            "proposal": {
                "proposal_number": header_result[0],
                "proposal_date": str(header_result[1]) if header_result[1] else None,
                "payment_date": str(header_result[2]) if header_result[2] else None,
                "status": header_result[3],
                "notes": header_result[4]
            },
            "lines": lines,
            "summary": {
                "total_lines": len(lines),
                "total_payment_amount": total_payment,
                "overdue_invoices": overdue_count
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment-proposal/{proposal_id}/line")
async def add_payment_proposal_line(
    proposal_id: int,
    line: PaymentProposalLineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to a payment proposal"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM payment_proposal_lines ppl
            JOIN payment_proposals pp ON ppl.proposal_id = pp.id
            WHERE pp.id = :proposal_id AND pp.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "proposal_id": proposal_id,
            "company_id": company_id
        }).fetchone()
        next_line = line_result[0] if line_result else 1
        
        invoice_query = text("""
            SELECT 
                api.total_amount,
                api.amount_paid
            FROM ap_invoices api
            WHERE api.id = :ap_invoice_id AND api.company_id = :company_id
        """)
        
        invoice_result = db.execute(invoice_query, {
            "ap_invoice_id": line.ap_invoice_id,
            "company_id": company_id
        }).fetchone()
        
        if not invoice_result:
            raise HTTPException(status_code=404, detail="AP invoice not found")
        
        total_amount = float(invoice_result[0]) if invoice_result[0] else 0
        amount_paid = float(invoice_result[1]) if invoice_result[1] else 0
        outstanding = total_amount - amount_paid
        
        if line.payment_amount > outstanding:
            raise HTTPException(
                status_code=400,
                detail=f"Payment amount ({line.payment_amount}) exceeds outstanding balance ({outstanding})"
            )
        
        insert_query = text("""
            INSERT INTO payment_proposal_lines (
                proposal_id, line_number, ap_invoice_id, payment_amount,
                company_id, created_by, created_at
            ) VALUES (
                :proposal_id, :line_number, :ap_invoice_id, :payment_amount,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "proposal_id": proposal_id,
            "line_number": next_line,
            "ap_invoice_id": line.ap_invoice_id,
            "payment_amount": line.payment_amount,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "Payment proposal line added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/payment-proposal-line/{line_id}")
async def delete_payment_proposal_line(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a payment proposal line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM payment_proposal_lines ppl
            USING payment_proposals pp
            WHERE ppl.proposal_id = pp.id
                AND ppl.id = :line_id
                AND pp.company_id = :company_id
        """)
        
        db.execute(delete_query, {"line_id": line_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Payment proposal line deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment-proposal/generate")
async def generate_payment_proposal(
    payment_date: str,
    include_overdue: bool = True,
    include_due_within_days: Optional[int] = 7,
    supplier_ids: Optional[List[int]] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate a payment proposal based on criteria"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        proposal_query = text("""
            INSERT INTO payment_proposals (
                proposal_number, proposal_date, payment_date, status,
                company_id, created_by, created_at
            ) VALUES (
                'PP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('payment_proposal_seq')::TEXT, 5, '0'),
                CURRENT_DATE, :payment_date, 'DRAFT',
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        db.execute(text("CREATE SEQUENCE IF NOT EXISTS payment_proposal_seq START 1"))
        
        proposal_result = db.execute(proposal_query, {
            "payment_date": payment_date,
            "company_id": company_id,
            "created_by": user_email
        })
        
        proposal_id = proposal_result.fetchone()[0]
        
        where_clauses = [
            "api.company_id = :company_id",
            "api.status = 'APPROVED'",
            "(api.total_amount - COALESCE(api.amount_paid, 0)) > 0"
        ]
        params = {"company_id": company_id}
        
        if include_overdue:
            where_clauses.append("api.due_date < CURRENT_DATE")
        
        if include_due_within_days:
            where_clauses.append(f"api.due_date <= CURRENT_DATE + INTERVAL '{include_due_within_days} days'")
        
        if supplier_ids:
            where_clauses.append("api.supplier_id = ANY(:supplier_ids)")
            params["supplier_ids"] = supplier_ids
        
        where_clause = " AND ".join(where_clauses)
        
        invoices_query = text(f"""
            SELECT 
                api.id,
                api.total_amount - COALESCE(api.amount_paid, 0) as outstanding
            FROM ap_invoices api
            WHERE {where_clause}
            ORDER BY api.due_date
        """)
        
        invoices_result = db.execute(invoices_query, params)
        
        line_number = 1
        for row in invoices_result.fetchall():
            line_query = text("""
                INSERT INTO payment_proposal_lines (
                    proposal_id, line_number, ap_invoice_id, payment_amount,
                    company_id, created_by, created_at
                ) VALUES (
                    :proposal_id, :line_number, :ap_invoice_id, :payment_amount,
                    :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(line_query, {
                "proposal_id": proposal_id,
                "line_number": line_number,
                "ap_invoice_id": row[0],
                "payment_amount": row[1],
                "company_id": company_id,
                "created_by": user_email
            })
            
            line_number += 1
        
        db.commit()
        
        return {
            "proposal_id": proposal_id,
            "lines_generated": line_number - 1,
            "message": "Payment proposal generated successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payment-proposal/{proposal_id}/approve")
async def approve_payment_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve a payment proposal"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE payment_proposals
            SET status = 'APPROVED', updated_at = NOW()
            WHERE id = :proposal_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"proposal_id": proposal_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Payment proposal approved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-proposals/by-supplier")
async def get_payment_proposals_by_supplier(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get payment proposals grouped by supplier"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                s.id as supplier_id,
                s.name as supplier_name,
                COUNT(DISTINCT ppl.id) as invoice_count,
                SUM(ppl.payment_amount) as total_payment
            FROM payment_proposal_lines ppl
            JOIN payment_proposals pp ON ppl.proposal_id = pp.id
            JOIN ap_invoices api ON ppl.ap_invoice_id = api.id
            JOIN suppliers s ON api.supplier_id = s.id
            WHERE pp.company_id = :company_id AND pp.status = 'APPROVED'
            GROUP BY s.id, s.name
            ORDER BY total_payment DESC
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        suppliers = []
        for row in rows:
            suppliers.append({
                "supplier_id": row[0],
                "supplier_name": row[1],
                "invoice_count": row[2],
                "total_payment": float(row[3]) if row[3] else 0
            })
        
        return {"suppliers": suppliers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
