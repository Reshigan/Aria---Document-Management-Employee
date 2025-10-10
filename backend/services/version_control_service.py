import os
import hashlib
import shutil
import difflib
import gzip
import json
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc, func
from fastapi import HTTPException, status

from models.version_control import (
    DocumentVersion, DocumentBranch, DocumentChange, MergeRequest, 
    MergeConflict, VersionComparison, VersionTag,
    VersionStatus, MergeStatus, ConflictType, ChangeType
)
from models.document import Document
from models.user import User
from schemas.version_control import (
    DocumentVersionCreate, DocumentVersionUpdate, DocumentVersionResponse,
    DocumentBranchCreate, DocumentBranchUpdate, DocumentBranchResponse,
    DocumentChangeCreate, DocumentChangeResponse,
    MergeRequestCreate, MergeRequestUpdate, MergeRequestResponse,
    MergeConflictCreate, MergeConflictUpdate, MergeConflictResponse,
    VersionComparisonRequest, VersionComparisonResponse,
    VersionTagCreate, VersionTagUpdate, VersionTagResponse,
    VersionControlStats, BulkVersionOperation, BulkVersionOperationResponse
)

import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VersionControlService:
    def __init__(self, db: Session):
        self.db = db
        self.storage_path = os.getenv("VERSION_STORAGE_PATH", "./storage/versions")
        os.makedirs(self.storage_path, exist_ok=True)

    # Document Version Management
    def create_version(self, version_data: DocumentVersionCreate, user_id: int) -> DocumentVersionResponse:
        """Create a new document version"""
        try:
            # Verify document exists
            document = self.db.query(Document).filter(Document.id == version_data.document_id).first()
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # Check if version number already exists for this document
            existing_version = self.db.query(DocumentVersion).filter(
                and_(
                    DocumentVersion.document_id == version_data.document_id,
                    DocumentVersion.version_number == version_data.version_number,
                    DocumentVersion.branch_name == version_data.branch_name
                )
            ).first()
            
            if existing_version:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Version {version_data.version_number} already exists on branch {version_data.branch_name}"
                )

            # Create version storage directory
            version_dir = os.path.join(self.storage_path, str(version_data.document_id))
            os.makedirs(version_dir, exist_ok=True)

            # Copy file to version storage
            version_filename = f"{version_data.version_number}_{version_data.branch_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            version_file_path = os.path.join(version_dir, version_filename)
            
            if os.path.exists(version_data.file_path):
                shutil.copy2(version_data.file_path, version_file_path)
            else:
                logger.warning(f"Source file not found: {version_data.file_path}")

            # Create version record
            db_version = DocumentVersion(
                document_id=version_data.document_id,
                version_number=version_data.version_number,
                branch_name=version_data.branch_name,
                parent_version_id=version_data.parent_version_id,
                title=version_data.title,
                description=version_data.description,
                status=version_data.status,
                is_published=version_data.is_published,
                file_path=version_file_path,
                file_size=version_data.file_size,
                file_hash=version_data.file_hash,
                mime_type=version_data.mime_type,
                change_summary=version_data.change_summary,
                change_type=version_data.change_type,
                metadata=version_data.metadata,
                tags=version_data.tags,
                created_by=user_id
            )

            self.db.add(db_version)
            self.db.commit()
            self.db.refresh(db_version)

            # Update current version if this is published
            if version_data.is_published:
                self._update_current_version(version_data.document_id, db_version.id)

            # Create initial change record
            if version_data.parent_version_id:
                self._create_change_record(db_version.id, version_data.change_type, user_id)

            logger.info(f"Created version {version_data.version_number} for document {version_data.document_id}")
            return DocumentVersionResponse.from_orm(db_version)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating version: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create version: {str(e)}")

    def get_version(self, version_id: int) -> Optional[DocumentVersionResponse]:
        """Get a specific version"""
        version = self.db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
        if not version:
            return None
        return DocumentVersionResponse.from_orm(version)

    def get_document_versions(
        self, 
        document_id: int, 
        branch_name: Optional[str] = None,
        status: Optional[VersionStatus] = None,
        page: int = 1, 
        page_size: int = 20
    ) -> Tuple[List[DocumentVersionResponse], int]:
        """Get versions for a document"""
        query = self.db.query(DocumentVersion).filter(DocumentVersion.document_id == document_id)
        
        if branch_name:
            query = query.filter(DocumentVersion.branch_name == branch_name)
        if status:
            query = query.filter(DocumentVersion.status == status)

        total = query.count()
        versions = query.order_by(desc(DocumentVersion.created_at)).offset((page - 1) * page_size).limit(page_size).all()
        
        return [DocumentVersionResponse.from_orm(v) for v in versions], total

    def update_version(self, version_id: int, version_data: DocumentVersionUpdate, user_id: int) -> DocumentVersionResponse:
        """Update a version"""
        version = self.db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        # Update fields
        update_data = version_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(version, field, value)

        version.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(version)

        logger.info(f"Updated version {version_id}")
        return DocumentVersionResponse.from_orm(version)

    def delete_version(self, version_id: int, user_id: int) -> bool:
        """Delete a version"""
        version = self.db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        # Check if version is current
        if version.is_current:
            raise HTTPException(status_code=400, detail="Cannot delete current version")

        # Delete file
        if os.path.exists(version.file_path):
            os.remove(version.file_path)

        # Delete version record
        self.db.delete(version)
        self.db.commit()

        logger.info(f"Deleted version {version_id}")
        return True

    # Branch Management
    def create_branch(self, branch_data: DocumentBranchCreate, user_id: int) -> DocumentBranchResponse:
        """Create a new branch"""
        try:
            # Check if branch name already exists for this document
            existing_branch = self.db.query(DocumentBranch).filter(
                and_(
                    DocumentBranch.document_id == branch_data.document_id,
                    DocumentBranch.name == branch_data.name
                )
            ).first()
            
            if existing_branch:
                raise HTTPException(status_code=400, detail=f"Branch '{branch_data.name}' already exists")

            # Create branch
            db_branch = DocumentBranch(
                document_id=branch_data.document_id,
                name=branch_data.name,
                description=branch_data.description,
                is_protected=branch_data.is_protected,
                source_version_id=branch_data.source_version_id,
                metadata=branch_data.metadata,
                created_by=user_id
            )

            self.db.add(db_branch)
            self.db.commit()
            self.db.refresh(db_branch)

            logger.info(f"Created branch '{branch_data.name}' for document {branch_data.document_id}")
            return DocumentBranchResponse.from_orm(db_branch)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating branch: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create branch: {str(e)}")

    def get_document_branches(self, document_id: int) -> List[DocumentBranchResponse]:
        """Get branches for a document"""
        branches = self.db.query(DocumentBranch).filter(
            DocumentBranch.document_id == document_id,
            DocumentBranch.is_active == True
        ).order_by(DocumentBranch.name).all()
        
        return [DocumentBranchResponse.from_orm(b) for b in branches]

    def update_branch(self, branch_id: int, branch_data: DocumentBranchUpdate, user_id: int) -> DocumentBranchResponse:
        """Update a branch"""
        branch = self.db.query(DocumentBranch).filter(DocumentBranch.id == branch_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")

        # Update fields
        update_data = branch_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(branch, field, value)

        branch.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(branch)

        logger.info(f"Updated branch {branch_id}")
        return DocumentBranchResponse.from_orm(branch)

    def delete_branch(self, branch_id: int, user_id: int) -> bool:
        """Delete a branch"""
        branch = self.db.query(DocumentBranch).filter(DocumentBranch.id == branch_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")

        # Check if branch is default
        if branch.is_default:
            raise HTTPException(status_code=400, detail="Cannot delete default branch")

        # Check if branch has versions
        version_count = self.db.query(DocumentVersion).filter(
            DocumentVersion.document_id == branch.document_id,
            DocumentVersion.branch_name == branch.name
        ).count()

        if version_count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete branch with existing versions")

        # Delete branch
        self.db.delete(branch)
        self.db.commit()

        logger.info(f"Deleted branch {branch_id}")
        return True

    # Merge Request Management
    def create_merge_request(self, merge_data: MergeRequestCreate, user_id: int) -> MergeRequestResponse:
        """Create a merge request"""
        try:
            # Verify versions exist
            source_version = self.db.query(DocumentVersion).filter(DocumentVersion.id == merge_data.source_version_id).first()
            target_version = self.db.query(DocumentVersion).filter(DocumentVersion.id == merge_data.target_version_id).first()
            
            if not source_version or not target_version:
                raise HTTPException(status_code=404, detail="Source or target version not found")

            # Check if merge request already exists
            existing_mr = self.db.query(MergeRequest).filter(
                and_(
                    MergeRequest.document_id == merge_data.document_id,
                    MergeRequest.source_version_id == merge_data.source_version_id,
                    MergeRequest.target_version_id == merge_data.target_version_id,
                    MergeRequest.status.in_([MergeStatus.PENDING, MergeStatus.IN_PROGRESS])
                )
            ).first()

            if existing_mr:
                raise HTTPException(status_code=400, detail="Merge request already exists for these versions")

            # Check for conflicts
            has_conflicts, auto_mergeable = self._check_merge_conflicts(source_version, target_version)

            # Create merge request
            db_merge_request = MergeRequest(
                document_id=merge_data.document_id,
                title=merge_data.title,
                description=merge_data.description,
                source_version_id=merge_data.source_version_id,
                target_version_id=merge_data.target_version_id,
                source_branch=merge_data.source_branch,
                target_branch=merge_data.target_branch,
                has_conflicts=has_conflicts,
                auto_mergeable=auto_mergeable,
                merge_strategy=merge_data.merge_strategy,
                assigned_to=merge_data.assigned_to,
                metadata=merge_data.metadata,
                created_by=user_id
            )

            self.db.add(db_merge_request)
            self.db.commit()
            self.db.refresh(db_merge_request)

            # Create conflict records if needed
            if has_conflicts:
                self._create_conflict_records(db_merge_request.id, source_version, target_version)

            logger.info(f"Created merge request {db_merge_request.id}")
            return MergeRequestResponse.from_orm(db_merge_request)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating merge request: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create merge request: {str(e)}")

    def get_merge_requests(
        self, 
        document_id: Optional[int] = None,
        status: Optional[MergeStatus] = None,
        assigned_to: Optional[int] = None,
        page: int = 1, 
        page_size: int = 20
    ) -> Tuple[List[MergeRequestResponse], int]:
        """Get merge requests"""
        query = self.db.query(MergeRequest)
        
        if document_id:
            query = query.filter(MergeRequest.document_id == document_id)
        if status:
            query = query.filter(MergeRequest.status == status)
        if assigned_to:
            query = query.filter(MergeRequest.assigned_to == assigned_to)

        total = query.count()
        merge_requests = query.order_by(desc(MergeRequest.created_at)).offset((page - 1) * page_size).limit(page_size).all()
        
        return [MergeRequestResponse.from_orm(mr) for mr in merge_requests], total

    def update_merge_request(self, merge_request_id: int, merge_data: MergeRequestUpdate, user_id: int) -> MergeRequestResponse:
        """Update a merge request"""
        merge_request = self.db.query(MergeRequest).filter(MergeRequest.id == merge_request_id).first()
        if not merge_request:
            raise HTTPException(status_code=404, detail="Merge request not found")

        # Update fields
        update_data = merge_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(merge_request, field, value)

        merge_request.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(merge_request)

        logger.info(f"Updated merge request {merge_request_id}")
        return MergeRequestResponse.from_orm(merge_request)

    def merge_versions(self, merge_request_id: int, user_id: int) -> DocumentVersionResponse:
        """Execute a merge request"""
        merge_request = self.db.query(MergeRequest).filter(MergeRequest.id == merge_request_id).first()
        if not merge_request:
            raise HTTPException(status_code=404, detail="Merge request not found")

        if merge_request.status != MergeStatus.PENDING:
            raise HTTPException(status_code=400, detail="Merge request is not in pending status")

        if merge_request.has_conflicts and not merge_request.conflicts_resolved:
            raise HTTPException(status_code=400, detail="Merge request has unresolved conflicts")

        try:
            merge_request.status = MergeStatus.IN_PROGRESS
            merge_request.updated_at = datetime.utcnow()
            self.db.commit()

            # Perform the merge
            merged_version = self._perform_merge(merge_request, user_id)

            # Update merge request
            merge_request.status = MergeStatus.COMPLETED
            merge_request.merged_version_id = merged_version.id
            merge_request.merged_by = user_id
            merge_request.merged_at = datetime.utcnow()
            
            self.db.commit()

            logger.info(f"Completed merge request {merge_request_id}")
            return DocumentVersionResponse.from_orm(merged_version)

        except Exception as e:
            merge_request.status = MergeStatus.FAILED
            merge_request.updated_at = datetime.utcnow()
            self.db.commit()
            
            logger.error(f"Error merging versions: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to merge versions: {str(e)}")

    # Version Comparison
    def compare_versions(self, comparison_request: VersionComparisonRequest) -> VersionComparisonResponse:
        """Compare two versions"""
        try:
            # Check if comparison already exists and is not expired
            existing_comparison = self.db.query(VersionComparison).filter(
                and_(
                    VersionComparison.version_a_id == comparison_request.version_a_id,
                    VersionComparison.version_b_id == comparison_request.version_b_id,
                    or_(
                        VersionComparison.expires_at.is_(None),
                        VersionComparison.expires_at > datetime.utcnow()
                    )
                )
            ).first()

            if existing_comparison:
                return VersionComparisonResponse.from_orm(existing_comparison)

            # Get versions
            version_a = self.db.query(DocumentVersion).filter(DocumentVersion.id == comparison_request.version_a_id).first()
            version_b = self.db.query(DocumentVersion).filter(DocumentVersion.id == comparison_request.version_b_id).first()

            if not version_a or not version_b:
                raise HTTPException(status_code=404, detail="One or both versions not found")

            # Perform comparison
            diff_data, differences_count, similarity_score, summary = self._compare_version_files(version_a, version_b)

            # Compress diff data
            compressed_diff = gzip.compress(diff_data.encode('utf-8'))

            # Create comparison record
            db_comparison = VersionComparison(
                document_id=comparison_request.document_id,
                version_a_id=comparison_request.version_a_id,
                version_b_id=comparison_request.version_b_id,
                differences_count=differences_count,
                similarity_score=similarity_score,
                diff_data=compressed_diff,
                summary=summary,
                expires_at=datetime.utcnow() + timedelta(hours=24)  # Cache for 24 hours
            )

            self.db.add(db_comparison)
            self.db.commit()
            self.db.refresh(db_comparison)

            logger.info(f"Created version comparison {db_comparison.id}")
            return VersionComparisonResponse.from_orm(db_comparison)

        except Exception as e:
            logger.error(f"Error comparing versions: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to compare versions: {str(e)}")

    # Version Tags
    def create_version_tag(self, tag_data: VersionTagCreate, user_id: int) -> VersionTagResponse:
        """Create a version tag"""
        try:
            # Check if tag name already exists for this document
            existing_tag = self.db.query(VersionTag).filter(
                and_(
                    VersionTag.document_id == tag_data.document_id,
                    VersionTag.name == tag_data.name
                )
            ).first()
            
            if existing_tag:
                raise HTTPException(status_code=400, detail=f"Tag '{tag_data.name}' already exists")

            # Create tag
            db_tag = VersionTag(
                document_id=tag_data.document_id,
                version_id=tag_data.version_id,
                name=tag_data.name,
                description=tag_data.description,
                tag_type=tag_data.tag_type,
                is_protected=tag_data.is_protected,
                color=tag_data.color,
                metadata=tag_data.metadata,
                created_by=user_id
            )

            self.db.add(db_tag)
            self.db.commit()
            self.db.refresh(db_tag)

            logger.info(f"Created version tag '{tag_data.name}'")
            return VersionTagResponse.from_orm(db_tag)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating version tag: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create version tag: {str(e)}")

    def get_version_tags(self, document_id: int) -> List[VersionTagResponse]:
        """Get tags for a document"""
        tags = self.db.query(VersionTag).filter(VersionTag.document_id == document_id).order_by(VersionTag.name).all()
        return [VersionTagResponse.from_orm(t) for t in tags]

    # Statistics
    def get_version_control_stats(self, document_id: Optional[int] = None) -> VersionControlStats:
        """Get version control statistics"""
        try:
            base_query = self.db.query(DocumentVersion)
            if document_id:
                base_query = base_query.filter(DocumentVersion.document_id == document_id)

            total_versions = base_query.count()
            
            branch_query = self.db.query(DocumentBranch)
            if document_id:
                branch_query = branch_query.filter(DocumentBranch.document_id == document_id)
            total_branches = branch_query.count()

            merge_query = self.db.query(MergeRequest)
            if document_id:
                merge_query = merge_query.filter(MergeRequest.document_id == document_id)
            total_merge_requests = merge_query.count()
            pending_merge_requests = merge_query.filter(MergeRequest.status == MergeStatus.PENDING).count()

            conflict_query = self.db.query(MergeConflict)
            if document_id:
                conflict_query = conflict_query.join(MergeRequest).filter(MergeRequest.document_id == document_id)
            total_conflicts = conflict_query.count()
            unresolved_conflicts = conflict_query.filter(MergeConflict.is_resolved == False).count()

            tag_query = self.db.query(VersionTag)
            if document_id:
                tag_query = tag_query.filter(VersionTag.document_id == document_id)
            total_tags = tag_query.count()

            # Recent activity
            recent_activity = []
            recent_versions = base_query.order_by(desc(DocumentVersion.created_at)).limit(10).all()
            for version in recent_versions:
                recent_activity.append({
                    'type': 'version_created',
                    'version_id': version.id,
                    'version_number': version.version_number,
                    'created_at': version.created_at.isoformat(),
                    'created_by': version.created_by
                })

            return VersionControlStats(
                total_versions=total_versions,
                total_branches=total_branches,
                total_merge_requests=total_merge_requests,
                pending_merge_requests=pending_merge_requests,
                total_conflicts=total_conflicts,
                unresolved_conflicts=unresolved_conflicts,
                total_tags=total_tags,
                recent_activity=recent_activity
            )

        except Exception as e:
            logger.error(f"Error getting version control stats: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

    # Helper methods
    def _update_current_version(self, document_id: int, version_id: int):
        """Update the current version for a document"""
        # Clear current flag from all versions
        self.db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).update({DocumentVersion.is_current: False})
        
        # Set current flag for new version
        self.db.query(DocumentVersion).filter(
            DocumentVersion.id == version_id
        ).update({DocumentVersion.is_current: True})

    def _create_change_record(self, version_id: int, change_type: ChangeType, user_id: int):
        """Create a change record for a version"""
        change = DocumentChange(
            version_id=version_id,
            change_type=change_type,
            description=f"Version created with change type: {change_type}",
            created_by=user_id
        )
        self.db.add(change)

    def _check_merge_conflicts(self, source_version: DocumentVersion, target_version: DocumentVersion) -> Tuple[bool, bool]:
        """Check for merge conflicts between two versions"""
        try:
            # Simple conflict detection based on file modification times and content
            has_conflicts = False
            auto_mergeable = True

            # Check if files exist
            if not os.path.exists(source_version.file_path) or not os.path.exists(target_version.file_path):
                return True, False

            # Compare file hashes
            if source_version.file_hash != target_version.file_hash:
                # Files are different, check for conflicts
                has_conflicts = True
                auto_mergeable = False  # For now, assume manual merge needed

            return has_conflicts, auto_mergeable

        except Exception as e:
            logger.error(f"Error checking merge conflicts: {str(e)}")
            return True, False

    def _create_conflict_records(self, merge_request_id: int, source_version: DocumentVersion, target_version: DocumentVersion):
        """Create conflict records for a merge request"""
        try:
            # Create a generic conflict record
            conflict = MergeConflict(
                merge_request_id=merge_request_id,
                conflict_type=ConflictType.CONTENT,
                section="File content",
                source_value=f"Source version: {source_version.version_number}",
                target_value=f"Target version: {target_version.version_number}"
            )
            self.db.add(conflict)

        except Exception as e:
            logger.error(f"Error creating conflict records: {str(e)}")

    def _perform_merge(self, merge_request: MergeRequest, user_id: int) -> DocumentVersion:
        """Perform the actual merge operation"""
        try:
            source_version = self.db.query(DocumentVersion).filter(DocumentVersion.id == merge_request.source_version_id).first()
            target_version = self.db.query(DocumentVersion).filter(DocumentVersion.id == merge_request.target_version_id).first()

            # Create new merged version
            new_version_number = self._generate_merge_version_number(source_version, target_version)
            
            # Copy target file as base for merge
            merge_dir = os.path.join(self.storage_path, str(merge_request.document_id))
            merge_filename = f"{new_version_number}_merged_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            merge_file_path = os.path.join(merge_dir, merge_filename)
            
            shutil.copy2(target_version.file_path, merge_file_path)

            # Calculate file hash
            file_hash = self._calculate_file_hash(merge_file_path)
            file_size = os.path.getsize(merge_file_path)

            # Create merged version
            merged_version = DocumentVersion(
                document_id=merge_request.document_id,
                version_number=new_version_number,
                branch_name=merge_request.target_branch,
                parent_version_id=target_version.id,
                title=f"Merged: {source_version.title} into {target_version.title}",
                description=f"Merged version from {merge_request.source_branch} to {merge_request.target_branch}",
                status=VersionStatus.COMMITTED,
                file_path=merge_file_path,
                file_size=file_size,
                file_hash=file_hash,
                mime_type=target_version.mime_type,
                change_summary=f"Merged changes from version {source_version.version_number}",
                change_type=ChangeType.UPDATE,
                created_by=user_id,
                committed_by=user_id,
                committed_at=datetime.utcnow()
            )

            self.db.add(merged_version)
            self.db.commit()
            self.db.refresh(merged_version)

            return merged_version

        except Exception as e:
            logger.error(f"Error performing merge: {str(e)}")
            raise

    def _generate_merge_version_number(self, source_version: DocumentVersion, target_version: DocumentVersion) -> str:
        """Generate a version number for merged version"""
        try:
            # Simple merge version numbering
            target_parts = target_version.version_number.split('.')
            if len(target_parts) >= 2:
                major = int(target_parts[0])
                minor = int(target_parts[1]) + 1
                return f"{major}.{minor}"
            else:
                return f"{target_version.version_number}.1"
        except:
            return f"{target_version.version_number}_merged"

    def _compare_version_files(self, version_a: DocumentVersion, version_b: DocumentVersion) -> Tuple[str, int, int, str]:
        """Compare two version files"""
        try:
            # Read file contents
            content_a = ""
            content_b = ""
            
            if os.path.exists(version_a.file_path):
                with open(version_a.file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content_a = f.read()
            
            if os.path.exists(version_b.file_path):
                with open(version_b.file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content_b = f.read()

            # Generate diff
            diff = list(difflib.unified_diff(
                content_a.splitlines(keepends=True),
                content_b.splitlines(keepends=True),
                fromfile=f"Version {version_a.version_number}",
                tofile=f"Version {version_b.version_number}",
                lineterm=''
            ))

            diff_text = ''.join(diff)
            differences_count = len([line for line in diff if line.startswith('+') or line.startswith('-')])
            
            # Calculate similarity score
            similarity_score = self._calculate_similarity_score(content_a, content_b)
            
            # Generate summary
            summary = f"Compared versions {version_a.version_number} and {version_b.version_number}. "
            summary += f"Found {differences_count} differences. Similarity: {similarity_score}%"

            return diff_text, differences_count, similarity_score, summary

        except Exception as e:
            logger.error(f"Error comparing version files: {str(e)}")
            return "", 0, 0, f"Error comparing files: {str(e)}"

    def _calculate_similarity_score(self, content_a: str, content_b: str) -> int:
        """Calculate similarity score between two contents"""
        try:
            if not content_a and not content_b:
                return 100
            if not content_a or not content_b:
                return 0

            # Use difflib to calculate similarity
            similarity = difflib.SequenceMatcher(None, content_a, content_b).ratio()
            return int(similarity * 100)

        except Exception as e:
            logger.error(f"Error calculating similarity score: {str(e)}")
            return 0

    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of a file"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Error calculating file hash: {str(e)}")
            return ""