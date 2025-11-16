from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

try:
    from app.database import get_db
except ImportError:
    from database import get_db
try:
    from app.auth import get_current_user
except ImportError:
    from auth_integrated import get_current_user

router = APIRouter()


@router.get("/work-order/{work_order_id}/costing-detail")
async def get_work_order_costing_detail(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed costing information for a work order"""
    try:
        company_id = current_user.get("company_id", "default")
        
        wo_query = text("""
            SELECT 
                wo.id,
                wo.work_order_number,
                wo.order_date,
                wo.product_id,
                p.product_code,
                p.name as product_name,
                wo.quantity_to_produce,
                wo.quantity_produced,
                wo.status,
                wo.standard_cost,
                wo.actual_cost,
                wo.cost_variance
            FROM work_orders wo
            JOIN products p ON wo.product_id = p.id
            WHERE wo.id = :work_order_id AND wo.company_id = :company_id
        """)
        
        wo_result = db.execute(wo_query, {
            "work_order_id": work_order_id,
            "company_id": company_id
        }).fetchone()
        
        if not wo_result:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        material_query = text("""
            SELECT 
                mil.id,
                mil.product_id,
                p.product_code,
                p.name as product_name,
                mil.quantity_issued,
                mil.unit_cost,
                mil.total_cost,
                bl.quantity_per_unit as standard_quantity,
                (mil.quantity_issued - (bl.quantity_per_unit * :quantity_produced)) as quantity_variance
            FROM material_issue_lines mil
            JOIN material_issues mi ON mil.material_issue_id = mi.id
            JOIN products p ON mil.product_id = p.id
            LEFT JOIN bom_lines bl ON mil.bom_line_id = bl.id
            WHERE mi.work_order_id = :work_order_id
                AND mi.company_id = :company_id
        """)
        
        material_result = db.execute(material_query, {
            "work_order_id": work_order_id,
            "quantity_produced": wo_result[7],
            "company_id": company_id
        })
        
        material_costs = []
        total_material_cost = 0
        
        for row in material_result.fetchall():
            total_cost = float(row[6]) if row[6] else 0
            total_material_cost += total_cost
            
            material_costs.append({
                "id": row[0],
                "product_id": row[1],
                "product_code": row[2],
                "product_name": row[3],
                "quantity_issued": float(row[4]) if row[4] else 0,
                "unit_cost": float(row[5]) if row[5] else 0,
                "total_cost": total_cost,
                "standard_quantity": float(row[7]) if row[7] else 0,
                "quantity_variance": float(row[8]) if row[8] else 0
            })
        
        labor_query = text("""
            SELECT 
                tb.id,
                tb.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                tb.hours_worked,
                tb.hourly_rate,
                tb.total_cost,
                woo.standard_duration,
                (tb.hours_worked - woo.standard_duration) as time_variance
            FROM time_bookings tb
            JOIN employees e ON tb.employee_id = e.id
            LEFT JOIN work_order_operations woo ON tb.operation_id = woo.id
            WHERE tb.work_order_id = :work_order_id
                AND tb.company_id = :company_id
        """)
        
        labor_result = db.execute(labor_query, {
            "work_order_id": work_order_id,
            "company_id": company_id
        })
        
        labor_costs = []
        total_labor_cost = 0
        
        for row in labor_result.fetchall():
            total_cost = float(row[5]) if row[5] else 0
            total_labor_cost += total_cost
            
            labor_costs.append({
                "id": row[0],
                "employee_id": row[1],
                "employee_name": row[2],
                "hours_worked": float(row[3]) if row[3] else 0,
                "hourly_rate": float(row[4]) if row[4] else 0,
                "total_cost": total_cost,
                "standard_duration": float(row[6]) if row[6] else 0,
                "time_variance": float(row[7]) if row[7] else 0
            })
        
        overhead_query = text("""
            SELECT 
                oa.id,
                oa.overhead_type,
                oa.allocation_basis,
                oa.allocation_rate,
                oa.allocated_amount,
                oa.description
            FROM overhead_allocations oa
            WHERE oa.work_order_id = :work_order_id
                AND oa.company_id = :company_id
        """)
        
        overhead_result = db.execute(overhead_query, {
            "work_order_id": work_order_id,
            "company_id": company_id
        })
        
        overhead_costs = []
        total_overhead_cost = 0
        
        for row in overhead_result.fetchall():
            allocated_amount = float(row[4]) if row[4] else 0
            total_overhead_cost += allocated_amount
            
            overhead_costs.append({
                "id": row[0],
                "overhead_type": row[1],
                "allocation_basis": row[2],
                "allocation_rate": float(row[3]) if row[3] else 0,
                "allocated_amount": allocated_amount,
                "description": row[5]
            })
        
        standard_cost = float(wo_result[9]) if wo_result[9] else 0
        actual_cost = float(wo_result[10]) if wo_result[10] else 0
        cost_variance = float(wo_result[11]) if wo_result[11] else 0
        
        quantity_produced = float(wo_result[7]) if wo_result[7] else 0
        unit_cost = actual_cost / quantity_produced if quantity_produced > 0 else 0
        
        return {
            "work_order": {
                "id": wo_result[0],
                "work_order_number": wo_result[1],
                "order_date": str(wo_result[2]) if wo_result[2] else None,
                "product_id": wo_result[3],
                "product_code": wo_result[4],
                "product_name": wo_result[5],
                "quantity_to_produce": float(wo_result[6]) if wo_result[6] else 0,
                "quantity_produced": quantity_produced,
                "status": wo_result[8],
                "standard_cost": standard_cost,
                "actual_cost": actual_cost,
                "cost_variance": cost_variance
            },
            "cost_breakdown": {
                "material_cost": total_material_cost,
                "labor_cost": total_labor_cost,
                "overhead_cost": total_overhead_cost,
                "total_cost": total_material_cost + total_labor_cost + total_overhead_cost,
                "unit_cost": unit_cost,
                "material_percent": (total_material_cost / actual_cost * 100) if actual_cost > 0 else 0,
                "labor_percent": (total_labor_cost / actual_cost * 100) if actual_cost > 0 else 0,
                "overhead_percent": (total_overhead_cost / actual_cost * 100) if actual_cost > 0 else 0
            },
            "material_costs": material_costs,
            "labor_costs": labor_costs,
            "overhead_costs": overhead_costs,
            "variance_analysis": {
                "total_variance": cost_variance,
                "variance_percent": (cost_variance / standard_cost * 100) if standard_cost > 0 else 0,
                "is_favorable": cost_variance < 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
