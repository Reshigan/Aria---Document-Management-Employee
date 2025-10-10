"""
ARIA Chat API endpoints with personality integration
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.ai.llm_service import llm_service
from services.ai.aria_personality import ARIAPersonality
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/aria", tags=["ARIA Chat"])


class ChatRequest(BaseModel):
    message: str
    document_id: Optional[int] = None
    user_name: Optional[str] = None


class ChatResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    model: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def chat_with_aria(request: ChatRequest):
    """
    Chat with ARIA using her full personality and document context.
    """
    try:
        # Get document context if document_id is provided
        document_context = None
        if request.document_id:
            # TODO: Fetch document content from database
            # document = await get_document_by_id(request.document_id)
            # document_context = document.extracted_text
            pass
        
        # Chat with ARIA
        result = await llm_service.chat_with_aria(
            user_message=request.message,
            document_context=document_context,
            user_name=request.user_name
        )
        
        if result['success']:
            return ChatResponse(
                success=True,
                message=result['message'],
                model=result.get('model')
            )
        else:
            return ChatResponse(
                success=False,
                error=result['error']
            )
    
    except Exception as e:
        logger.error(f"Error in ARIA chat: {e}")
        error_message = ARIAPersonality.get_error_message("general")
        return ChatResponse(
            success=False,
            error=error_message
        )


@router.get("/greeting")
async def get_aria_greeting(user_name: Optional[str] = None):
    """
    Get ARIA's personalized greeting message.
    """
    try:
        greeting = ARIAPersonality.get_greeting_message(user_name)
        return {
            "success": True,
            "message": greeting
        }
    except Exception as e:
        logger.error(f"Error getting ARIA greeting: {e}")
        return {
            "success": False,
            "error": "Unable to generate greeting"
        }


@router.get("/quick-prompts")
async def get_quick_prompts():
    """
    Get ARIA's suggested quick prompts for users.
    """
    try:
        prompts = ARIAPersonality.get_quick_prompts()
        return {
            "success": True,
            "prompts": prompts
        }
    except Exception as e:
        logger.error(f"Error getting quick prompts: {e}")
        return {
            "success": False,
            "error": "Unable to get quick prompts"
        }


@router.get("/personality")
async def get_aria_personality():
    """
    Get ARIA's personality traits and communication guidelines.
    """
    try:
        return {
            "success": True,
            "personality": {
                "traits": ARIAPersonality.PERSONALITY_TRAITS,
                "voice_guidelines": ARIAPersonality.VOICE_GUIDELINES,
                "name": "ARIA",
                "full_name": "AI-Powered Responsive Intelligent Assistant",
                "specialization": "Document Intelligence and Business Automation"
            }
        }
    except Exception as e:
        logger.error(f"Error getting personality info: {e}")
        return {
            "success": False,
            "error": "Unable to get personality information"
        }


@router.get("/status")
async def get_aria_status():
    """
    Get ARIA's current status and capabilities.
    """
    try:
        # Check if Ollama is available
        ollama_status = "checking"
        try:
            # Test connection to Ollama
            test_result = await llm_service.chat([
                {"role": "user", "content": "Hello, are you working?"}
            ])
            ollama_status = "online" if test_result.get('success') else "offline"
        except Exception:
            ollama_status = "offline"
        
        return {
            "success": True,
            "status": {
                "name": "ARIA",
                "version": "2.0.0",
                "personality": "Active",
                "llm_backend": "Ollama",
                "llm_status": ollama_status,
                "model": llm_service.model,
                "capabilities": [
                    "Document Analysis",
                    "Information Extraction", 
                    "Question Answering",
                    "Document Summarization",
                    "Business Process Automation"
                ]
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting ARIA status: {e}")
        return {
            "success": False,
            "error": "Unable to get status information"
        }