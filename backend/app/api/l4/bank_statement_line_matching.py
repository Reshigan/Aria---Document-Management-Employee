from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


class MatchTransaction(BaseModel):
    transaction_type: str  # PAYMENT, RECEIPT, TRANSFER
    transaction_id: int


@router.get("/bank-statement-line/{line_id}/matching-detail")
async def get_bank_statement_line_matching_detail(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed matching information for a bank statement line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                bsl.id,
                bsl.bank_statement_id,
                bs.statement_number,
                bs.statement_date,
                bs.bank_account_id,
                ba.account_name,
                ba.account_number,
                bsl.transaction_date,
                bsl.description,
                bsl.reference,
                bsl.debit_amount,
                bsl.credit_amount,
                bsl.balance,
                bsl.match_status,
                bsl.matched_transaction_type,
                bsl.matched_transaction_id,
                bsl.matched_by,
                bsl.matched_at
            FROM bank_statement_lines bsl
            JOIN bank_statements bs ON bsl.bank_statement_id = bs.id
            JOIN bank_accounts ba ON bs.bank_account_id = ba.id
            WHERE bsl.id = :line_id AND bs.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Bank statement line not found")
        
        matched_transaction = None
        if line_result[14] and line_result[15]:
            match_type = line_result[14]
            match_id = line_result[15]
            
            if match_type == "PAYMENT":
                match_query = text("""
                    SELECT 
                        cp.payment_number,
                        cp.payment_date,
                        cp.payment_amount,
                        cp.customer_id,
                        c.name as customer_name,
                        cp.payment_method
                    FROM customer_payments cp
                    JOIN customers c ON cp.customer_id = c.id
                    WHERE cp.id = :match_id AND cp.company_id = :company_id
                """)
                
                match_result = db.execute(match_query, {
                    "match_id": match_id,
                    "company_id": company_id
                }).fetchone()
                
                if match_result:
                    matched_transaction = {
                        "type": "PAYMENT",
                        "payment_number": match_result[0],
                        "payment_date": str(match_result[1]) if match_result[1] else None,
                        "amount": float(match_result[2]) if match_result[2] else 0,
                        "customer_id": match_result[3],
                        "customer_name": match_result[4],
                        "payment_method": match_result[5]
                    }
            
            elif match_type == "SUPPLIER_PAYMENT":
                match_query = text("""
                    SELECT 
                        sp.payment_number,
                        sp.payment_date,
                        sp.payment_amount,
                        sp.supplier_id,
                        s.name as supplier_name,
                        sp.payment_method
                    FROM supplier_payments sp
                    JOIN suppliers s ON sp.supplier_id = s.id
                    WHERE sp.id = :match_id AND sp.company_id = :company_id
                """)
                
                match_result = db.execute(match_query, {
                    "match_id": match_id,
                    "company_id": company_id
                }).fetchone()
                
                if match_result:
                    matched_transaction = {
                        "type": "SUPPLIER_PAYMENT",
                        "payment_number": match_result[0],
                        "payment_date": str(match_result[1]) if match_result[1] else None,
                        "amount": float(match_result[2]) if match_result[2] else 0,
                        "supplier_id": match_result[3],
                        "supplier_name": match_result[4],
                        "payment_method": match_result[5]
                    }
        
        amount = float(line_result[10]) if line_result[10] else float(line_result[11]) if line_result[11] else 0
        transaction_date = line_result[7]
        
        suggested_query = text("""
            SELECT 
                'PAYMENT' as type,
                cp.id,
                cp.payment_number as reference,
                cp.payment_date,
                cp.payment_amount,
                c.name as party_name
            FROM customer_payments cp
            JOIN customers c ON cp.customer_id = c.id
            WHERE cp.company_id = :company_id
                AND cp.payment_amount BETWEEN :amount * 0.95 AND :amount * 1.05
                AND cp.payment_date BETWEEN :transaction_date - INTERVAL '7 days' 
                    AND :transaction_date + INTERVAL '7 days'
                AND cp.id NOT IN (
                    SELECT matched_transaction_id 
                    FROM bank_statement_lines 
                    WHERE matched_transaction_type = 'PAYMENT'
                        AND match_status = 'MATCHED'
                )
            LIMIT 10
        """)
        
        suggested_result = db.execute(suggested_query, {
            "company_id": company_id,
            "amount": amount,
            "transaction_date": transaction_date
        })
        
        suggested_matches = []
        for row in suggested_result.fetchall():
            suggested_matches.append({
                "type": row[0],
                "id": row[1],
                "reference": row[2],
                "date": str(row[3]) if row[3] else None,
                "amount": float(row[4]) if row[4] else 0,
                "party_name": row[5],
                "variance": abs(float(row[4]) - amount) if row[4] else 0
            })
        
        return {
            "bank_statement_line": {
                "id": line_result[0],
                "bank_statement_id": line_result[1],
                "statement_number": line_result[2],
                "statement_date": str(line_result[3]) if line_result[3] else None,
                "bank_account_id": line_result[4],
                "account_name": line_result[5],
                "account_number": line_result[6],
                "transaction_date": str(line_result[7]) if line_result[7] else None,
                "description": line_result[8],
                "reference": line_result[9],
                "debit_amount": float(line_result[10]) if line_result[10] else 0,
                "credit_amount": float(line_result[11]) if line_result[11] else 0,
                "balance": float(line_result[12]) if line_result[12] else 0,
                "match_status": line_result[13],
                "matched_transaction_type": line_result[14],
                "matched_transaction_id": line_result[15],
                "matched_by": line_result[16],
                "matched_at": str(line_result[17]) if line_result[17] else None
            },
            "matched_transaction": matched_transaction,
            "suggested_matches": suggested_matches
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bank-statement-line/{line_id}/match")
async def match_bank_statement_line(
    line_id: int,
    match_data: MatchTransaction,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Match a bank statement line to a transaction"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE bank_statement_lines bsl
            SET 
                match_status = 'MATCHED',
                matched_transaction_type = :transaction_type,
                matched_transaction_id = :transaction_id,
                matched_by = :matched_by,
                matched_at = NOW(),
                updated_at = NOW()
            FROM bank_statements bs
            WHERE bsl.bank_statement_id = bs.id
                AND bsl.id = :line_id
                AND bs.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "transaction_type": match_data.transaction_type,
            "transaction_id": match_data.transaction_id,
            "matched_by": user_email,
            "line_id": line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Bank statement line matched successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bank-statement-line/{line_id}/unmatch")
async def unmatch_bank_statement_line(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Unmatch a bank statement line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE bank_statement_lines bsl
            SET 
                match_status = 'UNMATCHED',
                matched_transaction_type = NULL,
                matched_transaction_id = NULL,
                matched_by = NULL,
                matched_at = NULL,
                updated_at = NOW()
            FROM bank_statements bs
            WHERE bsl.bank_statement_id = bs.id
                AND bsl.id = :line_id
                AND bs.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "line_id": line_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Bank statement line unmatched successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
