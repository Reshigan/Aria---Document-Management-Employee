import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
import json

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import uvicorn

# Import production config
try:
    from production_config import ALLOWED_ORIGINS, UPLOAD_DIR, ENVIRONMENT
except ImportError:
    ALLOWED_ORIGINS = ['*']
    UPLOAD_DIR = Path('./uploads')
    ENVIRONMENT = 'production'

app = FastAPI(
    title='ARIA Document Management System',
    description='Production API for ARIA Document Management',
    version='1.0.0',
    docs_url='/api/docs' if ENVIRONMENT != 'production' else None,
    redoc_url='/api/redoc' if ENVIRONMENT != 'production' else None
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

# Mount static files
app.mount('/uploads', StaticFiles(directory=str(UPLOAD_DIR)), name='uploads')

# Security
security = HTTPBearer(auto_error=False)

# Pydantic models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

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

# Mock data for demonstration
MOCK_USERS = {
    'admin@aria.com': {
        'id': 1,
        'email': 'admin@aria.com',
        'password': 'admin123',  # In production, this would be hashed
        'name': 'Admin User',
        'role': 'admin'
    },
    'user@aria.com': {
        'id': 2,
        'email': 'user@aria.com',
        'password': 'user123',  # In production, this would be hashed
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
    
    # In production, you would verify the JWT token here
    # For now, we'll just check if it's a valid format
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
@app.post('/api/auth/login', response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user = MOCK_USERS.get(login_data.email)
    
    if not user or user['password'] != login_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid email or password'
        )
    
    # Create a mock token (in production, use proper JWT)
    access_token = f'mock_token_{user[email]}'
    
    return LoginResponse(
        access_token=access_token,
        token_type='bearer',
        user={
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role']
        }
    )

@app.get('/api/auth/me', response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return User(
        id=current_user['id'],
        email=current_user['email'],
        name=current_user['name'],
        role=current_user['role']
    )

@app.post('/api/auth/logout')
async def logout():
    return {'message': 'Successfully logged out'}

# Document endpoints
@app.get('/api/documents', response_model=List[Document])
async def get_documents(current_user: dict = Depends(get_current_user)):
    return [Document(**doc) for doc in MOCK_DOCUMENTS]

@app.get('/api/documents/{document_id}', response_model=Document)
async def get_document(document_id: int, current_user: dict = Depends(get_current_user)):
    doc = next((doc for doc in MOCK_DOCUMENTS if doc['id'] == document_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail='Document not found')
    return Document(**doc)

@app.post('/api/documents/upload')
async def upload_document(current_user: dict = Depends(get_current_user)):
    # Placeholder for file upload
    return {
        'message': 'File upload endpoint - implement file handling logic',
        'status': 'placeholder'
    }

@app.delete('/api/documents/{document_id}')
async def delete_document(document_id: int, current_user: dict = Depends(get_current_user)):
    # Check if user has permission (admin only for deletion)
    if current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Insufficient permissions'
        )
    
    doc = next((doc for doc in MOCK_DOCUMENTS if doc['id'] == document_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail='Document not found')
    
    return {'message': f'Document {document_id} deleted successfully'}

# User management endpoints (admin only)
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

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return {
        'error': 'Not Found',
        'message': f'The requested endpoint {request.url.path} was not found',
        'status_code': 404
    }

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    return {
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred',
        'status_code': 500
    }

if __name__ == '__main__':
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=8000,
        workers=1,
        access_log=True,
        log_level='info'
    )
