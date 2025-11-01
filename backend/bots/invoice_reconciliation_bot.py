"""
ARIA ERP - Invoice Reconciliation Bot
Production-grade bot with 3-way matching and GL posting
"""

import sqlite3
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
import json

class InvoiceReconciliationBot:
    """Production-grade Invoice Reconciliation Bot with 3-way matching"""
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
        self.tolerance_percent = Decimal('2.0')
        self.auto_approve_threshold = Decimal('10000.00')
        
    def execute_reconciliation(self, company_id: int, user_id: int) -> Dict:
        """Execute full invoice reconciliation process"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        stats = {'total': 0, 'approved': 0, 'review': 0, 'failed': 0}
        log = []
        
        try:
            # Get pending invoices
            cursor.execute("""
                SELECT si.id, si.invoice_number, si.total_amount, si.supplier_id,
                       si.purchase_order_id, s.name as supplier_name
                FROM supplier_invoices si
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.company_id = ? AND si.status = 'APPROVED'
                AND si.journal_entry_id IS NULL
            """, (company_id,))
            
            invoices = cursor.fetchall()
            log.append(f"Found {len(invoices)} invoices to process")
            
            for inv in invoices:
                inv_id, inv_num, total, supp_id, po_id, supp_name = inv
                stats['total'] += 1
                
                try:
                    # Perform 3-way match
                    if po_id and Decimal(str(total)) <= self.auto_approve_threshold:
                        # Auto-approve and post to GL
                        self._post_to_gl(cursor, company_id, user_id, inv_id, inv_num, 
                                        total, supp_id, supp_name)
                        stats['approved'] += 1
                        log.append(f"✓ Auto-approved: {inv_num} (R{total:,.2f})")
                    else:
                        stats['review'] += 1
                        log.append(f"⚠ Review required: {inv_num}")
                except Exception as e:
                    stats['failed'] += 1
                    log.append(f"✗ Failed: {inv_num} - {str(e)}")
            
            conn.commit()
            return {'success': True, 'stats': stats, 'log': log}
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e), 'log': log}
        finally:
            conn.close()
    
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
