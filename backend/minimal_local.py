#!/usr/bin/env python3
"""
Minimal ARIA FastAPI Application - Local Development
Zero extra dependencies - just the basics to get you started
"""
import os
import sys
from pathlib import Path
import hashlib

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import secrets

# Database URL (SQLite for local dev)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aria_erp.db")
SECRET_KEY = os.getenv("SECRET_KEY", "local-dev-secret-key-change-in-production")

# Simple password hashing
def hash_password(password: str) -> str:
    salt = "aria_erp_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

# Database setup
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create FastAPI app
app = FastAPI(
    title="ARIA ERP - Local Development",
    description="Minimal API for local development",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str = ""
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_superuser: bool

# Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ARIA ERP API - Local Development",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected"
    }

# Add OPTIONS handler for CORS preflight
@app.options("/auth/login")
@app.options("/api/v1/auth/login")
async def options_handler():
    return {"message": "OK"}

@app.post("/auth/login", response_model=LoginResponse)
@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint"""
    try:
        # Accept both username and email
        username = credentials.username or credentials.email
        if not username:
            raise HTTPException(status_code=422, detail="Username or email is required")
        
        # Query user by username or email
        result = db.execute(
            text("SELECT * FROM users WHERE username = :username OR email = :username"),
            {"username": username}
        )
        user = result.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password (column index depends on table structure)
        # Assuming: id, username, email, hashed_password, is_active, is_superuser
        hashed_password = user[3] if len(user) > 3 else user.hashed_password
        
        if not verify_password(credentials.password, hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate tokens (simple version)
        access_token = secrets.token_urlsafe(32)
        refresh_token = secrets.token_urlsafe(32)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user[0] if isinstance(user, tuple) else user.id,
                "username": user[1] if isinstance(user, tuple) else user.username,
                "email": user[2] if isinstance(user, tuple) else user.email,
                "is_superuser": user[5] if len(user) > 5 else False
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add OPTIONS handlers for CORS preflight
@app.options("/auth/me")
@app.options("/api/v1/users/me")
async def options_me_handler():
    return {"message": "OK"}

@app.get("/auth/me")
@app.get("/api/v1/users/me")
async def get_current_user(db: Session = Depends(get_db)):
    """Get current user (simplified - no JWT validation)"""
    result = db.execute(text("SELECT * FROM users WHERE username = 'admin'"))
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user[0] if isinstance(user, tuple) else user.id,
        "username": user[1] if isinstance(user, tuple) else user.username,
        "email": user[2] if isinstance(user, tuple) else user.email,
        "is_active": user[4] if len(user) > 4 else True,
        "is_superuser": user[5] if len(user) > 5 else False
    }

@app.get("/api/v1/dashboard")
async def get_dashboard():
    """Dashboard summary"""
    return {
        "totalDocuments": 0,
        "pendingApprovals": 0,
        "recentActivity": [],
        "stats": {
            "documents": 0,
            "users": 1,
            "storage": "0 MB"
        }
    }

@app.get("/menu/structure")
@app.get("/api/v1/menu/structure")
async def get_menu_structure():
    """Menu structure for navigation"""
    return {
        "finance": [
            {
                "title": "Accounts Payable",
                "icon": "Wallet",
                "color": "#10b981",
                "items": [
                    {"label": "Vendor Invoices", "path": "/finance/ap/invoices"},
                    {"label": "Payments", "path": "/finance/ap/payments"},
                    {"label": "Vendors", "path": "/finance/ap/vendors"}
                ]
            },
            {
                "title": "Accounts Receivable",
                "icon": "FileDown",
                "color": "#3b82f6",
                "items": [
                    {"label": "Customer Invoices", "path": "/finance/ar/invoices"},
                    {"label": "Collections", "path": "/finance/ar/collections"},
                    {"label": "Customers", "path": "/finance/ar/customers"}
                ]
            }
        ],
        "crm": [
            {
                "title": "Sales",
                "icon": "ShoppingBag",
                "color": "#8b5cf6",
                "items": [
                    {"label": "Opportunities", "path": "/crm/opportunities"},
                    {"label": "Quotes", "path": "/crm/quotes"},
                    {"label": "Contacts", "path": "/crm/contacts"}
                ]
            }
        ],
        "hr": [
            {
                "title": "Employee Management",
                "icon": "Users",
                "color": "#f59e0b",
                "items": [
                    {"label": "Employees", "path": "/hr/employees"},
                    {"label": "Leave Management", "path": "/hr/leave"},
                    {"label": "Payroll", "path": "/hr/payroll"}
                ]
            }
        ],
        "inventory": [
            {
                "title": "Stock Management",
                "icon": "Package",
                "color": "#06b6d4",
                "items": [
                    {"label": "Products", "path": "/inventory/products"},
                    {"label": "Stock Levels", "path": "/inventory/stock"},
                    {"label": "Warehouses", "path": "/inventory/warehouses"}
                ]
            }
        ]
    }

@app.get("/agents")
@app.get("/api/v1/agents")
async def get_agents():
    """Get AI agents/bots"""
    return {
        "agents": [
            {"id": 1, "name": "Invoice Bot", "status": "active", "tasks_completed": 150},
            {"id": 2, "name": "Leave Bot", "status": "active", "tasks_completed": 89},
            {"id": 3, "name": "Expense Bot", "status": "active", "tasks_completed": 203}
        ],
        "total": 3
    }

@app.get("/dashboard/executive")
@app.get("/api/v1/dashboard/executive")
async def get_executive_dashboard():
    """Executive dashboard data"""
    return {
        "revenue": {"current": 1250000, "previous": 980000, "growth": 27.5},
        "expenses": {"current": 850000, "previous": 720000, "growth": 18.1},
        "profit": {"current": 400000, "previous": 260000, "growth": 53.8},
        "customers": {"total": 156, "active": 142, "new": 23},
        "projects": {"total": 45, "completed": 32, "inProgress": 13},
        "topPerformers": [
            {"name": "Sales Team", "metric": "R2.5M Revenue", "change": "+35%"},
            {"name": "Operations", "metric": "98% Efficiency", "change": "+5%"}
        ],
        "recentActivity": [
            {"type": "invoice", "description": "Invoice #1234 approved", "timestamp": "2026-02-22T10:30:00Z"},
            {"type": "payment", "description": "Payment received R50,000", "timestamp": "2026-02-22T09:15:00Z"}
        ]
    }

@app.get("/erp/order-to-cash/products")
@app.get("/api/v1/erp/order-to-cash/products")
async def get_products():
    """Get inventory products"""
    return {
        "products": [
            {
                "id": 1,
                "sku": "PROD-001",
                "name": "Office Chair Premium",
                "category": "Furniture",
                "quantity": 45,
                "unit": "pcs",
                "location": "Warehouse A",
                "reorderLevel": 10,
                "unitPrice": 2500.00,
                "status": "In Stock"
            },
            {
                "id": 2,
                "sku": "PROD-002",
                "name": "Desk Lamp LED",
                "category": "Electronics",
                "quantity": 120,
                "unit": "pcs",
                "location": "Warehouse B",
                "reorderLevel": 20,
                "unitPrice": 450.00,
                "status": "In Stock"
            },
            {
                "id": 3,
                "sku": "PROD-003",
                "name": "Standing Desk",
                "category": "Furniture",
                "quantity": 8,
                "unit": "pcs",
                "location": "Warehouse A",
                "reorderLevel": 5,
                "unitPrice": 7800.00,
                "status": "Low Stock"
            }
        ],
        "total": 3,
        "page": 1,
        "pageSize": 50
    }

@app.get("/hr/employees")
@app.get("/api/v1/hr/employees")
async def get_employees():
    """Get HR employees"""
    return {
        "employees": [
            {
                "id": 1,
                "employeeId": "EMP001",
                "firstName": "Sarah",
                "lastName": "Johnson",
                "email": "sarah.johnson@aria.local",
                "department": "Sales",
                "position": "Sales Manager",
                "hireDate": "2024-01-15",
                "status": "Active",
                "salary": 75000.00,
                "manager": "John Doe"
            },
            {
                "id": 2,
                "employeeId": "EMP002",
                "firstName": "Michael",
                "lastName": "Chen",
                "email": "michael.chen@aria.local",
                "department": "IT",
                "position": "Software Engineer",
                "hireDate": "2023-06-01",
                "status": "Active",
                "salary": 85000.00,
                "manager": "Jane Smith"
            },
            {
                "id": 3,
                "employeeId": "EMP003",
                "firstName": "Emily",
                "lastName": "Brown",
                "email": "emily.brown@aria.local",
                "department": "Finance",
                "position": "Accountant",
                "hireDate": "2024-03-20",
                "status": "Active",
                "salary": 65000.00,
                "manager": "Robert Lee"
            }
        ],
        "total": 3,
        "page": 1,
        "pageSize": 50
    }

# ============================================
# HR - LEAVE MANAGEMENT
# ============================================

@app.get("/hr/leave-requests")
@app.get("/api/hr/leave-requests")
@app.get("/api/v1/hr/leave-requests")
async def get_leave_requests():
    """Get employee leave requests"""
    return {
        "leave_requests": [
            {
                "id": "LV-001",
                "employee_name": "Thabo Mbeki",
                "employee_id": "EMP-001",
                "leave_type": "Annual Leave",
                "start_date": "2026-03-10",
                "end_date": "2026-03-17",
                "days": 6,
                "status": "pending",
                "reason": "Family holiday to Garden Route",
                "applied_date": "2026-02-15",
                "approver": "Sarah Naidoo"
            },
            {
                "id": "LV-002",
                "employee_name": "Zanele Ngcobo",
                "employee_id": "EMP-002",
                "leave_type": "Sick Leave",
                "start_date": "2026-02-20",
                "end_date": "2026-02-21",
                "days": 2,
                "status": "approved",
                "reason": "Medical appointment",
                "applied_date": "2026-02-19",
                "approver": "David Coetzee",
                "approved_date": "2026-02-19"
            },
            {
                "id": "LV-003",
                "employee_name": "Johan Pretorius",
                "employee_id": "EMP-003",
                "leave_type": "Annual Leave",
                "start_date": "2026-04-15",
                "end_date": "2026-04-25",
                "days": 9,
                "status": "approved",
                "reason": "Vacation to Kruger National Park",
                "applied_date": "2026-02-10",
                "approver": "Linda Botha",
                "approved_date": "2026-02-11"
            },
            {
                "id": "LV-004",
                "employee_name": "Sipho Khumalo",
                "employee_id": "EMP-004",
                "leave_type": "Family Responsibility",
                "start_date": "2026-03-05",
                "end_date": "2026-03-05",
                "days": 1,
                "status": "pending",
                "reason": "Child's school event",
                "applied_date": "2026-02-22",
                "approver": "Sarah Naidoo"
            },
            {
                "id": "LV-005",
                "employee_name": "Linda Botha",
                "employee_id": "EMP-005",
                "leave_type": "Maternity Leave",
                "start_date": "2026-05-01",
                "end_date": "2026-08-31",
                "days": 122,
                "status": "approved",
                "reason": "Maternity leave",
                "applied_date": "2026-01-15",
                "approver": "David Coetzee",
                "approved_date": "2026-01-16"
            },
            {
                "id": "LV-006",
                "employee_name": "Mandla Dlamini",
                "employee_id": "EMP-006",
                "leave_type": "Annual Leave",
                "start_date": "2026-02-28",
                "end_date": "2026-03-02",
                "days": 2,
                "status": "rejected",
                "reason": "Long weekend break",
                "applied_date": "2026-02-20",
                "approver": "Sarah Naidoo",
                "rejected_date": "2026-02-21",
                "rejection_reason": "Insufficient coverage during critical period"
            },
            {
                "id": "LV-007",
                "employee_name": "David Coetzee",
                "employee_id": "EMP-007",
                "leave_type": "Study Leave",
                "start_date": "2026-06-01",
                "end_date": "2026-06-05",
                "days": 5,
                "status": "pending",
                "reason": "Professional certification exam",
                "applied_date": "2026-02-18",
                "approver": "Linda Botha"
            }
        ],
        "total": 7
    }

@app.post("/hr/leave-requests")
@app.post("/api/hr/leave-requests")
@app.post("/api/v1/hr/leave-requests")
async def create_leave_request(data: dict):
    """Create new leave request"""
    return {
        "id": f"LV-{str(datetime.now().timestamp())[-3:]}",
        "status": "pending",
        "applied_date": datetime.now().strftime("%Y-%m-%d"),
        "message": "Leave request submitted successfully",
        **data
    }

@app.put("/hr/leave-requests/{leave_id}/approve")
@app.put("/api/hr/leave-requests/{leave_id}/approve")
async def approve_leave_request(leave_id: str):
    """Approve leave request"""
    return {
        "id": leave_id,
        "status": "approved",
        "approved_date": datetime.now().strftime("%Y-%m-%d"),
        "message": "Leave request approved"
    }

@app.put("/hr/leave-requests/{leave_id}/reject")
@app.put("/api/hr/leave-requests/{leave_id}/reject")
async def reject_leave_request(leave_id: str, data: dict):
    """Reject leave request"""
    return {
        "id": leave_id,
        "status": "rejected",
        "rejected_date": datetime.now().strftime("%Y-%m-%d"),
        "rejection_reason": data.get("reason", "Not specified"),
        "message": "Leave request rejected"
    }

# ============================================
# INVENTORY - WAREHOUSES
# ============================================

@app.get("/inventory/warehouses")
@app.get("/api/inventory/warehouses")
@app.get("/api/v1/inventory/warehouses")
async def get_warehouses():
    """Get warehouse locations"""
    return {
        "warehouses": [
            {
                "id": "WH-001",
                "code": "JHB-MAIN",
                "name": "Johannesburg Main Warehouse",
                "location": "Midrand, Gauteng",
                "address": "123 Gallagher Estate, Midrand, 1685",
                "capacity": 5000,
                "current_stock": 3450,
                "manager": "Thabo Mbeki",
                "phone": "+27 11 805 4000",
                "status": "active",
                "type": "distribution"
            },
            {
                "id": "WH-002",
                "code": "CPT-MAIN",
                "name": "Cape Town Regional Warehouse",
                "location": "Bellville, Western Cape",
                "address": "45 Willie van Schoor Drive, Bellville, 7530",
                "capacity": 3500,
                "current_stock": 2890,
                "manager": "Zanele Ngcobo",
                "phone": "+27 21 948 7000",
                "status": "active",
                "type": "distribution"
            },
            {
                "id": "WH-003",
                "code": "DBN-MAIN",
                "name": "Durban Port Warehouse",
                "location": "Durban, KwaZulu-Natal",
                "address": "78 Bayhead Road, Durban, 4001",
                "capacity": 4000,
                "current_stock": 3200,
                "manager": "Sipho Khumalo",
                "phone": "+27 31 361 0000",
                "status": "active",
                "type": "port"
            },
            {
                "id": "WH-004",
                "code": "PTA-SAT",
                "name": "Pretoria Satellite Depot",
                "location": "Centurion, Gauteng",
                "address": "12 Lyttelton Road, Centurion, 0157",
                "capacity": 1500,
                "current_stock": 980,
                "manager": "Linda Botha",
                "phone": "+27 12 683 0000",
                "status": "active",
                "type": "satellite"
            },
            {
                "id": "WH-005",
                "code": "PE-MAIN",
                "name": "Port Elizabeth Warehouse",
                "location": "Port Elizabeth, Eastern Cape",
                "address": "56 Newton Park Drive, PE, 6045",
                "capacity": 2500,
                "current_stock": 1750,
                "manager": "David Coetzee",
                "phone": "+27 41 365 0000",
                "status": "active",
                "type": "distribution"
            },
            {
                "id": "WH-006",
                "code": "JHB-COLD",
                "name": "Johannesburg Cold Storage",
                "location": "Germiston, Gauteng",
                "address": "89 Industrial Road, Germiston, 1401",
                "capacity": 800,
                "current_stock": 650,
                "manager": "Johan Pretorius",
                "phone": "+27 11 873 0000",
                "status": "active",
                "type": "cold_storage"
            },
            {
                "id": "WH-007",
                "code": "BFN-REG",
                "name": "Bloemfontein Regional Hub",
                "location": "Bloemfontein, Free State",
                "address": "23 Bayswater Drive, Bloemfontein, 9301",
                "capacity": 2000,
                "current_stock": 1450,
                "manager": "Mandla Dlamini",
                "phone": "+27 51 430 0000",
                "status": "active",
                "type": "distribution"
            },
            {
                "id": "WH-008",
                "code": "NEL-SAT",
                "name": "Nelspruit Satellite",
                "location": "Mbombela, Mpumalanga",
                "address": "67 Ferreira Street, Nelspruit, 1200",
                "capacity": 1000,
                "current_stock": 450,
                "manager": "Sarah Naidoo",
                "phone": "+27 13 755 0000",
                "status": "maintenance",
                "type": "satellite"
            }
        ],
        "total": 8,
        "summary": {
            "total_capacity": 20300,
            "total_stock": 14820,
            "utilization_percentage": 73.0,
            "active_warehouses": 7,
            "maintenance_warehouses": 1
        }
    }

@app.get("/inventory/warehouses/{warehouse_id}")
@app.get("/api/inventory/warehouses/{warehouse_id}")
async def get_warehouse_details(warehouse_id: str):
    """Get detailed warehouse information"""
    return {
        "id": warehouse_id,
        "code": "JHB-MAIN",
        "name": "Johannesburg Main Warehouse",
        "location": "Midrand, Gauteng",
        "address": "123 Gallagher Estate, Midrand, 1685",
        "capacity": 5000,
        "current_stock": 3450,
        "manager": "Thabo Mbeki",
        "phone": "+27 11 805 4000",
        "status": "active",
        "type": "distribution",
        "zones": [
            {"name": "Zone A", "capacity": 1500, "stock": 1200},
            {"name": "Zone B", "capacity": 2000, "stock": 1450},
            {"name": "Zone C", "capacity": 1500, "stock": 800}
        ]
    }

@app.post("/inventory/warehouses")
@app.post("/api/inventory/warehouses")
async def create_warehouse(data: dict):
    """Create new warehouse"""
    return {
        "id": f"WH-{str(datetime.now().timestamp())[-3:]}",
        "code": data.get("code", "NEW-WH"),
        "status": "active",
        "message": "Warehouse created successfully",
        **data
    }

@app.put("/inventory/warehouses/{warehouse_id}")
@app.put("/api/inventory/warehouses/{warehouse_id}")
async def update_warehouse(warehouse_id: str, data: dict):
    """Update warehouse information"""
    return {
        "id": warehouse_id,
        "message": "Warehouse updated successfully",
        **data
    }

@app.delete("/inventory/warehouses/{warehouse_id}")
@app.delete("/api/inventory/warehouses/{warehouse_id}")
async def delete_warehouse(warehouse_id: str):
    """Delete warehouse"""
    return {"message": "Warehouse deleted successfully"}

# ============================================
# INVENTORY - STOCK ON HAND
# ============================================

@app.get("/inventory/stock-on-hand")
@app.get("/api/inventory/stock-on-hand")
@app.get("/erp/order-to-cash/stock-on-hand")
@app.get("/api/erp/order-to-cash/stock-on-hand")
async def get_stock_on_hand(warehouse_id: str = None):
    """Get current stock on hand by product and warehouse"""
    stock_items = [
        {
            "id": "STK-001",
            "product_code": "PRD-1001",
            "product_name": "Dell Latitude 7430 Laptop",
            "warehouse": "JHB-MAIN",
            "warehouse_name": "Johannesburg Main Warehouse",
            "quantity": 45,
            "reserved": 12,
            "available": 33,
            "unit_cost": 18500.00,
            "total_value": 832500.00,
            "reorder_level": 20,
            "status": "In Stock"
        },
        {
            "id": "STK-002",
            "product_code": "PRD-1002",
            "product_name": "HP EliteDesk 800 Desktop",
            "warehouse": "JHB-MAIN",
            "warehouse_name": "Johannesburg Main Warehouse",
            "quantity": 28,
            "reserved": 5,
            "available": 23,
            "unit_cost": 12000.00,
            "total_value": 336000.00,
            "reorder_level": 15,
            "status": "In Stock"
        },
        {
            "id": "STK-003",
            "product_code": "PRD-1003",
            "product_name": "Samsung 27'' Monitor",
            "warehouse": "CPT-MAIN",
            "warehouse_name": "Cape Town Regional Warehouse",
            "quantity": 120,
            "reserved": 30,
            "available": 90,
            "unit_cost": 3500.00,
            "total_value": 420000.00,
            "reorder_level": 50,
            "status": "In Stock"
        },
        {
            "id": "STK-004",
            "product_code": "PRD-1004",
            "product_name": "Logitech MX Keys Keyboard",
            "warehouse": "JHB-MAIN",
            "warehouse_name": "Johannesburg Main Warehouse",
            "quantity": 8,
            "reserved": 2,
            "available": 6,
            "unit_cost": 1850.00,
            "total_value": 14800.00,
            "reorder_level": 25,
            "status": "Low Stock"
        },
        {
            "id": "STK-005",
            "product_code": "PRD-1005",
            "product_name": "Cisco Catalyst 2960 Switch",
            "warehouse": "DBN-MAIN",
            "warehouse_name": "Durban Port Warehouse",
            "quantity": 15,
            "reserved": 3,
            "available": 12,
            "unit_cost": 8500.00,
            "total_value": 127500.00,
            "reorder_level": 10,
            "status": "In Stock"
        },
        {
            "id": "STK-006",
            "product_code": "PRD-1006",
            "product_name": "Microsoft Surface Pro 9",
            "warehouse": "CPT-MAIN",
            "warehouse_name": "Cape Town Regional Warehouse",
            "quantity": 32,
            "reserved": 8,
            "available": 24,
            "unit_cost": 22000.00,
            "total_value": 704000.00,
            "reorder_level": 15,
            "status": "In Stock"
        },
        {
            "id": "STK-007",
            "product_code": "PRD-1007",
            "product_name": "Ergonomic Office Chair",
            "warehouse": "JHB-MAIN",
            "warehouse_name": "Johannesburg Main Warehouse",
            "quantity": 65,
            "reserved": 18,
            "available": 47,
            "unit_cost": 2800.00,
            "total_value": 182000.00,
            "reorder_level": 30,
            "status": "In Stock"
        },
        {
            "id": "STK-008",
            "product_code": "PRD-1008",
            "product_name": "iPhone 15 Pro",
            "warehouse": "CPT-MAIN",
            "warehouse_name": "Cape Town Regional Warehouse",
            "quantity": 0,
            "reserved": 0,
            "available": 0,
            "unit_cost": 25000.00,
            "total_value": 0.00,
            "reorder_level": 20,
            "status": "Out of Stock"
        },
        {
            "id": "STK-009",
            "product_code": "PRD-1009",
            "product_name": "Canon ImageRunner Printer",
            "warehouse": "DBN-MAIN",
            "warehouse_name": "Durban Port Warehouse",
            "quantity": 12,
            "reserved": 4,
            "available": 8,
            "unit_cost": 15000.00,
            "total_value": 180000.00,
            "reorder_level": 8,
            "status": "In Stock"
        },
        {
            "id": "STK-010",
            "product_code": "PRD-1010",
            "product_name": "Standing Desk Electric",
            "warehouse": "PTA-SAT",
            "warehouse_name": "Pretoria Satellite Depot",
            "quantity": 18,
            "reserved": 6,
            "available": 12,
            "unit_cost": 5500.00,
            "total_value": 99000.00,
            "reorder_level": 10,
            "status": "In Stock"
        }
    ]
    
    # Filter by warehouse if provided
    if warehouse_id:
        stock_items = [item for item in stock_items if item["warehouse"] == warehouse_id]
    
    return {
        "data": stock_items,
        "total": len(stock_items),
        "summary": {
            "total_items": len(stock_items),
            "total_value": sum(item["total_value"] for item in stock_items),
            "low_stock_items": len([item for item in stock_items if item["status"] == "Low Stock"]),
            "out_of_stock_items": len([item for item in stock_items if item["status"] == "Out of Stock"])
        }
    }

@app.get("/erp/order-to-cash/warehouses")
@app.get("/api/erp/order-to-cash/warehouses")
async def get_order_to_cash_warehouses():
    """Get warehouses for order-to-cash module"""
    return {
        "data": [
            {"id": "JHB-MAIN", "name": "Johannesburg Main Warehouse"},
            {"id": "CPT-MAIN", "name": "Cape Town Regional Warehouse"},
            {"id": "DBN-MAIN", "name": "Durban Port Warehouse"},
            {"id": "PTA-SAT", "name": "Pretoria Satellite Depot"},
            {"id": "PE-MAIN", "name": "Port Elizabeth Warehouse"}
        ]
    }


@app.get("/reports/payroll/runs")
@app.get("/api/v1/reports/payroll/runs")
async def get_payroll_runs(year: int = 2026):
    """Get payroll run history"""
    return {
        "runs": [
            {
                "id": 1,
                "runDate": "2026-02-15",
                "period": "February 2026",
                "employeeCount": 3,
                "totalGross": 225000.00,
                "totalDeductions": 45000.00,
                "totalNet": 180000.00,
                "status": "Completed",
                "approvedBy": "Admin User"
            },
            {
                "id": 2,
                "runDate": "2026-01-15",
                "period": "January 2026",
                "employeeCount": 3,
                "totalGross": 225000.00,
                "totalDeductions": 44500.00,
                "totalNet": 180500.00,
                "status": "Completed",
                "approvedBy": "Admin User"
            }
        ],
        "total": 2
    }

@app.get("/reports/payroll/summary")
@app.get("/api/v1/reports/payroll/summary")
async def get_payroll_summary(year: int = 2026):
    """Get payroll summary statistics"""
    return {
        "year": year,
        "totalRuns": 2,
        "totalEmployees": 3,
        "totalGrossPayroll": 450000.00,
        "totalDeductions": 89500.00,
        "totalNetPayroll": 360500.00,
        "averageGrossPerEmployee": 150000.00,
        "monthlyBreakdown": [
            {"month": "January", "gross": 225000.00, "net": 180500.00, "employees": 3},
            {"month": "February", "gross": 225000.00, "net": 180000.00, "employees": 3}
        ]
    }

@app.get("/critical/payroll/payslips")
@app.get("/api/v1/critical/payroll/payslips")
async def get_payroll_payslips():
    """Get payroll payslips - South African payroll with PAYE, UIF, SDL"""
    return {
        "payslips": [
            {
                "id": 1,
                "payslip_number": "PSL-2026-02-001",
                "employee_id": 1,
                "employee_name": "Thandi Nkosi",
                "pay_period_start": "2026-02-01",
                "pay_period_end": "2026-02-28",
                "gross_salary": 45000.00,
                "paye": 8550.00,  # ~19% PAYE
                "uif": 450.00,  # 1% employee UIF contribution
                "sdl": 450.00,  # 1% SDL
                "other_deductions": 500.00,  # Medical aid, pension, etc.
                "net_salary": 35050.00,  # Gross - all deductions
                "status": "PAID",
                "created_at": "2026-02-28T10:30:00"
            },
            {
                "id": 2,
                "payslip_number": "PSL-2026-02-002",
                "employee_id": 2,
                "employee_name": "Sipho Mthembu",
                "pay_period_start": "2026-02-01",
                "pay_period_end": "2026-02-28",
                "gross_salary": 65000.00,
                "paye": 14950.00,  # ~23% PAYE
                "uif": 650.00,
                "sdl": 650.00,
                "other_deductions": 1250.00,
                "net_salary": 47500.00,
                "status": "PAID",
                "created_at": "2026-02-28T10:35:00"
            },
            {
                "id": 3,
                "payslip_number": "PSL-2026-02-003",
                "employee_id": 3,
                "employee_name": "Zanele Dlamini",
                "pay_period_start": "2026-02-01",
                "pay_period_end": "2026-02-28",
                "gross_salary": 38000.00,
                "paye": 6460.00,  # ~17% PAYE
                "uif": 380.00,
                "sdl": 380.00,
                "other_deductions": 400.00,
                "net_salary": 30380.00,
                "status": "APPROVED",
                "created_at": "2026-02-28T10:40:00"
            },
            {
                "id": 4,
                "payslip_number": "PSL-2026-02-004",
                "employee_id": 4,
                "employee_name": "Kabelo Mokoena",
                "pay_period_start": "2026-02-01",
                "pay_period_end": "2026-02-28",
                "gross_salary": 52000.00,
                "paye": 11440.00,  # ~22% PAYE
                "uif": 520.00,
                "sdl": 520.00,
                "other_deductions": 850.00,
                "net_salary": 38670.00,
                "status": "APPROVED",
                "created_at": "2026-02-28T10:45:00"
            },
            {
                "id": 5,
                "payslip_number": "PSL-2026-02-005",
                "employee_id": 5,
                "employee_name": "Lerato Sithole",
                "pay_period_start": "2026-02-01",
                "pay_period_end": "2026-02-28",
                "gross_salary": 35000.00,
                "paye": 5600.00,  # ~16% PAYE
                "uif": 350.00,
                "sdl": 350.00,
                "other_deductions": 300.00,
                "net_salary": 28400.00,
                "status": "DRAFT",
                "created_at": "2026-02-27T14:20:00"
            },
            {
                "id": 6,
                "payslip_number": "PSL-2026-02-006",
                "employee_id": 6,
                "employee_name": "Andile Ndlovu",
                "pay_period_start": "2026-02-01",
                "pay_period_end": "2026-02-28",
                "gross_salary": 42000.00,
                "paye": 7980.00,  # ~19% PAYE
                "uif": 420.00,
                "sdl": 420.00,
                "other_deductions": 600.00,
                "net_salary": 32580.00,
                "status": "DRAFT",
                "created_at": "2026-02-27T14:25:00"
            },
            # January 2026 payslips
            {
                "id": 7,
                "payslip_number": "PSL-2026-01-001",
                "employee_id": 1,
                "employee_name": "Thandi Nkosi",
                "pay_period_start": "2026-01-01",
                "pay_period_end": "2026-01-31",
                "gross_salary": 45000.00,
                "paye": 8550.00,
                "uif": 450.00,
                "sdl": 450.00,
                "other_deductions": 500.00,
                "net_salary": 35050.00,
                "status": "PAID",
                "created_at": "2026-01-31T10:30:00"
            },
            {
                "id": 8,
                "payslip_number": "PSL-2026-01-002",
                "employee_id": 2,
                "employee_name": "Sipho Mthembu",
                "pay_period_start": "2026-01-01",
                "pay_period_end": "2026-01-31",
                "gross_salary": 65000.00,
                "paye": 14950.00,
                "uif": 650.00,
                "sdl": 650.00,
                "other_deductions": 1250.00,
                "net_salary": 47500.00,
                "status": "PAID",
                "created_at": "2026-01-31T10:35:00"
            },
            {
                "id": 9,
                "payslip_number": "PSL-2026-01-003",
                "employee_id": 3,
                "employee_name": "Zanele Dlamini",
                "pay_period_start": "2026-01-01",
                "pay_period_end": "2026-01-31",
                "gross_salary": 38000.00,
                "paye": 6460.00,
                "uif": 380.00,
                "sdl": 380.00,
                "other_deductions": 400.00,
                "net_salary": 30380.00,
                "status": "PAID",
                "created_at": "2026-01-31T10:40:00"
            },
            {
                "id": 10,
                "payslip_number": "PSL-2026-01-004",
                "employee_id": 4,
                "employee_name": "Kabelo Mokoena",
                "pay_period_start": "2026-01-01",
                "pay_period_end": "2026-01-31",
                "gross_salary": 52000.00,
                "paye": 11440.00,
                "uif": 520.00,
                "sdl": 520.00,
                "other_deductions": 850.00,
                "net_salary": 38670.00,
                "status": "PAID",
                "created_at": "2026-01-31T10:45:00"
            },
            {
                "id": 11,
                "payslip_number": "PSL-2026-01-005",
                "employee_id": 5,
                "employee_name": "Lerato Sithole",
                "pay_period_start": "2026-01-01",
                "pay_period_end": "2026-01-31",
                "gross_salary": 35000.00,
                "paye": 5600.00,
                "uif": 350.00,
                "sdl": 350.00,
                "other_deductions": 300.00,
                "net_salary": 28400.00,
                "status": "PAID",
                "created_at": "2026-01-31T10:50:00"
            },
            {
                "id": 12,
                "payslip_number": "PSL-2026-01-006",
                "employee_id": 6,
                "employee_name": "Andile Ndlovu",
                "pay_period_start": "2026-01-01",
                "pay_period_end": "2026-01-31",
                "gross_salary": 42000.00,
                "paye": 7980.00,
                "uif": 420.00,
                "sdl": 420.00,
                "other_deductions": 600.00,
                "net_salary": 32580.00,
                "status": "PAID",
                "created_at": "2026-01-31T10:55:00"
            }
        ]
    }

@app.get("/critical/payroll/tax-summary")
@app.get("/api/v1/critical/payroll/tax-summary")
async def get_payroll_tax_summary():
    """Get payroll tax summary - SARS compliance report for PAYE, UIF, SDL"""
    return {
        "period": "2026-02",
        "total_paye": 54980.00,  # Sum of all PAYE from Feb 2026 payslips
        "total_uif": 2770.00,  # Sum of all UIF employee contributions (1% each)
        "total_sdl": 2770.00,  # Sum of all SDL (1% each)
        "total_gross": 277000.00,  # Total gross salary for the period
        "employer_uif": 2770.00,  # Employer UIF contribution (matches employee 1%)
        "total_tax_liability": 63290.00,  # Total tax to pay to SARS (PAYE + UIF employee + UIF employer + SDL)
        "due_date": "2026-03-07",  # SARS payment deadline (7th of following month)
        "status": "PENDING",
        "breakdown": [
            {
                "tax_type": "PAYE",
                "description": "Pay As You Earn (Income Tax)",
                "amount": 54980.00,
                "percentage": "16-23%",
                "employees_affected": 6
            },
            {
                "tax_type": "UIF_EMPLOYEE",
                "description": "Unemployment Insurance Fund (Employee)",
                "amount": 2770.00,
                "percentage": "1.0%",
                "employees_affected": 6
            },
            {
                "tax_type": "UIF_EMPLOYER",
                "description": "Unemployment Insurance Fund (Employer)",
                "amount": 2770.00,
                "percentage": "1.0%",
                "employees_affected": 6
            },
            {
                "tax_type": "SDL",
                "description": "Skills Development Levy",
                "amount": 2770.00,
                "percentage": "1.0%",
                "employees_affected": 6
            }
        ],
        "monthly_comparison": [
            {
                "month": "2026-02",
                "total_paye": 54980.00,
                "total_uif": 5540.00,  # Employee + Employer
                "total_sdl": 2770.00,
                "total": 63290.00
            },
            {
                "month": "2026-01",
                "total_paye": 54980.00,
                "total_uif": 5540.00,
                "total_sdl": 2770.00,
                "total": 63290.00
            },
            {
                "month": "2025-12",
                "total_paye": 52850.00,
                "total_uif": 5320.00,
                "total_sdl": 2660.00,
                "total": 60830.00
            }
        ],
        "compliance_notes": [
            "PAYE and UIF must be paid to SARS by the 7th of the following month",
            "SDL is paid monthly to SARS together with PAYE",
            "EMP201 return must be submitted to SARS by the 7th of the following month",
            "Annual reconciliation (EMP501) due by May 31st",
            "All calculations based on current SARS tax tables (2025/2026 tax year)"
        ]
    }

@app.get("/erp/manufacturing/work-orders")
@app.get("/api/erp/manufacturing/work-orders")
@app.get("/api/v1/erp/manufacturing/work-orders")
async def get_manufacturing_work_orders():
    """Get manufacturing work orders - Production scheduling and tracking"""
    return {
        "work_orders": [
            {
                "order_id": "WO-2026-001",
                "product_id": "PROD-001",
                "product_name": "Luxury Office Desk - Oak Wood",
                "bom_id": "BOM-DESK-001",
                "bom_version": "v1.2",
                "quantity": 50,
                "quantity_completed": 35,
                "status": "in_progress",
                "priority": "high",
                "start_date": "2026-02-15",
                "due_date": "2026-03-10",
                "actual_start_date": "2026-02-15",
                "actual_end_date": None,
                "assigned_to": "Production Team A - Thandi Nkosi (Supervisor)",
                "notes": "Client: Sandton Office Park. High-priority order for new building furnishing. Oak veneer finish required.",
                "estimated_hours": 200,
                "actual_hours": 145,
                "cost_estimate": 125000.00,
                "cost_actual": 95250.00,
                "warehouse": "JHB Manufacturing Plant",
                "created_at": "2026-02-10T08:30:00",
                "updated_at": "2026-02-22T14:20:00"
            },
            {
                "order_id": "WO-2026-002",
                "product_id": "PROD-002",
                "product_name": "Executive Office Chair - Leather",
                "bom_id": "BOM-CHAIR-002",
                "bom_version": "v2.0",
                "quantity": 120,
                "quantity_completed": 120,
                "status": "completed",
                "priority": "medium",
                "start_date": "2026-01-20",
                "due_date": "2026-02-15",
                "actual_start_date": "2026-01-20",
                "actual_end_date": "2026-02-14",
                "assigned_to": "Production Team B - Sipho Dlamini (Supervisor)",
                "notes": "Corporate order for multiple offices. Italian leather, ergonomic design. Completed ahead of schedule.",
                "estimated_hours": 240,
                "actual_hours": 228,
                "cost_estimate": 360000.00,
                "cost_actual": 342000.00,
                "warehouse": "CPT Manufacturing Hub",
                "created_at": "2026-01-15T09:00:00",
                "updated_at": "2026-02-14T16:45:00"
            },
            {
                "order_id": "WO-2026-003",
                "product_id": "PROD-003",
                "product_name": "Conference Table - 12 Seater",
                "bom_id": "BOM-TABLE-003",
                "bom_version": "v1.0",
                "quantity": 8,
                "quantity_completed": 0,
                "status": "planned",
                "priority": "low",
                "start_date": "2026-03-01",
                "due_date": "2026-03-25",
                "actual_start_date": None,
                "actual_end_date": None,
                "assigned_to": "Production Team A - Thandi Nkosi (Supervisor)",
                "notes": "Large boardroom tables with built-in cable management. Waiting for WO-2026-001 completion before starting.",
                "estimated_hours": 80,
                "actual_hours": 0,
                "cost_estimate": 96000.00,
                "cost_actual": 0.00,
                "warehouse": "JHB Manufacturing Plant",
                "created_at": "2026-02-20T11:15:00",
                "updated_at": "2026-02-20T11:15:00"
            },
            {
                "order_id": "WO-2026-004",
                "product_id": "PROD-004",
                "product_name": "Filing Cabinet - 4 Drawer Steel",
                "bom_id": "BOM-CABINET-004",
                "bom_version": "v1.5",
                "quantity": 200,
                "quantity_completed": 85,
                "status": "in_progress",
                "priority": "medium",
                "start_date": "2026-02-01",
                "due_date": "2026-03-05",
                "actual_start_date": "2026-02-02",
                "actual_end_date": None,
                "assigned_to": "Production Team C - Zanele Mokoena (Supervisor)",
                "notes": "Government tender - Department of Home Affairs. Powder-coated steel construction. Anti-rust treatment applied.",
                "estimated_hours": 160,
                "actual_hours": 72,
                "cost_estimate": 180000.00,
                "cost_actual": 76500.00,
                "warehouse": "Durban Production Facility",
                "created_at": "2026-01-28T10:00:00",
                "updated_at": "2026-02-22T09:30:00"
            },
            {
                "order_id": "WO-2026-005",
                "product_id": "PROD-005",
                "product_name": "Reception Desk - Modern Design",
                "bom_id": "BOM-RECEP-005",
                "bom_version": "v1.1",
                "quantity": 5,
                "quantity_completed": 2,
                "status": "on_hold",
                "priority": "urgent",
                "start_date": "2026-02-18",
                "due_date": "2026-02-28",
                "actual_start_date": "2026-02-18",
                "actual_end_date": None,
                "assigned_to": "Production Team A - Thandi Nkosi (Supervisor)",
                "notes": "URGENT: Hospital reception upgrade. ON HOLD - waiting for tempered glass panels from supplier. Expected delivery: Feb 25.",
                "estimated_hours": 60,
                "actual_hours": 28,
                "cost_estimate": 75000.00,
                "cost_actual": 35000.00,
                "warehouse": "JHB Manufacturing Plant",
                "created_at": "2026-02-15T13:45:00",
                "updated_at": "2026-02-21T08:15:00"
            },
            {
                "order_id": "WO-2026-006",
                "product_id": "PROD-006",
                "product_name": "Modular Workstation - 4 Person Pod",
                "bom_id": "BOM-WORKST-006",
                "bom_version": "v2.3",
                "quantity": 25,
                "quantity_completed": 25,
                "status": "completed",
                "priority": "high",
                "start_date": "2026-01-10",
                "due_date": "2026-02-05",
                "actual_start_date": "2026-01-10",
                "actual_end_date": "2026-02-04",
                "assigned_to": "Production Team B - Sipho Dlamini (Supervisor)",
                "notes": "Tech startup in Rosebank. Open-plan office setup with acoustic panels. Client very satisfied with quality.",
                "estimated_hours": 300,
                "actual_hours": 285,
                "cost_estimate": 437500.00,
                "cost_actual": 420000.00,
                "warehouse": "CPT Manufacturing Hub",
                "created_at": "2026-01-05T08:00:00",
                "updated_at": "2026-02-04T17:30:00"
            },
            {
                "order_id": "WO-2026-007",
                "product_id": "PROD-007",
                "product_name": "Storage Locker Unit - 20 Compartments",
                "bom_id": "BOM-LOCKER-007",
                "bom_version": "v1.0",
                "quantity": 15,
                "quantity_completed": 0,
                "status": "cancelled",
                "priority": "low",
                "start_date": "2026-02-10",
                "due_date": "2026-02-28",
                "actual_start_date": None,
                "actual_end_date": None,
                "assigned_to": "Production Team C - Zanele Mokoena (Supervisor)",
                "notes": "CANCELLED: Client cancelled order due to budget cuts. Partial deposit refunded. Materials returned to inventory.",
                "estimated_hours": 90,
                "actual_hours": 0,
                "cost_estimate": 67500.00,
                "cost_actual": 0.00,
                "warehouse": "Durban Production Facility",
                "created_at": "2026-02-05T14:20:00",
                "updated_at": "2026-02-19T10:00:00"
            },
            {
                "order_id": "WO-2026-008",
                "product_id": "PROD-008",
                "product_name": "Adjustable Height Desk - Electric",
                "bom_id": "BOM-DESK-008",
                "bom_version": "v1.8",
                "quantity": 40,
                "quantity_completed": 12,
                "status": "in_progress",
                "priority": "medium",
                "start_date": "2026-02-12",
                "due_date": "2026-03-15",
                "actual_start_date": "2026-02-12",
                "actual_end_date": None,
                "assigned_to": "Production Team A - Thandi Nkosi (Supervisor)",
                "notes": "Premium standing desks with German motors. Memory presets for height adjustment. Quality control strict on electrical components.",
                "estimated_hours": 180,
                "actual_hours": 58,
                "cost_estimate": 320000.00,
                "cost_actual": 96000.00,
                "warehouse": "JHB Manufacturing Plant",
                "created_at": "2026-02-08T09:45:00",
                "updated_at": "2026-02-22T11:00:00"
            },
            {
                "order_id": "WO-2026-009",
                "product_id": "PROD-009",
                "product_name": "Bookshelf Unit - 6 Tier Walnut",
                "bom_id": "BOM-SHELF-009",
                "bom_version": "v1.4",
                "quantity": 60,
                "quantity_completed": 0,
                "status": "planned",
                "priority": "medium",
                "start_date": "2026-03-05",
                "due_date": "2026-03-30",
                "actual_start_date": None,
                "actual_end_date": None,
                "assigned_to": "Production Team B - Sipho Dlamini (Supervisor)",
                "notes": "Library order - University of Pretoria. Solid walnut construction. Anti-tip safety brackets included.",
                "estimated_hours": 150,
                "actual_hours": 0,
                "cost_estimate": 180000.00,
                "cost_actual": 0.00,
                "warehouse": "CPT Manufacturing Hub",
                "created_at": "2026-02-22T15:30:00",
                "updated_at": "2026-02-22T15:30:00"
            },
            {
                "order_id": "WO-2026-010",
                "product_id": "PROD-010",
                "product_name": "Meeting Room Chair - Stackable",
                "bom_id": "BOM-CHAIR-010",
                "bom_version": "v2.1",
                "quantity": 300,
                "quantity_completed": 175,
                "status": "in_progress",
                "priority": "high",
                "start_date": "2026-01-25",
                "due_date": "2026-03-01",
                "actual_start_date": "2026-01-26",
                "actual_end_date": None,
                "assigned_to": "Production Team C - Zanele Mokoena (Supervisor)",
                "notes": "Large conference venue order. Lightweight, stackable design. Fabric color: corporate blue. 58% complete, on schedule.",
                "estimated_hours": 360,
                "actual_hours": 215,
                "cost_estimate": 450000.00,
                "cost_actual": 262500.00,
                "warehouse": "Durban Production Facility",
                "created_at": "2026-01-20T08:15:00",
                "updated_at": "2026-02-22T16:00:00"
            }
        ],
        "total": 10,
        "summary": {
            "total_orders": 10,
            "planned": 2,
            "in_progress": 4,
            "on_hold": 1,
            "completed": 2,
            "cancelled": 1,
            "total_quantity_to_produce": 823,
            "total_quantity_completed": 454,
            "overall_completion_percentage": 55.2,
            "estimated_total_cost": 2291000.00,
            "actual_total_cost": 1427250.00
        }
    }

@app.get("/field-service/service-requests")
@app.get("/api/field-service/service-requests")
@app.get("/api/v1/field-service/service-requests")
async def get_field_service_requests(company_id: str = None, status: str = None):
    """Get field service requests - On-site service and repairs"""
    return {
        "service_requests": [
            {
                "id": 1,
                "request_number": "SR-2026-001",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Sandton City Shopping Centre",
                "request_type": "repair",
                "priority": "urgent",
                "status": "pending",
                "description": "HVAC system malfunction in north wing. Temperature fluctuating. Multiple tenant complaints.",
                "reported_date": "2026-02-23T08:15:00",
                "assigned_to": "Thandi Nkosi - Senior HVAC Technician"
            },
            {
                "id": 2,
                "request_number": "SR-2026-002",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Netcare Milpark Hospital",
                "request_type": "maintenance",
                "priority": "high",
                "status": "in_progress",
                "description": "Quarterly preventative maintenance on backup generator systems. Including load testing.",
                "reported_date": "2026-02-22T14:30:00",
                "assigned_to": "Sipho Dlamini - Electrical Engineer"
            },
            {
                "id": 3,
                "request_number": "SR-2026-003",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Discovery Head Office - Sandton",
                "request_type": "installation",
                "priority": "medium",
                "status": "scheduled",
                "description": "Install new access control system for executive floor. 12 biometric readers and central controller.",
                "reported_date": "2026-02-21T11:00:00",
                "assigned_to": "Zanele Mokoena - Security Systems Specialist"
            },
            {
                "id": 4,
                "request_number": "SR-2026-004",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Woolworths Distribution Centre - Midrand",
                "request_type": "inspection",
                "priority": "low",
                "status": "pending",
                "description": "Annual fire suppression system inspection and certification. Must be completed before March 15th.",
                "reported_date": "2026-02-20T09:45:00",
                "assigned_to": None
            },
            {
                "id": 5,
                "request_number": "SR-2026-005",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Standard Bank - Rosebank Branch",
                "request_type": "repair",
                "priority": "urgent",
                "status": "in_progress",
                "description": "ATM cash dispenser jamming. Machine out of service. Critical - high traffic location.",
                "reported_date": "2026-02-23T06:30:00",
                "assigned_to": "Kabelo Mokoena - ATM Service Technician"
            },
            {
                "id": 6,
                "request_number": "SR-2026-006",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "University of Pretoria - Engineering Building",
                "request_type": "maintenance",
                "priority": "medium",
                "status": "scheduled",
                "description": "Replace aging UPS batteries in server room. 20 sealed lead-acid batteries.",
                "reported_date": "2026-02-19T15:20:00",
                "assigned_to": "Lerato Sithole - IT Infrastructure Technician"
            },
            {
                "id": 7,
                "request_number": "SR-2026-007",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Pick n Pay Hypermarket - Fourways",
                "request_type": "repair",
                "priority": "high",
                "status": "in_progress",
                "description": "Cold room refrigeration failure. Temperature rising. Stock at risk. Urgent response required.",
                "reported_date": "2026-02-23T05:45:00",
                "assigned_to": "Andile Ndlovu - Refrigeration Specialist"
            },
            {
                "id": 8,
                "request_number": "SR-2026-008",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "FNB Business Banking - Centurion",
                "request_type": "installation",
                "priority": "medium",
                "status": "completed",
                "description": "Install video conferencing equipment in 3 boardrooms. Cameras, microphones, displays.",
                "reported_date": "2026-02-15T10:00:00",
                "assigned_to": "Mpho Radebe - AV Installation Specialist"
            },
            {
                "id": 9,
                "request_number": "SR-2026-009",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Gautrain Station - Sandton",
                "request_type": "maintenance",
                "priority": "high",
                "status": "scheduled",
                "description": "Biannual escalator safety inspection and lubrication. 12 escalators total. After-hours work required.",
                "reported_date": "2026-02-18T13:30:00",
                "assigned_to": "Thandi Nkosi - Senior HVAC Technician"
            },
            {
                "id": 10,
                "request_number": "SR-2026-010",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Virgin Active Gym - Bryanston",
                "request_type": "repair",
                "priority": "medium",
                "status": "completed",
                "description": "Repair faulty cardio equipment. 3 treadmills with belt tracking issues. Replace rollers and adjust alignment.",
                "reported_date": "2026-02-17T07:15:00",
                "assigned_to": "Sipho Dlamini - Electrical Engineer"
            }
        ],
        "total": 10
    }

@app.get("/field-service/work-orders")
@app.get("/api/field-service/work-orders")
@app.get("/api/v1/field-service/work-orders")
async def get_field_service_work_orders(company_id: str = None, status: str = None):
    """Get field service work orders - Dispatched jobs with scheduling"""
    return {
        "work_orders": [
            {
                "id": 1,
                "work_order_number": "WO-FS-2026-001",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Sandton City Shopping Centre",
                "work_type": "hvac_repair",
                "priority": "urgent",
                "status": "dispatched",
                "scheduled_date": "2026-02-23",
                "technician_name": "Thandi Nkosi",
                "total_cost": 8500.00
            },
            {
                "id": 2,
                "work_order_number": "WO-FS-2026-002",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Netcare Milpark Hospital",
                "work_type": "generator_maintenance",
                "priority": "high",
                "status": "in_progress",
                "scheduled_date": "2026-02-22",
                "technician_name": "Sipho Dlamini",
                "total_cost": 15000.00
            },
            {
                "id": 3,
                "work_order_number": "WO-FS-2026-003",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Discovery Head Office - Sandton",
                "work_type": "access_control_installation",
                "priority": "medium",
                "status": "scheduled",
                "scheduled_date": "2026-02-25",
                "technician_name": "Zanele Mokoena",
                "total_cost": 45000.00
            },
            {
                "id": 4,
                "work_order_number": "WO-FS-2026-004",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Standard Bank - Rosebank Branch",
                "work_type": "atm_repair",
                "priority": "urgent",
                "status": "in_progress",
                "scheduled_date": "2026-02-23",
                "technician_name": "Kabelo Mokoena",
                "total_cost": 4500.00
            },
            {
                "id": 5,
                "work_order_number": "WO-FS-2026-005",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "University of Pretoria - Engineering Building",
                "work_type": "ups_maintenance",
                "priority": "medium",
                "status": "scheduled",
                "scheduled_date": "2026-02-26",
                "technician_name": "Lerato Sithole",
                "total_cost": 12000.00
            },
            {
                "id": 6,
                "work_order_number": "WO-FS-2026-006",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Pick n Pay Hypermarket - Fourways",
                "work_type": "refrigeration_repair",
                "priority": "high",
                "status": "in_progress",
                "scheduled_date": "2026-02-23",
                "technician_name": "Andile Ndlovu",
                "total_cost": 18500.00
            },
            {
                "id": 7,
                "work_order_number": "WO-FS-2026-007",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "FNB Business Banking - Centurion",
                "work_type": "av_installation",
                "priority": "medium",
                "status": "completed",
                "scheduled_date": "2026-02-16",
                "technician_name": "Mpho Radebe",
                "total_cost": 85000.00
            },
            {
                "id": 8,
                "work_order_number": "WO-FS-2026-008",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Gautrain Station - Sandton",
                "work_type": "escalator_maintenance",
                "priority": "high",
                "status": "scheduled",
                "scheduled_date": "2026-02-27",
                "technician_name": "Thandi Nkosi",
                "total_cost": 32000.00
            },
            {
                "id": 9,
                "work_order_number": "WO-FS-2026-009",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Virgin Active Gym - Bryanston",
                "work_type": "equipment_repair",
                "priority": "medium",
                "status": "completed",
                "scheduled_date": "2026-02-18",
                "technician_name": "Sipho Dlamini",
                "total_cost": 6500.00
            },
            {
                "id": 10,
                "work_order_number": "WO-FS-2026-010",
                "company_id": "00000000-0000-0000-0000-000000000001",
                "customer_name": "Woolworths Distribution Centre - Midrand",
                "work_type": "fire_system_inspection",
                "priority": "low",
                "status": "scheduled",
                "scheduled_date": "2026-03-10",
                "technician_name": None,
                "total_cost": 9500.00
            }
        ],
        "total": 10
    }

# ============================================
# COLLECTIONS (AR)
# ============================================

@app.get("/new-pages/collections")
@app.get("/api/new-pages/collections")
async def get_collections():
    """Get collections records - Accounts Receivable collections management"""
    return {
        "collections": [
            {
                "id": "COL-001",
                "collection_number": "COL-2026-001",
                "customer_name": "Discovery Health",
                "contact_date": "2026-02-20",
                "contact_method": "phone",
                "contact_person": "Johan van der Merwe",
                "amount_outstanding": 125000.00,
                "promise_to_pay_date": "2026-02-28",
                "promise_to_pay_amount": 125000.00,
                "outcome": "Promise to Pay",
                "follow_up_date": "2026-02-27",
                "assigned_to_name": "Sarah Naidoo",
                "notes": "Payment committed for end of month"
            },
            {
                "id": "COL-002",
                "collection_number": "COL-2026-002",
                "customer_name": "Woolworths Holdings",
                "contact_date": "2026-02-21",
                "contact_method": "email",
                "contact_person": "Thandi Mthembu",
                "amount_outstanding": 87500.00,
                "promise_to_pay_date": "2026-03-15",
                "promise_to_pay_amount": 87500.00,
                "outcome": "Partial Payment Arranged",
                "follow_up_date": "2026-03-10",
                "assigned_to_name": "David Coetzee",
                "notes": "Awaiting budget approval"
            },
            {
                "id": "COL-003",
                "collection_number": "COL-2026-003",
                "customer_name": "Pick n Pay",
                "contact_date": "2026-02-22",
                "contact_method": "phone",
                "contact_person": "Mandla Dlamini",
                "amount_outstanding": 156000.00,
                "promise_to_pay_date": None,
                "promise_to_pay_amount": None,
                "outcome": "Dispute - Invoice Query",
                "follow_up_date": "2026-02-25",
                "assigned_to_name": "Linda Botha",
                "notes": "Customer querying delivery quantities"
            },
            {
                "id": "COL-004",
                "collection_number": "COL-2026-004",
                "customer_name": "Standard Bank",
                "contact_date": "2026-02-19",
                "contact_method": "meeting",
                "contact_person": "Sipho Khumalo",
                "amount_outstanding": 245000.00,
                "promise_to_pay_date": "2026-02-25",
                "promise_to_pay_amount": 245000.00,
                "outcome": "Payment Confirmed",
                "follow_up_date": None,
                "assigned_to_name": "Johan Pretorius",
                "notes": "Payment processed, awaiting clearance"
            },
            {
                "id": "COL-005",
                "collection_number": "COL-2026-005",
                "customer_name": "Nedbank",
                "contact_date": "2026-02-23",
                "contact_method": "phone",
                "contact_person": "Zanele Ngcobo",
                "amount_outstanding": 98000.00,
                "promise_to_pay_date": "2026-03-05",
                "promise_to_pay_amount": 50000.00,
                "outcome": "Partial Payment Promise",
                "follow_up_date": "2026-03-01",
                "assigned_to_name": "Sarah Naidoo",
                "notes": "Agreed to pay R50k now, balance in 30 days"
            }
        ],
        "total": 5
    }

@app.post("/new-pages/collections")
@app.post("/api/new-pages/collections")
async def create_collection(data: dict):
    """Create new collection record"""
    return {
        "id": "COL-NEW",
        "collection_number": f"COL-2026-{str(datetime.now().timestamp())[-3:]}",
        "message": "Collection record created successfully",
        **data
    }

# ============================================
# CRM - OPPORTUNITIES
# ============================================

@app.get("/api/crm/opportunities")
@app.get("/crm/opportunities")
async def get_opportunities():
    """Get CRM opportunities - Sales pipeline management"""
    return {
        "opportunities": [
            {
                "id": "OPP-001",
                "name": "Discovery Health ERP Upgrade",
                "customer": "Discovery Health",
                "value": 2500000.00,
                "stage": "proposal",
                "probability": 75,
                "expected_close": "2026-03-31",
                "owner": "Sarah Naidoo",
                "status": "active",
                "created_date": "2026-01-15"
            },
            {
                "id": "OPP-002",
                "name": "Woolworths E-commerce Platform",
                "customer": "Woolworths Holdings",
                "value": 4200000.00,
                "stage": "negotiation",
                "probability": 85,
                "expected_close": "2026-04-15",
                "owner": "Johan Pretorius",
                "status": "active",
                "created_date": "2025-12-10"
            },
            {
                "id": "OPP-003",
                "name": "Pick n Pay Supply Chain System",
                "customer": "Pick n Pay",
                "value": 1500000.00,
                "stage": "qualification",
                "probability": 50,
                "expected_close": "2026-05-30",
                "owner": "David Coetzee",
                "status": "active",
                "created_date": "2026-02-01"
            },
            {
                "id": "OPP-004",
                "name": "Standard Bank Security Audit",
                "customer": "Standard Bank",
                "value": 750000.00,
                "stage": "closed_won",
                "probability": 100,
                "expected_close": "2026-02-15",
                "owner": "Linda Botha",
                "status": "won",
                "created_date": "2025-11-20"
            },
            {
                "id": "OPP-005",
                "name": "Nedbank Mobile App Development",
                "customer": "Nedbank",
                "value": 3500000.00,
                "stage": "proposal",
                "probability": 65,
                "expected_close": "2026-06-30",
                "owner": "Thandi Mthembu",
                "status": "active",
                "created_date": "2026-01-20"
            },
            {
                "id": "OPP-006",
                "name": "Sasol Process Automation",
                "customer": "Sasol",
                "value": 5200000.00,
                "stage": "discovery",
                "probability": 30,
                "expected_close": "2026-08-31",
                "owner": "Sipho Khumalo",
                "status": "active",
                "created_date": "2026-02-10"
            },
            {
                "id": "OPP-007",
                "name": "Shoprite Digital Transformation",
                "customer": "Shoprite Holdings",
                "value": 2800000.00,
                "stage": "closed_lost",
                "probability": 0,
                "expected_close": "2026-01-31",
                "owner": "Zanele Ngcobo",
                "status": "lost",
                "created_date": "2025-10-15"
            },
            {
                "id": "OPP-008",
                "name": "MTN Cloud Infrastructure",
                "customer": "MTN Group",
                "value": 6500000.00,
                "stage": "negotiation",
                "probability": 80,
                "expected_close": "2026-07-15",
                "owner": "Johan Pretorius",
                "status": "active",
                "created_date": "2025-12-05"
            }
        ],
        "total": 8
    }

@app.post("/api/crm/opportunities")
@app.post("/crm/opportunities")
async def create_opportunity(data: dict):
    """Create new CRM opportunity"""
    return {
        "id": f"OPP-{str(datetime.now().timestamp())[-3:]}",
        "message": "Opportunity created successfully",
        **data
    }

@app.put("/api/crm/opportunities/{opp_id}")
@app.put("/crm/opportunities/{opp_id}")
async def update_opportunity(opp_id: str, data: dict):
    """Update CRM opportunity"""
    return {
        "id": opp_id,
        "message": "Opportunity updated successfully",
        **data
    }

@app.delete("/api/crm/opportunities/{opp_id}")
@app.delete("/crm/opportunities/{opp_id}")
async def delete_opportunity(opp_id: str):
    """Delete CRM opportunity"""
    return {"message": "Opportunity deleted successfully"}

# ============================================
# CRM - CONTACTS
# ============================================

@app.get("/api/crm/contacts")
@app.get("/crm/contacts")
async def get_contacts():
    """Get CRM contacts - Customer contact management"""
    return {
        "contacts": [
            {
                "id": "CNT-001",
                "name": "Johan van der Merwe",
                "email": "johan.vandermerwe@discovery.co.za",
                "phone": "+27 11 529 2888",
                "company": "Discovery Health",
                "position": "IT Director",
                "city": "Sandton",
                "status": "active"
            },
            {
                "id": "CNT-002",
                "name": "Thandi Mthembu",
                "email": "thandi.mthembu@woolworths.co.za",
                "phone": "+27 21 407 9111",
                "company": "Woolworths Holdings",
                "position": "CFO",
                "city": "Cape Town",
                "status": "active"
            },
            {
                "id": "CNT-003",
                "name": "Mandla Dlamini",
                "email": "mandla.dlamini@pnp.co.za",
                "phone": "+27 21 658 1000",
                "company": "Pick n Pay",
                "position": "Supply Chain Manager",
                "city": "Cape Town",
                "status": "active"
            },
            {
                "id": "CNT-004",
                "name": "Sipho Khumalo",
                "email": "sipho.khumalo@standardbank.co.za",
                "phone": "+27 11 636 9111",
                "company": "Standard Bank",
                "position": "Head of Technology",
                "city": "Johannesburg",
                "status": "active"
            },
            {
                "id": "CNT-005",
                "name": "Zanele Ngcobo",
                "email": "zanele.ngcobo@nedbank.co.za",
                "phone": "+27 11 294 4444",
                "company": "Nedbank",
                "position": "Digital Innovation Lead",
                "city": "Johannesburg",
                "status": "active"
            },
            {
                "id": "CNT-006",
                "name": "Pieter Botha",
                "email": "pieter.botha@sasol.com",
                "phone": "+27 11 441 3111",
                "company": "Sasol",
                "position": "Operations Director",
                "city": "Johannesburg",
                "status": "active"
            },
            {
                "id": "CNT-007",
                "name": "Linda Ncube",
                "email": "linda.ncube@shoprite.co.za",
                "phone": "+27 21 980 4000",
                "company": "Shoprite Holdings",
                "position": "IT Manager",
                "city": "Cape Town",
                "status": "inactive"
            },
            {
                "id": "CNT-008",
                "name": "David Coetzee",
                "email": "david.coetzee@mtn.com",
                "phone": "+27 11 912 3000",
                "company": "MTN Group",
                "position": "Infrastructure Manager",
                "city": "Johannesburg",
                "status": "active"
            },
            {
                "id": "CNT-009",
                "name": "Sarah Naidoo",
                "email": "sarah.naidoo@liberty.co.za",
                "phone": "+27 11 408 2999",
                "company": "Liberty Holdings",
                "position": "Business Analyst",
                "city": "Johannesburg",
                "status": "active"
            },
            {
                "id": "CNT-010",
                "name": "Ahmed Abrahams",
                "email": "ahmed.abrahams@absa.co.za",
                "phone": "+27 11 350 4000",
                "company": "Absa Bank",
                "position": "Senior Project Manager",
                "city": "Johannesburg",
                "status": "active"
            }
        ],
        "total": 10
    }

@app.post("/api/crm/contacts")
@app.post("/crm/contacts")
async def create_contact(data: dict):
    """Create new CRM contact"""
    return {
        "id": f"CNT-{str(datetime.now().timestamp())[-3:]}",
        "message": "Contact created successfully",
        **data
    }

@app.put("/api/crm/contacts/{contact_id}")
@app.put("/crm/contacts/{contact_id}")
async def update_contact(contact_id: str, data: dict):
    """Update CRM contact"""
    return {
        "id": contact_id,
        "message": "Contact updated successfully",
        **data
    }

@app.delete("/api/crm/contacts/{contact_id}")
@app.delete("/crm/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete CRM contact"""
    return {"message": "Contact deleted successfully"}


