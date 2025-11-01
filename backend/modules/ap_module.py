"""
ARIA ERP - Accounts Payable Module
Production-grade AP with payment processing, aging, and supplier management
"""

import sqlite3
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

class AccountsPayableModule:
    """Complete Accounts Payable Module"""
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def create_supplier_invoice(
        self,
        company_id: int,
        user_id: int,
        supplier_id: int,
        invoice_data: Dict
    ) -> Dict:
        """Create new supplier invoice"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get next invoice number
            cursor.execute("""
                SELECT COALESCE(MAX(CAST(SUBSTR(invoice_number, 5) AS INTEGER)), 0) + 1
                FROM supplier_invoices WHERE company_id = ?
            """, (company_id,))
            next_num = cursor.fetchone()[0]
            invoice_number = f"SINV{next_num:06d}"
            
            # Calculate totals
            subtotal = Decimal(str(invoice_data['subtotal']))
            tax_rate = Decimal(str(invoice_data.get('tax_rate', 15.0)))
            tax_amount = subtotal * (tax_rate / 100)
            total_amount = subtotal + tax_amount
            
            # Create invoice
            cursor.execute("""
                INSERT INTO supplier_invoices (
                    company_id, supplier_id, invoice_number, invoice_date, due_date,
                    purchase_order_id, currency_code, subtotal, tax_amount, total_amount,
                    amount_outstanding, status, payment_status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, supplier_id, invoice_number,
                invoice_data['invoice_date'], invoice_data['due_date'],
                invoice_data.get('purchase_order_id'), 'ZAR',
                float(subtotal), float(tax_amount), float(total_amount),
                float(total_amount), 'DRAFT', 'UNPAID', user_id
            ))
            
            invoice_id = cursor.lastrowid
            
            # Add line items
            for idx, line in enumerate(invoice_data['lines'], 1):
                line_total = Decimal(str(line['quantity'])) * Decimal(str(line['unit_price']))
                line_tax = line_total * (tax_rate / 100)
                
                cursor.execute("""
                    INSERT INTO supplier_invoice_lines (
                        invoice_id, line_number, description, quantity, unit_price,
                        line_total, tax_rate, tax_amount, account_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    invoice_id, idx, line['description'],
                    float(line['quantity']), float(line['unit_price']),
                    float(line_total), float(tax_rate), float(line_tax),
                    line.get('account_id')
                ))
            
            conn.commit()
            
            return {
                'success': True,
                'invoice_id': invoice_id,
                'invoice_number': invoice_number,
                'total_amount': float(total_amount)
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def process_payment(
        self,
        company_id: int,
        user_id: int,
        payment_data: Dict
    ) -> Dict:
        """Process supplier payment with GL posting"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get next payment number
            cursor.execute("""
                SELECT COALESCE(MAX(CAST(SUBSTR(payment_number, 4) AS INTEGER)), 0) + 1
                FROM payments WHERE company_id = ? AND payment_type = 'SUPPLIER'
            """, (company_id,))
            next_num = cursor.fetchone()[0]
            payment_number = f"PAY{next_num:06d}"
            
            # Create payment record
            cursor.execute("""
                INSERT INTO payments (
                    company_id, payment_number, payment_date, payment_type,
                    supplier_id, bank_account_id, payment_method, reference,
                    amount, currency_code, amount_base, status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, payment_number, payment_data['payment_date'],
                'SUPPLIER', payment_data['supplier_id'], payment_data['bank_account_id'],
                payment_data['payment_method'], payment_data.get('reference'),
                float(payment_data['amount']), 'ZAR', float(payment_data['amount']),
                'DRAFT', user_id
            ))
            
            payment_id = cursor.lastrowid
            
            # Allocate to invoices
            remaining_amount = Decimal(str(payment_data['amount']))
            
            for allocation in payment_data['allocations']:
                invoice_id = allocation['invoice_id']
                alloc_amount = Decimal(str(allocation['amount']))
                
                # Create allocation
                cursor.execute("""
                    INSERT INTO payment_allocations (
                        payment_id, invoice_id, amount
                    ) VALUES (?, ?, ?)
                """, (payment_id, invoice_id, float(alloc_amount)))
                
                # Update invoice
                cursor.execute("""
                    UPDATE supplier_invoices SET
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
                
                remaining_amount -= alloc_amount
            
            # Post to GL
            je_id = self._post_payment_to_gl(
                cursor, company_id, user_id, payment_number,
                payment_data['supplier_id'], payment_data['bank_account_id'],
                payment_data['amount'], payment_data['payment_date']
            )
            
            # Update payment status
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
    
    def _post_payment_to_gl(
        self,
        cursor,
        company_id: int,
        user_id: int,
        payment_number: str,
        supplier_id: int,
        bank_account_id: int,
        amount: float,
        payment_date: date
    ) -> int:
        """Post payment to General Ledger"""
        cursor.execute("""
            SELECT id FROM fiscal_periods
            WHERE company_id = ? AND ? BETWEEN start_date AND end_date
            AND is_closed = 0 LIMIT 1
        """, (company_id, payment_date))
        
        period = cursor.fetchone()
        if not period:
            raise ValueError("No open fiscal period")
        
        je_number = f"PMT-{payment_number}"
        cursor.execute("""
            INSERT INTO journal_entries (
                company_id, fiscal_period_id, entry_number, entry_date,
                entry_type, reference, description, status,
                posted_by, posted_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            company_id, period[0], je_number, payment_date,
            'PAYMENT', payment_number, f"Supplier Payment {payment_number}",
            'POSTED', user_id, datetime.now(), user_id
        ))
        
        je_id = cursor.lastrowid
        
        cursor.execute("SELECT account_id FROM suppliers WHERE id = ?", (supplier_id,))
        ap_account_id = cursor.fetchone()[0]
        
        cursor.execute("SELECT account_id FROM bank_accounts WHERE id = ?", (bank_account_id,))
        bank_account_id_gl = cursor.fetchone()[0]
        
        # Debit AP (decrease liability)
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount
            ) VALUES (?, 1, ?, ?, ?, 0)
        """, (je_id, ap_account_id, "Payment", float(amount)))
        
        # Credit Bank (decrease asset)
        cursor.execute("""
            INSERT INTO journal_entry_lines (
                journal_entry_id, line_number, account_id, description,
                debit_amount, credit_amount
            ) VALUES (?, 2, ?, ?, 0, ?)
        """, (je_id, bank_account_id_gl, "Payment", float(amount)))
        
        return je_id
    
    def get_aging_analysis(
        self,
        company_id: int,
        as_of_date: Optional[date] = None
    ) -> Dict:
        """Generate AP aging analysis"""
        if not as_of_date:
            as_of_date = date.today()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    s.id, s.code, s.name,
                    si.invoice_number, si.invoice_date, si.due_date,
                    si.total_amount, si.amount_outstanding,
                    CAST(julianday(?) - julianday(si.due_date) AS INTEGER) as days_overdue
                FROM supplier_invoices si
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.company_id = ?
                AND si.payment_status IN ('UNPAID', 'PARTIAL')
                AND si.amount_outstanding > 0
                ORDER BY s.name, si.due_date
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
                supp_id, supp_code, supp_name, inv_num, inv_date, due_date, total, outstanding, days_overdue = row
                
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
                    'supplier_code': supp_code,
                    'supplier_name': supp_name,
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
    ap = AccountsPayableModule()
    
    print("\n" + "="*60)
    print("ARIA ERP - ACCOUNTS PAYABLE MODULE")
    print("="*60 + "\n")
    
    print("AP AGING ANALYSIS")
    print("-" * 60)
    aging = ap.get_aging_analysis(1)
    
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
            print(f"  {inv['supplier_name']:<20} {inv['invoice_number']:<15} "
                  f"R{inv['amount_outstanding']:>10,.2f} ({inv['days_overdue']:>3} days)")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
