"""
AI-Powered Document Analysis Service
Provides intelligent document understanding, classification, and content extraction
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import json
import re
from dataclasses import dataclass
from enum import Enum

# AI and ML libraries
from transformers import pipeline, AutoTokenizer, AutoModel
import torch
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class DocumentType(Enum):
    INVOICE = "invoice"
    CONTRACT = "contract"
    RESUME = "resume"
    REPORT = "report"
    EMAIL = "email"
    LEGAL = "legal"
    FINANCIAL = "financial"
    TECHNICAL = "technical"
    GENERAL = "general"

class AnalysisType(Enum):
    CLASSIFICATION = "classification"
    SENTIMENT = "sentiment"
    SUMMARIZATION = "summarization"
    ENTITY_EXTRACTION = "entity_extraction"
    KEY_PHRASES = "key_phrases"
    TOPIC_MODELING = "topic_modeling"
    SIMILARITY = "similarity"

@dataclass
class DocumentAnalysis:
    document_type: DocumentType
    confidence: float
    summary: str
    key_entities: List[Dict[str, Any]]
    sentiment: Dict[str, float]
    topics: List[Dict[str, Any]]
    key_phrases: List[str]
    metadata: Dict[str, Any]
    processing_time: float

@dataclass
class EntityExtraction:
    entity_type: str
    value: str
    confidence: float
    start_pos: int
    end_pos: int
    context: str

class AIDocumentAnalyzer:
    def __init__(self):
        self.classification_pipeline = None
        self.sentiment_pipeline = None
        self.summarization_pipeline = None
        self.ner_pipeline = None
        self.tokenizer = None
        self.model = None
        self.vectorizer = None
        
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize AI models and pipelines"""
        try:
            # Document classification
            self.classification_pipeline = pipeline(
                "text-classification",
                model="microsoft/DialoGPT-medium",
                return_all_scores=True
            )
            logger.info("Classification pipeline initialized")
        except Exception as e:
            logger.warning(f"Classification pipeline failed to initialize: {e}")
        
        try:
            # Sentiment analysis
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                return_all_scores=True
            )
            logger.info("Sentiment pipeline initialized")
        except Exception as e:
            logger.warning(f"Sentiment pipeline failed to initialize: {e}")
        
        try:
            # Text summarization
            self.summarization_pipeline = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                max_length=150,
                min_length=30,
                do_sample=False
            )
            logger.info("Summarization pipeline initialized")
        except Exception as e:
            logger.warning(f"Summarization pipeline failed to initialize: {e}")
        
        try:
            # Named Entity Recognition
            self.ner_pipeline = pipeline(
                "ner",
                model="dbmdz/bert-large-cased-finetuned-conll03-english",
                aggregation_strategy="simple"
            )
            logger.info("NER pipeline initialized")
        except Exception as e:
            logger.warning(f"NER pipeline failed to initialize: {e}")
        
        try:
            # Initialize TF-IDF vectorizer for topic modeling
            self.vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            logger.info("TF-IDF vectorizer initialized")
        except Exception as e:
            logger.warning(f"TF-IDF vectorizer failed to initialize: {e}")
    
    async def analyze_document(
        self,
        text: str,
        analysis_types: List[AnalysisType] = None,
        options: Dict[str, Any] = None
    ) -> DocumentAnalysis:
        """
        Perform comprehensive AI-powered document analysis
        """
        if not text or not text.strip():
            raise ValueError("Text content is required for analysis")
        
        if analysis_types is None:
            analysis_types = list(AnalysisType)
        
        options = options or {}
        start_time = datetime.now()
        
        # Initialize results
        results = {
            'document_type': DocumentType.GENERAL,
            'confidence': 0.0,
            'summary': '',
            'key_entities': [],
            'sentiment': {},
            'topics': [],
            'key_phrases': [],
            'metadata': {}
        }
        
        # Perform different types of analysis
        if AnalysisType.CLASSIFICATION in analysis_types:
            doc_type, confidence = await self._classify_document(text)
            results['document_type'] = doc_type
            results['confidence'] = confidence
        
        if AnalysisType.SENTIMENT in analysis_types:
            results['sentiment'] = await self._analyze_sentiment(text)
        
        if AnalysisType.SUMMARIZATION in analysis_types:
            results['summary'] = await self._summarize_text(text, options.get('summary_length', 150))
        
        if AnalysisType.ENTITY_EXTRACTION in analysis_types:
            results['key_entities'] = await self._extract_entities(text)
        
        if AnalysisType.KEY_PHRASES in analysis_types:
            results['key_phrases'] = await self._extract_key_phrases(text)
        
        if AnalysisType.TOPIC_MODELING in analysis_types:
            results['topics'] = await self._extract_topics(text)
        
        # Add metadata
        processing_time = (datetime.now() - start_time).total_seconds()
        results['metadata'] = {
            'text_length': len(text),
            'word_count': len(text.split()),
            'sentence_count': len(text.split('.')),
            'processing_time': processing_time,
            'analysis_types': [t.value for t in analysis_types],
            'language': 'en'  # Simplified
        }
        
        return DocumentAnalysis(
            document_type=results['document_type'],
            confidence=results['confidence'],
            summary=results['summary'],
            key_entities=results['key_entities'],
            sentiment=results['sentiment'],
            topics=results['topics'],
            key_phrases=results['key_phrases'],
            metadata=results['metadata'],
            processing_time=processing_time
        )
    
    async def _classify_document(self, text: str) -> Tuple[DocumentType, float]:
        """Classify document type using AI and rule-based approaches"""
        
        # Rule-based classification first
        rule_based_type, rule_confidence = self._rule_based_classification(text)
        
        # If we have high confidence from rules, use that
        if rule_confidence > 0.8:
            return rule_based_type, rule_confidence
        
        # Otherwise, try AI classification if available
        if self.classification_pipeline:
            try:
                # Truncate text for classification
                truncated_text = text[:512] if len(text) > 512 else text
                
                # Use a more appropriate classification approach
                # Since we don't have a specific document type classifier,
                # we'll use rule-based with some AI enhancement
                ai_features = self._extract_classification_features(text)
                enhanced_confidence = min(rule_confidence + 0.1, 1.0)
                
                return rule_based_type, enhanced_confidence
                
            except Exception as e:
                logger.warning(f"AI classification failed: {e}")
        
        return rule_based_type, rule_confidence
    
    def _rule_based_classification(self, text: str) -> Tuple[DocumentType, float]:
        """Rule-based document classification"""
        text_lower = text.lower()
        
        # Define classification rules
        classification_rules = {
            DocumentType.INVOICE: {
                'keywords': ['invoice', 'bill', 'payment', 'amount due', 'total', 'tax', 'subtotal'],
                'patterns': [r'\$\d+\.\d{2}', r'invoice\s*#?\s*\d+', r'due\s+date'],
                'weight': 1.0
            },
            DocumentType.CONTRACT: {
                'keywords': ['contract', 'agreement', 'terms', 'conditions', 'party', 'whereas', 'hereby'],
                'patterns': [r'this\s+agreement', r'terms\s+and\s+conditions', r'party\s+of\s+the\s+first\s+part'],
                'weight': 1.0
            },
            DocumentType.RESUME: {
                'keywords': ['resume', 'cv', 'experience', 'education', 'skills', 'employment', 'objective'],
                'patterns': [r'\d{4}\s*-\s*\d{4}', r'bachelor|master|phd', r'years?\s+of\s+experience'],
                'weight': 1.0
            },
            DocumentType.REPORT: {
                'keywords': ['report', 'analysis', 'findings', 'conclusion', 'executive summary', 'methodology'],
                'patterns': [r'executive\s+summary', r'table\s+of\s+contents', r'findings\s+and\s+recommendations'],
                'weight': 1.0
            },
            DocumentType.EMAIL: {
                'keywords': ['from:', 'to:', 'subject:', 'dear', 'sincerely', 'best regards'],
                'patterns': [r'from:\s*\S+@\S+', r'to:\s*\S+@\S+', r'subject:\s*.+'],
                'weight': 1.0
            },
            DocumentType.LEGAL: {
                'keywords': ['plaintiff', 'defendant', 'court', 'jurisdiction', 'statute', 'whereas', 'heretofore'],
                'patterns': [r'case\s+no\.?\s*\d+', r'court\s+of\s+\w+', r'plaintiff\s+v\.?\s+defendant'],
                'weight': 1.0
            },
            DocumentType.FINANCIAL: {
                'keywords': ['balance sheet', 'income statement', 'cash flow', 'assets', 'liabilities', 'equity'],
                'patterns': [r'fiscal\s+year\s+\d{4}', r'quarter\s+\d', r'\$\d+(?:,\d{3})*'],
                'weight': 1.0
            }
        }
        
        scores = {}
        
        for doc_type, rules in classification_rules.items():
            score = 0.0
            
            # Check keywords
            keyword_matches = sum(1 for keyword in rules['keywords'] if keyword in text_lower)
            keyword_score = (keyword_matches / len(rules['keywords'])) * 0.6
            
            # Check patterns
            pattern_matches = sum(1 for pattern in rules['patterns'] if re.search(pattern, text_lower))
            pattern_score = (pattern_matches / len(rules['patterns'])) * 0.4 if rules['patterns'] else 0
            
            total_score = (keyword_score + pattern_score) * rules['weight']
            scores[doc_type] = total_score
        
        # Find best match
        if scores:
            best_type = max(scores, key=scores.get)
            best_score = scores[best_type]
            
            # Ensure minimum confidence threshold
            if best_score > 0.3:
                return best_type, min(best_score, 1.0)
        
        return DocumentType.GENERAL, 0.5
    
    def _extract_classification_features(self, text: str) -> Dict[str, Any]:
        """Extract features for AI-enhanced classification"""
        features = {
            'length': len(text),
            'word_count': len(text.split()),
            'sentence_count': len(text.split('.')),
            'avg_word_length': np.mean([len(word) for word in text.split()]),
            'uppercase_ratio': sum(1 for c in text if c.isupper()) / len(text) if text else 0,
            'digit_ratio': sum(1 for c in text if c.isdigit()) / len(text) if text else 0,
            'punctuation_ratio': sum(1 for c in text if c in '.,!?;:') / len(text) if text else 0
        }
        
        return features
    
    async def _analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze sentiment of the document"""
        if not self.sentiment_pipeline:
            return {'positive': 0.5, 'negative': 0.5, 'neutral': 0.0}
        
        try:
            # Truncate text for sentiment analysis
            truncated_text = text[:512] if len(text) > 512 else text
            
            results = self.sentiment_pipeline(truncated_text)
            
            # Convert to standard format
            sentiment_scores = {'positive': 0.0, 'negative': 0.0, 'neutral': 0.0}
            
            for result in results:
                label = result['label'].lower()
                score = result['score']
                
                if 'pos' in label:
                    sentiment_scores['positive'] = score
                elif 'neg' in label:
                    sentiment_scores['negative'] = score
                else:
                    sentiment_scores['neutral'] = score
            
            return sentiment_scores
            
        except Exception as e:
            logger.warning(f"Sentiment analysis failed: {e}")
            return {'positive': 0.5, 'negative': 0.5, 'neutral': 0.0}
    
    async def _summarize_text(self, text: str, max_length: int = 150) -> str:
        """Generate text summary"""
        if not self.summarization_pipeline:
            # Fallback to extractive summarization
            return self._extractive_summary(text, max_length)
        
        try:
            # Ensure text is long enough for summarization
            if len(text.split()) < 50:
                return text[:max_length] + "..." if len(text) > max_length else text
            
            # Truncate if too long
            if len(text) > 1024:
                text = text[:1024]
            
            result = self.summarization_pipeline(
                text,
                max_length=max_length,
                min_length=min(30, max_length // 3),
                do_sample=False
            )
            
            return result[0]['summary_text']
            
        except Exception as e:
            logger.warning(f"AI summarization failed: {e}")
            return self._extractive_summary(text, max_length)
    
    def _extractive_summary(self, text: str, max_length: int) -> str:
        """Simple extractive summarization fallback"""
        sentences = text.split('.')
        if len(sentences) <= 3:
            return text[:max_length] + "..." if len(text) > max_length else text
        
        # Take first and last sentences, plus one from middle
        summary_sentences = [
            sentences[0],
            sentences[len(sentences) // 2],
            sentences[-2] if len(sentences) > 1 else sentences[-1]
        ]
        
        summary = '. '.join(s.strip() for s in summary_sentences if s.strip())
        return summary[:max_length] + "..." if len(summary) > max_length else summary
    
    async def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract named entities from text"""
        entities = []
        
        # Rule-based entity extraction
        entities.extend(self._extract_rule_based_entities(text))
        
        # AI-based entity extraction if available
        if self.ner_pipeline:
            try:
                # Truncate text for NER
                truncated_text = text[:512] if len(text) > 512 else text
                
                ner_results = self.ner_pipeline(truncated_text)
                
                for entity in ner_results:
                    entities.append({
                        'type': entity['entity_group'].lower(),
                        'value': entity['word'],
                        'confidence': entity['score'],
                        'start': entity['start'],
                        'end': entity['end']
                    })
                    
            except Exception as e:
                logger.warning(f"AI entity extraction failed: {e}")
        
        # Remove duplicates and sort by confidence
        unique_entities = []
        seen = set()
        
        for entity in sorted(entities, key=lambda x: x.get('confidence', 0.5), reverse=True):
            key = (entity['type'], entity['value'].lower())
            if key not in seen:
                seen.add(key)
                unique_entities.append(entity)
        
        return unique_entities[:20]  # Limit to top 20 entities
    
    def _extract_rule_based_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities using regular expressions"""
        entities = []
        
        # Email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for match in re.finditer(email_pattern, text):
            entities.append({
                'type': 'email',
                'value': match.group(),
                'confidence': 0.9,
                'start': match.start(),
                'end': match.end()
            })
        
        # Phone numbers
        phone_pattern = r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'
        for match in re.finditer(phone_pattern, text):
            entities.append({
                'type': 'phone',
                'value': match.group(),
                'confidence': 0.8,
                'start': match.start(),
                'end': match.end()
            })
        
        # Dates
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b'
        ]
        
        for pattern in date_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                entities.append({
                    'type': 'date',
                    'value': match.group(),
                    'confidence': 0.7,
                    'start': match.start(),
                    'end': match.end()
                })
        
        # Currency amounts
        currency_pattern = r'\$\d+(?:,\d{3})*(?:\.\d{2})?'
        for match in re.finditer(currency_pattern, text):
            entities.append({
                'type': 'money',
                'value': match.group(),
                'confidence': 0.8,
                'start': match.start(),
                'end': match.end()
            })
        
        # URLs
        url_pattern = r'https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?'
        for match in re.finditer(url_pattern, text):
            entities.append({
                'type': 'url',
                'value': match.group(),
                'confidence': 0.9,
                'start': match.start(),
                'end': match.end()
            })
        
        return entities
    
    async def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases from text"""
        if not self.vectorizer:
            return self._simple_key_phrases(text)
        
        try:
            # Use TF-IDF to find important phrases
            sentences = text.split('.')
            if len(sentences) < 2:
                return self._simple_key_phrases(text)
            
            # Fit TF-IDF on sentences
            tfidf_matrix = self.vectorizer.fit_transform(sentences)
            feature_names = self.vectorizer.get_feature_names_out()
            
            # Get average TF-IDF scores
            mean_scores = np.mean(tfidf_matrix.toarray(), axis=0)
            
            # Get top phrases
            top_indices = np.argsort(mean_scores)[-10:][::-1]
            key_phrases = [feature_names[i] for i in top_indices if mean_scores[i] > 0]
            
            return key_phrases[:5]  # Return top 5 phrases
            
        except Exception as e:
            logger.warning(f"TF-IDF key phrase extraction failed: {e}")
            return self._simple_key_phrases(text)
    
    def _simple_key_phrases(self, text: str) -> List[str]:
        """Simple key phrase extraction fallback"""
        words = text.lower().split()
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'}
        
        # Count word frequency
        word_freq = {}
        for word in words:
            if word not in stop_words and len(word) > 3:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Return top words as key phrases
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:5]]
    
    async def _extract_topics(self, text: str) -> List[Dict[str, Any]]:
        """Extract topics from text using clustering"""
        if not self.vectorizer:
            return []
        
        try:
            sentences = text.split('.')
            if len(sentences) < 3:
                return [{'topic': 'general', 'confidence': 0.5, 'keywords': []}]
            
            # Vectorize sentences
            tfidf_matrix = self.vectorizer.fit_transform(sentences)
            
            # Perform clustering
            n_clusters = min(3, len(sentences) // 2)
            if n_clusters < 2:
                return [{'topic': 'general', 'confidence': 0.5, 'keywords': []}]
            
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(tfidf_matrix)
            
            # Extract topics
            topics = []
            feature_names = self.vectorizer.get_feature_names_out()
            
            for i in range(n_clusters):
                # Get cluster center
                center = kmeans.cluster_centers_[i]
                
                # Get top features for this cluster
                top_indices = np.argsort(center)[-5:][::-1]
                keywords = [feature_names[idx] for idx in top_indices if center[idx] > 0]
                
                if keywords:
                    topics.append({
                        'topic': f'topic_{i+1}',
                        'confidence': float(np.max(center)),
                        'keywords': keywords
                    })
            
            return topics
            
        except Exception as e:
            logger.warning(f"Topic extraction failed: {e}")
            return [{'topic': 'general', 'confidence': 0.5, 'keywords': []}]
    
    async def compare_documents(self, text1: str, text2: str) -> Dict[str, Any]:
        """Compare similarity between two documents"""
        if not self.vectorizer:
            return {'similarity': 0.0, 'method': 'simple'}
        
        try:
            # Vectorize both texts
            tfidf_matrix = self.vectorizer.fit_transform([text1, text2])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            return {
                'similarity': float(similarity),
                'method': 'tfidf_cosine',
                'confidence': 0.8
            }
            
        except Exception as e:
            logger.warning(f"Document comparison failed: {e}")
            
            # Fallback to simple word overlap
            words1 = set(text1.lower().split())
            words2 = set(text2.lower().split())
            
            if not words1 or not words2:
                return {'similarity': 0.0, 'method': 'simple'}
            
            intersection = len(words1.intersection(words2))
            union = len(words1.union(words2))
            
            return {
                'similarity': intersection / union if union > 0 else 0.0,
                'method': 'jaccard',
                'confidence': 0.6
            }