import sqlite3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from core.security import get_password_hash

def create_admin():
    conn = sqlite3.connect('aria.db')
    cursor = conn.cursor()
    
    # Delete existing admin
    cursor.execute('DELETE FROM users WHERE username = ?', ('admin',))
    
    # Create new admin with proper bcrypt hash
    hashed_password = get_password_hash('admin123')
    cursor.execute('''
        INSERT INTO users (username, email, hashed_password, is_active, is_superuser)
        VALUES (?, ?, ?, ?, ?)
    ''', ('admin', 'admin@vantax.co.za', hashed_password, True, True))
    
    conn.commit()
    conn.close()
    print('✅ Admin user created with bcrypt hash: admin@vantax.co.za / admin123')

if __name__ == '__main__':
    create_admin()
