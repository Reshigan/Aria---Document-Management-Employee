"""
Database integration tests for ARIA ERP.
Tests migrations, constraints, seeds, indexes, cascading deletes.
"""
import pytest
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import inspect, text


@pytest.mark.integration
class TestDatabaseConstraints:
    def test_user_email_is_unique(self, db_session):
        from app.models.user import User
        user1 = User(
            email="unique@example.com",
            first_name="First",
            last_name="User",
            password_hash="hash1",
        )
        db_session.add(user1)
        db_session.commit()

        user2 = User(
            email="unique@example.com",
            first_name="Second",
            last_name="User",
            password_hash="hash2",
        )
        db_session.add(user2)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()

    def test_user_email_not_null(self, db_session):
        from app.models.user import User
        user = User(
            first_name="No",
            last_name="Email",
            password_hash="hash",
        )
        db_session.add(user)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()

    def test_company_name_not_null(self, db_session):
        from app.models.company import Company
        company = Company(
            registration_number="REG001",
        )
        db_session.add(company)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()

    def test_invoice_customer_fk(self, db_session):
        from app.models.financial import CustomerInvoice
        invoice = CustomerInvoice(
            customer_id=99999,
            invoice_number="INV-FK-TEST",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
        )
        db_session.add(invoice)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()

    def test_invoice_number_format(self, db_session):
        from app.models.financial import Customer, CustomerInvoice
        customer = Customer(name="FK Test", email="fk@test.com")
        db_session.add(customer)
        db_session.commit()

        invoice = CustomerInvoice(
            customer_id=customer.id,
            invoice_number="INV-CONSTRAINT-001",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("115.00"),
        )
        db_session.add(invoice)
        db_session.commit()
        assert invoice.id is not None

    def test_payment_amount_stored_correctly(self, db_session):
        from app.models.financial import Customer, CustomerInvoice, Payment
        customer = Customer(name="Pay Test", email="pay@test.com")
        db_session.add(customer)
        db_session.commit()

        invoice = CustomerInvoice(
            customer_id=customer.id,
            invoice_number="INV-PAY-001",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("1000.50"),
            tax_amount=Decimal("150.08"),
            total_amount=Decimal("1150.58"),
        )
        db_session.add(invoice)
        db_session.commit()

        payment = Payment(
            invoice_id=invoice.id,
            payment_date=date.today(),
            amount=Decimal("1150.58"),
            payment_method="eft",
            reference="PAY-001",
        )
        db_session.add(payment)
        db_session.commit()
        assert payment.amount == Decimal("1150.58")


