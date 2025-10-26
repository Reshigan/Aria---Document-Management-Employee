#!/usr/bin/env python3
"""
Generate comprehensive demo data for ARIA ERP
Creates a realistic South African manufacturing company with full transaction history
"""

import random
import json
from datetime import datetime, timedelta

# South African company data
DEMO_COMPANY = {
    "name": "TechForge Manufacturing (Pty) Ltd",
    "registration_number": "2020/123456/07",
    "vat_number": "4123456789",
    "tax_number": "9876543210",
    "paye_number": "7123456789",
    "uif_number": "U123456789",
    "sdl_number": "L123456789",
    "bbbee_level": 4,
    "bbbee_score": 85.2,
    "bbbee_certificate_number": "BBBEE-2025-001234",
    "bbbee_expiry": "2026-10-31",
    "physical_address": {
        "street": "45 Industrial Drive",
        "suburb": "Midrand",
        "city": "Johannesburg",
        "province": "Gauteng",
        "postal_code": "1685",
        "country": "South Africa"
    },
    "contact": {
        "phone": "+27 11 234 5678",
        "email": "info@techforge.co.za",
        "website": "https://www.techforge.co.za"
    },
    "financial": {
        "financial_year_end": "02-28",
        "vat_rate": 15.0,
        "currency": "ZAR"
    },
    "banking": {
        "bank_name": "First National Bank",
        "account_number": "62123456789",
        "branch_code": "250655",
        "account_type": "Business Current Account",
        "swift_code": "FIRNZAJJ"
    },
    "branding": {
        "primary_color": "#1e40af",
        "secondary_color": "#10b981"
    }
}

# Demo users (5 users with different roles)
DEMO_USERS = [
    {
        "email": "admin@techforge.co.za",
        "password": "Demo@2025",
        "first_name": "Sarah",
        "last_name": "Naidoo",
        "role": "admin",
        "status": "active",
        "phone": "+27 82 123 4567"
    },
    {
        "email": "finance@techforge.co.za",
        "password": "Demo@2025",
        "first_name": "Thabo",
        "last_name": "Mokoena",
        "role": "finance",
        "status": "active",
        "phone": "+27 83 234 5678"
    },
    {
        "email": "hr@techforge.co.za",
        "password": "Demo@2025",
        "first_name": "Zanele",
        "last_name": "Dlamini",
        "role": "hr",
        "status": "active",
        "phone": "+27 84 345 6789"
    },
    {
        "email": "manager@techforge.co.za",
        "password": "Demo@2025",
        "first_name": "Johan",
        "last_name": "van der Merwe",
        "role": "manager",
        "status": "active",
        "phone": "+27 85 456 7890"
    },
    {
        "email": "employee@techforge.co.za",
        "password": "Demo@2025",
        "first_name": "Lindiwe",
        "last_name": "Mkhize",
        "role": "employee",
        "status": "active",
        "phone": "+27 86 567 8901"
    }
]

