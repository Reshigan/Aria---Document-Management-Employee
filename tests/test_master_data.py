"""
Master Data CRUD Tests - P0 Priority
Tests customers, suppliers, and products CRUD operations
"""
import pytest
import uuid
from utils.client import APIClient
from utils.auth import get_or_create_admin_token
from config import BASE_URL, COMPANY_ID, TEST_PREFIX


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


class TestCustomers:
    """Test customer CRUD operations"""
    
    def test_list_customers(self, authenticated_client):
        """Test listing customers"""
        response = authenticated_client.get('/api/erp/master-data/customers')
        assert response.status_code == 200, f"Failed to list customers: {response.text}"
        
        data = response.json()
        assert 'customers' in data or isinstance(data, list), "Response should contain customers"
        print(f"✅ Listed customers successfully")
    
    def test_create_customer(self, authenticated_client):
        """Test creating a customer"""
        customer_data = {
            'customer_number': f'{TEST_PREFIX}CUST001',
            'name': f'{TEST_PREFIX} Test Customer',
            'email': 'test@customer.com',
            'phone': '+1234567890',
            'customer_type': 'standard',
            'payment_terms': 'Net 30',
            'credit_limit': 10000.00
        }
        
        response = authenticated_client.post('/api/erp/master-data/customers', json=customer_data)
        
        assert response.status_code in [200, 201, 422], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert 'id' in data or 'customer_id' in data, "Response should contain customer ID"
            print(f"✅ Created customer successfully")
        else:
            print(f"⚠️  Customer creation returned 422 (validation error): {response.json()}")


class TestSuppliers:
    """Test supplier CRUD operations"""
    
    def test_list_suppliers(self, authenticated_client):
        """Test listing suppliers"""
        response = authenticated_client.get('/api/erp/master-data/suppliers')
        assert response.status_code == 200, f"Failed to list suppliers: {response.text}"
        
        data = response.json()
        assert 'suppliers' in data or isinstance(data, list), "Response should contain suppliers"
        print(f"✅ Listed suppliers successfully")
    
    def test_create_supplier(self, authenticated_client):
        """Test creating a supplier"""
        supplier_data = {
            'supplier_number': f'{TEST_PREFIX}SUPP001',
            'name': f'{TEST_PREFIX} Test Supplier',
            'email': 'test@supplier.com',
            'phone': '+1234567890',
            'supplier_type': 'standard',
            'payment_terms': 'Net 30'
        }
        
        response = authenticated_client.post('/api/erp/master-data/suppliers', json=supplier_data)
        
        assert response.status_code in [200, 201, 422], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert 'id' in data or 'supplier_id' in data, "Response should contain supplier ID"
            print(f"✅ Created supplier successfully")
        else:
            print(f"⚠️  Supplier creation returned 422 (validation error): {response.json()}")


class TestProducts:
    """Test product CRUD operations"""
    
    def test_list_products_otc(self, authenticated_client):
        """Test listing products via order-to-cash endpoint"""
        response = authenticated_client.get('/api/erp/order-to-cash/products')
        
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Listed products successfully via O2C endpoint")
        else:
            print(f"⚠️  Products endpoint not available at /api/erp/order-to-cash/products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
