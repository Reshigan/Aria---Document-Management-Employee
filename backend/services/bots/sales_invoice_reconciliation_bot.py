"""
Sales-to-Invoice Reconciliation Bot
Automates the reconciliation of sales orders with invoices,
identifies exceptions, and posts variances to the general ledger.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from decimal import Decimal
import uuid

from .base_bot import BaseBot, BotPriority

logger = logging.getLogger(__name__)


class SalesInvoiceReconciliationBot(BaseBot):
    """
    Bot for automating sales-to-invoice reconciliation.
    
    Capabilities:
    - Match sales orders with corresponding invoices
    - Identify quantity variances
    - Identify price variances
    - Detect missing invoices
    - Approve and post variances to GL
    - Generate reconciliation reports
    """
    
    def __init__(self, db_connection_string: Optional[str] = None, **config):
        super().__init__(
            bot_id="sales_invoice_reconciliation",
            bot_name="Sales-to-Invoice Reconciliation Bot",
            version="1.0.0",
            enabled=True,
            priority=BotPriority.HIGH,
            **config
        )
        self.db_connection_string = db_connection_string
        self.tolerance_percentage = config.get("tolerance_percentage", 0.01)  # 1% tolerance
        self.auto_approve_threshold = config.get("auto_approve_threshold", 100.0)  # Auto-approve variances under $100
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute reconciliation process
        
        Args:
            company_id: Company ID to reconcile
            date_from: Start date for reconciliation period
            date_to: End date for reconciliation period
            auto_approve: Whether to auto-approve small variances
            
        Returns:
            Reconciliation results with exceptions
        """
        company_id = kwargs.get("company_id")
        date_from = kwargs.get("date_from", (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"))
        date_to = kwargs.get("date_to", datetime.now().strftime("%Y-%m-%d"))
        auto_approve = kwargs.get("auto_approve", False)
        
        logger.info(f"Starting sales-to-invoice reconciliation for company {company_id}")
        logger.info(f"Period: {date_from} to {date_to}")
        
        # Get sales orders and invoices
        sales_orders = await self._get_sales_orders(company_id, date_from, date_to)
        invoices = await self._get_invoices(company_id, date_from, date_to)
        
        # Perform reconciliation
        reconciliation_result = await self._reconcile(sales_orders, invoices)
        
        # Auto-approve small variances if enabled
        if auto_approve:
            reconciliation_result = await self._auto_approve_small_variances(
                reconciliation_result, 
                self.auto_approve_threshold
            )
        
        # Generate summary
        summary = self._generate_summary(reconciliation_result)
        
        logger.info(f"Reconciliation complete: {summary['total_matched']} matched, {summary['total_exceptions']} exceptions")
        
        return {
            "status": "success",
            "period": {"from": date_from, "to": date_to},
            "summary": summary,
            "exceptions": reconciliation_result.get("exceptions", []),
            "matched": reconciliation_result.get("matched", []),
            "timestamp": datetime.now().isoformat()
        }
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Get bot capabilities"""
        return {
            "description": "Automates sales-to-invoice reconciliation with exception handling",
            "features": [
                "Match sales orders with invoices",
                "Identify quantity variances",
                "Identify price variances",
                "Detect missing invoices",
                "Auto-approve small variances",
                "Post variances to GL",
                "Generate reconciliation reports"
            ],
            "parameters": {
                "company_id": "Company ID to reconcile",
                "date_from": "Start date (YYYY-MM-DD)",
                "date_to": "End date (YYYY-MM-DD)",
                "auto_approve": "Auto-approve small variances (boolean)"
            },
            "outputs": {
                "summary": "Reconciliation summary with totals",
                "exceptions": "List of exceptions requiring attention",
                "matched": "List of successfully matched records"
            }
        }
    
    async def _get_sales_orders(self, company_id: str, date_from: str, date_to: str) -> List[Dict]:
        """Get sales orders for the period"""
        # In production, this would query the database
        # For now, return mock data
        return [
            {
                "id": str(uuid.uuid4()),
                "order_number": "SO-2026-00001",
                "customer_id": str(uuid.uuid4()),
                "customer_name": "Acme Corporation",
                "order_date": "2026-01-15",
                "total_amount": Decimal("15000.00"),
                "lines": [
                    {"product": "Widget A", "quantity": 100, "unit_price": Decimal("100.00"), "line_total": Decimal("10000.00")},
                    {"product": "Widget B", "quantity": 50, "unit_price": Decimal("100.00"), "line_total": Decimal("5000.00")}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "order_number": "SO-2026-00002",
                "customer_id": str(uuid.uuid4()),
                "customer_name": "TechStart Inc",
                "order_date": "2026-01-16",
                "total_amount": Decimal("8500.00"),
                "lines": [
                    {"product": "Service Package", "quantity": 1, "unit_price": Decimal("8500.00"), "line_total": Decimal("8500.00")}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "order_number": "SO-2026-00003",
                "customer_id": str(uuid.uuid4()),
                "customer_name": "Global Supplies Ltd",
                "order_date": "2026-01-17",
                "total_amount": Decimal("22000.00"),
                "lines": [
                    {"product": "Bulk Materials", "quantity": 200, "unit_price": Decimal("110.00"), "line_total": Decimal("22000.00")}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "order_number": "SO-2026-00004",
                "customer_id": str(uuid.uuid4()),
                "customer_name": "Retail Partners",
                "order_date": "2026-01-18",
                "total_amount": Decimal("5000.00"),
                "lines": [
                    {"product": "Display Units", "quantity": 10, "unit_price": Decimal("500.00"), "line_total": Decimal("5000.00")}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "order_number": "SO-2026-00005",
                "customer_id": str(uuid.uuid4()),
                "customer_name": "Manufacturing Co",
                "order_date": "2026-01-19",
                "total_amount": Decimal("45000.00"),
                "lines": [
                    {"product": "Industrial Equipment", "quantity": 5, "unit_price": Decimal("9000.00"), "line_total": Decimal("45000.00")}
                ]
            }
        ]
    
    async def _get_invoices(self, company_id: str, date_from: str, date_to: str) -> List[Dict]:
        """Get invoices for the period"""
        # In production, this would query the database
        # For now, return mock data with some variances
        return [
            {
                "id": str(uuid.uuid4()),
                "invoice_number": "INV-2026-00001",
                "sales_order_number": "SO-2026-00001",
                "customer_name": "Acme Corporation",
                "invoice_date": "2026-01-16",
                "total_amount": Decimal("14500.00"),  # Quantity variance: 95 instead of 100
                "lines": [
                    {"product": "Widget A", "quantity": 95, "unit_price": Decimal("100.00"), "line_total": Decimal("9500.00")},
                    {"product": "Widget B", "quantity": 50, "unit_price": Decimal("100.00"), "line_total": Decimal("5000.00")}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "invoice_number": "INV-2026-00002",
                "sales_order_number": "SO-2026-00002",
                "customer_name": "TechStart Inc",
                "invoice_date": "2026-01-17",
                "total_amount": Decimal("8500.00"),  # Exact match
                "lines": [
                    {"product": "Service Package", "quantity": 1, "unit_price": Decimal("8500.00"), "line_total": Decimal("8500.00")}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "invoice_number": "INV-2026-00003",
                "sales_order_number": "SO-2026-00003",
                "customer_name": "Global Supplies Ltd",
                "invoice_date": "2026-01-18",
                "total_amount": Decimal("21000.00"),  # Price variance: $105 instead of $110
                "lines": [
                    {"product": "Bulk Materials", "quantity": 200, "unit_price": Decimal("105.00"), "line_total": Decimal("21000.00")}
                ]
            },
            # SO-2026-00004 has no invoice (missing invoice)
            {
                "id": str(uuid.uuid4()),
                "invoice_number": "INV-2026-00005",
                "sales_order_number": "SO-2026-00005",
                "customer_name": "Manufacturing Co",
                "invoice_date": "2026-01-20",
                "total_amount": Decimal("45000.00"),  # Exact match
                "lines": [
                    {"product": "Industrial Equipment", "quantity": 5, "unit_price": Decimal("9000.00"), "line_total": Decimal("45000.00")}
                ]
            }
        ]
    
    async def _reconcile(self, sales_orders: List[Dict], invoices: List[Dict]) -> Dict[str, Any]:
        """Perform reconciliation between sales orders and invoices"""
        matched = []
        exceptions = []
        
        # Create invoice lookup by sales order number
        invoice_lookup = {inv["sales_order_number"]: inv for inv in invoices}
        
        for order in sales_orders:
            order_number = order["order_number"]
            invoice = invoice_lookup.get(order_number)
            
            if not invoice:
                # Missing invoice exception
                exceptions.append({
                    "id": str(uuid.uuid4()),
                    "type": "missing_invoice",
                    "sales_order_number": order_number,
                    "customer_name": order["customer_name"],
                    "expected_amount": float(order["total_amount"]),
                    "actual_amount": 0,
                    "variance_amount": float(order["total_amount"]),
                    "status": "pending",
                    "created_at": datetime.now().isoformat()
                })
            else:
                order_total = Decimal(str(order["total_amount"]))
                invoice_total = Decimal(str(invoice["total_amount"]))
                variance = order_total - invoice_total
                
                if abs(variance) <= order_total * Decimal(str(self.tolerance_percentage)):
                    # Within tolerance - matched
                    matched.append({
                        "sales_order_number": order_number,
                        "invoice_number": invoice["invoice_number"],
                        "customer_name": order["customer_name"],
                        "order_amount": float(order_total),
                        "invoice_amount": float(invoice_total),
                        "variance": float(variance)
                    })
                else:
                    # Determine exception type
                    exception_type = self._determine_exception_type(order, invoice)
                    
                    exceptions.append({
                        "id": str(uuid.uuid4()),
                        "type": exception_type,
                        "sales_order_number": order_number,
                        "invoice_number": invoice["invoice_number"],
                        "customer_name": order["customer_name"],
                        "expected_amount": float(order_total),
                        "actual_amount": float(invoice_total),
                        "variance_amount": float(variance),
                        "status": "pending",
                        "created_at": datetime.now().isoformat()
                    })
        
        return {
            "matched": matched,
            "exceptions": exceptions
        }
    
    def _determine_exception_type(self, order: Dict, invoice: Dict) -> str:
        """Determine the type of exception based on line item comparison"""
        # Compare line items to determine if it's quantity or price variance
        order_lines = {line["product"]: line for line in order.get("lines", [])}
        invoice_lines = {line["product"]: line for line in invoice.get("lines", [])}
        
        has_quantity_variance = False
        has_price_variance = False
        
        for product, order_line in order_lines.items():
            invoice_line = invoice_lines.get(product)
            if invoice_line:
                if order_line["quantity"] != invoice_line["quantity"]:
                    has_quantity_variance = True
                if Decimal(str(order_line["unit_price"])) != Decimal(str(invoice_line["unit_price"])):
                    has_price_variance = True
        
        if has_quantity_variance and has_price_variance:
            return "quantity_and_price_variance"
        elif has_quantity_variance:
            return "quantity_variance"
        elif has_price_variance:
            return "price_variance"
        else:
            return "amount_variance"
    
    async def _auto_approve_small_variances(self, result: Dict, threshold: float) -> Dict:
        """Auto-approve exceptions with variance below threshold"""
        for exception in result.get("exceptions", []):
            if abs(exception["variance_amount"]) <= threshold:
                exception["status"] = "auto_approved"
                exception["approved_at"] = datetime.now().isoformat()
                exception["approved_by"] = "system"
                logger.info(f"Auto-approved exception {exception['id']} with variance {exception['variance_amount']}")
        
        return result
    
    def _generate_summary(self, result: Dict) -> Dict[str, Any]:
        """Generate reconciliation summary"""
        matched = result.get("matched", [])
        exceptions = result.get("exceptions", [])
        
        total_order_amount = sum(m["order_amount"] for m in matched)
        total_invoice_amount = sum(m["invoice_amount"] for m in matched)
        total_variance = sum(e["variance_amount"] for e in exceptions)
        
        pending_exceptions = [e for e in exceptions if e["status"] == "pending"]
        approved_exceptions = [e for e in exceptions if e["status"] in ["approved", "auto_approved"]]
        
        return {
            "total_orders": len(matched) + len(exceptions),
            "total_matched": len(matched),
            "total_exceptions": len(exceptions),
            "pending_exceptions": len(pending_exceptions),
            "approved_exceptions": len(approved_exceptions),
            "total_order_amount": total_order_amount,
            "total_invoice_amount": total_invoice_amount,
            "total_variance_amount": total_variance,
            "exception_types": {
                "quantity_variance": len([e for e in exceptions if e["type"] == "quantity_variance"]),
                "price_variance": len([e for e in exceptions if e["type"] == "price_variance"]),
                "missing_invoice": len([e for e in exceptions if e["type"] == "missing_invoice"]),
                "other": len([e for e in exceptions if e["type"] not in ["quantity_variance", "price_variance", "missing_invoice"]])
            }
        }
    
    async def approve_exception(self, exception_id: str, user_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """Approve a reconciliation exception"""
        logger.info(f"Approving exception {exception_id} by user {user_id}")
        
        return {
            "status": "success",
            "exception_id": exception_id,
            "action": "approved",
            "approved_by": user_id,
            "approved_at": datetime.now().isoformat(),
            "notes": notes
        }
    
    async def post_variance_to_gl(
        self, 
        exception_id: str, 
        user_id: str,
        debit_account: str,
        credit_account: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Post variance to general ledger"""
        logger.info(f"Posting variance for exception {exception_id} to GL")
        
        # In production, this would create a journal entry
        journal_entry_id = str(uuid.uuid4())
        
        return {
            "status": "success",
            "exception_id": exception_id,
            "action": "posted_to_gl",
            "journal_entry_id": journal_entry_id,
            "debit_account": debit_account,
            "credit_account": credit_account,
            "posted_by": user_id,
            "posted_at": datetime.now().isoformat(),
            "notes": notes
        }
    
    async def get_reconciliation_summary(self, company_id: str) -> Dict[str, Any]:
        """Get current reconciliation summary"""
        # In production, this would query the database
        return {
            "total_orders": 150,
            "total_invoiced": 142,
            "pending_reconciliation": 8,
            "total_exceptions": 5,
            "pending_approval": 3,
            "total_order_amount": 1250000.00,
            "total_invoiced_amount": 1235000.00,
            "variance_amount": 15000.00
        }


# Create singleton instance
sales_invoice_reconciliation_bot = SalesInvoiceReconciliationBot()
