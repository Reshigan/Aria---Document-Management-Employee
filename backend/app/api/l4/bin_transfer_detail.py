from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/bin-transfer/{transfer_id}/detail")
async def get_bin_transfer_detail(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a bin transfer"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                bt.id,
                bt.transfer_number,
                bt.transfer_date,
                bt.product_id,
                p.product_code,
                p.name as product_name,
                bt.quantity,
                bt.source_warehouse_id,
                w1.name as source_warehouse_name,
                bt.source_bin_location,
                bt.target_warehouse_id,
                w2.name as target_warehouse_name,
                bt.target_bin_location,
                bt.reason,
                bt.status,
                bt.transferred_by,
                bt.transferred_at,
                bt.created_by,
                bt.created_at
            FROM bin_transfers bt
            JOIN products p ON bt.product_id = p.id
            JOIN warehouses w1 ON bt.source_warehouse_id = w1.id
            JOIN warehouses w2 ON bt.target_warehouse_id = w2.id
            WHERE bt.id = :transfer_id AND bt.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "transfer_id": transfer_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Bin transfer not found")
        
        source_inv_query = text("""
            SELECT 
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity
                        WHEN 'OUT' THEN -il.quantity
                        ELSE 0
                    END
                ), 0) as quantity_on_hand
            FROM item_ledger il
            WHERE il.product_id = :product_id
                AND il.warehouse_id = :warehouse_id
                AND il.bin_location = :bin_location
                AND il.company_id = :company_id
        """)
        
        source_inv_result = db.execute(source_inv_query, {
            "product_id": result[3],
            "warehouse_id": result[7],
            "bin_location": result[9],
            "company_id": company_id
        }).fetchone()
        
        source_quantity = float(source_inv_result[0]) if source_inv_result else 0
        
        target_inv_result = db.execute(source_inv_query, {
            "product_id": result[3],
            "warehouse_id": result[10],
            "bin_location": result[12],
            "company_id": company_id
        }).fetchone()
        
        target_quantity = float(target_inv_result[0]) if target_inv_result else 0
        
        ledger_query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.quantity,
                il.warehouse_id,
                w.name as warehouse_name,
                il.bin_location
            FROM item_ledger il
            JOIN warehouses w ON il.warehouse_id = w.id
            WHERE il.reference_type = 'BIN_TRANSFER'
                AND il.reference_id = :transfer_id
                AND il.company_id = :company_id
            ORDER BY il.transaction_date, il.id
        """)
        
        ledger_result = db.execute(ledger_query, {
            "transfer_id": transfer_id,
            "company_id": company_id
        })
        
        ledger_transactions = []
        for row in ledger_result.fetchall():
            ledger_transactions.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "quantity": float(row[3]) if row[3] else 0,
                "warehouse_id": row[4],
                "warehouse_name": row[5],
                "bin_location": row[6]
            })
        
        return {
            "bin_transfer": {
                "id": result[0],
                "transfer_number": result[1],
                "transfer_date": str(result[2]) if result[2] else None,
                "product_id": result[3],
                "product_code": result[4],
                "product_name": result[5],
                "quantity": float(result[6]) if result[6] else 0,
                "source_warehouse_id": result[7],
                "source_warehouse_name": result[8],
                "source_bin_location": result[9],
                "target_warehouse_id": result[10],
                "target_warehouse_name": result[11],
                "target_bin_location": result[12],
                "reason": result[13],
                "status": result[14],
                "transferred_by": result[15],
                "transferred_at": str(result[16]) if result[16] else None,
                "created_by": result[17],
                "created_at": str(result[18]) if result[18] else None
            },
            "inventory_impact": {
                "source_bin_quantity": source_quantity,
                "target_bin_quantity": target_quantity
            },
            "ledger_transactions": ledger_transactions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bin-transfer/{transfer_id}/execute")
async def execute_bin_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Execute a bin transfer"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        transfer_query = text("""
            SELECT 
                product_id,
                quantity,
                source_warehouse_id,
                source_bin_location,
                target_warehouse_id,
                target_bin_location,
                transfer_date
            FROM bin_transfers
            WHERE id = :transfer_id AND company_id = :company_id
        """)
        
        transfer_result = db.execute(transfer_query, {
            "transfer_id": transfer_id,
            "company_id": company_id
        }).fetchone()
        
        if not transfer_result:
            raise HTTPException(status_code=404, detail="Bin transfer not found")
        
        out_query = text("""
            INSERT INTO item_ledger (
                product_id, transaction_date, transaction_type,
                quantity, warehouse_id, bin_location,
                reference_type, reference_id,
                company_id, created_by, created_at
            ) VALUES (
                :product_id, :transfer_date, 'OUT',
                :quantity, :source_warehouse_id, :source_bin_location,
                'BIN_TRANSFER', :transfer_id,
                :company_id, :created_by, NOW()
            )
        """)
        
        db.execute(out_query, {
            "product_id": transfer_result[0],
            "transfer_date": transfer_result[6],
            "quantity": transfer_result[1],
            "source_warehouse_id": transfer_result[2],
            "source_bin_location": transfer_result[3],
            "transfer_id": transfer_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        in_query = text("""
            INSERT INTO item_ledger (
                product_id, transaction_date, transaction_type,
                quantity, warehouse_id, bin_location,
                reference_type, reference_id,
                company_id, created_by, created_at
            ) VALUES (
                :product_id, :transfer_date, 'IN',
                :quantity, :target_warehouse_id, :target_bin_location,
                'BIN_TRANSFER', :transfer_id,
                :company_id, :created_by, NOW()
            )
        """)
        
        db.execute(in_query, {
            "product_id": transfer_result[0],
            "transfer_date": transfer_result[6],
            "quantity": transfer_result[1],
            "target_warehouse_id": transfer_result[4],
            "target_bin_location": transfer_result[5],
            "transfer_id": transfer_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        update_query = text("""
            UPDATE bin_transfers
            SET 
                status = 'COMPLETED',
                transferred_by = :transferred_by,
                transferred_at = NOW(),
                updated_at = NOW()
            WHERE id = :transfer_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {
            "transferred_by": user_email,
            "transfer_id": transfer_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Bin transfer executed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
