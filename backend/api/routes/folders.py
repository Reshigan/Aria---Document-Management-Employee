"""
Folder Management API Routes - Async Version
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, select, update, delete
from sqlalchemy.orm import selectinload

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import User, Folder, Document, FolderPermission
from schemas.advanced import (
    FolderResponse, FolderCreate, FolderUpdate, FolderTree,
    FolderListResponse, FolderTreeResponse, FolderPermissionResponse
)
from services.auth_service import auth_service

router = APIRouter(prefix="/folders", tags=["folders"])


async def check_folder_permission(db: AsyncSession, user: User, folder_id: int, permission: str) -> bool:
    """Check if user has specific permission on folder"""
    if user.is_superuser:
        return True
    
    # Get folder
    folder_result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = folder_result.scalar_one_or_none()
    if not folder:
        return False
    
    # Check if user is owner
    if folder.created_by == user.id:
        return True
    
    # Check explicit permissions
    permission_result = await db.execute(
        select(FolderPermission).where(
            and_(
                FolderPermission.folder_id == folder_id,
                FolderPermission.user_id == user.id,
                getattr(FolderPermission, f"can_{permission}") == True
            )
        )
    )
    folder_permission = permission_result.scalar_one_or_none()
    
    return folder_permission is not None


@router.get("/", response_model=FolderListResponse)
async def list_folders(
    parent_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List folders with filtering and pagination"""
    # Build base query
    query = select(Folder)
    
    # Filter by parent folder
    if parent_id is not None:
        query = query.where(Folder.parent_id == parent_id)
    else:
        query = query.where(Folder.parent_id.is_(None))
    
    # Apply search filter
    if search:
        query = query.where(Folder.name.ilike(f"%{search}%"))
    
    # Filter by permissions (non-superusers only see folders they have access to)
    if not current_user.is_superuser:
        accessible_folder_ids_query = select(FolderPermission.folder_id).where(
            and_(
                FolderPermission.user_id == current_user.id,
                FolderPermission.can_read == True
            )
        )
        accessible_folder_ids_result = await db.execute(accessible_folder_ids_query)
        accessible_folder_ids = [row[0] for row in accessible_folder_ids_result.fetchall()]
        
        query = query.where(
            or_(
                Folder.created_by == current_user.id,
                Folder.id.in_(accessible_folder_ids) if accessible_folder_ids else False
            )
        )
    
    # Get total count
    count_query = select(Folder.id).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = len(count_result.fetchall())
    
    # Apply pagination and ordering
    query = query.order_by(Folder.name).offset((page - 1) * page_size).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    folders = result.scalars().all()
    
    return FolderListResponse(
        folders=[FolderResponse.from_orm(folder) for folder in folders],
        total=total,
        page=page,
        per_page=page_size
    )


