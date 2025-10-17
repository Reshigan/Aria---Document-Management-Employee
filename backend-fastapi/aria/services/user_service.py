"""
User service for business logic operations.

This module provides high-level user management operations
including authentication, user creation, and profile management.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from aria.core.logging import get_logger
from aria.core.security import get_password_hash, verify_password
from aria.models.user import Role, User
from aria.schemas.user import UserCreate, UserUpdate

logger = get_logger(__name__)


class UserService:
    """
    Service class for user-related operations.
    
    Provides high-level business logic for user management,
    authentication, and related operations.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize user service.
        
        Args:
            db: Database session
        """
        self.db = db
    
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        Authenticate user with username/email and password.
        
        Args:
            username: Username or email address
            password: Plain text password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        # Get user by username or email
        user = await self.get_user_by_username_or_email(username)
        
        if not user:
            return None
        
        # Verify password
        if not verify_password(password, user.hashed_password):
            return None
        
        return user
    
    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User object if found, None otherwise
        """
        stmt = (
            select(User)
            .options(selectinload(User.roles))
            .where(User.id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Get user by username.
        
        Args:
            username: Username
            
        Returns:
            User object if found, None otherwise
        """
        stmt = (
            select(User)
            .options(selectinload(User.roles))
            .where(User.username == username.lower())
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.
        
        Args:
            email: Email address
            
        Returns:
            User object if found, None otherwise
        """
        stmt = (
            select(User)
            .options(selectinload(User.roles))
            .where(User.email == email.lower())
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_by_username_or_email(self, identifier: str) -> Optional[User]:
        """
        Get user by username or email address.
        
        Args:
            identifier: Username or email address
            
        Returns:
            User object if found, None otherwise
        """
        identifier = identifier.lower()
        stmt = (
            select(User)
            .options(selectinload(User.roles))
            .where(or_(User.username == identifier, User.email == identifier))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def create_user(self, user_data: UserCreate) -> User:
        """
        Create a new user.
        
        Args:
            user_data: User creation data
            
        Returns:
            Created user object
            
        Raises:
            ValueError: If username or email already exists
        """
        # Check if username already exists
        existing_user = await self.get_user_by_username(user_data.username)
        if existing_user:
            raise ValueError(f"Username '{user_data.username}' already exists")
        
        # Check if email already exists
        existing_email = await self.get_user_by_email(user_data.email)
        if existing_email:
            raise ValueError(f"Email '{user_data.email}' already exists")
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        user = User(
            username=user_data.username.lower(),
            email=user_data.email.lower(),
            full_name=user_data.full_name,
            phone=user_data.phone,
            department=user_data.department,
            position=user_data.position,
            hashed_password=hashed_password,
            is_active=user_data.is_active,
        )
        
        self.db.add(user)
        await self.db.flush()  # Get the user ID
        
        # Assign roles if provided
        if user_data.role_ids:
            roles = await self.get_roles_by_ids(user_data.role_ids)
            user.roles.extend(roles)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        logger.info("User created", username=user.username, user_id=str(user.id))
        
        return user
    
    async def update_user(self, user_id: UUID, user_data: UserUpdate) -> Optional[User]:
        """
        Update user information.
        
        Args:
            user_id: User ID to update
            user_data: User update data
            
        Returns:
            Updated user object if found, None otherwise
            
        Raises:
            ValueError: If username or email conflicts with existing user
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        # Check for username conflicts
        if user_data.username and user_data.username.lower() != user.username:
            existing_user = await self.get_user_by_username(user_data.username)
            if existing_user:
                raise ValueError(f"Username '{user_data.username}' already exists")
            user.username = user_data.username.lower()
        
        # Check for email conflicts
        if user_data.email and user_data.email.lower() != user.email:
            existing_email = await self.get_user_by_email(user_data.email)
            if existing_email:
                raise ValueError(f"Email '{user_data.email}' already exists")
            user.email = user_data.email.lower()
        
        # Update other fields
        update_fields = [
            'full_name', 'phone', 'department', 'position', 'avatar_url',
            'language', 'timezone', 'theme', 'is_active'
        ]
        
        for field in update_fields:
            value = getattr(user_data, field, None)
            if value is not None:
                setattr(user, field, value)
        
        # Update roles if provided
        if user_data.role_ids is not None:
            roles = await self.get_roles_by_ids(user_data.role_ids)
            user.roles.clear()
            user.roles.extend(roles)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        logger.info("User updated", username=user.username, user_id=str(user.id))
        
        return user
    
    async def update_password(self, user_id: UUID, new_password: str) -> bool:
        """
        Update user password.
        
        Args:
            user_id: User ID
            new_password: New plain text password
            
        Returns:
            True if password updated successfully, False if user not found
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        # Hash new password
        user.hashed_password = get_password_hash(new_password)
        
        await self.db.commit()
        
        logger.info("Password updated", username=user.username, user_id=str(user.id))
        
        return True
    
    async def update_last_login(self, user_id: UUID) -> bool:
        """
        Update user's last login timestamp.
        
        Args:
            user_id: User ID
            
        Returns:
            True if updated successfully, False if user not found
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.last_login = datetime.utcnow()
        await self.db.commit()
        
        return True
    
    async def delete_user(self, user_id: UUID) -> bool:
        """
        Delete user (soft delete by setting is_active to False).
        
        Args:
            user_id: User ID to delete
            
        Returns:
            True if user deleted successfully, False if user not found
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.is_active = False
        await self.db.commit()
        
        logger.info("User deactivated", username=user.username, user_id=str(user.id))
        
        return True
    
    async def get_users(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        role_id: Optional[UUID] = None,
    ) -> tuple[List[User], int]:
        """
        Get users with filtering and pagination.
        
        Args:
            skip: Number of users to skip
            limit: Maximum number of users to return
            search: Search term for username, email, or full name
            is_active: Filter by active status
            role_id: Filter by role ID
            
        Returns:
            Tuple of (users list, total count)
        """
        # Build base query
        stmt = select(User).options(selectinload(User.roles))
        count_stmt = select(func.count(User.id))
        
        # Apply filters
        conditions = []
        
        if search:
            search_term = f"%{search.lower()}%"
            conditions.append(
                or_(
                    User.username.ilike(search_term),
                    User.email.ilike(search_term),
                    User.full_name.ilike(search_term),
                )
            )
        
        if is_active is not None:
            conditions.append(User.is_active == is_active)
        
        if role_id:
            conditions.append(User.roles.any(Role.id == role_id))
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))
        
        # Get total count
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar()
        
        # Apply pagination and ordering
        stmt = stmt.order_by(User.created_at.desc()).offset(skip).limit(limit)
        
        # Execute query
        result = await self.db.execute(stmt)
        users = result.scalars().all()
        
        return list(users), total
    
    async def get_roles_by_ids(self, role_ids: List[UUID]) -> List[Role]:
        """
        Get roles by their IDs.
        
        Args:
            role_ids: List of role IDs
            
        Returns:
            List of role objects
        """
        if not role_ids:
            return []
        
        stmt = select(Role).where(Role.id.in_(role_ids))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify password against hash.
        
        Args:
            plain_password: Plain text password
            hashed_password: Hashed password
            
        Returns:
            True if password matches, False otherwise
        """
        return verify_password(plain_password, hashed_password)