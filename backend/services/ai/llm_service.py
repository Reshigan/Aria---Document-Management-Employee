"""
LLM Service for internal LLM integration (Llama, Mistral, etc.)
Supports document Q&A and natural language queries with ARIA's personality.
"""
import logging
import json
from typing import Dict, List, Optional
import aiohttp
from core.config import settings
from services.ai.aria_personality import ARIAPersonality

logger = logging.getLogger(__name__)


class LLMService:
    """Service for integrating with internal LLM for document Q&A with ARIA's personality."""
    
    def __init__(self):
        self.api_url = settings.LLM_API_URL or "http://localhost:11434"  # Default Ollama URL
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL or "phi3:mini"  # Default to smaller model for ARM
        self.temperature = settings.LLM_TEMPERATURE
        self.max_tokens = settings.LLM_MAX_TOKENS
        self.timeout = settings.LLM_TIMEOUT
        self.personality = ARIAPersonality()
    
    async def chat_with_aria(
        self,
        user_message: str,
        document_context: Optional[str] = None,
        user_name: Optional[str] = None
    ) -> Dict:
        """
        Chat with ARIA using her full personality and context awareness.
        
        Args:
            user_message: User's message
            document_context: Optional document context
            user_name: Optional user name for personalization
            
        Returns:
            Dictionary with ARIA's response
        """
        # Build messages with ARIA's personality
        messages = [
            {'role': 'system', 'content': self.personality.get_system_prompt()}
        ]
        
        # Add document context if provided
        if document_context:
            messages.append({
                'role': 'system', 
                'content': f"Document context:\n{document_context}\n\n{self.personality.get_document_analysis_prompt()}"
            })
        
        # Add user message
        messages.append({'role': 'user', 'content': user_message})
        
        result = await self.chat(messages)
        
        if result['success']:
            # Enhance response with ARIA's personality
            enhanced_response = self.personality.enhance_response(
                result['message'],
                context="general"
            )
            return {
                'success': True,
                'message': enhanced_response,
                'model': result.get('model'),
                'usage': result.get('usage')
            }
        else:
            return {
                'success': False,
                'error': self.personality.get_error_message("connection_error")
            }
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> Dict:
        """
        Send a chat request to the internal LLM.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Optional temperature override
            max_tokens: Optional max tokens override
            
        Returns:
            Dictionary with response
        """
        if not self.api_url:
            logger.warning("LLM API URL not configured")
            return {
                'success': False,
                'error': 'LLM not configured'
            }
        
        try:
            headers = {
                'Content-Type': 'application/json'
            }
            
            if self.api_key:
                headers['Authorization'] = f'Bearer {self.api_key}'
            
            payload = {
                'model': self.model,
                'messages': messages,
                'temperature': temperature or self.temperature,
                'max_tokens': max_tokens or self.max_tokens
            }
            
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    f'{self.api_url}/v1/chat/completions',
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        return {
                            'success': True,
                            'message': result['choices'][0]['message']['content'],
                            'model': result.get('model'),
                            'usage': result.get('usage', {})
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"LLM API error: {response.status} - {error_text}")
                        return {
                            'success': False,
                            'error': f'API returned status {response.status}'
                        }
        
        except Exception as e:
            logger.error(f"Error calling LLM API: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def query_document(
        self,
        document_text: str,
        question: str,
        document_metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Ask a question about a specific document with ARIA's personality.
        
        Args:
            document_text: Full text of the document
            question: User's question
            document_metadata: Optional metadata about the document
            
        Returns:
            Dictionary with answer
        """
        # Build context-aware prompt with ARIA's personality
        system_prompt = f"{ARIAPersonality.get_system_prompt()}\n\n{ARIAPersonality.get_document_analysis_prompt()}"
        
        # Include metadata if available
        context = f"Document content:\n\n{document_text}\n\n"
        
        if document_metadata:
            context += "Document metadata:\n"
            for key, value in document_metadata.items():
                if value:
                    context += f"- {key}: {value}\n"
            context += "\n"
        
        context += f"Question: {question}"
        
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': context}
        ]
        
        result = await self.chat(messages)
        
        if result['success']:
            # Enhance response with ARIA's personality
            enhanced_answer = ARIAPersonality.enhance_response(
                result['message'], 
                context="document_analysis"
            )
            return {
                'success': True,
                'question': question,
                'answer': enhanced_answer,
                'model': result.get('model'),
                'usage': result.get('usage')
            }
        else:
            # Enhance error message with ARIA's personality
            error_message = ARIAPersonality.get_error_message("processing_failed")
            return {
                'success': False,
                'error': error_message
            }
    
    async def extract_information(
        self,
        document_text: str,
        fields_to_extract: List[str]
    ) -> Dict:
        """
        Use LLM to extract specific fields from document text.
        
        Args:
            document_text: Full text of the document
            fields_to_extract: List of field names to extract
            
        Returns:
            Dictionary with extracted fields
        """
        fields_str = ", ".join(fields_to_extract)
        
        system_prompt = (
            "You are an AI assistant specialized in extracting structured data from documents. "
            "Extract the requested fields and return them in JSON format. "
            "If a field is not found, set its value to null."
        )
        
        user_prompt = (
            f"Extract the following fields from the document: {fields_str}\n\n"
            f"Document:\n{document_text}\n\n"
            f"Return the result as a JSON object with keys matching the field names."
        )
        
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ]
        
        result = await self.chat(messages, temperature=0.1)  # Lower temp for extraction
        
        if result['success']:
            try:
                # Try to parse the response as JSON
                extracted_data = json.loads(result['message'])
                return {
                    'success': True,
                    'extracted_data': extracted_data
                }
            except json.JSONDecodeError:
                # If not valid JSON, try to extract it from markdown code block
                message = result['message']
                if '```json' in message:
                    json_str = message.split('```json')[1].split('```')[0].strip()
                    try:
                        extracted_data = json.loads(json_str)
                        return {
                            'success': True,
                            'extracted_data': extracted_data
                        }
                    except json.JSONDecodeError:
                        pass
                
                return {
                    'success': False,
                    'error': 'Could not parse LLM response as JSON',
                    'raw_response': message
                }
        else:
            return result
    
    async def summarize_document(
        self,
        document_text: str,
        max_words: int = 150
    ) -> Dict:
        """
        Generate a summary of the document.
        
        Args:
            document_text: Full text of the document
            max_words: Maximum words in summary
            
        Returns:
            Dictionary with summary
        """
        system_prompt = (
            "You are an AI assistant specialized in summarizing business documents. "
            "Create concise, accurate summaries that capture the key information."
        )
        
        user_prompt = (
            f"Summarize the following document in no more than {max_words} words. "
            f"Focus on the most important information.\n\n"
            f"Document:\n{document_text}"
        )
        
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ]
        
        result = await self.chat(messages, temperature=0.5)
        
        if result['success']:
            return {
                'success': True,
                'summary': result['message'],
                'model': result.get('model')
            }
        else:
            return result
    
    async def compare_documents(
        self,
        doc1_text: str,
        doc2_text: str,
        doc1_name: str = "Document 1",
        doc2_name: str = "Document 2"
    ) -> Dict:
        """
        Compare two documents and identify differences.
        
        Args:
            doc1_text: First document text
            doc2_text: Second document text
            doc1_name: Name of first document
            doc2_name: Name of second document
            
        Returns:
            Dictionary with comparison results
        """
        system_prompt = (
            "You are an AI assistant specialized in comparing business documents. "
            "Identify key similarities and differences between documents."
        )
        
        user_prompt = (
            f"Compare these two documents and highlight key differences:\n\n"
            f"{doc1_name}:\n{doc1_text}\n\n"
            f"{doc2_name}:\n{doc2_text}\n\n"
            f"Focus on: amounts, dates, parties involved, and any discrepancies."
        )
        
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ]
        
        result = await self.chat(messages)
        
        if result['success']:
            return {
                'success': True,
                'comparison': result['message'],
                'model': result.get('model')
            }
        else:
            return result


# Singleton instance
llm_service = LLMService()