@router.post("/", response_model=FolderResponse)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new folder"""
    # Check parent folder permissions if specified
    if folder_data.parent_id:
        if not await check_folder_permission(db, current_user, folder_data.parent_id, "write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to create folders in parent directory"
            )
    
    # Check if folder name already exists in parent
    existing_folder_result = await db.execute(
        select(Folder).where(
            and_(
                Folder.name == folder_data.name,
                Folder.parent_id == folder_data.parent_id
            )
        )
    )
    existing_folder = existing_folder_result.scalar_one_or_none()
    
    if existing_folder:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder with this name already exists in parent directory"
        )
    
    # Build folder path
    folder_path = folder_data.name
    if folder_data.parent_id:
        parent_result = await db.execute(select(Folder).where(Folder.id == folder_data.parent_id))
        parent_folder = parent_result.scalar_one_or_none()
        if parent_folder:
            folder_path = f"{parent_folder.path}/{folder_data.name}"
    
    # Create folder
    new_folder = Folder(
        name=folder_data.name,
        description=folder_data.description,
        parent_id=folder_data.parent_id,
        path=folder_path,
        created_by=current_user.id,
        color=folder_data.color,
        is_public=folder_data.is_public
    )
    
    db.add(new_folder)
    await db.commit()
    await db.refresh(new_folder)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "folder_created", "folder", new_folder.id,
        f"Created folder: {new_folder.name}"
    )
    
    return FolderResponse.from_orm(new_folder)


@router.get("/tree", response_model=FolderTreeResponse)
async def get_folder_tree(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get hierarchical folder tree"""
    async def build_tree(parent_id: Optional[int] = None) -> List[FolderTree]:
        query = select(Folder).where(Folder.parent_id == parent_id)
        
        # Filter by permissions for non-superusers
        if not current_user.is_superuser:
            accessible_folder_ids_query = select(FolderPermission.folder_id).where(
                and_(
                    FolderPermission.user_id == current_user.id,
                    FolderPermission.can_read == True
                )
            )
            accessible_folder_ids_result = await db.execute(accessible_folder_ids_query)
            accessible_folder_ids = [row[0] for row in accessible_folder_ids_result.fetchall()]
            
            query = query.where(
                or_(
                    Folder.created_by == current_user.id,
                    Folder.id.in_(accessible_folder_ids) if accessible_folder_ids else False
                )
            )
        
        query = query.order_by(Folder.name)
        result = await db.execute(query)
        folders = result.scalars().all()
        
        tree = []
        for folder in folders:
            children = await build_tree(folder.id)
            tree.append(FolderTree(
                id=folder.id,
                name=folder.name,
                description=folder.description,
                parent_id=folder.parent_id,
                color=folder.color,
                path=folder.path,
                is_system=folder.is_system,
                created_at=folder.created_at,
                updated_at=folder.updated_at,
                created_by=folder.created_by,
                children_count=len(children),
                documents_count=0,  # TODO: Calculate actual count
                children=children
            ))
        
        return tree
    
    tree_data = await build_tree()
    return FolderTreeResponse(tree=tree_data)


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get folder details"""
    if not await check_folder_permission(db, current_user, folder_id, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to access this folder"
        )
    
    result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    return FolderResponse.from_orm(folder)


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    folder_data: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update folder"""
    if not await check_folder_permission(db, current_user, folder_id, "write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to modify this folder"
        )
    
    result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Check for name conflicts if name is being changed
    if folder_data.name and folder_data.name != folder.name:
        existing_folder_result = await db.execute(
            select(Folder).where(
                and_(
                    Folder.name == folder_data.name,
                    Folder.parent_id == folder.parent_id,
                    Folder.id != folder_id
                )
            )
        )
        existing_folder = existing_folder_result.scalar_one_or_none()
        
        if existing_folder:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Folder with this name already exists in parent directory"
            )
    
    # Update fields
    update_data = folder_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(folder, field):
            setattr(folder, field, value)
    
    # Update path if name changed
    if folder_data.name and folder_data.name != folder.name:
        if folder.parent_id:
            parent_result = await db.execute(select(Folder).where(Folder.id == folder.parent_id))
            parent_folder = parent_result.scalar_one_or_none()
            if parent_folder:
                folder.path = f"{parent_folder.path}/{folder_data.name}"
        else:
            folder.path = folder_data.name
    
    await db.commit()
    await db.refresh(folder)
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "folder_updated", "folder", folder.id,
        f"Updated folder: {folder.name}"
    )
    
    return FolderResponse.from_orm(folder)


@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: int,
    force: bool = Query(False, description="Force delete even if folder contains items"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete folder"""
    if not await check_folder_permission(db, current_user, folder_id, "delete"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete this folder"
        )
    
    folder = (await db.execute(select(Folder).where(Folder.id == folder_id))).scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Check if folder has children
    child_folders = len((await db.execute(select(Folder).where(Folder.parent_id == folder_id))).fetchall())
    child_documents = len((await db.execute(select(Document).where(Document.folder_id == folder_id))).fetchall())
    
    if (child_folders > 0 or child_documents > 0) and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Folder contains {child_folders} subfolders and {child_documents} documents. Use force=true to delete anyway."
        )
    
    # Delete folder and all contents if force is true
    if force:
        # Move child folders to parent or root
        await db.execute(update(Folder).where(Folder.parent_id == folder_id).values(
            {"parent_id": folder.parent_id}
        ))
        
        # Move documents to parent folder or unassign
        await db.execute(update(Document).where(Document.folder_id == folder_id).values(
            {"folder_id": folder.parent_id}
        ))
    
    # Delete permissions
    await db.execute(delete(FolderPermission).where(FolderPermission.folder_id == folder_id))
    
    # Delete folder
    await db.delete(folder)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "folder_deleted", "folder", folder_id,
        f"Deleted folder: {folder.name}"
    )
    
    return {"message": "Folder deleted successfully"}


@router.post("/{folder_id}/move")
async def move_folder(
    folder_id: int,
    new_parent_id: Optional[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Move folder to different parent"""
    if not await check_folder_permission(db, current_user, folder_id, "write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to move this folder"
        )
    
    # Check permission on new parent
    if new_parent_id and not await check_folder_permission(db, current_user, new_parent_id, "write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to move folder to target location"
        )
    
    folder = (await db.execute(select(Folder).where(Folder.id == folder_id))).scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Prevent moving folder into itself or its descendants
    if new_parent_id:
        current_parent = new_parent_id
        while current_parent:
            if current_parent == folder_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot move folder into itself or its descendants"
                )
            parent_folder = (await db.execute(select(Folder).where(Folder.id == current_parent))).scalar_one_or_none()
            current_parent = parent_folder.parent_id if parent_folder else None
    
    # Check for name conflicts in new location
    existing_folder_result = await db.execute(
        select(Folder).where(
            and_(
                Folder.name == folder.name,
                Folder.parent_id == new_parent_id,
                Folder.id != folder_id
            )
        )
    )
    existing_folder = existing_folder_result.scalar_one_or_none()
    
    if existing_folder:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder with this name already exists in target location"
        )
    
    old_parent_id = folder.parent_id
    folder.parent_id = new_parent_id
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "folder_moved", "folder", folder.id,
        f"Moved folder '{folder.name}' from {old_parent_id} to {new_parent_id}"
    )
    
    return {"message": "Folder moved successfully"}


