"""
PDF Generation Service for Document Printing
Generates professional PDF documents for all transactional documents
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import psycopg2
import psycopg2.extras
from database import get_db_connection


class PDFGenerator:
    """Generate professional PDF documents for ERP transactions"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.page_width, self.page_height = A4
        
    def _get_company_info(self, company_id: str) -> Dict[str, Any]:
        """Get company information for document header"""
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            cursor.execute("""
                SELECT name, address_line1, address_line2, city, state_province, 
                       postal_code, country, phone, email, tax_number, vat_number,
                       registration_number, logo_url
                FROM companies WHERE id = %s
            """, [company_id])
            return dict(cursor.fetchone() or {})
        finally:
            cursor.close()
            conn.close()
    
    def _create_header(self, company_info: Dict[str, Any], doc_title: str) -> List:
        """Create document header with company info"""
        elements = []
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        company_style = ParagraphStyle(
            'CompanyInfo',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_LEFT
        )
        
        elements.append(Paragraph(f"<b>{company_info.get('name', 'Company Name')}</b>", company_style))
        
        address_parts = [
            company_info.get('address_line1'),
            company_info.get('city'),
            company_info.get('postal_code')
        ]
        address = ', '.join([p for p in address_parts if p])
        if address:
            elements.append(Paragraph(address, company_style))
        
        if company_info.get('phone'):
            elements.append(Paragraph(f"Tel: {company_info['phone']}", company_style))
        if company_info.get('email'):
            elements.append(Paragraph(f"Email: {company_info['email']}", company_style))
        if company_info.get('tax_number'):
            elements.append(Paragraph(f"Tax No: {company_info['tax_number']}", company_style))
        
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(doc_title, title_style))
        elements.append(Spacer(1, 20))
        
        return elements
    
    def generate_invoice_pdf(self, invoice_id: str, company_id: str) -> BytesIO:
        """Generate invoice PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30,
                               topMargin=30, bottomMargin=30)
        
        elements = []
        company_info = self._get_company_info(company_id)
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT ci.*, c.name as customer_name, c.email as customer_email,
                       c.phone as customer_phone, c.address_line1, c.city, c.postal_code
                FROM customer_invoices ci
                LEFT JOIN customers c ON ci.customer_id = c.id
                WHERE ci.id = %s AND ci.company_id = %s
            """, [invoice_id, company_id])
            invoice = dict(cursor.fetchone() or {})
            
            if not invoice:
                raise ValueError(f"Invoice {invoice_id} not found")
            
            cursor.execute("""
                SELECT * FROM customer_invoice_lines
                WHERE invoice_id = %s
                ORDER BY line_number
            """, [invoice_id])
            lines = [dict(row) for row in cursor.fetchall()]
            
        finally:
            cursor.close()
            conn.close()
        
        elements.extend(self._create_header(company_info, "INVOICE"))
        
        info_data = [
            ['Invoice Number:', invoice.get('invoice_number', 'N/A')],
            ['Invoice Date:', str(invoice.get('invoice_date', ''))],
            ['Due Date:', str(invoice.get('due_date', ''))],
            ['Status:', invoice.get('status', 'DRAFT')]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 3*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1976d2')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        customer_style = ParagraphStyle('Customer', parent=self.styles['Normal'], fontSize=10)
        elements.append(Paragraph("<b>Bill To:</b>", customer_style))
        elements.append(Paragraph(invoice.get('customer_name', 'N/A'), customer_style))
        if invoice.get('address_line1'):
            elements.append(Paragraph(f"{invoice['address_line1']}, {invoice.get('city', '')}", customer_style))
        elements.append(Spacer(1, 20))
        
        line_data = [['Item', 'Description', 'Qty', 'Unit Price', 'Tax', 'Amount']]
        for line in lines:
            line_data.append([
                line.get('item_code', ''),
                line.get('description', ''),
                str(line.get('quantity', 0)),
                f"{float(line.get('unit_price', 0)):.2f}",
                f"{float(line.get('tax_amount', 0)):.2f}",
                f"{float(line.get('line_total', 0)):.2f}"
            ])
        
        line_table = Table(line_data, colWidths=[1*inch, 2.5*inch, 0.7*inch, 1*inch, 0.8*inch, 1*inch])
        line_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 20))
        
        totals_data = [
            ['Subtotal:', f"{float(invoice.get('subtotal', 0)):.2f}"],
            ['Tax:', f"{float(invoice.get('tax_amount', 0)):.2f}"],
            ['Total:', f"{float(invoice.get('total_amount', 0)):.2f}"]
        ]
        
        totals_table = Table(totals_data, colWidths=[1.5*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.black),
        ]))
        elements.append(totals_table)
        
        if invoice.get('notes'):
            elements.append(Spacer(1, 30))
            notes_style = ParagraphStyle('Notes', parent=self.styles['Normal'], fontSize=9)
            elements.append(Paragraph(f"<b>Notes:</b> {invoice['notes']}", notes_style))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_quote_pdf(self, quote_id: str, company_id: str) -> BytesIO:
        """Generate quote PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30,
                               topMargin=30, bottomMargin=30)
        
        elements = []
        company_info = self._get_company_info(company_id)
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT q.*, c.name as customer_name, c.email as customer_email,
                       c.phone as customer_phone
                FROM quotes q
                LEFT JOIN customers c ON q.customer_id = c.id
                WHERE q.id = %s AND q.company_id = %s
            """, [quote_id, company_id])
            quote = dict(cursor.fetchone() or {})
            
            if not quote:
                raise ValueError(f"Quote {quote_id} not found")
            
            cursor.execute("""
                SELECT * FROM quote_lines
                WHERE quote_id = %s
                ORDER BY line_number
            """, [quote_id])
            lines = [dict(row) for row in cursor.fetchall()]
            
        finally:
            cursor.close()
            conn.close()
        
        elements.extend(self._create_header(company_info, "QUOTATION"))
        
        info_data = [
            ['Quote Number:', quote.get('quote_number', 'N/A')],
            ['Quote Date:', str(quote.get('quote_date', ''))],
            ['Valid Until:', str(quote.get('valid_until', ''))],
            ['Status:', quote.get('status', 'DRAFT')]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 3*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1976d2')),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        customer_style = ParagraphStyle('Customer', parent=self.styles['Normal'], fontSize=10)
        elements.append(Paragraph("<b>Prepared For:</b>", customer_style))
        elements.append(Paragraph(quote.get('customer_name', 'N/A'), customer_style))
        elements.append(Spacer(1, 20))
        
        line_data = [['Item', 'Description', 'Qty', 'Unit Price', 'Amount']]
        for line in lines:
            line_data.append([
                line.get('item_code', ''),
                line.get('description', ''),
                str(line.get('quantity', 0)),
                f"{float(line.get('unit_price', 0)):.2f}",
                f"{float(line.get('line_total', 0)):.2f}"
            ])
        
        line_table = Table(line_data, colWidths=[1*inch, 3*inch, 0.8*inch, 1.2*inch, 1*inch])
        line_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 20))
        
        totals_data = [
            ['Total:', f"{float(quote.get('total_amount', 0)):.2f}"]
        ]
        totals_table = Table(totals_data, colWidths=[1.5*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
        ]))
        elements.append(totals_table)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_purchase_order_pdf(self, po_id: str, company_id: str) -> BytesIO:
        """Generate purchase order PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30,
                               topMargin=30, bottomMargin=30)
        
        elements = []
        company_info = self._get_company_info(company_id)
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        try:
            cursor.execute("""
                SELECT po.*, s.name as supplier_name, s.email as supplier_email,
                       s.phone as supplier_phone
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = %s AND po.company_id = %s
            """, [po_id, company_id])
            po = dict(cursor.fetchone() or {})
            
            if not po:
                raise ValueError(f"Purchase Order {po_id} not found")
            
            cursor.execute("""
                SELECT * FROM purchase_order_lines
                WHERE purchase_order_id = %s
                ORDER BY line_number
            """, [po_id])
            lines = [dict(row) for row in cursor.fetchall()]
            
        finally:
            cursor.close()
            conn.close()
        
        elements.extend(self._create_header(company_info, "PURCHASE ORDER"))
        
        info_data = [
            ['PO Number:', po.get('po_number', 'N/A')],
            ['PO Date:', str(po.get('po_date', ''))],
            ['Delivery Date:', str(po.get('delivery_date', ''))],
            ['Status:', po.get('status', 'DRAFT')]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 3*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1976d2')),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        supplier_style = ParagraphStyle('Supplier', parent=self.styles['Normal'], fontSize=10)
        elements.append(Paragraph("<b>Supplier:</b>", supplier_style))
        elements.append(Paragraph(po.get('supplier_name', 'N/A'), supplier_style))
        elements.append(Spacer(1, 20))
        
        line_data = [['Item', 'Description', 'Qty', 'Unit Price', 'Amount']]
        for line in lines:
            line_data.append([
                line.get('item_code', ''),
                line.get('description', ''),
                str(line.get('quantity', 0)),
                f"{float(line.get('unit_price', 0)):.2f}",
                f"{float(line.get('line_total', 0)):.2f}"
            ])
        
        line_table = Table(line_data, colWidths=[1*inch, 3*inch, 0.8*inch, 1.2*inch, 1*inch])
        line_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 20))
        
        totals_data = [
            ['Total:', f"{float(po.get('total_amount', 0)):.2f}"]
        ]
        totals_table = Table(totals_data, colWidths=[1.5*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
        ]))
        elements.append(totals_table)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer


pdf_generator = PDFGenerator()
