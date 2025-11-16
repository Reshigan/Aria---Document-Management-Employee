from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

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


@router.get("/trial-balance")
async def get_trial_balance(
    as_of_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get trial balance with drill-down capability"""
    try:
        company_id = current_user.get("company_id", "default")
        
        date_filter = ""
        params = {"company_id": company_id}
        
        if as_of_date:
            date_filter = "AND jel.created_at <= :as_of_date"
            params["as_of_date"] = as_of_date
        
        query = text(f"""
            SELECT 
                coa.id as account_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                COALESCE(SUM(jel.credit_amount), 0) as total_credits,
                COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as balance
            FROM chart_of_accounts coa
            LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'POSTED'
            WHERE coa.company_id = :company_id {date_filter}
            GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
            HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
            ORDER BY coa.account_code
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        accounts = []
        total_debits = 0
        total_credits = 0
        
        for row in rows:
            debits = float(row[4]) if row[4] else 0
            credits = float(row[5]) if row[5] else 0
            balance = float(row[6]) if row[6] else 0
            
            total_debits += debits
            total_credits += credits
            
            accounts.append({
                "account_id": row[0],
                "account_code": row[1],
                "account_name": row[2],
                "account_type": row[3],
                "total_debits": debits,
                "total_credits": credits,
                "balance": balance
            })
        
        return {
            "trial_balance": accounts,
            "summary": {
                "total_debits": total_debits,
                "total_credits": total_credits,
                "difference": abs(total_debits - total_credits),
                "is_balanced": abs(total_debits - total_credits) < 0.01
            },
            "as_of_date": as_of_date
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trial-balance/account/{account_id}/ledger")
async def get_account_ledger(
    account_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get general ledger entries for an account (drill-down from trial balance)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        account_query = text("""
            SELECT account_code, account_name, account_type
            FROM chart_of_accounts
            WHERE id = :account_id AND company_id = :company_id
        """)
        
        account_result = db.execute(account_query, {
            "account_id": account_id,
            "company_id": company_id
        }).fetchone()
        
        if not account_result:
            raise HTTPException(status_code=404, detail="Account not found")
        
        where_clauses = ["jel.account_id = :account_id", "coa.company_id = :company_id", "je.status = 'POSTED'"]
        params = {"account_id": account_id, "company_id": company_id}
        
        if start_date:
            where_clauses.append("je.entry_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("je.entry_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        ledger_query = text(f"""
            SELECT 
                je.id as journal_entry_id,
                je.entry_number,
                je.entry_date,
                je.description as entry_description,
                jel.line_number,
                jel.debit_amount,
                jel.credit_amount,
                jel.description as line_description,
                je.source_document_type,
                je.source_document_id
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE {where_clause}
            ORDER BY je.entry_date, je.entry_number, jel.line_number
        """)
        
        ledger_result = db.execute(ledger_query, params)
        
        entries = []
        running_balance = 0
        total_debits = 0
        total_credits = 0
        
        for row in ledger_result.fetchall():
            debit = float(row[5]) if row[5] else 0
            credit = float(row[6]) if row[6] else 0
            
            total_debits += debit
            total_credits += credit
            running_balance += (debit - credit)
            
            entries.append({
                "journal_entry_id": row[0],
                "entry_number": row[1],
                "entry_date": str(row[2]) if row[2] else None,
                "entry_description": row[3],
                "line_number": row[4],
                "debit_amount": debit,
                "credit_amount": credit,
                "line_description": row[7],
                "running_balance": running_balance,
                "source_document_type": row[8],
                "source_document_id": row[9]
            })
        
        return {
            "account": {
                "account_id": account_id,
                "account_code": account_result[0],
                "account_name": account_result[1],
                "account_type": account_result[2]
            },
            "ledger_entries": entries,
            "summary": {
                "total_entries": len(entries),
                "total_debits": total_debits,
                "total_credits": total_credits,
                "ending_balance": running_balance
            },
            "period": {
                "start_date": start_date,
                "end_date": end_date
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ledger/journal-entry/{entry_id}")
async def get_journal_entry_details(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get journal entry details (drill-down from ledger)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        entry_query = text("""
            SELECT 
                je.entry_number,
                je.entry_date,
                je.description,
                je.status,
                je.source_document_type,
                je.source_document_id,
                je.created_by,
                je.created_at
            FROM journal_entries je
            WHERE je.id = :entry_id AND je.company_id = :company_id
        """)
        
        entry_result = db.execute(entry_query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not entry_result:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        lines_query = text("""
            SELECT 
                jel.line_number,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                jel.description,
                jel.cost_center_id,
                cc.name as cost_center_name
            FROM journal_entry_lines jel
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            LEFT JOIN cost_centers cc ON jel.cost_center_id = cc.id
            WHERE jel.journal_entry_id = :entry_id
            ORDER BY jel.line_number
        """)
        
        lines_result = db.execute(lines_query, {"entry_id": entry_id})
        
        lines = []
        total_debits = 0
        total_credits = 0
        
        for row in lines_result.fetchall():
            debit = float(row[4]) if row[4] else 0
            credit = float(row[5]) if row[5] else 0
            
            total_debits += debit
            total_credits += credit
            
            lines.append({
                "line_number": row[0],
                "account_id": row[1],
                "account_code": row[2],
                "account_name": row[3],
                "debit_amount": debit,
                "credit_amount": credit,
                "description": row[6],
                "cost_center_id": row[7],
                "cost_center_name": row[8]
            })
        
        return {
            "journal_entry": {
                "entry_number": entry_result[0],
                "entry_date": str(entry_result[1]) if entry_result[1] else None,
                "description": entry_result[2],
                "status": entry_result[3],
                "source_document_type": entry_result[4],
                "source_document_id": entry_result[5],
                "created_by": entry_result[6],
                "created_at": str(entry_result[7]) if entry_result[7] else None
            },
            "lines": lines,
            "summary": {
                "total_lines": len(lines),
                "total_debits": total_debits,
                "total_credits": total_credits,
                "difference": abs(total_debits - total_credits),
                "is_balanced": abs(total_debits - total_credits) < 0.01
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/journal-entry/{entry_id}/source-document")
async def get_source_document_details(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get source document details (drill-down from journal entry)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        entry_query = text("""
            SELECT 
                je.source_document_type,
                je.source_document_id
            FROM journal_entries je
            WHERE je.id = :entry_id AND je.company_id = :company_id
        """)
        
        entry_result = db.execute(entry_query, {
            "entry_id": entry_id,
            "company_id": company_id
        }).fetchone()
        
        if not entry_result:
            raise HTTPException(status_code=404, detail="Journal entry not found")
        
        source_type = entry_result[0]
        source_id = entry_result[1]
        
        if not source_type or not source_id:
            return {
                "source_document": None,
                "message": "No source document linked to this journal entry"
            }
        
        source_document = {}
        
        if source_type == "INVOICE":
            doc_query = text("""
                SELECT 
                    i.invoice_number,
                    i.invoice_date,
                    i.customer_id,
                    c.name as customer_name,
                    i.total_amount,
                    i.status
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.id = :source_id AND i.company_id = :company_id
            """)
            
            doc_result = db.execute(doc_query, {
                "source_id": source_id,
                "company_id": company_id
            }).fetchone()
            
            if doc_result:
                source_document = {
                    "type": "INVOICE",
                    "id": source_id,
                    "number": doc_result[0],
                    "date": str(doc_result[1]) if doc_result[1] else None,
                    "party_id": doc_result[2],
                    "party_name": doc_result[3],
                    "amount": float(doc_result[4]) if doc_result[4] else 0,
                    "status": doc_result[5]
                }
        
        elif source_type == "PAYMENT":
            doc_query = text("""
                SELECT 
                    cp.payment_number,
                    cp.payment_date,
                    cp.customer_id,
                    c.name as customer_name,
                    cp.payment_amount,
                    cp.payment_method
                FROM customer_payments cp
                JOIN customers c ON cp.customer_id = c.id
                WHERE cp.id = :source_id AND cp.company_id = :company_id
            """)
            
            doc_result = db.execute(doc_query, {
                "source_id": source_id,
                "company_id": company_id
            }).fetchone()
            
            if doc_result:
                source_document = {
                    "type": "PAYMENT",
                    "id": source_id,
                    "number": doc_result[0],
                    "date": str(doc_result[1]) if doc_result[1] else None,
                    "party_id": doc_result[2],
                    "party_name": doc_result[3],
                    "amount": float(doc_result[4]) if doc_result[4] else 0,
                    "payment_method": doc_result[5]
                }
        
        return {"source_document": source_document if source_document else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trial-balance/account-type/{account_type}")
async def get_trial_balance_by_type(
    account_type: str,
    as_of_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get trial balance filtered by account type"""
    try:
        company_id = current_user.get("company_id", "default")
        
        date_filter = ""
        params = {"company_id": company_id, "account_type": account_type}
        
        if as_of_date:
            date_filter = "AND jel.created_at <= :as_of_date"
            params["as_of_date"] = as_of_date
        
        query = text(f"""
            SELECT 
                coa.id as account_id,
                coa.account_code,
                coa.account_name,
                COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                COALESCE(SUM(jel.credit_amount), 0) as total_credits,
                COALESCE(SUM(jel.debit_amount) - SUM(jel.credit_amount), 0) as balance
            FROM chart_of_accounts coa
            LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
            LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'POSTED'
            WHERE coa.company_id = :company_id 
                AND coa.account_type = :account_type
                {date_filter}
            GROUP BY coa.id, coa.account_code, coa.account_name
            HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
            ORDER BY coa.account_code
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        accounts = []
        subtotal_debits = 0
        subtotal_credits = 0
        
        for row in rows:
            debits = float(row[3]) if row[3] else 0
            credits = float(row[4]) if row[4] else 0
            balance = float(row[5]) if row[5] else 0
            
            subtotal_debits += debits
            subtotal_credits += credits
            
            accounts.append({
                "account_id": row[0],
                "account_code": row[1],
                "account_name": row[2],
                "total_debits": debits,
                "total_credits": credits,
                "balance": balance
            })
        
        return {
            "account_type": account_type,
            "accounts": accounts,
            "subtotal": {
                "total_debits": subtotal_debits,
                "total_credits": subtotal_credits,
                "net_balance": subtotal_debits - subtotal_credits
            },
            "as_of_date": as_of_date
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
