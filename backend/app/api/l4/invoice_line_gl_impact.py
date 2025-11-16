from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/invoice-line/{line_id}/gl-impact")
async def get_invoice_line_gl_impact(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get GL impact details for a specific invoice line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
            SELECT 
                il.id,
                il.invoice_id,
                i.invoice_number,
                i.invoice_date,
                il.line_number,
                il.product_id,
                p.product_code,
                p.name as product_name,
                il.quantity,
                il.unit_price,
                il.discount_amount,
                il.tax_amount,
                il.line_total,
                i.customer_id,
                c.name as customer_name,
                p.revenue_account_id,
                p.cogs_account_id,
                p.inventory_account_id
            FROM invoice_lines il
            JOIN invoices i ON il.invoice_id = i.id
            JOIN customers c ON i.customer_id = c.id
            JOIN products p ON il.product_id = p.id
            WHERE il.id = :line_id AND i.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Invoice line not found")
        
        gl_query = text("""
            SELECT 
                jel.id,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                jel.debit_amount,
                jel.credit_amount,
                jel.description,
                je.journal_entry_number,
                je.posting_date,
                je.status as journal_status
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.source_document_type = 'INVOICE_LINE'
                AND je.source_document_id = :line_id
                AND je.company_id = :company_id
            ORDER BY jel.line_number
        """)
        
        gl_result = db.execute(gl_query, {
            "line_id": line_id,
            "company_id": company_id
        })
        
        gl_postings = []
        total_debits = 0
        total_credits = 0
        
        for row in gl_result.fetchall():
            debit = float(row[5]) if row[5] else 0
            credit = float(row[6]) if row[6] else 0
            total_debits += debit
            total_credits += credit
            
            gl_postings.append({
                "id": row[0],
                "account_id": row[1],
                "account_code": row[2],
                "account_name": row[3],
                "account_type": row[4],
                "debit_amount": debit,
                "credit_amount": credit,
                "description": row[7],
                "journal_entry_number": row[8],
                "posting_date": str(row[9]) if row[9] else None,
                "journal_status": row[10]
            })
        
        revenue_amount = float(line_result[12]) if line_result[12] else 0
        tax_amount = float(line_result[11]) if line_result[11] else 0
        
        expected_postings = {
            "revenue_account": {
                "account_id": line_result[15],
                "expected_credit": revenue_amount - tax_amount
            },
            "tax_account": {
                "expected_credit": tax_amount
            },
            "accounts_receivable": {
                "expected_debit": revenue_amount
            }
        }
        
        is_balanced = abs(total_debits - total_credits) < 0.01
        
        return {
            "invoice_line": {
                "id": line_result[0],
                "invoice_id": line_result[1],
                "invoice_number": line_result[2],
                "invoice_date": str(line_result[3]) if line_result[3] else None,
                "line_number": line_result[4],
                "product_id": line_result[5],
                "product_code": line_result[6],
                "product_name": line_result[7],
                "quantity": float(line_result[8]) if line_result[8] else 0,
                "unit_price": float(line_result[9]) if line_result[9] else 0,
                "discount_amount": float(line_result[10]) if line_result[10] else 0,
                "tax_amount": tax_amount,
                "line_total": revenue_amount,
                "customer_id": line_result[13],
                "customer_name": line_result[14]
            },
            "gl_postings": gl_postings,
            "gl_summary": {
                "total_debits": total_debits,
                "total_credits": total_credits,
                "is_balanced": is_balanced,
                "variance": total_debits - total_credits
            },
            "expected_postings": expected_postings
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoice-line/{line_id}/post-to-gl")
async def post_invoice_line_to_gl(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Post invoice line to GL (create journal entries)"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT 
                il.invoice_id,
                i.invoice_number,
                i.invoice_date,
                il.product_id,
                p.product_code,
                il.quantity,
                il.unit_price,
                il.tax_amount,
                il.line_total,
                p.revenue_account_id,
                i.customer_id,
                c.accounts_receivable_account_id
            FROM invoice_lines il
            JOIN invoices i ON il.invoice_id = i.id
            JOIN customers c ON i.customer_id = c.id
            JOIN products p ON il.product_id = p.id
            WHERE il.id = :line_id AND i.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Invoice line not found")
        
        check_query = text("""
            SELECT COUNT(*) FROM journal_entries
            WHERE source_document_type = 'INVOICE_LINE'
                AND source_document_id = :line_id
                AND company_id = :company_id
        """)
        
        check_result = db.execute(check_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if check_result[0] > 0:
            raise HTTPException(status_code=400, detail="Invoice line already posted to GL")
        
        # Create journal entry
        je_query = text("""
            INSERT INTO journal_entries (
                journal_entry_number, posting_date, description,
                source_document_type, source_document_id,
                status, company_id, created_by, created_at
            ) VALUES (
                'JE-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 8, '0'),
                :posting_date,
                'Invoice ' || :invoice_number || ' - ' || :product_code,
                'INVOICE_LINE',
                :line_id,
                'POSTED',
                :company_id,
                :created_by,
                NOW()
            ) RETURNING id
        """)
        
        je_result = db.execute(je_query, {
            "posting_date": line_result[2],
            "invoice_number": line_result[1],
            "product_code": line_result[4],
            "line_id": line_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        je_id = je_result.fetchone()[0]
        
        revenue_amount = float(line_result[8]) if line_result[8] else 0
        tax_amount = float(line_result[7]) if line_result[7] else 0
        net_revenue = revenue_amount - tax_amount
        
        jel_query = text("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id,
                debit_amount, credit_amount, description,
                company_id, created_at
            ) VALUES (
                :je_id, :line_number, :account_id,
                :debit_amount, :credit_amount, :description,
                :company_id, NOW()
            )
        """)
        
        db.execute(jel_query, {
            "je_id": je_id,
            "line_number": 1,
            "account_id": line_result[11],  # AR account
            "debit_amount": revenue_amount,
            "credit_amount": 0,
            "description": "Accounts Receivable",
            "company_id": company_id
        })
        
        db.execute(jel_query, {
            "je_id": je_id,
            "line_number": 2,
            "account_id": line_result[9],  # Revenue account
            "debit_amount": 0,
            "credit_amount": net_revenue,
            "description": "Revenue",
            "company_id": company_id
        })
        
        if tax_amount > 0:
            tax_account_query = text("""
                SELECT id FROM chart_of_accounts
                WHERE account_code = '2210'
                    AND company_id = :company_id
                LIMIT 1
            """)
            
            tax_account_result = db.execute(tax_account_query, {
                "company_id": company_id
            }).fetchone()
            
            if tax_account_result:
                db.execute(jel_query, {
                    "je_id": je_id,
                    "line_number": 3,
                    "account_id": tax_account_result[0],
                    "debit_amount": 0,
                    "credit_amount": tax_amount,
                    "description": "Sales Tax Payable",
                    "company_id": company_id
                })
        
        db.commit()
        
        return {
            "message": "Invoice line posted to GL successfully",
            "journal_entry_id": je_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoice-line/{line_id}/cost-analysis")
async def get_invoice_line_cost_analysis(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get cost analysis for an invoice line (revenue vs cost)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                il.id,
                il.quantity,
                il.unit_price,
                il.line_total as revenue,
                p.standard_cost,
                (il.quantity * p.standard_cost) as total_cost,
                (il.line_total - (il.quantity * p.standard_cost)) as gross_profit,
                CASE 
                    WHEN il.line_total > 0 THEN 
                        ((il.line_total - (il.quantity * p.standard_cost)) / il.line_total * 100)
                    ELSE 0
                END as gross_margin_percent
            FROM invoice_lines il
            JOIN invoices i ON il.invoice_id = i.id
            JOIN products p ON il.product_id = p.id
            WHERE il.id = :line_id AND i.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Invoice line not found")
        
        return {
            "cost_analysis": {
                "quantity": float(result[1]) if result[1] else 0,
                "unit_price": float(result[2]) if result[2] else 0,
                "revenue": float(result[3]) if result[3] else 0,
                "unit_cost": float(result[4]) if result[4] else 0,
                "total_cost": float(result[5]) if result[5] else 0,
                "gross_profit": float(result[6]) if result[6] else 0,
                "gross_margin_percent": float(result[7]) if result[7] else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
