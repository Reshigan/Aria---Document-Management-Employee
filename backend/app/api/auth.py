"""
ARIA ERP - Authentication API
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user      
from core.security import verify_password, create_access_token, create_refresh_token
from app.models.user import User, Role
from app.models.company import Company
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and create their company"""
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create company if provided
    company = None
    if user_data.company_name:
        company = Company(
            name=user_data.company_name,
            subscription_plan="trial",
            subscription_status="active"
        )
        db.add(company)
        db.flush()
    
    # Create user
    from app.core.security import get_password_hash
    user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        password_hash=get_password_hash(user_data.password),
        company_id=company.id if company else None,
        role="admin" if company else "user"
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id), "company_id": str(user.company_id) if user.company_id else None})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    
    # Find user
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id), "company_id": str(user.company_id) if user.company_id else None})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information"""
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    from jose import jwt, JWTError
    from app.core.config import settings
    from uuid import UUID
    
    try:
        payload = jwt.decode(
            refresh_token,
            settings.JWT_REFRESH_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = UUID(payload.get("sub"))
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    access_token = create_access_token({"sub": str(user.id), "company_id": str(user.company_id) if user.company_id else None})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )
