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


class BOMComponentCreate(BaseModel):
    bom_id: int
    component_product_id: int
    quantity: float
    unit_of_measure: str
    scrap_percentage: Optional[float] = 0
    operation_sequence: Optional[int] = None
    notes: Optional[str] = None


@router.get("/bom/{bom_id}/components")
async def get_bom_components(
    bom_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all components for a Bill of Materials"""
    try:
        company_id = current_user.get("company_id", "default")
        
        bom_query = text("""
            SELECT 
                b.bom_number,
                b.product_id,
                p.name as product_name,
                b.version,
                b.status,
                b.effective_date,
                b.expiry_date
            FROM boms b
            JOIN products p ON b.product_id = p.id
            WHERE b.id = :bom_id AND b.company_id = :company_id
        """)
        
        bom_result = db.execute(bom_query, {"bom_id": bom_id, "company_id": company_id}).fetchone()
        
        if not bom_result:
            raise HTTPException(status_code=404, detail="BOM not found")
        
        components_query = text("""
            SELECT 
                bc.id,
                bc.line_number,
                bc.component_product_id,
                p.name as component_name,
                p.product_code,
                bc.quantity,
                bc.unit_of_measure,
                bc.scrap_percentage,
                bc.quantity * (1 + COALESCE(bc.scrap_percentage, 0) / 100) as quantity_with_scrap,
                bc.operation_sequence,
                bc.notes,
                p.unit_cost,
                p.unit_cost * bc.quantity * (1 + COALESCE(bc.scrap_percentage, 0) / 100) as component_cost
            FROM bom_components bc
            JOIN boms b ON bc.bom_id = b.id
            JOIN products p ON bc.component_product_id = p.id
            WHERE b.id = :bom_id AND b.company_id = :company_id
            ORDER BY bc.line_number
        """)
        
        components_result = db.execute(components_query, {"bom_id": bom_id, "company_id": company_id})
        
        components = []
        total_cost = 0
        
        for row in components_result.fetchall():
            component_cost = float(row[12]) if row[12] else 0
            total_cost += component_cost
            
            components.append({
                "id": row[0],
                "line_number": row[1],
                "component_product_id": row[2],
                "component_name": row[3],
                "product_code": row[4],
                "quantity": float(row[5]) if row[5] else 0,
                "unit_of_measure": row[6],
                "scrap_percentage": float(row[7]) if row[7] else 0,
                "quantity_with_scrap": float(row[8]) if row[8] else 0,
                "operation_sequence": row[9],
                "notes": row[10],
                "unit_cost": float(row[11]) if row[11] else 0,
                "component_cost": component_cost
            })
        
        return {
            "bom": {
                "bom_number": bom_result[0],
                "product_id": bom_result[1],
                "product_name": bom_result[2],
                "version": bom_result[3],
                "status": bom_result[4],
                "effective_date": str(bom_result[5]) if bom_result[5] else None,
                "expiry_date": str(bom_result[6]) if bom_result[6] else None
            },
            "components": components,
            "total_cost": total_cost
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bom/{bom_id}/component")
async def add_bom_component(
    bom_id: int,
    component: BOMComponentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a component to a BOM"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        line_query = text("""
            SELECT COALESCE(MAX(line_number), 0) + 1
            FROM bom_components bc
            JOIN boms b ON bc.bom_id = b.id
            WHERE b.id = :bom_id AND b.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {"bom_id": bom_id, "company_id": company_id}).fetchone()
        next_line = line_result[0] if line_result else 1
        
        insert_query = text("""
            INSERT INTO bom_components (
                bom_id, line_number, component_product_id, quantity,
                unit_of_measure, scrap_percentage, operation_sequence, notes,
                company_id, created_by, created_at
            ) VALUES (
                :bom_id, :line_number, :component_product_id, :quantity,
                :unit_of_measure, :scrap_percentage, :operation_sequence, :notes,
                :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "bom_id": bom_id,
            "line_number": next_line,
            "component_product_id": component.component_product_id,
            "quantity": component.quantity,
            "unit_of_measure": component.unit_of_measure,
            "scrap_percentage": component.scrap_percentage,
            "operation_sequence": component.operation_sequence,
            "notes": component.notes,
            "company_id": company_id,
            "created_by": user_email
        })
        
        db.commit()
        component_id = result.fetchone()[0]
        
        return {"id": component_id, "message": "Component added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/bom-component/{component_id}")
async def update_bom_component(
    component_id: int,
    quantity: Optional[float] = None,
    scrap_percentage: Optional[float] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a BOM component"""
    try:
        company_id = current_user.get("company_id", "default")
        
        updates = []
        params = {"component_id": component_id, "company_id": company_id}
        
        if quantity is not None:
            updates.append("quantity = :quantity")
            params["quantity"] = quantity
        
        if scrap_percentage is not None:
            updates.append("scrap_percentage = :scrap_percentage")
            params["scrap_percentage"] = scrap_percentage
        
        if notes is not None:
            updates.append("notes = :notes")
            params["notes"] = notes
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE bom_components bc
            SET {update_clause}
            FROM boms b
            WHERE bc.bom_id = b.id
                AND bc.id = :component_id
                AND b.company_id = :company_id
        """)
        
        db.execute(query, params)
        db.commit()
        
        return {"message": "Component updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bom-component/{component_id}")
async def delete_bom_component(
    component_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a BOM component"""
    try:
        company_id = current_user.get("company_id", "default")
        
        delete_query = text("""
            DELETE FROM bom_components bc
            USING boms b
            WHERE bc.bom_id = b.id
                AND bc.id = :component_id
                AND b.company_id = :company_id
        """)
        
        db.execute(delete_query, {"component_id": component_id, "company_id": company_id})
        db.commit()
        
        return {"message": "Component deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}/where-used")
async def get_component_where_used(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get where-used list for a component (which BOMs use this product)"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                b.id as bom_id,
                b.bom_number,
                b.product_id as parent_product_id,
                p.name as parent_product_name,
                b.version,
                b.status,
                bc.quantity,
                bc.unit_of_measure
            FROM bom_components bc
            JOIN boms b ON bc.bom_id = b.id
            JOIN products p ON b.product_id = p.id
            WHERE bc.component_product_id = :product_id 
                AND b.company_id = :company_id
                AND b.status = 'ACTIVE'
            ORDER BY p.name, b.version DESC
        """)
        
        result = db.execute(query, {"product_id": product_id, "company_id": company_id})
        rows = result.fetchall()
        
        where_used = []
        for row in rows:
            where_used.append({
                "bom_id": row[0],
                "bom_number": row[1],
                "parent_product_id": row[2],
                "parent_product_name": row[3],
                "version": row[4],
                "status": row[5],
                "quantity": float(row[6]) if row[6] else 0,
                "unit_of_measure": row[7]
            })
        
        return {"where_used": where_used, "total_count": len(where_used)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
