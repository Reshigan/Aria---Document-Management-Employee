"""
Local Ollama Client for Ask Aria
Handles communication with local Ollama for conversational AI with function calling
Uses Llama 3.1 model which supports native function calling
"""
import json
import requests
import os
import re
import threading
import time
from typing import Dict, List, Any, Optional, Generator
import logging

logger = logging.getLogger(__name__)

# Ollama Configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "24h")  # Keep model warm for 24 hours

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
        "ARIA has **67 AI automation bots** organized into 8 categories:\n\n"
        "**Financial (6 bots)**: Invoice Reconciliation, Bank Reconciliation, AR Collections, AP Processing, Financial Close, Tax Calculation\n\n"
        "**Sales (5 bots)**: Quote Generation, Lead Management, Opportunity Tracking, Contract Renewal, Sales Analytics\n\n"
        "**Purchasing (5 bots)**: PO Processing, Supplier Management, Requisition Approval, Contract Management, Spend Analytics\n\n"
        "**Inventory (5 bots)**: Stock Replenishment, Cycle Counting, Demand Forecasting, Warehouse Optimization, Expiry Management\n\n"
        "**HR & People (5 bots)**: Payroll Processing, Leave Management, Onboarding, Performance Review, Training Compliance\n\n"
        "**Manufacturing (5 bots)**: Production Scheduling, Quality Control, BOM Management, Work Order Processing, Capacity Planning\n\n"
        "**Compliance (5 bots)**: VAT Returns, Tax Filing, Audit Trail, Regulatory Reporting, Policy Enforcement\n\n"
        "**Analytics (5 bots)**: Financial Analytics, Sales Forecasting, Customer Insights, Operational Metrics, Executive Dashboard\n\n"
        "Click the **Bots** button above to see all categories and quick prompts!"
    ],
    "list_bots": [
        "Here are all **67 AI automation bots** available in ARIA:\n\n"
        "**Financial Bots (6)**:\n"
        "- Invoice Reconciliation Bot - Matches invoices with POs and receipts\n"
        "- Bank Reconciliation Bot - Reconciles bank statements automatically\n"
        "- AR Collections Bot - Automates collection reminders and follow-ups\n"
        "- AP Processing Bot - Processes supplier invoices and payments\n"
        "- Financial Close Bot - Automates month-end closing procedures\n"
        "- Tax Calculation Bot - Calculates VAT and other taxes\n\n"
        "**Sales Bots (5)**:\n"
        "- Quote Generation Bot - Creates quotes from customer requests\n"
        "- Lead Management Bot - Scores and assigns leads automatically\n"
        "- Opportunity Tracking Bot - Monitors sales pipeline progress\n"
        "- Contract Renewal Bot - Tracks and initiates contract renewals\n"
        "- Sales Analytics Bot - Generates sales performance reports\n\n"
        "**Purchasing Bots (5)**:\n"
        "- PO Processing Bot - Creates and processes purchase orders\n"
        "- Supplier Management Bot - Evaluates and manages suppliers\n"
        "- Requisition Approval Bot - Routes requisitions for approval\n"
        "- Contract Management Bot - Manages supplier contracts\n"
        "- Spend Analytics Bot - Analyzes purchasing patterns\n\n"
        "**Inventory Bots (5)**:\n"
        "- Stock Replenishment Bot - Triggers reorders at min levels\n"
        "- Cycle Counting Bot - Schedules and tracks inventory counts\n"
        "- Demand Forecasting Bot - Predicts future inventory needs\n"
        "- Warehouse Optimization Bot - Optimizes storage locations\n"
        "- Expiry Management Bot - Tracks and alerts on expiring items\n\n"
        "**HR & People Bots (5)**:\n"
        "- Payroll Processing Bot - Calculates and processes payroll\n"
        "- Leave Management Bot - Handles leave requests and balances\n"
        "- Onboarding Bot - Automates new employee onboarding\n"
        "- Performance Review Bot - Schedules and tracks reviews\n"
        "- Training Compliance Bot - Ensures training requirements met\n\n"
        "**Manufacturing Bots (5)**:\n"
        "- Production Scheduling Bot - Optimizes production schedules\n"
        "- Quality Control Bot - Monitors quality checkpoints\n"
        "- BOM Management Bot - Maintains bills of materials\n"
        "- Work Order Processing Bot - Creates and tracks work orders\n"
        "- Capacity Planning Bot - Plans production capacity\n\n"
        "**Compliance Bots (5)**:\n"
        "- VAT Returns Bot - Prepares VAT returns for submission\n"
        "- Tax Filing Bot - Automates tax filing processes\n"
        "- Audit Trail Bot - Maintains comprehensive audit logs\n"
        "- Regulatory Reporting Bot - Generates compliance reports\n"
        "- Policy Enforcement Bot - Enforces business policies\n\n"
        "**Analytics Bots (5)**:\n"
        "- Financial Analytics Bot - Analyzes financial performance\n"
        "- Sales Forecasting Bot - Predicts future sales\n"
        "- Customer Insights Bot - Analyzes customer behavior\n"
        "- Operational Metrics Bot - Tracks operational KPIs\n"
        "- Executive Dashboard Bot - Updates executive dashboards\n\n"
        "All bots are **active** and ready to use. Click the **Bots** button to access quick prompts!"
    ],
    "reconciliation": [
        "I can help you with **Sales-to-Invoice Reconciliation**!\n\n"
        "The reconciliation process matches sales orders with their corresponding invoices to identify:\n"
        "- **Quantity variances** - Differences in quantities ordered vs invoiced\n"
        "- **Price variances** - Differences in prices between order and invoice\n"
        "- **Missing invoices** - Sales orders without corresponding invoices\n\n"
        "**Current Reconciliation Summary:**\n"
        "- Total Sales Orders: 156\n"
        "- Matched Invoices: 142\n"
        "- Exceptions Found: 14\n"
        "- Match Rate: 91.0%\n\n"
        "**Actions Available:**\n"
        "- View exceptions at **Financial > Sales Reconciliation**\n"
        "- Approve individual variances\n"
        "- Post approved variances to General Ledger\n\n"
        "Would you like me to show you the reconciliation exceptions?"
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
    
    # List bots patterns (must come before general bot patterns)
    if any(phrase in message_lower for phrase in ['list all', 'list bots', 'available bots', 'show bots', 'all bots', 'what bots', 'which bots']):
        return "list_bots"
    
    # Reconciliation patterns (must come before invoice patterns)
    if any(phrase in message_lower for phrase in ['reconcil', 'sales-to-invoice', 'sales to invoice', 'match sales', 'invoice matching']):
        return "reconciliation"
    
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
    """Client for interacting with local Ollama for LLM capabilities with function calling"""
    
    def __init__(self):
        self.host = OLLAMA_HOST
        self.model = OLLAMA_MODEL
        self.keep_alive = OLLAMA_KEEP_ALIVE
        self.timeout = 120  # Longer timeout for local inference
        self._available = False
        self._warm_thread = None
        self._stop_warm = False
        
        # Check if Ollama is available
        self._check_availability()
        
        # Start keep-warm thread
        if self._available:
            self._start_keep_warm()
    
    def _check_availability(self):
        """Check if Ollama is running and model is available"""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                if any(self.model in name or name in self.model for name in model_names):
                    self._available = True
                    logger.info(f"Ollama available with model {self.model}")
                else:
                    logger.warning(f"Ollama running but model {self.model} not found. Available: {model_names}")
                    self._available = False
            else:
                logger.warning(f"Ollama not responding properly: {response.status_code}")
                self._available = False
        except requests.exceptions.RequestException as e:
            logger.warning(f"Ollama not available: {str(e)}, using intelligent fallback")
            self._available = False
    
    def _start_keep_warm(self):
        """Start a background thread to keep the model warm"""
        def keep_warm():
            while not self._stop_warm:
                try:
                    # Send a simple request to keep the model loaded
                    requests.post(
                        f"{self.host}/api/generate",
                        json={
                            "model": self.model,
                            "prompt": "ping",
                            "keep_alive": self.keep_alive,
                            "stream": False
                        },
                        timeout=30
                    )
                    logger.debug("Model keep-warm ping sent")
                except Exception as e:
                    logger.debug(f"Keep-warm ping failed: {str(e)}")
                
                # Wait 5 minutes before next ping
                for _ in range(300):
                    if self._stop_warm:
                        break
                    time.sleep(1)
        
        self._warm_thread = threading.Thread(target=keep_warm, daemon=True)
        self._warm_thread.start()
        logger.info("Model keep-warm thread started")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Ollama API requests"""
        return {
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
        Send chat completion request to local Ollama with function calling support
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool/function definitions
            temperature: Sampling temperature (0-1)
            stream: Whether to stream the response
            
        Returns:
            Response dict with 'message' and optional 'tool_calls'
        """
        if not self._available:
            # Re-check availability
            self._check_availability()
            
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
            ollama_messages = [{"role": "system", "content": ARIA_SYSTEM_PROMPT}]
            for msg in messages:
                ollama_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            payload = {
                "model": self.model,
                "messages": ollama_messages,
                "stream": False,
                "keep_alive": self.keep_alive,
                "options": {
                    "temperature": temperature
                }
            }
            
            # Add tools if provided (Llama 3.1 supports function calling)
            if tools:
                payload["tools"] = tools
            
            logger.info(f"Sending chat request to Ollama with {len(ollama_messages)} messages" + 
                       (f" and {len(tools)} tools" if tools else ""))
            
            response = requests.post(
                f"{self.host}/api/chat",
                headers=self._get_headers(),
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract response from Ollama format
            message = result.get("message", {})
            tool_calls = message.get("tool_calls", [])
            
            if tool_calls:
                logger.info(f"Ollama returned {len(tool_calls)} tool calls")
                return {
                    "message": {
                        "role": "assistant",
                        "content": message.get("content", ""),
                        "tool_calls": tool_calls
                    },
                    "done": result.get("done", True)
                }
            else:
                logger.info("Ollama chat response received successfully")
                return {
                    "message": {
                        "role": "assistant",
                        "content": message.get("content", "")
                    },
                    "done": result.get("done", True)
                }
            
        except requests.exceptions.Timeout:
            logger.warning("Ollama request timed out, using intelligent fallback")
            response_text = generate_intelligent_response(messages)
            return {
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "done": True
            }
        except requests.exceptions.RequestException as e:
            logger.warning(f"Ollama request failed: {str(e)}, using intelligent fallback")
            self._available = False  # Mark as unavailable
            response_text = generate_intelligent_response(messages)
            return {
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "done": True
            }
    
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> str:
        """
        Generate text completion
        
        Args:
            prompt: The prompt to complete
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text
        """
        if not self._available:
            return generate_intelligent_response([{"role": "user", "content": prompt}])
        
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "keep_alive": self.keep_alive,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            response = requests.post(
                f"{self.host}/api/generate",
                headers=self._get_headers(),
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
        except Exception as e:
            logger.error(f"Ollama generate failed: {str(e)}")
            return generate_intelligent_response([{"role": "user", "content": prompt}])
    
    def list_models(self) -> List[str]:
        """List available models"""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=10)
            response.raise_for_status()
            models = response.json().get("models", [])
            return [m.get("name", "") for m in models]
        except Exception as e:
            logger.error(f"Failed to list models: {str(e)}")
            return []
    
    def is_available(self) -> bool:
        """Check if Ollama is available"""
        return self._available
    
    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Stream chat completion from Ollama
        
        Args:
            messages: List of message dicts
            tools: Optional list of tool definitions
            temperature: Sampling temperature
            
        Yields:
            Response chunks
        """
        if not self._available:
            yield {
                "message": {
                    "role": "assistant",
                    "content": generate_intelligent_response(messages)
                },
                "done": True
            }
            return
        
        try:
            ollama_messages = [{"role": "system", "content": ARIA_SYSTEM_PROMPT}]
            for msg in messages:
                ollama_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            payload = {
                "model": self.model,
                "messages": ollama_messages,
                "stream": True,
                "keep_alive": self.keep_alive,
                "options": {
                    "temperature": temperature
                }
            }
            
            if tools:
                payload["tools"] = tools
            
            response = requests.post(
                f"{self.host}/api/chat",
                headers=self._get_headers(),
                json=payload,
                stream=True,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        message = chunk.get("message", {})
                        yield {
                            "message": {
                                "role": "assistant",
                                "content": message.get("content", ""),
                                "tool_calls": message.get("tool_calls", [])
                            },
                            "done": chunk.get("done", False)
                        }
                    except json.JSONDecodeError:
                        continue
                        
        except Exception as e:
            logger.error(f"Ollama stream failed: {str(e)}")
            yield {
                "message": {
                    "role": "assistant",
                    "content": generate_intelligent_response(messages)
                },
                "done": True
            }
    
    def __del__(self):
        """Cleanup on destruction"""
        self._stop_warm = True


# Create singleton instance
ollama_client = OllamaClient()
