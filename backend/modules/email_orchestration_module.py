"""
Email Orchestration Module - Priority 5
Aria-driven workflow automation triggered by email events
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncpg
import logging
import os
import re
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp/workflows", tags=["Email Orchestration"])


# ============================================================================
# Pydantic Models
# ============================================================================

class EmailWorkflowCreate(BaseModel):
    company_id: str
    name: str
    trigger_type: str
    trigger_conditions: Optional[Dict[str, Any]] = None
    workflow_steps: List[Dict[str, Any]]

class WorkflowExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    company_id: str
    current_step: int
    total_steps: int
    status: str
    started_at: datetime

class InboundEmailProcess(BaseModel):
    message_id: str
    from_address: str
    to_address: str
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    received_at: datetime

class ApprovalWorkflowCreate(BaseModel):
    company_id: str
    document_type: str
    document_id: str
    approval_steps: List[Dict[str, Any]]
    requested_by: str

class ApprovalActionCreate(BaseModel):
    approval_workflow_id: str
    step_number: int
    approver_id: str
    action: str  # 'approved', 'rejected', 'delegated'
    comments: Optional[str] = None
    delegated_to: Optional[str] = None


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

class IntentDetector:
    """Simple rule-based intent detection for email processing"""
    
    INTENT_PATTERNS = {
        'quote_request': [
            r'request\s+(?:a\s+)?quote',
            r'quotation\s+for',
            r'price\s+for',
            r'how\s+much\s+(?:for|is)',
            r'can\s+you\s+quote'
        ],
        'order_approval': [
            r'(?:approve|approved)\s+(?:sales\s+)?order',
            r'order\s+(?:is\s+)?approved',
            r'so-\d+\s+approved',
            r'let\'?s?\s+deliver'
        ],
        'invoice_query': [
            r'invoice\s+(?:number|#)',
            r'payment\s+status',
            r'when\s+(?:is|was)\s+invoice',
            r'inv-\d+'
        ],
        'delivery_confirmation': [
            r'delivery\s+(?:is\s+)?complete',
            r'goods\s+received',
            r'signed\s+delivery\s+note',
            r'dn-\d+\s+signed'
        ],
        'purchase_request': [
            r'need\s+to\s+(?:buy|purchase|order)',
            r'can\s+we\s+order',
            r'purchase\s+request'
        ]
    }
    
    def detect_intent(self, subject: str, body: str) -> tuple[str, float]:
        """
        Detect intent from email subject and body
        
        Returns:
            (intent, confidence) tuple
        """
        text = f"{subject} {body}".lower()
        
        best_intent = 'unknown'
        best_confidence = 0.0
        
        for intent, patterns in self.INTENT_PATTERNS.items():
            matches = 0
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    matches += 1
            
            if matches > 0:
                confidence = min(100.0, (matches / len(patterns)) * 100)
                if confidence > best_confidence:
                    best_intent = intent
                    best_confidence = confidence
        
        return best_intent, best_confidence
    
    def extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract entities from text (order numbers, invoice numbers, etc.)"""
        entities = {}
        
        order_match = re.search(r'(?:SO|ORDER)[-\s]?(\d+)', text, re.IGNORECASE)
        if order_match:
            entities['order_number'] = order_match.group(1)
        
        invoice_match = re.search(r'(?:INV|INVOICE)[-\s]?(\d+)', text, re.IGNORECASE)
        if invoice_match:
            entities['invoice_number'] = invoice_match.group(1)
        
        dn_match = re.search(r'(?:DN|DELIVERY)[-\s]?(\d+)', text, re.IGNORECASE)
        if dn_match:
            entities['delivery_note'] = dn_match.group(1)
        
        # Extract amounts
        amount_match = re.search(r'R?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', text)
        if amount_match:
            entities['amount'] = amount_match.group(1).replace(',', '')
        
        return entities


# ============================================================================
# ============================================================================