@router.get("/{folder_id}/permissions", response_model=List[FolderPermissionResponse])
async def get_folder_permissions(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get folder permissions"""
    if not await check_folder_permission(db, current_user, folder_id, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view folder permissions"
        )
    
    permissions = (await db.execute(select(FolderPermission).where(
        FolderPermission.folder_id == folder_id
    ))).scalars().all()
    
    return [FolderPermissionResponse.from_orm(perm) for perm in permissions]


@router.post("/{folder_id}/permissions")
async def set_folder_permission(
    folder_id: int,
    user_id: int,
    can_read: bool = True,
    can_write: bool = False,
    can_delete: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Set folder permissions for a user"""
    # Only folder owner or admin can set permissions
    folder = (await db.execute(select(Folder).where(Folder.id == folder_id))).scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    if not current_user.is_superuser and folder.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only folder owner can set permissions"
        )
    
    # Check if user exists
    target_user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update or create permission
    permission_result = await db.execute(
        select(FolderPermission).where(
            and_(
                FolderPermission.folder_id == folder_id,
                FolderPermission.user_id == user_id
            )
        )
    )
    permission = permission_result.scalar_one_or_none()
    
    if permission:
        permission.can_read = can_read
        permission.can_write = can_write
        permission.can_delete = can_delete
    else:
        permission = FolderPermission(
            folder_id=folder_id,
            user_id=user_id,
            can_read=can_read,
            can_write=can_write,
            can_delete=can_delete,
            granted_by=current_user.id
        )
        db.add(permission)
    
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "folder_permission_set", "folder", folder_id,
        f"Set permissions for user {target_user.username} on folder {folder.name}"
    )
    
    return {"message": "Folder permissions updated successfully"}


