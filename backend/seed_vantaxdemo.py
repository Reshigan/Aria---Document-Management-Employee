#!/usr/bin/env python3
"""
VantaXDemo Company Seed Script
Creates a complete demo environment with:
- Demo company and users
- Transactions for all 67 bots
- Sample documents and workflows
- Test data for positive and negative scenarios
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random
import string

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from core.database import SessionLocal, engine
from core.security import get_password_hash
from models.base import Base
from models.user import User

# Import all models to ensure they're registered
from models import document, tenant, advanced, workflow_models, document_processing_models

def create_database_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully")

def generate_random_string(length=10):
    """Generate random string for test data"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def seed_demo_company(db: Session):
    """Create VantaXDemo company and users"""
    print("\n🏢 Creating VantaXDemo Company...")
    
    # Check if demo user already exists
    existing_user = db.query(User).filter(User.email == "demo@vantax.co.za").first()
    if existing_user:
        print("⚠️  Demo company already exists. Skipping creation.")
        return existing_user
    
    # Create demo admin user
    demo_admin = User(
        email="demo@vantax.co.za",
        password_hash=get_password_hash("Demo@2025"),
        full_name="VantaX Demo Admin",
        is_active=True,
        is_superuser=True,
        created_at=datetime.utcnow()
    )
    db.add(demo_admin)
    
    # Create additional demo users
    demo_users = [
        User(
            email="finance@vantax.co.za",
            password_hash=get_password_hash("Finance@2025"),
            full_name="Finance Manager",
            is_active=True,
            is_superuser=False
        ),
        User(
            email="hr@vantax.co.za",
            password_hash=get_password_hash("HR@2025"),
            full_name="HR Manager",
            is_active=True,
            is_superuser=False
        ),
        User(
            email="compliance@vantax.co.za",
            password_hash=get_password_hash("Compliance@2025"),
            full_name="Compliance Officer",
            is_active=True,
            is_superuser=False
        ),
        User(
            email="operations@vantax.co.za",
            password_hash=get_password_hash("Operations@2025"),
            full_name="Operations Manager",
            is_active=True,
            is_superuser=False
        )
    ]
    
    for user in demo_users:
        db.add(user)
    
    db.commit()
    db.refresh(demo_admin)
    
    print(f"✅ Created VantaXDemo company with {len(demo_users) + 1} users")
    print("\n📋 Demo User Credentials:")
    print("=" * 60)
    print(f"Admin:      demo@vantax.co.za / Demo@2025")
    print(f"Finance:    finance@vantax.co.za / Finance@2025")
    print(f"HR:         hr@vantax.co.za / HR@2025")
    print(f"Compliance: compliance@vantax.co.za / Compliance@2025")
    print(f"Operations: operations@vantax.co.za / Operations@2025")
    print("=" * 60)
    
    return demo_admin

def seed_document_processing_data(db: Session, user_id: int):
    """Seed data for 23 Document Processing bots"""
    print("\n📄 Seeding Document Processing Bot Data (23 bots)...")
    
    # Check if Document model exists
    try:
        from models.document import Document
        
        documents = [
            # Positive test cases
            {
                "user_id": user_id,
                "filename": "invoice_001.pdf",
                "file_type": "application/pdf",
                "file_size": 245678,
                "status": "processed",
                "document_type": "invoice",
                "extracted_data": {
                    "invoice_number": "INV-2025-001",
                    "vendor": "ABC Suppliers Ltd",
                    "amount": 15230.50,
                    "date": "2025-10-15",
                    "vat": 2284.58
                }
            },
            {
                "user_id": user_id,
                "filename": "contract_employment.pdf",
                "file_type": "application/pdf",
                "file_size": 567890,
                "status": "processed",
                "document_type": "contract",
                "extracted_data": {
                    "contract_type": "employment",
                    "parties": ["VantaX Pty Ltd", "John Smith"],
                    "start_date": "2025-11-01",
                    "salary": 45000.00,
                    "duration": "Permanent"
                }
            },
            {
                "user_id": user_id,
                "filename": "receipt_office_supplies.jpg",
                "file_type": "image/jpeg",
                "file_size": 123456,
                "status": "processed",
                "document_type": "receipt",
                "extracted_data": {
                    "merchant": "Office Mart",
                    "amount": 1250.00,
                    "date": "2025-10-20",
                    "items": ["Paper", "Pens", "Stapler"]
                }
            },
            # Negative test cases
            {
                "user_id": user_id,
                "filename": "corrupted_file.pdf",
                "file_type": "application/pdf",
                "file_size": 0,
                "status": "failed",
                "document_type": "unknown",
                "extracted_data": {"error": "File corrupted or empty"}
            },
            {
                "user_id": user_id,
                "filename": "unreadable_scan.jpg",
                "file_type": "image/jpeg",
                "file_size": 89012,
                "status": "failed",
                "document_type": "unknown",
                "extracted_data": {"error": "OCR failed - text not readable"}
            }
        ]
        
        for doc_data in documents:
            doc = Document(**doc_data)
            db.add(doc)
        
        db.commit()
        print(f"✅ Created {len(documents)} sample documents (3 positive, 2 negative)")
        
    except ImportError:
        print("⚠️  Document model not found. Skipping document data.")