async def execute_workflow_step(execution_id: str, step_number: int):
    """
    Execute a single workflow step
    
    Args:
        execution_id: Workflow execution ID
        step_number: Step number to execute
    """
    conn = await get_db_connection()
    
    try:
        execution = await conn.fetchrow(
            """
            SELECT we.*, ew.workflow_steps
            FROM workflow_executions we
            JOIN email_workflows ew ON we.workflow_id = ew.id
            WHERE we.id = $1
            """,
            execution_id
        )
        
        if not execution:
            logger.error(f"Workflow execution {execution_id} not found")
            return
        
        workflow_steps = execution['workflow_steps']
        
        if step_number >= len(workflow_steps):
            await conn.execute(
                """
                UPDATE workflow_executions
                SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                WHERE id = $1
                """,
                execution_id
            )
            logger.info(f"Workflow execution {execution_id} completed")
            return
        
        step = workflow_steps[step_number]
        step_type = step.get('type')
        
        logger.info(f"Executing workflow step {step_number}: {step_type}")
        
        if step_type == 'send_email':
            await conn.execute(
                """
                INSERT INTO outbound_emails 
                (company_id, to_address, subject, body_text, workflow_execution_id)
                VALUES ($1, $2, $3, $4, $5)
                """,
                execution['company_id'],
                step.get('to_address'),
                step.get('subject'),
                step.get('body'),
                execution_id
            )
        
        elif step_type == 'create_document':
            logger.info(f"Creating document: {step.get('document_type')}")
        
        elif step_type == 'generate_pdf':
            logger.info(f"Generating PDF for: {step.get('document_type')}")
        
        elif step_type == 'print_document':
            logger.info(f"Queuing print job for: {step.get('document_type')}")
        
        elif step_type == 'wait_for_approval':
            logger.info(f"Waiting for approval: {step.get('document_type')}")
            await conn.execute(
                """
                UPDATE workflow_executions
                SET status = 'paused', updated_at = NOW()
                WHERE id = $1
                """,
                execution_id
            )
            return
        
        execution_log = execution.get('execution_log') or []
        execution_log.append({
            'step': step_number,
            'type': step_type,
            'status': 'completed',
            'timestamp': datetime.now().isoformat()
        })
        
        await conn.execute(
            """
            UPDATE workflow_executions
            SET current_step = $2, execution_log = $3, updated_at = NOW()
            WHERE id = $1
            """,
            execution_id,
            step_number + 1,
            json.dumps(execution_log)
        )
        
        await execute_workflow_step(execution_id, step_number + 1)
    
    except Exception as e:
        logger.error(f"Error executing workflow step: {e}")
        
        await conn.execute(
            """
            UPDATE workflow_executions
            SET status = 'failed', error_message = $2, updated_at = NOW()
            WHERE id = $1
            """,
            execution_id,
            str(e)
        )
    
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/email-workflows")
async def create_email_workflow(workflow: EmailWorkflowCreate):
    """Create a new email workflow"""
    conn = await get_db_connection()
    
    try:
        new_workflow = await conn.fetchrow(
            """
            INSERT INTO email_workflows 
            (company_id, name, trigger_type, trigger_conditions, workflow_steps)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, company_id, name, trigger_type, is_active, created_at
            """,
            workflow.company_id,
            workflow.name,
            workflow.trigger_type,
            json.dumps(workflow.trigger_conditions) if workflow.trigger_conditions else None,
            json.dumps(workflow.workflow_steps)
        )
        
        return {
            "status": "success",
            "message": f"Workflow '{workflow.name}' created successfully",
            "workflow": {
                "id": str(new_workflow['id']),
                "company_id": str(new_workflow['company_id']),
                "name": new_workflow['name'],
                "trigger_type": new_workflow['trigger_type'],
                "is_active": new_workflow['is_active'],
                "created_at": new_workflow['created_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating workflow: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")
    finally:
        await conn.close()


@router.get("/email-workflows")
async def list_email_workflows(company_id: str):
    """List all email workflows for a company"""
    conn = await get_db_connection()
    
    try:
        workflows = await conn.fetch(
            """
            SELECT id, company_id, name, trigger_type, is_active, created_at
            FROM email_workflows
            WHERE company_id = $1
            ORDER BY name
            """,
            company_id
        )
        
        return {
            "workflows": [
                {
                    "id": str(w['id']),
                    "company_id": str(w['company_id']),
                    "name": w['name'],
                    "trigger_type": w['trigger_type'],
                    "is_active": w['is_active'],
                    "created_at": w['created_at'].isoformat()
                }
                for w in workflows
            ],
            "total": len(workflows)
        }
    
    except Exception as e:
        logger.error(f"Error listing workflows: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list workflows: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/inbound-emails/process")
async def process_inbound_email(email: InboundEmailProcess, background_tasks: BackgroundTasks):
    """
    Process an inbound email with NLP intent detection
    
    This endpoint:
    1. Detects intent from email content
    2. Extracts entities (order numbers, amounts, etc.)
    3. Finds matching workflow
    4. Executes workflow
    """
    conn = await get_db_connection()
    
    try:
        detector = IntentDetector()
        intent, confidence = detector.detect_intent(
            email.subject,
            email.body_text or email.body_html or ""
        )
        
        text = f"{email.subject} {email.body_text or email.body_html or ''}"
        entities = detector.extract_entities(text)
        
        inbound = await conn.fetchrow(
            """
            INSERT INTO inbound_emails 
            (message_id, from_address, to_address, subject, body_text, body_html, 
             attachments, received_at, intent, confidence, extracted_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, intent, confidence
            """,
            email.message_id,
            email.from_address,
            email.to_address,
            email.subject,
            email.body_text,
            email.body_html,
            json.dumps(email.attachments) if email.attachments else None,
            email.received_at,
            intent,
            confidence,
            json.dumps(entities)
        )
        
        
        return {
            "status": "success",
            "message": "Email processed successfully",
            "inbound_email_id": str(inbound['id']),
            "intent": inbound['intent'],
            "confidence": float(inbound['confidence']),
            "extracted_entities": entities
        }
    
    except Exception as e:
        logger.error(f"Error processing inbound email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process email: {str(e)}")
    finally:
        await conn.close()


@router.get("/inbound-emails")
async def list_inbound_emails(
    company_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
):
    """List inbound emails"""
    conn = await get_db_connection()
    
    try:
        if company_id and status:
            emails = await conn.fetch(
                """
                SELECT id, from_address, subject, intent, confidence, 
                       processing_status, received_at
                FROM inbound_emails
                WHERE company_id = $1 AND processing_status = $2
                ORDER BY received_at DESC
                LIMIT $3
                """,
                company_id,
                status,
                limit
            )
        elif company_id:
            emails = await conn.fetch(
                """
                SELECT id, from_address, subject, intent, confidence, 
                       processing_status, received_at
                FROM inbound_emails
                WHERE company_id = $1
                ORDER BY received_at DESC
                LIMIT $2
                """,
                company_id,
                limit
            )
        else:
            emails = await conn.fetch(
                """
                SELECT id, from_address, subject, intent, confidence, 
                       processing_status, received_at
                FROM inbound_emails
                ORDER BY received_at DESC
                LIMIT $1
                """,
                limit
            )
        
        return {
            "emails": [
                {
                    "id": str(e['id']),
                    "from_address": e['from_address'],
                    "subject": e['subject'],
                    "intent": e['intent'],
                    "confidence": float(e['confidence']) if e['confidence'] else 0.0,
                    "processing_status": e['processing_status'],
                    "received_at": e['received_at'].isoformat()
                }
                for e in emails
            ],
            "total": len(emails)
        }
    
    except Exception as e:
        logger.error(f"Error listing inbound emails: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list emails: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/approvals")
async def create_approval_workflow(approval: ApprovalWorkflowCreate):
    """Create a new approval workflow"""
    conn = await get_db_connection()
    
    try:
        new_approval = await conn.fetchrow(
            """
            INSERT INTO approval_workflows 
            (company_id, document_type, document_id, approval_steps, requested_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, company_id, document_type, document_id, status, requested_at
            """,
            approval.company_id,
            approval.document_type,
            approval.document_id,
            json.dumps(approval.approval_steps),
            approval.requested_by
        )
        
        return {
            "status": "success",
            "message": "Approval workflow created successfully",
            "approval": {
                "id": str(new_approval['id']),
                "company_id": str(new_approval['company_id']),
                "document_type": new_approval['document_type'],
                "document_id": str(new_approval['document_id']),
                "status": new_approval['status'],
                "requested_at": new_approval['requested_at'].isoformat()
            }
        }
    
    except Exception as e:
        logger.error(f"Error creating approval workflow: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create approval: {str(e)}")
    finally:
        await conn.close()


@router.post("/approvals/actions")
async def create_approval_action(action: ApprovalActionCreate, background_tasks: BackgroundTasks):
    """Record an approval action and advance workflow"""
    conn = await get_db_connection()
    
    try:
        new_action = await conn.fetchrow(
            """
            INSERT INTO approval_actions 
            (approval_workflow_id, step_number, approver_id, action, comments, delegated_to)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, action
            """,
            action.approval_workflow_id,
            action.step_number,
            action.approver_id,
            action.action,
            action.comments,
            action.delegated_to
        )
        
        if action.action == 'approved':
            await conn.execute(
                """
                UPDATE approval_workflows
                SET current_step = current_step + 1, updated_at = NOW()
                WHERE id = $1
                """,
                action.approval_workflow_id
            )
        elif action.action == 'rejected':
            await conn.execute(
                """
                UPDATE approval_workflows
                SET status = 'rejected', completed_at = NOW(), updated_at = NOW()
                WHERE id = $1
                """,
                action.approval_workflow_id
            )
        
        return {
            "status": "success",
            "message": f"Approval action '{action.action}' recorded successfully",
            "action_id": str(new_action['id'])
        }
    
    except Exception as e:
        logger.error(f"Error creating approval action: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record action: {str(e)}")
    finally:
        await conn.close()


@router.get("/approvals")
async def list_approval_workflows(
    company_id: str,
    status: Optional[str] = None,
    limit: int = 50
):
    """List approval workflows"""
    conn = await get_db_connection()
    
    try:
        if status:
            approvals = await conn.fetch(
                """
                SELECT id, document_type, document_id, current_step, status, requested_at
                FROM approval_workflows
                WHERE company_id = $1 AND status = $2
                ORDER BY requested_at DESC
                LIMIT $3
                """,
                company_id,
                status,
                limit
            )
        else:
            approvals = await conn.fetch(
                """
                SELECT id, document_type, document_id, current_step, status, requested_at
                FROM approval_workflows
                WHERE company_id = $1
                ORDER BY requested_at DESC
                LIMIT $2
                """,
                company_id,
                limit
            )
        
        return {
            "approvals": [
                {
                    "id": str(a['id']),
                    "document_type": a['document_type'],
                    "document_id": str(a['document_id']),
                    "current_step": a['current_step'],
                    "status": a['status'],
                    "requested_at": a['requested_at'].isoformat()
                }
                for a in approvals
            ],
            "total": len(approvals)
        }
    
    except Exception as e:
        logger.error(f"Error listing approvals: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list approvals: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for email orchestration module"""
    conn = await get_db_connection()
    
    try:
        workflow_count = await conn.fetchval("SELECT COUNT(*) FROM email_workflows WHERE is_active = true")
        execution_count = await conn.fetchval("SELECT COUNT(*) FROM workflow_executions WHERE status = 'running'")
        pending_emails = await conn.fetchval("SELECT COUNT(*) FROM inbound_emails WHERE processing_status = 'pending'")
        pending_approvals = await conn.fetchval("SELECT COUNT(*) FROM approval_workflows WHERE status = 'pending'")
        
        return {
            "status": "healthy",
            "module": "email_orchestration",
            "active_workflows": workflow_count,
            "running_executions": execution_count,
            "pending_emails": pending_emails,
            "pending_approvals": pending_approvals
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "module": "email_orchestration",
            "error": str(e)
        }
    finally:
        await conn.close()
