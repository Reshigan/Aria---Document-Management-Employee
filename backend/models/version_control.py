from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, LargeBinary, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base
import enum


class VersionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    COMMITTED = "COMMITTED"
    MERGED = "MERGED"
    ARCHIVED = "ARCHIVED"


class MergeStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ConflictType(str, enum.Enum):
    CONTENT = "CONTENT"
    METADATA = "METADATA"
    PERMISSIONS = "PERMISSIONS"
    STRUCTURE = "STRUCTURE"


class ChangeType(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    MOVE = "MOVE"
    RENAME = "RENAME"
    PERMISSION_CHANGE = "PERMISSION_CHANGE"


class DocumentVersion(Base):
    """Document version control - tracks all versions of documents"""
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_number = Column(String(50), nullable=False)  # e.g., "1.0", "1.1", "2.0-beta"
    branch_name = Column(String(100), nullable=False, default="main")
    parent_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    
    # Version metadata
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default=VersionStatus.DRAFT)
    is_current = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    
    # File information
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False)  # SHA-256 hash
    mime_type = Column(String(100), nullable=False)
    
    # Change tracking
    change_summary = Column(Text, nullable=True)
    change_type = Column(String(20), nullable=False, default=ChangeType.UPDATE)
    changes_count = Column(Integer, default=0)
    
    # User information
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    committed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    committed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Metadata
    version_metadata = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)  # Version-specific tags
    
    # Relationships
    document = relationship("Document", back_populates="versions")
    parent_version = relationship("DocumentVersion", remote_side=[id], back_populates="child_versions")
    child_versions = relationship("DocumentVersion", back_populates="parent_version")
    creator = relationship("User", foreign_keys=[created_by])
    committer = relationship("User", foreign_keys=[committed_by])
    changes = relationship("DocumentChange", back_populates="version")
    merge_requests_source = relationship("MergeRequest", foreign_keys="MergeRequest.source_version_id", back_populates="source_version")
    merge_requests_target = relationship("MergeRequest", foreign_keys="MergeRequest.target_version_id", back_populates="target_version")
    
    # Indexes
    __table_args__ = (
        Index('idx_document_version', 'document_id', 'version_number'),
        Index('idx_document_branch', 'document_id', 'branch_name'),
        Index('idx_version_status', 'status'),
        Index('idx_version_current', 'is_current'),
        Index('idx_version_created', 'created_at'),
    )


class DocumentBranch(Base):
    """Document branches for parallel development"""
    __tablename__ = "document_branches"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Branch metadata
    is_default = Column(Boolean, default=False)
    is_protected = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Branch source
    source_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    
    # User information
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Metadata
    branch_metadata = Column(JSON, nullable=True)
    
    # Relationships
    document = relationship("Document")
    source_version = relationship("DocumentVersion")
    creator = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_document_branch_name', 'document_id', 'name', unique=True),
        Index('idx_branch_default', 'is_default'),
        Index('idx_branch_active', 'is_active'),
    )


class DocumentChange(Base):
    """Individual changes within a document version"""
    __tablename__ = "document_changes"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False)
    
    # Change information
    change_type = Column(String(20), nullable=False)
    field_name = Column(String(100), nullable=True)  # Field that was changed
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    
    # Change location (for content changes)
    line_number = Column(Integer, nullable=True)
    character_position = Column(Integer, nullable=True)
    section = Column(String(200), nullable=True)
    
    # Change metadata
    description = Column(Text, nullable=True)
    impact_level = Column(String(20), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    
    # User information
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Metadata
    change_metadata = Column(JSON, nullable=True)
    
    # Relationships
    version = relationship("DocumentVersion", back_populates="changes")
    creator = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_change_version', 'version_id'),
        Index('idx_change_type', 'change_type'),
        Index('idx_change_impact', 'impact_level'),
        Index('idx_change_created', 'created_at'),
    )