@app.get("/new-pages/projects")
@app.get("/api/new-pages/projects")
@app.get("/api/v1/new-pages/projects")
async def get_projects():
    """Get projects - Project management and tracking"""
    return {
        "projects": [
            {
                "id": 1,
                "name": "Discovery ERP Implementation",
                "client": "Discovery Health",
                "status": "active",
                "start_date": "2026-01-15",
                "end_date": "2026-06-30",
                "budget": 2500000.00,
                "actual_cost": 875000.00,
                "revenue": 1750000.00
            },
            {
                "id": 2,
                "name": "Sandton City Digital Transformation",
                "client": "Liberty Two Degrees",
                "status": "active",
                "start_date": "2025-11-01",
                "end_date": "2026-04-30",
                "budget": 1800000.00,
                "actual_cost": 1250000.00,
                "revenue": 1500000.00
            },
            {
                "id": 3,
                "name": "Nedbank Mobile Banking App Upgrade",
                "client": "Nedbank",
                "status": "completed",
                "start_date": "2025-08-01",
                "end_date": "2026-01-31",
                "budget": 3500000.00,
                "actual_cost": 3200000.00,
                "revenue": 3500000.00
            },
            {
                "id": 4,
                "name": "Pick n Pay Supply Chain Optimization",
                "client": "Pick n Pay",
                "status": "active",
                "start_date": "2026-02-01",
                "end_date": "2026-08-31",
                "budget": 1500000.00,
                "actual_cost": 185000.00,
                "revenue": 375000.00
            },
            {
                "id": 5,
                "name": "Woolworths E-commerce Platform",
                "client": "Woolworths Holdings",
                "status": "planning",
                "start_date": "2026-04-01",
                "end_date": "2026-12-31",
                "budget": 4200000.00,
                "actual_cost": 0.00,
                "revenue": 0.00
            },
            {
                "id": 6,
                "name": "Standard Bank Security Audit",
                "client": "Standard Bank",
                "status": "completed",
                "start_date": "2025-10-01",
                "end_date": "2025-12-31",
                "budget": 850000.00,
                "actual_cost": 820000.00,
                "revenue": 850000.00
            },
            {
                "id": 7,
                "name": "Eskom Smart Grid Infrastructure",
                "client": "Eskom",
                "status": "on_hold",
                "start_date": "2025-09-01",
                "end_date": "2026-03-31",
                "budget": 5500000.00,
                "actual_cost": 2750000.00,
                "revenue": 2750000.00
            },
            {
                "id": 8,
                "name": "MTN 5G Rollout - Gauteng Phase 1",
                "client": "MTN South Africa",
                "status": "active",
                "start_date": "2026-01-01",
                "end_date": "2026-05-31",
                "budget": 3800000.00,
                "actual_cost": 1520000.00,
                "revenue": 2280000.00
            },
            {
                "id": 9,
                "name": "Sasol SAP S/4HANA Migration",
                "client": "Sasol",
                "status": "planning",
                "start_date": "2026-05-01",
                "end_date": "2027-04-30",
                "budget": 12000000.00,
                "actual_cost": 0.00,
                "revenue": 0.00
            },
            {
                "id": 10,
                "name": "Life Healthcare Patient Portal",
                "client": "Life Healthcare",
                "status": "active",
                "start_date": "2026-01-15",
                "end_date": "2026-07-31",
                "budget": 1650000.00,
                "actual_cost": 495000.00,
                "revenue": 990000.00
            },
            {
                "id": 11,
                "name": "City of Johannesburg Smart City Initiative",
                "client": "City of Johannesburg",
                "status": "active",
                "start_date": "2025-10-01",
                "end_date": "2026-09-30",
                "budget": 8500000.00,
                "actual_cost": 3825000.00,
                "revenue": 5950000.00
            },
            {
                "id": 12,
                "name": "Shoprite Digital Loyalty Program",
                "client": "Shoprite Holdings",
                "status": "completed",
                "start_date": "2025-07-01",
                "end_date": "2025-12-31",
                "budget": 2200000.00,
                "actual_cost": 2150000.00,
                "revenue": 2200000.00
            },
            {
                "id": 13,
                "name": "Vodacom Customer Self-Service Portal",
                "client": "Vodacom",
                "status": "cancelled",
                "start_date": "2025-11-01",
                "end_date": "2026-02-28",
                "budget": 950000.00,
                "actual_cost": 285000.00,
                "revenue": 0.00
            },
            {
                "id": 14,
                "name": "Tiger Brands Supply Chain Visibility",
                "client": "Tiger Brands",
                "status": "active",
                "start_date": "2026-02-10",
                "end_date": "2026-08-10",
                "budget": 1750000.00,
                "actual_cost": 262500.00,
                "revenue": 437500.00
            },
            {
                "id": 15,
                "name": "Capitec Real-Time Fraud Detection",
                "client": "Capitec Bank",
                "status": "planning",
                "start_date": "2026-03-01",
                "end_date": "2026-10-31",
                "budget": 2800000.00,
                "actual_cost": 0.00,
                "revenue": 0.00
            }
        ],
        "total": 15
    }

