#!/usr/bin/env python3
"""
Simple database initialization for ARIA - Windows Compatible
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import hashlib

# Simple password hashing without bcrypt issues
def simple_hash_password(password: str) -> str:
    """Simple password hashing using SHA-256"""
    import hashlib
    # Add a simple salt
    salt = "aria_erp_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()

# Create database engine using SQLite
DATABASE_URL = "sqlite:///./aria_erp.db"
engine = create_engine(DATABASE_URL)
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
                full_name VARCHAR(100),
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
        
        # Create companies table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(200) NOT NULL,
                registration_number VARCHAR(50),
                tax_number VARCHAR(50),
                email VARCHAR(100),
                phone VARCHAR(50),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            # Update password
            hashed_password = simple_hash_password("admin123")
            session.execute(text("""
                UPDATE users SET hashed_password = :password WHERE username = 'admin'
            """), {"password": hashed_password})
            session.commit()
            print("✅ Admin password updated!")
            return
        
        # Create admin user  (insert without full_name if column doesn't exist)
        hashed_password = simple_hash_password("admin123")
        try:
            session.execute(text("""
                INSERT INTO users (username, email, hashed_password, full_name, is_active, is_superuser)
                VALUES ('admin', 'admin@aria.local', :password, 'System Administrator', TRUE, TRUE)
            """), {"password": hashed_password})
        except Exception:
            # Fallback if full_name column doesn't exist
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
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    print("🚀 Initializing ARIA database...")
    print("")
    create_tables()
    create_admin_user()
    print("")
    print("✅ Database initialization complete!")
    print("")
    print("📍 Database file: aria_erp.db")
    print("🔐 You can now start the backend server!")
