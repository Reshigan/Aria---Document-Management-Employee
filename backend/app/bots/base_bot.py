"""
Base Bot Class
All ARIA bots inherit from this base class
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BaseBot(ABC):
    """Base class for all ARIA AI bots"""
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.bot_id = self.__class__.__name__
        self.version = "1.0.0"
        self.last_run = None
        self.total_runs = 0
        self.success_count = 0
        self.failure_count = 0
        
    @abstractmethod
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process input data and return results
        Must be implemented by each bot
        """
        pass
    
    @abstractmethod
    def get_accuracy(self) -> float:
        """
        Calculate and return bot accuracy percentage
        Must be implemented by each bot
        """
        pass
    
    def get_stats(self) -> Dict[str, Any]:
        """Get bot statistics"""
        return {
            "bot_id": self.bot_id,
            "tenant_id": self.tenant_id,
            "version": self.version,
            "total_runs": self.total_runs,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": (
                self.success_count / self.total_runs * 100 
                if self.total_runs > 0 else 0
            ),
            "last_run": self.last_run,
            "accuracy": self.get_accuracy()
        }
    
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute bot with error handling and statistics tracking
        """
        self.total_runs += 1
        self.last_run = datetime.utcnow()
        
        try:
            result = await self.process(input_data)
            self.success_count += 1
            
            return {
                "status": "success",
                "bot_id": self.bot_id,
                "timestamp": self.last_run.isoformat(),
                "data": result
            }
            
        except Exception as e:
            self.failure_count += 1
            logger.error(f"{self.bot_id} failed: {str(e)}")
            
            return {
                "status": "error",
                "bot_id": self.bot_id,
                "timestamp": self.last_run.isoformat(),
                "error": str(e)
            }
    
    def validate_input(self, input_data: Dict[str, Any], required_fields: List[str]) -> bool:
        """Validate required input fields"""
        for field in required_fields:
            if field not in input_data:
                raise ValueError(f"Missing required field: {field}")
        return True
