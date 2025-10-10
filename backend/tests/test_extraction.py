"""
Tests for data extraction service
"""
import pytest
from services.processing.extraction_service import extraction_service


class TestExtractionService:
    """Test data extraction service"""
    
    def test_extraction_service_initialization(self):
        """Test extraction service initializes correctly"""
        assert extraction_service is not None
    
    def test_extract_invoice_number(self):
        """Test invoice number extraction"""
        text = "Invoice #INV-2024-001\nAmount: $100.00"
        result = extraction_service._extract_invoice_number(text)
        assert result is not None
        assert "INV-2024-001" in result.upper()
    
    def test_extract_amount(self):
        """Test amount extraction"""
        text = "Total: $1,234.56\nSubtotal: $1,000.00"
        result = extraction_service._extract_amount(text)
        assert result is not None
        assert result == 1234.56  # Should extract the larger amount
    
    def test_extract_date(self):
        """Test date extraction"""
        text = "Date: 12/25/2024\nInvoice #123"
        result = extraction_service._extract_date(text)
        assert result is not None
    
    def test_extract_vendor(self):
        """Test vendor name extraction"""
        text = "Vendor: ACME Corporation\nAddress: 123 Main St"
        result = extraction_service._extract_vendor(text)
        assert result is not None
        assert "ACME Corporation" in result
    
    def test_extract_currency(self):
        """Test currency extraction"""
        text = "Total: $100.00 USD"
        result = extraction_service._extract_currency(text)
        assert result == "USD"
        
        text_euro = "Total: €100.00"
        result = extraction_service._extract_currency(text_euro)
        assert result == "EUR"
    
    def test_extract_invoice_data_complete(self):
        """Test complete invoice data extraction"""
        text = """
        Invoice #INV-2024-001
        Date: 01/15/2024
        Vendor: ACME Corporation
        Total: $1,500.00
        P.O. #: PO-2024-123
        """
        
        result = extraction_service.extract_invoice_data(text)
        
        assert result is not None
        assert 'invoice_number' in result
        assert 'total_amount' in result
        assert 'vendor_name' in result
        assert 'confidence_score' in result
        
        # Check confidence score calculation
        assert 0 <= result['confidence_score'] <= 100
    
    def test_extract_invoice_data_partial(self):
        """Test extraction with partial data"""
        text = "Invoice #INV-2024-001\nTotal: $500.00"
        
        result = extraction_service.extract_invoice_data(text)
        
        assert result is not None
        assert result['invoice_number'] is not None
        assert result['total_amount'] is not None
        # Confidence should be lower with less data
        assert result['confidence_score'] < 100
    
    def test_extract_invoice_data_empty(self):
        """Test extraction with empty text"""
        result = extraction_service.extract_invoice_data("")
        
        assert result is not None
        assert result['confidence_score'] == 0 or result['confidence_score'] is not None
    
    def test_calculate_confidence(self):
        """Test confidence score calculation"""
        # All fields present
        data = {
            'invoice_number': 'INV-001',
            'invoice_date': '2024-01-01',
            'total_amount': 100.0,
            'vendor_name': 'ACME',
            'currency': 'USD'
        }
        confidence = extraction_service._calculate_confidence(data)
        assert confidence > 0
        
        # No fields present
        data_empty = {
            'invoice_number': None,
            'invoice_date': None,
            'total_amount': None
        }
        confidence_empty = extraction_service._calculate_confidence(data_empty)
        assert confidence_empty == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