@app.get("/compliance/metrics")
@app.get("/api/compliance/metrics")
@app.get("/api/v1/compliance/metrics")
async def get_compliance_metrics():
    """Get compliance dashboard metrics - South African business compliance"""
    return {
        "tax_obligations_pending": 2,  # VAT return due + PAYE submission pending
        "legal_documents_expiring": 1,  # BEE certificate expiring in 45 days
        "fixed_assets_count": 28,  # Office equipment, vehicles, IT equipment tracked
        "compliance_score": 92  # Overall compliance health score (0-100)
    }

@app.get("/tax/obligations")
@app.get("/api/tax/obligations")
@app.get("/api/v1/tax/obligations")
async def get_tax_obligations():
    """Get tax obligations - South African Revenue Service (SARS) compliance"""
    return {
        "obligations": [
            {
                "id": "1",
                "type": "VAT201",
                "description": "VAT Return - February 2026",
                "frequency": "Monthly",
                "next_due": "2026-03-25",
                "status": "PENDING",
                "tax_type": "Value Added Tax",
                "period": "February 2026",
                "due_date": "2026-03-25",
                "amount": 145250.00
            },
            {
                "id": "2",
                "type": "EMP201",
                "description": "PAYE/UIF/SDL Monthly Declaration",
                "frequency": "Monthly",
                "next_due": "2026-03-07",
                "status": "PENDING",
                "tax_type": "Employees Tax (PAYE)",
                "period": "February 2026",
                "due_date": "2026-03-07",
                "amount": 63290.00
            },
            {
                "id": "3",
                "type": "EMP201",
                "description": "PAYE/UIF/SDL Monthly Declaration",
                "frequency": "Monthly",
                "next_due": "2026-02-07",
                "status": "PAID",
                "tax_type": "Employees Tax (PAYE)",
                "period": "January 2026",
                "due_date": "2026-02-07",
                "amount": 61450.00
            },
            {
                "id": "4",
                "type": "VAT201",
                "description": "VAT Return - January 2026",
                "frequency": "Monthly",
                "next_due": "2026-02-25",
                "status": "FILED",
                "tax_type": "Value Added Tax",
                "period": "January 2026",
                "due_date": "2026-02-25",
                "amount": 138950.00
            },
            {
                "id": "5",
                "type": "IRP6",
                "description": "Provisional Tax - 2nd Payment",
                "frequency": "Bi-annually",
                "next_due": "2026-02-28",
                "status": "PAID",
                "tax_type": "Company Income Tax",
                "period": "2025/2026 Tax Year",
                "due_date": "2026-02-28",
                "amount": 425000.00
            },
            {
                "id": "6",
                "type": "EMP501",
                "description": "Annual Reconciliation Declaration",
                "frequency": "Annually",
                "next_due": "2026-05-31",
                "status": "PENDING",
                "tax_type": "Annual Tax Reconciliation",
                "period": "March 2025 - February 2026",
                "due_date": "2026-05-31",
                "amount": 735600.00
            },
            {
                "id": "7",
                "type": "IT14",
                "description": "Company Income Tax Return",
                "frequency": "Annually",
                "next_due": "2026-10-31",
                "status": "PENDING",
                "tax_type": "Company Income Tax",
                "period": "2025 Financial Year",
                "due_date": "2026-10-31",
                "amount": 1250000.00
            },
            {
                "id": "8",
                "type": "DWT",
                "description": "Dividends Tax Payment",
                "frequency": "As applicable",
                "next_due": "2026-03-31",
                "status": "PENDING",
                "tax_type": "Dividends Tax",
                "period": "Q4 2025 Distribution",
                "due_date": "2026-03-31",
                "amount": 85000.00
            },
            {
                "id": "9",
                "type": "UIF",
                "description": "Unemployment Insurance Fund",
                "frequency": "Monthly",
                "next_due": "2026-03-07",
                "status": "PENDING",
                "tax_type": "UIF Contributions",
                "period": "February 2026",
                "due_date": "2026-03-07",
                "amount": 2770.00
            },
            {
                "id": "10",
                "type": "SDL",
                "description": "Skills Development Levy",
                "frequency": "Monthly",
                "next_due": "2026-03-07",
                "status": "PENDING",
                "tax_type": "Skills Development Levy",
                "period": "February 2026",
                "due_date": "2026-03-07",
                "amount": 2770.00
            },
            {
                "id": "11",
                "type": "VAT201",
                "description": "VAT Return - December 2025",
                "frequency": "Monthly",
                "next_due": "2026-01-25",
                "status": "PAID",
                "tax_type": "Value Added Tax",
                "period": "December 2025",
                "due_date": "2026-01-25",
                "amount": 152300.00
            },
            {
                "id": "12",
                "type": "IRP6",
                "description": "Provisional Tax - 1st Payment",
                "frequency": "Bi-annually",
                "next_due": "2025-08-31",
                "status": "PAID",
                "tax_type": "Company Income Tax",
                "period": "2025/2026 Tax Year",
                "due_date": "2025-08-31",
                "amount": 425000.00
            }
        ]
    }

