from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

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


@router.get("/bank-account/{account_id}/reconciliation-sessions")
async def get_reconciliation_sessions(
    account_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all reconciliation sessions for a bank account"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["rs.bank_account_id = :account_id", "rs.company_id = :company_id"]
        params = {"account_id": account_id, "company_id": company_id}
        
        if status:
            where_clauses.append("rs.status = :status")
            params["status"] = status
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                rs.id,
                rs.session_number,
                rs.reconciliation_date,
                rs.statement_ending_balance,
                rs.book_balance,
                rs.reconciled_balance,
                rs.difference,
                rs.status,
                rs.notes,
                ba.account_name,
                ba.account_number
            FROM reconciliation_sessions rs
            JOIN bank_accounts ba ON rs.bank_account_id = ba.id
            WHERE {where_clause}
            ORDER BY rs.reconciliation_date DESC
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        sessions = []
        for row in rows:
            sessions.append({
                "id": row[0],
                "session_number": row[1],
                "reconciliation_date": str(row[2]) if row[2] else None,
                "statement_ending_balance": float(row[3]) if row[3] else 0,
                "book_balance": float(row[4]) if row[4] else 0,
                "reconciled_balance": float(row[5]) if row[5] else 0,
                "difference": float(row[6]) if row[6] else 0,
                "status": row[7],
                "notes": row[8],
                "account_name": row[9],
                "account_number": row[10]
            })
        
        return {
            "reconciliation_sessions": sessions,
            "total_count": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reconciliation-session/{session_id}/details")
async def get_reconciliation_session_details(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a reconciliation session"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                rs.session_number,
                rs.reconciliation_date,
                rs.statement_ending_balance,
                rs.book_balance,
                rs.reconciled_balance,
                rs.difference,
                rs.status,
                rs.notes,
                ba.account_name,
                ba.account_number,
                rs.bank_statement_id
            FROM reconciliation_sessions rs
            JOIN bank_accounts ba ON rs.bank_account_id = ba.id
            WHERE rs.id = :session_id AND rs.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "session_id": session_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Reconciliation session not found")
        
        items_query = text("""
            SELECT 
                rsi.id,
                rsi.item_type,
                rsi.transaction_date,
                rsi.description,
                rsi.reference,
                rsi.debit_amount,
                rsi.credit_amount,
                rsi.reconciled
            FROM reconciliation_session_items rsi
            WHERE rsi.reconciliation_session_id = :session_id
            ORDER BY rsi.transaction_date, rsi.item_type
        """)
        
        items_result = db.execute(items_query, {"session_id": session_id})
        
        items = []
        reconciled_count = 0
        unreconciled_count = 0
        
        for row in items_result.fetchall():
            if row[7]:
                reconciled_count += 1
            else:
                unreconciled_count += 1
            
            items.append({
                "id": row[0],
                "item_type": row[1],
                "transaction_date": str(row[2]) if row[2] else None,
                "description": row[3],
                "reference": row[4],
                "debit_amount": float(row[5]) if row[5] else 0,
                "credit_amount": float(row[6]) if row[6] else 0,
                "reconciled": row[7]
            })
        
        return {
            "session": {
                "session_number": header_result[0],
                "reconciliation_date": str(header_result[1]) if header_result[1] else None,
                "statement_ending_balance": float(header_result[2]) if header_result[2] else 0,
                "book_balance": float(header_result[3]) if header_result[3] else 0,
                "reconciled_balance": float(header_result[4]) if header_result[4] else 0,
                "difference": float(header_result[5]) if header_result[5] else 0,
                "status": header_result[6],
                "notes": header_result[7],
                "account_name": header_result[8],
                "account_number": header_result[9],
                "bank_statement_id": header_result[10]
            },
            "items": items,
            "summary": {
                "total_items": len(items),
                "reconciled_items": reconciled_count,
                "unreconciled_items": unreconciled_count
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconciliation-session")
async def create_reconciliation_session(
    bank_account_id: int,
    reconciliation_date: str,
    statement_ending_balance: float,
    bank_statement_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new reconciliation session"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        book_balance_query = text("""
            SELECT COALESCE(current_balance, 0)
            FROM bank_accounts
            WHERE id = :bank_account_id AND company_id = :company_id
        """)
        
        book_balance_result = db.execute(book_balance_query, {
            "bank_account_id": bank_account_id,
            "company_id": company_id
        }).fetchone()
        
        if not book_balance_result:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        book_balance = float(book_balance_result[0]) if book_balance_result[0] else 0
        
        insert_query = text("""
            INSERT INTO reconciliation_sessions (
                session_number, bank_account_id, reconciliation_date,
                statement_ending_balance, book_balance, reconciled_balance,
                difference, bank_statement_id, company_id, created_by, created_at
            ) VALUES (
                'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('reconciliation_session_seq')::TEXT, 5, '0'),
                :bank_account_id, :reconciliation_date,
                :statement_ending_balance, :book_balance, 0,
                :difference, :bank_statement_id, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        db.execute(text("CREATE SEQUENCE IF NOT EXISTS reconciliation_session_seq START 1"))
        
        difference = statement_ending_balance - book_balance
        
        result = db.execute(insert_query, {
            "bank_account_id": bank_account_id,
            "reconciliation_date": reconciliation_date,
            "statement_ending_balance": statement_ending_balance,
            "book_balance": book_balance,
            "difference": difference,
            "bank_statement_id": bank_statement_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        session_id = result.fetchone()[0]
        
        return {
            "id": session_id,
            "message": "Reconciliation session created successfully",
            "difference": difference
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconciliation-session/{session_id}/reconcile-item")
async def reconcile_item(
    session_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark an item as reconciled in a session"""
    try:
        company_id = current_user.get("company_id", "default")
        
        update_query = text("""
            UPDATE reconciliation_session_items rsi
            SET reconciled = true, updated_at = NOW()
            FROM reconciliation_sessions rs
            WHERE rsi.reconciliation_session_id = rs.id
                AND rsi.id = :item_id
                AND rs.id = :session_id
                AND rs.company_id = :company_id
        """)
        
        db.execute(update_query, {
            "item_id": item_id,
            "session_id": session_id,
            "company_id": company_id
        })
        
        recalc_query = text("""
            UPDATE reconciliation_sessions rs
            SET 
                reconciled_balance = (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN rsi.item_type = 'CREDIT' THEN rsi.credit_amount
                            WHEN rsi.item_type = 'DEBIT' THEN -rsi.debit_amount
                        END
                    ), 0)
                    FROM reconciliation_session_items rsi
                    WHERE rsi.reconciliation_session_id = rs.id AND rsi.reconciled = true
                ),
                difference = rs.statement_ending_balance - (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN rsi.item_type = 'CREDIT' THEN rsi.credit_amount
                            WHEN rsi.item_type = 'DEBIT' THEN -rsi.debit_amount
                        END
                    ), 0)
                    FROM reconciliation_session_items rsi
                    WHERE rsi.reconciliation_session_id = rs.id AND rsi.reconciled = true
                ),
                updated_at = NOW()
            WHERE rs.id = :session_id AND rs.company_id = :company_id
        """)
        
        db.execute(recalc_query, {"session_id": session_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Item reconciled successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconciliation-session/{session_id}/complete")
async def complete_reconciliation_session(
    session_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Complete a reconciliation session"""
    try:
        company_id = current_user.get("company_id", "default")
        
        check_query = text("""
            SELECT ABS(difference)
            FROM reconciliation_sessions
            WHERE id = :session_id AND company_id = :company_id
        """)
        
        check_result = db.execute(check_query, {
            "session_id": session_id,
            "company_id": company_id
        }).fetchone()
        
        if not check_result:
            raise HTTPException(status_code=404, detail="Reconciliation session not found")
        
        difference = float(check_result[0]) if check_result[0] else 0
        
        if difference > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete reconciliation with difference of {difference}"
            )
        
        update_query = text("""
            UPDATE reconciliation_sessions
            SET 
                status = 'COMPLETED',
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            WHERE id = :session_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "notes": notes,
            "session_id": session_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Reconciliation session completed successfully"}
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
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_sessions,
                MAX(reconciliation_date) as last_reconciliation_date,
                AVG(ABS(difference)) as avg_difference
            FROM reconciliation_sessions
            WHERE bank_account_id = :account_id AND company_id = :company_id
        """)
        
        result = db.execute(query, {"account_id": account_id, "company_id": company_id})
        row = result.fetchone()
        
        if not row:
            return {
                "total_sessions": 0,
                "completed_sessions": 0,
                "last_reconciliation_date": None,
                "avg_difference": 0
            }
        
        return {
            "total_sessions": row[0] if row[0] else 0,
            "completed_sessions": row[1] if row[1] else 0,
            "last_reconciliation_date": str(row[2]) if row[2] else None,
            "avg_difference": float(row[3]) if row[3] else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
