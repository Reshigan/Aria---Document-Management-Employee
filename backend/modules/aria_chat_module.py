"""
ARIA Chat Module with LLM Integration and File Upload Support
Provides natural language chat interface with document context
Integrates with Aria Controller Engine for intent recognition and bot activation
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import os
import tempfile
import PyPDF2
from PIL import Image
import pytesseract
import json

from services.ai.llm_service import llm_service
from services.document_analyzer_v2 import document_analyzer_v2

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["ARIA Chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = None
    context: Optional[Dict[str, Any]] = {}


class ChatResponse(BaseModel):
    response: str
    model: Optional[str] = None
    timestamp: str = datetime.now().isoformat()
    document_analysis: Optional[Dict[str, Any]] = None
    intent: Optional[Dict[str, Any]] = None
    missing_fields: Optional[List[str]] = None
    action_suggestions: Optional[List[Dict[str, str]]] = None
    bots_activated: Optional[List[str]] = None
    execution_results: Optional[List[Dict[str, Any]]] = None


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with ARIA using Ollama LLM with Aria Controller Engine integration
    
    Supports natural language queries about:
    - Business operations (creates sales orders, invoices, quotes, deliveries)
    - ERP workflows (with proper slot-filling for required fields)
    - Document processing
    - General assistance
    
    When an action intent is detected, Aria Controller will:
    1. Recognize the intent
    2. Request missing required fields
    3. Activate appropriate bots
    4. Execute the workflow
    """
    try:
        from modules.aria_controller_engine import aria_controller, AriaRequest
        
        intent_keywords = [
            'create', 'approve', 'process', 'generate', 'deliver', 'ship', 
            'invoice', 'quote', 'order', 'delivery', 'customer', 'supplier',
            'product', 'remittance', 'payment', 'report', 'post'
        ]
        
        message_lower = request.message.lower()
        is_action_intent = any(keyword in message_lower for keyword in intent_keywords)
        
        if is_action_intent:
            try:
                aria_request = AriaRequest(
                    message=request.message,
                    context=request.context or {},
                    attachments=[]
                )
                
                controller_response = await aria_controller.process_request(aria_request)
                
                if controller_response.status == "needs_more_info":
                    return ChatResponse(
                        response=controller_response.message,
                        model="aria_controller",
                        intent=controller_response.intent,
                        missing_fields=controller_response.next_steps,
                        action_suggestions=[
                            {"label": f"Provide {field}", "value": field} 
                            for field in controller_response.next_steps
                        ]
                    )
                
                elif controller_response.status == "success":
                    return ChatResponse(
                        response=controller_response.message,
                        model="aria_controller",
                        intent=controller_response.intent,
                        bots_activated=controller_response.bots_activated,
                        execution_results=controller_response.execution_results
                    )
                
            except Exception as controller_error:
                logger.warning(f"Aria Controller error, falling back to LLM: {controller_error}")
        
        messages = []
        
        messages.append({
            'role': 'system',
            'content': """You are ARIA (AI-Powered Responsive Intelligent Assistant), an expert business assistant specializing in ERP systems, document processing, and business automation.

You help users with:
- Creating sales orders, invoices, quotes, and deliveries
- Managing customers, suppliers, and products
- Processing documents and extracting data
- Running financial reports and analytics
- Automating workflows with 67 specialized bots
- Answering questions about business data

Be helpful, professional, and concise. Provide actionable guidance."""
        })
        
        if request.conversation_history:
            for msg in request.conversation_history[-10:]:
                messages.append({
                    'role': msg.get('role', 'user'),
                    'content': msg.get('content', '')
                })
        
        messages.append({
            'role': 'user',
            'content': request.message
        })
        
        result = await llm_service.chat(messages)
        
        if result['success']:
            return ChatResponse(
                response=result['message'],
                model=result.get('model', 'llama3.2:latest')
            )
        else:
            return ChatResponse(
                response=f"I understand you want to {request.message.lower()}. Let me help you with that.\n\nCould you provide more details about what you'd like to do?",
                model="fallback"
            )
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return ChatResponse(
            response="I'm here to help! I can assist you with creating sales orders, processing documents, managing customers, running reports, and more. What would you like to do?",
            model="fallback"
        )


