'''Quote Generation Bot - Sales quotation automation'''
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .base_bot import ERPBot, BotCapability

class QuoteGenerationBot(ERPBot):
    def __init__(self):
        super().__init__(bot_id="quote_bot_001", name="Quote Generation Bot",
                        description="Quote creation, pricing, approvals, versioning, PDF generation")

    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "create_quote")
        if action == "create_quote": return await self._create(input_data)
        elif action == "apply_discount": return await self._discount(input_data)
        elif action == "send_quote": return await self._send(input_data)
        elif action == "convert_to_order": return await self._convert(input_data)
        else: raise ValueError(f"Unknown action: {action}")

    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None

    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL, BotCapability.WORKFLOW]

    async def _create(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        quote_number = f"QT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        items = input_data.get("items", [])
        total = sum(item.get("amount", 0) for item in items)
        return {"success": True, "quote_number": quote_number, "total": total, "vat": total * 0.15,
                "valid_until": (datetime.now() + timedelta(days=30)).isoformat()}

    async def _discount(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        quote_number = input_data.get("quote_number")
        discount_percent = input_data.get("discount_percent", 5.0)
        return {"success": True, "quote_number": quote_number, "discount": discount_percent,
                "requires_approval": discount_percent > 10}

    async def _send(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        quote_number = input_data.get("quote_number")
        customer_email = input_data.get("customer_email")
        return {"success": True, "quote_number": quote_number, "sent_to": customer_email,
                "pdf_generated": True}

    async def _convert(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        quote_number = input_data.get("quote_number")
        order_number = f"SO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        return {"success": True, "quote_number": quote_number, "order_number": order_number,
                "status": "converted"}

quote_generation_bot = QuoteGenerationBot()