# Demo customers (20 customers)
DEMO_CUSTOMERS = [
    {"name": "ABC Manufacturing Ltd", "vat": "4111111111", "bbbee_level": 3, "credit_limit": 500000, "payment_terms": 30},
    {"name": "XYZ Distributors (Pty) Ltd", "vat": "4222222222", "bbbee_level": 4, "credit_limit": 300000, "payment_terms": 30},
    {"name": "Superior Tools SA", "vat": "4333333333", "bbbee_level": 2, "credit_limit": 750000, "payment_terms": 45},
    {"name": "MegaBuild Construction", "vat": "4444444444", "bbbee_level": 5, "credit_limit": 200000, "payment_terms": 60},
    {"name": "Industrial Supplies Co", "vat": "4555555555", "bbbee_level": 4, "credit_limit": 400000, "payment_terms": 30},
    {"name": "TechZone Electronics", "vat": "4666666666", "bbbee_level": 3, "credit_limit": 600000, "payment_terms": 30},
    {"name": "ProBuild Hardware", "vat": "4777777777", "bbbee_level": 6, "credit_limit": 150000, "payment_terms": 45},
    {"name": "MetalWorks SA (Pty) Ltd", "vat": "4888888888", "bbbee_level": 2, "credit_limit": 800000, "payment_terms": 30},
    {"name": "Cape Engineering", "vat": "4999999999", "bbbee_level": 4, "credit_limit": 350000, "payment_terms": 30},
    {"name": "Durban Industrial Group", "vat": "4101010101", "bbbee_level": 3, "credit_limit": 500000, "payment_terms": 45},
    {"name": "PE Manufacturing Hub", "vat": "4121212121", "bbbee_level": 5, "credit_limit": 250000, "payment_terms": 30},
    {"name": "Johannesburg Tech", "vat": "4131313131", "bbbee_level": 4, "credit_limit": 400000, "payment_terms": 30},
    {"name": "Pretoria Components", "vat": "4141414141", "bbbee_level": 3, "credit_limit": 450000, "payment_terms": 45},
    {"name": "Bloemfontein Supplies", "vat": "4151515151", "bbbee_level": 6, "credit_limit": 180000, "payment_terms": 30},
    {"name": "Nelspruit Traders", "vat": "4161616161", "bbbee_level": 4, "credit_limit": 300000, "payment_terms": 60},
    {"name": "Polokwane Industrial", "vat": "4171717171", "bbbee_level": 5, "credit_limit": 220000, "payment_terms": 30},
    {"name": "Kimberley Mining Supplies", "vat": "4181818181", "bbbee_level": 3, "credit_limit": 550000, "payment_terms": 45},
    {"name": "East London Machinery", "vat": "4191919191", "bbbee_level": 4, "credit_limit": 380000, "payment_terms": 30},
    {"name": "George Coastal Builders", "vat": "4202020202", "bbbee_level": 5, "credit_limit": 270000, "payment_terms": 45},
    {"name": "Rustenburg Equipment", "vat": "4212121212", "bbbee_level": 4, "credit_limit": 320000, "payment_terms": 30}
]

# Demo suppliers (15 suppliers)
DEMO_SUPPLIERS = [
    {"name": "Steel Suppliers SA", "vat": "4311111111", "bbbee_level": 2, "payment_terms": 30},
    {"name": "Aluminium World", "vat": "4322222222", "bbbee_level": 3, "payment_terms": 45},
    {"name": "Plastic Components Ltd", "vat": "4333333333", "bbbee_level": 4, "payment_terms": 30},
    {"name": "Electronics Wholesalers", "vat": "4344444444", "bbbee_level": 3, "payment_terms": 60},
    {"name": "Paint & Coatings Co", "vat": "4355555555", "bbbee_level": 5, "payment_terms": 30},
    {"name": "Fasteners & Fixings", "vat": "4366666666", "bbbee_level": 4, "payment_terms": 30},
    {"name": "Rubber Seals SA", "vat": "4377777777", "bbbee_level": 3, "payment_terms": 45},
    {"name": "Industrial Chemicals", "vat": "4388888888", "bbbee_level": 2, "payment_terms": 30},
    {"name": "Packaging Solutions", "vat": "4399999999", "bbbee_level": 4, "payment_terms": 30},
    {"name": "Machine Tools Imports", "vat": "4301010101", "bbbee_level": 6, "payment_terms": 60},
    {"name": "Safety Equipment SA", "vat": "4312121212", "bbbee_level": 3, "payment_terms": 30},
    {"name": "Office Supplies Co", "vat": "4323232323", "bbbee_level": 4, "payment_terms": 30},
    {"name": "IT Hardware Distributors", "vat": "4334343434", "bbbee_level": 3, "payment_terms": 45},
    {"name": "Logistics & Transport", "vat": "4345454545", "bbbee_level": 5, "payment_terms": 30},
    {"name": "Cleaning Services Ltd", "vat": "4356565656", "bbbee_level": 1, "payment_terms": 30}
]

