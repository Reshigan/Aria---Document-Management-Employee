"""
Commercial Performance Optimization System
Redis caching, query optimization, and performance monitoring
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional, Callable
from functools import wraps
from datetime import datetime, timedelta
import hashlib
import redis
from sqlalchemy.orm import Session
from sqlalchemy import text
import aioredis
from contextlib import asynccontextmanager
import os

logger = logging.getLogger(__name__)

class CacheManager:
    """Redis-based caching system"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = None
        self.async_redis_client = None
        self.default_ttl = 3600  # 1 hour
        
    def connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established")
            return True
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return False
    
    async def connect_async(self):
        """Connect to Redis asynchronously"""
        try:
            self.async_redis_client = await aioredis.from_url(self.redis_url)
            # Test connection
            await self.async_redis_client.ping()
            logger.info("Async Redis connection established")
            return True
        except Exception as e:
            logger.error(f"Async Redis connection failed: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if not self.redis_client:
                return None
            
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        try:
            if not self.redis_client:
                return False
            
            ttl = ttl or self.default_ttl
            serialized_value = json.dumps(value, default=str)
            return self.redis_client.setex(key, ttl, serialized_value)
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def get_async(self, key: str) -> Optional[Any]:
        """Get value from cache asynchronously"""
        try:
            if not self.async_redis_client:
                return None
            
            value = await self.async_redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Async cache get error for key {key}: {e}")
            return None
    
    async def set_async(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache asynchronously"""
        try:
            if not self.async_redis_client:
                return False
            
            ttl = ttl or self.default_ttl
            serialized_value = json.dumps(value, default=str)
            return await self.async_redis_client.setex(key, ttl, serialized_value)
        except Exception as e:
            logger.error(f"Async cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            if not self.redis_client:
                return False
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        try:
            if not self.redis_client:
                return 0
            
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache clear pattern error for {pattern}: {e}")
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            if not self.redis_client:
                return {"status": "disconnected"}
            
            info = self.redis_client.info()
            return {
                "status": "connected",
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed"),
                "keyspace_hits": info.get("keyspace_hits"),
                "keyspace_misses": info.get("keyspace_misses"),
                "hit_rate": info.get("keyspace_hits", 0) / max(1, info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0))
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"status": "error", "error": str(e)}

class QueryOptimizer:
    """Database query optimization utilities"""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache = cache_manager
        self.query_stats = {}
    
    def cached_query(self, cache_key: str, ttl: Optional[int] = None):
        """Decorator for caching query results"""
        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key with parameters
                param_hash = hashlib.md5(str(args + tuple(kwargs.items())).encode()).hexdigest()
                full_cache_key = f"{cache_key}:{param_hash}"
                
                # Try to get from cache
                cached_result = self.cache.get(full_cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache hit for {full_cache_key}")
                    return cached_result
                
                # Execute query
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Cache result
                self.cache.set(full_cache_key, result, ttl)
                
                # Record stats
                self._record_query_stats(cache_key, execution_time, cache_hit=False)
                
                logger.debug(f"Query executed and cached: {full_cache_key} ({execution_time:.3f}s)")
                return result
            
            return wrapper
        return decorator
    
    def async_cached_query(self, cache_key: str, ttl: Optional[int] = None):
        """Decorator for caching async query results"""
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key with parameters
                param_hash = hashlib.md5(str(args + tuple(kwargs.items())).encode()).hexdigest()
                full_cache_key = f"{cache_key}:{param_hash}"
                
                # Try to get from cache
                cached_result = await self.cache.get_async(full_cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache hit for {full_cache_key}")
                    return cached_result
                
                # Execute query
                start_time = time.time()
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Cache result
                await self.cache.set_async(full_cache_key, result, ttl)
                
                # Record stats
                self._record_query_stats(cache_key, execution_time, cache_hit=False)
                
                logger.debug(f"Async query executed and cached: {full_cache_key} ({execution_time:.3f}s)")
                return result
            
            return wrapper
        return decorator
    
    def _record_query_stats(self, query_name: str, execution_time: float, cache_hit: bool):
        """Record query performance statistics"""
        if query_name not in self.query_stats:
            self.query_stats[query_name] = {
                "total_executions": 0,
                "cache_hits": 0,
                "total_time": 0,
                "avg_time": 0,
                "min_time": float('inf'),
                "max_time": 0
            }
        
        stats = self.query_stats[query_name]
        stats["total_executions"] += 1
        
        if cache_hit:
            stats["cache_hits"] += 1
        else:
            stats["total_time"] += execution_time
            stats["avg_time"] = stats["total_time"] / (stats["total_executions"] - stats["cache_hits"])
            stats["min_time"] = min(stats["min_time"], execution_time)
            stats["max_time"] = max(stats["max_time"], execution_time)
    
    def get_query_stats(self) -> Dict[str, Any]:
        """Get query performance statistics"""
        return self.query_stats
    
    def optimize_query(self, query: str, params: Dict[str, Any] = None) -> str:
        """Optimize SQL query"""
        # Basic query optimization rules
        optimized_query = query
        
        # Add LIMIT if not present for potentially large result sets
        if "SELECT" in query.upper() and "LIMIT" not in query.upper():
            if "ORDER BY" in query.upper():
                optimized_query = query.replace("ORDER BY", "ORDER BY") + " LIMIT 1000"
            else:
                optimized_query = query + " LIMIT 1000"
        
        # Suggest indexes for WHERE clauses
        if "WHERE" in query.upper():
            logger.debug("Consider adding indexes for WHERE clause columns")
        
        return optimized_query

class PerformanceMonitor:
    """Application performance monitoring"""
    
    def __init__(self):
        self.metrics = {
            "requests": 0,
            "response_times": [],
            "errors": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "db_queries": 0,
            "ai_requests": 0
        }
        self.start_time = time.time()
    
    def record_request(self, response_time: float, error: bool = False):
        """Record request metrics"""
        self.metrics["requests"] += 1
        self.metrics["response_times"].append(response_time)
        
        if error:
            self.metrics["errors"] += 1
        
        # Keep only last 1000 response times
        if len(self.metrics["response_times"]) > 1000:
            self.metrics["response_times"] = self.metrics["response_times"][-1000:]
    
    def record_cache_hit(self):
        """Record cache hit"""
        self.metrics["cache_hits"] += 1
    
    def record_cache_miss(self):
        """Record cache miss"""
        self.metrics["cache_misses"] += 1
    
    def record_db_query(self):
        """Record database query"""
        self.metrics["db_queries"] += 1
    
    def record_ai_request(self):
        """Record AI request"""
        self.metrics["ai_requests"] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        uptime = time.time() - self.start_time
        response_times = self.metrics["response_times"]
        
        return {
            "uptime_seconds": uptime,
            "total_requests": self.metrics["requests"],
            "requests_per_second": self.metrics["requests"] / max(1, uptime),
            "total_errors": self.metrics["errors"],
            "error_rate": self.metrics["errors"] / max(1, self.metrics["requests"]),
            "avg_response_time": sum(response_times) / max(1, len(response_times)),
            "min_response_time": min(response_times) if response_times else 0,
            "max_response_time": max(response_times) if response_times else 0,
            "cache_hit_rate": self.metrics["cache_hits"] / max(1, self.metrics["cache_hits"] + self.metrics["cache_misses"]),
            "total_db_queries": self.metrics["db_queries"],
            "total_ai_requests": self.metrics["ai_requests"],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def reset_metrics(self):
        """Reset all metrics"""
        self.metrics = {
            "requests": 0,
            "response_times": [],
            "errors": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "db_queries": 0,
            "ai_requests": 0
        }
        self.start_time = time.time()

def performance_middleware(func: Callable):
    """Middleware to track performance metrics"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        error = False
        
        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            error = True
            raise
        finally:
            response_time = time.time() - start_time
            performance_monitor.record_request(response_time, error)
    
    return wrapper

class ConnectionPoolManager:
    """Database connection pool management"""
    
    def __init__(self, engine):
        self.engine = engine
    
    def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status"""
        pool = self.engine.pool
        
        return {
            "pool_size": pool.size(),
            "checked_out_connections": pool.checkedout(),
            "overflow_connections": pool.overflow(),
            "checked_in_connections": pool.checkedin(),
            "total_connections": pool.size() + pool.overflow(),
            "pool_status": "healthy" if pool.checkedout() < pool.size() else "stressed"
        }
    
    def optimize_pool(self):
        """Optimize connection pool settings"""
        pool_status = self.get_pool_status()
        
        recommendations = []
        
        if pool_status["checked_out_connections"] > pool_status["pool_size"] * 0.8:
            recommendations.append("Consider increasing pool size")
        
        if pool_status["overflow_connections"] > 0:
            recommendations.append("Pool is using overflow connections")
        
        return {
            "status": pool_status,
            "recommendations": recommendations
        }

# Global instances
cache_manager = CacheManager()
query_optimizer = QueryOptimizer(cache_manager)
performance_monitor = PerformanceMonitor()

# Initialization function
async def init_performance_system():
    """Initialize performance optimization system"""
    try:
        # Connect to Redis
        cache_connected = cache_manager.connect()
        async_cache_connected = await cache_manager.connect_async()
        
        if cache_connected and async_cache_connected:
            logger.info("Performance optimization system initialized successfully")
            return True
        else:
            logger.warning("Performance system initialized with limited functionality (no Redis)")
            return False
            
    except Exception as e:
        logger.error(f"Performance system initialization failed: {e}")
        return False

# Utility functions for common caching patterns
def cache_user_data(user_id: int, data: Dict[str, Any], ttl: int = 1800):
    """Cache user-specific data"""
    cache_key = f"user:{user_id}:data"
    return cache_manager.set(cache_key, data, ttl)

def get_cached_user_data(user_id: int) -> Optional[Dict[str, Any]]:
    """Get cached user data"""
    cache_key = f"user:{user_id}:data"
    return cache_manager.get(cache_key)

def cache_document_analysis(document_id: int, analysis: Dict[str, Any], ttl: int = 7200):
    """Cache document analysis results"""
    cache_key = f"document:{document_id}:analysis"
    return cache_manager.set(cache_key, analysis, ttl)

def get_cached_document_analysis(document_id: int) -> Optional[Dict[str, Any]]:
    """Get cached document analysis"""
    cache_key = f"document:{document_id}:analysis"
    return cache_manager.get(cache_key)

def invalidate_user_cache(user_id: int):
    """Invalidate all cache entries for a user"""
    pattern = f"user:{user_id}:*"
    return cache_manager.clear_pattern(pattern)

def get_performance_report() -> Dict[str, Any]:
    """Get comprehensive performance report"""
    return {
        "application_metrics": performance_monitor.get_metrics(),
        "cache_stats": cache_manager.get_stats(),
        "query_stats": query_optimizer.get_query_stats(),
        "timestamp": datetime.utcnow().isoformat()
    }