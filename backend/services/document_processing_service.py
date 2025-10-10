import os
import hashlib
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import json
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from fastapi import HTTPException, UploadFile

# Set up logger
logger = logging.getLogger(__name__)

# Optional imports with graceful fallbacks
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False
    logger.warning("pytesseract not available. OCR functionality will be limited.")

try:
    from PIL import Image, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("PIL not available. Image processing will be limited.")

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("OpenCV not available. Advanced image processing will be limited.")

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    from docx import Document as DocxDocument
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

try:
    import openpyxl
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

try:
    from pptx import Presentation
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

try:
    import textract
    TEXTRACT_AVAILABLE = True
except ImportError:
    TEXTRACT_AVAILABLE = False

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from models.document_processing_models import (
    DocumentProcessingJob, OCRResult, DocumentClassificationResult,
    ContentExtractionResult, DocumentConversionResult, AIAnalysisResult,
    ProcessingTemplate, ProcessingQueue, ProcessingStatus, ProcessingType,
    DocumentClassification, ConversionFormat
)
from models.document import Document
from schemas.document_processing_schemas import (
    DocumentProcessingJobCreate, DocumentProcessingJobUpdate,
    OCRResultCreate, DocumentClassificationResultCreate,
    ContentExtractionResultCreate, DocumentConversionResultCreate,
    AIAnalysisResultCreate, ProcessingTemplateCreate,
    OCRConfiguration, ClassificationConfiguration,
    ConversionConfiguration, AIAnalysisConfiguration
)
from core.config import settings

logger = logging.getLogger(__name__)

