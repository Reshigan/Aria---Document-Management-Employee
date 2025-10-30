"""
Base Bot Framework for ARIA
All bots inherit from this base class
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)


class BotStatus(str, Enum):
    """Bot execution status"""
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PAUSED = "paused"


class BotCapability(str, Enum):
    """Bot capabilities"""
    TRANSACTIONAL = "transactional"  # Process individual transactions
    ANALYTICAL = "analytical"         # Analyze data and generate insights
    WORKFLOW = "workflow"              # Orchestrate multi-step processes
    INTEGRATION = "integration"        # Connect to external systems
    COMPLIANCE = "compliance"          # Ensure regulatory compliance
    PREDICTIVE = "predictive"          # Predictive analytics and forecasting


class BotPriority(str, Enum):
    """Bot priority levels"""
    CRITICAL = "critical"  # Must run immediately
    HIGH = "high"          # Should run soon
    NORMAL = "normal"      # Standard priority
    LOW = "low"            # Can be delayed


class BaseBot(ABC):
    """
    Base class for all ARIA bots
    
    All bots must implement:
    - execute(): Main bot logic
    - validate(): Input validation
    - get_capabilities(): Bot capabilities
    """
    
    def __init__(self, bot_id: str, name: str, description: str):
        self.bot_id = bot_id
        self.name = name
        self.description = description
        self.status = BotStatus.IDLE
        self.last_run = None
        self.last_result = None
        self.error_count = 0
        self.success_count = 0
        
    @abstractmethod
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the bot's main logic
        
        Args:
            input_data: Input parameters for the bot
            
        Returns:
            Dict containing execution results
            
        Example:
            {
                "success": True,
                "data": {...},
                "message": "Bot executed successfully",
                "execution_time": 1.23
            }
        """
        pass
        
    @abstractmethod
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Validate input data
        
        Args:
            input_data: Input parameters to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        pass
        
    @abstractmethod
    def get_capabilities(self) -> List[BotCapability]:
        """Return list of bot capabilities"""
        pass
    
    def get_status(self) -> Dict[str, Any]:
        """Get current bot status"""
        return {
            "bot_id": self.bot_id,
            "name": self.name,
            "status": self.status.value,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "error_count": self.error_count,
            "success_count": self.success_count,
            "uptime_percentage": self._calculate_uptime()
        }
    
    def handle_error(self, error: Exception) -> Dict[str, Any]:
        """
        Handle bot execution error
        
        Args:
            error: Exception that occurred
            
        Returns:
            Error response dict
        """
        self.status = BotStatus.FAILED
        self.error_count += 1
        
        error_response = {
            "success": False,
            "error": str(error),
            "error_type": type(error).__name__,
            "bot_id": self.bot_id,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.error(f"Bot {self.bot_id} error: {error}", exc_info=True)
        return error_response
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the bot with error handling and logging
        
        Args:
            input_data: Input parameters
            
        Returns:
            Execution result
        """
        start_time = datetime.now()
        self.status = BotStatus.RUNNING
        
        try:
            # Validate input
            is_valid, error_message = self.validate(input_data)
            if not is_valid:
                raise ValueError(f"Invalid input: {error_message}")
            
            # Execute bot
            logger.info(f"Starting bot {self.bot_id}")
            result = await self.execute(input_data)
            
            # Update status
            self.status = BotStatus.SUCCESS
            self.success_count += 1
            self.last_run = datetime.now()
            self.last_result = result
            
            # Add execution metadata
            execution_time = (datetime.now() - start_time).total_seconds()
            result["execution_time"] = execution_time
            result["bot_id"] = self.bot_id
            result["timestamp"] = datetime.now().isoformat()
            
            logger.info(f"Bot {self.bot_id} completed in {execution_time:.2f}s")
            return result
            
        except Exception as e:
            return self.handle_error(e)
    
    def _calculate_uptime(self) -> float:
        """Calculate bot uptime percentage"""
        total_runs = self.success_count + self.error_count
        if total_runs == 0:
            return 100.0
        return (self.success_count / total_runs) * 100
    
    def get_metadata(self) -> Dict[str, Any]:
        """Get bot metadata for registration"""
        return {
            "bot_id": self.bot_id,
            "name": self.name,
            "description": self.description,
            "capabilities": [cap.value for cap in self.get_capabilities()],
            "status": self.status.value,
            "version": "1.0.0",
            "created_date": datetime.now().isoformat()
        }


class FinancialBot(BaseBot):
    """Base class for financial bots - includes South African compliance features"""
    
    def __init__(self, bot_id: str, name: str, description: str):
        super().__init__(bot_id, name, description)
        self.vat_rate = 0.15  # South African VAT rate
        self.currency = "ZAR"
        
    def calculate_vat(self, amount: float, vat_inclusive: bool = True) -> Dict[str, float]:
        """
        Calculate VAT for South Africa
        
        Args:
            amount: Amount to calculate VAT for
            vat_inclusive: Whether amount includes VAT
            
        Returns:
            Dict with amount_ex_vat, vat_amount, amount_inc_vat
        """
        if vat_inclusive:
            amount_ex_vat = amount / (1 + self.vat_rate)
            vat_amount = amount - amount_ex_vat
            amount_inc_vat = amount
        else:
            amount_ex_vat = amount
            vat_amount = amount * self.vat_rate
            amount_inc_vat = amount + vat_amount
            
        return {
            "amount_ex_vat": round(amount_ex_vat, 2),
            "vat_amount": round(vat_amount, 2),
            "amount_inc_vat": round(amount_inc_vat, 2),
            "vat_rate": self.vat_rate,
            "currency": self.currency
        }
    
    def format_currency(self, amount: float) -> str:
        """Format amount as South African Rand"""
        return f"R {amount:,.2f}"


class ERPBot(BaseBot):
    """Base class for ERP-integrated bots"""
    
    def __init__(self, bot_id: str, name: str, description: str):
        super().__init__(bot_id, name, description)
        self.erp_system = None  # Will be set during initialization
        
    async def post_to_gl(self, journal_entry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post journal entry to General Ledger
        
        Args:
            journal_entry: Journal entry data
            
        Returns:
            Posting result
        """
        # TODO: Implement GL posting logic
        logger.info(f"Posting to GL: {journal_entry}")
        return {"success": True, "gl_doc_number": "GL-001"}
    
    async def create_purchase_order(self, po_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create purchase order in ERP
        
        Args:
            po_data: PO data
            
        Returns:
            PO creation result
        """
        # TODO: Implement PO creation logic
        logger.info(f"Creating PO: {po_data}")
        return {"success": True, "po_number": "PO-001"}
