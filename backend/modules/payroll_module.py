"""
ARIA ERP - Payroll Module
Production-grade SA payroll with PAYE, UIF, SDL, and pension calculations
Compliant with South African tax legislation
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sqlite3
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import httpx
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp/payroll", tags=["Payroll"])

class PayrollModule:
    """Complete Payroll Module for South Africa"""
    
    # SA Tax Tables 2024/2025
    PAYE_BRACKETS = [
        (0, 237100, 0.18, 0),
        (237101, 370500, 0.26, 42678),
        (370501, 512800, 0.31, 77362),
        (512801, 673000, 0.36, 121475),
        (673001, 857900, 0.39, 179147),
        (857901, 1817000, 0.41, 251258),
        (1817001, float('inf'), 0.45, 644489)
    ]
    
    PRIMARY_REBATE = 17235  # Annual
    SECONDARY_REBATE = 9444  # 65+
    TERTIARY_REBATE = 3145   # 75+
    
    UIF_RATE = 0.01  # 1% (capped at R177.12/month)
    UIF_MAX_MONTHLY = 177.12
    
    SDL_RATE = 0.01  # 1% of payroll
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def calculate_paye(
        self,
        annual_salary: Decimal,
        age_bracket: int = 0
    ) -> Decimal:
        """Calculate PAYE (Pay As You Earn) tax
        
        Args:
            annual_salary: Annual gross salary
            age_bracket: 0=under 65, 1=65-74, 2=75+
        """
        # Calculate gross tax
        gross_tax = Decimal('0.00')
        annual_salary_float = float(annual_salary)
        
        for min_income, max_income, rate, base_tax in self.PAYE_BRACKETS:
            if annual_salary_float > min_income:
                taxable = min(annual_salary_float, max_income) - min_income
                gross_tax = Decimal(str(base_tax + (taxable * rate)))
        
        # Apply rebates
        rebate = Decimal(str(self.PRIMARY_REBATE))
        if age_bracket >= 1:
            rebate += Decimal(str(self.SECONDARY_REBATE))
        if age_bracket >= 2:
            rebate += Decimal(str(self.TERTIARY_REBATE))
        
        net_tax = max(Decimal('0.00'), gross_tax - rebate)
        return net_tax
    
    def calculate_uif(self, monthly_salary: Decimal) -> Tuple[Decimal, Decimal]:
        """Calculate UIF (Unemployment Insurance Fund)
        
        Returns:
            (employee_uif, employer_uif)
        """
        uif_contrib = min(
            monthly_salary * Decimal(str(self.UIF_RATE)),
            Decimal(str(self.UIF_MAX_MONTHLY))
        )
        return (uif_contrib, uif_contrib)
    
    def calculate_sdl(self, total_payroll: Decimal) -> Decimal:
        """Calculate SDL (Skills Development Levy)"""
        return total_payroll * Decimal(str(self.SDL_RATE))
    
    def process_payroll(
        self,
        company_id: int,
        user_id: int,
        period_start: date,
        period_end: date
    ) -> Dict:
        """Process payroll for a period"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get active employees
            cursor.execute("""
                SELECT e.id, e.first_name, e.last_name, e.employee_number,
                       e.basic_salary, e.date_of_birth, e.pension_percentage,
                       e.medical_aid_contribution
                FROM employees e
                WHERE e.company_id = ? AND e.status = 'ACTIVE'
            """, (company_id,))
            
            employees = cursor.fetchall()
            
            payroll_results = []
            total_gross = Decimal('0.00')
            total_paye = Decimal('0.00')
            total_uif_ee = Decimal('0.00')
            total_uif_er = Decimal('0.00')
            total_net = Decimal('0.00')
            
            for emp in employees:
                emp_id, first_name, last_name, emp_num, basic_salary, dob, pension_pct, medical = emp
                
                # Calculate age bracket
                age = (date.today() - datetime.strptime(dob, '%Y-%m-%d').date()).days // 365
                age_bracket = 0 if age < 65 else (1 if age < 75 else 2)
                
                # Monthly calculations
                monthly_salary = Decimal(str(basic_salary))
                annual_salary = monthly_salary * 12
                
                # PAYE
                annual_paye = self.calculate_paye(annual_salary, age_bracket)
                monthly_paye = annual_paye / 12
                
                # UIF
                uif_ee, uif_er = self.calculate_uif(monthly_salary)
                
                # Pension
                pension_contrib = monthly_salary * (Decimal(str(pension_pct or 0)) / 100)
                
                # Medical aid
                medical_contrib = Decimal(str(medical or 0))
                
                # Calculate net salary
                total_deductions = monthly_paye + uif_ee + pension_contrib + medical_contrib
                net_salary = monthly_salary - total_deductions
                
                # Create payslip
                cursor.execute("""
                    INSERT INTO payslips (
                        company_id, employee_id, pay_period_start, pay_period_end,
                        basic_salary, gross_salary, paye_tax, uif_employee,
                        pension_contribution, medical_aid, total_deductions,
                        net_salary, status, processed_by, processed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    company_id, emp_id, period_start, period_end,
                    float(monthly_salary), float(monthly_salary),
                    float(monthly_paye), float(uif_ee),
                    float(pension_contrib), float(medical_contrib),
                    float(total_deductions), float(net_salary),
                    'PROCESSED', user_id, datetime.now()
                ))
                
                payslip_id = cursor.lastrowid
                
                # Post to GL
                self._post_payroll_to_gl(
                    cursor, company_id, user_id, payslip_id, period_end,
                    monthly_salary, monthly_paye, uif_ee, uif_er,
                    pension_contrib, medical_contrib, net_salary
                )
                
                payroll_results.append({
                    'employee': f"{first_name} {last_name}",
                    'employee_number': emp_num,
                    'gross': float(monthly_salary),
                    'paye': float(monthly_paye),
                    'uif_ee': float(uif_ee),
                    'net': float(net_salary)
                })
                
                total_gross += monthly_salary
                total_paye += monthly_paye
                total_uif_ee += uif_ee
                total_uif_er += uif_er
                total_net += net_salary
            
            # Calculate SDL
            total_sdl = self.calculate_sdl(total_gross)
            
            conn.commit()
            
            return {
                'success': True,
                'period': f"{period_start} to {period_end}",
                'employees_processed': len(employees),
                'total_gross': float(total_gross),
                'total_paye': float(total_paye),
                'total_uif_employee': float(total_uif_ee),
                'total_uif_employer': float(total_uif_er),
                'total_sdl': float(total_sdl),
                'total_net': float(total_net),
                'details': payroll_results
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def _post_payroll_to_gl(
        self,
        cursor,
        company_id: int,
        user_id: int,
        payslip_id: int,
        entry_date: date,
        gross: Decimal,
        paye: Decimal,
        uif_ee: Decimal,
        uif_er: Decimal,
        pension: Decimal,
        medical: Decimal,
        net: Decimal
    ):
        """Post payroll to General Ledger"""
        # Get account IDs
        cursor.execute("SELECT id FROM accounts WHERE code = ? AND company_id = ?", ('6100', company_id))
        salaries_expense = cursor.fetchone()
        
        cursor.execute("SELECT id FROM accounts WHERE code = ? AND company_id = ?", ('2200', company_id))
        paye_payable = cursor.fetchone()
        
        cursor.execute("SELECT id FROM accounts WHERE code = ? AND company_id = ?", ('2300', company_id))
        accrued_salaries = cursor.fetchone()
        
        if not all([salaries_expense, paye_payable, accrued_salaries]):
            return
        
        # Create journal entry
        cursor.execute("""
            INSERT INTO journal_entries (
                company_id, entry_date, reference, description,
                entry_type, status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            company_id, entry_date, f'PAYSLIP-{payslip_id}',
            'Payroll processing', 'PAYROLL', 'POSTED', user_id, datetime.now()
        ))
        
        je_id = cursor.lastrowid
        
        # Dr: Salaries Expense
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, debit_amount, credit_amount, description
            ) VALUES (?, ?, ?, ?, ?)
        """, (je_id, salaries_expense[0], float(gross), 0, 'Gross salaries'))
        
        # Cr: PAYE Payable
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, debit_amount, credit_amount, description
            ) VALUES (?, ?, ?, ?, ?)
        """, (je_id, paye_payable[0], 0, float(paye), 'PAYE withheld'))
        
        # Cr: Net Salaries Payable
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, debit_amount, credit_amount, description
            ) VALUES (?, ?, ?, ?, ?)
        """, (je_id, accrued_salaries[0], 0, float(net), 'Net salaries payable'))
    
    def get_payroll_summary(
        self,
        company_id: int,
        year: int,
        month: int
    ) -> Dict:
        """Get payroll summary for a month"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    COUNT(*) as employee_count,
                    SUM(gross_salary) as total_gross,
                    SUM(paye_tax) as total_paye,
                    SUM(uif_employee) as total_uif_ee,
                    SUM(pension_contribution) as total_pension,
                    SUM(medical_aid) as total_medical,
                    SUM(total_deductions) as total_deductions,
                    SUM(net_salary) as total_net
                FROM payslips
                WHERE company_id = ?
                AND strftime('%Y', pay_period_start) = ?
                AND strftime('%m', pay_period_start) = ?
                AND status = 'PROCESSED'
            """, (company_id, str(year), f"{month:02d}"))
            
            row = cursor.fetchone()
            
            if not row or row[0] == 0:
                return {'error': 'No payroll data found'}
            
            # Calculate SDL
            total_gross = Decimal(str(row[1] or 0))
            sdl = self.calculate_sdl(total_gross)
            
            # UIF employer contribution matches employee
            uif_er = Decimal(str(row[3] or 0))
            
            return {
                'period': f"{year}-{month:02d}",
                'employee_count': row[0],
                'total_gross': float(row[1] or 0),
                'total_paye': float(row[2] or 0),
                'total_uif_employee': float(row[3] or 0),
                'total_uif_employer': float(uif_er),
                'total_uif_combined': float(uif_er * 2),
                'total_sdl': float(sdl),
                'total_pension': float(row[4] or 0),
                'total_medical': float(row[5] or 0),
                'total_deductions': float(row[6] or 0),
                'total_net': float(row[7] or 0),
                'employer_cost': float(total_gross + uif_er + sdl)
            }
            
        finally:
            conn.close()


def main():
    """CLI interface"""
    payroll = PayrollModule()
    
    print("\n" + "="*60)
    print("ARIA ERP - PAYROLL MODULE (SA COMPLIANT)")
    print("="*60 + "\n")
    
    # Test PAYE calculation
    print("PAYE TAX CALCULATION EXAMPLES")
    print("-" * 60)
    
    test_salaries = [
        (Decimal('15000'), 0, "R15,000/month (R180k/year)"),
        (Decimal('25000'), 0, "R25,000/month (R300k/year)"),
        (Decimal('50000'), 0, "R50,000/month (R600k/year)"),
        (Decimal('50000'), 1, "R50,000/month (65+ years)"),
    ]
    
    for monthly, age_bracket, desc in test_salaries:
        annual = monthly * 12
        annual_paye = payroll.calculate_paye(annual, age_bracket)
        monthly_paye = annual_paye / 12
        effective_rate = (annual_paye / annual * 100) if annual > 0 else 0
        
        print(f"\n{desc}")
        print(f"  Annual PAYE:     R{float(annual_paye):>10,.2f}")
        print(f"  Monthly PAYE:    R{float(monthly_paye):>10,.2f}")
        print(f"  Effective Rate:  {float(effective_rate):>10.2f}%")
        
        # UIF
        uif_ee, uif_er = payroll.calculate_uif(monthly)
        print(f"  UIF (Employee):  R{float(uif_ee):>10,.2f}")
        print(f"  UIF (Employer):  R{float(uif_er):>10,.2f}")
    
    print("\n" + "="*60)
    
    # Try to get payroll summary
    print("\nPAYROLL SUMMARY")
    print("-" * 60)
    summary = payroll.get_payroll_summary(1, 2025, 10)
    
    if 'error' in summary:
        print(f"No payroll processed yet: {summary['error']}")
    else:
        print(f"Period: {summary['period']}")
        print(f"Employees: {summary['employee_count']}")
        print(f"Total Gross:      R{summary['total_gross']:>12,.2f}")
        print(f"Total PAYE:       R{summary['total_paye']:>12,.2f}")
        print(f"Total UIF (EE):   R{summary['total_uif_employee']:>12,.2f}")
        print(f"Total UIF (ER):   R{summary['total_uif_employer']:>12,.2f}")
        print(f"Total SDL:        R{summary['total_sdl']:>12,.2f}")
        print(f"Total Net Pay:    R{summary['total_net']:>12,.2f}")
        print(f"Total Employer Cost: R{summary['employer_cost']:>12,.2f}")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
