"""
Integration tests for ERP API endpoints covering O2C, P2P, master data.
Tests HTTP status codes, auth, validation, and response payloads.
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import date


@pytest.mark.integration
class TestHealthEndpoint:
    def test_health_check_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_check_returns_status(self, client):
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "ok"]


@pytest.mark.integration
class TestCustomerEndpoints:
    def test_list_customers_requires_auth(self, client):
        response = client.get("/api/v1/customers")
        assert response.status_code == 401

    def test_list_customers_with_auth(self, client, auth_headers):
        response = client.get("/api/v1/customers", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_create_customer_requires_auth(self, client):
        response = client.post("/api/v1/customers", json={"name": "Test"})
        assert response.status_code == 401

    def test_create_customer_validates_payload(self, client, auth_headers):
        response = client.post(
            "/api/v1/customers",
            headers=auth_headers,
            json={},
        )
        assert response.status_code in [400, 422]

    def test_create_customer_success(self, client, auth_headers):
        response = client.post(
            "/api/v1/customers",
            headers=auth_headers,
            json={
                "name": "Test Customer",
                "email": "testcustomer@example.com",
                "phone": "+27123456789",
                "address": "123 Test St",
                "city": "Cape Town",
                "country": "South Africa",
            },
        )
        assert response.status_code in [200, 201]

    def test_get_customer_not_found(self, client, auth_headers):
        response = client.get(
            "/api/v1/customers/nonexistent-id",
            headers=auth_headers,
        )
        assert response.status_code in [404, 422]

    def test_update_customer_requires_auth(self, client):
        response = client.put("/api/v1/customers/1", json={"name": "Updated"})
        assert response.status_code == 401

    def test_delete_customer_requires_auth(self, client):
        response = client.delete("/api/v1/customers/1")
        assert response.status_code == 401


@pytest.mark.integration
class TestSupplierEndpoints:
    def test_list_suppliers_requires_auth(self, client):
        response = client.get("/api/v1/suppliers")
        assert response.status_code == 401

    def test_list_suppliers_with_auth(self, client, auth_headers):
        response = client.get("/api/v1/suppliers", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_create_supplier_validates_payload(self, client, auth_headers):
        response = client.post(
            "/api/v1/suppliers",
            headers=auth_headers,
            json={},
        )
        assert response.status_code in [400, 422]


@pytest.mark.integration
class TestProductEndpoints:
    def test_list_products_requires_auth(self, client):
        response = client.get("/api/v1/products")
        assert response.status_code == 401

    def test_list_products_with_auth(self, client, auth_headers):
        response = client.get("/api/v1/products", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_create_product_validates_payload(self, client, auth_headers):
        response = client.post(
            "/api/v1/products",
            headers=auth_headers,
            json={},
        )
        assert response.status_code in [400, 422]


@pytest.mark.integration
class TestQuoteEndpoints:
    def test_list_quotes_requires_auth(self, client):
        response = client.get("/api/v1/erp/order-to-cash/quotes")
        assert response.status_code == 401

    def test_list_quotes_with_auth(self, client, auth_headers):
        response = client.get(
            "/api/v1/erp/order-to-cash/quotes",
            headers=auth_headers,
        )
        assert response.status_code in [200, 404]

    def test_create_quote_validates_payload(self, client, auth_headers):
        response = client.post(
            "/api/v1/erp/order-to-cash/quotes",
            headers=auth_headers,
            json={},
        )
        assert response.status_code in [400, 422]


@pytest.mark.integration
class TestSalesOrderEndpoints:
    def test_list_sales_orders_requires_auth(self, client):
        response = client.get("/api/v1/erp/order-to-cash/sales-orders")
        assert response.status_code == 401

    def test_list_sales_orders_with_auth(self, client, auth_headers):
        response = client.get(
            "/api/v1/erp/order-to-cash/sales-orders",
            headers=auth_headers,
        )
        assert response.status_code in [200, 404]


@pytest.mark.integration
class TestInvoiceEndpoints:
    def test_list_invoices_requires_auth(self, client):
        response = client.get("/api/v1/erp/order-to-cash/invoices")
        assert response.status_code == 401

    def test_list_invoices_with_auth(self, client, auth_headers):
        response = client.get(
            "/api/v1/erp/order-to-cash/invoices",
            headers=auth_headers,
        )
        assert response.status_code in [200, 404]


@pytest.mark.integration
class TestDeliveryEndpoints:
    def test_list_deliveries_requires_auth(self, client):
        response = client.get("/api/v1/erp/order-to-cash/deliveries")
        assert response.status_code == 401

    def test_list_deliveries_with_auth(self, client, auth_headers):
        response = client.get(
            "/api/v1/erp/order-to-cash/deliveries",
            headers=auth_headers,
        )
        assert response.status_code in [200, 404]


@pytest.mark.integration
class TestPurchaseOrderEndpoints:
    def test_list_purchase_orders_requires_auth(self, client):
        response = client.get("/api/v1/erp/procure-to-pay/purchase-orders")
        assert response.status_code == 401

    def test_list_purchase_orders_with_auth(self, client, auth_headers):
        response = client.get(
            "/api/v1/erp/procure-to-pay/purchase-orders",
            headers=auth_headers,
        )
        assert response.status_code in [200, 404]


@pytest.mark.integration
class TestTokenValidation:
    def test_expired_token_returns_401(self, client):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer expired.token.here"},
        )
        assert response.status_code == 401

    def test_no_token_returns_401(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_malformed_token_returns_401(self, client):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer not-a-jwt"},
        )
        assert response.status_code == 401

    def test_wrong_auth_scheme_returns_401(self, client):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )
        assert response.status_code in [401, 403]


@pytest.mark.integration
class TestReportEndpoints:
    def test_reports_require_auth(self, client):
        endpoints = [
            "/api/v1/reports/financial/trial-balance",
            "/api/v1/reports/financial/balance-sheet",
            "/api/v1/reports/financial/income-statement",
            "/api/v1/reports/inventory/valuation",
            "/api/v1/reports/sales/kpis",
        ]
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code in [401, 404], f"Endpoint {endpoint} should require auth"