@router.post("/upload")
async def chat_with_file(
    file: UploadFile = File(...),
    message: Optional[str] = Form(None)
):
    """
    Chat with ARIA and upload a file for context
    
    Supports:
    - PDF documents
    - Images (JPG, PNG) with OCR
    - Excel files (XLSX, XLS) with intelligent document analysis
    - Text files
    
    ARIA will analyze the file, determine document type, suggest GL postings,
    and provide options to post to ARIA ERP or export to SAP
    """
    try:
        file_content = await file.read()
        
        extracted_text = ""
        document_analysis = None
        
        if file.filename.lower().endswith(('.xlsx', '.xls')):
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()
                
                try:
                    document_analysis = document_analyzer_v2.analyze_excel(tmp_file.name)
                    
                    response_text = _format_document_analysis(document_analysis, file.filename)
                    
                    return {
                        "response": response_text,
                        "model": "document_analyzer",
                        "timestamp": datetime.now().isoformat(),
                        "document_analysis": document_analysis
                    }
                finally:
                    os.unlink(tmp_file.name)
        
        # PDF processing with OCR fallback for scanned documents
        elif file.filename.lower().endswith('.pdf'):
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()
                
                try:
                    with open(tmp_file.name, 'rb') as pdf_file:
                        pdf_reader = PyPDF2.PdfReader(pdf_file)
                        for page in pdf_reader.pages:
                            extracted_text += page.extract_text() + "\n"
                    
                    if len(extracted_text.strip()) < 50:
                        logger.info(f"PDF has no text layer, using OCR for {file.filename}")
                        try:
                            from pdf2image import convert_from_path
                            images = convert_from_path(tmp_file.name, dpi=300, first_page=1, last_page=min(5, len(pdf_reader.pages)))
                            extracted_text = ""
                            for i, image in enumerate(images):
                                logger.info(f"OCR processing page {i+1}/{len(images)}")
                                page_text = pytesseract.image_to_string(image, lang='eng')
                                extracted_text += f"\n--- Page {i+1} ---\n{page_text}\n"
                            logger.info(f"OCR extracted {len(extracted_text)} characters from {len(images)} pages")
                        except ImportError:
                            logger.warning("pdf2image not available, cannot OCR scanned PDFs")
                            extracted_text = f"[Scanned PDF - OCR not available. Install pdf2image and poppler-utils to process scanned documents]"
                        except Exception as ocr_error:
                            logger.error(f"OCR error: {ocr_error}")
                            extracted_text = f"[Scanned PDF - OCR failed: {str(ocr_error)}]"
                finally:
                    os.unlink(tmp_file.name)
        
        elif file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()
                
                try:
                    image = Image.open(tmp_file.name)
                    extracted_text = pytesseract.image_to_string(image)
                finally:
                    os.unlink(tmp_file.name)
        
        # Text file processing
        elif file.filename.lower().endswith('.txt'):
            extracted_text = file_content.decode('utf-8')
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF, Excel, image, or text file.")
        
        user_message = message or "Please analyze this document and tell me what it contains."
        
        messages = [
            {
                'role': 'system',
                'content': """You are ARIA, an expert document analysis assistant. Analyze the provided document and answer the user's question accurately and concisely."""
            },
            {
                'role': 'user',
                'content': f"""Document content:
{extracted_text[:4000]}  

User question: {user_message}

Please provide a clear and helpful response."""
            }
        ]
        
        result = await llm_service.chat(messages)
        
        if result['success']:
            return ChatResponse(
                response=result['message'],
                model=result.get('model', 'llama3.2:latest')
            )
        else:
            return ChatResponse(
                response=f"I've analyzed your document ({file.filename}). It contains {len(extracted_text)} characters of text. How can I help you with this document?",
                model="fallback"
            )
    
    except Exception as e:
        logger.error(f"Error in chat with file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


def _format_document_analysis(analysis: Dict[str, Any], filename: str) -> str:
    """Format document analysis results into a readable response"""
    doc_type = analysis.get('document_type', 'Unknown')
    doc_subtype = analysis.get('document_subtype', '')
    summary = analysis.get('summary', {})
    gl_postings = analysis.get('gl_postings', [])
    sap_export = analysis.get('sap_export', {})
    recommendations = analysis.get('recommendations', [])
    
    response = f"""📄 **Document Analysis: {filename}**

**Document Type:** {doc_type}"""
    
    if doc_subtype:
        response += f"\n**Subtype:** {doc_subtype}"
    
    response += "\n\n**Summary:**"
    for key, value in summary.items():
        key_formatted = key.replace('_', ' ').title()
        if isinstance(value, dict):
            response += f"\n  • {key_formatted}:"
            for sub_key, sub_value in value.items():
                response += f"\n    - {sub_key}: {sub_value}"
        else:
            response += f"\n  • {key_formatted}: {value}"
    
    if recommendations:
        response += "\n\n**Recommendations:**"
        for rec in recommendations:
            response += f"\n  {rec}"
    
    if gl_postings:
        response += f"\n\n**GL Postings ({len(gl_postings)} entries):**"
        response += "\n\nI've generated the following journal entries for this document:"
        
        suppliers = {}
        for posting in gl_postings:
            supplier = posting.get('supplier_ref', 'N/A')
            if supplier not in suppliers:
                suppliers[supplier] = []
            suppliers[supplier].append(posting)
        
        for supplier, postings in list(suppliers.items())[:3]:  # Show first 3 suppliers
            response += f"\n\n**Supplier {supplier}:**"
            for posting in postings[:4]:  # Show first 4 postings per supplier
                debit = posting.get('debit', 0)
                credit = posting.get('credit', 0)
                response += f"\n  • {posting.get('account')} - {posting.get('account_name')}"
                if debit > 0:
                    response += f": Debit R{debit:,.2f}"
                if credit > 0:
                    response += f": Credit R{credit:,.2f}"
        
        if len(suppliers) > 3:
            response += f"\n\n  ... and {len(suppliers) - 3} more suppliers"
    
    if sap_export and sap_export.get('records'):
        response += f"\n\n**SAP Export Available:**"
        response += f"\n  • Format: {sap_export.get('format', 'N/A')}"
        response += f"\n  • Transaction Code: {sap_export.get('transaction_code', 'N/A')}"
        response += f"\n  • Total Records: {sap_export.get('total_records', 0)}"
        response += "\n  • Ready for import into SAP ECC or S/4HANA"
    
    response += "\n\n**What would you like to do?**"
    response += "\n  1️⃣ Post to ARIA ERP"
    response += "\n  2️⃣ Export to SAP (download file)"
    response += "\n  3️⃣ View detailed GL postings"
    response += "\n  4️⃣ Review specific transactions"
    
    return response


@router.get("/health")
async def health_check():
    """Check ARIA chat service health"""
    try:
        test_result = await llm_service.chat([
            {"role": "user", "content": "Hello"}
        ])
        
        llm_status = "online" if test_result.get('success') else "offline"
        
        return {
            "status": "healthy",
            "module": "aria_chat",
            "llm_backend": "Ollama",
            "llm_status": llm_status,
            "model": llm_service.model,
            "features": [
                "natural_language_chat",
                "file_upload_analysis",
                "document_ocr",
                "excel_intelligent_analysis",
                "gl_posting_suggestions",
                "sap_export",
                "conversation_history"
            ]
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "degraded",
            "module": "aria_chat",
            "error": str(e)
        }

@router.post("/analyze-and-export")
async def analyze_and_export(
    file: UploadFile = File(...),
    action: str = Form(...)
):
    """
    Analyze document and perform action (post_to_erp or export_to_sap)
    
    Actions:
    - post_to_erp: Post GL entries to ARIA ERP
    - export_to_sap: Download SAP-compatible export file
    """
    try:
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only Excel files are supported for this endpoint")
        
        file_content = await file.read()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            tmp_file.write(file_content)
            tmp_file.flush()
            
            try:
                document_analysis = document_analyzer_v2.analyze_excel(tmp_file.name)
                
                if action == "export_to_sap":
                    # Generate SAP export file
                    sap_export = document_analysis.get('sap_export', {})
                    records = sap_export.get('records', [])
                    
                    if not records:
                        raise HTTPException(status_code=400, detail="No SAP export records available")
                    
                    # Create CSV file for SAP import
                    import pandas as pd
                    df = pd.DataFrame(records)
                    
                    csv_content = df.to_csv(index=False)
                    
                    from fastapi.responses import Response
                    return Response(
                        content=csv_content,
                        media_type="text/csv",
                        headers={
                            "Content-Disposition": f"attachment; filename=SAP_F28_Export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                        }
                    )
                
                elif action == "post_to_erp":
                    # Post to ARIA ERP using GL Posting HTTP endpoint
                    gl_postings = document_analysis.get('gl_postings', [])
                    
                    if not gl_postings:
                        raise HTTPException(status_code=400, detail="No GL postings available")
                    
                    from modules.gl_posting_module import calculate_file_hash
                    import asyncpg
                    import httpx
                    import os
                    
                    file_hash = calculate_file_hash(file_content)
                    
                    database_url = os.getenv('DATABASE_URL')
                    conn = await asyncpg.connect(database_url)
                    
                    try:
                        company = await conn.fetchrow("SELECT id FROM companies LIMIT 1")
                        if not company:
                            raise HTTPException(status_code=400, detail="No company found. Please create a company first.")
                        
                        company_id = str(company['id'])
                        
                        doc_type = document_analysis.get('document_type', 'Unknown')
                        doc_subtype = document_analysis.get('document_subtype', '')
                        
                        # Generate unique reference
                        ref_prefix = "JE"
                        if "Vendor" in doc_type:
                            ref_prefix = "AP"
                        elif "Customer" in doc_type:
                            ref_prefix = "AR"
                        
                        reference = f"{ref_prefix}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
                        
                        lines = []
                        for idx, posting in enumerate(gl_postings):
                            account_code = str(posting.get('account', '9999'))
                            debit = float(posting.get('debit', 0))
                            credit = float(posting.get('credit', 0))
                            description = posting.get('description', '')
                            
                            lines.append({
                                "line_number": idx + 1,
                                "account_code": account_code,
                                "debit_amount": debit,
                                "credit_amount": credit,
                                "description": description
                            })
                        
                        service_api_key = os.getenv('SERVICE_API_KEY')
                        if not service_api_key:
                            raise HTTPException(status_code=500, detail="SERVICE_API_KEY not configured")
                        
                        entry_payload = {
                            "company_id": company_id,
                            "reference": reference,
                            "entry_date": datetime.now().date().isoformat(),
                            "posting_date": datetime.now().date().isoformat(),
                            "description": f"{doc_type} - {doc_subtype} from {file.filename}",
                            "source": "DOCUMENT_UPLOAD",
                            "source_document_hash": file_hash,
                            "source_document_name": file.filename,
                            "lines": lines
                        }
                        
                        async with httpx.AsyncClient() as client:
                            gl_response = await client.post(
                                "http://localhost:8000/api/erp/gl/journal-entries",
                                json=entry_payload,
                                headers={"X-Service-Key": service_api_key}
                            )
                            
                            if gl_response.status_code != 200:
                                raise HTTPException(
                                    status_code=gl_response.status_code,
                                    detail=f"GL posting failed: {gl_response.text}"
                                )
                            
                            result = gl_response.json()
                        
                        return {
                            "status": "success",
                            "message": f"Successfully created journal entry {reference} with {len(gl_postings)} GL lines",
                            "document_type": document_analysis.get('document_type'),
                            "journal_entry_id": result.get('id'),
                            "reference": result.get('reference', reference),
                            "total_entries": len(gl_postings),
                            "entry_status": result.get('status', 'DRAFT'),
                            "summary": document_analysis.get('summary'),
                            "timestamp": datetime.now().isoformat(),
                            "note": "Journal entry created in DRAFT status. Use POST /api/erp/gl/journal-entries/{id}/post to post to GL."
                        }
                    finally:
                        await conn.close()
                
                else:
                    raise HTTPException(status_code=400, detail="Invalid action. Use 'post_to_erp' or 'export_to_sap'")
                    
            finally:
                os.unlink(tmp_file.name)
    
    except Exception as e:
        logger.error(f"Error in analyze and export: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process request: {str(e)}")


@router.get("/document-types")
async def get_supported_document_types():
    """Get list of supported document types for intelligent analysis"""
    supported_types = document_analyzer_v2.get_supported_types()
    
    return {
        "supported_types": supported_types,
        "file_formats": [".xlsx", ".xls", ".pdf", ".jpg", ".png", ".txt"],
        "total_types": sum(len(cat["types"]) for cat in supported_types),
        "categories": [cat["category"] for cat in supported_types]
    }
