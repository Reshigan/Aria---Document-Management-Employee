from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class VersionStatus(str, Enum):
    DRAFT = "DRAFT"
    COMMITTED = "COMMITTED"
    MERGED = "MERGED"
    ARCHIVED = "ARCHIVED"


class MergeStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ConflictType(str, Enum):
    CONTENT = "CONTENT"
    METADATA = "METADATA"
    PERMISSIONS = "PERMISSIONS"
    STRUCTURE = "STRUCTURE"


class ChangeType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    MOVE = "MOVE"
    RENAME = "RENAME"
    PERMISSION_CHANGE = "PERMISSION_CHANGE"


# Base schemas
class DocumentVersionBase(BaseModel):
    version_number: str = Field(..., description="Version number (e.g., 1.0, 1.1, 2.0-beta)")
    branch_name: str = Field(default="main", description="Branch name")
    title: str = Field(..., description="Version title")
    description: Optional[str] = Field(None, description="Version description")
    status: VersionStatus = Field(default=VersionStatus.DRAFT, description="Version status")
    is_published: bool = Field(default=False, description="Whether version is published")
    change_summary: Optional[str] = Field(None, description="Summary of changes")
    change_type: ChangeType = Field(default=ChangeType.UPDATE, description="Type of change")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    tags: Optional[List[str]] = Field(None, description="Version-specific tags")

    @validator('version_number')
    def validate_version_number(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Version number cannot be empty')
        return v.strip()

    @validator('title')
    def validate_title(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Title cannot be empty')
        return v.strip()


class DocumentVersionCreate(DocumentVersionBase):
    document_id: int = Field(..., description="Document ID")
    parent_version_id: Optional[int] = Field(None, description="Parent version ID")
    file_path: str = Field(..., description="File path")
    file_size: int = Field(..., description="File size in bytes")
    file_hash: str = Field(..., description="SHA-256 hash of file")
    mime_type: str = Field(..., description="MIME type")


class DocumentVersionUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Version title")
    description: Optional[str] = Field(None, description="Version description")
    status: Optional[VersionStatus] = Field(None, description="Version status")
    is_published: Optional[bool] = Field(None, description="Whether version is published")
    change_summary: Optional[str] = Field(None, description="Summary of changes")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    tags: Optional[List[str]] = Field(None, description="Version-specific tags")


class DocumentVersionResponse(DocumentVersionBase):
    id: int
    document_id: int
    parent_version_id: Optional[int]
    file_path: str
    file_size: int
    file_hash: str
    mime_type: str
    changes_count: int
    is_current: bool
    created_by: int
    committed_by: Optional[int]
    created_at: datetime
    committed_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class DocumentVersionWithDetails(DocumentVersionResponse):
    creator_name: Optional[str] = None
    committer_name: Optional[str] = None
    parent_version: Optional[DocumentVersionResponse] = None
    child_versions: List[DocumentVersionResponse] = []
    changes: List['DocumentChangeResponse'] = []


# Branch schemas
class DocumentBranchBase(BaseModel):
    name: str = Field(..., description="Branch name")
    description: Optional[str] = Field(None, description="Branch description")
    is_protected: bool = Field(default=False, description="Whether branch is protected")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Branch name cannot be empty')
        # Validate branch name format (similar to Git)
        import re
        if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9._/-]*[a-zA-Z0-9]$', v.strip()):
            raise ValueError('Invalid branch name format')
        return v.strip()


class DocumentBranchCreate(DocumentBranchBase):
    document_id: int = Field(..., description="Document ID")
    source_version_id: Optional[int] = Field(None, description="Source version ID")


class DocumentBranchUpdate(BaseModel):
    description: Optional[str] = Field(None, description="Branch description")
    is_protected: Optional[bool] = Field(None, description="Whether branch is protected")
    is_active: Optional[bool] = Field(None, description="Whether branch is active")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class DocumentBranchResponse(DocumentBranchBase):
    id: int
    document_id: int
    source_version_id: Optional[int]
    is_default: bool
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Change schemas
class DocumentChangeBase(BaseModel):
    change_type: ChangeType = Field(..., description="Type of change")
    field_name: Optional[str] = Field(None, description="Field that was changed")
    old_value: Optional[str] = Field(None, description="Old value")
    new_value: Optional[str] = Field(None, description="New value")
    line_number: Optional[int] = Field(None, description="Line number for content changes")
    character_position: Optional[int] = Field(None, description="Character position")
    section: Optional[str] = Field(None, description="Section name")
    description: Optional[str] = Field(None, description="Change description")
    impact_level: str = Field(default="LOW", description="Impact level")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('impact_level')
    def validate_impact_level(cls, v):
        valid_levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        if v not in valid_levels:
            raise ValueError(f'Impact level must be one of: {valid_levels}')
        return v


class DocumentChangeCreate(DocumentChangeBase):
    version_id: int = Field(..., description="Version ID")


class DocumentChangeResponse(DocumentChangeBase):
    id: int
    version_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# Merge request schemas
class MergeRequestBase(BaseModel):
    title: str = Field(..., description="Merge request title")
    description: Optional[str] = Field(None, description="Merge request description")
    source_branch: str = Field(..., description="Source branch name")
    target_branch: str = Field(..., description="Target branch name")
    merge_strategy: str = Field(default="auto", description="Merge strategy")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('title')
    def validate_title(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Title cannot be empty')
        return v.strip()

    @validator('merge_strategy')
    def validate_merge_strategy(cls, v):
        valid_strategies = ['auto', 'manual', 'force']
        if v not in valid_strategies:
            raise ValueError(f'Merge strategy must be one of: {valid_strategies}')
        return v


class MergeRequestCreate(MergeRequestBase):
    document_id: int = Field(..., description="Document ID")
    source_version_id: int = Field(..., description="Source version ID")
    target_version_id: int = Field(..., description="Target version ID")
    assigned_to: Optional[int] = Field(None, description="Assigned user ID")


class MergeRequestUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Merge request title")
    description: Optional[str] = Field(None, description="Merge request description")
    status: Optional[MergeStatus] = Field(None, description="Merge request status")
    assigned_to: Optional[int] = Field(None, description="Assigned user ID")
    merge_strategy: Optional[str] = Field(None, description="Merge strategy")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class MergeRequestResponse(MergeRequestBase):
    id: int
    document_id: int
    source_version_id: int
    target_version_id: int
    merged_version_id: Optional[int]
    status: MergeStatus
    has_conflicts: bool
    conflicts_resolved: bool
    auto_mergeable: bool
    created_by: int
    assigned_to: Optional[int]
    merged_by: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    merged_at: Optional[datetime]

    class Config:
        from_attributes = True


class MergeRequestWithDetails(MergeRequestResponse):
    creator_name: Optional[str] = None
    assignee_name: Optional[str] = None
    merger_name: Optional[str] = None
    source_version: Optional[DocumentVersionResponse] = None
    target_version: Optional[DocumentVersionResponse] = None
    merged_version: Optional[DocumentVersionResponse] = None
    conflicts: List['MergeConflictResponse'] = []


# Conflict schemas
class MergeConflictBase(BaseModel):
    conflict_type: ConflictType = Field(..., description="Type of conflict")
    field_name: Optional[str] = Field(None, description="Field name")
    section: Optional[str] = Field(None, description="Section name")
    source_value: Optional[str] = Field(None, description="Source value")
    target_value: Optional[str] = Field(None, description="Target value")
    resolved_value: Optional[str] = Field(None, description="Resolved value")
    resolution_strategy: Optional[str] = Field(None, description="Resolution strategy")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('resolution_strategy')
    def validate_resolution_strategy(cls, v):
        if v is not None:
            valid_strategies = ['source', 'target', 'manual', 'custom']
            if v not in valid_strategies:
                raise ValueError(f'Resolution strategy must be one of: {valid_strategies}')
        return v


class MergeConflictCreate(MergeConflictBase):
    merge_request_id: int = Field(..., description="Merge request ID")


class MergeConflictUpdate(BaseModel):
    resolved_value: Optional[str] = Field(None, description="Resolved value")
    resolution_strategy: Optional[str] = Field(None, description="Resolution strategy")
    is_resolved: Optional[bool] = Field(None, description="Whether conflict is resolved")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class MergeConflictResponse(MergeConflictBase):
    id: int
    merge_request_id: int
    is_resolved: bool
    resolved_by: Optional[int]
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


# Comparison schemas
class VersionComparisonRequest(BaseModel):
    document_id: int = Field(..., description="Document ID")
    version_a_id: int = Field(..., description="First version ID")
    version_b_id: int = Field(..., description="Second version ID")


class VersionComparisonResponse(BaseModel):
    id: int
    document_id: int
    version_a_id: int
    version_b_id: int
    differences_count: int
    similarity_score: int
    summary: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class VersionComparisonDetails(VersionComparisonResponse):
    version_a: Optional[DocumentVersionResponse] = None
    version_b: Optional[DocumentVersionResponse] = None
    diff_data: Optional[str] = None  # Decompressed diff data


# Tag schemas
class VersionTagBase(BaseModel):
    name: str = Field(..., description="Tag name")
    description: Optional[str] = Field(None, description="Tag description")
    tag_type: str = Field(default="release", description="Tag type")
    is_protected: bool = Field(default=False, description="Whether tag is protected")
    color: Optional[str] = Field(None, description="Hex color")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Tag name cannot be empty')
        return v.strip()

    @validator('tag_type')
    def validate_tag_type(cls, v):
        valid_types = ['release', 'milestone', 'snapshot', 'backup']
        if v not in valid_types:
            raise ValueError(f'Tag type must be one of: {valid_types}')
        return v

    @validator('color')
    def validate_color(cls, v):
        if v is not None:
            import re
            if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
                raise ValueError('Color must be a valid hex color (e.g., #FF0000)')
        return v


class VersionTagCreate(VersionTagBase):
    document_id: int = Field(..., description="Document ID")
    version_id: int = Field(..., description="Version ID")


class VersionTagUpdate(BaseModel):
    description: Optional[str] = Field(None, description="Tag description")
    is_protected: Optional[bool] = Field(None, description="Whether tag is protected")
    color: Optional[str] = Field(None, description="Hex color")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class VersionTagResponse(VersionTagBase):
    id: int
    document_id: int
    version_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# List responses
class DocumentVersionListResponse(BaseModel):
    items: List[DocumentVersionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DocumentBranchListResponse(BaseModel):
    items: List[DocumentBranchResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MergeRequestListResponse(BaseModel):
    items: List[MergeRequestResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class VersionTagListResponse(BaseModel):
    items: List[VersionTagResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Statistics schemas
class VersionControlStats(BaseModel):
    total_versions: int
    total_branches: int
    total_merge_requests: int
    pending_merge_requests: int
    total_conflicts: int
    unresolved_conflicts: int
    total_tags: int
    recent_activity: List[Dict[str, Any]]


# Bulk operations
class BulkVersionOperation(BaseModel):
    operation: str = Field(..., description="Operation type")
    version_ids: List[int] = Field(..., description="Version IDs")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Operation parameters")

    @validator('operation')
    def validate_operation(cls, v):
        valid_operations = ['delete', 'archive', 'publish', 'unpublish', 'tag']
        if v not in valid_operations:
            raise ValueError(f'Operation must be one of: {valid_operations}')
        return v


class BulkVersionOperationResponse(BaseModel):
    operation: str
    total_items: int
    successful_items: int
    failed_items: int
    errors: List[str]
    results: List[Dict[str, Any]]


# Forward references
DocumentVersionWithDetails.model_rebuild()
MergeRequestWithDetails.model_rebuild()