"""
Analytics and Reporting API Routes
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, or_, func, text, case, select, update, delete

from core.database import get_db
from api.routes.auth_enhanced import get_current_user
from models import (
    User, Document, Folder, Tag, DocumentView,
    Workflow, WorkflowStep, ActivityLog, SearchQuery, Notification,
    document_tags, document_shares
)
from services.auth_service import auth_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard analytics overview"""
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Base query filters for user permissions
    if current_user.is_superuser:
        user_filter = True
        document_filter = True
    else:
        user_filter = User.id == current_user.id
        document_filter = Document.uploaded_by == current_user.id
    
    # Document statistics
    total_docs_query = select(func.count(Document.id)).where(document_filter)
    total_docs_result = await db.execute(total_docs_query)
    total_documents = total_docs_result.scalar()
    
    recent_docs_query = select(func.count(Document.id)).where(
        and_(document_filter, Document.created_at >= since_date)
    )
    recent_docs_result = await db.execute(recent_docs_query)
    recent_documents = recent_docs_result.scalar()
    
    # Document status breakdown
    status_query = select(
        Document.status,
        func.count(Document.id).label('count')
    ).where(document_filter).group_by(Document.status)
    status_result = await db.execute(status_query)
    status_counts = status_result.fetchall()
    
    # Document type breakdown
    type_query = select(
        Document.document_type,
        func.count(Document.id).label('count')
    ).where(document_filter).group_by(Document.document_type)
    type_result = await db.execute(type_query)
    type_counts = type_result.fetchall()
    
    # Storage usage
    storage_query = select(func.sum(Document.file_size)).where(document_filter)
    storage_result = await db.execute(storage_query)
    total_storage = storage_result.scalar() or 0
    
    # User activity (Admin only)
    user_stats = {}
    if current_user.is_superuser:
        active_users_query = select(func.count(User.id)).where(
            and_(
                User.is_active == True,
                User.last_login >= since_date
            )
        )
        active_users_result = await db.execute(active_users_query)
        active_users = active_users_result.scalar()
        
        total_users_result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
        total_users = total_users_result.scalar()
        
        user_stats = {
            "total_users": total_users,
            "active_users": active_users,
            "activity_rate": round((active_users / total_users * 100) if total_users > 0 else 0, 1)
        }
    
    # Workflow statistics
    if current_user.is_superuser:
        workflow_filter = True
    else:
        workflow_filter = or_(
            Workflow.created_by == current_user.id,
            Workflow.id.in_(
                select(WorkflowStep.workflow_id).where(
                    WorkflowStep.assigned_user_id == current_user.id
                )
            )
        )
    
    total_workflows_result = await db.execute(select(func.count(Workflow.id)).where(workflow_filter))
    total_workflows = total_workflows_result.scalar()
    active_workflows_result = await db.execute(select(func.count(Workflow.id)).where(
        and_(workflow_filter, Workflow.status == "in_progress")
    ))
    active_workflows = active_workflows_result.scalar()
    
    completed_workflows_result = await db.execute(select(func.count(Workflow.id)).where(
        and_(workflow_filter, Workflow.status == "completed")
    ))
    completed_workflows = completed_workflows_result.scalar()
    
    # Recent activity
    activity_query = select(func.count(ActivityLog.id)).where(
        and_(
            ActivityLog.created_at >= since_date,
            user_filter if not current_user.is_superuser else True
        )
    )
    activity_result = await db.execute(activity_query)
    recent_activity = activity_result.scalar()
    
    return {
        "period_days": days,
        "documents": {
            "total": total_documents,
            "recent": recent_documents,
            "by_status": {status[0]: status[1] for status in status_counts},
            "by_type": {doc_type[0]: doc_type[1] for doc_type in type_counts},
            "total_storage_bytes": total_storage,
            "total_storage_mb": round(total_storage / (1024 * 1024), 2)
        },
        "workflows": {
            "total": total_workflows,
            "active": active_workflows,
            "completed": completed_workflows,
            "completion_rate": round((completed_workflows / total_workflows * 100) if total_workflows > 0 else 0, 1)
        },
        "activity": {
            "recent_actions": recent_activity
        },
        **user_stats
    }


