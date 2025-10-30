#!/usr/bin/env python3
"""
Initialize database with test user
"""
import sys
sys.path.insert(0, '/workspace/project/aria-erp/backend')

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.company import Company
from app.core.security import get_password_hash
import uuid

# Create all tables
Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

try:
    # Check if user exists
    existing_user = db.query(User).filter(User.email == "admin@aria-erp.com").first()
    
    if existing_user:
        print("✓ Admin user already exists")
    else:
        # Create company
        company = Company(
            id=str(uuid.uuid4()),
            name="ARIA Demo Company",
            subscription_plan="enterprise",
            subscription_status="active",
            industry="Manufacturing"
        )
        db.add(company)
        db.flush()
        
        # Create admin user
        admin_user = User(
            id=str(uuid.uuid4()),
            email="admin@aria-erp.com",
            first_name="Admin",
            last_name="User",
            password_hash=get_password_hash("AdminPass123!"),
            company_id=company.id,
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        
        db.commit()
        print(f"✅ Created admin user: admin@aria-erp.com / AdminPass123!")
        print(f"✅ Created company: {company.name}")
        
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
    import traceback
    traceback.print_exc()
finally:
    db.close()
