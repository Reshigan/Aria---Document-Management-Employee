from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional

from core.database import get_db
from core.auth import get_current_user
from models.user import User
from services.version_control_service import VersionControlService
from schemas.version_control import (
    DocumentVersionCreate, DocumentVersionUpdate, DocumentVersionResponse, DocumentVersionListResponse,
    DocumentBranchCreate, DocumentBranchUpdate, DocumentBranchResponse, DocumentBranchListResponse,
    DocumentChangeResponse, MergeRequestCreate, MergeRequestUpdate, MergeRequestResponse, MergeRequestListResponse,
    MergeConflictUpdate, MergeConflictResponse, VersionComparisonRequest, VersionComparisonResponse,
    VersionTagCreate, VersionTagUpdate, VersionTagResponse, VersionTagListResponse,
    VersionControlStats, BulkVersionOperation, BulkVersionOperationResponse,
    VersionStatus, MergeStatus
)

router = APIRouter(prefix="/api/v1/version-control", tags=["version-control"])


# Document Version Endpoints
@router.post("/versions", response_model=DocumentVersionResponse)
async def create_version(
    version_data: DocumentVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new document version"""
    service = VersionControlService(db)
    return service.create_version(version_data, current_user.id)


@router.get("/versions/{version_id}", response_model=DocumentVersionResponse)
async def get_version(
    version_id: int = Path(..., description="Version ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific version"""
    service = VersionControlService(db)
    version = service.get_version(version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.get("/documents/{document_id}/versions", response_model=DocumentVersionListResponse)
async def get_document_versions(
    document_id: int = Path(..., description="Document ID"),
    branch_name: Optional[str] = Query(None, description="Filter by branch name"),
    status: Optional[VersionStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get versions for a document"""
    service = VersionControlService(db)
    versions, total = service.get_document_versions(document_id, branch_name, status, page, page_size)
    
    total_pages = (total + page_size - 1) // page_size
    
    return DocumentVersionListResponse(
        items=versions,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.put("/versions/{version_id}", response_model=DocumentVersionResponse)
async def update_version(
    version_id: int = Path(..., description="Version ID"),
    version_data: DocumentVersionUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a version"""
    service = VersionControlService(db)
    return service.update_version(version_id, version_data, current_user.id)


@router.delete("/versions/{version_id}")
async def delete_version(
    version_id: int = Path(..., description="Version ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a version"""
    service = VersionControlService(db)
    success = service.delete_version(version_id, current_user.id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete version")
    return {"message": "Version deleted successfully"}


# Branch Endpoints
@router.post("/branches", response_model=DocumentBranchResponse)
async def create_branch(
    branch_data: DocumentBranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new branch"""
    service = VersionControlService(db)
    return service.create_branch(branch_data, current_user.id)


@router.get("/documents/{document_id}/branches", response_model=List[DocumentBranchResponse])
async def get_document_branches(
    document_id: int = Path(..., description="Document ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get branches for a document"""
    service = VersionControlService(db)
    return service.get_document_branches(document_id)


@router.put("/branches/{branch_id}", response_model=DocumentBranchResponse)
async def update_branch(
    branch_id: int = Path(..., description="Branch ID"),
    branch_data: DocumentBranchUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a branch"""
    service = VersionControlService(db)
    return service.update_branch(branch_id, branch_data, current_user.id)


@router.delete("/branches/{branch_id}")
async def delete_branch(
    branch_id: int = Path(..., description="Branch ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a branch"""
    service = VersionControlService(db)
    success = service.delete_branch(branch_id, current_user.id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete branch")
    return {"message": "Branch deleted successfully"}


# Merge Request Endpoints
@router.post("/merge-requests", response_model=MergeRequestResponse)
async def create_merge_request(
    merge_data: MergeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a merge request"""
    service = VersionControlService(db)
    return service.create_merge_request(merge_data, current_user.id)


@router.get("/merge-requests", response_model=MergeRequestListResponse)
async def get_merge_requests(
    document_id: Optional[int] = Query(None, description="Filter by document ID"),
    status: Optional[MergeStatus] = Query(None, description="Filter by status"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned user"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get merge requests"""
    service = VersionControlService(db)
    merge_requests, total = service.get_merge_requests(document_id, status, assigned_to, page, page_size)
    
    total_pages = (total + page_size - 1) // page_size
    
    return MergeRequestListResponse(
        items=merge_requests,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.put("/merge-requests/{merge_request_id}", response_model=MergeRequestResponse)
async def update_merge_request(
    merge_request_id: int = Path(..., description="Merge request ID"),
    merge_data: MergeRequestUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a merge request"""
    service = VersionControlService(db)
    return service.update_merge_request(merge_request_id, merge_data, current_user.id)


@router.post("/merge-requests/{merge_request_id}/merge", response_model=DocumentVersionResponse)
async def merge_versions(
    merge_request_id: int = Path(..., description="Merge request ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute a merge request"""
    service = VersionControlService(db)
    return service.merge_versions(merge_request_id, current_user.id)


# Version Comparison Endpoints
@router.post("/compare", response_model=VersionComparisonResponse)
async def compare_versions(
    comparison_request: VersionComparisonRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare two versions"""
    service = VersionControlService(db)
    return service.compare_versions(comparison_request)


# Version Tag Endpoints
@router.post("/tags", response_model=VersionTagResponse)
async def create_version_tag(
    tag_data: VersionTagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a version tag"""
    service = VersionControlService(db)
    return service.create_version_tag(tag_data, current_user.id)


@router.get("/documents/{document_id}/tags", response_model=List[VersionTagResponse])
async def get_version_tags(
    document_id: int = Path(..., description="Document ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tags for a document"""
    service = VersionControlService(db)
    return service.get_version_tags(document_id)


# Statistics Endpoints
@router.get("/stats", response_model=VersionControlStats)
async def get_version_control_stats(
    document_id: Optional[int] = Query(None, description="Filter by document ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get version control statistics"""
    service = VersionControlService(db)
    return service.get_version_control_stats(document_id)


# Bulk Operations
@router.post("/versions/bulk", response_model=BulkVersionOperationResponse)
async def bulk_version_operations(
    operation_data: BulkVersionOperation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform bulk operations on versions"""
    service = VersionControlService(db)
    
    results = []
    errors = []
    successful_items = 0
    failed_items = 0
    
    for version_id in operation_data.version_ids:
        try:
            if operation_data.operation == "delete":
                service.delete_version(version_id, current_user.id)
                results.append({"version_id": version_id, "status": "deleted"})
                successful_items += 1
            elif operation_data.operation == "archive":
                service.update_version(version_id, DocumentVersionUpdate(status=VersionStatus.ARCHIVED), current_user.id)
                results.append({"version_id": version_id, "status": "archived"})
                successful_items += 1
            elif operation_data.operation == "publish":
                service.update_version(version_id, DocumentVersionUpdate(is_published=True), current_user.id)
                results.append({"version_id": version_id, "status": "published"})
                successful_items += 1
            elif operation_data.operation == "unpublish":
                service.update_version(version_id, DocumentVersionUpdate(is_published=False), current_user.id)
                results.append({"version_id": version_id, "status": "unpublished"})
                successful_items += 1
            else:
                errors.append(f"Unknown operation: {operation_data.operation}")
                failed_items += 1
                
        except Exception as e:
            errors.append(f"Version {version_id}: {str(e)}")
            failed_items += 1
    
    return BulkVersionOperationResponse(
        operation=operation_data.operation,
        total_items=len(operation_data.version_ids),
        successful_items=successful_items,
        failed_items=failed_items,
        errors=errors,
        results=results
    )


# Health Check
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "version-control"}