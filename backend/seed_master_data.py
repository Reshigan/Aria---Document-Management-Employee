#!/usr/bin/env python3
"""
Seed Master Data for Testing
Creates sample customers, suppliers, and products
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.transactions import Customer, Supplier
from models.inventory import Product
from datetime import datetime

DATABASE_URL = "sqlite:///./aria.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_customers():
    db = SessionLocal()
    try:
        existing = db.query(Customer).count()
        if existing > 0:
            print(f"Customers already exist ({existing}), skipping...")
            return
        
        customers = [
            Customer(
                tenant_id="default",
                customer_code="CUST001",
                customer_name="ABC Corporation (Pty) Ltd",
                contact_person="John Smith",
                email="john@abc.co.za",
                phone="011-123-4567",
                vat_number="4123456789",
                credit_limit=50000.0,
                current_balance=0.0,
                is_active=True
            ),
            Customer(
                tenant_id="default",
                customer_code="CUST002",
                customer_name="XYZ Holdings",
                contact_person="Jane Doe",
                email="jane@xyz.co.za",
                phone="021-987-6543",
                vat_number="4987654321",
                credit_limit=100000.0,
                current_balance=0.0,
                is_active=True
            ),
            Customer(
                tenant_id="default",
                customer_code="CUST003",
                customer_name="TechForge Solutions",
                contact_person="Mike Johnson",
                email="mike@techforge.co.za",
                phone="031-555-1234",
                vat_number="4555123456",
                credit_limit=75000.0,
                current_balance=0.0,
                is_active=True
            ),
            Customer(
                tenant_id="default",
                customer_code="CUST004",
                customer_name="Global Traders",
                contact_person="Sarah Williams",
                email="sarah@globaltraders.co.za",
                phone="012-444-5678",
                vat_number="4444567890",
                credit_limit=60000.0,
                current_balance=0.0,
                is_active=True
            ),
            Customer(
                tenant_id="default",
                customer_code="CUST005",
                customer_name="Premier Services",
                contact_person="David Brown",
                email="david@premier.co.za",
                phone="011-333-9999",
                vat_number="4333999988",
                credit_limit=80000.0,
                current_balance=0.0,
                is_active=True
            )
        ]
        
        db.add_all(customers)
        db.commit()
        print(f"✓ Created {len(customers)} customers")
    except Exception as e:
        print(f"Error seeding customers: {e}")
        db.rollback()
    finally:
        db.close()

def seed_suppliers():
    db = SessionLocal()
    try:
        existing = db.query(Supplier).count()
        if existing > 0:
            print(f"Suppliers already exist ({existing}), skipping...")
            return
        
        suppliers = [
            Supplier(
                tenant_id="default",
                supplier_code="SUPP001",
                supplier_name="Office Supplies Co",
                contact_person="Tom Anderson",
                email="tom@officesupplies.co.za",
                phone="011-222-3333",
                vat_number="4222333344",
                is_active=True
            ),
            Supplier(
                tenant_id="default",
                supplier_code="SUPP002",
                supplier_name="Tech Equipment Ltd",
                contact_person="Lisa Chen",
                email="lisa@techequip.co.za",
                phone="021-111-2222",
                vat_number="4111222233",
                is_active=True
            ),
            Supplier(
                tenant_id="default",
                supplier_code="SUPP003",
                supplier_name="Industrial Parts SA",
                contact_person="Peter van der Merwe",
                email="peter@industrial.co.za",
                phone="031-777-8888",
                vat_number="4777888899",
                is_active=True
            ),
            Supplier(
                tenant_id="default",
                supplier_code="SUPP004",
                supplier_name="Raw Materials Direct",
                contact_person="Mary Johnson",
                email="mary@rawmaterials.co.za",
                phone="012-666-7777",
                vat_number="4666777788",
                is_active=True
            ),
            Supplier(
                tenant_id="default",
                supplier_code="SUPP005",
                supplier_name="Logistics Partners",
                contact_person="James Wilson",
                email="james@logistics.co.za",
                phone="011-888-9999",
                vat_number="4888999900",
                is_active=True
            )
        ]
        
        db.add_all(suppliers)
        db.commit()
        print(f"✓ Created {len(suppliers)} suppliers")
    except Exception as e:
        print(f"Error seeding suppliers: {e}")
        db.rollback()
    finally:
        db.close()

def seed_products():
    db = SessionLocal()
    try:
        existing = db.query(Product).count()
        if existing > 0:
            print(f"Products already exist ({existing}), skipping...")
            return
        
        products = [
            Product(
                tenant_id="default",
                product_code="PROD001",
                product_name="Widget A",
                description="High-quality widget for industrial use",
                category="Industrial",
                cost_price=250.0,
                selling_price=500.0,
                total_qty_on_hand=100.0,
                is_active=True
            ),
            Product(
                tenant_id="default",
                product_code="PROD002",
                product_name="Widget B",
                description="Premium widget with advanced features",
                category="Industrial",
                cost_price=450.0,
                selling_price=750.0,
                total_qty_on_hand=75.0,
                is_active=True
            ),
            Product(
                tenant_id="default",
                product_code="PROD003",
                product_name="Service Package - Basic",
                description="Basic service package including maintenance",
                category="Services",
                cost_price=500.0,
                selling_price=1000.0,
                total_qty_on_hand=0.0,
                is_active=True
            ),
            Product(
                tenant_id="default",
                product_code="PROD004",
                product_name="Office Supplies Bundle",
                description="Complete office supplies bundle",
                category="Office",
                cost_price=150.0,
                selling_price=300.0,
                total_qty_on_hand=200.0,
                is_active=True
            ),
            Product(
                tenant_id="default",
                product_code="PROD005",
                product_name="Tech Equipment - Laptop",
                description="Business laptop with warranty",
                category="Technology",
                cost_price=8000.0,
                selling_price=12000.0,
                total_qty_on_hand=25.0,
                is_active=True
            ),
            Product(
                tenant_id="default",
                product_code="PROD006",
                product_name="Raw Material - Steel",
                description="High-grade steel for manufacturing",
                category="Raw Materials",
                cost_price=100.0,
                selling_price=180.0,
                total_qty_on_hand=500.0,
                is_active=True
            ),
            Product(
                tenant_id="default",
                product_code="PROD007",
                product_name="Consulting Services",
                description="Professional consulting services per hour",
                category="Services",
                cost_price=800.0,
                selling_price=1500.0,
                total_qty_on_hand=0.0,
                is_active=True
            ),
            Product(
                tenant_id="default",
                product_code="PROD008",
                product_name="Packaging Materials",
                description="Eco-friendly packaging materials",
                category="Packaging",
                cost_price=50.0,
                selling_price=95.0,
                total_qty_on_hand=1000.0,
                is_active=True
            )
        ]
        
        db.add_all(products)
        db.commit()
        print(f"✓ Created {len(products)} products")
    except Exception as e:
        print(f"Error seeding products: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding Master Data...")
    seed_customers()
    seed_suppliers()
    seed_products()
    print("✓ Master data seeding complete!")
