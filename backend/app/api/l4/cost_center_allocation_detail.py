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


@router.get("/cost-center-allocation/{allocation_id}/detail")
async def get_cost_center_allocation_detail(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a cost center allocation"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                cca.id,
                cca.allocation_number,
                cca.allocation_date,
                cca.source_cost_center_id,
                cc1.cost_center_code as source_code,
                cc1.cost_center_name as source_name,
                cca.target_cost_center_id,
                cc2.cost_center_code as target_code,
                cc2.cost_center_name as target_name,
                cca.allocation_amount,
                cca.allocation_percentage,
                cca.allocation_method,
                cca.allocation_basis,
                cca.description,
                cca.status,
                cca.posted_by,
                cca.posted_at
            FROM cost_center_allocations cca
            JOIN cost_centers cc1 ON cca.source_cost_center_id = cc1.id
            JOIN cost_centers cc2 ON cca.target_cost_center_id = cc2.id
            WHERE cca.id = :allocation_id AND cca.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Cost center allocation not found")
        
        gl_query = text("""
            SELECT 
                jel.id,
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                jel.cost_center_id,
                cc.cost_center_code,
                cc.cost_center_name
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            LEFT JOIN cost_centers cc ON jel.cost_center_id = cc.id
            WHERE je.source_document_type = 'COST_CENTER_ALLOCATION'
                AND je.source_document_id = :allocation_id
                AND je.company_id = :company_id
        """)
        
        gl_result = db.execute(gl_query, {
            "allocation_id": allocation_id,
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
                "credit_amount": float(row[5]) if row[5] else 0,
                "cost_center_id": row[6],
                "cost_center_code": row[7],
                "cost_center_name": row[8]
            })
        
        budget_query = text("""
            SELECT 
                b.id,
                b.budget_year,
                b.budget_period,
                b.budgeted_amount,
                b.actual_amount,
                b.variance_amount
            FROM budgets b
            WHERE b.cost_center_id = :source_cost_center_id
                AND b.company_id = :company_id
            ORDER BY b.budget_year DESC, b.budget_period DESC
            LIMIT 1
        """)
        
        budget_result = db.execute(budget_query, {
            "source_cost_center_id": result[3],
            "company_id": company_id
        }).fetchone()
        
        source_budget = None
        if budget_result:
            source_budget = {
                "id": budget_result[0],
                "budget_year": budget_result[1],
                "budget_period": budget_result[2],
                "budgeted_amount": float(budget_result[3]) if budget_result[3] else 0,
                "actual_amount": float(budget_result[4]) if budget_result[4] else 0,
                "variance_amount": float(budget_result[5]) if budget_result[5] else 0
            }
        
        return {
            "allocation": {
                "id": result[0],
                "allocation_number": result[1],
                "allocation_date": str(result[2]) if result[2] else None,
                "source_cost_center_id": result[3],
                "source_code": result[4],
                "source_name": result[5],
                "target_cost_center_id": result[6],
                "target_code": result[7],
                "target_name": result[8],
                "allocation_amount": float(result[9]) if result[9] else 0,
                "allocation_percentage": float(result[10]) if result[10] else 0,
                "allocation_method": result[11],
                "allocation_basis": result[12],
                "description": result[13],
                "status": result[14],
                "posted_by": result[15],
                "posted_at": str(result[16]) if result[16] else None
            },
            "gl_impact": gl_impact,
            "source_budget": source_budget
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cost-center-allocation/{allocation_id}/post")
async def post_cost_center_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Post a cost center allocation to GL"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        alloc_query = text("""
            SELECT 
                allocation_amount,
                allocation_date,
                source_cost_center_id,
                target_cost_center_id,
                description
            FROM cost_center_allocations
            WHERE id = :allocation_id AND company_id = :company_id
        """)
        
        alloc_result = db.execute(alloc_query, {
            "allocation_id": allocation_id,
            "company_id": company_id
        }).fetchone()
        
        if not alloc_result:
            raise HTTPException(status_code=404, detail="Cost center allocation not found")
        
        amount = float(alloc_result[0]) if alloc_result[0] else 0
        
        # Create journal entry
        je_query = text("""
            INSERT INTO journal_entries (
                entry_number, entry_date, description,
                source_document_type, source_document_id,
                posted_by, posted_at, company_id, created_at
            ) VALUES (
                'JE-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 8, '0'),
                :entry_date, :description,
                'COST_CENTER_ALLOCATION', :allocation_id,
                :posted_by, NOW(), :company_id, NOW()
            ) RETURNING id
        """)
        
        je_result = db.execute(je_query, {
            "entry_date": alloc_result[1],
            "description": alloc_result[4],
            "allocation_id": allocation_id,
            "posted_by": user_email,
            "company_id": company_id
        })
        
        je_id = je_result.fetchone()[0]
        
        jel_query = text("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, cost_center_id,
                debit_amount, credit_amount, description,
                company_id, created_at
            ) VALUES 
            (:je_id, (SELECT id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = :company_id LIMIT 1), :source_cc, 0, :amount, :description, :company_id, NOW()),
            (:je_id, (SELECT id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = :company_id LIMIT 1), :target_cc, :amount, 0, :description, :company_id, NOW())
        """)
        
        db.execute(jel_query, {
            "je_id": je_id,
            "source_cc": alloc_result[2],
            "target_cc": alloc_result[3],
            "amount": amount,
            "description": alloc_result[4],
            "company_id": company_id
        })
        
        update_query = text("""
            UPDATE cost_center_allocations
            SET 
                status = 'POSTED',
                posted_by = :posted_by,
                posted_at = NOW(),
                updated_at = NOW()
            WHERE id = :allocation_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "posted_by": user_email,
            "allocation_id": allocation_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {
            "message": "Cost center allocation posted successfully",
            "journal_entry_id": je_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
