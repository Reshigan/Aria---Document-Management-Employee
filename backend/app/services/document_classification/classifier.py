"""
Document Classifier
Hybrid approach: Rules-based (Stage 1) + LLM fallback (Stage 2)
"""
import re
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path

from .template_registry import template_registry
from ..ask_aria.ollama_client import OllamaClient

logger = logging.getLogger(__name__)


class DocumentClassifier:
    """Classifies SAP documents using hybrid approach"""
    
    def __init__(self):
        self.registry = template_registry
        self.ollama_client = OllamaClient()
    
    def classify_document(self, document_text: str, filename: Optional[str] = None) -> Dict:
        """
        Classify document using hybrid approach
        
        Returns:
            {
                "doc_type": str,
                "template_id": str,
                "module": str,
                "confidence": float,
                "method": "rules" | "llm",
                "extracted_fields": dict
            }
        """
        rules_result = self._classify_with_rules(document_text, filename)
        
        if rules_result and rules_result['confidence'] >= 0.7:
            logger.info(f"Document classified with rules: {rules_result['doc_type']} (confidence: {rules_result['confidence']})")
            return rules_result
        
        logger.info("Rules-based classification confidence too low, using LLM fallback")
        llm_result = self._classify_with_llm(document_text, filename)
        
        if llm_result:
            return llm_result
        
        if rules_result:
            return rules_result
        
        return {
            "doc_type": "UNKNOWN",
            "template_id": None,
            "module": None,
            "confidence": 0.0,
            "method": "none",
            "extracted_fields": {}
        }
    
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
        
        prompt = f"""Analyze this document and classify it as one of the following SAP document types:

{doc_types_list}

Document content (first 2000 chars):
{document_text[:2000]}

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
