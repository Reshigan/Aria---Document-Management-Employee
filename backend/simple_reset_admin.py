#!/usr/bin/env python3
"""Simple admin reset using direct SQL"""
import sqlite3
from passlib.context import CryptContext

# Initialize password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database path
db_path = "./aria.db"

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if users table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
if not cursor.fetchone():
    print("❌ Users table doesn't exist!")
    conn.close()
    exit(1)

# Get table schema
cursor.execute("PRAGMA table_info(users)")
columns = [col[1] for col in cursor.fetchall()]
print(f"📋 Users table columns: {', '.join(columns)}")

# Check if admin exists
cursor.execute("SELECT username, email FROM users WHERE username='admin'")
admin = cursor.fetchone()

# Hash the password
hashed_password = pwd_context.hash("admin")

if admin:
    print(f"\n✅ Found admin user: {admin[0]} ({admin[1]})")
    
    # Update admin password
    cursor.execute(
        "UPDATE users SET hashed_password = ?, is_active = 1, is_superuser = 1 WHERE username = 'admin'",
        (hashed_password,)
    )
    conn.commit()
    print("✅ Password reset to 'admin'\n")
else:
    print("\n❌ Admin user not found. Creating...")
    
    # Check required columns
    required = ['username', 'email', 'hashed_password', 'is_active', 'is_superuser']
    missing = [col for col in required if col not in columns]
    
    if missing:
        print(f"❌ Missing columns: {', '.join(missing)}")
        print("⚠️  Database schema needs migration!")
        conn.close()
        exit(1)
    
    # Create admin user with only available columns
    from datetime import datetime
    now = datetime.now().isoformat()
    
    insert_cols = ['username', 'email', 'hashed_password', 'is_active', 'is_superuser', 'created_at', 'updated_at']
    insert_vals = ['admin', 'admin@aria.com', hashed_password, 1, 1, now, now]
    
    # Add optional columns if they exist
    if 'full_name' in columns:
        insert_cols.append('full_name')
        insert_vals.append('Administrator')
    
    placeholders = ', '.join(['?' for _ in insert_vals])
    col_names = ', '.join(insert_cols)
    
    cursor.execute(
        f"INSERT INTO users ({col_names}) VALUES ({placeholders})",
        insert_vals
    )
    conn.commit()
    print("✅ Admin user created with password 'admin'\n")

# List all users
print("All users in database:")
cursor.execute("SELECT username, email, is_superuser FROM users")
for user in cursor.fetchall():
    superuser_str = "ADMIN" if user[2] else "USER"
    print(f"  - {user[0]} ({user[1]}) [{superuser_str}]")

conn.close()
print("\n✅ Done!")
