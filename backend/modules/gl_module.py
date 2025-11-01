"""
ARIA ERP - General Ledger Module
Production-grade double-entry accounting
"""

import sqlite3
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Tuple, Optional

class GeneralLedgerModule:
    """General Ledger with double-entry accounting"""
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def get_account_balance(
        self, 
        company_id: int, 
        account_id: int,
        as_of_date: Optional[date] = None
    ) -> Dict:
        """Calculate account balance as of a specific date"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get account details
            cursor.execute("""
                SELECT code, name, account_type, account_subtype
                FROM accounts WHERE id = ? AND company_id = ?
            """, (account_id, company_id))
            
            account = cursor.fetchone()
            if not account:
                return {'error': 'Account not found'}
            
            code, name, acc_type, acc_subtype = account
            
            # Calculate balance from journal entry lines
            date_filter = ""
            params = [account_id, company_id]
            
            if as_of_date:
                date_filter = "AND je.entry_date <= ?"
                params.append(as_of_date)
            
            cursor.execute(f"""
                SELECT 
                    COALESCE(SUM(jel.debit_amount), 0) as total_debits,
                    COALESCE(SUM(jel.credit_amount), 0) as total_credits
                FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE jel.account_id = ?
                AND je.company_id = ?
                AND je.status = 'POSTED'
                {date_filter}
            """, params)
            
            result = cursor.fetchone()
            total_debits = Decimal(str(result[0]))
            total_credits = Decimal(str(result[1]))
            
            # Calculate balance based on account type
            # Assets & Expenses: Debit balance (DR - CR)
            # Liabilities, Equity, Revenue: Credit balance (CR - DR)
            if acc_type in ['ASSET', 'EXPENSE']:
                balance = total_debits - total_credits
                balance_type = 'DEBIT' if balance >= 0 else 'CREDIT'
            else:  # LIABILITY, EQUITY, REVENUE
                balance = total_credits - total_debits
                balance_type = 'CREDIT' if balance >= 0 else 'DEBIT'
            
            return {
                'account_id': account_id,
                'account_code': code,
                'account_name': name,
                'account_type': acc_type,
                'account_subtype': acc_subtype,
                'total_debits': float(total_debits),
                'total_credits': float(total_credits),
                'balance': float(abs(balance)),
                'balance_type': balance_type,
                'as_of_date': str(as_of_date) if as_of_date else 'current'
            }
            
        finally:
            conn.close()
    
    def get_trial_balance(
        self,
        company_id: int,
        as_of_date: Optional[date] = None
    ) -> Dict:
        """Generate trial balance for all accounts"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get all accounts
            cursor.execute("""
                SELECT id, code, name, account_type, account_subtype
                FROM accounts
                WHERE company_id = ? AND is_active = 1
                ORDER BY code
            """, (company_id,))
            
            accounts = cursor.fetchall()
            
            trial_balance = []
            total_debits = Decimal('0.00')
            total_credits = Decimal('0.00')
            
            for account in accounts:
                acc_id, code, name, acc_type, acc_subtype = account
                
                balance_info = self.get_account_balance(
                    company_id, acc_id, as_of_date
                )
                
                if balance_info.get('error'):
                    continue
                
                balance = Decimal(str(balance_info['balance']))
                
                if balance != 0:  # Only include accounts with balance
                    debit_balance = float(balance) if balance_info['balance_type'] == 'DEBIT' else 0.00
                    credit_balance = float(balance) if balance_info['balance_type'] == 'CREDIT' else 0.00
                    
                    trial_balance.append({
                        'code': code,
                        'name': name,
                        'type': acc_type,
                        'debit': debit_balance,
                        'credit': credit_balance
                    })
                    
                    total_debits += Decimal(str(debit_balance))
                    total_credits += Decimal(str(credit_balance))
            
            return {
                'company_id': company_id,
                'as_of_date': str(as_of_date) if as_of_date else 'current',
                'accounts': trial_balance,
                'total_debits': float(total_debits),
                'total_credits': float(total_credits),
                'balanced': abs(total_debits - total_credits) < 0.01,
                'difference': float(abs(total_debits - total_credits))
            }
            
        finally:
            conn.close()
    
    def get_profit_and_loss(
        self,
        company_id: int,
        start_date: date,
        end_date: date
    ) -> Dict:
        """Generate Profit & Loss statement"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get revenue accounts
            cursor.execute("""
                SELECT a.id, a.code, a.name,
                       COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
                FROM accounts a
                LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE a.company_id = ? AND a.account_type = 'REVENUE'
                AND je.status = 'POSTED'
                AND je.entry_date BETWEEN ? AND ?
                GROUP BY a.id, a.code, a.name
                HAVING amount != 0
                ORDER BY a.code
            """, (company_id, start_date, end_date))
            
            revenue_accounts = [
                {'code': row[1], 'name': row[2], 'amount': float(row[3])}
                for row in cursor.fetchall()
            ]
            total_revenue = sum(acc['amount'] for acc in revenue_accounts)
            
            # Get expense accounts
            cursor.execute("""
                SELECT a.id, a.code, a.name,
                       COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
                FROM accounts a
                LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE a.company_id = ? AND a.account_type = 'EXPENSE'
                AND je.status = 'POSTED'
                AND je.entry_date BETWEEN ? AND ?
                GROUP BY a.id, a.code, a.name
                HAVING amount != 0
                ORDER BY a.code
            """, (company_id, start_date, end_date))
            
            expense_accounts = [
                {'code': row[1], 'name': row[2], 'amount': float(row[3])}
                for row in cursor.fetchall()
            ]
            total_expenses = sum(acc['amount'] for acc in expense_accounts)
            
            net_profit = total_revenue - total_expenses
            
            return {
                'company_id': company_id,
                'period_start': str(start_date),
                'period_end': str(end_date),
                'revenue': {
                    'accounts': revenue_accounts,
                    'total': total_revenue
                },
                'expenses': {
                    'accounts': expense_accounts,
                    'total': total_expenses
                },
                'net_profit': net_profit,
                'net_profit_margin': (net_profit / total_revenue * 100) if total_revenue > 0 else 0
            }
            
        finally:
            conn.close()
    
    def get_balance_sheet(
        self,
        company_id: int,
        as_of_date: Optional[date] = None
    ) -> Dict:
        """Generate Balance Sheet"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Assets
            cursor.execute("""
                SELECT a.code, a.name, a.account_subtype,
                       COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as amount
                FROM accounts a
                LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE a.company_id = ? AND a.account_type = 'ASSET'
                AND (je.status = 'POSTED' OR je.status IS NULL)
                {}
                GROUP BY a.code, a.name, a.account_subtype
                HAVING amount != 0
                ORDER BY a.code
            """.format("AND je.entry_date <= ?" if as_of_date else ""),
                       (company_id, as_of_date) if as_of_date else (company_id,))
            
            asset_accounts = [
                {'code': row[0], 'name': row[1], 'subtype': row[2], 'amount': float(row[3])}
                for row in cursor.fetchall()
            ]
            total_assets = sum(acc['amount'] for acc in asset_accounts)
            
            # Liabilities
            cursor.execute("""
                SELECT a.code, a.name, a.account_subtype,
                       COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
                FROM accounts a
                LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE a.company_id = ? AND a.account_type = 'LIABILITY'
                AND (je.status = 'POSTED' OR je.status IS NULL)
                {}
                GROUP BY a.code, a.name, a.account_subtype
                HAVING amount != 0
                ORDER BY a.code
            """.format("AND je.entry_date <= ?" if as_of_date else ""),
                       (company_id, as_of_date) if as_of_date else (company_id,))
            
            liability_accounts = [
                {'code': row[0], 'name': row[1], 'subtype': row[2], 'amount': float(row[3])}
                for row in cursor.fetchall()
            ]
            total_liabilities = sum(acc['amount'] for acc in liability_accounts)
            
            # Equity
            cursor.execute("""
                SELECT a.code, a.name, a.account_subtype,
                       COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as amount
                FROM accounts a
                LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE a.company_id = ? AND a.account_type = 'EQUITY'
                AND (je.status = 'POSTED' OR je.status IS NULL)
                {}
                GROUP BY a.code, a.name, a.account_subtype
                HAVING amount != 0
                ORDER BY a.code
            """.format("AND je.entry_date <= ?" if as_of_date else ""),
                       (company_id, as_of_date) if as_of_date else (company_id,))
            
            equity_accounts = [
                {'code': row[0], 'name': row[1], 'subtype': row[2], 'amount': float(row[3])}
                for row in cursor.fetchall()
            ]
            total_equity = sum(acc['amount'] for acc in equity_accounts)
            
            total_liabilities_equity = total_liabilities + total_equity
            
            return {
                'company_id': company_id,
                'as_of_date': str(as_of_date) if as_of_date else 'current',
                'assets': {
                    'accounts': asset_accounts,
                    'total': total_assets
                },
                'liabilities': {
                    'accounts': liability_accounts,
                    'total': total_liabilities
                },
                'equity': {
                    'accounts': equity_accounts,
                    'total': total_equity
                },
                'total_liabilities_equity': total_liabilities_equity,
                'balanced': abs(total_assets - total_liabilities_equity) < 0.01,
                'difference': total_assets - total_liabilities_equity
            }
            
        finally:
            conn.close()


