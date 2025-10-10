"""
SAP Connector Service for RFC/BAPI integration.

NOTE: This requires the pyrfc library which needs SAP NetWeaver RFC SDK.
For production use, install: pip install pyrfc
"""
import logging
from typing import Dict, Optional, List
from datetime import datetime
from core.config import settings

logger = logging.getLogger(__name__)


class SAPConnector:
    """SAP RFC/BAPI connector for posting documents and retrieving data."""
    
    def __init__(self):
        self.connection = None
        self.is_connected = False
    
    def connect(self) -> bool:
        """
        Establish connection to SAP system.
        
        Returns:
            True if connection successful, False otherwise
        """
        if not all([
            settings.SAP_ASHOST,
            settings.SAP_SYSNR,
            settings.SAP_CLIENT,
            settings.SAP_USER,
            settings.SAP_PASSWORD
        ]):
            logger.warning("SAP credentials not fully configured")
            return False
        
        try:
            # Import pyrfc (optional dependency)
            try:
                from pyrfc import Connection
            except ImportError:
                logger.warning(
                    "pyrfc not installed. SAP integration disabled. "
                    "Install with: pip install pyrfc"
                )
                return False
            
            self.connection = Connection(
                ashost=settings.SAP_ASHOST,
                sysnr=settings.SAP_SYSNR,
                client=settings.SAP_CLIENT,
                user=settings.SAP_USER,
                passwd=settings.SAP_PASSWORD,
                lang=settings.SAP_LANG
            )
            
            self.is_connected = True
            logger.info("Successfully connected to SAP")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to SAP: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self):
        """Close SAP connection."""
        if self.connection:
            try:
                self.connection.close()
                self.is_connected = False
                logger.info("Disconnected from SAP")
            except Exception as e:
                logger.error(f"Error disconnecting from SAP: {e}")
    
    def post_invoice(self, invoice_data: Dict) -> Dict:
        """
        Post invoice to SAP using BAPI_ACC_DOCUMENT_POST.
        
        Args:
            invoice_data: Invoice data dictionary
            
        Returns:
            Dictionary with posting result
        """
        if not self.is_connected:
            if not self.connect():
                return {
                    'success': False,
                    'error': 'Not connected to SAP'
                }
        
        try:
            # Prepare document header
            doc_header = {
                'DOC_TYPE': invoice_data.get('document_type', 'RE'),  # RE = Invoice
                'COMP_CODE': invoice_data.get('company_code', '1000'),
                'DOC_DATE': invoice_data.get('document_date', datetime.now().strftime('%Y%m%d')),
                'PSTNG_DATE': invoice_data.get('posting_date', datetime.now().strftime('%Y%m%d')),
                'REF_DOC_NO': invoice_data.get('invoice_number', ''),
                'CURRENCY': invoice_data.get('currency', 'USD'),
            }
            
            # Prepare account GL (General Ledger) line items
            accountgl = []
            
            # Vendor line (credit)
            accountgl.append({
                'ITEMNO_ACC': '1',
                'GL_ACCOUNT': invoice_data.get('gl_account', '0000100000'),
                'COMP_CODE': doc_header['COMP_CODE'],
                'DOC_TYPE': doc_header['DOC_TYPE'],
                'PSTNG_DATE': doc_header['PSTNG_DATE'],
                'ITEM_TEXT': invoice_data.get('description', ''),
            })
            
            # Currency amounts
            currencyamount = []
            
            # Credit amount for vendor
            currencyamount.append({
                'ITEMNO_ACC': '1',
                'CURRENCY': doc_header['CURRENCY'],
                'AMT_DOCCUR': invoice_data.get('total_amount', 0),
            })
            
            # Call BAPI to post document
            result = self.connection.call(
                'BAPI_ACC_DOCUMENT_POST',
                DOCUMENTHEADER=doc_header,
                ACCOUNTGL=accountgl,
                CURRENCYAMOUNT=currencyamount
            )
            
            # Check for errors
            if result.get('RETURN', {}).get('TYPE') in ['E', 'A']:
                error_msg = result.get('RETURN', {}).get('MESSAGE', 'Unknown error')
                logger.error(f"SAP posting error: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'sap_result': result
                }
            
            # Get document number
            doc_number = result.get('OBJ_KEY', '')
            
            logger.info(f"Successfully posted invoice to SAP. Document: {doc_number}")
            
            return {
                'success': True,
                'sap_document_number': doc_number,
                'fiscal_year': result.get('FISCALYEAR', ''),
                'sap_result': result
            }
            
        except Exception as e:
            logger.error(f"Error posting invoice to SAP: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def validate_vendor(self, vendor_code: str) -> Dict:
        """
        Validate vendor exists in SAP.
        
        Args:
            vendor_code: Vendor code to validate
            
        Returns:
            Dictionary with validation result
        """
        if not self.is_connected:
            if not self.connect():
                return {'valid': False, 'error': 'Not connected to SAP'}
        
        try:
            result = self.connection.call(
                'BAPI_VENDOR_GETDETAIL',
                VENDORNO=vendor_code
            )
            
            if result.get('RETURN', {}).get('TYPE') == 'E':
                return {
                    'valid': False,
                    'error': result.get('RETURN', {}).get('MESSAGE', 'Vendor not found')
                }
            
            vendor_detail = result.get('VENDORADDRESS', {})
            
            return {
                'valid': True,
                'vendor_code': vendor_code,
                'vendor_name': vendor_detail.get('NAME', ''),
                'vendor_details': vendor_detail
            }
            
        except Exception as e:
            logger.error(f"Error validating vendor: {e}")
            return {'valid': False, 'error': str(e)}
    
    def get_gl_account(self, account_number: str) -> Dict:
        """
        Get GL account details.
        
        Args:
            account_number: GL account number
            
        Returns:
            Dictionary with account details
        """
        if not self.is_connected:
            if not self.connect():
                return {'exists': False, 'error': 'Not connected to SAP'}
        
        try:
            result = self.connection.call(
                'BAPI_GL_ACC_GETDETAIL',
                GLACCT=account_number,
                COMPCODE='1000'
            )
            
            if result.get('RETURN', {}).get('TYPE') == 'E':
                return {
                    'exists': False,
                    'error': result.get('RETURN', {}).get('MESSAGE', 'Account not found')
                }
            
            return {
                'exists': True,
                'account_number': account_number,
                'details': result
            }
            
        except Exception as e:
            logger.error(f"Error getting GL account: {e}")
            return {'exists': False, 'error': str(e)}
    
    def get_purchase_order(self, po_number: str) -> Dict:
        """
        Get purchase order details from SAP.
        
        Args:
            po_number: Purchase order number
            
        Returns:
            Dictionary with PO details
        """
        if not self.is_connected:
            if not self.connect():
                return {'found': False, 'error': 'Not connected to SAP'}
        
        try:
            result = self.connection.call(
                'BAPI_PO_GETDETAIL',
                PURCHASEORDER=po_number
            )
            
            if result.get('RETURN', {}).get('TYPE') == 'E':
                return {
                    'found': False,
                    'error': result.get('RETURN', {}).get('MESSAGE', 'PO not found')
                }
            
            po_header = result.get('PO_HEADER', {})
            po_items = result.get('PO_ITEMS', [])
            
            return {
                'found': True,
                'po_number': po_number,
                'vendor': po_header.get('VENDOR', ''),
                'currency': po_header.get('CURRENCY', ''),
                'total_value': po_header.get('TOT_VALUE', 0),
                'items': po_items,
                'full_details': result
            }
            
        except Exception as e:
            logger.error(f"Error getting purchase order: {e}")
            return {'found': False, 'error': str(e)}
    
    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()


# Singleton instance
sap_connector = SAPConnector()
