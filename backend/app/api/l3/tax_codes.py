from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List

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


class TaxCodeComponentCreate(BaseModel):
    tax_code_id: int
    component_name: str
    tax_rate: float
    tax_type: str
    gl_account_id: Optional[int] = None


@router.get("/tax-code/{tax_code_id}/components")
async def get_tax_code_components(
    tax_code_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all components for a tax code"""
    try:
        company_id = current_user.get("company_id", "default")
        
        header_query = text("""
            SELECT 
                tc.code,
                tc.description,
                tc.total_rate,
                tc.is_active,
                tc.tax_type
            FROM tax_codes tc
            WHERE tc.id = :tax_code_id AND tc.company_id = :company_id
        """)
        
        header_result = db.execute(header_query, {
            "tax_code_id": tax_code_id,
            "company_id": company_id
        }).fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Tax code not found")
        
        components_query = text("""
            SELECT 
                tcc.id,
                tcc.component_name,
                tcc.tax_rate,
                tcc.tax_type,
                tcc.gl_account_id,
                ga.account_number,
                ga.account_name,
                tcc.is_active
            FROM tax_code_components tcc
            LEFT JOIN gl_accounts ga ON tcc.gl_account_id = ga.id
            WHERE tcc.tax_code_id = :tax_code_id AND tcc.company_id = :company_id
            ORDER BY tcc.component_name
        """)
        
        components_result = db.execute(components_query, {
            "tax_code_id": tax_code_id,
            "company_id": company_id
        })
        
        components = []
        total_rate = 0
        
        for row in components_result.fetchall():
            tax_rate = float(row[2]) if row[2] else 0
            total_rate += tax_rate
            
            components.append({
                "id": row[0],
                "component_name": row[1],
                "tax_rate": tax_rate,
                "tax_type": row[3],
                "gl_account_id": row[4],
                "gl_account_number": row[5],
                "gl_account_name": row[6],
                "is_active": row[7]
            })
        
        return {
            "tax_code": {
                "code": header_result[0],
                "description": header_result[1],
                "total_rate": float(header_result[2]) if header_result[2] else 0,
                "is_active": header_result[3],
                "tax_type": header_result[4]
            },
            "components": components,
            "calculated_total_rate": total_rate
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tax-code/{tax_code_id}/component")
async def create_tax_code_component(
    tax_code_id: int,
    component: TaxCodeComponentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a component to a tax code"""
    try:
        company_id = current_user.get("company_id", "default")
        user_email = current_user.get("email", "unknown")
        
        insert_query = text("""
            INSERT INTO tax_code_components (
                tax_code_id, component_name, tax_rate, tax_type,
                gl_account_id, company_id, created_by, created_at
            ) VALUES (
                :tax_code_id, :component_name, :tax_rate, :tax_type,
                :gl_account_id, :company_id, :created_by, NOW()
            ) RETURNING id
        """)
        
        result = db.execute(insert_query, {
            "tax_code_id": tax_code_id,
            "component_name": component.component_name,
            "tax_rate": component.tax_rate,
            "tax_type": component.tax_type,
            "gl_account_id": component.gl_account_id,
            "company_id": company_id,
            "created_by": user_email
        })
        
        update_query = text("""
            UPDATE tax_codes tc
            SET 
                total_rate = (
                    SELECT COALESCE(SUM(tax_rate), 0)
                    FROM tax_code_components
                    WHERE tax_code_id = tc.id AND is_active = true
                ),
                updated_at = NOW()
            WHERE tc.id = :tax_code_id AND tc.company_id = :company_id
        """)
        
        db.execute(update_query, {"tax_code_id": tax_code_id, "company_id": company_id})
        
        db.commit()
        component_id = result.fetchone()[0]
        
        return {"id": component_id, "message": "Tax code component created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/tax-code-component/{component_id}")
async def update_tax_code_component(
    component_id: int,
    tax_rate: Optional[float] = None,
    gl_account_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a tax code component"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT tcc.tax_code_id
            FROM tax_code_components tcc
            WHERE tcc.id = :component_id AND tcc.company_id = :company_id
        """)
        
        tax_code_result = db.execute(get_query, {
            "component_id": component_id,
            "company_id": company_id
        }).fetchone()
        
        if not tax_code_result:
            raise HTTPException(status_code=404, detail="Tax code component not found")
        
        tax_code_id = tax_code_result[0]
        
        updates = []
        params = {"component_id": component_id, "company_id": company_id}
        
        if tax_rate is not None:
            updates.append("tax_rate = :tax_rate")
            params["tax_rate"] = tax_rate
        
        if gl_account_id is not None:
            updates.append("gl_account_id = :gl_account_id")
            params["gl_account_id"] = gl_account_id
        
        if is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = is_active
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        update_clause = ", ".join(updates)
        
        query = text(f"""
            UPDATE tax_code_components
            SET {update_clause}
            WHERE id = :component_id AND company_id = :company_id
        """)
        
        db.execute(query, params)
        
        update_total_query = text("""
            UPDATE tax_codes tc
            SET 
                total_rate = (
                    SELECT COALESCE(SUM(tax_rate), 0)
                    FROM tax_code_components
                    WHERE tax_code_id = tc.id AND is_active = true
                ),
                updated_at = NOW()
            WHERE tc.id = :tax_code_id AND tc.company_id = :company_id
        """)
        
        db.execute(update_total_query, {"tax_code_id": tax_code_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Tax code component updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tax-code-component/{component_id}")
async def delete_tax_code_component(
    component_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a tax code component"""
    try:
        company_id = current_user.get("company_id", "default")
        
        get_query = text("""
            SELECT tax_code_id
            FROM tax_code_components
            WHERE id = :component_id AND company_id = :company_id
        """)
        
        tax_code_result = db.execute(get_query, {
            "component_id": component_id,
            "company_id": company_id
        }).fetchone()
        
        if not tax_code_result:
            raise HTTPException(status_code=404, detail="Tax code component not found")
        
        tax_code_id = tax_code_result[0]
        
        delete_query = text("""
            DELETE FROM tax_code_components
            WHERE id = :component_id AND company_id = :company_id
        """)
        
        db.execute(delete_query, {"component_id": component_id, "company_id": company_id})
        
        update_query = text("""
            UPDATE tax_codes tc
            SET 
                total_rate = (
                    SELECT COALESCE(SUM(tax_rate), 0)
                    FROM tax_code_components
                    WHERE tax_code_id = tc.id AND is_active = true
                ),
                updated_at = NOW()
            WHERE tc.id = :tax_code_id AND tc.company_id = :company_id
        """)
        
        db.execute(update_query, {"tax_code_id": tax_code_id, "company_id": company_id})
        
        db.commit()
        
        return {"message": "Tax code component deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tax-code/{tax_code_id}/calculate")
async def calculate_tax(
    tax_code_id: int,
    base_amount: float,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Calculate tax breakdown for a given base amount"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                tcc.component_name,
                tcc.tax_rate,
                tcc.tax_type,
                tcc.gl_account_id
            FROM tax_code_components tcc
            WHERE tcc.tax_code_id = :tax_code_id 
                AND tcc.company_id = :company_id
                AND tcc.is_active = true
            ORDER BY tcc.component_name
        """)
        
        result = db.execute(query, {"tax_code_id": tax_code_id, "company_id": company_id})
        rows = result.fetchall()
        
        if not rows:
            raise HTTPException(status_code=404, detail="No active tax components found")
        
        breakdown = []
        total_tax = 0
        
        for row in rows:
            component_name = row[0]
            tax_rate = float(row[1]) if row[1] else 0
            tax_type = row[2]
            gl_account_id = row[3]
            
            tax_amount = base_amount * (tax_rate / 100.0)
            total_tax += tax_amount
            
            breakdown.append({
                "component_name": component_name,
                "tax_rate": tax_rate,
                "tax_type": tax_type,
                "gl_account_id": gl_account_id,
                "tax_amount": tax_amount
            })
        
        return {
            "base_amount": base_amount,
            "tax_breakdown": breakdown,
            "total_tax": total_tax,
            "total_amount": base_amount + total_tax
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tax-codes/usage-report")
async def get_tax_code_usage_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get tax code usage report"""
    try:
        company_id = current_user.get("company_id", "default")
        
        where_clauses = ["i.company_id = :company_id"]
        params = {"company_id": company_id}
        
        if start_date:
            where_clauses.append("i.invoice_date >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            where_clauses.append("i.invoice_date <= :end_date")
            params["end_date"] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = text(f"""
            SELECT 
                tc.code,
                tc.description,
                tc.total_rate,
                COUNT(DISTINCT il.id) as line_count,
                SUM(il.quantity * il.unit_price) as taxable_amount,
                SUM(il.tax_amount) as total_tax
            FROM tax_codes tc
            LEFT JOIN invoice_lines il ON tc.id = il.tax_code_id
            LEFT JOIN invoices i ON il.invoice_id = i.id AND {where_clause}
            WHERE tc.company_id = :company_id
            GROUP BY tc.code, tc.description, tc.total_rate
            ORDER BY total_tax DESC NULLS LAST
        """)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        usage = []
        for row in rows:
            usage.append({
                "tax_code": row[0],
                "description": row[1],
                "tax_rate": float(row[2]) if row[2] else 0,
                "line_count": row[3] if row[3] else 0,
                "taxable_amount": float(row[4]) if row[4] else 0,
                "total_tax": float(row[5]) if row[5] else 0
            })
        
        return {"usage_report": usage}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
