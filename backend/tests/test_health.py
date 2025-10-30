"""
Health check tests to verify testing infrastructure.
"""
import pytest


@pytest.mark.unit
def test_health_endpoint(client):
    """Test that health endpoint returns 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "ARIA ERP"
    assert "version" in data


@pytest.mark.unit
def test_root_endpoint(client):
    """Test that root endpoint returns welcome message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "ARIA ERP"
    assert "version" in data
    assert "description" in data
    assert data["docs"] == "/docs"
