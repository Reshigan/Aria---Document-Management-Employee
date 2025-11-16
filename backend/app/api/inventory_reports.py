"""
Inventory Reports API
Provides 5 comprehensive inventory reports with drill-down to L5:
1. Inventory Valuation Report (with drill-down to cost layers)
2. Inventory Movements Report (with drill-down to transactions)
3. Cost Layers Report (with drill-down to consumption)
4. Lot/Serial Tracking Report (with drill-down to movements)
5. Stock Aging Report (with drill-down to items)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from decimal import Decimal

try:
    from auth import get_db
except ImportError:
    try:
        from auth_integrated import get_db
    except ImportError:
        import sys
        sys.path.insert(0, '/var/www/aria/backend')
        from auth import get_db

router = APIRouter(prefix="/api/reports/inventory", tags=["Inventory Reports"])

# ============================================================================
# ============================================================================

class InventoryValuationItem(BaseModel):
    item_id: str
    item_code: str
    item_name: str
    warehouse_id: str
    warehouse_name: str
    quantity_on_hand: Decimal
    unit_cost: Decimal
    total_value: Decimal
    valuation_method: str

class InventoryValuationReport(BaseModel):
    company_id: str
    report_date: date
    items: List[InventoryValuationItem]
    total_quantity: Decimal
    total_value: Decimal

@router.get("/valuation", response_model=InventoryValuationReport)
def get_inventory_valuation(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    warehouse_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generate Inventory Valuation report with drill-down capability"""
    query = """
        WITH inventory_balances AS (
            SELECT 
                i.id as item_id,
                i.item_code,
                i.item_name,
                w.id as warehouse_id,
                w.name as warehouse_name,
                COALESCE(SUM(CASE 
                    WHEN im.movement_type IN ('RECEIPT', 'ADJUSTMENT_IN', 'TRANSFER_IN') THEN im.quantity
                    WHEN im.movement_type IN ('ISSUE', 'ADJUSTMENT_OUT', 'TRANSFER_OUT') THEN -im.quantity
                    ELSE 0
                END), 0) as quantity_on_hand,
                i.valuation_method
            FROM items i
            CROSS JOIN warehouses w
            LEFT JOIN inventory_movements im ON i.id = im.item_id 
                AND w.id = im.warehouse_id
                AND im.company_id = :company_id
                AND im.movement_date <= :as_of_date
            WHERE i.company_id = :company_id
                AND w.company_id = :company_id
                AND i.is_active = TRUE
                AND w.is_active = TRUE
    """
    
    params = {"company_id": company_id, "as_of_date": as_of_date}
    
    if warehouse_id:
        query += " AND w.id = :warehouse_id"
        params["warehouse_id"] = warehouse_id
    
    query += """
            GROUP BY i.id, i.item_code, i.item_name, w.id, w.name, i.valuation_method
            HAVING COALESCE(SUM(CASE 
                WHEN im.movement_type IN ('RECEIPT', 'ADJUSTMENT_IN', 'TRANSFER_IN') THEN im.quantity
                WHEN im.movement_type IN ('ISSUE', 'ADJUSTMENT_OUT', 'TRANSFER_OUT') THEN -im.quantity
                ELSE 0
            END), 0) > 0
        ),
        item_costs AS (
            SELECT 
                product_id,
                warehouse_id,
                AVG(unit_cost) as avg_unit_cost
            FROM cost_layers cl
            WHERE cl.company_id = :company_id
                AND cl.remaining_quantity > 0
            GROUP BY product_id, warehouse_id
        )
        SELECT 
            ib.item_id,
            ib.item_code,
            ib.item_name,
            ib.warehouse_id,
            ib.warehouse_name,
            ib.quantity_on_hand,
            COALESCE(ic.avg_unit_cost, 0) as unit_cost,
            ib.quantity_on_hand * COALESCE(ic.avg_unit_cost, 0) as total_value,
            ib.valuation_method
        FROM inventory_balances ib
        LEFT JOIN item_costs ic ON ib.item_id = ic.product_id AND ib.warehouse_id = ic.warehouse_id
        ORDER BY ib.item_code, ib.warehouse_name
    """
    
    result = db.execute(text(query), params)
    items = [InventoryValuationItem(**dict(row._mapping)) for row in result]
    
    return InventoryValuationReport(
        company_id=company_id,
        report_date=as_of_date,
        items=items,
        total_quantity=sum(item.quantity_on_hand for item in items),
        total_value=sum(item.total_value for item in items)
    )

