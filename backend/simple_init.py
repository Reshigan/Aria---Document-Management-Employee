#!/usr/bin/env python3
"""
Simple database initialization script for ARIA
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.config import settings
from core.security import get_password_hash

# Create database engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create basic tables"""
    with engine.connect() as conn:
        # Create users table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_superuser BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create documents table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename VARCHAR(255) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INTEGER,
                content_type VARCHAR(100),
                document_type VARCHAR(50),
                status VARCHAR(50) DEFAULT 'uploaded',
                owner_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users (id)
            )
        """))
        
        conn.commit()
        print("✅ Database tables created successfully!")

def create_admin_user():
    """Create admin user"""
    session = SessionLocal()
    try:
        # Check if admin exists
        result = session.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        if result.fetchone():
            print("ℹ️  Admin user already exists")
            return
        
        # Create admin user
        hashed_password = get_password_hash("admin123")
        session.execute(text("""
            INSERT INTO users (username, email, hashed_password, is_active, is_superuser)
            VALUES ('admin', 'admin@aria.local', :password, TRUE, TRUE)
        """), {"password": hashed_password})
        
        session.commit()
        print("✅ Admin user created successfully!")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Email: admin@aria.local")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating admin user: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    print("🚀 Initializing ARIA database...")
    create_tables()
    create_admin_user()
    print("✅ Database initialization complete!")