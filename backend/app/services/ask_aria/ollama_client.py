"""
Ollama LLM Client for Ask Aria
Handles communication with local Ollama instance for conversational AI
Falls back to intelligent rule-based responses when Ollama is not available
"""
import json
import requests
import os
import re
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Intelligent response templates for when LLM is not available
INTELLIGENT_RESPONSES = {
    "greeting": [
        "Hello! I'm Aria, your intelligent ERP assistant. I can help you with:\n\n"
        "- **Sales & Quotes**: Create quotes, sales orders, track deliveries\n"
        "- **Purchasing**: Create purchase orders, manage suppliers\n"
        "- **Finance**: View invoices, payments, reconciliations\n"
        "- **Inventory**: Check stock levels, manage products\n"
        "- **Reports**: Generate financial and operational reports\n\n"
        "What would you like to do today?"
    ],
    "quote": [
        "I can help you create a quote! To get started, I'll need:\n\n"
        "1. **Customer name** - Who is this quote for?\n"
        "2. **Products/Services** - What items to include?\n"
        "3. **Quantities** - How many of each item?\n\n"
        "You can also navigate to **Sales > Quotes** to create one directly, or tell me the customer name to begin."
    ],
    "purchase_order": [
        "I can help you create a purchase order! To proceed, I'll need:\n\n"
        "1. **Supplier name** - Who are you ordering from?\n"
        "2. **Products** - What items do you need?\n"
        "3. **Quantities** - How many of each?\n\n"
        "You can also go to **Purchasing > Purchase Orders** to create one, or tell me the supplier name to start."
    ],
    "invoice": [
        "I can help with invoices! Here are your options:\n\n"
        "- **View invoices**: Go to Financial > AR Invoices or AP Invoices\n"
        "- **Create invoice**: Navigate to Financial > AR Invoices > New Invoice\n"
        "- **Check payments**: Go to Financial > Receipts or Payments\n\n"
        "What specific invoice action would you like to take?"
    ],
    "customer": [
        "I can help you find customer information! You can:\n\n"
        "- **View all customers**: Go to Sales > Customers\n"
        "- **Search customers**: Use the search bar in the Customers page\n"
        "- **Add new customer**: Click 'New Customer' in the Customers page\n\n"
        "Would you like me to show you the customer list?"
    ],
    "inventory": [
        "I can help with inventory management! Here's what you can do:\n\n"
        "- **Check stock levels**: Go to Operations > Inventory > Stock\n"
        "- **View products**: Go to Operations > Products\n"
        "- **Stock movements**: Go to Operations > Stock Movements\n"
        "- **Warehouses**: Go to Operations > Warehouses\n\n"
        "What inventory information do you need?"
    ],
    "report": [
        "I can help you generate reports! Available reports include:\n\n"
        "- **Financial Reports**: Profit & Loss, Balance Sheet, Cash Flow\n"
        "- **Sales Reports**: Sales by Customer, Product, Period\n"
        "- **Aged Receivables/Payables**: Outstanding invoices\n"
        "- **VAT Reports**: VAT Summary for SARS submission\n\n"
        "Go to **Reports** in the menu to access all reports. Which report do you need?"
    ],
    "dashboard": [
        "The Executive Dashboard shows your business overview including:\n\n"
        "- **Revenue & Expenses**: Current month vs previous\n"
        "- **Outstanding Invoices**: AR and AP aging\n"
        "- **Cash Position**: Bank balances and cash flow\n"
        "- **Key Metrics**: Sales, orders, deliveries\n\n"
        "You can access it from the main Dashboard link in the menu."
    ],
    "bot": [
        "ARIA has 67 AI automation bots that can help with:\n\n"
        "- **Financial Bots**: Invoice processing, reconciliation, GL posting\n"
        "- **Sales Bots**: Quote generation, order processing\n"
        "- **HR Bots**: Payroll, leave management\n"
        "- **Compliance Bots**: VAT returns, tax filings\n\n"
        "Go to **Automation > Bots Hub** to view and configure all bots."
    ],
    "help": [
        "Here's how I can help you:\n\n"
        "- **Create documents**: Say 'create quote', 'create PO', 'create invoice'\n"
        "- **Find information**: Say 'show customers', 'check inventory', 'view reports'\n"
        "- **Navigate**: Say 'go to dashboard', 'open sales orders'\n"
        "- **Get help**: Say 'how do I...' for guidance on any feature\n\n"
        "What would you like to do?"
    ],
    "default": [
        "I understand you're asking about '{query}'. Here's how I can help:\n\n"
        "- For **sales tasks**: Try 'create quote' or 'view sales orders'\n"
        "- For **purchasing**: Try 'create purchase order' or 'view suppliers'\n"
        "- For **finance**: Try 'view invoices' or 'check payments'\n"
        "- For **reports**: Try 'generate sales report' or 'show dashboard'\n\n"
        "Could you be more specific about what you'd like to do?"
    ]
}


