"""
Ollama Integration Service - Local LLM Models
Reduces token costs by using self-hosted models
"""
import requests
from typing import Optional, Dict, Any, List
import json
from datetime import datetime

class OllamaService:
    """Service for interacting with Ollama local models"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.default_model = "mistral:7b"
        
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Chat with Ollama model
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (mistral, llama2, codellama, phi)
            temperature: Sampling temperature
            max_tokens: Max response tokens
            stream: Whether to stream response
            
        Returns:
            Response dict with 'content', 'model', 'tokens'
        """
        model = model or self.default_model
        
        try:
            # Format messages for Ollama
            prompt = self._format_messages(messages)
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": stream
                },
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "content": result.get("response", ""),
                    "model": model,
                    "tokens": {
                        "prompt": result.get("prompt_eval_count", 0),
                        "completion": result.get("eval_count", 0),
                        "total": result.get("prompt_eval_count", 0) + result.get("eval_count", 0)
                    },
                    "cost": 0.0,  # FREE with local models!
                    "done": result.get("done", True)
                }
            else:
                raise Exception(f"Ollama API error: {response.status_code}")
                
        except Exception as e:
            raise Exception(f"Ollama service error: {str(e)}")
    
    def extract_structured_data(
        self,
        text: str,
        schema: Dict[str, Any],
        model: str = "mistral:7b"
    ) -> Dict[str, Any]:
        """
        Extract structured data from text using Ollama
        Perfect for document parsing, form extraction, etc.
        """
        prompt = f"""Extract structured data from the following text according to the schema.
Return ONLY valid JSON, no explanation.

Schema:
{json.dumps(schema, indent=2)}

Text:
{text}

JSON:"""
        
        messages = [{"role": "user", "content": prompt}]
        response = self.chat(messages, model=model, temperature=0.1)
        
        try:
            # Parse JSON from response
            json_str = response["content"].strip()
            # Remove markdown code blocks if present
            if json_str.startswith("```"):
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            
            return json.loads(json_str)
        except json.JSONDecodeError:
            # Fallback: try to extract JSON from text
            import re
            json_match = re.search(r'\{.*\}', response["content"], re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            raise Exception("Failed to parse structured data")
    
    def classify_text(
        self,
        text: str,
        categories: List[str],
        model: str = "mistral:7b"
    ) -> Dict[str, Any]:
        """
        Classify text into one of the provided categories
        """
        categories_str = ", ".join(categories)
        prompt = f"""Classify the following text into ONE of these categories: {categories_str}

Text: {text}

Return ONLY the category name, nothing else."""
        
        messages = [{"role": "user", "content": prompt}]
        response = self.chat(messages, model=model, temperature=0.1)
        
        category = response["content"].strip()
        
        # Validate category
        if category not in categories:
            # Try fuzzy match
            category_lower = category.lower()
            for cat in categories:
                if cat.lower() in category_lower or category_lower in cat.lower():
                    category = cat
                    break
        
        return {
            "category": category,
            "confidence": 0.85,  # Ollama doesn't return confidence scores
            "text": text
        }
    
    def generate_response(
        self,
        context: str,
        query: str,
        model: str = "llama2:13b",
        tone: str = "professional"
    ) -> str:
        """
        Generate contextual response (for helpdesk, customer service)
        """
        prompt = f"""You are a helpful assistant. Use the context below to answer the query in a {tone} tone.

Context:
{context}

Query: {query}

Response:"""
        
        messages = [{"role": "user", "content": prompt}]
        response = self.chat(messages, model=model, temperature=0.7)
        
        return response["content"].strip()
    
    def _format_messages(self, messages: List[Dict[str, str]]) -> str:
        """Format chat messages for Ollama prompt"""
        formatted = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            if role == "system":
                formatted.append(f"System: {content}")
            elif role == "user":
                formatted.append(f"User: {content}")
            elif role == "assistant":
                formatted.append(f"Assistant: {content}")
        
        return "\n\n".join(formatted) + "\n\nAssistant:"
    
    def list_models(self) -> List[str]:
        """List available Ollama models"""
        try:
            response = requests.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                return [m["name"] for m in models]
            return []
        except:
            return []
    
    def health_check(self) -> bool:
        """Check if Ollama is running and accessible"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False


# Recommended models for different tasks
OLLAMA_MODELS = {
    "document_extraction": "mistral:7b",  # Fast, accurate for structured data
    "helpdesk": "llama2:13b",             # Better reasoning for conversations
    "sales_order": "mistral:7b",          # Efficient for order processing
    "classification": "phi-2",            # Microsoft's efficient model
    "code_generation": "codellama:7b",    # For technical tasks
    "general": "llama2:7b"                # General purpose
}
