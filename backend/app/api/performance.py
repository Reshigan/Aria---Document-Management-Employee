from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from core.database import get_db
from app.services.cache_service import cache_service, performance_monitor, monitor_performance
from pydantic import BaseModel

router = APIRouter(prefix="/performance", tags=["Performance"])

class CacheStats(BaseModel):
    hits: int
    misses: int
    sets: int
    deletes: int
    evictions: int
    size: int
    max_size: int
    hit_rate: float
    memory_usage: int

class PerformanceStats(BaseModel):
    avg_request_time: float
    avg_query_time: float
    cache_hit_rate: float
    total_requests: int
    total_queries: int
    slow_query_count: int
    error_count: int

class CacheOperation(BaseModel):
    key: str
    value: Optional[Any] = None
    ttl: Optional[int] = None

@router.get("/stats", response_model=Dict[str, Any])
@monitor_performance
async def get_performance_stats():
    """Get comprehensive performance statistics"""
    try:
        return performance_monitor.get_performance_stats()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance stats: {str(e)}"
        )

@router.get("/cache/stats")
@monitor_performance
async def get_cache_stats():
    """Get cache statistics for all cache types"""
    try:
        return cache_service.get_all_stats()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache stats: {str(e)}"
        )

@router.post("/cache/clear")
@monitor_performance
async def clear_all_caches():
    """Clear all caches"""
    try:
        cache_service.clear_all()
        return {"message": "All caches cleared successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear caches: {str(e)}"
        )

@router.post("/cache/warm")
@monitor_performance
async def warm_cache(db: Session = Depends(get_db)):
    """Warm up cache with common queries"""
    try:
        # Define common warm-up functions
        def warm_documents():
            # Simulate common document queries
            cache_service.set("common:document_count", 1000, 3600)
            cache_service.set("common:recent_documents", [], 1800)
        
        def warm_users():
            # Simulate common user queries
            cache_service.set("common:user_count", 100, 3600)
            cache_service.set("common:active_users", [], 1800)
        
        def warm_analytics():
            # Simulate common analytics queries
            cache_service.set("common:daily_stats", {}, 1800)
            cache_service.set("common:usage_metrics", {}, 900)
        
        warm_functions = [warm_documents, warm_users, warm_analytics]
        results = cache_service.warm_cache(warm_functions)
        
        return {
            "message": "Cache warming completed",
            "results": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to warm cache: {str(e)}"
        )

@router.get("/cache/{key}")
@monitor_performance
async def get_cache_value(key: str):
    """Get value from cache"""
    try:
        value = cache_service.get(key)
        if value is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Key not found in cache"
            )
        return {"key": key, "value": value}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache value: {str(e)}"
        )

@router.post("/cache/{key}")
@monitor_performance
async def set_cache_value(key: str, operation: CacheOperation):
    """Set value in cache"""
    try:
        cache_service.set(key, operation.value, operation.ttl)
        return {"message": f"Value set for key: {key}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set cache value: {str(e)}"
        )

@router.delete("/cache/{key}")
@monitor_performance
async def delete_cache_value(key: str):
    """Delete value from cache"""
    try:
        deleted = cache_service.delete(key)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Key not found in cache"
            )
        return {"message": f"Key deleted: {key}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete cache value: {str(e)}"
        )

@router.post("/cache/query/invalidate")
@monitor_performance
async def invalidate_query_cache(pattern: str):
    """Invalidate cached queries matching pattern"""
    try:
        count = cache_service.invalidate_query_pattern(pattern)
        return {
            "message": f"Invalidated {count} cached queries",
            "pattern": pattern,
            "count": count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate query cache: {str(e)}"
        )

