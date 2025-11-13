"""
PDF Generation Service for ARIA ERP
Generates professional PDF documents for quotes, invoices, orders, etc.
"""
import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal

logger = logging.getLogger(__name__)


class PDFService:
    """
    PDF generation service for ARIA ERP documents
    
    Generates simple HTML-based PDFs for all document types.
    Can be upgraded to use ReportLab for more professional output.
    """
    
    def __init__(self):
        self.company_name = os.getenv("COMPANY_NAME", "ARIA ERP")
        self.company_address = os.getenv("COMPANY_ADDRESS", "123 Business St, Cape Town, South Africa")
        self.company_phone = os.getenv("COMPANY_PHONE", "+27 21 123 4567")
        self.company_email = os.getenv("COMPANY_EMAIL", "info@aria.vantax.co.za")
    
    def generate_quote_pdf(self, quote_data: Dict[str, Any]) -> bytes:
        """Generate PDF for a quote"""
        html = self._generate_document_html(
            title="QUOTATION",
            doc_number=quote_data.get('quote_number', 'N/A'),
            doc_date=quote_data.get('quote_date', date.today()),
            customer_name=quote_data.get('customer_name', 'N/A'),
            customer_email=quote_data.get('customer_email', ''),
            customer_address=quote_data.get('customer_address', ''),
            line_items=quote_data.get('line_items', []),
            subtotal=quote_data.get('subtotal', 0),
            tax_amount=quote_data.get('tax_amount', 0),
            total_amount=quote_data.get('total_amount', 0),
            notes=quote_data.get('notes', ''),
            extra_info=f"Valid Until: {quote_data.get('valid_until', date.today()).strftime('%Y-%m-%d')}"
        )
        return html.encode('utf-8')
    
    def generate_invoice_pdf(self, invoice_data: Dict[str, Any]) -> bytes:
        """Generate PDF for an invoice"""
        html = self._generate_document_html(
            title="INVOICE",
            doc_number=invoice_data.get('invoice_number', 'N/A'),
            doc_date=invoice_data.get('invoice_date', date.today()),
            customer_name=invoice_data.get('customer_name', 'N/A'),
            customer_email=invoice_data.get('customer_email', ''),
            customer_address=invoice_data.get('customer_address', ''),
            line_items=invoice_data.get('line_items', []),
            subtotal=invoice_data.get('subtotal', 0),
            tax_amount=invoice_data.get('tax_amount', 0),
            total_amount=invoice_data.get('total_amount', 0),
            notes=invoice_data.get('notes', ''),
            extra_info=f"Due Date: {invoice_data.get('due_date', date.today()).strftime('%Y-%m-%d')}"
        )
        return html.encode('utf-8')
    
    def generate_sales_order_pdf(self, order_data: Dict[str, Any]) -> bytes:
        """Generate PDF for a sales order"""
        html = self._generate_document_html(
            title="SALES ORDER",
            doc_number=order_data.get('order_number', 'N/A'),
            doc_date=order_data.get('order_date', date.today()),
            customer_name=order_data.get('customer_name', 'N/A'),
            customer_email=order_data.get('customer_email', ''),
            customer_address=order_data.get('customer_address', ''),
            line_items=order_data.get('line_items', []),
            subtotal=order_data.get('subtotal', 0),
            tax_amount=order_data.get('tax_amount', 0),
            total_amount=order_data.get('total_amount', 0),
            notes=order_data.get('notes', ''),
            extra_info=f"Required Date: {order_data.get('required_date', date.today()).strftime('%Y-%m-%d')}"
        )
        return html.encode('utf-8')
    
    def generate_delivery_pdf(self, delivery_data: Dict[str, Any]) -> bytes:
        """Generate PDF for a delivery note"""
        html = self._generate_document_html(
            title="DELIVERY NOTE",
            doc_number=delivery_data.get('delivery_number', 'N/A'),
            doc_date=delivery_data.get('delivery_date', date.today()),
            customer_name=delivery_data.get('customer_name', 'N/A'),
            customer_email=delivery_data.get('customer_email', ''),
            customer_address=delivery_data.get('customer_address', ''),
            line_items=delivery_data.get('line_items', []),
            subtotal=0,
            tax_amount=0,
            total_amount=0,
            notes=delivery_data.get('notes', ''),
            extra_info=f"Tracking: {delivery_data.get('tracking_number', 'N/A')}"
        )
        return html.encode('utf-8')
    
    def _generate_document_html(
        self,
        title: str,
        doc_number: str,
        doc_date: date,
        customer_name: str,
        customer_email: str,
        customer_address: str,
        line_items: List[Dict],
        subtotal: float,
        tax_amount: float,
        total_amount: float,
        notes: str,
        extra_info: str = ""
    ) -> str:
        """Generate HTML for any document type"""
        
        items_html = ""
        for idx, item in enumerate(line_items, 1):
            items_html += f"""
            <tr>
                <td>{idx}</td>
                <td>{item.get('product_name', item.get('description', 'N/A'))}</td>
                <td>{item.get('quantity', 0)}</td>
                <td>${float(item.get('unit_price', 0)):.2f}</td>
                <td>${float(item.get('line_total', 0)):.2f}</td>
            </tr>
            """
        
        totals_html = ""
        if subtotal > 0 or tax_amount > 0 or total_amount > 0:
            totals_html = f"""
            <div class="totals">
                <p>Subtotal: ${float(subtotal):.2f}</p>
                <p>Tax (15%): ${float(tax_amount):.2f}</p>
                <p class="total-row">Total: ${float(total_amount):.2f}</p>
            </div>
            """
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ text-align: center; color: #1a73e8; margin-bottom: 30px; }}
                .info {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
                table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
                th {{ background-color: #1a73e8; color: white; padding: 10px; text-align: left; }}
                td {{ padding: 8px; border-bottom: 1px solid #ddd; }}
                .totals {{ text-align: right; margin-top: 20px; }}
                .total-row {{ font-weight: bold; font-size: 16px; color: #1a73e8; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{title}</h1>
            </div>
            
            <div class="info">
                <div>
                    <strong>{self.company_name}</strong><br>
                    {self.company_address}<br>
                    Tel: {self.company_phone}<br>
                    Email: {self.company_email}
                </div>
                <div style="text-align: right;">
                    <strong>Document #:</strong> {doc_number}<br>
                    <strong>Date:</strong> {doc_date.strftime('%Y-%m-%d') if isinstance(doc_date, date) else doc_date}<br>
                    {extra_info}
                </div>
            </div>
            
            <div style="margin-bottom: 30px;">
                <strong>Customer:</strong><br>
                {customer_name}<br>
                {customer_email}<br>
                {customer_address}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            
            {totals_html}
            
            {f'<div style="margin-top: 30px;"><strong>Notes:</strong><br>{notes}</div>' if notes else ''}
        </body>
        </html>
        """
        
        return html


_pdf_service: Optional[PDFService] = None


def get_pdf_service() -> PDFService:
    """Get or create global PDF service instance"""
    global _pdf_service
    if _pdf_service is None:
        _pdf_service = PDFService()
    return _pdf_service
