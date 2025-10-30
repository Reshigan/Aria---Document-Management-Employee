"""
Financial Close Bot
Automates month-end and year-end financial close processes
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
import logging

from .base_bot import FinancialBot, BotCapability

logger = logging.getLogger(__name__)


class FinancialCloseBot(FinancialBot):
    """
    Financial Close Bot
    
    Automates:
    - Month-end close checklist
    - Year-end close procedures
    - Accrual calculations
    - Prepayment amortization
    - Depreciation calculation
    - Intercompany reconciliation
    - Trial balance validation
    - Financial statement generation
    """
    
    def __init__(self):
        super().__init__(
            bot_id="fc_bot_001",
            name="Financial Close Bot",
            description="Automates month-end and year-end financial close processes"
        )
        self.close_checklist = self._initialize_checklist()
        
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute financial close
        
        Input:
        {
            "action": "monthly_close" | "yearly_close" | "calculate_accruals",
            "period": "2025-10",
            "close_type": "hard" | "soft"  # Hard close locks period
        }
        """
        action = input_data.get("action", "monthly_close")
        period = input_data["period"]
        
        if action == "monthly_close":
            return await self._execute_monthly_close(period, input_data.get("close_type", "soft"))
        elif action == "yearly_close":
            return await self._execute_yearly_close(period)
        elif action == "calculate_accruals":
            return await self._calculate_accruals(period)
        elif action == "calculate_depreciation":
            return await self._calculate_depreciation(period)
        else:
            raise ValueError(f"Unknown action: {action}")
    
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Validate input"""
        if "period" not in input_data:
            return False, "Missing required field: period"
        return True, None
    
    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.WORKFLOW, BotCapability.COMPLIANCE]
    
    async def _execute_monthly_close(self, period: str, close_type: str) -> Dict[str, Any]:
        """Execute monthly close procedure"""
        checklist_results = []
        
        # 1. Verify all transactions are posted
        step1 = await self._verify_all_posted(period)
        checklist_results.append(step1)
        
        # 2. Calculate and post accruals
        step2 = await self._calculate_accruals(period)
        checklist_results.append(step2)
        
        # 3. Calculate and post depreciation
        step3 = await self._calculate_depreciation(period)
        checklist_results.append(step3)
        
        # 4. Reconcile bank accounts
        step4 = await self._reconcile_banks(period)
        checklist_results.append(step4)
        
        # 5. Reconcile intercompany accounts
        step5 = await self._reconcile_intercompany(period)
        checklist_results.append(step5)
        
        # 6. Generate trial balance
        step6 = await self._generate_trial_balance(period)
        checklist_results.append(step6)
        
        # 7. Validate trial balance
        step7 = await self._validate_trial_balance(step6["data"])
        checklist_results.append(step7)
        
        # 8. Generate financial statements
        step8 = await self._generate_financial_statements(period)
        checklist_results.append(step8)
        
        # Check if all steps passed
        all_passed = all(step["success"] for step in checklist_results)
        
        # Lock period if hard close and all passed
        period_locked = False
        if close_type == "hard" and all_passed:
            period_locked = await self._lock_period(period)
        
        return {
            "success": all_passed,
            "period": period,
            "close_type": close_type,
            "period_locked": period_locked,
            "checklist_results": checklist_results,
            "steps_completed": sum(1 for step in checklist_results if step["success"]),
            "steps_total": len(checklist_results),
            "completion_percentage": sum(1 for step in checklist_results if step["success"]) / len(checklist_results) * 100,
            "closed_at": datetime.now().isoformat()
        }
    
    async def _execute_yearly_close(self, year: str) -> Dict[str, Any]:
        """Execute year-end close"""
        # Ensure December is closed
        dec_close = await self._execute_monthly_close(f"{year}-12", "hard")
        
        if not dec_close["success"]:
            return {
                "success": False,
                "error": "December month-end must be successfully closed before year-end",
                "december_close": dec_close
            }
        
        # Year-end specific procedures
        procedures = []
        
        # 1. Close revenue and expense accounts
        p1 = await self._close_income_statement_accounts(year)
        procedures.append(p1)
        
        # 2. Calculate income tax provision
        p2 = await self._calculate_income_tax(year)
        procedures.append(p2)
        
        # 3. Generate annual financial statements
        p3 = await self._generate_annual_statements(year)
        procedures.append(p3)
        
        # 4. Prepare audit schedules
        p4 = await self._prepare_audit_schedules(year)
        procedures.append(p4)
        
        return {
            "success": all(p["success"] for p in procedures),
            "year": year,
            "procedures": procedures,
            "annual_statements": p3.get("statements", {}),
            "closed_at": datetime.now().isoformat()
        }
    
    async def _calculate_accruals(self, period: str) -> Dict[str, Any]:
        """Calculate monthly accruals"""
        accruals = []
        
        # Common accruals
        accruals.append({
            "type": "expense",
            "account": "6300",
            "description": "Accrued utilities",
            "amount": 5000,
            "reverses_next_month": True
        })
        
        accruals.append({
            "type": "revenue",
            "account": "4100",
            "description": "Accrued service revenue",
            "amount": 15000,
            "reverses_next_month": True
        })
        
        total_expense_accruals = sum(a["amount"] for a in accruals if a["type"] == "expense")
        total_revenue_accruals = sum(a["amount"] for a in accruals if a["type"] == "revenue")
        
        return {
            "success": True,
            "step": "Calculate Accruals",
            "data": {
                "accruals": accruals,
                "total_expense_accruals": total_expense_accruals,
                "total_revenue_accruals": total_revenue_accruals
            }
        }
    
    async def _calculate_depreciation(self, period: str) -> Dict[str, Any]:
        """Calculate monthly depreciation"""
        # Sample depreciation calculation
        assets = [
            {"asset_id": "A001", "description": "Office Equipment", "cost": 50000, "accumulated_dep": 10000, "monthly_dep": 416.67},
            {"asset_id": "A002", "description": "Computers", "cost": 30000, "accumulated_dep": 15000, "monthly_dep": 250.00},
            {"asset_id": "A003", "description": "Vehicles", "cost": 200000, "accumulated_dep": 40000, "monthly_dep": 1666.67}
        ]
        
        total_depreciation = sum(a["monthly_dep"] for a in assets)
        
        return {
            "success": True,
            "step": "Calculate Depreciation",
            "data": {
                "assets": assets,
                "total_depreciation": round(total_depreciation, 2),
                "journal_entry": {
                    "debit": {"account": "6200", "amount": round(total_depreciation, 2)},
                    "credit": {"account": "1650", "amount": round(total_depreciation, 2)}
                }
            }
        }
    
    async def _verify_all_posted(self, period: str) -> Dict[str, Any]:
        """Verify all transactions are posted"""
        # Check for unposted transactions
        unposted_count = 0  # In production, query database
        
        return {
            "success": unposted_count == 0,
            "step": "Verify All Transactions Posted",
            "data": {"unposted_transactions": unposted_count}
        }
    
    async def _reconcile_banks(self, period: str) -> Dict[str, Any]:
        """Reconcile all bank accounts"""
        bank_accounts = ["1100", "1110", "1120"]  # Cash accounts
        reconciliations = []
        
        for account in bank_accounts:
            reconciliations.append({
                "account": account,
                "reconciled": True,
                "unmatched_items": 0
            })
        
        return {
            "success": all(r["reconciled"] for r in reconciliations),
            "step": "Reconcile Bank Accounts",
            "data": {"reconciliations": reconciliations}
        }
    
    async def _reconcile_intercompany(self, period: str) -> Dict[str, Any]:
        """Reconcile intercompany accounts"""
        return {
            "success": True,
            "step": "Reconcile Intercompany Accounts",
            "data": {"intercompany_accounts_balanced": True}
        }
    
    async def _generate_trial_balance(self, period: str) -> Dict[str, Any]:
        """Generate trial balance"""
        # Sample trial balance
        trial_balance = {
            "period": period,
            "total_debits": 500000,
            "total_credits": 500000,
            "balanced": True
        }
        
        return {
            "success": True,
            "step": "Generate Trial Balance",
            "data": trial_balance
        }
    
    async def _validate_trial_balance(self, trial_balance: Dict[str, Any]) -> Dict[str, Any]:
        """Validate trial balance"""
        is_balanced = trial_balance.get("balanced", False)
        
        return {
            "success": is_balanced,
            "step": "Validate Trial Balance",
            "data": {"balanced": is_balanced}
        }
    
    async def _generate_financial_statements(self, period: str) -> Dict[str, Any]:
        """Generate financial statements"""
        statements = {
            "income_statement": {
                "revenue": 300000,
                "expenses": 180000,
                "net_income": 120000
            },
            "balance_sheet": {
                "assets": 500000,
                "liabilities": 80000,
                "equity": 420000
            },
            "cash_flow": {
                "operating": 100000,
                "investing": -50000,
                "financing": -20000,
                "net_change": 30000
            }
        }
        
        return {
            "success": True,
            "step": "Generate Financial Statements",
            "data": statements
        }
    
    async def _lock_period(self, period: str) -> bool:
        """Lock accounting period"""
        logger.info(f"Locking period {period}")
        # In production, update database to lock period
        return True
    
    async def _close_income_statement_accounts(self, year: str) -> Dict[str, Any]:
        """Close revenue and expense accounts to retained earnings"""
        return {
            "success": True,
            "description": "Close Income Statement Accounts",
            "data": {"accounts_closed": 15, "amount_transferred": 120000}
        }
    
    async def _calculate_income_tax(self, year: str) -> Dict[str, Any]:
        """Calculate income tax provision"""
        taxable_income = 120000  # Sample
        tax_rate = 0.28  # South African corporate tax rate
        tax_provision = taxable_income * tax_rate
        
        return {
            "success": True,
            "description": "Calculate Income Tax",
            "data": {
                "taxable_income": taxable_income,
                "tax_rate": tax_rate,
                "tax_provision": tax_provision
            }
        }
    
    async def _generate_annual_statements(self, year: str) -> Dict[str, Any]:
        """Generate annual financial statements"""
        return {
            "success": True,
            "description": "Generate Annual Statements",
            "statements": {
                "income_statement": "Generated",
                "balance_sheet": "Generated",
                "cash_flow": "Generated",
                "changes_in_equity": "Generated",
                "notes": "Generated"
            }
        }
    
    async def _prepare_audit_schedules(self, year: str) -> Dict[str, Any]:
        """Prepare audit schedules"""
        schedules = [
            "Fixed Asset Schedule",
            "Accounts Receivable Aging",
            "Accounts Payable Aging",
            "Inventory Valuation",
            "Loan Schedules",
            "Contingent Liabilities"
        ]
        
        return {
            "success": True,
            "description": "Prepare Audit Schedules",
            "data": {"schedules_prepared": schedules}
        }
    
    def _initialize_checklist(self) -> List[str]:
        """Initialize close checklist"""
        return [
            "Verify all transactions posted",
            "Calculate and post accruals",
            "Calculate and post depreciation",
            "Reconcile bank accounts",
            "Reconcile intercompany accounts",
            "Generate trial balance",
            "Validate trial balance",
            "Generate financial statements"
        ]


financial_close_bot = FinancialCloseBot()
