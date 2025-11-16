from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/budget/{budget_id}/variance-detail")
async def get_budget_variance_detail(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed budget vs actual variance analysis"""
    try:
        company_id = current_user.get("company_id", "default")
        
        budget_query = text("""
            SELECT 
                b.id,
                b.budget_year,
                b.budget_period,
                b.account_id,
                coa.account_code,
                coa.account_name,
                b.cost_center_id,
                cc.cost_center_code,
                cc.cost_center_name,
                b.budgeted_amount,
                b.actual_amount,
                b.variance_amount,
                b.variance_percent,
                b.status
            FROM budgets b
            JOIN chart_of_accounts coa ON b.account_id = coa.id
            LEFT JOIN cost_centers cc ON b.cost_center_id = cc.id
            WHERE b.id = :budget_id AND b.company_id = :company_id
        """)
        
        budget_result = db.execute(budget_query, {
            "budget_id": budget_id,
            "company_id": company_id
        }).fetchone()
        
        if not budget_result:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        transactions_query = text("""
            SELECT 
                jel.id,
                je.entry_number,
                je.entry_date,
                je.description,
                jel.debit_amount,
                jel.credit_amount,
                je.source_document_type,
                je.source_document_id
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE jel.account_id = :account_id
                AND EXTRACT(YEAR FROM je.entry_date) = :budget_year
                AND EXTRACT(MONTH FROM je.entry_date) = :budget_period
                AND (:cost_center_id IS NULL OR jel.cost_center_id = :cost_center_id)
                AND je.company_id = :company_id
            ORDER BY je.entry_date DESC
        """)
        
        transactions_result = db.execute(transactions_query, {
            "account_id": budget_result[3],
            "budget_year": budget_result[1],
            "budget_period": budget_result[2],
            "cost_center_id": budget_result[6],
            "company_id": company_id
        })
        
        transactions = []
        for row in transactions_result.fetchall():
            amount = float(row[4]) if row[4] else -float(row[5]) if row[5] else 0
            
            transactions.append({
                "id": row[0],
                "entry_number": row[1],
                "entry_date": str(row[2]) if row[2] else None,
                "description": row[3],
                "amount": amount,
                "source_document_type": row[6],
                "source_document_id": row[7]
            })
        
        prior_period = budget_result[2] - 1 if budget_result[2] > 1 else 12
        prior_year = budget_result[1] if budget_result[2] > 1 else budget_result[1] - 1
        
        prior_query = text("""
            SELECT 
                budgeted_amount,
                actual_amount,
                variance_amount
            FROM budgets
            WHERE account_id = :account_id
                AND budget_year = :prior_year
                AND budget_period = :prior_period
                AND (:cost_center_id IS NULL OR cost_center_id = :cost_center_id)
                AND company_id = :company_id
        """)
        
        prior_result = db.execute(prior_query, {
            "account_id": budget_result[3],
            "prior_year": prior_year,
            "prior_period": prior_period,
            "cost_center_id": budget_result[6],
            "company_id": company_id
        }).fetchone()
        
        prior_period_data = None
        if prior_result:
            prior_period_data = {
                "budgeted_amount": float(prior_result[0]) if prior_result[0] else 0,
                "actual_amount": float(prior_result[1]) if prior_result[1] else 0,
                "variance_amount": float(prior_result[2]) if prior_result[2] else 0
            }
        
        ytd_query = text("""
            SELECT 
                SUM(budgeted_amount) as ytd_budget,
                SUM(actual_amount) as ytd_actual,
                SUM(variance_amount) as ytd_variance
            FROM budgets
            WHERE account_id = :account_id
                AND budget_year = :budget_year
                AND budget_period <= :budget_period
                AND (:cost_center_id IS NULL OR cost_center_id = :cost_center_id)
                AND company_id = :company_id
        """)
        
        ytd_result = db.execute(ytd_query, {
            "account_id": budget_result[3],
            "budget_year": budget_result[1],
            "budget_period": budget_result[2],
            "cost_center_id": budget_result[6],
            "company_id": company_id
        }).fetchone()
        
        ytd_data = {
            "ytd_budget": float(ytd_result[0]) if ytd_result and ytd_result[0] else 0,
            "ytd_actual": float(ytd_result[1]) if ytd_result and ytd_result[1] else 0,
            "ytd_variance": float(ytd_result[2]) if ytd_result and ytd_result[2] else 0
        }
        
        budgeted = float(budget_result[9]) if budget_result[9] else 0
        actual = float(budget_result[10]) if budget_result[10] else 0
        variance = float(budget_result[11]) if budget_result[11] else 0
        
        return {
            "budget": {
                "id": budget_result[0],
                "budget_year": budget_result[1],
                "budget_period": budget_result[2],
                "account_id": budget_result[3],
                "account_code": budget_result[4],
                "account_name": budget_result[5],
                "cost_center_id": budget_result[6],
                "cost_center_code": budget_result[7],
                "cost_center_name": budget_result[8],
                "budgeted_amount": budgeted,
                "actual_amount": actual,
                "variance_amount": variance,
                "variance_percent": float(budget_result[12]) if budget_result[12] else 0,
                "status": budget_result[13]
            },
            "variance_analysis": {
                "is_favorable": variance < 0 if budgeted > 0 else variance > 0,
                "variance_category": "OVER_BUDGET" if abs(variance) > budgeted * 0.1 else "WITHIN_TOLERANCE",
                "utilization_percent": (actual / budgeted * 100) if budgeted > 0 else 0
            },
            "transactions": transactions,
            "prior_period": prior_period_data,
            "year_to_date": ytd_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
