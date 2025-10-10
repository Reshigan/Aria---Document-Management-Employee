"""
Advanced Search API Routes
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, or_, func, select, update, delete, text
from pydantic import BaseModel

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import User, Document, Tag, Folder, SearchQuery, document_tags
from services.auth_service import auth_service

router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str
    document_type: Optional[str] = None
    folder_id: Optional[int] = None
    tags: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    file_size_min: Optional[int] = None
    file_size_max: Optional[int] = None
    uploaded_by: Optional[int] = None
    include_content: bool = True
    include_metadata: bool = True


class SearchResult(BaseModel):
    id: int
    filename: str
    original_filename: str
    document_type: Optional[str]
    status: str
    file_size: Optional[int]
    mime_type: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    uploaded_by: int
    folder_id: Optional[int]
    folder_name: Optional[str]
    tags: List[str]
    relevance_score: float
    matched_content: Optional[str] = None
    highlight_snippets: Optional[List[str]] = None


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    page: int
    page_size: int
    pages: int
    query: str
    search_time_ms: int
    facets: Dict[str, Any]


class SavedSearchRequest(BaseModel):
    name: str
    query: str
    filters: Dict[str, Any]
    is_alert: bool = False
    alert_frequency: Optional[str] = None


@router.post("/", response_model=SearchResponse)
async def search_documents(
    search_request: SearchRequest,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Advanced document search with full-text and metadata filtering"""
    start_time = datetime.now()
    
    # Build base query
    query = select(Document)
    
    # Apply user permissions (non-superusers only see their own documents)
    if not current_user.is_superuser:
        query = query.where(Document.uploaded_by == current_user.id)
    
    # Text search conditions
    search_conditions = []
    
    if search_request.include_content and search_request.query:
        # Search in OCR text content
        search_conditions.append(Document.ocr_text.ilike(f"%{search_request.query}%"))
    
    if search_request.include_metadata and search_request.query:
        # Search in filename and metadata
        search_conditions.extend([
            Document.filename.ilike(f"%{search_request.query}%"),
            Document.original_filename.ilike(f"%{search_request.query}%"),
            Document.extracted_data.ilike(f"%{search_request.query}%")
        ])
    
    if search_conditions:
        query = query.where(or_(*search_conditions))
    
    # Apply filters
    if search_request.document_type:
        query = query.where(Document.document_type == search_request.document_type)
    
    if search_request.folder_id:
        query = query.where(Document.folder_id == search_request.folder_id)
    
    if search_request.date_from:
        query = query.where(Document.created_at >= search_request.date_from)
    
    if search_request.date_to:
        query = query.where(Document.created_at <= search_request.date_to)
    
    if search_request.file_size_min:
        query = query.where(Document.file_size >= search_request.file_size_min)
    
    if search_request.file_size_max:
        query = query.where(Document.file_size <= search_request.file_size_max)
    
    if search_request.uploaded_by:
        query = query.where(Document.uploaded_by == search_request.uploaded_by)
    
    # Tag filtering
    if search_request.tags:
        tag_ids = select(Tag.id).where(Tag.name.in_(search_request.tags)).subquery()
        document_ids_with_tags = select(document_tags.c.document_id).where(
            document_tags.c.tag_id.in_(tag_ids)
        ).subquery()
        query = query.where(Document.id.in_(document_ids_with_tags))
    
    # Get total count before pagination
    count_query = select(func.count(Document.id)).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Apply pagination and ordering
    paginated_query = query.order_by(
        Document.updated_at.desc()
    ).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(paginated_query)
    documents = result.scalars().all()
    
    # Build search results with additional data
    results = []
    for doc in documents:
        # Get folder name
        folder_name = None
        if doc.folder_id:
            folder_result = await db.execute(select(Folder).where(Folder.id == doc.folder_id))
            folder = folder_result.scalar_one_or_none()
            folder_name = folder.name if folder else None
        
        # Get tags
        doc_tags_query = select(Tag.name).select_from(
            Tag.__table__.join(document_tags).join(Document.__table__)
        ).where(Document.id == doc.id)
        doc_tags_result = await db.execute(doc_tags_query)
        tag_names = [tag[0] for tag in doc_tags_result.fetchall()]
        
        # Calculate relevance score (simplified)
        relevance_score = 1.0
        if search_request.query:
            query_lower = search_request.query.lower()
            filename_match = query_lower in doc.filename.lower() if doc.filename else False
            content_match = query_lower in (doc.ocr_text or "").lower()
            
            if filename_match:
                relevance_score += 0.5
            if content_match:
                relevance_score += 0.3
        
        # Generate highlight snippets
        highlight_snippets = []
        if search_request.query and doc.ocr_text:
            content = doc.ocr_text.lower()
            query_lower = search_request.query.lower()
            
            # Find matches and create snippets
            start_pos = content.find(query_lower)
            if start_pos != -1:
                snippet_start = max(0, start_pos - 50)
                snippet_end = min(len(content), start_pos + len(query_lower) + 50)
                snippet = doc.ocr_text[snippet_start:snippet_end]
                highlight_snippets.append(f"...{snippet}...")
        
        results.append(SearchResult(
            id=doc.id,
            filename=doc.filename,
            original_filename=doc.original_filename,
            document_type=doc.document_type,
            status=doc.status,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            uploaded_by=doc.uploaded_by,
            folder_id=doc.folder_id,
            folder_name=folder_name,
            tags=tag_names,
            relevance_score=relevance_score,
            highlight_snippets=highlight_snippets
        ))
    
    # Calculate search time
    search_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
    
    # Save search query for analytics
    search_query = SearchQuery(
        user_id=current_user.id,
        query=search_request.query,
        filters=search_request.dict(),
        result_count=total,
        execution_time=search_time_ms
    )
    db.add(search_query)
    await db.commit()
    
    return SearchResponse(
        results=results,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
        query=search_request.query,
        search_time_ms=search_time_ms,
        facets={}
    )


