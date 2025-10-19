#!/usr/bin/env python3
"""
Minimal ARIA FastAPI Application for Testing
"""
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import os
import json

# FastAPI app
app = FastAPI(
    title="ARIA Document Management System",
    description="Advanced Document Management with AI Integration",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str = ""

class DocumentResponse(BaseModel):
    id: int
    filename: str
    status: str
    created_at: str

class ChatRequest(BaseModel):
    message: str
    document_id: int = None

# Mock data
mock_users = [
    {"id": 1, "username": "admin", "email": "admin@aria.local", "full_name": "Administrator", "password": "admin123"},
    {"id": 2, "username": "demo", "email": "demo@aria.local", "full_name": "Demo User", "password": "demo123"}
]

mock_documents = [
    {"id": 1, "filename": "sample_invoice.pdf", "status": "processed", "created_at": "2024-10-19T10:00:00"},
    {"id": 2, "filename": "contract.docx", "status": "pending", "created_at": "2024-10-19T11:00:00"},
    {"id": 3, "filename": "report.xlsx", "status": "processed", "created_at": "2024-10-19T12:00:00"}
]

# Authentication helper
def authenticate_user(username: str, password: str):
    for user in mock_users:
        if (user["username"] == username or user["email"] == username) and user["password"] == password:
            return user
    return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # For demo purposes, return admin user
    return {"id": 1, "username": "admin", "email": "admin@aria.local", "full_name": "Administrator"}

# Routes
@app.get("/")
async def root():
    return {"message": "ARIA Document Management System", "status": "running", "version": "2.0.0"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "service": "aria-api"
    }

@app.get("/api/health")
async def api_health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "service": "aria-api",
        "database": {"status": "healthy"},
        "features": {
            "authentication": "enabled",
            "document_management": "enabled",
            "ai_chat": "enabled",
            "analytics": "enabled"
        }
    }

@app.post("/api/auth/login")
async def login(credentials: LoginRequest):
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Mock JWT token
    token = f"mock_token_for_{user['username']}"
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"]
        }
    }

