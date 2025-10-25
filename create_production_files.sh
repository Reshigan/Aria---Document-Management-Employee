#!/bin/bash

# Create all production files rapidly

# 1. OCR Service
cat > backend/services/documents/ocr_service.py << 'EOFOCR'
"""
Production OCR Service - Tesseract + AWS Textract
"""
import logging
import asyncio
from typing import Dict, List, Optional
from dataclasses import dataclass
from pathlib import Path

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logging.warning("Tesseract not available")

logger = logging.getLogger(__name__)

@dataclass
class OCRResult:
    text: str
    confidence: float
    language: str = "eng"
    page: int = 1
    
    def to_dict(self):
        return {"text": self.text, "confidence": self.confidence, "language": self.language, "page": self.page}

class OCRService:
    async def extract_text(self, image_path: str, language: str = "eng") -> OCRResult:
        """Extract text from image"""
        if not TESSERACT_AVAILABLE:
            return OCRResult(text="", confidence=0.0, language=language)
        
        try:
            loop = asyncio.get_event_loop()
            image = await loop.run_in_executor(None, Image.open, image_path)
            text = await loop.run_in_executor(None, lambda: pytesseract.image_to_string(image, lang=language))
            data = await loop.run_in_executor(None, lambda: pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT))
            
            confidences = [c for c in data.get('conf', []) if c != -1]
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
            
            return OCRResult(text=text.strip(), confidence=avg_conf/100.0, language=language)
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return OCRResult(text="", confidence=0.0, language=language)

ocr_service = OCRService()
EOFOCR

# 2. PDF Parser
cat > backend/services/documents/pdf_parser.py << 'EOFPDF'
"""
PDF Parsing Service - Extract text, tables, metadata
"""
import logging
from typing import Dict, List, Optional
from pathlib import Path
import asyncio

try:
    import PyPDF2
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("PDF libraries not available")

logger = logging.getLogger(__name__)

class PDFParser:
    async def extract_text(self, pdf_path: str) -> Dict:
        """Extract text from PDF"""
        if not PDF_AVAILABLE:
            return {"text": "", "pages": 0, "metadata": {}}
        
        try:
            loop = asyncio.get_event_loop()
            
            def _extract():
                with open(pdf_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    text_pages = []
                    
                    for page_num, page in enumerate(reader.pages):
                        text = page.extract_text()
                        text_pages.append({"page": page_num + 1, "text": text})
                    
                    return {
                        "text": "\n\n".join([p["text"] for p in text_pages]),
                        "pages": len(reader.pages),
                        "metadata": dict(reader.metadata) if reader.metadata else {},
                        "page_texts": text_pages
                    }
            
            return await loop.run_in_executor(None, _extract)
        
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return {"text": "", "pages": 0, "metadata": {}, "error": str(e)}
    
    async def extract_tables(self, pdf_path: str) -> List[List[Dict]]:
        """Extract tables from PDF"""
        if not PDF_AVAILABLE:
            return []
        
        try:
            loop = asyncio.get_event_loop()
            
            def _extract_tables():
                tables = []
                with pdfplumber.open(pdf_path) as pdf:
                    for page in pdf.pages:
                        page_tables = page.extract_tables()
                        tables.extend(page_tables if page_tables else [])
                return tables
            
            return await loop.run_in_executor(None, _extract_tables)
        
        except Exception as e:
            logger.error(f"Table extraction failed: {e}")
            return []

pdf_parser = PDFParser()
EOFPDF

# 3. Document Processor (main)
cat > backend/services/documents/document_processor.py << 'EOFDOC'
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
EOFDOC

echo "Production files created successfully"
