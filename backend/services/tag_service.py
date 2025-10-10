"""
Enhanced Tag Management Service
Provides comprehensive tag management with hierarchy, auto-tagging, and analytics
"""
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc, text
from fastapi import HTTPException, Depends

from models.tag_models import (
    EnhancedTag, TagHierarchy, TagAnalytics, AutoTagRule, 
    TagSuggestion, TagTemplate, document_enhanced_tags
)
from models.document import Document
from models.user import User
from core.database import get_db
from schemas.tag_schemas import (
    TagCreate, TagUpdate, TagResponse, TagHierarchyResponse,
    TagAnalyticsResponse, TagSuggestionResponse, AutoTagRuleCreate,
    AutoTagRuleUpdate, AutoTagRuleResponse, TagTemplateCreate,
    TagTemplateUpdate, TagTemplateResponse, BulkTagOperation,
    BulkTagOperationResponse, TagSearchRequest, TagSearchResponse,
    TagStatistics, DocumentTagRequest, DocumentTagResponse
)


class TagService:
    """Enhanced tag management service"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # Basic Tag Operations
    
    def create_tag(self, tag_data: TagCreate, user_id: int) -> TagResponse:
        """Create a new tag"""
        # Check if tag name already exists at the same level
        existing_tag = self.db.query(EnhancedTag).filter(
            and_(
                EnhancedTag.name == tag_data.name,
                EnhancedTag.parent_id == tag_data.parent_id
            )
        ).first()
        
        if existing_tag:
            raise HTTPException(
                status_code=400,
                detail=f"Tag '{tag_data.name}' already exists at this level"
            )
        
        # Validate parent tag if specified
        parent_tag = None
        if tag_data.parent_id:
            parent_tag = self.db.query(EnhancedTag).filter(
                EnhancedTag.id == tag_data.parent_id
            ).first()
            if not parent_tag:
                raise HTTPException(
                    status_code=404,
                    detail="Parent tag not found"
                )
        
        # Create the tag
        tag = EnhancedTag(
            **tag_data.dict(exclude={'parent_id'}),
            parent_id=tag_data.parent_id,
            created_by=user_id,
            level=parent_tag.level + 1 if parent_tag else 0
        )
        
        # Update path
        tag.update_path()
        
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        
        return self._tag_to_response(tag)
    
    def get_tag(self, tag_id: int) -> Optional[TagResponse]:
        """Get a tag by ID"""
        tag = self.db.query(EnhancedTag).filter(
            EnhancedTag.id == tag_id
        ).first()
        
        if not tag:
            return None
        
        return self._tag_to_response(tag)
    
    def update_tag(self, tag_id: int, tag_data: TagUpdate, user_id: int) -> TagResponse:
        """Update a tag"""
        tag = self.db.query(EnhancedTag).filter(
            EnhancedTag.id == tag_id
        ).first()
        
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        # Check permissions (only creator or admin can update)
        if tag.created_by != user_id:
            # TODO: Add admin role check
            pass
        
        # Update fields
        update_data = tag_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'parent_id' and value != tag.parent_id:
                # Handle parent change
                self._update_tag_hierarchy(tag, value)
            else:
                setattr(tag, field, value)
        
        # Update path if name or parent changed
        if 'name' in update_data or 'parent_id' in update_data:
            tag.update_path()
            self._update_descendant_paths(tag)
        
        self.db.commit()
        self.db.refresh(tag)
        
        return self._tag_to_response(tag)
    
    def delete_tag(self, tag_id: int, user_id: int) -> bool:
        """Delete a tag"""
        tag = self.db.query(EnhancedTag).filter(
            EnhancedTag.id == tag_id
        ).first()
        
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        # Check if tag has children
        if tag.children:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete tag with children. Delete children first or move them to another parent."
            )
        
        # Check if tag is used by documents
        document_count = self.db.query(func.count(document_enhanced_tags.c.document_id)).filter(
            document_enhanced_tags.c.tag_id == tag_id
        ).scalar()
        
        if document_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete tag that is used by {document_count} documents"
            )
        
        self.db.delete(tag)
        self.db.commit()
        
        return True
    
    # Tag Hierarchy Operations
    
    def get_tag_hierarchy(self, parent_id: Optional[int] = None) -> List[TagHierarchyResponse]:
        """Get tag hierarchy starting from parent_id (or root if None)"""
        query = self.db.query(EnhancedTag).filter(
            EnhancedTag.parent_id == parent_id,
            EnhancedTag.is_active == True
        ).order_by(EnhancedTag.name)
        
        tags = query.all()
        result = []
        
        for tag in tags:
            tag_response = TagHierarchyResponse(
                id=tag.id,
                name=tag.name,
                display_name=tag.display_name,
                color=tag.color,
                icon=tag.icon,
                level=tag.level,
                path=tag.path or tag.name,
                usage_count=tag.usage_count,
                children=self.get_tag_hierarchy(tag.id)
            )
            result.append(tag_response)
        
        return result
    
    def move_tag(self, tag_id: int, new_parent_id: Optional[int], user_id: int) -> TagResponse:
        """Move a tag to a new parent"""
        tag = self.db.query(EnhancedTag).filter(
            EnhancedTag.id == tag_id
        ).first()
        
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        # Validate new parent
        if new_parent_id:
            new_parent = self.db.query(EnhancedTag).filter(
                EnhancedTag.id == new_parent_id
            ).first()
            if not new_parent:
                raise HTTPException(status_code=404, detail="New parent tag not found")
            
            # Check for circular reference
            if self._would_create_cycle(tag_id, new_parent_id):
                raise HTTPException(
                    status_code=400,
                    detail="Cannot move tag: would create circular reference"
                )
        
        # Update hierarchy
        self._update_tag_hierarchy(tag, new_parent_id)
        
        self.db.commit()
        self.db.refresh(tag)
        
        return self._tag_to_response(tag)
    
    # Tag Search and Discovery
    
    def search_tags(self, search_request: TagSearchRequest) -> TagSearchResponse:
        """Search tags with filters and pagination"""
        query = self.db.query(EnhancedTag)
        
        # Apply filters
        if search_request.query:
            query = query.filter(
                or_(
                    EnhancedTag.name.ilike(f"%{search_request.query}%"),
                    EnhancedTag.display_name.ilike(f"%{search_request.query}%"),
                    EnhancedTag.description.ilike(f"%{search_request.query}%")
                )
            )
        
        if search_request.category:
            query = query.filter(EnhancedTag.category == search_request.category)
        
        if search_request.tag_type:
            query = query.filter(EnhancedTag.tag_type == search_request.tag_type)
        
        if search_request.parent_id is not None:
            query = query.filter(EnhancedTag.parent_id == search_request.parent_id)
        
        if search_request.is_active is not None:
            query = query.filter(EnhancedTag.is_active == search_request.is_active)
        
        if search_request.is_public is not None:
            query = query.filter(EnhancedTag.is_public == search_request.is_public)
        
        if search_request.min_usage_count is not None:
            query = query.filter(EnhancedTag.usage_count >= search_request.min_usage_count)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        sort_column = getattr(EnhancedTag, search_request.sort_by)
        if search_request.sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        tags = query.offset(search_request.offset).limit(search_request.limit).all()
        
        return TagSearchResponse(
            tags=[self._tag_to_response(tag) for tag in tags],
            total=total,
            limit=search_request.limit,
            offset=search_request.offset
        )
    
    def get_popular_tags(self, limit: int = 20) -> List[TagResponse]:
        """Get most popular tags by usage count"""
        tags = self.db.query(EnhancedTag).filter(
            EnhancedTag.is_active == True,
            EnhancedTag.usage_count > 0
        ).order_by(desc(EnhancedTag.usage_count)).limit(limit).all()
        
        return [self._tag_to_response(tag) for tag in tags]
    
    def get_recent_tags(self, limit: int = 20) -> List[TagResponse]:
        """Get recently created tags"""
        tags = self.db.query(EnhancedTag).filter(
            EnhancedTag.is_active == True
        ).order_by(desc(EnhancedTag.created_at)).limit(limit).all()
        
        return [self._tag_to_response(tag) for tag in tags]
    
    def suggest_tags(self, query: str, limit: int = 10) -> List[TagResponse]:
        """Suggest tags based on query"""
        tags = self.db.query(EnhancedTag).filter(
            and_(
                EnhancedTag.is_active == True,
                EnhancedTag.is_public == True,
                or_(
                    EnhancedTag.name.ilike(f"%{query}%"),
                    EnhancedTag.display_name.ilike(f"%{query}%")
                )
            )
        ).order_by(desc(EnhancedTag.usage_count)).limit(limit).all()
        
        return [self._tag_to_response(tag) for tag in tags]
    
    # Document Tagging Operations
    
    def tag_document(self, document_id: int, tag_request: DocumentTagRequest, user_id: int) -> List[DocumentTagResponse]:
        """Tag a document with specified tags"""
        # Verify document exists
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Verify all tags exist
        tags = self.db.query(EnhancedTag).filter(
            EnhancedTag.id.in_(tag_request.tag_ids)
        ).all()
        
        if len(tags) != len(tag_request.tag_ids):
            found_ids = [tag.id for tag in tags]
            missing_ids = [tid for tid in tag_request.tag_ids if tid not in found_ids]
            raise HTTPException(
                status_code=404,
                detail=f"Tags not found: {missing_ids}"
            )
        
        results = []
        
        for tag in tags:
            # Check if already tagged
            existing = self.db.execute(
                text("SELECT 1 FROM document_enhanced_tags WHERE document_id = :doc_id AND tag_id = :tag_id"),
                {"doc_id": document_id, "tag_id": tag.id}
            ).first()
            
            if not existing:
                # Add tag to document
                self.db.execute(
                    text("""
                        INSERT INTO document_enhanced_tags 
                        (document_id, tag_id, confidence, applied_by, applied_at)
                        VALUES (:doc_id, :tag_id, :confidence, :applied_by, :applied_at)
                    """),
                    {
                        "doc_id": document_id,
                        "tag_id": tag.id,
                        "confidence": tag_request.confidence,
                        "applied_by": tag_request.applied_by,
                        "applied_at": datetime.utcnow()
                    }
                )
                
                # Update tag usage statistics
                tag.increment_usage()
                tag.document_count += 1
                
                results.append(DocumentTagResponse(
                    document_id=document_id,
                    tag_id=tag.id,
                    tag_name=tag.name,
                    tag_color=tag.color,
                    confidence=tag_request.confidence,
                    applied_by=tag_request.applied_by,
                    applied_at=datetime.utcnow()
                ))
        
        self.db.commit()
        return results
    
    def untag_document(self, document_id: int, tag_ids: List[int], user_id: int) -> bool:
        """Remove tags from a document"""
        # Remove tags from document
        deleted_count = self.db.execute(
            text("""
                DELETE FROM document_enhanced_tags 
                WHERE document_id = :doc_id AND tag_id = ANY(:tag_ids)
            """),
            {"doc_id": document_id, "tag_ids": tag_ids}
        ).rowcount
        
        # Update tag usage statistics
        for tag_id in tag_ids:
            tag = self.db.query(EnhancedTag).filter(EnhancedTag.id == tag_id).first()
            if tag and tag.document_count > 0:
                tag.document_count -= 1
        
        self.db.commit()
        return deleted_count > 0
    
    def get_document_tags(self, document_id: int) -> List[DocumentTagResponse]:
        """Get all tags for a document"""
        results = self.db.execute(
            text("""
                SELECT det.document_id, det.tag_id, et.name, et.color, 
                       det.confidence, det.applied_by, det.applied_at
                FROM document_enhanced_tags det
                JOIN enhanced_tags et ON det.tag_id = et.id
                WHERE det.document_id = :doc_id
                ORDER BY et.name
            """),
            {"doc_id": document_id}
        ).fetchall()
        
        return [
            DocumentTagResponse(
                document_id=row.document_id,
                tag_id=row.tag_id,
                tag_name=row.name,
                tag_color=row.color,
                confidence=row.confidence,
                applied_by=row.applied_by,
                applied_at=row.applied_at
            )
            for row in results
        ]
    
    # Bulk Operations
    
    def bulk_tag_operation(self, operation: BulkTagOperation, user_id: int) -> BulkTagOperationResponse:
        """Perform bulk tag operations on multiple documents"""
        processed = 0
        successful = 0
        errors = []
        
        for document_id in operation.document_ids:
            try:
                if operation.operation == "add":
                    tag_request = DocumentTagRequest(
                        tag_ids=operation.tag_ids,
                        confidence=operation.confidence,
                        applied_by=operation.applied_by
                    )
                    self.tag_document(document_id, tag_request, user_id)
                
                elif operation.operation == "remove":
                    self.untag_document(document_id, operation.tag_ids, user_id)
                
                elif operation.operation == "replace":
                    # Remove all existing tags first
                    existing_tags = self.get_document_tags(document_id)
                    if existing_tags:
                        existing_tag_ids = [tag.tag_id for tag in existing_tags]
                        self.untag_document(document_id, existing_tag_ids, user_id)
                    
                    # Add new tags
                    tag_request = DocumentTagRequest(
                        tag_ids=operation.tag_ids,
                        confidence=operation.confidence,
                        applied_by=operation.applied_by
                    )
                    self.tag_document(document_id, tag_request, user_id)
                
                successful += 1
                
            except Exception as e:
                errors.append(f"Document {document_id}: {str(e)}")
            
            processed += 1
        
        return BulkTagOperationResponse(
            operation=operation.operation,
            processed_documents=processed,
            successful_operations=successful,
            failed_operations=processed - successful,
            errors=errors
        )
    
    # Analytics and Statistics
    
    def get_tag_statistics(self) -> TagStatistics:
        """Get comprehensive tag statistics"""
        # Basic counts
        total_tags = self.db.query(func.count(EnhancedTag.id)).scalar()
        active_tags = self.db.query(func.count(EnhancedTag.id)).filter(
            EnhancedTag.is_active == True
        ).scalar()
        system_tags = self.db.query(func.count(EnhancedTag.id)).filter(
            EnhancedTag.is_system == True
        ).scalar()
        user_tags = self.db.query(func.count(EnhancedTag.id)).filter(
            EnhancedTag.is_system == False
        ).scalar()
        auto_tags = self.db.query(func.count(EnhancedTag.id)).filter(
            EnhancedTag.tag_type == 'auto'
        ).scalar()
        
        # Category distribution
        category_counts = self.db.query(
            EnhancedTag.category,
            func.count(EnhancedTag.id)
        ).group_by(EnhancedTag.category).all()
        
        categories = {category: count for category, count in category_counts}
        
        # Most used tags
        most_used = self.get_popular_tags(10)
        
        # Recent tags
        recent = self.get_recent_tags(10)
        
        return TagStatistics(
            total_tags=total_tags,
            active_tags=active_tags,
            system_tags=system_tags,
            user_tags=user_tags,
            auto_tags=auto_tags,
            categories=categories,
            most_used_tags=most_used,
            recent_tags=recent
        )
    
    # Helper Methods
    
    def _tag_to_response(self, tag: EnhancedTag) -> TagResponse:
        """Convert tag model to response schema"""
        return TagResponse(
            id=tag.id,
            name=tag.name,
            display_name=tag.display_name,
            description=tag.description,
            color=tag.color,
            icon=tag.icon,
            tag_type=tag.tag_type,
            category=tag.category,
            parent_id=tag.parent_id,
            level=tag.level,
            path=tag.path,
            is_active=tag.is_active,
            is_public=tag.is_public,
            is_auto_taggable=tag.is_auto_taggable,
            auto_tag_keywords=tag.auto_tag_keywords,
            auto_tag_patterns=tag.auto_tag_patterns,
            confidence_threshold=tag.confidence_threshold,
            metadata=tag.metadata,
            usage_count=tag.usage_count,
            document_count=tag.document_count,
            last_used=tag.last_used,
            created_at=tag.created_at,
            updated_at=tag.updated_at,
            created_by=tag.created_by,
            is_leaf=tag.is_leaf,
            is_root=tag.is_root,
            full_path=tag.full_path
        )
    
    def _update_tag_hierarchy(self, tag: EnhancedTag, new_parent_id: Optional[int]):
        """Update tag hierarchy when parent changes"""
        if new_parent_id:
            new_parent = self.db.query(EnhancedTag).filter(
                EnhancedTag.id == new_parent_id
            ).first()
            tag.parent_id = new_parent_id
            tag.level = new_parent.level + 1
        else:
            tag.parent_id = None
            tag.level = 0
        
        tag.update_path()
        self._update_descendant_paths(tag)
    
    def _update_descendant_paths(self, tag: EnhancedTag):
        """Update paths for all descendant tags"""
        for child in tag.children:
            child.update_path()
            self._update_descendant_paths(child)
    
    def _would_create_cycle(self, tag_id: int, new_parent_id: int) -> bool:
        """Check if moving a tag would create a circular reference"""
        current_id = new_parent_id
        
        while current_id:
            if current_id == tag_id:
                return True
            
            parent = self.db.query(EnhancedTag).filter(
                EnhancedTag.id == current_id
            ).first()
            
            current_id = parent.parent_id if parent else None
        
        return False


def get_tag_service(db: Session = Depends(get_db)) -> TagService:
    """Get tag service instance"""
    return TagService(db)