"""
ARIA v2.0 - Database Helper Functions
CRUD operations for all database tables
"""

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
import json

DATABASE_PATH = Path(__file__).parent / "aria_production.db"

def get_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Enable dict-like access
    return conn

# ========================================
# USER MANAGEMENT
# ========================================

def create_user(email: str, hashed_password: str, full_name: str, organization_id: Optional[int] = None) -> Dict:
    """Create a new user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO users (email, hashed_password, full_name, organization_id)
            VALUES (?, ?, ?, ?)
        """, (email, hashed_password, full_name, organization_id))
        
        user_id = cursor.lastrowid
        conn.commit()
        
        return get_user_by_id(user_id)
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

def get_user_by_id(user_id: int) -> Optional[Dict]:
    """Get user by ID"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

def update_last_login(user_id: int):
    """Update user's last login timestamp"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = ?
    """, (user_id,))
    
    conn.commit()
    conn.close()

def create_organization(name: str, subscription_tier: str = 'free') -> Dict:
    """Create a new organization"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO organizations (name, subscription_tier)
        VALUES (?, ?)
    """, (name, subscription_tier))
    
    org_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": org_id, "name": name, "subscription_tier": subscription_tier}

# ========================================
# SESSION MANAGEMENT
# ========================================

def create_session(user_id: int, access_token: str, refresh_token: str, 
                  expires_at: datetime, ip_address: str = None, user_agent: str = None):
    """Create user session"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO user_sessions 
        (user_id, access_token, refresh_token, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, access_token, refresh_token, expires_at.isoformat(), ip_address, user_agent))
    
    conn.commit()
    conn.close()

def get_session_by_token(access_token: str) -> Optional[Dict]:
    """Get session by access token"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM user_sessions 
        WHERE access_token = ? AND is_active = 1
    """, (access_token,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

def invalidate_session(access_token: str):
    """Invalidate a session (logout)"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE user_sessions 
        SET is_active = 0 
        WHERE access_token = ?
    """, (access_token,))
    
    conn.commit()
    conn.close()

# ========================================
# BOT EXECUTION
# ========================================

def create_bot_execution(user_id: int, organization_id: Optional[int], 
                        bot_id: str, bot_name: str, input_data: Dict, 
                        output_data: Dict, status: str = 'success', 
                        execution_time_ms: int = 0, error_message: str = None) -> int:
    """Save bot execution to history"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO bot_executions 
        (user_id, organization_id, bot_id, bot_name, input_data, output_data, 
         status, execution_time_ms, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, organization_id, bot_id, bot_name, 
          json.dumps(input_data), json.dumps(output_data), 
          status, execution_time_ms, error_message))
    
    execution_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return execution_id

def get_bot_executions(user_id: int, limit: int = 50) -> List[Dict]:
    """Get bot execution history for user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM bot_executions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    """, (user_id, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def get_bot_execution_stats(user_id: int) -> Dict:
    """Get bot execution statistics"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total_executions,
            COUNT(DISTINCT bot_id) as unique_bots,
            AVG(execution_time_ms) as avg_execution_time,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed
        FROM bot_executions 
        WHERE user_id = ?
    """, (user_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    return dict(row) if row else {}

# ========================================
# MANUFACTURING MODULE
# ========================================

def create_bom(organization_id: int, product_name: str, product_code: str,
               version: str, items: List[Dict], created_by: int) -> int:
    """Create Bill of Materials"""
    conn = get_connection()
    cursor = conn.cursor()
    
    total_cost = sum(item.get('cost', 0) * item.get('quantity', 0) for item in items)
    
    cursor.execute("""
        INSERT INTO manufacturing_boms 
        (organization_id, product_name, product_code, version, items, total_cost, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (organization_id, product_name, product_code, version, 
          json.dumps(items), total_cost, created_by))
    
    bom_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return bom_id

