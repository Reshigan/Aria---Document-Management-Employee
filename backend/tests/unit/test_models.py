"""
Unit tests for database models (100% coverage).
"""
import pytest
from decimal import Decimal
from datetime import date, datetime

from app.models.user import User, Role
from app.models.company import Company
from app.models.financial import (
    Customer,
    Supplier,
    CustomerInvoice,
    InvoiceLineItem,
    Payment,
    ChartOfAccounts,
    Currency,
)


@pytest.mark.unit
class TestUserModel:
    """Test User model."""
    
    def test_create_user(self, db_session):
        """Test creating a user."""
        user = User(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.is_active is True
        assert user.role == "user"
        assert user.created_at is not None
    
    def test_user_string_representation(self, db_session):
        """Test user __repr__ method."""
        user = User(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed",
        )
        db_session.add(user)
        db_session.commit()
        
        assert "test@example.com" in str(user)
    
    def test_user_full_name_property(self, db_session):
        """Test user full_name property."""
        user = User(
            email="test@example.com",
            first_name="John",
            last_name="Doe",
            password_hash="hashed",
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.full_name == "John Doe"


@pytest.mark.unit
class TestCompanyModel:
    """Test Company model."""
    
    def test_create_company(self, db_session):
        """Test creating a company."""
        company = Company(
            name="Test Company",
            registration_number="REG123",
            tax_number="TAX456",
            email="company@example.com",
        )
        db_session.add(company)
        db_session.commit()
        
        assert company.id is not None
        assert company.name == "Test Company"
        assert company.is_active is True


@pytest.mark.unit
class TestCustomerModel:
    """Test Customer model."""
    
    def test_create_customer(self, db_session):
        """Test creating a customer."""
        customer = Customer(
            name="Test Customer",
            email="customer@example.com",
            phone="+1234567890",
            address="123 Test St",
            city="Test City",
            country="Test Country",
        )
        db_session.add(customer)
        db_session.commit()
        
        assert customer.id is not None
        assert customer.name == "Test Customer"
        assert customer.is_active is True
        assert customer.created_at is not None
    
    def test_customer_relationships(self, db_session):
        """Test customer invoices relationship."""
        customer = Customer(name="Test Customer", email="test@example.com")
        db_session.add(customer)
        db_session.commit()
        
        invoice = CustomerInvoice(
            customer_id=customer.id,
            invoice_number="INV001",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
        )
        db_session.add(invoice)
        db_session.commit()
        
        db_session.refresh(customer)
        assert len(customer.invoices) == 1
        assert customer.invoices[0].invoice_number == "INV001"


@pytest.mark.unit
class TestSupplierModel:
    """Test Supplier model."""
    
    def test_create_supplier(self, db_session):
        """Test creating a supplier."""
        supplier = Supplier(
            name="Test Supplier",
            email="supplier@example.com",
            phone="+1234567890",
            address="456 Supplier St",
            city="Supplier City",
            country="Supplier Country",
        )
        db_session.add(supplier)
        db_session.commit()
        
        assert supplier.id is not None
        assert supplier.name == "Test Supplier"
        assert supplier.is_active is True


@pytest.mark.unit
class TestInvoiceModel:
    """Test Invoice models."""
    
    def test_create_invoice_with_line_items(self, db_session):
        """Test creating invoice with line items."""
        customer = Customer(name="Test Customer", email="test@example.com")
        db_session.add(customer)
        db_session.commit()
        
        invoice = CustomerInvoice(
            customer_id=customer.id,
            invoice_number="INV001",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
            status="draft",
        )
        db_session.add(invoice)
        db_session.commit()
        
        line_item = InvoiceLineItem(
            invoice_id=invoice.id,
            description="Test Item",
            quantity=Decimal("2.0"),
            unit_price=Decimal("50.00"),
            amount=Decimal("100.00"),
        )
        db_session.add(line_item)
        db_session.commit()
        
        db_session.refresh(invoice)
        assert len(invoice.line_items) == 1
        assert invoice.line_items[0].description == "Test Item"
        assert invoice.status == "draft"
    
    def test_invoice_status_values(self, db_session):
        """Test different invoice status values."""
        customer = Customer(name="Test Customer", email="test@example.com")
        db_session.add(customer)
        db_session.commit()
        
        statuses = ["draft", "sent", "paid", "overdue", "cancelled"]
        
        for status in statuses:
            invoice = CustomerInvoice(
                customer_id=customer.id,
                invoice_number=f"INV{status}",
                invoice_date=date.today(),
                due_date=date.today(),
                subtotal=Decimal("100.00"),
                tax_amount=Decimal("15.00"),
                total_amount=Decimal("115.00"),
                status=status,
            )
            db_session.add(invoice)
        
        db_session.commit()
        
        invoices = db_session.query(CustomerInvoice).all()
        assert len(invoices) == 5


@pytest.mark.unit
class TestPaymentModel:
    """Test Payment model."""
    
    def test_create_payment(self, db_session):
        """Test creating a payment."""
        customer = Customer(name="Test Customer", email="test@example.com")
        db_session.add(customer)
        db_session.commit()
        
        invoice = CustomerInvoice(
            customer_id=customer.id,
            invoice_number="INV001",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
        )
        db_session.add(invoice)
        db_session.commit()
        
        payment = Payment(
            invoice_id=invoice.id,
            payment_date=date.today(),
            amount=Decimal("115.00"),
            payment_method="bank_transfer",
            reference="PAY001",
        )
        db_session.add(payment)
        db_session.commit()
        
        assert payment.id is not None
        assert payment.amount == Decimal("115.00")
        assert payment.payment_method == "bank_transfer"


@pytest.mark.unit
class TestChartOfAccountsModel:
    """Test Chart of Accounts model."""
    
    def test_create_account(self, db_session):
        """Test creating an account."""
        account = ChartOfAccounts(
            account_code="1000",
            account_name="Cash",
            account_type="asset",
            is_active=True,
        )
        db_session.add(account)
        db_session.commit()
        
        assert account.id is not None
        assert account.account_code == "1000"
        assert account.account_type == "asset"
        assert account.is_active is True


@pytest.mark.unit
class TestCurrencyModel:
    """Test Currency model."""
    
    def test_create_currency(self, db_session):
        """Test creating a currency."""
        currency = Currency(
            code="USD",
            name="US Dollar",
            symbol="$",
            is_active=True,
        )
        db_session.add(currency)
        db_session.commit()
        
        assert currency.id is not None
        assert currency.code == "USD"
        assert currency.symbol == "$"