async def _generate_search_facets(db: Session, user: User, search_request: SearchRequest) -> Dict[str, Any]:
    """Generate search facets for filtering"""
    base_query = select(Document)
    
    # Apply user permissions
    if not user.is_superuser:
        base_query = base_query.where(Document.uploaded_by == user.id)
    
    # Document types
    doc_types_query = select(
        Document.document_type,
        func.count(Document.id).label('count')
    ).select_from(base_query.subquery()).group_by(Document.document_type)
    doc_types_result = await db.execute(doc_types_query)
    doc_types = doc_types_result.fetchall()
    
    # File sizes (ranges)
    size_ranges = [
        ("0-1MB", 0, 1024*1024),
        ("1-10MB", 1024*1024, 10*1024*1024),
        ("10-100MB", 10*1024*1024, 100*1024*1024),
        ("100MB+", 100*1024*1024, None)
    ]
    
    size_facets = []
    for label, min_size, max_size in size_ranges:
        size_query = base_query.where(Document.file_size >= min_size)
        if max_size:
            size_query = size_query.where(Document.file_size < max_size)
        count_result = await db.execute(select(func.count(Document.id)).select_from(size_query))
        count = count_result.scalar()
        if count > 0:
            size_facets.append({"label": label, "count": count, "min": min_size, "max": max_size})
    
    # Date ranges
    now = datetime.now()
    date_ranges = [
        ("Today", now - timedelta(days=1)),
        ("This week", now - timedelta(days=7)),
        ("This month", now - timedelta(days=30)),
        ("This year", now - timedelta(days=365))
    ]
    
    date_facets = []
    for label, since_date in date_ranges:
        count_result = await db.execute(select(func.count(Document.id)).select_from(base_query.where(Document.created_at >= since_date)))
        count = count_result.scalar()
        if count > 0:
            date_facets.append({"label": label, "count": count, "since": since_date})
    
    # Top tags
    tag_query = select(
        Tag.name,
        func.count(document_tags.c.document_id).label('count')
    ).select_from(
        Tag.__table__.join(document_tags).join(Document.__table__)
    ).where(
        Document.uploaded_by == user.id if not user.is_superuser else True
    ).group_by(Tag.name).order_by(
        func.count(document_tags.c.document_id).desc()
    ).limit(10)
    
    tag_result = await db.execute(tag_query)
    tag_facets = tag_result.fetchall()
    
    return {
        "document_types": [{"type": dt[0], "count": dt[1]} for dt in doc_types if dt[0]],
        "file_sizes": size_facets,
        "date_ranges": date_facets,
        "top_tags": [{"name": tag[0], "count": tag[1]} for tag in tag_facets]
    }


