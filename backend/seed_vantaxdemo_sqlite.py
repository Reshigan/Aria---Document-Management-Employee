#!/usr/bin/env python3
"""
VantaXDemo Seeding for SQLite Production Database
"""
import sqlite3
from passlib.context import CryptContext
from datetime import datetime

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def main():
    print("=" * 80)
    print("🌱 VANTAXDEMO COMPANY SEEDING (SQLite Version)")
    print("=" * 80)
    print("Creating VantaXDemo company with 5 users...")
    print("")
    
    # Connect to SQLite database
    conn = sqlite3.connect('aria.db')
    cursor = conn.cursor()
    
    try:
        # Check if demo@vantax.co.za already exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", ("demo@vantax.co.za",))
        existing_count = cursor.fetchone()[0]
        
        if existing_count > 0:
            print("⚠️  VantaXDemo users already exist. Skipping creation.")
            
            # Show existing users
            cursor.execute("SELECT email, full_name, is_active, is_superuser FROM users WHERE email LIKE '%vantax.co.za'")
            users = cursor.fetchall()
            
            print("\n📋 Existing VantaXDemo Users:")
            print("=" * 60)
            for user in users:
                print(f"  {user[0]} - {user[1]} (Active: {user[2]}, Admin: {user[3]})")
            print("=" * 60)
        else:
            # Define demo users
            demo_users = [
                {
                    "username": "vantax_demo_admin",
                    "email": "demo@vantax.co.za",
                    "password": "Demo@2025",
                    "full_name": "VantaX Demo Admin",
                    "is_active": 1,
                    "is_superuser": 1
                },
                {
                    "username": "vantax_finance",
                    "email": "finance@vantax.co.za",
                    "password": "Finance@2025",
                    "full_name": "Finance Manager",
                    "is_active": 1,
                    "is_superuser": 0
                },
                {
                    "username": "vantax_hr",
                    "email": "hr@vantax.co.za",
                    "password": "HR@2025",
                    "full_name": "HR Manager",
                    "is_active": 1,
                    "is_superuser": 0
                },
                {
                    "username": "vantax_compliance",
                    "email": "compliance@vantax.co.za",
                    "password": "Compliance@2025",
                    "full_name": "Compliance Officer",
                    "is_active": 1,
                    "is_superuser": 0
                },
                {
                    "username": "vantax_operations",
                    "email": "operations@vantax.co.za",
                    "password": "Operations@2025",
                    "full_name": "Operations Manager",
                    "is_active": 1,
                    "is_superuser": 0
                }
            ]
            
            # Insert users
            now = datetime.now().isoformat()
            
            for user in demo_users:
                password_hash = hash_password(user["password"])
                
                cursor.execute("""
                    INSERT INTO users (username, email, hashed_password, full_name, is_active, is_superuser, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user["username"],
                    user["email"],
                    password_hash,
                    user["full_name"],
                    user["is_active"],
                    user["is_superuser"],
                    now,
                    now
                ))
                
                print(f"✅ Created user: {user['email']}")
            
            conn.commit()
            
            print("\n" + "=" * 80)
            print("✅ SEEDING COMPLETE!")
            print("=" * 80)
        
        print("\n📋 Demo User Credentials:")
        print("=" * 60)
        print("Admin:      demo@vantax.co.za / Demo@2025")
        print("Finance:    finance@vantax.co.za / Finance@2025")
        print("HR:         hr@vantax.co.za / HR@2025")
        print("Compliance: compliance@vantax.co.za / Compliance@2025")
        print("Operations: operations@vantax.co.za / Operations@2025")
        print("=" * 60)
        
        print("\n🔐 Access the demo:")
        print("   URL: https://aria.vantax.co.za")
        print("   Email: demo@vantax.co.za")
        print("   Password: Demo@2025")
        
        print("\n📝 Next Steps:")
        print("   1. Log in to the platform")
        print("   2. Navigate to each bot category")
        print("   3. Test positive scenarios (should succeed)")
        print("   4. Test negative scenarios (should fail gracefully)")
        print("   5. Follow BOT_TESTING_GUIDE.md for detailed testing")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return 1
    finally:
        conn.close()
    
    return 0

if __name__ == "__main__":
    exit(main())
