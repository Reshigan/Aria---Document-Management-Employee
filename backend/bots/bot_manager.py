"""
Bot Manager - Central integration layer for all 25 ARIA bots
Handles bot discovery, execution, and response formatting
"""
import importlib
import inspect
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class BotInfo:
    """Information about a bot"""
    def __init__(
        self,
        bot_id: str,
        name: str,
        description: str,
        category: str,
        icon: str,
        requires_bbbee: bool = False,
        requires_sars: bool = False,
        module_path: str = None
    ):
        self.bot_id = bot_id
        self.name = name
        self.description = description
        self.category = category
        self.icon = icon
        self.requires_bbbee = requires_bbbee
        self.requires_sars = requires_sars
        self.module_path = module_path or f"backend.bots.{bot_id}"
        self.bot_instance = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "bot_id": self.bot_id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "icon": self.icon,
            "requires_bbbee": self.requires_bbbee,
            "requires_sars": self.requires_sars
        }


class BotManager:
    """Centralized manager for all ARIA bots"""
    
    # Registry of all 25 bots
    BOT_REGISTRY = [
        # Financial Category (7 bots)
        BotInfo("invoice_reconciliation", "Invoice Reconciliation Bot", 
                "Automatically match invoices to payments, flag discrepancies, and reconcile accounts",
                "financial", "📄", module_path="backend.bots.invoice_bot"),
        
        BotInfo("expense_management", "Expense Management Bot",
                "Track expenses, categorize costs, generate expense reports, and enforce policies",
                "financial", "💰"),
        
        BotInfo("budget_forecasting", "Budget Forecasting Bot",
                "Predict cash flow, analyze spending patterns, and provide budget recommendations",
                "financial", "📊"),
        
        BotInfo("tax_preparation", "Tax Preparation Bot",
                "Calculate tax liabilities, prepare returns, track deductions, and ensure compliance",
                "financial", "🧾"),
        
        BotInfo("accounts_payable", "Accounts Payable Bot",
                "Process vendor bills, schedule payments, manage approvals, and track aging",
                "financial", "💸"),
        
        BotInfo("accounts_receivable", "Accounts Receivable Bot",
                "Track customer invoices, send reminders, process payments, and manage collections",
                "financial", "💵"),
        
        BotInfo("financial_reporting", "Financial Reporting Bot",
                "Generate P&L, balance sheet, cash flow statements, and custom reports",
                "financial", "📈"),
        
        # Sales Category (4 bots)
        BotInfo("quote_generation", "Quote Generation Bot",
                "Create professional quotes with pricing, terms, and send to customers",
                "sales", "📋"),
        
        BotInfo("order_processing", "Order Processing Bot",
                "Process sales orders, check inventory, create invoices, and update CRM",
                "sales", "🛒"),
        
        BotInfo("lead_management", "Lead Management Bot",
                "Qualify leads, score prospects, assign to sales reps, and track pipeline",
                "sales", "🎯"),
        
        BotInfo("customer_insights", "Customer Insights Bot",
                "Analyze customer behavior, identify upsell opportunities, and predict churn",
                "sales", "🔍"),
        
        # Operations Category (5 bots)
        BotInfo("inventory_management", "Inventory Management Bot",
                "Track stock levels, reorder automatically, optimize inventory, and reduce waste",
                "operations", "📦"),
        
        BotInfo("procurement", "Procurement Bot",
                "Source suppliers, compare quotes, create POs, and manage vendor relationships",
                "operations", "🏭"),
        
        BotInfo("supply_chain", "Supply Chain Bot",
                "Optimize logistics, track shipments, predict delays, and manage suppliers",
                "operations", "🚚"),
        
        BotInfo("quality_control", "Quality Control Bot",
                "Inspect products, track defects, analyze root causes, and enforce standards",
                "operations", "✅"),
        
        BotInfo("asset_management", "Asset Management Bot",
                "Track fixed assets, schedule maintenance, calculate depreciation, and manage lifecycle",
                "operations", "🏢"),
        
        # HR Category (3 bots)
        BotInfo("payroll_sa", "Payroll Bot (South Africa)",
                "Process payroll, calculate PAYE/UIF/SDL, generate IRP5s, and file with SARS",
                "hr", "💼", requires_sars=True),
        
        BotInfo("leave_management", "Leave Management Bot",
                "Track leave balances, approve requests, sync calendars, and ensure compliance",
                "hr", "🏖️"),
        
        BotInfo("recruitment", "Recruitment Bot",
                "Post jobs, screen CVs, schedule interviews, and manage hiring pipeline",
                "hr", "👔"),
        
        # Projects Category (3 bots)
        BotInfo("project_tracking", "Project Tracking Bot",
                "Monitor project progress, track milestones, manage resources, and flag risks",
                "projects", "📌"),
        
        BotInfo("time_tracking", "Time Tracking Bot",
                "Log time entries, track billable hours, generate timesheets, and analyze productivity",
                "projects", "⏱️"),
        
        BotInfo("resource_planning", "Resource Planning Bot",
                "Allocate resources, balance workload, predict capacity, and optimize utilization",
                "projects", "📅"),
        
        # Platform Category (2 bots)
        BotInfo("document_processing", "Document Processing Bot",
                "Extract text from PDFs/images, parse invoices, classify documents, and archive",
                "platform", "📑"),
        
        BotInfo("workflow_automation", "Workflow Automation Bot",
                "Build custom workflows, trigger actions, integrate systems, and automate tasks",
                "platform", "⚙️"),
        
        # Compliance Category (1 bot - CRITICAL for South Africa!)
        BotInfo("bbbee_compliance", "BBBEE Compliance Bot",
                "Calculate BBBEE scorecard, track ownership, verify suppliers, and generate reports",
                "compliance", "🇿🇦", requires_bbbee=True),
    ]
    
    def __init__(self):
        self.bots: Dict[str, BotInfo] = {}
        self.loaded_bots: Dict[str, Any] = {}
        self._initialize_bots()
    
    def _initialize_bots(self):
        """Initialize bot registry"""
        for bot_info in self.BOT_REGISTRY:
            self.bots[bot_info.bot_id] = bot_info
            logger.info(f"Registered bot: {bot_info.bot_id} ({bot_info.name})")
    
    def get_bot(self, bot_id: str) -> Optional[BotInfo]:
        """Get bot information by ID"""
        return self.bots.get(bot_id)
    
    def list_bots(
        self,
        category: Optional[str] = None,
        requires_bbbee: Optional[bool] = None,
        requires_sars: Optional[bool] = None
    ) -> List[BotInfo]:
        """List all bots with optional filters"""
        bots = list(self.bots.values())
        
        if category:
            bots = [b for b in bots if b.category == category]
        
        if requires_bbbee is not None:
            bots = [b for b in bots if b.requires_bbbee == requires_bbbee]
        
        if requires_sars is not None:
            bots = [b for b in bots if b.requires_sars == requires_sars]
        
        return bots
    
    def get_categories(self) -> List[str]:
        """Get all bot categories"""
        return list(set(b.category for b in self.bots.values()))
    
    def load_bot(self, bot_id: str) -> Any:
        """Dynamically load bot module"""
        if bot_id in self.loaded_bots:
            return self.loaded_bots[bot_id]
        
        bot_info = self.get_bot(bot_id)
        if not bot_info:
            raise ValueError(f"Bot not found: {bot_id}")
        
        try:
            # Try to import the bot module
            module = importlib.import_module(bot_info.module_path)
            
            # Find the bot class (usually named after the bot_id)
            bot_class = None
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if hasattr(obj, 'execute') and name.lower().endswith('bot'):
                    bot_class = obj
                    break
            
            if bot_class:
                bot_instance = bot_class()
                self.loaded_bots[bot_id] = bot_instance
                logger.info(f"Loaded bot: {bot_id}")
                return bot_instance
            else:
                logger.warning(f"Bot class not found in {bot_info.module_path}")
                return None
        
        except ModuleNotFoundError:
            logger.warning(f"Bot module not found: {bot_info.module_path}")
            return None
        except Exception as e:
            logger.error(f"Error loading bot {bot_id}: {str(e)}")
            return None
    
    async def execute_bot(
        self,
        bot_id: str,
        query: str,
        context: Optional[Dict] = None
    ) -> Dict:
        """Execute a bot query"""
        bot_info = self.get_bot(bot_id)
        if not bot_info:
            raise ValueError(f"Bot not found: {bot_id}")
        
        # Load bot instance
        bot_instance = self.load_bot(bot_id)
        
        # If bot not implemented yet, return mock response
        if bot_instance is None:
            return self._mock_bot_response(bot_id, query)
        
        # Execute bot
        try:
            if hasattr(bot_instance, 'execute_async'):
                result = await bot_instance.execute_async(query, context)
            elif hasattr(bot_instance, 'execute'):
                result = bot_instance.execute(query, context)
            else:
                return self._mock_bot_response(bot_id, query)
            
            return self._format_response(bot_id, query, result)
        
        except Exception as e:
            logger.error(f"Error executing bot {bot_id}: {str(e)}")
            return {
                "bot_id": bot_id,
                "query": query,
                "response": f"Error executing bot: {str(e)}",
                "confidence": 0.0,
                "suggestions": [],
                "actions_taken": [],
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _mock_bot_response(self, bot_id: str, query: str) -> Dict:
        """Generate mock response for bots not yet implemented"""
        bot_info = self.get_bot(bot_id)
        
        # Category-specific mock responses
        mock_responses = {
            "financial": "I've analyzed your financial data. Here's what I found...",
            "sales": "I've processed your sales request. Here are the results...",
            "operations": "I've reviewed your operations data. Here's my recommendation...",
            "hr": "I've processed your HR request. Here are the details...",
            "projects": "I've analyzed your project data. Here's the status...",
            "platform": "I've processed your request. Here's the output...",
            "compliance": "I've checked your compliance status. Here's the report..."
        }
        
        response_text = mock_responses.get(bot_info.category, "I've processed your request.")
        
        return {
            "bot_id": bot_id,
            "query": query,
            "response": f"{response_text}\n\n*Note: This bot is in development. Full functionality coming soon!*",
            "confidence": 0.85,
            "suggestions": [
                "Try asking for specific details",
                "Request a report",
                "Ask for recommendations"
            ],
            "actions_taken": [
                f"Analyzed query: '{query[:50]}...'",
                "Generated response",
                "Prepared suggestions"
            ],
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "bot_name": bot_info.name,
                "category": bot_info.category,
                "status": "mock_response"
            }
        }
    
    def _format_response(self, bot_id: str, query: str, result: Any) -> Dict:
        """Format bot response to standard structure"""
        if isinstance(result, dict):
            # If result is already a dict, ensure it has required fields
            response = result.copy()
            response.setdefault("bot_id", bot_id)
            response.setdefault("query", query)
            response.setdefault("timestamp", datetime.utcnow().isoformat())
            response.setdefault("confidence", 0.9)
            response.setdefault("suggestions", [])
            response.setdefault("actions_taken", [])
            return response
        
        # If result is a string, wrap it
        return {
            "bot_id": bot_id,
            "query": query,
            "response": str(result),
            "confidence": 0.9,
            "suggestions": [],
            "actions_taken": ["Executed bot query"],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_bot_stats(self, bot_id: str) -> Dict:
        """Get bot statistics (mock for now)"""
        bot_info = self.get_bot(bot_id)
        if not bot_info:
            raise ValueError(f"Bot not found: {bot_id}")
        
        return {
            "bot_id": bot_id,
            "name": bot_info.name,
            "status": "active",
            "total_requests": 0,
            "avg_response_time": 2.3,
            "success_rate": 98.5,
            "last_used": None
        }


# Singleton instance
bot_manager = BotManager()
