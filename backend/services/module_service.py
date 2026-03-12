"""
Module Management Service
Handles module assignment, access control, and tracking
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from models.module_models import (
    Module, UserModule, ModuleAccessLog, ModuleLicense,
    ModuleCategory, ModuleStatus
)
from models.user import User
from models.security_models import AuditLog, AuditAction
from schemas.module_schemas import *
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


class ModuleService:
    """Service for managing modules and user module assignments"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== Module Management ====================
    
    def create_module(self, module_data: ModuleCreate, created_by: int) -> Module:
        """Create a new module"""
        try:
            # Check if module name already exists
            existing = self.db.query(Module).filter(Module.name == module_data.name).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Module with name '{module_data.name}' already exists"
                )
            
            # Create module
            module = Module(
                **module_data.model_dump(),
                created_by=created_by
            )
            
            self.db.add(module)
            self.db.commit()
            self.db.refresh(module)
            
            logger.info(f"Module created: {module.name} by user {created_by}")
            return module
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating module: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create module"
            )
    
    def get_module(self, module_id: int) -> Optional[Module]:
        """Get module by ID"""
        module = self.db.query(Module).filter(Module.id == module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found"
            )
        return module
    
    def get_module_by_name(self, name: str) -> Optional[Module]:
        """Get module by name"""
        return self.db.query(Module).filter(Module.name == name).first()
    
    def list_modules(
        self, 
        category: Optional[ModuleCategory] = None,
        status: Optional[ModuleStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """List all modules with optional filters"""
        query = self.db.query(Module)
        
        if category:
            query = query.filter(Module.category == category)
        if status:
            query = query.filter(Module.status == status)
        
        total = query.count()
        modules = query.offset(skip).limit(limit).all()
        
        return {
            "modules": modules,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit
        }
    
    def update_module(self, module_id: int, update_data: ModuleUpdate) -> Module:
        """Update module information"""
        module = self.get_module(module_id)
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(module, key, value)
        
        self.db.commit()
        self.db.refresh(module)
        
        logger.info(f"Module updated: {module.name}")
        return module
    
    def delete_module(self, module_id: int) -> bool:
        """Delete a module (soft delete by setting status to DEPRECATED)"""
        module = self.get_module(module_id)
        
        # Check if module is assigned to any users
        active_assignments = self.db.query(UserModule).filter(
            UserModule.module_id == module_id,
            UserModule.is_active == True
        ).count()
        
        if active_assignments > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete module: {active_assignments} active user assignments exist"
            )
        
        module.status = ModuleStatus.DEPRECATED
        self.db.commit()
        
        logger.info(f"Module deprecated: {module.name}")
        return True
    
    # ==================== User Module Assignment ====================
    
    def assign_module_to_user(
        self, 
        assignment_data: UserModuleAssign,
        assigned_by: int
    ) -> UserModule:
        """Assign a module to a user"""
        try:
            # Validate user exists
            user = self.db.query(User).filter(User.id == assignment_data.user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {assignment_data.user_id} not found"
                )
            
            # Validate module exists and is active
            module = self.get_module(assignment_data.module_id)
            if module.status != ModuleStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Module '{module.name}' is not active"
                )
            
            # Check if assignment already exists
            existing = self.db.query(UserModule).filter(
                UserModule.user_id == assignment_data.user_id,
                UserModule.module_id == assignment_data.module_id
            ).first()
            
            if existing:
                # Reactivate if inactive
                if not existing.is_active:
                    existing.is_active = True
                    existing.activated_at = datetime.utcnow()
                    existing.assigned_by = assigned_by
                    existing.deactivated_at = None
                    existing.deactivated_by = None
                    self.db.commit()
                    self.db.refresh(existing)
                    logger.info(f"Reactivated module {module.name} for user {user.email}")
                    return existing
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"User already has access to module '{module.name}'"
                    )
            
            # Check license limits if required
            if module.requires_license:
                assigned_count = self.db.query(UserModule).filter(
                    UserModule.module_id == module.id,
                    UserModule.is_active == True
                ).count()
                
                if module.max_users and assigned_count >= module.max_users:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Module license limit reached ({module.max_users} users)"
                    )
            
            # Create assignment
            user_module = UserModule(
                user_id=assignment_data.user_id,
                module_id=assignment_data.module_id,
                assigned_by=assigned_by,
                access_level=assignment_data.access_level,
                custom_permissions=assignment_data.custom_permissions,
                approval_limit=assignment_data.approval_limit,
                expires_at=assignment_data.expires_at,
                notes=assignment_data.notes,
                activated_at=datetime.utcnow()
            )
            
            self.db.add(user_module)
            self.db.commit()
            self.db.refresh(user_module)
            
            # Log audit event
            self._log_audit_event(
                user_id=assigned_by,
                action=AuditAction.CREATE,
                resource_type="user_module",
                resource_id=user_module.id,
                description=f"Assigned module '{module.name}' to user '{user.email}'"
            )
            
            logger.info(f"Module {module.name} assigned to user {user.email} by user {assigned_by}")
            return user_module
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error assigning module to user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign module to user"
            )
    
    def bulk_assign_modules(
        self,
        assignment_data: UserModuleAssignBulk,
        assigned_by: int
    ) -> Dict[str, Any]:
        """Assign multiple modules to multiple users"""
        results = {
            "successful": [],
            "failed": [],
            "total": len(assignment_data.user_ids) * len(assignment_data.module_ids)
        }
        
        for user_id in assignment_data.user_ids:
            for module_id in assignment_data.module_ids:
                try:
                    assignment = UserModuleAssign(
                        user_id=user_id,
                        module_id=module_id,
                        access_level=assignment_data.access_level,
                        notes=assignment_data.notes
                    )
                    user_module = self.assign_module_to_user(assignment, assigned_by)
                    results["successful"].append({
                        "user_id": user_id,
                        "module_id": module_id,
                        "assignment_id": user_module.id
                    })
                except Exception as e:
                    results["failed"].append({
                        "user_id": user_id,
                        "module_id": module_id,
                        "error": str(e)
                    })
        
        return results
    
    def update_user_module(
        self,
        user_module_id: int,
        update_data: UserModuleUpdate,
        updated_by: int
    ) -> UserModule:
        """Update user module assignment"""
        user_module = self.db.query(UserModule).filter(UserModule.id == user_module_id).first()
        if not user_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User module assignment with ID {user_module_id} not found"
            )
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(user_module, key, value)
        
        self.db.commit()
        self.db.refresh(user_module)
        
        logger.info(f"User module assignment {user_module_id} updated by user {updated_by}")
        return user_module
    
    def deactivate_user_module(
        self,
        user_module_id: int,
        deactivation_data: UserModuleDeactivate,
        deactivated_by: int
    ) -> UserModule:
        """Deactivate user module assignment"""
        user_module = self.db.query(UserModule).filter(UserModule.id == user_module_id).first()
        if not user_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User module assignment with ID {user_module_id} not found"
            )
        
        user_module.is_active = False
        user_module.deactivated_at = datetime.utcnow()
        user_module.deactivated_by = deactivated_by
        user_module.deactivation_reason = deactivation_data.reason
        
        self.db.commit()
        self.db.refresh(user_module)
        
        # Log audit event
        module = self.get_module(user_module.module_id)
        user = self.db.query(User).filter(User.id == user_module.user_id).first()
        self._log_audit_event(
            user_id=deactivated_by,
            action=AuditAction.DELETE,
            resource_type="user_module",
            resource_id=user_module.id,
            description=f"Deactivated module '{module.name}' for user '{user.email}': {deactivation_data.reason}"
        )
        
        logger.info(f"User module assignment {user_module_id} deactivated by user {deactivated_by}")
        return user_module
    
    def remove_module_from_user(
        self,
        user_id: int,
        module_id: int,
        removed_by: int,
        reason: str = "Removed by admin"
    ) -> bool:
        """Remove module from user"""
        user_module = self.db.query(UserModule).filter(
            UserModule.user_id == user_id,
            UserModule.module_id == module_id
        ).first()
        
        if not user_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User module assignment not found"
            )
        
        deactivation_data = UserModuleDeactivate(reason=reason)
        self.deactivate_user_module(user_module.id, deactivation_data, removed_by)
        return True
    
    def get_user_modules(
        self,
        user_id: int,
        include_inactive: bool = False
    ) -> List[UserModule]:
        """Get all modules assigned to a user"""
        query = self.db.query(UserModule).filter(UserModule.user_id == user_id)
        
        if not include_inactive:
            query = query.filter(UserModule.is_active == True)
        
        return query.all()
    
    def get_module_users(
        self,
        module_id: int,
        include_inactive: bool = False
    ) -> List[UserModule]:
        """Get all users assigned to a module"""
        query = self.db.query(UserModule).filter(UserModule.module_id == module_id)
        
        if not include_inactive:
            query = query.filter(UserModule.is_active == True)
        
        return query.all()
    
    def check_user_module_access(
        self,
        user_id: int,
        module_id: int
    ) -> bool:
        """Check if user has access to a module"""
        user_module = self.db.query(UserModule).filter(
            UserModule.user_id == user_id,
            UserModule.module_id == module_id,
            UserModule.is_active == True
        ).first()
        
        if not user_module:
            return False
        
        # Check expiration
        if user_module.expires_at and user_module.expires_at < datetime.utcnow():
            return False
        
        return True
    
    # ==================== Access Logging ====================
    
    def log_module_access(
        self,
        user_id: int,
        module_id: int,
        action: str,
        feature_name: Optional[str] = None,
        session_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_data: Optional[Dict] = None,
        response_time_ms: Optional[int] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> ModuleAccessLog:
        """Log module access"""
        try:
            user_module = self.db.query(UserModule).filter(
                UserModule.user_id == user_id,
                UserModule.module_id == module_id
            ).first()
            
            access_log = ModuleAccessLog(
                user_id=user_id,
                module_id=module_id,
                user_module_id=user_module.id if user_module else None,
                action=action,
                feature_name=feature_name,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_data=request_data,
                response_time_ms=response_time_ms,
                success=success,
                error_message=error_message
            )
            
            self.db.add(access_log)
            
            # Update user module access stats
            if user_module:
                user_module.last_accessed = datetime.utcnow()
                user_module.access_count += 1
            
            self.db.commit()
            return access_log
            
        except Exception as e:
            logger.error(f"Error logging module access: {str(e)}")
            self.db.rollback()
    
    # ==================== Analytics ====================
    
    def get_module_usage_stats(self, module_id: int) -> Dict[str, Any]:
        """Get usage statistics for a module"""
        module = self.get_module(module_id)
        
        total_assigned = self.db.query(UserModule).filter(
            UserModule.module_id == module_id
        ).count()
        
        active_users = self.db.query(UserModule).filter(
            UserModule.module_id == module_id,
            UserModule.is_active == True
        ).count()
        
        inactive_users = total_assigned - active_users
        
        total_accesses = self.db.query(ModuleAccessLog).filter(
            ModuleAccessLog.module_id == module_id
        ).count()
        
        avg_accesses = total_accesses / active_users if active_users > 0 else 0
        
        # Most active users
        most_active = self.db.query(
            UserModule.user_id,
            User.email,
            func.count(ModuleAccessLog.id).label('access_count')
        ).join(User, UserModule.user_id == User.id
        ).outerjoin(ModuleAccessLog, UserModule.user_id == ModuleAccessLog.user_id
        ).filter(UserModule.module_id == module_id
        ).group_by(UserModule.user_id, User.email
        ).order_by(desc('access_count')
        ).limit(10).all()
        
        return {
            "module_id": module_id,
            "module_name": module.name,
            "total_assigned_users": total_assigned,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "total_accesses": total_accesses,
            "average_accesses_per_user": avg_accesses,
            "most_active_users": [
                {"user_id": u[0], "email": u[1], "access_count": u[2]}
                for u in most_active
            ]
        }
    
    def get_system_module_overview(self) -> Dict[str, Any]:
        """Get system-wide module overview"""
        total_modules = self.db.query(Module).count()
        active_modules = self.db.query(Module).filter(Module.status == ModuleStatus.ACTIVE).count()
        inactive_modules = total_modules - active_modules
        
        total_assignments = self.db.query(UserModule).count()
        active_assignments = self.db.query(UserModule).filter(UserModule.is_active == True).count()
        
        # Most popular modules
        most_popular = self.db.query(
            Module.id,
            Module.name,
            func.count(UserModule.id).label('assignment_count')
        ).join(UserModule, Module.id == UserModule.module_id
        ).filter(UserModule.is_active == True
        ).group_by(Module.id, Module.name
        ).order_by(desc('assignment_count')
        ).limit(10).all()
        
        # Module categories distribution
        categories = self.db.query(
            Module.category,
            func.count(Module.id).label('count')
        ).group_by(Module.category).all()
        
        return {
            "total_modules": total_modules,
            "active_modules": active_modules,
            "inactive_modules": inactive_modules,
            "total_assignments": total_assignments,
            "active_assignments": active_assignments,
            "most_popular_modules": [
                {"module_id": m[0], "module_name": m[1], "assignment_count": m[2]}
                for m in most_popular
            ],
            "module_categories_distribution": {
                cat[0].value: cat[1] for cat in categories
            }
        }
    
    # ==================== Helper Methods ====================
    
    def _log_audit_event(
        self,
        user_id: int,
        action: AuditAction,
        resource_type: str,
        resource_id: int,
        description: str
    ):
        """Log an audit event"""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                description=description
            )
            self.db.add(audit_log)
            self.db.commit()
        except Exception as e:
            logger.error(f"Error logging audit event: {str(e)}")
