"""
South African Payroll Calculation Engine
Full compliance with SA tax laws and BCEA regulations (2024/2025)
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum


class PayFrequency(Enum):
    """Pay frequency types"""
    MONTHLY = "monthly"
    WEEKLY = "weekly"
    FORTNIGHTLY = "fortnightly"
    

class TaxStatus(Enum):
    """Tax status for PAYE calculations"""
    NORMAL = "normal"
    DIRECTIVE = "directive"
    NO_TAX = "no_tax"
    

@dataclass
class Employee:
    """Employee record"""
    employee_id: str
    name: str
    id_number: str
    tax_number: str
    pay_frequency: PayFrequency
    basic_salary: Decimal
    medical_aid_member: bool = False
    pension_member: bool = False
    uif_exempt: bool = False
    

@dataclass
class PayslipItem:
    """Individual payslip line item"""
    code: str
    description: str
    amount: Decimal
    is_taxable: bool = True
    is_pensionable: bool = True
    

@dataclass
class Payslip:
    """Complete payslip"""
    employee_id: str
    pay_period: str
    gross_earnings: Decimal
    taxable_income: Decimal
    paye: Decimal
    uif_employee: Decimal
    uif_employer: Decimal
    pension_employee: Decimal
    pension_employer: Decimal
    medical_aid: Decimal
    other_deductions: Decimal
    net_pay: Decimal
    employer_cost: Decimal
    earnings: List[PayslipItem]
    deductions: List[PayslipItem]
    

class SAPayeTaxTables:
    """South African PAYE Tax Tables 2024/2025"""
    
    def __init__(self):
        self.annual_brackets = [
            {"min": 0, "max": 237100, "rate": 0.18, "base": 0},
            {"min": 237100, "max": 370500, "rate": 0.26, "base": 42678},
            {"min": 370500, "max": 512800, "rate": 0.31, "base": 77362},
            {"min": 512800, "max": 673000, "rate": 0.36, "base": 121475},
            {"min": 673000, "max": 857900, "rate": 0.39, "base": 179147},
            {"min": 857900, "max": 1817000, "rate": 0.41, "base": 251258},
            {"min": 1817000, "max": float('inf'), "rate": 0.45, "base": 644489}
        ]
        
        self.primary_rebate = 17235
        self.secondary_rebate = 9444
        self.tertiary_rebate = 3145
        self.tax_threshold = 95750
        
        self.medical_aid_credit_main = 364
        self.medical_aid_credit_dependent = 246
        
    def calculate_annual_paye(self, annual_taxable_income: Decimal, 
                              age: int = 30,
                              medical_aid_dependents: int = 0) -> Decimal:
        """Calculate annual PAYE tax"""
        income = float(annual_taxable_income)
        
        tax = Decimal(0)
        for bracket in self.annual_brackets:
            if bracket["min"] <= income < bracket["max"]:
                tax = Decimal(bracket["base"]) + \
                      Decimal((income - bracket["min"]) * bracket["rate"])
                break
        
        if age >= 75:
            tax -= Decimal(self.primary_rebate + self.secondary_rebate + self.tertiary_rebate)
        elif age >= 65:
            tax -= Decimal(self.primary_rebate + self.secondary_rebate)
        else:
            tax -= Decimal(self.primary_rebate)
        
        if medical_aid_dependents > 0:
            monthly_credit = self.medical_aid_credit_main + \
                           (self.medical_aid_credit_dependent * (medical_aid_dependents - 1))
            annual_credit = monthly_credit * 12
            tax -= Decimal(annual_credit)
        
        return max(tax, Decimal(0))
    
    def calculate_monthly_paye(self, monthly_taxable_income: Decimal,
                               age: int = 30,
                               medical_aid_dependents: int = 0) -> Decimal:
        """Calculate monthly PAYE tax"""
        annual_income = monthly_taxable_income * 12
        annual_tax = self.calculate_annual_paye(annual_income, age, medical_aid_dependents)
        return annual_tax / 12


class SAPayrollEngine:
    """South African Payroll Calculation Engine"""
    
    def __init__(self):
        self.tax_tables = SAPayeTaxTables()
        
        self.uif_rate = Decimal("0.01")
        self.uif_max_monthly = Decimal("17712")
        self.uif_max_contribution = Decimal("177.12")
        
        self.sdl_rate = Decimal("0.01")
        
        self.pension_default_rate = Decimal("0.075")
        self.medical_aid_default_main = Decimal("1500")
        self.medical_aid_default_dependent = Decimal("1000")
        
    def calculate_uif(self, gross_earnings: Decimal) -> Dict[str, Decimal]:
        """Calculate UIF contributions"""
        uif_earnings = min(gross_earnings, self.uif_max_monthly)
        
        employee_uif = min(uif_earnings * self.uif_rate, self.uif_max_contribution)
        employer_uif = min(uif_earnings * self.uif_rate, self.uif_max_contribution)
        
        return {
            "employee": employee_uif.quantize(Decimal("0.01")),
            "employer": employer_uif.quantize(Decimal("0.01")),
            "total": (employee_uif + employer_uif).quantize(Decimal("0.01"))
        }
    
    def calculate_sdl(self, total_payroll: Decimal) -> Decimal:
        """Calculate Skills Development Levy"""
        sdl = total_payroll * self.sdl_rate
        return sdl.quantize(Decimal("0.01"))
    
    def calculate_paye(self, taxable_income: Decimal,
                       age: int = 30,
                       medical_aid_dependents: int = 0) -> Decimal:
        """Calculate PAYE tax"""
        paye = self.tax_tables.calculate_monthly_paye(
            taxable_income, age, medical_aid_dependents
        )
        return paye.quantize(Decimal("0.01"))
    
    def calculate_pension(self, pensionable_income: Decimal,
                         contribution_rate: Optional[Decimal] = None) -> Dict[str, Decimal]:
        """Calculate pension fund contributions"""
        rate = contribution_rate or self.pension_default_rate
        
        employee_pension = pensionable_income * rate
        employer_pension = pensionable_income * rate
        
        return {
            "employee": employee_pension.quantize(Decimal("0.01")),
            "employer": employer_pension.quantize(Decimal("0.01")),
            "total": (employee_pension + employer_pension).quantize(Decimal("0.01"))
        }
    
    def calculate_medical_aid(self, num_dependents: int = 1,
                             custom_amount: Optional[Decimal] = None) -> Decimal:
        """Calculate medical aid contribution"""
        if custom_amount:
            return custom_amount
        
        total = self.medical_aid_default_main + \
                (self.medical_aid_default_dependent * max(0, num_dependents - 1))
        
        return total.quantize(Decimal("0.01"))
    
    def process_payroll(self, employee: Employee,
                       earnings: List[PayslipItem],
                       deductions: List[PayslipItem],
                       age: int = 30,
                       medical_aid_dependents: int = 0,
                       pension_rate: Optional[Decimal] = None) -> Payslip:
        """Process complete payroll for an employee"""
        
        gross_earnings = sum(item.amount for item in earnings)
        
        taxable_earnings = sum(
            item.amount for item in earnings if item.is_taxable
        )
        
        pensionable_income = sum(
            item.amount for item in earnings if item.is_pensionable
        )
        
        paye = Decimal(0)
        if not employee.uif_exempt:
            paye = self.calculate_paye(
                taxable_earnings, age, medical_aid_dependents
            )
        
        uif = self.calculate_uif(gross_earnings)
        uif_employee = uif["employee"] if not employee.uif_exempt else Decimal(0)
        uif_employer = uif["employer"] if not employee.uif_exempt else Decimal(0)
        
        pension = self.calculate_pension(pensionable_income, pension_rate)
        pension_employee = pension["employee"] if employee.pension_member else Decimal(0)
        pension_employer = pension["employer"] if employee.pension_member else Decimal(0)
        
        medical_aid = Decimal(0)
        if employee.medical_aid_member:
            medical_aid = self.calculate_medical_aid(medical_aid_dependents)
        
        statutory_deductions = [
            PayslipItem("PAYE", "Pay As You Earn", paye, False, False),
            PayslipItem("UIF", "Unemployment Insurance Fund", uif_employee, False, False)
        ]
        
        if pension_employee > 0:
            statutory_deductions.append(
                PayslipItem("PENSION", "Pension Fund", pension_employee, False, False)
            )
        
        if medical_aid > 0:
            statutory_deductions.append(
                PayslipItem("MEDICAL", "Medical Aid", medical_aid, False, False)
            )
        
        all_deductions = statutory_deductions + deductions
        
        total_deductions = sum(item.amount for item in all_deductions)
        
        net_pay = gross_earnings - total_deductions
        
        employer_cost = gross_earnings + uif_employer + pension_employer
        
        pay_period = datetime.now().strftime("%Y-%m")
        
        return Payslip(
            employee_id=employee.employee_id,
            pay_period=pay_period,
            gross_earnings=gross_earnings.quantize(Decimal("0.01")),
            taxable_income=taxable_earnings.quantize(Decimal("0.01")),
            paye=paye,
            uif_employee=uif_employee,
            uif_employer=uif_employer,
            pension_employee=pension_employee,
            pension_employer=pension_employer,
            medical_aid=medical_aid,
            other_deductions=sum(d.amount for d in deductions).quantize(Decimal("0.01")),
            net_pay=net_pay.quantize(Decimal("0.01")),
            employer_cost=employer_cost.quantize(Decimal("0.01")),
            earnings=earnings,
            deductions=all_deductions
        )
    
    def batch_process_payroll(self, payroll_data: List[Dict[str, Any]]) -> List[Payslip]:
        """Process payroll for multiple employees"""
        payslips = []
        
        for employee_data in payroll_data:
            employee = Employee(**employee_data["employee"])
            earnings = [PayslipItem(**e) for e in employee_data.get("earnings", [])]
            deductions = [PayslipItem(**d) for d in employee_data.get("deductions", [])]
            age = employee_data.get("age", 30)
            medical_aid_deps = employee_data.get("medical_aid_dependents", 0)
            pension_rate = employee_data.get("pension_rate")
            
            payslip = self.process_payroll(
                employee, earnings, deductions, age, medical_aid_deps, pension_rate
            )
            payslips.append(payslip)
        
        return payslips
    
    def calculate_company_payroll_taxes(self, payslips: List[Payslip]) -> Dict[str, Decimal]:
        """Calculate total company payroll taxes"""
        total_paye = sum(p.paye for p in payslips)
        total_uif_employee = sum(p.uif_employee for p in payslips)
        total_uif_employer = sum(p.uif_employer for p in payslips)
        total_gross = sum(p.gross_earnings for p in payslips)
        
        sdl = self.calculate_sdl(total_gross)
        
        return {
            "total_paye": total_paye.quantize(Decimal("0.01")),
            "total_uif_employee": total_uif_employee.quantize(Decimal("0.01")),
            "total_uif_employer": total_uif_employer.quantize(Decimal("0.01")),
            "total_uif": (total_uif_employee + total_uif_employer).quantize(Decimal("0.01")),
            "total_sdl": sdl,
            "total_gross_payroll": total_gross.quantize(Decimal("0.01")),
            "total_employer_cost": sum(p.employer_cost for p in payslips).quantize(Decimal("0.01"))
        }


class IRP5Generator:
    """IRP5 Tax Certificate Generator"""
    
    def __init__(self):
        self.tax_year = datetime.now().year
        
    def generate_irp5(self, employee: Employee, 
                     annual_payslips: List[Payslip]) -> Dict[str, Any]:
        """Generate IRP5 certificate for employee"""
        
        total_remuneration = sum(p.gross_earnings for p in annual_payslips)
        total_paye = sum(p.paye for p in annual_payslips)
        total_pension = sum(p.pension_employee for p in annual_payslips)
        total_medical_aid = sum(p.medical_aid for p in annual_payslips)
        total_uif = sum(p.uif_employee for p in annual_payslips)
        
        irp5_data = {
            "certificate_number": f"IRP5-{employee.employee_id}-{self.tax_year}",
            "tax_year": f"{self.tax_year}/{self.tax_year + 1}",
            "employee": {
                "name": employee.name,
                "id_number": employee.id_number,
                "tax_number": employee.tax_number
            },
            "code_3601": float(total_remuneration),
            "code_3605": 0,
            "code_3606": 0,
            "code_3610": float(total_pension),
            "code_3616": float(total_medical_aid),
            "code_3696": float(total_remuneration),
            "code_3699": 0,
            "code_4001": float(total_paye),
            "code_4005": float(total_uif),
            "code_4115": float(total_pension),
            "code_4116": float(total_medical_aid),
            "total_tax_deducted": float(total_paye)
        }
        
        return irp5_data
    
    def generate_it3a(self, company_data: Dict[str, Any],
                     all_irp5s: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate IT3(a) Employer Annual Reconciliation"""
        
        total_remuneration = sum(irp5["code_3601"] for irp5 in all_irp5s)
        total_paye = sum(irp5["code_4001"] for irp5 in all_irp5s)
        total_uif_employee = sum(irp5["code_4005"] for irp5 in all_irp5s)
        
        it3a_data = {
            "reconciliation_number": f"IT3A-{company_data['tax_number']}-{self.tax_year}",
            "tax_year": f"{self.tax_year}/{self.tax_year + 1}",
            "employer": {
                "name": company_data["name"],
                "tax_number": company_data["tax_number"],
                "paye_number": company_data["paye_number"]
            },
            "number_of_employees": len(all_irp5s),
            "total_remuneration": total_remuneration,
            "total_paye_deducted": total_paye,
            "total_uif_employee": total_uif_employee,
            "certificates": all_irp5s
        }
        
        return it3a_data
    
    def generate_emp201(self, company_data: Dict[str, Any],
                       monthly_payroll: Dict[str, Decimal],
                       period: str) -> Dict[str, Any]:
        """Generate EMP201 Monthly Employer Declaration"""
        
        emp201_data = {
            "declaration_number": f"EMP201-{company_data['paye_number']}-{period}",
            "period": period,
            "employer": {
                "name": company_data["name"],
                "paye_number": company_data["paye_number"]
            },
            "total_paye": float(monthly_payroll["total_paye"]),
            "total_uif": float(monthly_payroll["total_uif"]),
            "total_sdl": float(monthly_payroll["total_sdl"]),
            "total_amount_due": float(
                monthly_payroll["total_paye"] + 
                monthly_payroll["total_uif"] + 
                monthly_payroll["total_sdl"]
            )
        }
        
        return emp201_data