def get_boms(organization_id: int) -> List[Dict]:
    """Get all BOMs for organization"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM manufacturing_boms 
        WHERE organization_id = ? 
        ORDER BY created_at DESC
    """, (organization_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for row in rows:
        bom = dict(row)
        bom['items'] = json.loads(bom['items'])
        result.append(bom)
    
    return result

def create_work_order(organization_id: int, order_number: str, product_name: str,
                     quantity: int, created_by: int, **kwargs) -> int:
    """Create work order"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO manufacturing_work_orders 
        (organization_id, order_number, product_name, quantity, created_by,
         bom_id, status, priority, start_date, due_date, assigned_to, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (organization_id, order_number, product_name, quantity, created_by,
          kwargs.get('bom_id'), kwargs.get('status', 'planned'),
          kwargs.get('priority', 'medium'), kwargs.get('start_date'),
          kwargs.get('due_date'), kwargs.get('assigned_to'), kwargs.get('notes')))
    
    wo_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return wo_id

def get_work_orders(organization_id: int) -> List[Dict]:
    """Get all work orders for organization"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM manufacturing_work_orders 
        WHERE organization_id = ? 
        ORDER BY created_at DESC
    """, (organization_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

# ========================================
# QUALITY MANAGEMENT
# ========================================

def create_quality_inspection(organization_id: int, inspection_number: str,
                              product_name: str, inspection_type: str, **kwargs) -> int:
    """Create quality inspection"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO quality_inspections 
        (organization_id, inspection_number, product_name, inspection_type,
         batch_number, inspector_id, inspection_date, status, result, defects_found, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (organization_id, inspection_number, product_name, inspection_type,
          kwargs.get('batch_number'), kwargs.get('inspector_id'),
          kwargs.get('inspection_date'), kwargs.get('status', 'pending'),
          kwargs.get('result'), kwargs.get('defects_found', 0), kwargs.get('notes')))
    
    inspection_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return inspection_id

def get_quality_inspections(organization_id: int) -> List[Dict]:
    """Get all quality inspections"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM quality_inspections 
        WHERE organization_id = ? 
        ORDER BY created_at DESC
    """, (organization_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

# ========================================
# AUDIT LOG
# ========================================

def log_action(user_id: int, organization_id: int, action: str, 
               entity_type: str = None, entity_id: int = None, 
               changes: Dict = None, ip_address: str = None, user_agent: str = None):
    """Log user action for audit trail"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO audit_log 
        (user_id, organization_id, action, entity_type, entity_id, changes, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, organization_id, action, entity_type, entity_id,
          json.dumps(changes) if changes else None, ip_address, user_agent))
    
    conn.commit()
    conn.close()

# ========================================
# SUBSCRIPTION & BILLING
# ========================================

def create_subscription(organization_id: int, tier: str, amount: float, 
                       start_date: datetime, **kwargs) -> int:
    """Create subscription"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO subscriptions 
        (organization_id, tier, status, start_date, amount, currency,
         stripe_subscription_id, payfast_subscription_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (organization_id, tier, kwargs.get('status', 'active'),
          start_date.isoformat(), amount, kwargs.get('currency', 'ZAR'),
          kwargs.get('stripe_subscription_id'), kwargs.get('payfast_subscription_id')))
    
    subscription_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return subscription_id

def create_payment(organization_id: int, subscription_id: int, amount: float,
                  payment_method: str, **kwargs) -> int:
    """Record payment"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO payments 
        (organization_id, subscription_id, amount, currency, payment_method,
         stripe_payment_id, payfast_payment_id, status, payment_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (organization_id, subscription_id, amount, kwargs.get('currency', 'ZAR'),
          payment_method, kwargs.get('stripe_payment_id'), 
          kwargs.get('payfast_payment_id'), kwargs.get('status', 'success'),
          datetime.now().isoformat()))
    
    payment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return payment_id

if __name__ == "__main__":
    print("✅ Database helper functions loaded")
    print(f"📁 Database: {DATABASE_PATH}")
