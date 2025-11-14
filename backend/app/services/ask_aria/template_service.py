"""
Document Template and Export Service
Generates PDF/DOCX exports for ERP documents
"""
import os
import uuid
from typing import Dict, Any, Optional
from pathlib import Path
import psycopg2
import psycopg2.extras
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class TemplateService:
    """Service for document template management and export"""
    
    def __init__(self, db_connection_string: str, template_path: str = "/var/www/aria/templates"):
        self.db_connection_string = db_connection_string
        self.template_path = template_path
        os.makedirs(template_path, exist_ok=True)
    
    def get_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_connection_string)
    
    def render_quote_pdf(self, quote_id: str, company_id: str) -> bytes:
        """
        Render a quote as PDF
        
        Args:
            quote_id: UUID of the quote
            company_id: Company ID for scoping
            
        Returns:
            PDF bytes
        """
        try:
            quote_data = self._get_quote_data(quote_id, company_id)
            html = self._render_quote_html(quote_data)
            pdf_bytes = self._html_to_pdf(html)
            
            logger.info(f"Rendered quote {quote_id} as PDF")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Failed to render quote PDF: {str(e)}")
            raise
    
    def render_purchase_order_pdf(self, po_id: str, company_id: str) -> bytes:
        """
        Render a purchase order as PDF
        
        Args:
            po_id: UUID of the purchase order
            company_id: Company ID for scoping
            
        Returns:
            PDF bytes
        """
        try:
            po_data = self._get_po_data(po_id, company_id)
            html = self._render_po_html(po_data)
            pdf_bytes = self._html_to_pdf(html)
            
            logger.info(f"Rendered PO {po_id} as PDF")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Failed to render PO PDF: {str(e)}")
            raise
    
    def _get_quote_data(self, quote_id: str, company_id: str) -> Dict[str, Any]:
        """Get quote data with all related information"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT q.*, 
                               c.name as customer_name, c.email as customer_email,
                               c.phone as customer_phone, c.address as customer_address,
                               c.city as customer_city, c.country as customer_country,
                               comp.name as company_name, comp.address as company_address,
                               comp.city as company_city, comp.country as company_country,
                               comp.phone as company_phone, comp.email as company_email
                        FROM quotes q
                        JOIN customers c ON q.customer_id = c.id
                        JOIN companies comp ON q.company_id = comp.id
                        WHERE q.id = %s AND q.company_id = %s
                    """, (quote_id, company_id))
                    
                    quote = cur.fetchone()
                    if not quote:
                        raise ValueError(f"Quote {quote_id} not found")
                    
                    cur.execute("""
                        SELECT ql.*, p.name as product_name, p.sku as product_sku,
                               p.description as product_description
                        FROM quote_lines ql
                        JOIN products p ON ql.product_id = p.id
                        WHERE ql.quote_id = %s
                        ORDER BY ql.created_at
                    """, (quote_id,))
                    
                    lines = cur.fetchall()
                    
                    return {
                        "quote": dict(quote),
                        "lines": [dict(line) for line in lines]
                    }
                    
        except Exception as e:
            logger.error(f"Failed to get quote data: {str(e)}")
            raise
    
    def _get_po_data(self, po_id: str, company_id: str) -> Dict[str, Any]:
        """Get purchase order data with all related information"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT po.*, 
                               s.name as supplier_name, s.email as supplier_email,
                               s.phone as supplier_phone, s.address as supplier_address,
                               s.city as supplier_city, s.country as supplier_country,
                               comp.name as company_name, comp.address as company_address,
                               comp.city as company_city, comp.country as company_country,
                               comp.phone as company_phone, comp.email as company_email
                        FROM purchase_orders po
                        JOIN suppliers s ON po.supplier_id = s.id
                        JOIN companies comp ON po.company_id = comp.id
                        WHERE po.id = %s AND po.company_id = %s
                    """, (po_id, company_id))
                    
                    po = cur.fetchone()
                    if not po:
                        raise ValueError(f"Purchase order {po_id} not found")
                    
                    cur.execute("""
                        SELECT pol.*, p.name as product_name, p.sku as product_sku,
                               p.description as product_description
                        FROM purchase_order_lines pol
                        JOIN products p ON pol.product_id = p.id
                        WHERE pol.purchase_order_id = %s
                        ORDER BY pol.created_at
                    """, (po_id,))
                    
                    lines = cur.fetchall()
                    
                    return {
                        "po": dict(po),
                        "lines": [dict(line) for line in lines]
                    }
                    
        except Exception as e:
            logger.error(f"Failed to get PO data: {str(e)}")
            raise
    
    def _render_quote_html(self, data: Dict[str, Any]) -> str:
        """Render quote data as HTML"""
        quote = data['quote']
        lines = data['lines']
        
        lines_html = ""
        for line in lines:
            lines_html += f"""
            <tr>
                <td>{line['product_sku']}</td>
                <td>{line['product_name']}</td>
                <td style="text-align: right;">{line['quantity']}</td>
                <td style="text-align: right;">${line['unit_price']:.2f}</td>
                <td style="text-align: right;">{line.get('discount_percent', 0):.1f}%</td>
                <td style="text-align: right;">${line['line_total']:.2f}</td>
            </tr>
            """
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
                .company-info {{ text-align: left; }}
                .customer-info {{ text-align: right; }}
                h1 {{ color: #333; margin-bottom: 5px; }}
                .doc-number {{ color: #666; font-size: 14px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th {{ background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }}
                td {{ padding: 10px; border-bottom: 1px solid #eee; }}
                .totals {{ margin-top: 20px; text-align: right; }}
                .totals table {{ width: 300px; margin-left: auto; }}
                .total-row {{ font-weight: bold; font-size: 16px; }}
                .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-info">
                    <h1>{quote['company_name']}</h1>
                    <p>{quote.get('company_address', '')}<br>
                    {quote.get('company_city', '')}, {quote.get('company_country', '')}<br>
                    Phone: {quote.get('company_phone', '')}<br>
                    Email: {quote.get('company_email', '')}</p>
                </div>
                <div class="customer-info">
                    <h2>QUOTATION</h2>
                    <p class="doc-number">{quote['quote_number']}</p>
                    <p>Date: {quote['quote_date']}<br>
                    Valid Until: {quote['valid_until']}</p>
                </div>
            </div>
            
            <div class="customer-section">
                <h3>Bill To:</h3>
                <p><strong>{quote['customer_name']}</strong><br>
                {quote.get('customer_address', '')}<br>
                {quote.get('customer_city', '')}, {quote.get('customer_country', '')}<br>
                Phone: {quote.get('customer_phone', '')}<br>
                Email: {quote.get('customer_email', '')}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Description</th>
                        <th style="text-align: right;">Quantity</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Discount</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {lines_html}
                </tbody>
            </table>
            
            <div class="totals">
                <table>
                    <tr>
                        <td>Subtotal:</td>
                        <td style="text-align: right;">${quote['subtotal']:.2f}</td>
                    </tr>
                    <tr>
                        <td>Tax:</td>
                        <td style="text-align: right;">${quote['tax_amount']:.2f}</td>
                    </tr>
                    <tr class="total-row">
                        <td>Total:</td>
                        <td style="text-align: right;">${quote['total_amount']:.2f}</td>
                    </tr>
                </table>
            </div>
            
            {f'<div class="footer"><p><strong>Notes:</strong><br>{quote["notes"]}</p></div>' if quote.get('notes') else ''}
            
            <div class="footer">
                <p>Thank you for your business!</p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _render_po_html(self, data: Dict[str, Any]) -> str:
        """Render purchase order data as HTML"""
        po = data['po']
        lines = data['lines']
        
        lines_html = ""
        for line in lines:
            lines_html += f"""
            <tr>
                <td>{line['product_sku']}</td>
                <td>{line['product_name']}</td>
                <td style="text-align: right;">{line['quantity']}</td>
                <td style="text-align: right;">${line['unit_price']:.2f}</td>
                <td style="text-align: right;">${line['line_total']:.2f}</td>
            </tr>
            """
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
                h1 {{ color: #333; margin-bottom: 5px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th {{ background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }}
                td {{ padding: 10px; border-bottom: 1px solid #eee; }}
                .totals {{ margin-top: 20px; text-align: right; }}
                .total-row {{ font-weight: bold; font-size: 16px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>{po['company_name']}</h1>
                    <p>{po.get('company_address', '')}</p>
                </div>
                <div>
                    <h2>PURCHASE ORDER</h2>
                    <p>{po['po_number']}<br>Date: {po['po_date']}</p>
                </div>
            </div>
            
            <div>
                <h3>Supplier:</h3>
                <p><strong>{po['supplier_name']}</strong><br>
                {po.get('supplier_address', '')}<br>
                Phone: {po.get('supplier_phone', '')}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Description</th>
                        <th style="text-align: right;">Quantity</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {lines_html}
                </tbody>
            </table>
            
            <div class="totals">
                <p><strong>Total: ${po['total_amount']:.2f}</strong></p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _html_to_pdf(self, html: str) -> bytes:
        """Convert HTML to PDF using WeasyPrint"""
        try:
            from weasyprint import HTML
            pdf_bytes = HTML(string=html).write_pdf()
            return pdf_bytes
        except ImportError:
            logger.warning("WeasyPrint not available - returning HTML as bytes")
            return html.encode('utf-8')
        except Exception as e:
            logger.error(f"PDF generation failed: {str(e)}")
            return html.encode('utf-8')
