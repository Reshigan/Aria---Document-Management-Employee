"""
Ask Aria API Router
FastAPI endpoints for conversational AI
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import os

from ...services.ask_aria.orchestrator import AskAriaOrchestrator
from ...services.ask_aria.conversation_manager import ConversationManager
from ...services.ask_aria.ocr_service import OCRService
from ...services.ask_aria.sap_mapping import SAPMappingService
from ...services.ask_aria.template_service import TemplateService
from ...services.ask_aria.ollama_client import ollama_client
from ...services.ask_aria.sap_export_service import sap_export_service
from ...services.ask_aria.document_posting_service import DocumentPostingService
from ...services.document_classification.classifier import document_classifier
from ...services.document_classification.template_registry import template_registry

try:
    from auth_integrated import get_current_user as _get_current_user_real
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    USE_REAL_AUTH = True
except ImportError:
    USE_REAL_AUTH = False
    _get_current_user_real = None
    HTTPBearer = None
    HTTPAuthorizationCredentials = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ask-aria", tags=["Ask Aria"])

DB_CONNECTION_STRING = os.getenv(
    "DATABASE_URL_PG",
    os.getenv("DATABASE_URL", "postgresql://aria_user:AriaSecure2025!@localhost/aria_erp")
)

UPLOAD_PATH = os.getenv("UPLOAD_PATH", "/home/ubuntu/aria_uploads")
TEMPLATE_PATH = os.getenv("TEMPLATE_PATH", "/home/ubuntu/aria_templates")
EXPORT_PATH = os.getenv("EXPORT_PATH", "/home/ubuntu/aria_exports")

os.makedirs(UPLOAD_PATH, exist_ok=True)
os.makedirs(TEMPLATE_PATH, exist_ok=True)
os.makedirs(EXPORT_PATH, exist_ok=True)

orchestrator = AskAriaOrchestrator(DB_CONNECTION_STRING)
conversation_manager = ConversationManager(DB_CONNECTION_STRING)
ocr_service = OCRService(DB_CONNECTION_STRING, storage_path=UPLOAD_PATH)
sap_mapping_service = SAPMappingService(DB_CONNECTION_STRING)
template_service = TemplateService(DB_CONNECTION_STRING, template_path=TEMPLATE_PATH)
document_posting_service = DocumentPostingService(DB_CONNECTION_STRING, export_path=EXPORT_PATH)


class StartSessionRequest(BaseModel):
    intent: Optional[str] = None


class StartSessionResponse(BaseModel):
    conversation_id: str
    status: str
    message: str


class SendMessageRequest(BaseModel):
    conversation_id: str
    message: str


class SendMessageResponse(BaseModel):
    conversation_id: str
    response: str
    status: str


class UploadDocumentResponse(BaseModel):
    document_id: str
    filename: str
    status: str


class ClassifyDocumentResponse(BaseModel):
    document_id: str
    document_class: str
    confidence: float
    labels: List[Dict[str, Any]]
    extracted_text: str


class SAPMappingResponse(BaseModel):
    sap_doc_type: str
    sap_doc_name: str
    sap_module: str
    sap_data: Dict[str, Any]


class SAPClassificationRequest(BaseModel):
    document_text: str
    filename: Optional[str] = None


class SAPClassificationResponse(BaseModel):
    doc_type: str
    template_id: Optional[str]
    module: Optional[str]
    confidence: float
    method: str
    extracted_fields: Dict[str, Any]
    reasoning: Optional[str] = None


class ReclassifyRequest(BaseModel):
    document_text: str
    suggested_type: str


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)) if HTTPBearer else None
) -> Dict:
    """Get current user with optional authentication - falls back to demo user if not authenticated"""
    if USE_REAL_AUTH and credentials and _get_current_user_real:
        try:
            return await _get_current_user_real(credentials)
        except Exception as e:
            logger.warning(f"Auth failed, using fallback: {e}")
    
    logger.info("Using fallback authentication for Ask Aria")
    return {
        "user_id": "8e88001e-9d74-4b5a-a45b-66d126bee6d5",
        "company_id": "b0598135-52fd-4f67-ac56-8f0237e6355e"
    }

get_current_user = get_current_user_optional


@router.get("/health")
async def health_check():
    """Check if Ask Aria service is healthy"""
    ollama_available = ollama_client.is_available()
    
    return {
        "status": "healthy" if ollama_available else "degraded",
        "ollama_available": ollama_available,
        "message": "Ask Aria is ready" if ollama_available else "Ollama not available"
    }


@router.post("/session", response_model=StartSessionResponse)
async def start_session(
    request: StartSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start a new conversation session"""
    try:
        conversation_id = conversation_manager.create_conversation(
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            intent=request.intent
        )
        
        return StartSessionResponse(
            conversation_id=conversation_id,
            status="active",
            message="Hello! I'm Aria, your ERP assistant. How can I help you today?"
        )
        
    except Exception as e:
        logger.error(f"Failed to start session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/message", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a conversation"""
    try:
        conversation = conversation_manager.get_conversation(request.conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation['company_id'] != current_user['company_id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        response_text = orchestrator.process_message(
            conversation_id=request.conversation_id,
            user_message=request.message,
            company_id=current_user["company_id"],
            user_id=current_user["user_id"]
        )
        
        return SendMessageResponse(
            conversation_id=request.conversation_id,
            response=response_text,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def list_conversations(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """List user's recent conversations"""
    try:
        conversations = conversation_manager.get_user_conversations(
            user_id=current_user["user_id"],
            company_id=current_user["company_id"],
            limit=limit
        )
        
        return {
            "conversations": conversations,
            "count": len(conversations)
        }
        
    except Exception as e:
        logger.error(f"Failed to list conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get conversation details with message history"""
    try:
        conversation = conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation['company_id'] != current_user['company_id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        messages = conversation_manager.get_messages(conversation_id)
        slots = conversation_manager.get_slots(conversation_id)
        
        return {
            "conversation": conversation,
            "messages": messages,
            "slots": slots
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=UploadDocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document for OCR and classification"""
    try:
        file_content = await file.read()
        
        document_id = ocr_service.upload_document(
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            filename=file.filename,
            file_content=file_content,
            mime_type=file.content_type
        )
        
        return UploadDocumentResponse(
            document_id=document_id,
            filename=file.filename,
            status="uploaded"
        )
        
    except Exception as e:
        logger.error(f"Failed to upload document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify/{document_id}", response_model=ClassifyDocumentResponse)
async def classify_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Classify an uploaded document"""
    try:
        result = ocr_service.classify_document(document_id)
        
        return ClassifyDocumentResponse(
            document_id=result["document_id"],
            document_class=result["class"],
            confidence=result["confidence"],
            labels=result["labels"],
            extracted_text=result["extracted_text"]
        )
        
    except Exception as e:
        logger.error(f"Failed to classify document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/{document_id}")
async def extract_fields(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Extract structured fields from a document"""
    try:
        result = ocr_service.extract_fields(document_id)
        return result
        
    except Exception as e:
        logger.error(f"Failed to extract fields: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sap/doc-types")
async def list_sap_doc_types(
    module: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List SAP document types"""
    try:
        doc_types = sap_mapping_service.list_sap_doc_types(module)
        return {"doc_types": doc_types, "count": len(doc_types)}
        
    except Exception as e:
        logger.error(f"Failed to list SAP doc types: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sap/map/{erp_doc_type}", response_model=SAPMappingResponse)
async def map_to_sap(
    erp_doc_type: str,
    erp_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Map an ERP document to SAP format"""
    try:
        sap_data = sap_mapping_service.map_document_to_sap(erp_doc_type, erp_data)
        
        return SAPMappingResponse(
            sap_doc_type=sap_data["sap_doc_type"],
            sap_doc_name=sap_data["sap_doc_name"],
            sap_module=sap_data["sap_module"],
            sap_data=sap_data
        )
        
    except Exception as e:
        logger.error(f"Failed to map to SAP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/quote/{quote_id}/pdf")
async def export_quote_pdf(
    quote_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Export a quote as PDF"""
    try:
        pdf_bytes = template_service.render_quote_pdf(
            quote_id=quote_id,
            company_id=current_user["company_id"]
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=quote_{quote_id}.pdf"}
        )
        
    except Exception as e:
        logger.error(f"Failed to export quote PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/po/{po_id}/pdf")
async def export_po_pdf(
    po_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Export a purchase order as PDF"""
    try:
        pdf_bytes = template_service.render_purchase_order_pdf(
            po_id=po_id,
            company_id=current_user["company_id"]
        )
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=po_{po_id}.pdf"}
        )
        
    except Exception as e:
        logger.error(f"Failed to export PO PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sap/classify", response_model=SAPClassificationResponse)
async def classify_sap_document(
    request: SAPClassificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Classify an SAP document using hybrid approach (rules + LLM fallback)
    
    This endpoint uses:
    1. Stage 1: Rules-based classification with regex patterns
    2. Stage 2: LLM fallback using qwen2.5 function calling if rules confidence < 0.7
    """
    try:
        result = document_classifier.classify_document(
            document_text=request.document_text,
            filename=request.filename
        )
        
        return SAPClassificationResponse(
            doc_type=result["doc_type"],
            template_id=result["template_id"],
            module=result["module"],
            confidence=result["confidence"],
            method=result["method"],
            extracted_fields=result["extracted_fields"],
            reasoning=result.get("reasoning")
        )
        
    except Exception as e:
        logger.error(f"Failed to classify SAP document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sap/templates")
async def list_sap_templates(
    module: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all available SAP document templates"""
    try:
        if module:
            templates = template_registry.get_templates_by_module(module)
        else:
            templates = template_registry.get_all_templates()
        
        return {
            "templates": templates,
            "count": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Failed to list SAP templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sap/templates/{template_id}")
async def get_sap_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get details of a specific SAP template"""
    try:
        template = template_registry.get_template(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return template
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get SAP template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sap/reclassify", response_model=SAPClassificationResponse)
async def reclassify_sap_document(
    request: ReclassifyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reclassify a document with a user-suggested type"""
    try:
        result = document_classifier.reclassify_document(
            document_text=request.document_text,
            suggested_type=request.suggested_type
        )
        
        return SAPClassificationResponse(
            doc_type=result["doc_type"],
            template_id=result["template_id"],
            module=result["module"],
            confidence=result["confidence"],
            method=result["method"],
            extracted_fields=result["extracted_fields"]
        )
        
    except Exception as e:
        logger.error(f"Failed to reclassify SAP document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sap/suggest-templates/{doc_type}")
async def suggest_templates_for_type(
    doc_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Suggest templates for a given document type"""
    try:
        templates = document_classifier.suggest_templates(doc_type)
        
        return {
            "doc_type": doc_type,
            "templates": templates,
            "count": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Failed to suggest templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/{document_id}/validate")
async def validate_document(
    document_id: str,
    doc_type: str,
    header_data: Dict[str, Any],
    line_items: List[Dict[str, Any]],
    current_user: dict = Depends(get_current_user)
):
    """Validate document before posting/export"""
    try:
        validation = document_posting_service.validate_document(
            document_id=document_id,
            doc_type=doc_type,
            header_data=header_data,
            line_items=line_items
        )
        
        return validation
        
    except Exception as e:
        logger.error(f"Failed to validate document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/{document_id}/post-to-aria")
async def post_document_to_aria(
    document_id: str,
    doc_type: str,
    header_data: Dict[str, Any],
    line_items: List[Dict[str, Any]],
    current_user: dict = Depends(get_current_user)
):
    """Post document to ARIA ERP"""
    try:
        result = document_posting_service.post_to_aria(
            document_id=document_id,
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            doc_type=doc_type,
            header_data=header_data,
            line_items=line_items
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to post to ARIA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/{document_id}/export-to-sap")
async def export_document_to_sap(
    document_id: str,
    doc_type: str,
    header_data: Dict[str, Any],
    line_items: List[Dict[str, Any]],
    export_format: str = "xlsx",
    current_user: dict = Depends(get_current_user)
):
    """Export document to SAP template (Excel/CSV)"""
    try:
        result = document_posting_service.export_to_sap(
            document_id=document_id,
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
            doc_type=doc_type,
            header_data=header_data,
            line_items=line_items,
            export_format=export_format
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to export to SAP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}/download-export/{posting_id}")
async def download_sap_export(
    document_id: str,
    posting_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download SAP export file"""
    try:
        posting = document_posting_service.get_posting_status(posting_id)
        
        if not posting:
            raise HTTPException(status_code=404, detail="Posting not found")
        
        if posting['company_id'] != current_user['company_id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        file_path = posting['sap_export_file_path']
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Export file not found")
        
        from fastapi.responses import FileResponse
        
        return FileResponse(
            path=file_path,
            filename=os.path.basename(file_path),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download export: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sap/export-templates")
async def list_sap_export_templates(
    module: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all available SAP export templates"""
    try:
        if module:
            templates = sap_export_service.get_templates_by_module(module)
        else:
            templates = sap_export_service.get_all_templates()
        
        return {
            "templates": templates,
            "count": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Failed to list SAP export templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
