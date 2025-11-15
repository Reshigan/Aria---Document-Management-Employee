"""
Role-Based Access Control (RBAC) System
Provides permission checking and role management
"""
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from core.database import get_db
from core.auth import get_current_user

class Permission:
    """Permission constants"""
    # General Ledger
    GL_VIEW = "gl:view"
    GL_CREATE = "gl:create"
    GL_EDIT = "gl:edit"
    GL_DELETE = "gl:delete"
    GL_POST = "gl:post"
    
    # Accounts Receivable
    AR_VIEW = "ar:view"
    AR_CREATE = "ar:create"
    AR_EDIT = "ar:edit"
    AR_DELETE = "ar:delete"
    AR_POST = "ar:post"
    
    # Accounts Payable
    AP_VIEW = "ap:view"
    AP_CREATE = "ap:create"
    AP_EDIT = "ap:edit"
    AP_DELETE = "ap:delete"
    AP_POST = "ap:post"
    
    # Sales
    SALES_VIEW = "sales:view"
    SALES_CREATE = "sales:create"
    SALES_EDIT = "sales:edit"
    SALES_DELETE = "sales:delete"
    SALES_APPROVE = "sales:approve"
    
    # Purchasing
    PURCHASE_VIEW = "purchase:view"
    PURCHASE_CREATE = "purchase:create"
    PURCHASE_EDIT = "purchase:edit"
    PURCHASE_DELETE = "purchase:delete"
    PURCHASE_APPROVE = "purchase:approve"
    
    # Inventory
    INVENTORY_VIEW = "inventory:view"
    INVENTORY_CREATE = "inventory:create"
    INVENTORY_EDIT = "inventory:edit"
    INVENTORY_DELETE = "inventory:delete"
    
    # Manufacturing
    MANUFACTURING_VIEW = "manufacturing:view"
    MANUFACTURING_CREATE = "manufacturing:create"
    MANUFACTURING_EDIT = "manufacturing:edit"
    MANUFACTURING_DELETE = "manufacturing:delete"
    
    # Reports
    REPORTS_VIEW = "reports:view"
    REPORTS_FINANCIAL = "reports:financial"
    REPORTS_OPERATIONAL = "reports:operational"
    
    # Admin
    ADMIN_USERS = "admin:users"
    ADMIN_ROLES = "admin:roles"
    ADMIN_SETTINGS = "admin:settings"
    ADMIN_FULL = "admin:full"

def get_user_permissions(user_id: str, company_id: str, db: Session) -> List[str]:
    """Get all permissions for a user in a company"""
    query = text("""
        SELECT DISTINCT CONCAT(LOWER(p.module), ':', p.action) as permission
        FROM user_company_roles ucr
        JOIN role_permissions rp ON ucr.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ucr.user_id = :user_id
        AND ucr.company_id = :company_id
        AND ucr.is_active = true
    """)
    
    result = db.execute(query, {"user_id": user_id, "company_id": company_id}).fetchall()
    return [row[0] for row in result]

def get_user_roles(user_id: str, company_id: str, db: Session) -> List[dict]:
    """Get all roles for a user in a company"""
    query = text("""
        SELECT r.id, r.name, r.description, r.permissions
        FROM user_company_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = :user_id
        AND ucr.company_id = :company_id
        AND ucr.is_active = true
    """)
    
    result = db.execute(query, {"user_id": user_id, "company_id": company_id}).fetchall()
    return [
        {
            "id": str(row[0]),
            "name": row[1],
            "description": row[2],
            "permissions": row[3]
        }
        for row in result
    ]

def check_permission(user, required_permission: str, db: Session) -> bool:
    """Check if user has a specific permission"""
    company_id = getattr(user, 'company_id', None)
    if not company_id:
        return False
    
    permissions = get_user_permissions(str(user.id), str(company_id), db)
    
    # Check for admin full access
    if Permission.ADMIN_FULL in permissions:
        return True
    
    # Check for specific permission
    return required_permission in permissions

def require_permission(required_permission: str):
    """Dependency to require a specific permission"""
    def permission_checker(
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        if not check_permission(current_user, required_permission, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {required_permission} required"
            )
        return current_user
    
    return permission_checker

def require_any_permission(required_permissions: List[str]):
    """Dependency to require any of the specified permissions"""
    def permission_checker(
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        company_id = getattr(current_user, 'company_id', None)
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not associated with a company"
            )
        
        permissions = get_user_permissions(str(current_user.id), str(company_id), db)
        
        # Check for admin full access
        if Permission.ADMIN_FULL in permissions:
            return current_user
        
        # Check if user has any of the required permissions
        if any(perm in permissions for perm in required_permissions):
            return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: One of {required_permissions} required"
        )
    
    return permission_checker