@app.get("/bots")
@app.get("/api/bots")
@app.get("/api/v1/bots")
async def get_bots():
    """Get comprehensive bot registry - ARIA's 109 AI Agents for SA business"""
    return {
        "bots": [
            # Financial Management (11 bots)
            {"id": "accounts_payable", "name": "Accounts Payable Bot", "category": "Financial", "description": "Automates AP processing, invoice validation, and approval workflows", "status": "active"},
            {"id": "ar_collections", "name": "AR Collections Bot", "category": "Financial", "description": "Manages receivables, collections, and payment reminders", "status": "active"},
            {"id": "bank_reconciliation", "name": "Bank Reconciliation Bot", "category": "Financial", "description": "Automatic bank statement reconciliation for SA banks (FNB, Nedbank, Standard Bank)", "status": "active"},
            {"id": "expense_management", "name": "Expense Management Bot", "category": "Financial", "description": "Employee expense processing, approval, and reimbursement", "status": "active"},
            {"id": "financial_close", "name": "Financial Close Bot", "category": "Financial", "description": "Period-end close automation and reconciliation", "status": "active"},
            {"id": "financial_reporting", "name": "Financial Reporting Bot", "category": "Financial", "description": "Automated financial report generation and distribution", "status": "active"},
            {"id": "general_ledger", "name": "General Ledger Bot", "category": "Financial", "description": "GL posting, journal entries, and account management", "status": "active"},
            {"id": "invoice_reconciliation", "name": "Invoice Reconciliation Bot", "category": "Financial", "description": "Invoice matching, reconciliation, and discrepancy resolution", "status": "active"},
            {"id": "payment_processing", "name": "Payment Processing Bot", "category": "Financial", "description": "Automated payment processing and batch runs for SA banking", "status": "active"},
            {"id": "tax_compliance", "name": "Tax Compliance Bot", "category": "Financial", "description": "SARS tax compliance (VAT201, EMP201, PAYE, UIF, SDL)", "status": "active"},
            {"id": "bbbee_compliance", "name": "B-BBEE Compliance Bot", "category": "Financial", "description": "B-BBEE scorecard tracking and reporting for SA businesses", "status": "active"},
            
            # Procurement & Supply Chain (10 bots)
            {"id": "purchase_order", "name": "Purchase Order Bot", "category": "Procurement", "description": "PO creation, approval, and tracking", "status": "active"},
            {"id": "supplier_management", "name": "Supplier Management Bot", "category": "Procurement", "description": "Vendor master data and relationship management", "status": "active"},
            {"id": "supplier_performance", "name": "Supplier Performance Bot", "category": "Procurement", "description": "Supplier KPI tracking and scorecards", "status": "active"},
            {"id": "supplier_risk", "name": "Supplier Risk Bot", "category": "Procurement", "description": "Supply chain risk assessment and monitoring", "status": "active"},
            {"id": "rfq_management", "name": "RFQ Management Bot", "category": "Procurement", "description": "RFQ/RFP creation, distribution, and evaluation", "status": "active"},
            {"id": "procurement_analytics", "name": "Procurement Analytics Bot", "category": "Procurement", "description": "Procurement insights and spend analytics", "status": "active"},
            {"id": "spend_analysis", "name": "Spend Analysis Bot", "category": "Procurement", "description": "Spend visibility and category analysis", "status": "active"},
            {"id": "source_to_pay", "name": "Source-to-Pay Bot", "category": "Procurement", "description": "End-to-end S2P process automation", "status": "active"},
            {"id": "goods_receipt", "name": "Goods Receipt Bot", "category": "Procurement", "description": "Goods receipt processing and 3-way matching", "status": "active"},
            {"id": "inventory_optimization", "name": "Inventory Optimization Bot", "category": "Procurement", "description": "Inventory level optimization and reorder points", "status": "active"},
            
            # Manufacturing & Operations (11 bots)
            {"id": "production_scheduling", "name": "Production Scheduling Bot", "category": "Manufacturing", "description": "Production planning and schedule optimization", "status": "active"},
            {"id": "production_reporting", "name": "Production Reporting Bot", "category": "Manufacturing", "description": "Shop floor reporting and production metrics", "status": "active"},
            {"id": "work_order", "name": "Work Order Bot", "category": "Manufacturing", "description": "Work order creation, tracking, and completion", "status": "active"},
            {"id": "quality_control", "name": "Quality Control Bot", "category": "Manufacturing", "description": "QC inspection automation and defect tracking", "status": "active"},
            {"id": "downtime_tracking", "name": "Downtime Tracking Bot", "category": "Manufacturing", "description": "Equipment downtime tracking and analysis", "status": "active"},
            {"id": "maintenance_scheduling", "name": "Maintenance Scheduling Bot", "category": "Manufacturing", "description": "Preventive maintenance planning and execution", "status": "active"},
            {"id": "bom_management", "name": "BOM Management Bot", "category": "Manufacturing", "description": "Bill of materials creation and lifecycle management", "status": "active"},
            {"id": "capacity_planning", "name": "Capacity Planning Bot", "category": "Manufacturing", "description": "Production capacity planning and utilization", "status": "active"},
            {"id": "material_requirements", "name": "Material Requirements Bot", "category": "Manufacturing", "description": "MRP calculation and material planning", "status": "active"},
            {"id": "shop_floor_control", "name": "Shop Floor Control Bot", "category": "Manufacturing", "description": "Real-time shop floor monitoring and control", "status": "active"},
            {"id": "yield_optimization", "name": "Yield Optimization Bot", "category": "Manufacturing", "description": "Production yield analysis and improvement", "status": "active"},
            
            # Human Resources (15 bots)
            {"id": "employee_onboarding", "name": "Employee Onboarding Bot", "category": "Human Resources", "description": "New hire onboarding automation and compliance", "status": "active"},
            {"id": "leave_management", "name": "Leave Management Bot", "category": "Human Resources", "description": "Leave request processing and approval workflows", "status": "active"},
            {"id": "payroll_processing", "name": "Payroll Processing Bot", "category": "Human Resources", "description": "Automated payroll processing with PAYE/UIF/SDL calculations", "status": "active"},
            {"id": "performance_reviews", "name": "Performance Reviews Bot", "category": "Human Resources", "description": "Performance review cycle management and tracking", "status": "active"},
            {"id": "recruitment", "name": "Recruitment Bot", "category": "Human Resources", "description": "Candidate screening, interview scheduling, and tracking", "status": "active"},
            {"id": "timesheet_approval", "name": "Timesheet Approval Bot", "category": "Human Resources", "description": "Timesheet submission, approval, and validation", "status": "active"},
            {"id": "employee_offboarding", "name": "Employee Offboarding Bot", "category": "Human Resources", "description": "Exit process automation and asset recovery", "status": "active"},
            {"id": "benefits_administration", "name": "Benefits Administration Bot", "category": "Human Resources", "description": "Employee benefits enrollment and management", "status": "active"},
            {"id": "skills_management", "name": "Skills Management Bot", "category": "Human Resources", "description": "Skills inventory and gap analysis", "status": "active"},
            {"id": "training_management", "name": "Training Management Bot", "category": "Human Resources", "description": "Training program scheduling and tracking", "status": "active"},
            {"id": "compensation_review", "name": "Compensation Review Bot", "category": "Human Resources", "description": "Salary review cycles and equity analysis", "status": "active"},
            {"id": "shift_scheduling", "name": "Shift Scheduling Bot", "category": "Human Resources", "description": "Employee shift planning and optimization", "status": "active"},
            {"id": "employee_self_service", "name": "Employee Self-Service Bot", "category": "Human Resources", "description": "Employee queries and self-service automation", "status": "active"},
            {"id": "compliance_training", "name": "Compliance Training Bot", "category": "Human Resources", "description": "Mandatory compliance training tracking", "status": "active"},
            {"id": "ee_compliance", "name": "Employment Equity Bot", "category": "Human Resources", "description": "SA Employment Equity Act compliance and reporting", "status": "active"},
            
            # Sales & Marketing (12 bots)
            {"id": "lead_qualification", "name": "Lead Qualification Bot", "category": "Sales", "description": "Lead scoring and qualification automation", "status": "active"},
            {"id": "quote_generation", "name": "Quote Generation Bot", "category": "Sales", "description": "Automated quote creation and pricing", "status": "active"},
            {"id": "order_processing", "name": "Order Processing Bot", "category": "Sales", "description": "Sales order entry and validation", "status": "active"},
            {"id": "customer_onboarding", "name": "Customer Onboarding Bot", "category": "Sales", "description": "New customer setup and FICA compliance", "status": "active"},
            {"id": "sales_forecasting", "name": "Sales Forecasting Bot", "category": "Sales", "description": "AI-powered sales forecasting and pipeline analysis", "status": "active"},
            {"id": "contract_management", "name": "Contract Management Bot", "category": "Sales", "description": "Contract lifecycle management and renewals", "status": "active"},
            {"id": "pricing_optimization", "name": "Pricing Optimization Bot", "category": "Sales", "description": "Dynamic pricing and discount management", "status": "active"},
            {"id": "crm_enrichment", "name": "CRM Enrichment Bot", "category": "Sales", "description": "Customer data enrichment and deduplication", "status": "active"},
            {"id": "email_campaigns", "name": "Email Campaign Bot", "category": "Sales", "description": "Automated email marketing campaigns", "status": "active"},
            {"id": "territory_management", "name": "Territory Management Bot", "category": "Sales", "description": "Sales territory planning and assignment", "status": "active"},
            {"id": "commission_calculation", "name": "Commission Calculation Bot", "category": "Sales", "description": "Sales commission calculation and reporting", "status": "active"},
            {"id": "customer_churn", "name": "Customer Churn Bot", "category": "Sales", "description": "Churn prediction and retention campaigns", "status": "active"},
            
            # Customer Service (8 bots)
            {"id": "ticket_routing", "name": "Ticket Routing Bot", "category": "Customer Service", "description": "Support ticket classification and routing", "status": "active"},
            {"id": "case_management", "name": "Case Management Bot", "category": "Customer Service", "description": "Service case tracking and escalation", "status": "active"},
            {"id": "returns_processing", "name": "Returns Processing Bot", "category": "Customer Service", "description": "RMA and returns automation", "status": "active"},
            {"id": "customer_feedback", "name": "Customer Feedback Bot", "category": "Customer Service", "description": "Feedback collection and sentiment analysis", "status": "active"},
            {"id": "warranty_management", "name": "Warranty Management Bot", "category": "Customer Service", "description": "Warranty claim processing and validation", "status": "active"},
            {"id": "knowledge_base", "name": "Knowledge Base Bot", "category": "Customer Service", "description": "Automated knowledge article suggestions", "status": "active"},
            {"id": "sla_monitoring", "name": "SLA Monitoring Bot", "category": "Customer Service", "description": "Service level agreement tracking and alerts", "status": "active"},
            {"id": "customer_satisfaction", "name": "Customer Satisfaction Bot", "category": "Customer Service", "description": "CSAT and NPS survey automation", "status": "active"},
            
            # IT & Technology (10 bots)
            {"id": "it_helpdesk", "name": "IT Helpdesk Bot", "category": "IT Operations", "description": "IT support ticket automation and resolution", "status": "active"},
            {"id": "asset_management", "name": "Asset Management Bot", "category": "IT Operations", "description": "IT asset tracking and lifecycle management", "status": "active"},
            {"id": "software_licensing", "name": "Software Licensing Bot", "category": "IT Operations", "description": "Software license compliance and management", "status": "active"},
            {"id": "access_provisioning", "name": "Access Provisioning Bot", "category": "IT Operations", "description": "User access requests and provisioning", "status": "active"},
            {"id": "backup_monitoring", "name": "Backup Monitoring Bot", "category": "IT Operations", "description": "Backup job monitoring and verification", "status": "active"},
            {"id": "security_compliance", "name": "Security Compliance Bot", "category": "IT Operations", "description": "Security policy compliance and auditing", "status": "active"},
            {"id": "change_management", "name": "Change Management Bot", "category": "IT Operations", "description": "IT change request workflow automation", "status": "active"},
            {"id": "incident_management", "name": "Incident Management Bot", "category": "IT Operations", "description": "IT incident tracking and resolution", "status": "active"},
            {"id": "patch_management", "name": "Patch Management Bot", "category": "IT Operations", "description": "System patching automation and compliance", "status": "active"},
            {"id": "network_monitoring", "name": "Network Monitoring Bot", "category": "IT Operations", "description": "Network health monitoring and alerts", "status": "active"},
            
            # Document Management (10 bots)
            {"id": "document_classification", "name": "Document Classification Bot", "category": "Document Management", "description": "AI-powered document classification and tagging", "status": "active"},
            {"id": "ocr_processing", "name": "OCR Processing Bot", "category": "Document Management", "description": "Document scanning and text extraction", "status": "active"},
            {"id": "invoice_extraction", "name": "Invoice Extraction Bot", "category": "Document Management", "description": "Invoice data extraction and validation", "status": "active"},
            {"id": "po_extraction", "name": "PO Extraction Bot", "category": "Document Management", "description": "Purchase order data extraction", "status": "active"},
            {"id": "contract_extraction", "name": "Contract Extraction Bot", "category": "Document Management", "description": "Contract clause extraction and analysis", "status": "active"},
            {"id": "document_routing", "name": "Document Routing Bot", "category": "Document Management", "description": "Intelligent document routing and approval", "status": "active"},
            {"id": "retention_management", "name": "Retention Management Bot", "category": "Document Management", "description": "Document retention policy enforcement", "status": "active"},
            {"id": "version_control", "name": "Version Control Bot", "category": "Document Management", "description": "Document version tracking and management", "status": "active"},
            {"id": "archive_management", "name": "Archive Management Bot", "category": "Document Management", "description": "Document archiving and retrieval", "status": "active"},
            {"id": "duplicate_detection", "name": "Duplicate Detection Bot", "category": "Document Management", "description": "Duplicate document detection and consolidation", "status": "active"},
            
            # Compliance & Legal (8 bots)
            {"id": "audit_trail", "name": "Audit Trail Bot", "category": "Compliance", "description": "Comprehensive audit trail and reporting", "status": "active"},
            {"id": "popia_compliance", "name": "POPIA Compliance Bot", "category": "Compliance", "description": "Protection of Personal Information Act compliance", "status": "active"},
            {"id": "fica_compliance", "name": "FICA Compliance Bot", "category": "Compliance", "description": "Financial Intelligence Centre Act KYC automation", "status": "active"},
            {"id": "contract_review", "name": "Contract Review Bot", "category": "Compliance", "description": "Legal contract review and risk assessment", "status": "active"},
            {"id": "regulatory_reporting", "name": "Regulatory Reporting Bot", "category": "Compliance", "description": "Automated regulatory report generation", "status": "active"},
            {"id": "risk_assessment", "name": "Risk Assessment Bot", "category": "Compliance", "description": "Enterprise risk assessment and monitoring", "status": "active"},
            {"id": "policy_management", "name": "Policy Management Bot", "category": "Compliance", "description": "Corporate policy distribution and acknowledgment", "status": "active"},
            {"id": "legal_hold", "name": "Legal Hold Bot", "category": "Compliance", "description": "Litigation hold management and tracking", "status": "active"},
            
            # Analytics & Business Intelligence (14 bots)
            {"id": "financial_analytics", "name": "Financial Analytics Bot", "category": "Analytics", "description": "Advanced financial analysis and insights", "status": "active"},
            {"id": "sales_analytics", "name": "Sales Analytics Bot", "category": "Analytics", "description": "Sales performance analysis and reporting", "status": "active"},
            {"id": "supply_chain_analytics", "name": "Supply Chain Analytics Bot", "category": "Analytics", "description": "Supply chain metrics and optimization", "status": "active"},
            {"id": "customer_analytics", "name": "Customer Analytics Bot", "category": "Analytics", "description": "Customer behavior analysis and segmentation", "status": "active"},
            {"id": "inventory_analytics", "name": "Inventory Analytics Bot", "category": "Analytics", "description": "Inventory turnover and optimization analytics", "status": "active"},
            {"id": "workforce_analytics", "name": "Workforce Analytics Bot", "category": "Analytics", "description": "HR metrics and workforce planning", "status": "active"},
            {"id": "cashflow_forecasting", "name": "Cashflow Forecasting Bot", "category": "Analytics", "description": "AI-powered cashflow prediction", "status": "active"},
            {"id": "demand_forecasting", "name": "Demand Forecasting Bot", "category": "Analytics", "description": "Demand planning and forecasting", "status": "active"},
            {"id": "profitability_analysis", "name": "Profitability Analysis Bot", "category": "Analytics", "description": "Product and customer profitability analysis", "status": "active"},
            {"id": "budget_variance", "name": "Budget Variance Bot", "category": "Analytics", "description": "Budget vs actual variance analysis", "status": "active"},
            {"id": "kpi_monitoring", "name": "KPI Monitoring Bot", "category": "Analytics", "description": "Real-time KPI tracking and alerts", "status": "active"},
            {"id": "dashboard_generation", "name": "Dashboard Generation Bot", "category": "Analytics", "description": "Automated executive dashboard creation", "status": "active"},
            {"id": "trend_analysis", "name": "Trend Analysis Bot", "category": "Analytics", "description": "Historical trend analysis and pattern detection", "status": "active"},
            {"id": "anomaly_detection", "name": "Anomaly Detection Bot", "category": "Analytics", "description": "Business anomaly detection and alerting", "status": "active"}
        ],
        "total": 109,
        "categories": {
            "Financial": 11,
            "Procurement": 10,
            "Manufacturing": 11,
            "Human Resources": 15,
            "Sales": 12,
            "Customer Service": 8,
            "IT Operations": 10,
            "Document Management": 10,
            "Compliance": 8,
            "Analytics": 14
        }
    }

