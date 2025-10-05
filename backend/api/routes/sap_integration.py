"""
SAP Integration API Routes
Handles document posting to SAP systems
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
import json
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sap", tags=["SAP Integration"])

class SAPDocumentRequest(BaseModel):
    document_id: str
    filename: str
    extracted_data: Dict[str, Any]
    text_content: str
    document_type: Optional[str] = "invoice"
    vendor_info: Optional[Dict[str, Any]] = None
    amount_info: Optional[Dict[str, Any]] = None

class SAPResponse(BaseModel):
    success: bool
    sap_document_id: Optional[str] = None
    posting_date: Optional[str] = None
    message: str
    details: Optional[Dict[str, Any]] = None

# SAP Configuration (would be loaded from environment variables in production)
SAP_CONFIG = {
    "base_url": "https://your-sap-system.com/api",
    "client": "100",
    "username": "ARIA_USER",
    "password": "your_password",  # Use secure credential management
    "company_code": "1000",
    "document_type": "KR",  # Vendor Invoice
    "posting_key": "31"     # Vendor Line Item
}

def extract_invoice_data(extracted_data: Dict[str, Any], text_content: str) -> Dict[str, Any]:
    """
    Extract structured invoice data from OCR results
    This would use AI/ML models to identify key fields
    """
    invoice_data = {
        "vendor_name": "",
        "vendor_code": "",
        "invoice_number": "",
        "invoice_date": "",
        "due_date": "",
        "total_amount": 0.0,
        "currency": "ZAR",
        "tax_amount": 0.0,
        "net_amount": 0.0,
        "line_items": []
    }
    
    # Simple text parsing (in production, use advanced NLP/AI models)
    lines = text_content.split('\n')
    
    for line in lines:
        line_lower = line.lower().strip()
        
        # Extract vendor information
        if 'vendor' in line_lower or 'supplier' in line_lower:
            invoice_data["vendor_name"] = line.strip()
        
        # Extract invoice number
        if 'invoice' in line_lower and ('no' in line_lower or 'number' in line_lower):
            # Extract number from line
            import re
            numbers = re.findall(r'\d+', line)
            if numbers:
                invoice_data["invoice_number"] = numbers[-1]
        
        # Extract amounts
        if 'total' in line_lower or 'amount' in line_lower:
            import re
            amounts = re.findall(r'[\d,]+\.?\d*', line)
            if amounts:
                try:
                    amount = float(amounts[-1].replace(',', ''))
                    if amount > invoice_data["total_amount"]:
                        invoice_data["total_amount"] = amount
                except ValueError:
                    pass
        
        # Extract dates
        if 'date' in line_lower:
            import re
            date_patterns = [
                r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
                r'\d{2,4}[/-]\d{1,2}[/-]\d{1,2}'
            ]
            for pattern in date_patterns:
                dates = re.findall(pattern, line)
                if dates and not invoice_data["invoice_date"]:
                    invoice_data["invoice_date"] = dates[0]
                    break
    
    # Set default values if not found
    if not invoice_data["vendor_code"]:
        invoice_data["vendor_code"] = "VENDOR001"  # Default vendor code
    
    if not invoice_data["invoice_date"]:
        invoice_data["invoice_date"] = datetime.now().strftime("%Y-%m-%d")
    
    if not invoice_data["due_date"]:
        # Set due date 30 days from invoice date
        from datetime import datetime, timedelta
        try:
            inv_date = datetime.strptime(invoice_data["invoice_date"], "%Y-%m-%d")
            due_date = inv_date + timedelta(days=30)
            invoice_data["due_date"] = due_date.strftime("%Y-%m-%d")
        except:
            invoice_data["due_date"] = datetime.now().strftime("%Y-%m-%d")
    
    # Calculate net amount (assuming 15% VAT)
    if invoice_data["total_amount"] > 0:
        invoice_data["tax_amount"] = round(invoice_data["total_amount"] * 0.15, 2)
        invoice_data["net_amount"] = round(invoice_data["total_amount"] - invoice_data["tax_amount"], 2)
    
    return invoice_data

def create_sap_document_payload(invoice_data: Dict[str, Any], filename: str) -> Dict[str, Any]:
    """
    Create SAP document posting payload
    """
    return {
        "DocumentHeader": {
            "CompanyCode": SAP_CONFIG["company_code"],
            "DocumentType": SAP_CONFIG["document_type"],
            "DocumentDate": invoice_data["invoice_date"],
            "PostingDate": datetime.now().strftime("%Y-%m-%d"),
            "Reference": invoice_data["invoice_number"] or filename,
            "DocumentHeaderText": f"ARIA Auto-Posted: {filename}",
            "Currency": invoice_data["currency"]
        },
        "AccountingDocumentItems": [
            {
                "GLAccount": "2100000",  # Accounts Payable
                "PostingKey": "21",      # Vendor Credit
                "DocumentItemText": f"Invoice: {invoice_data['invoice_number']}",
                "AmountInDocumentCurrency": invoice_data["total_amount"],
                "Vendor": invoice_data["vendor_code"],
                "PaymentTerms": "Z030",  # 30 days payment terms
                "BaselineDate": invoice_data["due_date"]
            },
            {
                "GLAccount": "5000000",  # Expense Account
                "PostingKey": "40",      # Debit
                "DocumentItemText": "Expense - Auto Posted",
                "AmountInDocumentCurrency": invoice_data["net_amount"]
            },
            {
                "GLAccount": "1540000",  # Input VAT
                "PostingKey": "40",      # Debit
                "DocumentItemText": "Input VAT",
                "AmountInDocumentCurrency": invoice_data["tax_amount"],
                "TaxCode": "V1"         # Input VAT code
            }
        ]
    }

async def post_to_sap_system(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Post document to SAP system via API
    In production, this would connect to actual SAP system
    """
    try:
        # Simulate SAP API call
        # In production, use SAP OData services or RFC calls
        
        # Mock SAP response for demonstration
        sap_response = {
            "success": True,
            "document_number": f"5100000{datetime.now().strftime('%H%M%S')}",
            "fiscal_year": datetime.now().year,
            "company_code": SAP_CONFIG["company_code"],
            "posting_date": datetime.now().strftime("%Y-%m-%d"),
            "message": "Document posted successfully to SAP"
        }
        
        logger.info(f"SAP document posted: {sap_response['document_number']}")
        return sap_response
        
    except Exception as e:
        logger.error(f"SAP posting failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to post document to SAP: {str(e)}"
        )

