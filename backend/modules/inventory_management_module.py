"""
ARIA ERP - Inventory Management Module
Complete inventory management: Stock Adjustments, Transfers, Cycle Counts, Valuation
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, date

router = APIRouter(prefix="/api/erp/inventory", tags=["Inventory Management"])


def get_db():
    """Get database session"""
    from database import get_db as _get_db
    return next(_get_db())

def get_company_id() -> UUID:
    """Get company ID from context - placeholder for now"""
    return UUID("00000000-0000-0000-0000-000000000001")

def get_user_id(db: Session) -> UUID:
    """Get user ID"""
    result = db.execute(text("SELECT id FROM users LIMIT 1"))
    row = result.fetchone()
    return row[0] if row else UUID("00000000-0000-0000-0000-000000000001")


class StockAdjustmentCreate(BaseModel):
    product_id: UUID
    warehouse_id: UUID
    storage_location_id: Optional[UUID] = None
    adjustment_type: str  # "increase" or "decrease"
    quantity: Decimal
    unit_cost: Optional[Decimal] = None
    reason: str
    notes: Optional[str] = None

class StockAdjustmentResponse(BaseModel):
    id: UUID
    company_id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    warehouse_id: UUID
    warehouse_name: Optional[str] = None
    storage_location_id: Optional[UUID]
    adjustment_type: str
    quantity: Decimal
    unit_cost: Optional[Decimal]
    reason: str
    notes: Optional[str]
    created_by: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class StockTransferCreate(BaseModel):
    product_id: UUID
    from_warehouse_id: UUID
    to_warehouse_id: UUID
    from_storage_location_id: Optional[UUID] = None
    to_storage_location_id: Optional[UUID] = None
    quantity: Decimal
    notes: Optional[str] = None

class StockTransferResponse(BaseModel):
    id: UUID
    company_id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    from_warehouse_id: UUID
    from_warehouse_name: Optional[str] = None
    to_warehouse_id: UUID
    to_warehouse_name: Optional[str] = None
    quantity: Decimal
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class StockOnHandResponse(BaseModel):
    product_id: UUID
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    warehouse_id: UUID
    warehouse_name: Optional[str] = None
    storage_location_id: Optional[UUID]
    storage_location_name: Optional[str] = None
    quantity_on_hand: Decimal
    quantity_reserved: Decimal
    quantity_available: Decimal
    last_movement_date: Optional[datetime]
    
    class Config:
        from_attributes = True

class CycleCountCreate(BaseModel):
    warehouse_id: UUID
    storage_location_id: Optional[UUID] = None
    count_date: date
    items: List[dict]  # [{"product_id": UUID, "counted_quantity": Decimal}]

class CycleCountResponse(BaseModel):
    id: UUID
    company_id: UUID
    warehouse_id: UUID
    warehouse_name: Optional[str] = None
    count_date: date
    status: str
    items_counted: int
    discrepancies_found: int
    created_by: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "inventory_management",
        "endpoints": ["stock-on-hand", "adjustments", "transfers", "cycle-counts"]
    }

@router.get("/stock-on-hand", response_model=List[StockOnHandResponse])
async def get_stock_on_hand(
    warehouse_id: Optional[UUID] = None,
    product_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get stock on hand with optional filters"""
    query = """
        SELECT soh.product_id, p.code as product_code, p.name as product_name,
               soh.warehouse_id, w.name as warehouse_name,
               soh.storage_location_id, sl.name as storage_location_name,
               soh.quantity_on_hand, soh.quantity_reserved, soh.quantity_available,
               soh.last_movement_date
        FROM stock_on_hand soh
        JOIN products p ON soh.product_id = p.id
        JOIN warehouses w ON soh.warehouse_id = w.id
        LEFT JOIN storage_locations sl ON soh.storage_location_id = sl.id
        WHERE soh.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if warehouse_id:
        query += " AND soh.warehouse_id = :warehouse_id"
        params["warehouse_id"] = str(warehouse_id)
    
    if product_id:
        query += " AND soh.product_id = :product_id"
        params["product_id"] = str(product_id)
    
    query += " ORDER BY p.name, w.name"
    
    result = db.execute(text(query), params)
    stock_items = []
    for row in result:
        stock_items.append(StockOnHandResponse(
            product_id=row[0], product_code=row[1], product_name=row[2],
            warehouse_id=row[3], warehouse_name=row[4],
            storage_location_id=row[5], storage_location_name=row[6],
            quantity_on_hand=row[7], quantity_reserved=row[8], quantity_available=row[9],
            last_movement_date=row[10]
        ))
    return stock_items

@router.post("/adjustments", response_model=StockAdjustmentResponse)
async def create_stock_adjustment(
    adjustment: StockAdjustmentCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a stock adjustment (increase or decrease)"""
    try:
        user_id = get_user_id(db)
        movement_id = uuid4()
        
        if adjustment.adjustment_type == "increase":
            movement_type = "adjustment_in"
            quantity = adjustment.quantity
        elif adjustment.adjustment_type == "decrease":
            movement_type = "adjustment_out"
            quantity = -adjustment.quantity
        else:
            raise HTTPException(status_code=400, detail="Invalid adjustment_type. Must be 'increase' or 'decrease'")
        
        if adjustment.adjustment_type == "decrease":
            check_query = """
                SELECT quantity_available FROM stock_on_hand
                WHERE company_id = :company_id AND product_id = :product_id
                AND warehouse_id = :warehouse_id
                AND (storage_location_id = :storage_location_id OR (:storage_location_id IS NULL AND storage_location_id IS NULL))
            """
            result = db.execute(text(check_query), {
                "company_id": str(company_id),
                "product_id": str(adjustment.product_id),
                "warehouse_id": str(adjustment.warehouse_id),
                "storage_location_id": str(adjustment.storage_location_id) if adjustment.storage_location_id else None
            })
            row = result.fetchone()
            if not row or row[0] < adjustment.quantity:
                raise HTTPException(status_code=400, detail="Insufficient stock for adjustment")
        
        # Create stock movement
        db.execute(text("""
            INSERT INTO stock_movements (id, company_id, product_id, warehouse_id,
                                        storage_location_id, movement_type, quantity,
                                        unit_cost, reference_type, reference_id,
                                        transaction_date, notes, created_by, created_at)
            VALUES (:id, :company_id, :product_id, :warehouse_id,
                    :storage_location_id, :movement_type, :quantity,
                    :unit_cost, 'adjustment', :reference_id,
                    CURRENT_TIMESTAMP, :notes, :created_by, CURRENT_TIMESTAMP)
        """), {
            "id": str(movement_id),
            "company_id": str(company_id),
            "product_id": str(adjustment.product_id),
            "warehouse_id": str(adjustment.warehouse_id),
            "storage_location_id": str(adjustment.storage_location_id) if adjustment.storage_location_id else None,
            "movement_type": movement_type,
            "quantity": float(quantity),
            "unit_cost": float(adjustment.unit_cost) if adjustment.unit_cost else None,
            "reference_id": str(movement_id),
            "notes": f"{adjustment.reason}: {adjustment.notes}" if adjustment.notes else adjustment.reason,
            "created_by": str(user_id)
        })
        
        db.execute(text("""
            INSERT INTO stock_on_hand (id, company_id, product_id, warehouse_id,
                                      storage_location_id, quantity_on_hand, last_movement_date,
                                      created_at, updated_at)
            VALUES (gen_random_uuid(), :company_id, :product_id, :warehouse_id,
                    :storage_location_id, :quantity, CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (product_id, warehouse_id, storage_location_id)
            DO UPDATE SET quantity_on_hand = stock_on_hand.quantity_on_hand + :quantity,
                         last_movement_date = CURRENT_TIMESTAMP,
                         updated_at = CURRENT_TIMESTAMP
        """), {
            "company_id": str(company_id),
            "product_id": str(adjustment.product_id),
            "warehouse_id": str(adjustment.warehouse_id),
            "storage_location_id": str(adjustment.storage_location_id) if adjustment.storage_location_id else None,
            "quantity": float(quantity)
        })
        
        db.commit()
        
        query = """
            SELECT sm.id, sm.company_id, sm.product_id, p.name as product_name,
                   sm.warehouse_id, w.name as warehouse_name, sm.storage_location_id,
                   :adjustment_type as adjustment_type, ABS(sm.quantity) as quantity,
                   sm.unit_cost, :reason as reason, sm.notes,
                   sm.created_by, sm.created_at
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            JOIN warehouses w ON sm.warehouse_id = w.id
            WHERE sm.id = :movement_id
        """
        result = db.execute(text(query), {
            "movement_id": str(movement_id),
            "adjustment_type": adjustment.adjustment_type,
            "reason": adjustment.reason
        })
        row = result.fetchone()
        
        return StockAdjustmentResponse(
            id=row[0], company_id=row[1], product_id=row[2], product_name=row[3],
            warehouse_id=row[4], warehouse_name=row[5], storage_location_id=row[6],
            adjustment_type=row[7], quantity=row[8], unit_cost=row[9],
            reason=row[10], notes=row[11], created_by=row[12], created_at=row[13]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating stock adjustment: {str(e)}")

@router.post("/transfers", response_model=StockTransferResponse)
async def create_stock_transfer(
    transfer: StockTransferCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a stock transfer between warehouses"""
    try:
        user_id = get_user_id(db)
        transfer_id = uuid4()
        
        check_query = """
            SELECT quantity_available FROM stock_on_hand
            WHERE company_id = :company_id AND product_id = :product_id
            AND warehouse_id = :warehouse_id
            AND (storage_location_id = :storage_location_id OR (:storage_location_id IS NULL AND storage_location_id IS NULL))
        """
        result = db.execute(text(check_query), {
            "company_id": str(company_id),
            "product_id": str(transfer.product_id),
            "warehouse_id": str(transfer.from_warehouse_id),
            "storage_location_id": str(transfer.from_storage_location_id) if transfer.from_storage_location_id else None
        })
        row = result.fetchone()
        if not row or row[0] < transfer.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock for transfer")
        
        out_movement_id = uuid4()
        db.execute(text("""
            INSERT INTO stock_movements (id, company_id, product_id, warehouse_id,
                                        storage_location_id, movement_type, quantity,
                                        reference_type, reference_id, transaction_date,
                                        notes, created_by, created_at)
            VALUES (:id, :company_id, :product_id, :warehouse_id,
                    :storage_location_id, 'transfer_out', :quantity,
                    'transfer', :reference_id, CURRENT_TIMESTAMP,
                    :notes, :created_by, CURRENT_TIMESTAMP)
        """), {
            "id": str(out_movement_id),
            "company_id": str(company_id),
            "product_id": str(transfer.product_id),
            "warehouse_id": str(transfer.from_warehouse_id),
            "storage_location_id": str(transfer.from_storage_location_id) if transfer.from_storage_location_id else None,
            "quantity": float(-transfer.quantity),
            "reference_id": str(transfer_id),
            "notes": transfer.notes,
            "created_by": str(user_id)
        })
        
        in_movement_id = uuid4()
        db.execute(text("""
            INSERT INTO stock_movements (id, company_id, product_id, warehouse_id,
                                        storage_location_id, movement_type, quantity,
                                        reference_type, reference_id, transaction_date,
                                        notes, created_by, created_at)
            VALUES (:id, :company_id, :product_id, :warehouse_id,
                    :storage_location_id, 'transfer_in', :quantity,
                    'transfer', :reference_id, CURRENT_TIMESTAMP,
                    :notes, :created_by, CURRENT_TIMESTAMP)
        """), {
            "id": str(in_movement_id),
            "company_id": str(company_id),
            "product_id": str(transfer.product_id),
            "warehouse_id": str(transfer.to_warehouse_id),
            "storage_location_id": str(transfer.to_storage_location_id) if transfer.to_storage_location_id else None,
            "quantity": float(transfer.quantity),
            "reference_id": str(transfer_id),
            "notes": transfer.notes,
            "created_by": str(user_id)
        })
        
        db.execute(text("""
            UPDATE stock_on_hand
            SET quantity_on_hand = quantity_on_hand - :quantity,
                last_movement_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = :company_id AND product_id = :product_id
            AND warehouse_id = :warehouse_id
            AND (storage_location_id = :storage_location_id OR (:storage_location_id IS NULL AND storage_location_id IS NULL))
        """), {
            "company_id": str(company_id),
            "product_id": str(transfer.product_id),
            "warehouse_id": str(transfer.from_warehouse_id),
            "storage_location_id": str(transfer.from_storage_location_id) if transfer.from_storage_location_id else None,
            "quantity": float(transfer.quantity)
        })
        
        db.execute(text("""
            INSERT INTO stock_on_hand (id, company_id, product_id, warehouse_id,
                                      storage_location_id, quantity_on_hand, last_movement_date,
                                      created_at, updated_at)
            VALUES (gen_random_uuid(), :company_id, :product_id, :warehouse_id,
                    :storage_location_id, :quantity, CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (product_id, warehouse_id, storage_location_id)
            DO UPDATE SET quantity_on_hand = stock_on_hand.quantity_on_hand + :quantity,
                         last_movement_date = CURRENT_TIMESTAMP,
                         updated_at = CURRENT_TIMESTAMP
        """), {
            "company_id": str(company_id),
            "product_id": str(transfer.product_id),
            "warehouse_id": str(transfer.to_warehouse_id),
            "storage_location_id": str(transfer.to_storage_location_id) if transfer.to_storage_location_id else None,
            "quantity": float(transfer.quantity)
        })
        
        db.commit()
        
        query = """
            SELECT :transfer_id as id, :company_id as company_id,
                   :product_id as product_id, p.name as product_name,
                   :from_warehouse_id as from_warehouse_id, w1.name as from_warehouse_name,
                   :to_warehouse_id as to_warehouse_id, w2.name as to_warehouse_name,
                   :quantity as quantity, 'completed' as status, CURRENT_TIMESTAMP as created_at
            FROM products p
            JOIN warehouses w1 ON w1.id = :from_warehouse_id
            JOIN warehouses w2 ON w2.id = :to_warehouse_id
            WHERE p.id = :product_id
        """
        result = db.execute(text(query), {
            "transfer_id": str(transfer_id),
            "company_id": str(company_id),
            "product_id": str(transfer.product_id),
            "from_warehouse_id": str(transfer.from_warehouse_id),
            "to_warehouse_id": str(transfer.to_warehouse_id),
            "quantity": float(transfer.quantity)
        })
        row = result.fetchone()
        
        return StockTransferResponse(
            id=row[0], company_id=row[1], product_id=row[2], product_name=row[3],
            from_warehouse_id=row[4], from_warehouse_name=row[5],
            to_warehouse_id=row[6], to_warehouse_name=row[7],
            quantity=row[8], status=row[9], created_at=row[10]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating stock transfer: {str(e)}")

@router.get("/stock-movements", response_model=List[dict])
async def get_stock_movements(
    product_id: Optional[UUID] = None,
    warehouse_id: Optional[UUID] = None,
    limit: int = 100,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get stock movements with optional filters"""
    query = """
        SELECT sm.id, sm.product_id, p.name as product_name,
               sm.warehouse_id, w.name as warehouse_name,
               sm.movement_type, sm.quantity, sm.unit_cost,
               sm.reference_type, sm.transaction_date, sm.notes
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        JOIN warehouses w ON sm.warehouse_id = w.id
        WHERE sm.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if product_id:
        query += " AND sm.product_id = :product_id"
        params["product_id"] = str(product_id)
    
    if warehouse_id:
        query += " AND sm.warehouse_id = :warehouse_id"
        params["warehouse_id"] = str(warehouse_id)
    
    query += " ORDER BY sm.transaction_date DESC LIMIT :limit"
    params["limit"] = limit
    
    result = db.execute(text(query), params)
    movements = []
    for row in result:
        movements.append({
            "id": str(row[0]),
            "product_id": str(row[1]),
            "product_name": row[2],
            "warehouse_id": str(row[3]),
            "warehouse_name": row[4],
            "movement_type": row[5],
            "quantity": float(row[6]),
            "unit_cost": float(row[7]) if row[7] else None,
            "reference_type": row[8],
            "transaction_date": row[9].isoformat() if row[9] else None,
            "notes": row[10]
        })
    return movements

@router.get("/valuation", response_model=dict)
async def get_inventory_valuation(
    warehouse_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get inventory valuation summary"""
    query = """
        SELECT 
            COUNT(DISTINCT soh.product_id) as total_products,
            SUM(soh.quantity_on_hand) as total_quantity,
            SUM(soh.quantity_on_hand * COALESCE(p.cost, 0)) as total_value
        FROM stock_on_hand soh
        JOIN products p ON soh.product_id = p.id
        WHERE soh.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if warehouse_id:
        query += " AND soh.warehouse_id = :warehouse_id"
        params["warehouse_id"] = str(warehouse_id)
    
    result = db.execute(text(query), params)
    row = result.fetchone()
    
    return {
        "total_products": row[0] or 0,
        "total_quantity": float(row[1]) if row[1] else 0,
        "total_value": float(row[2]) if row[2] else 0,
        "currency": "ZAR"
    }
