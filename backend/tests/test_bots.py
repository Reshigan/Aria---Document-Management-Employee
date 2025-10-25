"""
Automated tests for bot API
Tests: Bot listing, querying, status, history, subscription enforcement, BBBEE/SARS gates
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from backend.main import app

client = TestClient(app)

@pytest.fixture
def authenticated_user():
    """Create and authenticate a test user"""
    # Register
    user_data = {
        "email": f"bottest{datetime.now().timestamp()}@example.com",
        "password": "TestPassword123!",
        "first_name": "Bot",
        "last_name": "Tester",
        "company_name": "Bot Test Corp",
        "phone": "+27123456789",
        "province": "Gauteng"
    }
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200
    return response.json()

@pytest.fixture
def growth_tier_user():
    """Create a Growth tier user (BBBEE + SARS enabled)"""
    user_data = {
        "email": f"growth{datetime.now().timestamp()}@example.com",
        "password": "TestPassword123!",
        "first_name": "Growth",
        "last_name": "User",
        "company_name": "Growth Corp",
        "phone": "+27123456789",
        "province": "Gauteng"
    }
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200
    data = response.json()
    
    # Upgrade to Growth tier
    client.patch(f"/api/tenants/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
        json={"subscription_tier": "growth", "bbbee_enabled": True, "sars_payroll_enabled": True}
    )
    
    return data


class TestBotListing:
    """Test bot listing endpoint"""
    
    def test_list_bots_authenticated(self, authenticated_user):
        """Test listing bots with authentication"""
        response = client.get("/api/bots/", headers={
            "Authorization": f"Bearer {authenticated_user['access_token']}"
        })
        
        assert response.status_code == 200
        bots = response.json()
        
        # Should return a list
        assert isinstance(bots, list)
        
        # Should have 25 bots
        assert len(bots) > 0
        
        # Each bot should have required fields
        for bot in bots:
            assert "bot_id" in bot
            assert "name" in bot
            assert "description" in bot
            assert "category" in bot
            assert "icon" in bot
            assert "requires_bbbee" in bot
            assert "requires_sars" in bot
    
    def test_list_bots_unauthenticated(self):
        """Test listing bots without authentication"""
        response = client.get("/api/bots/")
        
        assert response.status_code == 401
    
    def test_list_bots_categories(self, authenticated_user):
        """Test bot categories"""
        response = client.get("/api/bots/categories", headers={
            "Authorization": f"Bearer {authenticated_user['access_token']}"
        })
        
        assert response.status_code == 200
        categories = response.json()
        
        # Should return list of categories
        assert isinstance(categories, list)
        assert "financial" in categories
        assert "sales" in categories
        assert "operations" in categories
        assert "hr" in categories


class TestBotQuery:
    """Test bot query endpoint"""
    
    def test_query_bot_success(self, authenticated_user):
        """Test successful bot query"""
        response = client.post("/api/bots/invoice_reconciliation/query",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"},
            json={"query": "Show me outstanding invoices"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return bot response
        assert "bot_id" in data
        assert data["bot_id"] == "invoice_reconciliation"
        assert "query" in data
        assert data["query"] == "Show me outstanding invoices"
        assert "response" in data
        assert "confidence" in data
        assert "suggestions" in data
        assert "actions_taken" in data
        assert "timestamp" in data
    
    def test_query_bot_empty_query(self, authenticated_user):
        """Test bot query with empty query"""
        response = client.post("/api/bots/invoice_reconciliation/query",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"},
            json={"query": ""}
        )
        
        assert response.status_code == 400
        assert "query" in response.json()["detail"].lower()
    
    def test_query_bot_invalid_bot_id(self, authenticated_user):
        """Test querying nonexistent bot"""
        response = client.post("/api/bots/nonexistent_bot/query",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"},
            json={"query": "Test query"}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_query_bot_unauthenticated(self):
        """Test querying bot without authentication"""
        response = client.post("/api/bots/invoice_reconciliation/query",
            json={"query": "Test query"}
        )
        
        assert response.status_code == 401


class TestBotStatus:
    """Test bot status endpoint"""
    
    def test_get_bot_status(self, authenticated_user):
        """Test getting bot status"""
        response = client.get("/api/bots/invoice_reconciliation/status",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return bot status
        assert "bot_id" in data
        assert "name" in data
        assert "status" in data
        assert "total_requests" in data
        assert "avg_response_time" in data
        assert "success_rate" in data
    
    def test_get_bot_status_invalid_bot(self, authenticated_user):
        """Test getting status for nonexistent bot"""
        response = client.get("/api/bots/nonexistent_bot/status",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"}
        )
        
        assert response.status_code == 404


class TestBotHistory:
    """Test bot query history endpoint"""
    
    def test_get_bot_history(self, authenticated_user):
        """Test getting bot query history"""
        # First, make a query
        client.post("/api/bots/invoice_reconciliation/query",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"},
            json={"query": "Test query for history"}
        )
        
        # Now get history
        response = client.get("/api/bots/invoice_reconciliation/history",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return list of queries
        assert isinstance(data, list)
        
        if len(data) > 0:
            query = data[0]
            assert "query_id" in query
            assert "query" in query
            assert "response" in query
            assert "timestamp" in query
    
    def test_get_bot_history_pagination(self, authenticated_user):
        """Test bot history pagination"""
        response = client.get("/api/bots/invoice_reconciliation/history?page=1&per_page=10",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return list (may be empty if no history)
        assert isinstance(data, list)
        assert len(data) <= 10


class TestSubscriptionEnforcement:
    """Test subscription tier enforcement"""
    
    def test_starter_tier_bots(self, authenticated_user):
        """Test Starter tier can access basic bots"""
        # Starter tier should have access to basic bots
        response = client.get("/api/bots/",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"}
        )
        
        assert response.status_code == 200
        bots = response.json()
        
        # Should have some bots available
        assert len(bots) > 0
        
        # Should not include BBBEE/SARS bots
        bbbee_bots = [b for b in bots if b["requires_bbbee"]]
        assert len(bbbee_bots) == 0 or not any(b["available"] for b in bbbee_bots)
    
    def test_growth_tier_bbbee_access(self, growth_tier_user):
        """Test Growth tier can access BBBEE bots"""
        response = client.get("/api/bots/",
            headers={"Authorization": f"Bearer {growth_tier_user['access_token']}"}
        )
        
        assert response.status_code == 200
        bots = response.json()
        
        # Should have BBBEE bots available
        bbbee_bots = [b for b in bots if b["requires_bbbee"]]
        assert len(bbbee_bots) > 0


class TestBBBEEFeatureGate:
    """Test BBBEE feature gate"""
    
    def test_bbbee_bot_starter_tier(self, authenticated_user):
        """Test Starter tier cannot access BBBEE bot"""
        response = client.post("/api/bots/bbbee_compliance/query",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"},
            json={"query": "Calculate BBBEE scorecard"}
        )
        
        # Should be forbidden (403) or return error message
        assert response.status_code in [403, 400]
        assert "upgrade" in response.json()["detail"].lower() or "bbbee" in response.json()["detail"].lower()
    
    def test_bbbee_bot_growth_tier(self, growth_tier_user):
        """Test Growth tier can access BBBEE bot"""
        response = client.post("/api/bots/bbbee_compliance/query",
            headers={"Authorization": f"Bearer {growth_tier_user['access_token']}"},
            json={"query": "Calculate BBBEE scorecard"}
        )
        
        # Should succeed
        assert response.status_code == 200
        data = response.json()
        assert data["bot_id"] == "bbbee_compliance"


class TestSARSFeatureGate:
    """Test SARS feature gate"""
    
    def test_sars_bot_starter_tier(self, authenticated_user):
        """Test Starter tier cannot access SARS bot"""
        response = client.post("/api/bots/payroll_sa/query",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"},
            json={"query": "Process payroll"}
        )
        
        # Should be forbidden or return error
        assert response.status_code in [403, 400]
        assert "upgrade" in response.json()["detail"].lower() or "sars" in response.json()["detail"].lower()
    
    def test_sars_bot_growth_tier(self, growth_tier_user):
        """Test Growth tier can access SARS bot"""
        response = client.post("/api/bots/payroll_sa/query",
            headers={"Authorization": f"Bearer {growth_tier_user['access_token']}"},
            json={"query": "Process payroll"}
        )
        
        # Should succeed
        assert response.status_code == 200
        data = response.json()
        assert data["bot_id"] == "payroll_sa"


class TestUsageTracking:
    """Test bot usage tracking"""
    
    def test_bot_request_count_increment(self, authenticated_user):
        """Test that bot requests are tracked"""
        # Get initial count
        response1 = client.get("/api/tenants/me",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"}
        )
        initial_count = response1.json()["bot_requests_count"]
        
        # Make a bot query
        client.post("/api/bots/invoice_reconciliation/query",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"},
            json={"query": "Test query"}
        )
        
        # Get new count
        response2 = client.get("/api/tenants/me",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"}
        )
        new_count = response2.json()["bot_requests_count"]
        
        # Should have incremented
        assert new_count == initial_count + 1


class TestBotPerformance:
    """Test bot API performance"""
    
    def test_list_bots_performance(self, authenticated_user):
        """Test bot listing performance"""
        import time
        
        start = time.time()
        response = client.get("/api/bots/",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"}
        )
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 0.5  # Should complete in less than 500ms
    
    def test_query_bot_performance(self, authenticated_user):
        """Test bot query performance"""
        import time
        
        start = time.time()
        response = client.post("/api/bots/invoice_reconciliation/query",
            headers={"Authorization": f"Bearer {authenticated_user['access_token']}"},
            json={"query": "Quick test query"}
        )
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 5.0  # Should complete in less than 5 seconds


class TestBotSecurity:
    """Test bot API security"""
    
    def test_cannot_access_other_tenant_bot_history(self):
        """Test that one tenant cannot see another tenant's bot history"""
        # Create tenant 1
        user1_data = {
            "email": f"tenant1_{datetime.now().timestamp()}@example.com",
            "password": "TestPassword123!",
            "first_name": "Tenant1",
            "last_name": "User",
            "company_name": "Tenant 1 Corp",
            "phone": "+27123456789",
            "province": "Gauteng"
        }
        response1 = client.post("/api/auth/register", json=user1_data)
        tenant1 = response1.json()
        
        # Tenant 1 makes a query
        client.post("/api/bots/invoice_reconciliation/query",
            headers={"Authorization": f"Bearer {tenant1['access_token']}"},
            json={"query": "Tenant 1 query"}
        )
        
        # Create tenant 2
        user2_data = {
            "email": f"tenant2_{datetime.now().timestamp()}@example.com",
            "password": "TestPassword123!",
            "first_name": "Tenant2",
            "last_name": "User",
            "company_name": "Tenant 2 Corp",
            "phone": "+27123456789",
            "province": "Gauteng"
        }
        response2 = client.post("/api/auth/register", json=user2_data)
        tenant2 = response2.json()
        
        # Tenant 2 gets history
        response = client.get("/api/bots/invoice_reconciliation/history",
            headers={"Authorization": f"Bearer {tenant2['access_token']}"}
        )
        
        assert response.status_code == 200
        history = response.json()
        
        # Should not see tenant 1's query
        assert not any(q["query"] == "Tenant 1 query" for q in history)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
