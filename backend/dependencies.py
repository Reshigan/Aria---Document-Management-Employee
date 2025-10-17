from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from core.database import get_db
from models.user import User
import os

# Security
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # For testing, return a mock user object
    return {
        "id": user_id or 1,
        "username": username,
        "email": f"{username}@aria.local",
        "full_name": "Administrator" if username == "admin" else username.title()
    }

def get_current_user_websocket(token: str = None):
    """Get current user for WebSocket connections"""
    try:
        if not token:
            return {"id": "anonymous", "username": "anonymous", "is_admin": False}
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return {"id": "anonymous", "username": "anonymous", "is_admin": False}
        
        # Return user info (in production, fetch from database)
        return {
            "id": 1,
            "username": username,
            "email": "admin@aria.local",
            "is_admin": True
        }
    except JWTError:
        return {"id": "anonymous", "username": "anonymous", "is_admin": False}