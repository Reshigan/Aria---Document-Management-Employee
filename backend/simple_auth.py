from sqlalchemy.orm import Session
from simple_user_model import SimpleUser
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
import logging

logger = logging.getLogger(__name__)

class SimpleAuth:
    def __init__(self, db: Session):
        self.db = db
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = "AriaJWT1730901994SecretKey"
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30

    def authenticate_user(self, email: str, password: str):
        """Simple authentication without complex logging"""
        try:
            # Get user
            user = self.db.query(SimpleUser).filter(SimpleUser.email == email).first()
            if not user:
                logger.info(f"User not found: {email}")
                return None

            # Verify password
            if not self.pwd_context.verify(password, user.hashed_password):
                logger.info(f"Password verification failed for: {email}")
                return None

            # Check if user is active
            if not user.is_active:
                logger.info(f"User is not active: {email}")
                return None

            logger.info(f"Authentication successful for: {email}")
            return user

        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return None

    def create_access_token(self, user: SimpleUser) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode = {
            "sub": str(user.id),
            "email": user.email,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
