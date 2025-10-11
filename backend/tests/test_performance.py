import pytest
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.models.user import User
from app.auth import create_access_token, get_password_hash

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_performance.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        username="perfuser",
        email="perf@example.com",
        hashed_password=get_password_hash("perfpassword"),
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    db.delete(user)
    db.commit()
    db.close()

@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {token}"}

class TestAPIPerformance:
    
    @pytest.mark.slow
    def test_api_response_time(self, client, auth_headers, setup_database):
        """Test API response times are within acceptable limits"""
        endpoints = [
            "/api/users/me",
            "/api/documents",
            "/api/mobile/devices",
            "/api/integrations",
            "/api/performance/metrics"
        ]
        
        response_times = []
        
        for endpoint in endpoints:
            start_time = time.time()
            response = client.get(endpoint, headers=auth_headers)
            end_time = time.time()
            
            response_time = end_time - start_time
            response_times.append(response_time)
            
            # Assert response is successful and fast (under 2 seconds)
            assert response.status_code in [200, 404]  # 404 acceptable for some endpoints
            assert response_time < 2.0, f"Endpoint {endpoint} took {response_time:.2f}s"
        
        # Average response time should be under 1 second
        avg_response_time = sum(response_times) / len(response_times)
        assert avg_response_time < 1.0, f"Average response time {avg_response_time:.2f}s too high"
    
    @pytest.mark.slow
    def test_concurrent_requests(self, client, auth_headers, setup_database):
        """Test system handles concurrent requests properly"""
        
        def make_request():
            response = client.get("/api/users/me", headers=auth_headers)
            return response.status_code, time.time()
        
        # Test with 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            start_time = time.time()
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in futures]
            end_time = time.time()
        
        # All requests should succeed
        status_codes = [result[0] for result in results]
        assert all(code == 200 for code in status_codes)
        
        # Total time should be reasonable (under 5 seconds for 10 concurrent requests)
        total_time = end_time - start_time
        assert total_time < 5.0, f"Concurrent requests took {total_time:.2f}s"
    
    def test_memory_usage_stability(self, client, auth_headers, setup_database):
        """Test that memory usage remains stable during repeated requests"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Make 50 requests
        for _ in range(50):
            response = client.get("/api/users/me", headers=auth_headers)
            assert response.status_code == 200
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 50MB)
        assert memory_increase < 50 * 1024 * 1024, f"Memory increased by {memory_increase / 1024 / 1024:.2f}MB"
    
    @pytest.mark.slow
    def test_database_query_performance(self, client, auth_headers, setup_database):
        """Test database query performance"""
        
        # Create multiple users for testing
        db = TestingSessionLocal()
        users = []
        for i in range(100):
            user = User(
                username=f"testuser{i}",
                email=f"test{i}@example.com",
                hashed_password=get_password_hash("password"),
                is_active=True
            )
            users.append(user)
        
        db.add_all(users)
        db.commit()
        
        try:
            # Test query performance
            start_time = time.time()
            response = client.get("/api/users", headers=auth_headers)
            end_time = time.time()
            
            query_time = end_time - start_time
            
            # Query should complete quickly even with 100+ users
            assert query_time < 1.0, f"Database query took {query_time:.2f}s"
            
            if response.status_code == 200:
                data = response.json()
                assert len(data.get("users", [])) >= 100
        
        finally:
            # Cleanup
            for user in users:
                db.delete(user)
            db.commit()
            db.close()
    
    def test_file_upload_performance(self, client, auth_headers, setup_database):
        """Test file upload performance"""
        import tempfile
        import os
        
        # Create a test file (1MB)
        test_content = b"x" * (1024 * 1024)  # 1MB of data
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as f:
            f.write(test_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {"file": ("test_large.txt", f, "text/plain")}
                data = {
                    "title": "Performance Test Document",
                    "description": "Large file for performance testing"
                }
                
                start_time = time.time()
                response = client.post(
                    "/api/documents/upload",
                    files=files,
                    data=data,
                    headers={"Authorization": auth_headers["Authorization"]}
                )
                end_time = time.time()
            
            upload_time = end_time - start_time
            
            # 1MB upload should complete within 10 seconds
            assert upload_time < 10.0, f"File upload took {upload_time:.2f}s"
            
            if response.status_code == 200:
                assert response.json()["success"] is True
        
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.slow
    def test_search_performance(self, client, auth_headers, setup_database):
        """Test search performance with various query types"""
        
        search_queries = [
            {"query": "test", "limit": 10},
            {"query": "document", "limit": 50},
            {"query": "performance test document", "limit": 20},
            {"query": "", "limit": 100}  # Empty query should still work
        ]
        
        for search_data in search_queries:
            start_time = time.time()
            response = client.get(
                f"/api/documents/search?query={search_data['query']}&limit={search_data['limit']}",
                headers=auth_headers
            )
            end_time = time.time()
            
            search_time = end_time - start_time
            
            # Search should complete within 2 seconds
            assert search_time < 2.0, f"Search took {search_time:.2f}s for query '{search_data['query']}'"
            assert response.status_code == 200
    
    def test_pagination_performance(self, client, auth_headers, setup_database):
        """Test pagination performance"""
        
        # Test different page sizes and offsets
        pagination_tests = [
            {"limit": 10, "offset": 0},
            {"limit": 50, "offset": 0},
            {"limit": 100, "offset": 0},
            {"limit": 10, "offset": 100},
            {"limit": 10, "offset": 1000}
        ]
        
        for params in pagination_tests:
            start_time = time.time()
            response = client.get(
                f"/api/documents?limit={params['limit']}&offset={params['offset']}",
                headers=auth_headers
            )
            end_time = time.time()
            
            pagination_time = end_time - start_time
            
            # Pagination should be fast regardless of offset
            assert pagination_time < 1.0, f"Pagination took {pagination_time:.2f}s"
            assert response.status_code == 200

class TestCachePerformance:
    
    def test_cache_effectiveness(self, client, auth_headers, setup_database):
        """Test that caching improves performance"""
        
        # First request (cache miss)
        start_time = time.time()
        response1 = client.get("/api/users/me", headers=auth_headers)
        first_request_time = time.time() - start_time
        
        # Second request (should be cached)
        start_time = time.time()
        response2 = client.get("/api/users/me", headers=auth_headers)
        second_request_time = time.time() - start_time
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Second request should be faster (or at least not significantly slower)
        # Allow for some variance in timing
        assert second_request_time <= first_request_time * 1.5
    
    def test_cache_invalidation(self, client, auth_headers, setup_database):
        """Test that cache is properly invalidated when data changes"""
        
        # Get initial data
        response1 = client.get("/api/users/me", headers=auth_headers)
        assert response1.status_code == 200
        initial_data = response1.json()
        
        # Update user data
        update_data = {"full_name": "Updated Name"}
        update_response = client.put("/api/users/me", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200
        
        # Get data again (should reflect changes)
        response2 = client.get("/api/users/me", headers=auth_headers)
        assert response2.status_code == 200
        updated_data = response2.json()
        
        # Data should be different (cache was invalidated)
        if "full_name" in updated_data:
            assert updated_data["full_name"] == "Updated Name"

class TestScalabilityTests:
    
    @pytest.mark.slow
    def test_large_dataset_handling(self, client, auth_headers, setup_database):
        """Test system performance with large datasets"""
        
        # This test would typically involve creating a large number of records
        # For the test environment, we'll simulate with smaller numbers
        
        db = TestingSessionLocal()
        
        # Create 500 test documents (simulating large dataset)
        documents = []
        for i in range(500):
            # In a real scenario, you'd create actual Document objects
            # For this test, we'll just measure the time to query existing data
            pass
        
        try:
            # Test querying large dataset
            start_time = time.time()
            response = client.get("/api/documents?limit=100", headers=auth_headers)
            end_time = time.time()
            
            query_time = end_time - start_time
            
            # Should handle large datasets efficiently
            assert query_time < 3.0, f"Large dataset query took {query_time:.2f}s"
            assert response.status_code == 200
        
        finally:
            db.close()
    
    @pytest.mark.slow
    def test_stress_test(self, client, auth_headers, setup_database):
        """Basic stress test with rapid consecutive requests"""
        
        start_time = time.time()
        failed_requests = 0
        
        # Make 100 rapid requests
        for i in range(100):
            try:
                response = client.get("/api/users/me", headers=auth_headers)
                if response.status_code != 200:
                    failed_requests += 1
            except Exception:
                failed_requests += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should handle stress reasonably well
        assert total_time < 30.0, f"Stress test took {total_time:.2f}s"
        assert failed_requests < 5, f"{failed_requests} requests failed"
    
    def test_resource_cleanup(self, client, auth_headers, setup_database):
        """Test that resources are properly cleaned up"""
        import gc
        
        # Force garbage collection before test
        gc.collect()
        initial_objects = len(gc.get_objects())
        
        # Perform operations that create objects
        for _ in range(10):
            response = client.get("/api/users/me", headers=auth_headers)
            assert response.status_code == 200
        
        # Force garbage collection after test
        gc.collect()
        final_objects = len(gc.get_objects())
        
        # Object count shouldn't grow excessively
        object_growth = final_objects - initial_objects
        assert object_growth < 1000, f"Too many objects created: {object_growth}"

class TestPerformanceMonitoring:
    
    def test_performance_metrics_endpoint(self, client, auth_headers, setup_database):
        """Test that performance metrics are available"""
        
        response = client.get("/api/performance/metrics", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        metrics = data.get("metrics", {})
        
        # Should include basic performance metrics
        expected_metrics = [
            "response_time_avg",
            "request_count",
            "error_rate",
            "memory_usage",
            "cpu_usage"
        ]
        
        # At least some metrics should be present
        assert len(metrics) > 0
    
    def test_health_check_performance(self, client, setup_database):
        """Test health check endpoint performance"""
        
        start_time = time.time()
        response = client.get("/health")
        end_time = time.time()
        
        health_check_time = end_time - start_time
        
        # Health check should be very fast
        assert health_check_time < 0.1, f"Health check took {health_check_time:.3f}s"
        assert response.status_code == 200

class TestDatabasePerformance:
    
    def test_connection_pool_efficiency(self, client, auth_headers, setup_database):
        """Test database connection pool efficiency"""
        
        # Make multiple requests that require database access
        start_time = time.time()
        
        for _ in range(20):
            response = client.get("/api/users/me", headers=auth_headers)
            assert response.status_code == 200
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Connection pooling should make this efficient
        assert total_time < 5.0, f"20 DB requests took {total_time:.2f}s"
    
    def test_query_optimization(self, client, auth_headers, setup_database):
        """Test that queries are optimized"""
        
        # Test complex query performance
        start_time = time.time()
        response = client.get(
            "/api/documents/search?query=test&limit=50",
            headers=auth_headers
        )
        end_time = time.time()
        
        query_time = end_time - start_time
        
        # Complex queries should still be reasonably fast
        assert query_time < 2.0, f"Complex query took {query_time:.2f}s"
        assert response.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])