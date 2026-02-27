from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class SearchIndex(Base):
    __tablename__ = "search_indexes"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, nullable=False, index=True)
    content_type = Column(String(50), nullable=False, index=True)  # document, metadata, content
    
    # Indexed content
    title = Column(Text)
    content = Column(Text)
    metadata = Column(JSON)
    tags = Column(JSON, default=list)
    
    # Search optimization
    title_vector = Column(Text)  # For full-text search
    content_vector = Column(Text)  # For full-text search
    search_keywords = Column(Text)  # Extracted keywords
    
    # Indexing metadata
    language = Column(String(10), default='en')
    word_count = Column(Integer, default=0)
    character_count = Column(Integer, default=0)
    
    # Status and timestamps
    is_indexed = Column(Boolean, default=False, index=True)
    index_version = Column(Integer, default=1)
    last_indexed_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    search_logs = relationship("SearchLog", back_populates="search_index", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_search_document_type', 'document_id', 'content_type'),
        Index('idx_search_indexed_status', 'is_indexed', 'last_indexed_at'),
        Index('idx_search_language', 'language'),
    )

class SearchLog(Base):
    __tablename__ = "search_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    search_index_id = Column(Integer, ForeignKey("search_indexes.id"), nullable=True, index=True)
    
    # Search query details
    query = Column(Text, nullable=False)
    query_type = Column(String(50), default='full_text', index=True)  # full_text, metadata, faceted
    filters = Column(JSON, default=dict)
    
    # Search results
    results_count = Column(Integer, default=0)
    response_time_ms = Column(Float, nullable=False)
    
    # User and session info
    user_id = Column(Integer, nullable=True, index=True)
    session_id = Column(String(255), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    
    # Search metadata
    search_timestamp = Column(DateTime, default=func.now(), index=True)
    result_clicked = Column(Boolean, default=False)
    clicked_result_id = Column(Integer, nullable=True)
    
    # Relationships
    search_index = relationship("SearchIndex", back_populates="search_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_search_logs_query_type', 'query_type', 'search_timestamp'),
        Index('idx_search_logs_user_session', 'user_id', 'session_id'),
        Index('idx_search_logs_timestamp', 'search_timestamp'),
    )

class SearchSuggestion(Base):
    __tablename__ = "search_suggestions"
    
    id = Column(Integer, primary_key=True, index=True)
    suggestion = Column(String(255), nullable=False, unique=True, index=True)
    category = Column(String(50), nullable=False, index=True)  # query, tag, metadata
    
    # Usage statistics
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    
    # Suggestion metadata
    source = Column(String(50), default='user_query')  # user_query, auto_generated, admin
    language = Column(String(10), default='en')
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_suggestions_category_active', 'category', 'is_active'),
        Index('idx_suggestions_usage', 'usage_count', 'last_used_at'),
    )

class SearchFacet(Base):
    __tablename__ = "search_facets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    facet_type = Column(String(50), nullable=False)  # text, date, number, boolean, list
    
    # Facet configuration
    field_path = Column(String(255), nullable=False)  # JSON path for metadata fields
    is_filterable = Column(Boolean, default=True)
    is_sortable = Column(Boolean, default=False)
    
    # Display options
    display_order = Column(Integer, default=0)
    max_values = Column(Integer, default=10)  # Max values to show in facet
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=False)
    
    # Relationships
    facet_values = relationship("SearchFacetValue", back_populates="facet", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_facets_name_active', 'name', 'is_active'),
        Index('idx_facets_type_order', 'facet_type', 'display_order'),
    )

class SearchFacetValue(Base):
    __tablename__ = "search_facet_values"
    
    id = Column(Integer, primary_key=True, index=True)
    facet_id = Column(Integer, ForeignKey("search_facets.id"), nullable=False, index=True)
    
    # Facet value details
    value = Column(String(255), nullable=False, index=True)
    display_value = Column(String(255), nullable=False)
    document_count = Column(Integer, default=0)
    
    # Value metadata
    value_type = Column(String(50), nullable=False)  # string, number, date, boolean
    sort_order = Column(Integer, default=0)
    
    # Timestamps
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    facet = relationship("SearchFacet", back_populates="facet_values")
    
    # Indexes
    __table_args__ = (
        Index('idx_facet_values_facet_value', 'facet_id', 'value'),
        Index('idx_facet_values_count', 'document_count', 'sort_order'),
    )

class SavedSearch(Base):
    __tablename__ = "saved_searches"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Search configuration
    query = Column(Text, nullable=False)
    filters = Column(JSON, default=dict)
    sort_by = Column(String(100))
    sort_order = Column(String(10), default='desc')  # asc, desc
    
    # User and sharing
    user_id = Column(Integer, nullable=False, index=True)
    is_public = Column(Boolean, default=False, index=True)
    is_alert = Column(Boolean, default=False)  # Send alerts for new results
    
    # Usage statistics
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    
    # Alert configuration
    alert_frequency = Column(String(20), default='daily')  # immediate, daily, weekly
    last_alert_sent = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_saved_searches_user_public', 'user_id', 'is_public'),
        Index('idx_saved_searches_alert', 'is_alert', 'alert_frequency'),
        Index('idx_saved_searches_usage', 'usage_count', 'last_used_at'),
    )

class SearchAnalytics(Base):
    __tablename__ = "search_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    hour = Column(Integer, nullable=False, index=True)  # 0-23
    
    # Search volume metrics
    total_searches = Column(Integer, default=0)
    unique_queries = Column(Integer, default=0)
    unique_users = Column(Integer, default=0)
    
    # Performance metrics
    avg_response_time = Column(Float, default=0.0)
    slow_searches = Column(Integer, default=0)  # >2 seconds
    
    # Result metrics
    avg_results_per_search = Column(Float, default=0.0)
    zero_result_searches = Column(Integer, default=0)
    
    # User behavior
    searches_with_clicks = Column(Integer, default=0)
    avg_click_position = Column(Float, default=0.0)
    
    # Popular queries (top 10)
    popular_queries = Column(JSON, default=list)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_search_analytics_date_hour', 'date', 'hour'),
        Index('idx_search_analytics_date', 'date'),
    )