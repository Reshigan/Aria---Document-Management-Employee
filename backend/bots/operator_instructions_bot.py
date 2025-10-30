'''Operator Instructions Bot'''
from typing import Dict, Any, List, Optional
from .base_bot import ERPBot, BotCapability

class OperatorInstructionsBot(ERPBot):
    def __init__(self):
        super().__init__(bot_id="operator_bot_001", name="Operator Instructions Bot",
                        description="Digital work instructions, SOPs, visual aids, training materials")


    def execute(self, context: dict) -> dict:
        """Synchronous wrapper for async execute_async"""
        import asyncio
        return asyncio.run(self.execute_async(context))

    async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "get_instructions")
        if action == "get_instructions": return await self._get_instructions(input_data)
        else: raise ValueError(f"Unknown action: {action}")

    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None

    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL]

    async def _get_instructions(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "operation_id": input_data.get("operation_id"), 
                "instructions": "Step-by-step guide", "visual_aids": 3}

operator_instructions_bot = OperatorInstructionsBot()
