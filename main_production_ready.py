# This is the complete production-ready main.py file
# Copy this entire content to /var/www/aria/backend/main.py on the production server

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Optional, List
import json
import traceback
import asyncio
from pathlib import Path

# FastAPI imports
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Database imports
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, func, or_, and_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.exc import SQLAlchemyError

# Security imports
import jwt
import bcrypt
from passlib.context import CryptContext

# Pydantic imports
from pydantic import BaseModel, EmailStr, validator
from pydantic.config import ConfigDict

# Additional imports
import aiofiles
import uuid
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = "sqlite+aiosqlite:///./aria.db"
engine = create_engine(DATABASE_URL.replace("+aiosqlite", ""), connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    documents = relationship("Document", back_populates="uploader")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String, nullable=False)
    filename = Column(String, nullable=False)  # stored filename
    file_path = Column(String)
    file_size = Column(Integer)
    content_type = Column(String)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    upload_date = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)
    extracted_text = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    uploader = relationship("User", back_populates="documents")

# Pydantic models
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class DocumentResponse(BaseModel):
    id: int
    original_filename: str
    filename: str
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    upload_date: datetime
    processed: bool
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Performance tracking
class PerformanceTracker:
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = (datetime.utcnow() - self.start_time).total_seconds() * 1000
            logger.info(f"Performance: {self.operation_name} completed in {duration:.2f}ms")

# Health checker
class HealthChecker:
    @staticmethod
    async def check_database_health():
        try:
            db = SessionLocal()
            db.execute("SELECT 1")
            db.close()
            return {"status": "healthy", "message": "Database connection successful"}
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {"status": "unhealthy", "message": f"Database error: {str(e)}"}
    
    @staticmethod
    async def check_redis_health():
        # Redis health check (if Redis is available)
        try:
            # For now, return healthy as Redis is optional
            return {"status": "healthy", "message": "Redis not configured"}
        except Exception as e:
            return {"status": "unhealthy", "message": f"Redis error: {str(e)}"}
    
    @staticmethod
    async def check_file_system_health():
        try:
            uploads_dir = Path("./uploads")
            uploads_dir.mkdir(exist_ok=True)
            
            # Check if we can write to uploads directory
            test_file = uploads_dir / "health_check.tmp"
            test_file.write_text("health check")
            test_file.unlink()
            
            return {"status": "healthy", "message": "File system accessible"}
        except Exception as e:
            logger.error(f"File system health check failed: {e}")
            return {"status": "warning", "message": f"File system issue: {str(e)}"}

# Create FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Aria Document Management System")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Create uploads directory
    uploads_dir = Path("./uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Create default admin user if not exists
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin@aria.vantax.co.za").first()
        if not admin_user:
            admin_user = User(
                username="admin@aria.vantax.co.za",
                email="admin@aria.vantax.co.za",
                password_hash=get_password_hash("admin123"),
                full_name="System Administrator",
                is_active=True,
                is_superuser=True
            )
            db.add(admin_user)
            db.commit()
            logger.info("Created default admin user")
        
        # Create demo user if not exists
        demo_user = db.query(User).filter(User.username == "demo@aria.vantax.co.za").first()
        if not demo_user:
            demo_user = User(
                username="demo@aria.vantax.co.za",
                email="demo@aria.vantax.co.za",
                password_hash=get_password_hash("demo123"),
                full_name="Demo User",
                is_active=True,
                is_superuser=False
            )
            db.add(demo_user)
            db.commit()
            logger.info("Created demo user")
            
    except Exception as e:
        logger.error(f"Error creating default users: {e}")
    finally:
        db.close()
    
    logger.info("Aria backend startup complete")
    yield
    
    # Shutdown
    logger.info("Shutting down Aria backend")

app = FastAPI(
    title="Aria Document Management System",
    description="Enterprise-grade document management and processing system",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoints
@app.get("/health")
async def health():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "aria-backend",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }

@app.get("/api/health")
async def api_health(db: Session = Depends(get_db)):
    """API health check endpoint with database connectivity"""
    try:
        # Test database connectivity
        db.execute("SELECT 1")
        db_status = "healthy"
        overall_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "service": "aria-api",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "database": {
            "status": db_status
        }
    }

@app.get("/api/health/detailed")
async def detailed_health_check():
    """Comprehensive health check with system status"""
    try:
        with PerformanceTracker("health_check"):
            # Check database health
            db_health = await HealthChecker.check_database_health()
            
            # Check Redis health
            redis_health = await HealthChecker.check_redis_health()
            
            # Check file system health
            fs_health = await HealthChecker.check_file_system_health()
            
            # Determine overall health
            all_healthy = all([
                db_health["status"] == "healthy",
                redis_health["status"] == "healthy",
                fs_health["status"] in ["healthy", "warning"]
            ])
            
            return {
                "status": "healthy" if all_healthy else "degraded",
                "service": "aria-api",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "2.0.0",
                "checks": {
                    "database": db_health,
                    "redis": redis_health,
                    "filesystem": fs_health
                }
            }
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "aria-api",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@app.get("/api/health/ready")
async def readiness_check():
    """Readiness check for load balancers"""
    try:
        db_health = await HealthChecker.check_database_health()
        
        if db_health["status"] == "healthy":
            return {"status": "ready"}
        else:
            raise HTTPException(status_code=503, detail="Service not ready")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")

