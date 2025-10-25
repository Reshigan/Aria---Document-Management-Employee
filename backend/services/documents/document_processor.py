"""
Complete Document Processing Service
Handles all document types: PDF, images, DOCX, XLSX
"""
import logging
import mimetypes
from typing import Dict, Optional
from pathlib import Path
import asyncio

from .ocr_service import ocr_service
from .pdf_parser import pdf_parser

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Process documents of any type"""
    
    SUPPORTED_TYPES = {
        'application/pdf': 'pdf',
        'image/jpeg': 'image',
        'image/png': 'image',
        'image/tiff': 'image',
        'image/bmp': 'image',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'text/plain': 'text'
    }
    
    async def process_document(self, file_path: str, mime_type: Optional[str] = None) -> Dict:
        """Process document and extract all information"""
        
        if not mime_type:
            mime_type, _ = mimetypes.guess_type(file_path)
        
        if not mime_type:
            return {"error": "Unknown file type", "success": False}
        
        doc_type = self.SUPPORTED_TYPES.get(mime_type)
        
        if not doc_type:
            return {"error": f"Unsupported type: {mime_type}", "success": False}
        
        try:
            if doc_type == 'pdf':
                return await self._process_pdf(file_path)
            elif doc_type == 'image':
                return await self._process_image(file_path)
            elif doc_type == 'text':
                return await self._process_text(file_path)
            else:
                return {"error": f"Handler not implemented for {doc_type}", "success": False}
        
        except Exception as e:
            logger.error(f"Document processing failed: {e}")
            return {"error": str(e), "success": False}
    
    async def _process_pdf(self, file_path: str) -> Dict:
        """Process PDF document"""
        result = await pdf_parser.extract_text(file_path)
        tables = await pdf_parser.extract_tables(file_path)
        
        return {
            "success": True,
            "type": "pdf",
            "text": result.get("text", ""),
            "pages": result.get("pages", 0),
            "metadata": result.get("metadata", {}),
            "tables": tables,
            "has_tables": len(tables) > 0
        }
    
    async def _process_image(self, file_path: str) -> Dict:
        """Process image document with OCR"""
        ocr_result = await ocr_service.extract_text(file_path)
        
        return {
            "success": True,
            "type": "image",
            "text": ocr_result.text,
            "confidence": ocr_result.confidence,
            "language": ocr_result.language
        }
    
    async def _process_text(self, file_path: str) -> Dict:
        """Process plain text file"""
        loop = asyncio.get_event_loop()
        
        def _read():
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        
        text = await loop.run_in_executor(None, _read)
        
        return {
            "success": True,
            "type": "text",
            "text": text,
            "char_count": len(text),
            "word_count": len(text.split())
        }

document_processor = DocumentProcessor()
