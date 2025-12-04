"""
Synchronous wrapper for GL Posting Service
Allows sync endpoints (psycopg2) to call async GL posting service
"""
import asyncio
from decimal import Decimal
from datetime import date
from typing import List, Dict, Optional
import logging
import os

from services.gl_posting_service import GLPostingService

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")


class GLPostingServiceSync:
    """Synchronous wrapper for GL Posting Service"""
    
    def __init__(self):
        self.async_service = GLPostingService(DATABASE_URL)
    
    def post_delivery(
        self,
        company_id: str,
        delivery_id: str,
        delivery_number: str,
        delivery_date: date,
        lines: List[Dict],
        user_id: str = "system"
    ) -> Optional[str]:
        """Post delivery to GL (sync wrapper)"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                self.async_service.post_delivery(
                    company_id, delivery_id, delivery_number, delivery_date, lines, user_id
                )
            )
            loop.close()
            return result
        except Exception as e:
            logger.error(f"Failed to post delivery {delivery_number}: {e}")
            return None
    
    def post_invoice(
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
        """Post invoice to GL (sync wrapper)"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                self.async_service.post_invoice(
                    company_id, invoice_id, invoice_number, invoice_date,
                    customer_name, subtotal, vat_amount, total_amount, user_id
                )
            )
            loop.close()
            return result
        except Exception as e:
            logger.error(f"Failed to post invoice {invoice_number}: {e}")
            return None
    
    def post_supplier_bill(
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
        """Post supplier bill to GL (sync wrapper)"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                self.async_service.post_supplier_bill(
                    company_id, bill_id, bill_number, bill_date,
                    supplier_name, subtotal, vat_amount, total_amount, user_id
                )
            )
            loop.close()
            return result
        except Exception as e:
            logger.error(f"Failed to post supplier bill {bill_number}: {e}")
            return None
