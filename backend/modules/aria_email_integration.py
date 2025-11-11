"""
Aria Email Integration Module
Integrates Office365 mailbox with Aria Controller Engine for slot-filling workflows
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncpg
import logging
import os
import json

from modules.aria_controller_engine import aria_controller, AriaRequest, AriaResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/aria/email", tags=["Aria Email Integration"])


class EmailMessage(BaseModel):
    message_id: str
    thread_id: Optional[str] = None
    from_address: str
    to_address: str
    subject: str
    body: str
    attachments: Optional[List[Dict[str, Any]]] = []
    received_at: datetime


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


async def get_or_create_conversation(
    conn: asyncpg.Connection,
    message_id: str,
    thread_id: Optional[str],
    from_address: str,
    to_address: str,
    subject: str
) -> Optional[Dict[str, Any]]:
    """Get existing conversation or create new one"""
    
    if thread_id:
        existing = await conn.fetchrow("""
            SELECT * FROM aria_email_conversations
            WHERE thread_id = $1 AND conversation_state = 'active'
            ORDER BY last_message_at DESC
            LIMIT 1
        """, thread_id)
        
        if existing:
            return dict(existing)
    
    existing = await conn.fetchrow("""
        SELECT * FROM aria_email_conversations
        WHERE message_id = $1
    """, message_id)
    
    if existing:
        return dict(existing)
    
    new_conv = await conn.fetchrow("""
        INSERT INTO aria_email_conversations (
            message_id, thread_id, from_address, to_address, subject,
            conversation_state, last_message_at
        ) VALUES ($1, $2, $3, $4, $5, 'active', NOW())
        RETURNING *
    """, message_id, thread_id, from_address, to_address, subject)
    
    return dict(new_conv) if new_conv else None


async def update_conversation_state(
    conn: asyncpg.Connection,
    conversation_id: str,
    intent: str,
    gathered_fields: Dict[str, Any],
    missing_fields: List[str],
    state: str = 'active'
):
    """Update conversation state with Aria Controller results"""
    await conn.execute("""
        UPDATE aria_email_conversations
        SET intent = $2,
            gathered_fields = $3,
            missing_fields = $4,
            conversation_state = $5,
            last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
    """, conversation_id, intent, json.dumps(gathered_fields), missing_fields, state)


async def log_email_processing(
    conn: asyncpg.Connection,
    message_id: str,
    conversation_id: Optional[str],
    from_address: str,
    subject: str,
    body_preview: str,
    intent_detected: Optional[str],
    bots_activated: List[str],
    status: str,
    error_message: Optional[str] = None
):
    """Log email processing results"""
    await conn.execute("""
        INSERT INTO aria_email_processing_log (
            message_id, conversation_id, from_address, subject, body_preview,
            intent_detected, bots_activated, processing_status, error_message,
            received_at, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    """, message_id, conversation_id, from_address, subject, body_preview[:500],
        intent_detected, bots_activated, status, error_message)


async def process_email_with_aria(email: EmailMessage) -> Dict[str, Any]:
    """Process email through Aria Controller Engine"""
    conn = await get_db_connection()
    
    try:
        conversation = await get_or_create_conversation(
            conn,
            email.message_id,
            email.thread_id,
            email.from_address,
            email.to_address,
            email.subject
        )
        
        if not conversation:
            raise Exception("Failed to create conversation")
        
        context = conversation.get('gathered_fields', {})
        if isinstance(context, str):
            context = json.loads(context) if context else {}
        
        if email.attachments:
            context['attachments'] = email.attachments
        
        aria_request = AriaRequest(
            message=email.body,
            context=context,
            attachments=email.attachments or []
        )
        
        aria_response: AriaResponse = await aria_controller.process_request(aria_request)
        
        if aria_response.status == "needs_more_info":
            await update_conversation_state(
                conn,
                conversation['id'],
                aria_response.intent.get('intent', 'unknown'),
                aria_response.information_gathered,
                aria_response.next_steps,
                'active'
            )
            
            await log_email_processing(
                conn, email.message_id, conversation['id'],
                email.from_address, email.subject, email.body,
                aria_response.intent.get('intent'), [], 'completed'
            )
            
            intent_name = aria_response.intent.get('intent', 'your request').replace('_', ' ')
            body = f"Thank you for your email. I need some additional information to {intent_name}:\n\n"
            for i, field in enumerate(aria_response.next_steps, 1):
                body += f"{i}. {field}\n"
            body += "\nPlease reply to this email with the requested information.\n\nBest regards,\nAria"
            
            return {
                'status': 'needs_more_info',
                'reply_to': email.from_address,
                'subject': f"RE: {email.subject}",
                'body': body,
                'conversation_id': conversation['id']
            }
        
        elif aria_response.status == "success":
            await update_conversation_state(
                conn, conversation['id'],
                aria_response.intent.get('intent', 'unknown'),
                aria_response.information_gathered, [], 'completed'
            )
            
            await log_email_processing(
                conn, email.message_id, conversation['id'],
                email.from_address, email.subject, email.body,
                aria_response.intent.get('intent'),
                aria_response.bots_activated, 'completed'
            )
            
            intent_name = aria_response.intent.get('intent', 'your request').replace('_', ' ')
            body = f"Your request has been processed successfully!\n\nAction: {intent_name}\n"
            if aria_response.bots_activated:
                body += f"Bots activated: {', '.join(aria_response.bots_activated)}\n"
            body += "\nBest regards,\nAria"
            
            return {
                'status': 'success',
                'reply_to': email.from_address,
                'subject': f"RE: {email.subject}",
                'body': body,
                'conversation_id': conversation['id']
            }
        
        else:
            raise Exception(f"Unknown Aria Controller status: {aria_response.status}")
    
    except Exception as e:
        logger.error(f"Error processing email with Aria: {e}")
        
        if conversation:
            await log_email_processing(
                conn, email.message_id, conversation.get('id'),
                email.from_address, email.subject, email.body,
                None, [], 'failed', str(e)
            )
        
        return {
            'status': 'error',
            'reply_to': email.from_address,
            'subject': f"RE: {email.subject}",
            'body': f"I encountered an error processing your request: {str(e)}\n\nPlease try again or contact support.",
            'conversation_id': conversation.get('id') if conversation else None
        }
    
    finally:
        await conn.close()


@router.post("/process")
async def process_inbound_email(email: EmailMessage, background_tasks: BackgroundTasks):
    """Process inbound email through Aria Controller"""
    try:
        result = await process_email_with_aria(email)
        
        return {
            'success': True,
            'message': 'Email processed successfully',
            'result': result
        }
    
    except Exception as e:
        logger.error(f"Error processing inbound email: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def list_conversations(
    from_address: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50
):
    """List email conversations"""
    conn = await get_db_connection()
    
    try:
        query = "SELECT * FROM aria_email_conversations WHERE 1=1"
        params = []
        param_count = 1
        
        if from_address:
            query += f" AND from_address = ${param_count}"
            params.append(from_address)
            param_count += 1
        
        if state:
            query += f" AND conversation_state = ${param_count}"
            params.append(state)
            param_count += 1
        
        query += f" ORDER BY last_message_at DESC LIMIT ${param_count}"
        params.append(limit)
        
        rows = await conn.fetch(query, *params)
        
        return {
            'conversations': [dict(row) for row in rows],
            'count': len(rows)
        }
    
    finally:
        await conn.close()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'module': 'aria_email_integration',
        'timestamp': datetime.now().isoformat()
    }
