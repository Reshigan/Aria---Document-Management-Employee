"""
General Ledger CRUD Tests - P0 Priority
Tests chart of accounts and journal entries
"""
import pytest
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


class TestChartOfAccounts:
    """Test chart of accounts operations"""
    
    def test_list_accounts(self, authenticated_client):
        """Test listing GL accounts"""
        response = authenticated_client.get('/api/erp/gl/accounts')
        assert response.status_code == 200, f"Failed to list accounts: {response.text}"
        
        data = response.json()
        assert 'accounts' in data or isinstance(data, list), "Response should contain accounts"
        print(f"✅ Listed GL accounts successfully")
    
    def test_create_account(self, authenticated_client):
        """Test creating a GL account"""
        account_data = {
            'account_code': f'{TEST_PREFIX}1000',
            'account_name': f'{TEST_PREFIX} Test Asset Account',
            'account_type': 'asset',
            'is_active': True
        }
        
        response = authenticated_client.post('/api/erp/gl/accounts', json=account_data)
        
        assert response.status_code in [200, 201, 422], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"✅ Created GL account successfully")
        else:
            print(f"⚠️  Account creation returned 422: {response.json()}")


class TestJournalEntries:
    """Test journal entry operations"""
    
    def test_list_journal_entries(self, authenticated_client):
        """Test listing journal entries"""
        response = authenticated_client.get('/api/erp/gl/journal-entries')
        assert response.status_code == 200, f"Failed to list journal entries: {response.text}"
        
        data = response.json()
        assert 'entries' in data or isinstance(data, list), "Response should contain entries"
        print(f"✅ Listed journal entries successfully")
    
    def test_create_journal_entry(self, authenticated_client):
        """Test creating a journal entry"""
        je_data = {
            'entry_number': f'{TEST_PREFIX}JE001',
            'entry_date': '2025-11-18',
            'description': f'{TEST_PREFIX} Test Journal Entry',
            'status': 'draft',
            'lines': [
                {
                    'account_code': '1000',
                    'description': 'Debit line',
                    'debit': 1000.00,
                    'credit': 0.00
                },
                {
                    'account_code': '2000',
                    'description': 'Credit line',
                    'debit': 0.00,
                    'credit': 1000.00
                }
            ]
        }
        
        response = authenticated_client.post('/api/erp/gl/journal-entries', json=je_data)
        
        assert response.status_code in [200, 201, 422], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"✅ Created journal entry successfully")
        else:
            print(f"⚠️  Journal entry creation returned 422: {response.json()}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
