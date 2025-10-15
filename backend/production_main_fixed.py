import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
import json

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import uvicorn

# Configuration
ALLOWED_ORIGINS = ['*']
UPLOAD_DIR = Path('./uploads')
ENVIRONMENT = 'production'

app = FastAPI(
    title='ARIA Document Management System',
    description='Production API for ARIA Document Management',
    version='1.0.0'
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['*'],
)

# Create upload directory
UPLOAD_DIR.mkdir(exist_ok=True)

# Security
security = HTTPBearer(auto_error=False)

# Pydantic models
class LoginRequest(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: int
    email: str
    name: str
    role: str

class Document(BaseModel):
    id: int
    title: str
    filename: str
    upload_date: str
    size: int
    type: str

# Mock data
MOCK_USERS = {
    'admin@aria.com': {
        'id': 1,
        'email': 'admin@aria.com',
        'password': 'admin123',
        'name': 'Admin User',
        'role': 'admin'
    },
    'user@aria.com': {
        'id': 2,
        'email': 'user@aria.com',
        'password': 'user123',
        'name': 'Regular User',
        'role': 'user'
    }
}

MOCK_DOCUMENTS = [
    {
        'id': 1,
        'title': 'Sample Document 1',
        'filename': 'sample1.pdf',
        'upload_date': '2025-10-12T10:00:00Z',
        'size': 1024000,
        'type': 'pdf'
    },
    {
        'id': 2,
        'title': 'Sample Document 2',
        'filename': 'sample2.docx',
        'upload_date': '2025-10-12T11:00:00Z',
        'size': 512000,
        'type': 'docx'
    }
]

# Helper functions
def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        return None
    
    token = credentials.credentials
    if token.startswith('mock_token_'):
        email = token.replace('mock_token_', '')
        if email in MOCK_USERS:
            return MOCK_USERS[email]
    return None

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    user = verify_token(credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid authentication credentials',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    return user

# Basic routes
@app.get('/')
async def root():
    return {
        'message': 'ARIA Document Management System',
        'version': '1.0.0',
        'environment': ENVIRONMENT,
        'status': 'running'
    }

@app.get('/health')
async def health_check():
    return {
        'status': 'healthy',
        'service': 'ARIA Backend',
        'environment': ENVIRONMENT
    }

@app.get('/api/health')
async def api_health():
    return {
        'status': 'healthy',
        'service': 'ARIA API',
        'environment': ENVIRONMENT
    }

# Authentication endpoints
@app.post('/api/auth/login')
async def login(login_data: LoginRequest):
    user = MOCK_USERS.get(login_data.email)
    
    if not user or user['password'] != login_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid email or password'
        )
    
    access_token = f'mock_token_{user[email]}'
    
    return {
        'access_token': access_token,
        'token_type': 'bearer',
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role']
        }
    }

@app.get('/api/auth/me')
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        'id': current_user['id'],
        'email': current_user['email'],
        'name': current_user['name'],
        'role': current_user['role']
    }

@app.post('/api/auth/logout')
async def logout():
    return {'message': 'Successfully logged out'}

# Document endpoints
@app.get('/api/documents')
async def get_documents(current_user: dict = Depends(get_current_user)):
    return [doc for doc in MOCK_DOCUMENTS]

@app.get('/api/documents/{document_id}')
async def get_document(document_id: int, current_user: dict = Depends(get_current_user)):
    doc = next((doc for doc in MOCK_DOCUMENTS if doc['id'] == document_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail='Document not found')
    return doc

@app.post('/api/documents/upload')
async def upload_document(current_user: dict = Depends(get_current_user)):
    return {
        'message': 'File upload endpoint ready',
        'status': 'success'
    }

@app.delete('/api/documents/{document_id}')
async def delete_document(document_id: int, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Insufficient permissions'
        )
    
    doc = next((doc for doc in MOCK_DOCUMENTS if doc['id'] == document_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail='Document not found')
    
    return {'message': f'Document {document_id} deleted successfully'}

# User management endpoints
@app.get('/api/users')
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Insufficient permissions'
        )
    
    users = [
        {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role']
        }
        for user in MOCK_USERS.values()
    ]
    return users

if __name__ == '__main__':
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=8000,
        workers=1,
        access_log=True,
        log_level='info'
    )
