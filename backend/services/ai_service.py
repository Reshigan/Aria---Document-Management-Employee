"""
AI Service - Local Ollama Integration for Bot Intelligence
Supports both Ollama (local, free) and OpenAI (cloud, paid)
"""

import os
import json
import httpx
from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class AIMessage(BaseModel):
    """AI Message"""
    role: str  # system, user, assistant
    content: str


class AIResponse(BaseModel):
    """AI Response"""
    content: str
    confidence: float
    tokens_used: int
    model: str


class AIService:
    """
    AI Service for Bot Intelligence
    Default: Uses local Ollama (free, private, fast)
    Fallback: OpenAI GPT-4 (requires API key)
    """
    
    def __init__(self):
        """Initialize AI Service"""
        # Determine AI provider
        self.provider = os.getenv("AI_PROVIDER", "ollama").lower()  # ollama or openai
        
        # Ollama configuration (default)
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")  # llama3.2, mistral, mixtral, phi3
        
        # OpenAI configuration (fallback)
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
        
        # Set up based on provider
        if self.provider == "ollama":
            self.enabled = True
            self.default_model = self.ollama_model
            print(f"✅ AI Service initialized with Ollama ({self.ollama_model}) at {self.ollama_base_url}")
        elif self.provider == "openai" and self.openai_api_key:
            self.enabled = True
            self.default_model = self.openai_model
            print(f"✅ AI Service initialized with OpenAI ({self.openai_model})")
        else:
            self.enabled = False
            self.default_model = "none"
            print("⚠️  AI Service disabled - No provider configured")
        
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def chat_completion(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        response_format: Optional[Dict] = None
    ) -> AIResponse:
        """
        Get chat completion from AI
        
        Args:
            messages: List of messages
            model: Model to use
            temperature: Temperature (0-1, lower = more deterministic)
            max_tokens: Max tokens to generate
            response_format: Response format (e.g., {"type": "json_object"})
        
        Returns:
            AIResponse
        """
        if not self.enabled:
            return AIResponse(
                content="AI service not configured. Please install Ollama or set OPENAI_API_KEY.",
                confidence=0.0,
                tokens_used=0,
                model="none"
            )
        
        if self.provider == "ollama":
            return await self._ollama_completion(messages, model, temperature, max_tokens, response_format)
        elif self.provider == "openai":
            return await self._openai_completion(messages, model, temperature, max_tokens, response_format)
        else:
            return AIResponse(
                content="No AI provider configured",
                confidence=0.0,
                tokens_used=0,
                model="none"
            )
    
    async def _ollama_completion(
        self,
        messages: List[AIMessage],
        model: Optional[str],
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict]
    ) -> AIResponse:
        """Get completion from local Ollama"""
        try:
            # Prepare messages for Ollama
            message_dicts = [{"role": msg.role, "content": msg.content} for msg in messages]
            
            # Build prompt (Ollama chat format)
            payload = {
                "model": model or self.default_model,
                "messages": message_dicts,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            # Add JSON format instruction if requested
            if response_format and response_format.get("type") == "json_object":
                payload["format"] = "json"
            
            # Call Ollama API
            response = await self.client.post(
                f"{self.ollama_base_url}/api/chat",
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
            
            result = response.json()
            
            # Extract response
            content = result.get("message", {}).get("content", "")
            tokens_used = result.get("eval_count", 0) + result.get("prompt_eval_count", 0)
            
            # Calculate confidence
            confidence = min(0.95, 0.75 + (len(content) / 1000))
            
            return AIResponse(
                content=content,
                confidence=confidence,
                tokens_used=tokens_used,
                model=result.get("model", model or self.default_model)
            )
        
        except httpx.ConnectError:
            return AIResponse(
                content="⚠️ Could not connect to Ollama. Please ensure Ollama is running: `ollama serve`",
                confidence=0.0,
                tokens_used=0,
                model="error"
            )
        except Exception as e:
            print(f"Ollama Error: {str(e)}")
            return AIResponse(
                content=f"Error calling Ollama: {str(e)}",
                confidence=0.0,
                tokens_used=0,
                model="error"
            )
    
    async def _openai_completion(
        self,
        messages: List[AIMessage],
        model: Optional[str],
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict]
    ) -> AIResponse:
        """Get completion from OpenAI"""
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.openai_api_key)
            
            # Prepare messages
            message_dicts = [{"role": msg.role, "content": msg.content} for msg in messages]
            
            # Call OpenAI API
            completion_kwargs = {
                "model": model or self.default_model,
                "messages": message_dicts,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            if response_format:
                completion_kwargs["response_format"] = response_format
            
            response = await client.chat.completions.create(**completion_kwargs)
            
            # Extract response
            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            # Calculate confidence
            confidence = min(0.95, 0.7 + (len(content) / 1000))
            
            return AIResponse(
                content=content,
                confidence=confidence,
                tokens_used=tokens_used,
                model=response.model
            )
        
        except Exception as e:
            print(f"OpenAI Error: {str(e)}")
            return AIResponse(
                content=f"Error calling OpenAI: {str(e)}",
                confidence=0.0,
                tokens_used=0,
                model="error"
            )
    
    async def analyze_intent(self, query: str) -> Dict[str, Any]:
        """
        Analyze user intent from query
        
        Args:
            query: User query
        
        Returns:
            Intent analysis
        """
        system_prompt = """You are an intent classifier for an ERP system.
Analyze the user's query and return a JSON response with:
{
    "intent": "invoice_query|payment_query|expense_query|payroll_query|inventory_query|report_query|general_query",
    "confidence": 0.0-1.0,
    "entities": {
        "customer_name": "...",
        "invoice_number": "...",
        "date_range": "...",
        "amount": "...",
        ...
    },
    "suggested_bot": "invoice_reconciliation|expense_management|payroll_sa|..."
}"""
        
        messages = [
            AIMessage(role="system", content=system_prompt),
            AIMessage(role="user", content=query)
        ]
        
        response = await self.chat_completion(
            messages=messages,
            temperature=0.3,  # Lower temperature for classification
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response.content)
        except:
            return {
                "intent": "general_query",
                "confidence": 0.5,
                "entities": {},
                "suggested_bot": "meta_bot_orchestrator"
            }
    
    async def generate_bot_response(
        self,
        bot_name: str,
        query: str,
        context: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> AIResponse:
        """
        Generate bot response
        
        Args:
            bot_name: Bot name
            query: User query
            context: Additional context
            data: Data from ERP system
        
        Returns:
            AIResponse
        """
        # Build system prompt based on bot
        system_prompt = self._get_bot_system_prompt(bot_name)
        
        # Build user message with context and data
        user_message = f"User Query: {query}\n\n"
        
        if context:
            user_message += f"Context: {json.dumps(context, indent=2)}\n\n"
        
        if data:
            user_message += f"ERP Data: {json.dumps(data, indent=2)}\n\n"
        
        user_message += "Please provide a helpful, accurate response."
        
        messages = [
            AIMessage(role="system", content=system_prompt),
            AIMessage(role="user", content=user_message)
        ]
        
        return await self.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=1500
        )
    
    def _get_bot_system_prompt(self, bot_name: str) -> str:
        """Get system prompt for specific bot"""
        
        prompts = {
            "invoice_reconciliation": """You are the Invoice Reconciliation Bot for Aria ERP.
Your role is to help users match invoices with purchase orders and receipts (3-way matching),
identify discrepancies, and resolve reconciliation issues.

You have access to:
- Invoice data (customer invoices and supplier bills)
- Purchase orders
- Goods receipts
- Payment records

Provide clear, actionable insights about invoice discrepancies and suggest resolutions.
Always mention specific invoice numbers, amounts, and dates.""",

            "bbbee_compliance": """You are the BBBEE Compliance Bot for Aria ERP.
Your role is to help South African businesses with BBBEE (Broad-Based Black Economic Empowerment) compliance.

You understand:
- 7 Pillars of BBBEE (Ownership, Management Control, Skills Development, Enterprise & Supplier Development, Socio-Economic Development)
- Scorecard calculations
- BBBEE levels (1-8)
- Procurement points
- Supplier verification

Provide accurate BBBEE guidance specific to South African legislation.""",

            "expense_management": """You are the Expense Management Bot for Aria ERP.
Your role is to help users manage expenses, check policy compliance, and process reimbursements.

You have access to:
- Expense submissions
- Company expense policies
- Approval workflows
- GL accounts

Flag policy violations and suggest corrections.""",

            "payroll_sa": """You are the Payroll Bot for Aria ERP (South African edition).
Your role is to help with payroll processing, tax calculations, and SARS compliance.

You understand:
- PAYE (Pay As You Earn) calculations
- UIF (Unemployment Insurance Fund) - 1% employee + 1% employer
- SDL (Skills Development Levy) - 1% of payroll
- IRP5 tax certificate generation
- South African tax tables and brackets

Provide accurate payroll calculations and SARS compliance guidance.""",

            "ar_collections": """You are the AR Collections Bot for Aria ERP.
Your role is to help manage accounts receivable, follow up on overdue invoices, and improve cash collection.

You have access to:
- Customer invoices
- Payment history
- Aging reports
- Customer credit terms

Suggest collection strategies based on customer payment behavior.""",

            "ap_processing": """You are the AP Processing Bot for Aria ERP.
Your role is to help process supplier bills, match invoices, and manage payment schedules.

You have access to:
- Supplier bills
- Purchase orders
- Payment terms
- Aging reports

Ensure accurate AP processing and optimal payment timing.""",

            "lead_qualification": """You are the Lead Qualification Bot for Aria CRM.
Your role is to qualify sales leads based on BANT criteria (Budget, Authority, Need, Timeline).

You analyze:
- Lead information
- Company size and industry
- Engagement history
- Buying signals

Score leads and recommend next actions for sales team.""",

            "leave_management": """You are the Leave Management Bot for Aria HR.
Your role is to help employees submit leave requests and managers approve/decline them.

You understand:
- South African leave types (annual, sick, maternity, paternity, family responsibility)
- Leave balances
- Leave accrual
- Company leave policies

Process leave requests efficiently and check for conflicts.""",

            "inventory_reorder": """You are the Inventory Reorder Bot for Aria ERP.
Your role is to monitor stock levels and suggest reorders to prevent stockouts.

You analyze:
- Current stock levels
- Reorder points
- Lead times
- Sales velocity
- Seasonal patterns

Recommend optimal reorder quantities and timing.""",

            "meta_bot_orchestrator": """You are the Meta-Bot Orchestrator for Aria ERP.
Your role is to understand user queries and route them to the appropriate specialized bot.

You have access to:
- All bot capabilities
- User intent classification
- Multi-bot coordination

Route queries intelligently and coordinate responses from multiple bots when needed."""
        }
        
        return prompts.get(bot_name, """You are a helpful AI assistant for Aria ERP.
Provide accurate, helpful responses to user queries about their business data.""")
    
    async def extract_structured_data(
        self,
        text: str,
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract structured data from text
        
        Args:
            text: Text to extract from
            schema: JSON schema for extraction
        
        Returns:
            Extracted data
        """
        system_prompt = f"""You are a data extraction assistant.
Extract information from the provided text according to this schema:
{json.dumps(schema, indent=2)}

Return only valid JSON matching the schema."""
        
        messages = [
            AIMessage(role="system", content=system_prompt),
            AIMessage(role="user", content=text)
        ]
        
        response = await self.chat_completion(
            messages=messages,
            temperature=0.1,  # Very low temperature for extraction
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response.content)
        except:
            return {}
    
    async def summarize_report(
        self,
        report_data: Dict[str, Any],
        report_type: str
    ) -> str:
        """
        Generate executive summary for report
        
        Args:
            report_data: Report data
            report_type: Type of report (P&L, balance_sheet, aging, etc.)
        
        Returns:
            Summary text
        """
        system_prompt = f"""You are a financial analyst for Aria ERP.
Generate a clear, concise executive summary for this {report_type} report.
Highlight key insights, trends, and actionable recommendations."""
        
        messages = [
            AIMessage(role="system", content=system_prompt),
            AIMessage(role="user", content=f"Report Data:\n{json.dumps(report_data, indent=2)}")
        ]
        
        response = await self.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.content
