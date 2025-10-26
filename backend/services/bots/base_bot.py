"""
Base Bot Class - Foundation for All ARIA Bots

Provides common functionality for all bots:
- Lifecycle management (start, stop, pause, resume)
- Statistics tracking
- Error handling and logging
- Configuration management
- Event emission
- Health checks
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
import json


class BotStatus(str, Enum):
    """Bot status enum"""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    ERROR = "error"


class BotPriority(str, Enum):
    """Bot execution priority"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class BotActivity:
    """Represents a bot activity/execution"""
    id: str
    bot_id: str
    bot_name: str
    activity_type: str
    status: str  # completed, failed, in_progress
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    details: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        data = asdict(self)
        data['start_time'] = self.start_time.isoformat()
        if self.end_time:
            data['end_time'] = self.end_time.isoformat()
        return data


@dataclass
class BotStatistics:
    """Bot statistics"""
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    total_duration_seconds: float = 0.0
    average_duration_seconds: float = 0.0
    last_execution_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    last_failure_time: Optional[datetime] = None
    uptime_percentage: float = 100.0
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        if self.total_executions == 0:
            return 0.0
        return (self.successful_executions / self.total_executions) * 100
    
    @property
    def failure_rate(self) -> float:
        """Calculate failure rate"""
        return 100.0 - self.success_rate
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        data = asdict(self)
        data['success_rate'] = self.success_rate
        data['failure_rate'] = self.failure_rate
        if self.last_execution_time:
            data['last_execution_time'] = self.last_execution_time.isoformat()
        if self.last_success_time:
            data['last_success_time'] = self.last_success_time.isoformat()
        if self.last_failure_time:
            data['last_failure_time'] = self.last_failure_time.isoformat()
        return data


