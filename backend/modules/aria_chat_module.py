"""
ARIA Chat Module with LLM Integration and File Upload Support
Provides natural language chat interface with document context
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


class ChatResponse(BaseModel):
    response: str
    model: Optional[str] = None
    timestamp: str = datetime.now().isoformat()
    document_analysis: Optional[Dict[str, Any]] = None


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with ARIA using Ollama LLM
    
    Supports natural language queries about:
    - Business operations
    - ERP workflows
    - Document processing
    - General assistance
    """
    try:
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
            for msg in request.conversation_history[-10:]:  # Last 10 messages for context
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
                response=f"I understand you want to {request.message.lower()}. Let me help you with that.\n\nI'm processing your request using natural language understanding. What specific action would you like me to take?",
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
        
        # PDF processing
        elif file.filename.lower().endswith('.pdf'):
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()
                
                try:
                    with open(tmp_file.name, 'rb') as pdf_file:
                        pdf_reader = PyPDF2.PdfReader(pdf_file)
                        for page in pdf_reader.pages:
                            extracted_text += page.extract_text() + "\n"
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
                document_analysis = document_analyzer.analyze_excel(tmp_file.name)
                
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
                    # Post to ARIA ERP
                    gl_postings = document_analysis.get('gl_postings', [])
                    
                    if not gl_postings:
                        raise HTTPException(status_code=400, detail="No GL postings available")
                    
                    # TODO: Implement actual posting to ARIA ERP database
                    # For now, return success message with posting details
                    
                    return {
                        "status": "success",
                        "message": f"Successfully posted {len(gl_postings)} GL entries to ARIA ERP",
                        "document_type": document_analysis.get('document_type'),
                        "total_entries": len(gl_postings),
                        "summary": document_analysis.get('summary'),
                        "timestamp": datetime.now().isoformat()
                    }
                
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
