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


@router.get("/budget-period/{period_id}/atomic-detail")
async def get_budget_period_atomic_detail(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single budget period"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
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
                b.status,
                b.created_at,
                b.created_by
            FROM budgets b
            JOIN chart_of_accounts coa ON b.account_id = coa.id
            LEFT JOIN cost_centers cc ON b.cost_center_id = cc.id
            WHERE b.id = :period_id AND b.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "period_id": period_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Budget period not found")
        
        budget_year = result[1]
        budget_period = result[2]
        account_id = result[3]
        cost_center_id = result[6]
        
        start_date_query = text("""
            SELECT 
                DATE(:budget_year || '-' || LPAD(:budget_period::TEXT, 2, '0') || '-01') as start_date,
                (DATE(:budget_year || '-' || LPAD(:budget_period::TEXT, 2, '0') || '-01') + INTERVAL '1 month' - INTERVAL '1 day')::DATE as end_date
        """)
        
        date_result = db.execute(start_date_query, {
            "budget_year": budget_year,
            "budget_period": budget_period
        }).fetchone()
        
        start_date = date_result[0] if date_result else None
        end_date = date_result[1] if date_result else None
        
        daily_query = text("""
            SELECT 
                je.entry_date::DATE as transaction_date,
                COUNT(*) as transaction_count,
                SUM(CASE 
                    WHEN coa.normal_balance = 'DEBIT' THEN jel.debit_amount - jel.credit_amount
                    ELSE jel.credit_amount - jel.debit_amount
                END) as daily_amount
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.account_id = :account_id
                AND je.entry_date >= :start_date
                AND je.entry_date <= :end_date
                AND (:cost_center_id IS NULL OR jel.cost_center_id = :cost_center_id)
                AND je.company_id = :company_id
            GROUP BY je.entry_date::DATE
            ORDER BY je.entry_date::DATE
        """)
        
        daily_result = db.execute(daily_query, {
            "account_id": account_id,
            "start_date": start_date,
            "end_date": end_date,
            "cost_center_id": cost_center_id,
            "company_id": company_id
        })
        
        daily_breakdown = []
        running_total = 0
        
        for row in daily_result.fetchall():
            daily_amount = float(row[2]) if row[2] else 0
            running_total += daily_amount
            
            daily_breakdown.append({
                "date": str(row[0]) if row[0] else None,
                "transaction_count": row[1],
                "daily_amount": daily_amount,
                "running_total": running_total
            })
        
        weekly_query = text("""
            SELECT 
                EXTRACT(WEEK FROM je.entry_date) as week_number,
                COUNT(*) as transaction_count,
                SUM(CASE 
                    WHEN coa.normal_balance = 'DEBIT' THEN jel.debit_amount - jel.credit_amount
                    ELSE jel.credit_amount - jel.debit_amount
                END) as weekly_amount
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE jel.account_id = :account_id
                AND je.entry_date >= :start_date
                AND je.entry_date <= :end_date
                AND (:cost_center_id IS NULL OR jel.cost_center_id = :cost_center_id)
                AND je.company_id = :company_id
            GROUP BY EXTRACT(WEEK FROM je.entry_date)
            ORDER BY EXTRACT(WEEK FROM je.entry_date)
        """)
        
        weekly_result = db.execute(weekly_query, {
            "account_id": account_id,
            "start_date": start_date,
            "end_date": end_date,
            "cost_center_id": cost_center_id,
            "company_id": company_id
        })
        
        weekly_summary = []
        for row in weekly_result.fetchall():
            weekly_summary.append({
                "week_number": int(row[0]) if row[0] else 0,
                "transaction_count": row[1],
                "weekly_amount": float(row[2]) if row[2] else 0
            })
        
        budgeted = float(result[9]) if result[9] else 0
        actual = float(result[10]) if result[10] else 0
        variance = float(result[11]) if result[11] else 0
        
        return {
            "budget_period": {
                "id": result[0],
                "budget_year": budget_year,
                "budget_period": budget_period,
                "account_id": account_id,
                "account_code": result[4],
                "account_name": result[5],
                "cost_center_id": cost_center_id,
                "cost_center_code": result[7],
                "cost_center_name": result[8],
                "budgeted_amount": budgeted,
                "actual_amount": actual,
                "variance_amount": variance,
                "variance_percent": float(result[12]) if result[12] else 0,
                "status": result[13],
                "created_at": str(result[14]) if result[14] else None,
                "created_by": result[15]
            },
            "period_dates": {
                "start_date": str(start_date) if start_date else None,
                "end_date": str(end_date) if end_date else None
            },
            "daily_breakdown": daily_breakdown,
            "weekly_summary": weekly_summary,
            "utilization": {
                "utilization_percent": (actual / budgeted * 100) if budgeted > 0 else 0,
                "remaining_budget": budgeted - actual,
                "is_over_budget": actual > budgeted
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
