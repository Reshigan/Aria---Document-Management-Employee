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
        from core.database_pg import SessionLocal
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        from auth_integrated import get_current_user

router = APIRouter()


class StockTransferLineCreate(BaseModel):
    transfer_id: int
    product_id: int
    quantity: float
    from_bin: Optional[str] = None
    to_bin: Optional[str] = None
    lot_number: Optional[str] = None
    serial_number: Optional[str] = None


@router.get("/stock-transfer/{transfer_id}/lines")
async def get_stock_transfer_lines(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lines for a stock transfer"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                st.transfer_number,
                st.transfer_date,
                st.from_warehouse_id,
                wf.name as from_warehouse_name,
                st.to_warehouse_id,
                wt.name as to_warehouse_name,
                st.status,
                st.notes
            FROM stock_transfers st
            LEFT JOIN warehouses wf ON st.from_warehouse_id = wf.id
            LEFT JOIN warehouses wt ON st.to_warehouse_id = wt.id
            WHERE st.id = :transfer_id AND st.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "transfer_id": transfer_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Stock transfer not found")
        
        lines_query = text("""
            SELECT 
                stl.id,
                stl.line_number,
                stl.product_id,
                p.name as product_name,
                p.product_code,
                stl.quantity,
                stl.from_bin,
                stl.to_bin,
                stl.lot_number,
                stl.serial_number,
                stl.status
            FROM stock_transfer_lines stl
            JOIN stock_transfers st ON stl.transfer_id = st.id
            JOIN products p ON stl.product_id = p.id
            WHERE st.id = :transfer_id AND st.company_id = :company_id
            ORDER BY stl.line_number
        """)
        
        lines_result = db.execute(lines_query, {
            "transfer_id": transfer_id,
            "company_id": company_id
        })
        
        lines = []
        for row in lines_result.fetchall():
            lines.append({
                "id": row[0],
                "line_number": row[1],
                "product_id": row[2],
                "product_name": row[3],
                "product_code": row[4],
                "quantity": float(row[5]) if row[5] else 0,
                "from_bin": row[6],
                "to_bin": row[7],
                "lot_number": row[8],
                "serial_number": row[9],
                "status": row[10]
            })
        
        return {
            "transfer": {
                "transfer_number": header_result[0],
                "transfer_date": str(header_result[1]) if header_result[1] else None,
                "from_warehouse_id": header_result[2],
                "from_warehouse_name": header_result[3],
                "to_warehouse_id": header_result[4],
                "to_warehouse_name": header_result[5],
                "status": header_result[6],
                "notes": header_result[7]
            },
            "lines": lines
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock-transfer/{transfer_id}/line")
async def add_stock_transfer_line(
    transfer_id: int,
    line: StockTransferLineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a line to a stock transfer"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM stock_transfer_lines stl
            JOIN stock_transfers st ON stl.transfer_id = st.id
            WHERE st.id = :transfer_id AND st.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {"transfer_id": transfer_id, "company_id": company_id}).fetchone()
        next_line = line_result[0] if line_result else 1
        
        insert_query = text("""
            INSERT INTO stock_transfer_lines (
                transfer_id, line_number, product_id, quantity,
                from_bin, to_bin, lot_number, serial_number,
                company_id, created_by, created_at
            ) VALUES (
                :transfer_id, :line_number, :product_id, :quantity,
                :from_bin, :to_bin, :lot_number, :serial_number,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "transfer_id": transfer_id,
            "line_number": next_line,
            "product_id": line.product_id,
            "quantity": line.quantity,
            "from_bin": line.from_bin,
            "to_bin": line.to_bin,
            "lot_number": line.lot_number,
            "serial_number": line.serial_number,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        line_id = result.fetchone()[0]
        
        return {"id": line_id, "message": "Transfer line added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/stock-transfer-line/{line_id}")
async def delete_stock_transfer_line(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a stock transfer line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM stock_transfer_lines stl
            USING stock_transfers st
            WHERE stl.transfer_id = st.id
                AND stl.id = :line_id
                AND st.company_id = :company_id
        """)
        
        db.execute(delete_query, {"line_id": line_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Transfer line deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock-transfer/{transfer_id}/execute")
async def execute_stock_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Execute a stock transfer (create item ledger entries)"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        transfer_query = text("""
            SELECT 
                st.transfer_number,
                st.transfer_date,
                st.from_warehouse_id,
                st.to_warehouse_id,
                st.status
            FROM stock_transfers st
            WHERE st.id = :transfer_id AND st.company_id = :company_id
        """)
        
        transfer_result = db.execute(transfer_query, {
            "transfer_id": transfer_id,
            "company_id": company_id
        }).fetchone()
        
        if not transfer_result:
            raise HTTPException(status_code=404, detail="Stock transfer not found")
        
        if transfer_result[4] == "COMPLETED":
            raise HTTPException(status_code=400, detail="Transfer already completed")
        
        lines_query = text("""
            SELECT 
                stl.product_id,
                stl.quantity,
                stl.from_bin,
                stl.to_bin,
                stl.lot_number,
                stl.serial_number
            FROM stock_transfer_lines stl
            JOIN stock_transfers st ON stl.transfer_id = st.id
            WHERE st.id = :transfer_id AND st.company_id = :company_id
        """)
        
        lines_result = db.execute(lines_query, {
            "transfer_id": transfer_id,
            "company_id": company_id
        })
        
        for row in lines_result.fetchall():
            product_id = row[0]
            quantity = float(row[1]) if row[1] else 0
            from_bin = row[2]
            to_bin = row[3]
            lot_number = row[4]
            serial_number = row[5]
            
            insert_out_query = text("""
                INSERT INTO item_ledger_entries (
                    product_id, transaction_date, transaction_type,
                    document_type, document_number, warehouse_id,
                    bin_location, lot_number, serial_number,
                    quantity_in, quantity_out, company_id, created_by, created_at
                ) VALUES (
                    :product_id, :transfer_date, 'TRANSFER_OUT',
                    'STOCK_TRANSFER', :transfer_number, :from_warehouse_id,
                    :from_bin, :lot_number, :serial_number,
                    0, :quantity, :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(insert_out_query, {
                "product_id": product_id,
                "transfer_date": transfer_result[1],
                "transfer_number": transfer_result[0],
                "from_warehouse_id": transfer_result[2],
                "from_bin": from_bin,
                "lot_number": lot_number,
                "serial_number": serial_number,
                "quantity": quantity,
                "company_id": company_id,
                "created_by": user_email
            })
            
            insert_in_query = text("""
                INSERT INTO item_ledger_entries (
                    product_id, transaction_date, transaction_type,
                    document_type, document_number, warehouse_id,
                    bin_location, lot_number, serial_number,
                    quantity_in, quantity_out, company_id, created_by, created_at
                ) VALUES (
                    :product_id, :transfer_date, 'TRANSFER_IN',
                    'STOCK_TRANSFER', :transfer_number, :to_warehouse_id,
                    :to_bin, :lot_number, :serial_number,
                    :quantity, 0, :company_id, :created_by, NOW()
                )
            """)
            
            db.execute(insert_in_query, {
                "product_id": product_id,
                "transfer_date": transfer_result[1],
                "transfer_number": transfer_result[0],
                "to_warehouse_id": transfer_result[3],
                "to_bin": to_bin,
                "lot_number": lot_number,
                "serial_number": serial_number,
                "quantity": quantity,
                "company_id": company_id,
                "created_by": user_email
            })
        
        update_query = text("""
            UPDATE stock_transfers
            SET status = 'COMPLETED', updated_at = NOW()
            WHERE id = :transfer_id AND company_id = :company_id
        """)
        
        db.execute(update_query, {"transfer_id": transfer_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Stock transfer executed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