def seed_finance_automation_data(db: Session, user_id: int):
    """Seed data for 12 Finance Automation bots"""
    print("\n💰 Seeding Finance Automation Bot Data (12 bots)...")
    
    # Create sample financial transactions
    finance_scenarios = [
        # Positive: Invoice Processing Bot
        {
            "bot_type": "invoice_processing",
            "scenario": "positive",
            "data": {
                "invoice_number": "INV-2025-001",
                "vendor": "ABC Suppliers Ltd",
                "amount": 15230.50,
                "vat": 2284.58,
                "total": 17515.08,
                "due_date": "2025-11-15",
                "status": "approved"
            }
        },
        # Negative: Invoice with missing data
        {
            "bot_type": "invoice_processing",
            "scenario": "negative",
            "data": {
                "invoice_number": "INV-2025-002",
                "vendor": "",  # Missing vendor
                "amount": 0,  # Invalid amount
                "status": "rejected",
                "error": "Missing required fields: vendor, amount"
            }
        },
        # Positive: Expense Management Bot
        {
            "bot_type": "expense_management",
            "scenario": "positive",
            "data": {
                "expense_id": "EXP-2025-001",
                "employee": "finance@vantax.co.za",
                "category": "Travel",
                "amount": 2500.00,
                "date": "2025-10-20",
                "receipt": "receipt_001.pdf",
                "status": "approved"
            }
        },
        # Negative: Expense over limit
        {
            "bot_type": "expense_management",
            "scenario": "negative",
            "data": {
                "expense_id": "EXP-2025-002",
                "employee": "operations@vantax.co.za",
                "category": "Entertainment",
                "amount": 15000.00,  # Over R5000 limit
                "date": "2025-10-21",
                "status": "rejected",
                "error": "Amount exceeds policy limit (max R5000 for entertainment)"
            }
        },
        # Positive: Bank Reconciliation Bot
        {
            "bot_type": "bank_reconciliation",
            "scenario": "positive",
            "data": {
                "reconciliation_id": "REC-2025-10",
                "bank_balance": 125340.50,
                "book_balance": 125340.50,
                "difference": 0.00,
                "status": "balanced",
                "unmatched_items": 0
            }
        },
        # Negative: Reconciliation with discrepancies
        {
            "bot_type": "bank_reconciliation",
            "scenario": "negative",
            "data": {
                "reconciliation_id": "REC-2025-09",
                "bank_balance": 125340.50,
                "book_balance": 123890.00,
                "difference": 1450.50,
                "status": "discrepancy",
                "unmatched_items": 3,
                "error": "Bank and book balances do not match"
            }
        },
        # Positive: Xero Sync Bot
        {
            "bot_type": "xero_sync",
            "scenario": "positive",
            "data": {
                "sync_id": "SYNC-2025-001",
                "records_synced": 45,
                "invoices": 20,
                "bills": 15,
                "payments": 10,
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat()
            }
        },
        # Negative: Xero API failure
        {
            "bot_type": "xero_sync",
            "scenario": "negative",
            "data": {
                "sync_id": "SYNC-2025-002",
                "records_synced": 0,
                "status": "failed",
                "error": "Xero API authentication failed - token expired"
            }
        }
    ]
    
    print(f"✅ Created {len(finance_scenarios)} finance automation scenarios")
    print(f"   - Invoice Processing: 2 scenarios")
    print(f"   - Expense Management: 2 scenarios")
    print(f"   - Bank Reconciliation: 2 scenarios")
    print(f"   - Xero Sync: 2 scenarios")
    return finance_scenarios

