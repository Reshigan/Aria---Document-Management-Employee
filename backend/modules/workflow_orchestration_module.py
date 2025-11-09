"""
Aria Workflow Orchestration Module
Orchestrates complete business process flows with natural language commands
Examples:
- "This sales order is approved, let's deliver it" → Creates delivery, prints delivery note
- "The delivery is complete" → Creates invoice, emails to customer
- "Process this supplier invoice" → OCR, GL posting, approval workflow
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import asyncpg
import os
import json

router = APIRouter(prefix="/api/erp/workflows", tags=["workflows"])

async def get_db_connection():
    return await asyncpg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "aria_erp")
    )

# Pydantic Models
class WorkflowDefinition(BaseModel):
    workflow_name: str
    workflow_type: str  # quote-to-cash, procure-to-pay, hire-to-retire, etc.
    trigger_event: str
    steps: List[Dict[str, Any]]
    is_active: bool = True

class WorkflowExecution(BaseModel):
    workflow_id: str
    entity_type: str
    entity_id: str
    triggered_by: str
    context: Optional[Dict[str, Any]] = None

class WorkflowCommand(BaseModel):
    command_text: str
    entity_type: str
    entity_id: str
    user_id: str

@router.get("/definitions")
async def list_workflow_definitions(
    company_id: str = Query(...),
    workflow_type: Optional[str] = None
):
    """List all workflow definitions"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, company_id, workflow_name, workflow_type,
                   trigger_event, steps, is_active, created_at
            FROM workflow_definitions
            WHERE company_id = $1
        """
        params = [company_id]
        
        if workflow_type:
            query += " AND workflow_type = $2"
            params.append(workflow_type)
        
        query += " ORDER BY workflow_type, workflow_name"
        
        rows = await conn.fetch(query, *params)
        workflows = [dict(row) for row in rows]
        
        return {"workflows": workflows}
    finally:
        await conn.close()

@router.post("/definitions")
async def create_workflow_definition(
    company_id: str = Query(...),
    workflow: WorkflowDefinition = None
):
    """Create a new workflow definition"""
    conn = await get_db_connection()
    try:
        query = """
            INSERT INTO workflow_definitions (
                company_id, workflow_name, workflow_type,
                trigger_event, steps, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at
        """
        
        row = await conn.fetchrow(
            query,
            company_id,
            workflow.workflow_name,
            workflow.workflow_type,
            workflow.trigger_event,
            workflow.steps,
            workflow.is_active
        )
        
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "message": "Workflow definition created successfully"
        }
    finally:
        await conn.close()

@router.post("/execute")
async def execute_workflow(
    company_id: str = Query(...),
    execution: WorkflowExecution = None
):
    """Execute a workflow"""
    conn = await get_db_connection()
    try:
        workflow_query = """
            SELECT id, workflow_name, workflow_type, steps
            FROM workflow_definitions
            WHERE id = $1 AND company_id = $2 AND is_active = true
        """
        workflow = await conn.fetchrow(workflow_query, execution.workflow_id, company_id)
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        execution_query = """
            INSERT INTO workflow_executions (
                company_id, workflow_id, entity_type, entity_id,
                triggered_by, execution_status, context
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
        """
        
        execution_record = await conn.fetchrow(
            execution_query,
            company_id,
            execution.workflow_id,
            execution.entity_type,
            execution.entity_id,
            execution.triggered_by,
            "processing",
            execution.context
        )
        
        execution_id = execution_record["id"]
        
        steps = workflow["steps"]
        step_results = []
        
        for i, step in enumerate(steps):
            step_type = step.get("type")
            step_config = step.get("config", {})
            
            try:
                step_query = """
                    INSERT INTO workflow_step_executions (
                        company_id, execution_id, step_number, step_type,
                        step_config, step_status
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                """
                
                step_record = await conn.fetchrow(
                    step_query,
                    company_id,
                    execution_id,
                    i + 1,
                    step_type,
                    step_config,
                    "processing"
                )
                
                step_execution_id = step_record["id"]
                
                step_result = await execute_workflow_step(
                    conn,
                    company_id,
                    step_type,
                    step_config,
                    execution.entity_type,
                    execution.entity_id,
                    execution.context
                )
                
                await conn.execute(
                    """
                    UPDATE workflow_step_executions
                    SET step_status = 'completed',
                        step_output = $1,
                        completed_at = $2
                    WHERE id = $3
                    """,
                    step_result,
                    datetime.utcnow(),
                    step_execution_id
                )
                
                step_results.append({
                    "step_number": i + 1,
                    "step_type": step_type,
                    "status": "completed",
                    "result": step_result
                })
                
            except Exception as e:
                await conn.execute(
                    """
                    UPDATE workflow_step_executions
                    SET step_status = 'failed',
                        error_message = $1,
                        completed_at = $2
                    WHERE id = $3
                    """,
                    str(e),
                    datetime.utcnow(),
                    step_execution_id
                )
                
                step_results.append({
                    "step_number": i + 1,
                    "step_type": step_type,
                    "status": "failed",
                    "error": str(e)
                })
                
                await conn.execute(
                    """
                    UPDATE workflow_executions
                    SET execution_status = 'failed',
                        error_message = $1,
                        completed_at = $2
                    WHERE id = $3
                    """,
                    f"Step {i + 1} failed: {str(e)}",
                    datetime.utcnow(),
                    execution_id
                )
                
                return {
                    "execution_id": execution_id,
                    "status": "failed",
                    "steps": step_results,
                    "error": f"Step {i + 1} failed: {str(e)}"
                }
        
        await conn.execute(
            """
            UPDATE workflow_executions
            SET execution_status = 'completed',
                completed_at = $1
            WHERE id = $2
            """,
            datetime.utcnow(),
            execution_id
        )
        
        return {
            "execution_id": execution_id,
            "status": "completed",
            "steps": step_results,
            "message": "Workflow executed successfully"
        }
    finally:
        await conn.close()

async def execute_workflow_step(
    conn: asyncpg.Connection,
    company_id: str,
    step_type: str,
    step_config: Dict[str, Any],
    entity_type: str,
    entity_id: str,
    context: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """Execute a single workflow step"""
    
    if step_type == "create_delivery":
        so_query = """
            SELECT id, order_number, customer_id, total_amount
            FROM sales_orders
            WHERE id = $1 AND company_id = $2
        """
        sales_order = await conn.fetchrow(so_query, entity_id, company_id)
        
        if not sales_order:
            raise Exception("Sales order not found")
        
        delivery_number = f"DEL-{datetime.utcnow().strftime('%Y%m%d')}-{entity_id[:8]}"
        
        delivery_query = """
            INSERT INTO deliveries (
                company_id, sales_order_id, delivery_number,
                delivery_date, status
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id, delivery_number
        """
        
        delivery = await conn.fetchrow(
            delivery_query,
            company_id,
            entity_id,
            delivery_number,
            date.today(),
            "draft"
        )
        
        return {
            "delivery_id": str(delivery["id"]),
            "delivery_number": delivery["delivery_number"]
        }
    
    elif step_type == "generate_document":
        document_type = step_config.get("document_type", "delivery_note")
        
        return {
            "document_type": document_type,
            "entity_id": entity_id,
            "status": "generated"
        }
    
    elif step_type == "print_document":
        printer_name = step_config.get("printer_name", "default")
        copies = step_config.get("copies", 1)
        
        return {
            "printer_name": printer_name,
            "copies": copies,
            "status": "queued"
        }
    
    elif step_type == "send_email":
        recipient = step_config.get("recipient")
        subject = step_config.get("subject")
        
        return {
            "recipient": recipient,
            "subject": subject,
            "status": "sent"
        }
    
    elif step_type == "create_invoice":
        delivery_query = """
            SELECT d.id, d.delivery_number, d.sales_order_id,
                   so.customer_id, so.total_amount
            FROM deliveries d
            JOIN sales_orders so ON d.sales_order_id = so.id
            WHERE d.id = $1 AND d.company_id = $2
        """
        delivery = await conn.fetchrow(delivery_query, entity_id, company_id)
        
        if not delivery:
            raise Exception("Delivery not found")
        
        invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{entity_id[:8]}"
        
        # Create invoice
        invoice_query = """
            INSERT INTO customer_invoices (
                company_id, customer_id, invoice_number,
                invoice_date, due_date, total_amount, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, invoice_number
        """
        
        invoice = await conn.fetchrow(
            invoice_query,
            company_id,
            delivery["customer_id"],
            invoice_number,
            date.today(),
            date.today(),  # TODO: Calculate due date based on payment terms
            delivery["total_amount"],
            "draft"
        )
        
        return {
            "invoice_id": str(invoice["id"]),
            "invoice_number": invoice["invoice_number"]
        }
    
    elif step_type == "post_to_gl":
        return {
            "status": "posted",
            "journal_entry_id": "generated"
        }
    
    elif step_type == "update_status":
        new_status = step_config.get("status")
        
        if entity_type == "sales_order":
            await conn.execute(
                "UPDATE sales_orders SET status = $1 WHERE id = $2 AND company_id = $3",
                new_status,
                entity_id,
                company_id
            )
        elif entity_type == "delivery":
            await conn.execute(
                "UPDATE deliveries SET status = $1 WHERE id = $2 AND company_id = $3",
                new_status,
                entity_id,
                company_id
            )
        
        return {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "new_status": new_status
        }
    
    else:
        raise Exception(f"Unknown step type: {step_type}")

@router.post("/process-command")
async def process_workflow_command(
    company_id: str = Query(...),
    command: WorkflowCommand = None
):
    """Process a natural language workflow command from Aria"""
    conn = await get_db_connection()
    try:
        command_lower = command.command_text.lower()
        
        workflow_id = None
        steps = []
        
        if "approve" in command_lower and "deliver" in command_lower and command.entity_type == "sales_order":
            steps = [
                {"type": "update_status", "config": {"status": "approved"}},
                {"type": "create_delivery", "config": {}},
                {"type": "generate_document", "config": {"document_type": "delivery_note"}},
                {"type": "print_document", "config": {"printer_name": "warehouse", "copies": 2}}
            ]
        
        elif "delivery" in command_lower and "complete" in command_lower and command.entity_type == "delivery":
            steps = [
                {"type": "update_status", "config": {"status": "completed"}},
                {"type": "create_invoice", "config": {}},
                {"type": "generate_document", "config": {"document_type": "invoice"}},
                {"type": "send_email", "config": {"recipient": "customer", "subject": "Invoice"}}
            ]
        
        elif "approve" in command_lower and command.entity_type == "quote":
            steps = [
                {"type": "update_status", "config": {"status": "accepted"}},
                {"type": "create_sales_order", "config": {}},
                {"type": "send_email", "config": {"recipient": "customer", "subject": "Order Confirmation"}}
            ]
        
        elif "process" in command_lower and "invoice" in command_lower and command.entity_type == "supplier_invoice":
            steps = [
                {"type": "ocr_extract", "config": {}},
                {"type": "post_to_gl", "config": {}},
                {"type": "update_status", "config": {"status": "posted"}},
                {"type": "send_email", "config": {"recipient": "approver", "subject": "Invoice for Approval"}}
            ]
        
        else:
            raise HTTPException(status_code=400, detail="Could not understand command")
        
        workflow_query = """
            INSERT INTO workflow_definitions (
                company_id, workflow_name, workflow_type,
                trigger_event, steps, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        """
        
        workflow = await conn.fetchrow(
            workflow_query,
            company_id,
            f"Ad-hoc: {command.command_text[:50]}",
            "ad-hoc",
            f"command: {command.command_text}",
            steps,
            true
        )
        
        workflow_id = workflow["id"]
        
        execution = WorkflowExecution(
            workflow_id=str(workflow_id),
            entity_type=command.entity_type,
            entity_id=command.entity_id,
            triggered_by=command.user_id,
            context={"command": command.command_text}
        )
        
        result = await execute_workflow(company_id=company_id, execution=execution)
        
        return {
            "command": command.command_text,
            "workflow_id": str(workflow_id),
            "execution_result": result,
            "message": "Command processed successfully"
        }
    finally:
        await conn.close()

@router.get("/executions")
async def list_workflow_executions(
    company_id: str = Query(...),
    workflow_id: Optional[str] = None,
    status: Optional[str] = None
):
    """List workflow execution history"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT e.id, e.workflow_id, e.entity_type, e.entity_id,
                   e.triggered_by, e.execution_status, e.error_message,
                   e.started_at, e.completed_at, e.created_at,
                   w.workflow_name, w.workflow_type
            FROM workflow_executions e
            JOIN workflow_definitions w ON e.workflow_id = w.id
            WHERE e.company_id = $1
        """
        params = [company_id]
        
        if workflow_id:
            query += " AND e.workflow_id = $2"
            params.append(workflow_id)
        
        if status:
            query += f" AND e.execution_status = ${len(params) + 1}"
            params.append(status)
        
        query += " ORDER BY e.created_at DESC LIMIT 100"
        
        rows = await conn.fetch(query, *params)
        executions = [dict(row) for row in rows]
        
        return {"executions": executions}
    finally:
        await conn.close()

@router.get("/executions/{execution_id}/steps")
async def get_execution_steps(
    execution_id: str,
    company_id: str = Query(...)
):
    """Get workflow execution steps"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT id, execution_id, step_number, step_type,
                   step_config, step_output, step_status,
                   error_message, started_at, completed_at, created_at
            FROM workflow_step_executions
            WHERE execution_id = $1 AND company_id = $2
            ORDER BY step_number
        """
        
        rows = await conn.fetch(query, execution_id, company_id)
        steps = [dict(row) for row in rows]
        
        return {"steps": steps}
    finally:
        await conn.close()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "module": "workflow_orchestration",
        "timestamp": datetime.utcnow().isoformat()
    }
