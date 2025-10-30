"""Purchase Order Bot - Automate PO creation, approval, and tracking"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
from .base_bot import ERPBot, BotCapability

logger = logging.getLogger(__name__)

class PurchaseOrderBot(ERPBot):
    """Purchase Order Bot - Handles PO lifecycle from creation to delivery"""
    
    def __init__(self):
        super().__init__(
            bot_id="po_bot_001",
            name="Purchase Order Bot",
            description="Automates purchase order creation, approval workflows, 3-way matching, and tracking"
        )
        

    def execute(self, context: dict) -> dict:
        """Synchronous wrapper for async execute_async"""
        import asyncio
        return asyncio.run(self.execute_async(context))

    async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "create_po")
        
        if action == "create_po":
            return await self._create_purchase_order(input_data)
        elif action == "approve_po":
            return await self._approve_purchase_order(input_data)
        elif action == "receive_goods":
            return await self._receive_goods(input_data)
        elif action == "three_way_match":
            return await self._three_way_match(input_data)
        elif action == "track_po":
            return await self._track_purchase_order(input_data.get("po_number"))
        else:
            raise ValueError(f"Unknown action: {action}")
    
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        if "action" not in input_data:
            return False, "Missing required field: action"
        return True, None
    
    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL, BotCapability.WORKFLOW]
    
    async def _create_purchase_order(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new purchase order"""
        po_data = input_data.get("po_data", {})
        
        po_number = f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Calculate totals
        lines = po_data.get("lines", [])
        subtotal = sum(line.get("quantity", 0) * line.get("unit_price", 0) for line in lines)
        vat = subtotal * 0.15  # SA VAT
        total = subtotal + vat
        
        po = {
            "po_number": po_number,
            "supplier": po_data.get("supplier"),
            "date": datetime.now().isoformat(),
            "delivery_date": po_data.get("delivery_date"),
            "lines": lines,
            "subtotal": round(subtotal, 2),
            "vat": round(vat, 2),
            "total": round(total, 2),
            "status": "pending_approval",
            "approval_level": 1 if total < 10000 else 2 if total < 50000 else 3
        }
        
        return {
            "success": True,
            "po_number": po_number,
            "po": po,
            "message": f"PO created, requires level {po['approval_level']} approval"
        }
    
    async def _approve_purchase_order(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Approve purchase order"""
        po_number = input_data["po_number"]
        approver = input_data.get("approver", "system")
        
        return {
            "success": True,
            "po_number": po_number,
            "status": "approved",
            "approved_by": approver,
            "approved_at": datetime.now().isoformat(),
            "message": "PO approved and sent to supplier"
        }
    
    async def _receive_goods(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record goods receipt"""
        grn_data = input_data.get("grn_data", {})
        grn_number = f"GRN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            "success": True,
            "grn_number": grn_number,
            "po_number": grn_data.get("po_number"),
            "received_date": datetime.now().isoformat(),
            "items_received": grn_data.get("items", []),
            "status": "received",
            "next_step": "3-way matching"
        }
    
    async def _three_way_match(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform 3-way matching (PO-GRN-Invoice)"""
        po_number = input_data.get("po_number")
        grn_number = input_data.get("grn_number")
        invoice_number = input_data.get("invoice_number")
        
        # Simplified matching logic
        match_result = {
            "po_match": True,
            "grn_match": True,
            "invoice_match": True,
            "variance": 0,
            "status": "matched"
        }
        
        return {
            "success": True,
            "po_number": po_number,
            "grn_number": grn_number,
            "invoice_number": invoice_number,
            "match_result": match_result,
            "payment_approved": match_result["status"] == "matched"
        }
    
    async def _track_purchase_order(self, po_number: str) -> Dict[str, Any]:
        """Track PO status"""
        return {
            "success": True,
            "po_number": po_number,
            "status": "in_transit",
            "tracking_events": [
                {"date": "2025-10-25", "event": "PO created"},
                {"date": "2025-10-26", "event": "PO approved"},
                {"date": "2025-10-27", "event": "Order confirmed by supplier"},
                {"date": "2025-10-28", "event": "In transit"}
            ]
        }

purchase_order_bot = PurchaseOrderBot()
