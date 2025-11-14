"""
ARIA ERP - Budgets & Price Lists Module (PostgreSQL)
Provides full CRUD operations for Budgets and Price Lists (parent documents)
Matches frontend API contract: /api/budgets/* and /api/price-lists/*
"""

from fastapi import APIRouter, HTTPException, Path, Depends, Body, Query
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import uuid

from core.auth import get_current_user

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# ========================================
# ========================================

budgets_router = APIRouter(prefix="/api/budgets", tags=["Budgets"])

@budgets_router.get("")
async def list_budgets(
    status: Optional[str] = Query(None),
    fiscal_year: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all budgets"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT b.*,
                   COALESCE(SUM(bl.amount), 0) as total_budget
            FROM budgets b
            LEFT JOIN budget_line_items bl ON b.id = bl.budget_id
            WHERE b.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND b.status = %s"
            params.append(status)
        if fiscal_year:
            query += " AND b.fiscal_year = %s"
            params.append(fiscal_year)
        
        query += " GROUP BY b.id ORDER BY b.fiscal_year DESC, b.created_at DESC"
        
        cursor.execute(query, params)
        budgets = cursor.fetchall()
        
        result = []
        for budget in budgets:
            result.append({
                'id': str(budget['id']),
                'budget_name': budget.get('budget_name'),
                'fiscal_year': budget.get('fiscal_year'),
                'period_start': budget['period_start'].isoformat() if budget.get('period_start') else None,
                'period_end': budget['period_end'].isoformat() if budget.get('period_end') else None,
                'status': budget.get('status'),
                'total_budget': float(budget.get('total_budget', 0)),
                'created_at': budget['created_at'].isoformat() if budget.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@budgets_router.get("/{budget_id}")
async def get_budget(
    budget_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single budget with line items"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM budgets
            WHERE id = %s AND company_id = %s
        """, (budget_id, company_id))
        
        budget = cursor.fetchone()
        if not budget:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        cursor.execute("""
            SELECT bl.*, coa.account_code, coa.account_name
            FROM budget_line_items bl
            LEFT JOIN chart_of_accounts coa ON bl.account_id = coa.id
            WHERE bl.budget_id = %s
            ORDER BY bl.line_number
        """, (budget_id,))
        
        lines = cursor.fetchall()
        
        return {
            'id': str(budget['id']),
            'budget_name': budget.get('budget_name'),
            'fiscal_year': budget.get('fiscal_year'),
            'period_start': budget['period_start'].isoformat() if budget.get('period_start') else None,
            'period_end': budget['period_end'].isoformat() if budget.get('period_end') else None,
            'status': budget.get('status'),
            'notes': budget.get('notes'),
            'created_at': budget['created_at'].isoformat() if budget.get('created_at') else None,
            'updated_at': budget['updated_at'].isoformat() if budget.get('updated_at') else None,
            'lines': [{
                'id': str(line['id']),
                'line_number': line['line_number'],
                'account_id': str(line['account_id']) if line.get('account_id') else None,
                'account_code': line.get('account_code'),
                'account_name': line.get('account_name'),
                'amount': float(line.get('amount', 0)),
                'notes': line.get('notes')
            } for line in lines]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@budgets_router.post("")
async def create_budget(
    budget_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new budget"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        budget_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO budgets (id, company_id, budget_name, fiscal_year, period_start, period_end, status, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, budget_name
        """, (budget_id, company_id, budget_data.get('budget_name'),
              budget_data.get('fiscal_year'), budget_data.get('period_start'),
              budget_data.get('period_end'), 'draft', budget_data.get('notes')))
        
        result = cursor.fetchone()
        
        lines = budget_data.get('lines', [])
        for idx, line in enumerate(lines, 1):
            cursor.execute("""
                INSERT INTO budget_line_items (id, budget_id, line_number, account_id, amount, notes, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), budget_id, idx, line.get('account_id'),
                  line.get('amount', 0), line.get('notes')))
        
        conn.commit()
        return {'id': str(result['id']), 'budget_name': result['budget_name']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@budgets_router.put("/{budget_id}")
async def update_budget(
    budget_id: str = Path(...),
    budget_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a budget"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE budgets
            SET budget_name = %s, status = %s, notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (budget_data.get('budget_name'), budget_data.get('status'),
              budget_data.get('notes'), budget_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        conn.commit()
        return {"message": "Budget updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@budgets_router.post("/{budget_id}/approve")
async def approve_budget(
    budget_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Approve a budget"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE budgets 
            SET status = 'approved', updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (budget_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        conn.commit()
        return {"message": "Budget approved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@budgets_router.delete("/{budget_id}")
async def delete_budget(
    budget_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a budget"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM budget_line_items WHERE budget_id = %s", (budget_id,))
        cursor.execute("DELETE FROM budgets WHERE id = %s AND company_id = %s", (budget_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        conn.commit()
        return {"message": "Budget deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# ========================================

price_lists_router = APIRouter(prefix="/api/price-lists", tags=["Price Lists"])

@price_lists_router.get("")
async def list_price_lists(
    status: Optional[str] = Query(None),
    current_user: Dict = Depends(get_current_user)
):
    """List all price lists"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        query = """
            SELECT pl.*,
                   COUNT(pli.id) as item_count
            FROM price_lists pl
            LEFT JOIN price_list_items pli ON pl.id = pli.price_list_id
            WHERE pl.company_id = %s
        """
        params = [company_id]
        
        if status:
            query += " AND pl.status = %s"
            params.append(status)
        
        query += " GROUP BY pl.id ORDER BY pl.created_at DESC"
        
        cursor.execute(query, params)
        price_lists = cursor.fetchall()
        
        result = []
        for pl in price_lists:
            result.append({
                'id': str(pl['id']),
                'price_list_name': pl.get('price_list_name'),
                'currency': pl.get('currency', 'ZAR'),
                'valid_from': pl['valid_from'].isoformat() if pl.get('valid_from') else None,
                'valid_to': pl['valid_to'].isoformat() if pl.get('valid_to') else None,
                'status': pl.get('status'),
                'item_count': int(pl.get('item_count', 0)),
                'created_at': pl['created_at'].isoformat() if pl.get('created_at') else None
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@price_lists_router.get("/{price_list_id}")
async def get_price_list(
    price_list_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Get a single price list with items"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            SELECT * FROM price_lists
            WHERE id = %s AND company_id = %s
        """, (price_list_id, company_id))
        
        pl = cursor.fetchone()
        if not pl:
            raise HTTPException(status_code=404, detail="Price list not found")
        
        cursor.execute("""
            SELECT pli.*, p.product_code, p.product_name
            FROM price_list_items pli
            LEFT JOIN products p ON pli.product_id = p.id
            WHERE pli.price_list_id = %s
            ORDER BY pli.line_number
        """, (price_list_id,))
        
        items = cursor.fetchall()
        
        return {
            'id': str(pl['id']),
            'price_list_name': pl.get('price_list_name'),
            'currency': pl.get('currency', 'ZAR'),
            'valid_from': pl['valid_from'].isoformat() if pl.get('valid_from') else None,
            'valid_to': pl['valid_to'].isoformat() if pl.get('valid_to') else None,
            'status': pl.get('status'),
            'notes': pl.get('notes'),
            'created_at': pl['created_at'].isoformat() if pl.get('created_at') else None,
            'updated_at': pl['updated_at'].isoformat() if pl.get('updated_at') else None,
            'items': [{
                'id': str(item['id']),
                'line_number': item['line_number'],
                'product_id': str(item['product_id']) if item.get('product_id') else None,
                'product_code': item.get('product_code'),
                'product_name': item.get('product_name'),
                'unit_price': float(item.get('unit_price', 0)),
                'minimum_quantity': float(item.get('minimum_quantity', 0))
            } for item in items]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@price_lists_router.post("")
async def create_price_list(
    price_list_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Create a new price list"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        price_list_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO price_lists (id, company_id, price_list_name, currency, valid_from, valid_to, status, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, price_list_name
        """, (price_list_id, company_id, price_list_data.get('price_list_name'),
              price_list_data.get('currency', 'ZAR'), price_list_data.get('valid_from'),
              price_list_data.get('valid_to'), 'draft', price_list_data.get('notes')))
        
        result = cursor.fetchone()
        
        items = price_list_data.get('items', [])
        for idx, item in enumerate(items, 1):
            cursor.execute("""
                INSERT INTO price_list_items (id, price_list_id, line_number, product_id, unit_price, minimum_quantity, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (str(uuid.uuid4()), price_list_id, idx, item.get('product_id'),
                  item.get('unit_price', 0), item.get('minimum_quantity', 0)))
        
        conn.commit()
        return {'id': str(result['id']), 'price_list_name': result['price_list_name']}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@price_lists_router.put("/{price_list_id}")
async def update_price_list(
    price_list_id: str = Path(...),
    price_list_data: Dict[str, Any] = Body(...),
    current_user: Dict = Depends(get_current_user)
):
    """Update a price list"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE price_lists
            SET price_list_name = %s, status = %s, notes = %s, updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (price_list_data.get('price_list_name'), price_list_data.get('status'),
              price_list_data.get('notes'), price_list_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Price list not found")
        
        conn.commit()
        return {"message": "Price list updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@price_lists_router.post("/{price_list_id}/activate")
async def activate_price_list(
    price_list_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Activate a price list"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("""
            UPDATE price_lists 
            SET status = 'active', updated_at = NOW()
            WHERE id = %s AND company_id = %s
        """, (price_list_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Price list not found")
        
        conn.commit()
        return {"message": "Price list activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@price_lists_router.delete("/{price_list_id}")
async def delete_price_list(
    price_list_id: str = Path(...),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a price list"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must be associated with a company")
        
        cursor.execute("DELETE FROM price_list_items WHERE price_list_id = %s", (price_list_id,))
        cursor.execute("DELETE FROM price_lists WHERE id = %s AND company_id = %s", (price_list_id, company_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Price list not found")
        
        conn.commit()
        return {"message": "Price list deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