@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=2),
    limit: int = Query(10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get search suggestions based on partial query"""
    suggestions = []
    
    # Filename suggestions
    filename_query = select(Document.filename).where(
        and_(
            Document.filename.ilike(f"%{q}%"),
            Document.uploaded_by == current_user.id if not current_user.is_superuser else True
        )
    ).distinct().limit(limit // 2)
    filename_result = await db.execute(filename_query)
    filename_matches = filename_result.fetchall()
    
    suggestions.extend([{"type": "filename", "text": match[0]} for match in filename_matches])
    
    # Tag suggestions
    tag_query = select(Tag.name).where(
        Tag.name.ilike(f"%{q}%")
    ).limit(limit // 2)
    tag_result = await db.execute(tag_query)
    tag_matches = tag_result.fetchall()
    
    suggestions.extend([{"type": "tag", "text": match[0]} for match in tag_matches])
    
    return {"suggestions": suggestions[:limit]}


@router.get("/history")
async def get_search_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's search history"""
    query = select(SearchQuery).where(SearchQuery.user_id == current_user.id)
    
    count_result = await db.execute(select(func.count(SearchQuery.id)).where(SearchQuery.user_id == current_user.id))
    total = count_result.scalar()
    
    result = await db.execute(query.order_by(SearchQuery.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size))
    searches = result.scalars().all()
    
    return {
        "searches": [
            {
                "id": search.id,
                "query": search.query,
                "filters": search.filters,
                "results_count": search.result_count,
                "search_time_ms": search.execution_time,
                "created_at": search.created_at
            }
            for search in searches
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size
    }


@router.delete("/history/{search_id}")
async def delete_search_history_item(
    search_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a search history item"""
    result = await db.execute(select(SearchQuery).where(
        and_(SearchQuery.id == search_id, SearchQuery.user_id == current_user.id)
    ))
    search = result.scalar_one_or_none()
    
    if not search:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search history item not found"
        )
    
    await db.delete(search)
    await db.commit()
    
    return {"message": "Search history item deleted successfully"}


@router.delete("/history")
async def clear_search_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear all search history for current user"""
    result = await db.execute(delete(SearchQuery).where(
        SearchQuery.user_id == current_user.id
    ))
    deleted_count = result.rowcount
    
    await db.commit()
    
    return {"message": f"Cleared {deleted_count} search history items"}


@router.get("/analytics")
async def get_search_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get search analytics (Admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    since_date = datetime.now() - timedelta(days=days)
    
    # Total searches
    count_query = select(func.count(SearchQuery.id)).where(
        SearchQuery.created_at >= since_date
    )
    count_result = await db.execute(count_query)
    total_searches = count_result.scalar()
    
    # Top queries
    top_queries_result = await db.execute(select(
        SearchQuery.query,
        func.count(SearchQuery.id).label('count')
    ).where(
        SearchQuery.created_at >= since_date
    ).group_by(SearchQuery.query).order_by(
        func.count(SearchQuery.id).desc()
    ).limit(10))
    top_queries = top_queries_result.fetchall()
    
    # Average search time
    avg_result = await db.execute(select(
        func.avg(SearchQuery.execution_time)
    ).where(SearchQuery.created_at >= since_date))
    avg_search_time = avg_result.scalar() or 0
    
    # Searches by day
    daily_result = await db.execute(select(
        func.date(SearchQuery.created_at).label('date'),
        func.count(SearchQuery.id).label('count')
    ).where(
        SearchQuery.created_at >= since_date
    ).group_by(func.date(SearchQuery.created_at)).order_by('date'))
    daily_searches = daily_result.fetchall()
    
    return {
        "total_searches": total_searches,
        "average_search_time_ms": round(avg_search_time, 2),
        "top_queries": [{"query": q[0], "count": q[1]} for q in top_queries],
        "daily_searches": [{"date": str(d[0]), "count": d[1]} for d in daily_searches]
    }