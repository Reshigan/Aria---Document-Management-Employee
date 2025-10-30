'''Employee Self-Service Bot'''
from typing import Dict, Any, List, Optional
from .base_bot import ERPBot, BotCapability

class EmployeeSelfServiceBot(ERPBot):
    def __init__(self):
        super().__init__(bot_id="ess_bot_001", name="Employee Self-Service Bot",
                        description="Profile management, payslip, tax certificates")

    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "get_profile")
        if action == "get_profile": return await self._profile(input_data)
        elif action == "payslip": return await self._payslip(input_data)
        else: raise ValueError(f"Unknown action: {action}")

    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None

    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL]

    async def _profile(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        employee_id = input_data.get("employee_id")
        profile = {"name": "John Doe", "department": "Finance"}
        return {"success": True, "employee_id": employee_id, "profile": profile}

    async def _payslip(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        employee_id = input_data.get("employee_id")
        payslip = {"basic_salary": 35000.00, "net": 28522.88}
        return {"success": True, "employee_id": employee_id, "payslip": payslip}

employee_self_service_bot = EmployeeSelfServiceBot()
