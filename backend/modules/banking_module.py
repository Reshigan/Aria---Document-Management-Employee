"""
ARIA ERP - Banking Module
Production-grade bank reconciliation, statement import, and cash management
"""

import sqlite3
import csv
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
from difflib import SequenceMatcher

class BankingModule:
    """Complete Banking Module"""
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def import_statement(
        self,
        company_id: int,
        user_id: int,
        bank_account_id: int,
        statement_data: List[Dict]
    ) -> Dict:
        """Import bank statement transactions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            imported_count = 0
            skipped_count = 0
            
            for trans in statement_data:
                trans_date = trans['date']
                reference = trans['reference']
                description = trans['description']
                amount = Decimal(str(trans['amount']))
                
                # Check for duplicates
                cursor.execute("""
                    SELECT COUNT(*) FROM bank_transactions
                    WHERE bank_account_id = ? AND transaction_date = ?
                    AND reference = ?
                """, (bank_account_id, trans_date, reference))
                
                if cursor.fetchone()[0] > 0:
                    skipped_count += 1
                    continue
                
                # Import transaction
                cursor.execute("""
                    INSERT INTO bank_transactions (
                        bank_account_id, transaction_date, reference,
                        description, debit_amount, credit_amount, balance,
                        is_reconciled, imported_from
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    bank_account_id, trans_date, reference, description,
                    float(amount) if amount > 0 else 0,
                    float(-amount) if amount < 0 else 0,
                    float(trans.get('balance', 0)), 0, 'IMPORT'
                ))
                
                imported_count += 1
            
            conn.commit()
            
            return {
                'success': True,
                'imported': imported_count,
                'skipped': skipped_count
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def auto_reconcile(
        self,
        company_id: int,
        user_id: int,
        bank_account_id: int
    ) -> Dict:
        """Auto-reconcile bank transactions using intelligent matching"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get unreconciled bank transactions
            cursor.execute("""
                SELECT id, transaction_date, reference, description,
                       (debit_amount - credit_amount) as amount
                FROM bank_transactions
                WHERE bank_account_id = ? AND is_reconciled = 0
                ORDER BY transaction_date DESC
            """, (bank_account_id,))
            
            bank_trans = cursor.fetchall()
            
            # Get unreconciled payments (both AP and AR)
            cursor.execute("""
                SELECT 'PAYMENT' as type, p.id, p.payment_date, p.payment_number,
                       p.reference, p.amount
                FROM payments p
                WHERE p.company_id = ? AND p.bank_account_id = ?
                AND p.bank_transaction_id IS NULL
                AND p.status = 'POSTED'
                ORDER BY p.payment_date DESC
            """, (company_id, bank_account_id))
            
            erp_trans = cursor.fetchall()
            
            matched_count = 0
            
            for bt_id, bt_date, bt_ref, bt_desc, bt_amount in bank_trans:
                best_match = None
                best_score = 0
                
                for erp_type, erp_id, erp_date, erp_num, erp_ref, erp_amount in erp_trans:
                    # Calculate match score
                    score = self._calculate_match_score(
                        bt_date, bt_ref, bt_desc, bt_amount,
                        erp_date, erp_num, erp_ref, erp_amount
                    )
                    
                    if score > best_score and score >= 0.8:
                        best_score = score
                        best_match = (erp_type, erp_id)
                
                if best_match:
                    # Create reconciliation
                    cursor.execute("""
                        UPDATE bank_transactions SET
                            is_reconciled = 1,
                            reconciled_date = ?,
                            payment_id = ?
                        WHERE id = ?
                    """, (date.today(), best_match[1], bt_id))
                    
                    # Update payment
                    cursor.execute("""
                        UPDATE payments SET
                            status = 'CLEARED'
                        WHERE id = ?
                    """, (best_match[1],))
                    
                    matched_count += 1
            
            conn.commit()
            
            return {
                'success': True,
                'matched': matched_count,
                'total_bank_trans': len(bank_trans),
                'match_rate': f"{(matched_count / len(bank_trans) * 100) if bank_trans else 0:.1f}%"
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def _calculate_match_score(
        self,
        bt_date: date,
        bt_ref: str,
        bt_desc: str,
        bt_amount: float,
        erp_date: date,
        erp_num: str,
        erp_ref: Optional[str],
        erp_amount: float
    ) -> float:
        """Calculate match score between bank transaction and ERP transaction"""
        score = 0.0
        
        # Amount match (40% weight)
        if abs(bt_amount - erp_amount) < 0.01:
            score += 0.4
        elif abs(bt_amount - erp_amount) / max(abs(bt_amount), abs(erp_amount)) < 0.01:
            score += 0.3
        
        # Date match (30% weight) - within 3 days
        date_diff = abs((bt_date - erp_date).days)
        if date_diff == 0:
            score += 0.3
        elif date_diff <= 1:
            score += 0.25
        elif date_diff <= 3:
            score += 0.15
        
        # Reference match (30% weight)
        ref_score = 0.0
        if bt_ref and erp_ref:
            ref_score = max(ref_score, SequenceMatcher(None, bt_ref.upper(), erp_ref.upper()).ratio())
        if bt_ref and erp_num:
            ref_score = max(ref_score, SequenceMatcher(None, bt_ref.upper(), erp_num.upper()).ratio())
        if bt_desc and erp_num:
            ref_score = max(ref_score, SequenceMatcher(None, bt_desc.upper(), erp_num.upper()).ratio())
        
        score += ref_score * 0.3
        
        return score
    
    def get_reconciliation_report(
        self,
        company_id: int,
        bank_account_id: int,
        as_of_date: Optional[date] = None
    ) -> Dict:
        """Generate bank reconciliation report"""
        if not as_of_date:
            as_of_date = date.today()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get bank account details
            cursor.execute("""
                SELECT ba.bank_name, ba.account_number, ba.bank_name,
                       ba.current_balance, a.code, a.name
                FROM bank_accounts ba
                JOIN accounts a ON ba.account_id = a.id
                WHERE ba.id = ?
            """, (bank_account_id,))
            
            ba_row = cursor.fetchone()
            if not ba_row:
                return {'error': 'Bank account not found'}
            
            # Get GL balance
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as gl_balance
                FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE jel.account_id = (
                    SELECT account_id FROM bank_accounts WHERE id = ?
                )
                AND je.company_id = ?
                AND je.status = 'POSTED'
                AND je.entry_date <= ?
            """, (bank_account_id, company_id, as_of_date))
            
            gl_balance = Decimal(str(cursor.fetchone()[0]))
            
            # Get unreconciled deposits
            cursor.execute("""
                SELECT transaction_date, reference, description, debit_amount
                FROM bank_transactions
                WHERE bank_account_id = ?
                AND transaction_date <= ?
                AND is_reconciled = 0
                AND debit_amount > 0
                ORDER BY transaction_date
            """, (bank_account_id, as_of_date))
            
            unreconciled_deposits = []
            total_deposits = Decimal('0.00')
            for row in cursor.fetchall():
                unreconciled_deposits.append({
                    'date': str(row[0]),
                    'reference': row[1],
                    'description': row[2],
                    'amount': float(row[3])
                })
                total_deposits += Decimal(str(row[3]))
            
            # Get unreconciled withdrawals
            cursor.execute("""
                SELECT transaction_date, reference, description, credit_amount
                FROM bank_transactions
                WHERE bank_account_id = ?
                AND transaction_date <= ?
                AND is_reconciled = 0
                AND credit_amount > 0
                ORDER BY transaction_date
            """, (bank_account_id, as_of_date))
            
            unreconciled_withdrawals = []
            total_withdrawals = Decimal('0.00')
            for row in cursor.fetchall():
                unreconciled_withdrawals.append({
                    'date': str(row[0]),
                    'reference': row[1],
                    'description': row[2],
                    'amount': float(row[3])
                })
                total_withdrawals += Decimal(str(row[3]))
            
            # Get statement balance
            cursor.execute("""
                SELECT balance FROM bank_transactions
                WHERE bank_account_id = ?
                AND transaction_date <= ?
                ORDER BY transaction_date DESC, id DESC
                LIMIT 1
            """, (bank_account_id, as_of_date))
            
            stmt_balance_row = cursor.fetchone()
            statement_balance = Decimal(str(stmt_balance_row[0])) if stmt_balance_row else Decimal('0.00')
            
            # Calculate reconciled balance
            reconciled_balance = statement_balance - total_deposits - total_withdrawals
            difference = gl_balance - reconciled_balance
            
            return {
                'bank_account': {
                    'name': ba_row[0],
                    'number': ba_row[1],
                    'bank': ba_row[2],
                    'gl_code': ba_row[4],
                    'gl_name': ba_row[5]
                },
                'as_of_date': str(as_of_date),
                'statement_balance': float(statement_balance),
                'unreconciled_deposits': {
                    'items': unreconciled_deposits,
                    'total': float(total_deposits)
                },
                'unreconciled_withdrawals': {
                    'items': unreconciled_withdrawals,
                    'total': float(total_withdrawals)
                },
                'reconciled_balance': float(reconciled_balance),
                'gl_balance': float(gl_balance),
                'difference': float(difference),
                'is_reconciled': abs(difference) < 0.01
            }
            
        finally:
            conn.close()