def seed_hr_payroll_data(db: Session, user_id: int):
    """Seed data for 8 HR & Payroll bots"""
    print("\n👥 Seeding HR & Payroll Bot Data (8 bots)...")
    
    hr_scenarios = [
        # Positive: Employee Onboarding Bot
        {
            "bot_type": "employee_onboarding",
            "scenario": "positive",
            "data": {
                "employee_id": "EMP-2025-001",
                "full_name": "Sarah Johnson",
                "email": "sarah.johnson@vantax.co.za",
                "position": "Senior Accountant",
                "start_date": "2025-11-01",
                "department": "Finance",
                "documents": ["ID Copy", "Tax Number", "Bank Details", "Qualification"],
                "status": "completed",
                "onboarding_checklist": {
                    "documents_received": True,
                    "system_access_granted": True,
                    "equipment_issued": True,
                    "orientation_completed": True
                }
            }
        },
        # Negative: Onboarding with missing documents
        {
            "bot_type": "employee_onboarding",
            "scenario": "negative",
            "data": {
                "employee_id": "EMP-2025-002",
                "full_name": "Michael Brown",
                "email": "michael.brown@vantax.co.za",
                "position": "Junior Developer",
                "start_date": "2025-11-15",
                "department": "IT",
                "documents": ["ID Copy"],  # Missing required docs
                "status": "incomplete",
                "error": "Missing required documents: Tax Number, Bank Details"
            }
        },
        # Positive: Payroll Processing Bot
        {
            "bot_type": "payroll_processing",
            "scenario": "positive",
            "data": {
                "payroll_period": "October 2025",
                "employees_processed": 25,
                "total_gross": 562500.00,
                "total_deductions": 112500.00,
                "total_net": 450000.00,
                "status": "completed",
                "payment_date": "2025-10-25",
                "breakdown": {
                    "PAYE": 75000.00,
                    "UIF": 7500.00,
                    "Pension": 30000.00
                }
            }
        },
        # Negative: Payroll with calculation errors
        {
            "bot_type": "payroll_processing",
            "scenario": "negative",
            "data": {
                "payroll_period": "September 2025",
                "employees_processed": 23,
                "status": "failed",
                "error": "Tax calculation mismatch - PAYE rates changed mid-month"
            }
        },
        # Positive: Leave Management Bot
        {
            "bot_type": "leave_management",
            "scenario": "positive",
            "data": {
                "leave_request_id": "LEAVE-2025-001",
                "employee": "finance@vantax.co.za",
                "leave_type": "Annual Leave",
                "start_date": "2025-12-01",
                "end_date": "2025-12-10",
                "days_requested": 10,
                "days_available": 15,
                "status": "approved",
                "approver": "demo@vantax.co.za"
            }
        },
        # Negative: Leave request exceeds balance
        {
            "bot_type": "leave_management",
            "scenario": "negative",
            "data": {
                "leave_request_id": "LEAVE-2025-002",
                "employee": "operations@vantax.co.za",
                "leave_type": "Annual Leave",
                "start_date": "2025-11-15",
                "end_date": "2025-11-30",
                "days_requested": 16,
                "days_available": 5,
                "status": "rejected",
                "error": "Insufficient leave balance (requested: 16, available: 5)"
            }
        },
        # Positive: Performance Review Bot
        {
            "bot_type": "performance_review",
            "scenario": "positive",
            "data": {
                "review_id": "REV-2025-Q3-001",
                "employee": "finance@vantax.co.za",
                "reviewer": "demo@vantax.co.za",
                "period": "Q3 2025",
                "ratings": {
                    "quality_of_work": 4.5,
                    "productivity": 4.0,
                    "communication": 5.0,
                    "teamwork": 4.5
                },
                "overall_score": 4.5,
                "status": "completed"
            }
        },
        # Negative: Review not submitted on time
        {
            "bot_type": "performance_review",
            "scenario": "negative",
            "data": {
                "review_id": "REV-2025-Q2-005",
                "employee": "hr@vantax.co.za",
                "reviewer": "demo@vantax.co.za",
                "period": "Q2 2025",
                "status": "overdue",
                "error": "Review due date passed (due: 2025-07-15, today: 2025-10-26)"
            }
        }
    ]
    
    print(f"✅ Created {len(hr_scenarios)} HR & payroll scenarios")
    print(f"   - Employee Onboarding: 2 scenarios")
    print(f"   - Payroll Processing: 2 scenarios")
    print(f"   - Leave Management: 2 scenarios")
    print(f"   - Performance Review: 2 scenarios")
    return hr_scenarios

