#!/usr/bin/env python3
"""
Database initialization script
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from models.base import Base
from models.user import User
from models.document import Document
from core.security import get_password_hash

# Create database
DATABASE_URL = "sqlite:///./aria.db"
engine = create_engine(DATABASE_URL)

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Database tables created successfully!")

# Create admin user
from sqlalchemy.orm import Session

print("\nCreating admin user...")
with Session(engine) as session:
    # Check if admin exists
    existing_admin = session.query(User).filter(User.username == "admin").first()
    if existing_admin:
        print("⚠️  Admin user already exists")
    else:
        admin_user = User(
            username="admin",
            email="admin@aria.com",
            hashed_password=get_password_hash("Admin123!"),
            is_active=True,
            is_superuser=True
        )
        session.add(admin_user)
        session.commit()
        print("✅ Admin user created successfully!")
        print(f"   Username: admin")
        print(f"   Password: Admin123!")

# Create test users
print("\nCreating test users...")
test_users = [
    {"username": "john.doe", "email": "john.doe@company.com", "password": "JohnDoe123!"},
    {"username": "jane.smith", "email": "jane.smith@company.com", "password": "JaneSmith123!"},
    {"username": "mike.wilson", "email": "mike.wilson@company.com", "password": "MikeWilson123!"},
]

with Session(engine) as session:
    for user_data in test_users:
        existing = session.query(User).filter(User.username == user_data["username"]).first()
        if existing:
            print(f"⚠️  User {user_data['username']} already exists")
        else:
            new_user = User(
                username=user_data["username"],
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"]),
                is_active=True,
                is_superuser=False
            )
            session.add(new_user)
            session.commit()
            print(f"✅ User created: {user_data['username']}")
            print(f"   Email: {user_data['email']}")
            print(f"   Password: {user_data['password']}")

print("\n" + "="*60)
print("DATABASE INITIALIZATION COMPLETE!")
print("="*60)
print("\nTest Credentials:")
print("\n1. Admin Account:")
print("   Username: admin")
print("   Password: Admin123!")
print("\n2. Regular Users:")
for user in test_users:
    print(f"\n   Username: {user['username']}")
    print(f"   Password: {user['password']}")
print("\n" + "="*60)