def main():
    """CLI interface"""
    banking = BankingModule()
    
    print("\n" + "="*60)
    print("ARIA ERP - BANKING MODULE")
    print("="*60 + "\n")
    
    # Get bank account
    conn = sqlite3.connect('aria_erp_production.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, bank_name || ' ' || account_number as name FROM bank_accounts LIMIT 1")
    ba = cursor.fetchone()
    conn.close()
    
    if not ba:
        print("No bank accounts found in database.")
        return
    
    bank_account_id = ba[0]
    
    # Reconciliation Report
    print(f"BANK RECONCILIATION REPORT - {ba[1]}")
    print("-" * 60)
    report = banking.get_reconciliation_report(1, bank_account_id)
    
    if 'error' in report:
        print(f"Error: {report['error']}")
        return
    
    print(f"Account: {report['bank_account']['name']}")
    print(f"Bank: {report['bank_account']['bank']}")
    print(f"As of: {report['as_of_date']}\n")
    
    print(f"Statement Balance:          R{report['statement_balance']:>12,.2f}")
    print(f"\nAdd: Unreconciled Deposits  R{report['unreconciled_deposits']['total']:>12,.2f}")
    print(f"  ({len(report['unreconciled_deposits']['items'])} transactions)")
    
    print(f"\nLess: Unreconciled Withdrawals R{report['unreconciled_withdrawals']['total']:>12,.2f}")
    print(f"  ({len(report['unreconciled_withdrawals']['items'])} transactions)")
    
    print("-" * 60)
    print(f"Reconciled Balance:         R{report['reconciled_balance']:>12,.2f}")
    print(f"GL Balance:                 R{report['gl_balance']:>12,.2f}")
    print("-" * 60)
    print(f"Difference:                 R{report['difference']:>12,.2f}")
    print(f"\nStatus: {'RECONCILED ✓' if report['is_reconciled'] else 'NOT RECONCILED ✗'}")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
