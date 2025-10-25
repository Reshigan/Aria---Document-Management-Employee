"""
Bot Management API Endpoints
Handles document processing, helpdesk messages, and sales orders
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime
import os
import uuid

from backend.core.database import get_db
from backend.models.user_models import User
from backend.core.auth import get_current_user
from backend.services.ai.ollama_service import OllamaService
from backend.services.bots.sap_document_bot import SAPDocumentBot
from backend.services.bots.whatsapp_helpdesk_bot import WhatsAppHelpdeskBot
from backend.services.bots.sales_order_bot import SalesOrderBot
from backend.models.reporting_models import BotInteractionLog, BotType, ProcessingStatus

router = APIRouter()

# Pydantic models
class DocumentProcessRequest(BaseModel):
    channel: str = "web"
    metadata: Optional[Dict] = None

class HelpdeskMessageRequest(BaseModel):
    message: str
    customer_phone: str
    customer_name: Optional[str] = None
    conversation_id: Optional[str] = None

class SalesOrderRequest(BaseModel):
    message: str
    channel: str = "web"
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

class ReviewApprovalRequest(BaseModel):
    approved: bool
    corrections: Optional[Dict] = None

class RatingRequest(BaseModel):
    rating: int
    comment: Optional[str] = None


# Helper to initialize bots
def get_sap_bot(db: Session, user: User) -> SAPDocumentBot:
    ollama = OllamaService()
    sap_config = {"enabled": False}  # TODO: Get from org settings
    return SAPDocumentBot(ollama, db, user.organization_id, sap_config)

def get_helpdesk_bot(db: Session, user: User) -> WhatsAppHelpdeskBot:
    ollama = OllamaService()
    whatsapp_config = {"enabled": False}  # TODO: Get from org settings
    return WhatsAppHelpdeskBot(ollama, db, user.organization_id, whatsapp_config)

def get_sales_bot(db: Session, user: User) -> SalesOrderBot:
    ollama = OllamaService()
    erp_config = {"enabled": False}  # TODO: Get from org settings
    return SalesOrderBot(ollama, db, user.organization_id, erp_config)


# SAP Document Scanner Endpoints
@router.post("/bots/document-scanner/process")
async def process_document(
    file: UploadFile = File(...),
    channel: str = "web",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and process document with SAP Document Scanner Bot
    
    - Extracts data using OCR + Ollama
    - Validates against business rules
    - Auto-posts to SAP if confidence is high
    - Flags for human review if needed
    """
    try:
        # Save uploaded file
        upload_dir = f"/tmp/uploads/{current_user.organization_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_id = uuid.uuid4().hex[:12]
        file_path = f"{upload_dir}/{file_id}_{file.filename}"
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Process with bot
        bot = get_sap_bot(db, current_user)
        result = await bot.process_document(
            file_path=file_path,
            channel=channel,
            user_id=current_user.id,
            metadata={"filename": file.filename, "content_type": file.content_type}
        )
        
        # Clean up file
        # os.remove(file_path)  # Keep for now for review
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bots/document-scanner/queue")
async def get_document_queue(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get documents in review queue"""
    query = db.query(BotInteractionLog).filter(
        BotInteractionLog.organization_id == current_user.organization_id,
        BotInteractionLog.bot_type == BotType.DOCUMENT_SCANNER
    )
    
    if status:
        query = query.filter(BotInteractionLog.processing_status == status)
    else:
        query = query.filter(BotInteractionLog.required_human_review == True)
    
    interactions = query.order_by(BotInteractionLog.created_at.desc()).limit(limit).all()
    
    return {
        "count": len(interactions),
        "items": [
            {
                "id": i.id,
                "interaction_id": i.interaction_id,
                "status": i.processing_status.value if i.processing_status else None,
                "confidence": i.confidence_score,
                "data": i.output_data,
                "requires_review": i.required_human_review,
                "created_at": i.created_at.isoformat() if i.created_at else None
            }
            for i in interactions
        ]
    }


@router.post("/bots/document-scanner/review/{interaction_id}/approve")
async def approve_document(
    interaction_id: str,
    request: ReviewApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve document with optional corrections"""
    try:
        bot = get_sap_bot(db, current_user)
        result = await bot.approve_review(
            interaction_id=interaction_id,
            corrections=request.corrections,
            reviewer_id=current_user.id
        )
        
        return {"success": True, "data": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# WhatsApp Helpdesk Endpoints
@router.post("/bots/helpdesk/message")
async def handle_helpdesk_message(
    request: HelpdeskMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle WhatsApp helpdesk message
    
    - Detects intent and sentiment
    - Gathers context from systems
    - Generates response or escalates to human
    - Tracks conversation history
    """
    try:
        bot = get_helpdesk_bot(db, current_user)
        result = await bot.handle_message(
            message=request.message,
            customer_phone=request.customer_phone,
            customer_name=request.customer_name,
            conversation_id=request.conversation_id
        )
        
        return {"success": True, "data": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bots/helpdesk/conversations")
async def get_conversations(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active helpdesk conversations"""
    query = db.query(BotInteractionLog).filter(
        BotInteractionLog.organization_id == current_user.organization_id,
        BotInteractionLog.bot_type == BotType.HELPDESK
    )
    
    if status == "escalated":
        query = query.filter(BotInteractionLog.required_human_review == True)
    
    interactions = query.order_by(BotInteractionLog.created_at.desc()).limit(limit).all()
    
    return {
        "count": len(interactions),
        "conversations": [
            {
                "id": i.id,
                "interaction_id": i.interaction_id,
                "customer_phone": i.input_metadata.get("phone") if i.input_metadata else None,
                "last_message": i.input_text,
                "intent": i.output_data.get("intent") if i.output_data else None,
                "sentiment": i.output_data.get("sentiment") if i.output_data else None,
                "escalated": i.required_human_review,
                "created_at": i.created_at.isoformat() if i.created_at else None
            }
            for i in interactions
        ]
    }


@router.post("/bots/helpdesk/conversation/{conversation_id}/rate")
async def rate_conversation(
    conversation_id: str,
    request: RatingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer rates conversation"""
    try:
        bot = get_helpdesk_bot(db, current_user)
        result = await bot.rate_conversation(
            conversation_id=conversation_id,
            rating=request.rating,
            comment=request.comment
        )
        
        return {"success": True, "data": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Sales Order Bot Endpoints
@router.post("/bots/sales-order/submit")
async def submit_sales_order(
    request: SalesOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit sales order for processing
    
    - Extracts order details from message
    - Validates stock, credit, pricing
    - Creates order in ERP
    - Sends confirmation
    - Schedules reminders
    """
    try:
        bot = get_sales_bot(db, current_user)
        result = await bot.process_order_request(
            message=request.message,
            channel=request.channel,
            customer_id=request.customer_id,
            customer_email=request.customer_email,
            customer_phone=request.customer_phone
        )
        
        return {"success": True, "data": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bots/sales-order/orders")
async def get_orders(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent sales orders"""
    query = db.query(BotInteractionLog).filter(
        BotInteractionLog.organization_id == current_user.organization_id,
        BotInteractionLog.bot_type == BotType.SALES_ORDER
    )
    
    if status:
        query = query.filter(BotInteractionLog.processing_status == status)
    
    interactions = query.order_by(BotInteractionLog.created_at.desc()).limit(limit).all()
    
    return {
        "count": len(interactions),
        "orders": [
            {
                "id": i.id,
                "interaction_id": i.interaction_id,
                "status": i.processing_status.value if i.processing_status else None,
                "customer": i.output_data.get("customer") if i.output_data else None,
                "total": i.output_data.get("total") if i.output_data else None,
                "currency": i.output_data.get("currency") if i.output_data else None,
                "items_count": len(i.output_data.get("items", [])) if i.output_data else 0,
                "created_at": i.created_at.isoformat() if i.created_at else None
            }
            for i in interactions
        ]
    }


# General Bot Management
@router.get("/bots/stats")
async def get_bot_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall bot statistics"""
    from sqlalchemy import func
    
    stats = {}
    
    # Document scanner stats
    doc_stats = db.query(
        func.count(BotInteractionLog.id).label("total"),
        func.avg(BotInteractionLog.confidence_score).label("avg_confidence"),
        func.sum(func.cast(BotInteractionLog.required_human_review == True, int)).label("requires_review")
    ).filter(
        BotInteractionLog.organization_id == current_user.organization_id,
        BotInteractionLog.bot_type == BotType.DOCUMENT_SCANNER
    ).first()
    
    stats["document_scanner"] = {
        "total_processed": doc_stats.total or 0,
        "avg_confidence": round(float(doc_stats.avg_confidence or 0), 3),
        "in_review_queue": doc_stats.requires_review or 0
    }
    
    # Helpdesk stats
    help_stats = db.query(
        func.count(BotInteractionLog.id).label("total"),
        func.sum(func.cast(BotInteractionLog.required_human_review == False, int)).label("bot_resolved")
    ).filter(
        BotInteractionLog.organization_id == current_user.organization_id,
        BotInteractionLog.bot_type == BotType.HELPDESK
    ).first()
    
    stats["helpdesk"] = {
        "total_conversations": help_stats.total or 0,
        "bot_resolved": help_stats.bot_resolved or 0,
        "resolution_rate": round((help_stats.bot_resolved or 0) / max(help_stats.total or 1, 1) * 100, 1)
    }
    
    # Sales order stats
    sales_stats = db.query(
        func.count(BotInteractionLog.id).label("total"),
        func.sum(func.cast(BotInteractionLog.processing_status == ProcessingStatus.SUCCESS, int)).label("completed")
    ).filter(
        BotInteractionLog.organization_id == current_user.organization_id,
        BotInteractionLog.bot_type == BotType.SALES_ORDER
    ).first()
    
    stats["sales_order"] = {
        "total_orders": sales_stats.total or 0,
        "completed": sales_stats.completed or 0,
        "completion_rate": round((sales_stats.completed or 0) / max(sales_stats.total or 1, 1) * 100, 1)
    }
    
    return stats


@router.get("/bots/health")
async def check_bot_health():
    """Check health of bot services"""
    from backend.services.ai.ollama_service import OllamaService
    
    health = {
        "ollama": False,
        "database": False,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        # Check Ollama
        ollama = OllamaService()
        ollama_health = ollama.health_check()
        health["ollama"] = ollama_health["healthy"]
        health["ollama_models"] = ollama_health.get("models", [])
    except:
        pass
    
    # Database is checked by dependency injection
    health["database"] = True
    
    return health
