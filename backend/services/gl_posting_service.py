"""
GL Posting Service
Handles automatic GL posting for ERP transactions
"""
from decimal import Decimal
from datetime import datetime, date
from typing import List, Dict, Optional
import logging
import asyncpg

logger = logging.getLogger(__name__)


class GLPostingService:
    """Service for posting transactions to General Ledger"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
    
    async def get_connection(self):
        """Get database connection"""
        return await asyncpg.connect(self.database_url)
    
    async def post_delivery(
        self,
        company_id: str,
        delivery_id: str,
        delivery_number: str,
        delivery_date: date,
        lines: List[Dict],
        user_id: str = "system"
    ) -> Optional[str]:
        """
        Post delivery to GL (COGS and Inventory)
        
        Journal Entry:
        Dr COGS (5000)
        Cr Inventory (1200)
        """
        conn = await self.get_connection()
        
        try:
            total_cost = Decimal("0.00")
            for line in lines:
                quantity = Decimal(str(line.get("quantity", 0)))
                cost_price = Decimal(str(line.get("cost_price", 0)))
                total_cost += quantity * cost_price
            
            if total_cost == 0:
                logger.warning(f"Delivery {delivery_number} has zero cost, skipping GL posting")
                return None
            
            # Create journal entry
            journal_entry_id = await conn.fetchval(
                """
                INSERT INTO journal_entries (
                    company_id, reference, entry_date, posting_date, description,
                    source, source_document_id, status, total_debit, total_credit, created_at, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
                """,
                company_id,
                f"DEL-{delivery_number}",
                delivery_date,
                delivery_date,
                f"Cost of Goods Sold - Delivery {delivery_number}",
                "DELIVERY",
                delivery_id,
                "POSTED",
                float(total_cost),
                float(total_cost),
                datetime.now(),
                user_id
            )
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                1,
                "5000",  # COGS account
                float(total_cost),
                0.0,
                f"Cost of Goods Sold - Delivery {delivery_number}",
                datetime.now()
            )
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                2,
                "1200",  # Inventory account
                0.0,
                float(total_cost),
                f"Inventory reduction - Delivery {delivery_number}",
                datetime.now()
            )
            
            logger.info(f"✅ GL posting created for delivery {delivery_number}: JE-{journal_entry_id}")
            return str(journal_entry_id)
            
        except Exception as e:
            logger.error(f"❌ Failed to post delivery {delivery_number} to GL: {e}")
            raise
        finally:
            await conn.close()
    
    async def post_invoice(
        self,
        company_id: str,
        invoice_id: str,
        invoice_number: str,
        invoice_date: date,
        customer_name: str,
        subtotal: Decimal,
        vat_amount: Decimal,
        total_amount: Decimal,
        user_id: str = "system"
    ) -> Optional[str]:
        """
        Post invoice to GL (AR, Revenue, VAT Output)
        
        Journal Entry:
        Dr Accounts Receivable (1100)
        Cr Sales Revenue (4000)
        Cr VAT Output (2100)
        """
        conn = await self.get_connection()
        
        try:
            # Create journal entry
            journal_entry_id = await conn.fetchval(
                """
                INSERT INTO journal_entries (
                    company_id, reference, entry_date, posting_date, description,
                    source, source_document_id, status, total_debit, total_credit, created_at, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
                """,
                company_id,
                f"INV-{invoice_number}",
                invoice_date,
                invoice_date,
                f"Sales Invoice {invoice_number} - {customer_name}",
                "INVOICE",
                invoice_id,
                "POSTED",
                float(total_amount),
                float(total_amount),
                datetime.now(),
                user_id
            )
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                1,
                "1100",  # AR account
                float(total_amount),
                0.0,
                f"Invoice {invoice_number} - {customer_name}",
                datetime.now()
            )
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                2,
                "4000",  # Sales Revenue account
                0.0,
                float(subtotal),
                f"Sales Revenue - Invoice {invoice_number}",
                datetime.now()
            )
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                3,
                "2100",  # VAT Output account
                0.0,
                float(vat_amount),
                f"VAT Output - Invoice {invoice_number}",
                datetime.now()
            )
            
            logger.info(f"✅ GL posting created for invoice {invoice_number}: JE-{journal_entry_id}")
            return str(journal_entry_id)
            
        except Exception as e:
            logger.error(f"❌ Failed to post invoice {invoice_number} to GL: {e}")
            raise
        finally:
            await conn.close()
    
    async def post_supplier_bill(
        self,
        company_id: str,
        bill_id: str,
        bill_number: str,
        bill_date: date,
        supplier_name: str,
        subtotal: Decimal,
        vat_amount: Decimal,
        total_amount: Decimal,
        user_id: str = "system"
    ) -> Optional[str]:
        """
        Post supplier bill to GL (GRNI, VAT Input, AP)
        
        Journal Entry:
        Dr GRNI (2200)
        Dr VAT Input (1300)
        Cr Accounts Payable (2000)
        """
        conn = await self.get_connection()
        
        try:
            # Create journal entry
            journal_entry_id = await conn.fetchval(
                """
                INSERT INTO journal_entries (
                    company_id, reference, entry_date, posting_date, description,
                    source, source_document_id, status, total_debit, total_credit, created_at, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
                """,
                company_id,
                f"BILL-{bill_number}",
                bill_date,
                bill_date,
                f"Supplier Bill {bill_number} - {supplier_name}",
                "BILL",
                bill_id,
                "POSTED",
                float(total_amount),
                float(total_amount),
                datetime.now(),
                user_id
            )
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                1,
                "2200",  # GRNI account
                float(subtotal),
                0.0,
                f"Goods Received - Bill {bill_number}",
                datetime.now()
            )
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                2,
                "1300",  # VAT Input account
                float(vat_amount),
                0.0,
                f"VAT Input - Bill {bill_number}",
                datetime.now()
            )
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                3,
                "2000",  # AP account
                0.0,
                float(total_amount),
                f"Accounts Payable - Bill {bill_number} - {supplier_name}",
                datetime.now()
            )
            
            logger.info(f"✅ GL posting created for bill {bill_number}: JE-{journal_entry_id}")
            return str(journal_entry_id)
            
        except Exception as e:
            logger.error(f"❌ Failed to post bill {bill_number} to GL: {e}")
            raise
        finally:
            await conn.close()
    
    async def post_payroll_run(
        self,
        company_id: str,
        payroll_run_id: str,
        run_number: str,
        payment_date: date,
        total_gross: Decimal,
        total_paye: Decimal,
        total_uif: Decimal,
        total_sdl: Decimal,
        total_net: Decimal,
        user_id: str = "system"
    ) -> Optional[str]:
        """
        Post payroll run to GL (Wage Expense, Employer Costs, Liabilities)
        
        Journal Entry:
        Dr Wage Expense (5100)
        Dr Employer UIF (5110)
        Dr Employer SDL (5111)
        Cr Net Pay Liability (2300)
        Cr PAYE Liability (2310)
        Cr UIF Liability (2311)
        Cr SDL Liability (2312)
        """
        conn = await self.get_connection()
        
        try:
            employer_uif = total_uif  # Already includes both employee and employer
            employer_sdl = total_sdl
            
            total_employer_costs = employer_uif + employer_sdl
            total_debit = total_gross + total_employer_costs
            total_credit = total_net + total_paye + employer_uif + employer_sdl
            
            # Create journal entry
            journal_entry_id = await conn.fetchval(
                """
                INSERT INTO journal_entries (
                    company_id, reference, entry_date, posting_date, description,
                    source, source_document_id, status, total_debit, total_credit, created_at, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
                """,
                company_id,
                f"PAY-{run_number}",
                payment_date,
                payment_date,
                f"Payroll Run {run_number}",
                "PAYROLL",
                payroll_run_id,
                "POSTED",
                float(total_debit),
                float(total_credit),
                datetime.now(),
                user_id
            )
            
            line_number = 1
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                line_number,
                "5100",  # Wage Expense
                float(total_gross),
                0.0,
                f"Wage Expense - Payroll {run_number}",
                datetime.now()
            )
            line_number += 1
            
            if employer_uif > 0:
                await conn.execute(
                    """
                    INSERT INTO journal_entry_lines (
                        journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    journal_entry_id,
                    line_number,
                    "5110",  # Employer UIF
                    float(employer_uif),
                    0.0,
                    f"Employer UIF - Payroll {run_number}",
                    datetime.now()
                )
                line_number += 1
            
            if employer_sdl > 0:
                await conn.execute(
                    """
                    INSERT INTO journal_entry_lines (
                        journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    journal_entry_id,
                    line_number,
                    "5111",  # Employer SDL
                    float(employer_sdl),
                    0.0,
                    f"Employer SDL - Payroll {run_number}",
                    datetime.now()
                )
                line_number += 1
            
            await conn.execute(
                """
                INSERT INTO journal_entry_lines (
                    journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                journal_entry_id,
                line_number,
                "2300",  # Net Pay Liability
                0.0,
                float(total_net),
                f"Net Pay Liability - Payroll {run_number}",
                datetime.now()
            )
            line_number += 1
            
            if total_paye > 0:
                await conn.execute(
                    """
                    INSERT INTO journal_entry_lines (
                        journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    journal_entry_id,
                    line_number,
                    "2310",  # PAYE Liability
                    0.0,
                    float(total_paye),
                    f"PAYE Liability - Payroll {run_number}",
                    datetime.now()
                )
                line_number += 1
            
            if employer_uif > 0:
                await conn.execute(
                    """
                    INSERT INTO journal_entry_lines (
                        journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    journal_entry_id,
                    line_number,
                    "2311",  # UIF Liability
                    0.0,
                    float(employer_uif),
                    f"UIF Liability - Payroll {run_number}",
                    datetime.now()
                )
                line_number += 1
            
            if employer_sdl > 0:
                await conn.execute(
                    """
                    INSERT INTO journal_entry_lines (
                        journal_entry_id, line_number, account_code, debit_amount, credit_amount, description, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    journal_entry_id,
                    line_number,
                    "2312",  # SDL Liability
                    0.0,
                    float(employer_sdl),
                    f"SDL Liability - Payroll {run_number}",
                    datetime.now()
                )
            
            logger.info(f"✅ GL posting created for payroll run {run_number}: JE-{journal_entry_id}")
            return str(journal_entry_id)
            
        except Exception as e:
            logger.error(f"❌ Failed to post payroll run {run_number} to GL: {e}")
            raise
        finally:
            await conn.close()