class DocumentProcessingService:
    def __init__(self):
        self.nlp = None
        self.classification_model = None
        self.vectorizer = None
        self._load_models()
    
    def _load_models(self):
        """Load ML models and NLP components"""
        if SPACY_AVAILABLE:
            try:
                # Load spaCy model for NER and text processing
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy model not found. Install with: python -m spacy download en_core_web_sm")
        
        if SKLEARN_AVAILABLE:
            try:
                # Load pre-trained classification model if exists
                model_path = Path("models/document_classifier.joblib")
                vectorizer_path = Path("models/document_vectorizer.joblib")
                
                if model_path.exists() and vectorizer_path.exists():
                    self.classification_model = joblib.load(model_path)
                    self.vectorizer = joblib.load(vectorizer_path)
            except Exception as e:
                logger.warning(f"Could not load classification model: {e}")
    
    # Job Management
    async def create_processing_job(
        self, 
        db: Session, 
        job_data: DocumentProcessingJobCreate, 
        user_id: int
    ) -> DocumentProcessingJob:
        """Create a new document processing job"""
        
        # Verify document exists and user has access
        document = db.query(Document).filter(Document.id == job_data.document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Create processing job
        job = DocumentProcessingJob(
            document_id=job_data.document_id,
            user_id=user_id,
            processing_type=job_data.processing_type,
            priority=job_data.priority,
            configuration=job_data.configuration,
            status=ProcessingStatus.PENDING
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Add to processing queue
        await self._add_to_queue(db, job)
        
        return job
    
    async def _add_to_queue(self, db: Session, job: DocumentProcessingJob):
        """Add job to processing queue"""
        queue_entry = ProcessingQueue(
            job_id=job.id,
            queue_name="default",
            priority=job.priority,
            scheduled_at=datetime.utcnow(),
            status=ProcessingStatus.PENDING
        )
        
        db.add(queue_entry)
        db.commit()
    
    async def update_job_status(
        self, 
        db: Session, 
        job_id: int, 
        status: ProcessingStatus,
        progress: Optional[float] = None,
        current_step: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Update job status and progress"""
        job = db.query(DocumentProcessingJob).filter(DocumentProcessingJob.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Processing job not found")
        
        job.status = status
        if progress is not None:
            job.progress_percentage = progress
        if current_step:
            job.current_step = current_step
        if error_message:
            job.error_message = error_message
        
        if status == ProcessingStatus.IN_PROGRESS and not job.started_at:
            job.started_at = datetime.utcnow()
        elif status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]:
            job.completed_at = datetime.utcnow()
            if job.started_at:
                job.processing_time_seconds = (job.completed_at - job.started_at).total_seconds()
        
        db.commit()
        db.refresh(job)
        return job
    
    # OCR Processing
    async def perform_ocr(
        self, 
        db: Session, 
        job_id: int, 
        config: Optional[OCRConfiguration] = None
    ) -> OCRResult:
        """Perform OCR on document"""
        
        if not PYTESSERACT_AVAILABLE or not PIL_AVAILABLE:
            raise HTTPException(
                status_code=500, 
                detail="OCR dependencies not available. Please install pytesseract and PIL."
            )
        
        job = db.query(DocumentProcessingJob).filter(DocumentProcessingJob.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Processing job not found")
        
        document = job.document
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 0, "Starting OCR")
        
        try:
            # Load configuration
            if not config:
                config = OCRConfiguration(**job.configuration.get('ocr', {}))
            
            # Load and preprocess image
            image_path = document.file_path
            image = self._load_and_preprocess_image(image_path, config.preprocessing_steps)
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 25, "Preprocessing image")
            
            # Perform OCR
            custom_config = f'--oem 3 --psm {config.page_segmentation_mode or 6} -l {config.language}'
            
            # Extract text
            extracted_text = pytesseract.image_to_string(image, config=custom_config)
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 50, "Extracting text")
            
            # Get confidence scores
            data = pytesseract.image_to_data(image, config=custom_config, output_type=pytesseract.Output.DICT)
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 75, "Analyzing confidence")
            
            # Extract text regions with bounding boxes
            text_regions = self._extract_text_regions(data)
            
            # Calculate quality scores
            text_quality = self._calculate_text_quality(extracted_text)
            image_quality = self._calculate_image_quality(image)
            
            # Create OCR result
            ocr_result = OCRResult(
                processing_job_id=job_id,
                document_id=document.id,
                ocr_engine="tesseract",
                engine_version=pytesseract.get_tesseract_version(),
                language=config.language,
                extracted_text=extracted_text,
                confidence_score=avg_confidence / 100.0,
                text_regions=text_regions,
                processing_time_seconds=(datetime.utcnow() - job.started_at).total_seconds(),
                image_preprocessing_applied=config.preprocessing_steps,
                text_quality_score=text_quality,
                image_quality_score=image_quality
            )
            
            db.add(ocr_result)
            
            # Update job
            job.result_data = {
                "extracted_text": extracted_text,
                "confidence_score": avg_confidence / 100.0,
                "text_regions_count": len(text_regions)
            }
            
            await self.update_job_status(db, job_id, ProcessingStatus.COMPLETED, 100, "OCR completed")
            
            db.commit()
            db.refresh(ocr_result)
            
            return ocr_result
            
        except Exception as e:
            logger.error(f"OCR processing failed for job {job_id}: {str(e)}")
            await self.update_job_status(db, job_id, ProcessingStatus.FAILED, error_message=str(e))
            raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
    
    def _load_and_preprocess_image(self, image_path: str, preprocessing_steps: List[str]) -> Image.Image:
        """Load and preprocess image for OCR"""
        if not PIL_AVAILABLE:
            raise HTTPException(status_code=500, detail="PIL not available for image processing")
            
        image = Image.open(image_path)
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Apply preprocessing steps
        for step in preprocessing_steps:
            if step == "enhance_contrast":
                enhancer = ImageEnhance.Contrast(image)
                image = enhancer.enhance(1.5)
            elif step == "enhance_sharpness":
                enhancer = ImageEnhance.Sharpness(image)
                image = enhancer.enhance(2.0)
            elif step == "denoise" and CV2_AVAILABLE:
                # Convert to OpenCV format for denoising
                cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                cv_image = cv2.fastNlMeansDenoisingColored(cv_image, None, 10, 10, 7, 21)
                image = Image.fromarray(cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB))
            elif step == "grayscale":
                image = image.convert('L')
        
        return image
    
    def _extract_text_regions(self, ocr_data: Dict) -> List[Dict]:
        """Extract text regions with bounding boxes"""
        regions = []
        n_boxes = len(ocr_data['level'])
        
        for i in range(n_boxes):
            if int(ocr_data['conf'][i]) > 0:
                region = {
                    'text': ocr_data['text'][i],
                    'confidence': int(ocr_data['conf'][i]),
                    'left': int(ocr_data['left'][i]),
                    'top': int(ocr_data['top'][i]),
                    'width': int(ocr_data['width'][i]),
                    'height': int(ocr_data['height'][i]),
                    'level': int(ocr_data['level'][i])
                }
                regions.append(region)
        
        return regions
    
    def _calculate_text_quality(self, text: str) -> float:
        """Calculate text quality score based on various metrics"""
        if not text:
            return 0.0
        
        # Basic quality metrics
        total_chars = len(text)
        alpha_chars = sum(c.isalpha() for c in text)
        digit_chars = sum(c.isdigit() for c in text)
        space_chars = sum(c.isspace() for c in text)
        
        # Calculate ratios
        alpha_ratio = alpha_chars / total_chars if total_chars > 0 else 0
        digit_ratio = digit_chars / total_chars if total_chars > 0 else 0
        space_ratio = space_chars / total_chars if total_chars > 0 else 0
        
        # Quality score based on character distribution
        quality_score = (alpha_ratio * 0.6 + digit_ratio * 0.2 + space_ratio * 0.2)
        
        return min(quality_score, 1.0)
    
    def _calculate_image_quality(self, image: Image.Image) -> float:
        """Calculate image quality score"""
        # Convert to grayscale for analysis
        gray_image = image.convert('L')
        img_array = np.array(gray_image)
        
        # Calculate variance (higher variance = better quality)
        variance = np.var(img_array)
        
        # Normalize variance to 0-1 scale (rough approximation)
        quality_score = min(variance / 10000.0, 1.0)
        
        return quality_score
    
    # Document Classification
    async def classify_document(
        self, 
        db: Session, 
        job_id: int, 
        config: Optional[ClassificationConfiguration] = None
    ) -> DocumentClassificationResult:
        """Classify document using ML model"""
        
        job = db.query(DocumentProcessingJob).filter(DocumentProcessingJob.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Processing job not found")
        
        document = job.document
        await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 0, "Starting classification")
        
        try:
            if not config:
                config = ClassificationConfiguration(**job.configuration.get('classification', {}))
            
            # Get document content for classification
            content = await self._get_document_content(document)
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 25, "Extracting features")
            
            # Extract features
            features = self._extract_classification_features(document, content, config)
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 50, "Running classification")
            
            # Perform classification
            if self.classification_model and self.vectorizer:
                # Use trained model
                predicted_class, confidence, probabilities = self._classify_with_model(features)
            else:
                # Use rule-based classification
                predicted_class, confidence, probabilities = self._classify_with_rules(document, content)
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 75, "Saving results")
            
            # Create classification result
            classification_result = DocumentClassificationResult(
                processing_job_id=job_id,
                document_id=document.id,
                predicted_class=predicted_class,
                confidence_score=confidence,
                class_probabilities=probabilities,
                model_name=config.model_name,
                features_used=list(features.keys()) if isinstance(features, dict) else []
            )
            
            db.add(classification_result)
            
            # Update job
            job.result_data = {
                "predicted_class": predicted_class.value if predicted_class else None,
                "confidence_score": confidence,
                "class_probabilities": probabilities
            }
            
            await self.update_job_status(db, job_id, ProcessingStatus.COMPLETED, 100, "Classification completed")
            
            db.commit()
            db.refresh(classification_result)
            
            return classification_result
            
        except Exception as e:
            logger.error(f"Classification failed for job {job_id}: {str(e)}")
            await self.update_job_status(db, job_id, ProcessingStatus.FAILED, error_message=str(e))
            raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
    
    async def _get_document_content(self, document: Document) -> str:
        """Extract text content from document"""
        try:
            file_path = document.file_path
            file_extension = Path(file_path).suffix.lower()
            
            if file_extension == '.pdf':
                return self._extract_pdf_text(file_path)
            elif file_extension in ['.doc', '.docx']:
                return self._extract_docx_text(file_path)
            elif file_extension in ['.txt']:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                # Use textract for other formats
                return textract.process(file_path).decode('utf-8')
        except Exception as e:
            logger.warning(f"Could not extract content from {document.filename}: {e}")
            return ""
    
    def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF"""
        if not PYPDF2_AVAILABLE:
            logger.warning("PyPDF2 not available for PDF text extraction")
            return ""
            
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text()
        except Exception as e:
            logger.warning(f"Could not extract PDF text: {e}")
        return text
    
    def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX"""
        if not DOCX_AVAILABLE:
            logger.warning("python-docx not available for DOCX text extraction")
            return ""
            
        try:
            doc = DocxDocument(file_path)
            return '\n'.join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            logger.warning(f"Could not extract DOCX text: {e}")
            return ""
    
    def _extract_classification_features(
        self, 
        document: Document, 
        content: str, 
        config: ClassificationConfiguration
    ) -> Dict[str, Any]:
        """Extract features for document classification"""
        features = {}
        
        if config.use_filename:
            features['filename'] = document.filename.lower()
            features['file_extension'] = Path(document.filename).suffix.lower()
        
        if config.use_content and content:
            features['content'] = content.lower()
            features['content_length'] = len(content)
            features['word_count'] = len(content.split())
        
        if config.use_metadata:
            features['mime_type'] = document.mime_type
            features['file_size'] = document.file_size
        
        return features
    
    def _classify_with_model(self, features: Dict[str, Any]) -> tuple:
        """Classify using trained ML model"""
        # This would use the actual trained model
        # For now, return default classification
        return DocumentClassification.OTHER, 0.5, {cls.value: 0.1 for cls in DocumentClassification}
    
    def _classify_with_rules(self, document: Document, content: str) -> tuple:
        """Rule-based document classification"""
        filename = document.filename.lower()
        content_lower = content.lower()
        
        # Initialize probabilities
        probabilities = {cls.value: 0.0 for cls in DocumentClassification}
        
        # Rule-based classification
        if 'invoice' in filename or 'bill' in filename:
            probabilities[DocumentClassification.INVOICE.value] = 0.8
        elif 'contract' in filename or 'agreement' in filename:
            probabilities[DocumentClassification.CONTRACT.value] = 0.8
        elif 'report' in filename:
            probabilities[DocumentClassification.REPORT.value] = 0.7
        elif document.mime_type.startswith('image/'):
            probabilities[DocumentClassification.IMAGE.value] = 0.9
        elif 'presentation' in filename or document.mime_type.startswith('application/vnd.ms-powerpoint'):
            probabilities[DocumentClassification.PRESENTATION.value] = 0.8
        elif document.mime_type.startswith('application/vnd.ms-excel'):
            probabilities[DocumentClassification.SPREADSHEET.value] = 0.8
        else:
            probabilities[DocumentClassification.OTHER.value] = 0.6
        
        # Content-based rules
        if content_lower:
            if any(word in content_lower for word in ['invoice', 'bill', 'amount due', 'payment']):
                probabilities[DocumentClassification.INVOICE.value] += 0.2
            elif any(word in content_lower for word in ['contract', 'agreement', 'terms', 'conditions']):
                probabilities[DocumentClassification.CONTRACT.value] += 0.2
        
        # Get best prediction
        best_class = max(probabilities, key=probabilities.get)
        confidence = probabilities[best_class]
        
        return DocumentClassification(best_class), confidence, probabilities
    
    # Content Extraction
    async def extract_content(
        self, 
        db: Session, 
        job_id: int
    ) -> ContentExtractionResult:
        """Extract structured content from document"""
        
        job = db.query(DocumentProcessingJob).filter(DocumentProcessingJob.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Processing job not found")
        
        document = job.document
        await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 0, "Starting content extraction")
        
        try:
            # Get document content
            content = await self._get_document_content(document)
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 25, "Extracting entities")
            
            # Extract entities using spaCy
            entities = self._extract_entities(content) if self.nlp else []
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 50, "Extracting key-value pairs")
            
            # Extract key-value pairs
            key_value_pairs = self._extract_key_value_pairs(content)
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 75, "Calculating statistics")
            
            # Calculate content statistics
            word_count = len(content.split()) if content else 0
            character_count = len(content) if content else 0
            
            # Create extraction result
            extraction_result = ContentExtractionResult(
                processing_job_id=job_id,
                document_id=document.id,
                extracted_content={"full_text": content},
                entities=entities,
                key_value_pairs=key_value_pairs,
                word_count=word_count,
                character_count=character_count,
                extraction_method="spacy_nlp",
                extraction_confidence=0.8
            )
            
            db.add(extraction_result)
            
            # Update job
            job.result_data = {
                "word_count": word_count,
                "character_count": character_count,
                "entities_count": len(entities),
                "key_value_pairs_count": len(key_value_pairs)
            }
            
            await self.update_job_status(db, job_id, ProcessingStatus.COMPLETED, 100, "Content extraction completed")
            
            db.commit()
            db.refresh(extraction_result)
            
            return extraction_result
            
        except Exception as e:
            logger.error(f"Content extraction failed for job {job_id}: {str(e)}")
            await self.update_job_status(db, job_id, ProcessingStatus.FAILED, error_message=str(e))
            raise HTTPException(status_code=500, detail=f"Content extraction failed: {str(e)}")
    
    def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract named entities from text"""
        if not self.nlp or not text:
            return []
        
        doc = self.nlp(text)
        entities = []
        
        for ent in doc.ents:
            entities.append({
                "text": ent.text,
                "label": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char,
                "confidence": 0.8  # spaCy doesn't provide confidence scores by default
            })
        
        return entities
    
    def _extract_key_value_pairs(self, text: str) -> Dict[str, Any]:
        """Extract key-value pairs from text using regex patterns"""
        import re
        
        pairs = {}
        
        # Common patterns for invoices and forms
        patterns = {
            'invoice_number': r'(?:invoice\s*#?|inv\s*#?)\s*:?\s*([A-Z0-9\-]+)',
            'date': r'(?:date|dated)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
            'amount': r'(?:total|amount|sum)\s*:?\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)',
            'email': r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
            'phone': r'(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})'
        }
        
        for key, pattern in patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                pairs[key] = matches[0] if len(matches) == 1 else matches
        
        return pairs
    
    # Document Conversion
    async def convert_document(
        self, 
        db: Session, 
        job_id: int, 
        config: ConversionConfiguration
    ) -> DocumentConversionResult:
        """Convert document to different format"""
        
        job = db.query(DocumentProcessingJob).filter(DocumentProcessingJob.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Processing job not found")
        
        document = job.document
        await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 0, "Starting conversion")
        
        try:
            source_path = Path(document.file_path)
            source_format = source_path.suffix.lower().lstrip('.')
            
            # Generate output filename
            output_filename = f"{source_path.stem}_converted.{config.target_format.value}"
            output_path = source_path.parent / output_filename
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 25, "Converting file")
            
            # Perform conversion based on target format
            conversion_success = await self._perform_conversion(
                source_path, output_path, source_format, config
            )
            
            if not conversion_success:
                raise Exception("Conversion failed")
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 75, "Calculating file hash")
            
            # Calculate file hash
            file_hash = self._calculate_file_hash(output_path)
            file_size = output_path.stat().st_size
            
            # Create conversion result
            conversion_result = DocumentConversionResult(
                processing_job_id=job_id,
                document_id=document.id,
                source_format=source_format,
                target_format=config.target_format,
                converted_file_path=str(output_path),
                converted_file_size=file_size,
                converted_file_hash=file_hash,
                conversion_quality_score=0.9,  # Would be calculated based on actual conversion
                conversion_tool="python_libraries",
                conversion_parameters=config.dict()
            )
            
            db.add(conversion_result)
            
            # Update job
            job.result_data = {
                "converted_file_path": str(output_path),
                "source_format": source_format,
                "target_format": config.target_format.value,
                "file_size": file_size
            }
            
            await self.update_job_status(db, job_id, ProcessingStatus.COMPLETED, 100, "Conversion completed")
            
            db.commit()
            db.refresh(conversion_result)
            
            return conversion_result
            
        except Exception as e:
            logger.error(f"Document conversion failed for job {job_id}: {str(e)}")
            await self.update_job_status(db, job_id, ProcessingStatus.FAILED, error_message=str(e))
            raise HTTPException(status_code=500, detail=f"Document conversion failed: {str(e)}")
    
    async def _perform_conversion(
        self, 
        source_path: Path, 
        output_path: Path, 
        source_format: str, 
        config: ConversionConfiguration
    ) -> bool:
        """Perform the actual document conversion"""
        try:
            if config.target_format == ConversionFormat.TXT:
                # Convert to text
                content = await self._get_document_content_from_path(str(source_path))
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
            
            elif config.target_format == ConversionFormat.PDF:
                # Convert to PDF (would need additional libraries like reportlab)
                # For now, just copy if already PDF
                if source_format == 'pdf':
                    import shutil
                    shutil.copy2(source_path, output_path)
                    return True
            
            # Add more conversion logic here
            return False
            
        except Exception as e:
            logger.error(f"Conversion error: {e}")
            return False
    
    async def _get_document_content_from_path(self, file_path: str) -> str:
        """Extract content from file path"""
        # Similar to _get_document_content but works with file path directly
        try:
            file_extension = Path(file_path).suffix.lower()
            
            if file_extension == '.pdf':
                return self._extract_pdf_text(file_path)
            elif file_extension in ['.doc', '.docx']:
                return self._extract_docx_text(file_path)
            elif file_extension in ['.txt']:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                return textract.process(file_path).decode('utf-8')
        except Exception as e:
            logger.warning(f"Could not extract content from {file_path}: {e}")
            return ""
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    # AI Analysis
    async def perform_ai_analysis(
        self, 
        db: Session, 
        job_id: int, 
        config: AIAnalysisConfiguration
    ) -> AIAnalysisResult:
        """Perform AI-powered document analysis"""
        
        job = db.query(DocumentProcessingJob).filter(DocumentProcessingJob.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Processing job not found")
        
        document = job.document
        await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 0, "Starting AI analysis")
        
        try:
            # Get document content
            content = await self._get_document_content(document)
            
            if not content:
                raise Exception("No content available for analysis")
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 25, "Analyzing content")
            
            # Perform different types of analysis
            analysis_results = {}
            
            if config.include_sentiment:
                sentiment = await self._analyze_sentiment(content)
                analysis_results['sentiment'] = sentiment
            
            if config.include_summary:
                summary = await self._generate_summary(content, config)
                analysis_results['summary'] = summary
            
            if config.include_keywords:
                keywords = await self._extract_keywords(content)
                analysis_results['keywords'] = keywords
            
            await self.update_job_status(db, job_id, ProcessingStatus.IN_PROGRESS, 75, "Finalizing analysis")
            
            # Create AI analysis result
            ai_result = AIAnalysisResult(
                processing_job_id=job_id,
                document_id=document.id,
                analysis_type="comprehensive",
                model_name=config.model_name,
                model_provider=config.model_provider,
                analysis_results=analysis_results,
                summary=analysis_results.get('summary'),
                keywords=analysis_results.get('keywords', []),
                sentiment_analysis=analysis_results.get('sentiment', {}),
                processing_time_seconds=(datetime.utcnow() - job.started_at).total_seconds()
            )
            
            db.add(ai_result)
            
            # Update job
            job.result_data = {
                "analysis_types": list(analysis_results.keys()),
                "summary_length": len(analysis_results.get('summary', '')),
                "keywords_count": len(analysis_results.get('keywords', []))
            }
            
            await self.update_job_status(db, job_id, ProcessingStatus.COMPLETED, 100, "AI analysis completed")
            
            db.commit()
            db.refresh(ai_result)
            
            return ai_result
            
        except Exception as e:
            logger.error(f"AI analysis failed for job {job_id}: {str(e)}")
            await self.update_job_status(db, job_id, ProcessingStatus.FAILED, error_message=str(e))
            raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
    
    async def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text"""
        try:
            # Use transformers pipeline for sentiment analysis
            sentiment_pipeline = pipeline("sentiment-analysis")
            result = sentiment_pipeline(text[:512])  # Limit text length
            
            return {
                "label": result[0]["label"],
                "score": result[0]["score"]
            }
        except Exception as e:
            logger.warning(f"Sentiment analysis failed: {e}")
            return {"label": "NEUTRAL", "score": 0.5}
    
    async def _generate_summary(self, text: str, config: AIAnalysisConfiguration) -> str:
        """Generate document summary"""
        try:
            # Use transformers pipeline for summarization
            summarizer = pipeline("summarization")
            
            # Limit input text length
            max_input_length = 1024
            if len(text) > max_input_length:
                text = text[:max_input_length]
            
            summary = summarizer(text, max_length=150, min_length=30, do_sample=False)
            return summary[0]["summary_text"]
            
        except Exception as e:
            logger.warning(f"Summary generation failed: {e}")
            # Fallback: return first few sentences
            sentences = text.split('.')[:3]
            return '. '.join(sentences) + '.'
    
    async def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        try:
            # Simple TF-IDF based keyword extraction
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
            
            # Preprocess text
            words = text.lower().split()
            words = [word for word in words if word.isalpha() and word not in ENGLISH_STOP_WORDS]
            
            if len(words) < 5:
                return words[:5]
            
            # Use TF-IDF to find important words
            vectorizer = TfidfVectorizer(max_features=10, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform([' '.join(words)])
            
            feature_names = vectorizer.get_feature_names_out()
            tfidf_scores = tfidf_matrix.toarray()[0]
            
            # Get top keywords
            keyword_scores = list(zip(feature_names, tfidf_scores))
            keyword_scores.sort(key=lambda x: x[1], reverse=True)
            
            return [keyword for keyword, score in keyword_scores[:10]]
            
        except Exception as e:
            logger.warning(f"Keyword extraction failed: {e}")
            # Fallback: return most common words
            words = text.lower().split()
            word_freq = {}
            for word in words:
                if word.isalpha() and len(word) > 3:
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            return sorted(word_freq.keys(), key=word_freq.get, reverse=True)[:10]
    
    # Batch Processing
    async def create_batch_processing_jobs(
        self, 
        db: Session, 
        document_ids: List[int], 
        processing_types: List[ProcessingType],
        user_id: int,
        template_id: Optional[int] = None,
        configuration: Optional[Dict[str, Any]] = None,
        priority: int = 5
    ) -> List[DocumentProcessingJob]:
        """Create multiple processing jobs for batch processing"""
        
        jobs = []
        
        for document_id in document_ids:
            for processing_type in processing_types:
                job_data = DocumentProcessingJobCreate(
                    document_id=document_id,
                    processing_type=processing_type,
                    priority=priority,
                    configuration=configuration or {}
                )
                
                job = await self.create_processing_job(db, job_data, user_id)
                jobs.append(job)
        
        return jobs
    
    # Statistics and Monitoring
    def get_processing_statistics(self, db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Get processing statistics"""
        
        query = db.query(DocumentProcessingJob)
        if user_id:
            query = query.filter(DocumentProcessingJob.user_id == user_id)
        
        total_jobs = query.count()
        completed_jobs = query.filter(DocumentProcessingJob.status == ProcessingStatus.COMPLETED).count()
        failed_jobs = query.filter(DocumentProcessingJob.status == ProcessingStatus.FAILED).count()
        pending_jobs = query.filter(DocumentProcessingJob.status == ProcessingStatus.PENDING).count()
        in_progress_jobs = query.filter(DocumentProcessingJob.status == ProcessingStatus.IN_PROGRESS).count()
        
        success_rate = (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
        
        # Average processing time for completed jobs
        completed_jobs_with_time = query.filter(
            and_(
                DocumentProcessingJob.status == ProcessingStatus.COMPLETED,
                DocumentProcessingJob.processing_time_seconds.isnot(None)
            )
        ).all()
        
        avg_processing_time = None
        if completed_jobs_with_time:
            total_time = sum(job.processing_time_seconds for job in completed_jobs_with_time)
            avg_processing_time = total_time / len(completed_jobs_with_time)
        
        # Jobs by type
        jobs_by_type = {}
        for processing_type in ProcessingType:
            count = query.filter(DocumentProcessingJob.processing_type == processing_type).count()
            jobs_by_type[processing_type.value] = count
        
        # Jobs by status
        jobs_by_status = {
            ProcessingStatus.PENDING.value: pending_jobs,
            ProcessingStatus.IN_PROGRESS.value: in_progress_jobs,
            ProcessingStatus.COMPLETED.value: completed_jobs,
            ProcessingStatus.FAILED.value: failed_jobs
        }
        
        return {
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs,
            "failed_jobs": failed_jobs,
            "pending_jobs": pending_jobs,
            "in_progress_jobs": in_progress_jobs,
            "success_rate": success_rate,
            "average_processing_time": avg_processing_time,
            "jobs_by_type": jobs_by_type,
            "jobs_by_status": jobs_by_status
        }

# Create service instance
document_processing_service = DocumentProcessingService()