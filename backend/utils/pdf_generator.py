"""
PDF Document Generation Engine
Generates professional documents: invoices, POs, quotes, reports, payslips
"""

from datetime import datetime
from typing import Dict, List, Optional
import json


class PDFGenerator:
    """PDF generation engine for all business documents"""
    
    def __init__(self):
        self.company_info = {
            "name": "Aria Demo Company (Pty) Ltd",
            "registration": "2024/123456/07",
            "vat_number": "4123456789",
            "address": "123 Business Street, Sandton, Johannesburg, 2196",
            "phone": "+27 11 123 4567",
            "email": "info@aria.com",
            "website": "www.aria.com"
        }
    
    def generate_tax_invoice(self, invoice_data: Dict) -> Dict:
        """Generate SA tax-compliant invoice"""
        subtotal = sum(item["quantity"] * item["unit_price"] for item in invoice_data.get("items", []))
        vat_amount = subtotal * 0.15
        total = subtotal + vat_amount
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }}
                .company {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
                .invoice-title {{ font-size: 32px; font-weight: bold; color: #e74c3c; margin: 20px 0; }}
                .info-section {{ margin: 30px 0; }}
                .info-row {{ margin: 10px 0; }}
                .label {{ font-weight: bold; width: 150px; display: inline-block; }}
                table {{ width: 100%; border-collapse: collapse; margin: 30px 0; }}
                th {{ background-color: #34495e; color: white; padding: 12px; text-align: left; }}
                td {{ padding: 10px; border-bottom: 1px solid #ddd; }}
                .totals {{ text-align: right; margin-top: 30px; }}
                .total-row {{ margin: 10px 0; font-size: 18px; }}
                .grand-total {{ font-size: 24px; font-weight: bold; color: #e74c3c; }}
                .footer {{ margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #7f8c8d; }}
                .tax-invoice {{ font-weight: bold; font-size: 28px; color: #c0392b; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company">{self.company_info['name']}</div>
                <div>{self.company_info['address']}</div>
                <div>VAT Reg: {self.company_info['vat_number']} | Tel: {self.company_info['phone']}</div>
            </div>
            
            <div class="invoice-title">TAX INVOICE</div>
            
            <div style="display: flex; justify-content: space-between;">
                <div class="info-section">
                    <div class="info-row"><span class="label">Invoice Number:</span> {invoice_data.get('invoice_number', 'INV-001')}</div>
                    <div class="info-row"><span class="label">Date:</span> {invoice_data.get('date', datetime.now().strftime('%Y-%m-%d'))}</div>
                    <div class="info-row"><span class="label">Due Date:</span> {invoice_data.get('due_date', datetime.now().strftime('%Y-%m-%d'))}</div>
                </div>
                
                <div class="info-section">
                    <div style="font-weight: bold; margin-bottom: 10px;">Bill To:</div>
                    <div>{invoice_data.get('customer_name', 'Customer Name')}</div>
                    <div>{invoice_data.get('customer_address', 'Customer Address')}</div>
                    <div>VAT: {invoice_data.get('customer_vat', 'N/A')}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: right;">Quantity</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {"".join([f'''
                    <tr>
                        <td>{item.get('description', '')}</td>
                        <td style="text-align: right;">{item.get('quantity', 0):.2f}</td>
                        <td style="text-align: right;">R {item.get('unit_price', 0):,.2f}</td>
                        <td style="text-align: right;">R {item.get('quantity', 0) * item.get('unit_price', 0):,.2f}</td>
                    </tr>
                    ''' for item in invoice_data.get('items', [])])}
                </tbody>
            </table>
            
            <div class="totals">
                <div class="total-row">Subtotal: R {subtotal:,.2f}</div>
                <div class="total-row">VAT (15%): R {vat_amount:,.2f}</div>
                <div class="total-row grand-total">Total: R {total:,.2f}</div>
            </div>
            
            <div class="footer">
                <div><strong>Banking Details:</strong></div>
                <div>Bank: Standard Bank | Account: 123456789 | Branch: 051001</div>
                <div style="margin-top: 20px;"><strong>Terms & Conditions:</strong> Payment due within 30 days. Late payments subject to interest.</div>
            </div>
        </body>
        </html>
        """
        
        return {
            "document_type": "tax_invoice",
            "invoice_number": invoice_data.get('invoice_number', 'INV-001'),
            "html_content": html_content,
            "pdf_url": f"/api/documents/pdf/{invoice_data.get('invoice_number', 'INV-001')}.pdf",
            "subtotal": subtotal,
            "vat_amount": vat_amount,
            "total": total
        }
    
    def generate_purchase_order(self, po_data: Dict) -> Dict:
        """Generate purchase order"""
        subtotal = sum(item["quantity"] * item["unit_price"] for item in po_data.get("items", []))
        vat_amount = subtotal * 0.15
        total = subtotal + vat_amount
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ text-align: center; border-bottom: 2px solid #27ae60; padding-bottom: 20px; }}
                .company {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
                .po-title {{ font-size: 32px; font-weight: bold; color: #27ae60; margin: 20px 0; }}
                table {{ width: 100%; border-collapse: collapse; margin: 30px 0; }}
                th {{ background-color: #27ae60; color: white; padding: 12px; text-align: left; }}
                td {{ padding: 10px; border-bottom: 1px solid #ddd; }}
                .totals {{ text-align: right; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company">{self.company_info['name']}</div>
                <div>{self.company_info['address']}</div>
            </div>
            
            <div class="po-title">PURCHASE ORDER</div>
            
            <div style="display: flex; justify-content: space-between;">
                <div>
                    <div><strong>PO Number:</strong> {po_data.get('po_number', 'PO-001')}</div>
                    <div><strong>Date:</strong> {po_data.get('date', datetime.now().strftime('%Y-%m-%d'))}</div>
                </div>
                
                <div>
                    <div style="font-weight: bold;">Supplier:</div>
                    <div>{po_data.get('supplier_name', 'Supplier Name')}</div>
                    <div>{po_data.get('supplier_address', 'Supplier Address')}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align: right;">Quantity</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {"".join([f'''
                    <tr>
                        <td>{item.get('description', '')}</td>
                        <td style="text-align: right;">{item.get('quantity', 0):.2f}</td>
                        <td style="text-align: right;">R {item.get('unit_price', 0):,.2f}</td>
                        <td style="text-align: right;">R {item.get('quantity', 0) * item.get('unit_price', 0):,.2f}</td>
                    </tr>
                    ''' for item in po_data.get('items', [])])}
                </tbody>
            </table>
            
            <div class="totals">
                <div>Subtotal: R {subtotal:,.2f}</div>
                <div>VAT (15%): R {vat_amount:,.2f}</div>
                <div style="font-size: 20px; font-weight: bold;">Total: R {total:,.2f}</div>
            </div>
        </body>
        </html>
        """
        
        return {
            "document_type": "purchase_order",
            "po_number": po_data.get('po_number', 'PO-001'),
            "html_content": html_content,
            "pdf_url": f"/api/documents/pdf/{po_data.get('po_number', 'PO-001')}.pdf",
            "total": total
        }
    
    def generate_quotation(self, quote_data: Dict) -> Dict:
        """Generate quotation"""
        subtotal = sum(item["quantity"] * item["unit_price"] for item in quote_data.get("items", []))
        vat_amount = subtotal * 0.15
        total = subtotal + vat_amount
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 20px; }}
                .quote-title {{ font-size: 32px; font-weight: bold; color: #3498db; margin: 20px 0; }}
                table {{ width: 100%; border-collapse: collapse; margin: 30px 0; }}
                th {{ background-color: #3498db; color: white; padding: 12px; }}
                td {{ padding: 10px; border-bottom: 1px solid #ddd; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div style="font-size: 24px; font-weight: bold;">{self.company_info['name']}</div>
            </div>
            <div class="quote-title">QUOTATION</div>
            <div><strong>Quote Number:</strong> {quote_data.get('quote_number', 'QT-001')}</div>
            <div><strong>Valid Until:</strong> {quote_data.get('valid_until', datetime.now().strftime('%Y-%m-%d'))}</div>
            
            <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                    {"".join([f"<tr><td>{item['description']}</td><td>{item['quantity']}</td><td>R {item['unit_price']:,.2f}</td><td>R {item['quantity'] * item['unit_price']:,.2f}</td></tr>" for item in quote_data.get('items', [])])}
                </tbody>
            </table>
            
            <div style="text-align: right;">
                <div>Subtotal: R {subtotal:,.2f}</div>
                <div>VAT (15%): R {vat_amount:,.2f}</div>
                <div style="font-size: 20px; font-weight: bold;">Total: R {total:,.2f}</div>
            </div>
        </body>
        </html>
        """
        
        return {
            "document_type": "quotation",
            "quote_number": quote_data.get('quote_number', 'QT-001'),
            "html_content": html_content,
            "pdf_url": f"/api/documents/pdf/{quote_data.get('quote_number', 'QT-001')}.pdf",
            "total": total
        }
    
    def generate_payslip(self, payslip_data: Dict) -> Dict:
        """Generate SA payslip"""
        basic_salary = payslip_data.get('basic_salary', 0)
        allowances = payslip_data.get('allowances', 0)
        gross_salary = basic_salary + allowances
        
        paye = gross_salary * 0.18  # Simplified PAYE
        uif = min(gross_salary * 0.01, 177.12)  # UIF capped
        total_deductions = paye + uif
        net_salary = gross_salary - total_deductions
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ text-align: center; background-color: #34495e; color: white; padding: 20px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th, td {{ padding: 10px; border: 1px solid #ddd; }}
                th {{ background-color: #ecf0f1; text-align: left; }}
                .total {{ font-weight: bold; background-color: #3498db; color: white; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>PAYSLIP</h2>
                <div>{payslip_data.get('period', 'October 2025')}</div>
            </div>
            
            <div style="margin: 20px 0;">
                <div><strong>Employee:</strong> {payslip_data.get('employee_name', 'Employee Name')}</div>
                <div><strong>Employee Number:</strong> {payslip_data.get('employee_number', 'EMP001')}</div>
                <div><strong>ID Number:</strong> {payslip_data.get('id_number', '1234567890123')}</div>
            </div>
            
            <table>
                <tr><th colspan="2">EARNINGS</th></tr>
                <tr><td>Basic Salary</td><td style="text-align: right;">R {basic_salary:,.2f}</td></tr>
                <tr><td>Allowances</td><td style="text-align: right;">R {allowances:,.2f}</td></tr>
                <tr class="total"><td>Gross Salary</td><td style="text-align: right;">R {gross_salary:,.2f}</td></tr>
            </table>
            
            <table>
                <tr><th colspan="2">DEDUCTIONS</th></tr>
                <tr><td>PAYE</td><td style="text-align: right;">R {paye:,.2f}</td></tr>
                <tr><td>UIF</td><td style="text-align: right;">R {uif:,.2f}</td></tr>
                <tr class="total"><td>Total Deductions</td><td style="text-align: right;">R {total_deductions:,.2f}</td></tr>
            </table>
            
            <table>
                <tr class="total"><td><strong>NET SALARY</strong></td><td style="text-align: right;"><strong>R {net_salary:,.2f}</strong></td></tr>
            </table>
        </body>
        </html>
        """
        
        return {
            "document_type": "payslip",
            "employee_name": payslip_data.get('employee_name'),
            "html_content": html_content,
            "net_salary": net_salary
        }
    
    def generate_financial_report(self, report_type: str, report_data: Dict) -> Dict:
        """Generate financial reports (Trial Balance, P&L, Balance Sheet)"""
        
        if report_type == "trial_balance":
            accounts_html = "".join([
                f"<tr><td>{acc['code']}</td><td>{acc['name']}</td><td style='text-align: right;'>R {acc['debit']:,.2f}</td><td style='text-align: right;'>R {acc['credit']:,.2f}</td></tr>"
                for acc in report_data.get('accounts', [])
            ])
            
            html_content = f"""
            <!DOCTYPE html>
            <html><head><style>
                body {{ font-family: Arial; margin: 40px; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th, td {{ padding: 10px; border: 1px solid #ddd; }}
                th {{ background-color: #34495e; color: white; }}
                .total {{ font-weight: bold; background-color: #ecf0f1; }}
            </style></head><body>
                <h1>TRIAL BALANCE</h1>
                <div>As at: {report_data.get('report_date', datetime.now().strftime('%Y-%m-%d'))}</div>
                <table>
                    <tr><th>Code</th><th>Account</th><th>Debit</th><th>Credit</th></tr>
                    {accounts_html}
                    <tr class="total">
                        <td colspan="2">TOTAL</td>
                        <td style="text-align: right;">R {report_data.get('total_debit', 0):,.2f}</td>
                        <td style="text-align: right;">R {report_data.get('total_credit', 0):,.2f}</td>
                    </tr>
                </table>
            </body></html>
            """
        
        return {
            "document_type": f"report_{report_type}",
            "html_content": html_content,
            "pdf_url": f"/api/reports/pdf/{report_type}.pdf"
        }


# Global PDF generator instance
pdf_generator = PDFGenerator()
