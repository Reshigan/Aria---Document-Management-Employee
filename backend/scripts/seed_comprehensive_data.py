#!/usr/bin/env python3
"""
Comprehensive Demo Data Seeding for ARIA
Matches actual model structures from models/
"""
import sys
from pathlib import Path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime, timedelta
import random
from passlib.context import CryptContext

from core.database import SessionLocal
from models import User, Customer, Supplier, Product, Invoice, InvoiceLine, Employee
from models import Document, ChartOfAccounts, GeneralLedger, TaxRate
from models import Lead, Opportunity, Quote

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Data pools
COMPANIES = ["Acme Manufacturing", "TechVision Solutions", "GreenLeaf Energy",
             "FinServe Capital", "BuildRight Construction", "HealthCare Plus"]
FIRST_NAMES = ["Thabo", "Sarah", "Sipho", "Jennifer", "Mandla", "Catherine"]
LAST_NAMES = ["Nkosi", "Smith", "Dlamini", "Johnson", "Mkhize", "Williams"]
CITIES = ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth"]
PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape"]

def print_header(title):
    print("\n" + "="*70)
    print(f"   {title}")
    print("="*70)

def create_admin_user(db):
    """Create or get admin user"""
    print("\n🔐 Setting up admin user...")
    
    admin = db.query(User).filter(User.email == "admin@vantax.co.za").first()
    if admin:
        print("   ℹ️  Admin user already exists")
        return admin
    
    admin = User(
        email="admin@vantax.co.za",
        password_hash=pwd_context.hash("Demo@2025"),
        full_name="Demo Administrator",
        is_active=True,
        is_superuser=True,
        created_at=datetime.now()
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print("   ✅ Admin user created: admin@vantax.co.za")
    return admin

def create_standard_users(db, count=14):
    """Create standard users"""
    print(f"\n👥 Creating {count} standard users...")
    users = []
    
    for i in range(count):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        email = f"{first.lower()}.{last.lower()}{i}@vantax.co.za"
        
        # Check if exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            users.append(existing)
            continue
        
        user = User(
            email=email,
            password_hash=pwd_context.hash("Demo@2025"),
            full_name=f"{first} {last}",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now() - timedelta(days=random.randint(1, 180))
        )
        db.add(user)
        users.append(user)
    
    db.commit()
    print(f"   ✅ {len(users)} users ready")
    return users

def create_customers_comprehensive(db, count=50):
    """Create customer records matching actual model"""
    print(f"\n💼 Creating {count} customers...")
    customers = []
    tenant_id = "tenant_demo_001"
    
    for i in range(count):
        code = f"CUST{1000+i}"
        existing = db.query(Customer).filter(Customer.customer_code == code).first()
        if existing:
            customers.append(existing)
            continue
        
        customer = Customer(
            tenant_id=tenant_id,
            customer_code=code,
            customer_name=f"{random.choice(COMPANIES)} {i+1}",
            contact_person=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            email=f"contact{i}@customer{i}.co.za",
            phone=f"+2711{random.randint(1000000, 9999999)}",
            mobile=f"+2782{random.randint(1000000, 9999999)}",
            billing_address_line1=f"{random.randint(1, 999)} Business Ave",
            billing_city=random.choice(CITIES),
            billing_province=random.choice(PROVINCES),
            billing_postal_code=f"{random.randint(1000, 9999)}",
            billing_country="South Africa",
            vat_number=f"4{random.randint(100000000, 999999999)}",
            is_vat_registered=True,
            payment_terms_days=random.choice([7, 14, 30, 60]),
            credit_limit=float(random.randint(50000, 500000)),
            current_balance=0.0,
            bbbee_level=random.choice([1, 2, 3, 4]),
            is_active=True,
            created_at=datetime.now() - timedelta(days=random.randint(1, 365))
        )
        db.add(customer)
        customers.append(customer)
    
    db.commit()
    print(f"   ✅ {len(customers)} customers created")
    return customers

def create_suppliers_comprehensive(db, count=30):
    """Create supplier records matching actual model"""
    print(f"\n🏭 Creating {count} suppliers...")
    suppliers = []
    tenant_id = "tenant_demo_001"
    
    for i in range(count):
        code = f"SUPP{1000+i}"
        existing = db.query(Supplier).filter(Supplier.supplier_code == code).first()
        if existing:
            suppliers.append(existing)
            continue
        
        supplier = Supplier(
            tenant_id=tenant_id,
            supplier_code=code,
            supplier_name=f"{random.choice(COMPANIES)} Supplier {i+1}",
            contact_person=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            email=f"supplier{i}@supply{i}.co.za",
            phone=f"+2711{random.randint(1000000, 9999999)}",
            address_line1=f"{random.randint(1, 999)} Industrial Rd",
            city=random.choice(CITIES),
            province=random.choice(PROVINCES),
            postal_code=f"{random.randint(1000, 9999)}",
            country="South Africa",
            bank_name=random.choice(["Standard Bank", "FNB", "Nedbank", "ABSA"]),
            account_number=f"{random.randint(1000000000, 9999999999)}",
            branch_code=f"{random.randint(100000, 999999)}",
            vat_number=f"4{random.randint(100000000, 999999999)}",
            is_vat_registered=True,
            payment_terms_days=random.choice([7, 14, 30, 60]),
            current_balance=0.0,
            bbbee_level=random.choice([1, 2, 3, 4]),
            is_active=True,
            created_at=datetime.now() - timedelta(days=random.randint(1, 365))
        )
        db.add(supplier)
        suppliers.append(supplier)
    
    db.commit()
    print(f"   ✅ {len(suppliers)} suppliers created")
    return suppliers

def create_products_comprehensive(db, count=100):
    """Create product catalog"""
    print(f"\n📦 Creating {count} products...")
    products = []
    tenant_id = "tenant_demo_001"
    categories = ["Electronics", "Furniture", "Software", "Hardware", "Consulting"]
    
    for i in range(count):
        sku = f"SKU{1000+i}"
        existing = db.query(Product).filter(Product.sku == sku).first()
        if existing:
            products.append(existing)
            continue
        
        product = Product(
            tenant_id=tenant_id,
            product_code=sku,
            sku=sku,
            product_name=f"Product {i+1} - {random.choice(categories)}",
            description=f"High-quality product for business use",
            product_type=random.choice(["GOODS", "SERVICE"]),
            category=random.choice(categories),
            unit_of_measure="Each",
            selling_price=float(random.randint(50, 5000)),
            cost_price=float(random.randint(25, 2500)),
            vat_rate=15.0,
            is_vat_exempt=False,
            is_active=True,
            created_at=datetime.now() - timedelta(days=random.randint(1, 365))
        )
        db.add(product)
        products.append(product)
    
    db.commit()
    print(f"   ✅ {len(products)} products created")
    return products

def create_invoices_with_lines(db, customers, products, count=100):
    """Create invoices with line items"""
    print(f"\n📄 Creating {count} invoices with line items...")
    invoices = []
    tenant_id = "tenant_demo_001"
    
    for i in range(count):
        inv_num = f"INV-2025-{1000+i}"
        existing = db.query(Invoice).filter(Invoice.invoice_number == inv_num).first()
        if existing:
            invoices.append(existing)
            continue
        
        customer = random.choice(customers)
        invoice_date = datetime.now() - timedelta(days=random.randint(1, 90))
        
        invoice = Invoice(
            tenant_id=tenant_id,
            invoice_number=inv_num,
            customer_id=customer.id,
            invoice_date=invoice_date,
            due_date=invoice_date + timedelta(days=30),
            status=random.choice(["DRAFT", "SENT", "PAID", "OVERDUE"]),
            subtotal=0.0,
            vat_amount=0.0,
            total_amount=0.0,
            notes="Auto-generated demo invoice",
            created_at=invoice_date
        )
        db.add(invoice)
        db.flush()
        
        # Add line items
        line_count = random.randint(1, 5)
        subtotal = 0.0
        
        for j in range(line_count):
            product = random.choice(products)
            quantity = random.randint(1, 10)
            unit_price = product.selling_price
            line_total = unit_price * quantity
            
            line = InvoiceLine(
                invoice_id=invoice.id,
                product_id=product.id,
                description=product.product_name,
                quantity=quantity,
                unit_price=unit_price,
                vat_rate=15.0,
                vat_type="STANDARD",
                line_total=line_total
            )
            db.add(line)
            subtotal += line_total
        
        invoice.subtotal = subtotal
        invoice.vat_amount = subtotal * 0.15
        invoice.total_amount = subtotal * 1.15
        
        invoices.append(invoice)
    
    db.commit()
    print(f"   ✅ {len(invoices)} invoices created")
    return invoices

def create_employees_comprehensive(db, count=25):
    """Create employee records"""
    print(f"\n👨‍💼 Creating {count} employees...")
    employees = []
    tenant_id = "tenant_demo_001"
    departments = ["Finance", "Operations", "Sales", "HR", "IT"]
    
    for i in range(count):
        emp_num = f"EMP{1000+i}"
        existing = db.query(Employee).filter(Employee.employee_number == emp_num).first()
        if existing:
            employees.append(existing)
            continue
        
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        
        employee = Employee(
            tenant_id=tenant_id,
            employee_number=emp_num,
            first_name=first,
            last_name=last,
            email=f"{first.lower()}.{last.lower()}.emp{i}@vantax.co.za",
            phone=f"+2782{random.randint(1000000, 9999999)}",
            id_number=f"{random.randint(7000000000000, 9999999999999)}",
            tax_number=f"{random.randint(1000000000, 9999999999)}",
            job_title=f"{random.choice(departments)} Manager",
            department=random.choice(departments),
            hire_date=datetime.now() - timedelta(days=random.randint(30, 1825)),
            employment_type="FULL_TIME",
            status="ACTIVE",
            salary=float(random.randint(15000, 80000)),
            bank_name="Standard Bank",
            bank_account_number=f"{random.randint(1000000000, 9999999999)}",
            created_at=datetime.now() - timedelta(days=random.randint(30, 730))
        )
        db.add(employee)
        employees.append(employee)
    
    db.commit()
    print(f"   ✅ {len(employees)} employees created")
    return employees

def main():
    """Main seeding function"""
    print_header("🌱 ARIA COMPREHENSIVE DATA SEEDING")
    
    db = SessionLocal()
    
    try:
        admin = create_admin_user(db)
        users = create_standard_users(db, count=14)
        customers = create_customers_comprehensive(db, count=50)
        suppliers = create_suppliers_comprehensive(db, count=30)
        products = create_products_comprehensive(db, count=100)
        invoices = create_invoices_with_lines(db, customers, products, count=100)
        employees = create_employees_comprehensive(db, count=25)
        
        print_header("🎉 SEEDING COMPLETE!")
        
        print("\n📊 Summary:")
        print(f"   • 1 Admin + {len(users)} Users = {len(users)+1} total")
        print(f"   • {len(customers)} Customers")
        print(f"   • {len(suppliers)} Suppliers")
        print(f"   • {len(products)} Products")
        print(f"   • {len(invoices)} Invoices (~{len(invoices)*3} line items)")
        print(f"   • {len(employees)} Employees")
        
        total_records = 1 + len(users) + len(customers) + len(suppliers) + len(products) + len(invoices) + len(invoices)*3 + len(employees)
        print(f"\n   📈 TOTAL RECORDS: ~{total_records}")
        
        print("\n🔐 Login Credentials:")
        print("   📧 Email: admin@vantax.co.za")
        print("   🔑 Password: Demo@2025")
        
        print("\n🌐 Access Platform:")
        print("   🔗 URL: https://aria.vantax.co.za")
        
        print("\n✨ Platform is now ready for demonstration!\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
