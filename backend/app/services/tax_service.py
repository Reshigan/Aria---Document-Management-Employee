"""
Tax Service - Real Implementation
Handles tax calculation, tracking, and return generation
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func, or_
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional, Any
import logging

from ..models.tax_code import TaxCode, TaxTransaction, TaxReturn, TaxType
from .general_ledger_service import GeneralLedgerService


logger = logging.getLogger(__name__)


class TaxService:
    """Service for managing tax calculations and returns"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gl_service = GeneralLedgerService(db)
    
    def create_tax_code(self, tax_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tax code"""
        try:
            # Check for duplicate
            existing = self.db.query(TaxCode).filter_by(
                tax_code=tax_data['tax_code']
            ).first()
            if existing:
                return {
                    'success': False,
                    'error': f"Tax code {tax_data['tax_code']} already exists"
                }
            
            # Create tax code
            tax_code = TaxCode(
                tax_code=tax_data['tax_code'],
                tax_name=tax_data['tax_name'],
                description=tax_data.get('description', ''),
                tax_type=TaxType[tax_data['tax_type']],
                tax_rate=Decimal(str(tax_data['tax_rate'])),
                tax_collected_account=tax_data.get('tax_collected_account'),
                tax_paid_account=tax_data.get('tax_paid_account'),
                is_active=tax_data.get('is_active', True),
                applies_to_sales=tax_data.get('applies_to_sales', True),
                applies_to_purchases=tax_data.get('applies_to_purchases', True),
                effective_from=datetime.strptime(tax_data['effective_from'], '%Y-%m-%d').date(),
                effective_to=datetime.strptime(tax_data['effective_to'], '%Y-%m-%d').date() if tax_data.get('effective_to') else None,
                created_by=tax_data.get('user_id')
            )
            self.db.add(tax_code)
            self.db.commit()
            self.db.refresh(tax_code)
            
            logger.info(f"Created tax code: {tax_code.tax_code} at {tax_code.tax_rate}%")
            
            return {
                'success': True,
                'tax_code_id': tax_code.id,
                'tax_code': tax_code.tax_code,
                'tax_rate': float(tax_code.tax_rate)
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating tax code: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def calculate_tax(self, amount: Decimal, tax_code: str, 
                     tax_inclusive: bool = False) -> Dict[str, Any]:
        """Calculate tax for an amount"""
        try:
            # Get tax code
            tax = self.db.query(TaxCode).filter_by(
                tax_code=tax_code,
                is_active=True
            ).first()
            
            if not tax:
                return {'success': False, 'error': f'Tax code {tax_code} not found or inactive'}
            
            # Check validity
            today = date.today()
            if today < tax.effective_from:
                return {'success': False, 'error': f'Tax code not yet effective'}
            if tax.effective_to and today > tax.effective_to:
                return {'success': False, 'error': f'Tax code has expired'}
            
            # Calculate tax
            rate = tax.tax_rate / Decimal('100')
            
            if tax_inclusive:
                # Amount includes tax
                taxable_amount = amount / (Decimal('1') + rate)
                tax_amount = amount - taxable_amount
            else:
                # Amount excludes tax
                taxable_amount = amount
                tax_amount = amount * rate
            
            total_amount = taxable_amount + tax_amount
            
            return {
                'success': True,
                'tax_code': tax_code,
                'tax_rate': float(tax.tax_rate),
                'taxable_amount': float(taxable_amount),
                'tax_amount': float(tax_amount),
                'total_amount': float(total_amount)
            }
            
        except Exception as e:
            logger.error(f"Error calculating tax: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def record_tax_transaction(self, txn_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a tax transaction"""
        try:
            # Get tax code
            tax_code = self.db.query(TaxCode).filter_by(
                tax_code=txn_data['tax_code']
            ).first()
            if not tax_code:
                return {'success': False, 'error': 'Tax code not found'}
            
            # Calculate tax period (YYYY-MM)
            txn_date = datetime.strptime(txn_data['transaction_date'], '%Y-%m-%d').date()
            tax_period = txn_date.strftime('%Y-%m')
            
            # Create transaction
            transaction = TaxTransaction(
                tax_code_id=tax_code.id,
                transaction_date=txn_date,
                document_type=txn_data['document_type'],
                document_number=txn_data['document_number'],
                reference_id=txn_data.get('reference_id'),
                taxable_amount=Decimal(str(txn_data['taxable_amount'])),
                tax_amount=Decimal(str(txn_data['tax_amount'])),
                total_amount=Decimal(str(txn_data['total_amount'])),
                tax_rate=tax_code.tax_rate,
                is_input_tax=txn_data.get('is_input_tax', False),
                is_recoverable=txn_data.get('is_recoverable', True),
                tax_period=tax_period,
                party_name=txn_data.get('party_name'),
                party_tax_number=txn_data.get('party_tax_number'),
                created_by=txn_data.get('user_id')
            )
            self.db.add(transaction)
            self.db.flush()
            
            # Post to GL
            gl_account = tax_code.tax_paid_account if transaction.is_input_tax else tax_code.tax_collected_account
            if gl_account:
                gl_data = {
                    'entry_date': txn_data['transaction_date'],
                    'description': f"Tax on {txn_data['document_type']} {txn_data['document_number']}",
                    'reference': txn_data['document_number'],
                    'lines': [
                        {
                            'account_number': gl_account,
                            'description': f"{tax_code.tax_name} - {txn_data['document_type']}",
                            'debit': float(transaction.tax_amount) if transaction.is_input_tax else 0,
                            'credit': 0 if transaction.is_input_tax else float(transaction.tax_amount)
                        }
                    ],
                    'user_id': txn_data.get('user_id')
                }
                gl_result = self.gl_service.post_journal_entry(gl_data)
                if gl_result['success']:
                    transaction.gl_entry_id = gl_result['entry_id']
            
            self.db.commit()
            
            logger.info(f"Recorded tax transaction: {transaction.document_number} - {transaction.tax_amount}")
            
            return {
                'success': True,
                'transaction_id': transaction.id,
                'tax_amount': float(transaction.tax_amount),
                'tax_period': tax_period
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error recording tax transaction: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def generate_tax_return(self, period: str, tax_type: str = 'VAT') -> Dict[str, Any]:
        """Generate tax return for a period"""
        try:
            # Parse period (YYYY-MM)
            year, month = map(int, period.split('-'))
            period_start = date(year, month, 1)
            
            # Calculate period end
            if month == 12:
                period_end = date(year, 12, 31)
                next_month = date(year + 1, 1, 1)
            else:
                from calendar import monthrange
                _, last_day = monthrange(year, month)
                period_end = date(year, month, last_day)
                next_month = date(year, month + 1, 1)
            
            # Check if return already exists
            existing = self.db.query(TaxReturn).filter_by(
                tax_period=period,
                tax_type=TaxType[tax_type]
            ).first()
            if existing:
                return {'success': False, 'error': f'Tax return for {period} already exists'}
            
            # Get all tax transactions for the period
            transactions = self.db.query(TaxTransaction).join(TaxCode).filter(
                and_(
                    TaxTransaction.tax_period == period,
                    TaxCode.tax_type == TaxType[tax_type],
                    TaxTransaction.is_filed == False
                )
            ).all()
            
            # Calculate totals
            output_tax = sum(
                t.tax_amount for t in transactions 
                if not t.is_input_tax
            )
            input_tax = sum(
                t.tax_amount for t in transactions 
                if t.is_input_tax and t.is_recoverable
            )
            
            total_sales = sum(
                t.taxable_amount for t in transactions 
                if not t.is_input_tax
            )
            total_purchases = sum(
                t.taxable_amount for t in transactions 
                if t.is_input_tax
            )
            
            net_tax = output_tax - input_tax
            
            # Create tax return
            return_number = f"{tax_type}-{period}"
            tax_return = TaxReturn(
                return_number=return_number,
                tax_period=period,
                tax_type=TaxType[tax_type],
                period_start=period_start,
                period_end=period_end,
                due_date=date(next_month.year, next_month.month, 25),  # 25th of next month
                total_sales=total_sales,
                total_purchases=total_purchases,
                output_tax=output_tax,
                input_tax=input_tax,
                net_tax_payable=net_tax,
                status='DRAFT'
            )
            self.db.add(tax_return)
            self.db.commit()
            self.db.refresh(tax_return)
            
            logger.info(f"Generated tax return: {return_number} - Net: {net_tax}")
            
            return {
                'success': True,
                'return_id': tax_return.id,
                'return_number': return_number,
                'period': period,
                'total_sales': float(total_sales),
                'total_purchases': float(total_purchases),
                'output_tax': float(output_tax),
                'input_tax': float(input_tax),
                'net_tax_payable': float(net_tax),
                'due_date': tax_return.due_date.isoformat(),
                'transaction_count': len(transactions)
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error generating tax return: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def file_tax_return(self, return_id: int, user_id: int = None) -> Dict[str, Any]:
        """File a tax return"""
        try:
            tax_return = self.db.query(TaxReturn).filter_by(id=return_id).first()
            if not tax_return:
                return {'success': False, 'error': 'Tax return not found'}
            
            if tax_return.is_filed:
                return {'success': False, 'error': 'Tax return already filed'}
            
            # Mark as filed
            tax_return.status = 'FILED'
            tax_return.is_filed = True
            tax_return.filed_date = date.today()
            tax_return.filed_by = user_id
            
            # Mark all transactions as filed
            self.db.query(TaxTransaction).filter_by(
                tax_period=tax_return.tax_period,
                is_filed=False
            ).update({'is_filed': True, 'filed_date': date.today()})
            
            self.db.commit()
            
            logger.info(f"Filed tax return: {tax_return.return_number}")
            
            return {
                'success': True,
                'return_number': tax_return.return_number,
                'filed_date': tax_return.filed_date.isoformat(),
                'net_tax_payable': float(tax_return.net_tax_payable)
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error filing tax return: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_tax_summary(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get tax summary for a date range"""
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # Get transactions
            transactions = self.db.query(TaxTransaction).filter(
                and_(
                    TaxTransaction.transaction_date >= start,
                    TaxTransaction.transaction_date <= end
                )
            ).all()
            
            # Calculate totals by tax code
            tax_codes = {}
            total_output = Decimal('0')
            total_input = Decimal('0')
            
            for txn in transactions:
                code = txn.tax_code.tax_code
                if code not in tax_codes:
                    tax_codes[code] = {
                        'tax_code': code,
                        'tax_name': txn.tax_code.tax_name,
                        'tax_rate': float(txn.tax_code.tax_rate),
                        'output_tax': 0,
                        'input_tax': 0,
                        'net_tax': 0
                    }
                
                if txn.is_input_tax:
                    tax_codes[code]['input_tax'] += float(txn.tax_amount)
                    total_input += txn.tax_amount
                else:
                    tax_codes[code]['output_tax'] += float(txn.tax_amount)
                    total_output += txn.tax_amount
                
                tax_codes[code]['net_tax'] = tax_codes[code]['output_tax'] - tax_codes[code]['input_tax']
            
            return {
                'success': True,
                'period': f"{start_date} to {end_date}",
                'total_output_tax': float(total_output),
                'total_input_tax': float(total_input),
                'net_tax_payable': float(total_output - total_input),
                'by_tax_code': list(tax_codes.values()),
                'transaction_count': len(transactions)
            }
            
        except Exception as e:
            logger.error(f"Error generating tax summary: {str(e)}")
            return {'success': False, 'error': str(e)}
