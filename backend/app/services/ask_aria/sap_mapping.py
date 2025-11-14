"""
SAP Document Mapping Service
Maps ERP documents to SAP document types and field structures
"""
from typing import Dict, Any, List, Optional
import psycopg2
import psycopg2.extras
import logging

logger = logging.getLogger(__name__)


class SAPMappingService:
    """Service for mapping ERP documents to SAP formats"""
    
    def __init__(self, db_connection_string: str):
        self.db_connection_string = db_connection_string
    
    def get_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_connection_string)
    
    def get_sap_doc_type(self, erp_doc_type: str) -> Optional[Dict[str, Any]]:
        """
        Get SAP document type mapping for an ERP document type
        
        Args:
            erp_doc_type: ERP document type (e.g., 'quote', 'sales_order')
            
        Returns:
            SAP document type info or None
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT s.*, d.notes
                        FROM doc_type_mapping d
                        JOIN sap_doc_types s ON d.sap_code = s.sap_code
                        WHERE d.erp_doc_type = %s
                        LIMIT 1
                    """, (erp_doc_type,))
                    
                    result = cur.fetchone()
                    return dict(result) if result else None
                    
        except Exception as e:
            logger.error(f"Failed to get SAP doc type: {str(e)}")
            return None
    
    def get_field_mappings(self, erp_model: str) -> List[Dict[str, Any]]:
        """
        Get field mappings for an ERP model
        
        Args:
            erp_model: ERP model name (e.g., 'quote', 'sales_order')
            
        Returns:
            List of field mappings
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM sap_field_mapping
                        WHERE erp_model = %s
                        ORDER BY required DESC, erp_field
                    """, (erp_model,))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Failed to get field mappings: {str(e)}")
            return []
    
    def map_document_to_sap(
        self,
        erp_doc_type: str,
        erp_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Map an ERP document to SAP format
        
        Args:
            erp_doc_type: ERP document type
            erp_data: ERP document data
            
        Returns:
            SAP-formatted document
        """
        try:
            sap_doc_type = self.get_sap_doc_type(erp_doc_type)
            if not sap_doc_type:
                raise ValueError(f"No SAP mapping found for {erp_doc_type}")
            
            field_mappings = self.get_field_mappings(erp_doc_type)
            
            sap_data = {
                "sap_doc_type": sap_doc_type['sap_code'],
                "sap_doc_name": sap_doc_type['name'],
                "sap_module": sap_doc_type['module'],
                "header": {},
                "items": []
            }
            
            for mapping in field_mappings:
                erp_field = mapping['erp_field']
                sap_field = mapping['sap_field']
                sap_table = mapping['sap_table']
                
                if erp_field in erp_data:
                    value = erp_data[erp_field]
                    
                    if mapping['transform_function']:
                        value = self._apply_transform(value, mapping['transform_function'])
                    
                    if sap_table not in sap_data:
                        sap_data[sap_table] = {}
                    
                    sap_data[sap_table][sap_field] = value
            
            logger.info(f"Mapped {erp_doc_type} to SAP {sap_doc_type['sap_code']}")
            
            return sap_data
            
        except Exception as e:
            logger.error(f"Failed to map document to SAP: {str(e)}")
            raise
    
    def _apply_transform(self, value: Any, transform_function: str) -> Any:
        """Apply transformation function to a value"""
        if transform_function == "date_to_sap":
            from datetime import datetime
            if isinstance(value, str):
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return dt.strftime("%Y%m%d")
            return value
        
        elif transform_function == "amount_to_sap":
            return float(value) if value else 0.0
        
        elif transform_function == "upper":
            return str(value).upper() if value else ""
        
        return value
    
    def list_sap_doc_types(self, module: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all SAP document types, optionally filtered by module
        
        Args:
            module: Optional SAP module filter (SD, MM, FI, etc.)
            
        Returns:
            List of SAP document types
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if module:
                        cur.execute("""
                            SELECT * FROM sap_doc_types
                            WHERE module = %s
                            ORDER BY module, name
                        """, (module,))
                    else:
                        cur.execute("""
                            SELECT * FROM sap_doc_types
                            ORDER BY module, name
                        """)
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Failed to list SAP doc types: {str(e)}")
            return []
    
    def add_field_mapping(
        self,
        erp_model: str,
        erp_field: str,
        sap_table: str,
        sap_field: str,
        transform_function: Optional[str] = None,
        required: bool = False,
        notes: Optional[str] = None
    ) -> str:
        """
        Add a new field mapping
        
        Returns:
            mapping_id
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO sap_field_mapping
                        (erp_model, erp_field, sap_table, sap_field, transform_function, required, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (erp_model, erp_field, sap_table, sap_field) DO UPDATE
                        SET transform_function = EXCLUDED.transform_function,
                            required = EXCLUDED.required,
                            notes = EXCLUDED.notes
                        RETURNING id
                    """, (erp_model, erp_field, sap_table, sap_field, transform_function, required, notes))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
                    logger.info(f"Added field mapping: {erp_model}.{erp_field} -> {sap_table}.{sap_field}")
                    return str(result['id'])
                    
        except Exception as e:
            logger.error(f"Failed to add field mapping: {str(e)}")
            raise
