from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import json
import time

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

class ChatRequest(BaseModel):
    message: str

class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    upload_date: str
    size: int
    type: str
    ai_classification: Optional[str] = None
    extracted_data: Optional[dict] = None

MOCK_USERS = {
    'admin@aria.com': {'id': 1, 'email': 'admin@aria.com', 'password': 'admin123', 'name': 'Admin User', 'role': 'admin'},
    'user@aria.com': {'id': 2, 'email': 'user@aria.com', 'password': 'user123', 'name': 'Regular User', 'role': 'user'},
    'admin': {'id': 1, 'email': 'admin@aria.com', 'password': 'admin123', 'name': 'Admin User', 'role': 'admin'}
}

# Mock document storage
MOCK_DOCUMENTS = []
DOCUMENT_COUNTER = 1

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
        'access_token': f'mock_token_{user["email"]}',
        'token_type': 'bearer',
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name'], 'role': user['role']}
    }

@app.get('/api/auth/me')
async def get_me(current_user: dict = Depends(get_current_user)):
    return {'id': current_user['id'], 'email': current_user['email'], 'name': current_user['name'], 'role': current_user['role']}

@app.get('/api/documents')
async def get_documents(current_user: dict = Depends(get_current_user)):
    return {'documents': MOCK_DOCUMENTS}

@app.post('/api/documents/upload')
async def upload_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    global DOCUMENT_COUNTER
    
    # Simulate AI processing
    ai_classification = 'Invoice' if 'invoice' in file.filename.lower() else 'Business Document'
    extracted_data = {
        'document_type': ai_classification,
        'confidence': 0.95,
        'extracted_fields': {
            'company_name': 'VantaX Holdings',
            'amount': '1,250.00',
            'date': '2025-10-12'
        }
    }
    
    document = {
        'id': DOCUMENT_COUNTER,
        'title': file.filename,
        'filename': file.filename,
        'upload_date': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'size': file.size or 1024000,
        'type': file.filename.split('.')[-1] if '.' in file.filename else 'unknown',
        'ai_classification': ai_classification,
        'extracted_data': extracted_data,
        'user_id': current_user['id']
    }
    
    MOCK_DOCUMENTS.append(document)
    DOCUMENT_COUNTER += 1
    
    return {
        'message': 'Document uploaded and processed successfully',
        'document': document,
        'ai_processing': {
            'status': 'completed',
            'classification': ai_classification,
            'confidence': 0.95,
            'processing_time': '2.3s'
        }
    }

@app.post('/api/chat')
async def chat_with_aria(chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    message = chat_request.message.lower()
    
    # Simple AI responses based on keywords
    if 'document' in message or 'upload' in message:
        response = 'I can help you process documents using VantaX AI technology. Upload a document and I will classify it and extract business data automatically.'
    elif 'ocr' in message:
        response = 'Our OCR engine can extract text from images and PDFs with 99.5% accuracy. It supports multiple languages and handwriting recognition.'
    elif 'ai' in message or 'classification' in message:
        response = 'ARIA uses advanced AI models to classify documents into categories like invoices, contracts, receipts, and more. The AI also extracts key business data automatically.'
    elif 'sap' in message or 'erp' in message:
        response = 'ARIA integrates seamlessly with SAP ERP systems. Extracted data can be automatically pushed to your SAP modules for streamlined business processes.'
    elif 'excel' in message or 'spreadsheet' in message:
        response = 'I can process Excel files and extract structured data. The AI can identify tables, formulas, and business metrics automatically.'
    elif 'hello' in message or 'hi' in message:
        response = f'Hello {current_user[name]}! I am ARIA, your AI document management assistant. How can I help you today?'
    else:
        response = 'I am ARIA, powered by VantaX multidisciplinary AI technology. I can help with document processing, OCR, AI classification, business data extraction, and SAP integration. What would you like to know?'
    
    return {
        'response': response,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'user': current_user['name'],
        'ai_model': 'ARIA-VantaX-v1.0'
    }

@app.get('/api/users')
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Insufficient permissions')
    return [{'id': u['id'], 'email': u['email'], 'name': u['name'], 'role': u['role']} for u in MOCK_USERS.values() if 'id' in u]

@app.get('/api/system/status')
async def get_system_status(current_user: dict = Depends(get_current_user)):
    return {
        'ocr_engine': 'online',
        'ai_model': 'online', 
        'database': 'online',
        'sap_integration': 'ready',
        'documents_processed': len(MOCK_DOCUMENTS),
        'uptime': '99.9%',
        'version': '1.0.0'
    }

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000, workers=1)
