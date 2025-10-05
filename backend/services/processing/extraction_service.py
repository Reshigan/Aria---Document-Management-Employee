"""
Data Extraction Service for extracting structured data from documents.
"""
import re
import logging
from datetime import datetime
from typing import Dict, Optional, List
from decimal import Decimal

logger = logging.getLogger(__name__)


class ExtractionService:
    """Service for extracting structured data from document text."""
    
    # Regular expressions for common patterns
    INVOICE_NUMBER_PATTERNS = [
        r'(?:invoice|inv\.?)\s*#?\s*:?\s*([A-Z0-9\-]+)',
        r'(?:invoice\s*number|inv\s*no\.?)\s*:?\s*([A-Z0-9\-]+)',
        r'#([A-Z0-9\-]+)',
    ]
    
    DATE_PATTERNS = [
        r'(?:date|dated)\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
    ]
    
    AMOUNT_PATTERNS = [
        r'(?:total|amount|balance)\s*:?\s*\$?\s*([\d,]+\.\d{2})',
        r'\$\s*([\d,]+\.\d{2})',
        r'([\d,]+\.\d{2})\s*(?:USD|EUR|GBP)',
    ]
    
    PO_NUMBER_PATTERNS = [
        r'(?:P\.?O\.?\s*#?|purchase\s*order)\s*:?\s*([A-Z0-9\-]+)',
    ]
    
    VENDOR_PATTERNS = [
        r'(?:vendor|supplier|from)\s*:?\s*([A-Za-z0-9\s&,.-]+?)(?:\n|$)',
    ]
    
    def extract_invoice_data(self, text: str) -> Dict:
        """
        Extract invoice-specific data from text.
        
        Args:
            text: OCR extracted text
            
        Returns:
            Dictionary with extracted invoice fields
        """
        data = {
            'invoice_number': self._extract_invoice_number(text),
            'invoice_date': self._extract_date(text),
            'total_amount': self._extract_amount(text),
            'purchase_order_number': self._extract_po_number(text),
            'vendor_name': self._extract_vendor(text),
            'currency': self._extract_currency(text),
        }
        
        # Calculate confidence score based on extracted fields
        confidence = self._calculate_confidence(data)
        data['confidence_score'] = confidence
        
        return data
    
    def extract_purchase_order_data(self, text: str) -> Dict:
        """Extract purchase order specific data."""
        data = {
            'po_number': self._extract_po_number(text),
            'po_date': self._extract_date(text),
            'vendor_name': self._extract_vendor(text),
            'total_amount': self._extract_amount(text),
            'currency': self._extract_currency(text),
        }
        
        confidence = self._calculate_confidence(data)
        data['confidence_score'] = confidence
        
        return data
    
    def _extract_invoice_number(self, text: str) -> Optional[str]:
        """Extract invoice number from text."""
        text_lower = text.lower()
        for pattern in self.INVOICE_NUMBER_PATTERNS:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                return match.group(1).strip().upper()
        return None
    
    def _extract_date(self, text: str) -> Optional[str]:
        """Extract date from text."""
        for pattern in self.DATE_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                # Try to parse and normalize the date
                try:
                    # Handle different date formats
                    for fmt in ['%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d', '%m-%d-%Y']:
                        try:
                            parsed_date = datetime.strptime(date_str, fmt)
                            return parsed_date.strftime('%Y-%m-%d')
                        except ValueError:
                            continue
                except Exception as e:
                    logger.debug(f"Could not parse date {date_str}: {e}")
                return date_str
        return None
    
    def _extract_amount(self, text: str) -> Optional[float]:
        """Extract monetary amount from text."""
        amounts = []
        for pattern in self.AMOUNT_PATTERNS:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    amount_str = match.group(1).replace(',', '')
                    amount = float(amount_str)
                    amounts.append(amount)
                except (ValueError, IndexError):
                    continue
        
        # Return the largest amount found (likely the total)
        return max(amounts) if amounts else None
    
    def _extract_po_number(self, text: str) -> Optional[str]:
        """Extract purchase order number from text."""
        text_lower = text.lower()
        for pattern in self.PO_NUMBER_PATTERNS:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                return match.group(1).strip().upper()
        return None
    
    def _extract_vendor(self, text: str) -> Optional[str]:
        """Extract vendor/supplier name from text."""
        for pattern in self.VENDOR_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                vendor = match.group(1).strip()
                # Clean up the vendor name
                vendor = re.sub(r'\s+', ' ', vendor)
                if len(vendor) > 3:  # Minimum length check
                    return vendor
        return None
    
    def _extract_currency(self, text: str) -> str:
        """Extract currency from text, default to USD."""
        currencies = {
            'USD': [r'\$', r'USD', r'US\s*Dollar'],
            'EUR': [r'€', r'EUR', r'Euro'],
            'GBP': [r'£', r'GBP', r'Pound'],
        }
        
        for currency, patterns in currencies.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return currency
        
        return 'USD'  # Default
    
    def _calculate_confidence(self, data: Dict) -> float:
        """Calculate confidence score based on extracted fields."""
        # Count non-None values
        non_none_count = sum(1 for v in data.values() if v is not None)
        total_fields = len(data)
        
        if total_fields == 0:
            return 0.0
        
        base_confidence = (non_none_count / total_fields) * 100
        
        # Boost confidence if critical fields are present
        critical_fields = ['invoice_number', 'total_amount', 'vendor_name']
        critical_count = sum(1 for field in critical_fields if data.get(field) is not None)
        
        if critical_count == len(critical_fields):
            base_confidence = min(base_confidence + 10, 100)
        
        return round(base_confidence, 2)
    
    def extract_line_items(self, text: str) -> List[Dict]:
        """
        Extract line items from invoice text.
        
        Returns:
            List of line items with description, quantity, price
        """
        # This is a simplified version - can be enhanced with ML models
        line_items = []
        
        # Look for patterns like: "Description Qty Price"
        lines = text.split('\n')
        
        for line in lines:
            # Simple pattern matching for line items
            # Example: "Item description    5    $10.00    $50.00"
            match = re.search(
                r'(.+?)\s+(\d+)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})',
                line
            )
            if match:
                line_items.append({
                    'description': match.group(1).strip(),
                    'quantity': int(match.group(2)),
                    'unit_price': float(match.group(3).replace(',', '')),
                    'total_price': float(match.group(4).replace(',', '')),
                })
        
        return line_items


# Singleton instance
extraction_service = ExtractionService()
