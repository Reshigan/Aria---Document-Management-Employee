import hashlib
import secrets
import bcrypt
import jwt
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from app.models.user_management import (
    User, Role, Permission, UserRole, RolePermission, UserSession,
    UserAuditLog, UserGroup, UserGroupMember, UserPreference,
    UserNotification, UserActivity
)
from app.services.cache_service import cache_service, monitor_performance
import pyotp
import qrcode
import io
import base64

class UserManagementService:
    def __init__(self, db: Session, jwt_secret: str = "aria_jwt_secret_key"):
        self.db = db
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = "HS256"
        self.session_duration = timedelta(hours=24)
        self.refresh_token_duration = timedelta(days=30)

    # User Management
    @monitor_performance
    def create_user(self, username: str, email: str, password: str, 
                   first_name: str, last_name: str, **kwargs) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = self.db.query(User).filter(
            or_(User.username == username, User.email == email)
        ).first()
        
        if existing_user:
            raise ValueError("User with this username or email already exists")
        
        # Generate password hash and salt
        password_salt = secrets.token_hex(32)
        password_hash = self._hash_password(password, password_salt)
        
        # Create user
        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            display_name=kwargs.get('display_name', f"{first_name} {last_name}"),
            password_hash=password_hash,
            password_salt=password_salt,
            job_title=kwargs.get('job_title'),
            department=kwargs.get('department'),
            manager_id=kwargs.get('manager_id'),
            timezone=kwargs.get('timezone', 'UTC'),
            language=kwargs.get('language', 'en'),
            theme=kwargs.get('theme', 'light')
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Assign default role
        default_role = self.db.query(Role).filter(Role.name == 'user').first()
        if default_role:
            self.assign_role_to_user(user.id, default_role.id, user.id)
        
        # Log user creation
        self._log_audit_action(
            user_id=user.id,
            action='user_created',
            resource_type='user',
            resource_id=str(user.id),
            description=f"User {username} created",
            new_values={'username': username, 'email': email}
        )
        
        return user

    @monitor_performance
    def authenticate_user(self, username_or_email: str, password: str, 
                         ip_address: str = None, user_agent: str = None) -> Optional[Dict[str, Any]]:
        """Authenticate user and create session"""
        # Find user
        user = self.db.query(User).filter(
            or_(User.username == username_or_email, User.email == username_or_email)
        ).first()
        
        if not user:
            self._log_audit_action(
                action='login_failed',
                resource_type='user',
                description=f"Login attempt with invalid username/email: {username_or_email}",
                ip_address=ip_address,
                success=False
            )
            return None
        
        # Check if user is active and not locked
        if not user.is_active:
            self._log_audit_action(
                user_id=user.id,
                action='login_failed',
                resource_type='user',
                resource_id=str(user.id),
                description="Login attempt on inactive account",
                ip_address=ip_address,
                success=False
            )
            return None
        
        if user.is_locked and (not user.locked_until or datetime.utcnow() < user.locked_until):
            self._log_audit_action(
                user_id=user.id,
                action='login_failed',
                resource_type='user',
                resource_id=str(user.id),
                description="Login attempt on locked account",
                ip_address=ip_address,
                success=False
            )
            return None
        
        # Verify password
        if not self._verify_password(password, user.password_hash, user.password_salt):
            # Increment failed login attempts
            user.failed_login_attempts += 1
            user.last_failed_login = datetime.utcnow()
            
            # Lock account after 5 failed attempts
            if user.failed_login_attempts >= 5:
                user.is_locked = True
                user.locked_until = datetime.utcnow() + timedelta(minutes=30)
                user.lock_reason = "Too many failed login attempts"
            
            self.db.commit()
            
            self._log_audit_action(
                user_id=user.id,
                action='login_failed',
                resource_type='user',
                resource_id=str(user.id),
                description="Invalid password",
                ip_address=ip_address,
                success=False
            )
            return None
        
        # Reset failed login attempts on successful authentication
        user.failed_login_attempts = 0
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = ip_address
        user.login_count += 1
        
        # Unlock account if it was temporarily locked
        if user.is_locked and user.locked_until and datetime.utcnow() >= user.locked_until:
            user.is_locked = False
            user.locked_until = None
            user.lock_reason = None
        
        self.db.commit()
        
        # Create session
        session = self._create_user_session(user, ip_address, user_agent)
        
        # Log successful login
        self._log_audit_action(
            user_id=user.id,
            action='login_success',
            resource_type='user',
            resource_id=str(user.id),
            description="User logged in successfully",
            ip_address=ip_address,
            session_id=session.session_token
        )
        
        return {
            'user': self._serialize_user(user),
            'session': {
                'token': session.session_token,
                'refresh_token': session.refresh_token,
                'expires_at': session.expires_at.isoformat()
            }
        }

    @monitor_performance
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    @monitor_performance
    def update_user(self, user_id: int, updated_by: int, **updates) -> User:
        """Update user information"""
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Track changes
        old_values = {}
        new_values = {}
        
        allowed_fields = [
            'first_name', 'last_name', 'display_name', 'email', 'phone_number',
            'job_title', 'department', 'manager_id', 'timezone', 'language',
            'theme', 'avatar_url', 'is_active'
        ]
        
        for field, value in updates.items():
            if field in allowed_fields:
                old_values[field] = getattr(user, field)
                setattr(user, field, value)
                new_values[field] = value
        
        self.db.commit()
        
        # Log update
        self._log_audit_action(
            user_id=updated_by,
            action='user_updated',
            resource_type='user',
            resource_id=str(user_id),
            description=f"User {user.username} updated",
            old_values=old_values,
            new_values=new_values
        )
        
        return user

    @monitor_performance
    def change_password(self, user_id: int, old_password: str, new_password: str) -> bool:
        """Change user password"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        # Verify old password
        if not self._verify_password(old_password, user.password_hash, user.password_salt):
            self._log_audit_action(
                user_id=user_id,
                action='password_change_failed',
                resource_type='user',
                resource_id=str(user_id),
                description="Invalid old password",
                success=False
            )
            return False
        
        # Generate new password hash
        new_salt = secrets.token_hex(32)
        new_hash = self._hash_password(new_password, new_salt)
        
        user.password_hash = new_hash
        user.password_salt = new_salt
        user.password_reset_token = None
        user.password_reset_expires = None
        
        self.db.commit()
        
        # Invalidate all existing sessions
        self._invalidate_user_sessions(user_id)
        
        # Log password change
        self._log_audit_action(
            user_id=user_id,
            action='password_changed',
            resource_type='user',
            resource_id=str(user_id),
            description="Password changed successfully"
        )
        
        return True

    # Role and Permission Management
    @monitor_performance
    def create_role(self, name: str, display_name: str, description: str = None,
                   created_by: int = None, **kwargs) -> Role:
        """Create a new role"""
        existing_role = self.db.query(Role).filter(Role.name == name).first()
        if existing_role:
            raise ValueError("Role with this name already exists")
        
        role = Role(
            name=name,
            display_name=display_name,
            description=description,
            is_system_role=kwargs.get('is_system_role', False),
            priority=kwargs.get('priority', 0),
            color=kwargs.get('color', '#6B7280'),
            icon=kwargs.get('icon')
        )
        
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        
        # Log role creation
        if created_by:
            self._log_audit_action(
                user_id=created_by,
                action='role_created',
                resource_type='role',
                resource_id=str(role.id),
                description=f"Role {name} created",
                new_values={'name': name, 'display_name': display_name}
            )
        
        return role

    @monitor_performance
    def assign_role_to_user(self, user_id: int, role_id: int, assigned_by: int,
                           expires_at: datetime = None, reason: str = None) -> UserRole:
        """Assign role to user"""
        # Check if assignment already exists
        existing = self.db.query(UserRole).filter(
            and_(UserRole.user_id == user_id, UserRole.role_id == role_id)
        ).first()
        
        if existing:
            raise ValueError("User already has this role")
        
        user_role = UserRole(
            user_id=user_id,
            role_id=role_id,
            assigned_by=assigned_by,
            expires_at=expires_at,
            assignment_reason=reason,
            is_temporary=expires_at is not None
        )
        
        self.db.add(user_role)
        self.db.commit()
        self.db.refresh(user_role)
        
        # Log role assignment
        role = self.db.query(Role).filter(Role.id == role_id).first()
        user = self.db.query(User).filter(User.id == user_id).first()
        
        self._log_audit_action(
            user_id=assigned_by,
            action='role_assigned',
            resource_type='user_role',
            resource_id=str(user_role.id),
            description=f"Role {role.name} assigned to user {user.username}",
            new_values={'user_id': user_id, 'role_id': role_id}
        )
        
        return user_role

    @monitor_performance
    def get_user_permissions(self, user_id: int) -> List[Permission]:
        """Get all permissions for a user through their roles"""
        permissions = self.db.query(Permission).join(RolePermission).join(Role).join(UserRole).filter(
            UserRole.user_id == user_id
        ).distinct().all()
        
        return permissions

    @monitor_performance
    def check_user_permission(self, user_id: int, permission_name: str) -> bool:
        """Check if user has specific permission"""
        permission_exists = self.db.query(Permission).join(RolePermission).join(Role).join(UserRole).filter(
            and_(
                UserRole.user_id == user_id,
                Permission.name == permission_name
            )
        ).first()
        
        return permission_exists is not None

    # Session Management
    def _create_user_session(self, user: User, ip_address: str = None, 
                           user_agent: str = None) -> UserSession:
        """Create a new user session"""
        session_token = secrets.token_urlsafe(64)
        refresh_token = secrets.token_urlsafe(64)
        expires_at = datetime.utcnow() + self.session_duration
        
        # Parse device info from user agent
        device_info = self._parse_user_agent(user_agent)
        
        session = UserSession(
            user_id=user.id,
            session_token=session_token,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            device_info=device_info,
            is_mobile=device_info.get('is_mobile', False),
            expires_at=expires_at
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        return session

    @monitor_performance
    def validate_session(self, session_token: str) -> Optional[User]:
        """Validate session token and return user"""
        session = self.db.query(UserSession).filter(
            and_(
                UserSession.session_token == session_token,
                UserSession.is_active == True,
                UserSession.expires_at > datetime.utcnow()
            )
        ).first()
        
        if not session:
            return None
        
        # Update last activity
        session.last_activity = datetime.utcnow()
        self.db.commit()
        
        return session.user

    @monitor_performance
    def logout_user(self, session_token: str) -> bool:
        """Logout user by invalidating session"""
        session = self.db.query(UserSession).filter(
            UserSession.session_token == session_token
        ).first()
        
        if not session:
            return False
        
        session.is_active = False
        session.terminated_at = datetime.utcnow()
        session.termination_reason = 'user_logout'
        
        self.db.commit()
        
        # Log logout
        self._log_audit_action(
            user_id=session.user_id,
            action='logout',
            resource_type='session',
            resource_id=session_token,
            description="User logged out",
            session_id=session_token
        )
        
        return True

    def _invalidate_user_sessions(self, user_id: int):
        """Invalidate all sessions for a user"""
        sessions = self.db.query(UserSession).filter(
            and_(UserSession.user_id == user_id, UserSession.is_active == True)
        ).all()
        
        for session in sessions:
            session.is_active = False
            session.terminated_at = datetime.utcnow()
            session.termination_reason = 'password_changed'
        
        self.db.commit()

    # Two-Factor Authentication
    @monitor_performance
    def enable_2fa(self, user_id: int) -> Dict[str, Any]:
        """Enable two-factor authentication for user"""
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        if user.two_factor_enabled:
            raise ValueError("Two-factor authentication is already enabled")
        
        # Generate secret
        secret = pyotp.random_base32()
        user.two_factor_secret = secret
        
        # Generate backup codes
        backup_codes = [secrets.token_hex(8) for _ in range(10)]
        user.backup_codes = backup_codes
        
        self.db.commit()
        
        # Generate QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="ARIA Document Management"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            'secret': secret,
            'qr_code': f"data:image/png;base64,{qr_code_data}",
            'backup_codes': backup_codes
        }

    @monitor_performance
    def verify_2fa_setup(self, user_id: int, token: str) -> bool:
        """Verify 2FA setup with token"""
        user = self.get_user_by_id(user_id)
        if not user or not user.two_factor_secret:
            return False
        
        totp = pyotp.TOTP(user.two_factor_secret)
        if totp.verify(token):
            user.two_factor_enabled = True
            self.db.commit()
            
            self._log_audit_action(
                user_id=user_id,
                action='2fa_enabled',
                resource_type='user',
                resource_id=str(user_id),
                description="Two-factor authentication enabled"
            )
            
            return True
        
        return False

    # Utility Methods
    def _hash_password(self, password: str, salt: str) -> str:
        """Hash password with salt"""
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()

    def _verify_password(self, password: str, hash: str, salt: str) -> bool:
        """Verify password against hash"""
        return self._hash_password(password, salt) == hash

    def _parse_user_agent(self, user_agent: str) -> Dict[str, Any]:
        """Parse user agent string for device info"""
        if not user_agent:
            return {}
        
        # Simple user agent parsing
        is_mobile = any(mobile in user_agent.lower() for mobile in ['mobile', 'android', 'iphone', 'ipad'])
        
        browser = 'unknown'
        if 'chrome' in user_agent.lower():
            browser = 'chrome'
        elif 'firefox' in user_agent.lower():
            browser = 'firefox'
        elif 'safari' in user_agent.lower():
            browser = 'safari'
        elif 'edge' in user_agent.lower():
            browser = 'edge'
        
        return {
            'is_mobile': is_mobile,
            'browser': browser,
            'user_agent': user_agent
        }

    def _serialize_user(self, user: User) -> Dict[str, Any]:
        """Serialize user object for API response"""
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'display_name': user.display_name,
            'avatar_url': user.avatar_url,
            'job_title': user.job_title,
            'department': user.department,
            'is_active': user.is_active,
            'is_verified': user.is_verified,
            'two_factor_enabled': user.two_factor_enabled,
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
            'created_at': user.created_at.isoformat(),
            'roles': [
                {
                    'id': ur.role.id,
                    'name': ur.role.name,
                    'display_name': ur.role.display_name
                }
                for ur in user.roles
            ]
        }

    def _log_audit_action(self, action: str, resource_type: str, description: str,
                         user_id: int = None, resource_id: str = None,
                         old_values: Dict = None, new_values: Dict = None,
                         ip_address: str = None, session_id: str = None,
                         success: bool = True, error_message: str = None):
        """Log audit action"""
        audit_log = UserAuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            old_values=old_values or {},
            new_values=new_values or {},
            ip_address=ip_address,
            session_id=session_id,
            success=success,
            error_message=error_message
        )
        
        self.db.add(audit_log)
        self.db.commit()

    # Statistics and Analytics
    @monitor_performance
    def get_user_statistics(self) -> Dict[str, Any]:
        """Get comprehensive user statistics"""
        total_users = self.db.query(User).count()
        active_users = self.db.query(User).filter(User.is_active == True).count()
        verified_users = self.db.query(User).filter(User.is_verified == True).count()
        locked_users = self.db.query(User).filter(User.is_locked == True).count()
        
        # Active sessions
        active_sessions = self.db.query(UserSession).filter(
            and_(
                UserSession.is_active == True,
                UserSession.expires_at > datetime.utcnow()
            )
        ).count()
        
        # Recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_registrations = self.db.query(User).filter(
            User.created_at >= thirty_days_ago
        ).count()
        
        # Department breakdown
        departments = self.db.query(
            User.department,
            func.count(User.id).label('count')
        ).filter(User.department.isnot(None)).group_by(User.department).all()
        
        return {
            'total_users': total_users,
            'active_users': active_users,
            'verified_users': verified_users,
            'locked_users': locked_users,
            'active_sessions': active_sessions,
            'recent_registrations': recent_registrations,
            'departments': [
                {'name': dept.department, 'count': dept.count}
                for dept in departments
            ],
            'user_activity': {
                'login_success_rate': self._calculate_login_success_rate(),
                'average_session_duration': self._calculate_avg_session_duration()
            }
        }

    def _calculate_login_success_rate(self) -> float:
        """Calculate login success rate"""
        total_attempts = self.db.query(UserAuditLog).filter(
            UserAuditLog.action.in_(['login_success', 'login_failed'])
        ).count()
        
        if total_attempts == 0:
            return 0.0
        
        successful_attempts = self.db.query(UserAuditLog).filter(
            UserAuditLog.action == 'login_success'
        ).count()
        
        return (successful_attempts / total_attempts) * 100

    def _calculate_avg_session_duration(self) -> float:
        """Calculate average session duration in minutes"""
        completed_sessions = self.db.query(UserSession).filter(
            UserSession.terminated_at.isnot(None)
        ).all()
        
        if not completed_sessions:
            return 0.0
        
        total_duration = sum(
            (session.terminated_at - session.created_at).total_seconds()
            for session in completed_sessions
        )
        
        return (total_duration / len(completed_sessions)) / 60  # Convert to minutes