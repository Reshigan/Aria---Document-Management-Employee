"""
Inventory Admin Configuration API
UoM conversions, Costing method, Warehouse/bin management, Lot/serial rules, Cycle count setup, Valuation rules
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
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

try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter(prefix="/api/inventory-admin-config", tags=["Inventory Admin Configuration"])

# ===================== SCHEMAS =====================

class UoMConversionCreate(BaseModel):
    from_uom: str
    to_uom: str
    conversion_factor: Decimal
    is_active: bool = True

class CostingMethodCreate(BaseModel):
    method_code: str
    method_name: str
    description: Optional[str] = None
    is_active: bool = True

class WarehouseCreate(BaseModel):
    warehouse_code: str
    warehouse_name: str
    address: Optional[str] = None
    is_active: bool = True

class BinLocationCreate(BaseModel):
    warehouse_id: int
    bin_code: str
    bin_name: str
    zone: Optional[str] = None
    is_active: bool = True

class LotSerialRuleCreate(BaseModel):
    rule_name: str
    tracking_type: str  # lot, serial, none
    mask_pattern: Optional[str] = None
    auto_generate: bool = False
    is_active: bool = True

class CycleCountSetupCreate(BaseModel):
    setup_name: str
    frequency_days: int
    count_method: str  # ABC, random, etc.
    is_active: bool = True


@router.get("/uom-conversions")
async def get_uom_conversions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all UoM conversions"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                from_uom,
                to_uom,
                conversion_factor,
                is_active,
                created_at,
                updated_at
            FROM uom_conversions
            WHERE company_id = :company_id
            ORDER BY from_uom, to_uom
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        conversions = []
        for row in rows:
            conversions.append({
                "id": row[0],
                "from_uom": row[1],
                "to_uom": row[2],
                "conversion_factor": float(row[3]) if row[3] else 0,
                "is_active": row[4],
                "created_at": str(row[5]) if row[5] else None,
                "updated_at": str(row[6]) if row[6] else None
            })
        
        return {"uom_conversions": conversions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/uom-conversions")
async def create_uom_conversion(
    conversion: UoMConversionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new UoM conversion"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO uom_conversions (
                company_id, from_uom, to_uom, conversion_factor, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :from_uom, :to_uom, :conversion_factor, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "from_uom": conversion.from_uom,
            "to_uom": conversion.to_uom,
            "conversion_factor": float(conversion.conversion_factor),
            "is_active": conversion.is_active,
            "created_by": user_email
        })
        
        db.commit()
        conversion_id = result.fetchone()[0]
        
        return {"id": conversion_id, "message": "UoM conversion created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/costing-methods")
async def get_costing_methods(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all costing methods"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                method_code,
                method_name,
                description,
                is_active,
                created_at,
                updated_at
            FROM costing_methods
            WHERE company_id = :company_id
            ORDER BY method_code
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        methods = []
        for row in rows:
            methods.append({
                "id": row[0],
                "method_code": row[1],
                "method_name": row[2],
                "description": row[3],
                "is_active": row[4],
                "created_at": str(row[5]) if row[5] else None,
                "updated_at": str(row[6]) if row[6] else None
            })
        
        return {"costing_methods": methods}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/costing-methods")
async def create_costing_method(
    method: CostingMethodCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new costing method"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO costing_methods (
                company_id, method_code, method_name, description, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :method_code, :method_name, :description, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "method_code": method.method_code,
            "method_name": method.method_name,
            "description": method.description,
            "is_active": method.is_active,
            "created_by": user_email
        })
        
        db.commit()
        method_id = result.fetchone()[0]
        
        return {"id": method_id, "message": "Costing method created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/warehouses-config")
async def get_warehouses_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all warehouse configurations"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                warehouse_code,
                warehouse_name,
                address,
                is_active,
                created_at,
                updated_at
            FROM warehouses
            WHERE company_id = :company_id
            ORDER BY warehouse_code
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        warehouses = []
        for row in rows:
            warehouses.append({
                "id": row[0],
                "warehouse_code": row[1],
                "warehouse_name": row[2],
                "address": row[3],
                "is_active": row[4],
                "created_at": str(row[5]) if row[5] else None,
                "updated_at": str(row[6]) if row[6] else None
            })
        
        return {"warehouses": warehouses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/warehouses-config")
async def create_warehouse_config(
    warehouse: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new warehouse configuration"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO warehouses (
                company_id, warehouse_code, warehouse_name, address, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :warehouse_code, :warehouse_name, :address, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "warehouse_code": warehouse.warehouse_code,
            "warehouse_name": warehouse.warehouse_name,
            "address": warehouse.address,
            "is_active": warehouse.is_active,
            "created_by": user_email
        })
        
        db.commit()
        warehouse_id = result.fetchone()[0]
        
        return {"id": warehouse_id, "message": "Warehouse created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/bin-locations")
async def get_bin_locations(
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all bin locations"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                bl.id,
                bl.warehouse_id,
                w.warehouse_name,
                bl.bin_code,
                bl.bin_name,
                bl.zone,
                bl.is_active,
                bl.created_at,
                bl.updated_at
            FROM bin_locations bl
            JOIN warehouses w ON bl.warehouse_id = w.id
            WHERE bl.company_id = :company_id
            """ + (" AND bl.warehouse_id = :warehouse_id" if warehouse_id else "") + """
            ORDER BY w.warehouse_code, bl.bin_code
        """)
        
        params = {"company_id": company_id}
        if warehouse_id:
            params["warehouse_id"] = warehouse_id
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        bins = []
        for row in rows:
            bins.append({
                "id": row[0],
                "warehouse_id": row[1],
                "warehouse_name": row[2],
                "bin_code": row[3],
                "bin_name": row[4],
                "zone": row[5],
                "is_active": row[6],
                "created_at": str(row[7]) if row[7] else None,
                "updated_at": str(row[8]) if row[8] else None
            })
        
        return {"bin_locations": bins}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bin-locations")
