"""
ARIA ERP - Accounts Receivable Module
Production-grade AR with invoice generation, payment allocation, and aging
"""

import sqlite3
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

class AccountsReceivableModule:
    """Complete Accounts Receivable Module"""
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def generate_invoice(
        self,
        company_id: int,
        user_id: int,
        customer_id: int,
        invoice_data: Dict
    ) -> Dict:
        """Generate customer invoice with GL posting"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT COALESCE(MAX(CAST(SUBSTR(invoice_number, 4) AS INTEGER)), 0) + 1
                FROM customer_invoices WHERE company_id = ?
            """, (company_id,))
            next_num = cursor.fetchone()[0]
            invoice_number = f"INV{next_num:06d}"
            
            subtotal = Decimal('0.00')
            for line in invoice_data['lines']:
                line_total = Decimal(str(line['quantity'])) * Decimal(str(line['unit_price']))
                subtotal += line_total
            
            tax_rate = Decimal(str(invoice_data.get('tax_rate', 15.0)))
            tax_amount = subtotal * (tax_rate / 100)
            total_amount = subtotal + tax_amount
            
            cursor.execute("""
                INSERT INTO customer_invoices (
                    company_id, customer_id, invoice_number, invoice_date, due_date,
                    sales_order_id, currency_code, subtotal, tax_amount, total_amount,
                    amount_outstanding, status, payment_status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, customer_id, invoice_number,
                invoice_data['invoice_date'], invoice_data['due_date'],
                invoice_data.get('sales_order_id'), 'ZAR',
                float(subtotal), float(tax_amount), float(total_amount),
                float(total_amount), 'DRAFT', 'UNPAID', user_id
            ))
            
            invoice_id = cursor.lastrowid
            
            for idx, line in enumerate(invoice_data['lines'], 1):
                line_total = Decimal(str(line['quantity'])) * Decimal(str(line['unit_price']))
                line_tax = line_total * (tax_rate / 100)
                
                cursor.execute("""
                    INSERT INTO customer_invoice_lines (
                        invoice_id, line_number, description, quantity, unit_price,
                        line_total, tax_rate, tax_amount, account_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    invoice_id, idx, line['description'],
                    float(line['quantity']), float(line['unit_price']),
                    float(line_total), float(tax_rate), float(line_tax),
                    line.get('account_id')
                ))
            
            je_id = self._post_invoice_to_gl(
                cursor, company_id, user_id, invoice_number,
                customer_id, subtotal, tax_amount, total_amount,
                invoice_data['invoice_date']
            )
            
            cursor.execute("""
                UPDATE customer_invoices SET
                    status = 'POSTED',
                    journal_entry_id = ?,
                    posted_by = ?,
                    posted_at = ?
                WHERE id = ?
            """, (je_id, user_id, datetime.now(), invoice_id))
            
            conn.commit()
            
            return {
                'success': True,
                'invoice_id': invoice_id,
                'invoice_number': invoice_number,
                'total_amount': float(total_amount),
                'journal_entry_id': je_id
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def _post_invoice_to_gl(
        self,
        cursor,
        company_id: int,
        user_id: int,
        invoice_number: str,
        customer_id: int,
        subtotal: Decimal,
        tax_amount: Decimal,
        total_amount: Decimal,
        invoice_date: date
    ) -> int:
        """Post invoice to General Ledger"""
        cursor.execute("""
            SELECT id FROM fiscal_periods
            WHERE company_id = ? AND ? BETWEEN start_date AND end_date
            AND is_closed = 0 LIMIT 1
        """, (company_id, invoice_date))
        
        period = cursor.fetchone()
        if not period:
            raise ValueError("No open fiscal period")
        
        je_number = f"AR-{invoice_number}"
        cursor.execute("""
            INSERT INTO journal_entries (
                company_id, fiscal_period_id, entry_number, entry_date,
                entry_type, reference, description, status,
                posted_by, posted_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            company_id, period[0], je_number, invoice_date,
            'INVOICE', invoice_number, f"Customer Invoice {invoice_number}",
            'POSTED', user_id, datetime.now(), user_id
        ))
        
        je_id = cursor.lastrowid
        
        cursor.execute("SELECT id FROM accounts WHERE company_id = ? AND code = '1200'", (company_id,))
        ar_account = cursor.fetchone()[0]
        
        cursor.execute("SELECT id FROM accounts WHERE company_id = ? AND code = '4100'", (company_id,))
        revenue_account = cursor.fetchone()[0]
        
        cursor.execute("SELECT id FROM accounts WHERE company_id = ? AND code = '2120'", (company_id,))
        vat_account = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount
            ) VALUES (?, 1, ?, ?, ?, 0)
        """, (je_id, ar_account, "Customer Invoice", float(total_amount)))
        
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount
            ) VALUES (?, 2, ?, ?, 0, ?)
        """, (je_id, revenue_account, "Sales", float(subtotal)))
        
        if tax_amount > 0:
            cursor.execute("""
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_id, description,
                    debit_amount, credit_amount
                ) VALUES (?, 3, ?, ?, 0, ?)
            """, (je_id, vat_account, "VAT Output", float(tax_amount)))
        
        return je_id
    
    def allocate_payment(
        self,
        company_id: int,
        user_id: int,
        payment_data: Dict
    ) -> Dict:
        """Allocate customer payment to invoices"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT COALESCE(MAX(CAST(SUBSTR(payment_number, 4) AS INTEGER)), 0) + 1
                FROM payments WHERE company_id = ? AND payment_type = 'CUSTOMER'
            """, (company_id,))
            next_num = cursor.fetchone()[0]
            payment_number = f"REC{next_num:06d}"
            
            cursor.execute("""
                INSERT INTO payments (
                    company_id, payment_number, payment_date, payment_type,
                    customer_id, bank_account_id, payment_method, reference,
                    amount, currency_code, amount_base, status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, payment_number, payment_data['payment_date'],
                'CUSTOMER', payment_data['customer_id'], payment_data['bank_account_id'],
                payment_data['payment_method'], payment_data.get('reference'),
                float(payment_data['amount']), 'ZAR', float(payment_data['amount']),
                'DRAFT', user_id
            ))
            
            payment_id = cursor.lastrowid
            
            for allocation in payment_data['allocations']:
                invoice_id = allocation['invoice_id']
                alloc_amount = Decimal(str(allocation['amount']))
                
                cursor.execute("""
                    INSERT INTO payment_allocations (
                        payment_id, invoice_id, amount
                    ) VALUES (?, ?, ?)
                """, (payment_id, invoice_id, float(alloc_amount)))
                
                cursor.execute("""
                    UPDATE customer_invoices SET
                        amount_paid = amount_paid + ?,
                        amount_outstanding = amount_outstanding - ?,
                        payment_status = CASE
                            WHEN amount_outstanding - ? <= 0.01 THEN 'PAID'
                            WHEN amount_paid + ? > 0 THEN 'PARTIAL'
                            ELSE 'UNPAID'
                        END
                    WHERE id = ?
                """, (float(alloc_amount), float(alloc_amount),
                      float(alloc_amount), float(alloc_amount), invoice_id))
            
            je_id = self._post_receipt_to_gl(
                cursor, company_id, user_id, payment_number,
                payment_data['customer_id'], payment_data['bank_account_id'],
                payment_data['amount'], payment_data['payment_date']
            )
            
            cursor.execute("""
                UPDATE payments SET
                    status = 'POSTED',
                    journal_entry_id = ?
                WHERE id = ?
            """, (je_id, payment_id))
            
            conn.commit()
            
            return {
                'success': True,
                'payment_id': payment_id,
                'payment_number': payment_number,
                'journal_entry_id': je_id
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def _post_receipt_to_gl(
        self,
        cursor,
        company_id: int,
        user_id: int,
        payment_number: str,
        customer_id: int,
        bank_account_id: int,
        amount: float,
        payment_date: date
    ) -> int:
        """Post customer receipt to GL"""
        cursor.execute("""
            SELECT id FROM fiscal_periods
            WHERE company_id = ? AND ? BETWEEN start_date AND end_date
            AND is_closed = 0 LIMIT 1
        """, (company_id, payment_date))
        
        period = cursor.fetchone()
        if not period:
            raise ValueError("No open fiscal period")
        
        je_number = f"REC-{payment_number}"
        cursor.execute("""
            INSERT INTO journal_entries (
                company_id, fiscal_period_id, entry_number, entry_date,
                entry_type, reference, description, status,
                posted_by, posted_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            company_id, period[0], je_number, payment_date,
            'PAYMENT', payment_number, f"Customer Receipt {payment_number}",
            'POSTED', user_id, datetime.now(), user_id
        ))
        
        je_id = cursor.lastrowid
        
        cursor.execute("SELECT id FROM accounts WHERE company_id = ? AND code = '1200'", (company_id,))
        ar_account = cursor.fetchone()[0]
        
        cursor.execute("SELECT account_id FROM bank_accounts WHERE id = ?", (bank_account_id,))
        bank_account_gl = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount
            ) VALUES (?, 1, ?, ?, ?, 0)
        """, (je_id, bank_account_gl, "Receipt", float(amount)))
        
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount
            ) VALUES (?, 2, ?, ?, 0, ?)
        """, (je_id, ar_account, "Receipt", float(amount)))
        
        return je_id
    
    def get_aging_analysis(
        self,
        company_id: int,
        as_of_date: Optional[date] = None
    ) -> Dict:
        """Generate AR aging analysis"""
        if not as_of_date:
            as_of_date = date.today()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    c.id, c.code, c.name,
                    ci.invoice_number, ci.invoice_date, ci.due_date,
                    ci.total_amount, ci.amount_outstanding,
                    CAST(julianday(?) - julianday(ci.due_date) AS INTEGER) as days_overdue
                FROM customer_invoices ci
                JOIN customers c ON ci.customer_id = c.id
                WHERE ci.company_id = ?
                AND ci.payment_status IN ('UNPAID', 'PARTIAL')
                AND ci.amount_outstanding > 0
                ORDER BY c.name, ci.due_date
            """, (as_of_date, company_id))
            
            invoices = []
            aging_buckets = {
                'current': Decimal('0.00'),
                '1_30': Decimal('0.00'),
                '31_60': Decimal('0.00'),
                '61_90': Decimal('0.00'),
                'over_90': Decimal('0.00')
            }
            
            for row in cursor.fetchall():
                cust_id, cust_code, cust_name, inv_num, inv_date, due_date, total, outstanding, days_overdue = row
                
                outstanding_dec = Decimal(str(outstanding))
                
                if days_overdue <= 0:
                    bucket = 'current'
                    aging_buckets['current'] += outstanding_dec
                elif days_overdue <= 30:
                    bucket = '1_30'
                    aging_buckets['1_30'] += outstanding_dec
                elif days_overdue <= 60:
                    bucket = '31_60'
                    aging_buckets['31_60'] += outstanding_dec
                elif days_overdue <= 90:
                    bucket = '61_90'
                    aging_buckets['61_90'] += outstanding_dec
                else:
                    bucket = 'over_90'
                    aging_buckets['over_90'] += outstanding_dec
                
                invoices.append({
                    'customer_code': cust_code,
                    'customer_name': cust_name,
                    'invoice_number': inv_num,
                    'invoice_date': str(inv_date),
                    'due_date': str(due_date),
                    'total_amount': float(total),
                    'amount_outstanding': float(outstanding),
                    'days_overdue': days_overdue,
                    'aging_bucket': bucket
                })
            
            total_outstanding = sum(aging_buckets.values())
            
            return {
                'as_of_date': str(as_of_date),
                'invoices': invoices,
                'aging_buckets': {
                    'current': float(aging_buckets['current']),
                    '1_30_days': float(aging_buckets['1_30']),
                    '31_60_days': float(aging_buckets['31_60']),
                    '61_90_days': float(aging_buckets['61_90']),
                    'over_90_days': float(aging_buckets['over_90'])
                },
                'total_outstanding': float(total_outstanding)
            }
            
        finally:
            conn.close()