class BaseBot(ABC):
    """
    Abstract base class for all ARIA bots
    
    All bots should inherit from this class and implement:
    - execute(): Main bot logic
    - get_capabilities(): Bot capabilities description
    """
    
    def __init__(
        self,
        bot_id: str,
        bot_name: str,
        version: str = "1.0.0",
        enabled: bool = True,
        priority: BotPriority = BotPriority.NORMAL,
        **config
    ):
        """
        Initialize base bot
        
        Args:
            bot_id: Unique bot identifier
            bot_name: Human-readable bot name
            version: Bot version
            enabled: Whether bot is enabled
            priority: Bot execution priority
            **config: Additional configuration
        """
        # Bot metadata
        self.bot_id = bot_id
        self.bot_name = bot_name
        self.version = version
        self.enabled = enabled
        self.priority = priority
        
        # Bot state
        self.status = BotStatus.STOPPED
        self.status_message = "Bot initialized"
        
        # Configuration
        self.config = config
        
        # Statistics
        self.stats = BotStatistics()
        
        # Activity history (last 100 activities)
        self.activity_history: List[BotActivity] = []
        self.max_history_size = 100
        
        # Event handlers
        self.event_handlers: Dict[str, List[Callable]] = {}
        
        # Logging
        self.logger = logging.getLogger(f"bot.{bot_id}")
        
        # Execution control
        self._running = False
        self._paused = False
        self._task: Optional[asyncio.Task] = None
    
    # === LIFECYCLE METHODS ===
    
    async def start(self):
        """Start the bot"""
        if self.status == BotStatus.RUNNING:
            self.logger.warning(f"{self.bot_name} is already running")
            return
        
        if not self.enabled:
            self.logger.warning(f"{self.bot_name} is disabled")
            return
        
        self.logger.info(f"Starting {self.bot_name}...")
        self.status = BotStatus.STARTING
        self._running = True
        
        try:
            # Call bot-specific initialization
            await self.on_start()
            
            self.status = BotStatus.RUNNING
            self.status_message = "Bot is running"
            self.logger.info(f"{self.bot_name} started successfully")
            
            # Emit event
            await self._emit_event("bot_started", {"bot_id": self.bot_id})
            
        except Exception as e:
            self.status = BotStatus.ERROR
            self.status_message = f"Failed to start: {str(e)}"
            self.logger.error(f"Failed to start {self.bot_name}: {e}")
            raise
    
    async def stop(self):
        """Stop the bot"""
        if self.status == BotStatus.STOPPED:
            self.logger.warning(f"{self.bot_name} is already stopped")
            return
        
        self.logger.info(f"Stopping {self.bot_name}...")
        self.status = BotStatus.STOPPING
        self._running = False
        
        try:
            # Cancel running task
            if self._task and not self._task.done():
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
            
            # Call bot-specific cleanup
            await self.on_stop()
            
            self.status = BotStatus.STOPPED
            self.status_message = "Bot is stopped"
            self.logger.info(f"{self.bot_name} stopped successfully")
            
            # Emit event
            await self._emit_event("bot_stopped", {"bot_id": self.bot_id})
            
        except Exception as e:
            self.status = BotStatus.ERROR
            self.status_message = f"Failed to stop: {str(e)}"
            self.logger.error(f"Failed to stop {self.bot_name}: {e}")
            raise
    
    async def pause(self):
        """Pause the bot"""
        if self.status != BotStatus.RUNNING:
            self.logger.warning(f"{self.bot_name} is not running")
            return
        
        self.logger.info(f"Pausing {self.bot_name}...")
        self._paused = True
        self.status = BotStatus.PAUSED
        self.status_message = "Bot is paused"
        
        # Emit event
        await self._emit_event("bot_paused", {"bot_id": self.bot_id})
    
    async def resume(self):
        """Resume the bot"""
        if self.status != BotStatus.PAUSED:
            self.logger.warning(f"{self.bot_name} is not paused")
            return
        
        self.logger.info(f"Resuming {self.bot_name}...")
        self._paused = False
        self.status = BotStatus.RUNNING
        self.status_message = "Bot is running"
        
        # Emit event
        await self._emit_event("bot_resumed", {"bot_id": self.bot_id})
    
    # === EXECUTION METHODS ===
    
    async def execute_once(self, **kwargs) -> BotActivity:
        """
        Execute bot logic once
        
        Args:
            **kwargs: Additional arguments for execution
            
        Returns:
            BotActivity object with execution details
        """
        # Create activity record
        activity = BotActivity(
            id=self._generate_activity_id(),
            bot_id=self.bot_id,
            bot_name=self.bot_name,
            activity_type="manual_execution",
            status="in_progress",
            start_time=datetime.now()
        )
        
        try:
            self.logger.info(f"Executing {self.bot_name}...")
            
            # Call bot-specific execution logic
            result = await self.execute(**kwargs)
            
            # Update activity
            activity.end_time = datetime.now()
            activity.duration_seconds = (activity.end_time - activity.start_time).total_seconds()
            activity.status = "completed"
            activity.details = result if isinstance(result, dict) else {"result": result}
            
            # Update statistics
            self._update_statistics(activity)
            
            self.logger.info(f"{self.bot_name} executed successfully in {activity.duration_seconds:.2f}s")
            
            # Emit event
            await self._emit_event("bot_executed", {
                "bot_id": self.bot_id,
                "activity_id": activity.id,
                "status": "completed"
            })
            
        except Exception as e:
            # Update activity
            activity.end_time = datetime.now()
            activity.duration_seconds = (activity.end_time - activity.start_time).total_seconds()
            activity.status = "failed"
            activity.error_message = str(e)
            
            # Update statistics
            self._update_statistics(activity)
            
            self.logger.error(f"{self.bot_name} execution failed: {e}")
            
            # Emit event
            await self._emit_event("bot_execution_failed", {
                "bot_id": self.bot_id,
                "activity_id": activity.id,
                "error": str(e)
            })
        
        # Add to history
        self.activity_history.append(activity)
        if len(self.activity_history) > self.max_history_size:
            self.activity_history.pop(0)
        
        return activity
    
    async def execute_scheduled(self, interval_seconds: int = 60):
        """
        Execute bot on a schedule
        
        Args:
            interval_seconds: Seconds between executions
        """
        await self.start()
        
        while self._running:
            try:
                # Wait if paused
                while self._paused:
                    await asyncio.sleep(1)
                
                if not self._running:
                    break
                
                # Execute bot
                await self.execute_once()
                
                # Wait for interval
                await asyncio.sleep(interval_seconds)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in scheduled execution: {e}")
                await asyncio.sleep(interval_seconds)
    
    # === ABSTRACT METHODS (must be implemented by subclasses) ===
    
    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute bot logic (must be implemented by subclass)
        
        Args:
            **kwargs: Additional arguments
            
        Returns:
            Dict with execution results
        """
        pass
    
    @abstractmethod
    def get_capabilities(self) -> Dict[str, Any]:
        """
        Get bot capabilities (must be implemented by subclass)
        
        Returns:
            Dict describing bot capabilities
        """
        pass
    
    # === HOOK METHODS (can be overridden by subclasses) ===
    
    async def on_start(self):
        """Called when bot starts (can be overridden)"""
        pass
    
    async def on_stop(self):
        """Called when bot stops (can be overridden)"""
        pass
    
    # === CONFIGURATION METHODS ===
    
    def update_config(self, **config):
        """Update bot configuration"""
        self.config.update(config)
        self.logger.info(f"Configuration updated: {config}")
    
    def get_config(self) -> Dict[str, Any]:
        """Get bot configuration"""
        return self.config.copy()
    
    # === STATISTICS METHODS ===
    
    def _update_statistics(self, activity: BotActivity):
        """Update bot statistics"""
        self.stats.total_executions += 1
        self.stats.last_execution_time = activity.end_time
        
        if activity.status == "completed":
            self.stats.successful_executions += 1
            self.stats.last_success_time = activity.end_time
        else:
            self.stats.failed_executions += 1
            self.stats.last_failure_time = activity.end_time
        
        self.stats.total_duration_seconds += activity.duration_seconds
        self.stats.average_duration_seconds = (
            self.stats.total_duration_seconds / self.stats.total_executions
        )
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get bot statistics"""
        return {
            "bot_id": self.bot_id,
            "bot_name": self.bot_name,
            "version": self.version,
            "status": self.status.value,
            "status_message": self.status_message,
            "enabled": self.enabled,
            "priority": self.priority.value,
            "statistics": self.stats.to_dict()
        }
    
    def get_activity_history(self, limit: int = 100) -> List[Dict]:
        """Get activity history"""
        history = self.activity_history[-limit:]
        return [activity.to_dict() for activity in history]
    
    # === HEALTH CHECK ===
    
    def get_health(self) -> Dict[str, Any]:
        """Get bot health status"""
        # Determine health
        if self.stats.failure_rate > 50:
            health = "unhealthy"
        elif self.stats.failure_rate > 20:
            health = "degraded"
        else:
            health = "healthy"
        
        return {
            "bot_id": self.bot_id,
            "bot_name": self.bot_name,
            "health": health,
            "status": self.status.value,
            "success_rate": f"{self.stats.success_rate:.1f}%",
            "total_executions": self.stats.total_executions,
            "last_execution": self.stats.last_execution_time.isoformat() if self.stats.last_execution_time else None
        }
    
    # === EVENT HANDLING ===
    
    def on(self, event: str, handler: Callable):
        """Register event handler"""
        if event not in self.event_handlers:
            self.event_handlers[event] = []
        self.event_handlers[event].append(handler)
    
    async def _emit_event(self, event: str, data: Dict):
        """Emit event to registered handlers"""
        if event in self.event_handlers:
            for handler in self.event_handlers[event]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(data)
                    else:
                        handler(data)
                except Exception as e:
                    self.logger.error(f"Error in event handler for {event}: {e}")
    
    # === UTILITY METHODS ===
    
    def _generate_activity_id(self) -> str:
        """Generate unique activity ID"""
        import hashlib
        import time
        unique_str = f"{self.bot_id}_{time.time()}_{self.stats.total_executions}"
        return hashlib.md5(unique_str.encode()).hexdigest()[:12].upper()
    
    def __repr__(self) -> str:
        """String representation"""
        return f"<{self.__class__.__name__} id={self.bot_id} status={self.status.value}>"


