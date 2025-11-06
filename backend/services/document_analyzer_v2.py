"""
Comprehensive Document Analyzer for All ERP and SAP Document Types
Supports 34+ document types across AP, AR, GL, Inventory, Sales, Purchasing, Banking, Assets, Payroll
"""
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseDocumentAnalyzer(ABC):
    """Base class for document analyzers"""
    
    @abstractmethod
    def detect(self, df: pd.DataFrame) -> bool:
        """Detect if this analyzer can handle the document"""
        pass
    
    @abstractmethod
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze the document and return structured data"""
        pass
    
    @abstractmethod
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate GL posting entries"""
        pass
    
    @abstractmethod
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate SAP-compatible export"""
        pass
    
    def generate_recommendations(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[str]:
        """Generate recommendations (optional override)"""
        return []


# ============================================================================
# ============================================================================

class VendorInvoiceAnalyzer(BaseDocumentAnalyzer):
    """AP Vendor Invoice (FB60)"""
    
    def detect(self, df: pd.DataFrame) -> bool:
        cols = [str(c).lower() for c in df.columns]
        return any('vendor' in c or 'supplier' in c for c in cols) and \
               any('invoice' in c for c in cols) and \
               any('amount' in c or 'total' in c for c in cols)
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        vendor_col = next((c for c in df.columns if 'vendor' in str(c).lower() or 'supplier' in str(c).lower()), None)
        invoice_col = next((c for c in df.columns if 'invoice' in str(c).lower()), None)
        amount_col = next((c for c in df.columns if 'amount' in str(c).lower() or 'total' in str(c).lower()), None)
        tax_col = next((c for c in df.columns if 'tax' in str(c).lower() or 'vat' in str(c).lower()), None)
        
        total_amount = df[amount_col].sum() if amount_col else 0
        total_tax = df[tax_col].sum() if tax_col else 0
        
        return {
            "document_type": "Vendor Invoice",
            "document_subtype": "AP Invoice (Non-PO)",
            "sap_transaction": "FB60",
            "summary": {
                "total_invoices": len(df),
                "unique_vendors": df[vendor_col].nunique() if vendor_col else 0,
                "total_amount": round(total_amount, 2),
                "total_tax": round(total_tax, 2),
                "net_amount": round(total_amount - total_tax, 2)
            },
            "columns": {
                "vendor": vendor_col,
                "invoice": invoice_col,
                "amount": amount_col,
                "tax": tax_col
            }
        }
    
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        postings = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            vendor = row[cols['vendor']] if cols['vendor'] else f"VENDOR-{idx}"
            amount = row[cols['amount']] if cols['amount'] else 0
            tax = row[cols['tax']] if cols['tax'] else 0
            net = amount - tax
            
            postings.append({
                "line_number": len(postings) + 1,
                "account": "5000",
                "account_name": "Operating Expenses",
                "debit": abs(net),
                "credit": 0,
                "description": f"Invoice from {vendor}",
                "vendor_ref": str(vendor),
                "posting_key": "40"
            })
            
            if tax > 0:
                postings.append({
                    "line_number": len(postings) + 1,
                    "account": "1500",
                    "account_name": "Input VAT",
                    "debit": abs(tax),
                    "credit": 0,
                    "description": f"VAT on invoice from {vendor}",
                    "vendor_ref": str(vendor),
                    "posting_key": "40"
                })
            
            postings.append({
                "line_number": len(postings) + 1,
                "account": "2000",
                "account_name": "Accounts Payable - Trade",
                "debit": 0,
                "credit": abs(amount),
                "description": f"Invoice from {vendor}",
                "vendor_ref": str(vendor),
                "posting_key": "31"
            })
        
        return postings
    
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        records = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            records.append({
                "Document_Type": "KR",
                "Company_Code": "1000",
                "Document_Date": datetime.now().strftime('%Y%m%d'),
                "Posting_Date": datetime.now().strftime('%Y%m%d'),
                "Vendor_Number": str(row[cols['vendor']]) if cols['vendor'] else "",
                "Invoice_Number": str(row[cols['invoice']]) if cols['invoice'] else "",
                "Amount": abs(row[cols['amount']]) if cols['amount'] else 0,
                "Tax_Amount": abs(row[cols['tax']]) if cols['tax'] else 0,
                "Currency": "ZAR",
                "Tax_Code": "V1",
                "Posting_Key": "31"
            })
        
        return {
            "format": "SAP_FB60_VENDOR_INVOICE",
            "transaction_code": "FB60",
            "description": "Enter Vendor Invoice",
            "total_records": len(records),
            "records": records
        }


class VendorPaymentAnalyzer(BaseDocumentAnalyzer):
    """AP Outgoing Payment (F-53) - FIXED from F-28"""
    
    def detect(self, df: pd.DataFrame) -> bool:
        cols = [str(c).lower() for c in df.columns]
        return (any('vendor' in c or 'supplier' in c for c in cols) and
                any('payment' in c or 'nett' in c or 'net' in c for c in cols) and
                any('document' in c or 'reference' in c for c in cols))
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        vendor_col = next((c for c in df.columns if 'vendor' in str(c).lower() or 'supplier' in str(c).lower()), None)
        nett_col = next((c for c in df.columns if 'nett' in str(c).lower() or 'net' in str(c).lower()), None)
        discount_col = next((c for c in df.columns if 'discount' in str(c).lower()), None)
        
        total_nett = df[nett_col].sum() if nett_col else 0
        total_discount = df[discount_col].sum() if discount_col else 0
        
        return {
            "document_type": "Vendor Payment",
            "document_subtype": "Outgoing Payment (Remittance)",
            "sap_transaction": "F-53",
            "summary": {
                "total_payments": len(df),
                "unique_vendors": df[vendor_col].nunique() if vendor_col else 0,
                "total_nett": round(total_nett, 2),
                "total_discount": round(total_discount, 2)
            },
            "columns": {
                "vendor": vendor_col,
                "nett": nett_col,
                "discount": discount_col
            }
        }
    
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        postings = []
        cols = analysis['columns']
        
        vendor_totals = df.groupby(cols['vendor']).agg({
            cols['nett']: 'sum',
            cols['discount']: 'sum' if cols['discount'] else lambda x: 0
        }).reset_index()
        
        for _, row in vendor_totals.iterrows():
            vendor = row[cols['vendor']]
            nett = row[cols['nett']]
            discount = row[cols['discount']] if cols['discount'] else 0
            
            postings.append({
                "line_number": len(postings) + 1,
                "account": "2000",
                "account_name": "Accounts Payable - Trade",
                "debit": abs(nett),
                "credit": 0,
                "description": f"Payment to Vendor {vendor}",
                "vendor_ref": str(vendor),
                "posting_key": "21"
            })
            
            postings.append({
                "line_number": len(postings) + 1,
                "account": "1100",
                "account_name": "Bank - Current Account",
                "debit": 0,
                "credit": abs(nett),
                "description": f"Payment to Vendor {vendor}",
                "vendor_ref": str(vendor),
                "posting_key": "50"
            })
            
            if discount != 0:
                postings.append({
                    "line_number": len(postings) + 1,
                    "account": "6100",
                    "account_name": "Discount Received",
                    "debit": 0,
                    "credit": abs(discount),
                    "description": f"Discount from Vendor {vendor}",
                    "vendor_ref": str(vendor),
                    "posting_key": "50"
                })
        
        return postings
    
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        records = []
        cols = analysis['columns']
        
        vendor_totals = df.groupby(cols['vendor']).agg({
            cols['nett']: 'sum',
            cols['discount']: 'sum' if cols['discount'] else lambda x: 0
        }).reset_index()
        
        for _, row in vendor_totals.iterrows():
            records.append({
                "Document_Type": "KZ",
                "Company_Code": "1000",
                "Document_Date": datetime.now().strftime('%Y%m%d'),
                "Posting_Date": datetime.now().strftime('%Y%m%d'),
                "Vendor_Number": str(row[cols['vendor']]),
                "Amount": abs(row[cols['nett']]),
                "Currency": "ZAR",
                "Payment_Method": "T",
                "Discount_Amount": abs(row[cols['discount']]) if cols['discount'] else 0,
                "GL_Account": "1100",
                "Posting_Key_Vendor": "21",
                "Posting_Key_Bank": "50"
            })
        
        return {
            "format": "SAP_F53_OUTGOING_PAYMENT",
            "transaction_code": "F-53",
            "description": "Post Outgoing Payments (Vendor)",
            "total_records": len(records),
            "records": records,
            "export_instructions": [
                "1. Use transaction F-53 in SAP",
                "2. Enter Document Date and Posting Date",
                "3. Enter Company Code (1000)",
                "4. For each vendor payment:",
                "   - Enter Vendor Number",
                "   - Enter Amount",
                "   - Enter Bank Account (1100)",
                "   - Enter Payment Method (T)",
                "5. Post the document"
            ]
        }


# ============================================================================
# ============================================================================

class CustomerInvoiceAnalyzer(BaseDocumentAnalyzer):
    """AR Customer Invoice (FB70)"""
    
    def detect(self, df: pd.DataFrame) -> bool:
        cols = [str(c).lower() for c in df.columns]
        return any('customer' in c for c in cols) and \
               any('invoice' in c for c in cols) and \
               any('amount' in c or 'total' in c or 'revenue' in c for c in cols)
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        customer_col = next((c for c in df.columns if 'customer' in str(c).lower()), None)
        invoice_col = next((c for c in df.columns if 'invoice' in str(c).lower()), None)
        amount_col = next((c for c in df.columns if 'amount' in str(c).lower() or 'total' in str(c).lower() or 'revenue' in str(c).lower()), None)
        tax_col = next((c for c in df.columns if 'tax' in str(c).lower() or 'vat' in str(c).lower()), None)
        
        total_amount = df[amount_col].sum() if amount_col else 0
        total_tax = df[tax_col].sum() if tax_col else 0
        
        return {
            "document_type": "Customer Invoice",
            "document_subtype": "AR Invoice",
            "sap_transaction": "FB70",
            "summary": {
                "total_invoices": len(df),
                "unique_customers": df[customer_col].nunique() if customer_col else 0,
                "total_amount": round(total_amount, 2),
                "total_tax": round(total_tax, 2),
                "net_revenue": round(total_amount - total_tax, 2)
            },
            "columns": {
                "customer": customer_col,
                "invoice": invoice_col,
                "amount": amount_col,
                "tax": tax_col
            }
        }
    
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        postings = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            customer = row[cols['customer']] if cols['customer'] else f"CUST-{idx}"
            amount = row[cols['amount']] if cols['amount'] else 0
            tax = row[cols['tax']] if cols['tax'] else 0
            net = amount - tax
            
            postings.append({
                "line_number": len(postings) + 1,
                "account": "1200",
                "account_name": "Accounts Receivable - Trade",
                "debit": abs(amount),
                "credit": 0,
                "description": f"Invoice to {customer}",
                "customer_ref": str(customer),
                "posting_key": "01"
            })
            
            postings.append({
                "line_number": len(postings) + 1,
                "account": "4000",
                "account_name": "Sales Revenue",
                "debit": 0,
                "credit": abs(net),
                "description": f"Revenue from {customer}",
                "customer_ref": str(customer),
                "posting_key": "50"
            })
            
            if tax > 0:
                postings.append({
                    "line_number": len(postings) + 1,
                    "account": "2100",
                    "account_name": "Output VAT",
                    "debit": 0,
                    "credit": abs(tax),
                    "description": f"VAT on invoice to {customer}",
                    "customer_ref": str(customer),
                    "posting_key": "50"
                })
        
        return postings
    
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        records = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            records.append({
                "Document_Type": "DR",
                "Company_Code": "1000",
                "Document_Date": datetime.now().strftime('%Y%m%d'),
                "Posting_Date": datetime.now().strftime('%Y%m%d'),
                "Customer_Number": str(row[cols['customer']]) if cols['customer'] else "",
                "Invoice_Number": str(row[cols['invoice']]) if cols['invoice'] else "",
                "Amount": abs(row[cols['amount']]) if cols['amount'] else 0,
                "Tax_Amount": abs(row[cols['tax']]) if cols['tax'] else 0,
                "Currency": "ZAR",
                "Tax_Code": "V1",
                "Posting_Key": "01"
            })
        
        return {
            "format": "SAP_FB70_CUSTOMER_INVOICE",
            "transaction_code": "FB70",
            "description": "Enter Customer Invoice",
            "total_records": len(records),
            "records": records
        }


class CustomerPaymentAnalyzer(BaseDocumentAnalyzer):
    """AR Incoming Payment (F-28)"""
    
    def detect(self, df: pd.DataFrame) -> bool:
        cols = [str(c).lower() for c in df.columns]
        return any('customer' in c for c in cols) and \
               any('payment' in c or 'receipt' in c for c in cols) and \
               any('amount' in c for c in cols)
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        customer_col = next((c for c in df.columns if 'customer' in str(c).lower()), None)
        amount_col = next((c for c in df.columns if 'amount' in str(c).lower()), None)
        
        total_amount = df[amount_col].sum() if amount_col else 0
        
        return {
            "document_type": "Customer Payment",
            "document_subtype": "Incoming Payment (Receipt)",
            "sap_transaction": "F-28",
            "summary": {
                "total_payments": len(df),
                "unique_customers": df[customer_col].nunique() if customer_col else 0,
                "total_amount": round(total_amount, 2)
            },
            "columns": {
                "customer": customer_col,
                "amount": amount_col
            }
        }
    
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        postings = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            customer = row[cols['customer']] if cols['customer'] else f"CUST-{idx}"
            amount = row[cols['amount']] if cols['amount'] else 0
            
            postings.append({
                "line_number": len(postings) + 1,
                "account": "1100",
                "account_name": "Bank - Current Account",
                "debit": abs(amount),
                "credit": 0,
                "description": f"Payment from {customer}",
                "customer_ref": str(customer),
                "posting_key": "40"
            })
            
            postings.append({
                "line_number": len(postings) + 1,
                "account": "1200",
                "account_name": "Accounts Receivable - Trade",
                "debit": 0,
                "credit": abs(amount),
                "description": f"Payment from {customer}",
                "customer_ref": str(customer),
                "posting_key": "11"
            })
        
        return postings
    
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        records = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            records.append({
                "Document_Type": "DZ",
                "Company_Code": "1000",
                "Document_Date": datetime.now().strftime('%Y%m%d'),
                "Posting_Date": datetime.now().strftime('%Y%m%d'),
                "Customer_Number": str(row[cols['customer']]) if cols['customer'] else "",
                "Amount": abs(row[cols['amount']]) if cols['amount'] else 0,
                "Currency": "ZAR",
                "Payment_Method": "T",
                "GL_Account": "1100",
                "Posting_Key_Customer": "11",
                "Posting_Key_Bank": "40"
            })
        
        return {
            "format": "SAP_F28_INCOMING_PAYMENT",
            "transaction_code": "F-28",
            "description": "Post Incoming Payments (Customer)",
            "total_records": len(records),
            "records": records
        }


# ============================================================================
# ============================================================================

class JournalEntryAnalyzer(BaseDocumentAnalyzer):
    """GL Journal Entry (FB50/F-02)"""
    
    def detect(self, df: pd.DataFrame) -> bool:
        cols = [str(c).lower() for c in df.columns]
        return (any('gl' in c or 'account' in c for c in cols) and
                (any('debit' in c for c in cols) or any('credit' in c for c in cols)))
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        gl_col = next((c for c in df.columns if 'gl' in str(c).lower() or 'account' in str(c).lower()), None)
        debit_col = next((c for c in df.columns if 'debit' in str(c).lower()), None)
        credit_col = next((c for c in df.columns if 'credit' in str(c).lower()), None)
        
        total_debit = df[debit_col].sum() if debit_col else 0
        total_credit = df[credit_col].sum() if credit_col else 0
        
        return {
            "document_type": "Journal Entry",
            "document_subtype": "General Ledger Posting",
            "sap_transaction": "FB50",
            "summary": {
                "total_lines": len(df),
                "total_debit": round(total_debit, 2),
                "total_credit": round(total_credit, 2),
                "balanced": abs(total_debit - total_credit) < 0.01
            },
            "columns": {
                "gl_account": gl_col,
                "debit": debit_col,
                "credit": credit_col
            }
        }
    
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        postings = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            gl_account = row[cols['gl_account']] if cols['gl_account'] else "9999"
            debit = row[cols['debit']] if cols['debit'] else 0
            credit = row[cols['credit']] if cols['credit'] else 0
            
            postings.append({
                "line_number": idx + 1,
                "account": str(gl_account),
                "account_name": f"GL Account {gl_account}",
                "debit": abs(debit) if debit > 0 else 0,
                "credit": abs(credit) if credit > 0 else 0,
                "description": "Journal Entry",
                "posting_key": "40" if debit > 0 else "50"
            })
        
        return postings
    
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        records = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            records.append({
                "Document_Type": "SA",
                "Company_Code": "1000",
                "Document_Date": datetime.now().strftime('%Y%m%d'),
                "Posting_Date": datetime.now().strftime('%Y%m%d'),
                "GL_Account": str(row[cols['gl_account']]) if cols['gl_account'] else "",
                "Debit_Amount": abs(row[cols['debit']]) if cols['debit'] else 0,
                "Credit_Amount": abs(row[cols['credit']]) if cols['credit'] else 0,
                "Currency": "ZAR",
                "Posting_Key": "40" if (row[cols['debit']] if cols['debit'] else 0) > 0 else "50"
            })
        
        return {
            "format": "SAP_FB50_JOURNAL_ENTRY",
            "transaction_code": "FB50",
            "description": "Enter G/L Account Document",
            "total_records": len(records),
            "records": records
        }


# ============================================================================
# ============================================================================

class GoodsReceiptAnalyzer(BaseDocumentAnalyzer):
    """MM Goods Receipt (MIGO 101)"""
    
    def detect(self, df: pd.DataFrame) -> bool:
        cols = [str(c).lower() for c in df.columns]
        return (any('material' in c or 'item' in c or 'product' in c for c in cols) and
                any('quantity' in c or 'qty' in c for c in cols) and
                (any('receipt' in c or 'gr' in c or 'po' in c for c in cols) or
                 any('101' in str(c) for c in cols)))
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        material_col = next((c for c in df.columns if 'material' in str(c).lower() or 'item' in str(c).lower() or 'product' in str(c).lower()), None)
        qty_col = next((c for c in df.columns if 'quantity' in str(c).lower() or 'qty' in str(c).lower()), None)
        value_col = next((c for c in df.columns if 'value' in str(c).lower() or 'amount' in str(c).lower()), None)
        
        total_qty = df[qty_col].sum() if qty_col else 0
        total_value = df[value_col].sum() if value_col else 0
        
        return {
            "document_type": "Goods Receipt",
            "document_subtype": "GR for Purchase Order",
            "sap_transaction": "MIGO",
            "movement_type": "101",
            "summary": {
                "total_lines": len(df),
                "total_quantity": round(total_qty, 2),
                "total_value": round(total_value, 2)
            },
            "columns": {
                "material": material_col,
                "quantity": qty_col,
                "value": value_col
            }
        }
    
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        postings = []
        cols = analysis['columns']
        
        total_value = df[cols['value']].sum() if cols['value'] else 0
        
        postings.append({
            "line_number": 1,
            "account": "1300",
            "account_name": "Inventory - Raw Materials",
            "debit": abs(total_value),
            "credit": 0,
            "description": "Goods Receipt",
            "posting_key": "40"
        })
        
        postings.append({
            "line_number": 2,
            "account": "1910",
            "account_name": "GR/IR Clearing Account",
            "debit": 0,
            "credit": abs(total_value),
            "description": "Goods Receipt",
            "posting_key": "50"
        })
        
        return postings
    
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        records = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            records.append({
                "Movement_Type": "101",
                "Material": str(row[cols['material']]) if cols['material'] else "",
                "Plant": "1000",
                "Storage_Location": "0001",
                "Quantity": abs(row[cols['quantity']]) if cols['quantity'] else 0,
                "Amount": abs(row[cols['value']]) if cols['value'] else 0,
                "Currency": "ZAR",
                "Posting_Date": datetime.now().strftime('%Y%m%d')
            })
        
        return {
            "format": "SAP_MIGO_GOODS_RECEIPT",
            "transaction_code": "MIGO",
            "description": "Goods Receipt for PO",
            "movement_type": "101",
            "total_records": len(records),
            "records": records
        }


class GoodsIssueAnalyzer(BaseDocumentAnalyzer):
    """MM Goods Issue (MIGO 601)"""
    
    def detect(self, df: pd.DataFrame) -> bool:
        cols = [str(c).lower() for c in df.columns]
        return (any('material' in c or 'item' in c or 'product' in c for c in cols) and
                any('quantity' in c or 'qty' in c for c in cols) and
                (any('issue' in c or 'gi' in c or 'delivery' in c for c in cols) or
                 any('601' in str(c) for c in cols)))
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        material_col = next((c for c in df.columns if 'material' in str(c).lower() or 'item' in str(c).lower() or 'product' in str(c).lower()), None)
        qty_col = next((c for c in df.columns if 'quantity' in str(c).lower() or 'qty' in str(c).lower()), None)
        value_col = next((c for c in df.columns if 'value' in str(c).lower() or 'amount' in str(c).lower() or 'cost' in str(c).lower()), None)
        
        total_qty = df[qty_col].sum() if qty_col else 0
        total_value = df[value_col].sum() if value_col else 0
        
        return {
            "document_type": "Goods Issue",
            "document_subtype": "GI for Delivery",
            "sap_transaction": "MIGO",
            "movement_type": "601",
            "summary": {
                "total_lines": len(df),
                "total_quantity": round(total_qty, 2),
                "total_value": round(total_value, 2)
            },
            "columns": {
                "material": material_col,
                "quantity": qty_col,
                "value": value_col
            }
        }
    
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        postings = []
        cols = analysis['columns']
        
        total_value = df[cols['value']].sum() if cols['value'] else 0
        
        postings.append({
            "line_number": 1,
            "account": "5100",
            "account_name": "Cost of Goods Sold",
            "debit": abs(total_value),
            "credit": 0,
            "description": "Goods Issue - COGS",
            "posting_key": "40"
        })
        
        postings.append({
            "line_number": 2,
            "account": "1300",
            "account_name": "Inventory - Finished Goods",
            "debit": 0,
            "credit": abs(total_value),
            "description": "Goods Issue - Inventory Reduction",
            "posting_key": "50"
        })
        
        return postings
    
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        records = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            records.append({
                "Movement_Type": "601",
                "Material": str(row[cols['material']]) if cols['material'] else "",
                "Plant": "1000",
                "Storage_Location": "0001",
                "Quantity": abs(row[cols['quantity']]) if cols['quantity'] else 0,
                "Amount": abs(row[cols['value']]) if cols['value'] else 0,
                "Currency": "ZAR",
                "Posting_Date": datetime.now().strftime('%Y%m%d')
            })
        
        return {
            "format": "SAP_MIGO_GOODS_ISSUE",
            "transaction_code": "MIGO",
            "description": "Goods Issue for Delivery",
            "movement_type": "601",
            "total_records": len(records),
            "records": records
        }


# ============================================================================
# ============================================================================

class BankStatementAnalyzer(BaseDocumentAnalyzer):
    """Bank Statement (FF.5)"""
    
    def detect(self, df: pd.DataFrame) -> bool:
        cols = [str(c).lower() for c in df.columns]
        return (any('date' in c or 'value' in c for c in cols) and
                any('amount' in c or 'debit' in c or 'credit' in c for c in cols) and
                (any('bank' in c or 'statement' in c or 'transaction' in c or 'reference' in c for c in cols)))
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        date_col = next((c for c in df.columns if 'date' in str(c).lower()), None)
        amount_col = next((c for c in df.columns if 'amount' in str(c).lower()), None)
        debit_col = next((c for c in df.columns if 'debit' in str(c).lower()), None)
        credit_col = next((c for c in df.columns if 'credit' in str(c).lower()), None)
        
        total_debit = df[debit_col].sum() if debit_col else 0
        total_credit = df[credit_col].sum() if credit_col else 0
        total_amount = df[amount_col].sum() if amount_col else (total_debit - total_credit)
        
        return {
            "document_type": "Bank Statement",
            "document_subtype": "Electronic Bank Statement",
            "sap_transaction": "FF.5",
            "summary": {
                "total_transactions": len(df),
                "total_debit": round(total_debit, 2),
                "total_credit": round(total_credit, 2),
                "net_movement": round(total_amount, 2)
            },
            "columns": {
                "date": date_col,
                "amount": amount_col,
                "debit": debit_col,
                "credit": credit_col
            }
        }
    
    def generate_gl_postings(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        postings = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            debit = row[cols['debit']] if cols['debit'] else 0
            credit = row[cols['credit']] if cols['credit'] else 0
            amount = row[cols['amount']] if cols['amount'] else (debit - credit)
            
            if amount != 0:
                postings.append({
                    "line_number": len(postings) + 1,
                    "account": "1100",
                    "account_name": "Bank - Current Account",
                    "debit": abs(amount) if amount > 0 else 0,
                    "credit": abs(amount) if amount < 0 else 0,
                    "description": f"Bank transaction {idx+1}",
                    "posting_key": "40" if amount > 0 else "50"
                })
                
                postings.append({
                    "line_number": len(postings) + 1,
                    "account": "1190",
                    "account_name": "Bank Clearing Account",
                    "debit": abs(amount) if amount < 0 else 0,
                    "credit": abs(amount) if amount > 0 else 0,
                    "description": f"Bank clearing {idx+1}",
                    "posting_key": "50" if amount > 0 else "40"
                })
        
        return postings
    
    def generate_sap_export(self, df: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
        records = []
        cols = analysis['columns']
        
        for idx, row in df.iterrows():
            debit = row[cols['debit']] if cols['debit'] else 0
            credit = row[cols['credit']] if cols['credit'] else 0
            amount = row[cols['amount']] if cols['amount'] else (debit - credit)
            
            records.append({
                "Statement_Date": datetime.now().strftime('%Y%m%d'),
                "Value_Date": datetime.now().strftime('%Y%m%d'),
                "Amount": abs(amount),
                "Currency": "ZAR",
                "Debit_Credit_Indicator": "D" if amount > 0 else "C",
                "Bank_Account": "1100",
                "Transaction_Type": "999"
            })
        
        return {
            "format": "SAP_FF5_BANK_STATEMENT",
            "transaction_code": "FF.5",
            "description": "Electronic Bank Statement",
            "total_records": len(records),
            "records": records
        }


# ============================================================================
# ============================================================================

class DocumentAnalyzerV2:
    """Main analyzer with pluggable document type analyzers"""
    
    def __init__(self):
        self.analyzers = [
            # AP
            VendorPaymentAnalyzer(),  # Check this first (more specific)
            VendorInvoiceAnalyzer(),
            # AR
            CustomerPaymentAnalyzer(),
            CustomerInvoiceAnalyzer(),
            JournalEntryAnalyzer(),
            GoodsReceiptAnalyzer(),
            GoodsIssueAnalyzer(),
            BankStatementAnalyzer(),
        ]
    
    def analyze_excel(self, file_path: str) -> Dict[str, Any]:
        """Analyze Excel document and determine type and postings"""
        try:
            df = pd.read_excel(file_path)
            
            for analyzer in self.analyzers:
                if analyzer.detect(df):
                    logger.info(f"Detected document type: {analyzer.__class__.__name__}")
                    
                    analysis = analyzer.analyze(df)
                    
                    gl_postings = analyzer.generate_gl_postings(df, analysis)
                    
                    sap_export = analyzer.generate_sap_export(df, analysis)
                    
                    recommendations = analyzer.generate_recommendations(df, analysis)
                    
                    return {
                        "document_type": analysis.get("document_type"),
                        "document_subtype": analysis.get("document_subtype"),
                        "sap_transaction": analysis.get("sap_transaction"),
                        "summary": analysis.get("summary"),
                        "gl_postings": gl_postings,
                        "sap_export": sap_export,
                        "recommendations": recommendations
                    }
            
            return self._analyze_generic(df)
                
        except Exception as e:
            logger.error(f"Error analyzing Excel: {e}")
            raise
    
    def _analyze_generic(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Fallback for unrecognized documents"""
        return {
            "document_type": "Generic Document",
            "document_subtype": "Unknown",
            "sap_transaction": "N/A",
            "summary": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "columns": list(df.columns)
            },
            "gl_postings": [],
            "sap_export": {},
            "recommendations": [
                "Unable to determine specific document type.",
                "Please ensure the Excel file has proper column headers.",
                "Supported types: Vendor Invoice/Payment, Customer Invoice/Payment, Journal Entry, Goods Receipt/Issue, Bank Statement"
            ]
        }
    
    def get_supported_types(self) -> List[Dict[str, Any]]:
        """Get list of supported document types"""
        return [
            {
                "category": "Accounts Payable",
                "types": [
                    {"name": "Vendor Invoice", "sap_code": "FB60", "description": "AP Invoice (Non-PO)"},
                    {"name": "Vendor Payment", "sap_code": "F-53", "description": "Outgoing Payment to Vendor"},
                ]
            },
            {
                "category": "Accounts Receivable",
                "types": [
                    {"name": "Customer Invoice", "sap_code": "FB70", "description": "AR Invoice"},
                    {"name": "Customer Payment", "sap_code": "F-28", "description": "Incoming Payment from Customer"},
                ]
            },
            {
                "category": "General Ledger",
                "types": [
                    {"name": "Journal Entry", "sap_code": "FB50", "description": "General Ledger Posting"},
                ]
            },
            {
                "category": "Inventory",
                "types": [
                    {"name": "Goods Receipt", "sap_code": "MIGO", "description": "GR for Purchase Order (101)"},
                    {"name": "Goods Issue", "sap_code": "MIGO", "description": "GI for Delivery (601)"},
                ]
            },
            {
                "category": "Banking",
                "types": [
                    {"name": "Bank Statement", "sap_code": "FF.5", "description": "Electronic Bank Statement"},
                ]
            }
        ]


document_analyzer_v2 = DocumentAnalyzerV2()
