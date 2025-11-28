#!/usr/bin/env python3
"""
Create missing database tables for Ask ARIA functionality:
- bot_executions: Track bot execution history
- aria_conversations: Store conversation sessions
- aria_messages: Store conversation messages
"""

import sqlite3
import os
from pathlib import Path

# Database path
DATABASE_PATH = os.getenv('DATABASE_PATH', '/var/www/aria/backend/aria.db')

def create_tables():
    """Create all missing tables for Ask ARIA"""
    print(f"📁 Connecting to database: {DATABASE_PATH}")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create bot_executions table
    print("📋 Creating bot_executions table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bot_executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            organization_id INTEGER,
            bot_id TEXT NOT NULL,
            bot_name TEXT NOT NULL,
            input_data TEXT,
            output_data TEXT,
            status TEXT DEFAULT 'success',
            execution_time_ms INTEGER DEFAULT 0,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    print("   ✅ bot_executions table created")
    
    # Create aria_conversations table
    print("📋 Creating aria_conversations table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS aria_conversations (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            organization_id INTEGER,
            intent TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    print("   ✅ aria_conversations table created")
    
    # Create aria_messages table
    print("📋 Creating aria_messages table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS aria_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES aria_conversations(id)
        )
    """)
    print("   ✅ aria_messages table created")
    
    # Create indexes for better performance
    print("📋 Creating indexes...")
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_bot_executions_user 
        ON bot_executions(user_id, created_at DESC)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_aria_conversations_user 
        ON aria_conversations(user_id, created_at DESC)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_aria_messages_conversation 
        ON aria_messages(conversation_id, created_at ASC)
    """)
    print("   ✅ Indexes created")
    
    conn.commit()
    conn.close()
    
    print("\n✅ All tables created successfully!")
    print("\nTables created:")
    print("  - bot_executions: Track bot execution history")
    print("  - aria_conversations: Store conversation sessions")
    print("  - aria_messages: Store conversation messages")

if __name__ == "__main__":
    create_tables()