class MergeRequest(Base):
    """Merge requests for combining document versions"""
    __tablename__ = "merge_requests"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Merge information
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default=MergeStatus.PENDING)
    
    # Source and target
    source_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False)
    target_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False)
    source_branch = Column(String(100), nullable=False)
    target_branch = Column(String(100), nullable=False)
    
    # Merge result
    merged_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    
    # Conflict information
    has_conflicts = Column(Boolean, default=False)
    conflicts_resolved = Column(Boolean, default=False)
    auto_mergeable = Column(Boolean, default=True)
    
    # User information
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    merged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    merged_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    merge_metadata = Column(JSON, nullable=True)
    merge_strategy = Column(String(50), default="auto")  # auto, manual, force
    
    # Relationships
    document = relationship("Document")
    source_version = relationship("DocumentVersion", foreign_keys=[source_version_id])
    target_version = relationship("DocumentVersion", foreign_keys=[target_version_id])
    merged_version = relationship("DocumentVersion", foreign_keys=[merged_version_id])
    creator = relationship("User", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assigned_to])
    merger = relationship("User", foreign_keys=[merged_by])
    conflicts = relationship("MergeConflict", back_populates="merge_request")
    
    # Indexes
    __table_args__ = (
        Index('idx_merge_document', 'document_id'),
        Index('idx_merge_status', 'status'),
        Index('idx_merge_source', 'source_version_id'),
        Index('idx_merge_target', 'target_version_id'),
        Index('idx_merge_created', 'created_at'),
    )


class MergeConflict(Base):
    """Conflicts that occur during merge operations"""
    __tablename__ = "merge_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    merge_request_id = Column(Integer, ForeignKey("merge_requests.id"), nullable=False)
    
    # Conflict information
    conflict_type = Column(String(20), nullable=False)
    field_name = Column(String(100), nullable=True)
    section = Column(String(200), nullable=True)
    
    # Conflict values
    source_value = Column(Text, nullable=True)
    target_value = Column(Text, nullable=True)
    resolved_value = Column(Text, nullable=True)
    
    # Resolution information
    is_resolved = Column(Boolean, default=False)
    resolution_strategy = Column(String(50), nullable=True)  # source, target, manual, custom
    
    # User information
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    conflict_metadata = Column(JSON, nullable=True)
    
    # Relationships
    merge_request = relationship("MergeRequest", back_populates="conflicts")
    resolver = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_conflict_merge', 'merge_request_id'),
        Index('idx_conflict_type', 'conflict_type'),
        Index('idx_conflict_resolved', 'is_resolved'),
    )


class VersionComparison(Base):
    """Cached version comparisons for performance"""
    __tablename__ = "version_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Comparison versions
    version_a_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False)
    version_b_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False)
    
    # Comparison results
    differences_count = Column(Integer, default=0)
    similarity_score = Column(Integer, default=0)  # 0-100
    
    # Comparison data
    diff_data = Column(LargeBinary, nullable=True)  # Compressed diff data
    summary = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    document = relationship("Document")
    version_a = relationship("DocumentVersion", foreign_keys=[version_a_id])
    version_b = relationship("DocumentVersion", foreign_keys=[version_b_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_comparison_versions', 'version_a_id', 'version_b_id', unique=True),
        Index('idx_comparison_document', 'document_id'),
        Index('idx_comparison_expires', 'expires_at'),
    )


class VersionTag(Base):
    """Tags for document versions (releases, milestones, etc.)"""
    __tablename__ = "version_tags"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False)
    
    # Tag information
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    tag_type = Column(String(50), default="release")  # release, milestone, snapshot, backup
    
    # Tag metadata
    is_protected = Column(Boolean, default=False)
    color = Column(String(7), nullable=True)  # Hex color
    
    # User information
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Metadata
    tag_metadata = Column(JSON, nullable=True)
    
    # Relationships
    document = relationship("Document")
    version = relationship("DocumentVersion")
    creator = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_tag_document_name', 'document_id', 'name', unique=True),
        Index('idx_tag_version', 'version_id'),
        Index('idx_tag_type', 'tag_type'),
    )