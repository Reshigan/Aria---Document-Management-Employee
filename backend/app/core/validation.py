"""
Business Logic Validation Service for ARIA ERP
Implements Zero-Slop validation principles (Laws 31-38)
"""
from typing import Dict, List, Any, Optional
from decimal import Decimal
import logging
from datetime import datetime, date
from sqlalchemy.orm import Session

from models.customer import Customer
from models.vendor import Vendor
from models.product import Product
from models.inventory import InventoryTransaction
from models.journal_entry import JournalEntry, JournalLine

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom validation error for business logic"""
    def __init__(self, message: str, field: str = None, code: str = None):
        super().__init__(message)
        self.field = field
        self.code = code

class BusinessLogicValidator:
    """
    Central business logic validator implementing Zero-Slop principles
    Laws 31-38: No silent errors, comprehensive validation, financial accuracy
    """
    
    def __init__(self, db: Session, company_id: str):
        self.db = db
        self.company_id = company_id
    
    # ==================== CUSTOMER VALIDATIONS ====================
    
    def validate_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate customer data with comprehensive business rules"""
        errors = []
        
        # Required fields validation
        if not customer_data.get('name'):
            errors.append(ValidationError("Customer name is required", "name", "MISSING_NAME"))
        
        if not customer_data.get('email') and not customer_data.get('phone'):
            errors.append(ValidationError("Either email or phone is required", "contact", "MISSING_CONTACT"))
        
        # Email format validation
        if customer_data.get('email'):
            if '@' not in customer_data['email']:
                errors.append(ValidationError("Invalid email format", "email", "INVALID_EMAIL"))
        
        # Credit limit validation
        credit_limit = customer_data.get('credit_limit', 0)
        if credit_limit < 0:
            errors.append(ValidationError("Credit limit cannot be negative", "credit_limit", "NEGATIVE_CREDIT_LIMIT"))
        
        # Tax ID validation for South African businesses
        tax_id = customer_data.get('tax_id')
        if tax_id and len(tax_id) < 5:
            errors.append(ValidationError("Tax ID appears to be too short", "tax_id", "INVALID_TAX_ID"))
        
        # Address validation
        if not customer_data.get('address_line1'):
            errors.append(ValidationError("Address line 1 is required", "address_line1", "MISSING_ADDRESS"))
        
        # Payment terms validation
        payment_terms = customer_data.get('payment_terms')
        valid_terms = ['NET_30', 'NET_60', 'NET_90', 'DUE_ON_RECEIPT', 'CUSTOM']
        if payment_terms and payment_terms not in valid_terms:
            errors.append(ValidationError(f"Invalid payment terms. Must be one of: {valid_terms}", "payment_terms", "INVALID_PAYMENT_TERMS"))
        
        if errors:
            raise ValidationError(f"Customer validation failed: {[e.args[0] for e in errors]}")
        
        return customer_data
    
    # ==================== VENDOR VALIDATIONS ====================
    
    def validate_vendor(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate vendor data with comprehensive business rules"""
        errors = []
        
        # Required fields validation
        if not vendor_data.get('name'):
            errors.append(ValidationError("Vendor name is required", "name", "MISSING_NAME"))
        
        if not vendor_data.get('email') and not vendor_data.get('phone'):
            errors.append(ValidationError("Either email or phone is required", "contact", "MISSING_CONTACT"))
        
        # Email format validation
        if vendor_data.get('email'):
            if '@' not in vendor_data['email']:
                errors.append(ValidationError("Invalid email format", "email", "INVALID_EMAIL"))
        
        # Tax ID validation
        tax_id = vendor_data.get('tax_id')
        if tax_id and len(tax_id) < 5:
            errors.append(ValidationError("Tax ID appears to be too short", "tax_id", "INVALID_TAX_ID"))
        
        # Payment terms validation
        payment_terms = vendor_data.get('payment_terms')
        valid_terms = ['NET_30', 'NET_60', 'NET_90', 'DUE_ON_RECEIPT', 'CUSTOM']
        if payment_terms and payment_terms not in valid_terms:
            errors.append(ValidationError(f"Invalid payment terms. Must be one of: {valid_terms}", "payment_terms", "INVALID_PAYMENT_TERMS"))
        
        # Banking details for electronic payments
        if vendor_data.get('preferred_payment_method') == 'ELECTRONIC':
            if not vendor_data.get('bank_account_number') or not vendor_data.get('bank_code'):
                errors.append(ValidationError("Bank account details are required for electronic payments", "banking", "MISSING_BANK_DETAILS"))
        
        if errors:
            raise ValidationError(f"Vendor validation failed: {[e.args[0] for e in errors]}")
        
        return vendor_data
    
    # ==================== PRODUCT VALIDATIONS ====================
    
    def validate_product(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate product data with comprehensive business rules"""
        errors = []
        
        # Required fields validation
        if not product_data.get('product_code'):
            errors.append(ValidationError("Product code is required", "product_code", "MISSING_CODE"))
        
        if not product_data.get('name'):
            errors.append(ValidationError("Product name is required", "name", "MISSING_NAME"))
        
        # Unique product code check
        existing_product = self.db.query(Product).filter(
            Product.product_code == product_data['product_code'],
            Product.company_id == self.company_id
        ).first()
        
        if existing_product and not product_data.get('id'):
            errors.append(ValidationError("Product code already exists", "product_code", "DUPLICATE_CODE"))
        
        # Price validation
        sales_price = product_data.get('sales_price', 0)
        purchase_price = product_data.get('purchase_price', 0)
        
        if sales_price < 0:
            errors.append(ValidationError("Sales price cannot be negative", "sales_price", "NEGATIVE_SALES_PRICE"))
        
        if purchase_price < 0:
            errors.append(ValidationError("Purchase price cannot be negative", "purchase_price", "NEGATIVE_PURCHASE_PRICE"))
        
        # Markup calculation warning for very low markup
        if sales_price > 0 and purchase_price > 0:
            markup = ((sales_price - purchase_price) / purchase_price) * 100
            if markup < 5:
                logger.warning(f"Low markup detected ({markup:.2f}%) for product {product_data.get('product_code')}")
        
        # Inventory tracking validation
        track_inventory = product_data.get('track_inventory', True)
        inventory_unit = product_data.get('inventory_unit')
        
        if track_inventory and not inventory_unit:
            errors.append(ValidationError("Inventory unit is required for tracked products", "inventory_unit", "MISSING_INVENTORY_UNIT"))
        
        # Category validation
        category = product_data.get('category')
        valid_categories = ['RAW_MATERIAL', 'FINISHED_GOOD', 'SERVICE', 'CONSUMABLE', 'OTHER']
        if category and category not in valid_categories:
            errors.append(ValidationError(f"Invalid product category. Must be one of: {valid_categories}", "category", "INVALID_CATEGORY"))
        
        if errors:
            raise ValidationError(f"Product validation failed: {[e.args[0] for e in errors]}")
        
        return product_data
    
    # ==================== FINANCIAL VALIDATIONS ====================
    
    def validate_journal_entry(self, je_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate journal entry data with accounting principles"""
        errors = []
        
        # Date validation
        if not je_data.get('entry_date'):
            errors.append(ValidationError("Entry date is required", "entry_date", "MISSING_DATE"))
        
        # Description validation
        if not je_data.get('description'):
            errors.append(ValidationError("Description is required", "description", "MISSING_DESCRIPTION"))
        
        # Debit/Credit balance validation
        total_debits = Decimal('0')
        total_credits = Decimal('0')
        lines = je_data.get('lines', [])
        
        if not lines:
            errors.append(ValidationError("At least one journal line is required", "lines", "MISSING_LINES"))
        
        account_numbers = set()  # To check for duplicates
        
        for i, line in enumerate(lines):
            # Validate account number
            account_number = line.get('account_number')
            if not account_number:
                errors.append(ValidationError(f"Account number is required for line {i+1}", f"line_{i}_account_number", "MISSING_ACCOUNT"))
            else:
                account_numbers.add(account_number)
            
            # Validate amounts
            debit = Decimal(str(line.get('debit_amount', 0)))
            credit = Decimal(str(line.get('credit_amount', 0)))
            
            total_debits += debit
            total_credits += credit
            
            # Both debit and credit cannot be non-zero
            if debit != 0 and credit != 0:
                errors.append(ValidationError(f"Line {i+1}: Cannot have both debit and credit amounts", f"line_{i}_amounts", "BOTH_DEBIT_CREDIT"))
            
            # At least one must be non-zero
            if debit == 0 and credit == 0:
                errors.append(ValidationError(f"Line {i+1}: Either debit or credit amount is required", f"line_{i}_amounts", "MISSING_AMOUNT"))
        
        # Validate accounting equation
        tolerance = Decimal('0.01')  # Allow for minor rounding differences
        difference = abs(total_debits - total_credits)
        
        if difference > tolerance:
            errors.append(ValidationError(
                f"Debits ({total_debits}) and credits ({total_credits}) must balance. Difference: {difference}",
                "balance",
                "UNBALANCED_ENTRY"
            ))
        
        # Check for duplicate accounts in same entry
        if len(account_numbers) != len(lines):
            errors.append(ValidationError("Duplicate accounts in same journal entry", "accounts", "DUPLICATE_ACCOUNTS"))
        
        if errors:
            raise ValidationError(f"Journal entry validation failed: {[e.args[0] for e in errors]}")
        
        return je_data
    
    # ==================== INVENTORY VALIDATIONS ====================
    
    def validate_inventory_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate inventory transaction data"""
        errors = []
        
        # Required fields
        if not transaction_data.get('product_id'):
            errors.append(ValidationError("Product ID is required", "product_id", "MISSING_PRODUCT"))
        
        if not transaction_data.get('transaction_type'):
            errors.append(ValidationError("Transaction type is required", "transaction_type", "MISSING_TYPE"))
        
        # Quantity validation
        quantity = transaction_data.get('quantity', 0)
        if quantity <= 0:
            errors.append(ValidationError("Quantity must be positive", "quantity", "NON_POSITIVE_QUANTITY"))
        
        # Unit cost validation
        unit_cost = transaction_data.get('unit_cost', 0)
        if unit_cost < 0:
            errors.append(ValidationError("Unit cost cannot be negative", "unit_cost", "NEGATIVE_COST"))
        
        # Warehouse validation
        if not transaction_data.get('warehouse_id'):
            errors.append(ValidationError("Warehouse ID is required", "warehouse_id", "MISSING_WAREHOUSE"))
        
        # Transaction type validation
        valid_types = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']
        transaction_type = transaction_data.get('transaction_type')
        if transaction_type and transaction_type not in valid_types:
            errors.append(ValidationError(f"Invalid transaction type. Must be one of: {valid_types}", "transaction_type", "INVALID_TYPE"))
        
        # Reason required for adjustments
        if transaction_type == 'ADJUSTMENT' and not transaction_data.get('adjustment_reason'):
            errors.append(ValidationError("Adjustment reason is required for adjustment transactions", "adjustment_reason", "MISSING_REASON"))
        
        # Reference validation for traceability
        if not transaction_data.get('reference'):
            errors.append(ValidationError("Reference is required for traceability", "reference", "MISSING_REFERENCE"))
        
        if errors:
            raise ValidationError(f"Inventory transaction validation failed: {[e.args[0] for e in errors]}")
        
        return transaction_data
    
    # ==================== DOCUMENT VALIDATIONS ====================
    
    def validate_document(self, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate document data with compliance rules"""
        errors = []
        
        # Required fields
        if not document_data.get('document_type'):
            errors.append(ValidationError("Document type is required", "document_type", "MISSING_TYPE"))
        
        if not document_data.get('title'):
            errors.append(ValidationError("Document title is required", "title", "MISSING_TITLE"))
        
        # File validation
        if not document_data.get('file_path') and not document_data.get('content'):
            errors.append(ValidationError("Either file path or content is required", "file", "MISSING_FILE"))
        
        # Date validation
        if not document_data.get('document_date'):
            errors.append(ValidationError("Document date is required", "document_date", "MISSING_DATE"))
        
        # Document type validation
        valid_types = ['INVOICE', 'RECEIPT', 'CONTRACT', 'REPORT', 'POLICY', 'OTHER']
        doc_type = document_data.get('document_type')
        if doc_type and doc_type not in valid_types:
            errors.append(ValidationError(f"Invalid document type. Must be one of: {valid_types}", "document_type", "INVALID_TYPE"))
        
        # Compliance validation for financial documents
        if doc_type in ['INVOICE', 'RECEIPT', 'CONTRACT']:
            if not document_data.get('related_party_id'):
                errors.append(ValidationError("Related party is required for financial documents", "related_party_id", "MISSING_PARTY"))
        
        # Classification validation
        if not document_data.get('classification'):
            errors.append(ValidationError("Document classification is required", "classification", "MISSING_CLASSIFICATION"))
        
        if errors:
            raise ValidationError(f"Document validation failed: {[e.args[0] for e in errors]}")
        
        return document_data

def get_business_logic_validator(db: Session, company_id: str) -> BusinessLogicValidator:
    """Factory function to get business logic validator"""
    return BusinessLogicValidator(db, company_id)