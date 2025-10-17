"""
Advanced OCR Processing with Multiple Engines
Supports Tesseract, EasyOCR, and PaddleOCR for comprehensive text extraction
"""

import os
import logging
import asyncio
from typing import Dict, List, Optional, Tuple, Any, Union
from pathlib import Path
import json
import time
from dataclasses import dataclass
from enum import Enum

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import cv2

# OCR Engines
import pytesseract
import easyocr
import paddleocr

# Document processing
import pdf2image
from transformers import pipeline

logger = logging.getLogger(__name__)

class OCREngine(Enum):
    TESSERACT = "tesseract"
    EASYOCR = "easyocr"
    PADDLEOCR = "paddleocr"
    ENSEMBLE = "ensemble"

@dataclass
class OCRResult:
    text: str
    confidence: float
    bounding_boxes: List[Dict]
    processing_time: float
    engine: str
    language: str
    metadata: Dict[str, Any]

@dataclass
class DocumentRegion:
    text: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # x, y, width, height
    region_type: str  # header, paragraph, table, etc.

class AdvancedOCRProcessor:
    def __init__(self):
        self.tesseract_available = True
        self.easyocr_reader = None
        self.paddleocr_reader = None
        self.nlp_pipeline = None
        
        self._initialize_engines()
        self._initialize_nlp()
    
    def _initialize_engines(self):
        """Initialize OCR engines"""
        try:
            # Test Tesseract
            pytesseract.get_tesseract_version()
            logger.info("Tesseract OCR initialized successfully")
        except Exception as e:
            logger.warning(f"Tesseract not available: {e}")
            self.tesseract_available = False
        
        try:
            # Initialize EasyOCR
            self.easyocr_reader = easyocr.Reader(['en'], gpu=False)
            logger.info("EasyOCR initialized successfully")
        except Exception as e:
            logger.warning(f"EasyOCR initialization failed: {e}")
        
        try:
            # Initialize PaddleOCR
            self.paddleocr_reader = paddleocr.PaddleOCR(
                use_angle_cls=True, 
                lang='en',
                show_log=False,
                use_gpu=False
            )
            logger.info("PaddleOCR initialized successfully")
        except Exception as e:
            logger.warning(f"PaddleOCR initialization failed: {e}")
    
    def _initialize_nlp(self):
        """Initialize NLP pipeline for text analysis"""
        try:
            self.nlp_pipeline = pipeline(
                "text-classification",
                model="microsoft/DialoGPT-medium",
                return_all_scores=True
            )
            logger.info("NLP pipeline initialized successfully")
        except Exception as e:
            logger.warning(f"NLP pipeline initialization failed: {e}")
    
    async def process_document(
        self,
        file_path: str,
        engine: OCREngine = OCREngine.ENSEMBLE,
        languages: List[str] = ['en'],
        preprocessing_options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process document with advanced OCR capabilities
        """
        start_time = time.time()
        
        try:
            # Determine file type and convert if necessary
            images = await self._prepare_images(file_path)
            
            results = []
            for i, image in enumerate(images):
                page_result = await self._process_image(
                    image, engine, languages, preprocessing_options
                )
                page_result['page_number'] = i + 1
                results.append(page_result)
            
            # Combine results
            combined_result = self._combine_page_results(results)
            combined_result['processing_time'] = time.time() - start_time
            combined_result['total_pages'] = len(images)
            
            # Perform advanced analysis
            if combined_result['text'].strip():
                combined_result['analysis'] = await self._analyze_text(combined_result['text'])
            
            return combined_result
            
        except Exception as e:
            logger.error(f"Document processing failed: {e}")
            raise
    
    async def _prepare_images(self, file_path: str) -> List[Image.Image]:
        """Convert document to images for processing"""
        file_path = Path(file_path)
        
        if file_path.suffix.lower() == '.pdf':
            # Convert PDF to images
            try:
                images = pdf2image.convert_from_path(
                    file_path,
                    dpi=300,
                    fmt='RGB'
                )
                return images
            except Exception as e:
                logger.error(f"PDF conversion failed: {e}")
                raise
        
        elif file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']:
            # Load image directly
            image = Image.open(file_path)
            return [image]
        
        else:
            raise ValueError(f"Unsupported file format: {file_path.suffix}")
    
    async def _process_image(
        self,
        image: Image.Image,
        engine: OCREngine,
        languages: List[str],
        preprocessing_options: Optional[Dict]
    ) -> Dict[str, Any]:
        """Process single image with specified OCR engine"""
        
        # Preprocess image
        processed_image = self._preprocess_image(image, preprocessing_options or {})
        
        if engine == OCREngine.ENSEMBLE:
            return await self._ensemble_ocr(processed_image, languages)
        elif engine == OCREngine.TESSERACT:
            return await self._tesseract_ocr(processed_image, languages)
        elif engine == OCREngine.EASYOCR:
            return await self._easyocr_ocr(processed_image, languages)
        elif engine == OCREngine.PADDLEOCR:
            return await self._paddleocr_ocr(processed_image, languages)
        else:
            raise ValueError(f"Unknown OCR engine: {engine}")
    
    def _preprocess_image(self, image: Image.Image, options: Dict) -> Image.Image:
        """Apply image preprocessing for better OCR results"""
        processed = image.copy()
        
        # Convert to RGB if necessary
        if processed.mode != 'RGB':
            processed = processed.convert('RGB')
        
        # Apply preprocessing options
        if options.get('enhance_contrast', True):
            enhancer = ImageEnhance.Contrast(processed)
            processed = enhancer.enhance(1.2)
        
        if options.get('enhance_sharpness', True):
            enhancer = ImageEnhance.Sharpness(processed)
            processed = enhancer.enhance(1.1)
        
        if options.get('denoise', True):
            # Convert to OpenCV format for denoising
            cv_image = cv2.cvtColor(np.array(processed), cv2.COLOR_RGB2BGR)
            cv_image = cv2.fastNlMeansDenoisingColored(cv_image, None, 10, 10, 7, 21)
            processed = Image.fromarray(cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB))
        
        if options.get('grayscale', False):
            processed = processed.convert('L')
        
        # Resize if too small
        width, height = processed.size
        if width < 1000 or height < 1000:
            scale_factor = max(1000 / width, 1000 / height)
            new_size = (int(width * scale_factor), int(height * scale_factor))
            processed = processed.resize(new_size, Image.Resampling.LANCZOS)
        
        return processed
    
    async def _tesseract_ocr(self, image: Image.Image, languages: List[str]) -> Dict[str, Any]:
        """Process image with Tesseract OCR"""
        if not self.tesseract_available:
            raise RuntimeError("Tesseract OCR not available")
        
        start_time = time.time()
        
        # Configure Tesseract
        lang_string = '+'.join(languages)
        config = f'--oem 3 --psm 6 -l {lang_string}'
        
        # Extract text
        text = pytesseract.image_to_string(image, config=config)
        
        # Get detailed data with bounding boxes
        data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
        
        # Process bounding boxes
        bounding_boxes = []
        confidences = []
        
        for i in range(len(data['text'])):
            if int(data['conf'][i]) > 0:
                bbox = {
                    'text': data['text'][i],
                    'confidence': int(data['conf'][i]) / 100.0,
                    'left': int(data['left'][i]),
                    'top': int(data['top'][i]),
                    'width': int(data['width'][i]),
                    'height': int(data['height'][i]),
                    'level': int(data['level'][i])
                }
                bounding_boxes.append(bbox)
                confidences.append(int(data['conf'][i]))
        
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            'text': text,
            'confidence': avg_confidence / 100.0,
            'bounding_boxes': bounding_boxes,
            'processing_time': time.time() - start_time,
            'engine': 'tesseract',
            'language': lang_string,
            'metadata': {
                'total_words': len([b for b in bounding_boxes if b['text'].strip()]),
                'avg_word_confidence': avg_confidence / 100.0
            }
        }
    
    async def _easyocr_ocr(self, image: Image.Image, languages: List[str]) -> Dict[str, Any]:
        """Process image with EasyOCR"""
        if not self.easyocr_reader:
            raise RuntimeError("EasyOCR not available")
        
        start_time = time.time()
        
        # Convert PIL image to numpy array
        img_array = np.array(image)
        
        # Process with EasyOCR
        results = self.easyocr_reader.readtext(img_array)
        
        # Process results
        text_parts = []
        bounding_boxes = []
        confidences = []
        
        for (bbox, text, confidence) in results:
            text_parts.append(text)
            confidences.append(confidence)
            
            # Convert bbox format
            x_coords = [point[0] for point in bbox]
            y_coords = [point[1] for point in bbox]
            
            bounding_box = {
                'text': text,
                'confidence': confidence,
                'left': int(min(x_coords)),
                'top': int(min(y_coords)),
                'width': int(max(x_coords) - min(x_coords)),
                'height': int(max(y_coords) - min(y_coords)),
                'polygon': bbox
            }
            bounding_boxes.append(bounding_box)
        
        full_text = ' '.join(text_parts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            'text': full_text,
            'confidence': avg_confidence,
            'bounding_boxes': bounding_boxes,
            'processing_time': time.time() - start_time,
            'engine': 'easyocr',
            'language': '+'.join(languages),
            'metadata': {
                'total_detections': len(results),
                'avg_confidence': avg_confidence
            }
        }
    
    async def _paddleocr_ocr(self, image: Image.Image, languages: List[str]) -> Dict[str, Any]:
        """Process image with PaddleOCR"""
        if not self.paddleocr_reader:
            raise RuntimeError("PaddleOCR not available")
        
        start_time = time.time()
        
        # Convert PIL image to numpy array
        img_array = np.array(image)
        
        # Process with PaddleOCR
        results = self.paddleocr_reader.ocr(img_array, cls=True)
        
        # Process results
        text_parts = []
        bounding_boxes = []
        confidences = []
        
        if results and results[0]:
            for line in results[0]:
                if line:
                    bbox, (text, confidence) = line
                    text_parts.append(text)
                    confidences.append(confidence)
                    
                    # Convert bbox format
                    x_coords = [point[0] for point in bbox]
                    y_coords = [point[1] for point in bbox]
                    
                    bounding_box = {
                        'text': text,
                        'confidence': confidence,
                        'left': int(min(x_coords)),
                        'top': int(min(y_coords)),
                        'width': int(max(x_coords) - min(x_coords)),
                        'height': int(max(y_coords) - min(y_coords)),
                        'polygon': bbox
                    }
                    bounding_boxes.append(bounding_box)
        
        full_text = ' '.join(text_parts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            'text': full_text,
            'confidence': avg_confidence,
            'bounding_boxes': bounding_boxes,
            'processing_time': time.time() - start_time,
            'engine': 'paddleocr',
            'language': '+'.join(languages),
            'metadata': {
                'total_lines': len(results[0]) if results and results[0] else 0,
                'avg_confidence': avg_confidence
            }
        }
    
    async def _ensemble_ocr(self, image: Image.Image, languages: List[str]) -> Dict[str, Any]:
        """Combine results from multiple OCR engines for better accuracy"""
        start_time = time.time()
        
        # Run all available OCR engines
        engine_results = []
        
        if self.tesseract_available:
            try:
                result = await self._tesseract_ocr(image, languages)
                engine_results.append(result)
            except Exception as e:
                logger.warning(f"Tesseract failed in ensemble: {e}")
        
        if self.easyocr_reader:
            try:
                result = await self._easyocr_ocr(image, languages)
                engine_results.append(result)
            except Exception as e:
                logger.warning(f"EasyOCR failed in ensemble: {e}")
        
        if self.paddleocr_reader:
            try:
                result = await self._paddleocr_ocr(image, languages)
                engine_results.append(result)
            except Exception as e:
                logger.warning(f"PaddleOCR failed in ensemble: {e}")
        
        if not engine_results:
            raise RuntimeError("No OCR engines available")
        
        # Combine results using weighted voting
        best_result = max(engine_results, key=lambda x: x['confidence'])
        
        # Create ensemble metadata
        ensemble_metadata = {
            'engines_used': [r['engine'] for r in engine_results],
            'individual_confidences': {r['engine']: r['confidence'] for r in engine_results},
            'best_engine': best_result['engine'],
            'consensus_score': self._calculate_consensus_score(engine_results)
        }
        
        return {
            'text': best_result['text'],
            'confidence': best_result['confidence'],
            'bounding_boxes': best_result['bounding_boxes'],
            'processing_time': time.time() - start_time,
            'engine': 'ensemble',
            'language': '+'.join(languages),
            'metadata': ensemble_metadata,
            'individual_results': engine_results
        }
    
    def _calculate_consensus_score(self, results: List[Dict]) -> float:
        """Calculate consensus score between different OCR engines"""
        if len(results) < 2:
            return 1.0
        
        # Simple text similarity based consensus
        texts = [r['text'] for r in results]
        similarities = []
        
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                # Simple character-based similarity
                text1, text2 = texts[i], texts[j]
                if not text1 or not text2:
                    similarities.append(0.0)
                    continue
                
                # Calculate Jaccard similarity on words
                words1 = set(text1.lower().split())
                words2 = set(text2.lower().split())
                
                if not words1 and not words2:
                    similarities.append(1.0)
                elif not words1 or not words2:
                    similarities.append(0.0)
                else:
                    intersection = len(words1.intersection(words2))
                    union = len(words1.union(words2))
                    similarities.append(intersection / union)
        
        return sum(similarities) / len(similarities) if similarities else 0.0
    
    def _combine_page_results(self, page_results: List[Dict]) -> Dict[str, Any]:
        """Combine results from multiple pages"""
        if not page_results:
            return {
                'text': '',
                'confidence': 0.0,
                'total_pages': 0,
                'pages': []
            }
        
        # Combine text from all pages
        full_text = '\n\n'.join([r['text'] for r in page_results if r['text'].strip()])
        
        # Calculate average confidence
        confidences = [r['confidence'] for r in page_results if r['confidence'] > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Combine metadata
        total_processing_time = sum([r['processing_time'] for r in page_results])
        
        return {
            'text': full_text,
            'confidence': avg_confidence,
            'total_pages': len(page_results),
            'pages': page_results,
            'processing_time': total_processing_time,
            'metadata': {
                'avg_confidence': avg_confidence,
                'total_processing_time': total_processing_time,
                'engines_used': list(set([r['engine'] for r in page_results]))
            }
        }
    
    async def _analyze_text(self, text: str) -> Dict[str, Any]:
        """Perform advanced text analysis"""
        analysis = {
            'word_count': len(text.split()),
            'character_count': len(text),
            'line_count': len(text.split('\n')),
            'language_detection': 'en',  # Simplified
            'document_type': self._classify_document_type(text),
            'key_entities': self._extract_entities(text),
            'readability_score': self._calculate_readability(text)
        }
        
        return analysis
    
    def _classify_document_type(self, text: str) -> str:
        """Classify document type based on content"""
        text_lower = text.lower()
        
        # Simple rule-based classification
        if any(word in text_lower for word in ['invoice', 'bill', 'payment', 'amount due']):
            return 'invoice'
        elif any(word in text_lower for word in ['contract', 'agreement', 'terms', 'conditions']):
            return 'contract'
        elif any(word in text_lower for word in ['resume', 'cv', 'experience', 'education']):
            return 'resume'
        elif any(word in text_lower for word in ['report', 'analysis', 'findings', 'conclusion']):
            return 'report'
        else:
            return 'general'
    
    def _extract_entities(self, text: str) -> List[Dict]:
        """Extract key entities from text"""
        # Simplified entity extraction
        import re
        
        entities = []
        
        # Email addresses
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        for email in emails:
            entities.append({'type': 'email', 'value': email})
        
        # Phone numbers
        phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)
        for phone in phones:
            entities.append({'type': 'phone', 'value': phone})
        
        # Dates
        dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', text)
        for date in dates:
            entities.append({'type': 'date', 'value': date})
        
        # Currency amounts
        amounts = re.findall(r'\$\d+(?:,\d{3})*(?:\.\d{2})?', text)
        for amount in amounts:
            entities.append({'type': 'currency', 'value': amount})
        
        return entities
    
    def _calculate_readability(self, text: str) -> float:
        """Calculate simple readability score"""
        if not text.strip():
            return 0.0
        
        words = text.split()
        sentences = text.split('.')
        
        if len(sentences) == 0 or len(words) == 0:
            return 0.0
        
        # Simplified Flesch Reading Ease approximation
        avg_sentence_length = len(words) / len(sentences)
        avg_syllables = sum([self._count_syllables(word) for word in words]) / len(words)
        
        score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables)
        return max(0, min(100, score)) / 100.0  # Normalize to 0-1
    
    def _count_syllables(self, word: str) -> int:
        """Count syllables in a word (simplified)"""
        word = word.lower()
        vowels = 'aeiouy'
        syllable_count = 0
        previous_was_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not previous_was_vowel:
                syllable_count += 1
            previous_was_vowel = is_vowel
        
        # Handle silent e
        if word.endswith('e'):
            syllable_count -= 1
        
        return max(1, syllable_count)