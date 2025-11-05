"""
ARIA ERP - Tax Compliance Bot
Automated VAT, PAYE, and tax return preparation for South Africa
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from .bot_api_client import BotAPIClient

class TaxComplianceBot:
    VAT_RATE = Decimal('0.15')
    
    def __init__(
        self,
        api_client: Optional[BotAPIClient] = None,
        mode: str = "api",
        api_base_url: str = "http://localhost:8000",
        api_token: Optional[str] = None,
        db_session = None,
        tenant_id: Optional[int] = None
    ):
        if api_client:
            self.client = api_client
        else:
            self.client = BotAPIClient(
                mode=mode,
                api_base_url=api_base_url,
                api_token=api_token,
                db_session=db_session,
                tenant_id=tenant_id
            )
    
    def calculate_vat_return(self, year: int, period: int) -> dict:
        """Calculate VAT return for a period using VAT API"""
        vat_returns = self.client.get_vat_returns(year=year, period=period)
        
        if vat_returns:
            vat_return = vat_returns[0]
            return {
                'period': f"{year}-{period:02d}",
                'output_vat': float(vat_return.get('output_vat', 0)),
                'input_vat': float(vat_return.get('input_vat', 0)),
                'net_vat_payable': float(vat_return.get('net_vat', 0)),
                'status': vat_return.get('status', 'DRAFT')
            }
        else:
            return {
                'period': f"{year}-{period:02d}",
                'output_vat': 0.0,
                'input_vat': 0.0,
                'net_vat_payable': 0.0,
                'status': 'NOT_FOUND'
            }
    
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
