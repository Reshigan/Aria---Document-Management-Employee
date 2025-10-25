"""
Workflow API and Engine Tests
"""
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestWorkflowAPI:
    """Test Workflow API endpoints"""
    
    async def test_create_workflow(self, async_client: AsyncClient):
        """Test creating a new workflow"""
        workflow_data = {
            "name": "Test Workflow",
            "description": "Test workflow for automation",
            "trigger": {
                "type": "document_uploaded",
                "config": {}
            },
            "nodes": [
                {"id": "1", "type": "trigger", "data": {}},
                {"id": "2", "type": "action", "data": {"action": "extract_data"}},
                {"id": "3", "type": "bot", "data": {"bot_id": "doc_qa"}}
            ]
        }
        
        response = await async_client.post("/api/v1/workflows", json=workflow_data)
        assert response.status_code == 200
        data = response.json()
        assert "workflow_id" in data
        assert data["name"] == "Test Workflow"
    
    async def test_list_workflows(self, async_client: AsyncClient):
        """Test listing all workflows"""
        response = await async_client.get("/api/v1/workflows")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_execute_workflow(self, async_client: AsyncClient):
        """Test executing a workflow"""
        # Create workflow first
        workflow_data = {
            "name": "Execute Test",
            "trigger": {"type": "manual"},
            "nodes": [{"id": "1", "type": "trigger", "data": {}}]
        }
        create_response = await async_client.post("/api/v1/workflows", json=workflow_data)
        workflow_id = create_response.json()["workflow_id"]
        
        # Execute it
        response = await async_client.post(
            f"/api/v1/workflows/{workflow_id}/execute",
            json={"context": {"test": "data"}}
        )
        assert response.status_code == 200
        data = response.json()
        assert "execution_id" in data
    
    async def test_workflow_templates(self, async_client: AsyncClient):
        """Test getting workflow templates"""
        response = await async_client.get("/api/v1/workflows/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # Should have 3+ templates
