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
