"""
Unit tests for ARIA ERP middleware (rate limiting, security headers).
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock, patch
from starlette.requests import Request
from starlette.responses import JSONResponse


class TestRateLimitMiddleware:
    def setup_method(self):
        from app.middleware.rate_limit import RateLimitMiddleware
        self.app = MagicMock()
        self.middleware = RateLimitMiddleware(self.app, requests_per_minute=5)

    def test_init_sets_rate_limit(self):
        assert self.middleware.requests_per_minute == 5

    def test_init_creates_empty_requests_dict(self):
        assert self.middleware.requests == {}

    def test_get_client_ip_from_direct_connection(self):
        request = MagicMock()
        request.headers = {}
        request.client = MagicMock()
        request.client.host = "192.168.1.1"
        ip = self.middleware._get_client_ip(request)
        assert ip == "192.168.1.1"

    def test_get_client_ip_from_forwarded_header(self):
        request = MagicMock()
        request.headers = {"X-Forwarded-For": "10.0.0.1, 10.0.0.2"}
        ip = self.middleware._get_client_ip(request)
        assert ip == "10.0.0.1"

    def test_get_client_ip_unknown_when_no_client(self):
        request = MagicMock()
        request.headers = {}
        request.client = None
        ip = self.middleware._get_client_ip(request)
        assert ip == "unknown"

    def test_clean_old_requests_removes_expired(self):
        old_time = datetime.now() - timedelta(minutes=2)
        recent_time = datetime.now()
        self.middleware.requests["test-ip"] = [old_time, recent_time]
        self.middleware._clean_old_requests("test-ip")
        assert len(self.middleware.requests["test-ip"]) == 1

    def test_clean_old_requests_keeps_recent(self):
        recent = datetime.now()
        self.middleware.requests["test-ip"] = [recent]
        self.middleware._clean_old_requests("test-ip")
        assert len(self.middleware.requests["test-ip"]) == 1

    def test_clean_old_requests_handles_missing_ip(self):
        self.middleware._clean_old_requests("nonexistent-ip")

    @pytest.mark.asyncio
    async def test_dispatch_allows_health_check(self):
        request = MagicMock()
        request.url = MagicMock()
        request.url.path = "/health"
        call_next = AsyncMock(return_value=MagicMock())
        result = await self.middleware.dispatch(request, call_next)
        call_next.assert_called_once()

    @pytest.mark.asyncio
    async def test_dispatch_allows_api_health_check(self):
        request = MagicMock()
        request.url = MagicMock()
        request.url.path = "/api/health"
        call_next = AsyncMock(return_value=MagicMock())
        result = await self.middleware.dispatch(request, call_next)
        call_next.assert_called_once()

    @pytest.mark.asyncio
    async def test_dispatch_rate_limits_excessive_requests(self):
        request = MagicMock()
        request.url = MagicMock()
        request.url.path = "/api/v1/test"
        request.headers = {}
        request.client = MagicMock()
        request.client.host = "10.0.0.1"

        self.middleware.requests["10.0.0.1"] = [datetime.now() for _ in range(5)]

        call_next = AsyncMock()
        result = await self.middleware.dispatch(request, call_next)
        assert isinstance(result, JSONResponse)
        assert result.status_code == 429

    @pytest.mark.asyncio
    async def test_dispatch_adds_rate_limit_headers(self):
        request = MagicMock()
        request.url = MagicMock()
        request.url.path = "/api/v1/test"
        request.headers = {}
        request.client = MagicMock()
        request.client.host = "10.0.0.2"

        response = MagicMock()
        response.headers = {}
        call_next = AsyncMock(return_value=response)

        result = await self.middleware.dispatch(request, call_next)
        assert "X-RateLimit-Limit" in result.headers
        assert "X-RateLimit-Remaining" in result.headers

    @pytest.mark.asyncio
    async def test_dispatch_records_request(self):
        request = MagicMock()
        request.url = MagicMock()
        request.url.path = "/api/v1/test"
        request.headers = {}
        request.client = MagicMock()
        request.client.host = "10.0.0.3"

        response = MagicMock()
        response.headers = {}
        call_next = AsyncMock(return_value=response)

        await self.middleware.dispatch(request, call_next)
        assert "10.0.0.3" in self.middleware.requests
        assert len(self.middleware.requests["10.0.0.3"]) == 1


class TestRateLimitCustomConfiguration:
    def test_custom_rate_limit(self):
        from app.middleware.rate_limit import RateLimitMiddleware
        app = MagicMock()
        middleware = RateLimitMiddleware(app, requests_per_minute=100)
        assert middleware.requests_per_minute == 100

    def test_default_rate_limit(self):
        from app.middleware.rate_limit import RateLimitMiddleware
        app = MagicMock()
        middleware = RateLimitMiddleware(app)
        assert middleware.requests_per_minute == 60
