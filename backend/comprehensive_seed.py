#!/usr/bin/env python3
"""
Comprehensive Database Seed Script
Populates ALL database tables with realistic test and demo data
Including historical data for various time periods
"""

import sys
import os
from datetime import datetime, timedelta
import random

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from models import Base, User, Document, DocumentStatus, DocumentType

# Database setup
DATABASE_URL = "sqlite:///./aria_database.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_users(session):
    """Create comprehensive user accounts for testing"""
    print("📝 Creating users...")
    
    users_data = [
        {
            "username": "admin",
            "email": "admin@vantax.co.za",
            "password": "VantaXAdmin@2025",
            "full_name": "Administrator",
            "is_superuser": True,
            "is_active": True
        },
        {
            "username": "john.doe",
            "email": "john.doe@vantax.co.za",
            "password": "JohnDoe@123",
            "full_name": "John Doe",
            "is_superuser": False,
            "is_active": True
        },
        {
            "username": "jane.smith",
            "email": "jane.smith@vantax.co.za",
            "password": "JaneSmith@123",
            "full_name": "Jane Smith",
            "is_superuser": False,
            "is_active": True
        },
        {
            "username": "mike.manager",
            "email": "mike.manager@vantax.co.za",
            "password": "MikeManager@123",
            "full_name": "Mike Manager",
            "is_superuser": False,
            "is_active": True
        },
        {
            "username": "sarah.analyst",
            "email": "sarah.analyst@vantax.co.za",
            "password": "SarahAnalyst@123",
            "full_name": "Sarah Analyst",
            "is_superuser": False,
            "is_active": True
        },
        {
            "username": "demo",
            "email": "demo@vantax.co.za",
            "password": "Demo@123",
            "full_name": "Demo User",
            "is_superuser": False,
            "is_active": True
        },
    ]
    
    created_users = []
    for user_data in users_data:
        existing_user = session.query(User).filter(User.username == user_data["username"]).first()
        if existing_user:
            print(f"  ✓ User '{user_data['username']}' already exists")
            created_users.append(existing_user)
        else:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                is_superuser=user_data["is_superuser"],
                is_active=user_data["is_active"]
            )
            session.add(user)
            created_users.append(user)
            superuser_str = "admin" if user_data["is_superuser"] else "user"
            print(f"  ✓ Created user: {user_data['username']} ({superuser_str})")
    
    session.commit()
    print(f"✅ {len(created_users)} users ready\n")
    return created_users

def create_documents(session, users):
    """Create comprehensive document records across multiple time periods"""
    print("📄 Creating documents...")
    
    # Map to actual document types from enum
    doc_type_mapping = {
        "invoice": DocumentType.INVOICE,
        "receipt": DocumentType.RECEIPT,
        "contract": DocumentType.CONTRACT,
        "purchase_order": DocumentType.PURCHASE_ORDER,
        "statement": DocumentType.STATEMENT,
        "other": DocumentType.OTHER
    }
    
    doc_types = list(doc_type_mapping.keys())
    
    # Create documents spread over last 12 months
    documents_created = 0
    current_date = datetime.utcnow()
    
    # Generate 50 documents across different time periods
    for i in range(50):
        # Random date within last 365 days
        days_ago = random.randint(0, 365)
        created_date = current_date - timedelta(days=days_ago)
        
        # Pick random user as owner
        owner = random.choice(users)
        
        # Random document type
        doc_type_str = random.choice(doc_types)
        doc_type = doc_type_mapping[doc_type_str]
        
        # Status based on age (older = more likely processed)
        if days_ago > 30:
            status = random.choice([DocumentStatus.PROCESSED, DocumentStatus.PROCESSED, DocumentStatus.PROCESSED, DocumentStatus.ERROR])
        elif days_ago > 7:
            status = random.choice([DocumentStatus.PROCESSED, DocumentStatus.PROCESSING, DocumentStatus.PROCESSED])
        else:
            status = random.choice([DocumentStatus.UPLOADED, DocumentStatus.PROCESSING, DocumentStatus.PROCESSED])
        
        # Random file size (100KB to 5MB)
        file_size = random.randint(100000, 5000000)
        
        # Create realistic filenames
        filename = f"{doc_type_str}_{created_date.strftime('%Y%m%d')}_{random.randint(1000, 9999)}.pdf"
        
        document = Document(
            filename=f"stored_{filename}",
            original_filename=filename,
            file_path=f"/uploads/{filename}",
            file_size=file_size,
            mime_type="application/pdf",
            file_hash=f"hash_{random.randint(100000, 999999)}",
            document_type=doc_type,
            status=status,
            user_id=owner.id
        )
        
        session.add(document)
        documents_created += 1
        
        # If processed, add some OCR text
        if status == DocumentStatus.PROCESSED:
            sample_texts = [
                f"Invoice #{random.randint(10000, 99999)}\nDate: {created_date.strftime('%Y-%m-%d')}\nAmount: R{random.randint(1000, 50000)}.00",
                f"Receipt for payment\nReference: REF-{random.randint(10000, 99999)}\nTotal: R{random.randint(500, 25000)}.00",
                f"Contract Agreement\nExecuted: {created_date.strftime('%B %d, %Y')}\nParties: Vantax Solutions",
            ]
            document.ocr_text = random.choice(sample_texts)
    
    session.commit()
    print(f"✅ {documents_created} documents created\n")

def generate_statistics(session):
    """Generate and display database statistics"""
    print("📊 Database Statistics:")
    print(f"  👥 Total Users: {session.query(User).count()}")
    print(f"  📄 Total Documents: {session.query(Document).count()}")
    print(f"  ✅ Processed Documents: {session.query(Document).filter(Document.status == DocumentStatus.PROCESSED).count()}")
    print(f"  ⏳ Uploaded Documents: {session.query(Document).filter(Document.status == DocumentStatus.UPLOADED).count()}")
    print(f"  🔄 Processing Documents: {session.query(Document).filter(Document.status == DocumentStatus.PROCESSING).count()}")
    print(f"  ❌ Error Documents: {session.query(Document).filter(Document.status == DocumentStatus.ERROR).count()}")
    print()

def main():
    print("╔════════════════════════════════════════════════════════════╗")
    print("║    COMPREHENSIVE DATABASE SEED - ALL TABLES & TIME PERIODS  ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print()
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    session = SessionLocal()
    
    try:
        # Create users
        users = create_users(session)
        
        # Create documents
        create_documents(session, users)
        
        # Generate statistics
        generate_statistics(session)
        
        print("✅ Comprehensive database seeding complete!")
        print()
        print("🔑 Login Credentials:")
        print("━" * 60)
        print("  Admin:    admin / VantaXAdmin@2025")
        print("  User 1:   john.doe / JohnDoe@123")
        print("  User 2:   jane.smith / JaneSmith@123")
        print("  Manager:  mike.manager / MikeManager@123")
        print("  Analyst:  sarah.analyst / SarahAnalyst@123")
        print("  Demo:     demo / Demo@123")
        print("━" * 60)
        print()
        print("🌐 Test at: https://aria.vantax.co.za")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        session.rollback()
        import traceback
        traceback.print_exc()
        return 1
    finally:
        session.close()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
