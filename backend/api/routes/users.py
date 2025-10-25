"""User Management API Routes"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from backend.auth.jwt_auth import get_current_user, require_role
from backend.database.multi_tenant import get_current_tenant_db

logger = logging.getLogger(__name__)
router = APIRouter()

class UserCreateRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str = "user"
    
@router.get("/")
async def list_users(current_user: Dict[str, Any] = Depends(require_role("admin")), db = Depends(get_current_tenant_db)):
    """List all users in tenant (admin only)."""
    from backend.models.user import User
    users = db.query(User).filter(User.tenant_id == current_user["tenant_id"]).all()
    return {"users": [u.to_dict() for u in users], "total": len(users)}

@router.get("/{user_id}")
async def get_user(user_id: str, current_user: Dict[str, Any] = Depends(get_current_user), db = Depends(get_current_tenant_db)):
    """Get user by ID."""
    from backend.models.user import User
    user = db.query(User).filter(User.user_id == user_id, User.tenant_id == current_user["tenant_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.to_dict()
