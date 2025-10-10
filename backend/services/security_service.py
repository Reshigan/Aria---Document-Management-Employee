from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from models.security_models import (
    Permission, Role, RolePermission, UserRole, UserSession, 
    PasswordHistory, TwoFactorAuth, SecurityEvent, AuditLog,
    APIKey, LoginAttempt, AccountLockout, SecurityPolicy,
    SessionStatus, SecurityEventType, AuditAction
)
from models.user import User
from schemas.security_schemas import *
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import hashlib
import secrets
import pyotp
import qrcode
import io
import base64
from passlib.context import CryptContext
import jwt
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class SecurityService:
    def __init__(self, db: Session):
        self.db = db
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = "your-secret-key-here"  # Should be from environment
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7
    
    # Authentication Methods
    def authenticate_user(self, email: str, password: str, ip_address: str = None, user_agent: str = None) -> Optional[User]:
        """Authenticate user with email and password"""
        try:
            # Log login attempt
            self.log_login_attempt(email, ip_address, user_agent, success=False)
            
            # Check if account is locked
            if self.is_account_locked(email):
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Account is locked due to too many failed login attempts"
                )
            
            # Get user
            user = self.db.query(User).filter(User.email == email).first()
            if not user:
                self.increment_failed_login_attempts(email, ip_address)
                return None
            
            # Verify password
            if not self.verify_password(password, user.password_hash):
                self.increment_failed_login_attempts(email, ip_address)
                return None
            
            # Check if user is active
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is disabled"
                )
            
            # Reset failed login attempts on successful login
            self.reset_failed_login_attempts(email)
            
            # Log successful login attempt
            self.log_login_attempt(email, ip_address, user_agent, success=True)
            
            # Update last login
            user.last_login = datetime.utcnow()
            self.db.commit()
            
            return user
            
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise
    
    def create_access_token(self, user: User, session: UserSession) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode = {
            "sub": str(user.id),
            "email": user.email,
            "session_id": session.id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user: User, session: UserSession) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode = {
            "sub": str(user.id),
            "session_id": session.id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    # Session Management
    def create_session(self, user: User, ip_address: str = None, user_agent: str = None, device_info: Dict = None) -> UserSession:
        """Create new user session"""
        session = UserSession(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_info=device_info,
            status=SessionStatus.ACTIVE
        )
        session.generate_tokens()
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        # Log session creation
        self.log_audit_event(
            user_id=user.id,
            session_id=session.id,
            action=AuditAction.LOGIN,
            description="User logged in",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return session
    
    def get_user_sessions(self, user_id: int) -> List[UserSession]:
        """Get all active sessions for user"""
        return self.db.query(UserSession).filter(
            and_(
                UserSession.user_id == user_id,
                UserSession.status == SessionStatus.ACTIVE,
                UserSession.expires_at > datetime.utcnow()
            )
        ).all()
    
    def revoke_session(self, session_id: int, revoked_by: int = None) -> bool:
        """Revoke user session"""
        session = self.db.query(UserSession).filter(UserSession.id == session_id).first()
        if session:
            session.status = SessionStatus.REVOKED
            session.revoked_at = datetime.utcnow()
            session.revoked_by = revoked_by
            self.db.commit()
            
            # Log session revocation
            self.log_audit_event(
                user_id=session.user_id,
                session_id=session_id,
                action=AuditAction.LOGOUT,
                description="Session revoked"
            )
            
            return True
        return False
    
    def revoke_all_user_sessions(self, user_id: int, except_session_id: int = None) -> int:
        """Revoke all sessions for user except specified one"""
        query = self.db.query(UserSession).filter(
            and_(
                UserSession.user_id == user_id,
                UserSession.status == SessionStatus.ACTIVE
            )
        )
        
        if except_session_id:
            query = query.filter(UserSession.id != except_session_id)
        
        sessions = query.all()
        count = 0
        
        for session in sessions:
            session.status = SessionStatus.REVOKED
            session.revoked_at = datetime.utcnow()
            count += 1
        
        self.db.commit()
        return count
    
    # Password Management
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> bool:
        """Change user password"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Verify current password
        if not self.verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Check password history
        if self.is_password_reused(user_id, new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password has been used recently. Please choose a different password."
            )
        
        # Save old password to history
        old_password_history = PasswordHistory(
            user_id=user_id,
            password_hash=user.password_hash
        )
        self.db.add(old_password_history)
        
        # Update password
        user.password_hash = self.hash_password(new_password)
        user.password_changed_at = datetime.utcnow()
        
        # Clean up old password history (keep last 5)
        self.cleanup_password_history(user_id)
        
        self.db.commit()
        
        # Log password change
        self.log_security_event(
            user_id=user_id,
            event_type=SecurityEventType.PASSWORD_CHANGE,
            description="User changed password"
        )
        
        return True
    
    def is_password_reused(self, user_id: int, new_password: str) -> bool:
        """Check if password was used recently"""
        password_history = self.db.query(PasswordHistory).filter(
            PasswordHistory.user_id == user_id
        ).order_by(desc(PasswordHistory.created_at)).limit(5).all()
        
        for history in password_history:
            if self.verify_password(new_password, history.password_hash):
                return True
        
        # Also check current password
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and self.verify_password(new_password, user.password_hash):
            return True
        
        return False
    
    def cleanup_password_history(self, user_id: int, keep_count: int = 5):
        """Clean up old password history entries"""
        old_passwords = self.db.query(PasswordHistory).filter(
            PasswordHistory.user_id == user_id
        ).order_by(desc(PasswordHistory.created_at)).offset(keep_count).all()
        
        for password in old_passwords:
            self.db.delete(password)
    
    # Two-Factor Authentication
    def setup_2fa(self, user_id: int) -> Dict[str, Any]:
        """Setup two-factor authentication for user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate secret key
        secret = pyotp.random_base32()
        
        # Generate backup codes
        backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
        
        # Create or update 2FA record
        two_factor = self.db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == user_id).first()
        if not two_factor:
            two_factor = TwoFactorAuth(user_id=user_id)
            self.db.add(two_factor)
        
        two_factor.secret_key = secret
        two_factor.backup_codes = backup_codes
        two_factor.is_enabled = False  # Will be enabled after verification
        
        self.db.commit()
        
        # Generate QR code
        totp = pyotp.TOTP(secret)
        qr_url = totp.provisioning_uri(
            name=user.email,
            issuer_name="ARIA Document Management"
        )
        
        return {
            "secret_key": secret,
            "qr_code_url": qr_url,
            "backup_codes": backup_codes
        }
    
    def verify_2fa_setup(self, user_id: int, code: str) -> bool:
        """Verify 2FA setup with TOTP code"""
        two_factor = self.db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == user_id).first()
        if not two_factor:
            return False
        
        totp = pyotp.TOTP(two_factor.secret_key)
        if totp.verify(code):
            two_factor.is_enabled = True
            two_factor.enabled_at = datetime.utcnow()
            self.db.commit()
            
            # Log 2FA enabled
            self.log_security_event(
                user_id=user_id,
                event_type=SecurityEventType.TWO_FACTOR_ENABLED,
                description="Two-factor authentication enabled"
            )
            
            return True
        
        return False
    
    def verify_2fa_code(self, user_id: int, code: str) -> bool:
        """Verify 2FA code during login"""
        two_factor = self.db.query(TwoFactorAuth).filter(
            and_(
                TwoFactorAuth.user_id == user_id,
                TwoFactorAuth.is_enabled == True
            )
        ).first()
        
        if not two_factor:
            return False
        
        # Try TOTP code first
        totp = pyotp.TOTP(two_factor.secret_key)
        if totp.verify(code):
            two_factor.last_used = datetime.utcnow()
            self.db.commit()
            return True
        
        # Try backup codes
        if code.upper() in two_factor.backup_codes:
            # Remove used backup code
            backup_codes = two_factor.backup_codes.copy()
            backup_codes.remove(code.upper())
            two_factor.backup_codes = backup_codes
            two_factor.last_used = datetime.utcnow()
            self.db.commit()
            return True
        
        return False
    
    def disable_2fa(self, user_id: int, password: str, code: str) -> bool:
        """Disable two-factor authentication"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not self.verify_password(password, user.password_hash):
            return False
        
        two_factor = self.db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == user_id).first()
        if not two_factor or not two_factor.is_enabled:
            return False
        
        # Verify 2FA code
        if not self.verify_2fa_code(user_id, code):
            return False
        
        # Disable 2FA
        two_factor.is_enabled = False
        self.db.commit()
        
        # Log 2FA disabled
        self.log_security_event(
            user_id=user_id,
            event_type=SecurityEventType.TWO_FACTOR_DISABLED,
            description="Two-factor authentication disabled"
        )
        
        return True
    
    # Role and Permission Management
    def create_role(self, role_data: RoleCreate) -> Role:
        """Create new role"""
        role = Role(
            name=role_data.name,
            description=role_data.description,
            is_active=role_data.is_active
        )
        self.db.add(role)
        self.db.flush()
        
        # Add permissions
        for permission_id in role_data.permission_ids:
            role_permission = RolePermission(
                role_id=role.id,
                permission_id=permission_id
            )
            self.db.add(role_permission)
        
        self.db.commit()
        self.db.refresh(role)
        return role
    
    def assign_role_to_user(self, user_id: int, role_id: int, assigned_by: int = None, expires_at: datetime = None) -> UserRole:
        """Assign role to user"""
        # Check if assignment already exists
        existing = self.db.query(UserRole).filter(
            and_(
                UserRole.user_id == user_id,
                UserRole.role_id == role_id,
                UserRole.is_active == True
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has this role"
            )
        
        user_role = UserRole(
            user_id=user_id,
            role_id=role_id,
            assigned_by=assigned_by,
            expires_at=expires_at
        )
        
        self.db.add(user_role)
        self.db.commit()
        self.db.refresh(user_role)
        
        # Log role assignment
        self.log_audit_event(
            user_id=assigned_by,
            action=AuditAction.ROLE_CHANGE,
            resource_type="user",
            resource_id=user_id,
            description=f"Assigned role {role_id} to user {user_id}"
        )
        
        return user_role
    
    def get_user_permissions(self, user_id: int) -> List[str]:
        """Get all permissions for user"""
        permissions = self.db.query(Permission.name).join(
            RolePermission, Permission.id == RolePermission.permission_id
        ).join(
            Role, RolePermission.role_id == Role.id
        ).join(
            UserRole, Role.id == UserRole.role_id
        ).filter(
            and_(
                UserRole.user_id == user_id,
                UserRole.is_active == True,
                Role.is_active == True,
                or_(
                    UserRole.expires_at.is_(None),
                    UserRole.expires_at > datetime.utcnow()
                )
            )
        ).distinct().all()
        
        return [p.name for p in permissions]
    
    def has_permission(self, user_id: int, permission: str) -> bool:
        """Check if user has specific permission"""
        permissions = self.get_user_permissions(user_id)
        return permission in permissions
    
    # API Key Management
    def create_api_key(self, user_id: int, key_data: APIKeyCreate) -> Dict[str, Any]:
        """Create new API key"""
        api_key = APIKey(
            user_id=user_id,
            name=key_data.name,
            permissions=key_data.permissions,
            rate_limit=key_data.rate_limit,
            expires_at=key_data.expires_at
        )
        
        key = api_key.generate_key()
        
        self.db.add(api_key)
        self.db.commit()
        self.db.refresh(api_key)
        
        return {
            "api_key": key,
            "id": api_key.id,
            "name": api_key.name,
            "key_prefix": api_key.key_prefix,
            "permissions": api_key.permissions,
            "rate_limit": api_key.rate_limit,
            "expires_at": api_key.expires_at,
            "created_at": api_key.created_at
        }
    
    def verify_api_key(self, key: str) -> Optional[APIKey]:
        """Verify API key"""
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        api_key = self.db.query(APIKey).filter(
            and_(
                APIKey.key_hash == key_hash,
                APIKey.is_active == True,
                or_(
                    APIKey.expires_at.is_(None),
                    APIKey.expires_at > datetime.utcnow()
                )
            )
        ).first()
        
        if api_key:
            # Update usage
            api_key.last_used = datetime.utcnow()
            api_key.usage_count += 1
            self.db.commit()
        
        return api_key
    
    # Security Events and Audit Logging
    def log_security_event(self, event_type: SecurityEventType, description: str, user_id: int = None, 
                          severity: str = "medium", ip_address: str = None, user_agent: str = None,
                          additional_data: Dict = None):
        """Log security event"""
        event = SecurityEvent(
            user_id=user_id,
            event_type=event_type,
            severity=severity,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=additional_data
        )
        
        self.db.add(event)
        self.db.commit()
    
    def log_audit_event(self, action: AuditAction, user_id: int = None, session_id: int = None,
                       resource_type: str = None, resource_id: int = None, resource_name: str = None,
                       description: str = None, ip_address: str = None, user_agent: str = None,
                       request_data: Dict = None, response_data: Dict = None, success: bool = True,
                       error_message: str = None, execution_time_ms: int = None):
        """Log audit event"""
        audit_log = AuditLog(
            user_id=user_id,
            session_id=session_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            request_data=request_data,
            response_data=response_data,
            success=success,
            error_message=error_message,
            execution_time_ms=execution_time_ms
        )
        
        self.db.add(audit_log)
        self.db.commit()
    
    # Account Lockout Management
    def is_account_locked(self, email: str) -> bool:
        """Check if account is locked"""
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return False
        
        lockout = self.db.query(AccountLockout).filter(
            and_(
                AccountLockout.user_id == user.id,
                AccountLockout.is_active == True,
                or_(
                    AccountLockout.unlock_at.is_(None),
                    AccountLockout.unlock_at > datetime.utcnow()
                )
            )
        ).first()
        
        return lockout is not None
    
    def lock_account(self, user_id: int, reason: str, locked_by: int = None, duration_minutes: int = 30):
        """Lock user account"""
        unlock_at = datetime.utcnow() + timedelta(minutes=duration_minutes) if duration_minutes else None
        
        lockout = AccountLockout(
            user_id=user_id,
            reason=reason,
            locked_by=locked_by,
            unlock_at=unlock_at
        )
        
        self.db.add(lockout)
        self.db.commit()
        
        # Log security event
        self.log_security_event(
            user_id=user_id,
            event_type=SecurityEventType.ACCOUNT_LOCKED,
            description=f"Account locked: {reason}",
            severity="high"
        )
    
    def unlock_account(self, user_id: int, unlocked_by: int = None):
        """Unlock user account"""
        lockouts = self.db.query(AccountLockout).filter(
            and_(
                AccountLockout.user_id == user_id,
                AccountLockout.is_active == True
            )
        ).all()
        
        for lockout in lockouts:
            lockout.is_active = False
            lockout.unlocked_by = unlocked_by
            lockout.unlocked_at = datetime.utcnow()
        
        self.db.commit()
        
        # Log security event
        self.log_security_event(
            user_id=user_id,
            event_type=SecurityEventType.ACCOUNT_UNLOCKED,
            description="Account unlocked",
            severity="medium"
        )
    
    # Login Attempt Tracking
    def log_login_attempt(self, email: str, ip_address: str = None, user_agent: str = None, success: bool = False):
        """Log login attempt"""
        attempt = LoginAttempt(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=None if success else "Invalid credentials"
        )
        
        self.db.add(attempt)
        self.db.commit()
    
    def increment_failed_login_attempts(self, email: str, ip_address: str = None):
        """Increment failed login attempts and lock account if necessary"""
        # Count recent failed attempts (last 30 minutes)
        since = datetime.utcnow() - timedelta(minutes=30)
        failed_count = self.db.query(LoginAttempt).filter(
            and_(
                LoginAttempt.email == email,
                LoginAttempt.success == False,
                LoginAttempt.created_at >= since
            )
        ).count()
        
        # Lock account after 5 failed attempts
        if failed_count >= 5:
            user = self.db.query(User).filter(User.email == email).first()
            if user:
                self.lock_account(
                    user_id=user.id,
                    reason="Too many failed login attempts",
                    duration_minutes=30
                )
    
    def reset_failed_login_attempts(self, email: str):
        """Reset failed login attempts counter (called on successful login)"""
        # This is handled by the natural expiration of attempts (30 minutes)
        pass
    
    # Security Dashboard
    def get_security_dashboard(self) -> Dict[str, Any]:
        """Get security dashboard data"""
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        
        # Active sessions
        active_sessions = self.db.query(UserSession).filter(
            and_(
                UserSession.status == SessionStatus.ACTIVE,
                UserSession.expires_at > now
            )
        ).count()
        
        # Failed logins in last 24h
        failed_logins = self.db.query(LoginAttempt).filter(
            and_(
                LoginAttempt.success == False,
                LoginAttempt.created_at >= last_24h
            )
        ).count()
        
        # Security events in last 24h
        security_events = self.db.query(SecurityEvent).filter(
            SecurityEvent.created_at >= last_24h
        ).count()
        
        # Locked accounts
        locked_accounts = self.db.query(AccountLockout).filter(
            and_(
                AccountLockout.is_active == True,
                or_(
                    AccountLockout.unlock_at.is_(None),
                    AccountLockout.unlock_at > now
                )
            )
        ).count()
        
        # API key usage
        api_usage = self.db.query(func.sum(APIKey.usage_count)).scalar() or 0
        
        # 2FA enabled users
        two_factor_users = self.db.query(TwoFactorAuth).filter(
            TwoFactorAuth.is_enabled == True
        ).count()
        
        # Recent security events
        recent_events = self.db.query(SecurityEvent).filter(
            SecurityEvent.created_at >= last_24h
        ).order_by(desc(SecurityEvent.created_at)).limit(10).all()
        
        return {
            "active_sessions": active_sessions,
            "failed_logins_24h": failed_logins,
            "security_events_24h": security_events,
            "locked_accounts": locked_accounts,
            "api_key_usage": api_usage,
            "two_factor_enabled_users": two_factor_users,
            "recent_security_events": recent_events
        }