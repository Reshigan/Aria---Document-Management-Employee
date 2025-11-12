"""
ARIA ERP - Enhanced Month-Long Production Simulation
Simulates 30 days of realistic business operations with backdated transactions
"""

import sys
import os
from datetime import datetime, timedelta, date
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.transactions import Customer, Supplier, Invoice, InvoiceLine, Bill, BillLine, Payment, PaymentAllocation
from models.accounting import ChartOfAccounts, GeneralLedger, GeneralLedgerLine
from models.user import User

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///aria_simulation.db')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

COMPANY_ID = "b0598135-52fd-4f67-ac56-8f0237e6355e"
TENANT_ID = os.getenv('SIM_TENANT_ID', 'simulation')

class SimulationStats:
    """Track simulation statistics"""
    def __init__(self):
        self.customers_created = 0
        self.suppliers_created = 0
        self.invoices_created = 0
        self.bills_created = 0
        self.payments_created = 0
        self.gl_entries_created = 0
        self.errors = []
    
    def print_summary(self):
        print("\n" + "="*60)
        print("SIMULATION SUMMARY")
        print("="*60)
        print(f"Customers Created:    {self.customers_created}")
        print(f"Suppliers Created:    {self.suppliers_created}")
        print(f"Invoices Created:     {self.invoices_created}")
        print(f"Bills Created:        {self.bills_created}")
        print(f"Payments Created:     {self.payments_created}")
        print(f"GL Entries Created:   {self.gl_entries_created}")
        print(f"Errors Encountered:   {len(self.errors)}")
        if self.errors:
            print("\nErrors:")
            for error in self.errors[:10]:
                print(f"  - {error}")
        print("="*60)

stats = SimulationStats()

def create_customers(session):
    """Create 20 demo customers"""
    print("\n📊 Creating Customers...")
    
    customers_data = [
        {"code": "CUST-001", "name": "ABC Manufacturing (Pty) Ltd", "vat": "4123456789", "terms": 30, "credit_limit": 100000},
        {"code": "CUST-002", "name": "XYZ Retail Solutions", "vat": "4234567890", "terms": 30, "credit_limit": 50000},
        {"code": "CUST-003", "name": "Tech Innovations SA", "vat": "4345678901", "terms": 60, "credit_limit": 75000},
        {"code": "CUST-004", "name": "Green Energy Systems", "vat": "4456789012", "terms": 30, "credit_limit": 120000},
        {"code": "CUST-005", "name": "Healthcare Plus", "vat": "4567890123", "terms": 30, "credit_limit": 80000},
        {"code": "CUST-006", "name": "Construction Masters", "vat": "4678901234", "terms": 60, "credit_limit": 150000},
        {"code": "CUST-007", "name": "Food Services Group", "vat": "4789012345", "terms": 30, "credit_limit": 60000},
        {"code": "CUST-008", "name": "Logistics Express", "vat": "4890123456", "terms": 30, "credit_limit": 90000},
        {"code": "CUST-009", "name": "Digital Marketing Pro", "vat": "4901234567", "terms": 30, "credit_limit": 40000},
        {"code": "CUST-010", "name": "Property Developers Ltd", "vat": "4012345678", "terms": 60, "credit_limit": 200000},
        {"code": "CUST-011", "name": "Mining Solutions SA", "vat": "4112345679", "terms": 30, "credit_limit": 180000},
        {"code": "CUST-012", "name": "Automotive Parts Distributors", "vat": "4212345680", "terms": 30, "credit_limit": 95000},
        {"code": "CUST-013", "name": "Hospitality Group", "vat": "4312345681", "terms": 30, "credit_limit": 70000},
        {"code": "CUST-014", "name": "Financial Services Corp", "vat": "4412345682", "terms": 60, "credit_limit": 110000},
        {"code": "CUST-015", "name": "Agriculture Supplies", "vat": "4512345683", "terms": 30, "credit_limit": 85000},
        {"code": "CUST-016", "name": "Telecommunications SA", "vat": "4612345684", "terms": 30, "credit_limit": 130000},
        {"code": "CUST-017", "name": "Education Services", "vat": "4712345685", "terms": 60, "credit_limit": 65000},
        {"code": "CUST-018", "name": "Security Solutions", "vat": "4812345686", "terms": 30, "credit_limit": 75000},
        {"code": "CUST-019", "name": "Pharmaceutical Distributors", "vat": "4912345687", "terms": 30, "credit_limit": 140000},
        {"code": "CUST-020", "name": "Engineering Consultants", "vat": "4012345688", "terms": 60, "credit_limit": 160000},
    ]
    
    for cust_data in customers_data:
        try:
            existing = session.query(Customer).filter_by(
                customer_code=cust_data["code"],
                tenant_id=TENANT_ID
            ).first()
            if existing:
                print(f"  ⏭️  Customer {cust_data['code']} already exists")
                continue
            
            customer = Customer(
                tenant_id=TENANT_ID,
                customer_code=cust_data["code"],
                customer_name=cust_data["name"],
                vat_number=cust_data["vat"],
                is_vat_registered=True,
                payment_terms_days=cust_data["terms"],
                credit_limit=cust_data["credit_limit"],
                current_balance=0.0,
                is_active=True,
                email=f"{cust_data['code'].lower()}@example.com",
                billing_country="South Africa"
            )
            session.add(customer)
            stats.customers_created += 1
            print(f"  ✅ Created customer: {cust_data['name']}")
        except Exception as e:
            stats.errors.append(f"Customer {cust_data['code']}: {str(e)}")
            print(f"  ❌ Error creating customer {cust_data['code']}: {e}")
    
    session.commit()

