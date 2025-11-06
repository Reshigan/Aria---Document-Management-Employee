"""
ARIA ERP - Manufacturing Module
Complete manufacturing management: Work Orders, Production Runs, MRP
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, date

router = APIRouter(prefix="/api/erp/manufacturing", tags=["Manufacturing"])


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


class WorkOrderCreate(BaseModel):
    product_id: UUID
    quantity_to_produce: Decimal
    warehouse_id: Optional[UUID] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    priority: str = "normal"  # low, normal, high, urgent
    notes: Optional[str] = None

class WorkOrderResponse(BaseModel):
    id: UUID
    company_id: UUID
    wo_number: str
    product_id: UUID
    product_name: Optional[str] = None
    quantity_to_produce: Decimal
    quantity_produced: Decimal
    warehouse_id: Optional[UUID]
    warehouse_name: Optional[str] = None
    start_date: Optional[date]
    due_date: Optional[date]
    completion_date: Optional[date]
    status: str
    priority: str
    notes: Optional[str]
    created_by: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProductionRunCreate(BaseModel):
    work_order_id: UUID
    quantity_produced: Decimal
    quantity_scrapped: Decimal = Decimal("0")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None

class ProductionRunResponse(BaseModel):
    id: UUID
    company_id: UUID
    work_order_id: UUID
    wo_number: Optional[str] = None
    run_number: str
    quantity_produced: Decimal
    quantity_scrapped: Decimal
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    operator_id: Optional[UUID]
    operator_name: Optional[str] = None
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "manufacturing",
        "endpoints": ["work-orders", "production-runs", "mrp"]
    }


@router.get("/work-orders", response_model=List[WorkOrderResponse])
async def get_work_orders(
    status: Optional[str] = None,
    product_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get all work orders with optional filters"""
    query = """
        SELECT wo.id, wo.company_id, wo.wo_number, wo.product_id, p.name as product_name,
               wo.quantity_to_produce, wo.quantity_produced,
               wo.warehouse_id, w.name as warehouse_name,
               wo.start_date, wo.due_date, wo.completion_date,
               wo.status, wo.priority, wo.notes, wo.created_by, wo.created_at
        FROM work_orders wo
        JOIN products p ON wo.product_id = p.id
        LEFT JOIN warehouses w ON wo.warehouse_id = w.id
        WHERE wo.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if status:
        query += " AND wo.status = :status"
        params["status"] = status
    
    if product_id:
        query += " AND wo.product_id = :product_id"
        params["product_id"] = str(product_id)
    
    query += " ORDER BY wo.created_at DESC"
    
    result = db.execute(text(query), params)
    work_orders = []
    for row in result:
        work_orders.append(WorkOrderResponse(
            id=row[0], company_id=row[1], wo_number=row[2], product_id=row[3],
            product_name=row[4], quantity_to_produce=row[5], quantity_produced=row[6],
            warehouse_id=row[7], warehouse_name=row[8],
            start_date=row[9], due_date=row[10], completion_date=row[11],
            status=row[12], priority=row[13], notes=row[14],
            created_by=row[15], created_at=row[16]
        ))
    return work_orders

@router.post("/work-orders", response_model=WorkOrderResponse)
async def create_work_order(
    work_order: WorkOrderCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a work order"""
    try:
        wo_id = uuid4()
        user_id = get_user_id(db)
        
        count_result = db.execute(
            text("SELECT COUNT(*) FROM work_orders WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.scalar()
        wo_number = f"WO-{datetime.now().year}-{str(count + 1).zfill(5)}"
        
        db.execute(text("""
            INSERT INTO work_orders (id, company_id, wo_number, product_id,
                                    quantity_to_produce, quantity_produced,
                                    warehouse_id, start_date, due_date,
                                    status, priority, notes, created_by,
                                    created_at, updated_at)
            VALUES (:id, :company_id, :wo_number, :product_id,
                    :quantity_to_produce, 0,
                    :warehouse_id, :start_date, :due_date,
                    'draft', :priority, :notes, :created_by,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(wo_id),
            "company_id": str(company_id),
            "wo_number": wo_number,
            "product_id": str(work_order.product_id),
            "quantity_to_produce": float(work_order.quantity_to_produce),
            "warehouse_id": str(work_order.warehouse_id) if work_order.warehouse_id else None,
            "start_date": work_order.start_date,
            "due_date": work_order.due_date,
            "priority": work_order.priority,
            "notes": work_order.notes,
            "created_by": str(user_id)
        })
        
        db.commit()
        
        query = """
            SELECT wo.id, wo.company_id, wo.wo_number, wo.product_id, p.name as product_name,
                   wo.quantity_to_produce, wo.quantity_produced,
                   wo.warehouse_id, w.name as warehouse_name,
                   wo.start_date, wo.due_date, wo.completion_date,
                   wo.status, wo.priority, wo.notes, wo.created_by, wo.created_at
            FROM work_orders wo
            JOIN products p ON wo.product_id = p.id
            LEFT JOIN warehouses w ON wo.warehouse_id = w.id
            WHERE wo.id = :wo_id
        """
        result = db.execute(text(query), {"wo_id": str(wo_id)})
        row = result.fetchone()
        
        return WorkOrderResponse(
            id=row[0], company_id=row[1], wo_number=row[2], product_id=row[3],
            product_name=row[4], quantity_to_produce=row[5], quantity_produced=row[6],
            warehouse_id=row[7], warehouse_name=row[8],
            start_date=row[9], due_date=row[10], completion_date=row[11],
            status=row[12], priority=row[13], notes=row[14],
            created_by=row[15], created_at=row[16]
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating work order: {str(e)}")

@router.post("/work-orders/{wo_id}/release")
async def release_work_order(
    wo_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Release work order for production"""
    try:
        db.execute(text("""
            UPDATE work_orders
            SET status = 'released', updated_at = CURRENT_TIMESTAMP
            WHERE id = :wo_id AND company_id = :company_id AND status = 'draft'
        """), {
            "wo_id": str(wo_id),
            "company_id": str(company_id)
        })
        
        db.commit()
        return {"message": "Work order released successfully", "wo_id": str(wo_id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error releasing work order: {str(e)}")

@router.post("/work-orders/{wo_id}/start")
async def start_work_order(
    wo_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Start work order production"""
    try:
        db.execute(text("""
            UPDATE work_orders
            SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
            WHERE id = :wo_id AND company_id = :company_id AND status = 'released'
        """), {
            "wo_id": str(wo_id),
            "company_id": str(company_id)
        })
        
        db.commit()
        return {"message": "Work order started successfully", "wo_id": str(wo_id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error starting work order: {str(e)}")

@router.post("/work-orders/{wo_id}/complete")
async def complete_work_order(
    wo_id: UUID,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Complete work order"""
    try:
        db.execute(text("""
            UPDATE work_orders
            SET status = 'completed', completion_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
            WHERE id = :wo_id AND company_id = :company_id AND status = 'in_progress'
        """), {
            "wo_id": str(wo_id),
            "company_id": str(company_id)
        })
        
        db.commit()
        return {"message": "Work order completed successfully", "wo_id": str(wo_id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error completing work order: {str(e)}")


@router.get("/production-runs", response_model=List[ProductionRunResponse])
async def get_production_runs(
    work_order_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get all production runs with optional filters"""
    query = """
        SELECT pr.id, pr.company_id, pr.work_order_id, wo.wo_number,
               pr.run_number, pr.quantity_produced, pr.quantity_scrapped,
               pr.start_time, pr.end_time, pr.operator_id, u.full_name as operator_name,
               pr.notes, pr.created_at
        FROM production_runs pr
        JOIN work_orders wo ON pr.work_order_id = wo.id
        LEFT JOIN users u ON pr.operator_id = u.id
        WHERE pr.company_id = :company_id
    """
    params = {"company_id": str(company_id)}
    
    if work_order_id:
        query += " AND pr.work_order_id = :work_order_id"
        params["work_order_id"] = str(work_order_id)
    
    query += " ORDER BY pr.created_at DESC"
    
    result = db.execute(text(query), params)
    runs = []
    for row in result:
        runs.append(ProductionRunResponse(
            id=row[0], company_id=row[1], work_order_id=row[2], wo_number=row[3],
            run_number=row[4], quantity_produced=row[5], quantity_scrapped=row[6],
            start_time=row[7], end_time=row[8], operator_id=row[9], operator_name=row[10],
            notes=row[11], created_at=row[12]
        ))
    return runs

@router.post("/production-runs", response_model=ProductionRunResponse)
async def create_production_run(
    production_run: ProductionRunCreate,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Create a production run"""
    try:
        run_id = uuid4()
        user_id = get_user_id(db)
        
        count_result = db.execute(
            text("SELECT COUNT(*) FROM production_runs WHERE company_id = :company_id"),
            {"company_id": str(company_id)}
        )
        count = count_result.scalar()
        run_number = f"PR-{datetime.now().year}-{str(count + 1).zfill(6)}"
        
        wo_query = """
            SELECT product_id, warehouse_id FROM work_orders
            WHERE id = :wo_id AND company_id = :company_id
        """
        result = db.execute(text(wo_query), {
            "wo_id": str(production_run.work_order_id),
            "company_id": str(company_id)
        })
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        product_id, warehouse_id = row
        
        db.execute(text("""
            INSERT INTO production_runs (id, company_id, work_order_id, run_number,
                                        quantity_produced, quantity_scrapped,
                                        start_time, end_time, operator_id, notes,
                                        created_at, updated_at)
            VALUES (:id, :company_id, :work_order_id, :run_number,
                    :quantity_produced, :quantity_scrapped,
                    :start_time, :end_time, :operator_id, :notes,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {
            "id": str(run_id),
            "company_id": str(company_id),
            "work_order_id": str(production_run.work_order_id),
            "run_number": run_number,
            "quantity_produced": float(production_run.quantity_produced),
            "quantity_scrapped": float(production_run.quantity_scrapped),
            "start_time": production_run.start_time,
            "end_time": production_run.end_time,
            "operator_id": str(user_id),
            "notes": production_run.notes
        })
        
        db.execute(text("""
            UPDATE work_orders
            SET quantity_produced = quantity_produced + :quantity_produced,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :work_order_id
        """), {
            "quantity_produced": float(production_run.quantity_produced),
            "work_order_id": str(production_run.work_order_id)
        })
        
        if warehouse_id:
            movement_id = uuid4()
            db.execute(text("""
                INSERT INTO stock_movements (id, company_id, product_id, warehouse_id,
                                            movement_type, quantity, reference_type, reference_id,
                                            transaction_date, created_at, updated_at)
                VALUES (:id, :company_id, :product_id, :warehouse_id,
                        'production', :quantity, 'production_run', :run_id,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "id": str(movement_id),
                "company_id": str(company_id),
                "product_id": str(product_id),
                "warehouse_id": str(warehouse_id),
                "quantity": float(production_run.quantity_produced),
                "run_id": str(run_id)
            })
            
            db.execute(text("""
                INSERT INTO stock_on_hand (id, company_id, product_id, warehouse_id,
                                          quantity_on_hand, last_movement_date,
                                          created_at, updated_at)
                VALUES (gen_random_uuid(), :company_id, :product_id, :warehouse_id,
                        :quantity, CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (product_id, warehouse_id, storage_location_id)
                DO UPDATE SET quantity_on_hand = stock_on_hand.quantity_on_hand + :quantity,
                             last_movement_date = CURRENT_TIMESTAMP,
                             updated_at = CURRENT_TIMESTAMP
            """), {
                "company_id": str(company_id),
                "product_id": str(product_id),
                "warehouse_id": str(warehouse_id),
                "quantity": float(production_run.quantity_produced)
            })
        
        db.commit()
        
        query = """
            SELECT pr.id, pr.company_id, pr.work_order_id, wo.wo_number,
                   pr.run_number, pr.quantity_produced, pr.quantity_scrapped,
                   pr.start_time, pr.end_time, pr.operator_id, u.full_name as operator_name,
                   pr.notes, pr.created_at
            FROM production_runs pr
            JOIN work_orders wo ON pr.work_order_id = wo.id
            LEFT JOIN users u ON pr.operator_id = u.id
            WHERE pr.id = :run_id
        """
        result = db.execute(text(query), {"run_id": str(run_id)})
        row = result.fetchone()
        
        return ProductionRunResponse(
            id=row[0], company_id=row[1], work_order_id=row[2], wo_number=row[3],
            run_number=row[4], quantity_produced=row[5], quantity_scrapped=row[6],
            start_time=row[7], end_time=row[8], operator_id=row[9], operator_name=row[10],
            notes=row[11], created_at=row[12]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating production run: {str(e)}")


@router.get("/mrp/demand-forecast", response_model=dict)
async def get_demand_forecast(
    product_id: Optional[UUID] = None,
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get demand forecast based on sales orders and work orders"""
    query = """
        SELECT 
            COUNT(DISTINCT wo.id) as active_work_orders,
            SUM(wo.quantity_to_produce - wo.quantity_produced) as pending_production,
            COUNT(DISTINCT pr.id) as production_runs_this_month
        FROM work_orders wo
        LEFT JOIN production_runs pr ON wo.id = pr.work_order_id 
            AND pr.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        WHERE wo.company_id = :company_id
        AND wo.status IN ('draft', 'released', 'in_progress')
    """
    params = {"company_id": str(company_id)}
    
    if product_id:
        query += " AND wo.product_id = :product_id"
        params["product_id"] = str(product_id)
    
    result = db.execute(text(query), params)
    row = result.fetchone()
    
    return {
        "active_work_orders": row[0] or 0,
        "pending_production_quantity": float(row[1]) if row[1] else 0,
        "production_runs_this_month": row[2] or 0,
        "forecast_period": "current_month"
    }

@router.get("/production-summary", response_model=dict)
async def get_production_summary(
    company_id: UUID = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """Get production summary statistics"""
    query = """
        SELECT 
            COUNT(DISTINCT wo.id) as total_work_orders,
            COUNT(DISTINCT wo.id) FILTER (WHERE wo.status = 'completed') as completed_work_orders,
            COUNT(DISTINCT wo.id) FILTER (WHERE wo.status = 'in_progress') as in_progress_work_orders,
            SUM(pr.quantity_produced) as total_quantity_produced,
            SUM(pr.quantity_scrapped) as total_quantity_scrapped
        FROM work_orders wo
        LEFT JOIN production_runs pr ON wo.id = pr.work_order_id
        WHERE wo.company_id = :company_id
    """
    result = db.execute(text(query), {"company_id": str(company_id)})
    row = result.fetchone()
    
    total_produced = float(row[3]) if row[3] else 0
    total_scrapped = float(row[4]) if row[4] else 0
    scrap_rate = (total_scrapped / total_produced * 100) if total_produced > 0 else 0
    
    return {
        "total_work_orders": row[0] or 0,
        "completed_work_orders": row[1] or 0,
        "in_progress_work_orders": row[2] or 0,
        "total_quantity_produced": total_produced,
        "total_quantity_scrapped": total_scrapped,
        "scrap_rate_percentage": round(scrap_rate, 2)
    }
