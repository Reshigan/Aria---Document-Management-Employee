'''Time & Attendance Bot'''
from typing import Dict, Any, List, Optional
from datetime import datetime
from .base_bot import ERPBot, BotCapability

class TimeAttendanceBot(ERPBot):
    def __init__(self):
        super().__init__(bot_id="time_bot_001", name="Time & Attendance Bot",
                        description="Clock in/out, timesheet, overtime tracking")


    def execute(self, context: dict) -> dict:
        """Synchronous wrapper for async execute_async"""
        import asyncio
        return asyncio.run(self.execute_async(context))

    async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "clock_in")
        if action == "clock_in": return await self._clock_in(input_data)
        elif action == "clock_out": return await self._clock_out(input_data)
        else: raise ValueError(f"Unknown action: {action}")

    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None

    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL, BotCapability.ANALYTICAL]

    async def _clock_in(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        employee_id = input_data.get("employee_id")
        return {"success": True, "employee_id": employee_id, "clock_in_time": datetime.now().isoformat()}

    async def _clock_out(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        employee_id = input_data.get("employee_id")
        return {"success": True, "employee_id": employee_id, "total_hours": 8.5}

time_attendance_bot = TimeAttendanceBot()
