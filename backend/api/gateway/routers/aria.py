"""
Aria Controller API - Voice, Orchestration, Process Execution
Central API for interacting with Aria as the master orchestrator
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.services.ai.aria_controller import (
    create_aria_controller, AriaPersonality, VoiceController
)
from backend.services.customer_growth_service import CustomerGrowthService
from backend.core.dependencies import get_current_user, get_db

router = APIRouter(prefix="/aria", tags=["Aria Controller"])

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class AriaRequest(BaseModel):
    """Request to Aria"""
    message: str = Field(..., description="User's message or request")
    mode: str = Field(default="text", description="Interaction mode: text or voice")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")

class AriaResponse(BaseModel):
    """Response from Aria"""
    text_response: str
    bots_used: Optional[List[str]] = None
    actions_taken: Optional[List[str]] = None
    process_id: Optional[str] = None
    emotion: Optional[str] = "neutral"
    metadata: Optional[Dict[str, Any]] = None

class VoiceRequest(BaseModel):
    """Voice interaction request"""
    audio_format: str = Field(default="wav", description="Audio format: wav, mp3, ogg")
    language: str = Field(default="en-US", description="Language code")

class VoiceResponse(BaseModel):
    """Voice interaction response"""
    transcript: str
    text_response: str
    audio_url: Optional[str] = None
    actions_taken: List[str]

class BotDelegationRequest(BaseModel):
    """Delegate task to specific bot"""
    bot_id: str = Field(..., description="Bot ID to delegate to")
    message: str = Field(..., description="Task message")
    context: Optional[Dict[str, Any]] = None

class ProcessExecutionRequest(BaseModel):
    """Execute a multi-step process"""
    process_name: str = Field(..., description="Name of the process")
    steps: List[Dict[str, Any]] = Field(..., description="Process steps")
    context: Optional[Dict[str, Any]] = None

class AriaStatus(BaseModel):
    """Aria's current status"""
    name: str
    role: str
    organization_id: int
    voice_enabled: bool
    avatar_url: Optional[str]
    capabilities: List[str]
    active_bots: int
    running_processes: int

# ============================================================================
# ARIA INTERACTION ENDPOINTS
# ============================================================================

