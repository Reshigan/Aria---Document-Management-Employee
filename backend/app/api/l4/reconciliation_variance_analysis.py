from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

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


@router.get("/reconciliation/{reconciliation_id}/variance-analysis")
async def get_reconciliation_variance_analysis(
    reconciliation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed variance analysis for a bank reconciliation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        recon_query = text("""
            SELECT 
                br.id,
                br.reconciliation_number,
                br.reconciliation_date,
                br.bank_account_id,
                ba.account_name,
                ba.account_number,
                br.statement_balance,
                br.book_balance,
                br.variance_amount,
                br.status,
                br.reconciled_by,
                br.reconciled_at
            FROM bank_reconciliations br
            JOIN bank_accounts ba ON br.bank_account_id = ba.id
            WHERE br.id = :reconciliation_id AND br.company_id = :company_id
        """)
        
        recon_result = db.execute(recon_query, {
            "reconciliation_id": reconciliation_id,
            "company_id": company_id
        }).fetchone()
        
        if not recon_result:
            raise HTTPException(status_code=404, detail="Bank reconciliation not found")
        
        unmatched_bank_query = text("""
            SELECT 
                bsl.id,
                bsl.transaction_date,
                bsl.description,
                bsl.reference,
                bsl.debit_amount,
                bsl.credit_amount,
                bsl.match_status
            FROM bank_statement_lines bsl
            JOIN bank_statements bs ON bsl.bank_statement_id = bs.id
            WHERE bs.bank_account_id = :bank_account_id
                AND bsl.match_status = 'UNMATCHED'
                AND bsl.transaction_date <= :reconciliation_date
                AND bs.company_id = :company_id
            ORDER BY bsl.transaction_date
        """)
        
        unmatched_bank_result = db.execute(unmatched_bank_query, {
            "bank_account_id": recon_result[3],
            "reconciliation_date": recon_result[2],
            "company_id": company_id
        })
        
        unmatched_bank_lines = []
        total_unmatched_bank = 0
        
        for row in unmatched_bank_result.fetchall():
            amount = float(row[4]) if row[4] else -float(row[5]) if row[5] else 0
            total_unmatched_bank += amount
            
            unmatched_bank_lines.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "description": row[2],
                "reference": row[3],
                "debit_amount": float(row[4]) if row[4] else 0,
                "credit_amount": float(row[5]) if row[5] else 0,
                "amount": amount,
                "match_status": row[6]
            })
        
        unmatched_book_query = text("""
            SELECT 
                je.id,
                je.entry_date,
                je.description,
                je.reference_number,
                jel.debit_amount,
                jel.credit_amount
            FROM journal_entries je
            JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
            WHERE jel.account_id = (
                SELECT gl_account_id FROM bank_accounts WHERE id = :bank_account_id
            )
            AND je.entry_date <= :reconciliation_date
            AND je.id NOT IN (
                SELECT matched_transaction_id 
                FROM bank_statement_lines 
                WHERE matched_transaction_type = 'JOURNAL_ENTRY'
                    AND match_status = 'MATCHED'
            )
            AND je.company_id = :company_id
            ORDER BY je.entry_date
        """)
        
        unmatched_book_result = db.execute(unmatched_book_query, {
            "bank_account_id": recon_result[3],
            "reconciliation_date": recon_result[2],
            "company_id": company_id
        })
        
        unmatched_book_transactions = []
        total_unmatched_book = 0
        
        for row in unmatched_book_result.fetchall():
            amount = float(row[4]) if row[4] else -float(row[5]) if row[5] else 0
            total_unmatched_book += amount
            
            unmatched_book_transactions.append({
                "id": row[0],
                "entry_date": str(row[1]) if row[1] else None,
                "description": row[2],
                "reference_number": row[3],
                "debit_amount": float(row[4]) if row[4] else 0,
                "credit_amount": float(row[5]) if row[5] else 0,
                "amount": amount
            })
        
        timing_diff_query = text("""
            SELECT 
                td.id,
                td.transaction_type,
                td.transaction_id,
                td.description,
                td.amount,
                td.transaction_date,
                td.expected_clear_date
            FROM timing_differences td
            WHERE td.reconciliation_id = :reconciliation_id
                AND td.company_id = :company_id
        """)
        
        timing_diff_result = db.execute(timing_diff_query, {
            "reconciliation_id": reconciliation_id,
            "company_id": company_id
        })
        
        timing_differences = []
        total_timing_diff = 0
        
        for row in timing_diff_result.fetchall():
            amount = float(row[4]) if row[4] else 0
            total_timing_diff += amount
            
            timing_differences.append({
                "id": row[0],
                "transaction_type": row[1],
                "transaction_id": row[2],
                "description": row[3],
                "amount": amount,
                "transaction_date": str(row[5]) if row[5] else None,
                "expected_clear_date": str(row[6]) if row[6] else None
            })
        
        statement_balance = float(recon_result[6]) if recon_result[6] else 0
        book_balance = float(recon_result[7]) if recon_result[7] else 0
        variance = float(recon_result[8]) if recon_result[8] else 0
        
        calculated_variance = statement_balance - book_balance
        reconciled_variance = calculated_variance - total_unmatched_bank + total_unmatched_book - total_timing_diff
        
        return {
            "reconciliation": {
                "id": recon_result[0],
                "reconciliation_number": recon_result[1],
                "reconciliation_date": str(recon_result[2]) if recon_result[2] else None,
                "bank_account_id": recon_result[3],
                "account_name": recon_result[4],
                "account_number": recon_result[5],
                "statement_balance": statement_balance,
                "book_balance": book_balance,
                "variance_amount": variance,
                "status": recon_result[9],
                "reconciled_by": recon_result[10],
                "reconciled_at": str(recon_result[11]) if recon_result[11] else None
            },
            "variance_breakdown": {
                "calculated_variance": calculated_variance,
                "unmatched_bank_transactions": total_unmatched_bank,
                "unmatched_book_transactions": total_unmatched_book,
                "timing_differences": total_timing_diff,
                "reconciled_variance": reconciled_variance,
                "is_balanced": abs(reconciled_variance) < 0.01
            },
            "unmatched_bank_lines": unmatched_bank_lines,
            "unmatched_book_transactions": unmatched_book_transactions,
            "timing_differences": timing_differences,
            "summary": {
                "total_unmatched_bank_lines": len(unmatched_bank_lines),
                "total_unmatched_book_transactions": len(unmatched_book_transactions),
                "total_timing_differences": len(timing_differences)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconciliation/{reconciliation_id}/resolve-variance")
async def resolve_variance(
    reconciliation_id: int,
    resolution_notes: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Resolve variance in a bank reconciliation"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        update_query = text("""
            UPDATE bank_reconciliations
            SET 
                status = 'RESOLVED',
                variance_amount = 0,
                reconciled_by = :reconciled_by,
                reconciled_at = NOW(),
                notes = COALESCE(notes || ' | ', '') || :resolution_notes,
                updated_at = NOW()
            WHERE id = :reconciliation_id
                AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "reconciled_by": user_email,
            "resolution_notes": resolution_notes,
            "reconciliation_id": reconciliation_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Variance resolved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
