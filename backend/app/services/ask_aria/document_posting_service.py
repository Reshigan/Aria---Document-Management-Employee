"""
Document Posting Service
Routes documents to either ARIA ERP or SAP export
"""
import os
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import psycopg2
import psycopg2.extras
import logging

from .sap_export_service import sap_export_service

logger = logging.getLogger(__name__)


class DocumentPostingService:
    """Service for posting documents to ARIA ERP or exporting to SAP"""
    
    def __init__(self, db_connection_string: str, export_path: str = "/var/www/aria/exports"):
        self.db_connection_string = db_connection_string
        self.export_path = export_path
        os.makedirs(export_path, exist_ok=True)
    
    def get_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_connection_string)
    
    def validate_document(
        self,
        document_id: str,
        doc_type: str,
        header_data: Dict[str, Any],
        line_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validate document before posting/export
        
        Returns:
            {
                "valid": bool,
                "errors": List[str],
                "warnings": List[str]
            }
        """
        errors = []
        warnings = []
        
        template = sap_export_service.get_template_by_type(doc_type)
        
        if not template:
            errors.append(f"Unknown document type: {doc_type}")
            return {"valid": False, "errors": errors, "warnings": warnings}
        
        canonical_fields = template.get('canonical_fields', [])
        for field in canonical_fields:
            if field not in header_data or not header_data[field]:
                if field in ['company_code', 'currency']:
                    errors.append(f"Required field missing: {field}")
                else:
                    warnings.append(f"Recommended field missing: {field}")
        
        if not line_items:
            warnings.append("No line items found")
        
        if doc_type in ['AP_INVOICE_NON_PO', 'AP_INVOICE_PO', 'AR_INVOICE']:
            total_amount = header_data.get('total_amount', 0)
            net_amount = header_data.get('net_amount', 0)
            tax_amount = header_data.get('tax_amount', 0)
            
            if total_amount and net_amount and tax_amount:
                calculated_total = float(net_amount) + float(tax_amount)
                if abs(calculated_total - float(total_amount)) > 0.01:
                    errors.append(f"Amount mismatch: net ({net_amount}) + tax ({tax_amount}) != total ({total_amount})")
        
        if doc_type == 'JOURNAL_ENTRY':
            total_debit = sum(float(item.get('amount', 0)) for item in line_items if item.get('debit_credit') == 'D')
            total_credit = sum(float(item.get('amount', 0)) for item in line_items if item.get('debit_credit') == 'C')
            
            if abs(total_debit - total_credit) > 0.01:
                errors.append(f"Journal entry not balanced: debits ({total_debit}) != credits ({total_credit})")
        
        duplicate_check = self._check_duplicate(doc_type, header_data)
        if duplicate_check:
            warnings.append(f"Possible duplicate: {duplicate_check}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    def _check_duplicate(self, doc_type: str, header_data: Dict[str, Any]) -> Optional[str]:
        """Check for duplicate documents"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if doc_type in ['AP_INVOICE_NON_PO', 'AP_INVOICE_PO']:
                        vendor_code = header_data.get('vendor_code')
                        invoice_number = header_data.get('invoice_number')
                        
                        if vendor_code and invoice_number:
                            cur.execute("""
                                SELECT COUNT(*) as count
                                FROM aria_document_extractions e
                                JOIN aria_document_classification c ON e.document_id = c.document_id
                                WHERE c.class IN ('AP_INVOICE_NON_PO', 'AP_INVOICE_PO')
                                AND e.fields->>'vendor_code' = %s
                                AND e.fields->>'invoice_number' = %s
                            """, (vendor_code, invoice_number))
                            
                            result = cur.fetchone()
                            if result and result['count'] > 0:
                                return f"Invoice {invoice_number} from vendor {vendor_code} already exists"
            
            return None
        except Exception as e:
            logger.error(f"Duplicate check failed: {e}")
            return None
    
    def post_to_aria(
        self,
        document_id: str,
        company_id: str,
        user_id: str,
        doc_type: str,
        header_data: Dict[str, Any],
        line_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Post document to ARIA ERP
        
        Returns:
            {
                "success": bool,
                "posting_id": str,
                "reference_id": str,
                "reference_number": str,
                "message": str
            }
        """
        try:
            validation = self.validate_document(document_id, doc_type, header_data, line_items)
            if not validation['valid']:
                return {
                    "success": False,
                    "errors": validation['errors'],
                    "warnings": validation['warnings']
                }
            
            posting_id = str(uuid.uuid4())
            
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO aria_document_postings
                        (id, document_id, company_id, destination_system, action, status, posted_by)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        posting_id,
                        document_id,
                        company_id,
                        'ARIA',
                        'POST',
                        'pending',
                        user_id
                    ))
                    
                    conn.commit()
            
            
            return {
                "success": True,
                "posting_id": posting_id,
                "reference_id": None,
                "reference_number": None,
                "message": "Document queued for ARIA ERP posting",
                "warnings": validation.get('warnings', [])
            }
            
        except Exception as e:
            logger.error(f"Failed to post to ARIA: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def export_to_sap(
        self,
        document_id: str,
        company_id: str,
        user_id: str,
        doc_type: str,
        header_data: Dict[str, Any],
        line_items: List[Dict[str, Any]],
        export_format: str = 'xlsx'
    ) -> Dict[str, Any]:
        """
        Export document to SAP template
        
        Args:
            document_id: Document ID
            company_id: Company ID
            user_id: User ID
            doc_type: SAP document type
            header_data: Header fields
            line_items: Line items
            export_format: 'xlsx' or 'csv'
            
        Returns:
            {
                "success": bool,
                "posting_id": str,
                "export_file_path": str,
                "export_file_url": str,
                "template_name": str,
                "message": str
            }
        """
        try:
            validation = self.validate_document(document_id, doc_type, header_data, line_items)
            if not validation['valid']:
                return {
                    "success": False,
                    "errors": validation['errors'],
                    "warnings": validation['warnings']
                }
            
            template = sap_export_service.get_template_by_type(doc_type)
            if not template:
                return {
                    "success": False,
                    "error": f"No SAP template found for document type: {doc_type}"
                }
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"SAP_{template['sap_tcode']}_{document_id[:8]}_{timestamp}.{export_format}"
            file_path = os.path.join(self.export_path, company_id, filename)
            
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            if export_format == 'xlsx':
                export_data = sap_export_service.generate_excel_export(
                    doc_type=doc_type,
                    header_data=header_data,
                    line_items=line_items,
                    output_path=file_path
                )
            elif export_format == 'csv':
                export_data = sap_export_service.generate_csv_export(
                    doc_type=doc_type,
                    header_data=header_data,
                    line_items=line_items,
                    output_path=file_path
                )
            else:
                return {
                    "success": False,
                    "error": f"Unsupported export format: {export_format}"
                }
            
            posting_id = str(uuid.uuid4())
            
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO aria_document_postings
                        (id, document_id, company_id, destination_system, action, status, 
                         sap_export_template, sap_export_file_path, posted_by, completed_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        posting_id,
                        document_id,
                        company_id,
                        'SAP',
                        'EXPORT',
                        'completed',
                        template['sap_tcode'],
                        file_path,
                        user_id,
                        datetime.now()
                    ))
                    
                    conn.commit()
            
            return {
                "success": True,
                "posting_id": posting_id,
                "export_file_path": file_path,
                "export_file_url": f"/api/ask-aria/documents/{document_id}/download-export/{posting_id}",
                "template_name": template['name'],
                "sap_tcode": template['sap_tcode'],
                "message": f"Document exported to SAP {template['sap_tcode']} template",
                "warnings": validation.get('warnings', [])
            }
            
        except Exception as e:
            logger.error(f"Failed to export to SAP: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_posting_status(self, posting_id: str) -> Optional[Dict[str, Any]]:
        """Get posting status"""
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM aria_document_postings
                        WHERE id = %s
                    """, (posting_id,))
                    
                    result = cur.fetchone()
                    return dict(result) if result else None
        except Exception as e:
            logger.error(f"Failed to get posting status: {e}")
            return None