def create_suppliers(session):
    """Create 12 demo suppliers"""
    print("\n🏭 Creating Suppliers...")
    
    suppliers_data = [
        {"code": "SUPP-001", "name": "Raw Materials Supplier (Pty) Ltd", "vat": "4111111111", "terms": 30},
        {"code": "SUPP-002", "name": "Office Supplies Co", "vat": "4222222222", "terms": 30},
        {"code": "SUPP-003", "name": "IT Equipment Distributors", "vat": "4333333333", "terms": 60},
        {"code": "SUPP-004", "name": "Utilities Provider", "vat": "4444444444", "terms": 30},
        {"code": "SUPP-005", "name": "Packaging Solutions", "vat": "4555555555", "terms": 30},
        {"code": "SUPP-006", "name": "Transport & Logistics", "vat": "4666666666", "terms": 30},
        {"code": "SUPP-007", "name": "Marketing Agency", "vat": "4777777777", "terms": 30},
        {"code": "SUPP-008", "name": "Professional Services", "vat": "4888888888", "terms": 60},
        {"code": "SUPP-009", "name": "Manufacturing Equipment", "vat": "4999999999", "terms": 30},
        {"code": "SUPP-010", "name": "Security Services", "vat": "4000000001", "terms": 30},
        {"code": "SUPP-011", "name": "Cleaning Services", "vat": "4000000002", "terms": 30},
        {"code": "SUPP-012", "name": "Insurance Provider", "vat": "4000000003", "terms": 60},
    ]
    
    for supp_data in suppliers_data:
        try:
            existing = session.query(Supplier).filter_by(
                supplier_code=supp_data["code"],
                tenant_id=TENANT_ID
            ).first()
            if existing:
                print(f"  ⏭️  Supplier {supp_data['code']} already exists")
                continue
            
            supplier = Supplier(
                tenant_id=TENANT_ID,
                supplier_code=supp_data["code"],
                supplier_name=supp_data["name"],
                vat_number=supp_data["vat"],
                is_vat_registered=True,
                payment_terms_days=supp_data["terms"],
                current_balance=0.0,
                is_active=True,
                email=f"{supp_data['code'].lower()}@example.com",
                country="South Africa"
            )
            session.add(supplier)
            stats.suppliers_created += 1
            print(f"  ✅ Created supplier: {supp_data['name']}")
        except Exception as e:
            stats.errors.append(f"Supplier {supp_data['code']}: {str(e)}")
            print(f"  ❌ Error creating supplier {supp_data['code']}: {e}")
    
    session.commit()

def create_daily_invoices(session, transaction_date, count=3):
    """Create customer invoices for a specific date"""
    customers = session.query(Customer).filter_by(tenant_id=TENANT_ID).all()
    if not customers:
        return
    
    for i in range(count):
        try:
            customer = random.choice(customers)
            invoice_date = transaction_date
            due_date = invoice_date + timedelta(days=customer.payment_terms_days)
            
            last_invoice = session.query(Invoice).filter_by(tenant_id=TENANT_ID).order_by(Invoice.id.desc()).first()
            next_num = 1 if not last_invoice else int(last_invoice.invoice_number.split('-')[-1]) + 1
            invoice_number = f"INV-{next_num:05d}"
            
            num_lines = random.randint(1, 5)
            subtotal = Decimal('0')
            vat_amount = Decimal('0')
            
            invoice = Invoice(
                tenant_id=TENANT_ID,
                invoice_number=invoice_number,
                customer_id=customer.id,
                invoice_date=invoice_date,
                due_date=due_date,
                period=invoice_date.strftime("%Y-%m"),
                status="sent",
                created_by="simulation",
                created_at=invoice_date
            )
            session.add(invoice)
            session.flush()
            
            for line_num in range(1, num_lines + 1):
                quantity = Decimal(str(random.randint(1, 10)))
                unit_price = Decimal(str(random.randint(100, 5000)))
                line_total = quantity * unit_price
                line_vat = line_total * Decimal('0.15')
                
                line = InvoiceLine(
                    tenant_id=TENANT_ID,
                    invoice_id=invoice.id,
                    line_number=line_num,
                    description=f"Product/Service {line_num}",
                    quantity=float(quantity),
                    unit_price=float(unit_price),
                    line_total=float(line_total),
                    vat_rate=15.0,
                    vat_amount=float(line_vat)
                )
                session.add(line)
                
                subtotal += line_total
                vat_amount += line_vat
            
            total_amount = subtotal + vat_amount
            invoice.subtotal = float(subtotal)
            invoice.vat_amount = float(vat_amount)
            invoice.total_amount = float(total_amount)
            invoice.amount_outstanding = float(total_amount)
            
            stats.invoices_created += 1
            
        except Exception as e:
            stats.errors.append(f"Invoice creation on {transaction_date}: {str(e)}")

