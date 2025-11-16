from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

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


class StatementLineMatch(BaseModel):
    statement_line_id: int
    transaction_type: str  # PAYMENT, RECEIPT, JOURNAL
    transaction_id: int
    matched_amount: float


@router.get("/bank-account/{account_id}/unmatched-transactions")
async def get_unmatched_transactions(
    account_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all unmatched bank statement transactions"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["bsl.company_id = :company_id", "bs.bank_account_id = :account_id", "bsl.match_status = 'UNMATCHED'"]
        params = {"company_id": company_id, "account_id": account_id}
        
        if start_date:
            where_clauses.append("bsl.transaction_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("bsl.transaction_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                bsl.id,
                bsl.transaction_date,
                bsl.description,
                bsl.reference,
                bsl.debit,
                bsl.credit,
                bsl.balance,
                bs.statement_number,
                bs.statement_date
            FROM bank_statement_lines bsl
            JOIN bank_statements bs ON bsl.bank_statement_id = bs.id
            WHERE {where_clause}
            ORDER BY bsl.transaction_date DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        unmatched = []
        for row in rows:
            unmatched.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "description": row[2],
                "reference": row[3],
                "debit": float(row[4]) if row[4] else 0,
                "credit": float(row[5]) if row[5] else 0,
                "balance": float(row[6]) if row[6] else 0,
                "statement_number": row[7],
                "statement_date": str(row[8]) if row[8] else None
            })
        
        return {"unmatched_transactions": unmatched, "total_count": len(unmatched)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bank-statement-line/{line_id}/match-suggestions")
async def get_match_suggestions(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get suggested matches for a bank statement line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                bsl.transaction_date,
                bsl.description,
                bsl.reference,
                bsl.debit,
                bsl.credit,
                bs.bank_account_id
            FROM bank_statement_lines bsl
            JOIN bank_statements bs ON bsl.bank_statement_id = bs.id
            WHERE bsl.id = :line_id AND bsl.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {"line_id": line_id, "company_id": company_id}).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Bank statement line not found")
        
        transaction_date = line_result[0]
        description = line_result[1]
        reference = line_result[2]
        debit = float(line_result[3]) if line_result[3] else 0
        credit = float(line_result[4]) if line_result[4] else 0
        amount = credit if credit > 0 else debit
        
        suggestions = []
        
        if credit > 0:
            payment_query = text("""
                SELECT 
                    cp.id,
                    'PAYMENT' as type,
                    cp.payment_number as reference,
                    cp.payment_date,
                    cp.amount,
                    c.name as party_name,
                    cp.payment_method,
                    ABS(cp.amount - :amount) as amount_diff
                FROM customer_payments cp
                JOIN customers c ON cp.customer_id = c.id
                WHERE cp.company_id = :company_id
                    AND cp.payment_date BETWEEN :date_from AND :date_to
                    AND ABS(cp.amount - :amount) < 1.0
                    AND cp.id NOT IN (
                        SELECT transaction_id 
                        FROM bank_statement_matches 
                        WHERE transaction_type = 'PAYMENT'
                    )
                ORDER BY amount_diff, cp.payment_date DESC
                LIMIT 10
            """)
            
            payment_result = db.execute(payment_query, {
                "company_id": company_id,
                "amount": amount,
                "date_from": str(transaction_date - __import__('datetime').timedelta(days=7)),
                "date_to": str(transaction_date + __import__('datetime').timedelta(days=7))
            })
            
            for row in payment_result.fetchall():
                suggestions.append({
                    "transaction_id": row[0],
                    "transaction_type": row[1],
                    "reference": row[2],
                    "transaction_date": str(row[3]) if row[3] else None,
                    "amount": float(row[4]) if row[4] else 0,
                    "party_name": row[5],
                    "payment_method": row[6],
                    "match_confidence": "HIGH" if float(row[7]) < 0.01 else "MEDIUM"
                })
        
        if debit > 0:
            supplier_payment_query = text("""
                SELECT 
                    sp.id,
                    'SUPPLIER_PAYMENT' as type,
                    sp.payment_number as reference,
                    sp.payment_date,
                    sp.amount,
                    s.name as party_name,
                    sp.payment_method,
                    ABS(sp.amount - :amount) as amount_diff
                FROM supplier_payments sp
                JOIN suppliers s ON sp.supplier_id = s.id
                WHERE sp.company_id = :company_id
                    AND sp.payment_date BETWEEN :date_from AND :date_to
                    AND ABS(sp.amount - :amount) < 1.0
                    AND sp.id NOT IN (
                        SELECT transaction_id 
                        FROM bank_statement_matches 
                        WHERE transaction_type = 'SUPPLIER_PAYMENT'
                    )
                ORDER BY amount_diff, sp.payment_date DESC
                LIMIT 10
            """)
            
            supplier_payment_result = db.execute(supplier_payment_query, {
                "company_id": company_id,
                "amount": amount,
                "date_from": str(transaction_date - __import__('datetime').timedelta(days=7)),
                "date_to": str(transaction_date + __import__('datetime').timedelta(days=7))
            })
            
            for row in supplier_payment_result.fetchall():
                suggestions.append({
                    "transaction_id": row[0],
                    "transaction_type": row[1],
                    "reference": row[2],
                    "transaction_date": str(row[3]) if row[3] else None,
                    "amount": float(row[4]) if row[4] else 0,
                    "party_name": row[5],
                    "payment_method": row[6],
                    "match_confidence": "HIGH" if float(row[7]) < 0.01 else "MEDIUM"
                })
        
        return {"suggestions": suggestions}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bank-statement-line/{line_id}/match")
async def match_statement_line(
    line_id: int,
    match: StatementLineMatch,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Match a bank statement line to a transaction"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO bank_statement_matches (
                statement_line_id, transaction_type, transaction_id,
                matched_amount, company_id, matched_by, matched_at
            ) VALUES (
                :statement_line_id, :transaction_type, :transaction_id,
                :matched_amount, :company_id, :matched_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "statement_line_id": line_id,
            "transaction_type": match.transaction_type,
            "transaction_id": match.transaction_id,
            "matched_amount": match.matched_amount,
            "company_id": company_id,
            "matched_by": user_email
        })
        
        update_query = text("""
            UPDATE bank_statement_lines
            SET match_status = 'MATCHED', updated_at = NOW()
            WHERE id = :line_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"line_id": line_id, "company_id": company_id})
        
        db.commit()
        match_id = result.fetchone()[0]
        
        return {"id": match_id, "message": "Statement line matched successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bank-statement-match/{match_id}")
async def unmatch_statement_line(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Unmatch a bank statement line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT statement_line_id
            FROM bank_statement_matches
            WHERE id = :match_id AND company_id = :company_id
        """)
        
        result = db.execute(get_query, {"match_id": match_id, "company_id": company_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Match not found")
        
        statement_line_id = result[0]
        
        delete_query = text("""
            DELETE FROM bank_statement_matches
            WHERE id = :match_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"match_id": match_id, "company_id": company_id})
        
        update_query = text("""
            UPDATE bank_statement_lines
            SET match_status = 'UNMATCHED', updated_at = NOW()
            WHERE id = :line_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"line_id": statement_line_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Statement line unmatched successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bank-account/{account_id}/reconciliation-status")
async def get_reconciliation_status(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get reconciliation status for a bank account"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                COUNT(*) as total_lines,
                COUNT(CASE WHEN bsl.match_status = 'MATCHED' THEN 1 END) as matched_lines,
                COUNT(CASE WHEN bsl.match_status = 'UNMATCHED' THEN 1 END) as unmatched_lines,
                COALESCE(SUM(CASE WHEN bsl.match_status = 'UNMATCHED' THEN bsl.debit ELSE 0 END), 0) as unmatched_debits,
                COALESCE(SUM(CASE WHEN bsl.match_status = 'UNMATCHED' THEN bsl.credit ELSE 0 END), 0) as unmatched_credits
            FROM bank_statement_lines bsl
            JOIN bank_statements bs ON bsl.bank_statement_id = bs.id
            WHERE bs.bank_account_id = :account_id AND bsl.company_id = :company_id
        """)
        
        result = db.execute(query, {"account_id": account_id, "company_id": company_id}).fetchone()
        
        total_lines = result[0] if result[0] else 0
        matched_lines = result[1] if result[1] else 0
        unmatched_lines = result[2] if result[2] else 0
        
        return {
            "total_lines": total_lines,
            "matched_lines": matched_lines,
            "unmatched_lines": unmatched_lines,
            "unmatched_debits": float(result[3]) if result[3] else 0,
            "unmatched_credits": float(result[4]) if result[4] else 0,
            "reconciliation_percentage": (matched_lines / total_lines * 100) if total_lines > 0 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
