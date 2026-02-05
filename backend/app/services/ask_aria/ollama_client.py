"""
Cloudflare Workers AI Client for Ask Aria
Handles communication with Cloudflare Workers AI for conversational AI
Uses Llama 3.1 model via Cloudflare's AI REST API
"""
import json
import requests
import os
import re
from typing import Dict, List, Any, Optional, Generator
import logging

logger = logging.getLogger(__name__)

# Cloudflare Workers AI Configuration
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "08596e523c096f04b56d7ae43f7821f4")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "")
CLOUDFLARE_AI_MODEL = os.getenv("CLOUDFLARE_AI_MODEL", "@cf/meta/llama-3.1-8b-instruct")

# System prompt for ARIA ERP assistant
ARIA_SYSTEM_PROMPT = """You are ARIA, an intelligent AI assistant for a comprehensive ERP (Enterprise Resource Planning) system. You help users with:

- **Sales & Quotes**: Creating quotes, sales orders, tracking deliveries, managing customers
- **Purchasing**: Creating purchase orders, managing suppliers, procurement workflows
- **Finance**: Invoices (AR/AP), payments, receipts, bank reconciliation, general ledger
- **Inventory**: Stock levels, products, warehouses, stock movements
- **HR & Payroll**: Employee management, leave, payroll processing
- **Reports**: Financial reports, sales analytics, aged receivables/payables

You are helpful, concise, and guide users to the right features. When users want to create documents, ask for the necessary details. Always be professional and knowledgeable about ERP processes.

The system has 67 AI automation bots that handle tasks like invoice processing, reconciliation, and compliance. You can help users understand and configure these bots.

Keep responses concise but helpful. Use markdown formatting for clarity."""

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


class CloudflareAIClient:
    """Client for interacting with Cloudflare Workers AI for LLM capabilities"""
    
    def __init__(self):
        self.account_id = CLOUDFLARE_ACCOUNT_ID
        self.api_token = CLOUDFLARE_API_TOKEN
        self.model = CLOUDFLARE_AI_MODEL
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run"
        self.timeout = 60
        self._available = bool(self.api_token)
        
        if self._available:
            logger.info(f"Cloudflare Workers AI configured with model {self.model}")
        else:
            logger.warning("Cloudflare API token not configured, using intelligent fallback")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Cloudflare API requests"""
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Send chat completion request to Cloudflare Workers AI
        
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
            # Prepare messages with system prompt
            cf_messages = [{"role": "system", "content": ARIA_SYSTEM_PROMPT}]
            for msg in messages:
                cf_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            payload = {
                "messages": cf_messages,
                "max_tokens": 1024,
                "temperature": temperature
            }
            
            response = requests.post(
                f"{self.base_url}/{self.model}",
                headers=self._get_headers(),
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract response from Cloudflare AI format
            if result.get("success") and result.get("result"):
                response_content = result["result"].get("response", "")
                logger.info("Cloudflare AI chat response received successfully")
                return {
                    "message": {
                        "role": "assistant",
                        "content": response_content
                    },
                    "done": True
                }
            else:
                error_msg = result.get("errors", [{"message": "Unknown error"}])[0].get("message", "Unknown error")
                logger.warning(f"Cloudflare AI error: {error_msg}, using fallback")
                response_text = generate_intelligent_response(messages)
                return {
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    },
                    "done": True
                }
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Cloudflare AI request failed: {str(e)}, using intelligent fallback")
            response_text = generate_intelligent_response(messages)
            return {
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "done": True
            }
    
    def generate(self, prompt: str, temperature: float = 0.7) -> str:
        """
        Simple text generation using Cloudflare Workers AI
        
        Args:
            prompt: Text prompt
            temperature: Sampling temperature
            
        Returns:
            Generated text
        """
        if not self._available:
            return generate_intelligent_response([{"role": "user", "content": prompt}])
        
        try:
            payload = {
                "messages": [
                    {"role": "system", "content": ARIA_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 512,
                "temperature": temperature
            }
            
            response = requests.post(
                f"{self.base_url}/{self.model}",
                headers=self._get_headers(),
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            if result.get("success") and result.get("result"):
                return result["result"].get("response", "")
            return ""
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Cloudflare AI generate failed: {str(e)}")
            return generate_intelligent_response([{"role": "user", "content": prompt}])
    
    def list_models(self) -> List[str]:
        """List available Cloudflare AI models"""
        return [
            "@cf/meta/llama-3.1-8b-instruct",
            "@cf/meta/llama-3-8b-instruct",
            "@cf/mistral/mistral-7b-instruct-v0.1",
            "@cf/microsoft/phi-2"
        ]
    
    def is_available(self) -> bool:
        """Check if Cloudflare AI service is available"""
        return self._available and bool(self.api_token)
    
    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7
    ) -> Generator[str, None, None]:
        """
        Stream chat completion from Cloudflare Workers AI
        Note: Cloudflare AI doesn't support true streaming, so we simulate it
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool/function definitions
            temperature: Sampling temperature (0-1)
            
        Yields:
            Chunks of response text
        """
        if not self._available:
            response_text = generate_intelligent_response(messages)
            for word in response_text.split(' '):
                yield word + ' '
            return
        
        try:
            # Prepare messages with system prompt
            cf_messages = [{"role": "system", "content": ARIA_SYSTEM_PROMPT}]
            for msg in messages:
                cf_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            payload = {
                "messages": cf_messages,
                "max_tokens": 1024,
                "temperature": temperature,
                "stream": True
            }
            
            response = requests.post(
                f"{self.base_url}/{self.model}",
                headers=self._get_headers(),
                json=payload,
                timeout=self.timeout,
                stream=True
            )
            response.raise_for_status()
            
            # Handle streaming response
            for line in response.iter_lines():
                if line:
                    try:
                        # Remove 'data: ' prefix if present
                        line_str = line.decode('utf-8') if isinstance(line, bytes) else line
                        if line_str.startswith('data: '):
                            line_str = line_str[6:]
                        if line_str == '[DONE]':
                            break
                        
                        chunk = json.loads(line_str)
                        if chunk.get("response"):
                            yield chunk["response"]
                    except json.JSONDecodeError:
                        continue
                        
        except requests.exceptions.RequestException as e:
            logger.warning(f"Cloudflare AI streaming failed: {str(e)}, using intelligent fallback")
            response_text = generate_intelligent_response(messages)
            for word in response_text.split(' '):
                yield word + ' '


# Create client instance - maintains backward compatibility with ollama_client name
ollama_client = CloudflareAIClient()
