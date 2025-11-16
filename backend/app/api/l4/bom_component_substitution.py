from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from pydantic import BaseModel

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

router = APIRouter()


class ComponentSubstitution(BaseModel):
    substitute_product_id: int
    priority: int
    conversion_factor: float = 1.0


@router.get("/bom-component/{component_id}/substitution-availability")
async def get_component_substitution_availability(
    component_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get substitution options and availability for a BOM component"""
    try:
        company_id = current_user.get("company_id", "default")
        
        component_query = text("""
            SELECT 
                bc.id,
                bc.bom_id,
                b.bom_number,
                b.product_id as parent_product_id,
                pp.name as parent_product_name,
                bc.component_product_id,
                cp.product_code,
                cp.name as component_name,
                bc.quantity_required,
                cp.uom,
                bc.scrap_percentage,
                bc.is_critical
            FROM bom_components bc
            JOIN boms b ON bc.bom_id = b.id
            JOIN products pp ON b.product_id = pp.id
            JOIN products cp ON bc.component_product_id = cp.id
            WHERE bc.id = :component_id AND b.company_id = :company_id
        """)
        
        component_result = db.execute(component_query, {
            "component_id": component_id,
            "company_id": company_id
        }).fetchone()
        
        if not component_result:
            raise HTTPException(status_code=404, detail="BOM component not found")
        
        component_product_id = component_result[5]
        qty_required = float(component_result[8]) if component_result[8] else 0
        
        inventory_query = text("""
            SELECT 
                w.id as warehouse_id,
                w.name as warehouse_name,
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity
                        WHEN 'OUT' THEN -il.quantity
                        ELSE 0
                    END
                ), 0) as available_quantity
            FROM warehouses w
            LEFT JOIN item_ledger il ON w.id = il.warehouse_id 
                AND il.product_id = :product_id
                AND il.company_id = :company_id
            WHERE w.company_id = :company_id
            GROUP BY w.id, w.name
            HAVING COALESCE(SUM(
                CASE il.transaction_type
                    WHEN 'IN' THEN il.quantity
                    WHEN 'OUT' THEN -il.quantity
                    ELSE 0
                END
            ), 0) > 0
            ORDER BY available_quantity DESC
        """)
        
        inventory_result = db.execute(inventory_query, {
            "product_id": component_product_id,
            "company_id": company_id
        })
        
        inventory_availability = []
        total_available = 0
        
        for row in inventory_result.fetchall():
            qty = float(row[2]) if row[2] else 0
            total_available += qty
            inventory_availability.append({
                "warehouse_id": row[0],
                "warehouse_name": row[1],
                "available_quantity": qty
            })
        
        substitute_query = text("""
            SELECT 
                cs.id,
                cs.substitute_product_id,
                p.product_code,
                p.name as product_name,
                cs.priority,
                cs.conversion_factor,
                p.standard_cost,
                cs.notes
            FROM component_substitutes cs
            JOIN products p ON cs.substitute_product_id = p.id
            WHERE cs.component_product_id = :product_id
                AND cs.company_id = :company_id
            ORDER BY cs.priority ASC
        """)
        
        substitute_result = db.execute(substitute_query, {
            "product_id": component_product_id,
            "company_id": company_id
        })
        
        substitutes = []
        for row in substitute_result.fetchall():
            substitute_product_id = row[1]
            conversion_factor = float(row[5]) if row[5] else 1.0
            
            sub_inv_query = text("""
                SELECT 
                    COALESCE(SUM(
                        CASE il.transaction_type
                            WHEN 'IN' THEN il.quantity
                            WHEN 'OUT' THEN -il.quantity
                            ELSE 0
                        END
                    ), 0) as available_quantity
                FROM item_ledger il
                WHERE il.product_id = :product_id
                    AND il.company_id = :company_id
            """)
            
            sub_inv_result = db.execute(sub_inv_query, {
                "product_id": substitute_product_id,
                "company_id": company_id
            }).fetchone()
            
            sub_available = float(sub_inv_result[0]) if sub_inv_result else 0
            
            substitutes.append({
                "id": row[0],
                "substitute_product_id": substitute_product_id,
                "product_code": row[2],
                "product_name": row[3],
                "priority": row[4],
                "conversion_factor": conversion_factor,
                "standard_cost": float(row[6]) if row[6] else 0,
                "notes": row[7],
                "available_quantity": sub_available,
                "can_fulfill": sub_available >= (qty_required * conversion_factor)
            })
        
        lead_time_query = text("""
            SELECT 
                ps.supplier_id,
                s.name as supplier_name,
                ps.lead_time_days,
                ps.unit_price,
                ps.minimum_order_quantity
            FROM product_suppliers ps
            JOIN suppliers s ON ps.supplier_id = s.id
            WHERE ps.product_id = :product_id
                AND ps.company_id = :company_id
            ORDER BY ps.lead_time_days ASC
        """)
        
        lead_time_result = db.execute(lead_time_query, {
            "product_id": component_product_id,
            "company_id": company_id
        })
        
        suppliers = []
        for row in lead_time_result.fetchall():
            suppliers.append({
                "supplier_id": row[0],
                "supplier_name": row[1],
                "lead_time_days": row[2],
                "unit_price": float(row[3]) if row[3] else 0,
                "minimum_order_quantity": float(row[4]) if row[4] else 0
            })
        
        return {
            "component": {
                "id": component_result[0],
                "bom_id": component_result[1],
                "bom_number": component_result[2],
                "parent_product_id": component_result[3],
                "parent_product_name": component_result[4],
                "component_product_id": component_product_id,
                "product_code": component_result[6],
                "component_name": component_result[7],
                "quantity_required": qty_required,
                "uom": component_result[9],
                "scrap_percentage": float(component_result[10]) if component_result[10] else 0,
                "is_critical": component_result[11]
            },
            "inventory_availability": {
                "total_available": total_available,
                "can_fulfill": total_available >= qty_required,
                "shortage": max(0, qty_required - total_available),
                "by_warehouse": inventory_availability
            },
            "substitutes": substitutes,
            "suppliers": suppliers,
            "recommendation": {
                "use_primary": total_available >= qty_required,
                "use_substitute": total_available < qty_required and any(s["can_fulfill"] for s in substitutes),
                "need_procurement": total_available < qty_required and not any(s["can_fulfill"] for s in substitutes)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bom-component/{component_id}/add-substitute")
async def add_component_substitute(
    component_id: int,
    substitute: ComponentSubstitution,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a substitute component"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        component_query = text("""
            SELECT bc.component_product_id
            FROM bom_components bc
            JOIN boms b ON bc.bom_id = b.id
            WHERE bc.id = :component_id AND b.company_id = :company_id
        """)
        
        component_result = db.execute(component_query, {
            "component_id": component_id,
            "company_id": company_id
        }).fetchone()
        
        if not component_result:
            raise HTTPException(status_code=404, detail="BOM component not found")
        
        insert_query = text("""
            INSERT INTO component_substitutes (
                component_product_id, substitute_product_id,
                priority, conversion_factor,
                company_id, created_by, created_at
            ) VALUES (
                :component_product_id, :substitute_product_id,
                :priority, :conversion_factor,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "component_product_id": component_result[0],
            "substitute_product_id": substitute.substitute_product_id,
            "priority": substitute.priority,
            "conversion_factor": substitute.conversion_factor,
            "company_id": company_id,
            "created_by": user_email
        })
        
        substitute_id = result.fetchone()[0]
        
        db.commit()
        
        return {
            "message": "Substitute component added successfully",
            "substitute_id": substitute_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/component-substitute/{substitute_id}")
async def delete_component_substitute(
    substitute_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a component substitute"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM component_substitutes
            WHERE id = :substitute_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {
            "substitute_id": substitute_id,
            "company_id": company_id
        })
        
        db.commit()
        
        return {"message": "Substitute component deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