def detect_intent(message: str) -> str:
    """Detect user intent from message using keyword matching"""
    message_lower = message.lower()
    
    # Greeting patterns
    if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'start', 'begin']):
        return "greeting"
    
    # Quote patterns
    if any(word in message_lower for word in ['quote', 'quotation', 'estimate', 'proposal']):
        return "quote"
    
    # Purchase order patterns
    if any(phrase in message_lower for phrase in ['purchase order', 'po', 'buy', 'order from supplier', 'procurement']):
        return "purchase_order"
    
    # Invoice patterns
    if any(word in message_lower for word in ['invoice', 'bill', 'payment', 'receipt', 'ar', 'ap']):
        return "invoice"
    
    # Customer patterns
    if any(word in message_lower for word in ['customer', 'client', 'buyer']):
        return "customer"
    
    # Inventory patterns
    if any(word in message_lower for word in ['inventory', 'stock', 'product', 'warehouse', 'item']):
        return "inventory"
    
    # Report patterns
    if any(word in message_lower for word in ['report', 'analytics', 'analysis', 'summary', 'statement']):
        return "report"
    
    # Dashboard patterns
    if any(word in message_lower for word in ['dashboard', 'overview', 'summary', 'metrics', 'kpi']):
        return "dashboard"
    
    # Bot patterns
    if any(word in message_lower for word in ['bot', 'automation', 'automate', 'ai', 'agent']):
        return "bot"
    
    # Help patterns
    if any(word in message_lower for word in ['help', 'how', 'what can', 'guide', 'tutorial']):
        return "help"
    
    return "default"


def generate_intelligent_response(messages: List[Dict[str, str]], query: str = "") -> str:
    """Generate an intelligent response based on conversation context"""
    # Get the last user message
    last_user_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_user_message = msg.get("content", "")
            break
    
    if not last_user_message:
        last_user_message = query
    
    intent = detect_intent(last_user_message)
    responses = INTELLIGENT_RESPONSES.get(intent, INTELLIGENT_RESPONSES["default"])
    response = responses[0]
    
    # Replace placeholder with actual query
    if "{query}" in response:
        response = response.replace("{query}", last_user_message[:50])
    
    return response


class OllamaClient:
    """Client for interacting with Ollama local LLM with intelligent fallback"""
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "tinyllama:latest"):
        self.base_url = os.getenv("OLLAMA_BASE_URL", base_url)
        self.model = os.getenv("OLLAMA_MODEL", model)
        self.timeout = 120
        self._available = None
        self._check_availability()
    
    def _check_availability(self):
        """Check if Ollama service is available on startup"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=3)
            self._available = response.status_code == 200
            if self._available:
                logger.info(f"Ollama is available at {self.base_url}")
            else:
                logger.warning(f"Ollama returned status {response.status_code}, using intelligent fallback")
        except Exception as e:
            self._available = False
            logger.warning(f"Ollama not available ({str(e)}), using intelligent fallback responses")
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Send chat completion request to Ollama with intelligent fallback
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool/function definitions
            temperature: Sampling temperature (0-1)
            stream: Whether to stream the response
            
        Returns:
            Response dict with 'message' and optional 'tool_calls'
        """
        if not self._available:
            response_text = generate_intelligent_response(messages)
            return {
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "done": True
            }
        
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "stream": stream,
                "keep_alive": "1h",
                "options": {
                    "num_predict": 150,
                    "num_ctx": 2048,
                    "temperature": 0.2,
                    "top_k": 40,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1
                }
            }
            
            if tools:
                payload["tools"] = tools
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Ollama chat response: {result.get('message', {}).get('role')}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Ollama request failed: {str(e)}, using intelligent fallback")
            response_text = generate_intelligent_response(messages)
            return {
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "done": True
            }
    
    def generate(self, prompt: str, temperature: float = 0.2) -> str:
        """
        Simple text generation (non-chat mode)
        
        Args:
            prompt: Text prompt
            temperature: Sampling temperature
            
        Returns:
            Generated text
        """
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "temperature": temperature,
                "stream": False,
                "keep_alive": "1h",
                "options": {
                    "num_predict": 150,  # Increased from 80 for better responses
                    "num_ctx": 2048,  # Increased from 768 to prevent truncation
                    "temperature": 0.2,
                    "top_k": 40,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama generate failed: {str(e)}")
            raise Exception(f"Failed to generate text: {str(e)}")
    
    def list_models(self) -> List[str]:
        """List available models in Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            response.raise_for_status()
            
            result = response.json()
            models = [m["name"] for m in result.get("models", [])]
            return models
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to list Ollama models: {str(e)}")
            return []
    
    def pull_model(self, model_name: str) -> bool:
        """Pull/download a model from Ollama registry"""
        try:
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name},
                timeout=600  # 10 minutes for model download
            )
            response.raise_for_status()
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to pull model {model_name}: {str(e)}")
            return False
    
    def is_available(self) -> bool:
        """Check if Ollama service is available"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2
    ):
        """
        Stream chat completion from Ollama (generator) with intelligent fallback
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool/function definitions
            temperature: Sampling temperature (0-1)
            
        Yields:
            Chunks of response text as they arrive
        """
        if not self._available:
            response_text = generate_intelligent_response(messages)
            for word in response_text.split(' '):
                yield word + ' '
            return
        
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "stream": True,
                "keep_alive": "1h",
                "options": {
                    "num_predict": 150,
                    "num_ctx": 2048,
                    "temperature": 0.2,
                    "top_k": 40,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1
                }
            }
            
            if tools:
                payload["tools"] = tools
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout,
                stream=True
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        if chunk.get("message", {}).get("content"):
                            yield chunk["message"]["content"]
                        
                        if chunk.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
                        
        except requests.exceptions.RequestException as e:
            logger.warning(f"Ollama streaming failed: {str(e)}, using intelligent fallback")
            response_text = generate_intelligent_response(messages)
            for word in response_text.split(' '):
                yield word + ' '
    
    def _warmup(self):
        """Warmup the model on initialization to reduce first-call latency"""
        try:
            logger.info(f"Warming up Ollama model {self.model}...")
            self.generate("Hello", temperature=0.1)
            logger.info("Ollama model warmed up successfully")
        except Exception as e:
            logger.warning(f"Failed to warmup Ollama model: {str(e)}")


ollama_client = OllamaClient()
