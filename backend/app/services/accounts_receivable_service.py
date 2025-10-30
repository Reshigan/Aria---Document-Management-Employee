"""
Accounts Receivable Service - Real Implementation
Handles customer invoicing, payment tracking, collections, and aging reports
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any
import logging

from ..models.customer import Customer, CustomerStatus
from ..models.customer_invoice import CustomerInvoice, CustomerInvoiceLine, CustomerInvoiceStatus
from ..models.customer_payment import CustomerPayment, CustomerPaymentStatus, CustomerPaymentMethod
from .general_ledger_service import GeneralLedgerService


logger = logging.getLogger(__name__)


class AccountsReceivableService:
    """Service for managing accounts receivable operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gl_service = GeneralLedgerService(db)
    
    def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new customer"""
        try:
            # Generate customer code if not provided
            if 'customer_code' not in customer_data:
                customer_data['customer_code'] = self._generate_customer_code()
            
            # Check for duplicate
            existing = self.db.query(Customer).filter_by(
                customer_code=customer_data['customer_code']
            ).first()
            if existing:
                return {
                    'success': False,
                    'error': f"Customer code {customer_data['customer_code']} already exists"
                }
            
            # Create customer
            customer = Customer(**customer_data)
            self.db.add(customer)
            self.db.commit()
            self.db.refresh(customer)
            
            logger.info(f"Created customer: {customer.customer_code} - {customer.name}")
            
            return {
                'success': True,
                'customer_id': customer.id,
                'customer_code': customer.customer_code,
                'name': customer.name
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating customer: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a customer invoice and post to GL"""
        try:
            # Validate customer
            customer = self.db.query(Customer).filter_by(
                id=invoice_data['customer_id']
            ).first()
            if not customer:
                return {'success': False, 'error': 'Customer not found'}
            
            if customer.status != CustomerStatus.ACTIVE:
                return {'success': False, 'error': f'Customer is {customer.status}'}
            
            # Check credit limit
            if customer.credit_limit > 0:
                new_balance = customer.current_balance + Decimal(str(invoice_data['total_amount']))
                if new_balance > customer.credit_limit:
                    return {
                        'success': False,
                        'error': f'Credit limit exceeded: {customer.credit_limit}'
                    }
            
            # Check for duplicate invoice
            existing = self.db.query(CustomerInvoice).filter_by(
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
            invoice = CustomerInvoice(
                invoice_number=invoice_data['invoice_number'],
                customer_id=customer.id,
                invoice_date=datetime.strptime(invoice_data['invoice_date'], '%Y-%m-%d').date(),
                due_date=datetime.strptime(invoice_data['due_date'], '%Y-%m-%d').date(),
                so_number=invoice_data.get('so_number'),
                po_number=invoice_data.get('po_number'),
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                amount_due=total_amount,
                currency_code=invoice_data.get('currency_code', 'ZAR'),
                status=CustomerInvoiceStatus.DRAFT,
                description=invoice_data.get('description', ''),
                notes=invoice_data.get('notes', ''),
                created_by=invoice_data.get('user_id')
            )
            self.db.add(invoice)
            self.db.flush()  # Get invoice ID
            
            # Create invoice lines
            for i, line_data in enumerate(lines):
                line_total = Decimal(str(line_data['quantity'])) * Decimal(str(line_data['unit_price']))
                line = CustomerInvoiceLine(
                    invoice_id=invoice.id,
                    line_number=i + 1,
                    product_code=line_data.get('product_code'),
                    description=line_data['description'],
                    quantity=Decimal(str(line_data['quantity'])),
                    unit_price=Decimal(str(line_data['unit_price'])),
                    line_total=line_total,
                    revenue_account_number=line_data['revenue_account'],
                    cost_center=line_data.get('cost_center'),
                    project_code=line_data.get('project_code'),
                    tax_code=line_data.get('tax_code'),
                    tax_rate=Decimal(str(line_data.get('tax_rate', 0))),
                    tax_amount=Decimal(str(line_data.get('tax_amount', 0)))
                )
                self.db.add(line)
            
            # Post to GL (DR: AR, CR: Revenue)
            journal_entry = {
                'date': invoice_data['invoice_date'],
                'description': f"Invoice {invoice.invoice_number} - {customer.name}",
                'reference': invoice.invoice_number,
                'lines': []
            }
            
            # Debit AR account
            ar_account = customer.ar_account_number or '1200'  # Default AR account
            journal_entry['lines'].append({
                'account': ar_account,
                'debit': float(total_amount),
                'credit': 0,
                'description': f'AR - {customer.name}'
            })
            
            # Credit revenue accounts
            for line in lines:
                journal_entry['lines'].append({
                    'account': line['revenue_account'],
                    'debit': 0,
                    'credit': float(Decimal(str(line['quantity'])) * Decimal(str(line['unit_price']))),
                    'description': line['description'],
                    'cost_center': line.get('cost_center'),
                    'project_code': line.get('project_code')
                })
            
            # Credit tax if applicable
            if tax_amount > 0:
                journal_entry['lines'].append({
                    'account': '2160',  # VAT Output account
                    'debit': 0,
                    'credit': float(tax_amount),
                    'description': 'VAT Output'
                })
            
            # Post to GL
            gl_result = self.gl_service.post_journal_entry(journal_entry)
            if not gl_result['success']:
                self.db.rollback()
                return {'success': False, 'error': f"GL posting failed: {gl_result['error']}"}
            
            # Link GL entry to invoice
            invoice.gl_entry_id = gl_result['entry_id']
            invoice.status = CustomerInvoiceStatus.SENT
            invoice.sent_date = date.today()
            
            # Update customer balance
            customer.current_balance += total_amount
            
            self.db.commit()
            self.db.refresh(invoice)
            
            logger.info(f"Created invoice: {invoice.invoice_number} for {customer.name}, Amount: {total_amount}")
            
            return {
                'success': True,
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'customer_name': customer.name,
                'total_amount': float(total_amount),
                'due_date': invoice.due_date.isoformat(),
                'gl_reference': gl_result['reference'],
                'gl_entry_id': gl_result['entry_id']
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating invoice: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def record_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a customer payment and post to GL"""
        try:
            # Validate invoice
            invoice = self.db.query(CustomerInvoice).filter_by(
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
            
            # Get customer
            customer = invoice.customer
            
            # Generate payment number
            payment_number = self._generate_payment_number()
            
            # Create payment
            payment = CustomerPayment(
                payment_number=payment_number,
                customer_id=customer.id,
                invoice_id=invoice.id,
                payment_date=datetime.strptime(payment_data['payment_date'], '%Y-%m-%d').date(),
                received_date=date.today(),
                amount=payment_amount,
                currency_code=invoice.currency_code,
                payment_method=CustomerPaymentMethod[payment_data['payment_method']],
                reference_number=payment_data.get('reference_number'),
                status=CustomerPaymentStatus.CLEARED,
                description=payment_data.get('description', ''),
                created_by=payment_data.get('user_id')
            )
            self.db.add(payment)
            self.db.flush()
            
            # Post to GL (DR: Cash/Bank, CR: AR)
            journal_entry = {
                'date': payment_data['payment_date'],
                'description': f"Payment {payment_number} - {customer.name}",
                'reference': payment_number,
                'lines': [
                    {
                        'account': '1100',  # Cash/Bank account
                        'debit': float(payment_amount),
                        'credit': 0,
                        'description': f'Payment from {customer.name}'
                    },
                    {
                        'account': customer.ar_account_number or '1200',
                        'debit': 0,
                        'credit': float(payment_amount),
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
            payment.processed_by = payment_data.get('user_id')
            
            # Update invoice
            invoice.amount_paid += payment_amount
            invoice.amount_due -= payment_amount
            if invoice.amount_due <= 0:
                invoice.status = CustomerInvoiceStatus.PAID
            else:
                invoice.status = CustomerInvoiceStatus.PARTIALLY_PAID
            
            # Update customer balance
            customer.current_balance -= payment_amount
            
            self.db.commit()
            
            logger.info(f"Recorded payment: {payment_number}, Amount: {payment_amount}")
            
            return {
                'success': True,
                'payment_number': payment_number,
                'amount': float(payment_amount),
                'invoice_number': invoice.invoice_number,
                'customer_name': customer.name,
                'gl_reference': gl_result['reference'],
                'invoice_status': invoice.status.value
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error recording payment: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_aging_report(self, as_of_date: str = None) -> Dict[str, Any]:
        """Generate AR aging report"""
        try:
            if as_of_date:
                report_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
            else:
                report_date = date.today()
            
            # Get unpaid/partially paid invoices
            invoices = self.db.query(CustomerInvoice).filter(
                CustomerInvoice.status.in_([
                    CustomerInvoiceStatus.SENT,
                    CustomerInvoiceStatus.PARTIALLY_PAID,
                    CustomerInvoiceStatus.OVERDUE
                ])
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
                    'customer_name': invoice.customer.name,
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
            
            logger.info(f"Generated AR aging report as of {report_date}, Total AR: {totals['total']}")
            
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
    
    def get_customer_balance(self, customer_id: int) -> Dict[str, Any]:
        """Get customer balance and outstanding invoices"""
        try:
            customer = self.db.query(Customer).filter_by(id=customer_id).first()
            if not customer:
                return {'success': False, 'error': 'Customer not found'}
            
            # Get outstanding invoices
            invoices = self.db.query(CustomerInvoice).filter(
                and_(
                    CustomerInvoice.customer_id == customer_id,
                    CustomerInvoice.status.in_([
                        CustomerInvoiceStatus.SENT,
                        CustomerInvoiceStatus.PARTIALLY_PAID,
                        CustomerInvoiceStatus.OVERDUE
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
                'customer_code': customer.customer_code,
                'customer_name': customer.name,
                'current_balance': float(customer.current_balance),
                'credit_limit': float(customer.credit_limit),
                'available_credit': float(customer.credit_limit - customer.current_balance),
                'outstanding_invoices': outstanding_invoices,
                'invoice_count': len(outstanding_invoices)
            }
            
        except Exception as e:
            logger.error(f"Error getting customer balance: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _generate_customer_code(self) -> str:
        """Generate unique customer code"""
        # Get last customer code
        last_customer = self.db.query(Customer).order_by(desc(Customer.id)).first()
        if last_customer and last_customer.customer_code.startswith('CUST'):
            try:
                last_num = int(last_customer.customer_code[4:])
                return f"CUST{last_num + 1:05d}"
            except ValueError:
                pass
        return "CUST00001"
    
    def _generate_payment_number(self) -> str:
        """Generate unique payment number"""
        today = date.today()
        prefix = f"PMT-{today.year}{today.month:02d}"
        
        # Get count for this month
        count = self.db.query(func.count(CustomerPayment.id)).filter(
            CustomerPayment.payment_number.like(f"{prefix}%")
        ).scalar()
        
        return f"{prefix}-{count + 1:04d}"