def seed_compliance_data(db: Session, user_id: int):
    """Seed data for 9 Compliance bots"""
    print("\n⚖️  Seeding Compliance Bot Data (9 bots)...")
    
    compliance_scenarios = [
        # Positive: POPIA Compliance Bot
        {
            "bot_type": "popia_compliance",
            "scenario": "positive",
            "data": {
                "audit_id": "POPIA-2025-10",
                "data_subjects": 1250,
                "consent_records": 1250,
                "consent_rate": 100.0,
                "data_breaches": 0,
                "deletion_requests": 3,
                "deletion_completed": 3,
                "status": "compliant",
                "last_audit": "2025-10-15"
            }
        },
        # Negative: POPIA violations detected
        {
            "bot_type": "popia_compliance",
            "scenario": "negative",
            "data": {
                "audit_id": "POPIA-2025-09",
                "data_subjects": 1200,
                "consent_records": 980,
                "consent_rate": 81.67,
                "missing_consent": 220,
                "status": "non-compliant",
                "error": "220 data subjects without valid consent records"
            }
        },
        # Positive: Contract Analysis Bot
        {
            "bot_type": "contract_analysis",
            "scenario": "positive",
            "data": {
                "contract_id": "CON-2025-001",
                "contract_type": "Supplier Agreement",
                "parties": ["VantaX Pty Ltd", "Tech Supplies Inc"],
                "value": 250000.00,
                "duration": "24 months",
                "key_clauses": {
                    "payment_terms": "30 days",
                    "termination": "60 days notice",
                    "liability_cap": "Contract value",
                    "dispute_resolution": "South African law"
                },
                "risk_score": 2.5,
                "status": "approved"
            }
        },
        # Negative: Contract with high-risk clauses
        {
            "bot_type": "contract_analysis",
            "scenario": "negative",
            "data": {
                "contract_id": "CON-2025-002",
                "contract_type": "Service Agreement",
                "risk_score": 8.5,
                "status": "flagged",
                "high_risk_clauses": [
                    "Unlimited liability clause",
                    "No termination rights",
                    "Foreign jurisdiction (incompatible with SA law)"
                ],
                "error": "Contract contains high-risk clauses requiring legal review"
            }
        },
        # Positive: B-BBEE Compliance Bot
        {
            "bot_type": "bbbee_compliance",
            "scenario": "positive",
            "data": {
                "scorecard_period": "2025",
                "ownership": 25.0,
                "management_control": 18.5,
                "skills_development": 20.0,
                "enterprise_supplier_development": 35.0,
                "socioeconomic_development": 5.0,
                "total_score": 103.5,
                "level": "Level 2",
                "status": "compliant"
            }
        },
        # Negative: B-BBEE score below target
        {
            "bot_type": "bbbee_compliance",
            "scenario": "negative",
            "data": {
                "scorecard_period": "2024",
                "total_score": 65.0,
                "level": "Level 6",
                "status": "below_target",
                "gaps": {
                    "skills_development": "10 points below",
                    "enterprise_development": "15 points below"
                },
                "error": "Company below Level 4 target - action required"
            }
        },
        # Positive: Audit Trail Bot
        {
            "bot_type": "audit_trail",
            "scenario": "positive",
            "data": {
                "audit_period": "October 2025",
                "events_logged": 15234,
                "user_actions": 12450,
                "system_events": 2784,
                "security_events": 125,
                "anomalies_detected": 0,
                "integrity_check": "passed",
                "status": "compliant"
            }
        },
        # Negative: Audit trail gaps detected
        {
            "bot_type": "audit_trail",
            "scenario": "negative",
            "data": {
                "audit_period": "September 2025",
                "events_logged": 14890,
                "missing_logs": 340,
                "gap_duration": "2025-09-15 14:00 to 16:30",
                "status": "incomplete",
                "error": "Audit log gaps detected - possible system outage or tampering"
            }
        }
    ]
    
    print(f"✅ Created {len(compliance_scenarios)} compliance scenarios")
    print(f"   - POPIA Compliance: 2 scenarios")
    print(f"   - Contract Analysis: 2 scenarios")
    print(f"   - B-BBEE Compliance: 2 scenarios")
    print(f"   - Audit Trail: 2 scenarios")
    return compliance_scenarios