@router.get("/metrics/requests")
@monitor_performance
async def get_request_metrics():
    """Get request performance metrics"""
    try:
        stats = performance_monitor.get_performance_stats()
        return {
            "avg_request_time": stats["avg_request_time"],
            "total_requests": stats["total_requests"],
            "recent_requests": stats.get("recent_requests", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get request metrics: {str(e)}"
        )

@router.get("/metrics/queries")
@monitor_performance
async def get_query_metrics():
    """Get database query performance metrics"""
    try:
        stats = performance_monitor.get_performance_stats()
        return {
            "avg_query_time": stats["avg_query_time"],
            "total_queries": stats["total_queries"],
            "slow_query_count": stats["slow_query_count"],
            "recent_slow_queries": stats["recent_slow_queries"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get query metrics: {str(e)}"
        )

@router.post("/metrics/reset")
@monitor_performance
async def reset_performance_metrics():
    """Reset all performance metrics"""
    try:
        performance_monitor.reset_metrics()
        return {"message": "Performance metrics reset successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset metrics: {str(e)}"
        )

@router.get("/health")
@monitor_performance
async def get_performance_health():
    """Get performance health status"""
    try:
        stats = performance_monitor.get_performance_stats()
        cache_stats = cache_service.get_all_stats()
        
        # Determine health status
        health_status = "healthy"
        issues = []
        
        # Check average response time
        if stats["avg_request_time"] > 2.0:
            health_status = "warning"
            issues.append("High average request time")
        
        # Check cache hit rate
        if stats["cache_hit_rate"] < 50:
            health_status = "warning"
            issues.append("Low cache hit rate")
        
        # Check slow queries
        if stats["slow_query_count"] > 10:
            health_status = "critical"
            issues.append("High number of slow queries")
        
        # Check error rate
        error_rate = (stats["error_count"] / max(stats["total_requests"], 1)) * 100
        if error_rate > 5:
            health_status = "critical"
            issues.append("High error rate")
        
        return {
            "status": health_status,
            "issues": issues,
            "metrics": {
                "avg_request_time": stats["avg_request_time"],
                "cache_hit_rate": stats["cache_hit_rate"],
                "slow_query_count": stats["slow_query_count"],
                "error_rate": round(error_rate, 2)
            },
            "cache_memory_usage": cache_stats["total_memory"],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance health: {str(e)}"
        )

@router.get("/optimization/suggestions")
@monitor_performance
async def get_optimization_suggestions():
    """Get performance optimization suggestions"""
    try:
        stats = performance_monitor.get_performance_stats()
        cache_stats = cache_service.get_all_stats()
        suggestions = []
        
        # Analyze performance and suggest optimizations
        if stats["avg_request_time"] > 1.0:
            suggestions.append({
                "type": "performance",
                "priority": "high",
                "title": "High Response Time",
                "description": "Average request time is above 1 second",
                "recommendation": "Consider adding more caching or optimizing database queries"
            })
        
        if stats["cache_hit_rate"] < 70:
            suggestions.append({
                "type": "caching",
                "priority": "medium",
                "title": "Low Cache Hit Rate",
                "description": f"Cache hit rate is {stats['cache_hit_rate']}%",
                "recommendation": "Review caching strategy and increase cache TTL for stable data"
            })
        
        if stats["slow_query_count"] > 5:
            suggestions.append({
                "type": "database",
                "priority": "high",
                "title": "Slow Database Queries",
                "description": f"Found {stats['slow_query_count']} slow queries",
                "recommendation": "Add database indexes or optimize query structure"
            })
        
        if cache_stats["total_memory"] > 100 * 1024 * 1024:  # 100MB
            suggestions.append({
                "type": "memory",
                "priority": "medium",
                "title": "High Cache Memory Usage",
                "description": f"Cache using {cache_stats['total_memory'] / 1024 / 1024:.1f}MB",
                "recommendation": "Consider reducing cache size or TTL values"
            })
        
        return {
            "suggestions": suggestions,
            "total_suggestions": len(suggestions),
            "analysis_timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get optimization suggestions: {str(e)}"
        )
