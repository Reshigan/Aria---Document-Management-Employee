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