def main():
    """CLI interface"""
    ar = AccountsReceivableModule()
    
    print("\n" + "="*60)
    print("ARIA ERP - ACCOUNTS RECEIVABLE MODULE")
    print("="*60 + "\n")
    
    print("AR AGING ANALYSIS")
    print("-" * 60)
    aging = ar.get_aging_analysis(1)
    
    print(f"As of Date: {aging['as_of_date']}\n")
    print("Aging Buckets:")
    print(f"  Current:        R{aging['aging_buckets']['current']:>12,.2f}")
    print(f"  1-30 Days:      R{aging['aging_buckets']['1_30_days']:>12,.2f}")
    print(f"  31-60 Days:     R{aging['aging_buckets']['31_60_days']:>12,.2f}")
    print(f"  61-90 Days:     R{aging['aging_buckets']['61_90_days']:>12,.2f}")
    print(f"  Over 90 Days:   R{aging['aging_buckets']['over_90_days']:>12,.2f}")
    print("-" * 60)
    print(f"  Total Outstanding: R{aging['total_outstanding']:>12,.2f}")
    
    if aging['invoices']:
        print(f"\n\nInvoice Details: ({len(aging['invoices'])} invoices)")
        for inv in aging['invoices'][:10]:
            print(f"  {inv['customer_name']:<20} {inv['invoice_number']:<15} "
                  f"R{inv['amount_outstanding']:>10,.2f} ({inv['days_overdue']:>3} days)")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
