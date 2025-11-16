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


@router.get("/material-issue-line/{line_id}/detail")
async def get_material_issue_line_detail(
    line_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information for a material issue line"""
    try:
        company_id = current_user.get("company_id", "default")
        
        line_query = text("""
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
                mil.bin_location,
                mil.lot_number,
                mil.serial_number,
                mi.work_order_id,
                wo.work_order_number,
                wo.product_id as wo_product_id,
                wp.product_code as wo_product_code,
                wp.name as wo_product_name,
                mil.bom_line_id,
                mil.consumed_for_operation_id
            FROM material_issue_lines mil
            JOIN material_issues mi ON mil.material_issue_id = mi.id
            JOIN products p ON mil.product_id = p.id
            JOIN warehouses w ON mil.warehouse_id = w.id
            LEFT JOIN work_orders wo ON mi.work_order_id = wo.id
            LEFT JOIN products wp ON wo.product_id = wp.id
            WHERE mil.id = :line_id AND mi.company_id = :company_id
        """)
        
        line_result = db.execute(line_query, {
            "line_id": line_id,
            "company_id": company_id
        }).fetchone()
        
        if not line_result:
            raise HTTPException(status_code=404, detail="Material issue line not found")
        
        bom_line = None
        if line_result[20]:
            bom_query = text("""
                SELECT 
                    bl.id,
                    bl.line_number,
                    bl.quantity_per_unit,
                    bl.scrap_percent,
                    bl.is_critical
                FROM bom_lines bl
                WHERE bl.id = :bom_line_id AND bl.company_id = :company_id
            """)
            
            bom_result = db.execute(bom_query, {
                "bom_line_id": line_result[20],
                "company_id": company_id
            }).fetchone()
            
            if bom_result:
                bom_line = {
                    "id": bom_result[0],
                    "line_number": bom_result[1],
                    "quantity_per_unit": float(bom_result[2]) if bom_result[2] else 0,
                    "scrap_percent": float(bom_result[3]) if bom_result[3] else 0,
                    "is_critical": bom_result[4]
                }
        
        operation = None
        if line_result[21]:
            op_query = text("""
                SELECT 
                    woo.id,
                    woo.operation_number,
                    woo.operation_name,
                    woo.status,
                    woo.actual_duration,
                    woo.actual_cost
                FROM work_order_operations woo
                WHERE woo.id = :operation_id AND woo.company_id = :company_id
            """)
            
            op_result = db.execute(op_query, {
                "operation_id": line_result[21],
                "company_id": company_id
            }).fetchone()
            
            if op_result:
                operation = {
                    "id": op_result[0],
                    "operation_number": op_result[1],
                    "operation_name": op_result[2],
                    "status": op_result[3],
                    "actual_duration": float(op_result[4]) if op_result[4] else 0,
                    "actual_cost": float(op_result[5]) if op_result[5] else 0
                }
        
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
                AND il.reference_id = :line_id
                AND il.company_id = :company_id
        """)
        
        ledger_result = db.execute(ledger_query, {
            "line_id": line_id,
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
            WHERE clc.consumption_type = 'MATERIAL_ISSUE'
                AND clc.consumption_id = :line_id
                AND clc.company_id = :company_id
        """)
        
        cost_layer_result = db.execute(cost_layer_query, {
            "line_id": line_id,
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
        
        return {
            "material_issue_line": {
                "id": line_result[0],
                "material_issue_id": line_result[1],
                "issue_number": line_result[2],
                "issue_date": str(line_result[3]) if line_result[3] else None,
                "product_id": line_result[4],
                "product_code": line_result[5],
                "product_name": line_result[6],
                "quantity_issued": float(line_result[7]) if line_result[7] else 0,
                "unit_cost": float(line_result[8]) if line_result[8] else 0,
                "total_cost": float(line_result[9]) if line_result[9] else 0,
                "warehouse_id": line_result[10],
                "warehouse_name": line_result[11],
                "bin_location": line_result[12],
                "lot_number": line_result[13],
                "serial_number": line_result[14],
                "work_order_id": line_result[15],
                "work_order_number": line_result[16],
                "wo_product_id": line_result[17],
                "wo_product_code": line_result[18],
                "wo_product_name": line_result[19],
                "bom_line_id": line_result[20],
                "consumed_for_operation_id": line_result[21]
            },
            "bom_line": bom_line,
            "operation": operation,
            "ledger_transactions": ledger_transactions,
            "cost_layers": cost_layers
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