@router.get("/valuation/drill-down/{item_id}/{warehouse_id}")
def get_valuation_drilldown(
    item_id: str,
    warehouse_id: str,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    db: Session = Depends(get_db)
):
    """Drill down to cost layers for a specific item/warehouse"""
    query = """
        SELECT 
            cl.id as cost_layer_id,
            cl.receipt_date,
            cl.receipt_reference,
            cl.original_quantity,
            cl.remaining_quantity,
            cl.unit_cost,
            cl.remaining_quantity * cl.unit_cost as layer_value,
            cl.source_document_type,
            cl.source_document_id
        FROM cost_layers cl
        WHERE cl.company_id = :company_id
            AND cl.product_id = :item_id
            AND cl.warehouse_id = :warehouse_id
            AND cl.receipt_date <= :as_of_date
            AND cl.remaining_quantity > 0
        ORDER BY cl.receipt_date, cl.id
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "item_id": item_id,
        "warehouse_id": warehouse_id,
        "as_of_date": as_of_date
    })
    
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

@router.get("/movements")
def get_inventory_movements(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    item_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Inventory Movements report with drill-down to transactions"""
    query = """
        SELECT 
            im.id as movement_id,
            im.movement_date,
            im.movement_type,
            i.item_code,
            i.item_name,
            w.name as warehouse_name,
            im.quantity,
            im.unit_cost,
            im.quantity * im.unit_cost as total_value,
            im.reference_number,
            im.source_document_type,
            im.source_document_id,
            im.notes
        FROM inventory_movements im
        JOIN items i ON im.item_id = i.id AND i.company_id = :company_id
        JOIN warehouses w ON im.warehouse_id = w.id AND w.company_id = :company_id
        WHERE im.company_id = :company_id
            AND im.movement_date BETWEEN :period_start AND :period_end
    """
    
    params = {
        "company_id": company_id,
        "period_start": period_start,
        "period_end": period_end,
        "skip": skip,
        "limit": limit
    }
    
    if item_id:
        query += " AND im.item_id = :item_id"
        params["item_id"] = item_id
    
    if warehouse_id:
        query += " AND im.warehouse_id = :warehouse_id"
        params["warehouse_id"] = warehouse_id
    
    if movement_type:
        query += " AND im.movement_type = :movement_type"
        params["movement_type"] = movement_type
    
    query += " ORDER BY im.movement_date DESC, im.id DESC OFFSET :skip LIMIT :limit"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

