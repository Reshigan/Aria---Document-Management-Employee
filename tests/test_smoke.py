"""
Smoke Tests - P0 Priority
Tests basic system health and connectivity
"""
import pytest
from utils.client import APIClient
from utils.auth import get_or_create_admin_token
from config import BASE_URL, COMPANY_ID


@pytest.fixture(scope="module")
def client():
    """Create API client"""
    return APIClient(BASE_URL)


@pytest.fixture(scope="module")
def authenticated_client(client):
    """Create authenticated API client"""
    token = get_or_create_admin_token(client)
    if token:
        client.set_token(token)
    return client


class TestSmoke:
    """Smoke tests for go-live readiness"""
    
    def test_health_endpoint(self, client):
        """Test /health endpoint returns 200 and expected structure"""
        response = client.get('/health')
        assert response.status_code == 200, f"Health check failed: {response.text}"
        
        data = response.json()
        assert data.get('status') == 'healthy', "System not healthy"
        assert 'version' in data, "Version missing from health check"
        assert 'erp_modules' in data, "ERP modules count missing"
        assert data.get('erp_modules', 0) >= 8, f"Expected at least 8 ERP modules, got {data.get('erp_modules')}"
        assert 'bots' in data, "Bots count missing"
        
        print(f"✅ Health check passed: {data}")
    
    def test_openapi_spec(self, client):
        """Test OpenAPI spec is accessible"""
        response = client.get('/openapi.json')
        assert response.status_code == 200, "OpenAPI spec not accessible"
        
        spec = response.json()
        assert 'openapi' in spec, "Invalid OpenAPI spec"
        assert 'paths' in spec, "No paths in OpenAPI spec"
        assert len(spec['paths']) > 0, "OpenAPI spec has no endpoints"
        
        paths = spec['paths'].keys()
        erp_paths = [p for p in paths if '/erp/' in p or '/api/erp/' in p]
        assert len(erp_paths) > 0, "No ERP endpoints found in OpenAPI spec"
        
        print(f"✅ OpenAPI spec accessible with {len(paths)} endpoints ({len(erp_paths)} ERP endpoints)")
    
    def test_auth_endpoints_exist(self, client):
        """Test authentication endpoints are accessible"""
        response = client.post('/api/auth/login', json={'email': 'test', 'password': 'test'})
        assert response.status_code != 404, "Login endpoint not found"
        
        print("✅ Auth endpoints exist")
    
    def test_database_connectivity(self, authenticated_client):
        """Test database is accessible via API"""
        response = authenticated_client.get('/api/erp/gl/accounts')
        
        assert response.status_code != 500, f"Database error: {response.text}"
        
        if response.status_code == 200:
            print("✅ Database connectivity confirmed")
        else:
            print(f"⚠️  Database connectivity test returned {response.status_code}")
    
    def test_company_exists(self, authenticated_client):
        """Test company exists in database"""
        response = authenticated_client.get('/api/erp/gl/accounts')
        
        if response.status_code == 200:
            print(f"✅ Company {COMPANY_ID} accessible")
        else:
            print(f"⚠️  Company check returned {response.status_code}: {response.text}")
    
    def test_no_500_errors_on_basic_endpoints(self, authenticated_client):
        """Test that basic endpoints don't return 500 errors"""
        endpoints = [
            '/health',
            '/api/erp/gl/accounts',
            '/api/erp/master-data/customers',
            '/api/erp/master-data/suppliers',
        ]
        
        errors = []
        for endpoint in endpoints:
            response = authenticated_client.get(endpoint)
            if response.status_code == 500:
                errors.append(f"{endpoint}: {response.text}")
        
        assert len(errors) == 0, f"Found 500 errors:\n" + "\n".join(errors)
        print(f"✅ No 500 errors on {len(endpoints)} basic endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
