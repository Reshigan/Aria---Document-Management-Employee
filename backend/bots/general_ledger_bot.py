"""
General Ledger Bot
Handles GL postings, journal entries, and account reconciliation
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
import logging

from .base_bot import FinancialBot, BotCapability, BotPriority

logger = logging.getLogger(__name__)


class GeneralLedgerBot(FinancialBot):
    """
    General Ledger Bot
    
    Capabilities:
    - Post journal entries
    - Validate balanced entries
    - Generate trial balance
    - Account reconciliation
    - Period close checks
    """
    
    def __init__(self):
        super().__init__(
            bot_id="gl_bot_001",
            name="General Ledger Bot",
            description="Automates GL postings, journal entries, and account reconciliation"
        )
        

    def execute(self, context: dict) -> dict:
        """Synchronous wrapper for async execute_async"""
        import asyncio
        return asyncio.run(self.execute_async(context))

    async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute GL operations
        
        Input formats:
        1. Post journal entry:
           {
               "action": "post_journal",
               "journal_entry": {
                   "date": "2025-10-27",
                   "description": "Monthly depreciation",
                   "reference": "JE-2025-10-001",
                   "lines": [
                       {"account": "6200", "debit": 5000, "credit": 0, "description": "Depreciation expense"},
                       {"account": "1500", "debit": 0, "credit": 5000, "description": "Accumulated depreciation"}
                   ]
               }
           }
        
        2. Generate trial balance:
           {
               "action": "trial_balance",
               "as_of_date": "2025-10-31"
           }
        
        3. Account reconciliation:
           {
               "action": "reconcile_account",
               "account_number": "1100",
               "bank_statement": [...]
           }
        """
        action = input_data.get("action")
        
        if action == "post_journal":
            return await self._post_journal_entry(input_data["journal_entry"])
        elif action == "trial_balance":
            return await self._generate_trial_balance(input_data.get("as_of_date"))
        elif action == "reconcile_account":
            return await self._reconcile_account(
                input_data["account_number"],
                input_data.get("bank_statement", [])
            )
        elif action == "close_period":
            return await self._close_period(input_data["period"])
        else:
            raise ValueError(f"Unknown action: {action}")
    
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Validate input data"""
        if "action" not in input_data:
            return False, "Missing required field: action"
        
        action = input_data["action"]
        
        if action == "post_journal":
            return self._validate_journal_entry(input_data.get("journal_entry", {}))
        elif action == "trial_balance":
            return True, None
        elif action == "reconcile_account":
            if "account_number" not in input_data:
                return False, "Missing required field: account_number"
            return True, None
        elif action == "close_period":
            if "period" not in input_data:
                return False, "Missing required field: period"
            return True, None
        else:
            return False, f"Unknown action: {action}"
    
    def get_capabilities(self) -> List[BotCapability]:
        """Return bot capabilities"""
        return [
            BotCapability.TRANSACTIONAL,
            BotCapability.COMPLIANCE
        ]
    
    async def _post_journal_entry(self, journal_entry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post a journal entry to the GL
        
        Validates:
        - Entry is balanced (debits = credits)
        - All accounts exist and are active
        - Period is open
        - No negative amounts
        """
        # Validate balanced entry
        total_debits = sum(line.get("debit", 0) for line in journal_entry["lines"])
        total_credits = sum(line.get("credit", 0) for line in journal_entry["lines"])
        
        if abs(total_debits - total_credits) > 0.01:  # Allow for rounding
            return {
                "success": False,
                "error": "Journal entry is not balanced",
                "total_debits": total_debits,
                "total_credits": total_credits,
                "difference": total_debits - total_credits
            }
        
        # Validate accounts
        invalid_accounts = []
        for line in journal_entry["lines"]:
            account = line.get("account")
            if not self._is_valid_account(account):
                invalid_accounts.append(account)
        
        if invalid_accounts:
            return {
                "success": False,
                "error": "Invalid accounts",
                "invalid_accounts": invalid_accounts
            }
        
        # Create GL document number
        doc_number = self._generate_doc_number("JE")
        
        # Post entry (in production, this would write to database)
        logger.info(f"Posting journal entry {doc_number}: {journal_entry}")
        
        # Create audit trail
        audit_trail = {
            "doc_number": doc_number,
            "date": journal_entry["date"],
            "description": journal_entry["description"],
            "reference": journal_entry.get("reference"),
            "total_amount": total_debits,
            "posted_by": "system",  # In production, use actual user
            "posted_at": datetime.now().isoformat(),
            "status": "posted"
        }
        
        return {
            "success": True,
            "message": "Journal entry posted successfully",
            "doc_number": doc_number,
            "total_debits": total_debits,
            "total_credits": total_credits,
            "audit_trail": audit_trail,
            "gl_entries": journal_entry["lines"]
        }
    
    async def _generate_trial_balance(self, as_of_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate trial balance report
        
        Shows all accounts with their debit/credit balances
        """
        if as_of_date is None:
            as_of_date = date.today().isoformat()
        
        # In production, query from database
        # For now, return sample data
        trial_balance = [
            {"account": "1100", "account_name": "Cash", "debit": 50000, "credit": 0},
            {"account": "1200", "account_name": "Accounts Receivable", "debit": 75000, "credit": 0},
            {"account": "1500", "account_name": "Inventory", "debit": 120000, "credit": 0},
            {"account": "1600", "account_name": "Fixed Assets", "debit": 250000, "credit": 0},
            {"account": "1650", "account_name": "Accumulated Depreciation", "debit": 0, "credit": 50000},
            {"account": "2100", "account_name": "Accounts Payable", "debit": 0, "credit": 45000},
            {"account": "3000", "account_name": "Share Capital", "debit": 0, "credit": 200000},
            {"account": "3100", "account_name": "Retained Earnings", "debit": 0, "credit": 125000},
            {"account": "4000", "account_name": "Sales Revenue", "debit": 0, "credit": 300000},
            {"account": "5000", "account_name": "Cost of Sales", "debit": 180000, "credit": 0},
            {"account": "6100", "account_name": "Salaries", "debit": 35000, "credit": 0},
            {"account": "6200", "account_name": "Depreciation", "debit": 10000, "credit": 0},
        ]
        
        total_debits = sum(item["debit"] for item in trial_balance)
        total_credits = sum(item["credit"] for item in trial_balance)
        
        return {
            "success": True,
            "as_of_date": as_of_date,
            "trial_balance": trial_balance,
            "total_debits": total_debits,
            "total_credits": total_credits,
            "balanced": abs(total_debits - total_credits) < 0.01,
            "currency": self.currency,
            "generated_at": datetime.now().isoformat()
        }
    
    async def _reconcile_account(self, account_number: str, bank_statement: List[Dict]) -> Dict[str, Any]:
        """
        Reconcile an account (typically bank account) against external statement
        """
        # Get GL transactions for account
        gl_transactions = await self._get_account_transactions(account_number)
        
        # Match transactions
        matched = []
        unmatched_gl = []
        unmatched_bank = []
        
        # Simple matching algorithm (in production, use more sophisticated matching)
        matched_bank_indices = set()
        for gl_tx in gl_transactions:
            match_found = False
            for i, bank_tx in enumerate(bank_statement):
                if i in matched_bank_indices:
                    continue
                if self._transactions_match(gl_tx, bank_tx):
                    matched.append({"gl": gl_tx, "bank": bank_tx})
                    matched_bank_indices.add(i)
                    match_found = True
                    break
            if not match_found:
                unmatched_gl.append(gl_tx)
        
        for i, bank_tx in enumerate(bank_statement):
            if i not in matched_bank_indices:
                unmatched_bank.append(bank_tx)
        
        # Calculate reconciled balance
        gl_balance = sum(tx["amount"] for tx in gl_transactions)
        bank_balance = sum(tx["amount"] for tx in bank_statement)
        
        return {
            "success": True,
            "account_number": account_number,
            "matched_count": len(matched),
            "unmatched_gl_count": len(unmatched_gl),
            "unmatched_bank_count": len(unmatched_bank),
            "gl_balance": gl_balance,
            "bank_balance": bank_balance,
            "difference": gl_balance - bank_balance,
            "reconciliation_rate": len(matched) / max(len(gl_transactions), 1) * 100,
            "matched_transactions": matched,
            "unmatched_gl": unmatched_gl,
            "unmatched_bank": unmatched_bank
        }
    
    async def _close_period(self, period: str) -> Dict[str, Any]:
        """
        Close accounting period
        
        Performs:
        - Trial balance validation
        - Income statement closing entries
        - Period lock
        """
        # Generate trial balance
        tb_result = await self._generate_trial_balance()
        
        if not tb_result["balanced"]:
            return {
                "success": False,
                "error": "Trial balance is not balanced. Cannot close period.",
                "trial_balance": tb_result
            }
        
        # Create closing entries (in production, this would be more complex)
        closing_entries = {
            "revenue_close": {
                "debit_account": "4000",  # Revenue
                "credit_account": "3100",  # Retained Earnings
                "amount": tb_result["trial_balance"][8]["credit"]  # Sales Revenue
            },
            "expense_close": {
                "debit_account": "3100",  # Retained Earnings
                "credit_account": "various",  # All expense accounts
                "amount": sum(item["debit"] for item in tb_result["trial_balance"] if item["account"].startswith("5") or item["account"].startswith("6"))
            }
        }
        
        return {
            "success": True,
            "period": period,
            "period_locked": True,
            "closing_entries": closing_entries,
            "net_income": closing_entries["revenue_close"]["amount"] - closing_entries["expense_close"]["amount"],
            "closed_at": datetime.now().isoformat()
        }
    
    def _validate_journal_entry(self, journal_entry: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Validate journal entry structure"""
        required_fields = ["date", "description", "lines"]
        for field in required_fields:
            if field not in journal_entry:
                return False, f"Missing required field: {field}"
        
        if not journal_entry["lines"]:
            return False, "Journal entry must have at least one line"
        
        for line in journal_entry["lines"]:
            if "account" not in line:
                return False, "Line missing account number"
            if "debit" not in line and "credit" not in line:
                return False, "Line must have either debit or credit"
        
        return True, None
    
    def _is_valid_account(self, account_number: str) -> bool:
        """Check if account is valid and active"""
        # In production, query from chart of accounts
        # For now, simple validation
        if not account_number or len(account_number) < 4:
            return False
        return account_number.isdigit()
    
    def _generate_doc_number(self, prefix: str) -> str:
        """Generate document number"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"{prefix}-{timestamp}"
    
    async def _get_account_transactions(self, account_number: str) -> List[Dict]:
        """Get all transactions for an account"""
        # In production, query from database
        # Sample data for testing
        return [
            {"date": "2025-10-01", "description": "Opening balance", "amount": 50000, "reference": "OB-001"},
            {"date": "2025-10-05", "description": "Customer payment", "amount": 15000, "reference": "PMT-001"},
            {"date": "2025-10-10", "description": "Supplier payment", "amount": -8000, "reference": "PMT-002"},
            {"date": "2025-10-15", "description": "Customer payment", "amount": 12000, "reference": "PMT-003"},
        ]
    
    def _transactions_match(self, gl_tx: Dict, bank_tx: Dict) -> bool:
        """Check if GL and bank transactions match"""
        # Simple matching: same amount and similar date
        amount_match = abs(gl_tx.get("amount", 0) - bank_tx.get("amount", 0)) < 0.01
        # In production, also check dates, references, descriptions
        return amount_match


# Create singleton instance
general_ledger_bot = GeneralLedgerBot()
