"""
OCR Service using Tesseract for text extraction from images and PDFs.
"""
import io
import logging
from pathlib import Path
from typing import Dict, List, Optional
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
from backend.core.config import settings

logger = logging.getLogger(__name__)


class OCRService:
    """Optical Character Recognition service for document text extraction."""
    
    def __init__(self):
        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        self.languages = settings.OCR_LANGUAGES
    
    def extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from an image file.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text as string
        """
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image, lang=self.languages)
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from image {image_path}: {e}")
            raise
    
    def extract_text_from_pdf(self, pdf_path: str) -> Dict[int, str]:
        """
        Extract text from a PDF file page by page.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dictionary mapping page numbers to extracted text
        """
        try:
            # Convert PDF to images
            images = convert_from_path(pdf_path, dpi=300)
            
            texts = {}
            for page_num, image in enumerate(images, start=1):
                text = pytesseract.image_to_string(image, lang=self.languages)
                texts[page_num] = text.strip()
                
            return texts
        except Exception as e:
            logger.error(f"Error extracting text from PDF {pdf_path}: {e}")
            raise
    
    def extract_text_with_confidence(
        self, 
        image_path: str
    ) -> List[Dict[str, any]]:
        """
        Extract text with confidence scores from an image.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            List of dictionaries with text, confidence, and bounding box info
        """
        try:
            image = Image.open(image_path)
            
            # Get detailed OCR data
            data = pytesseract.image_to_data(
                image, 
                lang=self.languages,
                output_type=pytesseract.Output.DICT
            )
            
            results = []
            n_boxes = len(data['text'])
            
            for i in range(n_boxes):
                text = data['text'][i].strip()
                if text:  # Only include non-empty text
                    conf = int(data['conf'][i])
                    if conf > 0:  # Only include confident results
                        results.append({
                            'text': text,
                            'confidence': conf,
                            'left': data['left'][i],
                            'top': data['top'][i],
                            'width': data['width'][i],
                            'height': data['height'][i],
                            'page_num': 1,
                            'block_num': data['block_num'][i],
                            'par_num': data['par_num'][i],
                            'line_num': data['line_num'][i],
                            'word_num': data['word_num'][i]
                        })
            
            return results
        except Exception as e:
            logger.error(f"Error extracting text with confidence from {image_path}: {e}")
            raise
    
    def process_document(self, file_path: str) -> Dict:
        """
        Process a document (image or PDF) and extract text.
        
        Args:
            file_path: Path to the document
            
        Returns:
            Dictionary with extracted text and metadata
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Determine file type and process accordingly
        if file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
            text = self.extract_text_from_image(str(file_path))
            return {
                'type': 'image',
                'pages': 1,
                'text': text,
                'full_text': text
            }
        elif file_path.suffix.lower() == '.pdf':
            page_texts = self.extract_text_from_pdf(str(file_path))
            full_text = '\n\n'.join(page_texts.values())
            return {
                'type': 'pdf',
                'pages': len(page_texts),
                'page_texts': page_texts,
                'full_text': full_text
            }
        else:
            raise ValueError(f"Unsupported file type: {file_path.suffix}")


# Singleton instance
ocr_service = OCRService()
