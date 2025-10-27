"""
ARIA v2.0 - Complete Database Schema
Production-ready SQLite database with all tables
"""

import sqlite3
from datetime import datetime
import json
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "aria_production.db"

def create_database():
    """Create all database tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # ========================================
    # USER MANAGEMENT
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            organization_id INTEGER,
            role TEXT DEFAULT 'user',
            subscription_tier TEXT DEFAULT 'free',
            is_active BOOLEAN DEFAULT 1,
            is_verified BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            subscription_tier TEXT DEFAULT 'free',
            max_users INTEGER DEFAULT 3,
            max_bots INTEGER DEFAULT 5,
            stripe_customer_id TEXT,
            payfast_token TEXT,
            billing_email TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reset_token TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # BOT EXECUTION & HISTORY
    # ========================================
    
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
            execution_time_ms INTEGER,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bot_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            bot_id TEXT NOT NULL,
            schedule_type TEXT NOT NULL,
            schedule_config TEXT,
            is_active BOOLEAN DEFAULT 1,
            last_run TIMESTAMP,
            next_run TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # MANUFACTURING MODULE
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS manufacturing_boms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            product_code TEXT,
            version TEXT DEFAULT '1.0',
            items TEXT NOT NULL,
            total_cost REAL,
            status TEXT DEFAULT 'active',
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS manufacturing_work_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            order_number TEXT UNIQUE NOT NULL,
            bom_id INTEGER,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT DEFAULT 'planned',
            priority TEXT DEFAULT 'medium',
            start_date TIMESTAMP,
            due_date TIMESTAMP,
            completed_date TIMESTAMP,
            assigned_to INTEGER,
            notes TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS manufacturing_production_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            plan_name TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            work_orders TEXT,
            status TEXT DEFAULT 'draft',
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # QUALITY MANAGEMENT
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS quality_inspections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            inspection_number TEXT UNIQUE NOT NULL,
            product_name TEXT NOT NULL,
            batch_number TEXT,
            inspection_type TEXT NOT NULL,
            inspector_id INTEGER,
            inspection_date TIMESTAMP,
            status TEXT DEFAULT 'pending',
            result TEXT,
            defects_found INTEGER DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (inspector_id) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS quality_ncr (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            ncr_number TEXT UNIQUE NOT NULL,
            inspection_id INTEGER,
            description TEXT NOT NULL,
            severity TEXT DEFAULT 'medium',
            root_cause TEXT,
            corrective_action TEXT,
            status TEXT DEFAULT 'open',
            assigned_to INTEGER,
            due_date DATE,
            closed_date TIMESTAMP,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (inspection_id) REFERENCES quality_inspections(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS quality_capa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            capa_number TEXT UNIQUE NOT NULL,
            ncr_id INTEGER,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            action_plan TEXT,
            status TEXT DEFAULT 'open',
            assigned_to INTEGER,
            due_date DATE,
            completed_date TIMESTAMP,
            verification TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (ncr_id) REFERENCES quality_ncr(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # MAINTENANCE MODULE
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance_assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            asset_number TEXT UNIQUE NOT NULL,
            asset_name TEXT NOT NULL,
            asset_type TEXT,
            location TEXT,
            manufacturer TEXT,
            model TEXT,
            serial_number TEXT,
            purchase_date DATE,
            purchase_cost REAL,
            status TEXT DEFAULT 'operational',
            maintenance_schedule TEXT,
            last_maintenance_date DATE,
            next_maintenance_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance_work_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            work_order_number TEXT UNIQUE NOT NULL,
            asset_id INTEGER NOT NULL,
            work_type TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            description TEXT,
            assigned_to INTEGER,
            status TEXT DEFAULT 'open',
            scheduled_date DATE,
            completed_date TIMESTAMP,
            labor_hours REAL,
            parts_cost REAL,
            notes TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (asset_id) REFERENCES maintenance_assets(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # PROCUREMENT MODULE
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS procurement_rfqs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            rfq_number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            items TEXT NOT NULL,
            due_date DATE,
            status TEXT DEFAULT 'draft',
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS procurement_quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rfq_id INTEGER NOT NULL,
            supplier_name TEXT NOT NULL,
            total_amount REAL NOT NULL,
            currency TEXT DEFAULT 'ZAR',
            valid_until DATE,
            quote_data TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (rfq_id) REFERENCES procurement_rfqs(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS procurement_purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            po_number TEXT UNIQUE NOT NULL,
            rfq_id INTEGER,
            quote_id INTEGER,
            supplier_name TEXT NOT NULL,
            items TEXT NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            order_date DATE,
            expected_delivery DATE,
            actual_delivery DATE,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (rfq_id) REFERENCES procurement_rfqs(id),
            FOREIGN KEY (quote_id) REFERENCES procurement_quotes(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # FINANCIAL MODULE
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS financial_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            transaction_date DATE NOT NULL,
            transaction_type TEXT NOT NULL,
            account TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'ZAR',
            description TEXT,
            reference TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS financial_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            invoice_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            invoice_date DATE NOT NULL,
            due_date DATE NOT NULL,
            items TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax REAL DEFAULT 0,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_date DATE,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # HR MODULE
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hr_employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            employee_number TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            position TEXT,
            department TEXT,
            manager_id INTEGER,
            hire_date DATE,
            employment_status TEXT DEFAULT 'active',
            salary REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (manager_id) REFERENCES hr_employees(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hr_leave_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            leave_type TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days INTEGER NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            approved_by INTEGER,
            approved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
            FOREIGN KEY (approved_by) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # CRM MODULE
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crm_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            company TEXT,
            position TEXT,
            lead_source TEXT,
            status TEXT DEFAULT 'lead',
            assigned_to INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crm_opportunities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            contact_id INTEGER NOT NULL,
            opportunity_name TEXT NOT NULL,
            value REAL NOT NULL,
            stage TEXT DEFAULT 'qualification',
            probability INTEGER DEFAULT 50,
            expected_close_date DATE,
            actual_close_date DATE,
            status TEXT DEFAULT 'open',
            assigned_to INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id)
        )
    """)
    
    # ========================================
    # SUBSCRIPTIONS & BILLING
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            tier TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            stripe_subscription_id TEXT,
            payfast_subscription_id TEXT,
            start_date DATE NOT NULL,
            end_date DATE,
            auto_renew BOOLEAN DEFAULT 1,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'ZAR',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            subscription_id INTEGER,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'ZAR',
            payment_method TEXT NOT NULL,
            stripe_payment_id TEXT,
            payfast_payment_id TEXT,
            status TEXT DEFAULT 'pending',
            payment_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id),
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
        )
    """)
    
    # ========================================
    # AUDIT LOG
    # ========================================
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            organization_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            changes TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )
    """)
    
    # Create indexes for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bot_executions_user ON bot_executions(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bot_executions_org ON bot_executions(organization_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_boms_org ON manufacturing_boms(organization_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_work_orders_org ON manufacturing_work_orders(organization_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_inspections_org ON quality_inspections(organization_id)")
    
    conn.commit()
    conn.close()
    
    print(f"✅ Database created successfully at: {DATABASE_PATH}")
    print("✅ All tables created")
    print("✅ All indexes created")
    print("\nDatabase ready for production use!")

if __name__ == "__main__":
    create_database()
