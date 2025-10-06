"""
ARIA Production Server
Optimized FastAPI server for production deployment
"""

import os
import sys
import logging
import uvicorn
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import time

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

from production_config import (
    settings, 
    FASTAPI_CONFIG, 
    MIDDLEWARE_CONFIG, 
    SECURITY_HEADERS,
    LOGGING_CONFIG,
    get_upload_path
)

# Configure logging
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

# Create FastAPI app with production config
app = FastAPI(**FASTAPI_CONFIG)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

# Add request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    **MIDDLEWARE_CONFIG["cors"]
)

# Add GZip middleware
app.add_middleware(
    GZipMiddleware,
    **MIDDLEWARE_CONFIG["gzip"]
)

# Add Trusted Host middleware
app.add_middleware(
    TrustedHostMiddleware,
    **MIDDLEWARE_CONFIG["trusted_host"]
)

# Ensure upload directory exists
upload_dir = get_upload_path()
logger.info(f"Upload directory: {upload_dir}")

# Mount static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Health check endpoint
@app.get("/api/v1/health")
async def health_check():
    """Production health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": settings.app_version,
        "timestamp": time.time(),
        "uptime": "running",
        "services": {
            "api": "operational",
            "file_upload": "operational",
            "excel_processing": "operational",
            "ai_chat": "operational" if settings.enable_ai_chat else "disabled"
        }
    }

# System info endpoint (admin only in production)
@app.get("/api/v1/system/info")
async def system_info():
    """System information endpoint"""
    if not settings.debug:
        raise HTTPException(status_code=404, detail="Not found")
    
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "python_version": sys.version,
        "upload_directory": settings.upload_directory,
        "max_file_size": settings.max_file_size,
        "allowed_file_types": settings.allowed_file_types,
    }

# File upload endpoint
@app.post("/api/v1/upload")
async def upload_file(request: Request):
    """Production file upload endpoint"""
    try:
        # Get the uploaded file
        form = await request.form()
        file = form.get("file")
        
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Validate file size
        if hasattr(file, 'size') and file.size > settings.max_file_size:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size: {settings.max_file_size} bytes"
            )
        
        # Validate file type
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in settings.allowed_file_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {settings.allowed_file_types}"
            )
        
        # Save file
        file_path = Path(upload_dir) / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"File uploaded successfully: {file.filename}")
        
        return {
            "status": "success",
            "filename": file.filename,
            "size": len(content),
            "type": file_extension,
            "path": str(file_path),
            "message": "File uploaded successfully"
        }
        
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload failed")

# List uploaded files
@app.get("/api/v1/files")
async def list_files():
    """List uploaded files"""
    try:
        files = []
        upload_path = Path(upload_dir)
        
        if upload_path.exists():
            for file_path in upload_path.iterdir():
                if file_path.is_file():
                    stat = file_path.stat()
                    files.append({
                        "filename": file_path.name,
                        "size": stat.st_size,
                        "modified": stat.st_mtime,
                        "type": file_path.suffix.lower()
                    })
        
        return {
            "status": "success",
            "files": files,
            "count": len(files)
        }
        
    except Exception as e:
        logger.error(f"List files error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list files")

# AI Chat endpoint (if enabled)
if settings.enable_ai_chat:
    @app.post("/api/v1/chat")
    async def chat_with_aria(request: Request):
        """AI Chat endpoint"""
        try:
            data = await request.json()
            message = data.get("message", "")
            
            if not message:
                raise HTTPException(status_code=400, detail="No message provided")
            
            # Simple AI response (replace with actual AI integration)
            response = f"ARIA: I understand you're asking about '{message}'. As your document management assistant, I can help you with Excel files, document organization, and data analysis. How can I assist you further?"
            
            return {
                "status": "success",
                "response": response,
                "timestamp": time.time()
            }
            
        except Exception as e:
            logger.error(f"Chat error: {str(e)}")
            raise HTTPException(status_code=500, detail="Chat service unavailable")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Upload directory: {upload_dir}")
    logger.info("ARIA Production Server started successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("ARIA Production Server shutting down")

if __name__ == "__main__":
    # Production server startup
    logger.info("Starting ARIA Production Server...")
    
    uvicorn.run(
        "production_main:app",
        host=settings.host,
        port=settings.port,
        workers=1,  # Single worker for development, increase for production
        log_level=settings.log_level.lower(),
        access_log=settings.enable_access_log,
        reload=False,  # Never reload in production
        server_header=False,
        date_header=False,
    )