@app.get("/erp/procure-to-pay/purchase-orders")
@app.get("/api/v1/erp/procure-to-pay/purchase-orders")
async def get_purchase_orders():
    """Get purchase orders"""
    return {
        "orders": [
            {
                "id": 1,
                "poNumber": "PO-2026-001",
                "supplier": "ABC Supplies Ltd",
                "supplierId": 1,
                "orderDate": "2026-02-20",
                "deliveryDate": "2026-03-05",
                "status": "Approved",
                "totalAmount": 15750.00,
                "currency": "ZAR",
                "items": 3,
                "createdBy": "Admin User"
            },
            {
                "id": 2,
                "poNumber": "PO-2026-002",
                "supplier": "Tech Equipment Co",
                "supplierId": 2,
                "orderDate": "2026-02-18",
                "deliveryDate": "2026-02-28",
                "status": "Pending Approval",
                "totalAmount": 42500.00,
                "currency": "ZAR",
                "items": 5,
                "createdBy": "Sarah Johnson"
            },
            {
                "id": 3,
                "poNumber": "PO-2026-003",
                "supplier": "Office Furniture Plus",
                "supplierId": 3,
                "orderDate": "2026-02-15",
                "deliveryDate": "2026-02-25",
                "status": "Delivered",
                "totalAmount": 28900.00,
                "currency": "ZAR",
                "items": 4,
                "createdBy": "Michael Chen"
            }
        ],
        "total": 3,
        "page": 1,
        "pageSize": 50
    }

@app.get("/erp/master-data/suppliers")
@app.get("/api/v1/erp/master-data/suppliers")
async def get_suppliers():
    """Get suppliers"""
    return {
        "suppliers": [
            {
                "id": 1,
                "code": "SUP-001",
                "name": "ABC Supplies Ltd",
                "contactPerson": "John Smith",
                "email": "john@abcsupplies.co.za",
                "phone": "+27 11 555 1234",
                "address": "123 Industrial Road, Johannesburg",
                "status": "Active",
                "paymentTerms": "Net 30",
                "currency": "ZAR"
            },
            {
                "id": 2,
                "code": "SUP-002",
                "name": "Tech Equipment Co",
                "contactPerson": "Mary Jones",
                "email": "mary@techequip.co.za",
                "phone": "+27 21 555 5678",
                "address": "456 Tech Park, Cape Town",
                "status": "Active",
                "paymentTerms": "Net 60",
                "currency": "ZAR"
            },
            {
                "id": 3,
                "code": "SUP-003",
                "name": "Office Furniture Plus",
                "contactPerson": "David Lee",
                "email": "david@officefurniture.co.za",
                "phone": "+27 31 555 9012",
                "address": "789 Commerce Street, Durban",
                "status": "Active",
                "paymentTerms": "Net 45",
                "currency": "ZAR"
            }
        ],
        "total": 3
    }

@app.get("/vendors")  
@app.get("/api/v1/vendors")
async def get_vendors():
    """Get vendors (alias for suppliers)"""
    return await get_suppliers()

@app.post("/ask-aria/session")
@app.post("/api/v1/ask-aria/session")
async def create_aria_session():
    """Create new Ask Aria chat session"""
    import secrets
    session_id = secrets.token_urlsafe(16)
    return {
        "sessionId": session_id,
        "createdAt": "2026-02-22T10:00:00Z",
        "status": "active",
        "greeting": "Hi! I'm Aria, your AI assistant. How can I help you today?"
    }

@app.post("/ask-aria/message")
@app.post("/api/v1/ask-aria/message")
async def send_aria_message(message: dict):
    """Send message to Ask Aria"""
    user_message = message.get("message", "")
    
    # Simple responses based on keywords
    response_text = "I understand your question. As a demo, I can help with basic ERP queries. Try asking about invoices, employees, or inventory!"
    
    if "invoice" in user_message.lower():
        response_text = "I can help you with invoices! You currently have several pending invoices. Would you like to see the invoice list or create a new one?"
    elif "employee" in user_message.lower() or "hr" in user_message.lower():
        response_text = "For HR and employee questions, I can show you employee records, leave balances, and payroll information. What would you like to know?"
    elif "inventory" in user_message.lower() or "stock" in user_message.lower():
        response_text = "I can help with inventory management! You have 3 products in stock. Would you like to see stock levels or product details?"
    elif "help" in user_message.lower():
        response_text = "I can assist with: Finance (invoices, payments), HR (employees, payroll), Inventory (stock levels), and Procurement (purchase orders). What would you like to explore?"
    
    return {
        "response": response_text,
        "timestamp": "2026-02-22T10:00:00Z",
        "suggestions": [
            "Show me pending invoices",
            "List all employees",
            "Check inventory levels",
            "View purchase orders"
        ]
    }

@app.get("/bi/dashboard/executive")
@app.get("/api/v1/bi/dashboard/executive")
async def get_bi_executive_dashboard():
    """Get BI Executive Dashboard data"""
    return {
        "summary": {
            "revenue_ytd": 4500000,
            "revenue_month": 1250000,
            "ar_outstanding": 40000,
            "ar_overdue": 15000,
            "ap_outstanding": 30000,
            "net_position": 150000
        },
        "counts": {
            "customers": 156,
            "suppliers": 45,
            "products": 328
        },
        "activity_this_month": {
            "sales_orders": {"count": 45, "value": 1350000},
            "purchase_orders": {"count": 32, "value": 850000},
            "invoices": {"count": 52, "value": 1250000}
        },
        "top_customers": [
            {"name": "Acme Corporation", "revenue": 650000},
            {"name": "TechSoft Solutions", "revenue": 480000},
            {"name": "Retail Mart SA", "revenue": 420000},
            {"name": "Global Industries", "revenue": 380000},
            {"name": "Prime Logistics", "revenue": 320000}
        ],
        "top_products": [
            {"name": "Standing Desk", "sales": 156000},
            {"name": "Office Chair Premium", "sales": 112500},
            {"name": "Desk Lamp LED", "sales": 54000},
            {"name": "Monitor Stand", "sales": 48000},
            {"name": "Cable Organizer", "sales": 32000}
        ]
    }

@app.get("/bi/reports/profit-loss")
@app.get("/api/v1/bi/reports/profit-loss")
async def get_profit_loss_report(start_date: str = None, end_date: str = None):
    """Get Profit & Loss Report"""
    return {
        "period": {
            "start_date": start_date or "2025-12-31",
            "end_date": end_date or "2026-02-23"
        },
        "revenue": {
            "sales_revenue": 1250000,
            "service_revenue": 150000,
            "other_revenue": 25000,
            "total_revenue": 1425000
        },
        "cost_of_goods_sold": {
            "direct_materials": 420000,
            "direct_labor": 180000,
            "manufacturing_overhead": 100000,
            "total_cogs": 700000
        },
        "gross_profit": 725000,
        "gross_profit_margin": 50.88,
        "operating_expenses": {
            "salaries_wages": 250000,
            "rent_utilities": 45000,
            "marketing_advertising": 35000,
            "depreciation": 20000,
            "insurance": 15000,
            "office_supplies": 8000,
            "professional_fees": 12000,
            "other_expenses": 10000,
            "total_operating_expenses": 395000
        },
        "operating_income": 330000,
        "operating_margin": 23.16,
        "other_income_expenses": {
            "interest_income": 5000,
            "interest_expense": -8000,
            "foreign_exchange_gain": 2000,
            "total_other": -1000
        },
        "net_income_before_tax": 329000,
        "income_tax": 91720,
        "net_income": 237280,
        "net_profit_margin": 16.65
    }

@app.get("/bi/reports/balance-sheet")
@app.get("/api/v1/bi/reports/balance-sheet")
async def get_balance_sheet_report(as_of_date: str = None):
    """Get Balance Sheet Report"""
    return {
        "as_of_date": as_of_date or "2026-02-23",
        "assets": {
            "current_assets": {
                "cash_bank": 150000,
                "accounts_receivable": 40000,
                "inventory": 85000,
                "prepaid_expenses": 12000,
                "other_current_assets": 8000,
                "total_current_assets": 295000
            },
            "non_current_assets": {
                "property_plant_equipment": 500000,
                "accumulated_depreciation": -120000,
                "net_ppe": 380000,
                "intangible_assets": 50000,
                "long_term_investments": 100000,
                "other_non_current_assets": 25000,
                "total_non_current_assets": 555000
            },
            "total_assets": 850000
        },
        "liabilities": {
            "current_liabilities": {
                "accounts_payable": 30000,
                "short_term_debt": 15000,
                "accrued_expenses": 22000,
                "unearned_revenue": 8000,
                "other_current_liabilities": 5000,
                "total_current_liabilities": 80000
            },
            "non_current_liabilities": {
                "long_term_debt": 150000,
                "deferred_tax_liability": 20000,
                "other_non_current_liabilities": 10000,
                "total_non_current_liabilities": 180000
            },
            "total_liabilities": 260000
        },
        "equity": {
            "share_capital": 300000,
            "retained_earnings": 250000,
            "current_year_profit": 40000,
            "total_equity": 590000
        },
        "total_liabilities_equity": 850000,
        "ratios": {
            "current_ratio": 3.69,
            "quick_ratio": 2.63,
            "debt_to_equity": 0.44,
            "working_capital": 215000
        }
    }

@app.get("/bi/reports/cash-flow")
@app.get("/api/v1/bi/reports/cash-flow")
async def get_cash_flow_report(start_date: str = None, end_date: str = None):
    """Get Cash Flow Statement"""
    return {
        "period": {
            "start_date": start_date or "2025-12-31",
            "end_date": end_date or "2026-02-23"
        },
        "operating_activities": {
            "net_income": 237280,
            "adjustments": {
                "depreciation_amortization": 20000,
                "changes_in_working_capital": {
                    "accounts_receivable": -5000,
                    "inventory": -15000,
                    "accounts_payable": 8000,
                    "accrued_expenses": 3000,
                    "total_working_capital_change": -9000
                },
                "other_adjustments": 2000,
                "total_adjustments": 13000
            },
            "net_cash_from_operating": 250280
        },
        "investing_activities": {
            "purchase_ppe": -50000,
            "purchase_investments": -25000,
            "sale_of_assets": 10000,
            "other_investing": -5000,
            "net_cash_from_investing": -70000
        },
        "financing_activities": {
            "proceeds_from_debt": 30000,
            "repayment_of_debt": -45000,
            "dividends_paid": -80000,
            "share_issuance": 0,
            "other_financing": -2000,
            "net_cash_from_financing": -97000
        },
        "net_change_in_cash": 83280,
        "cash_beginning": 66720,
        "cash_ending": 150000,
        "free_cash_flow": 200280
    }

@app.get("/bi/reports/ar-aging")
@app.get("/api/v1/bi/reports/ar-aging")
async def get_ar_aging_report(as_of_date: str = None):
    """Get Accounts Receivable Aging Report"""
    return {
        "as_of_date": as_of_date or "2026-02-23",
        "summary": {
            "total_outstanding": 40000,
            "current": 20000,
            "days_30": 8000,
            "days_60": 7000,
            "days_90_plus": 5000
        },
        "by_customer": [
            {
                "customer_id": 1,
                "customer_name": "Acme Corporation",
                "total_outstanding": 25000,
                "current": 15000,
                "days_30": 5000,
                "days_60": 5000,
                "days_90_plus": 0,
                "contact_email": "accounts@acme.com",
                "contact_phone": "+27 11 123 4567"
            },
            {
                "customer_id": 2,
                "customer_name": "TechSoft Solutions",
                "total_outstanding": 10000,
                "current": 5000,
                "days_30": 3000,
                "days_60": 2000,
                "days_90_plus": 0,
                "contact_email": "billing@techsoft.co.za",
                "contact_phone": "+27 21 987 6543"
            },
            {
                "customer_id": 4,
                "customer_name": "Global Industries",
                "total_outstanding": 5000,
                "current": 0,
                "days_30": 0,
                "days_60": 0,
                "days_90_plus": 5000,
                "contact_email": "finance@globalind.co.za",
                "contact_phone": "+27 11 789 4561"
            }
        ],
        "invoices": [
            {
                "invoice_number": "INV-2026-001",
                "customer_name": "Acme Corporation",
                "invoice_date": "2026-02-15",
                "due_date": "2026-03-17",
                "amount": 15000,
                "days_overdue": 0,
                "aging_bucket": "current"
            },
            {
                "invoice_number": "INV-2026-002",
                "customer_name": "Acme Corporation",
                "invoice_date": "2026-01-20",
                "due_date": "2026-02-19",
                "amount": 5000,
                "days_overdue": 4,
                "aging_bucket": "current"
            },
            {
                "invoice_number": "INV-2026-003",
                "customer_name": "Acme Corporation",
                "invoice_date": "2026-01-05",
                "due_date": "2026-02-04",
                "amount": 5000,
                "days_overdue": 19,
                "aging_bucket": "30_days"
            },
            {
                "invoice_number": "INV-2025-125",
                "customer_name": "Global Industries",
                "invoice_date": "2025-11-01",
                "due_date": "2025-12-01",
                "amount": 5000,
                "days_overdue": 84,
                "aging_bucket": "90_plus"
            }
        ]
    }

@app.get("/bi/reports/ap-aging")
@app.get("/api/v1/bi/reports/ap-aging")
async def get_ap_aging_report(as_of_date: str = None):
    """Get Accounts Payable Aging Report"""
    return {
        "as_of_date": as_of_date or "2026-02-23",
        "summary": {
            "total_outstanding": 30000,
            "current": 18000,
            "days_30": 7000,
            "days_60": 3000,
            "days_90_plus": 2000
        },
        "by_supplier": [
            {
                "supplier_id": 1,
                "supplier_name": "ABC Supplies Ltd",
                "total_outstanding": 15000,
                "current": 10000,
                "days_30": 5000,
                "days_60": 0,
                "days_90_plus": 0,
                "contact_email": "john@abcsupplies.co.za",
                "contact_phone": "+27 11 555 1234"
            },
            {
                "supplier_id": 2,
                "supplier_name": "Tech Equipment Co",
                "total_outstanding": 10000,
                "current": 8000,
                "days_30": 2000,
                "days_60": 0,
                "days_90_plus": 0,
                "contact_email": "mary@techequip.co.za",
                "contact_phone": "+27 21 555 5678"
            },
            {
                "supplier_id": 3,
                "supplier_name": "Office Furniture Plus",
                "total_outstanding": 5000,
                "current": 0,
                "days_30": 0,
                "days_60": 3000,
                "days_90_plus": 2000,
                "contact_email": "david@officefurniture.co.za",
                "contact_phone": "+27 31 555 9012"
            }
        ],
        "bills": [
            {
                "bill_number": "BILL-2026-015",
                "supplier_name": "ABC Supplies Ltd",
                "bill_date": "2026-02-18",
                "due_date": "2026-03-20",
                "amount": 10000,
                "days_overdue": 0,
                "aging_bucket": "current"
            },
            {
                "bill_number": "BILL-2026-012",
                "supplier_name": "ABC Supplies Ltd",
                "bill_date": "2026-01-20",
                "due_date": "2026-02-19",
                "amount": 5000,
                "days_overdue": 4,
                "aging_bucket": "current"
            },
            {
                "bill_number": "BILL-2025-180",
                "supplier_name": "Office Furniture Plus",
                "bill_date": "2025-11-15",
                "due_date": "2025-12-15",
                "amount": 2000,
                "days_overdue": 70,
                "aging_bucket": "60_days"
            }
        ]
    }

# ============================================================================
# AP PAYMENTS ENDPOINTS
# ============================================================================

@app.get("/ap/payments")
@app.get("/api/v1/ap/payments")
async def get_ap_payments():
    """Get all supplier payments"""
    return {
        "payments": [
            {
                "id": 1,
                "payment_number": "PMT-2026-001",
                "supplier_name": "ABC Supplies Ltd",
                "bill_number": "BILL-2026-005",
                "amount": 15000.00,
                "payment_date": "2026-02-20",
                "payment_method": "BANK_TRANSFER",
                "status": "CLEARED",
                "reference": "EFT-789456123",
                "bank_account": "FNB - ****3456",
                "created_at": "2026-02-20T10:15:00"
            },
            {
                "id": 2,
                "payment_number": "PMT-2026-002",
                "supplier_name": "Tech Equipment Co",
                "bill_number": "BILL-2026-008",
                "amount": 8500.50,
                "payment_date": "2026-02-21",
                "payment_method": "BANK_TRANSFER",
                "status": "PROCESSED",
                "reference": "EFT-789456124",
                "bank_account": "Standard Bank - ****7890",
                "created_at": "2026-02-21T14:30:00"
            },
            {
                "id": 3,
                "payment_number": "PMT-2026-003",
                "supplier_name": "Office Furniture Plus",
                "bill_number": "BILL-2026-011",
                "amount": 12000.00,
                "payment_date": "2026-02-22",
                "payment_method": "CHEQUE",
                "status": "PENDING",
                "reference": "CHQ-001234",
                "bank_account": "Nedbank - ****2345",
                "created_at": "2026-02-22T09:00:00"
            },
            {
                "id": 4,
                "payment_number": "PMT-2026-004",
                "supplier_name": "Industrial Supplies SA",
                "bill_number": "BILL-2026-013",
                "amount": 5750.75,
                "payment_date": "2026-02-22",
                "payment_method": "BANK_TRANSFER",
                "status": "CLEARED",
                "reference": "EFT-789456125",
                "bank_account": "ABSA - ****5678",
                "created_at": "2026-02-22T11:45:00"
            },
            {
                "id": 5,
                "payment_number": "PMT-2026-005",
                "supplier_name": "Cape Town Distributors",
                "bill_number": "BILL-2026-015",
                "amount": 22500.00,
                "payment_date": "2026-02-23",
                "payment_method": "BANK_TRANSFER",
                "status": "PROCESSED",
                "reference": "EFT-789456126",
                "bank_account": "Capitec - ****9012",
                "created_at": "2026-02-23T08:30:00"
            },
            {
                "id": 6,
                "payment_number": "PMT-2026-006",
                "supplier_name": "Durban Wholesale Traders",
                "bill_number": "BILL-2026-017",
                "amount": 3200.50,
                "payment_date": "2026-02-23",
                "payment_method": "CASH",
                "status": "CLEARED",
                "reference": "CASH-2026-23-001",
                "bank_account": "Cash on Hand",
                "created_at": "2026-02-23T12:00:00"
            }
        ],
        "summary": {
            "total_payments": 6,
            "total_amount": 67950.75,
            "pending_count": 1,
            "processed_count": 2,
            "cleared_count": 3
        }
    }

@app.post("/ap/payments")
@app.post("/api/v1/ap/payments")
async def create_ap_payment(payment: dict):
    """Create a new supplier payment"""
    return {
        "id": 7,
        "payment_number": "PMT-2026-007",
        **payment,
        "status": payment.get("status", "PENDING"),
        "created_at": datetime.now().isoformat()
    }

@app.get("/ap/payments/{payment_id}")
@app.get("/api/v1/ap/payments/{payment_id}")
async def get_ap_payment(payment_id: int):
    """Get a specific supplier payment"""
    return {
        "id": payment_id,
        "payment_number": f"PMT-2026-{payment_id:03d}",
        "supplier_name": "ABC Supplies Ltd",
        "supplier_id": 1,
        "bill_number": f"BILL-2026-{payment_id+10:03d}",
        "bill_id": payment_id + 10,
        "amount": 15000.00,
        "payment_date": "2026-02-20",
        "payment_method": "BANK_TRANSFER",
        "status": "CLEARED",
        "reference": f"EFT-78945{payment_id+6120}",
        "bank_account": "FNB - ****3456",
        "notes": "Payment for office supplies",
        "approved_by": "John Smith",
        "approved_at": "2026-02-20T09:30:00",
        "created_by": "Finance Admin",
        "created_at": "2026-02-20T10:15:00",
        "updated_at": "2026-02-20T10:15:00"
    }

@app.put("/ap/payments/{payment_id}")
@app.put("/api/v1/ap/payments/{payment_id}")
async def update_ap_payment(payment_id: int, payment: dict):
    """Update a supplier payment"""
    return {
        "id": payment_id,
        "payment_number": payment.get("payment_number", f"PMT-2026-{payment_id:03d}"),
        **payment,
        "updated_at": datetime.now().isoformat()
    }

@app.delete("/ap/payments/{payment_id}")
@app.delete("/api/v1/ap/payments/{payment_id}")
async def delete_ap_payment(payment_id: int):
    """Delete a supplier payment"""
    return {"message": f"Payment {payment_id} deleted successfully"}

# ============================================================================
# AP INVOICES ENDPOINTS (Vendor Invoices)
# ============================================================================

