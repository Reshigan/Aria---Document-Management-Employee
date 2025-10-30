"""Financial Reporting Bot - Generate automated financial statements"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
from .base_bot import FinancialBot, BotCapability

logger = logging.getLogger(__name__)

class FinancialReportingBot(FinancialBot):
    """Generates financial statements and reports"""
    
    def __init__(self):
        super().__init__(
            bot_id="fr_bot_001",
            name="Financial Reporting Bot",
            description="Generates income statements, balance sheets, cash flow statements, and management reports"
        )
        

    def execute(self, context: dict) -> dict:
        """Synchronous wrapper for async execute_async"""
        import asyncio
        return asyncio.run(self.execute_async(context))

    async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "status")
        period = input_data.get("period", "current")
        
        if action == "income_statement":
            return await self._generate_income_statement(period)
        elif action == "balance_sheet":
            return await self._generate_balance_sheet(period)
        elif action == "cash_flow":
            return await self._generate_cash_flow(period)
        elif action == "generate_all":
            return await self._generate_all_statements(period)
        elif action == "status":
            return {"success": True, "status": "operational", "name": self.name}
        else:
            raise ValueError(f"Unknown action: {action}")
    
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        if "period" not in input_data:
            return False, "Missing required field: period"
        return True, None
    
    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.ANALYTICAL, BotCapability.COMPLIANCE]
    
    async def _generate_income_statement(self, period: str) -> Dict[str, Any]:
        """Generate Income Statement (P&L)"""
        income_statement = {
            "period": period,
            "revenue": {
                "sales_revenue": 300000,
                "service_revenue": 50000,
                "total_revenue": 350000
            },
            "cost_of_sales": {
                "direct_materials": 120000,
                "direct_labor": 60000,
                "total_cos": 180000
            },
            "gross_profit": 170000,
            "operating_expenses": {
                "salaries": 35000,
                "rent": 10000,
                "utilities": 5000,
                "depreciation": 10000,
                "total_opex": 60000
            },
            "operating_income": 110000,
            "other_income_expense": {
                "interest_income": 2000,
                "interest_expense": -3000,
                "net_other": -1000
            },
            "net_income_before_tax": 109000,
            "income_tax": 30520,
            "net_income": 78480,
            "earnings_per_share": 0.78,
            "currency": self.currency
        }
        
        return {"success": True, "report_type": "income_statement", "data": income_statement}
    
    async def _generate_balance_sheet(self, period: str) -> Dict[str, Any]:
        """Generate Balance Sheet"""
        balance_sheet = {
            "as_of_date": period,
            "assets": {
                "current_assets": {
                    "cash": 50000,
                    "accounts_receivable": 75000,
                    "inventory": 120000,
                    "total_current": 245000
                },
                "non_current_assets": {
                    "fixed_assets": 250000,
                    "accumulated_depreciation": -50000,
                    "net_fixed_assets": 200000,
                    "total_non_current": 200000
                },
                "total_assets": 445000
            },
            "liabilities": {
                "current_liabilities": {
                    "accounts_payable": 45000,
                    "accrued_expenses": 10000,
                    "total_current": 55000
                },
                "non_current_liabilities": {
                    "long_term_debt": 50000,
                    "total_non_current": 50000
                },
                "total_liabilities": 105000
            },
            "equity": {
                "share_capital": 200000,
                "retained_earnings": 140000,
                "total_equity": 340000
            },
            "total_liabilities_equity": 445000,
            "balanced": True,
            "currency": self.currency
        }
        
        return {"success": True, "report_type": "balance_sheet", "data": balance_sheet}
    
    async def _generate_cash_flow(self, period: str) -> Dict[str, Any]:
        """Generate Cash Flow Statement"""
        cash_flow = {
            "period": period,
            "operating_activities": {
                "net_income": 78480,
                "adjustments": {
                    "depreciation": 10000,
                    "accounts_receivable_change": -5000,
                    "inventory_change": -10000,
                    "accounts_payable_change": 5000
                },
                "net_cash_operating": 78480
            },
            "investing_activities": {
                "equipment_purchase": -30000,
                "net_cash_investing": -30000
            },
            "financing_activities": {
                "dividends_paid": -20000,
                "debt_repayment": -10000,
                "net_cash_financing": -30000
            },
            "net_change_in_cash": 18480,
            "beginning_cash": 31520,
            "ending_cash": 50000,
            "currency": self.currency
        }
        
        return {"success": True, "report_type": "cash_flow", "data": cash_flow}
    
    async def _generate_all_statements(self, period: str) -> Dict[str, Any]:
        """Generate complete financial statement package"""
        income = await self._generate_income_statement(period)
        balance = await self._generate_balance_sheet(period)
        cashflow = await self._generate_cash_flow(period)
        
        return {
            "success": True,
            "period": period,
            "generated_at": datetime.now().isoformat(),
            "statements": {
                "income_statement": income["data"],
                "balance_sheet": balance["data"],
                "cash_flow": cashflow["data"]
            }
        }

financial_reporting_bot = FinancialReportingBot()
