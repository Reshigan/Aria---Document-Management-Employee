"""
PostgreSQL Database Adapter for Authentication System
Provides PostgreSQL-compatible versions of database functions used by auth_integrated.py
"""

import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Optional, Dict, Any
import os
import uuid

# PostgreSQL connection string
DATABASE_URL = os.getenv("DATABASE_URL_PG") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG or DATABASE_URL environment variable must be set")

def get_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(DATABASE_URL)

# ========================================
# USER MANAGEMENT
# ========================================

def create_user(email: str, hashed_password: str, full_name: str, organization_id: Optional[str] = None) -> Dict:
    """Create a new user - maps to PostgreSQL schema"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Split full_name into first_name and last_name
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0] if name_parts else full_name
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        user_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO users (
                id, company_id, email, password_hash, first_name, last_name,
                is_active, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id, email, password_hash, first_name, last_name, role, is_active, company_id
        """, (user_id, organization_id, email, hashed_password, first_name, last_name, True))
        
        row = cursor.fetchone()
        conn.commit()
        
        if row:
            # Map PostgreSQL columns to expected format
            return {
                'id': str(row['id']),
                'email': row['email'],
                'hashed_password': row['password_hash'],
                'full_name': f"{row['first_name']} {row['last_name']}".strip(),
                'role': row['role'] or 'user',
                'is_active': row['is_active'],
                'organization_id': str(row['company_id']) if row['company_id'] else None
            }
        return None
    except psycopg2.IntegrityError:
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email - maps to PostgreSQL schema"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT id, email, password_hash, first_name, last_name, role, 
                   is_active, company_id, last_login_at
            FROM users WHERE email = %s
        """, (email,))
        row = cursor.fetchone()
        
        if row:
            # Map PostgreSQL columns to expected format
            company_id_str = str(row['company_id']) if row['company_id'] else None
            return {
                'id': str(row['id']),
                'email': row['email'],
                'hashed_password': row['password_hash'],
                'full_name': f"{row['first_name']} {row['last_name']}".strip(),
                'role': row['role'] or 'user',
                'is_active': row['is_active'],
                'organization_id': company_id_str,
                'company_id': company_id_str,
                'last_login': row['last_login_at']
            }
        return None
    finally:
        cursor.close()
        conn.close()

def get_user_by_id(user_id: Any) -> Optional[Dict]:
    """Get user by ID - handles both int and UUID"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Convert to string UUID if needed
        user_id_str = str(user_id)
        
        cursor.execute("""
            SELECT id, email, password_hash, first_name, last_name, role,
                   is_active, company_id, last_login_at
            FROM users WHERE id = %s
        """, (user_id_str,))
        row = cursor.fetchone()
        
        if row:
            # Map PostgreSQL columns to expected format
            company_id_str = str(row['company_id']) if row['company_id'] else None
            return {
                'id': str(row['id']),
                'email': row['email'],
                'hashed_password': row['password_hash'],
                'full_name': f"{row['first_name']} {row['last_name']}".strip(),
                'role': row['role'] or 'user',
                'is_active': row['is_active'],
                'organization_id': company_id_str,
                'company_id': company_id_str,
                'last_login': row['last_login_at']
            }
        return None
    finally:
        cursor.close()
        conn.close()

def update_last_login(user_id: Any) -> bool:
    """Update user's last login timestamp"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        user_id_str = str(user_id)
        cursor.execute("""
            UPDATE users 
            SET last_login_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """, (user_id_str,))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()

# ========================================
# SESSION MANAGEMENT
# ========================================

def create_session(user_id: Any, access_token: str, refresh_token: str, 
                  expires_at: datetime, ip_address: Optional[str] = None,
                  user_agent: Optional[str] = None) -> Dict:
    """Create a new session - maps to actual user_sessions schema"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        user_id_str = str(user_id)
        
        cursor.execute("""
            INSERT INTO user_sessions (
                user_id, session_token, expires_at,
                ip_address, user_agent, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, session_token, is_active
        """, (user_id_str, access_token, expires_at,
              ip_address, user_agent, True))
        
        row = cursor.fetchone()
        conn.commit()
        
        if row:
            return {
                'id': str(row['id']),
                'user_id': str(row['user_id']),
                'access_token': row['session_token'],
                'is_active': row['is_active']
            }
        return None
    finally:
        cursor.close()
        conn.close()

def get_session_by_token(token: str) -> Optional[Dict]:
    """Get session by token - maps to actual user_sessions schema"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT id, user_id, session_token, is_active, expires_at
            FROM user_sessions 
            WHERE session_token = %s
        """, (token,))
        row = cursor.fetchone()
        
        if row:
            return {
                'id': str(row['id']),
                'user_id': str(row['user_id']),
                'access_token': row['session_token'],
                'is_active': row['is_active'],
                'expires_at': row['expires_at']
            }
        return None
    finally:
        cursor.close()
        conn.close()

def invalidate_session(token: str) -> bool:
    """Invalidate a session by token - maps to actual user_sessions schema"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE user_sessions 
            SET is_active = FALSE
            WHERE session_token = %s
        """, (token,))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()

# ========================================
# ORGANIZATION MANAGEMENT
# ========================================

def create_organization(name: str, subscription_tier: str = 'free') -> Dict:
    """Create a new organization (company)"""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        org_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO companies (
                id, name, created_at, updated_at
            ) VALUES (%s, %s, NOW(), NOW())
            RETURNING id, name
        """, (org_id, name))
        
        row = cursor.fetchone()
        conn.commit()
        
        if row:
            return {
                'id': str(row['id']),
                'name': row['name'],
                'subscription_tier': subscription_tier
            }
        return None
    finally:
        cursor.close()
        conn.close()

# ========================================
# AUDIT LOGGING
# ========================================

def log_action(user_id: Any, organization_id: Any, action: str,
              entity_type: Optional[str] = None, entity_id: Optional[Any] = None,
              ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> bool:
    """Log an action to audit trail"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        log_id = str(uuid.uuid4())
        user_id_str = str(user_id) if user_id else None
        org_id_str = str(organization_id) if organization_id else None
        entity_id_str = str(entity_id) if entity_id else None
        
        cursor.execute("""
            INSERT INTO audit_logs (
                id, user_id, company_id, action, entity_type, entity_id,
                ip_address, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """, (log_id, user_id_str, org_id_str, action, entity_type, 
              entity_id_str, ip_address))
        
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("✅ PostgreSQL authentication database adapter loaded")
    print(f"🔗 Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'configured'}")
