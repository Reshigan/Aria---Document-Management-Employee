"""
SAP Integration Module
Handles posting of extracted business data to SAP systems
"""

import json
import requests
from typing import Dict, List, Any, Optional
from datetime import datetime, date
from decimal import Decimal
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SAPIntegration:
    def __init__(self, sap_config: Dict[str, str]):
        """
        Initialize SAP integration with configuration
        
        sap_config should contain:
        - base_url: SAP system base URL
        - username: SAP username
        - password: SAP password
        - client: SAP client number
        - company_code: Default company code
        """
        self.config = sap_config
        self.session = requests.Session()
        self.session.auth = (sap_config.get('username'), sap_config.get('password'))
        
    def post_invoice_to_sap(self, invoice_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Post invoice data to SAP"""
        
        try:
            # Prepare SAP invoice document
            sap_document = self._prepare_invoice_document(invoice_data)
            
            # Post to SAP
            response = self._post_to_sap('FB01', sap_document)  # FB01 = Enter Vendor Invoice
            
            if response['success']:
                # Update database with SAP document number
                self._update_sap_status(
                    db, 
                    invoice_data['document_id'], 
                    'invoice', 
                    invoice_data['id'],
                    response['sap_document_number'],
                    'success'
                )
                
                return {
                    'success': True,
                    'sap_document_number': response['sap_document_number'],
                    'message': 'Invoice posted to SAP successfully'
                }
            else:
                # Log error
                self._log_sap_error(
                    db,
                    invoice_data['document_id'],
                    'invoice',
                    invoice_data['id'],
                    response['error']
                )
                
                return {
                    'success': False,
                    'error': response['error'],
                    'message': 'Failed to post invoice to SAP'
                }
                
        except Exception as e:
            logger.error(f"SAP invoice posting error: {str(e)}")
            self._log_sap_error(db, invoice_data['document_id'], 'invoice', invoice_data['id'], str(e))
            return {
                'success': False,
                'error': str(e),
                'message': 'Exception occurred during SAP posting'
            }
    
    def post_remittance_to_sap(self, remittance_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Post remittance data to SAP"""
        
        try:
            # Prepare SAP payment document
            sap_document = self._prepare_remittance_document(remittance_data)
            
            # Post to SAP
            response = self._post_to_sap('F-28', sap_document)  # F-28 = Post Incoming Payments
            
            if response['success']:
                self._update_sap_status(
                    db,
                    remittance_data['document_id'],
                    'remittance',
                    remittance_data['id'],
                    response['sap_document_number'],
                    'success'
                )
                
                return {
                    'success': True,
                    'sap_document_number': response['sap_document_number'],
                    'message': 'Remittance posted to SAP successfully'
                }
            else:
                self._log_sap_error(
                    db,
                    remittance_data['document_id'],
                    'remittance',
                    remittance_data['id'],
                    response['error']
                )
                
                return {
                    'success': False,
                    'error': response['error'],
                    'message': 'Failed to post remittance to SAP'
                }
                
        except Exception as e:
            logger.error(f"SAP remittance posting error: {str(e)}")
            self._log_sap_error(db, remittance_data['document_id'], 'remittance', remittance_data['id'], str(e))
            return {
                'success': False,
                'error': str(e),
                'message': 'Exception occurred during SAP posting'
            }
    
    def post_pod_to_sap(self, pod_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Post POD data to SAP (Goods Receipt)"""
        
        try:
            # Prepare SAP goods receipt document
            sap_document = self._prepare_pod_document(pod_data)
            
            # Post to SAP
            response = self._post_to_sap('MIGO', sap_document)  # MIGO = Goods Movement
            
            if response['success']:
                self._update_sap_status(
                    db,
                    pod_data['document_id'],
                    'pod',
                    pod_data['id'],
                    response['sap_document_number'],
                    'success'
                )
                
                return {
                    'success': True,
                    'sap_document_number': response['sap_document_number'],
                    'message': 'POD posted to SAP successfully'
                }
            else:
                self._log_sap_error(
                    db,
                    pod_data['document_id'],
                    'pod',
                    pod_data['id'],
                    response['error']
                )
                
                return {
                    'success': False,
                    'error': response['error'],
                    'message': 'Failed to post POD to SAP'
                }
                
        except Exception as e:
            logger.error(f"SAP POD posting error: {str(e)}")
            self._log_sap_error(db, pod_data['document_id'], 'pod', pod_data['id'], str(e))
            return {
                'success': False,
                'error': str(e),
                'message': 'Exception occurred during SAP posting'
            }
    
    def _prepare_invoice_document(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare invoice data for SAP posting"""
        
        # Map to SAP structure
        sap_doc = {
            'DocumentHeader': {
                'CompanyCode': self.config.get('company_code', '1000'),
                'DocumentType': 'RE',  # Vendor Invoice
                'DocumentDate': invoice_data.get('invoice_date', str(date.today())),
                'PostingDate': str(date.today()),
                'Reference': invoice_data.get('invoice_number'),
                'HeaderText': f"Invoice {invoice_data.get('invoice_number')} - {invoice_data.get('vendor_name', '')}"
            },
            'AccountingDocumentItems': []
        }
        
        # Vendor line (credit)
        vendor_item = {
            'GLAccount': '',  # Will be determined by vendor master
            'Vendor': self._get_vendor_code(invoice_data.get('vendor_name')),
            'DebitCreditIndicator': 'C',  # Credit
            'AmountInDocumentCurrency': str(invoice_data.get('total_amount', 0)),
            'Currency': invoice_data.get('currency', 'USD'),
            'PaymentTerms': invoice_data.get('payment_terms', ''),
            'Text': f"Invoice {invoice_data.get('invoice_number')}"
        }
        sap_doc['AccountingDocumentItems'].append(vendor_item)
        
        # Expense/Asset lines (debit) - from line items
        line_items = invoice_data.get('line_items', [])
        for i, item in enumerate(line_items):
            expense_item = {
                'GLAccount': self._map_expense_account(item.get('description', '')),
                'DebitCreditIndicator': 'D',  # Debit
                'AmountInDocumentCurrency': str(item.get('total_amount', 0)),
                'Currency': invoice_data.get('currency', 'USD'),
                'CostCenter': self._get_cost_center(item.get('description', '')),
                'Text': item.get('description', '')[:50]  # SAP text field limit
            }
            sap_doc['AccountingDocumentItems'].append(expense_item)
        
        # Tax line if applicable
        tax_amount = invoice_data.get('tax_amount', 0)
        if tax_amount > 0:
            tax_item = {
                'GLAccount': self._get_tax_account(),
                'DebitCreditIndicator': 'D',  # Debit
                'AmountInDocumentCurrency': str(tax_amount),
                'Currency': invoice_data.get('currency', 'USD'),
                'TaxCode': self._get_tax_code(invoice_data),
                'Text': 'Tax'
            }
            sap_doc['AccountingDocumentItems'].append(tax_item)
        
        return sap_doc
    
    def _prepare_remittance_document(self, remittance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare remittance data for SAP posting"""
        
        sap_doc = {
            'DocumentHeader': {
                'CompanyCode': self.config.get('company_code', '1000'),
                'DocumentType': 'DZ',  # Customer Payment
                'DocumentDate': remittance_data.get('payment_date', str(date.today())),
                'PostingDate': str(date.today()),
                'Reference': remittance_data.get('remittance_number'),
                'HeaderText': f"Payment {remittance_data.get('remittance_number')} - {remittance_data.get('payer_name', '')}"
            },
            'AccountingDocumentItems': []
        }
        
        # Bank account line (debit)
        bank_item = {
            'GLAccount': self._get_bank_account(remittance_data.get('bank_details', {})),
            'DebitCreditIndicator': 'D',  # Debit
            'AmountInDocumentCurrency': str(remittance_data.get('total_payment_amount', 0)),
            'Currency': remittance_data.get('currency', 'USD'),
            'Text': f"Payment {remittance_data.get('remittance_number')}"
        }
        sap_doc['AccountingDocumentItems'].append(bank_item)
        
        # Customer payments (credit) - from invoice payments
        invoice_payments = remittance_data.get('invoices_paid', [])
        for payment in invoice_payments:
            customer_item = {
                'GLAccount': '',  # Will be determined by customer master
                'Customer': self._get_customer_code(remittance_data.get('payer_name')),
                'DebitCreditIndicator': 'C',  # Credit
                'AmountInDocumentCurrency': str(payment.get('payment_amount', 0)),
                'Currency': remittance_data.get('currency', 'USD'),
                'Reference': payment.get('invoice_number'),
                'Text': f"Payment for {payment.get('invoice_number')}"
            }
            sap_doc['AccountingDocumentItems'].append(customer_item)
        
        return sap_doc
    
    def _prepare_pod_document(self, pod_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare POD data for SAP goods receipt"""
        
        sap_doc = {
            'GoodsMovementHeader': {
                'PostingDate': pod_data.get('delivery_date', str(date.today())),
                'DocumentDate': pod_data.get('delivery_date', str(date.today())),
                'Reference': pod_data.get('pod_number'),
                'HeaderText': f"Delivery {pod_data.get('pod_number')}"
            },
            'GoodsMovementItems': []
        }
        
        # Items delivered
        items = pod_data.get('items_delivered', [])
        for item in items:
            movement_item = {
                'Material': self._get_material_code(item.get('description')),
                'Plant': self._get_plant_code(),
                'StorageLocation': self._get_storage_location(),
                'MovementType': '101',  # Goods Receipt
                'Quantity': str(item.get('quantity_delivered', 0)),
                'UnitOfMeasure': item.get('unit', 'EA'),
                'Text': item.get('description', '')[:50]
            }
            sap_doc['GoodsMovementItems'].append(movement_item)
        
        return sap_doc
    
    def _post_to_sap(self, transaction_code: str, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """Post document to SAP system"""
        
        # This is a mock implementation - in real scenario, you would:
        # 1. Use SAP RFC/BAPI calls
        # 2. Use SAP OData services
        # 3. Use SAP REST APIs
        # 4. Use middleware like SAP PI/PO
        
        try:
            # Mock SAP API call
            sap_url = f"{self.config.get('base_url')}/sap/bc/rest/documents"
            
            payload = {
                'transaction_code': transaction_code,
                'client': self.config.get('client'),
                'document': document_data
            }
            
            # In real implementation, this would be actual SAP API call
            # response = self.session.post(sap_url, json=payload, timeout=30)
            
            # Mock successful response
            mock_response = {
                'success': True,
                'sap_document_number': f"SAP{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'message': f'Document posted successfully via {transaction_code}'
            }
            
            logger.info(f"SAP posting successful: {mock_response}")
            return mock_response
            
        except Exception as e:
            logger.error(f"SAP posting failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': 'SAP posting failed'
            }
    
    def _update_sap_status(self, db: Session, document_id: int, doc_type: str, 
                          business_data_id: int, sap_doc_number: str, status: str):
        """Update SAP posting status in database"""
        
        # Update business data table
        if doc_type == 'invoice':
            db.execute(text("""
                UPDATE invoice_data 
                SET sap_posted = TRUE, sap_document_number = :sap_doc, sap_posting_date = :now
                WHERE id = :id
            """), {
                "sap_doc": sap_doc_number,
                "now": datetime.now(),
                "id": business_data_id
            })
        elif doc_type == 'remittance':
            db.execute(text("""
                UPDATE remittance_data 
                SET sap_posted = TRUE, sap_document_number = :sap_doc, sap_posting_date = :now
                WHERE id = :id
            """), {
                "sap_doc": sap_doc_number,
                "now": datetime.now(),
                "id": business_data_id
            })
        elif doc_type == 'pod':
            db.execute(text("""
                UPDATE pod_data 
                SET sap_posted = TRUE, sap_document_number = :sap_doc, sap_posting_date = :now
                WHERE id = :id
            """), {
                "sap_doc": sap_doc_number,
                "now": datetime.now(),
                "id": business_data_id
            })
        
        # Log integration success
        db.execute(text("""
            INSERT INTO sap_integration_log 
            (document_id, document_type, business_data_id, integration_status, 
             sap_document_number, completed_at)
            VALUES (:doc_id, :doc_type, :biz_id, :status, :sap_doc, :now)
        """), {
            "doc_id": document_id,
            "doc_type": doc_type,
            "biz_id": business_data_id,
            "status": status,
            "sap_doc": sap_doc_number,
            "now": datetime.now()
        })
        
        db.commit()
    
    def _log_sap_error(self, db: Session, document_id: int, doc_type: str, 
                      business_data_id: int, error_message: str):
        """Log SAP integration error"""
        
        db.execute(text("""
            INSERT INTO sap_integration_log 
            (document_id, document_type, business_data_id, integration_status, 
             error_message, completed_at)
            VALUES (:doc_id, :doc_type, :biz_id, 'error', :error, :now)
        """), {
            "doc_id": document_id,
            "doc_type": doc_type,
            "biz_id": business_data_id,
            "error": error_message,
            "now": datetime.now()
        })
        
        db.commit()
    
    # Helper methods for SAP master data mapping
    def _get_vendor_code(self, vendor_name: str) -> str:
        """Map vendor name to SAP vendor code"""
        # In real implementation, this would query SAP vendor master
        vendor_mapping = {
            'Professional Services Inc.': 'V001',
            'ARIA Document Management Systems': 'V002'
        }
        return vendor_mapping.get(vendor_name, 'V999')  # Default vendor
    
    def _get_customer_code(self, customer_name: str) -> str:
        """Map customer name to SAP customer code"""
        customer_mapping = {
            'ARIA Document Management Systems': 'C001',
            'Professional Services Inc.': 'C002'
        }
        return customer_mapping.get(customer_name, 'C999')  # Default customer
    
    def _map_expense_account(self, description: str) -> str:
        """Map expense description to SAP GL account"""
        account_mapping = {
            'document processing': '6200001',  # IT Services
            'ocr integration': '6200002',      # Software
            'ai classification': '6200003',    # AI/ML Services
            'testing': '6200004',              # Testing Services
            'deployment': '6200005'            # Deployment Services
        }
        
        description_lower = description.lower()
        for key, account in account_mapping.items():
            if key in description_lower:
                return account
        
        return '6200000'  # Default expense account
    
    def _get_cost_center(self, description: str) -> str:
        """Get cost center based on description"""
        return 'CC001'  # Default cost center
    
    def _get_tax_account(self) -> str:
        """Get tax GL account"""
        return '2400001'  # Tax Payable
    
    def _get_tax_code(self, invoice_data: Dict[str, Any]) -> str:
        """Get tax code based on invoice data"""
        return 'T1'  # Default tax code
    
    def _get_bank_account(self, bank_details: Dict[str, Any]) -> str:
        """Get bank GL account"""
        return '1100001'  # Default bank account
    
    def _get_material_code(self, description: str) -> str:
        """Map item description to SAP material code"""
        return 'MAT001'  # Default material
    
    def _get_plant_code(self) -> str:
        """Get plant code"""
        return 'P001'  # Default plant
    
    def _get_storage_location(self) -> str:
        """Get storage location"""
        return 'SL01'  # Default storage location

class SAPConfigManager:
    """Manage SAP configuration settings"""
    
    @staticmethod
    def get_default_config() -> Dict[str, str]:
        """Get default SAP configuration"""
        return {
            'base_url': 'http://sap-server:8000',
            'username': 'SAP_USER',
            'password': 'SAP_PASS',
            'client': '100',
            'company_code': '1000'
        }
    
    @staticmethod
    def validate_config(config: Dict[str, str]) -> bool:
        """Validate SAP configuration"""
        required_fields = ['base_url', 'username', 'password', 'client', 'company_code']
        return all(field in config and config[field] for field in required_fields)