@router.get("/cost-layers")
def get_cost_layers(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    item_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Cost Layers report with drill-down to consumption"""
    query = """
        SELECT 
            cl.id as cost_layer_id,
            i.item_code,
            i.item_name,
            w.name as warehouse_name,
            cl.receipt_date,
            cl.receipt_reference,
            cl.original_quantity,
            cl.remaining_quantity,
            cl.unit_cost,
            cl.original_quantity * cl.unit_cost as original_value,
            cl.remaining_quantity * cl.unit_cost as remaining_value,
            cl.source_document_type,
            cl.source_document_id
        FROM cost_layers cl
        JOIN items i ON cl.product_id = i.id AND i.company_id = :company_id
        JOIN warehouses w ON cl.warehouse_id = w.id AND w.company_id = :company_id
        WHERE cl.company_id = :company_id
            AND cl.receipt_date <= :as_of_date
            AND cl.remaining_quantity > 0
    """
    
    params = {
        "company_id": company_id,
        "as_of_date": as_of_date,
        "skip": skip,
        "limit": limit
    }
    
    if item_id:
        query += " AND cl.product_id = :item_id"
        params["item_id"] = item_id
    
    if warehouse_id:
        query += " AND cl.warehouse_id = :warehouse_id"
        params["warehouse_id"] = warehouse_id
    
    query += " ORDER BY cl.receipt_date DESC, cl.id DESC OFFSET :skip LIMIT :limit"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.get("/cost-layers/drill-down/{cost_layer_id}")
def get_cost_layer_consumption(
    cost_layer_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Drill down to consumption for a specific cost layer"""
    query = """
        SELECT 
            clc.id as consumption_id,
            clc.consumption_date,
            clc.quantity_consumed,
            clc.unit_cost,
            clc.quantity_consumed * clc.unit_cost as total_cost,
            clc.source_document_type,
            clc.source_document_id,
            clc.notes
        FROM cost_layer_consumption clc
        WHERE clc.company_id = :company_id
            AND clc.cost_layer_id = :cost_layer_id
        ORDER BY clc.consumption_date DESC, clc.id DESC
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "cost_layer_id": cost_layer_id
    })
    
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

@router.get("/lot-serial-tracking")
def get_lot_serial_tracking(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    item_id: Optional[str] = None,
    lot_number: Optional[str] = None,
    serial_number: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Lot/Serial Tracking report with drill-down to movements"""
    query = """
        SELECT 
            lst.id as tracking_id,
            i.item_code,
            i.item_name,
            lst.lot_number,
            lst.serial_number,
            w.name as warehouse_name,
            lst.quantity_on_hand,
            lst.manufacture_date,
            lst.expiry_date,
            lst.status,
            lst.location
        FROM lot_serial_tracking lst
        JOIN items i ON lst.item_id = i.id AND i.company_id = :company_id
        LEFT JOIN warehouses w ON lst.warehouse_id = w.id AND w.company_id = :company_id
        WHERE lst.company_id = :company_id
            AND lst.quantity_on_hand > 0
    """
    
    params = {
        "company_id": company_id,
        "skip": skip,
        "limit": limit
    }
    
    if item_id:
        query += " AND lst.item_id = :item_id"
        params["item_id"] = item_id
    
    if lot_number:
        query += " AND lst.lot_number = :lot_number"
        params["lot_number"] = lot_number
    
    if serial_number:
        query += " AND lst.serial_number = :serial_number"
        params["serial_number"] = serial_number
    
    if warehouse_id:
        query += " AND lst.warehouse_id = :warehouse_id"
        params["warehouse_id"] = warehouse_id
    
    query += " ORDER BY lst.expiry_date NULLS LAST, lst.manufacture_date DESC OFFSET :skip LIMIT :limit"
    
    result = db.execute(text(query), params)
    return [dict(row._mapping) for row in result]

@router.get("/lot-serial-tracking/drill-down/{tracking_id}")
def get_lot_serial_movements(
    tracking_id: int,
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    db: Session = Depends(get_db)
):
    """Drill down to movements for a specific lot/serial"""
    query = """
        SELECT 
            im.id as movement_id,
            im.movement_date,
            im.movement_type,
            im.quantity,
            im.unit_cost,
            im.reference_number,
            im.source_document_type,
            im.source_document_id,
            im.notes
        FROM inventory_movements im
        WHERE im.company_id = :company_id
            AND im.lot_serial_tracking_id = :tracking_id
        ORDER BY im.movement_date DESC, im.id DESC
    """
    
    result = db.execute(text(query), {
        "company_id": company_id,
        "tracking_id": tracking_id
    })
    
    return [dict(row._mapping) for row in result]

# ============================================================================
# ============================================================================

class StockAgingItem(BaseModel):
    item_id: str
    item_code: str
    item_name: str
    warehouse_id: str
    warehouse_name: str
    quantity_on_hand: Decimal
    days_0_30: Decimal
    days_31_60: Decimal
    days_61_90: Decimal
    days_over_90: Decimal
    average_age_days: int
    total_value: Decimal

class StockAgingReport(BaseModel):
    company_id: str
    report_date: date
    items: List[StockAgingItem]
    total_quantity: Decimal
    total_value: Decimal

@router.get("/stock-aging", response_model=StockAgingReport)
def get_stock_aging(
    company_id: str = Query(..., description="Company ID for multi-tenancy"),
    as_of_date: date = Query(..., description="Report as of date"),
    warehouse_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Stock Aging report with drill-down to items"""
    query = """
        WITH cost_layer_aging AS (
            SELECT 
                cl.product_id,
                cl.warehouse_id,
                cl.remaining_quantity,
                cl.unit_cost,
                :as_of_date - cl.receipt_date as age_days
            FROM cost_layers cl
            WHERE cl.company_id = :company_id
                AND cl.receipt_date <= :as_of_date
                AND cl.remaining_quantity > 0
        )
        SELECT 
            i.id as item_id,
            i.item_code,
            i.item_name,
            w.id as warehouse_id,
            w.name as warehouse_name,
            SUM(cla.remaining_quantity) as quantity_on_hand,
            SUM(CASE WHEN cla.age_days <= 30 THEN cla.remaining_quantity ELSE 0 END) as days_0_30,
            SUM(CASE WHEN cla.age_days BETWEEN 31 AND 60 THEN cla.remaining_quantity ELSE 0 END) as days_31_60,
            SUM(CASE WHEN cla.age_days BETWEEN 61 AND 90 THEN cla.remaining_quantity ELSE 0 END) as days_61_90,
            SUM(CASE WHEN cla.age_days > 90 THEN cla.remaining_quantity ELSE 0 END) as days_over_90,
            CAST(AVG(cla.age_days) AS INTEGER) as average_age_days,
            SUM(cla.remaining_quantity * cla.unit_cost) as total_value
        FROM cost_layer_aging cla
        JOIN items i ON cla.item_id = i.id AND i.company_id = :company_id
        JOIN warehouses w ON cla.warehouse_id = w.id AND w.company_id = :company_id
        WHERE i.is_active = TRUE
            AND w.is_active = TRUE
    """
    
    params = {"company_id": company_id, "as_of_date": as_of_date}
    
    if warehouse_id:
        query += " AND w.id = :warehouse_id"
        params["warehouse_id"] = warehouse_id
    
    query += """
        GROUP BY i.id, i.item_code, i.item_name, w.id, w.name
        HAVING SUM(cla.remaining_quantity) > 0
        ORDER BY average_age_days DESC, i.item_code
    """
    
    result = db.execute(text(query), params)
    items = [StockAgingItem(**dict(row._mapping)) for row in result]
    
    return StockAgingReport(
        company_id=company_id,
        report_date=as_of_date,
        items=items,
        total_quantity=sum(item.quantity_on_hand for item in items),
        total_value=sum(item.total_value for item in items)
    )
