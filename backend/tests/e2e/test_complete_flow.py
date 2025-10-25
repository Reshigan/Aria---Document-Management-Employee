"""
End-to-End Tests - Complete User Flows
"""
import pytest
from httpx import AsyncClient
import asyncio

@pytest.mark.e2e
@pytest.mark.asyncio
class TestCompleteUserFlow:
    """Test complete user workflows from start to finish"""
    
    async def test_document_to_bot_conversation(self, async_client: AsyncClient):
        """Test: Upload document -> Process -> Ask bot questions -> Get answers"""
        
        # Step 1: Upload a document
        # (Simulated - would need actual file upload)
        document_id = "test_doc_123"
        
        # Step 2: Create a conversation with doc context
        conv_response = await async_client.post(
            "/api/v1/bot/conversations",
            json={
                "bot_template_id": "doc_qa",
                "context": {"document_id": document_id}
            }
        )
        assert conv_response.status_code == 200
        conv_id = conv_response.json()["conversation_id"]
        
        # Step 3: Ask questions about the document
        chat_response = await async_client.post(
            "/api/v1/bot/chat",
            json={
                "message": "What is this document about?",
                "conversation_id": conv_id
            }
        )
        assert chat_response.status_code == 200
        assert "response" in chat_response.json()
        
        # Step 4: Get conversation history
        history_response = await async_client.get(f"/api/v1/bot/conversations/{conv_id}")
        assert history_response.status_code == 200
        history = history_response.json()
        assert len(history["messages"]) >= 2  # User message + bot response
    
    async def test_workflow_automation_flow(self, async_client: AsyncClient):
        """Test: Create workflow -> Trigger -> Execute -> Verify results"""
        
        # Step 1: Create an automation workflow
        workflow_response = await async_client.post(
            "/api/v1/workflows",
            json={
                "name": "Auto Invoice Processing",
                "trigger": {"type": "document_uploaded"},
                "nodes": [
                    {"id": "1", "type": "trigger", "data": {}},
                    {"id": "2", "type": "bot", "data": {"bot_id": "invoice_extractor"}},
                    {"id": "3", "type": "action", "data": {"action": "send_notification"}}
                ]
            }
        )
        assert workflow_response.status_code == 200
        workflow_id = workflow_response.json()["workflow_id"]
        
        # Step 2: Execute the workflow
        exec_response = await async_client.post(
            f"/api/v1/workflows/{workflow_id}/execute",
            json={"context": {"document_id": "invoice_001.pdf"}}
        )
        assert exec_response.status_code == 200
        execution_id = exec_response.json()["execution_id"]
        
        # Step 3: Verify execution
        assert execution_id is not None
    
    async def test_multi_bot_conversation(self, async_client: AsyncClient):
        """Test using multiple bot templates in sequence"""
        
        # Use document summarizer
        summary_response = await async_client.post(
            "/api/v1/bot/chat",
            json={
                "message": "Summarize this contract",
                "bot_template_id": "doc_summarizer"
            }
        )
        assert summary_response.status_code == 200
        
        # Then use contract analyzer
        analysis_response = await async_client.post(
            "/api/v1/bot/chat",
            json={
                "message": "Analyze this contract for risks",
                "bot_template_id": "contract_analyzer"
            }
        )
        assert analysis_response.status_code == 200
        
        # Verify both got responses
        assert "response" in summary_response.json()
        assert "response" in analysis_response.json()
    
    async def test_webhook_integration_flow(self, async_client: AsyncClient):
        """Test webhook creation and event delivery"""
        
        # Create webhook
        webhook_response = await async_client.post(
            "/api/v1/webhooks",
            json={
                "url": "https://example.com/webhook-endpoint",
                "events": ["bot.response", "document.processed"],
                "secret": "webhook_secret_123"
            }
        )
        assert webhook_response.status_code == 200
        webhook_id = webhook_response.json()["webhook_id"]
        
        # Trigger an event (bot response)
        await async_client.post(
            "/api/v1/bot/chat",
            json={
                "message": "Test message",
                "bot_template_id": "doc_qa"
            }
        )
        
        # Webhook would be called here (in real scenario)
        # Verify webhook still exists
        list_response = await async_client.get("/api/v1/webhooks")
        webhooks = list_response.json()
        assert any(w["id"] == webhook_id for w in webhooks)

@pytest.mark.e2e
@pytest.mark.asyncio
class TestPerformance:
    """Performance and load tests"""
    
    async def test_concurrent_requests(self, async_client: AsyncClient):
        """Test handling multiple concurrent requests"""
        
        async def make_request():
            return await async_client.post(
                "/api/v1/bot/chat",
                json={"message": "Hello", "bot_template_id": "doc_qa"}
            )
        
        # Send 10 concurrent requests
        tasks = [make_request() for _ in range(10)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify all succeeded
        successful = sum(1 for r in responses if not isinstance(r, Exception) and r.status_code == 200)
        assert successful >= 8  # At least 80% success rate
    
    async def test_streaming_performance(self, async_client: AsyncClient):
        """Test streaming response performance"""
        import time
        
        start_time = time.time()
        
        async with async_client.stream(
            "POST",
            "/api/v1/bot/chat/stream",
            json={"message": "Tell me a story", "bot_template_id": "doc_qa"}
        ) as response:
            chunks = []
            async for chunk in response.aiter_text():
                chunks.append(chunk)
                if len(chunks) >= 10:
                    break
        
        elapsed = time.time() - start_time
        
        # Should start streaming within 2 seconds
        assert elapsed < 2.0
        assert len(chunks) > 0
