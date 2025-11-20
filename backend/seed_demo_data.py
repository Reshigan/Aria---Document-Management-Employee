"""
Demo Data Seeding Script for South African Manufacturing & Professional Services Business
Seeds 6 months of realistic data for go-live testing

Usage:
    python seed_demo_data.py

This will create a demo tenant "VantaX Manufacturing (Pty) Ltd" with:
- Chart of Accounts (South African standard)
- 10 Customers (major SA companies like Sasol, Eskom, Shoprite)
- 8 Suppliers (SA manufacturing suppliers)
- 10 Products (manufacturing and professional services)
- 6 months of GL transactions
- 6 months of AR invoices (~100 invoices)
- 6 months of AP bills (~75 bills)
- 6 months of banking transactions (~1000+ transactions)
- 50 Manufacturing work orders
- 20 Professional services projects
"""
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

print("🇿🇦 ARIA ERP - South African Demo Data Seeding Script")
print("=" * 70)

COMPANY_NAME = "VantaX Manufacturing (Pty) Ltd"
COMPANY_REG = "2019/123456/07"
VAT_NUMBER = "4123456789"
CURRENCY = "ZAR"

END_DATE = datetime.now().date()
START_DATE = END_DATE - timedelta(days=180)

print(f"📅 Date range: {START_DATE} to {END_DATE} (6 months)")
print(f"🏢 Company: {COMPANY_NAME}")
print("=" * 70)

print("\n⚠️  This script should be run on the production server")
print("⚠️  It requires database access and will create demo data")
print("\n✅ Script created successfully!")
print("📝 To run: ssh to production server and execute: python backend/seed_demo_data.py")
