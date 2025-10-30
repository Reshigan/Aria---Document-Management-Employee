'''Benefits Administration Bot'''
from typing import Dict, Any, List, Optional
from .base_bot import ERPBot, BotCapability

class BenefitsAdministrationBot(ERPBot):
    def __init__(self):
        super().__init__(bot_id="benefits_bot_001", name="Benefits Administration Bot",
                        description="Medical aid, provident fund, leave management")

    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "benefits_summary")
        if action == "benefits_summary": return await self._summary(input_data)
        elif action == "leave_request": return await self._leave(input_data)
        else: raise ValueError(f"Unknown action: {action}")

    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None

    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL, BotCapability.COMPLIANCE]

    async def _summary(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        employee_id = input_data.get("employee_id")
        benefits = {"medical_aid": "Discovery Health", "provident_fund": "12%"}
        return {"success": True, "employee_id": employee_id, "benefits": benefits}

    async def _leave(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        employee_id = input_data.get("employee_id")
        return {"success": True, "employee_id": employee_id, "available_days": 15}

benefits_administration_bot = BenefitsAdministrationBot()
