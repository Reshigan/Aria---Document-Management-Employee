'''Opportunity Management Bot - Sales opportunity tracking'''
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .base_bot import ERPBot, BotCapability

class OpportunityManagementBot(ERPBot):
    def __init__(self):
        super().__init__(bot_id="opp_bot_001", name="Opportunity Management Bot",
                        description="Opportunity creation, pipeline management, forecasting, win/loss analysis")


    def execute(self, context: dict) -> dict:
        """Synchronous wrapper for async execute_async"""
        import asyncio
        return asyncio.run(self.execute_async(context))

    async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "create_opportunity")
        if action == "create_opportunity": return await self._create(input_data)
        elif action == "update_stage": return await self._update_stage(input_data)
        elif action == "forecast": return await self._forecast()
        elif action == "win_loss": return await self._win_loss(input_data)
        else: raise ValueError(f"Unknown action: {action}")

    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None

    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL, BotCapability.ANALYTICAL]

    async def _create(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        opp_id = f"OPP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        value = input_data.get("value", 250000.00)
        return {"success": True, "opportunity_id": opp_id, "stage": "Qualification", "value": value, 
                "close_date": (datetime.now() + timedelta(days=90)).isoformat()}

    async def _update_stage(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        opp_id = input_data.get("opportunity_id")
        new_stage = input_data.get("stage")
        probability = {"Qualification": 10, "Proposal": 25, "Negotiation": 60, "Closed Won": 100}
        return {"success": True, "opportunity_id": opp_id, "stage": new_stage, 
                "probability": probability.get(new_stage, 0)}

    async def _forecast(self) -> Dict[str, Any]:
        return {"success": True, "total_pipeline": 5250000.00, "weighted_pipeline": 2100000.00,
                "forecast_month": 1750000.00, "forecast_quarter": 4500000.00}

    async def _win_loss(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        opp_id = input_data.get("opportunity_id")
        won = input_data.get("won", True)
        return {"success": True, "opportunity_id": opp_id, "outcome": "won" if won else "lost",
                "win_rate": 45.5 if won else None}

opportunity_management_bot = OpportunityManagementBot()
