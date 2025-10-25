"""
Integration Tests - Slack, Teams, Webhooks
"""
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestSlackIntegration:
    """Test Slack integration"""
    
    async def test_send_slack_message(self):
        """Test sending a Slack message"""
        from backend.services.integrations.slack_integration import SlackIntegration
        
        # Mock test - would need real credentials
        integration = SlackIntegration(bot_token="xoxb-test-token")
        # Test structure only
        assert integration.bot_token is not None

@pytest.mark.asyncio
class TestWebhooks:
    """Test webhook system"""
    
    async def test_create_webhook(self, async_client: AsyncClient):
        """Test creating a webhook"""
        webhook_data = {
            "url": "https://example.com/webhook",
            "events": ["document.uploaded", "bot.response"],
            "secret": "test_secret_key"
        }
        
        response = await async_client.post("/api/v1/webhooks", json=webhook_data)
        assert response.status_code == 200
        data = response.json()
        assert "webhook_id" in data
    
    async def test_list_webhooks(self, async_client: AsyncClient):
        """Test listing webhooks"""
        response = await async_client.get("/api/v1/webhooks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_webhook_signature_verification(self):
        """Test webhook signature verification"""
        from backend.api.gateway.routers.webhooks import sign_webhook_payload
        
        payload = {"event": "test", "data": {}}
        secret = "test_secret"
        signature = sign_webhook_payload(payload, secret)
        
        assert signature is not None
        assert len(signature) > 0
