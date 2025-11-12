"""
ARIA ERP - Tax Compliance Bot
Automated VAT, PAYE, and tax return preparation for South Africa
"""

import sqlite3
from datetime import datetime, date
from decimal import Decimal

class TaxComplianceBot:
    VAT_RATE = Decimal('0.15')  # 15% SA VAT
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def calculate_vat_return(self, company_id: int, year: int, month: int) -> dict:
        """Calculate VAT return for a period"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Output VAT (sales)
            cursor.execute("""
                SELECT COALESCE(SUM(vat_amount), 0)
                FROM sales_invoices
                WHERE company_id = ?
                AND strftime('%Y', invoice_date) = ?
                AND strftime('%m', invoice_date) = ?
                AND status != 'CANCELLED'
            """, (company_id, str(year), f"{month:02d}"))
            
            output_vat = Decimal(str(cursor.fetchone()[0]))
            
            # Input VAT (purchases)
            cursor.execute("""
                SELECT COALESCE(SUM(vat_amount), 0)
                FROM purchase_invoices
                WHERE company_id = ?
                AND strftime('%Y', invoice_date) = ?
                AND strftime('%m', invoice_date) = ?
                AND status != 'CANCELLED'
            """, (company_id, str(year), f"{month:02d}"))
            
            input_vat = Decimal(str(cursor.fetchone()[0]))
            
            # Calculate net VAT payable
            net_vat = output_vat - input_vat
            
            return {
                'period': f"{year}-{month:02d}",
                'output_vat': float(output_vat),
                'input_vat': float(input_vat),
                'net_vat_payable': float(net_vat),
                'status': 'PAYABLE' if net_vat > 0 else 'REFUND_DUE'
            }
            
        finally:
            conn.close()
    
    def generate_paye_submission(self, company_id: int, year: int, month: int) -> dict:
        """Generate PAYE submission file"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    COUNT(*) as employee_count,
                    SUM(paye) as total_paye,
                    SUM(uif_employee + uif_employer) as total_uif
                FROM payslips ps
                JOIN payroll_runs pr ON ps.payroll_run_id = pr.id
                WHERE pr.company_id = ?
                AND strftime('%Y', pr.pay_period_end) = ?
                AND strftime('%m', pr.pay_period_end) = ?
            """, (company_id, str(year), f"{month:02d}"))
            
            row = cursor.fetchone()
            
            return {
                'period': f"{year}-{month:02d}",
                'employee_count': row[0] or 0,
                'total_paye': float(row[1] or 0),
                'total_uif': float(row[2] or 0),
                'total_due': float((row[1] or 0) + (row[2] or 0))
            }
            
        finally:
            conn.close()

def main():
    print("\n" + "="*60)
    print("ARIA ERP - TAX COMPLIANCE BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - SA tax automation")
    print("✓ VAT returns: AUTOMATED")
    print("✓ PAYE submissions: AUTOMATED")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
