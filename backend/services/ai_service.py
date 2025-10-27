"""
AI Service - OpenAI GPT-4 Integration for Bot Intelligence
"""

import os
import json
from typing import Dict, List, Optional, Any
from openai import AsyncOpenAI
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
    Uses OpenAI GPT-4 for natural language processing
    """
    
    def __init__(self):
        """Initialize AI Service"""
        self.api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.api_key:
            # For development, use a placeholder
            self.api_key = "sk-placeholder"
            self.enabled = False
        else:
            self.enabled = True
        
        # Initialize OpenAI client
        if self.enabled:
            self.client = AsyncOpenAI(api_key=self.api_key)
        else:
            self.client = None
        
        self.default_model = "gpt-4-turbo-preview"
        self.fallback_model = "gpt-3.5-turbo"
    
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
            model: Model to use (defaults to gpt-4-turbo-preview)
            temperature: Temperature (0-1, lower = more deterministic)
            max_tokens: Max tokens to generate
            response_format: Response format (e.g., {"type": "json_object"})
        
        Returns:
            AIResponse
        """
        if not self.enabled or not self.client:
            # Return mock response if API key not configured
            return AIResponse(
                content="AI service not configured. Please set OPENAI_API_KEY environment variable.",
                confidence=0.0,
                tokens_used=0,
                model="mock"
            )
        
        try:
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
            
            response = await self.client.chat.completions.create(**completion_kwargs)
            
            # Extract response
            content = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            # Calculate confidence (simple heuristic)
            confidence = min(0.95, 0.7 + (len(content) / 1000))
            
            return AIResponse(
                content=content,
                confidence=confidence,
                tokens_used=tokens_used,
                model=response.model
            )
        
        except Exception as e:
            # Log error and return error response
            print(f"AI Service Error: {str(e)}")
            return AIResponse(
                content=f"Error calling AI service: {str(e)}",
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
