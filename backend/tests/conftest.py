"""
Pytest Configuration and Fixtures
"""
import pytest
import asyncio
from typing import Generator, AsyncGenerator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient

# Test database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def test_db():
    """Create test database"""
    from backend.models.base import Base
    engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
async def async_client() -> AsyncGenerator:
    """Create async test client"""
    from backend.main import app
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def test_user_data():
    """Sample user data"""
    return {
        "email": "test@example.com",
        "password": "TestPass123!",
        "full_name": "Test User"
    }

@pytest.fixture
def test_document_data():
    """Sample document data"""
    return {
        "title": "Test Document",
        "content": "This is a test document for processing.",
        "doc_type": "text"
    }

@pytest.fixture
def test_conversation_data():
    """Sample conversation data"""
    return {
        "bot_template_id": "doc_qa",
        "message": "What is this document about?"
    }

@pytest.fixture
def mock_llm_response():
    """Mock LLM response"""
    return {
        "role": "assistant",
        "content": "This is a mock AI response for testing purposes.",
        "model": "gpt-4",
        "tokens": 50
    }
