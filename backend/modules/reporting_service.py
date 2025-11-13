"""
Comprehensive Reporting Service
Provides transaction-level reports, summary reports, KPI dashboards, and CSV export
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
import asyncpg
import os
import logging
import csv
import io

logger = logging.getLogger(__name__)


class ReportingService:
    """Service for comprehensive ERP reporting"""
    
    async def get_trial_balance(
        self,
        company_id: UUID,
        as_of_date: date,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> List[Dict]:
        """
        Get trial balance report
        Shows all accounts with their debit/credit balances
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            query = """
                SELECT 
                    coa.code as account_code,
                    coa.name as account_name,
                    coa.account_type,
                    coa.category,
                    COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) as total_debits,
                    COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) as total_credits,
                    COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON coa.code = jel.account_code
                LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE coa.company_id = $1 
                    AND coa.is_active = true
                    AND (je.posting_date IS NULL OR je.posting_date <= $2)
                    AND (je.status IS NULL OR je.status = 'POSTED')
                GROUP BY coa.code, coa.name, coa.account_type, coa.category
                ORDER BY coa.code
            """
            
            rows = await db_conn.fetch(query, str(company_id), as_of_date)
            
            return [dict(row) for row in rows]
        
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def get_ar_aging(
        self,
        company_id: UUID,
        as_of_date: date,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> List[Dict]:
        """
        Get AR aging report
        Shows outstanding receivables by age bucket
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            query = """
                SELECT 
                    c.id as customer_id,
                    c.name as customer_name,
                    so.id as sales_order_id,
                    so.so_number,
                    so.order_date,
                    so.total_amount,
                    so.status,
                    ($1 - so.order_date) as days_outstanding,
                    CASE 
                        WHEN ($1 - so.order_date) <= 30 THEN so.total_amount
                        ELSE 0
                    END as current_amount,
                    CASE 
                        WHEN ($1 - so.order_date) BETWEEN 31 AND 60 THEN so.total_amount
                        ELSE 0
                    END as days_31_60,
                    CASE 
                        WHEN ($1 - so.order_date) BETWEEN 61 AND 90 THEN so.total_amount
                        ELSE 0
                    END as days_61_90,
                    CASE 
                        WHEN ($1 - so.order_date) > 90 THEN so.total_amount
                        ELSE 0
                    END as days_over_90
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.id
                WHERE so.company_id = $2
                    AND so.status IN ('approved', 'shipped', 'partially_paid')
                    AND so.order_date <= $1
                ORDER BY c.name, so.order_date
            """
            
            rows = await db_conn.fetch(query, as_of_date, str(company_id))
            
            return [dict(row) for row in rows]
        
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def get_ap_aging(
        self,
        company_id: UUID,
        as_of_date: date,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> List[Dict]:
        """
        Get AP aging report
        Shows outstanding payables by age bucket
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            query = """
                SELECT 
                    s.id as supplier_id,
                    s.name as supplier_name,
                    po.id as purchase_order_id,
                    po.po_number,
                    po.order_date,
                    po.total_amount,
                    po.status,
                    ($1 - po.order_date) as days_outstanding,
                    CASE 
                        WHEN ($1 - po.order_date) <= 30 THEN po.total_amount
                        ELSE 0
                    END as current_amount,
                    CASE 
                        WHEN ($1 - po.order_date) BETWEEN 31 AND 60 THEN po.total_amount
                        ELSE 0
                    END as days_31_60,
                    CASE 
                        WHEN ($1 - po.order_date) BETWEEN 61 AND 90 THEN po.total_amount
                        ELSE 0
                    END as days_61_90,
                    CASE 
                        WHEN ($1 - po.order_date) > 90 THEN po.total_amount
                        ELSE 0
                    END as days_over_90
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.company_id = $2
                    AND po.status IN ('approved', 'partially_received')
                    AND po.order_date <= $1
                ORDER BY s.name, po.order_date
            """
            
            rows = await db_conn.fetch(query, as_of_date, str(company_id))
            
            return [dict(row) for row in rows]
        
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def get_inventory_valuation(
        self,
        company_id: UUID,
        as_of_date: date,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> List[Dict]:
        """
        Get inventory valuation report
        Shows current inventory quantities and values
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            query = """
                SELECT 
                    p.id as product_id,
                    p.sku,
                    p.name as product_name,
                    p.unit_cost,
                    w.id as warehouse_id,
                    w.name as warehouse_name,
                    COALESCE(soh.quantity_on_hand, 0) as quantity_on_hand,
                    COALESCE(soh.quantity_on_hand * p.unit_cost, 0) as total_value,
                    COALESCE((SELECT SUM(quantity) FROM inventory_reservations 
                             WHERE product_id = p.id AND warehouse_id = w.id 
                             AND status = 'active'), 0) as reserved_quantity,
                    COALESCE(soh.quantity_on_hand, 0) - COALESCE((SELECT SUM(quantity) 
                             FROM inventory_reservations 
                             WHERE product_id = p.id AND warehouse_id = w.id 
                             AND status = 'active'), 0) as available_quantity
                FROM products p
                CROSS JOIN warehouses w
                LEFT JOIN stock_on_hand soh ON p.id = soh.product_id AND w.id = soh.warehouse_id
                WHERE p.company_id = $1 AND w.company_id = $1
                    AND p.is_active = true
                ORDER BY p.sku, w.name
            """
            
            rows = await db_conn.fetch(query, str(company_id))
            
            return [dict(row) for row in rows]
        
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def get_transaction_detail(
        self,
        company_id: UUID,
        transaction_type: str,  # 'sales_order', 'purchase_order', 'journal_entry', etc.
        transaction_id: UUID,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> Dict:
        """
        Get detailed transaction information with drill-down to line items
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            if transaction_type == 'sales_order':
                header_query = """
                    SELECT so.*, c.name as customer_name
                    FROM sales_orders so
                    JOIN customers c ON so.customer_id = c.id
                    WHERE so.id = $1 AND so.company_id = $2
                """
                lines_query = """
                    SELECT sol.*, p.name as product_name, p.sku
                    FROM sales_order_lines sol
                    JOIN products p ON sol.product_id = p.id
                    WHERE sol.sales_order_id = $1
                    ORDER BY sol.line_number
                """
            elif transaction_type == 'purchase_order':
                header_query = """
                    SELECT po.*, s.name as supplier_name
                    FROM purchase_orders po
                    JOIN suppliers s ON po.supplier_id = s.id
                    WHERE po.id = $1 AND po.company_id = $2
                """
                lines_query = """
                    SELECT pol.*, p.name as product_name, p.sku
                    FROM purchase_order_lines pol
                    JOIN products p ON pol.product_id = p.id
                    WHERE pol.purchase_order_id = $1
                    ORDER BY pol.line_number
                """
            elif transaction_type == 'journal_entry':
                header_query = """
                    SELECT * FROM journal_entries
                    WHERE id = $1 AND company_id = $2
                """
                lines_query = """
                    SELECT jel.*, coa.name as account_name
                    FROM journal_entry_lines jel
                    JOIN chart_of_accounts coa ON jel.account_code = coa.code
                    WHERE jel.journal_entry_id = $1
                    ORDER BY jel.line_number
                """
            else:
                raise ValueError(f"Unsupported transaction type: {transaction_type}")
            
            header = await db_conn.fetchrow(header_query, str(transaction_id), str(company_id))
            lines = await db_conn.fetch(lines_query, str(transaction_id))
            
            if not header:
                return {"status": "not_found"}
            
            return {
                "status": "success",
                "transaction_type": transaction_type,
                "header": dict(header),
                "lines": [dict(line) for line in lines]
            }
        
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    async def get_kpi_dashboard(
        self,
        company_id: UUID,
        start_date: date,
        end_date: date,
        db_conn: Optional[asyncpg.Connection] = None
    ) -> Dict:
        """
        Get KPI dashboard with key metrics
        """
        should_close = False
        if not db_conn:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL not configured")
            db_conn = await asyncpg.connect(database_url)
            should_close = True
        
        try:
            revenue_query = """
                SELECT COALESCE(SUM(total_amount), 0) as total_revenue
                FROM sales_orders
                WHERE company_id = $1 AND order_date BETWEEN $2 AND $3
                    AND status IN ('approved', 'shipped', 'completed')
            """
            revenue = await db_conn.fetchval(revenue_query, str(company_id), start_date, end_date)
            
            cogs_query = """
                SELECT COALESCE(SUM(jel.debit_amount), 0) as total_cogs
                FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE je.company_id = $1 AND je.posting_date BETWEEN $2 AND $3
                    AND jel.account_code = '5000' AND je.status = 'POSTED'
            """
            cogs = await db_conn.fetchval(cogs_query, str(company_id), start_date, end_date)
            
            gross_profit = float(revenue or 0) - float(cogs or 0)
            gross_margin = (gross_profit / float(revenue or 1)) * 100 if revenue else 0
            
            orders_query = """
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
                FROM sales_orders
                WHERE company_id = $1 AND order_date BETWEEN $2 AND $3
            """
            orders = await db_conn.fetchrow(orders_query, str(company_id), start_date, end_date)
            
            inventory_query = """
                SELECT COALESCE(SUM(soh.quantity_on_hand * p.unit_cost), 0) as inventory_value
                FROM stock_on_hand soh
                JOIN products p ON soh.product_id = p.id
                WHERE p.company_id = $1
            """
            inventory_value = await db_conn.fetchval(inventory_query, str(company_id))
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "revenue": {
                    "total": float(revenue or 0),
                    "currency": "ZAR"
                },
                "cogs": {
                    "total": float(cogs or 0),
                    "currency": "ZAR"
                },
                "gross_profit": {
                    "amount": gross_profit,
                    "margin_percent": round(gross_margin, 2),
                    "currency": "ZAR"
                },
                "orders": {
                    "total": orders['total_orders'] if orders else 0,
                    "completed": orders['completed_orders'] if orders else 0
                },
                "inventory": {
                    "total_value": float(inventory_value or 0),
                    "currency": "ZAR"
                }
            }
        
        finally:
            if should_close and db_conn:
                await db_conn.close()
    
    def export_to_csv(self, data: List[Dict], filename: str = "export.csv") -> str:
        """
        Export data to CSV format
        Returns CSV string
        """
        if not data:
            return ""
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        return output.getvalue()


reporting_service = ReportingService()


async def get_trial_balance(company_id: UUID, as_of_date: date) -> List[Dict]:
    """Convenience function for trial balance"""
    return await reporting_service.get_trial_balance(company_id, as_of_date)


async def get_ar_aging(company_id: UUID, as_of_date: date) -> List[Dict]:
    """Convenience function for AR aging"""
    return await reporting_service.get_ar_aging(company_id, as_of_date)


async def get_ap_aging(company_id: UUID, as_of_date: date) -> List[Dict]:
    """Convenience function for AP aging"""
    return await reporting_service.get_ap_aging(company_id, as_of_date)


async def get_inventory_valuation(company_id: UUID, as_of_date: date) -> List[Dict]:
    """Convenience function for inventory valuation"""
    return await reporting_service.get_inventory_valuation(company_id, as_of_date)


async def get_kpi_dashboard(company_id: UUID, start_date: date, end_date: date) -> Dict:
    """Convenience function for KPI dashboard"""
    return await reporting_service.get_kpi_dashboard(company_id, start_date, end_date)