@app.get("/ap/invoices")
@app.get("/api/v1/ap/invoices")
async def get_ap_invoices():
    """Get all vendor/supplier invoices"""
    return {
        "data": [
            {
                "id": 1,
                "invoice_number": "VINV-2026-001",
                "supplier_id": 1,
                "supplier_name": "ABC Supplies Ltd",
                "vendor_name": "ABC Supplies Ltd",
                "invoice_date": "2026-02-15",
                "due_date": "2026-03-17",
                "received_date": "2026-02-16",
                "po_number": "PO-2026-045",
                "vendor_reference": "ABC-INV-8932",
                "subtotal": 45000.00,
                "tax_amount": 6750.00,
                "discount_amount": 0,
                "total_amount": 51750.00,
                "amount_paid": 0,
                "amount_due": 51750.00,
                "status": "APPROVED",
                "currency": "ZAR",
                "description": "Office supplies and stationery",
                "notes": "Bulk order - quarterly supply",
                "created_at": "2026-02-16T09:30:00",
                "updated_at": "2026-02-16T14:20:00"
            },
            {
                "id": 2,
                "invoice_number": "VINV-2026-002",
                "supplier_id": 2,
                "supplier_name": "Tech Equipment Co",
                "vendor_name": "Tech Equipment Co",
                "invoice_date": "2026-02-18",
                "due_date": "2026-04-19",
                "received_date": "2026-02-19",
                "po_number": "PO-2026-052",
                "vendor_reference": "TEC-2026-1234",
                "subtotal": 125000.00,
                "tax_amount": 18750.00,
                "discount_amount": 2500.00,
                "total_amount": 141250.00,
                "amount_paid": 70000.00,
                "amount_due": 71250.00,
                "status": "POSTED",
                "currency": "ZAR",
                "description": "Computer hardware and networking equipment",
                "notes": "50% deposit paid",
                "created_at": "2026-02-19T10:15:00",
                "updated_at": "2026-02-20T11:45:00"
            },
            {
                "id": 3,
                "invoice_number": "VINV-2026-003",
                "supplier_id": 3,
                "supplier_name": "Office Furniture Plus",
                "vendor_name": "Office Furniture Plus",
                "invoice_date": "2026-02-20",
                "due_date": "2026-04-05",
                "received_date": "2026-02-21",
                "po_number": "PO-2026-058",
                "vendor_reference": "OFP-56789",
                "subtotal": 85000.00,
                "tax_amount": 12750.00,
                "discount_amount": 4250.00,
                "total_amount": 93500.00,
                "amount_paid": 0,
                "amount_due": 93500.00,
                "status": "PENDING",
                "currency": "ZAR",
                "description": "Ergonomic office furniture - desks and chairs",
                "notes": "5% early payment discount applied",
                "created_at": "2026-02-21T13:00:00",
                "updated_at": "2026-02-21T13:00:00"
            },
            {
                "id": 4,
                "invoice_number": "VINV-2026-004",
                "supplier_id": 1,
                "supplier_name": "ABC Supplies Ltd",
                "vendor_name": "ABC Supplies Ltd",
                "invoice_date": "2026-02-22",
                "due_date": "2026-03-24",
                "received_date": "2026-02-23",
                "po_number": "PO-2026-061",
                "vendor_reference": "ABC-INV-8945",
                "subtotal": 18500.00,
                "tax_amount": 2775.00,
                "discount_amount": 0,
                "total_amount": 21275.00,
                "amount_paid": 0,
                "amount_due": 21275.00,
                "status": "DRAFT",
                "currency": "ZAR",
                "description": "Printer toner and paper supplies",
                "notes": "Urgent delivery required",
                "created_at": "2026-02-23T08:45:00",
                "updated_at": "2026-02-23T08:45:00"
            },
            {
                "id": 5,
                "invoice_number": "VINV-2026-005",
                "supplier_id": 2,
                "supplier_name": "Tech Equipment Co",
                "vendor_name": "Tech Equipment Co",
                "invoice_date": "2026-01-28",
                "due_date": "2026-02-28",
                "received_date": "2026-01-29",
                "po_number": "PO-2026-032",
                "vendor_reference": "TEC-2026-0987",
                "subtotal": 32000.00,
                "tax_amount": 4800.00,
                "discount_amount": 0,
                "total_amount": 36800.00,
                "amount_paid": 36800.00,
                "amount_due": 0,
                "status": "PAID",
                "currency": "ZAR",
                "description": "Network switches and cabling",
                "notes": "Paid in full via EFT",
                "created_at": "2026-01-29T11:20:00",
                "updated_at": "2026-02-15T09:30:00"
            },
            {
                "id": 6,
                "invoice_number": "VINV-2025-098",
                "supplier_id": 3,
                "supplier_name": "Office Furniture Plus",
                "vendor_name": "Office Furniture Plus",
                "invoice_date": "2025-12-15",
                "due_date": "2026-01-30",
                "received_date": "2025-12-16",
                "po_number": "PO-2025-245",
                "vendor_reference": "OFP-54321",
                "subtotal": 12000.00,
                "tax_amount": 1800.00,
                "discount_amount": 0,
                "total_amount": 13800.00,
                "amount_paid": 0,
                "amount_due": 13800.00,
                "status": "OVERDUE",
                "currency": "ZAR",
                "description": "Conference room furniture",
                "notes": "Payment overdue - follow up required",
                "created_at": "2025-12-16T14:30:00",
                "updated_at": "2026-02-01T10:00:00"
            }
        ],
        "summary": {
            "total_invoices": 6,
            "total_amount": 358375.00,
            "total_paid": 106800.00,
            "total_outstanding": 251575.00,
            "overdue_count": 1,
            "overdue_amount": 13800.00
        }
    }

