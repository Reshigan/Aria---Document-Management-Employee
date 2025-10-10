"""
Enhanced Authentication Service with 2FA, password reset, and session management
"""
import secrets
import hashlib
import pyotp
import qrcode
from io import BytesIO
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from passlib.context import CryptContext
from jose import JWTError, jwt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from core.config import settings
from models import User, PasswordResetToken, UserSession, ActivityLog
from core.database import get_db

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthenticationService:
    """Enhanced authentication service with advanced security features"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    def validate_password_strength(self, password: str) -> Tuple[bool, List[str]]:
        """
        Validate password strength based on configuration
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        if len(password) < settings.PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long")
        
        if settings.PASSWORD_REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if settings.PASSWORD_REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if settings.PASSWORD_REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if settings.PASSWORD_REQUIRE_SYMBOLS and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        
        return len(errors) == 0, errors
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") != token_type:
                return None
            return payload
        except JWTError:
            return None
    
    def authenticate_user(self, db: Session, username: str, password: str, ip_address: str = None, user_agent: str = None) -> Optional[User]:
        """
        Authenticate user with login attempt tracking
        """
        # Find user by username or email
        user = db.query(User).filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user:
            # Log failed login attempt
            self._log_activity(db, None, "login_failed", "authentication", None, 
                             f"Login attempt with invalid username: {username}", 
                             {"ip_address": ip_address, "user_agent": user_agent})
            return None
        
        # Check if account is locked
        if self._is_account_locked(db, user.id):
            self._log_activity(db, user.id, "login_blocked", "authentication", user.id,
                             "Login attempt on locked account",
                             {"ip_address": ip_address, "user_agent": user_agent})
            return None
        
        # Verify password
        if not self.verify_password(password, user.hashed_password):
            # Record failed attempt
            self._record_failed_login(db, user.id, ip_address, user_agent)
            return None
        
        # Check if user is active
        if not user.is_active:
            self._log_activity(db, user.id, "login_blocked", "authentication", user.id,
                             "Login attempt on inactive account",
                             {"ip_address": ip_address, "user_agent": user_agent})
            return None
        
        # Clear failed login attempts on successful login
        self._clear_failed_login_attempts(db, user.id)
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Log successful login
        self._log_activity(db, user.id, "login_success", "authentication", user.id,
                         "User logged in successfully",
                         {"ip_address": ip_address, "user_agent": user_agent})
        
        return user
    
    async def authenticate_user_async(self, db, username: str, password: str, ip_address: str = None, user_agent: str = None) -> Optional[User]:
        """
        Authenticate user with login attempt tracking (async version)
        """
        from sqlalchemy import select
        
        # Find user by username or email
        result = await db.execute(
            select(User).filter(
                (User.username == username) | (User.email == username)
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Log failed login attempt
            await self._log_activity_async(db, None, "login_failed", "authentication", None, 
                                         f"Login attempt with invalid username: {username}", 
                                         {"ip_address": ip_address, "user_agent": user_agent})
            return None
        
        # Check if account is locked
        if await self._is_account_locked_async(db, user.id):
            await self._log_activity_async(db, user.id, "login_blocked", "authentication", user.id,
                                         "Login attempt on locked account",
                                         {"ip_address": ip_address, "user_agent": user_agent})
            return None
        
        # Verify password
        if not self.verify_password(password, user.hashed_password):
            # Record failed attempt
            await self._record_failed_login_async(db, user.id, ip_address, user_agent)
            return None
        
        # Check if user is active
        if not user.is_active:
            await self._log_activity_async(db, user.id, "login_blocked", "authentication", user.id,
                                         "Login attempt on inactive account",
                                         {"ip_address": ip_address, "user_agent": user_agent})
            return None
        
        # Clear failed login attempts on successful login
        await self._clear_failed_login_attempts_async(db, user.id)
        
        # Update last login
        user.last_login = datetime.utcnow()
        await db.commit()
        
        # Log successful login
        await self._log_activity_async(db, user.id, "login_success", "authentication", user.id,
                                     "User logged in successfully",
                                     {"ip_address": ip_address, "user_agent": user_agent})
        
        return user
    
    async def register_user(self, db, username: str, email: str, password: str, 
                           full_name: str = None, phone_number: str = None, 
                           department: str = None, job_title: str = None,
                           ip_address: str = None, user_agent: str = None) -> User:
        """
        Register a new user
        """
        from sqlalchemy import select
        
        # Check if user already exists
        result = await db.execute(
            select(User).filter(
                (User.username == username) | (User.email == email)
            )
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            if existing_user.username == username:
                raise ValueError("Username already exists")
            if existing_user.email == email:
                raise ValueError("Email already exists")
        
        # Validate password strength
        is_valid, errors = self.validate_password_strength(password)
        if not is_valid:
            raise ValueError(f"Password validation failed: {', '.join(errors)}")
        
        # Create new user
        hashed_password = self.get_password_hash(password)
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            phone_number=phone_number,
            department=department,
            job_title=job_title,
            is_active=True,
            is_verified=False,  # Email verification required
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Log registration
        await self._log_activity_async(db, user.id, "user_registered", "user", user.id,
                                     "New user registered",
                                     {"ip_address": ip_address, "user_agent": user_agent})
        
        return user
    
    def create_user_session(self, db: Session, user: User, ip_address: str = None, user_agent: str = None, device_info: Dict = None) -> UserSession:
        """Create a new user session"""
        # Generate tokens
        access_token = self.create_access_token({"sub": user.username, "user_id": user.id})
        refresh_token = self.create_refresh_token({"sub": user.username, "user_id": user.id})
        
        # Create session record
        session = UserSession(
            user_id=user.id,
            session_token=hashlib.sha256(access_token.encode()).hexdigest(),
            refresh_token=hashlib.sha256(refresh_token.encode()).hexdigest(),
            ip_address=ip_address,
            user_agent=user_agent,
            device_info=device_info,
            expires_at=datetime.utcnow() + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Store actual tokens (not hashed) for return
        session.access_token = access_token
        session.refresh_token_value = refresh_token
        
        return session
    
    def refresh_session(self, db: Session, refresh_token: str) -> Optional[UserSession]:
        """Refresh user session with new tokens"""
        # Verify refresh token
        payload = self.verify_token(refresh_token, "refresh")
        if not payload:
            return None
        
        # Find session
        refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        session = db.query(UserSession).filter(
            UserSession.refresh_token == refresh_token_hash,
            UserSession.is_active == True
        ).first()
        
        if not session or session.expires_at < datetime.utcnow():
            return None
        
        # Get user
        user = db.query(User).filter(User.id == session.user_id).first()
        if not user or not user.is_active:
            return None
        
        # Generate new tokens
        access_token = self.create_access_token({"sub": user.username, "user_id": user.id})
        new_refresh_token = self.create_refresh_token({"sub": user.username, "user_id": user.id})
        
        # Update session
        session.session_token = hashlib.sha256(access_token.encode()).hexdigest()
        session.refresh_token = hashlib.sha256(new_refresh_token.encode()).hexdigest()
        session.last_activity = datetime.utcnow()
        session.expires_at = datetime.utcnow() + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
        
        db.commit()
        
        # Store actual tokens for return
        session.access_token = access_token
        session.refresh_token_value = new_refresh_token
        
        return session
    
    def logout_session(self, db: Session, session_token: str) -> bool:
        """Logout a specific session (sync version)"""
        session_token_hash = hashlib.sha256(session_token.encode()).hexdigest()
        session = db.query(UserSession).filter(
            UserSession.session_token == session_token_hash,
            UserSession.is_active == True
        ).first()
        
        if session:
            session.is_active = False
            db.commit()
            
            # Log logout
            self._log_activity(db, session.user_id, "logout", "authentication", session.user_id,
                             "User logged out")
            return True
        
        return False
    
    async def logout_session_async(self, db: AsyncSession, session_token: str) -> bool:
        """Logout a specific session (async version)"""
        session_token_hash = hashlib.sha256(session_token.encode()).hexdigest()
        
        # Find the session
        stmt = select(UserSession).where(
            UserSession.session_token == session_token_hash,
            UserSession.is_active == True
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        
        if session:
            session.is_active = False
            await db.commit()
            
            # Log logout (async version needed)
            await self._log_activity_async(db, session.user_id, "logout", "authentication", session.user_id,
                                         "User logged out")
            return True
        
        return False
    
    def logout_all_sessions(self, db: Session, user_id: int) -> int:
        """Logout all sessions for a user"""
        count = db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        ).update({"is_active": False})
        
        db.commit()
        
        # Log logout all
        self._log_activity(db, user_id, "logout_all", "authentication", user_id,
                         f"All sessions logged out ({count} sessions)")
        
        return count
    
    def get_active_sessions(self, db: Session, user_id: int) -> List[UserSession]:
        """Get all active sessions for a user"""
        return db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.utcnow()
        ).order_by(UserSession.last_activity.desc()).all()
    
    def cleanup_expired_sessions(self, db: Session) -> int:
        """Clean up expired sessions"""
        count = db.query(UserSession).filter(
            UserSession.expires_at < datetime.utcnow()
        ).update({"is_active": False})
        
        db.commit()
        return count
    
    # Password Reset functionality
    def create_password_reset_token(self, db: Session, email: str) -> Optional[PasswordResetToken]:
        """Create password reset token for user"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        
        # Invalidate existing tokens
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False
        ).update({"used": True, "used_at": datetime.utcnow()})
        
        # Create new token
        reset_token = PasswordResetToken.create_for_user(user.id)
        db.add(reset_token)
        db.commit()
        db.refresh(reset_token)
        
        # Send email
        self._send_password_reset_email(user.email, user.full_name or user.username, reset_token.token)
        
        # Log activity
        self._log_activity(db, user.id, "password_reset_requested", "authentication", user.id,
                         "Password reset token created")
        
        return reset_token
    
    def verify_password_reset_token(self, db: Session, token: str) -> Optional[User]:
        """Verify password reset token"""
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token
        ).first()
        
        if not reset_token or not reset_token.is_valid():
            return None
        
        return db.query(User).filter(User.id == reset_token.user_id).first()
    
    def reset_password(self, db: Session, token: str, new_password: str) -> bool:
        """Reset user password with token"""
        # Validate password strength
        is_valid, errors = self.validate_password_strength(new_password)
        if not is_valid:
            raise ValueError(f"Password validation failed: {', '.join(errors)}")
        
        # Verify token
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token
        ).first()
        
        if not reset_token or not reset_token.is_valid():
            return False
        
        # Get user
        user = db.query(User).filter(User.id == reset_token.user_id).first()
        if not user:
            return False
        
        # Update password
        user.hashed_password = self.get_password_hash(new_password)
        
        # Mark token as used
        reset_token.mark_as_used()
        
        # Logout all sessions
        self.logout_all_sessions(db, user.id)
        
        db.commit()
        
        # Log activity
        self._log_activity(db, user.id, "password_reset_completed", "authentication", user.id,
                         "Password reset completed successfully")
        
        return True
    
    # Two-Factor Authentication
    def generate_2fa_secret(self, user: User) -> str:
        """Generate 2FA secret for user"""
        return pyotp.random_base32()
    
    def generate_2fa_qr_code(self, user: User, secret: str) -> str:
        """Generate QR code for 2FA setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name=settings.APP_NAME
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode()
    
    def verify_2fa_token(self, secret: str, token: str) -> bool:
        """Verify 2FA token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Allow 1 window tolerance
    
    def enable_2fa(self, db: Session, user: User, secret: str, token: str) -> bool:
        """Enable 2FA for user"""
        if not self.verify_2fa_token(secret, token):
            return False
        
        # Store encrypted secret (in production, use proper encryption)
        user.two_factor_secret = secret
        user.two_factor_enabled = True
        
        db.commit()
        
        # Log activity
        self._log_activity(db, user.id, "2fa_enabled", "security", user.id,
                         "Two-factor authentication enabled")
        
        return True
    
    def disable_2fa(self, db: Session, user: User, password: str) -> bool:
        """Disable 2FA for user"""
        if not self.verify_password(password, user.hashed_password):
            return False
        
        user.two_factor_secret = None
        user.two_factor_enabled = False
        
        db.commit()
        
        # Log activity
        self._log_activity(db, user.id, "2fa_disabled", "security", user.id,
                         "Two-factor authentication disabled")
        
        return True
    
    # Helper methods
    def _is_account_locked(self, db: Session, user_id: int) -> bool:
        """Check if account is locked due to failed login attempts"""
        if not settings.MAX_LOGIN_ATTEMPTS:
            return False
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=settings.ACCOUNT_LOCKOUT_DURATION_MINUTES)
        
        failed_attempts = db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.action == "login_failed",
            ActivityLog.created_at > cutoff_time
        ).count()
        
        return failed_attempts >= settings.MAX_LOGIN_ATTEMPTS
    
    def _record_failed_login(self, db: Session, user_id: int, ip_address: str = None, user_agent: str = None):
        """Record failed login attempt"""
        self._log_activity(db, user_id, "login_failed", "authentication", user_id,
                         "Failed login attempt",
                         {"ip_address": ip_address, "user_agent": user_agent})
    
    def _clear_failed_login_attempts(self, db: Session, user_id: int):
        """Clear failed login attempts for user"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=settings.ACCOUNT_LOCKOUT_DURATION_MINUTES)
        
        db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.action == "login_failed",
            ActivityLog.created_at > cutoff_time
        ).delete()
        
        db.commit()
    
    def _log_activity(self, db: Session, user_id: Optional[int], action: str, resource_type: str, 
                     resource_id: Optional[int], description: str, metadata: Dict = None,
                     ip_address: str = None, user_agent: str = None):
        """Log user activity"""
        activity = ActivityLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(activity)
        db.commit()
    
    async def _log_activity_async(self, db, user_id: Optional[int], action: str, resource_type: str, 
                                 resource_id: Optional[int], description: str, metadata: Dict = None,
                                 ip_address: str = None, user_agent: str = None):
        """Log user activity (async version)"""
        activity = ActivityLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(activity)
        await db.commit()
    
    async def _is_account_locked_async(self, db, user_id: int) -> bool:
        """Check if account is locked due to failed login attempts (async)"""
        from sqlalchemy import select, func
        
        # Get failed login attempts in the last hour
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        result = await db.execute(
            select(func.count(ActivityLog.id)).filter(
                ActivityLog.user_id == user_id,
                ActivityLog.action == "login_failed",
                ActivityLog.created_at >= one_hour_ago
            )
        )
        failed_attempts = result.scalar()
        
        return failed_attempts >= 5  # Lock after 5 failed attempts
    
    async def _record_failed_login_async(self, db, user_id: int, ip_address: str, user_agent: str):
        """Record failed login attempt (async)"""
        await self._log_activity_async(db, user_id, "login_failed", "authentication", user_id,
                                     "Failed login attempt",
                                     {"ip_address": ip_address, "user_agent": user_agent})
    
    async def _clear_failed_login_attempts_async(self, db, user_id: int):
        """Clear failed login attempts for user (async)"""
        from sqlalchemy import delete
        
        # Delete failed login attempts for this user
        await db.execute(
            delete(ActivityLog).filter(
                ActivityLog.user_id == user_id,
                ActivityLog.action == "login_failed"
            )
        )
        await db.commit()
    
    def _send_password_reset_email(self, email: str, name: str, token: str):
        """Send password reset email"""
        if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD]):
            logger.warning("SMTP not configured, cannot send password reset email")
            return
        
        try:
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            
            msg = MIMEMultipart()
            msg['From'] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg['To'] = email
            msg['Subject'] = f"{settings.APP_NAME} - Password Reset"
            
            body = f"""
            Hi {name},
            
            You requested a password reset for your {settings.APP_NAME} account.
            
            Click the link below to reset your password:
            {reset_url}
            
            This link will expire in 24 hours.
            
            If you didn't request this reset, please ignore this email.
            
            Best regards,
            The {settings.APP_NAME} Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Password reset email sent to {email}")
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")


# Singleton instance
auth_service = AuthenticationService()