"""
Authentication API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from typing import Optional

from backend.core.auth import AuthService, get_db
from backend.models.user import User
from backend.models.tenant_models import Organization, OrganizationUser, SubscriptionPlan

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    organization_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """Create new user and organization"""
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = AuthService.get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        is_active=True
    )
    db.add(user)
    db.flush()
    
    # Create organization
    org_slug = user_data.organization_name.lower().replace(" ", "-")
    org = Organization(
        name=user_data.organization_name,
        slug=org_slug,
        subscription_plan=SubscriptionPlan.FREE,
        status="trial"
    )
    db.add(org)
    db.flush()
    
    # Link user to organization
    org_user = OrganizationUser(
        organization_id=org.id,
        user_id=user.id,
        role="owner",
        is_primary=True
    )
    db.add(org_user)
    db.commit()
    
    # Create access token
    access_token = AuthService.create_access_token(
        data={"user_id": user.id, "organization_id": org.id}
    )
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "organization_id": org.id,
            "organization_name": org.name
        }
    )

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login user"""
    
    # Find user
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not AuthService.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is inactive")
    
    # Get user's organization
    org_user = db.query(OrganizationUser).filter(
        OrganizationUser.user_id == user.id
    ).first()
    
    # Create access token
    access_token = AuthService.create_access_token(
        data={
            "user_id": user.id,
            "organization_id": org_user.organization_id if org_user else None
        }
    )
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "organization_id": org_user.organization_id if org_user else None
        }
    )

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active
    }