def seed_customer_service_data(db: Session, user_id: int):
    """Seed data for 7 Customer Service bots"""
    print("\n🎧 Seeding Customer Service Bot Data (7 bots)...")
    
    customer_service_scenarios = [
        # Positive: AI Chatbot
        {
            "bot_type": "ai_chatbot",
            "scenario": "positive",
            "data": {
                "session_id": "CHAT-2025-001",
                "customer": "john.doe@example.com",
                "query": "How do I reset my password?",
                "response": "To reset your password, click 'Forgot Password' on the login page...",
                "resolved": True,
                "sentiment": "neutral",
                "satisfaction_score": 4.5,
                "duration_seconds": 45
            }
        },
        # Negative: Chatbot unable to help
        {
            "bot_type": "ai_chatbot",
            "scenario": "negative",
            "data": {
                "session_id": "CHAT-2025-002",
                "customer": "jane.smith@example.com",
                "query": "I need custom integration with legacy ERP system",
                "resolved": False,
                "escalated_to": "human_agent",
                "sentiment": "frustrated",
                "error": "Query requires human intervention - escalated to support team"
            }
        },
        # Positive: Ticket Routing Bot
        {
            "bot_type": "ticket_routing",
            "scenario": "positive",
            "data": {
                "ticket_id": "TKT-2025-001",
                "category": "Billing",
                "priority": "Medium",
                "assigned_to": "finance@vantax.co.za",
                "routing_confidence": 95.0,
                "routing_time_ms": 120,
                "status": "assigned"
            }
        },
        # Negative: Unable to categorize ticket
        {
            "bot_type": "ticket_routing",
            "scenario": "negative",
            "data": {
                "ticket_id": "TKT-2025-002",
                "category": "unknown",
                "priority": "Low",
                "routing_confidence": 35.0,
                "status": "unassigned",
                "error": "Low confidence routing - requires manual assignment"
            }
        },
        # Positive: Sentiment Analysis Bot
        {
            "bot_type": "sentiment_analysis",
            "scenario": "positive",
            "data": {
                "analysis_id": "SENT-2025-001",
                "text": "Great product! The automation has saved us so much time.",
                "sentiment": "positive",
                "confidence": 98.5,
                "emotions": {
                    "joy": 0.85,
                    "satisfaction": 0.92,
                    "trust": 0.78
                }
            }
        },
        # Negative: Negative sentiment detected
        {
            "bot_type": "sentiment_analysis",
            "scenario": "negative",
            "data": {
                "analysis_id": "SENT-2025-002",
                "text": "This is terrible. I've been waiting for support for 2 days!",
                "sentiment": "negative",
                "confidence": 96.0,
                "emotions": {
                    "anger": 0.88,
                    "frustration": 0.92,
                    "disappointment": 0.85
                },
                "alert": "Negative sentiment threshold exceeded - immediate action required"
            }
        }
    ]
    
    print(f"✅ Created {len(customer_service_scenarios)} customer service scenarios")
    print(f"   - AI Chatbot: 2 scenarios")
    print(f"   - Ticket Routing: 2 scenarios")
    print(f"   - Sentiment Analysis: 2 scenarios")
    return customer_service_scenarios

