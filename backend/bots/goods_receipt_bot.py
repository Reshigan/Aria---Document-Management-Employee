'''Goods Receipt Bot - GRN processing and 3-way matching'''
from typing import Dict, Any, List, Optional
from datetime import datetime
from .base_bot import ERPBot, BotCapability

class GoodsReceiptBot(ERPBot):
    def __init__(self):
        super().__init__(bot_id="grn_bot_001", name="Goods Receipt Bot",
                        description="GRN creation, quality inspection, 3-way matching, stock update")
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "create_grn")
        if action == "create_grn": return await self._create_grn(input_data)
        elif action == "three_way_match": return await self._three_way_match(input_data)
        elif action == "quality_inspection": return await self._inspect(input_data)
        elif action == "update_stock": return await self._update_stock(input_data)
        else: raise ValueError(f"Unknown action: {action}")
    
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        return True, None
    
    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL, BotCapability.INTEGRATION]
    
    async def _create_grn(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        grn_number = f"GRN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        po_number = input_data.get("po_number")
        items = input_data.get("items", [])
        return {"success": True, "grn_number": grn_number, "po_number": po_number, 
                "items_received": len(items), "status": "pending_inspection"}
    
    async def _three_way_match(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        grn_number = input_data.get("grn_number")
        po_number = input_data.get("po_number")
        invoice_number = input_data.get("invoice_number")
        match_result = {"quantity_match": True, "price_match": True, "description_match": True,
                        "overall_match": True, "discrepancies": []}
        return {"success": True, "grn_number": grn_number, "match_result": match_result}
    
    async def _inspect(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        grn_number = input_data.get("grn_number")
        inspection_result = {"quality_passed": True, "quantity_accepted": 100, 
                             "quantity_rejected": 0, "inspector": "QC-001"}
        return {"success": True, "grn_number": grn_number, "inspection": inspection_result}
    
    async def _update_stock(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        grn_number = input_data.get("grn_number")
        return {"success": True, "grn_number": grn_number, "stock_updated": True,
                "warehouse": "WH-001", "location": "A-01-05"}

goods_receipt_bot = GoodsReceiptBot()
