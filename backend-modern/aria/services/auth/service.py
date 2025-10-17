"""Authentication service."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from aria.core.security import get_password_hash, verify_password
from aria.models.user import User


class AuthService:
    """Authentication service for user management."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    async def create_user(
        self,
        username: str,
        email: str,
        password: str,
        full_name: Optional[str] = None
    ) -> User:
        """Create a new user."""
        hashed_password = get_password_hash(password)
        
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True,
            is_verified=False,
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password."""
        user = await self.get_user_by_username(username)
        if not user:
            # Try with email
            user = await self.get_user_by_email(username)
        
        if not user or not verify_password(password, user.hashed_password):
            return None
        
        return user
    
    async def update_user(self, user: User) -> User:
        """Update user information."""
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def change_password(self, user: User, new_password: str) -> User:
        """Change user password."""
        user.hashed_password = get_password_hash(new_password)
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def deactivate_user(self, user: User) -> User:
        """Deactivate user account."""
        user.is_active = False
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def activate_user(self, user: User) -> User:
        """Activate user account."""
        user.is_active = True
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def verify_user(self, user: User) -> User:
        """Verify user account."""
        user.is_verified = True
        await self.db.commit()
        await self.db.refresh(user)
        return user