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


@router.get("/material-consumption/{consumption_id}/atomic-detail")
async def get_material_consumption_atomic_detail(
    consumption_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get atomic-level detail for a single material consumption transaction"""
    try:
        company_id = current_user.get("company_id", "default")
        
        query = text("""
            SELECT 
                mil.id,
                mil.material_issue_id,
                mi.issue_number,
                mi.issue_date,
                mil.product_id,
                p.product_code,
                p.name as product_name,
                mil.quantity_issued,
                mil.unit_cost,
                mil.total_cost,
                mil.warehouse_id,
                w.name as warehouse_name,
                mil.lot_number,
                mil.serial_number,
                mi.work_order_id,
                wo.work_order_number,
                mil.bom_line_id,
                bl.quantity_per_unit as standard_quantity,
                mil.consumed_for_operation_id,
                woo.operation_name
            FROM material_issue_lines mil
            JOIN material_issues mi ON mil.material_issue_id = mi.id
            JOIN products p ON mil.product_id = p.id
            JOIN warehouses w ON mil.warehouse_id = w.id
            LEFT JOIN work_orders wo ON mi.work_order_id = wo.id
            LEFT JOIN bom_lines bl ON mil.bom_line_id = bl.id
            LEFT JOIN work_order_operations woo ON mil.consumed_for_operation_id = woo.id
            WHERE mil.id = :consumption_id AND mi.company_id = :company_id
        """)
        
        result = db.execute(query, {
            "consumption_id": consumption_id,
            "company_id": company_id
        }).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Material consumption not found")
        
        qty_issued = float(result[7]) if result[7] else 0
        unit_cost = float(result[8]) if result[8] else 0
        total_cost = float(result[9]) if result[9] else 0
        standard_qty = float(result[17]) if result[17] else 0
        
        waste_qty = 0
        waste_cost = 0
        
        if standard_qty > 0:
            waste_qty = qty_issued - standard_qty
            waste_cost = waste_qty * unit_cost
        
        cost_layer_query = text("""
            SELECT 
                clc.id,
                clc.cost_layer_id,
                cl.receipt_date,
                cl.unit_cost as layer_unit_cost,
                clc.quantity_consumed,
                clc.cost_amount
            FROM cost_layer_consumption clc
            JOIN cost_layers cl ON clc.cost_layer_id = cl.id
            WHERE clc.consumption_type = 'MATERIAL_ISSUE_LINE'
                AND clc.consumption_id = :consumption_id
                AND clc.company_id = :company_id
        """)
        
        cost_layer_result = db.execute(cost_layer_query, {
            "consumption_id": consumption_id,
            "company_id": company_id
        })
        
        cost_layers = []
        for row in cost_layer_result.fetchall():
            cost_layers.append({
                "id": row[0],
                "cost_layer_id": row[1],
                "receipt_date": str(row[2]) if row[2] else None,
                "layer_unit_cost": float(row[3]) if row[3] else 0,
                "quantity_consumed": float(row[4]) if row[4] else 0,
                "cost_amount": float(row[5]) if row[5] else 0
            })
        
        ledger_query = text("""
            SELECT 
                il.id,
                il.transaction_date,
                il.transaction_type,
                il.quantity,
                il.unit_cost,
                il.total_cost
            FROM item_ledger il
            WHERE il.reference_type = 'MATERIAL_ISSUE_LINE'
                AND il.reference_id = :consumption_id
                AND il.company_id = :company_id
        """)
        
        ledger_result = db.execute(ledger_query, {
            "consumption_id": consumption_id,
            "company_id": company_id
        })
        
        ledger_transactions = []
        for row in ledger_result.fetchall():
            ledger_transactions.append({
                "id": row[0],
                "transaction_date": str(row[1]) if row[1] else None,
                "transaction_type": row[2],
                "quantity": float(row[3]) if row[3] else 0,
                "unit_cost": float(row[4]) if row[4] else 0,
                "total_cost": float(row[5]) if row[5] else 0
            })
        
        work_order_impact = None
        work_order_id = result[14]
        
        if work_order_id:
            wo_query = text("""
                SELECT 
                    wo.work_order_number,
                    wo.product_id,
                    p.product_code,
                    p.name as product_name,
                    wo.quantity_to_produce,
                    wo.actual_cost
                FROM work_orders wo
                JOIN products p ON wo.product_id = p.id
                WHERE wo.id = :work_order_id AND wo.company_id = :company_id
            """)
            
            wo_result = db.execute(wo_query, {
                "work_order_id": work_order_id,
                "company_id": company_id
            }).fetchone()
            
            if wo_result:
                work_order_impact = {
                    "work_order_number": wo_result[0],
                    "product_id": wo_result[1],
                    "product_code": wo_result[2],
                    "product_name": wo_result[3],
                    "quantity_to_produce": float(wo_result[4]) if wo_result[4] else 0,
                    "actual_cost": float(wo_result[5]) if wo_result[5] else 0,
                    "material_cost_contribution": total_cost
                }
        
        return {
            "material_consumption": {
                "id": result[0],
                "material_issue_id": result[1],
                "issue_number": result[2],
                "issue_date": str(result[3]) if result[3] else None,
                "product_id": result[4],
                "product_code": result[5],
                "product_name": result[6],
                "quantity_issued": qty_issued,
                "unit_cost": unit_cost,
                "total_cost": total_cost,
                "warehouse_id": result[10],
                "warehouse_name": result[11],
                "lot_number": result[12],
                "serial_number": result[13],
                "work_order_id": work_order_id,
                "work_order_number": result[15],
                "bom_line_id": result[16],
                "standard_quantity": standard_qty,
                "consumed_for_operation_id": result[18],
                "operation_name": result[19]
            },
            "waste_analysis": {
                "waste_quantity": waste_qty,
                "waste_cost": waste_cost,
                "waste_percent": (waste_qty / standard_qty * 100) if standard_qty > 0 else 0,
                "has_waste": waste_qty > 0
            },
            "cost_layer_sources": cost_layers,
            "ledger_transactions": ledger_transactions,
            "work_order_impact": work_order_impact
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
