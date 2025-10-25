"""
Comprehensive Bot API Tests
"""
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestBotAPI:
    """Test Bot API Endpoints"""
    
    async def test_list_bot_templates(self, async_client: AsyncClient):
        """Test listing all bot templates"""
        response = await async_client.get("/api/v1/bot/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 10  # Should have 10+ templates
        
        # Verify template structure
        template = data[0]
        assert "id" in template
        assert "name" in template
        assert "description" in template
        assert "system_prompt" in template
    
    async def test_get_specific_template(self, async_client: AsyncClient):
        """Test getting a specific bot template"""
        response = await async_client.get("/api/v1/bot/templates/doc_qa")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "doc_qa"
        assert data["name"] == "Document Q&A Assistant"
    
    async def test_chat_completion(self, async_client: AsyncClient, test_conversation_data):
        """Test synchronous chat completion"""
        response = await async_client.post(
            "/api/v1/bot/chat",
            json={
                "message": "Hello, how are you?",
                "bot_template_id": "doc_qa"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "conversation_id" in data
        assert "tokens" in data
    
    async def test_chat_streaming(self, async_client: AsyncClient):
        """Test streaming chat completion"""
        async with async_client.stream(
            "POST",
            "/api/v1/bot/chat/stream",
            json={
                "message": "Tell me about yourself",
                "bot_template_id": "doc_qa"
            }
        ) as response:
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream"
            
            # Read some chunks
            chunks = []
            async for chunk in response.aiter_text():
                chunks.append(chunk)
                if len(chunks) >= 3:
                    break
            
            assert len(chunks) > 0
    
    async def test_create_conversation(self, async_client: AsyncClient):
        """Test creating a new conversation"""
        response = await async_client.post(
            "/api/v1/bot/conversations",
            json={
                "bot_template_id": "doc_qa",
                "title": "Test Conversation"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert data["bot_template_id"] == "doc_qa"
    
    async def test_get_conversation(self, async_client: AsyncClient):
        """Test retrieving conversation"""
        # Create conversation first
        create_response = await async_client.post(
            "/api/v1/bot/conversations",
            json={"bot_template_id": "doc_qa"}
        )
        conv_id = create_response.json()["conversation_id"]
        
        # Get conversation
        response = await async_client.get(f"/api/v1/bot/conversations/{conv_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == conv_id
        assert "messages" in data
    
    async def test_list_conversations(self, async_client: AsyncClient):
        """Test listing user conversations"""
        response = await async_client.get("/api/v1/bot/conversations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_delete_conversation(self, async_client: AsyncClient):
        """Test deleting a conversation"""
        # Create conversation first
        create_response = await async_client.post(
            "/api/v1/bot/conversations",
            json={"bot_template_id": "doc_qa"}
        )
        conv_id = create_response.json()["conversation_id"]
        
        # Delete it
        response = await async_client.delete(f"/api/v1/bot/conversations/{conv_id}")
        assert response.status_code == 200
        
        # Verify it's gone
        get_response = await async_client.get(f"/api/v1/bot/conversations/{conv_id}")
        assert get_response.status_code == 404
    
    async def test_invalid_template(self, async_client: AsyncClient):
        """Test with invalid bot template"""
        response = await async_client.post(
            "/api/v1/bot/chat",
            json={
                "message": "Hello",
                "bot_template_id": "nonexistent_bot"
            }
        )
        assert response.status_code == 404
    
    async def test_empty_message(self, async_client: AsyncClient):
        """Test with empty message"""
        response = await async_client.post(
            "/api/v1/bot/chat",
            json={
                "message": "",
                "bot_template_id": "doc_qa"
            }
        )
        assert response.status_code == 422  # Validation error