async def create_bin_location(
    bin_location: BinLocationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new bin location"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO bin_locations (
                company_id, warehouse_id, bin_code, bin_name, zone, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :warehouse_id, :bin_code, :bin_name, :zone, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "warehouse_id": bin_location.warehouse_id,
            "bin_code": bin_location.bin_code,
            "bin_name": bin_location.bin_name,
            "zone": bin_location.zone,
            "is_active": bin_location.is_active,
            "created_by": user_email
        })
        
        db.commit()
        bin_id = result.fetchone()[0]
        
        return {"id": bin_id, "message": "Bin location created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/lot-serial-rules")
async def get_lot_serial_rules(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lot/serial rules"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                rule_name,
                tracking_type,
                mask_pattern,
                auto_generate,
                is_active,
                created_at,
                updated_at
            FROM lot_serial_rules
            WHERE company_id = :company_id
            ORDER BY rule_name
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        rules = []
        for row in rows:
            rules.append({
                "id": row[0],
                "rule_name": row[1],
                "tracking_type": row[2],
                "mask_pattern": row[3],
                "auto_generate": row[4],
                "is_active": row[5],
                "created_at": str(row[6]) if row[6] else None,
                "updated_at": str(row[7]) if row[7] else None
            })
        
        return {"lot_serial_rules": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lot-serial-rules")
async def create_lot_serial_rule(
    rule: LotSerialRuleCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new lot/serial rule"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO lot_serial_rules (
                company_id, rule_name, tracking_type, mask_pattern, auto_generate, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :rule_name, :tracking_type, :mask_pattern, :auto_generate, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "rule_name": rule.rule_name,
            "tracking_type": rule.tracking_type,
            "mask_pattern": rule.mask_pattern,
            "auto_generate": rule.auto_generate,
            "is_active": rule.is_active,
            "created_by": user_email
        })
        
        db.commit()
        rule_id = result.fetchone()[0]
        
        return {"id": rule_id, "message": "Lot/serial rule created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/cycle-count-setup")
async def get_cycle_count_setup(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all cycle count setups"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                id,
                setup_name,
                frequency_days,
                count_method,
                is_active,
                created_at,
                updated_at
            FROM cycle_count_setup
            WHERE company_id = :company_id
            ORDER BY setup_name
        """)
        
        result = db.execute(query, {"company_id": company_id})
        rows = result.fetchall()
        
        setups = []
        for row in rows:
            setups.append({
                "id": row[0],
                "setup_name": row[1],
                "frequency_days": row[2],
                "count_method": row[3],
                "is_active": row[4],
                "created_at": str(row[5]) if row[5] else None,
                "updated_at": str(row[6]) if row[6] else None
            })
        
        return {"cycle_count_setups": setups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cycle-count-setup")
async def create_cycle_count_setup(
    setup: CycleCountSetupCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new cycle count setup"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO cycle_count_setup (
                company_id, setup_name, frequency_days, count_method, is_active,
                created_by, created_at, updated_at
            ) VALUES (
                :company_id, :setup_name, :frequency_days, :count_method, :is_active,
                :created_by, NOW(), NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "company_id": company_id,
            "setup_name": setup.setup_name,
            "frequency_days": setup.frequency_days,
            "count_method": setup.count_method,
            "is_active": setup.is_active,
            "created_by": user_email
        })
        
        db.commit()
        setup_id = result.fetchone()[0]
        
        return {"id": setup_id, "message": "Cycle count setup created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


print("✅ Inventory Admin Configuration API loaded")
