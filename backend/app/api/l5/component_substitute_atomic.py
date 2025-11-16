from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

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


@router.get("/component-substitute/{substitute_id}/atomic-detail")
async def get_component_substitute_atomic_detail(
    substitute_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single component substitute"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                bcs.id,
                bcs.bom_line_id,
                bl.line_number,
                bl.product_id as primary_product_id,
                p1.product_code as primary_product_code,
                p1.name as primary_product_name,
                bcs.substitute_product_id,
                p2.product_code as substitute_product_code,
                p2.name as substitute_product_name,
                bcs.substitution_ratio,
                bcs.priority,
                bcs.is_preferred,
                bcs.notes,
                bcs.created_at,
                bcs.created_by
            FROM bom_component_substitutes bcs
            JOIN bom_lines bl ON bcs.bom_line_id = bl.id
            JOIN products p1 ON bl.product_id = p1.id
            JOIN products p2 ON bcs.substitute_product_id = p2.id
            WHERE bcs.id = :substitute_id AND bcs.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "substitute_id": substitute_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Component substitute not found")
        
        substitute_product_id = result[6]
        
        availability_query = text("""
            SELECT 
                w.id as warehouse_id,
                w.name as warehouse_name,
                COALESCE(SUM(
                    CASE il.transaction_type
                        WHEN 'IN' THEN il.quantity
                        WHEN 'OUT' THEN -il.quantity
                        ELSE 0
                    END
                ), 0) as quantity_on_hand
            FROM warehouses w
            LEFT JOIN item_ledger il ON w.id = il.warehouse_id AND il.product_id = :product_id
            WHERE w.company_id = :company_id
            GROUP BY w.id, w.name
            HAVING COALESCE(SUM(
                CASE il.transaction_type
                    WHEN 'IN' THEN il.quantity
                    WHEN 'OUT' THEN -il.quantity
                    ELSE 0
                END
            ), 0) > 0
        """)
        
        availability_result = db.execute(availability_query, {
            "product_id": substitute_product_id,
            "company_id": company_id
        })
        
        availability = []
        total_available = 0
        
        for row in availability_result.fetchall():
            qty = float(row[2]) if row[2] else 0
            total_available += qty
            
            availability.append({
                "warehouse_id": row[0],
                "warehouse_name": row[1],
                "quantity_on_hand": qty
            })
        
        usage_query = text("""
            SELECT 
                mi.id,
                mi.issue_number,
                mi.issue_date,
                mil.quantity_issued,
                wo.work_order_number
            FROM material_issue_lines mil
            JOIN material_issues mi ON mil.material_issue_id = mi.id
            LEFT JOIN work_orders wo ON mi.work_order_id = wo.id
            WHERE mil.product_id = :substitute_product_id
                AND mil.bom_line_id = :bom_line_id
                AND mi.company_id = :company_id
            ORDER BY mi.issue_date DESC
            LIMIT 10
        """)
        
        usage_result = db.execute(usage_query, {
            "substitute_product_id": substitute_product_id,
            "bom_line_id": result[1],
            "company_id": company_id
        })
        
        usage_history = []
        total_used = 0
        
        for row in usage_result.fetchall():
            qty = float(row[3]) if row[3] else 0
            total_used += qty
            
            usage_history.append({
                "material_issue_id": row[0],
                "issue_number": row[1],
                "issue_date": str(row[2]) if row[2] else None,
                "quantity_issued": qty,
                "work_order_number": row[4]
            })
        
        cost_query = text("""
            SELECT 
                p1.standard_cost as primary_cost,
                p2.standard_cost as substitute_cost
            FROM products p1, products p2
            WHERE p1.id = :primary_product_id
                AND p2.id = :substitute_product_id
        """)
        
        cost_result = db.execute(cost_query, {
            "primary_product_id": result[3],
            "substitute_product_id": substitute_product_id
        }).fetchone()
        
        cost_comparison = None
        if cost_result:
            primary_cost = float(cost_result[0]) if cost_result[0] else 0
            substitute_cost = float(cost_result[1]) if cost_result[1] else 0
            substitution_ratio = float(result[9]) if result[9] else 1.0
            
            effective_substitute_cost = substitute_cost * substitution_ratio
            cost_difference = effective_substitute_cost - primary_cost
            
            cost_comparison = {
                "primary_unit_cost": primary_cost,
                "substitute_unit_cost": substitute_cost,
                "substitution_ratio": substitution_ratio,
                "effective_substitute_cost": effective_substitute_cost,
                "cost_difference": cost_difference,
                "cost_difference_percent": (cost_difference / primary_cost * 100) if primary_cost > 0 else 0,
                "is_cost_effective": cost_difference <= 0
            }
        
        return {
            "component_substitute": {
                "id": result[0],
                "bom_line_id": result[1],
                "bom_line_number": result[2],
                "primary_product_id": result[3],
                "primary_product_code": result[4],
                "primary_product_name": result[5],
                "substitute_product_id": substitute_product_id,
                "substitute_product_code": result[7],
                "substitute_product_name": result[8],
                "substitution_ratio": float(result[9]) if result[9] else 1.0,
                "priority": result[10],
                "is_preferred": result[11],
                "notes": result[12],
                "created_at": str(result[13]) if result[13] else None,
                "created_by": result[14]
            },
            "availability": {
                "total_available": total_available,
                "is_available": total_available > 0,
                "warehouse_breakdown": availability
            },
            "usage_history": {
                "total_times_used": len(usage_history),
                "total_quantity_used": total_used,
                "recent_usage": usage_history
            },
            "cost_comparison": cost_comparison
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