# Demo products (30 products - abbreviated for file size)
DEMO_PRODUCTS = [
    {"code": "PROD-001", "name": "Steel Bracket Type A", "category": "Hardware", "unit_price": 45.00, "cost_price": 28.00, "unit": "Each"},
    {"code": "PROD-002", "name": "Steel Bracket Type B", "category": "Hardware", "unit_price": 65.00, "cost_price": 42.00, "unit": "Each"},
    {"code": "PROD-003", "name": "Aluminium Plate 10x10", "category": "Raw Material", "unit_price": 120.00, "cost_price": 75.00, "unit": "Each"},
    {"code": "PROD-004", "name": "Aluminium Plate 20x20", "category": "Raw Material", "unit_price": 230.00, "cost_price": 150.00, "unit": "Each"},
    {"code": "PROD-005", "name": "Plastic Housing Large", "category": "Components", "unit_price": 85.00, "cost_price": 52.00, "unit": "Each"},
    {"code": "PROD-017", "name": "Assembly Unit Type 1", "category": "Finished Goods", "unit_price": 850.00, "cost_price": 520.00, "unit": "Each"},
    {"code": "PROD-018", "name": "Assembly Unit Type 2", "category": "Finished Goods", "unit_price": 1200.00, "cost_price": 750.00, "unit": "Each"},
    {"code": "PROD-019", "name": "Assembly Unit Type 3", "category": "Finished Goods", "unit_price": 1650.00, "cost_price": 1020.00, "unit": "Each"},
    {"code": "PROD-030", "name": "Complete System Package", "category": "Finished Goods", "unit_price": 4500.00, "cost_price": 2800.00, "unit": "Each"}
]

def generate_invoices(num_invoices=100):
    """Generate demo invoices"""
    invoices = []
    start_date = datetime.now() - timedelta(days=180)
    
    for i in range(num_invoices):
        invoice_date = start_date + timedelta(days=random.randint(0, 180))
        customer = random.choice(DEMO_CUSTOMERS)
        
        # Generate 1-5 line items
        line_items = []
        total = 0
        for _ in range(random.randint(1, 5)):
            product = random.choice(DEMO_PRODUCTS)
            quantity = random.randint(1, 20)
            unit_price = product["unit_price"]
            line_total = quantity * unit_price
            total += line_total
            
            line_items.append({
                "product_code": product["code"],
                "description": product["name"],
                "quantity": quantity,
                "unit_price": unit_price,
                "total": line_total
            })
        
        vat = total * 0.15
        grand_total = total + vat
        
        invoices.append({
            "invoice_number": f"INV-{2025}-{str(i+1).zfill(5)}",
            "date": invoice_date.strftime("%Y-%m-%d"),
            "due_date": (invoice_date + timedelta(days=customer["payment_terms"])).strftime("%Y-%m-%d"),
            "customer_name": customer["name"],
            "customer_vat": customer["vat"],
            "line_items": line_items,
            "subtotal": total,
            "vat": vat,
            "total": grand_total,
            "status": random.choice(["paid", "paid", "paid", "pending", "overdue"]),
            "payment_date": (invoice_date + timedelta(days=random.randint(0, customer["payment_terms"]))).strftime("%Y-%m-%d") if random.random() > 0.3 else None
        })
    
    return invoices

def save_demo_data():
    """Save all demo data to JSON files"""
    import os
    
    data = {
        "company": DEMO_COMPANY,
        "users": DEMO_USERS,
        "customers": DEMO_CUSTOMERS,
        "suppliers": DEMO_SUPPLIERS,
        "products": DEMO_PRODUCTS,
        "invoices": generate_invoices(100)
    }
    
    # Save to individual files
    for key, value in data.items():
        with open(f"data/{key}.json", "w") as f:
            json.dump(value, f, indent=2, default=str)
    
    # Save combined file
    with open("data/complete_demo_data.json", "w") as f:
        json.dump(data, f, indent=2, default=str)
    
    print("✅ Demo data generated successfully!")
    print(f"   - 1 Company")
    print(f"   - {len(DEMO_USERS)} Users")
    print(f"   - {len(DEMO_CUSTOMERS)} Customers")
    print(f"   - {len(DEMO_SUPPLIERS)} Suppliers")
    print(f"   - {len(DEMO_PRODUCTS)} Products")
    print(f"   - {len(data['invoices'])} Invoices")
    print(f"\n📊 Files saved to: demo/data/")
    
    return data

if __name__ == "__main__":
    save_demo_data()
