"""
Enhanced OCR Service using Tesseract for text extraction from images and PDFs.
"""
import io
import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
from pdf2image import convert_from_path
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import time
from datetime import datetime

from core.config import settings
from models import Document, DocumentStatus
from core.database import get_db

logger = logging.getLogger(__name__)


class OCRService:
    """Enhanced Optical Character Recognition service for document text extraction."""
    
    def __init__(self):
        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        self.languages = settings.OCR_LANGUAGES
        self.confidence_threshold = settings.OCR_CONFIDENCE_THRESHOLD
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image to improve OCR accuracy
        """
        try:
            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')
            
            # Convert PIL to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            
            # Apply noise reduction
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # Apply adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Morphological operations to clean up
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            # Convert back to PIL
            processed_image = Image.fromarray(cleaned)
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(processed_image)
            processed_image = enhancer.enhance(1.5)
            
            # Sharpen
            processed_image = processed_image.filter(ImageFilter.SHARPEN)
            
            return processed_image
            
        except Exception as e:
            logger.warning(f"Image preprocessing failed, using original: {e}")
            return image
    
    def detect_language(self, image: Image.Image) -> str:
        """
        Detect the language of text in an image
        """
        try:
            # Use Tesseract's language detection
            lang_data = pytesseract.image_to_osd(image, output_type=pytesseract.Output.DICT)
            detected_lang = lang_data.get('orientation_conf', 0)
            
            # For now, return default language
            # In production, implement proper language detection
            return self.languages
            
        except Exception as e:
            logger.warning(f"Language detection failed: {e}")
            return self.languages
    
    def extract_text_from_image(self, image_path: str, preprocess: bool = True) -> Dict:
        """
        Extract text from an image file with enhanced processing.
        
        Args:
            image_path: Path to the image file
            preprocess: Whether to preprocess the image
            
        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            start_time = time.time()
            image = Image.open(image_path)
            
            # Detect language
            detected_lang = self.detect_language(image)
            
            # Preprocess image if requested
            if preprocess:
                processed_image = self.preprocess_image(image)
            else:
                processed_image = image
            
            # Extract text with confidence
            text = pytesseract.image_to_string(processed_image, lang=detected_lang)
            
            # Get detailed data with confidence scores
            detailed_data = pytesseract.image_to_data(
                processed_image, 
                lang=detected_lang,
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate average confidence
            confidences = [int(conf) for conf in detailed_data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            processing_time = time.time() - start_time
            
            return {
                'text': text.strip(),
                'confidence': avg_confidence / 100.0,  # Convert to 0-1 scale
                'language': detected_lang,
                'processing_time': processing_time,
                'word_count': len(text.split()),
                'character_count': len(text),
                'detailed_data': detailed_data,
                'preprocessed': preprocess
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from image {image_path}: {e}")
            raise
    
    def extract_text_from_pdf(self, pdf_path: str, max_pages: int = None) -> Dict:
        """
        Extract text from a PDF file page by page with enhanced processing.
        
        Args:
            pdf_path: Path to the PDF file
            max_pages: Maximum number of pages to process (None for all)
            
        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            start_time = time.time()
            
            # Convert PDF to images with high DPI for better OCR
            images = convert_from_path(pdf_path, dpi=300, first_page=1, 
                                     last_page=max_pages if max_pages else None)
            
            page_results = {}
            total_confidence = 0
            total_words = 0
            total_chars = 0
            
            for page_num, image in enumerate(images, start=1):
                # Process each page
                page_result = self._process_page_image(image, page_num)
                page_results[page_num] = page_result
                
                total_confidence += page_result['confidence']
                total_words += page_result['word_count']
                total_chars += page_result['character_count']
            
            # Combine all text
            full_text = '\n\n'.join([result['text'] for result in page_results.values()])
            avg_confidence = total_confidence / len(page_results) if page_results else 0
            
            processing_time = time.time() - start_time
            
            return {
                'text': full_text,
                'page_texts': {k: v['text'] for k, v in page_results.items()},
                'page_results': page_results,
                'total_pages': len(page_results),
                'confidence': avg_confidence,
                'processing_time': processing_time,
                'word_count': total_words,
                'character_count': total_chars,
                'type': 'pdf'
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {pdf_path}: {e}")
            raise
    
    def _process_page_image(self, image: Image.Image, page_num: int) -> Dict:
        """Process a single page image"""
        try:
            # Preprocess the image
            processed_image = self.preprocess_image(image)
            
            # Extract text
            text = pytesseract.image_to_string(processed_image, lang=self.languages)
            
            # Get confidence data
            detailed_data = pytesseract.image_to_data(
                processed_image, 
                lang=self.languages,
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate confidence
            confidences = [int(conf) for conf in detailed_data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                'text': text.strip(),
                'confidence': avg_confidence / 100.0,
                'word_count': len(text.split()),
                'character_count': len(text),
                'page_number': page_num,
                'detailed_data': detailed_data
            }
            
        except Exception as e:
            logger.error(f"Error processing page {page_num}: {e}")
            return {
                'text': '',
                'confidence': 0.0,
                'word_count': 0,
                'character_count': 0,
                'page_number': page_num,
                'error': str(e)
            }
    
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
    
    async def process_document_async(self, document_id: int, file_path: str) -> Dict:
        """
        Asynchronously process a document for OCR
        
        Args:
            document_id: Database ID of the document
            file_path: Path to the document file
            
        Returns:
            OCR processing results
        """
        try:
            # Update document status
            with next(get_db()) as db:
                document = db.query(Document).filter(Document.id == document_id).first()
                if document:
                    document.status = DocumentStatus.PROCESSING
                    document.processing_started_at = datetime.utcnow()
                    db.commit()
            
            # Determine file type and process accordingly
            file_path_obj = Path(file_path)
            file_extension = file_path_obj.suffix.lower()
            
            if file_extension == '.pdf':
                # Process PDF
                result = await asyncio.get_event_loop().run_in_executor(
                    self.executor, self.extract_text_from_pdf, file_path
                )
            elif file_extension in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']:
                # Process image
                result = await asyncio.get_event_loop().run_in_executor(
                    self.executor, self.extract_text_from_image, file_path
                )
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
            
            # Update document with results
            with next(get_db()) as db:
                document = db.query(Document).filter(Document.id == document_id).first()
                if document:
                    document.ocr_text = result['text']
                    document.confidence_score = result['confidence']
                    document.processing_completed_at = datetime.utcnow()
                    document.processing_duration = int(result['processing_time'])
                    
                    # Update status based on confidence
                    if result['confidence'] >= self.confidence_threshold:
                        document.status = DocumentStatus.PROCESSED
                    else:
                        document.status = DocumentStatus.ERROR
                        document.add_processing_error(
                            f"Low OCR confidence: {result['confidence']:.2f}",
                            "ocr_low_confidence"
                        )
                    
                    # Store detailed OCR data
                    if not document.extracted_data:
                        document.extracted_data = {}
                    document.extracted_data['ocr_result'] = {
                        'confidence': result['confidence'],
                        'processing_time': result['processing_time'],
                        'word_count': result['word_count'],
                        'character_count': result['character_count'],
                        'language': result.get('language', self.languages),
                        'type': result.get('type', 'image')
                    }
                    
                    if 'page_texts' in result:
                        document.extracted_data['page_texts'] = result['page_texts']
                        document.extracted_data['total_pages'] = result['total_pages']
                    
                    db.commit()
            
            logger.info(f"OCR processing completed for document {document_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {e}")
            
            # Update document with error status
            with next(get_db()) as db:
                document = db.query(Document).filter(Document.id == document_id).first()
                if document:
                    document.status = DocumentStatus.ERROR
                    document.processing_completed_at = datetime.utcnow()
                    document.add_processing_error(str(e), "ocr_processing_error")
                    db.commit()
            
            raise
    
    def batch_process_images(self, image_paths: List[str]) -> List[Dict]:
        """
        Process multiple images in parallel
        
        Args:
            image_paths: List of image file paths
            
        Returns:
            List of OCR results
        """
        try:
            # Process images in parallel using ThreadPoolExecutor
            futures = []
            for image_path in image_paths:
                future = self.executor.submit(self.extract_text_from_image, image_path)
                futures.append(future)
            
            # Collect results
            results = []
            for i, future in enumerate(futures):
                try:
                    result = future.result(timeout=60)  # 60 second timeout per image
                    result['source_file'] = image_paths[i]
                    results.append(result)
                except Exception as e:
                    logger.error(f"Error processing {image_paths[i]}: {e}")
                    results.append({
                        'source_file': image_paths[i],
                        'text': '',
                        'confidence': 0.0,
                        'error': str(e)
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch processing: {e}")
            raise
    
    def get_supported_formats(self) -> List[str]:
        """Get list of supported file formats"""
        return ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif']
    
    def validate_file_format(self, file_path: str) -> bool:
        """Check if file format is supported for OCR"""
        file_extension = Path(file_path).suffix.lower()
        return file_extension in self.get_supported_formats()
    
    def get_processing_stats(self) -> Dict:
        """Get OCR service statistics"""
        return {
            'languages': self.languages,
            'confidence_threshold': self.confidence_threshold,
            'supported_formats': self.get_supported_formats(),
            'max_workers': self.executor._max_workers,
            'tesseract_version': pytesseract.get_tesseract_version()
        }


# Singleton instance
ocr_service = OCRService()