# Example usage
if __name__ == "__main__":
    
    class ExampleBot(BaseBot):
        """Example bot implementation"""
        
        async def execute(self, **kwargs) -> Dict[str, Any]:
            """Execute bot logic"""
            await asyncio.sleep(0.5)  # Simulate work
            return {
                "processed_items": 10,
                "success": True
            }
        
        def get_capabilities(self) -> Dict[str, Any]:
            """Get bot capabilities"""
            return {
                "description": "Example bot for testing",
                "features": ["feature1", "feature2"],
                "requirements": []
            }
    
    async def main():
        # Create bot
        bot = ExampleBot(
            bot_id="example_bot",
            bot_name="Example Bot",
            version="1.0.0"
        )
        
        print(f"Created: {bot}")
        print(f"Capabilities: {json.dumps(bot.get_capabilities(), indent=2)}")
        print()
        
        # Execute once
        print("Executing bot...")
        activity = await bot.execute_once()
        print(f"Activity: {activity.status} in {activity.duration_seconds:.2f}s")
        print()
        
        # Get statistics
        print("Statistics:")
        print(json.dumps(bot.get_statistics(), indent=2))
        print()
        
        # Get health
        print("Health:")
        print(json.dumps(bot.get_health(), indent=2))
    
    # Run
    asyncio.run(main())
