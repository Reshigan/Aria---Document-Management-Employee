"""
Enhanced Tag Management Models
Supports hierarchical tags, categories, auto-tagging, and analytics
"""
import enum
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, JSON, Table, UniqueConstraint, Float
from sqlalchemy.orm import relationship
from .base import BaseModel


class TagType(str, enum.Enum):
    """Tag type enumeration"""
    MANUAL = "manual"          # User-created tags
    SYSTEM = "system"          # System-generated tags
    AUTO = "auto"              # AI/ML generated tags
    CATEGORY = "category"      # Category tags
    METADATA = "metadata"      # Metadata-based tags


class TagCategory(str, enum.Enum):
    """Tag category enumeration"""
    GENERAL = "general"
    DOCUMENT_TYPE = "document_type"
    DEPARTMENT = "department"
    PROJECT = "project"
    STATUS = "status"
    PRIORITY = "priority"
    VENDOR = "vendor"
    FINANCIAL = "financial"
    COMPLIANCE = "compliance"
    CUSTOM = "custom"


class AutoTagRule(BaseModel):
    """Auto-tagging rule model"""
    __tablename__ = "auto_tag_rules"
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Rule configuration
    rule_type = Column(String(50), nullable=False)  # content, filename, metadata, ml
    conditions = Column(JSON, nullable=False)  # Rule conditions as JSON
    confidence_threshold = Column(Float, default=0.8)  # Minimum confidence for auto-tagging
    
    # Target tags
    tag_ids = Column(JSON)  # List of tag IDs to apply
    
    # Statistics
    applications_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    last_applied = Column(DateTime)
    
    # Relationships
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User")
    
    def __repr__(self):
        return f"<AutoTagRule(id={self.id}, name='{self.name}', type='{self.rule_type}')>"


class TagHierarchy(BaseModel):
    """Tag hierarchy model for parent-child relationships"""
    __tablename__ = "tag_hierarchies"
    
    parent_tag_id = Column(Integer, ForeignKey('enhanced_tags.id'), nullable=False)
    child_tag_id = Column(Integer, ForeignKey('enhanced_tags.id'), nullable=False)
    relationship_type = Column(String(50), default='parent_child')  # parent_child, synonym, related
    weight = Column(Float, default=1.0)  # Relationship strength
    
    # Relationships
    parent_tag = relationship("EnhancedTag", foreign_keys=[parent_tag_id], back_populates="child_relationships")
    child_tag = relationship("EnhancedTag", foreign_keys=[child_tag_id], back_populates="parent_relationships")
    
    __table_args__ = (
        UniqueConstraint('parent_tag_id', 'child_tag_id', name='unique_tag_hierarchy'),
    )
    
    def __repr__(self):
        return f"<TagHierarchy(parent={self.parent_tag_id}, child={self.child_tag_id})>"


class TagAnalytics(BaseModel):
    """Tag analytics model for usage tracking"""
    __tablename__ = "tag_analytics"
    
    tag_id = Column(Integer, ForeignKey('enhanced_tags.id'), nullable=False)
    date = Column(DateTime, nullable=False)
    
    # Usage metrics
    usage_count = Column(Integer, default=0)
    document_count = Column(Integer, default=0)
    user_count = Column(Integer, default=0)
    
    # Performance metrics
    search_count = Column(Integer, default=0)
    click_through_rate = Column(Float, default=0.0)
    
    # Auto-tagging metrics
    auto_applied_count = Column(Integer, default=0)
    auto_confidence_avg = Column(Float, default=0.0)
    manual_corrections = Column(Integer, default=0)
    
    # Relationships
    tag = relationship("EnhancedTag", back_populates="analytics")
    
    __table_args__ = (
        UniqueConstraint('tag_id', 'date', name='unique_tag_date_analytics'),
    )
    
    def __repr__(self):
        return f"<TagAnalytics(tag_id={self.tag_id}, date={self.date}, usage={self.usage_count})>"


