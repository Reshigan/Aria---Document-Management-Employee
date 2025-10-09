#!/usr/bin/env python3
"""Reset admin password"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from models.user import User
from core.security import get_password_hash

DATABASE_URL = "sqlite:///./aria.db"
engine = create_engine(DATABASE_URL)

with Session(engine) as session:
    # Find admin user
    admin = session.query(User).filter(User.username == "admin").first()
    
    if admin:
        print(f"Found admin user: {admin.username} ({admin.email})")
        print(f"Is superuser: {admin.is_superuser}")
        print(f"Active: {admin.is_active}")
        
        # Reset password to 'admin'
        admin.hashed_password = get_password_hash("admin")
        admin.is_active = True
        admin.is_superuser = True
        session.commit()
        print("\n✅ Password reset to 'admin'")
    else:
        print("Admin user not found. Creating new admin user...")
        admin = User(
            username="admin",
            email="admin@aria.com",
            hashed_password=get_password_hash("admin"),
            is_superuser=True,
            is_active=True
        )
        session.add(admin)
        session.commit()
        print("✅ Admin user created with password 'admin'")
    
    # List all users
    print("\nAll users in database:")
    users = session.query(User).all()
    for user in users:
        print(f"  - {user.username} ({user.email}) - Superuser: {user.is_superuser}")
