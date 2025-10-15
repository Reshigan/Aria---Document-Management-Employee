"""
Enterprise Document Classification System
Advanced AI-powered document identification and classification for Fortune 500 companies
"""

import os
import json
import logging
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple, Union
from pathlib import Path
import re
import mimetypes

import numpy as np
from sqlalchemy.orm import Session
from fastapi import HTTPException

# Optional imports with graceful fallbacks
try:
    import spacy
    from spacy import displacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.svm import SVC
    from sklearn.metrics import classification_report, confusion_matrix
    from sklearn.model_selection import cross_val_score
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    import PyPDF2
    import docx
    import openpyxl
    DOCUMENT_PARSERS_AVAILABLE = True
except ImportError:
    DOCUMENT_PARSERS_AVAILABLE = False

logger = logging.getLogger(__name__)

class EnterpriseDocumentClassifier:
    """
    Advanced AI-powered document classification system for enterprise environments.
    Supports multiple classification models, confidence scoring, and metadata extraction.
    """
    
    # Enterprise document types with detailed categories
    ENTERPRISE_DOCUMENT_TYPES = {
        'financial': {
            'invoice': {
                'patterns': [r'invoice', r'bill', r'payment due', r'amount due', r'invoice #', r'inv\s*\d+'],
                'keywords': ['invoice', 'bill', 'payment', 'due date', 'amount', 'tax', 'subtotal', 'total'],
                'confidence_threshold': 0.85,
                'priority': 'high'
            },
            'purchase_order': {
                'patterns': [r'purchase order', r'po\s*#', r'po\s*\d+', r'order confirmation'],
                'keywords': ['purchase order', 'po number', 'order date', 'delivery', 'quantity', 'unit price'],
                'confidence_threshold': 0.80,
                'priority': 'high'
            },
            'receipt': {
                'patterns': [r'receipt', r'transaction', r'payment confirmation', r'paid'],
                'keywords': ['receipt', 'transaction', 'payment', 'confirmation', 'paid', 'change'],
                'confidence_threshold': 0.75,
                'priority': 'medium'
            },
            'bank_statement': {
                'patterns': [r'bank statement', r'account statement', r'balance', r'transaction history'],
                'keywords': ['bank', 'statement', 'balance', 'transaction', 'deposit', 'withdrawal'],
                'confidence_threshold': 0.85,
                'priority': 'high'
            },
            'expense_report': {
                'patterns': [r'expense report', r'expense claim', r'reimbursement'],
                'keywords': ['expense', 'report', 'claim', 'reimbursement', 'travel', 'meals'],
                'confidence_threshold': 0.80,
                'priority': 'medium'
            }
        },
        'legal': {
            'contract': {
                'patterns': [r'contract', r'agreement', r'terms and conditions', r'whereas'],
                'keywords': ['contract', 'agreement', 'party', 'terms', 'conditions', 'signature'],
                'confidence_threshold': 0.90,
                'priority': 'critical'
            },
            'legal_notice': {
                'patterns': [r'legal notice', r'notice', r'summons', r'court'],
                'keywords': ['legal', 'notice', 'court', 'summons', 'hearing', 'defendant'],
                'confidence_threshold': 0.85,
                'priority': 'critical'
            },
            'compliance_document': {
                'patterns': [r'compliance', r'regulation', r'policy', r'procedure'],
                'keywords': ['compliance', 'regulation', 'policy', 'procedure', 'audit', 'standard'],
                'confidence_threshold': 0.80,
                'priority': 'high'
            }
        },
        'hr': {
            'employee_record': {
                'patterns': [r'employee', r'personnel', r'staff record', r'hr record'],
                'keywords': ['employee', 'personnel', 'staff', 'position', 'department', 'hire date'],
                'confidence_threshold': 0.80,
                'priority': 'high'
            },
            'payroll': {
                'patterns': [r'payroll', r'salary', r'wage', r'pay stub', r'payslip'],
                'keywords': ['payroll', 'salary', 'wage', 'gross pay', 'net pay', 'deductions'],
                'confidence_threshold': 0.85,
                'priority': 'high'
            },
            'performance_review': {
                'patterns': [r'performance review', r'evaluation', r'appraisal'],
                'keywords': ['performance', 'review', 'evaluation', 'goals', 'rating', 'feedback'],
                'confidence_threshold': 0.80,
                'priority': 'medium'
            }
        },
        'technical': {
            'specification': {
                'patterns': [r'specification', r'spec', r'technical document', r'requirements'],
                'keywords': ['specification', 'requirements', 'technical', 'design', 'architecture'],
                'confidence_threshold': 0.75,
                'priority': 'medium'
            },
            'manual': {
                'patterns': [r'manual', r'guide', r'instructions', r'how to'],
                'keywords': ['manual', 'guide', 'instructions', 'steps', 'procedure', 'tutorial'],
                'confidence_threshold': 0.70,
                'priority': 'low'
            },
            'report': {
                'patterns': [r'report', r'analysis', r'findings', r'summary'],
                'keywords': ['report', 'analysis', 'findings', 'summary', 'conclusion', 'recommendation'],
                'confidence_threshold': 0.75,
                'priority': 'medium'
            }
        },
        'communication': {
            'email': {
                'patterns': [r'from:', r'to:', r'subject:', r'@', r'sent:', r'received:'],
                'keywords': ['from', 'to', 'subject', 'email', 'message', 'reply'],
                'confidence_threshold': 0.90,
                'priority': 'low'
            },
            'memo': {
                'patterns': [r'memo', r'memorandum', r'internal communication'],
                'keywords': ['memo', 'memorandum', 'internal', 'communication', 'notice', 'announcement'],
                'confidence_threshold': 0.80,
                'priority': 'medium'
            },
            'letter': {
                'patterns': [r'dear', r'sincerely', r'yours truly', r'best regards'],
                'keywords': ['dear', 'sincerely', 'regards', 'letter', 'correspondence'],
                'confidence_threshold': 0.75,
                'priority': 'medium'
            }
        }
    }
    
    def __init__(self):
        self.nlp = None
        self.transformer_classifier = None
        self.sklearn_models = {}
        self.vectorizers = {}
        self.openai_client = None
        self.classification_cache = {}
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize all available AI models"""
        logger.info("Initializing Enterprise Document Classifier...")
        
        # Initialize spaCy NLP
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("en_core_web_sm")
                logger.info("✅ spaCy model loaded successfully")
            except OSError:
                logger.warning("⚠️ spaCy model not found. Install with: python -m spacy download en_core_web_sm")
        
        # Initialize Transformer models
        if TRANSFORMERS_AVAILABLE:
            try:
                # Use a pre-trained document classification model
                self.transformer_classifier = pipeline(
                    "text-classification",
                    model="microsoft/DialoGPT-medium",
                    return_all_scores=True
                )
                logger.info("✅ Transformer model loaded successfully")
            except Exception as e:
                logger.warning(f"⚠️ Could not load transformer model: {e}")
        
        # Initialize scikit-learn models
        if SKLEARN_AVAILABLE:
            self._initialize_sklearn_models()
        
        # Initialize OpenAI client
        if OPENAI_AVAILABLE and os.getenv('OPENAI_API_KEY'):
            try:
                openai.api_key = os.getenv('OPENAI_API_KEY')
                self.openai_client = openai
                logger.info("✅ OpenAI client initialized successfully")
            except Exception as e:
                logger.warning(f"⚠️ Could not initialize OpenAI client: {e}")
    
    def _initialize_sklearn_models(self):
        """Initialize multiple scikit-learn models for ensemble classification"""
        try:
            # TF-IDF Vectorizer
            self.vectorizers['tfidf'] = TfidfVectorizer(
                max_features=10000,
                ngram_range=(1, 3),
                stop_words='english',
                lowercase=True,
                strip_accents='unicode'
            )
            
            # Multiple classifiers for ensemble
            self.sklearn_models = {
                'random_forest': RandomForestClassifier(
                    n_estimators=100,
                    max_depth=20,
                    random_state=42
                ),
                'gradient_boosting': GradientBoostingClassifier(
                    n_estimators=100,
                    learning_rate=0.1,
                    max_depth=6,
                    random_state=42
                ),
                'naive_bayes': MultinomialNB(alpha=0.1),
                'svm': SVC(
                    kernel='rbf',
                    probability=True,
                    random_state=42
                )
            }
            
            # Load pre-trained models if available
            self._load_pretrained_models()
            
            logger.info("✅ Scikit-learn models initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize scikit-learn models: {e}")
    
    def _load_pretrained_models(self):
        """Load pre-trained models from disk"""
        models_dir = Path("models/enterprise_classifier")
        
        if models_dir.exists():
            try:
                for model_name in self.sklearn_models.keys():
                    model_path = models_dir / f"{model_name}.joblib"
                    vectorizer_path = models_dir / f"{model_name}_vectorizer.joblib"
                    
                    if model_path.exists() and vectorizer_path.exists():
                        self.sklearn_models[model_name] = joblib.load(model_path)
                        self.vectorizers[f"{model_name}_vectorizer"] = joblib.load(vectorizer_path)
                        logger.info(f"✅ Loaded pre-trained {model_name} model")
                        
            except Exception as e:
                logger.warning(f"⚠️ Could not load pre-trained models: {e}")
    
    async def classify_document(
        self,
        content: str,
        filename: str,
        file_path: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Classify document using multiple AI approaches and return comprehensive results
        """
        
        # Create cache key
        cache_key = hashlib.md5(f"{content[:1000]}{filename}".encode()).hexdigest()
        
        # Check cache first
        if cache_key in self.classification_cache:
            cached_result = self.classification_cache[cache_key]
            cached_result['from_cache'] = True
            return cached_result
        
        logger.info(f"🔍 Classifying document: {filename}")
        
        # Initialize result structure
        classification_result = {
            'filename': filename,
            'file_path': file_path,
            'timestamp': datetime.utcnow().isoformat(),
            'content_length': len(content),
            'classifications': {},
            'confidence_scores': {},
            'metadata': metadata or {},
            'processing_time': 0,
            'from_cache': False
        }
        
        start_time = datetime.utcnow()
        
        try:
            # 1. Rule-based classification (fastest, most reliable)
            rule_based_result = await self._rule_based_classification(content, filename)
            classification_result['classifications']['rule_based'] = rule_based_result
            
            # 2. NLP-based classification using spaCy
            if self.nlp:
                nlp_result = await self._nlp_classification(content)
                classification_result['classifications']['nlp'] = nlp_result
            
            # 3. Machine Learning classification
            if SKLEARN_AVAILABLE and self.sklearn_models:
                ml_result = await self._ml_classification(content)
                classification_result['classifications']['machine_learning'] = ml_result
            
            # 4. Transformer-based classification
            if self.transformer_classifier:
                transformer_result = await self._transformer_classification(content)
                classification_result['classifications']['transformer'] = transformer_result
            
            # 5. OpenAI GPT classification (if available)
            if self.openai_client:
                openai_result = await self._openai_classification(content, filename)
                classification_result['classifications']['openai'] = openai_result
            
            # 6. Ensemble classification (combine all results)
            ensemble_result = self._ensemble_classification(classification_result['classifications'])
            classification_result['final_classification'] = ensemble_result
            
            # 7. Extract metadata and entities
            extracted_metadata = await self._extract_metadata(content, ensemble_result['document_type'])
            classification_result['extracted_metadata'] = extracted_metadata
            
            # 8. Calculate processing time
            end_time = datetime.utcnow()
            classification_result['processing_time'] = (end_time - start_time).total_seconds()
            
            # Cache the result
            self.classification_cache[cache_key] = classification_result
            
            logger.info(f"✅ Document classified as: {ensemble_result['document_type']} "
                       f"(confidence: {ensemble_result['confidence']:.2f}) "
                       f"in {classification_result['processing_time']:.2f}s")
            
            return classification_result
            
        except Exception as e:
            logger.error(f"❌ Classification failed for {filename}: {str(e)}")
            classification_result['error'] = str(e)
            classification_result['final_classification'] = {
                'document_type': 'unknown',
                'category': 'unknown',
                'confidence': 0.0,
                'priority': 'low'
            }
            return classification_result
    
    async def _rule_based_classification(self, content: str, filename: str) -> Dict[str, Any]:
        """Rule-based classification using patterns and keywords"""
        
        content_lower = content.lower()
        filename_lower = filename.lower()
        combined_text = f"{content_lower} {filename_lower}"
        
        best_match = {
            'document_type': 'unknown',
            'category': 'unknown',
            'confidence': 0.0,
            'priority': 'low',
            'matched_patterns': [],
            'matched_keywords': []
        }
        
        for category, doc_types in self.ENTERPRISE_DOCUMENT_TYPES.items():
            for doc_type, config in doc_types.items():
                score = 0.0
                matched_patterns = []
                matched_keywords = []
                
                # Check patterns
                for pattern in config['patterns']:
                    if re.search(pattern, combined_text, re.IGNORECASE):
                        score += 0.3
                        matched_patterns.append(pattern)
                
                # Check keywords
                for keyword in config['keywords']:
                    if keyword.lower() in combined_text:
                        score += 0.1
                        matched_keywords.append(keyword)
                
                # Filename bonus
                if any(keyword in filename_lower for keyword in config['keywords'][:3]):
                    score += 0.2
                
                # Normalize score
                max_possible_score = len(config['patterns']) * 0.3 + len(config['keywords']) * 0.1 + 0.2
                normalized_score = min(score / max_possible_score, 1.0) if max_possible_score > 0 else 0.0
                
                if normalized_score > best_match['confidence']:
                    best_match = {
                        'document_type': doc_type,
                        'category': category,
                        'confidence': normalized_score,
                        'priority': config['priority'],
                        'matched_patterns': matched_patterns,
                        'matched_keywords': matched_keywords
                    }
        
        return best_match
    
    async def _nlp_classification(self, content: str) -> Dict[str, Any]:
        """NLP-based classification using spaCy"""
        
        if not self.nlp:
            return {'error': 'spaCy not available'}
        
        try:
            # Process text with spaCy
            doc = self.nlp(content[:1000000])  # Limit to 1M chars for performance
            
            # Extract entities
            entities = []
            for ent in doc.ents:
                entities.append({
                    'text': ent.text,
                    'label': ent.label_,
                    'description': spacy.explain(ent.label_)
                })
            
            # Analyze document structure
            sentences = len(list(doc.sents))
            tokens = len(doc)
            
            # Entity-based classification hints
            classification_hints = {
                'financial': 0.0,
                'legal': 0.0,
                'hr': 0.0,
                'technical': 0.0,
                'communication': 0.0
            }
            
            # Score based on entities
            for ent in doc.ents:
                if ent.label_ in ['MONEY', 'PERCENT', 'CARDINAL']:
                    classification_hints['financial'] += 0.1
                elif ent.label_ in ['LAW', 'ORG']:
                    classification_hints['legal'] += 0.1
                elif ent.label_ in ['PERSON', 'DATE']:
                    classification_hints['hr'] += 0.05
                elif ent.label_ in ['PRODUCT', 'WORK_OF_ART']:
                    classification_hints['technical'] += 0.05
            
            # Find the highest scoring category
            best_category = max(classification_hints.items(), key=lambda x: x[1])
            
            return {
                'entities': entities[:20],  # Limit entities for performance
                'sentences': sentences,
                'tokens': tokens,
                'classification_hints': classification_hints,
                'suggested_category': best_category[0],
                'category_confidence': best_category[1]
            }
            
        except Exception as e:
            return {'error': f'NLP classification failed: {str(e)}'}
    
    async def _ml_classification(self, content: str) -> Dict[str, Any]:
        """Machine learning classification using scikit-learn ensemble"""
        
        if not SKLEARN_AVAILABLE or not self.sklearn_models:
            return {'error': 'Scikit-learn models not available'}
        
        try:
            # Prepare text for classification
            text_features = self.vectorizers['tfidf'].transform([content])
            
            predictions = {}
            confidences = {}
            
            # Get predictions from all models
            for model_name, model in self.sklearn_models.items():
                if hasattr(model, 'predict_proba'):
                    try:
                        prediction = model.predict([text_features])[0]
                        probabilities = model.predict_proba([text_features])[0]
                        
                        predictions[model_name] = prediction
                        confidences[model_name] = max(probabilities)
                        
                    except Exception as e:
                        logger.warning(f"Model {model_name} prediction failed: {e}")
            
            # Ensemble prediction
            if predictions:
                # Simple voting
                prediction_counts = {}
                for pred in predictions.values():
                    prediction_counts[pred] = prediction_counts.get(pred, 0) + 1
                
                ensemble_prediction = max(prediction_counts.items(), key=lambda x: x[1])[0]
                ensemble_confidence = sum(confidences.values()) / len(confidences)
                
                return {
                    'individual_predictions': predictions,
                    'individual_confidences': confidences,
                    'ensemble_prediction': ensemble_prediction,
                    'ensemble_confidence': ensemble_confidence
                }
            else:
                return {'error': 'No valid predictions from ML models'}
                
        except Exception as e:
            return {'error': f'ML classification failed: {str(e)}'}
    
    async def _transformer_classification(self, content: str) -> Dict[str, Any]:
        """Transformer-based classification using Hugging Face models"""
        
        if not self.transformer_classifier:
            return {'error': 'Transformer model not available'}
        
        try:
            # Limit content length for transformer
            truncated_content = content[:512]  # BERT-like models typically have 512 token limit
            
            # Get classification results
            results = self.transformer_classifier(truncated_content)
            
            # Process results
            processed_results = []
            for result in results:
                processed_results.append({
                    'label': result['label'],
                    'confidence': result['score']
                })
            
            # Sort by confidence
            processed_results.sort(key=lambda x: x['confidence'], reverse=True)
            
            return {
                'predictions': processed_results,
                'top_prediction': processed_results[0] if processed_results else None,
                'model_type': 'transformer'
            }
            
        except Exception as e:
            return {'error': f'Transformer classification failed: {str(e)}'}
    
    async def _openai_classification(self, content: str, filename: str) -> Dict[str, Any]:
        """OpenAI GPT-based classification"""
        
        if not self.openai_client:
            return {'error': 'OpenAI client not available'}
        
        try:
            # Prepare prompt for GPT
            prompt = f"""
            Analyze the following document and classify it into one of these enterprise categories:
            
            Categories:
            - financial (invoice, purchase_order, receipt, bank_statement, expense_report)
            - legal (contract, legal_notice, compliance_document)
            - hr (employee_record, payroll, performance_review)
            - technical (specification, manual, report)
            - communication (email, memo, letter)
            
            Document filename: {filename}
            Document content (first 1000 characters):
            {content[:1000]}
            
            Respond with JSON format:
            {{
                "category": "category_name",
                "document_type": "specific_type",
                "confidence": 0.95,
                "reasoning": "explanation of classification"
            }}
            """
            
            response = await self.openai_client.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert document classifier for enterprise systems."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.1
            )
            
            # Parse response
            response_text = response.choices[0].message.content
            
            try:
                classification_data = json.loads(response_text)
                return {
                    'category': classification_data.get('category', 'unknown'),
                    'document_type': classification_data.get('document_type', 'unknown'),
                    'confidence': classification_data.get('confidence', 0.0),
                    'reasoning': classification_data.get('reasoning', ''),
                    'model': 'gpt-3.5-turbo'
                }
            except json.JSONDecodeError:
                return {
                    'error': 'Could not parse OpenAI response',
                    'raw_response': response_text
                }
                
        except Exception as e:
            return {'error': f'OpenAI classification failed: {str(e)}'}
    
    def _ensemble_classification(self, classifications: Dict[str, Any]) -> Dict[str, Any]:
        """Combine results from all classification methods"""
        
        # Collect all predictions with weights
        predictions = []
        
        # Rule-based (highest weight - most reliable)
        if 'rule_based' in classifications and 'confidence' in classifications['rule_based']:
            rule_result = classifications['rule_based']
            predictions.append({
                'document_type': rule_result['document_type'],
                'category': rule_result['category'],
                'confidence': rule_result['confidence'],
                'priority': rule_result['priority'],
                'weight': 0.4,
                'source': 'rule_based'
            })
        
        # NLP-based
        if 'nlp' in classifications and 'suggested_category' in classifications['nlp']:
            nlp_result = classifications['nlp']
            predictions.append({
                'document_type': 'unknown',
                'category': nlp_result['suggested_category'],
                'confidence': nlp_result['category_confidence'],
                'priority': 'medium',
                'weight': 0.2,
                'source': 'nlp'
            })
        
        # Machine Learning
        if 'machine_learning' in classifications and 'ensemble_prediction' in classifications['machine_learning']:
            ml_result = classifications['machine_learning']
            predictions.append({
                'document_type': ml_result['ensemble_prediction'],
                'category': 'unknown',
                'confidence': ml_result['ensemble_confidence'],
                'priority': 'medium',
                'weight': 0.25,
                'source': 'machine_learning'
            })
        
        # OpenAI
        if 'openai' in classifications and 'confidence' in classifications['openai']:
            openai_result = classifications['openai']
            predictions.append({
                'document_type': openai_result['document_type'],
                'category': openai_result['category'],
                'confidence': openai_result['confidence'],
                'priority': 'medium',
                'weight': 0.15,
                'source': 'openai'
            })
        
        if not predictions:
            return {
                'document_type': 'unknown',
                'category': 'unknown',
                'confidence': 0.0,
                'priority': 'low',
                'sources': [],
                'reasoning': 'No valid classifications available'
            }
        
        # Calculate weighted ensemble score
        category_scores = {}
        document_type_scores = {}
        
        for pred in predictions:
            weighted_confidence = pred['confidence'] * pred['weight']
            
            # Category scoring
            if pred['category'] != 'unknown':
                if pred['category'] not in category_scores:
                    category_scores[pred['category']] = []
                category_scores[pred['category']].append(weighted_confidence)
            
            # Document type scoring
            if pred['document_type'] != 'unknown':
                if pred['document_type'] not in document_type_scores:
                    document_type_scores[pred['document_type']] = []
                document_type_scores[pred['document_type']].append(weighted_confidence)
        
        # Find best category
        best_category = 'unknown'
        best_category_score = 0.0
        
        for category, scores in category_scores.items():
            avg_score = sum(scores) / len(scores)
            if avg_score > best_category_score:
                best_category = category
                best_category_score = avg_score
        
        # Find best document type
        best_document_type = 'unknown'
        best_document_type_score = 0.0
        
        for doc_type, scores in document_type_scores.items():
            avg_score = sum(scores) / len(scores)
            if avg_score > best_document_type_score:
                best_document_type = doc_type
                best_document_type_score = avg_score
        
        # Determine priority
        priority = 'low'
        if best_category in ['financial', 'legal']:
            priority = 'high'
        elif best_category in ['hr', 'technical']:
            priority = 'medium'
        
        # Overall confidence
        overall_confidence = max(best_category_score, best_document_type_score)
        
        return {
            'document_type': best_document_type,
            'category': best_category,
            'confidence': overall_confidence,
            'priority': priority,
            'sources': [pred['source'] for pred in predictions],
            'category_scores': category_scores,
            'document_type_scores': document_type_scores,
            'reasoning': f'Ensemble classification from {len(predictions)} sources'
        }
    
    async def _extract_metadata(self, content: str, document_type: str) -> Dict[str, Any]:
        """Extract relevant metadata based on document type"""
        
        metadata = {
            'extracted_at': datetime.utcnow().isoformat(),
            'document_type': document_type
        }
        
        try:
            # Common extractions
            metadata.update(self._extract_dates(content))
            metadata.update(self._extract_amounts(content))
            metadata.update(self._extract_emails(content))
            metadata.update(self._extract_phone_numbers(content))
            
            # Document-type specific extractions
            if document_type == 'invoice':
                metadata.update(self._extract_invoice_metadata(content))
            elif document_type == 'contract':
                metadata.update(self._extract_contract_metadata(content))
            elif document_type == 'email':
                metadata.update(self._extract_email_metadata(content))
            
            # NLP-based entity extraction
            if self.nlp:
                doc = self.nlp(content[:100000])  # Limit for performance
                
                entities = {
                    'persons': [],
                    'organizations': [],
                    'locations': [],
                    'dates': [],
                    'money': []
                }
                
                for ent in doc.ents:
                    if ent.label_ == 'PERSON':
                        entities['persons'].append(ent.text)
                    elif ent.label_ == 'ORG':
                        entities['organizations'].append(ent.text)
                    elif ent.label_ == 'GPE':
                        entities['locations'].append(ent.text)
                    elif ent.label_ == 'DATE':
                        entities['dates'].append(ent.text)
                    elif ent.label_ == 'MONEY':
                        entities['money'].append(ent.text)
                
                # Remove duplicates and limit
                for key in entities:
                    entities[key] = list(set(entities[key]))[:10]
                
                metadata['entities'] = entities
            
        except Exception as e:
            logger.warning(f"Metadata extraction failed: {e}")
            metadata['extraction_error'] = str(e)
        
        return metadata
    
    def _extract_dates(self, content: str) -> Dict[str, List[str]]:
        """Extract dates from content"""
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            r'\d{2,4}[/-]\d{1,2}[/-]\d{1,2}',
            r'\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b',
            r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b'
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            dates.extend(matches)
        
        return {'extracted_dates': list(set(dates))[:10]}
    
    def _extract_amounts(self, content: str) -> Dict[str, List[str]]:
        """Extract monetary amounts from content"""
        amount_patterns = [
            r'\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?',
            r'\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|CAD)',
            r'(?:USD|EUR|GBP|CAD)\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?'
        ]
        
        amounts = []
        for pattern in amount_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            amounts.extend(matches)
        
        return {'extracted_amounts': list(set(amounts))[:10]}
    
    def _extract_emails(self, content: str) -> Dict[str, List[str]]:
        """Extract email addresses from content"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, content)
        return {'extracted_emails': list(set(emails))[:10]}
    
    def _extract_phone_numbers(self, content: str) -> Dict[str, List[str]]:
        """Extract phone numbers from content"""
        phone_patterns = [
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            r'\(\d{3}\)\s*\d{3}[-.]?\d{4}',
            r'\+\d{1,3}\s*\d{3,4}\s*\d{3,4}\s*\d{3,4}'
        ]
        
        phones = []
        for pattern in phone_patterns:
            matches = re.findall(pattern, content)
            phones.extend(matches)
        
        return {'extracted_phone_numbers': list(set(phones))[:5]}
    
    def _extract_invoice_metadata(self, content: str) -> Dict[str, Any]:
        """Extract invoice-specific metadata"""
        metadata = {}
        
        # Invoice number
        invoice_patterns = [
            r'invoice\s*#?\s*:?\s*([A-Z0-9-]+)',
            r'inv\s*#?\s*:?\s*([A-Z0-9-]+)'
        ]
        
        for pattern in invoice_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                metadata['invoice_number'] = match.group(1)
                break
        
        # Due date
        due_date_patterns = [
            r'due\s+date\s*:?\s*([0-9/\-\s]+)',
            r'payment\s+due\s*:?\s*([0-9/\-\s]+)'
        ]
        
        for pattern in due_date_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                metadata['due_date'] = match.group(1).strip()
                break
        
        return metadata
    
    def _extract_contract_metadata(self, content: str) -> Dict[str, Any]:
        """Extract contract-specific metadata"""
        metadata = {}
        
        # Contract parties
        party_patterns = [
            r'between\s+([^,\n]+)\s+and\s+([^,\n]+)',
            r'party\s+of\s+the\s+first\s+part[:\s]+([^,\n]+)',
            r'party\s+of\s+the\s+second\s+part[:\s]+([^,\n]+)'
        ]
        
        for pattern in party_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                if 'contract_parties' not in metadata:
                    metadata['contract_parties'] = []
                metadata['contract_parties'].extend(match.groups())
        
        # Effective date
        effective_patterns = [
            r'effective\s+date\s*:?\s*([0-9/\-\s]+)',
            r'commencing\s+on\s*:?\s*([0-9/\-\s]+)'
        ]
        
        for pattern in effective_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                metadata['effective_date'] = match.group(1).strip()
                break
        
        return metadata
    
    def _extract_email_metadata(self, content: str) -> Dict[str, Any]:
        """Extract email-specific metadata"""
        metadata = {}
        
        # Email headers
        header_patterns = {
            'from': r'from\s*:?\s*([^\n\r]+)',
            'to': r'to\s*:?\s*([^\n\r]+)',
            'subject': r'subject\s*:?\s*([^\n\r]+)',
            'date': r'date\s*:?\s*([^\n\r]+)'
        }
        
        for field, pattern in header_patterns.items():
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                metadata[f'email_{field}'] = match.group(1).strip()
        
        return metadata
    
    def get_classification_stats(self) -> Dict[str, Any]:
        """Get classification statistics"""
        return {
            'cache_size': len(self.classification_cache),
            'available_models': {
                'spacy': self.nlp is not None,
                'transformers': self.transformer_classifier is not None,
                'sklearn': bool(self.sklearn_models),
                'openai': self.openai_client is not None
            },
            'supported_document_types': len([
                doc_type 
                for category in self.ENTERPRISE_DOCUMENT_TYPES.values() 
                for doc_type in category.keys()
            ]),
            'supported_categories': list(self.ENTERPRISE_DOCUMENT_TYPES.keys())
        }
    
    def clear_cache(self):
        """Clear classification cache"""
        self.classification_cache.clear()
        logger.info("Classification cache cleared")

# Global instance
enterprise_classifier = EnterpriseDocumentClassifier()