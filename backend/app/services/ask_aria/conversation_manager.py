"""
Conversation Manager for Ask Aria
Handles conversation state, message history, and slot filling
"""
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
import psycopg2
import psycopg2.extras
import logging

logger = logging.getLogger(__name__)


class ConversationManager:
    """Manages conversation state and persistence"""
    
    def __init__(self, db_connection_string: str):
        self.db_connection_string = db_connection_string
    
    def get_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_connection_string)
    
    def create_conversation(
        self,
        company_id: str,
        user_id: str,
        intent: Optional[str] = None
    ) -> str:
        """Create a new conversation"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    conversation_id = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO conversations (id, company_id, user_id, intent, status)
                        VALUES (%s, %s, %s, %s, 'active')
                        RETURNING id
                    """, (conversation_id, company_id, user_id, intent))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    logger.info(f"Created conversation {conversation_id} for user {user_id}")
                    return str(result['id'])
                    
        except Exception as e:
            logger.error(f"Failed to create conversation: {str(e)}")
            raise
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation by ID"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM conversations WHERE id = %s
                    """, (conversation_id,))
                    
                    result = cur.fetchone()
                    return dict(result) if result else None
                    
        except Exception as e:
            logger.error(f"Failed to get conversation: {str(e)}")
            return None
    
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: Optional[str] = None,
        tool_name: Optional[str] = None,
        tool_args: Optional[Dict[str, Any]] = None,
        tool_result: Optional[Dict[str, Any]] = None
    ) -> str:
        """Add a message to the conversation"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    message_id = str(uuid.uuid4())
                    cur.execute("""
                        INSERT INTO messages 
                        (id, conversation_id, role, content, tool_name, tool_args, tool_result)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        message_id,
                        conversation_id,
                        role,
                        content,
                        tool_name,
                        psycopg2.extras.Json(tool_args) if tool_args else None,
                        psycopg2.extras.Json(tool_result) if tool_result else None
                    ))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    return str(result['id'])
                    
        except Exception as e:
            logger.error(f"Failed to add message: {str(e)}")
            raise
    
    def get_messages(
        self,
        conversation_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get messages for a conversation"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM messages 
                        WHERE conversation_id = %s 
                        ORDER BY created_at ASC
                        LIMIT %s
                    """, (conversation_id, limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Failed to get messages: {str(e)}")
            return []
    
    def set_slot(
        self,
        conversation_id: str,
        key: str,
        value: str,
        confidence: float = 1.0,
        source: str = "user"
    ):
        """Set a slot value for the conversation"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO conversation_slots 
                        (conversation_id, key, value, confidence, source)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (conversation_id, key) 
                        DO UPDATE SET 
                            value = EXCLUDED.value,
                            confidence = EXCLUDED.confidence,
                            source = EXCLUDED.source
                    """, (conversation_id, key, value, confidence, source))
                    
                    conn.commit()
                    
        except Exception as e:
            logger.error(f"Failed to set slot: {str(e)}")
            raise
    
    def get_slots(self, conversation_id: str) -> Dict[str, Any]:
        """Get all slots for a conversation"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT key, value, confidence, source 
                        FROM conversation_slots 
                        WHERE conversation_id = %s
                    """, (conversation_id,))
                    
                    results = cur.fetchall()
                    return {row['key']: dict(row) for row in results}
                    
        except Exception as e:
            logger.error(f"Failed to get slots: {str(e)}")
            return {}
    
    def update_conversation_status(
        self,
        conversation_id: str,
        status: str
    ):
        """Update conversation status"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE conversations 
                        SET status = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (status, conversation_id))
                    
                    conn.commit()
                    
        except Exception as e:
            logger.error(f"Failed to update conversation status: {str(e)}")
            raise
    
    def update_conversation_intent(
        self,
        conversation_id: str,
        intent: str
    ):
        """Update conversation intent"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE conversations 
                        SET intent = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (intent, conversation_id))
                    
                    conn.commit()
                    
        except Exception as e:
            logger.error(f"Failed to update conversation intent: {str(e)}")
            raise
    
    def get_user_conversations(
        self,
        user_id: str,
        company_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get recent conversations for a user"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM conversations 
                        WHERE user_id = %s AND company_id = %s
                        ORDER BY updated_at DESC
                        LIMIT %s
                    """, (user_id, company_id, limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Failed to get user conversations: {str(e)}")
            return []