@router.delete("/{folder_id}/permissions/{user_id}")
async def remove_folder_permission(
    folder_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove folder permissions for a user"""
    # Only folder owner or admin can remove permissions
    folder = (await db.execute(select(Folder).where(Folder.id == folder_id))).scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    if not current_user.is_superuser and folder.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only folder owner can remove permissions"
        )
    
    permission_result = await db.execute(
        select(FolderPermission).where(
            and_(
                FolderPermission.folder_id == folder_id,
                FolderPermission.user_id == user_id
            )
        )
    )
    permission = permission_result.scalar_one_or_none()
    
    if permission:
        await db.delete(permission)
        await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "folder_permission_removed", "folder", folder_id,
        f"Removed permissions for user {user_id} on folder {folder.name}"
    )
    
    return {"message": "Permissions removed successfully"}


@router.post("/bulk-operations")
async def bulk_folder_operations(
    operation: str,
    folder_ids: List[int],
    target_folder_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Perform bulk operations on folders"""
    if operation not in ["move", "delete", "copy"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid operation. Supported: move, delete, copy"
        )
    
    results = []
    errors = []
    
    for folder_id in folder_ids:
        try:
            # Check permissions
            if not await check_folder_permission(db, current_user, folder_id, "write"):
                errors.append(f"No permission for folder {folder_id}")
                continue
            
            folder_result = await db.execute(select(Folder).where(Folder.id == folder_id))
            folder = folder_result.scalar_one_or_none()
            if not folder:
                errors.append(f"Folder {folder_id} not found")
                continue
            
            if operation == "delete":
                # Check if folder has children or documents
                children_result = await db.execute(select(Folder).where(Folder.parent_id == folder_id))
                children = children_result.scalars().all()
                
                docs_result = await db.execute(select(Document).where(Document.folder_id == folder_id))
                documents = docs_result.scalars().all()
                
                if children or documents:
                    errors.append(f"Folder {folder_id} is not empty")
                    continue
                
                await db.delete(folder)
                results.append(f"Deleted folder {folder.name}")
                
            elif operation == "move":
                if not target_folder_id:
                    errors.append("Target folder required for move operation")
                    continue
                
                # Check target folder permissions
                if not await check_folder_permission(db, current_user, target_folder_id, "write"):
                    errors.append(f"No permission for target folder {target_folder_id}")
                    continue
                
                # Update folder parent
                folder.parent_id = target_folder_id
                
                # Update path
                target_result = await db.execute(select(Folder).where(Folder.id == target_folder_id))
                target_folder = target_result.scalar_one_or_none()
                if target_folder:
                    folder.path = f"{target_folder.path}/{folder.name}"
                else:
                    folder.path = folder.name
                
                results.append(f"Moved folder {folder.name}")
                
            elif operation == "copy":
                if not target_folder_id:
                    errors.append("Target folder required for copy operation")
                    continue
                
                # Check target folder permissions
                if not await check_folder_permission(db, current_user, target_folder_id, "write"):
                    errors.append(f"No permission for target folder {target_folder_id}")
                    continue
                
                # Create copy
                target_result = await db.execute(select(Folder).where(Folder.id == target_folder_id))
                target_folder = target_result.scalar_one_or_none()
                
                copy_name = f"{folder.name}_copy"
                copy_path = f"{target_folder.path}/{copy_name}" if target_folder else copy_name
                
                new_folder = Folder(
                    name=copy_name,
                    description=folder.description,
                    parent_id=target_folder_id,
                    path=copy_path,
                    created_by=current_user.id,
                    color=folder.color,
                    is_public=folder.is_public
                )
                
                db.add(new_folder)
                results.append(f"Copied folder {folder.name}")
                
        except Exception as e:
            errors.append(f"Error processing folder {folder_id}: {str(e)}")
    
    await db.commit()
    
    # Log bulk operation
    await auth_service._log_activity_async(
        db, current_user.id, f"bulk_folder_{operation}", "folder", None,
        f"Bulk {operation} operation on {len(folder_ids)} folders"
    )
    
    return {
        "operation": operation,
        "processed": len(results),
        "errors": len(errors),
        "results": results,
        "errors_detail": errors
    }


@router.get("/{folder_id}/statistics")
async def get_folder_statistics(
    folder_id: int,
    include_subfolders: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed folder statistics"""
    if not await check_folder_permission(db, current_user, folder_id, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to access this folder"
        )
    
    folder_result = await db.execute(select(Folder).where(Folder.id == folder_id))
    folder = folder_result.scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    stats = {
        "folder_id": folder_id,
        "folder_name": folder.name,
        "direct_documents": 0,
        "total_documents": 0,
        "direct_subfolders": 0,
        "total_subfolders": 0,
        "total_size": 0,
        "document_types": {},
        "recent_activity": []
    }
    
    # Direct documents count
    direct_docs_result = await db.execute(
        select(Document).where(Document.folder_id == folder_id)
    )
    direct_docs = direct_docs_result.scalars().all()
    stats["direct_documents"] = len(direct_docs)
    
    # Calculate total size and document types
    for doc in direct_docs:
        if doc.file_size:
            stats["total_size"] += doc.file_size
        
        doc_type = doc.document_type or "unknown"
        stats["document_types"][doc_type] = stats["document_types"].get(doc_type, 0) + 1
    
    # Direct subfolders count
    direct_subfolders_result = await db.execute(
        select(Folder).where(Folder.parent_id == folder_id)
    )
    direct_subfolders = direct_subfolders_result.scalars().all()
    stats["direct_subfolders"] = len(direct_subfolders)
    
    if include_subfolders:
        # Recursive function to count all nested items
        async def count_nested(parent_id: int):
            nested_folders_result = await db.execute(
                select(Folder).where(Folder.parent_id == parent_id)
            )
            nested_folders = nested_folders_result.scalars().all()
            
            nested_docs_result = await db.execute(
                select(Document).where(Document.folder_id == parent_id)
            )
            nested_docs = nested_docs_result.scalars().all()
            
            folder_count = len(nested_folders)
            doc_count = len(nested_docs)
            size = sum(doc.file_size or 0 for doc in nested_docs)
            
            # Count document types
            for doc in nested_docs:
                doc_type = doc.document_type or "unknown"
                stats["document_types"][doc_type] = stats["document_types"].get(doc_type, 0) + 1
            
            # Recursively count nested items
            for nested_folder in nested_folders:
                nested_counts = await count_nested(nested_folder.id)
                folder_count += nested_counts["folders"]
                doc_count += nested_counts["documents"]
                size += nested_counts["size"]
            
            return {"folders": folder_count, "documents": doc_count, "size": size}
        
        nested_counts = await count_nested(folder_id)
        stats["total_subfolders"] = nested_counts["folders"]
        stats["total_documents"] = stats["direct_documents"] + nested_counts["documents"]
        stats["total_size"] += nested_counts["size"]
    else:
        stats["total_subfolders"] = stats["direct_subfolders"]
        stats["total_documents"] = stats["direct_documents"]
    
    return stats


@router.post("/{folder_id}/duplicate")
async def duplicate_folder(
    folder_id: int,
    target_parent_id: Optional[int] = None,
    new_name: Optional[str] = None,
    include_documents: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Duplicate a folder with all its contents"""
    if not await check_folder_permission(db, current_user, folder_id, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to access source folder"
        )
    
    # Check target parent permissions
    if target_parent_id and not await check_folder_permission(db, current_user, target_parent_id, "write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to create folders in target location"
        )
    
    source_folder_result = await db.execute(select(Folder).where(Folder.id == folder_id))
    source_folder = source_folder_result.scalar_one_or_none()
    if not source_folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source folder not found"
        )
    
    # Generate new name if not provided
    if not new_name:
        new_name = f"{source_folder.name}_copy"
    
    # Build new path
    new_path = new_name
    if target_parent_id:
        target_parent_result = await db.execute(select(Folder).where(Folder.id == target_parent_id))
        target_parent = target_parent_result.scalar_one_or_none()
        if target_parent:
            new_path = f"{target_parent.path}/{new_name}"
    
    # Create duplicate folder
    duplicate_folder = Folder(
        name=new_name,
        description=source_folder.description,
        parent_id=target_parent_id,
        path=new_path,
        created_by=current_user.id,
        color=source_folder.color,
        is_public=source_folder.is_public
    )
    
    db.add(duplicate_folder)
    await db.commit()
    await db.refresh(duplicate_folder)
    
    duplicated_items = {"folders": 1, "documents": 0}
    
    # Recursively duplicate subfolders and documents
    async def duplicate_contents(source_parent_id: int, target_parent_id: int):
        # Duplicate subfolders
        subfolders_result = await db.execute(
            select(Folder).where(Folder.parent_id == source_parent_id)
        )
        subfolders = subfolders_result.scalars().all()
        
        for subfolder in subfolders:
            new_subfolder_path = f"{duplicate_folder.path}/{subfolder.name}"
            new_subfolder = Folder(
                name=subfolder.name,
                description=subfolder.description,
                parent_id=target_parent_id,
                path=new_subfolder_path,
                created_by=current_user.id,
                color=subfolder.color,
                is_public=subfolder.is_public
            )
            
            db.add(new_subfolder)
            await db.commit()
            await db.refresh(new_subfolder)
            
            duplicated_items["folders"] += 1
            
            # Recursively duplicate contents
            await duplicate_contents(subfolder.id, new_subfolder.id)
        
        # Duplicate documents if requested
        if include_documents:
            documents_result = await db.execute(
                select(Document).where(Document.folder_id == source_parent_id)
            )
            documents = documents_result.scalars().all()
            
            for doc in documents:
                # Note: This creates a reference to the same file
                # In a production system, you might want to copy the actual file
                new_doc = Document(
                    filename=f"copy_{doc.filename}",
                    original_filename=f"copy_{doc.original_filename}",
                    file_path=doc.file_path,  # Same file path - consider copying file
                    file_size=doc.file_size,
                    mime_type=doc.mime_type,
                    document_type=doc.document_type,
                    folder_id=target_parent_id,
                    uploaded_by=current_user.id,
                    status="uploaded",
                    ocr_text=doc.ocr_text,
                    extracted_data=doc.extracted_data
                )
                
                db.add(new_doc)
                duplicated_items["documents"] += 1
    
    await duplicate_contents(folder_id, duplicate_folder.id)
    await db.commit()
    
    # Log activity
    await auth_service._log_activity_async(
        db, current_user.id, "folder_duplicated", "folder", duplicate_folder.id,
        f"Duplicated folder {source_folder.name} as {new_name}"
    )
    
    return {
        "message": "Folder duplicated successfully",
        "duplicate_folder": FolderResponse.from_orm(duplicate_folder),
        "duplicated_items": duplicated_items
    }