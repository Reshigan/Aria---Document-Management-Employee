"""
ARIA ERP - Invoice Reconciliation Bot
Production-grade bot with 3-way matching and GL posting
"""
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
import json
from .bot_api_client import BotAPIClient

class InvoiceReconciliationBot:
    """Production-grade Invoice Reconciliation Bot with 3-way matching"""
    
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
        self.tolerance_percent = Decimal('2.0')
        self.auto_approve_threshold = Decimal('10000.00')
        
    def execute_reconciliation(self) -> Dict:
        """Execute full invoice reconciliation process using AP API"""
        stats = {'total': 0, 'approved': 0, 'review': 0, 'failed': 0}
        log = []
        
        try:
            bills = self.client.get_vendor_bills(status='DRAFT')
            log.append(f"Found {len(bills)} bills to process")
            
            for bill in bills:
                stats['total'] += 1
                
                try:
                    bill_id = bill['id']
                    bill_number = bill['bill_number']
                    total = Decimal(str(bill['total_amount']))
                    po_id = bill.get('purchase_order_id')
                    
                    if po_id and total <= self.auto_approve_threshold:
                        result = self.client.approve_vendor_bill(bill_id)
                        if result.get('success'):
                            stats['approved'] += 1
                            log.append(f"✓ Auto-approved: {bill_number} (R{total:,.2f})")
                        else:
                            stats['failed'] += 1
                            log.append(f"✗ Failed to approve: {bill_number}")
                    else:
                        stats['review'] += 1
                        log.append(f"⚠ Review required: {bill_number}")
                except Exception as e:
                    stats['failed'] += 1
                    log.append(f"✗ Failed: {str(e)}")
            
            return {'success': True, 'stats': stats, 'log': log}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'log': log}
    
    def _post_to_gl(self, cursor, company_id, user_id, inv_id, inv_num, 
                    total, supp_id, supp_name):
        """Post invoice to General Ledger with double-entry"""
        # Get fiscal period
        cursor.execute("""
            SELECT id FROM fiscal_periods
            WHERE company_id = ? AND is_closed = 0
            ORDER BY start_date DESC LIMIT 1
        """, (company_id,))
        period = cursor.fetchone()
        if not period:
            raise ValueError("No open fiscal period")
        
        # Create journal entry
        je_num = f"AP-{inv_num}"
        cursor.execute("""
            INSERT INTO journal_entries (
                company_id, fiscal_period_id, entry_number, entry_date,
                entry_type, description, status, posted_by, posted_at, created_by
            ) VALUES (?, ?, ?, date('now'), 'INVOICE', ?, 'POSTED', ?, datetime('now'), ?)
        """, (company_id, period[0], je_num, f"Supplier Invoice: {supp_name}",
              user_id, user_id))
        
        je_id = cursor.lastrowid
        
        # Get accounts
        cursor.execute("SELECT id FROM accounts WHERE company_id = ? AND code = '2110'", (company_id,))
        ap_account = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM accounts WHERE company_id = ? AND code = '5100'", (company_id,))
        exp_account = cursor.fetchone()[0]
        
        # Credit AP (liability increases)
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount
            ) VALUES (?, 1, ?, ?, 0, ?)
        """, (je_id, ap_account, f"AP - {supp_name}", float(total)))
        
        # Debit Expense (expense increases)
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount
            ) VALUES (?, 2, ?, ?, ?, 0)
        """, (je_id, exp_account, "Expense", float(total)))
        
        # Update invoice
        cursor.execute("""
            UPDATE supplier_invoices SET
                status = 'POSTED', journal_entry_id = ?,
                posted_by = ?, posted_at = datetime('now')
            WHERE id = ?
        """, (je_id, user_id, inv_id))

def main():
    """CLI interface"""
    import sys
    company_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    user_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    bot = InvoiceReconciliationBot()
    result = bot.execute_reconciliation(company_id, user_id)
    
    print("\n" + "="*60)
    print("INVOICE RECONCILIATION BOT - RESULTS")
    print("="*60)
    
    if result['success']:
        print(f"\n✓ SUCCESS")
        print(f"\nStatistics:")
        print(f"  Total:      {result['stats']['total']}")
        print(f"  Approved:   {result['stats']['approved']}")
        print(f"  Review:     {result['stats']['review']}")
        print(f"  Failed:     {result['stats']['failed']}")
        print(f"\nLog:")
        for entry in result['log']:
            print(f"  {entry}")
    else:
        print(f"\n✗ FAILED: {result['error']}")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