@app.post("/ap/invoices")
@app.post("/api/v1/ap/invoices")
async def create_ap_invoice(invoice: dict):
    """Create a new vendor invoice"""
    total = invoice.get("subtotal", 0) + invoice.get("tax_amount", 0) - invoice.get("discount_amount", 0)
    return {
        "id": 7,
        "invoice_number": "VINV-2026-007",
        **invoice,
        "total_amount": total,
        "amount_due": total,
        "status": invoice.get("status", "DRAFT"),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

@app.get("/ap/invoices/{invoice_id}")
@app.get("/api/v1/ap/invoices/{invoice_id}")
async def get_ap_invoice(invoice_id: int):
    """Get a specific vendor invoice"""
    return {
        "id": invoice_id,
        "invoice_number": f"VINV-2026-{invoice_id:03d}",
        "supplier_id": 1,
        "supplier_name": "ABC Supplies Ltd",
        "vendor_name": "ABC Supplies Ltd",
        "invoice_date": "2026-02-15",
        "due_date": "2026-03-17",
        "received_date": "2026-02-16",
        "po_number": "PO-2026-045",
        "vendor_reference": f"ABC-INV-{8900+invoice_id}",
        "subtotal": 45000.00,
        "tax_amount": 6750.00,
        "discount_amount": 0,
        "total_amount": 51750.00,
        "amount_paid": 0,
        "amount_due": 51750.00,
        "status": "APPROVED",
        "currency": "ZAR",
        "description": "Office supplies and stationery",
        "notes": "Bulk order - quarterly supply",
        "created_at": "2026-02-16T09:30:00",
        "updated_at": "2026-02-16T14:20:00"
    }

@app.put("/ap/invoices/{invoice_id}")
@app.put("/api/v1/ap/invoices/{invoice_id}")
async def update_ap_invoice(invoice_id: int, invoice: dict):
    """Update a vendor invoice"""
    total = invoice.get("subtotal", 0) + invoice.get("tax_amount", 0) - invoice.get("discount_amount", 0)
    return {
        "id": invoice_id,
        "invoice_number": invoice.get("invoice_number", f"VINV-2026-{invoice_id:03d}"),
        **invoice,
        "total_amount": total,
        "updated_at": datetime.now().isoformat()
    }

@app.delete("/ap/invoices/{invoice_id}")
@app.delete("/api/v1/ap/invoices/{invoice_id}")
async def delete_ap_invoice(invoice_id: int):
    """Delete a vendor invoice"""
    return {"message": f"Invoice {invoice_id} deleted successfully"}

@app.get("/bi/reports/sales-analytics")
@app.get("/api/v1/bi/reports/sales-analytics")
async def get_sales_analytics(start_date: str = None, end_date: str = None):
    """Get Sales Analytics Report"""
    return {
        "period": {
            "start_date": start_date or "2025-12-31",
            "end_date": end_date or "2026-02-23"
        },
        "summary": {
            "total_sales": 1250000,
            "total_orders": 45,
            "average_order_value": 27777.78,
            "total_customers": 156,
            "new_customers": 23,
            "repeat_customers": 133
        },
        "by_month": [
            {"month": "January", "sales": 850000, "orders": 28, "avg_order": 30357.14},
            {"month": "February", "sales": 400000, "orders": 17, "avg_order": 23529.41}
        ],
        "by_product_category": [
            {"category": "Furniture", "sales": 650000, "percentage": 52.0},
            {"category": "Electronics", "sales": 350000, "percentage": 28.0},
            {"category": "Office Supplies", "sales": 150000, "percentage": 12.0},
            {"category": "Other", "sales": 100000, "percentage": 8.0}
        ],
        "by_region": [
            {"region": "Gauteng", "sales": 650000, "orders": 23, "percentage": 52.0},
            {"region": "Western Cape", "sales": 350000, "orders": 12, "percentage": 28.0},
            {"region": "KwaZulu-Natal", "sales": 150000, "orders": 7, "percentage": 12.0},
            {"region": "Other", "sales": 100000, "orders": 3, "percentage": 8.0}
        ],
        "top_customers": [
            {"customer_name": "Acme Corporation", "sales": 250000, "orders": 8},
            {"customer_name": "TechSoft Solutions", "sales": 180000, "orders": 6},
            {"customer_name": "Retail Mart SA", "sales": 150000, "orders": 5},
            {"customer_name": "Global Industries", "sales": 120000, "orders": 4},
            {"customer_name": "Prime Logistics", "sales": 100000, "orders": 3}
        ],
        "top_products": [
            {"product_name": "Standing Desk", "quantity": 20, "sales": 156000},
            {"product_name": "Office Chair Premium", "quantity": 45, "sales": 112500},
            {"product_name": "Desk Lamp LED", "quantity": 120, "sales": 54000},
            {"product_name": "Monitor Stand", "quantity": 60, "sales": 48000},
            {"product_name": "Cable Organizer", "quantity": 200, "sales": 32000}
        ],
        "sales_trend": [
            {"date": "2026-01-01", "sales": 35000},
            {"date": "2026-01-08", "sales": 42000},
            {"date": "2026-01-15", "sales": 38000},
            {"date": "2026-01-22", "sales": 45000},
            {"date": "2026-01-29", "sales": 40000},
            {"date": "2026-02-05", "sales": 48000},
            {"date": "2026-02-12", "sales": 52000},
            {"date": "2026-02-19", "sales": 55000}
        ]
    }

@app.get("/bi/reports/procurement-analytics")
async def procurement_analytics(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get procurement analytics - PO fulfillment, spend by month/supplier"""
    return {
        "po_fulfillment": {
            "total_pos": 48,
            "received_pos": 42,
            "invoiced_pos": 38,
            "total_po_value": 876000
        },
        "spend_by_month": [
            {"month": "Dec 2025", "spend": 385000},
            {"month": "Jan 2026", "spend": 420000},
            {"month": "Feb 2026", "spend": 71000}
        ],
        "spend_by_supplier": [
            {"supplier_name": "ABC Supplies Ltd", "spend": 350000},
            {"supplier_name": "Tech Equipment Co", "spend": 245000},
            {"supplier_name": "Office Furniture Plus", "spend": 156000},
            {"supplier_name": "Warehouse Solutions", "spend": 65000},
            {"supplier_name": "IT Hardware Distributors", "spend": 35000},
            {"supplier_name": "Printing Services SA", "spend": 12000},
            {"supplier_name": "Cleaning Supplies Co", "spend": 8000},
            {"supplier_name": "Safety Equipment Ltd", "spend": 5000}
        ]
    }

@app.get("/bi/integrity/run")
async def run_integrity_checks():
    """Run data integrity checks on ERP data"""
    return {
        "summary": {
            "total_checks": 10,
            "passed": 7,
            "warnings": 2,
            "failed": 1,
            "overall_status": "warning"
        },
        "checks": [
            {
                "name": "Trial Balance Verification",
                "description": "Verify that Assets = Liabilities + Equity",
                "status": "pass",
                "details": {
                    "total_assets": 850000,
                    "total_liabilities": 260000,
                    "total_equity": 590000,
                    "difference": 0,
                    "balanced": True
                }
            },
            {
                "name": "Invoice Aging Accuracy",
                "description": "Check if invoice aging buckets are correctly calculated",
                "status": "pass",
                "details": {
                    "total_invoices_checked": 156,
                    "correctly_aged": 156,
                    "mismatched": 0
                }
            },
            {
                "name": "Inventory Valuation",
                "description": "Verify inventory stock quantities match financial records",
                "status": "pass",
                "details": {
                    "total_products": 3,
                    "physical_stock_value": 285000,
                    "financial_stock_value": 285000,
                    "variance": 0
                }
            },
            {
                "name": "Bank Reconciliation Status",
                "description": "Check if bank accounts are reconciled within last 30 days",
                "status": "warning",
                "details": {
                    "total_bank_accounts": 2,
                    "reconciled_recently": 1,
                    "overdue_reconciliation": 1,
                    "accounts_needing_attention": ["Savings Account - Last reconciled 45 days ago"]
                }
            },
            {
                "name": "Duplicate Invoice Numbers",
                "description": "Scan for duplicate invoice numbers across all invoices",
                "status": "pass",
                "details": {
                    "total_invoices": 156,
                    "duplicate_numbers": 0
                }
            },
            {
                "name": "Orphaned Transactions",
                "description": "Find transactions not linked to any invoice or bill",
                "status": "pass",
                "details": {
                    "total_transactions": 428,
                    "orphaned": 0
                }
            },
            {
                "name": "Tax Calculation Accuracy",
                "description": "Verify VAT calculations on all invoices (15% standard rate)",
                "status": "pass",
                "details": {
                    "invoices_checked": 156,
                    "correct_calculations": 156,
                    "incorrect_calculations": 0
                }
            },
            {
                "name": "Negative Inventory Levels",
                "description": "Identify products with negative stock quantities",
                "status": "fail",
                "details": {
                    "total_products": 3,
                    "negative_stock_items": 1,
                    "affected_products": [
                        {
                            "product_id": "PROD-003",
                            "product_name": "Office Chair Executive",
                            "current_quantity": -5,
                            "last_transaction": "2026-02-20"
                        }
                    ]
                }
            },
            {
                "name": "Customer Balance Accuracy",
                "description": "Verify customer balances match sum of outstanding invoices",
                "status": "pass",
                "details": {
                    "customers_checked": 15,
                    "balances_matched": 15,
                    "discrepancies": 0
                }
            },
            {
                "name": "Supplier Balance Accuracy",
                "description": "Verify supplier balances match sum of outstanding bills",
                "status": "warning",
                "details": {
                    "suppliers_checked": 8,
                    "balances_matched": 7,
                    "discrepancies": 1,
                    "issues": [
                        {
                            "supplier": "Office Furniture Plus",
                            "calculated_balance": 18500,
                            "recorded_balance": 18450,
                            "difference": 50
                        }
                    ]
                }
            }
        ]
    }

@app.get("/erp/order-to-cash/quotes")
@app.get("/api/v1/erp/order-to-cash/quotes")
async def list_quotes(search: Optional[str] = None, status: Optional[str] = None):
    """List sales quotes"""
    quotes = [
        {
            "id": "Q001",
            "quote_number": "QT-2026-0001",
            "customer_id": "CUST001",
            "customer_name": "Acme Corp (Pty) Ltd",
            "customer_email": "orders@acmecorp.co.za",
            "quote_date": "2026-02-15",
            "valid_until": "2026-03-15",
            "status": "sent",
            "subtotal": 45000.00,
            "tax_amount": 6750.00,
            "total_amount": 51750.00,
            "notes": "Standard pricing applied. 30-day payment terms.",
            "warehouse_id": "WH-JHB-01",
            "lines": [
                {
                    "id": "QL001",
                    "product_id": "PROD-001",
                    "description": "Standing Desk Adjustable",
                    "quantity": 10,
                    "unit_price": 3500.00,
                    "discount_percent": 0,
                    "tax_rate": 15
                },
                {
                    "id": "QL002",
                    "product_id": "PROD-002",
                    "description": "Office Chair Executive",
                    "quantity": 15,
                    "unit_price": 2500.00,
                    "discount_percent": 5,
                    "tax_rate": 15
                }
            ]
        },
        {
            "id": "Q002",
            "quote_number": "QT-2026-0002",
            "customer_id": "CUST002",
            "customer_name": "Design Studio SA",
            "customer_email": "procurement@designstudio.co.za",
            "quote_date": "2026-02-18",
            "valid_until": "2026-03-18",
            "status": "draft",
            "subtotal": 28000.00,
            "tax_amount": 4200.00,
            "total_amount": 32200.00,
            "notes": "Volume discount applied. FOB Johannesburg.",
            "warehouse_id": "WH-JHB-01",
            "lines": [
                {
                    "id": "QL003",
                    "product_id": "PROD-003",
                    "description": "Office Desk Lamp LED",
                    "quantity": 50,
                    "unit_price": 450.00,
                    "discount_percent": 10,
                    "tax_rate": 15
                }
            ]
        },
        {
            "id": "Q003",
            "quote_number": "QT-2026-0003",
            "customer_id": "CUST003",
            "customer_name": "Corporate Solutions Ltd",
            "customer_email": "admin@corpsolutions.co.za",
            "quote_date": "2026-02-20",
            "valid_until": "2026-03-20",
            "status": "approved",
            "subtotal": 95000.00,
            "tax_amount": 14250.00,
            "total_amount": 109250.00,
            "notes": "Quote for office refurbishment project.",
            "warehouse_id": "WH-CPT-01",
            "lines": [
                {
                    "id": "QL004",
                    "product_id": "PROD-001",
                    "description": "Standing Desk Adjustable",
                    "quantity": 20,
                    "unit_price": 3500.00,
                    "discount_percent": 0,
                    "tax_rate": 15
                },
                {
                    "id": "QL005",
                    "product_id": "PROD-002",
                    "description": "Office Chair Executive",
                    "quantity": 25,
                    "unit_price": 2500.00,
                    "discount_percent": 0,
                    "tax_rate": 15
                }
            ]
        }
    ]
    
    # Apply filters
    if status:
        quotes = [q for q in quotes if q["status"] == status]
    if search:
        quotes = [q for q in quotes if search.lower() in q["quote_number"].lower() or search.lower() in q["customer_name"].lower()]
    
    return quotes

@app.get("/erp/order-to-cash/customers")
@app.get("/erp/master-data/customers")
@app.get("/api/v1/erp/master-data/customers")
async def list_customers():
    """List customers"""
    return [
        {
            "id": "CUST001",
            "name": "Acme Corp (Pty) Ltd",
            "email": "orders@acmecorp.co.za",
            "phone": "+27 11 123 4567",
            "customer_code": "ACME-001",
            "contact_person": "John Smith",
            "address": "123 Business Park, Sandton, Johannesburg",
            "payment_terms": "Net 30",
            "credit_limit": 100000,
            "pricelist_id": "PL001",
            "is_active": True
        },
        {
            "id": "CUST002",
            "name": "Design Studio SA",
            "email": "procurement@designstudio.co.za",
            "phone": "+27 21 456 7890",
            "customer_code": "DSGN-002",
            "contact_person": "Sarah Johnson",
            "address": "45 Creative Avenue, Cape Town",
            "payment_terms": "Net 60",
            "credit_limit": 50000,
            "pricelist_id": "PL002",
            "is_active": True
        },
        {
            "id": "CUST003",
            "name": "Corporate Solutions Ltd",
            "email": "admin@corpsolutions.co.za",
            "phone": "+27 31 789 0123",
            "customer_code": "CORP-003",
            "contact_person": "Michael Brown",
            "address": "78 Industrial Road, Durban",
            "payment_terms": "Net 45",
            "credit_limit": 150000,
            "pricelist_id": "PL001",
            "is_active": True
        },
        {
            "id": "CUST004",
            "name": "Tech Innovations",
            "email": "finance@techinnovations.co.za",
            "phone": "+27 12 345 6789",
            "customer_code": "TECH-004",
            "contact_person": "Lisa Anderson",
            "address": "22 Innovation Drive, Pretoria",
            "payment_terms": "Net 30",
            "credit_limit": 75000,
            "pricelist_id": "PL003",
            "is_active": True
        },
        {
            "id": "CUST005",
            "name": "Retail Masters",
            "email": "procurement@retailmasters.co.za",
            "phone": "+27 41 567 8901",
            "customer_code": "RETL-005",
            "contact_person": "David Wilson",
            "address": "90 Shopping Center, Port Elizabeth",
            "payment_terms": "Net 30",
            "credit_limit": 60000,
            "pricelist_id": "PL002",
            "is_active": True
        }
    ]

@app.get("/odoo/pricing/pricelists")
@app.get("/api/v1/odoo/pricing/pricelists")
async def list_pricelists():
    """List pricing pricelists"""
    return {
        "data": [
            {
                "id": "PL001",
                "name": "Standard Pricing",
                "code": "STD",
                "currency": "ZAR",
                "is_default": True,
                "customer_group_id": None,
                "valid_from": None,
                "valid_to": None,
                "priority": 10,
                "is_active": True
            },
            {
                "id": "PL002",
                "name": "Volume Discount 10%",
                "code": "VOL10",
                "currency": "ZAR",
                "is_default": False,
                "customer_group_id": "CG001",
                "valid_from": "2026-01-01",
                "valid_to": "2026-12-31",
                "priority": 20,
                "is_active": True
            },
            {
                "id": "PL003",
                "name": "Corporate Client Pricing",
                "code": "CORP",
                "currency": "ZAR",
                "is_default": False,
                "customer_group_id": "CG002",
                "valid_from": "2026-01-01",
                "valid_to": None,
                "priority": 15,
                "is_active": True
            },
            {
                "id": "PL004",
                "name": "Seasonal Promotion Q1",
                "code": "PROMO-Q1",
                "currency": "ZAR",
                "is_default": False,
                "customer_group_id": None,
                "valid_from": "2026-01-01",
                "valid_to": "2026-03-31",
                "priority": 5,
                "is_active": True
            }
        ]
    }

@app.get("/erp/order-to-cash/sales-orders")
@app.get("/api/v1/erp/order-to-cash/sales-orders")
async def list_sales_orders(search: Optional[str] = None, status: Optional[str] = None, customer_id: Optional[str] = None):
    """List sales orders"""
    orders = [
        {
            "id": "SO001",
            "order_number": "SO-2026-0001",
            "customer_id": "CUST001",
            "customer_name": "Acme Corp (Pty) Ltd",
            "customer_email": "orders@acmecorp.co.za",
            "order_date": "2026-02-10",
            "required_date": "2026-02-20",
            "status": "confirmed",
            "subtotal": 85000.00,
            "tax_amount": 12750.00,
            "total_amount": 97750.00,
            "notes": "Rush order - expedited shipping requested",
            "warehouse_id": "WH-JHB-01",
            "quote_id": "Q001",
            "lines": [
                {
                    "id": "SOL001",
                    "product_id": "PROD-001",
                    "description": "Standing Desk Adjustable",
                    "quantity": 15,
                    "unit_price": 3500.00,
                    "discount_percent": 0,
                    "tax_rate": 15
                },
                {
                    "id": "SOL002",
                    "product_id": "PROD-002",
                    "description": "Office Chair Executive",
                    "quantity": 20,
                    "unit_price": 2500.00,
                    "discount_percent": 0,
                    "tax_rate": 15
                }
            ]
        },
        {
            "id": "SO002",
            "order_number": "SO-2026-0002",
            "customer_id": "CUST002",
            "customer_name": "Design Studio SA",
            "customer_email": "procurement@designstudio.co.za",
            "order_date": "2026-02-12",
            "required_date": "2026-02-25",
            "status": "processing",
            "subtotal": 45000.00,
            "tax_amount": 6750.00,
            "total_amount": 51750.00,
            "notes": "Standard delivery",
            "warehouse_id": "WH-JHB-01",
            "quote_id": "Q002",
            "lines": [
                {
                    "id": "SOL003",
                    "product_id": "PROD-003",
                    "description": "Office Desk Lamp LED",
                    "quantity": 100,
                    "unit_price": 450.00,
                    "discount_percent": 0,
                    "tax_rate": 15
                }
            ]
        },
        {
            "id": "SO003",
            "order_number": "SO-2026-0003",
            "customer_id": "CUST003",
            "customer_name": "Corporate Solutions Ltd",
            "customer_email": "admin@corpsolutions.co.za",
            "order_date": "2026-02-15",
            "required_date": "2026-03-01",
            "status": "shipped",
            "subtotal": 175000.00,
            "tax_amount": 26250.00,
            "total_amount": 201250.00,
            "notes": "Large order for new office setup",
            "warehouse_id": "WH-CPT-01",
            "quote_id": "Q003",
            "lines": [
                {
                    "id": "SOL004",
                    "product_id": "PROD-001",
                    "description": "Standing Desk Adjustable",
                    "quantity": 30,
                    "unit_price": 3500.00,
                    "discount_percent": 5,
                    "tax_rate": 15
                },
                {
                    "id": "SOL005",
                    "product_id": "PROD-002",
                    "description": "Office Chair Executive",
                    "quantity": 40,
                    "unit_price": 2500.00,
                    "discount_percent": 5,
                    "tax_rate": 15
                }
            ]
        },
        {
            "id": "SO004",
            "order_number": "SO-2026-0004",
            "customer_id": "CUST004",
            "customer_name": "Tech Innovations",
            "customer_email": "finance@techinnovations.co.za",
            "order_date": "2026-02-18",
            "required_date": "2026-03-05",
            "status": "draft",
            "subtotal": 32500.00,
            "tax_amount": 4875.00,
            "total_amount": 37375.00,
            "notes": "Pending customer confirmation",
            "warehouse_id": "WH-JHB-01",
            "quote_id": None,
            "lines": [
                {
                    "id": "SOL006",
                    "product_id": "PROD-003",
                    "description": "Office Desk Lamp LED",
                    "quantity": 50,
                    "unit_price": 450.00,
                    "discount_percent": 10,
                    "tax_rate": 15
                },
                {
                    "id": "SOL007",
                    "product_id": "PROD-001",
                    "description": "Standing Desk Adjustable",
                    "quantity": 5,
                    "unit_price": 3500.00,
                    "discount_percent": 0,
                    "tax_rate": 15
                }
            ]
        },
        {
            "id": "SO005",
            "order_number": "SO-2026-0005",
            "customer_id": "CUST005",
            "customer_name": "Retail Masters",
            "customer_email": "procurement@retailmasters.co.za",
            "order_date": "2026-02-20",
            "required_date": "2026-03-10",
            "status": "delivered",
            "subtotal": 62500.00,
            "tax_amount": 9375.00,
            "total_amount": 71875.00,
            "notes": "Successfully delivered on time",
            "warehouse_id": "WH-DBN-01",
            "quote_id": None,
            "lines": [
                {
                    "id": "SOL008",
                    "product_id": "PROD-002",
                    "description": "Office Chair Executive",
                    "quantity": 25,
                    "unit_price": 2500.00,
                    "discount_percent": 0,
                    "tax_rate": 15
                }
            ]
        }
    ]
    
    # Apply filters
    if status:
        orders = [o for o in orders if o["status"] == status]
    if customer_id:
        orders = [o for o in orders if o["customer_id"] == customer_id]
    if search:
        orders = [o for o in orders if search.lower() in o["order_number"].lower() or search.lower() in o["customer_name"].lower()]
    
    return orders

@app.get("/erp/order-to-cash/deliveries")
@app.get("/api/v1/erp/order-to-cash/deliveries")
async def list_deliveries(search: Optional[str] = None, status: Optional[str] = None, sales_order_id: Optional[str] = None):
    """List deliveries"""
    deliveries = [
        {
            "id": "DEL001",
            "delivery_number": "DEL-2026-0001",
            "sales_order_id": "SO001",
            "sales_order_number": "SO-2026-0001",
            "customer_name": "Acme Corp (Pty) Ltd",
            "warehouse_name": "Johannesburg Main Warehouse",
            "delivery_date": "2026-02-12",
            "status": "delivered",
            "tracking_number": "TRK123456789ZA",
            "carrier": "The Courier Guy",
            "notes": "Delivered successfully, signed by reception",
            "lines": [
                {
                    "id": "DL001",
                    "product_id": "PROD-001",
                    "product_code": "SD-ADJ-001",
                    "product_name": "Standing Desk Adjustable",
                    "quantity": 15,
                    "quantity_shipped": 15
                },
                {
                    "id": "DL002",
                    "product_id": "PROD-002",
                    "product_code": "OC-EXE-001",
                    "product_name": "Office Chair Executive",
                    "quantity": 20,
                    "quantity_shipped": 20
                }
            ]
        },
        {
            "id": "DEL002",
            "delivery_number": "DEL-2026-0002",
            "sales_order_id": "SO002",
            "sales_order_number": "SO-2026-0002",
            "customer_name": "Design Studio SA",
            "warehouse_name": "Johannesburg Main Warehouse",
            "delivery_date": "2026-02-18",
            "status": "shipped",
            "tracking_number": "TRK987654321ZA",
            "carrier": "Dawn Wing",
            "notes": "In transit to Cape Town",
            "lines": [
                {
                    "id": "DL003",
                    "product_id": "PROD-003",
                    "product_code": "DL-LED-001",
                    "product_name": "Office Desk Lamp LED",
                    "quantity": 100,
                    "quantity_shipped": 100
                }
            ]
        },
        {
            "id": "DEL003",
            "delivery_number": "DEL-2026-0003",
            "sales_order_id": "SO003",
            "sales_order_number": "SO-2026-0003",
            "customer_name": "Corporate Solutions Ltd",
            "warehouse_name": "Cape Town Warehouse",
            "delivery_date": "2026-02-22",
            "status": "ready",
            "tracking_number": None,
            "carrier": None,
            "notes": "Ready for pickup - awaiting carrier assignment",
            "lines": [
                {
                    "id": "DL004",
                    "product_id": "PROD-001",
                    "product_code": "SD-ADJ-001",
                    "product_name": "Standing Desk Adjustable",
                    "quantity": 30,
                    "quantity_shipped": 30
                },
                {
                    "id": "DL005",
                    "product_id": "PROD-002",
                    "product_code": "OC-EXE-001",
                    "product_name": "Office Chair Executive",
                    "quantity": 40,
                    "quantity_shipped": 40
                }
            ]
        },
        {
            "id": "DEL004",
            "delivery_number": "DEL-2026-0004",
            "sales_order_id": "SO004",
            "sales_order_number": "SO-2026-0004",
            "customer_name": "Tech Innovations",
            "warehouse_name": "Johannesburg Main Warehouse",
            "delivery_date": "2026-02-25",
            "status": "draft",
            "tracking_number": None,
            "carrier": None,
            "notes": "Pending confirmation from customer",
            "lines": [
                {
                    "id": "DL006",
                    "product_id": "PROD-003",
                    "product_code": "DL-LED-001",
                    "product_name": "Office Desk Lamp LED",
                    "quantity": 50,
                    "quantity_shipped": 0
                },
                {
                    "id": "DL007",
                    "product_id": "PROD-001",
                    "product_code": "SD-ADJ-001",
                    "product_name": "Standing Desk Adjustable",
                    "quantity": 5,
                    "quantity_shipped": 0
                }
            ]
        },
        {
            "id": "DEL005",
            "delivery_number": "DEL-2026-0005",
            "sales_order_id": "SO005",
            "sales_order_number": "SO-2026-0005",
            "customer_name": "Retail Masters",
            "warehouse_name": "Durban Warehouse",
            "delivery_date": "2026-02-15",
            "status": "delivered",
            "tracking_number": "TRK456789123ZA",
            "carrier": "Fastway Couriers",
            "notes": "Delivered on schedule",
            "lines": [
                {
                    "id": "DL008",
                    "product_id": "PROD-002",
                    "product_code": "OC-EXE-001",
                    "product_name": "Office Chair Executive",
                    "quantity": 25,
                    "quantity_shipped": 25
                }
            ]
        }
    ]
    
    # Apply filters
    if status:
        deliveries = [d for d in deliveries if d["status"] == status]
    if sales_order_id:
        deliveries = [d for d in deliveries if d["sales_order_id"] == sales_order_id]
    if search:
        deliveries = [d for d in deliveries if search.lower() in d["delivery_number"].lower() or search.lower() in d["customer_name"].lower()]
    
    return deliveries

@app.get("/erp/ar/customers")
@app.get("/api/v1/erp/ar/customers")
async def list_ar_customers(search: Optional[str] = None):
    """List accounts receivable customers"""
    customers = [
        {
            "id": "CUST001",
            "customer_code": "ACME-001",
            "customer_name": "Acme Corp (Pty) Ltd",
            "contact_person": "John Smith",
            "email": "orders@acmecorp.co.za",
            "phone": "+27 11 123 4567",
            "address": "123 Business Park, Sandton, Johannesburg",
            "payment_terms": "Net 30",
            "credit_limit": 100000,
            "is_active": True,
            "created_at": "2025-01-15T10:00:00Z"
        },
        {
            "id": "CUST002",
            "customer_code": "DSGN-002",
            "customer_name": "Design Studio SA",
            "contact_person": "Sarah Johnson",
            "email": "procurement@designstudio.co.za",
            "phone": "+27 21 456 7890",
            "address": "45 Creative Avenue, Cape Town",
            "payment_terms": "Net 60",
            "credit_limit": 50000,
            "is_active": True,
            "created_at": "2025-02-01T11:30:00Z"
        },
        {
            "id": "CUST003",
            "customer_code": "CORP-003",
            "customer_name": "Corporate Solutions Ltd",
            "contact_person": "Michael Brown",
            "email": "admin@corpsolutions.co.za",
            "phone": "+27 31 789 0123",
            "address": "78 Industrial Road, Durban",
            "payment_terms": "Net 45",
            "credit_limit": 150000,
            "is_active": True,
            "created_at": "2025-01-20T09:15:00Z"
        },
        {
            "id": "CUST004",
            "customer_code": "TECH-004",
            "customer_name": "Tech Innovations",
            "contact_person": "Lisa Anderson",
            "email": "finance@techinnovations.co.za",
            "phone": "+27 12 345 6789",
            "address": "22 Innovation Drive, Pretoria",
            "payment_terms": "Net 30",
            "credit_limit": 75000,
            "is_active": True,
            "created_at": "2025-02-10T14:20:00Z"
        },
        {
            "id": "CUST005",
            "customer_code": "RETL-005",
            "customer_name": "Retail Masters",
            "contact_person": "David Wilson",
            "email": "procurement@retailmasters.co.za",
            "phone": "+27 41 567 8901",
            "address": "90 Shopping Center, Port Elizabeth",
            "payment_terms": "Net 30",
            "credit_limit": 60000,
            "is_active": True,
            "created_at": "2025-01-25T16:45:00Z"
        }
    ]
    
    # Apply search filter
    if search:
        customers = [c for c in customers if 
                    search.lower() in c["customer_name"].lower() or 
                    search.lower() in c["customer_code"].lower() or 
                    search.lower() in (c["email"] or "").lower()]
    
    return {"customers": customers}

@app.get("/erp/ar/invoices")
@app.get("/api/v1/erp/ar/invoices")
async def list_ar_invoices(search: Optional[str] = None, status: Optional[str] = None):
    """List accounts receivable invoices"""
    invoices = [
        {
            "id": "INV001",
            "invoice_number": "INV-2026-0001",
            "customer_id": "CUST001",
            "customer_name": "Acme Corp (Pty) Ltd",
            "invoice_date": "2026-01-15",
            "due_date": "2026-02-14",
            "total_amount": 97750.00,
            "amount_paid": 97750.00,
            "balance": 0.00,
            "status": "paid",
            "description": "Office furniture order - SO-2026-0001",
            "created_at": "2026-01-15T09:30:00Z"
        },
        {
            "id": "INV002",
            "invoice_number": "INV-2026-0002",
            "customer_id": "CUST002",
            "customer_name": "Design Studio SA",
            "invoice_date": "2026-02-01",
            "due_date": "2026-04-02",
            "total_amount": 51750.00,
            "amount_paid": 25000.00,
            "balance": 26750.00,
            "status": "partial",
            "description": "LED lamps bulk order",
            "created_at": "2026-02-01T10:15:00Z"
        },
        {
            "id": "INV003",
            "invoice_number": "INV-2026-0003",
            "customer_id": "CUST003",
            "customer_name": "Corporate Solutions Ltd",
            "invoice_date": "2026-02-10",
            "due_date": "2026-03-27",
            "total_amount": 201250.00,
            "amount_paid": 0.00,
            "balance": 201250.00,
            "status": "outstanding",
            "description": "Office refurbishment project",
            "created_at": "2026-02-10T14:20:00Z"
        },
        {
            "id": "INV004",
            "invoice_number": "INV-2026-0004",
            "customer_id": "CUST004",
            "customer_name": "Tech Innovations",
            "invoice_date": "2026-01-20",
            "due_date": "2026-02-19",
            "total_amount": 37375.00,
            "amount_paid": 0.00,
            "balance": 37375.00,
            "status": "overdue",
            "description": "Office supplies",
            "created_at": "2026-01-20T11:45:00Z"
        },
        {
            "id": "INV005",
            "invoice_number": "INV-2026-0005",
            "customer_id": "CUST005",
            "customer_name": "Retail Masters",
            "invoice_date": "2026-02-05",
            "due_date": "2026-03-07",
            "total_amount": 71875.00,
            "amount_paid": 71875.00,
            "balance": 0.00,
            "status": "paid",
            "description": "Executive chairs",
            "created_at": "2026-02-05T16:00:00Z"
        }
    ]
    
    # Apply filters
    if status:
        invoices = [i for i in invoices if i["status"] == status]
    if search:
        invoices = [i for i in invoices if 
                   search.lower() in i["invoice_number"].lower() or 
                   search.lower() in i["customer_name"].lower()]
    
    return {"invoices": invoices}

@app.get("/ar/invoices/customer")
@app.get("/api/v1/ar/invoices/customer")
async def list_ar_invoices_customer(company_id: Optional[str] = None, search: Optional[str] = None, status: Optional[str] = None):
    """List customer invoices for AR module"""
    invoices = [
        {
            "id": "INV001",
            "invoice_number": "INV-2026-0001",
            "customer_id": "CUST001",
            "customer_name": "Acme Corp (Pty) Ltd",
            "invoice_date": "2026-01-15",
            "due_date": "2026-02-14",
            "total_amount": 97750.00,
            "amount_paid": 97750.00,
            "balance_due": 0.00,
            "balance": 0.00,
            "status": "paid",
            "description": "Office furniture order - SO-2026-0001",
            "created_at": "2026-01-15T09:30:00Z"
        },
        {
            "id": "INV002",
            "invoice_number": "INV-2026-0002",
            "customer_id": "CUST002",
            "customer_name": "Design Studio SA",
            "invoice_date": "2026-02-01",
            "due_date": "2026-04-02",
            "total_amount": 51750.00,
            "amount_paid": 25000.00,
            "balance_due": 26750.00,
            "balance": 26750.00,
            "status": "partial",
            "description": "LED lamps bulk order",
            "created_at": "2026-02-01T10:15:00Z"
        },
        {
            "id": "INV003",
            "invoice_number": "INV-2026-0003",
            "customer_id": "CUST003",
            "customer_name": "Corporate Solutions Ltd",
            "invoice_date": "2026-02-10",
            "due_date": "2026-03-27",
            "total_amount": 201250.00,
            "amount_paid": 0.00,
            "balance_due": 201250.00,
            "balance": 201250.00,
            "status": "outstanding",
            "description": "Office refurbishment project",
            "created_at": "2026-02-10T14:20:00Z"
        },
        {
            "id": "INV004",
            "invoice_number": "INV-2026-0004",
            "customer_id": "CUST004",
            "customer_name": "Tech Innovations",
            "invoice_date": "2026-01-20",
            "due_date": "2026-02-19",
            "total_amount": 37375.00,
            "amount_paid": 0.00,
            "balance_due": 37375.00,
            "balance": 37375.00,
            "status": "overdue",
            "description": "Office supplies",
            "created_at": "2026-01-20T11:45:00Z"
        },
        {
            "id": "INV005",
            "invoice_number": "INV-2026-0005",
            "customer_id": "CUST005",
            "customer_name": "Retail Masters",
            "invoice_date": "2026-02-05",
            "due_date": "2026-03-07",
            "total_amount": 71875.00,
            "amount_paid": 71875.00,
            "balance_due": 0.00,
            "balance": 0.00,
            "status": "paid",
            "description": "Executive chairs",
            "created_at": "2026-02-05T16:00:00Z"
        }
    ]
    
    # Apply filters
    if status:
        invoices = [i for i in invoices if i["status"] == status]
    if search:
        invoices = [i for i in invoices if 
                   search.lower() in i["invoice_number"].lower() or 
                   search.lower() in i["customer_name"].lower()]
    
    return {"data": invoices}

@app.get("/erp/ar/payments")
@app.get("/api/v1/erp/ar/payments")
async def list_ar_payments():
    """List accounts receivable payments"""
    payments = [
        {
            "id": "PAY001",
            "payment_number": "PAY-2026-0001",
            "customer_id": "CUST001",
            "customer_name": "Acme Corp (Pty) Ltd",
            "payment_date": "2026-02-12",
            "payment_method": "EFT",
            "amount": 97750.00,
            "reference": "EFT-REF-123456",
            "status": "cleared",
            "created_at": "2026-02-12T10:30:00Z"
        },
        {
            "id": "PAY002",
            "payment_number": "PAY-2026-0002",
            "customer_id": "CUST002",
            "customer_name": "Design Studio SA",
            "payment_date": "2026-02-15",
            "payment_method": "EFT",
            "amount": 25000.00,
            "reference": "EFT-REF-234567",
            "status": "cleared",
            "created_at": "2026-02-15T14:15:00Z"
        },
        {
            "id": "PAY003",
            "payment_number": "PAY-2026-0003",
            "customer_id": "CUST005",
            "customer_name": "Retail Masters",
            "payment_date": "2026-02-20",
            "payment_method": "Credit Card",
            "amount": 71875.00,
            "reference": "CC-AUTH-345678",
            "status": "cleared",
            "created_at": "2026-02-20T09:45:00Z"
        },
        {
            "id": "PAY004",
            "payment_number": "PAY-2026-0004",
            "customer_id": "CUST001",
            "customer_name": "Acme Corp (Pty) Ltd",
            "payment_date": "2026-02-22",
            "payment_method": "Cheque",
            "amount": 50000.00,
            "reference": "CHQ-456789",
            "status": "pending",
            "created_at": "2026-02-22T11:20:00Z"
        }
    ]
    
    return {"payments": payments}

@app.get("/erp/reports/ar-aging")
@app.get("/api/v1/erp/reports/ar-aging")
async def ar_aging_report():
    """Get accounts receivable aging report"""
    return {
        "aging": [
            {
                "customer_id": "CUST002",
                "customer_name": "Design Studio SA",
                "current": 0.00,
                "days_30": 26750.00,
                "days_60": 0.00,
                "days_90": 0.00,
                "over_90": 0.00,
                "total": 26750.00
            },
            {
                "customer_id": "CUST003",
                "customer_name": "Corporate Solutions Ltd",
                "current": 201250.00,
                "days_30": 0.00,
                "days_60": 0.00,
                "days_90": 0.00,
                "over_90": 0.00,
                "total": 201250.00
            },
            {
                "customer_id": "CUST004",
                "customer_name": "Tech Innovations",
                "current": 0.00,
                "days_30": 0.00,
                "days_60": 37375.00,
                "days_90": 0.00,
                "over_90": 0.00,
                "total": 37375.00
            }
        ]
    }

@app.get("/erp/gl/chart-of-accounts")
@app.get("/api/v1/erp/gl/chart-of-accounts")
async def list_chart_of_accounts(search: Optional[str] = None, type: Optional[str] = None):
    """List chart of accounts"""
    accounts = [
        # ASSETS (1000-1999)
        {
            "id": "ACC1010",
            "account_code": "1010",
            "account_name": "Cash - Petty Cash",
            "account_type": "asset",
            "account_category": "current_asset",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC1020",
            "account_code": "1020",
            "account_name": "Bank - FNB Business Cheque",
            "account_type": "asset",
            "account_category": "current_asset",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC1030",
            "account_code": "1030",
            "account_name": "Bank - Nedbank Savings",
            "account_type": "asset",
            "account_category": "current_asset",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC1100",
            "account_code": "1100",
            "account_name": "Accounts Receivable",
            "account_type": "asset",
            "account_category": "current_asset",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC1200",
            "account_code": "1200",
            "account_name": "Inventory - Finished Goods",
            "account_type": "asset",
            "account_category": "current_asset",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC1300",
            "account_code": "1300",
            "account_name": "Prepaid Expenses",
            "account_type": "asset",
            "account_category": "current_asset",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC1500",
            "account_code": "1500",
            "account_name": "Property, Plant & Equipment",
            "account_type": "asset",
            "account_category": "fixed_asset",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC1510",
            "account_code": "1510",
            "account_name": "Accumulated Depreciation",
            "account_type": "asset",
            "account_category": "fixed_asset",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        
        # LIABILITIES (2000-2999)
        {
            "id": "ACC2100",
            "account_code": "2100",
            "account_name": "Accounts Payable",
            "account_type": "liability",
            "account_category": "current_liability",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC2200",
            "account_code": "2200",
            "account_name": "VAT Output (15%)",
            "account_type": "liability",
            "account_category": "current_liability",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC2210",
            "account_code": "2210",
            "account_name": "VAT Input",
            "account_type": "liability",
            "account_category": "current_liability",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC2300",
            "account_code": "2300",
            "account_name": "PAYE Payable",
            "account_type": "liability",
            "account_category": "current_liability",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC2310",
            "account_code": "2310",
            "account_name": "UIF Payable",
            "account_type": "liability",
            "account_category": "current_liability",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC2400",
            "account_code": "2400",
            "account_name": "Accrued Expenses",
            "account_type": "liability",
            "account_category": "current_liability",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC2500",
            "account_code": "2500",
            "account_name": "Long-term Loan - Standard Bank",
            "account_type": "liability",
            "account_category": "long_term_liability",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        
        # EQUITY (3000-3999)
        {
            "id": "ACC3100",
            "account_code": "3100",
            "account_name": "Share Capital",
            "account_type": "equity",
            "account_category": "equity",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC3200",
            "account_code": "3200",
            "account_name": "Retained Earnings",
            "account_type": "equity",
            "account_category": "equity",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC3300",
            "account_code": "3300",
            "account_name": "Current Year Earnings",
            "account_type": "equity",
            "account_category": "equity",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        
        # REVENUE (4000-4999)
        {
            "id": "ACC4100",
            "account_code": "4100",
            "account_name": "Sales Revenue - Products",
            "account_type": "revenue",
            "account_category": "revenue",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC4200",
            "account_code": "4200",
            "account_name": "Sales Revenue - Services",
            "account_type": "revenue",
            "account_category": "revenue",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC4300",
            "account_code": "4300",
            "account_name": "Interest Income",
            "account_type": "revenue",
            "account_category": "other_income",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC4400",
            "account_code": "4400",
            "account_name": "Other Income",
            "account_type": "revenue",
            "account_category": "other_income",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        
        # COST OF GOODS SOLD (5000-5999)
        {
            "id": "ACC5100",
            "account_code": "5100",
            "account_name": "Cost of Goods Sold",
            "account_type": "expense",
            "account_category": "cost_of_sales",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC5200",
            "account_code": "5200",
            "account_name": "Direct Labour",
            "account_type": "expense",
            "account_category": "cost_of_sales",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        
        # OPERATING EXPENSES (6000-6999)
        {
            "id": "ACC6100",
            "account_code": "6100",
            "account_name": "Salaries & Wages",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC6200",
            "account_code": "6200",
            "account_name": "Rent Expense",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC6300",
            "account_code": "6300",
            "account_name": "Utilities - Electricity",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC6400",
            "account_code": "6400",
            "account_name": "Telephone & Internet",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC6500",
            "account_code": "6500",
            "account_name": "Office Supplies",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC6600",
            "account_code": "6600",
            "account_name": "Marketing & Advertising",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC6700",
            "account_code": "6700",
            "account_name": "Professional Fees",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC6800",
            "account_code": "6800",
            "account_name": "Insurance",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC6900",
            "account_code": "6900",
            "account_name": "Depreciation Expense",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC7000",
            "account_code": "7000",
            "account_name": "Bank Charges",
            "account_type": "expense",
            "account_category": "operating_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "ACC7100",
            "account_code": "7100",
            "account_name": "Interest Expense",
            "account_type": "expense",
            "account_category": "other_expense",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z"
        }
    ]
    
    # Apply filters
    if type:
        accounts = [a for a in accounts if a["account_type"] == type]
    if search:
        accounts = [a for a in accounts if 
                   search.lower() in a["account_code"].lower() or 
                   search.lower() in a["account_name"].lower()]
    
    return {"accounts": accounts}

@app.get("/api/v1/documents")
async def list_documents():
    """List documents"""
    return {
        "documents": [],
        "total": 0,
        "page": 1,
        "pageSize": 10
    }

# Company endpoints
@app.get("/api/v1/companies")
async def list_companies(db: Session = Depends(get_db)):
    """List companies"""
    try:
        result = db.execute(text("SELECT * FROM companies LIMIT 10"))
        companies = result.fetchall()
        return {"companies": [{"id": c[0], "name": c[1] if len(c) > 1 else "Unknown"} for c in companies]}
    except:
        return {"companies": []}

# Banking endpoints
@app.get("/banking/accounts")
@app.get("/api/v1/banking/accounts")
async def list_banking_accounts():
    """List bank accounts"""
    accounts = [
        {
            "id": 1,
            "account_number": "62123456789",
            "account_name": "FNB Business Cheque Account",
            "bank_name": "First National Bank (FNB)",
            "account_type": "CURRENT",
            "currency": "ZAR",
            "balance": 487250.75,
            "is_active": True,
            "created_at": "2026-01-15T09:00:00Z"
        },
        {
            "id": 2,
            "account_number": "10872345678",
            "account_name": "Nedbank Business Savings",
            "bank_name": "Nedbank",
            "account_type": "SAVINGS",
            "currency": "ZAR",
            "balance": 250000.00,
            "is_active": True,
            "created_at": "2026-01-20T10:30:00Z"
        },
        {
            "id": 3,
            "account_number": "051234567",
            "account_name": "Standard Bank USD Account",
            "bank_name": "Standard Bank",
            "account_type": "FOREIGN_CURRENCY",
            "currency": "USD",
            "balance": 15750.50,
            "is_active": True,
            "created_at": "2026-02-01T11:00:00Z"
        },
        {
            "id": 4,
            "account_number": "40123456789",
            "account_name": "Capitec Business Account",
            "bank_name": "Capitec Bank",
            "account_type": "CURRENT",
            "currency": "ZAR",
            "balance": 125680.25,
            "is_active": True,
            "created_at": "2026-02-05T14:15:00Z"
        },
        {
            "id": 5,
            "account_number": "580123456789",
            "account_name": "Absa Petty Cash Account",
            "bank_name": "Absa Bank",
            "account_type": "CURRENT",
            "currency": "ZAR",
            "balance": 15000.00,
            "is_active": True,
            "created_at": "2026-02-10T08:45:00Z"
        }
    ]
    return {"accounts": accounts}

@app.get("/banking/transactions")
@app.get("/api/v1/banking/transactions")
async def list_banking_transactions():
    """List bank transactions"""
    transactions = [
        {
            "id": 1,
            "transaction_number": "TXN-2026-0001",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "transaction_date": "2026-02-22",
            "description": "Customer payment - Invoice INV-2026-0001",
            "reference": "EFT-REF-123456",
            "debit": 0.00,
            "credit": 97750.00,
            "balance": 487250.75,
            "reconciled": True,
            "category": "Customer Receipts",
            "created_at": "2026-02-22T09:15:00Z"
        },
        {
            "id": 2,
            "transaction_number": "TXN-2026-0002",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "transaction_date": "2026-02-21",
            "description": "Salary payment - February 2026",
            "reference": "PAYROLL-FEB-2026",
            "debit": 145600.00,
            "credit": 0.00,
            "balance": 389500.75,
            "reconciled": True,
            "category": "Payroll",
            "created_at": "2026-02-21T14:30:00Z"
        },
        {
            "id": 3,
            "transaction_number": "TXN-2026-0003",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "transaction_date": "2026-02-20",
            "description": "Supplier payment - PO-2026-0001",
            "reference": "EFT-SUP-789012",
            "debit": 52875.00,
            "credit": 0.00,
            "balance": 535100.75,
            "reconciled": True,
            "category": "Supplier Payments",
            "created_at": "2026-02-20T11:00:00Z"
        },
        {
            "id": 4,
            "transaction_number": "TXN-2026-0004",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "transaction_date": "2026-02-19",
            "description": "Rent payment - March 2026",
            "reference": "RENT-MAR-2026",
            "debit": 35000.00,
            "credit": 0.00,
            "balance": 587975.75,
            "reconciled": True,
            "category": "Rent",
            "created_at": "2026-02-19T08:45:00Z"
        },
        {
            "id": 5,
            "transaction_number": "TXN-2026-0005",
            "account_id": 2,
            "account_name": "Nedbank Business Savings",
            "transaction_date": "2026-02-18",
            "description": "Interest earned",
            "reference": "INT-FEB-2026",
            "debit": 0.00,
            "credit": 1875.50,
            "balance": 250000.00,
            "reconciled": True,
            "category": "Interest Income",
            "created_at": "2026-02-18T00:01:00Z"
        },
        {
            "id": 6,
            "transaction_number": "TXN-2026-0006",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "transaction_date": "2026-02-17",
            "description": "Eskom electricity payment",
            "reference": "ESKOM-FEB-2026",
            "debit": 8450.00,
            "credit": 0.00,
            "balance": 622975.75,
            "reconciled": False,
            "category": "Utilities",
            "created_at": "2026-02-17T16:20:00Z"
        },
        {
            "id": 7,
            "transaction_number": "TXN-2026-0007",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "transaction_date": "2026-02-16",
            "description": "Bank charges - February 2026",
            "reference": "CHARGES-FEB-2026",
            "debit": 285.50,
            "credit": 0.00,
            "balance": 631425.75,
            "reconciled": True,
            "category": "Bank Charges",
            "created_at": "2026-02-16T23:59:00Z"
        },
        {
            "id": 8,
            "transaction_number": "TXN-2026-0008",
            "account_id": 3,
            "account_name": "Standard Bank USD Account",
            "transaction_date": "2026-02-15",
            "description": "International payment received",
            "reference": "SWIFT-USD-123",
            "debit": 0.00,
            "credit": 5000.00,
            "balance": 15750.50,
            "reconciled": False,
            "category": "International Receipts",
            "created_at": "2026-02-15T10:30:00Z"
        },
        {
            "id": 9,
            "transaction_number": "TXN-2026-0009",
            "account_id": 4,
            "account_name": "Capitec Business Account",
            "transaction_date": "2026-02-14",
            "description": "Customer payment - Cash deposit",
            "reference": "CASH-DEP-456",
            "debit": 0.00,
            "credit": 15680.25,
            "balance": 125680.25,
            "reconciled": True,
            "category": "Customer Receipts",
            "created_at": "2026-02-14T13:45:00Z"
        },
        {
            "id": 10,
            "transaction_number": "TXN-2026-0010",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "transaction_date": "2026-02-13",
            "description": "MTN business line payment",
            "reference": "MTN-FEB-2026",
            "debit": 2850.00,
            "credit": 0.00,
            "balance": 631711.25,
            "reconciled": True,
            "category": "Telecommunications",
            "created_at": "2026-02-13T09:00:00Z"
        }
    ]
    return {"transactions": transactions}

@app.get("/banking/reconciliations")
@app.get("/api/v1/banking/reconciliations")
async def list_banking_reconciliations():
    """List bank reconciliations"""
    reconciliations = [
        {
            "id": 1,
            "reconciliation_number": "REC-2026-001",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "statement_date": "2026-01-31",
            "statement_balance": 445230.50,
            "gl_balance": 445230.50,
            "difference": 0.00,
            "status": "COMPLETED",
            "created_at": "2026-02-01T10:00:00Z"
        },
        {
            "id": 2,
            "reconciliation_number": "REC-2026-002",
            "account_id": 2,
            "account_name": "Nedbank Business Savings",
            "statement_date": "2026-01-31",
            "statement_balance": 248124.50,
            "gl_balance": 248124.50,
            "difference": 0.00,
            "status": "COMPLETED",
            "created_at": "2026-02-01T11:30:00Z"
        },
        {
            "id": 3,
            "reconciliation_number": "REC-2026-003",
            "account_id": 1,
            "account_name": "FNB Business Cheque Account",
            "statement_date": "2026-02-28",
            "statement_balance": 487250.75,
            "gl_balance": 478800.75,
            "difference": 8450.00,
            "status": "IN_PROGRESS",
            "created_at": "2026-02-22T09:00:00Z"
        },
        {
            "id": 4,
            "reconciliation_number": "REC-2026-004",
            "account_id": 3,
            "account_name": "Standard Bank USD Account",
            "statement_date": "2026-02-28",
            "statement_balance": 15750.50,
            "gl_balance": 10750.50,
            "difference": 5000.00,
            "status": "IN_PROGRESS",
            "created_at": "2026-02-22T10:15:00Z"
        },
        {
            "id": 5,
            "reconciliation_number": "REC-2026-005",
            "account_id": 4,
            "account_name": "Capitec Business Account",
            "statement_date": "2026-02-28",
            "statement_balance": 125680.25,
            "gl_balance": 125680.25,
            "difference": 0.00,
            "status": "DRAFT",
            "created_at": "2026-02-22T14:00:00Z"
        },
        {
            "id": 6,
            "reconciliation_number": "REC-2026-006",
            "account_id": 5,
            "account_name": "Absa Petty Cash Account",
            "statement_date": "2026-02-28",
            "statement_balance": 15000.00,
            "gl_balance": 15000.00,
            "difference": 0.00,
            "status": "DRAFT",
            "created_at": "2026-02-22T15:30:00Z"
        }
    ]
    return {"reconciliations": reconciliations}

# Banking accounts CRUD endpoints
@app.post("/banking/accounts")
@app.post("/api/v1/banking/accounts")
async def create_banking_account(account: dict):
    """Create new bank account"""
    return {
        "message": "Bank account created successfully",
        "account": {
            "id": 999,
            "account_number": account.get("account_number"),
            "account_name": account.get("account_name"),
            "bank_name": account.get("bank_name"),
            "account_type": account.get("account_type", "CURRENT"),
            "currency": account.get("currency", "ZAR"),
            "balance": float(account.get("balance", 0)),
            "is_active": account.get("is_active", True),
            "created_at": "2026-02-23T10:00:00Z"
        }
    }

@app.put("/banking/accounts/{account_id}")
@app.put("/api/v1/banking/accounts/{account_id}")
async def update_banking_account(account_id: int, account: dict):
    """Update bank account"""
    return {
        "message": "Bank account updated successfully",
        "account": {
            "id": account_id,
            "account_number": account.get("account_number"),
            "account_name": account.get("account_name"),
            "bank_name": account.get("bank_name"),
            "account_type": account.get("account_type"),
            "currency": account.get("currency"),
            "balance": float(account.get("balance", 0)),
            "is_active": account.get("is_active"),
            "updated_at": "2026-02-23T10:00:00Z"
        }
    }

@app.delete("/banking/accounts/{account_id}")
@app.delete("/api/v1/banking/accounts/{account_id}")
async def delete_banking_account(account_id: int):
    """Delete bank account"""
    return {"message": f"Bank account {account_id} deleted successfully"}

# Banking transactions CRUD endpoints
@app.post("/banking/transactions")
@app.post("/api/v1/banking/transactions")
async def create_banking_transaction(transaction: dict):
    """Create new bank transaction"""
    return {
        "message": "Bank transaction created successfully",
        "transaction": {
            "id": 999,
            "transaction_number": f"TXN-2026-{999:04d}",
            "account_id": int(transaction.get("account_id")),
            "transaction_date": transaction.get("transaction_date"),
            "description": transaction.get("description"),
            "reference": transaction.get("reference"),
            "debit": float(transaction.get("debit", 0)),
            "credit": float(transaction.get("credit", 0)),
            "balance": float(transaction.get("balance", 0)),
            "reconciled": False,
            "category": transaction.get("category", ""),
            "created_at": "2026-02-23T10:00:00Z"
        }
    }

@app.put("/banking/transactions/{transaction_id}")
@app.put("/api/v1/banking/transactions/{transaction_id}")
async def update_banking_transaction(transaction_id: int, transaction: dict):
    """Update bank transaction"""
    return {
        "message": "Bank transaction updated successfully",
        "transaction": {
            "id": transaction_id,
            "transaction_number": f"TXN-2026-{transaction_id:04d}",
            "account_id": int(transaction.get("account_id")),
            "transaction_date": transaction.get("transaction_date"),
            "description": transaction.get("description"),
            "reference": transaction.get("reference"),
            "debit": float(transaction.get("debit", 0)),
            "credit": float(transaction.get("credit", 0)),
            "category": transaction.get("category"),
            "updated_at": "2026-02-23T10:00:00Z"
        }
    }

@app.delete("/banking/transactions/{transaction_id}")
@app.delete("/api/v1/banking/transactions/{transaction_id}")
async def delete_banking_transaction(transaction_id: int):
    """Delete bank transaction"""
    return {"message": f"Bank transaction {transaction_id} deleted successfully"}

@app.post("/banking/transactions/{transaction_id}/reconcile")
@app.post("/api/v1/banking/transactions/{transaction_id}/reconcile")
async def reconcile_banking_transaction(transaction_id: int):
    """Mark transaction as reconciled"""
    return {
        "message": f"Transaction {transaction_id} reconciled successfully",
        "transaction": {
            "id": transaction_id,
            "reconciled": True,
            "reconciled_at": "2026-02-23T10:00:00Z"
        }
    }

# Banking reconciliations CRUD endpoints
@app.post("/banking/reconciliations")
@app.post("/api/v1/banking/reconciliations")
async def create_banking_reconciliation(reconciliation: dict):
    """Create new bank reconciliation"""
    statement_balance = float(reconciliation.get("statement_balance", 0))
    gl_balance = float(reconciliation.get("gl_balance", 0))
    difference = statement_balance - gl_balance
    
    return {
        "message": "Bank reconciliation created successfully",
        "reconciliation": {
            "id": 999,
            "reconciliation_number": f"REC-2026-{999:03d}",
            "account_id": int(reconciliation.get("account_id")),
            "statement_date": reconciliation.get("statement_date"),
            "statement_balance": statement_balance,
            "gl_balance": gl_balance,
            "difference": difference,
            "status": "DRAFT",
            "created_at": "2026-02-23T10:00:00Z"
        }
    }

@app.put("/banking/reconciliations/{reconciliation_id}")
@app.put("/api/v1/banking/reconciliations/{reconciliation_id}")
async def update_banking_reconciliation(reconciliation_id: int, reconciliation: dict):
    """Update bank reconciliation"""
    statement_balance = float(reconciliation.get("statement_balance", 0))
    gl_balance = float(reconciliation.get("gl_balance", 0))
    difference = statement_balance - gl_balance
    
    return {
        "message": "Bank reconciliation updated successfully",
        "reconciliation": {
            "id": reconciliation_id,
            "reconciliation_number": f"REC-2026-{reconciliation_id:03d}",
            "account_id": int(reconciliation.get("account_id")),
            "statement_date": reconciliation.get("statement_date"),
            "statement_balance": statement_balance,
            "gl_balance": gl_balance,
            "difference": difference,
            "status": reconciliation.get("status", "DRAFT"),
            "updated_at": "2026-02-23T10:00:00Z"
        }
    }

@app.delete("/banking/reconciliations/{reconciliation_id}")
@app.delete("/api/v1/banking/reconciliations/{reconciliation_id}")
async def delete_banking_reconciliation(reconciliation_id: int):
    """Delete bank reconciliation"""
    return {"message": f"Bank reconciliation {reconciliation_id} deleted successfully"}

@app.post("/banking/reconciliations/{reconciliation_id}/complete")
@app.post("/api/v1/banking/reconciliations/{reconciliation_id}/complete")
async def complete_banking_reconciliation(reconciliation_id: int):
    """Mark reconciliation as completed"""
    return {
        "message": f"Reconciliation {reconciliation_id} completed successfully",
        "reconciliation": {
            "id": reconciliation_id,
            "status": "COMPLETED",
            "completed_at": "2026-02-23T10:00:00Z"
        }
    }

# HR endpoints
@app.get("/hr/metrics")
@app.get("/api/v1/hr/metrics")
async def get_hr_metrics():
    """Get HR dashboard metrics"""
    return {
        "total_employees": 48,
        "active_employees": 45,
        "departments": 8,
        "avg_tenure_months": 28,
        "pending_leave_requests": 6,
        "attendance_rate": 96.8,
        "turnover_rate": 8.3,
        "open_positions": 3
    }

@app.get("/hr/recent-activity")
@app.get("/api/v1/hr/recent-activity")
async def get_hr_recent_activity():
    """Get HR recent activity"""
    activities = [
        {
            "id": 1,
            "type": "hire",
            "employee_name": "Thandi Nkosi",
            "description": "New employee joined - Software Developer",
            "date": "2026-02-20"
        },
        {
            "id": 2,
            "type": "leave",
            "employee_name": "Sipho Mthembu",
            "description": "Annual leave approved - 5 days",
            "date": "2026-02-19"
        },
        {
            "id": 3,
            "type": "promotion",
            "employee_name": "Zanele Dlamini",
            "description": "Promoted to Senior Marketing Manager",
            "date": "2026-02-18"
        },
        {
            "id": 4,
            "type": "leave",
            "employee_name": "Kabelo Mokoena",
            "description": "Sick leave approved - 2 days",
            "date": "2026-02-17"
        },
        {
            "id": 5,
            "type": "hire",
            "employee_name": "Lerato Sithole",
            "description": "New employee joined - HR Coordinator",
            "date": "2026-02-15"
        },
        {
            "id": 6,
            "type": "termination",
            "employee_name": "Bongani Khumalo",
            "description": "Employee resignation - Operations Manager",
            "date": "2026-02-14"
        },
        {
            "id": 7,
            "type": "leave",
            "employee_name": "Nomsa Zulu",
            "description": "Maternity leave started - 4 months",
            "date": "2026-02-12"
        },
        {
            "id": 8,
            "type": "promotion",
            "employee_name": "Tshepo Mahlangu",
            "description": "Promoted to Team Lead - Customer Service",
            "date": "2026-02-10"
        },
        {
            "id": 9,
            "type": "hire",
            "employee_name": "Andile Ndlovu",
            "description": "New employee joined - Accountant",
            "date": "2026-02-08"
        },
        {
            "id": 10,
            "type": "leave",
            "employee_name": "Mpho Radebe",
            "description": "Study leave approved - 3 days",
            "date": "2026-02-05"
        }
    ]
    return {"activities": activities}

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"detail": "Not found", "path": str(request.url)}

@app.exception_handler(500)
async def server_error_handler(request, exc):
    return {"detail": "Internal server error", "error": str(exc)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
