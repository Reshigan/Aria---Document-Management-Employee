from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey, LargeBinary, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class FileMetadata(Base):
    __tablename__ = "file_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, nullable=False, unique=True, index=True)  # Reference to main file
    
    # Basic file information
    filename = Column(String(255), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False, index=True)
    mime_type = Column(String(100), nullable=False, index=True)
    file_extension = Column(String(10), nullable=False, index=True)
    
    # File hashes for deduplication
    md5_hash = Column(String(32), nullable=False, index=True)
    sha256_hash = Column(String(64), nullable=False, index=True)
    
    # File content analysis
    content_type = Column(String(50), nullable=False, index=True)  # document, image, video, audio, archive
    encoding = Column(String(50))
    language = Column(String(10))
    
    # Image/Media specific metadata
    width = Column(Integer)
    height = Column(Integer)
    duration = Column(Float)  # For video/audio files
    bitrate = Column(Integer)
    
    # Document specific metadata
    page_count = Column(Integer)
    word_count = Column(Integer)
    character_count = Column(Integer)
    
    # Extended metadata (EXIF, document properties, etc.)
    extended_metadata = Column(JSON, default=dict)
    
    # File status and processing
    is_processed = Column(Boolean, default=False, index=True)
    processing_status = Column(String(50), default='pending', index=True)  # pending, processing, completed, failed
    processing_error = Column(Text)
    
    # Virus scanning
    is_scanned = Column(Boolean, default=False, index=True)
    scan_status = Column(String(50), default='pending', index=True)  # pending, clean, infected, error
    scan_result = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_accessed = Column(DateTime, default=func.now())
    
    # Relationships
    chunks = relationship("FileChunk", back_populates="file_metadata", cascade="all, delete-orphan")
    shares = relationship("FileShare", back_populates="file_metadata", cascade="all, delete-orphan")
    versions = relationship("FileVersion", back_populates="file_metadata", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_file_metadata_hash', 'md5_hash', 'sha256_hash'),
        Index('idx_file_metadata_type_size', 'content_type', 'file_size'),
        Index('idx_file_metadata_status', 'processing_status', 'scan_status'),
        Index('idx_file_metadata_created', 'created_at'),
    )

class FileChunk(Base):
    __tablename__ = "file_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    file_metadata_id = Column(Integer, ForeignKey("file_metadata.id"), nullable=False, index=True)
    
    # Chunk information
    chunk_number = Column(Integer, nullable=False, index=True)
    chunk_size = Column(Integer, nullable=False)
    chunk_hash = Column(String(64), nullable=False, index=True)
    
    # Upload tracking
    is_uploaded = Column(Boolean, default=False, index=True)
    upload_id = Column(String(255), nullable=True, index=True)  # For resumable uploads
    
    # Storage information
    storage_path = Column(Text)
    storage_backend = Column(String(50), default='local')  # local, s3, gcs, azure
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    uploaded_at = Column(DateTime)
    
    # Relationships
    file_metadata = relationship("FileMetadata", back_populates="chunks")
    
    # Indexes
    __table_args__ = (
        Index('idx_file_chunks_file_number', 'file_metadata_id', 'chunk_number'),
        Index('idx_file_chunks_upload', 'upload_id', 'is_uploaded'),
    )

