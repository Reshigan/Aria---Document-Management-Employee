"""
Enhanced Tag Management API Routes
Comprehensive tag management with hierarchy, auto-tagging, and analytics
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from api.routes.auth_enhanced import get_current_user
from models.user import User
from services.tag_service import get_tag_service, TagService
from schemas.tag_schemas import (
    TagCreate, TagUpdate, TagResponse, TagHierarchyResponse,
    TagAnalyticsResponse, TagSuggestionResponse, AutoTagRuleCreate,
    AutoTagRuleUpdate, AutoTagRuleResponse, TagTemplateCreate,
    TagTemplateUpdate, TagTemplateResponse, BulkTagOperation,
    BulkTagOperationResponse, TagSearchRequest, TagSearchResponse,
    TagStatistics, DocumentTagRequest, DocumentTagResponse
)

router = APIRouter(prefix="/enhanced-tags", tags=["Enhanced Tags"])


# Basic Tag Operations

@router.get("/", response_model=List[TagResponse])
async def list_enhanced_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """List all enhanced tags"""
    return tag_service.get_tags(skip=skip, limit=limit)


@router.post("/", response_model=TagResponse)
async def create_enhanced_tag(
    tag_data: TagCreate,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Create a new enhanced tag"""
    return tag_service.create_tag(tag_data, current_user.id)


@router.get("/{tag_id}", response_model=TagResponse)
async def get_enhanced_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Get an enhanced tag by ID"""
    tag = tag_service.get_tag(tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.put("/{tag_id}", response_model=TagResponse)
async def update_enhanced_tag(
    tag_id: int,
    tag_data: TagUpdate,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Update an enhanced tag"""
    return tag_service.update_tag(tag_id, tag_data, current_user.id)


@router.delete("/{tag_id}")
async def delete_enhanced_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Delete an enhanced tag"""
    success = tag_service.delete_tag(tag_id, current_user.id)
    return {"success": success, "message": "Tag deleted successfully"}


# Tag Hierarchy Operations

@router.get("/hierarchy/tree", response_model=List[TagHierarchyResponse])
async def get_enhanced_tag_hierarchy(
    parent_id: Optional[int] = Query(None, description="Parent tag ID (null for root tags)"),
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Get enhanced tag hierarchy tree"""
    return tag_service.get_tag_hierarchy(parent_id)


@router.put("/{tag_id}/move", response_model=TagResponse)
async def move_enhanced_tag(
    tag_id: int,
    new_parent_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Move an enhanced tag to a new parent"""
    return tag_service.move_tag(tag_id, new_parent_id, current_user.id)


# Tag Search and Discovery

@router.post("/search", response_model=TagSearchResponse)
async def search_enhanced_tags(
    search_request: TagSearchRequest,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Search enhanced tags with advanced filters"""
    return tag_service.search_tags(search_request)


@router.get("/popular", response_model=List[TagResponse])
async def get_popular_enhanced_tags(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Get most popular enhanced tags by usage count"""
    return tag_service.get_popular_tags(limit)


@router.get("/recent", response_model=List[TagResponse])
async def get_recent_enhanced_tags(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Get recently created enhanced tags"""
    return tag_service.get_recent_tags(limit)


@router.get("/suggest", response_model=List[TagResponse])
async def suggest_enhanced_tags(
    query: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Get enhanced tag suggestions based on query"""
    return tag_service.suggest_tags(query, limit)


# Document Tagging Operations

@router.post("/documents/{document_id}/tags", response_model=List[DocumentTagResponse])
async def tag_document_enhanced(
    document_id: int,
    tag_request: DocumentTagRequest,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Add enhanced tags to a document"""
    return tag_service.tag_document(document_id, tag_request, current_user.id)


@router.delete("/documents/{document_id}/tags")
async def untag_document_enhanced(
    document_id: int,
    tag_ids: List[int],
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Remove enhanced tags from a document"""
    success = tag_service.untag_document(document_id, tag_ids, current_user.id)
    return {"success": success, "message": "Tags removed successfully"}


@router.get("/documents/{document_id}/tags", response_model=List[DocumentTagResponse])
async def get_document_enhanced_tags(
    document_id: int,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Get all enhanced tags for a document"""
    return tag_service.get_document_tags(document_id)


# Bulk Operations

@router.post("/bulk", response_model=BulkTagOperationResponse)
async def bulk_enhanced_tag_operation(
    operation: BulkTagOperation,
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Perform bulk enhanced tag operations on multiple documents"""
    return tag_service.bulk_tag_operation(operation, current_user.id)


# Analytics and Statistics

@router.get("/analytics/statistics", response_model=TagStatistics)
async def get_enhanced_tag_statistics(
    current_user: User = Depends(get_current_user),
    tag_service: TagService = Depends(get_tag_service)
):
    """Get comprehensive enhanced tag statistics"""
    return tag_service.get_tag_statistics()


# Auto-Tagging Rules (placeholder for future implementation)

@router.get("/auto-rules", response_model=List[AutoTagRuleResponse])
async def get_auto_tag_rules(
    current_user: User = Depends(get_current_user)
):
    """Get auto-tagging rules (placeholder)"""
    # TODO: Implement auto-tagging rules
    return []


@router.post("/auto-rules", response_model=AutoTagRuleResponse)
async def create_auto_tag_rule(
    rule_data: AutoTagRuleCreate,
    current_user: User = Depends(get_current_user)
):
    """Create auto-tagging rule (placeholder)"""
    # TODO: Implement auto-tagging rules
    raise HTTPException(status_code=501, detail="Auto-tagging rules not yet implemented")


# Tag Templates (placeholder for future implementation)

@router.get("/templates", response_model=List[TagTemplateResponse])
async def get_tag_templates(
    current_user: User = Depends(get_current_user)
):
    """Get tag templates (placeholder)"""
    # TODO: Implement tag templates
    return []


@router.post("/templates", response_model=TagTemplateResponse)
async def create_tag_template(
    template_data: TagTemplateCreate,
    current_user: User = Depends(get_current_user)
):
    """Create tag template (placeholder)"""
    # TODO: Implement tag templates
    raise HTTPException(status_code=501, detail="Tag templates not yet implemented")


# Tag Suggestions (placeholder for ML-based suggestions)

@router.get("/documents/{document_id}/suggestions", response_model=List[TagSuggestionResponse])
async def get_tag_suggestions_for_document(
    document_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get ML-based tag suggestions for a document (placeholder)"""
    # TODO: Implement ML-based tag suggestions
    return []


@router.post("/documents/{document_id}/auto-tag")
async def auto_tag_document(
    document_id: int,
    current_user: User = Depends(get_current_user)
):
    """Auto-tag a document using ML and rules (placeholder)"""
    # TODO: Implement auto-tagging
    raise HTTPException(status_code=501, detail="Auto-tagging not yet implemented")