class EnhancedTag(BaseModel):
    """Enhanced tag model with hierarchical support and advanced features"""
    __tablename__ = "enhanced_tags"
    
    # Basic information
    name = Column(String(100), nullable=False, index=True)
    display_name = Column(String(100))  # User-friendly display name
    description = Column(Text)
    
    # Visual properties
    color = Column(String(7))  # Hex color code
    icon = Column(String(50))  # Icon identifier
    
    # Classification
    tag_type = Column(Enum(TagType), default=TagType.MANUAL, nullable=False)
    category = Column(Enum(TagCategory), default=TagCategory.GENERAL, nullable=False)
    
    # Hierarchy
    parent_id = Column(Integer, ForeignKey('enhanced_tags.id'))
    level = Column(Integer, default=0)  # Hierarchy level (0 = root)
    path = Column(String(1000))  # Full path for quick lookups (e.g., "Finance/Invoices/Pending")
    
    # Status and configuration
    is_active = Column(Boolean, default=True, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)
    is_public = Column(Boolean, default=True, nullable=False)
    is_auto_taggable = Column(Boolean, default=True, nullable=False)
    
    # Usage statistics
    usage_count = Column(Integer, default=0)
    document_count = Column(Integer, default=0)
    last_used = Column(DateTime)
    
    # Auto-tagging configuration
    auto_tag_keywords = Column(JSON)  # Keywords for auto-tagging
    auto_tag_patterns = Column(JSON)  # Regex patterns for auto-tagging
    confidence_threshold = Column(Float, default=0.8)
    
    # Metadata
    tag_metadata = Column(JSON)  # Additional tag metadata
    
    # Relationships
    parent = relationship("EnhancedTag", remote_side="EnhancedTag.id", back_populates="children")
    children = relationship("EnhancedTag", back_populates="parent")
    
    # Many-to-many relationships
    documents = relationship("Document", secondary="document_enhanced_tags", back_populates="enhanced_tags")
    
    # Hierarchy relationships
    parent_relationships = relationship("TagHierarchy", foreign_keys=[TagHierarchy.child_tag_id], back_populates="child_tag")
    child_relationships = relationship("TagHierarchy", foreign_keys=[TagHierarchy.parent_tag_id], back_populates="parent_tag")
    
    # Analytics
    analytics = relationship("TagAnalytics", back_populates="tag")
    
    # User relationships
    created_by = Column(Integer, ForeignKey('users.id'))
    creator = relationship("User")
    
    __table_args__ = (
        UniqueConstraint('name', 'parent_id', name='unique_tag_name_parent'),
    )
    
    def __repr__(self):
        return f"<EnhancedTag(id={self.id}, name='{self.name}', type='{self.tag_type}')>"
    
    @property
    def full_path(self) -> str:
        """Get the full hierarchical path of the tag"""
        if self.path:
            return self.path
        
        if self.parent:
            return f"{self.parent.full_path}/{self.name}"
        return self.name
    
    @property
    def is_leaf(self) -> bool:
        """Check if this is a leaf node (no children)"""
        return len(self.children) == 0
    
    @property
    def is_root(self) -> bool:
        """Check if this is a root node (no parent)"""
        return self.parent_id is None
    
    def get_ancestors(self) -> List['EnhancedTag']:
        """Get all ancestor tags"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors
    
    def get_descendants(self) -> List['EnhancedTag']:
        """Get all descendant tags"""
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants
    
    def update_path(self):
        """Update the path based on hierarchy"""
        if self.parent:
            self.path = f"{self.parent.full_path}/{self.name}"
        else:
            self.path = self.name
    
    def increment_usage(self):
        """Increment usage statistics"""
        self.usage_count += 1
        self.last_used = datetime.utcnow()


# Association table for document-enhanced tag relationships
document_enhanced_tags = Table(
    'document_enhanced_tags',
    BaseModel.metadata,
    Column('document_id', Integer, ForeignKey('documents.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('enhanced_tags.id'), primary_key=True),
    Column('confidence', Float, default=1.0),  # Confidence score for auto-tags
    Column('applied_by', String(50), default='manual'),  # manual, auto, ml
    Column('applied_at', DateTime, default=datetime.utcnow)
)


class TagSuggestion(BaseModel):
    """Tag suggestion model for ML-based tag recommendations"""
    __tablename__ = "tag_suggestions"
    
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    tag_id = Column(Integer, ForeignKey('enhanced_tags.id'), nullable=False)
    
    # Suggestion details
    confidence_score = Column(Float, nullable=False)
    suggestion_source = Column(String(50), nullable=False)  # ml, content, metadata, similar_docs
    reasoning = Column(Text)  # Explanation for the suggestion
    
    # Status
    is_accepted = Column(Boolean)
    is_rejected = Column(Boolean, default=False)
    reviewed_by = Column(Integer, ForeignKey('users.id'))
    reviewed_at = Column(DateTime)
    
    # Relationships
    document = relationship("Document")
    tag = relationship("EnhancedTag")
    reviewer = relationship("User")
    
    def __repr__(self):
        return f"<TagSuggestion(document_id={self.document_id}, tag_id={self.tag_id}, confidence={self.confidence_score})>"


class TagTemplate(BaseModel):
    """Tag template model for predefined tag sets"""
    __tablename__ = "tag_templates"
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    
    # Template configuration
    tag_ids = Column(JSON, nullable=False)  # List of tag IDs in the template
    is_public = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    
    # Usage statistics
    usage_count = Column(Integer, default=0)
    
    # Relationships
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User")
    
    def __repr__(self):
        return f"<TagTemplate(id={self.id}, name='{self.name}')>"