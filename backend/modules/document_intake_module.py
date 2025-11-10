"""
ARIA Document Intake Module
Comprehensive document processing with vendor-specific parsers and SAP/AriaERP posting
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import os
import tempfile
import hashlib
import pandas as pd
import json
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/aria/documents", tags=["Document Intake"])


# ========================================
# REQUEST/RESPONSE MODELS
# ========================================

class DocumentIntakeResponse(BaseModel):
    document_id: str
    filename: str
    file_hash: str
    file_size: int
    uploaded_at: str
    vendor: Optional[str] = None
    document_type: str
    confidence: float
    company_id: Optional[str] = None
    summary: Dict[str, Any]
    parsed_data: Dict[str, Any]
    suggested_action: str  # 'sap' or 'aria'
    status: str  # 'parsed', 'error'


class DocumentPostRequest(BaseModel):
    target: str  # 'sap' or 'aria'
    dry_run: bool = False
    company_id: Optional[str] = None


class DocumentPostResponse(BaseModel):
    document_id: str
    target: str
    status: str  # 'posted', 'exported', 'error'
    posted_at: Optional[str] = None
    transaction_ids: List[str] = []
    export_file: Optional[str] = None
    errors: List[str] = []


# ========================================
# ========================================

class VendorAdapter:
    """Base class for vendor-specific document parsers"""
    
    @staticmethod
    def detect(df: pd.DataFrame, filename: str) -> float:
        """Return confidence score (0-1) that this is the correct vendor"""
        return 0.0
    
    @staticmethod
    def parse(df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """Parse document and return structured data"""
        return {}


class PnPRemittanceAdapter(VendorAdapter):
    """Pick n Pay remittance advice parser"""
    
    @staticmethod
    def detect(df: pd.DataFrame, filename: str) -> float:
        confidence = 0.0
        
        if 'PnP' in filename or 'pnp' in filename.lower():
            confidence += 0.3
        
        columns = [str(c).lower() for c in df.columns]
        if 'level' in columns and 'lineitem' in columns:
            confidence += 0.4
        if 'pnp reference' in columns or any('pnp' in c for c in columns):
            confidence += 0.3
        
        return min(confidence, 1.0)
    
    @staticmethod
    def parse(df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """Parse PnP hierarchical remittance structure"""
        result = {
            'vendor': 'PnP',
            'document_type': 'remittance_advice',
            'invoices': [],
            'total_amount': 0.0,
            'currency': 'ZAR'
        }
        
        header_rows = df[df['Level'] == 1]
        if not header_rows.empty:
            header = header_rows.iloc[0]
            result['total_amount'] = float(header.get('Net Amount', 0) or 0)
            result['currency'] = str(header.get('Currency', 'ZAR'))
            result['payment_date'] = str(header.get('Date', ''))
            result['pnp_reference'] = str(header.get('PnP Reference', ''))
        
        current_invoice = None
        
        for idx, row in df.iterrows():
            level = row.get('Level')
            
            if level == 2:  # Invoice line
                if current_invoice:
                    result['invoices'].append(current_invoice)
                
                current_invoice = {
                    'store_code': str(row.get('PnP Vendor / Store Code', '')),
                    'store_description': str(row.get('STORE DESCRIPTION', '')),
                    'invoice_date': str(row.get('Date', '')),
                    'document_type': str(row.get('Document Type', '')),
                    'pnp_reference': str(row.get('PnP Reference', '')),
                    'vendor_reference': str(row.get('Vendor Reference', '')),
                    'original_amount': float(row.get('Original Amount', 0) or 0),
                    'net_amount': float(row.get('Net Amount', 0) or 0),
                    'deductions': []
                }
            
            elif level == 3 and current_invoice:  # Deduction line
                deduction = {
                    'type': str(row.get('Document Type', '')),
                    'reference': str(row.get('PnP Reference', '')),
                    'amount': float(row.get('Adjustment Amount', 0) or 0)
                }
                current_invoice['deductions'].append(deduction)
        
        if current_invoice:
            result['invoices'].append(current_invoice)
        
        return result


class UMSRemittanceAdapter(VendorAdapter):
    """UMS remittance advice parser"""
    
    @staticmethod
    def detect(df: pd.DataFrame, filename: str) -> float:
        confidence = 0.0
        
        if 'UMS' in filename or 'ums' in filename.lower():
            confidence += 0.3
        
        columns = [str(c).lower() for c in df.columns]
        if 'type' in columns and 'supplier ref' in columns:
            confidence += 0.3
        
        if 'Type' in df.columns:
            types = df['Type'].dropna().unique()
            if any(t in ['ES', 'RE', 'KG'] for t in types):
                confidence += 0.4
        
        return min(confidence, 1.0)
    
    @staticmethod
    def parse(df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """Parse UMS flat remittance structure"""
        result = {
            'vendor': 'UMS',
            'document_type': 'remittance_advice',
            'transactions': [],
            'total_amount': 0.0,
            'currency': 'ZAR'
        }
        
        for idx, row in df.iterrows():
            trans_type = str(row.get('Type', ''))
            
            if trans_type in ['ES', 'RE', 'KG']:
                transaction = {
                    'type': trans_type,
                    'document_no': str(row.get('Document No', '')),
                    'document_date': str(row.get('Document Date', '')),
                    'store_ref': str(row.get('Store Ref', '')),
                    'supplier_ref': str(row.get('Supplier Ref', '')),
                    'reference_text': str(row.get('Reference Text', '')),
                    'store_title': str(row.get('Store Title', '')),
                    'gross': float(row.get('Gross', 0) or 0),
                    'discount': float(row.get('Discount', 0) or 0),
                    'nett': float(row.get('Nett', 0) or 0)
                }
                result['transactions'].append(transaction)
                
                if trans_type == 'KG':
                    result['total_amount'] += transaction['nett']
        
        return result


class ShopriteRemittanceAdapter(VendorAdapter):
    """Shoprite remittance advice parser"""
    
    @staticmethod
    def detect(df: pd.DataFrame, filename: str) -> float:
        confidence = 0.0
        
        if 'shoprite' in filename.lower():
            confidence += 0.3
        
        if df.shape[1] >= 10:
            first_cols = df.columns[:3]
            if all(isinstance(c, (int, float)) for c in first_cols):
                confidence += 0.4
        
        if any('DC' in str(val) for col in df.columns for val in df[col].dropna().astype(str).head(10)):
            confidence += 0.3
        
        return min(confidence, 1.0)
    
    @staticmethod
    def parse(df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """Parse Shoprite invoice list structure"""
        result = {
            'vendor': 'Shoprite',
            'document_type': 'remittance_advice',
            'invoices': [],
            'total_amount': 0.0,
            'currency': 'ZAR'
        }
        
        
        for idx, row in df.iterrows():
            if row.isna().all():
                continue
            
            row_values = row.tolist()
            if len(row_values) >= 11:
                invoice = {
                    'type': str(row_values[0]) if pd.notna(row_values[0]) else '',
                    'invoice_type': str(row_values[1]) if pd.notna(row_values[1]) else '',
                    'invoice_no': str(row_values[3]) if pd.notna(row_values[3]) else '',
                    'invoice_date': str(row_values[4]) if pd.notna(row_values[4]) else '',
                    'store_code': str(row_values[5]) if pd.notna(row_values[5]) else '',
                    'dc_location': str(row_values[6]) if pd.notna(row_values[6]) else '',
                    'reference': str(row_values[7]) if pd.notna(row_values[7]) else '',
                    'amount': float(row_values[10]) if pd.notna(row_values[10]) and row_values[10] != 0 else 0.0,
                    'vat': float(row_values[11]) if len(row_values) > 11 and pd.notna(row_values[11]) else 0.0
                }
                
                if invoice['invoice_no']:  # Only add if we have an invoice number
                    result['invoices'].append(invoice)
                    result['total_amount'] += invoice['amount']
        
        return result


class GenericRemittanceAdapter(VendorAdapter):
    """Generic fallback parser for unknown remittance formats"""
    
    @staticmethod
    def detect(df: pd.DataFrame, filename: str) -> float:
        return 0.1
    
    @staticmethod
    def parse(df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """Generic parser that extracts basic information"""
        result = {
            'vendor': 'Unknown',
            'document_type': 'remittance_advice',
            'rows': [],
            'total_amount': 0.0,
            'currency': 'ZAR'
        }
        
        amount_cols = [c for c in df.columns if any(keyword in str(c).lower() for keyword in ['amount', 'total', 'net', 'gross', 'value'])]
        
        for idx, row in df.iterrows():
            if row.isna().all():
                continue
            
            row_data = row.to_dict()
            result['rows'].append({k: str(v) for k, v in row_data.items() if pd.notna(v)})
            
            for col in amount_cols:
                val = row.get(col)
                if pd.notna(val) and isinstance(val, (int, float)):
                    result['total_amount'] += float(val)
        
        return result


# ========================================
# ========================================

VENDOR_ADAPTERS = [
    PnPRemittanceAdapter,
    UMSRemittanceAdapter,
    ShopriteRemittanceAdapter,
    GenericRemittanceAdapter  # Fallback
]


def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA256 hash of file content"""
    return hashlib.sha256(content).hexdigest()


