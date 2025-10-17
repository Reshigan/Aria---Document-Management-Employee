#!/usr/bin/env python3
"""
Minimal ARIA FastAPI Application for Testing Login
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
from jose import jwt
from datetime import datetime, timedelta
import os

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# FastAPI app
app = FastAPI(
    title="ARIA Document Management System",
    description="Minimal version for testing",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.get("/")
async def root():
    return {"message": "ARIA API is running", "status": "healthy"}

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    # Simple hardcoded authentication for testing
    if request.username == "admin" and request.password == "admin123":
        # Generate a proper JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": request.username, "id": 1}, 
            expires_delta=access_token_expires
        )
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": 1,
                "username": "admin",
                "email": "admin@aria.local",
                "full_name": "Administrator"
            }
        )
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

# Include intelligent bot routes
try:
    from api.routes.intelligent_bot import router as bot_router
    from api.websocket.bot_websocket import router as websocket_router
    
    app.include_router(bot_router)
    app.include_router(websocket_router)
    print("Intelligent bot routes loaded successfully")
except ImportError as e:
    print(f"Could not load bot routes: {e}")  # Use print instead of logger

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)