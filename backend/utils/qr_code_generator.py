"""
QR Code Generator Utility

Generates QR codes for documents (invoices, delivery notes, etc.)
for verification and tracking purposes.
"""

import qrcode
from io import BytesIO
from typing import Optional
import base64


class QRCodeGenerator:
    """Generate QR codes for document verification"""
    
    @staticmethod
    def generate_qr_code(
        data: str,
        box_size: int = 10,
        border: int = 4,
        fill_color: str = "black",
        back_color: str = "white"
    ) -> bytes:
        """
        Generate QR code as PNG bytes
        
        Args:
            data: Data to encode in QR code (usually document URL or ID)
            box_size: Size of each box in pixels
            border: Border size in boxes
            fill_color: QR code color
            back_color: Background color
            
        Returns:
            PNG image bytes
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=box_size,
            border=border,
        )
        
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color=fill_color, back_color=back_color)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return buffer.getvalue()
    
    @staticmethod
    def generate_qr_code_base64(
        data: str,
        box_size: int = 10,
        border: int = 4
    ) -> str:
        """
        Generate QR code as base64 string for embedding in HTML/PDF
        
        Args:
            data: Data to encode in QR code
            box_size: Size of each box in pixels
            border: Border size in boxes
            
        Returns:
            Base64 encoded PNG image string
        """
        qr_bytes = QRCodeGenerator.generate_qr_code(data, box_size, border)
        return base64.b64encode(qr_bytes).decode('utf-8')
    
    @staticmethod
    def generate_document_qr_url(
        base_url: str,
        document_type: str,
        document_id: str,
        company_id: Optional[str] = None
    ) -> str:
        """
        Generate verification URL for document QR code
        
        Args:
            base_url: Base URL of the application (e.g., https://aria.vantax.co.za)
            document_type: Type of document (invoice, delivery_note, po, etc.)
            document_id: Unique document ID
            company_id: Optional company ID for multi-tenant
            
        Returns:
            Verification URL
        """
        url = f"{base_url}/verify/{document_type}/{document_id}"
        if company_id:
            url += f"?company={company_id}"
        return url
    
    @staticmethod
    def generate_document_qr_code(
        base_url: str,
        document_type: str,
        document_id: str,
        company_id: Optional[str] = None,
        as_base64: bool = True
    ) -> str:
        """
        Generate QR code for document verification
        
        Args:
            base_url: Base URL of the application
            document_type: Type of document
            document_id: Unique document ID
            company_id: Optional company ID
            as_base64: Return as base64 string (True) or bytes (False)
            
        Returns:
            QR code as base64 string or bytes
        """
        url = QRCodeGenerator.generate_document_qr_url(
            base_url, document_type, document_id, company_id
        )
        
        if as_base64:
            return QRCodeGenerator.generate_qr_code_base64(url)
        else:
            return QRCodeGenerator.generate_qr_code(url)


# Example usage
if __name__ == "__main__":
    qr_base64 = QRCodeGenerator.generate_document_qr_code(
        base_url="https://aria.vantax.co.za",
        document_type="invoice",
        document_id="INV-2025-001",
        company_id="company-uuid-123"
    )
    
    print(f"QR Code Base64 (first 100 chars): {qr_base64[:100]}...")
    
    qr_bytes = QRCodeGenerator.generate_qr_code("https://aria.vantax.co.za")
    print(f"QR Code size: {len(qr_bytes)} bytes")