def detect_vendor(df: pd.DataFrame, filename: str) -> tuple[VendorAdapter, float]:
    """Detect vendor and return best matching adapter with confidence"""
    best_adapter = GenericRemittanceAdapter
    best_confidence = 0.0
    
    for adapter in VENDOR_ADAPTERS:
        confidence = adapter.detect(df, filename)
        if confidence > best_confidence:
            best_confidence = confidence
            best_adapter = adapter
    
    return best_adapter, best_confidence


def infer_company(parsed_data: Dict[str, Any], filename: str) -> Optional[str]:
    """Infer company from parsed data or filename"""
    return None


def suggest_posting_target(vendor: str, company_id: Optional[str]) -> str:
    """Suggest whether to post to SAP or AriaERP"""
    return 'aria'


# ========================================
# API ENDPOINTS
# ========================================

@router.post("/intake", response_model=DocumentIntakeResponse)
async def intake_document(file: UploadFile = File(...)):
    """
    Upload and parse a document (Excel, PDF, image)
    
    Returns parsed data with vendor detection, confidence scores,
    and suggested posting action (SAP or AriaERP)
    """
    try:
        file_content = await file.read()
        file_hash = calculate_file_hash(file_content)
        file_size = len(file_content)
        
        
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in ['.xlsx', '.xls', '.pdf', '.jpg', '.jpeg', '.png']:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
        
        if file_ext in ['.xlsx', '.xls']:
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                tmp_file.write(file_content)
                tmp_file.flush()
                
                try:
                    df = pd.read_excel(tmp_file.name, sheet_name=0)
                    
                    adapter, confidence = detect_vendor(df, file.filename)
                    
                    parsed_data = adapter.parse(df, file.filename)
                    vendor = parsed_data.get('vendor', 'Unknown')
                    
                    company_id = infer_company(parsed_data, file.filename)
                    
                    suggested_action = suggest_posting_target(vendor, company_id)
                    
                    summary = {
                        'vendor': vendor,
                        'document_type': parsed_data.get('document_type', 'unknown'),
                        'total_amount': parsed_data.get('total_amount', 0.0),
                        'currency': parsed_data.get('currency', 'ZAR'),
                        'invoice_count': len(parsed_data.get('invoices', [])) or len(parsed_data.get('transactions', [])),
                        'confidence': confidence
                    }
                    
                    document_id = f"DOC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{file_hash[:8]}"
                    
                    
                    return DocumentIntakeResponse(
                        document_id=document_id,
                        filename=file.filename,
                        file_hash=file_hash,
                        file_size=file_size,
                        uploaded_at=datetime.now().isoformat(),
                        vendor=vendor,
                        document_type=parsed_data.get('document_type', 'unknown'),
                        confidence=confidence,
                        company_id=company_id,
                        summary=summary,
                        parsed_data=parsed_data,
                        suggested_action=suggested_action,
                        status='parsed'
                    )
                    
                finally:
                    os.unlink(tmp_file.name)
        
        else:
            raise HTTPException(status_code=400, detail="PDF and image processing not yet implemented")
    
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.get("/{document_id}/preview")
async def preview_document(document_id: str):
    """
    Get parsed document preview with audit trail
    """
    raise HTTPException(status_code=501, detail="Preview endpoint not yet implemented")


@router.post("/{document_id}/post", response_model=DocumentPostResponse)
async def post_document(document_id: str, request: DocumentPostRequest):
    """
    Post document to SAP or AriaERP
    
    - target='sap': Generate SAP F-28 export file
    - target='aria': Create customer_payments and payment_allocations in AriaERP
    - dry_run=true: Preview what would be posted without committing
    """
    raise HTTPException(status_code=501, detail="Post endpoint not yet implemented")


@router.get("/{document_id}/export")
async def export_document(document_id: str):
    """
    Download SAP export file for manual upload
    """
    raise HTTPException(status_code=501, detail="Export endpoint not yet implemented")


@router.get("/health")
async def health_check():
    """Check document intake service health"""
    return {
        "status": "healthy",
        "module": "document_intake",
        "vendor_adapters": len(VENDOR_ADAPTERS),
        "supported_formats": [".xlsx", ".xls", ".pdf", ".jpg", ".jpeg", ".png"]
    }