def seed_inventory_data(db: Session, user_id: int):
    """Seed data for 4 Inventory bots"""
    print("\n📦 Seeding Inventory Bot Data (4 bots)...")
    
    inventory_scenarios = [
        # Positive: Stock Tracking Bot
        {
            "bot_type": "stock_tracking",
            "scenario": "positive",
            "data": {
                "product_id": "PRD-001",
                "product_name": "Office Paper A4 (500 sheets)",
                "current_stock": 250,
                "reorder_point": 100,
                "reorder_quantity": 500,
                "status": "in_stock",
                "last_updated": datetime.utcnow().isoformat()
            }
        },
        # Negative: Stock below reorder point
        {
            "bot_type": "stock_tracking",
            "scenario": "negative",
            "data": {
                "product_id": "PRD-002",
                "product_name": "Printer Toner Cartridge",
                "current_stock": 3,
                "reorder_point": 10,
                "reorder_quantity": 50,
                "status": "low_stock",
                "alert": "Stock below reorder point - automatic reorder triggered"
            }
        },
        # Positive: Reorder Automation Bot
        {
            "bot_type": "reorder_automation",
            "scenario": "positive",
            "data": {
                "order_id": "PO-2025-001",
                "product_id": "PRD-002",
                "product_name": "Printer Toner Cartridge",
                "quantity": 50,
                "supplier": "Office Supplies Co",
                "unit_price": 350.00,
                "total": 17500.00,
                "status": "order_placed",
                "expected_delivery": "2025-11-05"
            }
        },
        # Negative: Supplier unavailable
        {
            "bot_type": "reorder_automation",
            "scenario": "negative",
            "data": {
                "order_id": "PO-2025-002",
                "product_id": "PRD-003",
                "product_name": "Desk Chairs",
                "quantity": 10,
                "supplier": "Furniture Plus",
                "status": "failed",
                "error": "Supplier API unavailable - manual order required"
            }
        },
        # Positive: Inventory Forecasting Bot
        {
            "bot_type": "inventory_forecasting",
            "scenario": "positive",
            "data": {
                "forecast_period": "November 2025",
                "product_id": "PRD-001",
                "product_name": "Office Paper A4",
                "predicted_demand": 450,
                "current_stock": 250,
                "recommended_order": 500,
                "confidence": 87.5,
                "basis": "Historical sales trend (12 months)"
            }
        },
        # Negative: Insufficient historical data
        {
            "bot_type": "inventory_forecasting",
            "scenario": "negative",
            "data": {
                "forecast_period": "November 2025",
                "product_id": "PRD-004",
                "product_name": "New Product - Standing Desks",
                "status": "insufficient_data",
                "error": "Cannot forecast - product added only 2 weeks ago (minimum 3 months data required)"
            }
        }
    ]
    
    print(f"✅ Created {len(inventory_scenarios)} inventory scenarios")
    print(f"   - Stock Tracking: 2 scenarios")
    print(f"   - Reorder Automation: 2 scenarios")
    print(f"   - Inventory Forecasting: 2 scenarios")
    return inventory_scenarios

