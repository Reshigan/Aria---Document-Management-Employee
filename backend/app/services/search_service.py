import re
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc, text
from app.models.search import (
    SearchIndex, SearchLog, SearchSuggestion, SearchFacet, 
    SearchFacetValue, SavedSearch, SearchAnalytics
)
from app.services.cache_service import cache_service, monitor_performance

class SearchService:
    def __init__(self, db: Session):
        self.db = db

    # Indexing Operations
    @monitor_performance
    def index_document(self, document_id: int, title: str, content: str, 
                      metadata: Dict[str, Any] = None, tags: List[str] = None) -> SearchIndex:
        """Index a document for search"""
        # Check if document already indexed
        existing_index = self.db.query(SearchIndex).filter(
            and_(SearchIndex.document_id == document_id, SearchIndex.content_type == 'document')
        ).first()
        
        if existing_index:
            # Update existing index
            existing_index.title = title
            existing_index.content = content
            existing_index.metadata = metadata or {}
            existing_index.tags = tags or []
            existing_index.search_keywords = self._extract_keywords(title, content)
            existing_index.word_count = len(content.split()) if content else 0
            existing_index.character_count = len(content) if content else 0
            existing_index.is_indexed = True
            existing_index.last_indexed_at = datetime.utcnow()
            existing_index.index_version += 1
            
            self.db.commit()
            self.db.refresh(existing_index)
            return existing_index
        
        # Create new index
        search_index = SearchIndex(
            document_id=document_id,
            content_type='document',
            title=title,
            content=content,
            metadata=metadata or {},
            tags=tags or [],
            search_keywords=self._extract_keywords(title, content),
            word_count=len(content.split()) if content else 0,
            character_count=len(content) if content else 0,
            is_indexed=True
        )
        
        self.db.add(search_index)
        self.db.commit()
        self.db.refresh(search_index)
        
        # Update facet values
        self._update_facet_values(metadata or {})
        
        return search_index

    def _extract_keywords(self, title: str, content: str) -> str:
        """Extract keywords from title and content"""
        text = f"{title} {content}".lower()
        # Remove special characters and split into words
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text)
        # Remove common stop words
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        keywords = [word for word in words if word not in stop_words]
        # Return unique keywords
        return ' '.join(list(set(keywords)))

    def _update_facet_values(self, metadata: Dict[str, Any]):
        """Update facet values based on document metadata"""
        facets = self.db.query(SearchFacet).filter(SearchFacet.is_active == True).all()
        
        for facet in facets:
            # Extract value from metadata using field path
            value = self._get_nested_value(metadata, facet.field_path)
            if value is not None:
                # Get or create facet value
                facet_value = self.db.query(SearchFacetValue).filter(
                    and_(SearchFacetValue.facet_id == facet.id, SearchFacetValue.value == str(value))
                ).first()
                
                if facet_value:
                    facet_value.document_count += 1
                else:
                    facet_value = SearchFacetValue(
                        facet_id=facet.id,
                        value=str(value),
                        display_value=str(value),
                        document_count=1,
                        value_type=type(value).__name__
                    )
                    self.db.add(facet_value)
        
        self.db.commit()

    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get nested value from dictionary using dot notation"""
        keys = path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        return value

    # Search Operations
    @monitor_performance
    def search(self, query: str, filters: Dict[str, Any] = None, 
              sort_by: str = 'relevance', sort_order: str = 'desc',
              page: int = 1, size: int = 20, user_id: int = None) -> Dict[str, Any]:
        """Perform full-text search with filters"""
        start_time = datetime.utcnow()
        
        # Build base query
        base_query = self.db.query(SearchIndex).filter(SearchIndex.is_indexed == True)
        
        # Apply text search
        if query and query.strip():
            search_terms = query.lower().split()
            search_conditions = []
            
            for term in search_terms:
                term_condition = or_(
                    SearchIndex.title.ilike(f'%{term}%'),
                    SearchIndex.content.ilike(f'%{term}%'),
                    SearchIndex.search_keywords.ilike(f'%{term}%')
                )
                search_conditions.append(term_condition)
            
            if search_conditions:
                base_query = base_query.filter(and_(*search_conditions))
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                if field == 'content_type':
                    base_query = base_query.filter(SearchIndex.content_type == value)
                elif field == 'tags':
                    if isinstance(value, list):
                        for tag in value:
                            base_query = base_query.filter(SearchIndex.tags.contains([tag]))
                    else:
                        base_query = base_query.filter(SearchIndex.tags.contains([value]))
                elif field == 'date_range':
                    if 'start' in value:
                        base_query = base_query.filter(SearchIndex.created_at >= value['start'])
                    if 'end' in value:
                        base_query = base_query.filter(SearchIndex.created_at <= value['end'])
                elif field.startswith('metadata.'):
                    # Handle metadata filters
                    metadata_path = field[9:]  # Remove 'metadata.' prefix
                    base_query = base_query.filter(
                        SearchIndex.metadata[metadata_path].astext == str(value)
                    )
        
        # Apply sorting
        if sort_by == 'relevance':
            # Simple relevance scoring based on title matches
            base_query = base_query.order_by(
                desc(SearchIndex.title.ilike(f'%{query}%')) if query else SearchIndex.id
            )
        elif sort_by == 'date':
            if sort_order == 'desc':
                base_query = base_query.order_by(desc(SearchIndex.created_at))
            else:
                base_query = base_query.order_by(asc(SearchIndex.created_at))
        elif sort_by == 'title':
            if sort_order == 'desc':
                base_query = base_query.order_by(desc(SearchIndex.title))
            else:
                base_query = base_query.order_by(asc(SearchIndex.title))
        
        # Get total count
        total_count = base_query.count()
        
        # Apply pagination
        skip = (page - 1) * size
        results = base_query.offset(skip).limit(size).all()
        
        # Calculate response time
        end_time = datetime.utcnow()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        # Log search
        self._log_search(query, 'full_text', filters or {}, len(results), response_time, user_id)
        
        # Get facets
        facets = self._get_search_facets(filters or {})
        
        return {
            'results': [self._format_search_result(result) for result in results],
            'total_count': total_count,
            'page': page,
            'size': size,
            'pages': (total_count + size - 1) // size,
            'response_time_ms': response_time,
            'facets': facets,
            'query': query,
            'filters': filters or {}
        }

    def _format_search_result(self, search_index: SearchIndex) -> Dict[str, Any]:
        """Format search result for response"""
        return {
            'id': search_index.id,
            'document_id': search_index.document_id,
            'title': search_index.title,
            'content_preview': search_index.content[:200] + '...' if search_index.content and len(search_index.content) > 200 else search_index.content,
            'content_type': search_index.content_type,
            'metadata': search_index.metadata,
            'tags': search_index.tags,
            'word_count': search_index.word_count,
            'created_at': search_index.created_at.isoformat(),
            'last_indexed_at': search_index.last_indexed_at.isoformat()
        }

    def _get_search_facets(self, current_filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get available facets for search refinement"""
        facets = self.db.query(SearchFacet).filter(
            SearchFacet.is_active == True
        ).order_by(SearchFacet.display_order).all()
        
        result_facets = []
        for facet in facets:
            facet_values = self.db.query(SearchFacetValue).filter(
                SearchFacetValue.facet_id == facet.id
            ).order_by(desc(SearchFacetValue.document_count)).limit(facet.max_values).all()
            
            if facet_values:
                result_facets.append({
                    'name': facet.name,
                    'display_name': facet.display_name,
                    'type': facet.facet_type,
                    'values': [
                        {
                            'value': fv.value,
                            'display_value': fv.display_value,
                            'count': fv.document_count,
                            'selected': current_filters.get(facet.name) == fv.value
                        }
                        for fv in facet_values
                    ]
                })
        
        return result_facets

    def _log_search(self, query: str, query_type: str, filters: Dict[str, Any],
                   results_count: int, response_time: float, user_id: int = None):
        """Log search query for analytics"""
        search_log = SearchLog(
            query=query,
            query_type=query_type,
            filters=filters,
            results_count=results_count,
            response_time_ms=response_time,
            user_id=user_id
        )
        
        self.db.add(search_log)
        self.db.commit()

    # Suggestions
    @monitor_performance
    def get_suggestions(self, partial_query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get search suggestions based on partial query"""
        cache_key = f"suggestions:{partial_query}:{limit}"
        cached_result = cache_service.get(cache_key)
        if cached_result:
            return cached_result
        
        suggestions = self.db.query(SearchSuggestion).filter(
            and_(
                SearchSuggestion.suggestion.ilike(f'%{partial_query}%'),
                SearchSuggestion.is_active == True
            )
        ).order_by(desc(SearchSuggestion.usage_count)).limit(limit).all()
        
        result = [
            {
                'suggestion': s.suggestion,
                'category': s.category,
                'usage_count': s.usage_count
            }
            for s in suggestions
        ]
        
        cache_service.set(cache_key, result, 300)  # Cache for 5 minutes
        return result

    @monitor_performance
    def add_suggestion(self, suggestion: str, category: str = 'query', source: str = 'user_query'):
        """Add or update search suggestion"""
        existing = self.db.query(SearchSuggestion).filter(
            SearchSuggestion.suggestion == suggestion
        ).first()
        
        if existing:
            existing.usage_count += 1
            existing.last_used_at = datetime.utcnow()
        else:
            new_suggestion = SearchSuggestion(
                suggestion=suggestion,
                category=category,
                source=source,
                usage_count=1,
                last_used_at=datetime.utcnow()
            )
            self.db.add(new_suggestion)
        
        self.db.commit()

    # Saved Searches
    @monitor_performance
    def save_search(self, name: str, query: str, filters: Dict[str, Any],
                   user_id: int, description: str = None, is_public: bool = False,
                   is_alert: bool = False) -> SavedSearch:
        """Save a search for later use"""
        saved_search = SavedSearch(
            name=name,
            description=description,
            query=query,
            filters=filters,
            user_id=user_id,
            is_public=is_public,
            is_alert=is_alert
        )
        
        self.db.add(saved_search)
        self.db.commit()
        self.db.refresh(saved_search)
        return saved_search

    @monitor_performance
    def get_saved_searches(self, user_id: int, include_public: bool = True) -> List[SavedSearch]:
        """Get saved searches for user"""
        query = self.db.query(SavedSearch)
        
        if include_public:
            query = query.filter(
                or_(SavedSearch.user_id == user_id, SavedSearch.is_public == True)
            )
        else:
            query = query.filter(SavedSearch.user_id == user_id)
        
        return query.order_by(desc(SavedSearch.created_at)).all()

    # Analytics
    @monitor_performance
    def get_search_analytics(self, start_date: datetime = None, 
                           end_date: datetime = None) -> Dict[str, Any]:
        """Get search analytics data"""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=7)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Get search logs in date range
        logs_query = self.db.query(SearchLog).filter(
            and_(
                SearchLog.search_timestamp >= start_date,
                SearchLog.search_timestamp <= end_date
            )
        )
        
        total_searches = logs_query.count()
        unique_queries = logs_query.with_entities(SearchLog.query).distinct().count()
        unique_users = logs_query.filter(SearchLog.user_id.isnot(None)).with_entities(SearchLog.user_id).distinct().count()
        
        # Average response time
        avg_response_time = logs_query.with_entities(func.avg(SearchLog.response_time_ms)).scalar() or 0
        
        # Zero result searches
        zero_result_searches = logs_query.filter(SearchLog.results_count == 0).count()
        
        # Popular queries
        popular_queries = logs_query.with_entities(
            SearchLog.query,
            func.count(SearchLog.id).label('count')
        ).group_by(SearchLog.query).order_by(desc('count')).limit(10).all()
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'total_searches': total_searches,
            'unique_queries': unique_queries,
            'unique_users': unique_users,
            'avg_response_time_ms': round(avg_response_time, 2),
            'zero_result_searches': zero_result_searches,
            'zero_result_rate': round((zero_result_searches / total_searches * 100), 2) if total_searches > 0 else 0,
            'popular_queries': [
                {'query': pq.query, 'count': pq.count}
                for pq in popular_queries
            ]
        }

    # Facet Management
    @monitor_performance
    def create_facet(self, name: str, display_name: str, facet_type: str,
                    field_path: str, created_by: int, **kwargs) -> SearchFacet:
        """Create a new search facet"""
        facet = SearchFacet(
            name=name,
            display_name=display_name,
            facet_type=facet_type,
            field_path=field_path,
            created_by=created_by,
            **kwargs
        )
        
        self.db.add(facet)
        self.db.commit()
        self.db.refresh(facet)
        return facet

    @monitor_performance
    def get_facets(self, is_active: bool = None) -> List[SearchFacet]:
        """Get search facets"""
        query = self.db.query(SearchFacet)
        if is_active is not None:
            query = query.filter(SearchFacet.is_active == is_active)
        
        return query.order_by(SearchFacet.display_order).all()

    # Index Management
    @monitor_performance
    def reindex_all_documents(self) -> Dict[str, Any]:
        """Reindex all documents (for maintenance)"""
        # This would typically integrate with your document storage system
        # For now, we'll just mark all indexes as needing reindexing
        
        updated_count = self.db.query(SearchIndex).update({
            SearchIndex.is_indexed: False,
            SearchIndex.index_version: SearchIndex.index_version + 1
        })
        
        self.db.commit()
        
        return {
            'message': 'Reindexing initiated',
            'documents_marked': updated_count,
            'timestamp': datetime.utcnow().isoformat()
        }

    @monitor_performance
    def get_index_stats(self) -> Dict[str, Any]:
        """Get search index statistics"""
        total_indexes = self.db.query(SearchIndex).count()
        indexed_count = self.db.query(SearchIndex).filter(SearchIndex.is_indexed == True).count()
        
        # Content type breakdown
        content_types = self.db.query(
            SearchIndex.content_type,
            func.count(SearchIndex.id).label('count')
        ).group_by(SearchIndex.content_type).all()
        
        # Language breakdown
        languages = self.db.query(
            SearchIndex.language,
            func.count(SearchIndex.id).label('count')
        ).group_by(SearchIndex.language).all()
        
        return {
            'total_indexes': total_indexes,
            'indexed_count': indexed_count,
            'pending_index': total_indexes - indexed_count,
            'index_rate': round((indexed_count / total_indexes * 100), 2) if total_indexes > 0 else 0,
            'content_types': [
                {'type': ct.content_type, 'count': ct.count}
                for ct in content_types
            ],
            'languages': [
                {'language': lang.language, 'count': lang.count}
                for lang in languages
            ]
        }