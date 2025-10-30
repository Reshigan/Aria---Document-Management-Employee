"""
Tax Compliance Bot - South African Tax System
Handles VAT, PAYE, UIF, SDL, CIT calculations and submissions
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
import logging

from .base_bot import FinancialBot, BotCapability

logger = logging.getLogger(__name__)


class TaxComplianceBot(FinancialBot):
    """South African Tax Compliance Bot"""
    
    def __init__(self):
        super().__init__(
            bot_id="tax_bot_001",
            name="Tax Compliance Bot (SA)",
            description="Automates South African tax calculations and submissions (VAT, PAYE, UIF, SDL, CIT)"
        )
        # South African tax rates (2025)
        self.vat_rate = 0.15  # 15%
        self.cit_rate = 0.28  # 28% corporate income tax
        self.paye_brackets = [
            (0, 237100, 0.18, 0),
            (237100, 370500, 0.26, 42678),
            (370500, 512800, 0.31, 77362),
            (512800, 673000, 0.36, 121475),
            (673000, 857900, 0.39, 179147),
            (857900, 1817000, 0.41, 251258),
            (1817000, float('inf'), 0.45, 644489)
        ]
        self.uif_rate = 0.01  # 1% employee + 1% employer = 2% total
        self.uif_max = 17712  # Annual UIF ceiling
        self.sdl_rate = 0.01  # 1% of payroll
        

    def execute(self, context: dict) -> dict:
        """Synchronous wrapper for async execute_async"""
        import asyncio
        return asyncio.run(self.execute_async(context))

    async def execute_async(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        action = input_data.get("action", "status")
        
        if action == "calculate_vat":
            return await self._calculate_vat_return(input_data)
        elif action == "calculate_paye":
            return await self._calculate_paye(input_data)
        elif action == "calculate_cit":
            return await self._calculate_corporate_tax(input_data)
        elif action == "generate_efiling":
            return await self._generate_efiling_submission(input_data)
        elif action == "status":
            return {"success": True, "status": "operational", "name": self.name}
        else:
            raise ValueError(f"Unknown action: {action}")
    
    def validate(self, input_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        if "action" not in input_data:
            return False, "Missing required field: action"
        return True, None
    
    def get_capabilities(self) -> List[BotCapability]:
        return [BotCapability.TRANSACTIONAL, BotCapability.COMPLIANCE]
    
    async def _calculate_vat_return(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate VAT201 return"""
        period = input_data["period"]
        
        # Input VAT (VAT on purchases)
        input_vat = input_data.get("input_vat", 0)
        
        # Output VAT (VAT on sales)
        output_vat = input_data.get("output_vat", 0)
        
        # Calculate net VAT payable/refundable
        net_vat = output_vat - input_vat
        
        vat_return = {
            "period": period,
            "output_vat": output_vat,
            "input_vat": input_vat,
            "net_vat": net_vat,
            "vat_payable": max(net_vat, 0),
            "vat_refund": abs(min(net_vat, 0)),
            "due_date": self._calculate_vat_due_date(period),
            "efiling_ready": True
        }
        
        return {
            "success": True,
            "tax_type": "VAT201",
            "data": vat_return,
            "currency": self.currency
        }
    
    async def _calculate_paye(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate PAYE (Pay As You Earn) for employees"""
        employees = input_data.get("employees", [])
        
        paye_results = []
        total_paye = 0
        total_uif = 0
        total_sdl = 0
        total_gross = 0
        
        for emp in employees:
            gross_salary = emp.get("gross_salary", 0)
            
            # Calculate PAYE
            annual_salary = gross_salary * 12
            paye_annual = self._calculate_paye_bracket(annual_salary)
            paye_monthly = paye_annual / 12
            
            # Calculate UIF (capped)
            uif_employee = min(gross_salary * self.uif_rate, self.uif_max / 12)
            uif_employer = uif_employee
            total_uif_emp = uif_employee + uif_employer
            
            paye_results.append({
                "employee_id": emp.get("employee_id"),
                "name": emp.get("name"),
                "gross_salary": gross_salary,
                "paye": round(paye_monthly, 2),
                "uif_employee": round(uif_employee, 2),
                "uif_employer": round(uif_employer, 2),
                "net_salary": round(gross_salary - paye_monthly - uif_employee, 2)
            })
            
            total_paye += paye_monthly
            total_uif += total_uif_emp
            total_gross += gross_salary
        
        # Calculate SDL (Skills Development Levy)
        total_sdl = total_gross * self.sdl_rate
        
        return {
            "success": True,
            "tax_type": "PAYE",
            "data": {
                "employees": paye_results,
                "total_paye": round(total_paye, 2),
                "total_uif": round(total_uif, 2),
                "total_sdl": round(total_sdl, 2),
                "total_payable": round(total_paye + total_uif + total_sdl, 2),
                "payment_due_date": "7th of following month"
            }
        }
    
    async def _calculate_corporate_tax(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate Corporate Income Tax (CIT)"""
        taxable_income = input_data.get("taxable_income", 0)
        
        # Small Business Corporation (SBC) rates apply if turnover < R20m
        is_sbc = input_data.get("is_sbc", False)
        
        if is_sbc:
            # Progressive rates for SBCs
            if taxable_income <= 91250:
                tax = 0
            elif taxable_income <= 365000:
                tax = (taxable_income - 91250) * 0.07
            elif taxable_income <= 550000:
                tax = 19163 + (taxable_income - 365000) * 0.21
            else:
                tax = 58013 + (taxable_income - 550000) * 0.28
        else:
            # Standard corporate rate
            tax = taxable_income * self.cit_rate
        
        return {
            "success": True,
            "tax_type": "CIT",
            "data": {
                "taxable_income": taxable_income,
                "is_sbc": is_sbc,
                "tax_rate": self.cit_rate if not is_sbc else "progressive",
                "tax_payable": round(tax, 2),
                "effective_rate": round((tax / taxable_income * 100) if taxable_income > 0 else 0, 2),
                "currency": self.currency
            }
        }
    
    async def _generate_efiling_submission(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate eFiling submission file for SARS"""
        tax_type = input_data.get("tax_type")
        
        submission = {
            "submission_id": f"SARS-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "tax_type": tax_type,
            "submission_date": datetime.now().isoformat(),
            "status": "ready_for_submission",
            "efiling_url": "https://www.sarsefiling.co.za"
        }
        
        return {
            "success": True,
            "message": "eFiling submission ready",
            "data": submission
        }
    
    def _calculate_paye_bracket(self, annual_income: float) -> float:
        """Calculate PAYE using tax brackets"""
        for lower, upper, rate, rebate in self.paye_brackets:
            if lower <= annual_income < upper:
                tax = (annual_income - lower) * rate + rebate
                # Apply tax rebates (primary rebate: R17,235)
                tax = max(0, tax - 17235)
                return tax
        return 0
    
    def _calculate_vat_due_date(self, period: str) -> str:
        """Calculate VAT return due date (25th of following month)"""
        year, month = period.split("-")
        next_month = int(month) + 1
        next_year = int(year)
        if next_month > 12:
            next_month = 1
            next_year += 1
        return f"{next_year}-{next_month:02d}-25"


tax_compliance_bot = TaxComplianceBot()
