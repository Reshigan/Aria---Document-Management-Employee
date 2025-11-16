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


@router.get("/item-ledger-transaction/{transaction_id}")
async def get_item_ledger_transaction_detail(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a specific item ledger transaction"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.product_id,
                p.product_code,
                p.name as product_name,
                p.uom,
                il.warehouse_id,
                w.name as warehouse_name,
                w.location as warehouse_location,
                il.quantity,
                il.unit_cost,
                (il.quantity * il.unit_cost) as total_value,
                il.reference_type,
                il.reference_id,
                il.lot_number,
                il.serial_number,
                il.bin_location,
                il.notes,
                il.created_by,
                il.created_at
            FROM item_ledger il
            JOIN products p ON il.product_id = p.id
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.id = :transaction_id AND il.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "transaction_id": transaction_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Item ledger transaction not found")
        
        source_document = None
        reference_type = result[13]
        reference_id = result[14]
        
        if reference_type == 'SALES_ORDER':
            source_query = text("""
                SELECT 
                    order_number,
                    order_date,
                    customer_id,
                    c.name as customer_name,
                    status
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                WHERE so.id = :ref_id AND so.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "ref_id": reference_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "SALES_ORDER",
                    "number": source_result[0],
                    "date": str(source_result[1]) if source_result[1] else None,
                    "customer_id": source_result[2],
                    "customer_name": source_result[3],
                    "status": source_result[4]
                }
        
        elif reference_type == 'PURCHASE_ORDER':
            source_query = text("""
                SELECT 
                    po_number,
                    order_date,
                    supplier_id,
                    s.name as supplier_name,
                    status
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = :ref_id AND po.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "ref_id": reference_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "PURCHASE_ORDER",
                    "number": source_result[0],
                    "date": str(source_result[1]) if source_result[1] else None,
                    "supplier_id": source_result[2],
                    "supplier_name": source_result[3],
                    "status": source_result[4]
                }
        
        elif reference_type == 'STOCK_ADJUSTMENT':
            source_query = text("""
                SELECT 
                    adjustment_number,
                    adjustment_date,
                    reason,
                    status
                FROM stock_adjustments
                WHERE id = :ref_id AND company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "ref_id": reference_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "STOCK_ADJUSTMENT",
                    "number": source_result[0],
                    "date": str(source_result[1]) if source_result[1] else None,
                    "reason": source_result[2],
                    "status": source_result[3]
                }
        
        elif reference_type == 'MANUFACTURING_ORDER':
            source_query = text("""
                SELECT 
                    mo_number,
                    start_date,
                    product_id,
                    p.name as product_name,
                    status
                FROM manufacturing_orders mo
                JOIN products p ON mo.product_id = p.id
                WHERE mo.id = :ref_id AND mo.company_id = :company_id
            """)
            
            source_result = db.execute(source_query, {
                "ref_id": reference_id,
                "company_id": company_id
            }).fetchone()
            
            if source_result:
                source_document = {
                    "type": "MANUFACTURING_ORDER",
                    "number": source_result[0],
                    "date": str(source_result[1]) if source_result[1] else None,
                    "product_id": source_result[2],
                    "product_name": source_result[3],
                    "status": source_result[4]
                }
        
        gl_query = text("""
            SELECT 
                jel.account_id,
                coa.account_code,
                coa.account_name,
                jel.debit_amount,
                jel.credit_amount,
                je.journal_entry_number,
                je.posting_date
            FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jel.account_id = coa.id
            WHERE je.source_document_type = 'ITEM_LEDGER'
                AND je.source_document_id = :transaction_id
                AND je.company_id = :company_id
            ORDER BY jel.line_number
        """)
        
        gl_result = db.execute(gl_query, {
            "transaction_id": transaction_id,
            "company_id": company_id
        })
        
        gl_impact = []
        for row in gl_result.fetchall():
            gl_impact.append({
                "account_id": row[0],
                "account_code": row[1],
                "account_name": row[2],
                "debit_amount": float(row[3]) if row[3] else 0,
                "credit_amount": float(row[4]) if row[4] else 0,
                "journal_entry_number": row[5],
                "posting_date": str(row[6]) if row[6] else None
            })
        
        balance_query = text("""
            SELECT 
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity
                        WHEN 'OUT' THEN -il.quantity
                        ELSE 0
                    END
                ), 0) as balance_after
            FROM item_ledger il
            WHERE il.product_id = :product_id
                AND il.warehouse_id = :warehouse_id
                AND il.company_id = :company_id
                AND il.created_at <= :transaction_time
        """)
        
        balance_result = db.execute(balance_query, {
            "product_id": result[3],
            "warehouse_id": result[7],
            "company_id": company_id,
            "transaction_time": result[20]
        }).fetchone()
        
        return {
            "transaction": {
                "id": result[0],
                "transaction_date": str(result[1]) if result[1] else None,
                "transaction_type": result[2],
                "product_id": result[3],
                "product_code": result[4],
                "product_name": result[5],
                "uom": result[6],
                "warehouse_id": result[7],
                "warehouse_name": result[8],
                "warehouse_location": result[9],
                "quantity": float(result[10]) if result[10] else 0,
                "unit_cost": float(result[11]) if result[11] else 0,
                "total_value": float(result[12]) if result[12] else 0,
                "reference_type": reference_type,
                "reference_id": reference_id,
                "lot_number": result[15],
                "serial_number": result[16],
                "bin_location": result[17],
                "notes": result[18],
                "created_by": result[19],
                "created_at": str(result[20]) if result[20] else None
            },
            "source_document": source_document,
            "gl_impact": gl_impact,
            "inventory_context": {
                "balance_after_transaction": float(balance_result[0]) if balance_result else 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/item-ledger-transaction/{transaction_id}/related-transactions")
async def get_related_transactions(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get related transactions for an item ledger transaction"""
    try:
        company_id = current_user.get("company_id", "default")
        
        orig_query = text("""
            SELECT 
                product_id,
                warehouse_id,
                reference_type,
                reference_id,
                lot_number,
                serial_number
            FROM item_ledger
            WHERE id = :transaction_id AND company_id = :company_id
        """)
        
        orig_result = db.execute(orig_query, {
            "transaction_id": transaction_id,
            "company_id": company_id
        }).fetchone()
        
        if not orig_result:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        related_query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.quantity,
                il.unit_cost,
                p.product_code,
                p.name as product_name,
                w.name as warehouse_name
            FROM item_ledger il
            JOIN products p ON il.product_id = p.id
            LEFT JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.reference_type = :reference_type
                AND il.reference_id = :reference_id
                AND il.company_id = :company_id
                AND il.id != :transaction_id
            ORDER BY il.transaction_date DESC, il.created_at DESC
        """)
        
        related_result = db.execute(related_query, {
            "reference_type": orig_result[2],
            "reference_id": orig_result[3],
            "company_id": company_id,
            "transaction_id": transaction_id
        })
        
        related_transactions = []
        for row in related_result.fetchall():
            related_transactions.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "quantity": float(row[3]) if row[3] else 0,
                "unit_cost": float(row[4]) if row[4] else 0,
                "product_code": row[5],
                "product_name": row[6],
                "warehouse_name": row[7]
            })
        
        return {"related_transactions": related_transactions}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