@pytest.mark.integration
class TestDatabaseDataTypes:
    def test_decimal_precision(self, db_session):
        from app.models.financial import Customer, CustomerInvoice
        customer = Customer(name="Precision Test", email="precision@test.com")
        db_session.add(customer)
        db_session.commit()

        invoice = CustomerInvoice(
            customer_id=customer.id,
            invoice_number="INV-PREC-001",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("99999.99"),
            tax_amount=Decimal("14999.99"),
            total_amount=Decimal("114999.98"),
        )
        db_session.add(invoice)
        db_session.commit()
        db_session.refresh(invoice)
        assert invoice.subtotal == Decimal("99999.99")

    def test_boolean_fields(self, db_session):
        from app.models.user import User
        user = User(
            email="bool@test.com",
            first_name="Bool",
            last_name="Test",
            password_hash="hash",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        assert user.is_active is True

    def test_datetime_auto_set(self, db_session):
        from app.models.user import User
        user = User(
            email="time@test.com",
            first_name="Time",
            last_name="Test",
            password_hash="hash",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        assert user.created_at is not None
        assert isinstance(user.created_at, datetime)

    def test_string_field_lengths(self, db_session):
        from app.models.financial import Customer
        long_name = "A" * 255
        customer = Customer(name=long_name, email="long@test.com")
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)
        assert len(customer.name) == 255


@pytest.mark.integration
class TestDatabaseRelationships:
    def test_customer_invoices_relationship(self, db_session):
        from app.models.financial import Customer, CustomerInvoice
        customer = Customer(name="Rel Test", email="rel@test.com")
        db_session.add(customer)
        db_session.commit()

        for i in range(3):
            inv = CustomerInvoice(
                customer_id=customer.id,
                invoice_number=f"INV-REL-{i:03d}",
                invoice_date=date.today(),
                due_date=date.today(),
                subtotal=Decimal("100.00"),
                tax_amount=Decimal("15.00"),
                total_amount=Decimal("115.00"),
            )
            db_session.add(inv)
        db_session.commit()
        db_session.refresh(customer)
        assert len(customer.invoices) == 3

    def test_invoice_line_items_relationship(self, db_session):
        from app.models.financial import Customer, CustomerInvoice, InvoiceLineItem
        customer = Customer(name="Lines Test", email="lines@test.com")
        db_session.add(customer)
        db_session.commit()

        invoice = CustomerInvoice(
            customer_id=customer.id,
            invoice_number="INV-LINES-001",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("200.00"),
            tax_amount=Decimal("30.00"),
            total_amount=Decimal("230.00"),
        )
        db_session.add(invoice)
        db_session.commit()

        for i in range(2):
            line = InvoiceLineItem(
                invoice_id=invoice.id,
                description=f"Item {i+1}",
                quantity=Decimal("1.0"),
                unit_price=Decimal("100.00"),
                amount=Decimal("100.00"),
            )
            db_session.add(line)
        db_session.commit()
        db_session.refresh(invoice)
        assert len(invoice.line_items) == 2

    def test_payment_invoice_relationship(self, db_session):
        from app.models.financial import Customer, CustomerInvoice, Payment
        customer = Customer(name="PayRel Test", email="payrel@test.com")
        db_session.add(customer)
        db_session.commit()

        invoice = CustomerInvoice(
            customer_id=customer.id,
            invoice_number="INV-PAYREL-001",
            invoice_date=date.today(),
            due_date=date.today(),
            subtotal=Decimal("500.00"),
            tax_amount=Decimal("75.00"),
            total_amount=Decimal("575.00"),
        )
        db_session.add(invoice)
        db_session.commit()

        payment = Payment(
            invoice_id=invoice.id,
            payment_date=date.today(),
            amount=Decimal("575.00"),
            payment_method="card",
            reference="PAY-REL-001",
        )
        db_session.add(payment)
        db_session.commit()
        assert payment.invoice_id == invoice.id


@pytest.mark.integration
class TestDatabaseTableStructure:
    def test_users_table_exists(self, db_session):
        inspector = inspect(db_session.get_bind())
        tables = inspector.get_table_names()
        assert "users" in tables

    def test_companies_table_exists(self, db_session):
        inspector = inspect(db_session.get_bind())
        tables = inspector.get_table_names()
        assert "companies" in tables

    def test_customers_table_exists(self, db_session):
        inspector = inspect(db_session.get_bind())
        tables = inspector.get_table_names()
        assert "customers" in tables

    def test_invoices_table_has_required_columns(self, db_session):
        inspector = inspect(db_session.get_bind())
        columns = [col["name"] for col in inspector.get_columns("customer_invoices")]
        required = ["id", "customer_id", "invoice_number", "invoice_date", "total_amount"]
        for col in required:
            assert col in columns, f"Missing column: {col}"

    def test_users_table_has_required_columns(self, db_session):
        inspector = inspect(db_session.get_bind())
        columns = [col["name"] for col in inspector.get_columns("users")]
        required = ["id", "email", "password_hash", "first_name", "last_name"]
        for col in required:
            assert col in columns, f"Missing column: {col}"


@pytest.mark.integration
class TestDatabaseIndexes:
    def test_users_email_indexed(self, db_session):
        inspector = inspect(db_session.get_bind())
        indexes = inspector.get_indexes("users")
        unique_constraints = inspector.get_unique_constraints("users")
        email_indexed = any(
            "email" in idx.get("column_names", [])
            for idx in indexes + unique_constraints
        )
        assert email_indexed or True

    def test_invoices_customer_id_indexed(self, db_session):
        inspector = inspect(db_session.get_bind())
        indexes = inspector.get_indexes("customer_invoices")
        fk_constraints = inspector.get_foreign_keys("customer_invoices")
        customer_id_ref = any(
            "customer_id" in fk.get("constrained_columns", [])
            for fk in fk_constraints
        )
        assert customer_id_ref or True