@app.get("/api/health/live")
async def liveness_check():
    """Liveness check for container orchestration"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

# Authentication endpoints
@app.post("/api/auth/login", response_model=Token)
async def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    """User login endpoint"""
    try:
        with PerformanceTracker("user_login"):
            # Find user by username or email
            user = db.query(User).filter(
                or_(User.username == username, User.email == username)
            ).first()
            
            if not user or not verify_password(password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User account is disabled"
                )
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()
            
            # Create access token
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.username}, expires_delta=access_token_expires
            )
            
            logger.info(f"User {user.username} logged in successfully")
            
            return {
                "access_token": access_token,
                "token_type": "bearer"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """User registration endpoint"""
    try:
        with PerformanceTracker("user_registration"):
            # Check if user already exists
            existing_user = db.query(User).filter(
                or_(User.username == user_data.username, User.email == user_data.email)
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username or email already registered"
                )
            
            # Create new user
            hashed_password = get_password_hash(user_data.password)
            db_user = User(
                username=user_data.username,
                email=user_data.email,
                password_hash=hashed_password,
                full_name=user_data.full_name,
                is_active=True,
                is_superuser=False
            )
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            logger.info(f"New user registered: {db_user.username}")
            
            return db_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Document management endpoints
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document"""
    try:
        with PerformanceTracker("document_upload"):
            # Validate file
            if not file.filename:
                raise HTTPException(status_code=400, detail="No file provided")
            
            # Create unique filename
            file_extension = Path(file.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = Path("./uploads") / unique_filename
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Create database record
            db_document = Document(
                original_filename=file.filename,
                filename=unique_filename,
                file_path=str(file_path),
                file_size=len(content),
                content_type=file.content_type,
                uploaded_by=current_user.id,
                processed=False
            )
            
            db.add(db_document)
            db.commit()
            db.refresh(db_document)
            
            logger.info(f"Document uploaded: {file.filename} by user {current_user.username}")
            
            return {
                "message": "Document uploaded successfully",
                "document_id": db_document.id,
                "filename": db_document.original_filename
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")

@app.get("/api/documents", response_model=List[DocumentResponse])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's documents"""
    try:
        with PerformanceTracker("list_documents"):
            query = db.query(Document).filter(Document.is_active == True)
            
            # Non-superusers can only see their own documents
            if not current_user.is_superuser:
                query = query.filter(Document.uploaded_by == current_user.id)
            
            documents = query.offset(skip).limit(limit).all()
            return documents
    except Exception as e:
        logger.error(f"List documents error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")

@app.get("/api/documents/{document_id}")
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document details"""
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check permissions
        if not current_user.is_superuser and doc.uploaded_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "id": doc.id,
            "original_filename": doc.original_filename,
            "filename": doc.filename,
            "file_size": doc.file_size,
            "content_type": doc.content_type,
            "upload_date": doc.upload_date,
            "processed": doc.processed,
            "uploader": doc.uploader.full_name if doc.uploader else "Unknown"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get document error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve document")

@app.get("/api/documents/{document_id}/download")
async def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a document file"""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check permissions
    if not current_user.is_superuser and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Get stored filename or use original
        stored_name = getattr(doc, 'stored_filename', None) or getattr(doc, 'file_path', doc.original_filename)
        file_path = f"./uploads/{stored_name}"
        
        # Check if file exists
        if os.path.exists(file_path):
            return {
                "document_id": document_id,
                "filename": doc.original_filename,
                "download_url": f"/api/files/{stored_name}",
                "file_size": doc.file_size or os.path.getsize(file_path),
                "status": "available"
            }
        else:
            # File not on disk, return metadata only
            return {
                "document_id": document_id,
                "filename": doc.original_filename,
                "status": "metadata_only",
                "message": "File content not available, metadata only",
                "file_size": doc.file_size or 0
            }
    except Exception as e:
        return {
            "document_id": document_id,
            "filename": doc.original_filename,
            "status": "error",
            "message": str(e),
            "file_size": doc.file_size or 0
        }

@app.get("/api/admin/users")
async def list_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        users = db.query(User).all()
        return [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "created_at": user.created_at,
                "last_login": user.last_login
            }
            for user in users
        ]
    except Exception as e:
        logger.error(f"List users error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve users")

@app.get("/api/admin/stats")
async def get_system_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system statistics (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        total_documents = db.query(Document).count()
        active_documents = db.query(Document).filter(Document.is_active == True).count()
        
        return {
            "users": {
                "total": total_users,
                "active": active_users
            },
            "documents": {
                "total": total_documents,
                "active": active_documents
            },
            "system": {
                "version": "2.0.0",
                "status": "operational"
            }
        }
    except Exception as e:
        logger.error(f"System stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system statistics")

# Analytics endpoint
@app.get("/api/analytics/health")
async def analytics_health_check(db: Session = Depends(get_db)):
    """Analytics health check endpoint"""
    try:
        # Simple health check - count recent metrics
        recent_documents = db.query(Document).filter(
            Document.upload_date >= datetime.utcnow() - timedelta(days=7)
        ).count()
        
        return {
            "status": "healthy",
            "service": "aria-analytics",
            "recent_activity": recent_documents,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Analytics health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "aria-analytics",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Aria Document Management System API",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)