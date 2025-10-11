import json
import hashlib
import pickle
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
from functools import wraps
import asyncio
import threading
from collections import OrderedDict

class InMemoryCache:
    """High-performance in-memory cache with LRU eviction"""
    
    def __init__(self, max_size: int = 10000, default_ttl: int = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache = OrderedDict()
        self.expiry = {}
        self.lock = threading.RLock()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'evictions': 0
        }

    def _is_expired(self, key: str) -> bool:
        """Check if key has expired"""
        if key not in self.expiry:
            return False
        return datetime.utcnow() > self.expiry[key]

    def _evict_expired(self):
        """Remove expired keys"""
        now = datetime.utcnow()
        expired_keys = [k for k, exp_time in self.expiry.items() if now > exp_time]
        for key in expired_keys:
            self._delete_key(key)

    def _delete_key(self, key: str):
        """Internal key deletion"""
        if key in self.cache:
            del self.cache[key]
        if key in self.expiry:
            del self.expiry[key]

    def _evict_lru(self):
        """Evict least recently used items"""
        while len(self.cache) >= self.max_size:
            oldest_key = next(iter(self.cache))
            self._delete_key(oldest_key)
            self.stats['evictions'] += 1

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        with self.lock:
            if key not in self.cache:
                self.stats['misses'] += 1
                return None
            
            if self._is_expired(key):
                self._delete_key(key)
                self.stats['misses'] += 1
                return None
            
            # Move to end (most recently used)
            value = self.cache.pop(key)
            self.cache[key] = value
            self.stats['hits'] += 1
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache"""
        with self.lock:
            self._evict_expired()
            self._evict_lru()
            
            self.cache[key] = value
            if ttl is None:
                ttl = self.default_ttl
            
            self.expiry[key] = datetime.utcnow() + timedelta(seconds=ttl)
            self.stats['sets'] += 1

    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        with self.lock:
            if key in self.cache:
                self._delete_key(key)
                self.stats['deletes'] += 1
                return True
            return False

    def clear(self) -> None:
        """Clear all cache"""
        with self.lock:
            self.cache.clear()
            self.expiry.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self.lock:
            total_requests = self.stats['hits'] + self.stats['misses']
            hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0
            
            return {
                **self.stats,
                'size': len(self.cache),
                'max_size': self.max_size,
                'hit_rate': round(hit_rate, 2),
                'memory_usage': sum(len(pickle.dumps(v)) for v in self.cache.values())
            }

class CacheService:
    """Comprehensive caching service with multiple backends"""
    
    def __init__(self):
        self.memory_cache = InMemoryCache()
        self.query_cache = InMemoryCache(max_size=5000, default_ttl=1800)  # 30 min
        self.file_cache = InMemoryCache(max_size=1000, default_ttl=7200)   # 2 hours
        self.api_cache = InMemoryCache(max_size=2000, default_ttl=900)     # 15 min

    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()

    # Memory Cache Operations
    def get(self, key: str) -> Optional[Any]:
        """Get from memory cache"""
        return self.memory_cache.get(key)

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set in memory cache"""
        self.memory_cache.set(key, value, ttl)

    def delete(self, key: str) -> bool:
        """Delete from memory cache"""
        return self.memory_cache.delete(key)

    # Query Cache Operations
    def get_query(self, query_hash: str) -> Optional[Any]:
        """Get cached query result"""
        return self.query_cache.get(f"query:{query_hash}")

    def set_query(self, query_hash: str, result: Any, ttl: int = 1800) -> None:
        """Cache query result"""
        self.query_cache.set(f"query:{query_hash}", result, ttl)

    def invalidate_query_pattern(self, pattern: str) -> int:
        """Invalidate queries matching pattern"""
        count = 0
        keys_to_delete = []
        
        with self.query_cache.lock:
            for key in self.query_cache.cache.keys():
                if pattern in key:
                    keys_to_delete.append(key)
        
        for key in keys_to_delete:
            if self.query_cache.delete(key):
                count += 1
        
        return count

    # File Cache Operations
    def get_file(self, file_path: str) -> Optional[Any]:
        """Get cached file data"""
        key = self._generate_key("file", file_path)
        return self.file_cache.get(key)

    def set_file(self, file_path: str, data: Any, ttl: int = 7200) -> None:
        """Cache file data"""
        key = self._generate_key("file", file_path)
        self.file_cache.set(key, data, ttl)

    # API Cache Operations
    def get_api_response(self, endpoint: str, params: Dict = None) -> Optional[Any]:
        """Get cached API response"""
        key = self._generate_key("api", endpoint, **(params or {}))
        return self.api_cache.get(key)

    def set_api_response(self, endpoint: str, params: Dict, response: Any, ttl: int = 900) -> None:
        """Cache API response"""
        key = self._generate_key("api", endpoint, **params)
        self.api_cache.set(key, response, ttl)

    # Cache Decorators
    def cached(self, ttl: int = 3600, key_prefix: str = "func"):
        """Decorator for caching function results"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = self._generate_key(f"{key_prefix}:{func.__name__}", *args, **kwargs)
                
                # Try to get from cache
                result = self.get(cache_key)
                if result is not None:
                    return result
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl)
                return result
            
            return wrapper
        return decorator

    def cached_query(self, ttl: int = 1800):
        """Decorator for caching database queries"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate query hash
                query_data = f"{func.__name__}:{args}:{sorted(kwargs.items())}"
                query_hash = hashlib.md5(query_data.encode()).hexdigest()
                
                # Try to get from query cache
                result = self.get_query(query_hash)
                if result is not None:
                    return result
                
                # Execute query and cache result
                result = func(*args, **kwargs)
                self.set_query(query_hash, result, ttl)
                return result
            
            return wrapper
        return decorator

    # Cache Management
    def clear_all(self) -> None:
        """Clear all caches"""
        self.memory_cache.clear()
        self.query_cache.clear()
        self.file_cache.clear()
        self.api_cache.clear()

    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all caches"""
        return {
            'memory_cache': self.memory_cache.get_stats(),
            'query_cache': self.query_cache.get_stats(),
            'file_cache': self.file_cache.get_stats(),
            'api_cache': self.api_cache.get_stats(),
            'total_memory': (
                self.memory_cache.get_stats()['memory_usage'] +
                self.query_cache.get_stats()['memory_usage'] +
                self.file_cache.get_stats()['memory_usage'] +
                self.api_cache.get_stats()['memory_usage']
            )
        }

    def warm_cache(self, warm_functions: List[callable]) -> Dict[str, Any]:
        """Warm up cache with common queries"""
        results = {}
        for func in warm_functions:
            try:
                start_time = datetime.utcnow()
                func()
                end_time = datetime.utcnow()
                results[func.__name__] = {
                    'status': 'success',
                    'duration': (end_time - start_time).total_seconds()
                }
            except Exception as e:
                results[func.__name__] = {
                    'status': 'error',
                    'error': str(e)
                }
        return results

# Global cache instance
cache_service = CacheService()

# Performance monitoring
class PerformanceMonitor:
    """Monitor and track performance metrics"""
    
    def __init__(self):
        self.metrics = {
            'request_times': [],
            'query_times': [],
            'cache_hits': 0,
            'cache_misses': 0,
            'slow_queries': [],
            'error_count': 0
        }
        self.lock = threading.Lock()

    def record_request_time(self, endpoint: str, duration: float):
        """Record API request time"""
        with self.lock:
            self.metrics['request_times'].append({
                'endpoint': endpoint,
                'duration': duration,
                'timestamp': datetime.utcnow().isoformat()
            })
            # Keep only last 1000 entries
            if len(self.metrics['request_times']) > 1000:
                self.metrics['request_times'] = self.metrics['request_times'][-1000:]

    def record_query_time(self, query: str, duration: float):
        """Record database query time"""
        with self.lock:
            self.metrics['query_times'].append({
                'query': query[:100],  # Truncate long queries
                'duration': duration,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Track slow queries (>1 second)
            if duration > 1.0:
                self.metrics['slow_queries'].append({
                    'query': query[:200],
                    'duration': duration,
                    'timestamp': datetime.utcnow().isoformat()
                })
                # Keep only last 100 slow queries
                if len(self.metrics['slow_queries']) > 100:
                    self.metrics['slow_queries'] = self.metrics['slow_queries'][-100:]

    def record_cache_hit(self):
        """Record cache hit"""
        with self.lock:
            self.metrics['cache_hits'] += 1

    def record_cache_miss(self):
        """Record cache miss"""
        with self.lock:
            self.metrics['cache_misses'] += 1

    def record_error(self):
        """Record error occurrence"""
        with self.lock:
            self.metrics['error_count'] += 1

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        with self.lock:
            # Calculate averages
            avg_request_time = 0
            avg_query_time = 0
            
            if self.metrics['request_times']:
                avg_request_time = sum(r['duration'] for r in self.metrics['request_times']) / len(self.metrics['request_times'])
            
            if self.metrics['query_times']:
                avg_query_time = sum(q['duration'] for q in self.metrics['query_times']) / len(self.metrics['query_times'])
            
            # Calculate cache hit rate
            total_cache_requests = self.metrics['cache_hits'] + self.metrics['cache_misses']
            cache_hit_rate = (self.metrics['cache_hits'] / total_cache_requests * 100) if total_cache_requests > 0 else 0
            
            return {
                'avg_request_time': round(avg_request_time, 3),
                'avg_query_time': round(avg_query_time, 3),
                'cache_hit_rate': round(cache_hit_rate, 2),
                'total_requests': len(self.metrics['request_times']),
                'total_queries': len(self.metrics['query_times']),
                'slow_query_count': len(self.metrics['slow_queries']),
                'error_count': self.metrics['error_count'],
                'recent_slow_queries': self.metrics['slow_queries'][-10:],  # Last 10 slow queries
                'cache_stats': cache_service.get_all_stats()
            }

    def reset_metrics(self):
        """Reset all performance metrics"""
        with self.lock:
            self.metrics = {
                'request_times': [],
                'query_times': [],
                'cache_hits': 0,
                'cache_misses': 0,
                'slow_queries': [],
                'error_count': 0
            }

# Global performance monitor
performance_monitor = PerformanceMonitor()

# Performance decorator
def monitor_performance(func):
    """Decorator to monitor function performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = datetime.utcnow()
        try:
            result = func(*args, **kwargs)
            return result
        except Exception as e:
            performance_monitor.record_error()
            raise
        finally:
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            if hasattr(func, '__name__'):
                if 'query' in func.__name__.lower():
                    performance_monitor.record_query_time(func.__name__, duration)
                else:
                    performance_monitor.record_request_time(func.__name__, duration)
    
    return wrapper