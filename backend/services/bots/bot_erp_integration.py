"""
Bot ERP Integration Service
Connects all 67 bots to real L3/L4/L5 CRUD endpoints
"""
import requests
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class BotERPIntegration:
    """
    Integration service for bots to interact with real ERP endpoints
    Replaces mock/simulation data with actual database operations
    """
    
    def __init__(self, base_url: str = "http://localhost:8000", company_id: str = None):
        self.base_url = base_url
        self.company_id = company_id or "b0598135-52fd-4f67-ac56-8f0237e6355e"
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-Company-ID": self.company_id
        })
    
    def set_auth_token(self, token: str):
        """Set authentication token for API requests"""
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    
    def create_quote(self, customer_id: str, line_items: List[Dict], **kwargs) -> Dict:
        """Create a quote using real API"""
        try:
            quote_data = {
                "customer_id": customer_id,
                "quote_date": kwargs.get("quote_date", datetime.now().strftime("%Y-%m-%d")),
                "valid_until": kwargs.get("valid_until"),
                "status": "draft",
                "notes": kwargs.get("notes"),
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/quotes", json=quote_data)
            response.raise_for_status()
            quote = response.json()
            
            for item in line_items:
                line_data = {
                    "quote_id": quote["id"],
                    "product_id": item["product_id"],
                    "quantity": item["quantity"],
                    "unit_price": item.get("unit_price"),
                    "discount_percent": item.get("discount_percent", 0)
                }
                self.session.post(f"{self.base_url}/api/quote-lines", json=line_data)
            
            logger.info(f"Created quote {quote['quote_number']} via API")
            return quote
            
        except Exception as e:
            logger.error(f"Failed to create quote: {e}")
            raise
    
    def create_sales_order(self, customer_id: str, line_items: List[Dict], **kwargs) -> Dict:
        """Create a sales order using real API"""
        try:
            so_data = {
                "customer_id": customer_id,
                "order_date": kwargs.get("order_date", datetime.now().strftime("%Y-%m-%d")),
                "delivery_date": kwargs.get("delivery_date"),
                "status": "confirmed",
                "notes": kwargs.get("notes"),
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/sales-orders", json=so_data)
            response.raise_for_status()
            so = response.json()
            
            for item in line_items:
                line_data = {
                    "sales_order_id": so["id"],
                    "product_id": item["product_id"],
                    "quantity": item["quantity"],
                    "unit_price": item.get("unit_price"),
                    "discount_percent": item.get("discount_percent", 0)
                }
                self.session.post(f"{self.base_url}/api/sales-order-lines", json=line_data)
            
            logger.info(f"Created sales order {so['order_number']} via API")
            return so
            
        except Exception as e:
            logger.error(f"Failed to create sales order: {e}")
            raise
    
    def create_invoice(self, customer_id: str, line_items: List[Dict], **kwargs) -> Dict:
        """Create an invoice using real API"""
        try:
            invoice_data = {
                "customer_id": customer_id,
                "invoice_date": kwargs.get("invoice_date", datetime.now().strftime("%Y-%m-%d")),
                "due_date": kwargs.get("due_date"),
                "status": "draft",
                "notes": kwargs.get("notes"),
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/invoices", json=invoice_data)
            response.raise_for_status()
            invoice = response.json()
            
            for item in line_items:
                line_data = {
                    "invoice_id": invoice["id"],
                    "product_id": item["product_id"],
                    "quantity": item["quantity"],
                    "unit_price": item.get("unit_price"),
                    "tax_rate": item.get("tax_rate", 0.15)
                }
                self.session.post(f"{self.base_url}/api/invoice-lines", json=line_data)
            
            logger.info(f"Created invoice {invoice['invoice_number']} via API")
            return invoice
            
        except Exception as e:
            logger.error(f"Failed to create invoice: {e}")
            raise
    
    def create_lead(self, lead_data: Dict) -> Dict:
        """Create a CRM lead using real API"""
        try:
            lead_data["company_id"] = self.company_id
            response = self.session.post(f"{self.base_url}/api/leads", json=lead_data)
            response.raise_for_status()
            lead = response.json()
            logger.info(f"Created lead {lead['id']} via API")
            return lead
        except Exception as e:
            logger.error(f"Failed to create lead: {e}")
            raise
    
    
    def create_purchase_order(self, supplier_id: str, line_items: List[Dict], **kwargs) -> Dict:
        """Create a purchase order using real API"""
        try:
            po_data = {
                "supplier_id": supplier_id,
                "po_date": kwargs.get("po_date", datetime.now().strftime("%Y-%m-%d")),
                "delivery_date": kwargs.get("delivery_date"),
                "status": "draft",
                "notes": kwargs.get("notes"),
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/purchase-orders", json=po_data)
            response.raise_for_status()
            po = response.json()
            
            for item in line_items:
                line_data = {
                    "purchase_order_id": po["id"],
                    "product_id": item["product_id"],
                    "quantity": item["quantity"],
                    "unit_price": item.get("unit_price")
                }
                self.session.post(f"{self.base_url}/api/purchase-order-lines", json=line_data)
            
            logger.info(f"Created purchase order {po['po_number']} via API")
            return po
            
        except Exception as e:
            logger.error(f"Failed to create purchase order: {e}")
            raise
    
    def create_goods_receipt(self, po_id: str, line_items: List[Dict], **kwargs) -> Dict:
        """Create a goods receipt using real API"""
        try:
            gr_data = {
                "purchase_order_id": po_id,
                "receipt_date": kwargs.get("receipt_date", datetime.now().strftime("%Y-%m-%d")),
                "warehouse_id": kwargs.get("warehouse_id"),
                "status": "received",
                "notes": kwargs.get("notes"),
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/goods-receipts", json=gr_data)
            response.raise_for_status()
            gr = response.json()
            
            logger.info(f"Created goods receipt {gr['receipt_number']} via API")
            return gr
            
        except Exception as e:
            logger.error(f"Failed to create goods receipt: {e}")
            raise
    
    
    def create_stock_adjustment(self, product_id: str, quantity: float, **kwargs) -> Dict:
        """Create a stock adjustment using real API"""
        try:
            adj_data = {
                "product_id": product_id,
                "quantity": quantity,
                "adjustment_type": kwargs.get("adjustment_type", "manual"),
                "reason": kwargs.get("reason"),
                "warehouse_id": kwargs.get("warehouse_id"),
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/stock-adjustments", json=adj_data)
            response.raise_for_status()
            adj = response.json()
            
            logger.info(f"Created stock adjustment {adj['id']} via API")
            return adj
            
        except Exception as e:
            logger.error(f"Failed to create stock adjustment: {e}")
            raise
    
    def create_stock_transfer(self, product_id: str, quantity: float, from_warehouse: str, to_warehouse: str, **kwargs) -> Dict:
        """Create a stock transfer using real API"""
        try:
            transfer_data = {
                "product_id": product_id,
                "quantity": quantity,
                "from_warehouse_id": from_warehouse,
                "to_warehouse_id": to_warehouse,
                "transfer_date": kwargs.get("transfer_date", datetime.now().strftime("%Y-%m-%d")),
                "status": "pending",
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/stock-transfers", json=transfer_data)
            response.raise_for_status()
            transfer = response.json()
            
            logger.info(f"Created stock transfer {transfer['id']} via API")
            return transfer
            
        except Exception as e:
            logger.error(f"Failed to create stock transfer: {e}")
            raise
    
    
    def create_journal_entry(self, journal_lines: List[Dict], **kwargs) -> Dict:
        """Create a journal entry using real API"""
        try:
            je_data = {
                "journal_date": kwargs.get("journal_date", datetime.now().strftime("%Y-%m-%d")),
                "description": kwargs.get("description"),
                "reference": kwargs.get("reference"),
                "status": "draft",
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/journal-entries", json=je_data)
            response.raise_for_status()
            je = response.json()
            
            for line in journal_lines:
                line_data = {
                    "journal_entry_id": je["id"],
                    "account_id": line["account_id"],
                    "debit": line.get("debit", 0),
                    "credit": line.get("credit", 0),
                    "description": line.get("description")
                }
                self.session.post(f"{self.base_url}/api/journal-entry-lines", json=line_data)
            
            logger.info(f"Created journal entry {je['entry_number']} via API")
            return je
            
        except Exception as e:
            logger.error(f"Failed to create journal entry: {e}")
            raise
    
    
    def create_ap_invoice(self, supplier_id: str, line_items: List[Dict], **kwargs) -> Dict:
        """Create an AP invoice using real API"""
        try:
            invoice_data = {
                "supplier_id": supplier_id,
                "invoice_date": kwargs.get("invoice_date", datetime.now().strftime("%Y-%m-%d")),
                "due_date": kwargs.get("due_date"),
                "status": "pending",
                "notes": kwargs.get("notes"),
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/ap-invoices", json=invoice_data)
            response.raise_for_status()
            invoice = response.json()
            
            logger.info(f"Created AP invoice {invoice['invoice_number']} via API")
            return invoice
            
        except Exception as e:
            logger.error(f"Failed to create AP invoice: {e}")
            raise
    
    def create_payment(self, invoice_id: str, amount: float, **kwargs) -> Dict:
        """Create a payment using real API"""
        try:
            payment_data = {
                "invoice_id": invoice_id,
                "amount": amount,
                "payment_date": kwargs.get("payment_date", datetime.now().strftime("%Y-%m-%d")),
                "payment_method": kwargs.get("payment_method", "bank_transfer"),
                "reference": kwargs.get("reference"),
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/payments", json=payment_data)
            response.raise_for_status()
            payment = response.json()
            
            logger.info(f"Created payment {payment['payment_number']} via API")
            return payment
            
        except Exception as e:
            logger.error(f"Failed to create payment: {e}")
            raise
    
    
    def create_work_order(self, product_id: str, quantity: float, **kwargs) -> Dict:
        """Create a work order using real API"""
        try:
            wo_data = {
                "product_id": product_id,
                "quantity": quantity,
                "start_date": kwargs.get("start_date", datetime.now().strftime("%Y-%m-%d")),
                "due_date": kwargs.get("due_date"),
                "status": "planned",
                "company_id": self.company_id
            }
            
            response = self.session.post(f"{self.base_url}/api/work-orders", json=wo_data)
            response.raise_for_status()
            wo = response.json()
            
            logger.info(f"Created work order {wo['wo_number']} via API")
            return wo
            
        except Exception as e:
            logger.error(f"Failed to create work order: {e}")
            raise
    
    
    def create_employee(self, employee_data: Dict) -> Dict:
        """Create an employee using real API"""
        try:
            employee_data["company_id"] = self.company_id
            response = self.session.post(f"{self.base_url}/api/employees", json=employee_data)
            response.raise_for_status()
            employee = response.json()
            logger.info(f"Created employee {employee['employee_number']} via API")
            return employee
        except Exception as e:
            logger.error(f"Failed to create employee: {e}")
            raise
    
    def create_leave_request(self, employee_id: str, leave_data: Dict) -> Dict:
        """Create a leave request using real API"""
        try:
            leave_data["employee_id"] = employee_id
            leave_data["company_id"] = self.company_id
            response = self.session.post(f"{self.base_url}/api/leave-requests", json=leave_data)
            response.raise_for_status()
            leave = response.json()
            logger.info(f"Created leave request {leave['id']} via API")
            return leave
        except Exception as e:
            logger.error(f"Failed to create leave request: {e}")
            raise
    
    
    def create_quality_inspection(self, inspection_data: Dict) -> Dict:
        """Create a quality inspection using real API"""
        try:
            inspection_data["company_id"] = self.company_id
            response = self.session.post(f"{self.base_url}/api/quality-inspections", json=inspection_data)
            response.raise_for_status()
            inspection = response.json()
            logger.info(f"Created quality inspection {inspection['inspection_number']} via API")
            return inspection
        except Exception as e:
            logger.error(f"Failed to create quality inspection: {e}")
            raise
    
    
    def create_bank_transaction(self, transaction_data: Dict) -> Dict:
        """Create a bank transaction using real API"""
        try:
            transaction_data["company_id"] = self.company_id
            response = self.session.post(f"{self.base_url}/api/bank-transactions", json=transaction_data)
            response.raise_for_status()
            transaction = response.json()
            logger.info(f"Created bank transaction {transaction['id']} via API")
            return transaction
        except Exception as e:
            logger.error(f"Failed to create bank transaction: {e}")
            raise
    
    def reconcile_bank_statement(self, bank_account_id: str, transactions: List[Dict]) -> Dict:
        """Reconcile bank statement using real API"""
        try:
            reconciliation_data = {
                "bank_account_id": bank_account_id,
                "transactions": transactions,
                "company_id": self.company_id
            }
            response = self.session.post(f"{self.base_url}/api/bank-reconciliations", json=reconciliation_data)
            response.raise_for_status()
            reconciliation = response.json()
            logger.info(f"Created bank reconciliation {reconciliation['id']} via API")
            return reconciliation
        except Exception as e:
            logger.error(f"Failed to reconcile bank statement: {e}")
            raise
    
    
    def get_customers(self, search: str = None, limit: int = 20) -> List[Dict]:
        """Get customers from real API"""
        try:
            params = {"company_id": self.company_id, "limit": limit}
            if search:
                params["search"] = search
            response = self.session.get(f"{self.base_url}/api/customers", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get customers: {e}")
            return []
    
    def get_products(self, search: str = None, limit: int = 50) -> List[Dict]:
        """Get products from real API"""
        try:
            params = {"company_id": self.company_id, "limit": limit}
            if search:
                params["search"] = search
            response = self.session.get(f"{self.base_url}/api/products", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get products: {e}")
            return []
    
    def get_suppliers(self, search: str = None, limit: int = 20) -> List[Dict]:
        """Get suppliers from real API"""
        try:
            params = {"company_id": self.company_id, "limit": limit}
            if search:
                params["search"] = search
            response = self.session.get(f"{self.base_url}/api/suppliers", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get suppliers: {e}")
            return []
    
    def get_stock_levels(self, product_id: str = None) -> List[Dict]:
        """Get stock levels from real API"""
        try:
            params = {"company_id": self.company_id}
            if product_id:
                params["product_id"] = product_id
            response = self.session.get(f"{self.base_url}/api/stock-levels", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get stock levels: {e}")
            return []
    
    def get_ar_aging(self) -> Dict:
        """Get AR aging report from real API"""
        try:
            params = {"company_id": self.company_id}
            response = self.session.get(f"{self.base_url}/api/reports/ar-aging", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get AR aging: {e}")
            return {}
    
    def get_ap_aging(self) -> Dict:
        """Get AP aging report from real API"""
        try:
            params = {"company_id": self.company_id}
            response = self.session.get(f"{self.base_url}/api/reports/ap-aging", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get AP aging: {e}")
            return {}


_bot_erp_integration = None

def get_bot_erp_integration(base_url: str = "http://localhost:8000", company_id: str = None) -> BotERPIntegration:
    """Get or create global bot ERP integration instance"""
    global _bot_erp_integration
    if _bot_erp_integration is None:
        _bot_erp_integration = BotERPIntegration(base_url, company_id)
    return _bot_erp_integration
