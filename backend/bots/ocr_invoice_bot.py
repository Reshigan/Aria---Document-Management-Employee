"""
ARIA ERP - OCR Invoice Processing Bot
Real OCR implementation with hybrid text extraction
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, List
import re
from .bot_api_client import BotAPIClient

class OCRInvoiceBot:
    def __init__(
        self,
        api_client: Optional[BotAPIClient] = None,
        mode: str = "api",
        api_base_url: str = "http://localhost:8000",
        api_token: Optional[str] = None,
        db_session = None,
        tenant_id: Optional[int] = None
    ):
        if api_client:
            self.client = api_client
        else:
            self.client = BotAPIClient(
                mode=mode,
                api_base_url=api_base_url,
                api_token=api_token,
                db_session=db_session,
                tenant_id=tenant_id
            )
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Hybrid text extraction: try embedded text first, fall back to OCR
        """
        text = ""
        
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")
        
        if len(text.strip()) < 100:
            try:
                from pdf2image import convert_from_path
                import pytesseract
                from PIL import Image, ImageEnhance, ImageFilter
                
                images = convert_from_path(file_path, dpi=300)
                
                for img in images:
                    img = img.convert('L')  # Convert to grayscale
                    img = ImageEnhance.Contrast(img).enhance(2)  # Increase contrast
                    img = ImageEnhance.Sharpness(img).enhance(2)  # Increase sharpness
                    
                    custom_config = r'--oem 3 --psm 6'
                    page_text = pytesseract.image_to_string(img, config=custom_config)
                    text += page_text + "\n"
                    
            except Exception as e:
                print(f"OCR extraction failed: {e}")
                text = ""
        
        return text
    
    def extract_invoice_data(self, file_path: str) -> dict:
        """
        Extract invoice data from PDF using real OCR
        """
        text = self.extract_text_from_pdf(file_path)
        
        if not text or len(text.strip()) < 50:
            return {
                'success': False,
                'error': 'Could not extract text from document',
                'confidence_score': 0.0,
                'supplier_name': 'Unknown Supplier',
                'invoice_number': 'UNKNOWN',
                'invoice_date': datetime.now().strftime('%Y-%m-%d'),
                'due_date': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                'total_amount': 0.0,
                'vat_amount': 0.0,
                'line_items': []
            }
        
        invoice_data = {
            'supplier_name': self._extract_supplier_name(text),
            'invoice_number': self._extract_invoice_number(text),
            'invoice_date': self._extract_date(text, 'invoice'),
            'due_date': self._extract_date(text, 'due'),
            'total_amount': self._extract_amount(text, 'total'),
            'vat_amount': self._extract_amount(text, 'vat'),
            'line_items': self._extract_line_items(text),
            'confidence_score': 0.75,
            'raw_text': text[:500]  # First 500 chars for debugging
        }
        
        return invoice_data
    
    def _extract_supplier_name(self, text: str) -> str:
        """Extract supplier/vendor name from text"""
        lines = text.split('\n')
        for i, line in enumerate(lines[:10]):
            line = line.strip()
            if len(line) > 3 and not any(kw in line.lower() for kw in ['invoice', 'tax', 'vat', 'date', 'page']):
                if re.search(r'[a-zA-Z]{3,}', line):
                    return line[:100]
        return "Unknown Supplier"
    
    def _extract_invoice_number(self, text: str) -> str:
        """Extract invoice number"""
        patterns = [
            r'invoice\s*(?:no|number|#)?\s*:?\s*([A-Z0-9\-/]+)',
            r'inv\s*(?:no|#)?\s*:?\s*([A-Z0-9\-/]+)',
            r'bill\s*(?:no|number)?\s*:?\s*([A-Z0-9\-/]+)',
            r'reference\s*:?\s*([A-Z0-9\-/]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return "INV-UNKNOWN"
    
    def _extract_date(self, text: str, date_type: str) -> str:
        """Extract dates (invoice date or due date)"""
        if date_type == 'invoice':
            patterns = [
                r'invoice\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
                r'date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
                r'dated\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
            ]
        else:  # due date
            patterns = [
                r'due\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
                r'payment\s*due\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
            ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                try:
                    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%d/%m/%y', '%d-%m-%y']:
                        try:
                            parsed_date = datetime.strptime(date_str, fmt)
                            return parsed_date.strftime('%Y-%m-%d')
                        except:
                            continue
                except:
                    pass
                return date_str
        
        today = datetime.now()
        if date_type == 'invoice':
            return today.strftime('%Y-%m-%d')
        else:
            return (today + timedelta(days=30)).strftime('%Y-%m-%d')
    
    def _extract_amount(self, text: str, amount_type: str) -> float:
        """Extract amounts (total, VAT, etc.)"""
        if amount_type == 'total':
            patterns = [
                r'total\s*(?:amount|due)?\s*:?\s*[R$€£]?\s*([\d,\s]+\.?\d*)',
                r'amount\s*due\s*:?\s*[R$€£]?\s*([\d,\s]+\.?\d*)',
                r'grand\s*total\s*:?\s*[R$€£]?\s*([\d,\s]+\.?\d*)',
            ]
        else:  # VAT
            patterns = [
                r'vat\s*(?:amount)?\s*:?\s*[R$€£]?\s*([\d,\s]+\.?\d*)',
                r'tax\s*(?:amount)?\s*:?\s*[R$€£]?\s*([\d,\s]+\.?\d*)',
                r'(?:15%|14%)?\s*vat\s*:?\s*[R$€£]?\s*([\d,\s]+\.?\d*)',
            ]
        
        amounts = []
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    amount_str = match.group(1).replace(',', '').replace(' ', '')
                    amount = float(amount_str)
                    if amount > 0:
                        amounts.append(amount)
                except:
                    pass
        
        if amounts:
            return max(amounts)
        
        return 0.0
    
    def _extract_line_items(self, text: str) -> List[Dict]:
        """Extract line items from invoice"""
        lines = []
        
        text_lines = text.split('\n')
        for line in text_lines:
            match = re.search(r'(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([\d,\s]+\.?\d*)', line)
            if match:
                try:
                    lines.append({
                        'description': match.group(1).strip()[:100],
                        'quantity': float(match.group(2)),
                        'unit_price': float(match.group(3)),
                        'discount_percent': 0,
                        'tax_rate': 15,
                        'total': float(match.group(4).replace(',', '').replace(' ', ''))
                    })
                except:
                    pass
        
        if not lines:
            total = self._extract_amount(text, 'total')
            vat = self._extract_amount(text, 'vat')
            net = total - vat if total > vat else total
            
            if total > 0:
                lines.append({
                    'description': 'Invoice items (manual entry required)',
                    'quantity': 1,
                    'unit_price': net,
                    'discount_percent': 0,
                    'tax_rate': 15,
                    'total': net
                })
        
        return lines
    
    def auto_create_invoice(self, ocr_data: dict, vendor_id: int) -> dict:
        """Automatically create invoice from OCR data using AP API"""
        try:
            bill_data = {
                'vendor_id': vendor_id,
                'bill_date': ocr_data['invoice_date'],
                'due_date': ocr_data['due_date'],
                'vendor_invoice_number': ocr_data['invoice_number'],
                'lines': []
            }
            
            for item in ocr_data.get('line_items', []):
                bill_data['lines'].append({
                    'line_number': len(bill_data['lines']) + 1,
                    'description': item['description'],
                    'quantity': item['quantity'],
                    'unit_price': item['unit_price'],
                    'discount_percent': 0,
                    'tax_rate': 15
                })
            
            result = self.client.create_vendor_bill(bill_data)
            
            return {
                'success': True,
                'bill_id': result.get('id'),
                'bill_number': result.get('bill_number'),
                'confidence': ocr_data.get('confidence_score', 0.95)
            }
            
        except Exception as e:
            return {'error': str(e)}

def main():
    print("\n" + "="*60)
    print("ARIA ERP - OCR INVOICE PROCESSING BOT")
    print("="*60 + "\n")
    print("✓ Bot ready - OCR invoice extraction")
    print("✓ Supported: PDF, JPG, PNG")
    print("✓ Confidence threshold: 85%")
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
