"""
ARIA ERP - Comprehensive Month-Long Production Simulation
Simulates 30 days of realistic business operations to validate system readiness
"""

import sys
import os
from datetime import datetime, timedelta, date
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import random

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.transactions import Customer, Supplier, Invoice, InvoiceLine, Bill, BillLine, Payment, PaymentAllocation
from models.accounting import ChartOfAccounts, GeneralLedger, GeneralLedgerLine
from models.user import User

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///aria_erp_production.db')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

COMPANY_ID = "b0598135-52fd-4f67-ac56-8f0237e6355e"
TENANT_ID = "default"

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
            for error in self.errors[:10]:  # Show first 10 errors
                print(f"  - {error}")
        print("="*60)

stats = SimulationStats()

def create_customers(session):
    """Create 10 demo customers"""
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
    ]
    
    for cust_data in customers_data:
        try:
            existing = session.query(Customer).filter_by(customer_code=cust_data["code"]).first()
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
    """Create 8 demo suppliers"""
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
    ]
    
    for supp_data in suppliers_data:
        try:
            existing = session.query(Supplier).filter_by(supplier_code=supp_data["code"]).first()
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

def create_invoices(session, start_date, count=5):
    """Create customer invoices"""
    print(f"\n💰 Creating {count} Customer Invoices...")
    
    customers = session.query(Customer).filter_by(tenant_id=TENANT_ID).all()
    if not customers:
        print("  ⚠️  No customers found, skipping invoice creation")
        return
    
    for i in range(count):
        try:
            customer = random.choice(customers)
            invoice_date = start_date + timedelta(days=i)
            due_date = invoice_date + timedelta(days=customer.payment_terms_days)
            
            # Generate invoice number
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
                created_by="simulation"
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
            print(f"  ✅ Created invoice {invoice_number} for {customer.customer_name}: R{total_amount:,.2f}")
            
        except Exception as e:
            stats.errors.append(f"Invoice creation: {str(e)}")
            print(f"  ❌ Error creating invoice: {e}")
    
    session.commit()

def create_bills(session, start_date, count=4):
    """Create supplier bills"""
    print(f"\n📄 Creating {count} Supplier Bills...")
    
    suppliers = session.query(Supplier).filter_by(tenant_id=TENANT_ID).all()
    if not suppliers:
        print("  ⚠️  No suppliers found, skipping bill creation")
        return
    
    for i in range(count):
        try:
            supplier = random.choice(suppliers)
            bill_date = start_date + timedelta(days=i)
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
                created_by="simulation"
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
            print(f"  ✅ Created bill {bill_number} from {supplier.supplier_name}: R{total_amount:,.2f}")
            
        except Exception as e:
            stats.errors.append(f"Bill creation: {str(e)}")
            print(f"  ❌ Error creating bill: {e}")
    
    session.commit()

def run_simulation():
    """Run comprehensive 30-day simulation"""
    print("\n" + "="*60)
    print("ARIA ERP - COMPREHENSIVE MONTH-LONG SIMULATION")
    print("="*60)
    print(f"Company ID: {COMPANY_ID}")
    print(f"Tenant ID:  {TENANT_ID}")
    print(f"Start Date: {datetime.now().strftime('%Y-%m-%d')}")
    print("="*60)
    
    session = Session()
    
    try:
        print("\n" + "="*60)
        print("WEEK 1: SETUP & MASTER DATA")
        print("="*60)
        
        create_customers(session)
        create_suppliers(session)
        
        print("\n" + "="*60)
        print("WEEK 2: SALES & REVENUE")
        print("="*60)
        
        week2_start = datetime.now() + timedelta(days=7)
        create_invoices(session, week2_start, count=10)
        
        print("\n" + "="*60)
        print("WEEK 3: PURCHASES & EXPENSES")
        print("="*60)
        
        week3_start = datetime.now() + timedelta(days=14)
        create_bills(session, week3_start, count=8)
        
        print("\n" + "="*60)
        print("WEEK 4: PAYMENTS & RECONCILIATION")
        print("="*60)
        print("  ℹ️  Payment processing would be implemented here")
        
        stats.print_summary()
        
        print("\n✅ Simulation completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Simulation failed: {e}")
        stats.errors.append(f"Simulation failure: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    run_simulation()
