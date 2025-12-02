"""
Financial Reports Service
Generates comprehensive financial reports for ERP system
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
from database import get_db_connection


class FinancialReportsService:
    """Generate financial reports"""
    
    def get_balance_sheet(self, company_id: str, as_of_date: str) -> Dict[str, Any]:
        """Generate Balance Sheet report"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    coa.account_code,
                    coa.account_name,
                    coa.account_type,
                    coa.account_category,
                    COALESCE(SUM(jel.debit - jel.credit), 0) as balance
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE coa.company_id = %s
                    AND coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
                    AND (je.posting_date IS NULL OR je.posting_date <= %s)
                    AND (je.status IS NULL OR je.status = 'POSTED')
                GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.account_category
                ORDER BY coa.account_code
            """, [company_id, as_of_date])
            
            accounts = [dict(row) for row in cursor.fetchall()]
            
            assets = [acc for acc in accounts if acc['account_type'] == 'ASSET']
            liabilities = [acc for acc in accounts if acc['account_type'] == 'LIABILITY']
            equity = [acc for acc in accounts if acc['account_type'] == 'EQUITY']
            
            total_assets = sum(float(acc['balance']) for acc in assets)
            total_liabilities = sum(float(acc['balance']) for acc in liabilities)
            total_equity = sum(float(acc['balance']) for acc in equity)
            
            return {
                'report_date': as_of_date,
                'assets': {
                    'accounts': assets,
                    'total': total_assets
                },
                'liabilities': {
                    'accounts': liabilities,
                    'total': total_liabilities
                },
                'equity': {
                    'accounts': equity,
                    'total': total_equity
                },
                'total_liabilities_and_equity': total_liabilities + total_equity,
                'balanced': abs(total_assets - (total_liabilities + total_equity)) < 0.01
            }
        finally:
            cursor.close()
            conn.close()
    
    def get_income_statement(self, company_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generate Income Statement (P&L) report"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    coa.account_code,
                    coa.account_name,
                    coa.account_type,
                    coa.account_category,
                    COALESCE(SUM(jel.credit - jel.debit), 0) as amount
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE coa.company_id = %s
                    AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COST_OF_SALES')
                    AND je.posting_date BETWEEN %s AND %s
                    AND je.status = 'POSTED'
                GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.account_category
                ORDER BY coa.account_code
            """, [company_id, start_date, end_date])
            
            accounts = [dict(row) for row in cursor.fetchall()]
            
            revenue = [acc for acc in accounts if acc['account_type'] == 'REVENUE']
            cost_of_sales = [acc for acc in accounts if acc['account_type'] == 'COST_OF_SALES']
            expenses = [acc for acc in accounts if acc['account_type'] == 'EXPENSE']
            
            total_revenue = sum(float(acc['amount']) for acc in revenue)
            total_cogs = sum(float(acc['amount']) for acc in cost_of_sales)
            total_expenses = sum(float(acc['amount']) for acc in expenses)
            
            gross_profit = total_revenue - total_cogs
            net_profit = gross_profit - total_expenses
            
            return {
                'start_date': start_date,
                'end_date': end_date,
                'revenue': {
                    'accounts': revenue,
                    'total': total_revenue
                },
                'cost_of_sales': {
                    'accounts': cost_of_sales,
                    'total': total_cogs
                },
                'gross_profit': gross_profit,
                'expenses': {
                    'accounts': expenses,
                    'total': total_expenses
                },
                'net_profit': net_profit,
                'gross_profit_margin': (gross_profit / total_revenue * 100) if total_revenue > 0 else 0,
                'net_profit_margin': (net_profit / total_revenue * 100) if total_revenue > 0 else 0
            }
        finally:
            cursor.close()
            conn.close()
    
    def get_cash_flow_statement(self, company_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generate Cash Flow Statement"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    coa.account_category,
                    COALESCE(SUM(jel.debit - jel.credit), 0) as net_change
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE coa.company_id = %s
                    AND coa.account_type = 'ASSET'
                    AND coa.account_category IN ('CASH', 'BANK')
                    AND je.posting_date BETWEEN %s AND %s
                    AND je.status = 'POSTED'
                GROUP BY coa.account_category
            """, [company_id, start_date, end_date])
            
            cash_accounts = [dict(row) for row in cursor.fetchall()]
            
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(jel.credit - jel.debit), 0) as operating_cash_flow
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE coa.company_id = %s
                    AND coa.account_type IN ('REVENUE', 'EXPENSE')
                    AND je.posting_date BETWEEN %s AND %s
                    AND je.status = 'POSTED'
            """, [company_id, start_date, end_date])
            
            operating_result = cursor.fetchone()
            operating_cash_flow = float(operating_result['operating_cash_flow']) if operating_result else 0
            
            total_cash_change = sum(float(acc['net_change']) for acc in cash_accounts)
            
            return {
                'start_date': start_date,
                'end_date': end_date,
                'operating_activities': {
                    'net_cash_from_operations': operating_cash_flow
                },
                'investing_activities': {
                    'net_cash_from_investing': 0
                },
                'financing_activities': {
                    'net_cash_from_financing': 0
                },
                'net_change_in_cash': total_cash_change,
                'cash_accounts': cash_accounts
            }
        finally:
            cursor.close()
            conn.close()
    
    def get_trial_balance(self, company_id: str, as_of_date: str) -> Dict[str, Any]:
        """Generate Trial Balance report"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    coa.account_code,
                    coa.account_name,
                    coa.account_type,
                    COALESCE(SUM(jel.debit), 0) as total_debit,
                    COALESCE(SUM(jel.credit), 0) as total_credit,
                    COALESCE(SUM(jel.debit - jel.credit), 0) as balance
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE coa.company_id = %s
                    AND (je.posting_date IS NULL OR je.posting_date <= %s)
                    AND (je.status IS NULL OR je.status = 'POSTED')
                GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
                HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
                ORDER BY coa.account_code
            """, [company_id, as_of_date])
            
            accounts = [dict(row) for row in cursor.fetchall()]
            
            total_debits = sum(float(acc['total_debit']) for acc in accounts)
            total_credits = sum(float(acc['total_credit']) for acc in accounts)
            
            return {
                'report_date': as_of_date,
                'accounts': accounts,
                'total_debits': total_debits,
                'total_credits': total_credits,
                'difference': total_debits - total_credits,
                'balanced': abs(total_debits - total_credits) < 0.01
            }
        finally:
            cursor.close()
            conn.close()
    
    def get_aged_debtors(self, company_id: str, as_of_date: str) -> Dict[str, Any]:
        """Generate Aged Debtors (AR Aging) report"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    c.name as customer_name,
                    ci.invoice_number,
                    ci.invoice_date,
                    ci.due_date,
                    ci.total_amount,
                    ci.amount_paid,
                    (ci.total_amount - ci.amount_paid) as balance,
                    (%s::date - ci.due_date) as days_overdue
                FROM customer_invoices ci
                JOIN customers c ON ci.customer_id = c.id
                WHERE ci.company_id = %s
                    AND ci.status IN ('SENT', 'OVERDUE', 'PARTIAL')
                    AND (ci.total_amount - ci.amount_paid) > 0
                    AND ci.invoice_date <= %s
                ORDER BY c.name, ci.due_date
            """, [as_of_date, company_id, as_of_date])
            
            invoices = [dict(row) for row in cursor.fetchall()]
            
            aging_buckets = {
                'current': [],
                '1_30_days': [],
                '31_60_days': [],
                '61_90_days': [],
                'over_90_days': []
            }
            
            for inv in invoices:
                days_overdue = inv['days_overdue']
                if days_overdue <= 0:
                    aging_buckets['current'].append(inv)
                elif days_overdue <= 30:
                    aging_buckets['1_30_days'].append(inv)
                elif days_overdue <= 60:
                    aging_buckets['31_60_days'].append(inv)
                elif days_overdue <= 90:
                    aging_buckets['61_90_days'].append(inv)
                else:
                    aging_buckets['over_90_days'].append(inv)
            
            totals = {
                'current': sum(float(inv['balance']) for inv in aging_buckets['current']),
                '1_30_days': sum(float(inv['balance']) for inv in aging_buckets['1_30_days']),
                '31_60_days': sum(float(inv['balance']) for inv in aging_buckets['31_60_days']),
                '61_90_days': sum(float(inv['balance']) for inv in aging_buckets['61_90_days']),
                'over_90_days': sum(float(inv['balance']) for inv in aging_buckets['over_90_days'])
            }
            
            total_outstanding = sum(totals.values())
            
            return {
                'report_date': as_of_date,
                'aging_buckets': aging_buckets,
                'totals': totals,
                'total_outstanding': total_outstanding
            }
        finally:
            cursor.close()
            conn.close()
    
    def get_aged_creditors(self, company_id: str, as_of_date: str) -> Dict[str, Any]:
        """Generate Aged Creditors (AP Aging) report"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT 
                    s.name as supplier_name,
                    si.invoice_number,
                    si.invoice_date,
                    si.due_date,
                    si.total_amount,
                    si.amount_paid,
                    (si.total_amount - si.amount_paid) as balance,
                    (%s::date - si.due_date) as days_overdue
                FROM supplier_invoices si
                JOIN suppliers s ON si.supplier_id = s.id
                WHERE si.company_id = %s
                    AND si.status IN ('RECEIVED', 'APPROVED', 'PARTIAL')
                    AND (si.total_amount - si.amount_paid) > 0
                    AND si.invoice_date <= %s
                ORDER BY s.name, si.due_date
            """, [as_of_date, company_id, as_of_date])
            
            invoices = [dict(row) for row in cursor.fetchall()]
            
            aging_buckets = {
                'current': [],
                '1_30_days': [],
                '31_60_days': [],
                '61_90_days': [],
                'over_90_days': []
            }
            
            for inv in invoices:
                days_overdue = inv['days_overdue']
                if days_overdue <= 0:
                    aging_buckets['current'].append(inv)
                elif days_overdue <= 30:
                    aging_buckets['1_30_days'].append(inv)
                elif days_overdue <= 60:
                    aging_buckets['31_60_days'].append(inv)
                elif days_overdue <= 90:
                    aging_buckets['61_90_days'].append(inv)
                else:
                    aging_buckets['over_90_days'].append(inv)
            
            totals = {
                'current': sum(float(inv['balance']) for inv in aging_buckets['current']),
                '1_30_days': sum(float(inv['balance']) for inv in aging_buckets['1_30_days']),
                '31_60_days': sum(float(inv['balance']) for inv in aging_buckets['31_60_days']),
                '61_90_days': sum(float(inv['balance']) for inv in aging_buckets['61_90_days']),
                'over_90_days': sum(float(inv['balance']) for inv in aging_buckets['over_90_days'])
            }
            
            total_outstanding = sum(totals.values())
            
            return {
                'report_date': as_of_date,
                'aging_buckets': aging_buckets,
                'totals': totals,
                'total_outstanding': total_outstanding
            }
        finally:
            cursor.close()
            conn.close()


financial_reports_service = FinancialReportsService()
