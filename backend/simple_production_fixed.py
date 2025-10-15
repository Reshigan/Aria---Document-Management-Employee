from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title='ARIA Document Management System')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

security = HTTPBearer(auto_error=False)

class LoginRequest(BaseModel):
    email: str
    password: str

MOCK_USERS = {
    'admin@aria.com': {'id': 1, 'email': 'admin@aria.com', 'password': 'admin123', 'name': 'Admin User', 'role': 'admin'},
    'user@aria.com': {'id': 2, 'email': 'user@aria.com', 'password': 'user123', 'name': 'Regular User', 'role': 'user'},
    'admin': {'id': 1, 'email': 'admin@aria.com', 'password': 'admin123', 'name': 'Admin User', 'role': 'admin'}
}

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail='Invalid authentication credentials')
    
    token = credentials.credentials
    if token.startswith('mock_token_'):
        email = token.replace('mock_token_', '')
        if email in MOCK_USERS:
            return MOCK_USERS[email]
    
    raise HTTPException(status_code=401, detail='Invalid authentication credentials')

@app.get('/')
async def root():
    return {'message': 'ARIA Document Management System', 'version': '1.0.0', 'status': 'running'}

@app.get('/health')
async def health():
    return {'status': 'healthy', 'service': 'ARIA Backend', 'environment': 'production'}

@app.get('/api/health')
async def api_health():
    return {'status': 'healthy', 'service': 'ARIA API', 'environment': 'production'}

@app.post('/api/auth/login')
async def login(login_data: LoginRequest):
    user = MOCK_USERS.get(login_data.email)
    if not user or user['password'] != login_data.password:
        raise HTTPException(status_code=401, detail='Invalid email or password')
    
    return {
        'access_token': f'mock_token_{user[email]}',
        'token_type': 'bearer',
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name'], 'role': user['role']}
    }

@app.get('/api/auth/me')
async def get_me(current_user: dict = Depends(get_current_user)):
    return {'id': current_user['id'], 'email': current_user['email'], 'name': current_user['name'], 'role': current_user['role']}

@app.get('/api/documents')
async def get_documents(current_user: dict = Depends(get_current_user)):
    return [
        {'id': 1, 'title': 'Sample Document 1', 'filename': 'sample1.pdf', 'upload_date': '2025-10-12T10:00:00Z', 'size': 1024000, 'type': 'pdf'},
        {'id': 2, 'title': 'Sample Document 2', 'filename': 'sample2.docx', 'upload_date': '2025-10-12T11:00:00Z', 'size': 512000, 'type': 'docx'}
    ]

@app.get('/api/users')
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Insufficient permissions')
    return [{'id': u['id'], 'email': u['email'], 'name': u['name'], 'role': u['role']} for u in MOCK_USERS.values() if 'id' in u]

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000, workers=1)
