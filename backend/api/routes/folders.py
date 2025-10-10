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
    
    return {"message": "Folder permissions removed successfully"}