@router.get("/documents/trends")
async def get_document_trends(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get document upload and processing trends"""
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Base filter
    document_filter = Document.uploaded_by == current_user.id if not current_user.is_superuser else True
    
    # Daily document uploads
    daily_uploads_query = select(
        func.date(Document.created_at).label('date'),
        func.count(Document.id).label('count')
    ).where(
        and_(document_filter, Document.created_at >= since_date)
    ).group_by(func.date(Document.created_at)).order_by('date')
    daily_uploads_result = await db.execute(daily_uploads_query)
    daily_uploads = daily_uploads_result.fetchall()
    
    # Document processing status over time
    processing_trends_query = select(
        func.date(Document.updated_at).label('date'),
        Document.status,
        func.count(Document.id).label('count')
    ).where(
        and_(
            document_filter,
            Document.updated_at >= since_date,
            Document.status.in_(['processed', 'failed'])
        )
    ).group_by(func.date(Document.updated_at), Document.status).order_by('date')
    processing_trends_result = await db.execute(processing_trends_query)
    processing_trends = processing_trends_result.fetchall()
    
    # File size trends
    size_trends_query = select(
        func.date(Document.created_at).label('date'),
        func.avg(Document.file_size).label('avg_size'),
        func.sum(Document.file_size).label('total_size')
    ).where(
        and_(document_filter, Document.created_at >= since_date)
    ).group_by(func.date(Document.created_at)).order_by('date')
    size_trends_result = await db.execute(size_trends_query)
    size_trends = size_trends_result.fetchall()
    
    return {
        "period_days": days,
        "daily_uploads": [
            {"date": str(item.date), "count": item.count}
            for item in daily_uploads
        ],
        "processing_trends": [
            {"date": str(item.date), "status": item.status, "count": item.count}
            for item in processing_trends
        ],
        "size_trends": [
            {
                "date": str(item.date),
                "avg_size_mb": round(float(item.avg_size) / (1024 * 1024), 2) if item.avg_size else 0,
                "total_size_mb": round(float(item.total_size) / (1024 * 1024), 2) if item.total_size else 0
            }
            for item in size_trends
        ]
    }


@router.get("/users/activity")
async def get_user_activity_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user activity analytics (Admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Most active users
    most_active_query = select(
        User.id,
        User.username,
        User.full_name,
        func.count(ActivityLog.id).label('activity_count')
    ).join(ActivityLog).where(
        ActivityLog.created_at >= since_date
    ).group_by(User.id, User.username, User.full_name).order_by(
        func.count(ActivityLog.id).desc()
    ).limit(10)
    most_active_result = await db.execute(most_active_query)
    most_active = most_active_result.fetchall()
    
    # Activity by type
    activity_types_query = select(
        ActivityLog.action,
        func.count(ActivityLog.id).label('count')
    ).where(
        ActivityLog.created_at >= since_date
    ).group_by(ActivityLog.action).order_by(
        func.count(ActivityLog.id).desc()
    ).limit(15)
    activity_types_result = await db.execute(activity_types_query)
    activity_types = activity_types_result.fetchall()
    
    # Daily activity
    daily_activity_query = select(
        func.date(ActivityLog.created_at).label('date'),
        func.count(ActivityLog.id).label('count')
    ).where(
        ActivityLog.created_at >= since_date
    ).group_by(func.date(ActivityLog.created_at)).order_by('date')
    daily_activity_result = await db.execute(daily_activity_query)
    daily_activity = daily_activity_result.fetchall()
    
    # User login patterns
    login_patterns_query = select(
        func.date(User.last_login).label('date'),
        func.count(User.id).label('unique_logins')
    ).where(
        and_(
            User.last_login >= since_date,
            User.is_active == True
        )
    ).group_by(func.date(User.last_login)).order_by('date')
    login_patterns_result = await db.execute(login_patterns_query)
    login_patterns = login_patterns_result.fetchall()
    
    return {
        "period_days": days,
        "most_active_users": [
            {
                "user_id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "activity_count": user.activity_count
            }
            for user in most_active
        ],
        "activity_by_type": [
            {"action": activity.action, "count": activity.count}
            for activity in activity_types
        ],
        "daily_activity": [
            {"date": str(activity.date), "count": activity.count}
            for activity in daily_activity
        ],
        "login_patterns": [
            {"date": str(login.date), "unique_logins": login.unique_logins}
            for login in login_patterns
        ]
    }


@router.get("/workflows/performance")
async def get_workflow_performance(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get workflow performance analytics"""
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Base filter for workflows
    if current_user.is_superuser:
        workflow_filter = True
    else:
        workflow_filter = or_(
            Workflow.created_by == current_user.id,
            Workflow.id.in_(
                select(WorkflowStep.workflow_id).where(
                    WorkflowStep.assigned_user_id == current_user.id
                )
            )
        )
    
    # Workflow completion times
    completed_workflows_query = select(
        Workflow.id,
        Workflow.title,
        Workflow.created_at,
        Workflow.completed_at,
        func.extract('epoch', Workflow.completed_at - Workflow.created_at).label('duration_seconds')
    ).where(
        and_(
            workflow_filter,
            Workflow.status == "completed",
            Workflow.completed_at >= since_date
        )
    )
    completed_workflows_result = await db.execute(completed_workflows_query)
    completed_workflows = completed_workflows_result.fetchall()
    
    # Average completion time by template
    template_performance_query = select(
        Workflow.template_id,
        func.count(Workflow.id).label('completed_count'),
        func.avg(func.extract('epoch', Workflow.completed_at - Workflow.created_at)).label('avg_duration_seconds')
    ).where(
        and_(
            workflow_filter,
            Workflow.status == "completed",
            Workflow.completed_at >= since_date
        )
    ).group_by(Workflow.template_id)
    template_performance_result = await db.execute(template_performance_query)
    template_performance = template_performance_result.fetchall()
    
    # Step completion rates
    step_performance_query = select(
        WorkflowStep.name,
        func.count(case([(WorkflowStep.status == "completed", 1)])).label('completed'),
        func.count(WorkflowStep.id).label('total'),
        func.avg(
            case([
                (WorkflowStep.completed_at.isnot(None),
                 func.extract('epoch', WorkflowStep.completed_at - WorkflowStep.created_at))
            ])
        ).label('avg_completion_time')
    ).where(
        WorkflowStep.created_at >= since_date
    ).group_by(WorkflowStep.name)
    step_performance_result = await db.execute(step_performance_query)
    step_performance = step_performance_result.fetchall()
    
    # Overdue workflows
    overdue_workflows = select(Workflow).where(
        and_(
            workflow_filter,
            Workflow.status.in_(["pending", "in_progress"]),
            Workflow.due_date < datetime.utcnow()
        )
    ).scalar()
    
    return {
        "period_days": days,
        "completed_workflows": [
            {
                "id": wf.id,
                "title": wf.title,
                "duration_hours": round(float(wf.duration_seconds) / 3600, 2) if wf.duration_seconds else 0,
                "created_at": wf.created_at,
                "completed_at": wf.completed_at
            }
            for wf in completed_workflows
        ],
        "template_performance": [
            {
                "template_id": tp.template_id,
                "completed_count": tp.completed_count,
                "avg_duration_hours": round(float(tp.avg_duration_seconds) / 3600, 2) if tp.avg_duration_seconds else 0
            }
            for tp in template_performance
        ],
        "step_performance": [
            {
                "step_name": sp.name,
                "completion_rate": round((sp.completed / sp.total * 100) if sp.total > 0 else 0, 1),
                "avg_completion_hours": round(float(sp.avg_completion_time) / 3600, 2) if sp.avg_completion_time else 0
            }
            for sp in step_performance
        ],
        "overdue_workflows": overdue_workflows
    }


@router.get("/search/analytics")
async def get_search_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get search analytics"""
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Base filter
    search_filter = SearchQuery.user_id == current_user.id if not current_user.is_superuser else True
    
    # Total searches
    total_searches = select(SearchQuery).where(
        and_(search_filter, SearchQuery.created_at >= since_date)
    ).scalar()
    
    # Top search queries
    top_queries_query = select(
        SearchQuery.query,
        func.count(SearchQuery.id).label('count'),
        func.avg(SearchQuery.search_time_ms).label('avg_time_ms'),
        func.avg(SearchQuery.results_count).label('avg_results')
    ).where(
        and_(search_filter, SearchQuery.created_at >= since_date)
    ).group_by(SearchQuery.query).order_by(
        func.count(SearchQuery.id).desc()
    ).limit(10)
    top_queries_result = await db.execute(top_queries_query)
    top_queries = top_queries_result.fetchall()
    
    # Search performance trends
    daily_searches_query = select(
        func.date(SearchQuery.created_at).label('date'),
        func.count(SearchQuery.id).label('count'),
        func.avg(SearchQuery.search_time_ms).label('avg_time_ms')
    ).where(
        and_(search_filter, SearchQuery.created_at >= since_date)
    ).group_by(func.date(SearchQuery.created_at)).order_by('date')
    daily_searches_result = await db.execute(daily_searches_query)
    daily_searches = daily_searches_result.fetchall()
    
    # Zero result searches
    zero_result_searches = select(SearchQuery).where(
        and_(
            search_filter,
            SearchQuery.created_at >= since_date,
            SearchQuery.results_count == 0
        )
    ).scalar()
    
    return {
        "period_days": days,
        "total_searches": total_searches,
        "zero_result_rate": round((zero_result_searches / total_searches * 100) if total_searches > 0 else 0, 1),
        "top_queries": [
            {
                "query": query.query,
                "count": query.count,
                "avg_time_ms": round(float(query.avg_time_ms), 2) if query.avg_time_ms else 0,
                "avg_results": round(float(query.avg_results), 1) if query.avg_results else 0
            }
            for query in top_queries
        ],
        "daily_trends": [
            {
                "date": str(search.date),
                "count": search.count,
                "avg_time_ms": round(float(search.avg_time_ms), 2) if search.avg_time_ms else 0
            }
            for search in daily_searches
        ]
    }


@router.get("/storage/usage")
async def get_storage_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get storage usage analytics"""
    # Base filter
    document_filter = Document.uploaded_by == current_user.id if not current_user.is_superuser else True
    
    # Total storage by user (Admin only)
    user_storage = []
    if current_user.is_superuser:
        user_storage_query = select(
            User.id,
            User.username,
            User.full_name,
            func.count(Document.id).label('document_count'),
            func.sum(Document.file_size).label('total_size')
        ).join(Document, User.id == Document.uploaded_by).group_by(
            User.id, User.username, User.full_name
        ).order_by(func.sum(Document.file_size).desc()).limit(10)
        user_storage_result = await db.execute(user_storage_query)
        user_storage_data = user_storage_result.fetchall()
        
        user_storage = [
            {
                "user_id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "document_count": user.document_count,
                "total_size_mb": round(float(user.total_size) / (1024 * 1024), 2) if user.total_size else 0
            }
            for user in user_storage_data
        ]
    
    # Storage by document type
    type_storage_query = select(
        Document.document_type,
        func.count(Document.id).label('count'),
        func.sum(Document.file_size).label('total_size'),
        func.avg(Document.file_size).label('avg_size')
    ).where(document_filter).group_by(Document.document_type)
    type_storage_result = await db.execute(type_storage_query)
    type_storage = type_storage_result.fetchall()
    
    # Storage by folder
    folder_storage_query = select(
        Folder.name,
        func.count(Document.id).label('count'),
        func.sum(Document.file_size).label('total_size')
    ).join(Document, Folder.id == Document.folder_id).where(
        document_filter
    ).group_by(Folder.name).order_by(
        func.sum(Document.file_size).desc()
    ).limit(10)
    folder_storage_result = await db.execute(folder_storage_query)
    folder_storage = folder_storage_result.fetchall()
    
    # Total storage stats
    total_stats = select(
        func.count(Document.id).label('total_documents'),
        func.sum(Document.file_size).label('total_size'),
        func.avg(Document.file_size).label('avg_size'),
        func.max(Document.file_size).label('max_size')
    ).where(document_filter).first()
    
    return {
        "total_stats": {
            "total_documents": total_stats.total_documents or 0,
            "total_size_mb": round(float(total_stats.total_size) / (1024 * 1024), 2) if total_stats.total_size else 0,
            "avg_size_mb": round(float(total_stats.avg_size) / (1024 * 1024), 2) if total_stats.avg_size else 0,
            "max_size_mb": round(float(total_stats.max_size) / (1024 * 1024), 2) if total_stats.max_size else 0
        },
        "by_type": [
            {
                "document_type": storage.document_type,
                "count": storage.count,
                "total_size_mb": round(float(storage.total_size) / (1024 * 1024), 2) if storage.total_size else 0,
                "avg_size_mb": round(float(storage.avg_size) / (1024 * 1024), 2) if storage.avg_size else 0
            }
            for storage in type_storage
        ],
        "by_folder": [
            {
                "folder_name": storage.name,
                "count": storage.count,
                "total_size_mb": round(float(storage.total_size) / (1024 * 1024), 2) if storage.total_size else 0
            }
            for storage in folder_storage
        ],
        "by_user": user_storage
    }


@router.get("/export/csv")
async def export_analytics_csv(
    report_type: str = Query(..., regex="^(documents|workflows|users|search)$"),
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Export analytics data as CSV (Admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # This would typically generate and return a CSV file
    # For now, return a message indicating the feature
    return {
        "message": f"CSV export for {report_type} analytics would be generated here",
        "report_type": report_type,
        "period_days": days,
        "since_date": since_date.isoformat()
    }