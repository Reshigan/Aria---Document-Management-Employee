from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from app.database import get_db
from app.services.file_management_service import FileManagementService
from app.services.cache_service import monitor_performance
import io
import os

router = APIRouter(prefix="/files", tags=["File Management"])

class FileShareRequest(BaseModel):
    share_type: str = Field(..., regex='^(public|private|password|time_limited)$')
    password: Optional[str] = None
    expires_at: Optional[datetime] = None
    max_downloads: Optional[int] = None
    can_download: bool = True
    can_view: bool = True
    can_comment: bool = False

class ChunkedUploadStart(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    file_size: int = Field(..., gt=0)
    chunk_size: int = Field(default=1024*1024, gt=0, le=10*1024*1024)  # Max 10MB chunks

class ArchiveRequest(BaseModel):
    file_ids: List[int] = Field(..., min_items=1)
    archive_name: str = Field(..., min_length=1, max_length=255)
    archive_type: str = Field(default='zip', regex='^(zip|tar|7z)$')

def get_file_service(db: Session = Depends(get_db)) -> FileManagementService:
    return FileManagementService(db)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
@monitor_performance
async def upload_file(
    file: UploadFile = File(...),
    user_id: int = Form(..., gt=0),
    service: FileManagementService = Depends(get_file_service)
):
    """Upload a complete file"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        file_metadata = service.upload_file(file.file, file.filename, user_id)
        
        return {
            "id": file_metadata.file_id,
            "filename": file_metadata.filename,
            "size": file_metadata.file_size,
            "content_type": file_metadata.content_type,
            "mime_type": file_metadata.mime_type,
            "created_at": file_metadata.created_at.isoformat(),
            "md5_hash": file_metadata.md5_hash
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@router.post("/upload/chunked/start")
@monitor_performance
async def start_chunked_upload(
    upload_request: ChunkedUploadStart,
    service: FileManagementService = Depends(get_file_service)
):
    """Start a chunked upload session"""
    try:
        result = service.start_chunked_upload(
            upload_request.filename,
            upload_request.file_size,
            upload_request.chunk_size
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start chunked upload: {str(e)}"
        )

@router.post("/upload/chunked/{upload_id}/chunk/{chunk_number}")
@monitor_performance
async def upload_chunk(
    upload_id: str,
    chunk_number: int,
    chunk: UploadFile = File(...),
    service: FileManagementService = Depends(get_file_service)
):
    """Upload a file chunk"""
    try:
        chunk_data = await chunk.read()
        result = service.upload_chunk(upload_id, chunk_number, chunk_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chunk upload failed: {str(e)}"
        )

@router.post("/upload/chunked/{upload_id}/complete")
@monitor_performance
async def complete_chunked_upload(
    upload_id: str,
    user_id: int = Form(..., gt=0),
    service: FileManagementService = Depends(get_file_service)
):
    """Complete a chunked upload"""
    try:
        file_metadata = service.complete_chunked_upload(upload_id, user_id)
        
        return {
            "id": file_metadata.file_id,
            "filename": file_metadata.filename,
            "size": file_metadata.file_size,
            "content_type": file_metadata.content_type,
            "created_at": file_metadata.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete upload: {str(e)}"
        )

@router.get("/{file_id}")
@monitor_performance
async def get_file_info(
    file_id: int,
    service: FileManagementService = Depends(get_file_service)
):
    """Get file information"""
    try:
        file_metadata = service.get_file_info(file_id)
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {
            "id": file_metadata.file_id,
            "filename": file_metadata.filename,
            "original_filename": file_metadata.original_filename,
            "size": file_metadata.file_size,
            "mime_type": file_metadata.mime_type,
            "content_type": file_metadata.content_type,
            "file_extension": file_metadata.file_extension,
            "created_at": file_metadata.created_at.isoformat(),
            "updated_at": file_metadata.updated_at.isoformat(),
            "last_accessed": file_metadata.last_accessed.isoformat(),
            "is_processed": file_metadata.is_processed,
            "processing_status": file_metadata.processing_status,
            "extended_metadata": file_metadata.extended_metadata,
            "versions_count": len(file_metadata.versions),
            "shares_count": len(file_metadata.shares)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file info: {str(e)}"
        )

@router.get("/{file_id}/download")
@monitor_performance
async def download_file(
    file_id: int,
    user_id: Optional[int] = Query(None, description="User ID for access logging"),
    service: FileManagementService = Depends(get_file_service)
):
    """Download a file"""
    try:
        file_metadata = service.get_file_info(file_id)
        if not file_metadata:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = file_metadata.file_path
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        # Log access
        if user_id:
            service._log_file_access(file_metadata.id, 'download', user_id)
        
        return FileResponse(
            path=file_path,
            filename=file_metadata.filename,
            media_type=file_metadata.mime_type
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download failed: {str(e)}"
        )

@router.delete("/{file_id}")
@monitor_performance
async def delete_file(
    file_id: int,
    user_id: int = Query(..., gt=0, description="User ID"),
    service: FileManagementService = Depends(get_file_service)
):
    """Delete a file"""
    try:
        success = service.delete_file(file_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {"message": "File deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )

@router.post("/{file_id}/share")
@monitor_performance
async def create_file_share(
    file_id: int,
    share_request: FileShareRequest,
    created_by: int = Query(..., gt=0, description="Creator user ID"),
    service: FileManagementService = Depends(get_file_service)
):
    """Create a file share link"""
    try:
        file_share = service.create_file_share(
            file_id=file_id,
            share_type=share_request.share_type,
            created_by=created_by,
            password=share_request.password,
            expires_at=share_request.expires_at,
            max_downloads=share_request.max_downloads,
            can_download=share_request.can_download,
            can_view=share_request.can_view,
            can_comment=share_request.can_comment
        )
        
        return {
            "id": file_share.id,
            "share_token": file_share.share_token,
            "share_type": file_share.share_type,
            "expires_at": file_share.expires_at.isoformat() if file_share.expires_at else None,
            "max_downloads": file_share.max_downloads,
            "permissions": {
                "can_download": file_share.can_download,
                "can_view": file_share.can_view,
                "can_comment": file_share.can_comment
            },
            "created_at": file_share.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create share: {str(e)}"
        )

@router.get("/share/{share_token}")
@monitor_performance
async def access_shared_file(
    share_token: str,
    password: Optional[str] = Query(None, description="Password for protected shares"),
    user_id: Optional[int] = Query(None, description="User ID for access logging"),
    service: FileManagementService = Depends(get_file_service)
):
    """Access a shared file"""
    try:
        result = service.access_shared_file(
            share_token=share_token,
            password=password,
            user_id=user_id
        )
        
        file_metadata = result['file_metadata']
        share = result['share']
        
        return {
            "file": {
                "id": file_metadata.file_id,
                "filename": file_metadata.filename,
                "size": file_metadata.file_size,
                "mime_type": file_metadata.mime_type,
                "content_type": file_metadata.content_type
            },
            "share": {
                "id": share.id,
                "share_type": share.share_type,
                "expires_at": share.expires_at.isoformat() if share.expires_at else None,
                "download_count": share.download_count,
                "max_downloads": share.max_downloads
            },
            "permissions": {
                "can_download": result['can_download'],
                "can_view": result['can_view'],
                "can_comment": result['can_comment']
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to access shared file: {str(e)}"
        )

@router.post("/{file_id}/version")
@monitor_performance
async def create_file_version(
    file_id: int,
    file: UploadFile = File(...),
    user_id: int = Form(..., gt=0),
    description: Optional[str] = Form(None),
    service: FileManagementService = Depends(get_file_service)
):
    """Create a new version of an existing file"""
    try:
        file_version = service.create_file_version(
            file_id=file_id,
            new_file_data=file.file,
            user_id=user_id,
            description=description
        )
        
        return {
            "id": file_version.id,
            "version_number": file_version.version_number,
            "version_description": file_version.version_description,
            "file_size": file_version.file_size,
            "is_current": file_version.is_current,
            "created_at": file_version.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create version: {str(e)}"
        )

@router.get("/duplicates")
@monitor_performance
async def detect_duplicates(
    similarity_threshold: float = Query(0.95, ge=0.0, le=1.0),
    service: FileManagementService = Depends(get_file_service)
):
    """Detect duplicate files"""
    try:
        duplicates = service.detect_duplicates(similarity_threshold)
        
        return {
            "duplicate_groups": [
                {
                    "group_id": group['group_id'],
                    "similarity_score": group['similarity_score'],
                    "detection_method": group['detection_method'],
                    "files": [
                        {
                            "id": f.file_id,
                            "filename": f.filename,
                            "size": f.file_size,
                            "created_at": f.created_at.isoformat()
                        }
                        for f in group['files']
                    ]
                }
                for group in duplicates
            ],
            "total_groups": len(duplicates),
            "total_duplicate_files": sum(len(group['files']) for group in duplicates)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Duplicate detection failed: {str(e)}"
        )

@router.post("/archive")
@monitor_performance
async def create_archive(
    archive_request: ArchiveRequest,
    created_by: int = Query(..., gt=0, description="Creator user ID"),
    service: FileManagementService = Depends(get_file_service)
):
    """Create an archive from multiple files"""
    try:
        archive = service.create_archive(
            file_ids=archive_request.file_ids,
            archive_name=archive_request.archive_name,
            archive_type=archive_request.archive_type,
            created_by=created_by
        )
        
        return {
            "id": archive.id,
            "archive_name": archive.archive_name,
            "archive_type": archive.archive_type,
            "file_count": archive.file_count,
            "total_size": archive.total_size,
            "compressed_size": archive.compressed_size,
            "compression_ratio": archive.compression_ratio,
            "status": archive.status,
            "created_at": archive.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Archive creation failed: {str(e)}"
        )

@router.get("/statistics")
@monitor_performance
async def get_file_statistics(
    service: FileManagementService = Depends(get_file_service)
):
    """Get comprehensive file management statistics"""
    try:
        stats = service.get_file_statistics()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )

@router.get("/health")
@monitor_performance
async def get_file_management_health(
    service: FileManagementService = Depends(get_file_service)
):
    """Get file management system health"""
    try:
        stats = service.get_file_statistics()
        
        # Determine health status
        health_status = "healthy"
        issues = []
        
        # Check for high duplicate count
        if stats['duplicate_files'] > 100:
            health_status = "warning"
            issues.append(f"{stats['duplicate_files']} duplicate files detected")
        
        # Check storage usage (if we had limits)
        total_gb = stats['total_size'] / (1024**3)
        if total_gb > 100:  # Example threshold
            health_status = "warning"
            issues.append(f"High storage usage: {total_gb:.1f} GB")
        
        return {
            "status": health_status,
            "issues": issues,
            "statistics": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get health status: {str(e)}"
        )