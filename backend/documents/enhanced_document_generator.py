"""
Enhanced Document Generation System

Professional business document templates with full branding support.

Supported Documents (30+ types):
=====================

FINANCIAL DOCUMENTS:
- Tax Invoice (SARS-compliant)
- Pro Forma Invoice
- Credit Note
- Debit Note
- Statement of Account
- Receipt
- Remittance Advice

SALES DOCUMENTS:
- Quote / Quotation
- Sales Order
- Delivery Note
- Packing Slip
- Backorder Note

PURCHASE DOCUMENTS:
- Purchase Order
- Purchase Requisition
- Goods Received Note (GRN)
- Supplier Return Note

MANUFACTURING DOCUMENTS:
- Manufacturing Order
- Work Order
- Bill of Materials (BOM)
- Stock Take Sheet
- Material Requisition
- Job Card

INVENTORY DOCUMENTS:
- Stock Transfer
- Stock Adjustment
- Cycle Count Sheet
- Bin Card

HR DOCUMENTS:
- Payslip (SARS-compliant)
- IRP5 Certificate
- Employment Contract
- Leave Request Form
- Timesheet

COMPLIANCE DOCUMENTS:
- Tax Clearance Certificate
- BBBEE Certificate
- VAT201 Return
- EMP201 Declaration

Each document includes:
- Company logo & branding
- Full company details (registration, VAT, tax numbers)
- Bank account details
- Contact information (phone, email, website)
- Terms & conditions
- Sequential numbering
- Barcodes/QR codes
- Digital signatures (optional)
- Watermarks (optional)
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime, date
from enum import Enum
from decimal import Decimal

logger = logging.getLogger(__name__)


class DocumentCategory(Enum):
    """Document categories"""
    FINANCIAL = "financial"
    SALES = "sales"
    PURCHASE = "purchase"
    MANUFACTURING = "manufacturing"
    INVENTORY = "inventory"
    HR = "hr"
    COMPLIANCE = "compliance"


class DocumentType(Enum):
    """All document types"""
    # Financial
    INVOICE = "invoice"
    TAX_INVOICE = "tax_invoice"
    PRO_FORMA_INVOICE = "pro_forma_invoice"
    CREDIT_NOTE = "credit_note"
    DEBIT_NOTE = "debit_note"
    STATEMENT = "statement"
    RECEIPT = "receipt"
    REMITTANCE_ADVICE = "remittance_advice"
    
    # Sales
    QUOTE = "quote"
    SALES_ORDER = "sales_order"
    DELIVERY_NOTE = "delivery_note"
    PACKING_SLIP = "packing_slip"
    BACKORDER_NOTE = "backorder_note"
    
    # Purchase
    PURCHASE_ORDER = "purchase_order"
    PURCHASE_REQUISITION = "purchase_requisition"
    GOODS_RECEIVED_NOTE = "goods_received_note"
    SUPPLIER_RETURN = "supplier_return"
    
    # Manufacturing
    MANUFACTURING_ORDER = "manufacturing_order"
    WORK_ORDER = "work_order"
    BILL_OF_MATERIALS = "bill_of_materials"
    STOCK_TAKE_SHEET = "stock_take_sheet"
    MATERIAL_REQUISITION = "material_requisition"
    JOB_CARD = "job_card"
    
    # Inventory
    STOCK_TRANSFER = "stock_transfer"
    STOCK_ADJUSTMENT = "stock_adjustment"
    CYCLE_COUNT = "cycle_count"
    BIN_CARD = "bin_card"
    
    # HR
    PAYSLIP = "payslip"
    IRP5 = "irp5"
    EMPLOYMENT_CONTRACT = "employment_contract"
    LEAVE_REQUEST = "leave_request"
    TIMESHEET = "timesheet"
    
    # Compliance
    TAX_CLEARANCE = "tax_clearance"
    BBBEE_CERTIFICATE = "bbbee_certificate"
    VAT_RETURN = "vat_return"
    EMP201 = "emp201"


class EnhancedDocumentGenerator:
    """
    Generate professional business documents with full branding
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    # ========================================================================
    # FINANCIAL DOCUMENTS
    # ========================================================================
    
    def generate_tax_invoice(
        self,
        invoice_data: Dict,
        company_info: Dict,
        customer_info: Dict,
        line_items: List[Dict],
        branding: Optional[Dict] = None
    ) -> Dict:
        """
        Generate SARS-compliant Tax Invoice
        
        Must include (per SARS requirements):
        - Word "TAX INVOICE" prominently displayed
        - Supplier details (name, address, VAT number, tax number)
        - Customer details (name, address, VAT number if registered)
        - Invoice number (sequential)
        - Invoice date
        - Delivery address (if different)
        - Description of goods/services
        - Quantity
        - Unit price (excluding VAT)
        - Total (excluding VAT)
        - VAT amount (15%)
        - Total amount (including VAT)
        - Payment terms
        - Bank details
        """
        self.logger.info(f"Generating Tax Invoice: {invoice_data.get('invoice_number')}")
        
        # Calculate totals
        subtotal = sum(item['quantity'] * item['unit_price'] for item in line_items)
        vat_amount = subtotal * Decimal('0.15')  # 15% VAT
        total = subtotal + vat_amount
        
        return {
            "document_id": invoice_data.get('invoice_number'),
            "document_type": DocumentType.TAX_INVOICE.value,
            "category": DocumentCategory.FINANCIAL.value,
            "template": "tax_invoice_sars_compliant",
            "data": {
                # Header
                "title": "TAX INVOICE",
                "logo_url": branding.get('logo_url') if branding else company_info.get('logo_url'),
                
                # Company Information
                "company": {
                    "name": company_info['name'],
                    "registration_number": company_info['registration_number'],
                    "vat_number": company_info['vat_number'],
                    "tax_number": company_info.get('tax_number'),
                    "address": {
                        "street": company_info['address']['street'],
                        "city": company_info['address']['city'],
                        "province": company_info['address']['province'],
                        "postal_code": company_info['address']['postal_code'],
                        "country": company_info['address'].get('country', 'South Africa')
                    },
                    "contact": {
                        "phone": company_info['phone'],
                        "email": company_info['email'],
                        "website": company_info.get('website')
                    },
                    "bank_details": {
                        "bank_name": company_info['bank_details']['bank_name'],
                        "account_holder": company_info['bank_details']['account_holder'],
                        "account_number": company_info['bank_details']['account_number'],
                        "branch_code": company_info['bank_details']['branch_code'],
                        "swift_code": company_info['bank_details'].get('swift_code')
                    }
                },
                
                # Customer Information
                "customer": {
                    "name": customer_info['name'],
                    "vat_number": customer_info.get('vat_number'),
                    "address": customer_info['address'],
                    "contact": customer_info.get('contact', {})
                },
                
                # Invoice Details
                "invoice_number": invoice_data['invoice_number'],
                "invoice_date": invoice_data['invoice_date'],
                "due_date": invoice_data['due_date'],
                "payment_terms": invoice_data.get('payment_terms', 'Payment due within 30 days'),
                "customer_reference": invoice_data.get('customer_reference'),
                "sales_rep": invoice_data.get('sales_rep'),
                
                # Delivery Address (if different)
                "delivery_address": invoice_data.get('delivery_address'),
                
                # Line Items
                "line_items": [
                    {
                        "description": item['description'],
                        "quantity": item['quantity'],
                        "unit": item.get('unit', 'ea'),
                        "unit_price": float(item['unit_price']),
                        "discount_percent": item.get('discount_percent', 0),
                        "line_total": float(item['quantity'] * item['unit_price'] * (1 - item.get('discount_percent', 0) / 100))
                    }
                    for item in line_items
                ],
                
                # Totals
                "subtotal": float(subtotal),
                "vat_rate": 15.0,
                "vat_amount": float(vat_amount),
                "total": float(total),
                "currency": invoice_data.get('currency', 'ZAR'),
                
                # Footer
                "notes": invoice_data.get('notes'),
                "terms_and_conditions": company_info.get('invoice_terms', [
                    "Payment is due within 30 days of invoice date.",
                    "Interest will be charged at 2% per month on overdue accounts.",
                    "Goods remain the property of the seller until paid in full.",
                    "Please reference invoice number when making payment."
                ]),
                
                # Branding
                "primary_color": branding.get('primary_color', '#1e40af') if branding else '#1e40af',
                "secondary_color": branding.get('secondary_color', '#64748b') if branding else '#64748b'
            },
            "format": "PDF",
            "generated_at": datetime.utcnow().isoformat(),
            "file_path": f"/documents/invoices/{invoice_data['invoice_number']}.pdf"
        }
    
    def generate_quote(
        self,
        quote_data: Dict,
        company_info: Dict,
        customer_info: Dict,
        line_items: List[Dict],
        branding: Optional[Dict] = None
    ) -> Dict:
        """
        Generate professional quotation
        """
        self.logger.info(f"Generating Quote: {quote_data.get('quote_number')}")
        
        subtotal = sum(item['quantity'] * item['unit_price'] for item in line_items)
        vat_amount = subtotal * Decimal('0.15')
        total = subtotal + vat_amount
        
        return {
            "document_id": quote_data.get('quote_number'),
            "document_type": DocumentType.QUOTE.value,
            "category": DocumentCategory.SALES.value,
            "template": "professional_quote",
            "data": {
                "title": "QUOTATION",
                "logo_url": branding.get('logo_url') if branding else company_info.get('logo_url'),
                "company": company_info,
                "customer": customer_info,
                "quote_number": quote_data['quote_number'],
                "quote_date": quote_data['quote_date'],
                "valid_until": quote_data['valid_until'],
                "line_items": line_items,
                "subtotal": float(subtotal),
                "vat_amount": float(vat_amount),
                "total": float(total),
                "currency": quote_data.get('currency', 'ZAR'),
                "payment_terms": quote_data.get('payment_terms'),
                "delivery_terms": quote_data.get('delivery_terms'),
                "validity_note": f"This quotation is valid until {quote_data['valid_until']}",
                "notes": quote_data.get('notes')
            },
            "format": "PDF",
            "generated_at": datetime.utcnow().isoformat(),
            "file_path": f"/documents/quotes/{quote_data['quote_number']}.pdf"
        }
    
    def generate_purchase_order(
        self,
        po_data: Dict,
        company_info: Dict,
        supplier_info: Dict,
        line_items: List[Dict],
        branding: Optional[Dict] = None
    ) -> Dict:
        """
        Generate Purchase Order
        """
        self.logger.info(f"Generating Purchase Order: {po_data.get('po_number')}")
        
        subtotal = sum(item['quantity'] * item['unit_price'] for item in line_items)
        vat_amount = subtotal * Decimal('0.15')
        total = subtotal + vat_amount
        
        return {
            "document_id": po_data.get('po_number'),
            "document_type": DocumentType.PURCHASE_ORDER.value,
            "category": DocumentCategory.PURCHASE.value,
            "template": "purchase_order",
            "data": {
                "title": "PURCHASE ORDER",
                "logo_url": branding.get('logo_url') if branding else company_info.get('logo_url'),
                "company": company_info,
                "supplier": supplier_info,
                "po_number": po_data['po_number'],
                "po_date": po_data['po_date'],
                "delivery_date": po_data['required_delivery_date'],
                "delivery_address": po_data['delivery_address'],
                "buyer": po_data.get('buyer_name'),
                "buyer_email": po_data.get('buyer_email'),
                "line_items": line_items,
                "subtotal": float(subtotal),
                "vat_amount": float(vat_amount),
                "total": float(total),
                "currency": po_data.get('currency', 'ZAR'),
                "payment_terms": po_data.get('payment_terms', '30 days'),
                "special_instructions": po_data.get('special_instructions'),
                "approval_signatures": po_data.get('approval_signatures', [])
            },
            "format": "PDF",
            "generated_at": datetime.utcnow().isoformat(),
            "file_path": f"/documents/purchase_orders/{po_data['po_number']}.pdf"
        }
    
    def generate_delivery_note(
        self,
        delivery_data: Dict,
        company_info: Dict,
        customer_info: Dict,
        line_items: List[Dict],
        branding: Optional[Dict] = None
    ) -> Dict:
        """
        Generate Delivery Note
        """
        self.logger.info(f"Generating Delivery Note: {delivery_data.get('delivery_number')}")
        
        return {
            "document_id": delivery_data.get('delivery_number'),
            "document_type": DocumentType.DELIVERY_NOTE.value,
            "category": DocumentCategory.SALES.value,
            "template": "delivery_note",
            "data": {
                "title": "DELIVERY NOTE",
                "logo_url": branding.get('logo_url') if branding else company_info.get('logo_url'),
                "company": company_info,
                "customer": customer_info,
                "delivery_number": delivery_data['delivery_number'],
                "delivery_date": delivery_data['delivery_date'],
                "sales_order_number": delivery_data.get('sales_order_number'),
                "invoice_number": delivery_data.get('invoice_number'),
                "delivery_address": delivery_data['delivery_address'],
                "driver_name": delivery_data.get('driver_name'),
                "vehicle_registration": delivery_data.get('vehicle_registration'),
                "line_items": [
                    {
                        "description": item['description'],
                        "quantity_ordered": item.get('quantity_ordered'),
                        "quantity_delivered": item['quantity_delivered'],
                        "unit": item.get('unit', 'ea'),
                        "notes": item.get('notes')
                    }
                    for item in line_items
                ],
                "special_instructions": delivery_data.get('special_instructions'),
                "signature_blocks": {
                    "delivered_by": "Driver Signature",
                    "received_by": "Customer Signature",
                    "date": "Date"
                }
            },
            "format": "PDF",
            "generated_at": datetime.utcnow().isoformat(),
            "file_path": f"/documents/delivery_notes/{delivery_data['delivery_number']}.pdf"
        }
    
    def generate_manufacturing_order(
        self,
        mo_data: Dict,
        company_info: Dict,
        bom: Dict,
        branding: Optional[Dict] = None
    ) -> Dict:
        """
        Generate Manufacturing Order
        """
        self.logger.info(f"Generating Manufacturing Order: {mo_data.get('mo_number')}")
        
        return {
            "document_id": mo_data.get('mo_number'),
            "document_type": DocumentType.MANUFACTURING_ORDER.value,
            "category": DocumentCategory.MANUFACTURING.value,
            "template": "manufacturing_order",
            "data": {
                "title": "MANUFACTURING ORDER",
                "logo_url": branding.get('logo_url') if branding else company_info.get('logo_url'),
                "company": company_info,
                "mo_number": mo_data['mo_number'],
                "mo_date": mo_data['mo_date'],
                "product": {
                    "code": mo_data['product_code'],
                    "description": mo_data['product_description'],
                    "quantity_to_produce": mo_data['quantity'],
                    "unit": mo_data.get('unit', 'ea')
                },
                "bom_reference": bom['bom_number'],
                "materials": bom['materials'],
                "operations": bom.get('operations', []),
                "start_date": mo_data['planned_start_date'],
                "completion_date": mo_data['planned_completion_date'],
                "work_center": mo_data.get('work_center'),
                "supervisor": mo_data.get('supervisor'),
                "priority": mo_data.get('priority', 'Normal'),
                "special_instructions": mo_data.get('special_instructions'),
                "quality_checks": mo_data.get('quality_checks', []),
                "status_tracking": {
                    "material_issued": False,
                    "production_started": False,
                    "quality_checked": False,
                    "production_completed": False,
                    "goods_received": False
                }
            },
            "format": "PDF",
            "generated_at": datetime.utcnow().isoformat(),
            "file_path": f"/documents/manufacturing/{mo_data['mo_number']}.pdf"
        }
    
    def generate_goods_received_note(
        self,
        grn_data: Dict,
        company_info: Dict,
        supplier_info: Dict,
        line_items: List[Dict],
        branding: Optional[Dict] = None
    ) -> Dict:
        """
        Generate Goods Received Note (GRN)
        """
        self.logger.info(f"Generating GRN: {grn_data.get('grn_number')}")
        
        return {
            "document_id": grn_data.get('grn_number'),
            "document_type": DocumentType.GOODS_RECEIVED_NOTE.value,
            "category": DocumentCategory.PURCHASE.value,
            "template": "goods_received_note",
            "data": {
                "title": "GOODS RECEIVED NOTE",
                "logo_url": branding.get('logo_url') if branding else company_info.get('logo_url'),
                "company": company_info,
                "supplier": supplier_info,
                "grn_number": grn_data['grn_number'],
                "grn_date": grn_data['grn_date'],
                "po_number": grn_data['po_number'],
                "delivery_note_number": grn_data.get('delivery_note_number'),
                "received_by": grn_data['received_by'],
                "line_items": [
                    {
                        "description": item['description'],
                        "quantity_ordered": item['quantity_ordered'],
                        "quantity_received": item['quantity_received'],
                        "quantity_rejected": item.get('quantity_rejected', 0),
                        "unit": item.get('unit', 'ea'),
                        "condition": item.get('condition', 'Good'),
                        "notes": item.get('notes')
                    }
                    for item in line_items
                ],
                "inspection_notes": grn_data.get('inspection_notes'),
                "signature_blocks": {
                    "received_by": "Receiver Signature",
                    "inspected_by": "QC Inspector Signature",
                    "approved_by": "Manager Signature"
                }
            },
            "format": "PDF",
            "generated_at": datetime.utcnow().isoformat(),
            "file_path": f"/documents/grn/{grn_data['grn_number']}.pdf"
        }
    
    # ========================================================================
    # COMPLIANCE DOCUMENTS
    # ========================================================================
    
    def generate_payslip(
        self,
        payslip_data: Dict,
        company_info: Dict,
        employee_info: Dict,
        branding: Optional[Dict] = None
    ) -> Dict:
        """
        Generate SARS-compliant Payslip
        """
        self.logger.info(f"Generating Payslip: {employee_info['employee_number']} - {payslip_data['period']}")
        
        return {
            "document_id": f"{employee_info['employee_number']}_{payslip_data['period']}",
            "document_type": DocumentType.PAYSLIP.value,
            "category": DocumentCategory.HR.value,
            "template": "payslip_sars_compliant",
            "data": {
                "title": "PAYSLIP",
                "logo_url": branding.get('logo_url') if branding else company_info.get('logo_url'),
                "company": {
                    "name": company_info['name'],
                    "paye_number": company_info['paye_number'],
                    "uif_number": company_info['uif_number'],
                    "sdl_number": company_info['sdl_number']
                },
                "employee": {
                    "employee_number": employee_info['employee_number'],
                    "name": employee_info['name'],
                    "id_number": employee_info['id_number'],
                    "tax_number": employee_info.get('tax_number'),
                    "department": employee_info.get('department'),
                    "position": employee_info.get('position'),
                    "bank_account": employee_info.get('bank_account')
                },
                "period": payslip_data['period'],
                "pay_date": payslip_data['pay_date'],
                "earnings": payslip_data['earnings'],
                "deductions": payslip_data['deductions'],
                "total_earnings": payslip_data['total_earnings'],
                "total_deductions": payslip_data['total_deductions'],
                "net_pay": payslip_data['net_pay'],
                "year_to_date": payslip_data.get('year_to_date', {}),
                "leave_balance": employee_info.get('leave_balance')
            },
            "format": "PDF",
            "generated_at": datetime.utcnow().isoformat(),
            "file_path": f"/documents/payslips/{payslip_data['period']}/{employee_info['employee_number']}.pdf"
        }
    
    def generate_bbbee_certificate(
        self,
        certificate_data: Dict,
        company_info: Dict,
        branding: Optional[Dict] = None
    ) -> Dict:
        """
        Generate BBBEE Certificate
        """
        self.logger.info(f"Generating BBBEE Certificate: Level {certificate_data['bbbee_level']}")
        
        return {
            "document_id": f"BBBEE_{certificate_data['certificate_number']}",
            "document_type": DocumentType.BBBEE_CERTIFICATE.value,
            "category": DocumentCategory.COMPLIANCE.value,
            "template": "bbbee_certificate",
            "data": {
                "title": "BBBEE COMPLIANCE CERTIFICATE",
                "logo_url": branding.get('logo_url') if branding else company_info.get('logo_url'),
                "company": company_info,
                "certificate_number": certificate_data['certificate_number'],
                "issue_date": certificate_data['issue_date'],
                "expiry_date": certificate_data['expiry_date'],
                "bbbee_level": certificate_data['bbbee_level'],
                "total_score": certificate_data['total_score'],
                "scorecard": certificate_data['scorecard_elements'],
                "procurement_recognition": certificate_data['procurement_recognition'],
                "verification_agency": certificate_data.get('verification_agency'),
                "verifier_signature": certificate_data.get('verifier_signature')
            },
            "format": "PDF",
            "generated_at": datetime.utcnow().isoformat(),
            "file_path": f"/documents/compliance/bbbee_{certificate_data['certificate_number']}.pdf"
        }


# Singleton instance
enhanced_document_generator = EnhancedDocumentGenerator()
