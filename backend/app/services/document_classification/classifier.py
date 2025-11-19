"""
Document Classifier
Hybrid approach: Rules-based (Stage 1) + LLM fallback (Stage 2)
"""
import re
import logging
import hashlib
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from functools import lru_cache

from .template_registry import template_registry
from ..ask_aria.ollama_client import OllamaClient

logger = logging.getLogger(__name__)

_classification_cache: Dict[str, Dict] = {}


class DocumentClassifier:
    """Classifies SAP documents using hybrid approach"""
    
    def __init__(self):
        self.registry = template_registry
        self.ollama_client = OllamaClient()
        self._precompile_patterns()
    
    def _precompile_patterns(self):
        """Precompile regex patterns for faster matching"""
        for template in self.registry.get_all_templates():
            field_patterns = template['patterns'].get('field_patterns', {})
            compiled_patterns = {}
            
            for field_name, patterns in field_patterns.items():
                compiled_patterns[field_name] = []
                for pattern in patterns:
                    try:
                        compiled_patterns[field_name].append(re.compile(pattern, re.IGNORECASE))
                    except re.error:
                        logger.warning(f"Invalid regex pattern for {field_name}: {pattern}")
            
            template['_compiled_patterns'] = compiled_patterns
    
    def classify_document(self, document_text: str, filename: Optional[str] = None) -> Dict:
        """
        Classify document using hybrid approach with caching
        
        Returns:
            {
                "doc_type": str,
                "template_id": str,
                "module": str,
                "confidence": float,
                "method": "rules" | "llm" | "cached",
                "extracted_fields": dict
            }
        """
        cache_key = hashlib.sha256(document_text.encode('utf-8')).hexdigest()
        
        # Check cache first
        if cache_key in _classification_cache:
            logger.info(f"Using cached classification result for document")
            cached_result = _classification_cache[cache_key].copy()
            cached_result['method'] = f"{cached_result.get('method', 'unknown')}_cached"
            return cached_result
        
        rules_result = self._classify_with_rules(document_text, filename)
        
        if rules_result and rules_result['confidence'] >= 0.7:
            logger.info(f"Document classified with rules: {rules_result['doc_type']} (confidence: {rules_result['confidence']})")
            _classification_cache[cache_key] = rules_result.copy()
            return rules_result
        
        logger.info("Rules-based classification confidence too low, using LLM fallback")
        llm_result = self._classify_with_llm(document_text, filename)
        
        if llm_result:
            _classification_cache[cache_key] = llm_result.copy()
            return llm_result
        
        if rules_result:
            _classification_cache[cache_key] = rules_result.copy()
            return rules_result
        
        unknown_result = {
            "doc_type": "UNKNOWN",
            "template_id": None,
            "module": None,
            "confidence": 0.0,
            "method": "none",
            "extracted_fields": {}
        }
        _classification_cache[cache_key] = unknown_result.copy()
        return unknown_result
    
    def _classify_with_rules(self, document_text: str, filename: Optional[str] = None) -> Optional[Dict]:
        """Stage 1: Rules-based classification using regex patterns"""
        
        text_upper = document_text.upper()
        
        best_match = None
        best_score = 0.0
        
        for template in self.registry.get_all_templates():
            score = 0.0
            matches = 0
            
            header_keywords = template['patterns']['header_keywords']
            for keyword in header_keywords:
                if keyword.upper() in text_upper:
                    score += 1.0
                    matches += 1
                    break  # Only count once per template
            
            compiled_patterns = template.get('_compiled_patterns', {})
            if compiled_patterns:
                for field_name, patterns in compiled_patterns.items():
                    for compiled_pattern in patterns:
                        if compiled_pattern.search(document_text):
                            score += 0.5
                            matches += 1
                            break  # Only count once per field
            else:
                field_patterns = template['patterns'].get('field_patterns', {})
                for field_name, patterns in field_patterns.items():
                    for pattern in patterns:
                        try:
                            if re.search(pattern, document_text, re.IGNORECASE):
                                score += 0.5
                                matches += 1
                                break  # Only count once per field
                        except re.error:
                            logger.warning(f"Invalid regex pattern: {pattern}")
            
            # Normalize score
            max_possible_score = 1.0 + (len(field_patterns) * 0.5)
            normalized_score = score / max_possible_score if max_possible_score > 0 else 0.0
            
            if normalized_score > best_score:
                best_score = normalized_score
                best_match = template
        
        if best_match and best_score > 0.3:  # Minimum threshold
            extracted_fields = self._extract_fields(document_text, best_match)
            
            return {
                "doc_type": best_match['doc_type'],
                "template_id": best_match['id'],
                "module": best_match['module'],
                "confidence": min(best_score, 1.0),
                "method": "rules",
                "extracted_fields": extracted_fields
            }
        
        return None
    
    def _extract_fields(self, document_text: str, template: Dict) -> Dict:
        """Extract fields from document using template patterns"""
        extracted = {}
        
        compiled_patterns = template.get('_compiled_patterns', {})
        if compiled_patterns:
            for field_name, patterns in compiled_patterns.items():
                for compiled_pattern in patterns:
                    match = compiled_pattern.search(document_text)
                    if match:
                        try:
                            extracted[field_name] = match.group(1).strip()
                        except IndexError:
                            extracted[field_name] = match.group(0).strip()
                        break  # Use first matching pattern
        else:
            field_patterns = template['patterns'].get('field_patterns', {})
            for field_name, patterns in field_patterns.items():
                for pattern in patterns:
                    try:
                        match = re.search(pattern, document_text, re.IGNORECASE)
                        if match:
                            extracted[field_name] = match.group(1).strip()
                            break  # Use first matching pattern
                    except re.error:
                        logger.warning(f"Invalid regex pattern for {field_name}: {pattern}")
        
        return extracted
    
    def _classify_with_llm(self, document_text: str, filename: Optional[str] = None) -> Optional[Dict]:
        """Stage 2: LLM-based classification using function calling"""
        
        doc_types = [
            {
                "type": t['doc_type'],
                "name": t['name'],
                "module": t['module']
            }
            for t in self.registry.get_all_templates()
        ]
        
        classification_tool = {
            "type": "function",
            "function": {
                "name": "classify_sap_document",
                "description": "Classify an SAP document based on its content",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "doc_type": {
                            "type": "string",
                            "enum": [t['type'] for t in doc_types],
                            "description": "The type of SAP document"
                        },
                        "confidence": {
                            "type": "number",
                            "description": "Confidence score between 0 and 1"
                        },
                        "reasoning": {
                            "type": "string",
                            "description": "Brief explanation of why this classification was chosen"
                        }
                    },
                    "required": ["doc_type", "confidence"]
                }
            }
        }
        
        doc_types_list = "\n".join([f"- {t['type']}: {t['name']} ({t['module']})" for t in doc_types])
        
        doc_sample = document_text[:1000]
        if len(document_text) > 1000:
            doc_sample += "\n...\n" + document_text[-200:]
        
        prompt = f"""Analyze this document and classify it as one of the following SAP document types:

{doc_types_list}

Document content:
{doc_sample}

Classify this document by calling the classify_sap_document function."""
        
        try:
            response = self.ollama_client.chat(
                messages=[{"role": "user", "content": prompt}],
                tools=[classification_tool],
                temperature=0.1  # Low temperature for consistent classification
            )
            
            if response.get('tool_calls'):
                tool_call = response['tool_calls'][0]
                if tool_call['function']['name'] == 'classify_sap_document':
                    args = tool_call['function']['arguments']
                    doc_type = args.get('doc_type')
                    confidence = args.get('confidence', 0.5)
                    
                    template = self.registry.get_template_by_type(doc_type)
                    
                    if template:
                        extracted_fields = self._extract_fields(document_text, template)
                        
                        return {
                            "doc_type": doc_type,
                            "template_id": template['id'],
                            "module": template['module'],
                            "confidence": confidence,
                            "method": "llm",
                            "extracted_fields": extracted_fields,
                            "reasoning": args.get('reasoning', '')
                        }
            
            logger.warning("LLM did not return a classification tool call")
            return None
            
        except Exception as e:
            logger.error(f"LLM classification failed: {e}")
            return None
    
    def suggest_templates(self, doc_type: str) -> List[Dict]:
        """Suggest templates for a given document type"""
        template = self.registry.get_template_by_type(doc_type)
        if template:
            return [template]
        return []
    
    def reclassify_document(self, document_text: str, suggested_type: str) -> Dict:
        """Reclassify document with a suggested type"""
        template = self.registry.get_template_by_type(suggested_type)
        
        if not template:
            return {
                "doc_type": "UNKNOWN",
                "template_id": None,
                "module": None,
                "confidence": 0.0,
                "method": "manual",
                "extracted_fields": {}
            }
        
        extracted_fields = self._extract_fields(document_text, template)
        
        return {
            "doc_type": template['doc_type'],
            "template_id": template['id'],
            "module": template['module'],
            "confidence": 1.0,  # User-confirmed
            "method": "manual",
            "extracted_fields": extracted_fields
        }


document_classifier = DocumentClassifier()
