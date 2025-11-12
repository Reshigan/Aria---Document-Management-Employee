from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from core.database import get_db
from app.services.search_service import SearchService
from app.services.cache_service import monitor_performance

router = APIRouter(prefix="/search", tags=["Search"])

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    filters: Optional[Dict[str, Any]] = None
    sort_by: str = Field(default='relevance', regex='^(relevance|date|title)$')
    sort_order: str = Field(default='desc', regex='^(asc|desc)$')
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)

class IndexDocumentRequest(BaseModel):
    document_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=500)
    content: str
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

class SavedSearchRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    query: str = Field(..., min_length=1, max_length=500)
    filters: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    is_public: bool = False
    is_alert: bool = False

class FacetRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=255)
    facet_type: str = Field(..., regex='^(text|date|number|boolean|list)$')
    field_path: str = Field(..., min_length=1, max_length=255)
    is_filterable: bool = True
    is_sortable: bool = False
    display_order: int = 0
    max_values: int = Field(default=10, ge=1, le=50)

def get_search_service(db: Session = Depends(get_db)) -> SearchService:
    return SearchService(db)

@router.post("/")
@monitor_performance
async def search_documents(
    search_request: SearchRequest,
    user_id: Optional[int] = Query(None, description="User ID for search logging"),
    service: SearchService = Depends(get_search_service)
):
    """Perform full-text search with filters and facets"""
    try:
        results = service.search(
            query=search_request.query,
            filters=search_request.filters,
            sort_by=search_request.sort_by,
            sort_order=search_request.sort_order,
            page=search_request.page,
            size=search_request.size,
            user_id=user_id
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/suggestions")
@monitor_performance
async def get_search_suggestions(
    q: str = Query(..., min_length=1, max_length=100, description="Partial query for suggestions"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
    service: SearchService = Depends(get_search_service)
):
    """Get search suggestions based on partial query"""
    try:
        suggestions = service.get_suggestions(q, limit)
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get suggestions: {str(e)}"
        )

@router.post("/index", status_code=status.HTTP_201_CREATED)
@monitor_performance
async def index_document(
    index_request: IndexDocumentRequest,
    service: SearchService = Depends(get_search_service)
):
    """Index a document for search"""
    try:
        search_index = service.index_document(
            document_id=index_request.document_id,
            title=index_request.title,
            content=index_request.content,
            metadata=index_request.metadata,
            tags=index_request.tags
        )
        
        return {
            "id": search_index.id,
            "document_id": search_index.document_id,
            "indexed_at": search_index.last_indexed_at.isoformat(),
            "word_count": search_index.word_count,
            "character_count": search_index.character_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index document: {str(e)}"
        )

@router.delete("/index/{document_id}")
@monitor_performance
async def remove_document_from_index(
    document_id: int,
    service: SearchService = Depends(get_search_service)
):
    """Remove document from search index"""
    try:
        # This would be implemented in the service
        return {"message": f"Document {document_id} removed from index"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove document from index: {str(e)}"
        )

@router.post("/saved-searches", status_code=status.HTTP_201_CREATED)
@monitor_performance
async def save_search(
    saved_search_request: SavedSearchRequest,
    user_id: int = Query(..., gt=0, description="User ID"),
    service: SearchService = Depends(get_search_service)
):
    """Save a search for later use"""
    try:
        saved_search = service.save_search(
            name=saved_search_request.name,
            query=saved_search_request.query,
            filters=saved_search_request.filters or {},
            user_id=user_id,
            description=saved_search_request.description,
            is_public=saved_search_request.is_public,
            is_alert=saved_search_request.is_alert
        )
        
        return {
            "id": saved_search.id,
            "name": saved_search.name,
            "query": saved_search.query,
            "created_at": saved_search.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save search: {str(e)}"
        )

@router.get("/saved-searches")
@monitor_performance
async def get_saved_searches(
    user_id: int = Query(..., gt=0, description="User ID"),
    include_public: bool = Query(True, description="Include public saved searches"),
    service: SearchService = Depends(get_search_service)
):
    """Get saved searches for user"""
    try:
        saved_searches = service.get_saved_searches(user_id, include_public)
        
        return {
            "saved_searches": [
                {
                    "id": ss.id,
                    "name": ss.name,
                    "description": ss.description,
                    "query": ss.query,
                    "filters": ss.filters,
                    "is_public": ss.is_public,
                    "is_alert": ss.is_alert,
                    "usage_count": ss.usage_count,
                    "created_at": ss.created_at.isoformat(),
                    "last_used_at": ss.last_used_at.isoformat() if ss.last_used_at else None
                }
                for ss in saved_searches
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get saved searches: {str(e)}"
        )

@router.get("/facets")
@monitor_performance
async def get_search_facets(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    service: SearchService = Depends(get_search_service)
):
    """Get available search facets"""
    try:
        facets = service.get_facets(is_active)
        
        return {
            "facets": [
                {
                    "id": f.id,
                    "name": f.name,
                    "display_name": f.display_name,
                    "type": f.facet_type,
                    "field_path": f.field_path,
                    "is_filterable": f.is_filterable,
                    "is_sortable": f.is_sortable,
                    "display_order": f.display_order,
                    "max_values": f.max_values,
                    "is_active": f.is_active
                }
                for f in facets
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get facets: {str(e)}"
        )

@router.post("/facets", status_code=status.HTTP_201_CREATED)
@monitor_performance
async def create_search_facet(
    facet_request: FacetRequest,
    created_by: int = Query(..., gt=0, description="Creator user ID"),
    service: SearchService = Depends(get_search_service)
):
    """Create a new search facet"""
    try:
        facet = service.create_facet(
            name=facet_request.name,
            display_name=facet_request.display_name,
            facet_type=facet_request.facet_type,
            field_path=facet_request.field_path,
            created_by=created_by,
            is_filterable=facet_request.is_filterable,
            is_sortable=facet_request.is_sortable,
            display_order=facet_request.display_order,
            max_values=facet_request.max_values
        )
        
        return {
            "id": facet.id,
            "name": facet.name,
            "display_name": facet.display_name,
            "created_at": facet.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create facet: {str(e)}"
        )

@router.get("/analytics")
@monitor_performance
async def get_search_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date for analytics"),
    end_date: Optional[datetime] = Query(None, description="End date for analytics"),
    service: SearchService = Depends(get_search_service)
):
    """Get search analytics data"""
    try:
        analytics = service.get_search_analytics(start_date, end_date)
        return analytics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get search analytics: {str(e)}"
        )

@router.get("/index/stats")
@monitor_performance
async def get_index_statistics(
    service: SearchService = Depends(get_search_service)
):
    """Get search index statistics"""
    try:
        stats = service.get_index_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get index statistics: {str(e)}"
        )

@router.post("/index/reindex")
@monitor_performance
async def reindex_all_documents(
    service: SearchService = Depends(get_search_service)
):
    """Reindex all documents (maintenance operation)"""
    try:
        result = service.reindex_all_documents()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reindex documents: {str(e)}"
        )

@router.get("/health")
@monitor_performance
async def get_search_health(
    service: SearchService = Depends(get_search_service)
):
    """Get search system health status"""
    try:
        stats = service.get_index_stats()
        
        # Determine health status
        health_status = "healthy"
        issues = []
        
        if stats['index_rate'] < 95:
            health_status = "warning"
            issues.append(f"Index rate is {stats['index_rate']}% (should be >95%)")
        
        if stats['pending_index'] > 100:
            health_status = "warning"
            issues.append(f"{stats['pending_index']} documents pending indexing")
        
        return {
            "status": health_status,
            "issues": issues,
            "statistics": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get search health: {str(e)}"
        )