def main():
    """CLI interface for testing"""
    import sys
    
    company_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    
    gl = GeneralLedgerModule()
    
    print("\n" + "="*60)
    print("ARIA ERP - GENERAL LEDGER MODULE")
    print("="*60 + "\n")
    
    # Trial Balance
    print("TRIAL BALANCE")
    print("-" * 60)
    tb = gl.get_trial_balance(company_id)
    
    for acc in tb['accounts']:
        print(f"{acc['code']:<8} {acc['name']:<30} {acc['debit']:>12,.2f} {acc['credit']:>12,.2f}")
    
    print("-" * 60)
    print(f"{'TOTALS':<40} {tb['total_debits']:>12,.2f} {tb['total_credits']:>12,.2f}")
    print(f"Balanced: {'YES' if tb['balanced'] else 'NO'}")
    
    # Balance Sheet
    print("\n\nBALANCE SHEET")
    print("-" * 60)
    bs = gl.get_balance_sheet(company_id)
    
    print("ASSETS")
    for acc in bs['assets']['accounts']:
        print(f"  {acc['code']:<8} {acc['name']:<30} {acc['amount']:>12,.2f}")
    print(f"{'Total Assets':>42} {bs['assets']['total']:>12,.2f}")
    
    print("\nLIABILITIES")
    for acc in bs['liabilities']['accounts']:
        print(f"  {acc['code']:<8} {acc['name']:<30} {acc['amount']:>12,.2f}")
    print(f"{'Total Liabilities':>42} {bs['liabilities']['total']:>12,.2f}")
    
    print("\nEQUITY")
    for acc in bs['equity']['accounts']:
        print(f"  {acc['code']:<8} {acc['name']:<30} {acc['amount']:>12,.2f}")
    print(f"{'Total Equity':>42} {bs['equity']['total']:>12,.2f}")
    
    print("-" * 60)
    print(f"{'Total Liabilities + Equity':>42} {bs['total_liabilities_equity']:>12,.2f}")
    print(f"Balanced: {'YES' if bs['balanced'] else 'NO'}")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