@router.post("/chat", response_model=AriaResponse)
async def chat_with_aria(
    request: AriaRequest,
    current_user = Depends(get_current_user)
):
    """
    Chat with Aria - she'll understand intent and orchestrate response
    
    Aria will:
    - Analyze your request
    - Delegate to specialized bots if needed
    - Execute workflows
    - Provide intelligent responses
    """
    try:
        # Create Aria controller for user's organization
        aria = create_aria_controller(current_user.organization_id)
        
        # Process request
        response = await aria.process_request(
            message=request.message,
            mode=request.mode,
            context=request.context
        )
        
        return AriaResponse(
            text_response=response.get("text_response"),
            bots_used=response.get("bots_used"),
            actions_taken=response.get("actions", []),
            process_id=response.get("process_id"),
            emotion=response.get("emotion", "neutral"),
            metadata=response
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aria processing failed: {str(e)}")

@router.post("/chat/stream")
async def stream_chat_with_aria(
    request: AriaRequest,
    current_user = Depends(get_current_user)
):
    """
    Stream chat responses from Aria in real-time
    """
    async def generate():
        try:
            aria = create_aria_controller(current_user.organization_id)
            
            # Get streaming response
            async for chunk in aria.stream_response(request.message, request.context):
                yield f"data: {chunk}\n\n"
        
        except Exception as e:
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

# ============================================================================
# VOICE INTERACTION ENDPOINTS
# ============================================================================

@router.post("/voice/interact", response_model=VoiceResponse)
async def voice_interaction(
    audio: UploadFile = File(...),
    voice_request: VoiceRequest = Depends(),
    current_user = Depends(get_current_user)
):
    """
    Voice interaction with Aria
    
    Upload audio, get transcription + AI response + synthesized voice back
    """
    try:
        # Read audio data
        audio_data = await audio.read()
        
        # Create voice controller
        voice_controller = VoiceController()
        
        # Process voice interaction
        result = await voice_controller.voice_interaction(
            audio_input=audio_data,
            organization_id=current_user.organization_id
        )
        
        return VoiceResponse(
            transcript=result["transcript"],
            text_response=result["text_response"],
            audio_url=result.get("audio_url"),
            actions_taken=result.get("actions_taken", [])
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice interaction failed: {str(e)}")

@router.post("/voice/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Transcribe audio to text only"""
    try:
        audio_data = await audio.read()
        voice_controller = VoiceController()
        
        transcript = await voice_controller.transcribe_audio(audio_data)
        
        return {"transcript": transcript}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.post("/voice/synthesize")
async def synthesize_speech(
    text: str,
    voice: str = "aria_professional",
    emotion: str = "neutral",
    current_user = Depends(get_current_user)
):
    """Convert text to speech"""
    try:
        voice_controller = VoiceController()
        
        audio_data = await voice_controller.synthesize_speech(
            text=text,
            voice=voice,
            emotion=emotion
        )
        
        return StreamingResponse(
            iter([audio_data]),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=aria_speech.wav"}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

# ============================================================================
# BOT ORCHESTRATION ENDPOINTS
# ============================================================================

@router.post("/delegate")
async def delegate_to_bot(
    request: BotDelegationRequest,
    current_user = Depends(get_current_user)
):
    """
    Delegate a task to a specific bot through Aria
    """
    try:
        aria = create_aria_controller(current_user.organization_id)
        
        result = await aria.orchestrator.execute_bot(
            bot_id=request.bot_id,
            message=request.message,
            context=request.context
        )
        
        return {
            "bot_id": request.bot_id,
            "result": result,
            "delegated_by": "aria"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bot delegation failed: {str(e)}")

@router.post("/orchestrate")
async def orchestrate_multi_bot_task(
    message: str,
    context: Optional[Dict[str, Any]] = None,
    current_user = Depends(get_current_user)
):
    """
    Let Aria orchestrate a complex task across multiple bots
    
    Aria will:
    1. Analyze the task
    2. Determine which bots to use
    3. Execute them in sequence or parallel
    4. Synthesize the results
    """
    try:
        aria = create_aria_controller(current_user.organization_id)
        
        result = await aria.orchestrator.orchestrate_multi_bot_task(
            task=message,
            context=context
        )
        
        return {
            "task": message,
            "analysis": result["analysis"],
            "bots_used": [r["bot"] for r in result["bot_results"]],
            "final_output": result["final_output"],
            "orchestrated_by": "aria"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Orchestration failed: {str(e)}")

# ============================================================================
# PROCESS EXECUTION ENDPOINTS
# ============================================================================

@router.post("/process/execute")
async def execute_process(
    request: ProcessExecutionRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    Execute a complex multi-step process
    
    Aria will manage the entire process execution
    """
    try:
        aria = create_aria_controller(current_user.organization_id)
        
        # Execute process (can be background task for long processes)
        result = await aria.process_engine.execute_process(
            process_name=request.process_name,
            steps=request.steps,
            context=request.context
        )
        
        return {
            "process_id": result["process_id"],
            "status": result["status"],
            "steps_completed": len(result["results"]),
            "results": result["results"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Process execution failed: {str(e)}")

@router.get("/process/{process_id}/status")
async def get_process_status(
    process_id: str,
    current_user = Depends(get_current_user)
):
    """Get status of a running process"""
    try:
        aria = create_aria_controller(current_user.organization_id)
        
        if process_id not in aria.process_engine.running_processes:
            raise HTTPException(status_code=404, detail="Process not found")
        
        return aria.process_engine.running_processes[process_id]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ARIA STATUS & CONFIGURATION
# ============================================================================

@router.get("/status", response_model=AriaStatus)
async def get_aria_status(current_user = Depends(get_current_user)):
    """Get Aria's current status and capabilities"""
    try:
        aria = create_aria_controller(current_user.organization_id)
        status = await aria.get_status()
        
        return AriaStatus(**status)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/personality")
async def get_aria_personality(current_user = Depends(get_current_user)):
    """Get Aria's personality configuration"""
    personality = AriaPersonality()
    
    return {
        "name": personality.name,
        "role": personality.role,
        "voice": personality.voice,
        "avatar_url": personality.avatar_url,
        "traits": personality.core_traits,
        "capabilities": personality.capabilities,
        "system_prompt": personality.get_system_prompt()
    }

@router.post("/personality/customize")
async def customize_aria_personality(
    display_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
    voice: Optional[str] = None,
    personality_mode: Optional[str] = None,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Customize Aria's personality for your organization
    
    Make Aria your own with custom name, avatar, voice, and behavior
    """
    try:
        from backend.models.aria_identity import AriaIdentity
        
        # Get or create Aria identity for organization
        aria_identity = db.query(AriaIdentity).filter(
            AriaIdentity.organization_id == current_user.organization_id
        ).first()
        
        if not aria_identity:
            aria_identity = AriaIdentity(organization_id=current_user.organization_id)
            db.add(aria_identity)
        
        # Update customizations
        if display_name:
            aria_identity.display_name = display_name
        if avatar_url:
            aria_identity.avatar_url = avatar_url
        if voice:
            aria_identity.voice_id = voice
        if personality_mode:
            aria_identity.personality_mode = personality_mode
        
        aria_identity.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "Aria personality customized",
            "aria_identity": {
                "display_name": aria_identity.display_name,
                "avatar_url": aria_identity.avatar_url,
                "voice": aria_identity.voice_id,
                "personality_mode": aria_identity.personality_mode
            }
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CUSTOMER GROWTH & ANALYTICS
# ============================================================================

@router.get("/growth/opportunities")
async def get_growth_opportunities(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get cross-sell and expansion opportunities
    
    Aria analyzes usage and suggests ways to expand within your organization
    """
    try:
        growth_service = CustomerGrowthService(db)
        opportunities = await growth_service.identify_cross_sell_opportunities(
            current_user.organization_id
        )
        
        return {
            "opportunities": opportunities,
            "total_estimated_value": sum(o.get("estimated_value", 0) for o in opportunities)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/growth/embedding-score")
async def get_embedding_score(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get Aria's embedding score - how deeply integrated Aria is
    """
    try:
        growth_service = CustomerGrowthService(db)
        metrics = await growth_service.track_expansion_metrics(
            current_user.organization_id
        )
        
        return metrics
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/growth/health")
async def get_customer_health(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get customer health score and churn risk
    """
    try:
        growth_service = CustomerGrowthService(db)
        health = await growth_service.calculate_customer_health(
            current_user.organization_id
        )
        
        return health
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/growth/actions")
async def get_growth_actions(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get suggested actions to grow Aria usage in your organization
    """
    try:
        growth_service = CustomerGrowthService(db)
        actions = await growth_service.suggest_growth_actions(
            current_user.organization_id
        )
        
        return {"recommended_actions": actions}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
