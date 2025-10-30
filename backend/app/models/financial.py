"""
ARIA ERP - Financial Management Models
"""
from sqlalchemy import Column, String, Boolean, Date, DateTime, Integer, Numeric, Text, ForeignKey
from app.models.types import GUID, JSONType
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ChartOfAccounts(BaseModel):
    """Chart of Accounts model"""
    
    __tablename__ = "chart_of_accounts"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False)  # asset, liability, equity, revenue, expense
    account_category = Column(String(100))
    parent_account_id = Column(GUID, ForeignKey("chart_of_accounts.id"))
    
    # Properties
    currency = Column(String(3), default="ZAR")
    is_reconcilable = Column(Boolean, default=False)
    is_system_account = Column(Boolean, default=False)
    
    # Balance
    opening_balance = Column(Numeric(15, 2), default=0)
    current_balance = Column(Numeric(15, 2), default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    parent_account = relationship("ChartOfAccounts", remote_side="ChartOfAccounts.id", foreign_keys=[parent_account_id])
    
    def __repr__(self):
        return f"<Account {self.code} - {self.name}>"


class Currency(BaseModel):
    """Currency model"""
    
    __tablename__ = "currencies"
    
    code = Column(String(3), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    symbol = Column(String(10))
    decimal_places = Column(Integer, default=2)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<Currency {self.code}>"


class ExchangeRate(BaseModel):
    """Exchange Rate model"""
    
    __tablename__ = "exchange_rates"
    
    from_currency = Column(String(3), nullable=False)
    to_currency = Column(String(3), nullable=False)
    rate = Column(Numeric(15, 6), nullable=False)
    rate_date = Column(Date, nullable=False)
    
    def __repr__(self):
        return f"<ExchangeRate {self.from_currency}/{self.to_currency} = {self.rate}>"


class JournalEntry(BaseModel):
    """Journal Entry model"""
    
    __tablename__ = "journal_entries"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    journal_number = Column(String(50), unique=True, nullable=False)
    
    # Details
    entry_date = Column(Date, nullable=False)
    posting_date = Column(Date)
    description = Column(Text)
    reference = Column(String(100))
    
    # Source
    source_type = Column(String(50))  # manual, invoice, payment, etc.
    source_id = Column(GUID)
    
    # Status
    status = Column(String(50), default="draft")  # draft, posted, reversed
    posted_by = Column(GUID, ForeignKey("users.id"))
    posted_at = Column(DateTime)
    reversed_by = Column(GUID, ForeignKey("users.id"))
    reversed_at = Column(DateTime)
    reversal_entry_id = Column(GUID, ForeignKey("journal_entries.id"))
    
    created_by = Column(GUID, ForeignKey("users.id"))
    
    # Relationships
    lines = relationship("JournalEntryLine", back_populates="journal_entry", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<JournalEntry {self.journal_number}>"


class JournalEntryLine(BaseModel):
    """Journal Entry Line model"""
    
    __tablename__ = "journal_entry_lines"
    
    journal_entry_id = Column(GUID, ForeignKey("journal_entries.id"))
    account_id = Column(GUID, ForeignKey("chart_of_accounts.id"))
    
    # Amounts
    debit_amount = Column(Numeric(15, 2), default=0)
    credit_amount = Column(Numeric(15, 2), default=0)
    
    # Details
    description = Column(Text)
    cost_center = Column(String(100))
    department = Column(String(100))
    project_id = Column(GUID)
    
    # Metadata
    line_number = Column(Integer)
    
    # Relationships
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("ChartOfAccounts")
    
    def __repr__(self):
        return f"<JournalEntryLine DR:{self.debit_amount} CR:{self.credit_amount}>"


class BankAccount(BaseModel):
    """Bank Account model"""
    
    __tablename__ = "bank_accounts"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    account_id = Column(GUID, ForeignKey("chart_of_accounts.id"))
    
    # Bank details
    bank_name = Column(String(255), nullable=False)
    branch_name = Column(String(255))
    account_number = Column(String(100), nullable=False)
    account_type = Column(String(50))  # checking, savings, credit_card
    currency = Column(String(3), default="ZAR")
    
    # Balance
    opening_balance = Column(Numeric(15, 2), default=0)
    current_balance = Column(Numeric(15, 2), default=0)
    
    # Bank feed
    bank_feed_enabled = Column(Boolean, default=False)
    bank_feed_provider = Column(String(100))
    bank_feed_account_id = Column(String(255))
    last_sync_at = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    gl_account = relationship("ChartOfAccounts")
    transactions = relationship("BankTransaction", back_populates="bank_account")
    
    def __repr__(self):
        return f"<BankAccount {self.bank_name} - {self.account_number}>"


class BankTransaction(BaseModel):
    """Bank Transaction model"""
    
    __tablename__ = "bank_transactions"
    
    bank_account_id = Column(GUID, ForeignKey("bank_accounts.id"))
    
    # Transaction details
    transaction_date = Column(Date, nullable=False)
    description = Column(Text)
    reference = Column(String(255))
    amount = Column(Numeric(15, 2), nullable=False)
    balance = Column(Numeric(15, 2))
    
    # Classification
    transaction_type = Column(String(50))  # debit, credit
    category = Column(String(100))
    
    # Reconciliation
    is_reconciled = Column(Boolean, default=False)
    reconciled_with_type = Column(String(50))  # invoice, payment, journal_entry
    reconciled_with_id = Column(GUID)
    reconciled_at = Column(DateTime)
    reconciled_by = Column(GUID, ForeignKey("users.id"))
    
    # Source
    source = Column(String(50), default="bank_feed")  # bank_feed, manual
    external_id = Column(String(255))
    
    # Relationships
    bank_account = relationship("BankAccount", back_populates="transactions")
    
    def __repr__(self):
        return f"<BankTransaction {self.transaction_date} - {self.amount}>"


class Customer(BaseModel):
    """Customer model"""
    
    __tablename__ = "customers"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    customer_number = Column(String(50), unique=True, nullable=False)
    
    # Basic info
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    website = Column(String(255))
    
    # Classification
    customer_type = Column(String(50), default="business")
    industry = Column(String(100))
    tax_number = Column(String(100))
    vat_number = Column(String(100))
    
    # Financial
    credit_limit = Column(Numeric(15, 2), default=0)
    payment_terms = Column(Integer, default=30)  # days
    currency = Column(String(3), default="ZAR")
    
    # Address
    billing_address_line1 = Column(String(255))
    billing_address_line2 = Column(String(255))
    billing_city = Column(String(100))
    billing_state = Column(String(100))
    billing_postal_code = Column(String(20))
    billing_country = Column(String(100))
    
    shipping_address_line1 = Column(String(255))
    shipping_address_line2 = Column(String(255))
    shipping_city = Column(String(100))
    shipping_state = Column(String(100))
    shipping_postal_code = Column(String(20))
    shipping_country = Column(String(100))
    
    # Contact person
    contact_person_name = Column(String(255))
    contact_person_email = Column(String(255))
    contact_person_phone = Column(String(50))
    
    # Status
    is_active = Column(Boolean, default=True)
    created_by = Column(GUID, ForeignKey("users.id"))
    
    # Relationships
    invoices = relationship("CustomerInvoice", back_populates="customer")
    
    def __repr__(self):
        return f"<Customer {self.customer_number} - {self.name}>"


class Supplier(BaseModel):
    """Supplier/Vendor model"""
    
    __tablename__ = "suppliers"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    supplier_number = Column(String(50), unique=True, nullable=False)
    
    # Basic info
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    website = Column(String(255))
    
    # Classification
    supplier_type = Column(String(50), default="business")
    industry = Column(String(100))
    tax_number = Column(String(100))
    vat_number = Column(String(100))
    
    # BBBEE (South Africa)
    bbbee_level = Column(Integer)
    bbbee_certificate_expiry = Column(Date)
    is_black_owned = Column(Boolean, default=False)
    black_ownership_percentage = Column(Numeric(5, 2))
    
    # Financial
    payment_terms = Column(Integer, default=30)
    currency = Column(String(3), default="ZAR")
    bank_name = Column(String(255))
    bank_account_number = Column(String(100))
    bank_branch_code = Column(String(50))
    
    # Address
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100))
    
    # Contact person
    contact_person_name = Column(String(255))
    contact_person_email = Column(String(255))
    contact_person_phone = Column(String(50))
    
    # Rating
    rating = Column(Integer)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_by = Column(GUID, ForeignKey("users.id"))
    
    # Relationships
    invoices = relationship("SupplierInvoice", back_populates="supplier")
    
    def __repr__(self):
        return f"<Supplier {self.supplier_number} - {self.name}>"


class CustomerInvoice(BaseModel):
    """Customer Invoice (AR) model"""
    
    __tablename__ = "customer_invoices"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    customer_id = Column(GUID, ForeignKey("customers.id"))
    
    # Invoice details
    invoice_number = Column(String(50), unique=True, nullable=False)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    
    # Reference
    customer_po_number = Column(String(100))
    sales_order_id = Column(GUID)
    
    # Amounts
    subtotal = Column(Numeric(15, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(15, 2), default=0)
    discount_amount = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    paid_amount = Column(Numeric(15, 2), default=0)
    balance_due = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Currency
    currency = Column(String(3), default="ZAR")
    exchange_rate = Column(Numeric(15, 6), default=1)
    
    # Status
    status = Column(String(50), default="draft")  # draft, sent, partially_paid, paid, overdue, cancelled
    
    # AI Processing
    bot_processed = Column(Boolean, default=False)
    bot_confidence_score = Column(Numeric(3, 2))
    
    # Metadata
    notes = Column(Text)
    terms_conditions = Column(Text)
    created_by = Column(GUID, ForeignKey("users.id"))
    
    # Relationships
    customer = relationship("Customer", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<CustomerInvoice {self.invoice_number}>"


class InvoiceLineItem(BaseModel):
    """Invoice Line Item model"""
    
    __tablename__ = "invoice_line_items"
    
    invoice_id = Column(GUID, ForeignKey("customer_invoices.id"))
    
    # Product/Service
    product_id = Column(GUID)
    description = Column(Text, nullable=False)
    
    # Quantity & Price
    quantity = Column(Numeric(10, 2), default=1)
    unit_price = Column(Numeric(15, 2), nullable=False)
    
    # Amounts
    line_total = Column(Numeric(15, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0)
    tax_amount = Column(Numeric(15, 2), default=0)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(15, 2), default=0)
    
    # Accounting
    revenue_account_id = Column(GUID, ForeignKey("chart_of_accounts.id"))
    
    # Metadata
    line_number = Column(Integer)
    
    # Relationships
    invoice = relationship("CustomerInvoice", back_populates="line_items")
    
    def __repr__(self):
        return f"<InvoiceLineItem {self.description} - {self.line_total}>"


class SupplierInvoice(BaseModel):
    """Supplier Invoice (AP) model"""
    
    __tablename__ = "supplier_invoices"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    supplier_id = Column(GUID, ForeignKey("suppliers.id"))
    
    # Invoice details
    invoice_number = Column(String(50), nullable=False)
    supplier_invoice_number = Column(String(100))
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    
    # Reference
    purchase_order_id = Column(GUID)
    receipt_id = Column(GUID)
    
    # Amounts
    subtotal = Column(Numeric(15, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    paid_amount = Column(Numeric(15, 2), default=0)
    balance_due = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Currency
    currency = Column(String(3), default="ZAR")
    exchange_rate = Column(Numeric(15, 6), default=1)
    
    # Status
    status = Column(String(50), default="draft")  # draft, pending_approval, approved, partially_paid, paid, cancelled
    approved_by = Column(GUID, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    
    # 3-way matching
    po_matched = Column(Boolean, default=False)
    receipt_matched = Column(Boolean, default=False)
    three_way_matched = Column(Boolean, default=False)
    matching_exceptions = Column(Text)
    
    # AI Processing
    bot_processed = Column(Boolean, default=False)
    bot_extracted_data = Column(JSONType)
    bot_confidence_score = Column(Numeric(3, 2))
    ocr_document_url = Column(Text)
    
    # Metadata
    notes = Column(Text)
    created_by = Column(GUID, ForeignKey("users.id"))
    
    # Relationships
    supplier = relationship("Supplier", back_populates="invoices")
    line_items = relationship("SupplierInvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<SupplierInvoice {self.invoice_number}>"


class SupplierInvoiceLineItem(BaseModel):
    """Supplier Invoice Line Item model"""
    
    __tablename__ = "supplier_invoice_line_items"
    
    supplier_invoice_id = Column(GUID, ForeignKey("supplier_invoices.id"))
    
    # Product/Service
    product_id = Column(GUID)
    description = Column(Text, nullable=False)
    
    # Quantity & Price
    quantity = Column(Numeric(10, 2), default=1)
    unit_price = Column(Numeric(15, 2), nullable=False)
    
    # Amounts
    line_total = Column(Numeric(15, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0)
    tax_amount = Column(Numeric(15, 2), default=0)
    
    # Accounting
    expense_account_id = Column(GUID, ForeignKey("chart_of_accounts.id"))
    
    # Metadata
    line_number = Column(Integer)
    
    # Relationships
    invoice = relationship("SupplierInvoice", back_populates="line_items")
    
    def __repr__(self):
        return f"<SupplierInvoiceLineItem {self.description} - {self.line_total}>"


class Payment(BaseModel):
    """Payment model"""
    
    __tablename__ = "payments"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    payment_number = Column(String(50), unique=True, nullable=False)
    
    # Type
    payment_type = Column(String(50), nullable=False)  # customer_payment, supplier_payment
    
    # Parties
    customer_id = Column(GUID, ForeignKey("customers.id"))
    supplier_id = Column(GUID, ForeignKey("suppliers.id"))
    
    # Payment details
    payment_date = Column(Date, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="ZAR")
    exchange_rate = Column(Numeric(15, 6), default=1)
    
    # Payment method
    payment_method = Column(String(50))  # cash, check, eft, credit_card, etc.
    reference = Column(String(255))
    check_number = Column(String(100))
    
    # Banking
    bank_account_id = Column(GUID, ForeignKey("bank_accounts.id"))
    bank_transaction_id = Column(GUID, ForeignKey("bank_transactions.id"))
    
    # Status
    status = Column(String(50), default="pending")  # pending, cleared, bounced, cancelled
    
    # AI Processing
    bot_processed = Column(Boolean, default=False)
    
    # Metadata
    notes = Column(Text)
    created_by = Column(GUID, ForeignKey("users.id"))
    
    # Relationships
    allocations = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Payment {self.payment_number} - {self.amount}>"


class PaymentAllocation(BaseModel):
    """Payment Allocation model (linking payments to invoices)"""
    
    __tablename__ = "payment_allocations"
    
    payment_id = Column(GUID, ForeignKey("payments.id"))
    
    # Invoice reference
    invoice_type = Column(String(50))  # customer_invoice, supplier_invoice
    customer_invoice_id = Column(GUID, ForeignKey("customer_invoices.id"))
    supplier_invoice_id = Column(GUID, ForeignKey("supplier_invoices.id"))
    
    # Allocation amount
    allocated_amount = Column(Numeric(15, 2), nullable=False)
    
    # Relationships
    payment = relationship("Payment", back_populates="allocations")
    
    def __repr__(self):
        return f"<PaymentAllocation {self.allocated_amount}>"


class Budget(BaseModel):
    """Budget model"""
    
    __tablename__ = "budgets"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Period
    budget_type = Column(String(50))  # annual, quarterly, monthly, project
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    fiscal_year = Column(Integer)
    
    # Scope
    department = Column(String(100))
    cost_center = Column(String(100))
    project_id = Column(GUID)
    
    # Amounts
    total_budget_amount = Column(Numeric(15, 2), nullable=False)
    actual_amount = Column(Numeric(15, 2), default=0)
    committed_amount = Column(Numeric(15, 2), default=0)
    remaining_amount = Column(Numeric(15, 2))
    
    # Status
    status = Column(String(50), default="draft")  # draft, approved, active, closed
    approved_by = Column(GUID, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    
    # Metadata
    created_by = Column(GUID, ForeignKey("users.id"))
    
    # Relationships
    line_items = relationship("BudgetLineItem", back_populates="budget", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Budget {self.name}>"


class BudgetLineItem(BaseModel):
    """Budget Line Item model"""
    
    __tablename__ = "budget_line_items"
    
    budget_id = Column(GUID, ForeignKey("budgets.id"))
    account_id = Column(GUID, ForeignKey("chart_of_accounts.id"))
    
    # Amounts
    budgeted_amount = Column(Numeric(15, 2), nullable=False)
    actual_amount = Column(Numeric(15, 2), default=0)
    variance_amount = Column(Numeric(15, 2))
    variance_percentage = Column(Numeric(5, 2))
    
    # Period allocation
    period_type = Column(String(50))  # monthly, quarterly
    period_allocations = Column(JSONType)  # {"jan": 1000, "feb": 1200, ...}
    
    # Relationships
    budget = relationship("Budget", back_populates="line_items")
    
    def __repr__(self):
        return f"<BudgetLineItem {self.budgeted_amount}>"


class TaxRate(BaseModel):
    """Tax Rate model"""
    
    __tablename__ = "tax_rates"
    
    company_id = Column(GUID, ForeignKey("companies.id"))
    name = Column(String(100), nullable=False)
    code = Column(String(20))
    rate = Column(Numeric(5, 2), nullable=False)
    tax_type = Column(String(50))  # vat, sales_tax, withholding, etc.
    
    # Applicability
    is_default = Column(Boolean, default=False)
    effective_from = Column(Date)
    effective_to = Column(Date)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<TaxRate {self.name} - {self.rate}%>"