@app.get("/api/auth/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@app.get("/api/documents")
async def get_documents(current_user: dict = Depends(get_current_user)):
    return {
        "items": [DocumentResponse(**doc) for doc in mock_documents],
        "total": len(mock_documents),
        "page": 1,
        "page_size": 10,
        "pages": 1
    }

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Mock document upload
    new_doc = {
        "id": len(mock_documents) + 1,
        "filename": file.filename,
        "status": "uploaded",
        "created_at": datetime.utcnow().isoformat()
    }
    mock_documents.append(new_doc)
    
    return {
        "message": "Document uploaded successfully",
        "document": DocumentResponse(**new_doc)
    }

@app.post("/api/chat")
async def chat_with_ai(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    # Mock AI response
    responses = [
        f"I understand you're asking about: '{request.message}'. I'm here to help with your documents!",
        f"Based on your question '{request.message}', I can help you analyze your documents.",
        f"Great question about '{request.message}'! I can assist with document management tasks.",
        f"Regarding '{request.message}', I'm ready to help you with document processing and analysis."
    ]
    
    import random
    response = random.choice(responses)
    
    return {
        "response": response,
        "timestamp": datetime.utcnow().isoformat(),
        "document_id": request.document_id
    }

@app.get("/api/analytics/dashboard")
async def get_dashboard_analytics(current_user: dict = Depends(get_current_user)):
    return {
        "total_documents": len(mock_documents),
        "processed_documents": len([d for d in mock_documents if d["status"] == "processed"]),
        "pending_documents": len([d for d in mock_documents if d["status"] == "pending"]),
        "total_users": len(mock_users),
        "system_health": "excellent",
        "recent_activity": [
            {"action": "Document uploaded", "timestamp": "2024-10-19T12:30:00", "user": "admin"},
            {"action": "AI chat session", "timestamp": "2024-10-19T12:25:00", "user": "demo"},
            {"action": "Document processed", "timestamp": "2024-10-19T12:20:00", "user": "admin"}
        ]
    }

@app.get("/api/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    return {
        "system_settings": {
            "max_file_size": "50MB",
            "allowed_file_types": ["pdf", "docx", "xlsx", "png", "jpg"],
            "ai_enabled": True,
            "ocr_enabled": True,
            "notifications_enabled": True
        },
        "user_preferences": {
            "theme": "light",
            "language": "en",
            "notifications": True,
            "auto_process": True
        }
    }

@app.get("/api/reports/document-status")
async def get_document_status_report(current_user: dict = Depends(get_current_user)):
    return {
        "report": {
            "summary": {
                "total_documents": 156,
                "processed": 142,
                "pending": 8,
                "errors": 6,
                "processing_rate": 91.0
            },
            "chart_data": {
                "labels": ["Processed", "Pending", "Failed"],
                "data": [142, 8, 6],
                "colors": ["#10B981", "#F59E0B", "#EF4444"]
            },
            "confidence_analysis": {
                "high_confidence": 128,
                "medium_confidence": 19,
                "low_confidence": 9
            },
            "recent_documents": [
                {"id": 1, "filename": "invoice_001.pdf", "status": "processed", "created_at": "2024-10-19T10:00:00", "document_type": "Invoice", "confidence": 95},
                {"id": 2, "filename": "contract_v2.docx", "status": "pending", "created_at": "2024-10-19T11:00:00", "document_type": "Contract", "confidence": 87},
                {"id": 3, "filename": "report_q3.xlsx", "status": "processed", "created_at": "2024-10-19T12:00:00", "document_type": "Report", "confidence": 92}
            ]
        }
    }

@app.get("/api/reports/sap-posting")
async def get_sap_posting_report(current_user: dict = Depends(get_current_user)):
    return {
        "report": {
            "summary": {
                "total_sap_attempts": 89,
                "successful_postings": 82,
                "failed_postings": 7,
                "success_rate": 92.1
            },
            "chart_data": {
                "labels": ["Successful", "Failed"],
                "data": [82, 7],
                "colors": ["#10B981", "#EF4444"]
            },
            "recent_postings": [
                {"id": 1, "document": "invoice_001.pdf", "sap_doc_number": "5000000123", "status": "success", "posted_at": "2024-10-19T10:30:00"},
                {"id": 2, "document": "invoice_002.pdf", "sap_doc_number": "5000000124", "status": "success", "posted_at": "2024-10-19T11:15:00"},
                {"id": 3, "document": "invoice_003.pdf", "sap_doc_number": "", "status": "failed", "posted_at": "2024-10-19T12:45:00"}
            ]
        }
    }

@app.get("/api/reports/processing-stats")
async def get_processing_stats_report(current_user: dict = Depends(get_current_user)):
    return {
        "report": {
            "summary": {
                "total_documents": 156,
                "avg_processing_time": 2.3,
                "recent_activity_count": 23
            },
            "document_type_distribution": [
                {"document_type": "Invoice", "count": 89, "percentage": 57},
                {"document_type": "Contract", "count": 34, "percentage": 22},
                {"document_type": "Receipt", "count": 23, "percentage": 15},
                {"document_type": "Other", "count": 10, "percentage": 6}
            ],
            "processing_time_trends": [
                {"date": "2024-10-19", "avg_time": 2.1, "document_count": 23},
                {"date": "2024-10-18", "avg_time": 2.4, "document_count": 19},
                {"date": "2024-10-17", "avg_time": 2.2, "document_count": 31},
                {"date": "2024-10-16", "avg_time": 2.6, "document_count": 18},
                {"date": "2024-10-15", "avg_time": 2.0, "document_count": 27}
            ],
            "chart_data": {
                "labels": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
                "data": [2, 1, 8, 15, 12, 5],
                "colors": ["#3B82F6"]
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=12000)