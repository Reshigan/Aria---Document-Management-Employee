#!/usr/bin/env python3
"""
Minimal ARIA FastAPI Application for Testing Login
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib

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

@app.get("/")
async def root():
    return {"message": "ARIA API is running", "status": "healthy"}

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    # Simple hardcoded authentication for testing
    if request.username == "admin" and request.password == "admin123":
        # Generate a simple token
        token = hashlib.md5(f"{request.username}:admin123".encode()).hexdigest()
        return LoginResponse(
            access_token=token,
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