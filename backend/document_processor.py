"""
ARIA Document Processing System
Comprehensive OCR, Classification, and AI-powered document analysis using Ollama Llama 3.2
"""

import os
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import hashlib
import re

# OCR and Image Processing
import pytesseract
from PIL import Image
import pdf2image
import cv2
import numpy as np

# HTTP client for Ollama
import requests

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Advanced document processing with OCR and AI classification using Ollama Llama 3.2"""
    
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.supported_formats = {
            'images': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif'],
            'documents': ['.pdf'],
            'text': ['.txt', '.doc', '.docx']
        }
        
        # Document categories for AI classification
        self.document_categories = [
            "Invoice", "Receipt", "Contract", "Legal Document", "Financial Statement",
            "Report", "Memo", "Letter", "Form", "Certificate", "ID Document",
            "Medical Record", "Insurance Document", "Tax Document", "Other"
        ]
        
        # Create processing directories
        self.temp_dir = Path("temp_processing")
        self.temp_dir.mkdir(exist_ok=True)
        
    def process_document(self, file_path: str, filename: str) -> Dict:
        """
        Complete document processing pipeline
        Returns comprehensive document analysis
        """
        try:
            logger.info(f"Starting document processing for: {filename}")
            
            # Initialize result structure
            result = {
                "filename": filename,
                "file_path": file_path,
                "processed_at": datetime.utcnow().isoformat(),
                "file_size": os.path.getsize(file_path),
                "file_hash": self._calculate_file_hash(file_path),
                "processing_status": "processing",
                "ocr_text": "",
                "classification": {},
                "metadata": {},
                "confidence_scores": {},
                "errors": []
            }
            
            # Determine file type and process accordingly
            file_ext = Path(filename).suffix.lower()
            
            if file_ext in self.supported_formats['images']:
                result = self._process_image(file_path, result)
            elif file_ext in self.supported_formats['documents']:
                result = self._process_pdf(file_path, result)
            elif file_ext in self.supported_formats['text']:
                result = self._process_text_file(file_path, result)
            else:
                result["errors"].append(f"Unsupported file format: {file_ext}")
                result["processing_status"] = "error"
                return result
            
            # AI-powered classification and analysis
            if result["ocr_text"] and not result["errors"]:
                result = self._classify_document(result)
                result = self._extract_metadata(result)
                result = self._analyze_content(result)
            
            result["processing_status"] = "completed" if not result["errors"] else "completed_with_errors"
            logger.info(f"Document processing completed for: {filename}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing document {filename}: {str(e)}")
            result["errors"].append(f"Processing error: {str(e)}")
            result["processing_status"] = "error"
            return result
    
    def _process_image(self, file_path: str, result: Dict) -> Dict:
        """Process image files with OCR"""
        try:
            # Load and preprocess image
            image = cv2.imread(file_path)
            if image is None:
                # Try with PIL for other formats
                pil_image = Image.open(file_path)
                image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            # Image preprocessing for better OCR
            processed_image = self._preprocess_image(image)
            
            # Perform OCR
            ocr_text = pytesseract.image_to_string(processed_image, lang='eng')
            result["ocr_text"] = ocr_text.strip()
            
            # Get OCR confidence and word-level data
            ocr_data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
            confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
            result["confidence_scores"]["ocr_average"] = sum(confidences) / len(confidences) if confidences else 0
            
            # Image metadata
            result["metadata"]["image_dimensions"] = f"{image.shape[1]}x{image.shape[0]}"
            result["metadata"]["color_channels"] = image.shape[2] if len(image.shape) > 2 else 1
            
            logger.info(f"OCR extracted {len(result['ocr_text'])} characters from image")
            
        except Exception as e:
            result["errors"].append(f"Image processing error: {str(e)}")
            logger.error(f"Image processing error: {str(e)}")
        
        return result
    
    def _process_pdf(self, file_path: str, result: Dict) -> Dict:
        """Process PDF files with OCR"""
        try:
            # Convert PDF to images
            images = pdf2image.convert_from_path(file_path)
            result["metadata"]["pdf_pages"] = len(images)
            
            all_text = []
            total_confidence = []
            
            for page_num, image in enumerate(images, 1):
                # Convert PIL image to OpenCV format
                cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                processed_image = self._preprocess_image(cv_image)
                
                # Perform OCR on each page
                page_text = pytesseract.image_to_string(processed_image, lang='eng')
                all_text.append(f"--- Page {page_num} ---\n{page_text}")
                
                # Get confidence scores
                ocr_data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
                confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
                if confidences:
                    total_confidence.extend(confidences)
            
            result["ocr_text"] = "\n\n".join(all_text).strip()
            result["confidence_scores"]["ocr_average"] = sum(total_confidence) / len(total_confidence) if total_confidence else 0
            
            logger.info(f"OCR extracted text from {len(images)} PDF pages")
            
        except Exception as e:
            result["errors"].append(f"PDF processing error: {str(e)}")
            logger.error(f"PDF processing error: {str(e)}")
        
        return result
    
    def _process_text_file(self, file_path: str, result: Dict) -> Dict:
        """Process text files"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                result["ocr_text"] = f.read()
            
            result["confidence_scores"]["ocr_average"] = 100  # Text files have 100% confidence
            result["metadata"]["character_count"] = len(result["ocr_text"])
            result["metadata"]["word_count"] = len(result["ocr_text"].split())
            
            logger.info(f"Loaded text file with {len(result['ocr_text'])} characters")
            
        except Exception as e:
            result["errors"].append(f"Text file processing error: {str(e)}")
            logger.error(f"Text file processing error: {str(e)}")
        
        return result
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR results"""
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Apply denoising
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations to clean up
        kernel = np.ones((1, 1), np.uint8)
        processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return processed
    
    def _classify_document(self, result: Dict) -> Dict:
        """AI-powered document classification using Ollama"""
        try:
            text_sample = result["ocr_text"][:2000]  # Use first 2000 characters
            
            prompt = f"""
            Analyze this document text and classify it into one of these categories:
            {', '.join(self.document_categories)}
            
            Document text:
            {text_sample}
            
            Respond with ONLY a JSON object in this format:
            {{
                "category": "category_name",
                "confidence": 0.95,
                "reasoning": "brief explanation"
            }}
            """
            
            classification = self._query_ollama(prompt)
            
            if classification:
                try:
                    # Try to extract JSON from response
                    json_match = re.search(r'\{.*\}', classification, re.DOTALL)
                    if json_match:
                        class_data = json.loads(json_match.group())
                        result["classification"] = {
                            "category": class_data.get("category", "Other"),
                            "confidence": float(class_data.get("confidence", 0.5)),
                            "reasoning": class_data.get("reasoning", "AI classification")
                        }
                        result["confidence_scores"]["classification"] = result["classification"]["confidence"]
                    else:
                        # Fallback: extract category from text response
                        for category in self.document_categories:
                            if category.lower() in classification.lower():
                                result["classification"] = {
                                    "category": category,
                                    "confidence": 0.7,
                                    "reasoning": "Pattern matching classification"
                                }
                                break
                        else:
                            result["classification"] = {
                                "category": "Other",
                                "confidence": 0.5,
                                "reasoning": "Unable to classify"
                            }
                except json.JSONDecodeError:
                    result["classification"] = {
                        "category": "Other",
                        "confidence": 0.5,
                        "reasoning": "JSON parsing failed"
                    }
            
            logger.info(f"Document classified as: {result['classification']['category']}")
            
        except Exception as e:
            result["errors"].append(f"Classification error: {str(e)}")
            logger.error(f"Classification error: {str(e)}")
        
        return result
    
    def _extract_metadata(self, result: Dict) -> Dict:
        """Extract metadata using AI analysis"""
        try:
            text_sample = result["ocr_text"][:1500]
            
            prompt = f"""
            Extract key metadata from this document text. Look for:
            - Dates (creation, due, effective dates)
            - Names (people, companies, organizations)
            - Amounts (monetary values, quantities)
            - Document numbers (invoice numbers, IDs, reference numbers)
            - Contact information (emails, phones, addresses)
            
            Document text:
            {text_sample}
            
            Respond with ONLY a JSON object with the extracted information:
            {{
                "dates": ["date1", "date2"],
                "names": ["name1", "name2"],
                "amounts": ["$100.00", "25 units"],
                "document_numbers": ["INV-001", "REF-123"],
                "contact_info": ["email@example.com", "123-456-7890"]
            }}
            """
            
            metadata_response = self._query_ollama(prompt)
            
            if metadata_response:
                try:
                    json_match = re.search(r'\{.*\}', metadata_response, re.DOTALL)
                    if json_match:
                        extracted_metadata = json.loads(json_match.group())
                        result["metadata"].update(extracted_metadata)
                except json.JSONDecodeError:
                    logger.warning("Could not parse metadata JSON response")
            
            logger.info("Metadata extraction completed")
            
        except Exception as e:
            result["errors"].append(f"Metadata extraction error: {str(e)}")
            logger.error(f"Metadata extraction error: {str(e)}")
        
        return result
    
    def _analyze_content(self, result: Dict) -> Dict:
        """Perform content analysis and generate summary"""
        try:
            text_sample = result["ocr_text"][:2000]
            
            prompt = f"""
            Analyze this document and provide:
            1. A brief summary (2-3 sentences)
            2. Key topics or themes
            3. Important entities mentioned
            4. Document quality assessment
            
            Document text:
            {text_sample}
            
            Respond with ONLY a JSON object:
            {{
                "summary": "brief summary",
                "key_topics": ["topic1", "topic2"],
                "entities": ["entity1", "entity2"],
                "quality_assessment": "assessment of document quality and completeness"
            }}
            """
            
            analysis_response = self._query_ollama(prompt)
            
            if analysis_response:
                try:
                    json_match = re.search(r'\{.*\}', analysis_response, re.DOTALL)
                    if json_match:
                        analysis_data = json.loads(json_match.group())
                        result["content_analysis"] = analysis_data
                except json.JSONDecodeError:
                    logger.warning("Could not parse content analysis JSON response")
            
            logger.info("Content analysis completed")
            
        except Exception as e:
            result["errors"].append(f"Content analysis error: {str(e)}")
            logger.error(f"Content analysis error: {str(e)}")
        
        return result
    
    def _query_ollama(self, prompt: str, model: str = "llama3.2") -> Optional[str]:
        """Query Ollama API for AI processing"""
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,  # Low temperature for consistent results
                        "top_p": 0.9,
                        "max_tokens": 1000
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                logger.error(f"Ollama API error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error querying Ollama: {str(e)}")
            return None
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of file"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def search_documents(self, query: str, documents: List[Dict]) -> List[Dict]:
        """AI-powered document search"""
        try:
            # Use Ollama to understand search intent and match documents
            search_prompt = f"""
            Search query: "{query}"
            
            Analyze this search query and identify:
            1. Key search terms
            2. Document types that might be relevant
            3. Metadata fields to prioritize
            
            Respond with ONLY a JSON object:
            {{
                "search_terms": ["term1", "term2"],
                "relevant_categories": ["category1", "category2"],
                "metadata_fields": ["field1", "field2"]
            }}
            """
            
            search_analysis = self._query_ollama(search_prompt)
            
            if search_analysis:
                try:
                    json_match = re.search(r'\{.*\}', search_analysis, re.DOTALL)
                    if json_match:
                        analysis = json.loads(json_match.group())
                        # Implement semantic search based on AI analysis
                        return self._semantic_search(query, documents, analysis)
                except json.JSONDecodeError:
                    pass
            
            # Fallback to simple text search
            return self._simple_search(query, documents)
            
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return self._simple_search(query, documents)
    
    def _semantic_search(self, query: str, documents: List[Dict], analysis: Dict) -> List[Dict]:
        """Semantic search using AI analysis"""
        results = []
        query_lower = query.lower()
        
        for doc in documents:
            score = 0
            
            # Check OCR text
            if doc.get("ocr_text") and query_lower in doc["ocr_text"].lower():
                score += 10
            
            # Check classification category
            if doc.get("classification", {}).get("category"):
                for category in analysis.get("relevant_categories", []):
                    if category.lower() in doc["classification"]["category"].lower():
                        score += 5
            
            # Check metadata
            metadata = doc.get("metadata", {})
            for field in analysis.get("metadata_fields", []):
                if field in metadata:
                    field_value = str(metadata[field]).lower()
                    if query_lower in field_value:
                        score += 3
            
            # Check search terms
            for term in analysis.get("search_terms", []):
                if term.lower() in doc.get("ocr_text", "").lower():
                    score += 2
            
            if score > 0:
                doc_result = doc.copy()
                doc_result["search_score"] = score
                results.append(doc_result)
        
        # Sort by score
        results.sort(key=lambda x: x["search_score"], reverse=True)
        return results
    
    def _simple_search(self, query: str, documents: List[Dict]) -> List[Dict]:
        """Simple text-based search"""
        results = []
        query_lower = query.lower()
        
        for doc in documents:
            if query_lower in doc.get("ocr_text", "").lower():
                doc_result = doc.copy()
                doc_result["search_score"] = 1
                results.append(doc_result)
        
        return results

# Global processor instance
document_processor = DocumentProcessor()