class FileShare(Base):
    __tablename__ = "file_shares"
    
    id = Column(Integer, primary_key=True, index=True)
    file_metadata_id = Column(Integer, ForeignKey("file_metadata.id"), nullable=False, index=True)
    
    # Share details
    share_token = Column(String(255), nullable=False, unique=True, index=True)
    share_type = Column(String(50), nullable=False, index=True)  # public, private, password, time_limited
    
    # Access control
    password_hash = Column(String(255))  # For password-protected shares
    allowed_users = Column(JSON, default=list)  # List of user IDs
    allowed_emails = Column(JSON, default=list)  # List of email addresses
    
    # Permissions
    can_download = Column(Boolean, default=True)
    can_view = Column(Boolean, default=True)
    can_comment = Column(Boolean, default=False)
    
    # Limits and expiration
    max_downloads = Column(Integer)
    download_count = Column(Integer, default=0)
    expires_at = Column(DateTime)
    
    # Tracking
    is_active = Column(Boolean, default=True, index=True)
    last_accessed = Column(DateTime)
    access_count = Column(Integer, default=0)
    
    # Creator and timestamps
    created_by = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    file_metadata = relationship("FileMetadata", back_populates="shares")
    access_logs = relationship("FileAccessLog", back_populates="file_share", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_file_shares_token_active', 'share_token', 'is_active'),
        Index('idx_file_shares_type_expires', 'share_type', 'expires_at'),
        Index('idx_file_shares_creator', 'created_by', 'created_at'),
    )

class FileVersion(Base):
    __tablename__ = "file_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    file_metadata_id = Column(Integer, ForeignKey("file_metadata.id"), nullable=False, index=True)
    
    # Version information
    version_number = Column(Integer, nullable=False, index=True)
    version_name = Column(String(255))
    version_description = Column(Text)
    
    # File details for this version
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False)
    
    # Change tracking
    changes_summary = Column(Text)
    change_type = Column(String(50), default='update')  # create, update, restore, merge
    
    # Version metadata
    is_current = Column(Boolean, default=False, index=True)
    is_archived = Column(Boolean, default=False, index=True)
    
    # Creator and timestamps
    created_by = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    file_metadata = relationship("FileMetadata", back_populates="versions")
    
    # Indexes
    __table_args__ = (
        Index('idx_file_versions_file_number', 'file_metadata_id', 'version_number'),
        Index('idx_file_versions_current', 'file_metadata_id', 'is_current'),
        Index('idx_file_versions_creator', 'created_by', 'created_at'),
    )

class FileAccessLog(Base):
    __tablename__ = "file_access_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    file_metadata_id = Column(Integer, ForeignKey("file_metadata.id"), nullable=False, index=True)
    file_share_id = Column(Integer, ForeignKey("file_shares.id"), nullable=True, index=True)
    
    # Access details
    access_type = Column(String(50), nullable=False, index=True)  # view, download, upload, delete, share
    user_id = Column(Integer, nullable=True, index=True)
    session_id = Column(String(255), nullable=True, index=True)
    
    # Request information
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(Text)
    referer = Column(Text)
    
    # Response information
    status_code = Column(Integer, nullable=False, index=True)
    response_size = Column(Integer)
    response_time_ms = Column(Float)
    
    # Additional context
    access_method = Column(String(50))  # web, api, mobile, desktop
    client_info = Column(JSON, default=dict)
    
    # Timestamp
    accessed_at = Column(DateTime, default=func.now(), index=True)
    
    # Relationships
    file_metadata = relationship("FileMetadata")
    file_share = relationship("FileShare", back_populates="access_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_file_access_logs_file_type', 'file_metadata_id', 'access_type'),
        Index('idx_file_access_logs_user_time', 'user_id', 'accessed_at'),
        Index('idx_file_access_logs_ip_time', 'ip_address', 'accessed_at'),
        Index('idx_file_access_logs_status', 'status_code', 'accessed_at'),
    )