def create_daily_bills(session, transaction_date, count=2):
    """Create supplier bills for a specific date"""
    suppliers = session.query(Supplier).filter_by(tenant_id=TENANT_ID).all()
    if not suppliers:
        return
    
    for i in range(count):
        try:
            supplier = random.choice(suppliers)
            bill_date = transaction_date
            due_date = bill_date + timedelta(days=supplier.payment_terms_days)
            
            last_bill = session.query(Bill).filter_by(tenant_id=TENANT_ID).order_by(Bill.id.desc()).first()
            next_num = 1 if not last_bill else int(last_bill.bill_number.split('-')[-1]) + 1
            bill_number = f"BILL-{next_num:05d}"
            
            num_lines = random.randint(1, 4)
            subtotal = Decimal('0')
            vat_amount = Decimal('0')
            
            bill = Bill(
                tenant_id=TENANT_ID,
                bill_number=bill_number,
                supplier_id=supplier.id,
                bill_date=bill_date,
                due_date=due_date,
                period=bill_date.strftime("%Y-%m"),
                status="draft",
                created_by="simulation",
                created_at=bill_date
            )
            session.add(bill)
            session.flush()
            
            for line_num in range(1, num_lines + 1):
                quantity = Decimal(str(random.randint(1, 10)))
                unit_price = Decimal(str(random.randint(50, 3000)))
                line_total = quantity * unit_price
                line_vat = line_total * Decimal('0.15')
                
                line = BillLine(
                    tenant_id=TENANT_ID,
                    bill_id=bill.id,
                    line_number=line_num,
                    description=f"Expense Item {line_num}",
                    quantity=float(quantity),
                    unit_price=float(unit_price),
                    line_total=float(line_total),
                    vat_rate=15.0,
                    vat_amount=float(line_vat)
                )
                session.add(line)
                
                subtotal += line_total
                vat_amount += line_vat
            
            total_amount = subtotal + vat_amount
            bill.subtotal = float(subtotal)
            bill.vat_amount = float(vat_amount)
            bill.total_amount = float(total_amount)
            bill.amount_outstanding = float(total_amount)
            
            stats.bills_created += 1
            
        except Exception as e:
            stats.errors.append(f"Bill creation on {transaction_date}: {str(e)}")

def run_month_simulation():
    """Run comprehensive 30-day simulation with backdated transactions"""
    print("\n" + "="*60)
    print("ARIA ERP - ENHANCED MONTH-LONG SIMULATION")
    print("="*60)
    print(f"Company ID: {COMPANY_ID}")
    print(f"Tenant ID:  {TENANT_ID}")
    print(f"Database:   {DATABASE_URL}")
    print("="*60)
    
    session = Session()
    
    try:
        start_date = datetime.now() - timedelta(days=30)
        
        print("\n" + "="*60)
        print("DAY 1: MASTER DATA SETUP")
        print("="*60)
        
        create_customers(session)
        create_suppliers(session)
        
        print("\n" + "="*60)
        print("DAYS 2-30: DAILY BUSINESS OPERATIONS")
        print("="*60)
        
        for day in range(1, 30):
            transaction_date = start_date + timedelta(days=day)
            day_of_week = transaction_date.strftime("%A")
            
            if day_of_week in ["Saturday", "Sunday"]:
                continue
            
            print(f"\n📅 Day {day} ({transaction_date.strftime('%Y-%m-%d')} - {day_of_week})")
            
            invoices_per_day = random.randint(2, 5)
            bills_per_day = random.randint(1, 3)
            
            create_daily_invoices(session, transaction_date, invoices_per_day)
            create_daily_bills(session, transaction_date, bills_per_day)
            
            session.commit()
            
            print(f"  ✅ Created {invoices_per_day} invoices and {bills_per_day} bills")
        
        stats.print_summary()
        
        print("\n✅ Month-long simulation completed successfully!")
        print(f"📊 Total transactions span from {start_date.strftime('%Y-%m-%d')} to {datetime.now().strftime('%Y-%m-%d')}")
        
    except Exception as e:
        print(f"\n❌ Simulation failed: {e}")
        stats.errors.append(f"Simulation failure: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    run_month_simulation()
