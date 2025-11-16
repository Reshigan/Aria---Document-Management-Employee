from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/stock-adjustment/{adjustment_id}/reason-analysis")
async def get_stock_adjustment_reason_analysis(
    adjustment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed reason analysis for a stock adjustment"""
    try:
        company_id = current_user.get("company_id", "default")
        
        adjustment_query = text("""
            SELECT 
                sa.id,
                sa.adjustment_number,
                sa.adjustment_date,
                sa.product_id,
                p.product_code,
                p.name as product_name,
                sa.warehouse_id,
                w.name as warehouse_name,
                sa.bin_location,
                sa.quantity_before,
                sa.quantity_adjusted,
                sa.quantity_after,
                sa.adjustment_type,
                sa.reason_code,
                sa.reason_description,
                sa.cost_impact,
                sa.status,
                sa.approved_by,
                sa.approved_at,
                sa.created_by,
                sa.created_at
            FROM stock_adjustments sa
            JOIN products p ON sa.product_id = p.id
            JOIN warehouses w ON sa.warehouse_id = w.id
            WHERE sa.id = :adjustment_id AND sa.company_id = :company_id
        """)
        
        adjustment_result = db.execute(adjustment_query, {
            "adjustment_id": adjustment_id,
            "company_id": company_id
        }).fetchone()
        
        if not adjustment_result:
            raise HTTPException(status_code=404, detail="Stock adjustment not found")
        
        reason_stats_query = text("""
            SELECT 
                COUNT(*) as total_adjustments,
                SUM(ABS(quantity_adjusted)) as total_quantity,
                SUM(ABS(cost_impact)) as total_cost_impact,
                AVG(ABS(quantity_adjusted)) as avg_quantity
            FROM stock_adjustments
            WHERE reason_code = :reason_code
                AND company_id = :company_id
        """)
        
        reason_stats_result = db.execute(reason_stats_query, {
            "reason_code": adjustment_result[13],
            "company_id": company_id
        }).fetchone()
        
        reason_statistics = {
            "total_adjustments": reason_stats_result[0] if reason_stats_result else 0,
            "total_quantity": float(reason_stats_result[1]) if reason_stats_result and reason_stats_result[1] else 0,
            "total_cost_impact": float(reason_stats_result[2]) if reason_stats_result and reason_stats_result[2] else 0,
            "avg_quantity": float(reason_stats_result[3]) if reason_stats_result and reason_stats_result[3] else 0
        }
        
        similar_query = text("""
            SELECT 
                sa.id,
                sa.adjustment_number,
                sa.adjustment_date,
                sa.product_id,
                p.product_code,
                p.name as product_name,
                sa.quantity_adjusted,
                sa.cost_impact,
                sa.reason_description
            FROM stock_adjustments sa
            JOIN products p ON sa.product_id = p.id
            WHERE sa.reason_code = :reason_code
                AND sa.id != :adjustment_id
                AND sa.company_id = :company_id
            ORDER BY sa.adjustment_date DESC
            LIMIT 10
        """)
        
        similar_result = db.execute(similar_query, {
            "reason_code": adjustment_result[13],
            "adjustment_id": adjustment_id,
            "company_id": company_id
        })
        
        similar_adjustments = []
        for row in similar_result.fetchall():
            similar_adjustments.append({
                "id": row[0],
                "adjustment_number": row[1],
                "adjustment_date": str(row[2]) if row[2] else None,
                "product_id": row[3],
                "product_code": row[4],
                "product_name": row[5],
                "quantity_adjusted": float(row[6]) if row[6] else 0,
                "cost_impact": float(row[7]) if row[7] else 0,
                "reason_description": row[8]
            })
        
        ledger_query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.quantity,
                il.unit_cost,
                il.total_cost
            FROM item_ledger il
            WHERE il.reference_type = 'STOCK_ADJUSTMENT'
                AND il.reference_id = :adjustment_id
                AND il.company_id = :company_id
        """)
        
        ledger_result = db.execute(ledger_query, {
            "adjustment_id": adjustment_id,
            "company_id": company_id
        })
        
        ledger_transactions = []
        for row in ledger_result.fetchall():
            ledger_transactions.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "quantity": float(row[3]) if row[3] else 0,
                "unit_cost": float(row[4]) if row[4] else 0,
                "total_cost": float(row[5]) if row[5] else 0
            })
        
        gl_query = text("""
            SELECT 
                jel.id,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.source_document_type = 'STOCK_ADJUSTMENT'
                AND je.source_document_id = :adjustment_id
                AND je.company_id = :company_id
        """)
        
        gl_result = db.execute(gl_query, {
            "adjustment_id": adjustment_id,
            "company_id": company_id
        })
        
        gl_impact = []
        for row in gl_result.fetchall():
            gl_impact.append({
                "id": row[0],
                "account_id": row[1],
                "account_code": row[2],
                "account_name": row[3],
                "debit_amount": float(row[4]) if row[4] else 0,
                "credit_amount": float(row[5]) if row[5] else 0
            })
        
        return {
            "stock_adjustment": {
                "id": adjustment_result[0],
                "adjustment_number": adjustment_result[1],
                "adjustment_date": str(adjustment_result[2]) if adjustment_result[2] else None,
                "product_id": adjustment_result[3],
                "product_code": adjustment_result[4],
                "product_name": adjustment_result[5],
                "warehouse_id": adjustment_result[6],
                "warehouse_name": adjustment_result[7],
                "bin_location": adjustment_result[8],
                "quantity_before": float(adjustment_result[9]) if adjustment_result[9] else 0,
                "quantity_adjusted": float(adjustment_result[10]) if adjustment_result[10] else 0,
                "quantity_after": float(adjustment_result[11]) if adjustment_result[11] else 0,
                "adjustment_type": adjustment_result[12],
                "reason_code": adjustment_result[13],
                "reason_description": adjustment_result[14],
                "cost_impact": float(adjustment_result[15]) if adjustment_result[15] else 0,
                "status": adjustment_result[16],
                "approved_by": adjustment_result[17],
                "approved_at": str(adjustment_result[18]) if adjustment_result[18] else None,
                "created_by": adjustment_result[19],
                "created_at": str(adjustment_result[20]) if adjustment_result[20] else None
            },
            "reason_statistics": reason_statistics,
            "similar_adjustments": similar_adjustments,
            "ledger_transactions": ledger_transactions,
            "gl_impact": gl_impact
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
