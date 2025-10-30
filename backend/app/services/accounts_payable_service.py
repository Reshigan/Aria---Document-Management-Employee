"""
Accounts Payable Service - Real Implementation
Handles invoice processing, payment scheduling, vendor management, and aging reports
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any
import logging

from ..models.vendor import Vendor, VendorStatus
from ..models.vendor_invoice import VendorInvoice, VendorInvoiceLine, InvoiceStatus
from ..models.vendor_payment import VendorPayment, PaymentStatus, PaymentMethod
from .general_ledger_service import GeneralLedgerService


logger = logging.getLogger(__name__)


class AccountsPayableService:
    """Service for managing accounts payable operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gl_service = GeneralLedgerService(db)
    
    def create_vendor(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new vendor"""
        try:
            # Generate vendor code if not provided
            if 'vendor_code' not in vendor_data:
                vendor_data['vendor_code'] = self._generate_vendor_code()
            
            # Check for duplicate
            existing = self.db.query(Vendor).filter_by(
                vendor_code=vendor_data['vendor_code']
            ).first()
            if existing:
                return {
                    'success': False,
                    'error': f"Vendor code {vendor_data['vendor_code']} already exists"
                }
            
            # Create vendor
            vendor = Vendor(**vendor_data)
            self.db.add(vendor)
            self.db.commit()
            self.db.refresh(vendor)
            
            logger.info(f"Created vendor: {vendor.vendor_code} - {vendor.name}")
            
            return {
                'success': True,
                'vendor_id': vendor.id,
                'vendor_code': vendor.vendor_code,
                'name': vendor.name
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating vendor: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def process_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a vendor invoice and post to GL"""
        try:
            # Validate vendor
            vendor = self.db.query(Vendor).filter_by(
                id=invoice_data['vendor_id']
            ).first()
            if not vendor:
                return {'success': False, 'error': 'Vendor not found'}
            
            if vendor.status != VendorStatus.ACTIVE:
                return {'success': False, 'error': f'Vendor is {vendor.status}'}
            
            # Check for duplicate invoice
            existing = self.db.query(VendorInvoice).filter_by(
                vendor_id=vendor.id,
                invoice_number=invoice_data['invoice_number']
            ).first()
            if existing:
                return {
                    'success': False,
                    'error': f"Duplicate invoice: {invoice_data['invoice_number']}"
                }
            
            # Calculate totals
            lines = invoice_data.get('lines', [])
            subtotal = sum(Decimal(str(line['quantity'])) * Decimal(str(line['unit_price'])) 
                          for line in lines)
            tax_amount = sum(Decimal(str(line.get('tax_amount', 0))) for line in lines)
            total_amount = subtotal + tax_amount
            
            # Create invoice
            invoice = VendorInvoice(
                invoice_number=invoice_data['invoice_number'],
                vendor_id=vendor.id,
                invoice_date=datetime.strptime(invoice_data['invoice_date'], '%Y-%m-%d').date(),
                due_date=datetime.strptime(invoice_data['due_date'], '%Y-%m-%d').date(),
                received_date=date.today(),
                po_number=invoice_data.get('po_number'),
                vendor_reference=invoice_data.get('vendor_reference'),
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                amount_due=total_amount,
                currency_code=invoice_data.get('currency_code', 'ZAR'),
                status=InvoiceStatus.PENDING,
                description=invoice_data.get('description', ''),
                notes=invoice_data.get('notes', ''),
                created_by=invoice_data.get('user_id')
            )
            self.db.add(invoice)
            self.db.flush()  # Get invoice ID
            
            # Create invoice lines
            for i, line_data in enumerate(lines):
                line_total = Decimal(str(line_data['quantity'])) * Decimal(str(line_data['unit_price']))
                line = VendorInvoiceLine(
                    invoice_id=invoice.id,
                    line_number=i + 1,
                    description=line_data['description'],
                    quantity=Decimal(str(line_data['quantity'])),
                    unit_price=Decimal(str(line_data['unit_price'])),
                    line_total=line_total,
                    gl_account_number=line_data['gl_account'],
                    cost_center=line_data.get('cost_center'),
                    project_code=line_data.get('project_code'),
                    tax_code=line_data.get('tax_code'),
                    tax_rate=Decimal(str(line_data.get('tax_rate', 0))),
                    tax_amount=Decimal(str(line_data.get('tax_amount', 0)))
                )
                self.db.add(line)
            
            # Post to GL (DR: Expense accounts, CR: AP)
            journal_entry = {
                'date': invoice_data['invoice_date'],
                'description': f"Invoice {invoice.invoice_number} - {vendor.name}",
                'reference': invoice.invoice_number,
                'lines': []
            }
            
            # Debit expense accounts
            for line in lines:
                journal_entry['lines'].append({
                    'account': line['gl_account'],
                    'debit': float(Decimal(str(line['quantity'])) * Decimal(str(line['unit_price']))),
                    'credit': 0,
                    'description': line['description'],
                    'cost_center': line.get('cost_center'),
                    'project_code': line.get('project_code')
                })
            
            # Debit tax if applicable
            if tax_amount > 0:
                journal_entry['lines'].append({
                    'account': '1160',  # VAT Input account
                    'debit': float(tax_amount),
                    'credit': 0,
                    'description': 'VAT Input'
                })
            
            # Credit AP account
            ap_account = vendor.ap_account_number or '2100'  # Default AP account
            journal_entry['lines'].append({
                'account': ap_account,
                'debit': 0,
                'credit': float(total_amount),
                'description': f'AP - {vendor.name}'
            })
            
            # Post to GL
            gl_result = self.gl_service.post_journal_entry(journal_entry)
            if not gl_result['success']:
                self.db.rollback()
                return {'success': False, 'error': f"GL posting failed: {gl_result['error']}"}
            
            # Link GL entry to invoice
            invoice.gl_entry_id = gl_result['entry_id']
            invoice.status = InvoiceStatus.APPROVED
            invoice.approved_at = date.today()
            
            # Update vendor balance
            vendor.current_balance += total_amount
            
            self.db.commit()
            self.db.refresh(invoice)
            
            logger.info(f"Processed invoice: {invoice.invoice_number} for {vendor.name}, Amount: {total_amount}")
            
            return {
                'success': True,
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'vendor_name': vendor.name,
                'total_amount': float(total_amount),
                'due_date': invoice.due_date.isoformat(),
                'gl_reference': gl_result['reference'],
                'gl_entry_id': gl_result['entry_id']
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error processing invoice: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def schedule_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule a payment for an invoice"""
        try:
            # Validate invoice
            invoice = self.db.query(VendorInvoice).filter_by(
                id=payment_data['invoice_id']
            ).first()
            if not invoice:
                return {'success': False, 'error': 'Invoice not found'}
            
            if invoice.amount_due <= 0:
                return {'success': False, 'error': 'Invoice is already paid'}
            
            # Validate payment amount
            payment_amount = Decimal(str(payment_data['amount']))
            if payment_amount > invoice.amount_due:
                return {
                    'success': False,
                    'error': f'Payment amount exceeds amount due: {invoice.amount_due}'
                }
            
            # Generate payment number
            payment_number = self._generate_payment_number()
            
            # Create payment
            payment = VendorPayment(
                payment_number=payment_number,
                vendor_id=invoice.vendor_id,
                invoice_id=invoice.id,
                payment_date=datetime.strptime(payment_data['payment_date'], '%Y-%m-%d').date(),
                scheduled_date=datetime.strptime(payment_data.get('scheduled_date', payment_data['payment_date']), '%Y-%m-%d').date(),
                amount=payment_amount,
                currency_code=invoice.currency_code,
                payment_method=PaymentMethod[payment_data['payment_method']],
                reference_number=payment_data.get('reference_number'),
                status=PaymentStatus.SCHEDULED,
                description=payment_data.get('description', ''),
                created_by=payment_data.get('user_id')
            )
            self.db.add(payment)
            self.db.commit()
            self.db.refresh(payment)
            
            logger.info(f"Scheduled payment: {payment_number} for invoice {invoice.invoice_number}")
            
            return {
                'success': True,
                'payment_id': payment.id,
                'payment_number': payment_number,
                'amount': float(payment_amount),
                'scheduled_date': payment.scheduled_date.isoformat(),
                'invoice_number': invoice.invoice_number
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error scheduling payment: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def process_payment(self, payment_id: int, user_id: int = None) -> Dict[str, Any]:
        """Process a scheduled payment and post to GL"""
        try:
            # Get payment
            payment = self.db.query(VendorPayment).filter_by(id=payment_id).first()
            if not payment:
                return {'success': False, 'error': 'Payment not found'}
            
            if payment.status != PaymentStatus.SCHEDULED:
                return {'success': False, 'error': f'Payment status is {payment.status}'}
            
            # Get invoice and vendor
            invoice = payment.invoice
            vendor = payment.vendor
            
            # Post to GL (DR: AP, CR: Cash/Bank)
            journal_entry = {
                'date': payment.payment_date.isoformat(),
                'description': f"Payment {payment.payment_number} - {vendor.name}",
                'reference': payment.payment_number,
                'lines': [
                    {
                        'account': vendor.ap_account_number or '2100',
                        'debit': float(payment.amount),
                        'credit': 0,
                        'description': f'Payment to {vendor.name}'
                    },
                    {
                        'account': '1100',  # Cash/Bank account
                        'debit': 0,
                        'credit': float(payment.amount),
                        'description': f'Payment via {payment.payment_method}'
                    }
                ]
            }
            
            # Post to GL
            gl_result = self.gl_service.post_journal_entry(journal_entry)
            if not gl_result['success']:
                self.db.rollback()
                return {'success': False, 'error': f"GL posting failed: {gl_result['error']}"}
            
            # Update payment
            payment.gl_entry_id = gl_result['entry_id']
            payment.status = PaymentStatus.COMPLETED
            payment.processed_by = user_id
            
            # Update invoice
            invoice.amount_paid += payment.amount
            invoice.amount_due -= payment.amount
            if invoice.amount_due <= 0:
                invoice.status = InvoiceStatus.PAID
            else:
                invoice.status = InvoiceStatus.PARTIALLY_PAID
            
            # Update vendor balance
            vendor.current_balance -= payment.amount
            
            self.db.commit()
            
            logger.info(f"Processed payment: {payment.payment_number}, Amount: {payment.amount}")
            
            return {
                'success': True,
                'payment_number': payment.payment_number,
                'amount': float(payment.amount),
                'invoice_number': invoice.invoice_number,
                'vendor_name': vendor.name,
                'gl_reference': gl_result['reference'],
                'invoice_status': invoice.status.value
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error processing payment: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_aging_report(self, as_of_date: str = None) -> Dict[str, Any]:
        """Generate AP aging report"""
        try:
            if as_of_date:
                report_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
            else:
                report_date = date.today()
            
            # Get unpaid/partially paid invoices
            invoices = self.db.query(VendorInvoice).filter(
                VendorInvoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.APPROVED, InvoiceStatus.PARTIALLY_PAID])
            ).all()
            
            # Categorize by age
            aging_buckets = {
                'current': [],
                '1_30': [],
                '31_60': [],
                '61_90': [],
                'over_90': []
            }
            
            for invoice in invoices:
                days_old = (report_date - invoice.due_date).days
                amount_due = float(invoice.amount_due)
                
                invoice_data = {
                    'invoice_number': invoice.invoice_number,
                    'vendor_name': invoice.vendor.name,
                    'invoice_date': invoice.invoice_date.isoformat(),
                    'due_date': invoice.due_date.isoformat(),
                    'amount_due': amount_due,
                    'days_overdue': max(0, days_old)
                }
                
                if days_old <= 0:
                    aging_buckets['current'].append(invoice_data)
                elif days_old <= 30:
                    aging_buckets['1_30'].append(invoice_data)
                elif days_old <= 60:
                    aging_buckets['31_60'].append(invoice_data)
                elif days_old <= 90:
                    aging_buckets['61_90'].append(invoice_data)
                else:
                    aging_buckets['over_90'].append(invoice_data)
            
            # Calculate totals
            totals = {
                'current': sum(inv['amount_due'] for inv in aging_buckets['current']),
                '1_30': sum(inv['amount_due'] for inv in aging_buckets['1_30']),
                '31_60': sum(inv['amount_due'] for inv in aging_buckets['31_60']),
                '61_90': sum(inv['amount_due'] for inv in aging_buckets['61_90']),
                'over_90': sum(inv['amount_due'] for inv in aging_buckets['over_90'])
            }
            totals['total'] = sum(totals.values())
            
            logger.info(f"Generated aging report as of {report_date}, Total AP: {totals['total']}")
            
            return {
                'success': True,
                'as_of_date': report_date.isoformat(),
                'aging': aging_buckets,
                'totals': totals,
                'invoice_count': len(invoices)
            }
            
        except Exception as e:
            logger.error(f"Error generating aging report: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_vendor_balance(self, vendor_id: int) -> Dict[str, Any]:
        """Get vendor balance and outstanding invoices"""
        try:
            vendor = self.db.query(Vendor).filter_by(id=vendor_id).first()
            if not vendor:
                return {'success': False, 'error': 'Vendor not found'}
            
            # Get outstanding invoices
            invoices = self.db.query(VendorInvoice).filter(
                and_(
                    VendorInvoice.vendor_id == vendor_id,
                    VendorInvoice.status.in_([
                        InvoiceStatus.PENDING,
                        InvoiceStatus.APPROVED,
                        InvoiceStatus.PARTIALLY_PAID
                    ])
                )
            ).all()
            
            outstanding_invoices = [
                {
                    'invoice_number': inv.invoice_number,
                    'invoice_date': inv.invoice_date.isoformat(),
                    'due_date': inv.due_date.isoformat(),
                    'total_amount': float(inv.total_amount),
                    'amount_paid': float(inv.amount_paid),
                    'amount_due': float(inv.amount_due),
                    'days_overdue': max(0, (date.today() - inv.due_date).days),
                    'status': inv.status.value
                }
                for inv in invoices
            ]
            
            return {
                'success': True,
                'vendor_code': vendor.vendor_code,
                'vendor_name': vendor.name,
                'current_balance': float(vendor.current_balance),
                'credit_limit': float(vendor.credit_limit),
                'outstanding_invoices': outstanding_invoices,
                'invoice_count': len(outstanding_invoices)
            }
            
        except Exception as e:
            logger.error(f"Error getting vendor balance: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _generate_vendor_code(self) -> str:
        """Generate unique vendor code"""
        # Get last vendor code
        last_vendor = self.db.query(Vendor).order_by(desc(Vendor.id)).first()
        if last_vendor and last_vendor.vendor_code.startswith('VEN'):
            try:
                last_num = int(last_vendor.vendor_code[3:])
                return f"VEN{last_num + 1:05d}"
            except ValueError:
                pass
        return "VEN00001"
    
    def _generate_payment_number(self) -> str:
        """Generate unique payment number"""
        today = date.today()
        prefix = f"PAY-{today.year}{today.month:02d}"
        
        # Get count for this month
        count = self.db.query(func.count(VendorPayment.id)).filter(
            VendorPayment.payment_number.like(f"{prefix}%")
        ).scalar()
        
        return f"{prefix}-{count + 1:04d}"
