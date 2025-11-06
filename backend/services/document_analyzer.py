"""
Intelligent Document Analyzer
Automatically detects document types and suggests GL postings
"""
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DocumentAnalyzer:
    """Analyzes documents and determines type, GL postings, and export formats"""
    
    def analyze_excel(self, file_path: str) -> Dict[str, Any]:
        """Analyze Excel document and determine type and postings"""
        try:
            df = pd.read_excel(file_path)
            
            doc_type = self._detect_document_type(df)
            
            if doc_type == "remittance_advice":
                return self._analyze_remittance(df)
            elif doc_type == "invoice":
                return self._analyze_invoice(df)
            elif doc_type == "payment":
                return self._analyze_payment(df)
            else:
                return self._analyze_generic(df)
                
        except Exception as e:
            logger.error(f"Error analyzing Excel: {e}")
            raise
    
    def _detect_document_type(self, df: pd.DataFrame) -> str:
        """Detect document type from column names and content"""
        columns_lower = [str(col).lower() for col in df.columns]
        
        remittance_indicators = ['document no', 'supplier ref', 'gross', 'nett', 'discount']
        if all(any(indicator in col for col in columns_lower) for indicator in ['document', 'supplier', 'gross', 'nett']):
            return "remittance_advice"
        
        invoice_indicators = ['invoice', 'amount', 'customer', 'total']
        if any(indicator in ' '.join(columns_lower) for indicator in invoice_indicators):
            return "invoice"
        
        payment_indicators = ['payment', 'amount', 'reference']
        if any(indicator in ' '.join(columns_lower) for indicator in payment_indicators):
            return "payment"
        
        return "generic"
    
    def _analyze_remittance(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze remittance advice document"""
        # Calculate totals
        total_gross = df['Gross'].sum() if 'Gross' in df.columns else 0
        total_discount = df['Discount'].sum() if 'Discount' in df.columns else 0
        total_nett = df['Nett'].sum() if 'Nett' in df.columns else 0
        
        num_transactions = len(df)
        
        supplier_col = 'Supplier Ref' if 'Supplier Ref' in df.columns else None
        unique_suppliers = df[supplier_col].nunique() if supplier_col else 0
        
        type_col = 'Type' if 'Type' in df.columns else None
        transaction_types = df[type_col].value_counts().to_dict() if type_col else {}
        
        gl_postings = self._generate_remittance_gl_postings(df, total_gross, total_discount, total_nett)
        
        sap_export = self._generate_sap_remittance_export(df)
        
        return {
            "document_type": "Remittance Advice",
            "document_subtype": "Supplier Payment Remittance",
            "summary": {
                "total_transactions": num_transactions,
                "unique_suppliers": unique_suppliers,
                "transaction_types": transaction_types,
                "total_gross": round(total_gross, 2),
                "total_discount": round(total_discount, 2),
                "total_nett": round(total_nett, 2)
            },
            "gl_postings": gl_postings,
            "sap_export": sap_export,
            "recommendations": self._generate_remittance_recommendations(df)
        }
    
    def _generate_remittance_gl_postings(self, df: pd.DataFrame, total_gross: float, total_discount: float, total_nett: float) -> List[Dict[str, Any]]:
        """Generate GL posting entries for remittance"""
        postings = []
        
        if 'Supplier Ref' in df.columns and 'Nett' in df.columns:
            supplier_totals = df.groupby('Supplier Ref').agg({
                'Nett': 'sum',
                'Discount': 'sum',
                'Gross': 'sum'
            }).reset_index()
            
            for _, row in supplier_totals.iterrows():
                supplier_ref = row['Supplier Ref']
                nett_amount = row['Nett']
                discount_amount = row['Discount']
                
                postings.append({
                    "line_number": len(postings) + 1,
                    "account": "2000",
                    "account_name": "Accounts Payable - Trade",
                    "debit": abs(nett_amount) if nett_amount < 0 else 0,
                    "credit": abs(nett_amount) if nett_amount > 0 else 0,
                    "description": f"Payment to Supplier {supplier_ref}",
                    "supplier_ref": supplier_ref,
                    "cost_center": "",
                    "posting_key": "31" if nett_amount < 0 else "21"
                })
                
                if nett_amount != 0:
                    postings.append({
                        "line_number": len(postings) + 1,
                        "account": "1100",
                        "account_name": "Bank - Current Account",
                        "debit": abs(nett_amount) if nett_amount > 0 else 0,
                        "credit": abs(nett_amount) if nett_amount < 0 else 0,
                        "description": f"Payment to Supplier {supplier_ref}",
                        "supplier_ref": supplier_ref,
                        "cost_center": "",
                        "posting_key": "50" if nett_amount < 0 else "40"
                    })
                
                if discount_amount != 0:
                    postings.append({
                        "line_number": len(postings) + 1,
                        "account": "6100",
                        "account_name": "Discount Received",
                        "debit": abs(discount_amount) if discount_amount > 0 else 0,
                        "credit": abs(discount_amount) if discount_amount < 0 else 0,
                        "description": f"Discount from Supplier {supplier_ref}",
                        "supplier_ref": supplier_ref,
                        "cost_center": "",
                        "posting_key": "40" if discount_amount < 0 else "50"
                    })
        
        return postings
    
    def _generate_sap_remittance_export(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate SAP-compatible export format"""
        sap_payments = []
        
        if 'Supplier Ref' in df.columns and 'Nett' in df.columns:
            supplier_totals = df.groupby('Supplier Ref').agg({
                'Nett': 'sum',
                'Discount': 'sum',
                'Document No': 'first',
                'Document Date': 'first',
                'Reference Text': 'first'
            }).reset_index()
            
            for idx, row in supplier_totals.iterrows():
                payment_entry = {
                    "Document_Type": "KZ",
                    "Company_Code": "1000",
                    "Document_Date": pd.to_datetime(row['Document Date']).strftime('%Y%m%d') if pd.notna(row['Document Date']) else datetime.now().strftime('%Y%m%d'),
                    "Posting_Date": datetime.now().strftime('%Y%m%d'),
                    "Reference": str(row['Document No']) if pd.notna(row['Document No']) else "",
                    "Doc_Header_Text": str(row['Reference Text'])[:25] if pd.notna(row['Reference Text']) else "",
                    "Vendor_Number": str(row['Supplier Ref']),
                    "Amount": abs(row['Nett']),
                    "Currency": "ZAR",
                    "Payment_Method": "T",
                    "Discount_Amount": abs(row['Discount']) if pd.notna(row['Discount']) else 0,
                    "GL_Account": "1100",
                    "Posting_Key_Vendor": "25",
                    "Posting_Key_Bank": "50"
                }
                sap_payments.append(payment_entry)
        
        return {
            "format": "SAP_F28_PAYMENT_POSTING",
            "transaction_code": "F-28",
            "description": "Post Incoming Payments (Vendor)",
            "total_records": len(sap_payments),
            "records": sap_payments,
            "export_instructions": [
                "1. Use transaction F-28 in SAP",
                "2. Enter Document Date and Posting Date",
                "3. Enter Company Code (1000)",
                "4. For each vendor payment:",
                "   - Enter Vendor Number",
                "   - Enter Amount",
                "   - Enter Bank Account (1100)",
                "   - Enter Payment Method (T)",
                "   - Enter Reference and Text",
                "5. Post the document"
            ]
        }
    
    def _generate_remittance_recommendations(self, df: pd.DataFrame) -> List[str]:
        """Generate recommendations for remittance processing"""
        recommendations = []
        
        if 'Type' in df.columns:
            es_count = len(df[df['Type'] == 'ES'])
            re_count = len(df[df['Type'] == 'RE'])
            
            if es_count > 0:
                recommendations.append(f"⚠️ Found {es_count} reversal transactions (ES type). Review these for incorrect vendor assignments.")
            
            if re_count > 0:
                recommendations.append(f"✓ Found {re_count} re-application transactions (RE type). These correct previous errors.")
        
        if 'Reference Text' in df.columns:
            pod_missing = df[df['Reference Text'].str.contains('Please Provide POD', na=False)]
            if len(pod_missing) > 0:
                recommendations.append(f"⚠️ {len(pod_missing)} transactions require Proof of Delivery (POD). Follow up with suppliers.")
        
        if 'Reference Text' in df.columns:
            incorrect_vendor = df[df['Reference Text'].str.contains('Incorrect Vendor', na=False)]
            if len(incorrect_vendor) > 0:
                recommendations.append(f"⚠️ {len(incorrect_vendor)} transactions had incorrect vendor assignments. Verify corrections.")
        
        if 'Nett' in df.columns:
            total_nett = df['Nett'].sum()
            if abs(total_nett) < 0.01:
                recommendations.append("✓ Total net amount is zero - all reversals and re-applications are balanced.")
            else:
                recommendations.append(f"⚠️ Total net amount is {total_nett:.2f} - verify if this is expected.")
        
        return recommendations
    
    def _analyze_invoice(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze invoice document"""
        return {
            "document_type": "Invoice",
            "summary": {"total_rows": len(df)},
            "gl_postings": [],
            "sap_export": {},
            "recommendations": ["Invoice analysis not yet implemented"]
        }
    
    def _analyze_payment(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze payment document"""
        return {
            "document_type": "Payment",
            "summary": {"total_rows": len(df)},
            "gl_postings": [],
            "sap_export": {},
            "recommendations": ["Payment analysis not yet implemented"]
        }
    
    def _analyze_generic(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze generic document"""
        return {
            "document_type": "Generic Document",
            "summary": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "columns": list(df.columns)
            },
            "gl_postings": [],
            "sap_export": {},
            "recommendations": ["Unable to determine specific document type. Please specify the document type manually."]
        }


document_analyzer = DocumentAnalyzer()
