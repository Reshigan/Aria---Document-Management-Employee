import sqlite3
import hashlib
import os

# Database path
db_path = 'aria.db'

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def init_database():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
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
    ''')
    
    # Create documents table
    cursor.execute('''
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
    ''')
    
    # Check if admin user exists
    cursor.execute('SELECT id FROM users WHERE username = ?', ('admin',))
    if not cursor.fetchone():
        # Create admin user
        hashed_password = hash_password('admin123')
        cursor.execute('''
            INSERT INTO users (username, email, hashed_password, is_active, is_superuser)
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', 'admin@aria.local', hashed_password, True, True))
        print('✅ Admin user created: admin / admin123')
    else:
        print('ℹ️  Admin user already exists')
    
    conn.commit()
    conn.close()
    print('✅ Database initialized successfully!')

if __name__ == '__main__':
    print('🚀 Initializing ARIA database...')
    init_database()
