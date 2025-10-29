"""
Intelligent Document Parser for Aria
=====================================

Uses OCR and AI to:
1. Extract text from PDFs, images, scans
2. Classify document types
3. Extract structured data (invoices, POs, etc.)
4. Validate extracted data

Integrates with:
- Tesseract OCR (open source)
- Azure Form Recognizer (cloud)
- OpenAI GPT-4 Vision (AI classification)

Author: Aria ERP Team
Date: 2025-10-29
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date
from enum import Enum
from decimal import Decimal
import logging
import re
import base64
import io

logger = logging.getLogger(__name__)


class DocumentType(str, Enum):
    INVOICE = "invoice"
    PURCHASE_ORDER = "purchase_order"
    QUOTE = "quote"
    DELIVERY_NOTE = "delivery_note"
    PAYSLIP = "payslip"
    STATEMENT = "statement"
    CREDIT_NOTE = "credit_note"
    RECEIPT = "receipt"
    UNKNOWN = "unknown"


class DocumentParser:
    """
    Intelligent document parser that extracts structured data
    from various document types.
    """
    
    def __init__(
        self,
        ocr_engine: str = "tesseract",
        azure_endpoint: Optional[str] = None,
        azure_key: Optional[str] = None,
        openai_key: Optional[str] = None
    ):
        """
        Initialize document parser.
        
        Args:
            ocr_engine: OCR engine to use (tesseract, azure, openai)
            azure_endpoint: Azure Form Recognizer endpoint
            azure_key: Azure Form Recognizer key
            openai_key: OpenAI API key
        """
        self.ocr_engine = ocr_engine
        self.azure_endpoint = azure_endpoint
        self.azure_key = azure_key
        self.openai_key = openai_key
    
    async def parse_document(
        self,
        file_content: bytes,
        filename: str,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Parse a document and extract structured data.
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            content_type: MIME type
            
        Returns:
            Parsed document data with classification and extracted fields
        """
        logger.info(f"DocParser: Parsing {filename} ({content_type})")
        
        # Step 1: Extract text using OCR
        extracted_text = await self._extract_text(file_content, content_type)
        
        # Step 2: Classify document type
        doc_type, confidence = await self._classify_document(extracted_text, filename)
        
        # Step 3: Extract structured data based on document type
        structured_data = await self._extract_structured_data(
            extracted_text,
            doc_type,
            file_content,
            content_type
        )
        
        # Step 4: Validate extracted data
        validation_result = self._validate_data(structured_data, doc_type)
        
        return {
            "filename": filename,
            "document_type": doc_type.value,
            "confidence": confidence,
            "extracted_text": extracted_text[:1000],  # First 1000 chars
            "structured_data": structured_data,
            "validation": validation_result,
            "parsed_at": datetime.now().isoformat()
        }
    
    async def _extract_text(self, file_content: bytes, content_type: str) -> str:
        """Extract text from document using OCR"""
        try:
            if self.ocr_engine == "azure":
                return await self._azure_ocr(file_content)
            elif self.ocr_engine == "openai":
                return await self._openai_vision_ocr(file_content)
            else:
                return await self._tesseract_ocr(file_content, content_type)
        except Exception as e:
            logger.error(f"DocParser: OCR failed: {str(e)}")
            return ""
    
    async def _tesseract_ocr(self, file_content: bytes, content_type: str) -> str:
        """
        Extract text using Tesseract OCR (open source).
        
        Requires: pytesseract, Pillow, pdf2image
        """
        try:
            # This would integrate with Tesseract
            # For now, placeholder
            return "Extracted text using Tesseract OCR..."
        except Exception as e:
            logger.error(f"DocParser: Tesseract OCR error: {str(e)}")
            return ""
    
    async def _azure_ocr(self, file_content: bytes) -> str:
        """
        Extract text using Azure Form Recognizer (cloud).
        
        Very accurate for invoices and forms.
        """
        try:
            import aiohttp
            
            url = f"{self.azure_endpoint}/formrecognizer/documentModels/prebuilt-invoice:analyze?api-version=2023-07-31"
            
            headers = {
                "Ocp-Apim-Subscription-Key": self.azure_key,
                "Content-Type": "application/pdf"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, data=file_content) as response:
                    if response.status == 202:
                        # Get operation location
                        operation_url = response.headers.get("Operation-Location")
                        
                        # Poll for results
                        import asyncio
                        await asyncio.sleep(2)
                        
                        async with session.get(operation_url, headers={"Ocp-Apim-Subscription-Key": self.azure_key}) as result_response:
                            if result_response.status == 200:
                                result = await result_response.json()
                                
                                # Extract text content
                                pages = result.get("analyzeResult", {}).get("pages", [])
                                text = " ".join([page.get("content", "") for page in pages])
                                return text
            
            return ""
        except Exception as e:
            logger.error(f"DocParser: Azure OCR error: {str(e)}")
            return ""
    
    async def _openai_vision_ocr(self, file_content: bytes) -> str:
        """
        Extract text using OpenAI GPT-4 Vision.
        
        Can understand complex layouts and handwriting.
        """
        try:
            import aiohttp
            
            # Convert to base64
            base64_image = base64.b64encode(file_content).decode()
            
            url = "https://api.openai.com/v1/chat/completions"
            
            headers = {
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": "gpt-4-vision-preview",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Extract all text from this document. Return only the text content."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 4000
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        text = result["choices"][0]["message"]["content"]
                        return text
            
            return ""
        except Exception as e:
            logger.error(f"DocParser: OpenAI Vision error: {str(e)}")
            return ""
    
    async def _classify_document(self, text: str, filename: str) -> Tuple[DocumentType, float]:
        """
        Classify document type using text analysis and filename.
        
        Returns:
            (DocumentType, confidence_score)
        """
        text_lower = text.lower()
        filename_lower = filename.lower()
        
        # Keyword-based classification (can be enhanced with ML)
        scores = {
            DocumentType.INVOICE: 0.0,
            DocumentType.PURCHASE_ORDER: 0.0,
            DocumentType.QUOTE: 0.0,
            DocumentType.DELIVERY_NOTE: 0.0,
            DocumentType.PAYSLIP: 0.0,
            DocumentType.STATEMENT: 0.0,
            DocumentType.CREDIT_NOTE: 0.0,
            DocumentType.RECEIPT: 0.0
        }
        
        # Invoice keywords
        if any(kw in text_lower for kw in ["tax invoice", "invoice number", "vat number", "amount due"]):
            scores[DocumentType.INVOICE] += 0.6
        if any(kw in filename_lower for kw in ["invoice", "inv"]):
            scores[DocumentType.INVOICE] += 0.3
        
        # Purchase Order keywords
        if any(kw in text_lower for kw in ["purchase order", "po number", "order number"]):
            scores[DocumentType.PURCHASE_ORDER] += 0.6
        if any(kw in filename_lower for kw in ["purchase", "po", "order"]):
            scores[DocumentType.PURCHASE_ORDER] += 0.3
        
        # Quote/Quotation keywords
        if any(kw in text_lower for kw in ["quotation", "quote number", "valid until"]):
            scores[DocumentType.QUOTE] += 0.6
        if any(kw in filename_lower for kw in ["quote", "quotation"]):
            scores[DocumentType.QUOTE] += 0.3
        
        # Delivery Note keywords
        if any(kw in text_lower for kw in ["delivery note", "goods received", "delivery date"]):
            scores[DocumentType.DELIVERY_NOTE] += 0.6
        if any(kw in filename_lower for kw in ["delivery", "dn", "grn"]):
            scores[DocumentType.DELIVERY_NOTE] += 0.3
        
        # Payslip keywords
        if any(kw in text_lower for kw in ["payslip", "salary", "basic salary", "paye", "uif"]):
            scores[DocumentType.PAYSLIP] += 0.6
        if any(kw in filename_lower for kw in ["payslip", "salary"]):
            scores[DocumentType.PAYSLIP] += 0.3
        
        # Get highest score
        max_type = max(scores, key=scores.get)
        max_score = scores[max_type]
        
        if max_score < 0.3:
            return DocumentType.UNKNOWN, 0.0
        
        return max_type, min(max_score, 1.0)
    
    async def _extract_structured_data(
        self,
        text: str,
        doc_type: DocumentType,
        file_content: bytes,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Extract structured data based on document type.
        """
        if doc_type == DocumentType.INVOICE:
            return self._extract_invoice_data(text)
        elif doc_type == DocumentType.PURCHASE_ORDER:
            return self._extract_po_data(text)
        elif doc_type == DocumentType.QUOTE:
            return self._extract_quote_data(text)
        elif doc_type == DocumentType.PAYSLIP:
            return self._extract_payslip_data(text)
        else:
            return {"raw_text": text}
    
    def _extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extract structured data from invoice"""
        data = {}
        
        # Extract invoice number
        invoice_pattern = r"invoice\s*(?:number|no|#)?[:\s]*([A-Z0-9-]+)"
        match = re.search(invoice_pattern, text, re.IGNORECASE)
        if match:
            data["invoice_number"] = match.group(1).strip()
        
        # Extract invoice date
        date_pattern = r"(?:date|dated)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})"
        match = re.search(date_pattern, text, re.IGNORECASE)
        if match:
            data["invoice_date"] = match.group(1)
        
        # Extract total amount
        total_pattern = r"(?:total|amount due|balance)[:\s]*R?\s*(\d+[,\s]?\d*\.?\d{2})"
        match = re.search(total_pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(",", "").replace(" ", "")
            try:
                data["total_amount"] = float(amount_str)
            except ValueError:
                pass
        
        # Extract VAT number
        vat_pattern = r"VAT\s*(?:NO|NUMBER)?[:\s]*(\d{10})"
        match = re.search(vat_pattern, text, re.IGNORECASE)
        if match:
            data["vat_number"] = match.group(1)
        
        # Extract supplier name (usually at the top)
        lines = text.split("\n")[:5]  # First 5 lines
        for line in lines:
            if len(line.strip()) > 3 and not any(kw in line.lower() for kw in ["invoice", "date", "page"]):
                data["supplier_name"] = line.strip()
                break
        
        return data
    
    def _extract_po_data(self, text: str) -> Dict[str, Any]:
        """Extract structured data from purchase order"""
        data = {}
        
        # Extract PO number
        po_pattern = r"(?:purchase order|po|order)(?:\s*number|\s*no|\s*#)?[:\s]*([A-Z0-9-]+)"
        match = re.search(po_pattern, text, re.IGNORECASE)
        if match:
            data["po_number"] = match.group(1).strip()
        
        # Extract date
        date_pattern = r"(?:date|dated)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})"
        match = re.search(date_pattern, text, re.IGNORECASE)
        if match:
            data["po_date"] = match.group(1)
        
        # Extract supplier name
        supplier_pattern = r"(?:supplier|vendor)[:\s]*(.+?)(?:\n|$)"
        match = re.search(supplier_pattern, text, re.IGNORECASE)
        if match:
            data["supplier_name"] = match.group(1).strip()
        
        return data
    
    def _extract_quote_data(self, text: str) -> Dict[str, Any]:
        """Extract structured data from quotation"""
        data = {}
        
        # Extract quote number
        quote_pattern = r"(?:quote|quotation)(?:\s*number|\s*no|\s*#)?[:\s]*([A-Z0-9-]+)"
        match = re.search(quote_pattern, text, re.IGNORECASE)
        if match:
            data["quote_number"] = match.group(1).strip()
        
        # Extract valid until date
        valid_pattern = r"valid(?:\s*until|\s*till)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})"
        match = re.search(valid_pattern, text, re.IGNORECASE)
        if match:
            data["valid_until"] = match.group(1)
        
        return data
    
    def _extract_payslip_data(self, text: str) -> Dict[str, Any]:
        """Extract structured data from payslip"""
        data = {}
        
        # Extract employee name
        name_pattern = r"(?:employee|name)[:\s]*(.+?)(?:\n|$)"
        match = re.search(name_pattern, text, re.IGNORECASE)
        if match:
            data["employee_name"] = match.group(1).strip()
        
        # Extract period
        period_pattern = r"(?:period|pay period)[:\s]*(.+?)(?:\n|$)"
        match = re.search(period_pattern, text, re.IGNORECASE)
        if match:
            data["pay_period"] = match.group(1).strip()
        
        # Extract net pay
        net_pattern = r"(?:net pay|take home)[:\s]*R?\s*(\d+[,\s]?\d*\.?\d{2})"
        match = re.search(net_pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(",", "").replace(" ", "")
            try:
                data["net_pay"] = float(amount_str)
            except ValueError:
                pass
        
        return data
    
    def _validate_data(self, data: Dict[str, Any], doc_type: DocumentType) -> Dict[str, Any]:
        """
        Validate extracted data.
        
        Returns validation result with errors/warnings.
        """
        errors = []
        warnings = []
        
        if doc_type == DocumentType.INVOICE:
            if "invoice_number" not in data:
                errors.append("Missing invoice number")
            if "total_amount" not in data:
                errors.append("Missing total amount")
            if "supplier_name" not in data:
                warnings.append("Supplier name not extracted")
        
        elif doc_type == DocumentType.PURCHASE_ORDER:
            if "po_number" not in data:
                errors.append("Missing PO number")
            if "supplier_name" not in data:
                warnings.append("Supplier name not extracted")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "completeness_score": self._calculate_completeness(data, doc_type)
        }
    
    def _calculate_completeness(self, data: Dict[str, Any], doc_type: DocumentType) -> float:
        """Calculate how complete the extracted data is"""
        if doc_type == DocumentType.INVOICE:
            required_fields = ["invoice_number", "invoice_date", "total_amount", "supplier_name", "vat_number"]
        elif doc_type == DocumentType.PURCHASE_ORDER:
            required_fields = ["po_number", "po_date", "supplier_name"]
        else:
            return 1.0
        
        present = sum(1 for field in required_fields if field in data)
        return round(present / len(required_fields), 2)


# Singleton instance
document_parser = DocumentParser()
