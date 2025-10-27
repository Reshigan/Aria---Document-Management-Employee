#!/usr/bin/env python3
"""
Seed Comprehensive Demo Data for ARIA
Creates realistic business data for demonstrations
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime, timedelta
from decimal import Decimal
import random
from passlib.context import CryptContext

from core.database import SessionLocal
from models import *

# Initialize password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Sample data pools
COMPANY_NAMES = [
    "Acme Manufacturing", "TechVision Solutions", "GreenLeaf Energy",
    "FinServe Capital", "BuildRight Construction", "HealthCare Plus",
    "Retail World", "EduTech Systems", "AgriGrow Farming", "LogiMove Transport",
    "FoodMart Distributors", "PrintPro Graphics", "CloudNet IT",
    "AutoParts Direct", "Fashion House SA", "Chemical Industries"
]

FIRST_NAMES = ["Thabo", "Sarah", "Sipho", "Jennifer", "Mandla", "Catherine",
               "Tshepo", "Michael", "Nomvula", "David", "Zanele", "James",
               "Lindiwe", "Peter", "Nombuso", "Andrew", "Precious", "Mark"]

LAST_NAMES = ["Nkosi", "Smith", "Dlamini", "Johnson", "Mkhize", "Williams",
              "Molefe", "Brown", "Zuma", "Jones", "Khumalo", "Davis",
              "Radebe", "Wilson", "Ndlovu", "Taylor", "Mokoena", "Anderson"]

INDUSTRIES = ["Manufacturing", "Technology", "Energy", "Financial Services",
              "Construction", "Healthcare", "Retail", "Education"]

DEPARTMENTS = ["Finance", "Operations", "Sales", "HR", "IT", "Marketing"]

JOB_TITLES = ["Manager", "Accountant", "Analyst", "Coordinator", "Specialist",
              "Officer", "Administrator", "Executive", "Director", "Assistant"]

def create_demo_tenant(db: SessionLocal):
    """Create demo tenant"""
    print("Creating demo tenant...")
    
    # Check if tenant already exists
    existing = db.query(User).filter(User.email == "admin@vantax.co.za").first()
    if existing:
        print("⚠️  Demo tenant already exists. Skipping...")
        return existing.id if hasattr(existing, 'tenant_id') else 1
    
    # For now, return tenant_id = 1 (will be created through first user)
    return 1

def create_users(db: SessionLocal, tenant_id: int, count: int = 15):
    """Create admin and standard users"""
    print(f"Creating {count} users...")
    users = []
    
    # Check if admin exists
    admin = db.query(User).filter(User.email == "admin@vantax.co.za").first()
    if not admin:
        # Create admin
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
        print(f"   ✅ Created admin: admin@vantax.co.za")
    
    users.append(admin)
    
    # Create standard users
    for i in range(1, count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        
        user = User(
            email=f"{first_name.lower()}.{last_name.lower()}@vantax.co.za",
            password_hash=pwd_context.hash("Demo@2025"),
            full_name=f"{first_name} {last_name}",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now() - timedelta(days=random.randint(1, 180))
        )
        db.add(user)
        users.append(user)
    
    db.commit()
    print(f"   ✅ Created {len(users)} users")
    return users

def create_customers(db: SessionLocal, tenant_id: str, count: int = 50):
    """Create customer records"""
    print(f"Creating {count} customers...")
    customers = []
    
    for i in range(count):
        company_name = random.choice(COMPANY_NAMES)
        customer = Customer(
            tenant_id=tenant_id,
            customer_code=f"CUST{1000+i}",
            customer_name=f"{company_name} {i+1}",
            contact_person=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            email=f"contact{i+1}@customer{i+1}.co.za",
            phone=f"+2711{random.randint(1000000, 9999999)}",
            mobile=f"+2782{random.randint(1000000, 9999999)}",
            billing_address_line1=f"{random.randint(1, 999)} Business St",
            billing_city="Johannesburg",
            billing_province="Gauteng",
            billing_postal_code=f"{random.randint(1000, 9999)}",
            billing_country="South Africa",
            vat_number=f"4{random.randint(100000000, 999999999)}",
            tax_number=f"9{random.randint(100000000, 999999999)}",
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
    print(f"   ✅ Created {len(customers)} customers")
    return customers

def create_suppliers(db: SessionLocal, tenant_id: int, count: int = 30):
    """Create supplier records"""
    print(f"Creating {count} suppliers...")
    suppliers = []
    
    for i in range(count):
        supplier = Supplier(
            supplier_code=f"SUPP{1000+i}",
            name=random.choice(COMPANY_NAMES) + f" Supplier {i+1}",
            email=f"supplier{i+1}@supply{i+1}.co.za",
            phone=f"+2711{random.randint(1000000, 9999999)}",
            vat_number=f"VAT{random.randint(1000000000, 9999999999)}",
            registration_number=f"2019/{random.randint(100000, 999999)}/07",
            physical_address=f"{random.randint(1, 999)} Industrial Rd, Pretoria",
            payment_terms_days=random.choice([7, 14, 30, 60]),
            is_active=True,
            created_at=datetime.now() - timedelta(days=random.randint(1, 365))
        )
        db.add(supplier)
        suppliers.append(supplier)
    
    db.commit()
    print(f"   ✅ Created {len(suppliers)} suppliers")
    return suppliers

def create_products(db: SessionLocal, tenant_id: int, count: int = 100):
    """Create product catalog"""
    print(f"Creating {count} products...")
    products = []
    
    product_types = ["SERVICE", "INVENTORY"]
    categories = ["Electronics", "Furniture", "Software", "Hardware", "Consulting", 
                  "Materials", "Equipment", "Supplies", "Tools", "Parts"]
    
    for i in range(count):
        product = Product(
            sku=f"SKU{1000+i}",
            name=f"Product {i+1} - {random.choice(categories)}",
            description=f"Description for product {i+1}",
            product_type=random.choice(product_types),
            category=random.choice(categories),
            unit_price=Decimal(random.randint(50, 5000)),
            cost_price=Decimal(random.randint(25, 2500)),
            vat_rate=Decimal("15.00"),
            is_active=True,
            created_at=datetime.now() - timedelta(days=random.randint(1, 365))
        )
        db.add(product)
        products.append(product)
    
    db.commit()
    print(f"   ✅ Created {len(products)} products")
    return products

def create_invoices(db: SessionLocal, customers: list, products: list, count: int = 100):
    """Create invoice records"""
    print(f"Creating {count} invoices...")
    invoices = []
    
    statuses = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]
    
    for i in range(count):
        customer = random.choice(customers)
        invoice_date = datetime.now() - timedelta(days=random.randint(1, 90))
        
        invoice = Invoice(
            invoice_number=f"INV-2025-{1000+i}",
            customer_id=customer.id,
            invoice_date=invoice_date,
            due_date=invoice_date + timedelta(days=30),
            status=random.choice(statuses),
            subtotal=Decimal("0"),
            vat_amount=Decimal("0"),
            total_amount=Decimal("0"),
            notes="Auto-generated demo invoice",
            created_at=invoice_date
        )
        db.add(invoice)
        db.flush()
        
        # Add 1-5 line items
        line_items_count = random.randint(1, 5)
        subtotal = Decimal("0")
        
        for j in range(line_items_count):
            product = random.choice(products)
            quantity = random.randint(1, 10)
            unit_price = product.unit_price
            line_total = unit_price * quantity
            
            line = InvoiceLine(
                invoice_id=invoice.id,
                product_id=product.id,
                description=product.name,
                quantity=quantity,
                unit_price=unit_price,
                vat_rate=Decimal("15.00"),
                line_total=line_total
            )
            db.add(line)
            subtotal += line_total
        
        # Update invoice totals
        invoice.subtotal = subtotal
        invoice.vat_amount = subtotal * Decimal("0.15")
        invoice.total_amount = subtotal * Decimal("1.15")
        
        invoices.append(invoice)
    
    db.commit()
    print(f"   ✅ Created {len(invoices)} invoices")
    return invoices

def create_employees(db: SessionLocal, tenant_id: int, count: int = 25):
    """Create employee records"""
    print(f"Creating {count} employees...")
    employees = []
    
    for i in range(count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        
        employee = Employee(
            employee_number=f"EMP{1000+i}",
            first_name=first_name,
            last_name=last_name,
            email=f"{first_name.lower()}.{last_name.lower()}.emp@vantax.co.za",
            phone=f"+2782{random.randint(1000000, 9999999)}",
            id_number=f"{random.randint(7000000000000, 9999999999999)}",
            tax_number=f"TAX{random.randint(1000000000, 9999999999)}",
            job_title=f"{random.choice(DEPARTMENTS)} {random.choice(JOB_TITLES)}",
            department=random.choice(DEPARTMENTS),
            hire_date=datetime.now() - timedelta(days=random.randint(30, 1825)),
            employment_type="FULL_TIME",
            status="ACTIVE",
            salary=Decimal(random.randint(15000, 80000)),
            bank_name="Standard Bank",
            bank_account_number=f"{random.randint(1000000000, 9999999999)}",
            created_at=datetime.now() - timedelta(days=random.randint(30, 730))
        )
        db.add(employee)
        employees.append(employee)
    
    db.commit()
    print(f"   ✅ Created {len(employees)} employees")
    return employees

def create_documents(db: SessionLocal, users: list, count: int = 50):
    """Create document records"""
    print(f"Creating {count} documents...")
    documents = []
    
    doc_types = ["INVOICE", "PURCHASE_ORDER", "CONTRACT", "REPORT", "OTHER"]
    doc_statuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]
    
    for i in range(count):
        user = random.choice(users)
        
        document = Document(
            filename=f"document_{i+1}.pdf",
            original_filename=f"Document {i+1}.pdf",
            file_path=f"/uploads/documents/document_{i+1}.pdf",
            file_size=random.randint(50000, 5000000),
            mime_type="application/pdf",
            document_type=random.choice(doc_types),
            status=random.choice(doc_statuses),
            uploaded_by=user.id,
            upload_date=datetime.now() - timedelta(days=random.randint(1, 180)),
            created_at=datetime.now() - timedelta(days=random.randint(1, 180))
        )
        db.add(document)
        documents.append(document)
    
    db.commit()
    print(f"   ✅ Created {len(documents)} documents")
    return documents

def seed_all_data():
    """Master seeding function"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("🌱 ARIA DEMO DATA SEEDING")
        print("="*70 + "\n")
        
        # Create data in order
        tenant_id = create_demo_tenant(db)
        users = create_users(db, tenant_id, count=15)
        customers = create_customers(db, tenant_id, count=50)
        suppliers = create_suppliers(db, tenant_id, count=30)
        products = create_products(db, tenant_id, count=100)
        invoices = create_invoices(db, customers, products, count=100)
        employees = create_employees(db, tenant_id, count=25)
        documents = create_documents(db, users, count=50)
        
        print("\n" + "="*70)
        print("🎉 DEMO DATA SEEDING COMPLETE!")
        print("="*70)
        print("\n📊 Summary:")
        print(f"   • {len(users)} Users")
        print(f"   • {len(customers)} Customers")
        print(f"   • {len(suppliers)} Suppliers")
        print(f"   • {len(products)} Products")
        print(f"   • {len(invoices)} Invoices")
        print(f"   • {len(employees)} Employees")
        print(f"   • {len(documents)} Documents")
        print(f"\n   TOTAL: ~{len(users) + len(customers) + len(suppliers) + len(products) + len(invoices) + len(employees) + len(documents) + len(invoices)*3} records")
        
        print("\n🔐 Login Credentials:")
        print("   Email: admin@vantax.co.za")
        print("   Password: Demo@2025")
        
        print("\n🌐 Access:")
        print("   URL: https://aria.vantax.co.za")
        
        print("\n✨ You can now demonstrate the platform with real data!")
        print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = seed_all_data()
    sys.exit(0 if success else 1)
