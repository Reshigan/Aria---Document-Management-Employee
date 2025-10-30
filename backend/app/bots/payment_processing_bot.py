"""Payment Processing Bot - Automate payment batch processing"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
from .base_bot import FinancialBot, BotCapability

logger = logging.getLogger(__name__)

class PaymentProcessingBot(FinancialBot):
    """Processes payment batches and manages payment approvals"""
    
    def __init__(self):
        super().__init__(
            bot_id="pp_bot_001",
            name="Payment Processing Bot",
            description="Automates payment batch processing, approvals, and bank file generation"
        )
        
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "process_batch")
        
        if action == "process_batch":
            return await self._process_payment_batch(input_data)
        elif action == "generate_bank_file":
            return await self._generate_bank_file(input_data)
        elif action == "approve_payments":
            return await self._approve_payments(input_data)
        else:
            raise ValueError(f"Unknown action: {action}")
    
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        if "action" in input_data:
            return True, None
        return False, "Missing required field: action"
    
    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL, BotCapability.WORKFLOW]
    
    async def _process_payment_batch(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a batch of payments"""
        payments = input_data.get("payments", [])
        batch_id = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        processed = []
        total_amount = 0
        
        for payment in payments:
            # Validate payment
            is_valid, error = self._validate_payment(payment)
            if not is_valid:
                processed.append({**payment, "status": "rejected", "error": error})
                continue
            
            # Process payment
            result = await self._process_single_payment(payment)
            processed.append(result)
            if result["status"] == "approved":
                total_amount += payment.get("amount", 0)
        
        return {
            "success": True,
            "batch_id": batch_id,
            "total_payments": len(payments),
            "approved": sum(1 for p in processed if p["status"] == "approved"),
            "rejected": sum(1 for p in processed if p["status"] == "rejected"),
            "total_amount": total_amount,
            "currency": self.currency,
            "payments": processed
        }
    
    async def _generate_bank_file(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate bank payment file (SWIFT/SEPA format)"""
        batch_id = input_data["batch_id"]
        payments = input_data.get("payments", [])
        
        # Generate file content
        file_lines = []
        file_lines.append(f"H|{batch_id}|{datetime.now().isoformat()}")
        
        for payment in payments:
            if payment.get("status") == "approved":
                file_lines.append(
                    f"P|{payment['payee_account']}|{payment['amount']}|{payment['reference']}"
                )
        
        file_lines.append(f"T|{len(payments)}|{sum(p['amount'] for p in payments if p.get('status') == 'approved')}")
        
        return {
            "success": True,
            "batch_id": batch_id,
            "file_content": "\n".join(file_lines),
            "file_name": f"{batch_id}.txt",
            "ready_for_upload": True
        }
    
    async def _approve_payments(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Approve pending payments"""
        payment_ids = input_data.get("payment_ids", [])
        approver = input_data.get("approver", "system")
        
        approved = []
        for pid in payment_ids:
            approved.append({
                "payment_id": pid,
                "status": "approved",
                "approved_by": approver,
                "approved_at": datetime.now().isoformat()
            })
        
        return {
            "success": True,
            "approved_count": len(approved),
            "payments": approved
        }
    
    async def _process_single_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single payment"""
        # Check for duplicate
        if self._is_duplicate(payment):
            return {**payment, "status": "rejected", "error": "Duplicate payment"}
        
        # Check account balance
        if not self._has_sufficient_balance(payment.get("amount", 0)):
            return {**payment, "status": "rejected", "error": "Insufficient funds"}
        
        # Approve payment
        return {
            **payment,
            "status": "approved",
            "processed_at": datetime.now().isoformat()
        }
    
    def _validate_payment(self, payment: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Validate payment data"""
        required_fields = ["payee_account", "amount", "reference"]
        for field in required_fields:
            if field not in payment:
                return False, f"Missing required field: {field}"
        
        if payment["amount"] <= 0:
            return False, "Amount must be positive"
        
        return True, None
    
    def _is_duplicate(self, payment: Dict[str, Any]) -> bool:
        """Check for duplicate payment"""
        # In production, query database
        return False
    
    def _has_sufficient_balance(self, amount: float) -> bool:
        """Check if account has sufficient balance"""
        # In production, check actual account balance
        return True

payment_processing_bot = PaymentProcessingBot()
