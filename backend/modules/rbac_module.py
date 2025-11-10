"""
RBAC Module - Priority 2
Multi-Company Role-Based Access Control with approval workflows
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncpg
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp/rbac", tags=["RBAC"])


# ============================================================================
# Pydantic Models
# ============================================================================

class RoleResponse(BaseModel):
    id: str
    company_id: str
    name: str
    description: Optional[str]
    is_system_role: bool
    permission_count: int

class PermissionResponse(BaseModel):
    id: str
    module: str
    action: str
    description: Optional[str]
    is_high_risk: bool

class UserCompanyRoleResponse(BaseModel):
    id: str
    user_id: str
    company_id: str
    role_id: str
    role_name: str
    is_active: bool

class CheckPermissionRequest(BaseModel):
    user_id: str
    company_id: str
    module: str
    action: str

class AssignRoleRequest(BaseModel):
    user_id: str
    company_id: str
    role_id: str


# ============================================================================
# ============================================================================

async def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    
    try:
        conn = await asyncpg.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# ============================================================================
# ============================================================================

@router.post("/check-permission")
async def check_permission(request: CheckPermissionRequest):
    """
    Check if a user has a specific permission in a company
    
    Returns:
        {"has_permission": true/false, "is_high_risk": true/false}
    """
    conn = await get_db_connection()
    
    try:
        user_roles = await conn.fetch(
            """
            SELECT ucr.role_id, r.name as role_name
            FROM user_company_roles ucr
            JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.user_id = $1 AND ucr.company_id = $2 AND ucr.is_active = true
            """,
            request.user_id,
            request.company_id
        )
        
        if not user_roles:
            return {
                "has_permission": False,
                "is_high_risk": False,
                "message": "User has no roles in this company"
            }
        
        role_ids = [str(role['role_id']) for role in user_roles]
        
        permission_check = await conn.fetchrow(
            """
            SELECT p.id, p.is_high_risk
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ANY($1::uuid[])
              AND p.module = $2
              AND p.action = $3
            LIMIT 1
            """,
            role_ids,
            request.module,
            request.action
        )
        
        if permission_check:
            return {
                "has_permission": True,
                "is_high_risk": permission_check['is_high_risk'],
                "message": "Permission granted"
            }
        else:
            return {
                "has_permission": False,
                "is_high_risk": False,
                "message": "Permission denied"
            }
    
    except Exception as e:
        logger.error(f"Error checking permission: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check permission: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/roles")
async def list_roles(company_id: str):
    """List all roles for a company"""
    conn = await get_db_connection()
    
    try:
        roles = await conn.fetch(
            """
            SELECT r.id, r.company_id, r.name, r.description, r.is_system_role,
                   COUNT(rp.permission_id) as permission_count
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            WHERE r.company_id = $1
            GROUP BY r.id, r.company_id, r.name, r.description, r.is_system_role
            ORDER BY r.name
            """,
            company_id
        )
        
        return {
            "roles": [
                RoleResponse(
                    id=str(role['id']),
                    company_id=str(role['company_id']),
                    name=role['name'],
                    description=role['description'],
                    is_system_role=role['is_system_role'],
                    permission_count=role['permission_count']
                )
                for role in roles
            ],
            "total": len(roles)
        }
    
    except Exception as e:
        logger.error(f"Error listing roles: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list roles: {str(e)}")
    finally:
        await conn.close()


@router.get("/permissions")
async def list_permissions(module: Optional[str] = None):
    """List all permissions, optionally filtered by module"""
    conn = await get_db_connection()
    
    try:
        if module:
            permissions = await conn.fetch(
                """
                SELECT id, module, action, description, is_high_risk
                FROM permissions
                WHERE module = $1
                ORDER BY module, action
                """,
                module
            )
        else:
            permissions = await conn.fetch(
                """
                SELECT id, module, action, description, is_high_risk
                FROM permissions
                ORDER BY module, action
                """
            )
        
        return {
            "permissions": [
                PermissionResponse(
                    id=str(perm['id']),
                    module=perm['module'],
                    action=perm['action'],
                    description=perm['description'],
                    is_high_risk=perm['is_high_risk']
                )
                for perm in permissions
            ],
            "total": len(permissions)
        }
    
    except Exception as e:
        logger.error(f"Error listing permissions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list permissions: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.post("/assign-role")
async def assign_role(request: AssignRoleRequest):
    """Assign a role to a user in a company"""
    conn = await get_db_connection()
    
    try:
        role = await conn.fetchrow(
            "SELECT id, name FROM roles WHERE id = $1 AND company_id = $2",
            request.role_id,
            request.company_id
        )
        
        if not role:
            raise HTTPException(
                status_code=404,
                detail=f"Role {request.role_id} not found in company {request.company_id}"
            )
        
        user_role = await conn.fetchrow(
            """
            INSERT INTO user_company_roles (user_id, company_id, role_id, is_active)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (user_id, company_id, role_id) 
            DO UPDATE SET is_active = true, updated_at = NOW()
            RETURNING id, user_id, company_id, role_id, is_active
            """,
            request.user_id,
            request.company_id,
            request.role_id
        )
        
        return {
            "status": "success",
            "message": f"Role '{role['name']}' assigned to user {request.user_id}",
            "user_role": {
                "id": str(user_role['id']),
                "user_id": str(user_role['user_id']),
                "company_id": str(user_role['company_id']),
                "role_id": str(user_role['role_id']),
                "role_name": role['name'],
                "is_active": user_role['is_active']
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning role: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to assign role: {str(e)}")
    finally:
        await conn.close()


@router.get("/user-roles/{user_id}")
async def get_user_roles(user_id: str, company_id: Optional[str] = None):
    """Get all roles for a user, optionally filtered by company"""
    conn = await get_db_connection()
    
    try:
        if company_id:
            user_roles = await conn.fetch(
                """
                SELECT ucr.id, ucr.user_id, ucr.company_id, ucr.role_id, 
                       r.name as role_name, ucr.is_active
                FROM user_company_roles ucr
                JOIN roles r ON ucr.role_id = r.id
                WHERE ucr.user_id = $1 AND ucr.company_id = $2
                ORDER BY r.name
                """,
                user_id,
                company_id
            )
        else:
            user_roles = await conn.fetch(
                """
                SELECT ucr.id, ucr.user_id, ucr.company_id, ucr.role_id, 
                       r.name as role_name, ucr.is_active
                FROM user_company_roles ucr
                JOIN roles r ON ucr.role_id = r.id
                WHERE ucr.user_id = $1
                ORDER BY r.name
                """,
                user_id
            )
        
        return {
            "user_roles": [
                UserCompanyRoleResponse(
                    id=str(ur['id']),
                    user_id=str(ur['user_id']),
                    company_id=str(ur['company_id']),
                    role_id=str(ur['role_id']),
                    role_name=ur['role_name'],
                    is_active=ur['is_active']
                )
                for ur in user_roles
            ],
            "total": len(user_roles)
        }
    
    except Exception as e:
        logger.error(f"Error getting user roles: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user roles: {str(e)}")
    finally:
        await conn.close()


@router.delete("/user-roles/{user_role_id}")
async def revoke_role(user_role_id: str):
    """Revoke a role from a user (soft delete by setting is_active=false)"""
    conn = await get_db_connection()
    
    try:
        result = await conn.fetchrow(
            """
            UPDATE user_company_roles
            SET is_active = false, updated_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, role_id
            """,
            user_role_id
        )
        
        if not result:
            raise HTTPException(status_code=404, detail=f"User role {user_role_id} not found")
        
        return {
            "status": "success",
            "message": f"Role revoked from user {result['user_id']}",
            "user_role_id": str(result['id'])
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking role: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to revoke role: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/companies")
async def list_companies(user_id: Optional[str] = None):
    """
    List all companies, optionally filtered by user access
    If user_id provided, only return companies the user has access to
    """
    conn = await get_db_connection()
    
    try:
        if user_id:
            companies = await conn.fetch(
                """
                SELECT DISTINCT c.id, c.name, c.legal_name, c.logo_url
                FROM companies c
                JOIN user_company_roles ucr ON c.id = ucr.company_id
                WHERE ucr.user_id = $1 AND ucr.is_active = true
                ORDER BY c.name
                """,
                user_id
            )
        else:
            companies = await conn.fetch(
                """
                SELECT id, name, legal_name, logo_url
                FROM companies
                WHERE is_active = true
                ORDER BY name
                """
            )
        
        return {
            "companies": [
                {
                    "id": str(company['id']),
                    "name": company['name'],
                    "legal_name": company['legal_name'],
                    "logo_url": company['logo_url']
                }
                for company in companies
            ],
            "total": len(companies)
        }
    
    except Exception as e:
        logger.error(f"Error listing companies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list companies: {str(e)}")
    finally:
        await conn.close()


# ============================================================================
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for RBAC module"""
    conn = await get_db_connection()
    
    try:
        tables_required = ['roles', 'permissions', 'role_permissions', 'user_company_roles']
        tables_found = []
        
        for table in tables_required:
            result = await conn.fetchval(
                """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
                """,
                table
            )
            if result:
                tables_found.append(table)
        
        role_count = await conn.fetchval("SELECT COUNT(*) FROM roles")
        permission_count = await conn.fetchval("SELECT COUNT(*) FROM permissions")
        
        all_tables_exist = len(tables_found) == len(tables_required)
        
        return {
            "status": "healthy" if all_tables_exist else "degraded",
            "module": "rbac",
            "tables_found": tables_found,
            "tables_required": tables_required,
            "all_tables_exist": all_tables_exist,
            "role_count": role_count,
            "permission_count": permission_count
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "module": "rbac",
            "error": str(e)
        }
    finally:
        await conn.close()