class FileArchive(Base):
    __tablename__ = "file_archives"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Archive information
    archive_name = Column(String(255), nullable=False, index=True)
    archive_type = Column(String(50), nullable=False, index=True)  # zip, tar, 7z, backup
    archive_path = Column(Text, nullable=False)
    
    # Archive contents
    file_count = Column(Integer, default=0)
    total_size = Column(Integer, default=0)
    compressed_size = Column(Integer, default=0)
    compression_ratio = Column(Float, default=0.0)
    
    # Archive metadata
    file_list = Column(JSON, default=list)  # List of files in archive
    archive_hash = Column(String(64), nullable=False)
    
    # Archive settings
    compression_level = Column(Integer, default=6)
    is_encrypted = Column(Boolean, default=False)
    password_protected = Column(Boolean, default=False)
    
    # Status and processing
    status = Column(String(50), default='pending', index=True)  # pending, creating, completed, failed
    progress_percentage = Column(Float, default=0.0)
    error_message = Column(Text)
    
    # Lifecycle management
    retention_days = Column(Integer)
    expires_at = Column(DateTime)
    is_permanent = Column(Boolean, default=False)
    
    # Creator and timestamps
    created_by = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime)
    
    # Indexes
    __table_args__ = (
        Index('idx_file_archives_name_type', 'archive_name', 'archive_type'),
        Index('idx_file_archives_status_created', 'status', 'created_at'),
        Index('idx_file_archives_creator', 'created_by', 'created_at'),
        Index('idx_file_archives_expires', 'expires_at', 'is_permanent'),
    )

class FileDuplicate(Base):
    __tablename__ = "file_duplicates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Duplicate group information
    duplicate_group_id = Column(String(64), nullable=False, index=True)  # Hash-based group ID
    file_metadata_id = Column(Integer, ForeignKey("file_metadata.id"), nullable=False, index=True)
    
    # Duplicate detection details
    similarity_score = Column(Float, nullable=False, index=True)  # 0.0 to 1.0
    detection_method = Column(String(50), nullable=False)  # hash, content, fuzzy
    
    # File comparison data
    hash_match = Column(Boolean, default=False)
    size_match = Column(Boolean, default=False)
    name_similarity = Column(Float, default=0.0)
    content_similarity = Column(Float, default=0.0)
    
    # Resolution status
    is_resolved = Column(Boolean, default=False, index=True)
    resolution_action = Column(String(50))  # keep, delete, merge, ignore
    resolved_by = Column(Integer)
    resolved_at = Column(DateTime)
    
    # Detection metadata
    detected_at = Column(DateTime, default=func.now())
    detection_algorithm = Column(String(100))
    
    # Relationships
    file_metadata = relationship("FileMetadata")
    
    # Indexes
    __table_args__ = (
        Index('idx_file_duplicates_group_score', 'duplicate_group_id', 'similarity_score'),
        Index('idx_file_duplicates_resolved', 'is_resolved', 'detected_at'),
        Index('idx_file_duplicates_method', 'detection_method', 'similarity_score'),
    )

class FilePreview(Base):
    __tablename__ = "file_previews"
    
    id = Column(Integer, primary_key=True, index=True)
    file_metadata_id = Column(Integer, ForeignKey("file_metadata.id"), nullable=False, index=True)
    
    # Preview information
    preview_type = Column(String(50), nullable=False, index=True)  # thumbnail, small, medium, large, pdf
    preview_format = Column(String(20), nullable=False)  # jpg, png, webp, pdf
    
    # Preview file details
    preview_path = Column(Text, nullable=False)
    preview_size = Column(Integer, nullable=False)
    preview_width = Column(Integer)
    preview_height = Column(Integer)
    
    # Generation details
    generation_method = Column(String(50))  # imagemagick, ffmpeg, libreoffice, custom
    generation_settings = Column(JSON, default=dict)
    
    # Status and quality
    is_generated = Column(Boolean, default=False, index=True)
    generation_status = Column(String(50), default='pending')  # pending, generating, completed, failed
    quality_score = Column(Float)  # 0.0 to 1.0
    
    # Error handling
    generation_error = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    generated_at = Column(DateTime)
    
    # Relationships
    file_metadata = relationship("FileMetadata")
    
    # Indexes
    __table_args__ = (
        Index('idx_file_previews_file_type', 'file_metadata_id', 'preview_type'),
        Index('idx_file_previews_status', 'generation_status', 'created_at'),
        Index('idx_file_previews_generated', 'is_generated', 'generated_at'),
    )