@router.post("/post-document", response_model=SAPResponse)
async def post_document_to_sap(
    request: SAPDocumentRequest,
    background_tasks: BackgroundTasks
):
    """
    Post a processed document to SAP system
    """
    try:
        logger.info(f"Processing SAP posting for document: {request.filename}")
        
        # Extract structured invoice data
        invoice_data = extract_invoice_data(request.extracted_data, request.text_content)
        
        # Create SAP document payload
        sap_payload = create_sap_document_payload(invoice_data, request.filename)
        
        # Post to SAP system
        sap_result = await post_to_sap_system(sap_payload)
        
        # Return success response
        return SAPResponse(
            success=True,
            sap_document_id=sap_result["document_number"],
            posting_date=sap_result["posting_date"],
            message="Document successfully posted to SAP",
            details={
                "invoice_data": invoice_data,
                "sap_response": sap_result
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SAP integration error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"SAP integration failed: {str(e)}"
        )

@router.get("/status/{document_id}")
async def get_sap_status(document_id: str):
    """
    Get SAP posting status for a document
    """
    try:
        # In production, query SAP system for document status
        return {
            "document_id": document_id,
            "sap_status": "posted",
            "sap_document_number": f"5100000{document_id[-6:]}",
            "posting_date": datetime.now().strftime("%Y-%m-%d"),
            "status_message": "Document successfully posted to SAP"
        }
    except Exception as e:
        logger.error(f"SAP status check failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check SAP status: {str(e)}"
        )

@router.get("/vendors")
async def get_sap_vendors():
    """
    Get list of vendors from SAP system
    """
    try:
        # Mock vendor data - in production, fetch from SAP
        vendors = [
            {"code": "VENDOR001", "name": "ABC Suppliers Ltd", "payment_terms": "Z030"},
            {"code": "VENDOR002", "name": "XYZ Services", "payment_terms": "Z014"},
            {"code": "VENDOR003", "name": "Tech Solutions Inc", "payment_terms": "Z030"},
        ]
        
        return {"vendors": vendors}
    except Exception as e:
        logger.error(f"Failed to fetch SAP vendors: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch vendors: {str(e)}"
        )

@router.get("/gl-accounts")
async def get_gl_accounts():
    """
    Get list of GL accounts from SAP system
    """
    try:
        # Mock GL account data - in production, fetch from SAP
        gl_accounts = [
            {"account": "5000000", "description": "General Expenses", "account_type": "P&L"},
            {"account": "5100000", "description": "Office Supplies", "account_type": "P&L"},
            {"account": "5200000", "description": "Travel Expenses", "account_type": "P&L"},
            {"account": "2100000", "description": "Accounts Payable", "account_type": "Balance Sheet"},
            {"account": "1540000", "description": "Input VAT", "account_type": "Balance Sheet"},
        ]
        
        return {"gl_accounts": gl_accounts}
    except Exception as e:
        logger.error(f"Failed to fetch GL accounts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch GL accounts: {str(e)}"
        )