"""
Production-ready Conversation Engine
Handles context-aware conversations, history management, and intelligent responses
"""
import logging
import json
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class ConversationState(str, Enum):
    """Conversation states"""
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"
    ARCHIVED = "archived"


@dataclass
class Message:
    """Single message in conversation"""
    role: str  # system, user, assistant
    content: str
    timestamp: str
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata or {}
        }
    
    @classmethod
    from_dict(cls, data: Dict) -> 'Message':
        return cls(
            role=data["role"],
            content=data["content"],
            timestamp=data["timestamp"],
            metadata=data.get("metadata")
        )


@dataclass
class Conversation:
    """Complete conversation with history and context"""
    id: str
    user_id: str
    title: str
    messages: List[Message]
    state: ConversationState
    context: Dict[str, Any]
    created_at: str
    updated_at: str
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "messages": [msg.to_dict() for msg in self.messages],
            "state": self.state,
            "context": self.context,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": self.metadata or {}
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Conversation':
        return cls(
            id=data["id"],
            user_id=data["user_id"],
            title=data["title"],
            messages=[Message.from_dict(msg) for msg in data["messages"]],
            state=ConversationState(data["state"]),
            context=data["context"],
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            metadata=data.get("metadata")
        )


class ConversationEngine:
    """
    Manages conversations with context awareness, history, and intelligent routing
    """
    
    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        max_history_length: int = 20,
        context_window: int = 4000,
        ttl_seconds: int = 86400  # 24 hours
    ):
        self.redis = redis_client
        self.max_history_length = max_history_length
        self.context_window = context_window
        self.ttl_seconds = ttl_seconds
        self._system_prompt = self._get_default_system_prompt()
    
    def _get_default_system_prompt(self) -> str:
        """Get default system prompt for Aria"""
        return """You are Aria, an intelligent AI assistant specialized in document management and automation.

Your capabilities include:
- Answering questions about uploaded documents
- Extracting and analyzing document information
- Helping users with document workflows and automation
- Providing insights and summaries from documents
- Guiding users through document processing tasks

Your personality:
- Professional yet friendly and approachable
- Clear and concise in explanations
- Proactive in suggesting helpful actions
- Patient and thorough when explaining complex concepts
- Focused on helping users achieve their document management goals

Always:
- Ask clarifying questions when needed
- Provide specific, actionable advice
- Cite sources when referencing document content
- Suggest next steps or related actions
- Maintain context across the conversation
"""
    
    def _generate_conversation_id(self, user_id: str) -> str:
        """Generate unique conversation ID"""
        timestamp = datetime.now().isoformat()
        hash_input = f"{user_id}:{timestamp}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]
    
    def _generate_title_from_first_message(self, message: str) -> str:
        """Generate conversation title from first user message"""
        # Take first 50 characters
        title = message[:50]
        if len(message) > 50:
            title += "..."
        return title
    
    async def create_conversation(
        self,
        user_id: str,
        initial_message: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None
    ) -> Conversation:
        """Create a new conversation"""
        conversation_id = self._generate_conversation_id(user_id)
        now = datetime.now().isoformat()
        
        messages = [
            Message(
                role="system",
                content=system_prompt or self._system_prompt,
                timestamp=now
            )
        ]
        
        # Add initial user message if provided
        title = "New Conversation"
        if initial_message:
            messages.append(
                Message(
                    role="user",
                    content=initial_message,
                    timestamp=now
                )
            )
            title = self._generate_title_from_first_message(initial_message)
        
        conversation = Conversation(
            id=conversation_id,
            user_id=user_id,
            title=title,
            messages=messages,
            state=ConversationState.ACTIVE,
            context=context or {},
            created_at=now,
            updated_at=now
        )
        
        # Save to Redis
        if self.redis:
            await self._save_conversation(conversation)
        
        logger.info(f"Created conversation {conversation_id} for user {user_id}")
        return conversation
    
    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID"""
        if not self.redis:
            logger.warning("Redis not configured, cannot retrieve conversation")
            return None
        
        try:
            key = f"conversation:{conversation_id}"
            data = await self.redis.get(key)
            if data:
                conversation_dict = json.loads(data)
                return Conversation.from_dict(conversation_dict)
            return None
        except Exception as e:
            logger.error(f"Error retrieving conversation {conversation_id}: {e}")
            return None
    
    async def list_conversations(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Conversation]:
        """List conversations for a user"""
        if not self.redis:
            return []
        
        try:
            # Get all conversation keys for user
            pattern = f"conversation:*"
            conversations = []
            
            async for key in self.redis.scan_iter(match=pattern):
                data = await self.redis.get(key)
                if data:
                    conv_dict = json.loads(data)
                    if conv_dict["user_id"] == user_id:
                        conversations.append(Conversation.from_dict(conv_dict))
            
            # Sort by updated_at descending
            conversations.sort(key=lambda c: c.updated_at, reverse=True)
            
            # Apply pagination
            return conversations[offset:offset + limit]
        
        except Exception as e:
            logger.error(f"Error listing conversations for user {user_id}: {e}")
            return []
    
    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Conversation]:
        """Add a message to conversation"""
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            logger.error(f"Conversation {conversation_id} not found")
            return None
        
        # Add new message
        message = Message(
            role=role,
            content=content,
            timestamp=datetime.now().isoformat(),
            metadata=metadata
        )
        conversation.messages.append(message)
        
        # Update timestamp
        conversation.updated_at = datetime.now().isoformat()
        
        # Trim history if too long
        if len(conversation.messages) > self.max_history_length:
            # Keep system message + recent messages
            system_msg = conversation.messages[0]
            recent_messages = conversation.messages[-(self.max_history_length - 1):]
            conversation.messages = [system_msg] + recent_messages
        
        # Update title if this is the first user message
        if role == "user" and len([m for m in conversation.messages if m.role == "user"]) == 1:
            conversation.title = self._generate_title_from_first_message(content)
        
        # Save to Redis
        if self.redis:
            await self._save_conversation(conversation)
        
        return conversation
    
    async def update_context(
        self,
        conversation_id: str,
        context_updates: Dict[str, Any]
    ) -> Optional[Conversation]:
        """Update conversation context"""
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            return None
        
        conversation.context.update(context_updates)
        conversation.updated_at = datetime.now().isoformat()
        
        if self.redis:
            await self._save_conversation(conversation)
        
        return conversation
    
    async def end_conversation(self, conversation_id: str) -> bool:
        """End a conversation"""
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            return False
        
        conversation.state = ConversationState.ENDED
        conversation.updated_at = datetime.now().isoformat()
        
        if self.redis:
            await self._save_conversation(conversation)
        
        return True
    
    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation"""
        if not self.redis:
            return False
        
        try:
            key = f"conversation:{conversation_id}"
            await self.redis.delete(key)
            logger.info(f"Deleted conversation {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting conversation {conversation_id}: {e}")
            return False
    
    def get_messages_for_llm(
        self,
        conversation: Conversation,
        include_system: bool = True
    ) -> List[Dict[str, str]]:
        """
        Get messages formatted for LLM API
        Applies context window optimization
        """
        messages = []
        
        if include_system and conversation.messages:
            # Always include system message
            system_msg = conversation.messages[0]
            messages.append({
                "role": system_msg.role,
                "content": system_msg.content
            })
        
        # Add remaining messages (skip system if already added)
        start_idx = 1 if include_system else 0
        for msg in conversation.messages[start_idx:]:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # TODO: Add token counting and context window optimization
        # For now, return all messages
        return messages
    
    def inject_document_context(
        self,
        messages: List[Dict[str, str]],
        document_content: str,
        document_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """
        Inject document context into messages
        """
        # Find the last user message and append document context
        if not messages:
            return messages
        
        # Create context message
        context_parts = [
            "\n\n--- DOCUMENT CONTEXT ---",
            f"Document Content:\n{document_content}"
        ]
        
        if document_metadata:
            context_parts.append(f"\nDocument Metadata:\n{json.dumps(document_metadata, indent=2)}")
        
        context_parts.append("--- END DOCUMENT CONTEXT ---\n")
        context_text = "\n".join(context_parts)
        
        # Append to last user message or create new context message
        for i in range(len(messages) - 1, -1, -1):
            if messages[i]["role"] == "user":
                messages[i]["content"] += context_text
                break
        
        return messages
    
    async def _save_conversation(self, conversation: Conversation) -> bool:
        """Save conversation to Redis"""
        if not self.redis:
            return False
        
        try:
            key = f"conversation:{conversation.id}"
            data = json.dumps(conversation.to_dict())
            await self.redis.setex(key, self.ttl_seconds, data)
            return True
        except Exception as e:
            logger.error(f"Error saving conversation {conversation.id}: {e}")
            return False
    
    async def cleanup_old_conversations(self, days: int = 30) -> int:
        """
        Clean up conversations older than specified days
        Returns number of conversations deleted
        """
        if not self.redis:
            return 0
        
        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = 0
        
        try:
            pattern = f"conversation:*"
            async for key in self.redis.scan_iter(match=pattern):
                data = await self.redis.get(key)
                if data:
                    conv_dict = json.loads(data)
                    updated_at = datetime.fromisoformat(conv_dict["updated_at"])
                    if updated_at < cutoff_date:
                        await self.redis.delete(key)
                        deleted_count += 1
            
            logger.info(f"Cleaned up {deleted_count} old conversations")
            return deleted_count
        
        except Exception as e:
            logger.error(f"Error cleaning up conversations: {e}")
            return 0


# Example usage
async def example_usage():
    """Example of how to use the conversation engine"""
    
    # Initialize with Redis (optional)
    redis_client = await redis.from_url("redis://localhost:6379")
    engine = ConversationEngine(redis_client)
    
    # Create conversation
    conversation = await engine.create_conversation(
        user_id="user123",
        initial_message="How do I extract data from invoices?",
        context={"department": "finance", "role": "analyst"}
    )
    
    print(f"Created conversation: {conversation.id}")
    print(f"Title: {conversation.title}")
    
    # Add assistant response
    await engine.add_message(
        conversation.id,
        "assistant",
        "I can help you extract data from invoices! Aria supports automatic invoice processing..."
    )
    
    # Add follow-up user message
    await engine.add_message(
        conversation.id,
        "user",
        "Can you show me an example?"
    )
    
    # Get messages for LLM
    messages = engine.get_messages_for_llm(conversation)
    print(f"\nMessages for LLM: {len(messages)} messages")
    
    # List user's conversations
    conversations = await engine.list_conversations("user123")
    print(f"\nUser has {len(conversations)} conversations")
    
    await redis_client.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(example_usage())
