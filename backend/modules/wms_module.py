"""
Lean WMS Module - Priority 9
Warehouse Management System with storage locations (no bins)
Receiving → Putaway → Picking → Packing → Shipping
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import asyncpg
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp/wms", tags=["Warehouse Management"])


# ============================================================================
# Pydantic Models
# ============================================================================

class WarehouseCreate(BaseModel):
    company_id: str
    code: str
    name: str
    address_line1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None

class StorageLocationCreate(BaseModel):
    warehouse_id: str
    company_id: str
    code: str
    name: str
    location_type: str = "storage"
    capacity_units: Optional[Decimal] = None

class PickListCreate(BaseModel):
    company_id: str
    warehouse_id: str
    sales_order_id: Optional[str] = None
    delivery_id: Optional[str] = None
    pick_date: date
    priority: int = 5
    lines: List[Dict[str, Any]]

class PackingListCreate(BaseModel):
    company_id: str
    pick_list_id: Optional[str] = None
    delivery_id: Optional[str] = None
    pack_date: date
    number_of_packages: int = 1
    lines: List[Dict[str, Any]]

class CycleCountCreate(BaseModel):
    company_id: str
    warehouse_id: str
    count_date: date
    count_type: str = "full"
    lines: List[Dict[str, Any]]

class StockAdjustmentCreate(BaseModel):
    company_id: str
    warehouse_id: str
    adjustment_date: date
    adjustment_type: str
    reason: Optional[str] = None
    lines: List[Dict[str, Any]]


# ============================================================================
# ============================================================================

async def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    
    try:
        conn = await asyncpg.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# ============================================================================
# ============================================================================

@router.post("/warehouses")
async def create_warehouse(warehouse: WarehouseCreate):
    """Create a new warehouse"""
    conn = await get_db_connection()
    
    try:
        new_warehouse = await conn.fetchrow(
            """
            INSERT INTO warehouses 
            (company_id, code, name, address_line1, city, province, postal_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, code, name, created_at
            """,
            warehouse.company_id, warehouse.code, warehouse.name,
            warehouse.address_line1, warehouse.city, warehouse.province, warehouse.postal_code
        )
        
        return {
            "status": "success",
            "message": f"Warehouse {warehouse.code} created successfully",
            "warehouse": {
                "id": str(new_warehouse['id']),
                "code": new_warehouse['code'],
                "name": new_warehouse['name'],
                "created_at": new_warehouse['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating warehouse: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create warehouse: {str(e)}")
    finally:
        await conn.close()


@router.get("/warehouses")
async def list_warehouses(
    company_id: str,
    is_active: bool = True
):
    """List warehouses"""
    conn = await get_db_connection()
    
    try:
        warehouses = await conn.fetch(
            """
            SELECT id, code, name, address_line1, city, province, warehouse_type, is_active
            FROM warehouses
            WHERE company_id = $1 AND is_active = $2
            ORDER BY code
            """,
            company_id, is_active
        )
        
        return {
            "warehouses": [
                {
                    "id": str(w['id']),
                    "code": w['code'],
                    "name": w['name'],
                    "address_line1": w['address_line1'],
                    "city": w['city'],
                    "province": w['province'],
                    "warehouse_type": w['warehouse_type'],
                    "is_active": w['is_active']
                }
                for w in warehouses
            ],
            "total": len(warehouses)
        }
    
    except Exception as e:
        logger.error(f"Error listing warehouses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list warehouses: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/storage-locations")
async def create_storage_location(location: StorageLocationCreate):
    """Create a new storage location"""
    conn = await get_db_connection()
    
    try:
        new_location = await conn.fetchrow(
            """
            INSERT INTO storage_locations 
            (warehouse_id, company_id, code, name, location_type, capacity_units)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, code, name, location_type, created_at
            """,
            location.warehouse_id, location.company_id, location.code,
            location.name, location.location_type, location.capacity_units
        )
        
        return {
            "status": "success",
            "message": f"Storage location {location.code} created successfully",
            "storage_location": {
                "id": str(new_location['id']),
                "code": new_location['code'],
                "name": new_location['name'],
                "location_type": new_location['location_type'],
                "created_at": new_location['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating storage location: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create storage location: {str(e)}")
    finally:
        await conn.close()


@router.get("/storage-locations")
async def list_storage_locations(
    warehouse_id: str,
    location_type: Optional[str] = None,
    is_active: bool = True
):
    """List storage locations"""
    conn = await get_db_connection()
    
    try:
        if location_type:
            locations = await conn.fetch(
                """
                SELECT id, code, name, location_type, capacity_units, current_utilization, is_active
                FROM storage_locations
                WHERE warehouse_id = $1 AND location_type = $2 AND is_active = $3
                ORDER BY code
                """,
                warehouse_id, location_type, is_active
            )
        else:
            locations = await conn.fetch(
                """
                SELECT id, code, name, location_type, capacity_units, current_utilization, is_active
                FROM storage_locations
                WHERE warehouse_id = $1 AND is_active = $2
                ORDER BY code
                """,
                warehouse_id, is_active
            )
        
        return {
            "storage_locations": [
                {
                    "id": str(l['id']),
                    "code": l['code'],
                    "name": l['name'],
                    "location_type": l['location_type'],
                    "capacity_units": float(l['capacity_units']) if l['capacity_units'] else None,
                    "current_utilization": float(l['current_utilization']),
                    "is_active": l['is_active']
                }
                for l in locations
            ],
            "total": len(locations)
        }
    
    except Exception as e:
        logger.error(f"Error listing storage locations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list storage locations: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/stock-on-hand")
async def get_stock_on_hand(
    company_id: str,
    warehouse_id: Optional[str] = None,
    product_id: Optional[str] = None
):
    """Get stock on hand"""
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT soh.id, soh.product_id, soh.warehouse_id, soh.storage_location_id,
                   soh.quantity, soh.unit_of_measure, soh.unit_cost, soh.total_value,
                   w.code as warehouse_code, w.name as warehouse_name,
                   sl.code as location_code, sl.name as location_name
            FROM stock_on_hand soh
            JOIN warehouses w ON soh.warehouse_id = w.id
            LEFT JOIN storage_locations sl ON soh.storage_location_id = sl.id
            WHERE soh.company_id = $1
        """
        params = [company_id]
        
        if warehouse_id:
            query += " AND soh.warehouse_id = $2"
            params.append(warehouse_id)
        
        if product_id:
            query += f" AND soh.product_id = ${len(params) + 1}"
            params.append(product_id)
        
        query += " ORDER BY w.code, sl.code"
        
        stock = await conn.fetch(query, *params)
        
        return {
            "stock_on_hand": [
                {
                    "id": str(s['id']),
                    "product_id": str(s['product_id']),
                    "warehouse_id": str(s['warehouse_id']),
                    "warehouse_code": s['warehouse_code'],
                    "warehouse_name": s['warehouse_name'],
                    "storage_location_id": str(s['storage_location_id']) if s['storage_location_id'] else None,
                    "location_code": s['location_code'],
                    "location_name": s['location_name'],
                    "quantity": float(s['quantity']),
                    "unit_of_measure": s['unit_of_measure'],
                    "unit_cost": float(s['unit_cost']) if s['unit_cost'] else 0,
                    "total_value": float(s['total_value']) if s['total_value'] else 0
                }
                for s in stock
            ],
            "total": len(stock)
        }
    
    except Exception as e:
        logger.error(f"Error getting stock on hand: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock on hand: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/pick-lists")
async def create_pick_list(pick_list: PickListCreate):
    """Create a new pick list"""
    conn = await get_db_connection()
    
    try:
        pick_count = await conn.fetchval(
            "SELECT COUNT(*) FROM pick_lists WHERE company_id = $1",
            pick_list.company_id
        )
        pick_list_number = f"PICK-{pick_count + 1:06d}"
        
        new_pick_list = await conn.fetchrow(
            """
            INSERT INTO pick_lists 
            (company_id, pick_list_number, warehouse_id, sales_order_id, delivery_id, pick_date, priority)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, pick_list_number, status, created_at
            """,
            pick_list.company_id, pick_list_number, pick_list.warehouse_id,
            pick_list.sales_order_id, pick_list.delivery_id, pick_list.pick_date, pick_list.priority
        )
        
        for idx, line in enumerate(pick_list.lines, start=1):
            await conn.execute(
                """
                INSERT INTO pick_list_lines 
                (pick_list_id, line_number, product_id, storage_location_id, quantity_required, unit_of_measure)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                new_pick_list['id'], idx, line['product_id'], line.get('storage_location_id'),
                line['quantity_required'], line.get('unit_of_measure')
            )
        
        return {
            "status": "success",
            "message": f"Pick list {pick_list_number} created successfully",
            "pick_list": {
                "id": str(new_pick_list['id']),
                "pick_list_number": new_pick_list['pick_list_number'],
                "status": new_pick_list['status'],
                "created_at": new_pick_list['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating pick list: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create pick list: {str(e)}")
    finally:
        await conn.close()


@router.get("/pick-lists")
async def list_pick_lists(
    company_id: str,
    warehouse_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List pick lists"""
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT id, pick_list_number, warehouse_id, pick_date, status, priority, created_at
            FROM pick_lists
            WHERE company_id = $1
        """
        params = [company_id]
        
        if warehouse_id:
            query += " AND warehouse_id = $2"
            params.append(warehouse_id)
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        query += f" ORDER BY pick_date DESC, priority ASC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        pick_lists = await conn.fetch(query, *params)
        
        return {
            "pick_lists": [
                {
                    "id": str(p['id']),
                    "pick_list_number": p['pick_list_number'],
                    "warehouse_id": str(p['warehouse_id']),
                    "pick_date": p['pick_date'].isoformat(),
                    "status": p['status'],
                    "priority": p['priority'],
                    "created_at": p['created_at'].isoformat()
                }
                for p in pick_lists
            ],
            "total": len(pick_lists)
        }
    
    except Exception as e:
        logger.error(f"Error listing pick lists: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list pick lists: {str(e)}")
    finally:
        await conn.close()


@router.post("/pick-lists/{pick_list_id}/complete")
async def complete_pick_list(pick_list_id: str):
    """Complete a pick list"""
    conn = await get_db_connection()
    
    try:
        await conn.execute(
            """
            UPDATE pick_lists
            SET status = 'picked', completed_at = NOW(), updated_at = NOW()
            WHERE id = $1
            """,
            pick_list_id
        )
        
        return {
            "status": "success",
            "message": "Pick list completed successfully"
        }
    
    except Exception as e:
        logger.error(f"Error completing pick list: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to complete pick list: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/packing-lists")
async def create_packing_list(packing_list: PackingListCreate):
    """Create a new packing list"""
    conn = await get_db_connection()
    
    try:
        pack_count = await conn.fetchval(
            "SELECT COUNT(*) FROM packing_lists WHERE company_id = $1",
            packing_list.company_id
        )
        packing_list_number = f"PACK-{pack_count + 1:06d}"
        
        new_packing_list = await conn.fetchrow(
            """
            INSERT INTO packing_lists 
            (company_id, packing_list_number, pick_list_id, delivery_id, pack_date, number_of_packages)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, packing_list_number, status, created_at
            """,
            packing_list.company_id, packing_list_number, packing_list.pick_list_id,
            packing_list.delivery_id, packing_list.pack_date, packing_list.number_of_packages
        )
        
        for idx, line in enumerate(packing_list.lines, start=1):
            await conn.execute(
                """
                INSERT INTO packing_list_lines 
                (packing_list_id, line_number, product_id, quantity_packed, unit_of_measure, package_number)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                new_packing_list['id'], idx, line['product_id'], line['quantity_packed'],
                line.get('unit_of_measure'), line.get('package_number', 1)
            )
        
        return {
            "status": "success",
            "message": f"Packing list {packing_list_number} created successfully",
            "packing_list": {
                "id": str(new_packing_list['id']),
                "packing_list_number": new_packing_list['packing_list_number'],
                "status": new_packing_list['status'],
                "created_at": new_packing_list['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating packing list: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create packing list: {str(e)}")
    finally:
        await conn.close()


@router.get("/packing-lists")
async def list_packing_lists(
    company_id: str,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List packing lists"""
    conn = await get_db_connection()
    
    try:
        if status:
            packing_lists = await conn.fetch(
                """
                SELECT id, packing_list_number, pack_date, status, number_of_packages, created_at
                FROM packing_lists
                WHERE company_id = $1 AND status = $2
                ORDER BY pack_date DESC
                LIMIT $3
                """,
                company_id, status, limit
            )
        else:
            packing_lists = await conn.fetch(
                """
                SELECT id, packing_list_number, pack_date, status, number_of_packages, created_at
                FROM packing_lists
                WHERE company_id = $1
                ORDER BY pack_date DESC
                LIMIT $2
                """,
                company_id, limit
            )
        
        return {
            "packing_lists": [
                {
                    "id": str(p['id']),
                    "packing_list_number": p['packing_list_number'],
                    "pack_date": p['pack_date'].isoformat(),
                    "status": p['status'],
                    "number_of_packages": p['number_of_packages'],
                    "created_at": p['created_at'].isoformat()
                }
                for p in packing_lists
            ],
            "total": len(packing_lists)
        }
    
    except Exception as e:
        logger.error(f"Error listing packing lists: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list packing lists: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/cycle-counts")
async def create_cycle_count(cycle_count: CycleCountCreate):
    """Create a new cycle count"""
    conn = await get_db_connection()
    
    try:
        count_num = await conn.fetchval(
            "SELECT COUNT(*) FROM cycle_counts WHERE company_id = $1",
            cycle_count.company_id
        )
        cycle_count_number = f"CC-{count_num + 1:06d}"
        
        new_cycle_count = await conn.fetchrow(
            """
            INSERT INTO cycle_counts 
            (company_id, cycle_count_number, warehouse_id, count_date, count_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, cycle_count_number, status, created_at
            """,
            cycle_count.company_id, cycle_count_number, cycle_count.warehouse_id,
            cycle_count.count_date, cycle_count.count_type
        )
        
        for idx, line in enumerate(cycle_count.lines, start=1):
            system_qty = await conn.fetchval(
                """
                SELECT COALESCE(quantity, 0)
                FROM stock_on_hand
                WHERE company_id = $1 AND product_id = $2 AND warehouse_id = $3
                """,
                cycle_count.company_id, line['product_id'], cycle_count.warehouse_id
            ) or Decimal('0')
            
            await conn.execute(
                """
                INSERT INTO cycle_count_lines 
                (cycle_count_id, line_number, product_id, storage_location_id, system_quantity, unit_of_measure)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                new_cycle_count['id'], idx, line['product_id'], line.get('storage_location_id'),
                system_qty, line.get('unit_of_measure')
            )
        
        return {
            "status": "success",
            "message": f"Cycle count {cycle_count_number} created successfully",
            "cycle_count": {
                "id": str(new_cycle_count['id']),
                "cycle_count_number": new_cycle_count['cycle_count_number'],
                "status": new_cycle_count['status'],
                "created_at": new_cycle_count['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating cycle count: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create cycle count: {str(e)}")
    finally:
        await conn.close()


@router.get("/cycle-counts")
async def list_cycle_counts(
    company_id: str,
    warehouse_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List cycle counts"""
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT id, cycle_count_number, warehouse_id, count_date, count_type, status, created_at
            FROM cycle_counts
            WHERE company_id = $1
        """
        params = [company_id]
        
        if warehouse_id:
            query += " AND warehouse_id = $2"
            params.append(warehouse_id)
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        query += f" ORDER BY count_date DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        cycle_counts = await conn.fetch(query, *params)
        
        return {
            "cycle_counts": [
                {
                    "id": str(c['id']),
                    "cycle_count_number": c['cycle_count_number'],
                    "warehouse_id": str(c['warehouse_id']),
                    "count_date": c['count_date'].isoformat(),
                    "count_type": c['count_type'],
                    "status": c['status'],
                    "created_at": c['created_at'].isoformat()
                }
                for c in cycle_counts
            ],
            "total": len(cycle_counts)
        }
    
    except Exception as e:
        logger.error(f"Error listing cycle counts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list cycle counts: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/stock-adjustments")
async def create_stock_adjustment(adjustment: StockAdjustmentCreate):
    """Create a new stock adjustment"""
    conn = await get_db_connection()
    
    try:
        adj_count = await conn.fetchval(
            "SELECT COUNT(*) FROM stock_adjustments WHERE company_id = $1",
            adjustment.company_id
        )
        adjustment_number = f"ADJ-{adj_count + 1:06d}"
        
        total_value = sum(
            line['quantity_adjustment'] * line.get('unit_cost', 0)
            for line in adjustment.lines
        )
        
        new_adjustment = await conn.fetchrow(
            """
            INSERT INTO stock_adjustments 
            (company_id, adjustment_number, warehouse_id, adjustment_date, adjustment_type, total_value, reason)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, adjustment_number, status, created_at
            """,
            adjustment.company_id, adjustment_number, adjustment.warehouse_id,
            adjustment.adjustment_date, adjustment.adjustment_type, total_value, adjustment.reason
        )
        
        for idx, line in enumerate(adjustment.lines, start=1):
            line_value = line['quantity_adjustment'] * line.get('unit_cost', 0)
            await conn.execute(
                """
                INSERT INTO stock_adjustment_lines 
                (adjustment_id, line_number, product_id, storage_location_id, quantity_adjustment,
                 unit_cost, line_value, unit_of_measure, reason_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                new_adjustment['id'], idx, line['product_id'], line.get('storage_location_id'),
                line['quantity_adjustment'], line.get('unit_cost'), line_value,
                line.get('unit_of_measure'), line.get('reason_code')
            )
        
        return {
            "status": "success",
            "message": f"Stock adjustment {adjustment_number} created successfully",
            "adjustment": {
                "id": str(new_adjustment['id']),
                "adjustment_number": new_adjustment['adjustment_number'],
                "status": new_adjustment['status'],
                "total_value": float(total_value),
                "created_at": new_adjustment['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating stock adjustment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create stock adjustment: {str(e)}")
    finally:
        await conn.close()


@router.get("/stock-adjustments")
async def list_stock_adjustments(
    company_id: str,
    warehouse_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """List stock adjustments"""
    conn = await get_db_connection()
    
    try:
        query = """
            SELECT id, adjustment_number, warehouse_id, adjustment_date, adjustment_type, status, total_value, created_at
            FROM stock_adjustments
            WHERE company_id = $1
        """
        params = [company_id]
        
        if warehouse_id:
            query += " AND warehouse_id = $2"
            params.append(warehouse_id)
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        query += f" ORDER BY adjustment_date DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        adjustments = await conn.fetch(query, *params)
        
        return {
            "stock_adjustments": [
                {
                    "id": str(a['id']),
                    "adjustment_number": a['adjustment_number'],
                    "warehouse_id": str(a['warehouse_id']),
                    "adjustment_date": a['adjustment_date'].isoformat(),
                    "adjustment_type": a['adjustment_type'],
                    "status": a['status'],
                    "total_value": float(a['total_value']) if a['total_value'] else 0,
                    "created_at": a['created_at'].isoformat()
                }
                for a in adjustments
            ],
            "total": len(adjustments)
        }
    
    except Exception as e:
        logger.error(f"Error listing stock adjustments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list stock adjustments: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for WMS module"""
    conn = await get_db_connection()
    
    try:
        warehouses_count = await conn.fetchval("SELECT COUNT(*) FROM warehouses WHERE is_active = true")
        locations_count = await conn.fetchval("SELECT COUNT(*) FROM storage_locations WHERE is_active = true")
        stock_count = await conn.fetchval("SELECT COUNT(*) FROM stock_on_hand WHERE quantity > 0")
        pick_lists_count = await conn.fetchval("SELECT COUNT(*) FROM pick_lists WHERE status = 'pending'")
        
        return {
            "status": "healthy",
            "module": "wms",
            "warehouses": warehouses_count,
            "storage_locations": locations_count,
            "stock_items": stock_count,
            "pending_pick_lists": pick_lists_count
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "module": "wms",
            "error": str(e)
        }
    finally:
        await conn.close()