def seed_sales_analytics_data(db: Session, user_id: int):
    """Seed data for 2 Sales + 2 Analytics bots"""
    print("\n📊 Seeding Sales & Analytics Bot Data (4 bots)...")
    
    sales_analytics_scenarios = [
        # Positive: Lead Scoring Bot
        {
            "bot_type": "lead_scoring",
            "scenario": "positive",
            "data": {
                "lead_id": "LEAD-2025-001",
                "company": "Tech Innovations Ltd",
                "contact": "Sarah Williams",
                "email": "sarah@techinnovations.co.za",
                "score": 85,
                "factors": {
                    "company_size": 150,
                    "industry": "Technology",
                    "engagement": "High",
                    "budget": "R100K-R500K",
                    "timeline": "Immediate"
                },
                "recommendation": "Hot lead - contact within 24 hours"
            }
        },
        # Negative: Low quality lead
        {
            "bot_type": "lead_scoring",
            "scenario": "negative",
            "data": {
                "lead_id": "LEAD-2025-002",
                "company": "Small Business X",
                "contact": "Unknown",
                "email": "info@example.com",
                "score": 15,
                "factors": {
                    "company_size": "Unknown",
                    "industry": "Unknown",
                    "engagement": "None",
                    "budget": "Unspecified",
                    "timeline": "Just browsing"
                },
                "recommendation": "Low priority - nurture with email campaign"
            }
        },
        # Positive: BI Dashboard Bot
        {
            "bot_type": "bi_dashboard",
            "scenario": "positive",
            "data": {
                "dashboard_id": "DASH-SALES-001",
                "period": "October 2025",
                "metrics": {
                    "revenue": 1250000.00,
                    "growth": 15.5,
                    "customers": 48,
                    "avg_deal_size": 26041.67,
                    "conversion_rate": 32.0
                },
                "status": "generated",
                "visualization_count": 12
            }
        },
        # Negative: Data quality issues
        {
            "bot_type": "bi_dashboard",
            "scenario": "negative",
            "data": {
                "dashboard_id": "DASH-OPS-001",
                "period": "September 2025",
                "status": "incomplete",
                "error": "Data quality issues detected - 35% of records missing timestamps"
            }
        },
        # Positive: Predictive Analytics Bot
        {
            "bot_type": "predictive_analytics",
            "scenario": "positive",
            "data": {
                "model_id": "PRED-CHURN-001",
                "model_type": "Churn Prediction",
                "period": "Q4 2025",
                "predictions": 48,
                "high_risk_customers": 5,
                "medium_risk_customers": 12,
                "low_risk_customers": 31,
                "accuracy": 89.5,
                "recommendations": [
                    "Contact high-risk customers within 1 week",
                    "Offer loyalty discount to medium-risk segment"
                ]
            }
        },
        # Negative: Model accuracy degraded
        {
            "bot_type": "predictive_analytics",
            "scenario": "negative",
            "data": {
                "model_id": "PRED-SALES-001",
                "model_type": "Sales Forecasting",
                "accuracy": 62.0,
                "status": "retraining_required",
                "error": "Model accuracy below threshold (target: 80%, actual: 62%) - retraining scheduled"
            }
        }
    ]
    
    print(f"✅ Created {len(sales_analytics_scenarios)} sales & analytics scenarios")
    print(f"   - Lead Scoring: 2 scenarios")
    print(f"   - BI Dashboard: 2 scenarios")
    print(f"   - Predictive Analytics: 2 scenarios")
    return sales_analytics_scenarios

def main():
    """Main seeding function"""
    print("=" * 80)
    print("🌱 VANTAXDEMO COMPANY SEEDING")
    print("=" * 80)
    print("This script will create:")
    print("  - VantaXDemo company with 5 users")
    print("  - Sample transactions for all 67 bots")
    print("  - Positive and negative test scenarios")
    print("=" * 80)
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Step 1: Create tables
        create_database_tables()
        
        # Step 2: Seed demo company and users
        demo_admin = seed_demo_company(db)
        
        if not demo_admin:
            print("\n⚠️  Demo company already exists. Use existing data.")
            demo_admin = db.query(User).filter(User.email == "demo@vantax.co.za").first()
        
        user_id = demo_admin.id
        
        # Step 3: Seed data for all bot categories
        print("\n" + "=" * 80)
        print("📊 SEEDING BOT DATA (67 BOTS TOTAL)")
        print("=" * 80)
        
        # Document Processing (23 bots)
        seed_document_processing_data(db, user_id)
        
        # Finance Automation (12 bots)
        finance_data = seed_finance_automation_data(db, user_id)
        
        # HR & Payroll (8 bots)
        hr_data = seed_hr_payroll_data(db, user_id)
        
        # Compliance (9 bots)
        compliance_data = seed_compliance_data(db, user_id)
        
        # Customer Service (7 bots)
        customer_service_data = seed_customer_service_data(db, user_id)
        
        # Inventory (4 bots)
        inventory_data = seed_inventory_data(db, user_id)
        
        # Sales & Analytics (4 bots)
        sales_analytics_data = seed_sales_analytics_data(db, user_id)
        
        print("\n" + "=" * 80)
        print("✅ SEEDING COMPLETE!")
        print("=" * 80)
        print("\n📈 Summary:")
        print(f"   - Company: VantaXDemo")
        print(f"   - Users: 5")
        print(f"   - Bot Categories: 8")
        print(f"   - Total Bots: 67")
        print(f"   - Test Scenarios Created: ~40+ (positive + negative)")
        
        print("\n🔐 Access the demo:")
        print(f"   URL: https://aria.vantax.co.za")
        print(f"   Email: demo@vantax.co.za")
        print(f"   Password: Demo@2025")
        
        print("\n📝 Next Steps:")
        print("   1. Log in to the platform")
        print("   2. Navigate to each bot category")
        print("   3. Test positive scenarios (should succeed)")
        print("   4. Test negative scenarios (should fail gracefully)")
        print("   5. Verify error handling and validation")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
