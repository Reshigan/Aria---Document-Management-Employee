"""
Business-Specific Data Extraction Module
Extracts structured business data from documents for ERP/SAP integration
"""

import re
import json
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime
import requests
from decimal import Decimal

class BusinessDataExtractor:
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        
    def extract_business_data(self, document_text: str, document_category: str) -> Dict[str, Any]:
        """Extract business-specific structured data based on document type"""
        
        if document_category.lower() == "invoice":
            return self.extract_invoice_data(document_text)
        elif document_category.lower() == "remittance":
            return self.extract_remittance_data(document_text)
        elif document_category.lower() == "pod":
            return self.extract_pod_data(document_text)
        elif document_category.lower() == "contract":
            return self.extract_contract_data(document_text)
        else:
            return self.extract_generic_business_data(document_text)
    
    def extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extract structured invoice data for SAP posting"""
        
        # Use AI to extract structured invoice data
        prompt = f"""
        Extract structured invoice data from the following text. Return ONLY a JSON object with these exact fields:
        
        {{
            "invoice_number": "string",
            "invoice_date": "YYYY-MM-DD",
            "due_date": "YYYY-MM-DD",
            "po_number": "string or null",
            "vendor": {{
                "name": "string",
                "address": "string",
                "phone": "string or null",
                "email": "string or null",
                "tax_id": "string or null"
            }},
            "customer": {{
                "name": "string",
                "address": "string",
                "customer_id": "string or null"
            }},
            "line_items": [
                {{
                    "description": "string",
                    "quantity": number,
                    "unit_price": number,
                    "total_amount": number,
                    "tax_rate": number or null
                }}
            ],
            "subtotal": number,
            "tax_amount": number,
            "total_amount": number,
            "currency": "string",
            "payment_terms": "string",
            "payment_method": "string or null"
        }}
        
        Invoice text:
        {text}
        """
        
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": "llama3.2",
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.9
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                ai_response = response.json()["response"]
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    structured_data = json.loads(json_match.group())
                    
                    # Validate and clean the data
                    return self._validate_invoice_data(structured_data)
                    
        except Exception as e:
            print(f"AI extraction failed: {e}")
        
        # Fallback to regex-based extraction
        return self._extract_invoice_regex(text)
    
    def extract_remittance_data(self, text: str) -> Dict[str, Any]:
        """Extract structured remittance data"""
        
        prompt = f"""
        Extract structured remittance advice data from the following text. Return ONLY a JSON object:
        
        {{
            "remittance_number": "string",
            "payment_date": "YYYY-MM-DD",
            "payer": {{
                "name": "string",
                "account_number": "string or null",
                "reference": "string or null"
            }},
            "payment_method": "string",
            "total_payment_amount": number,
            "currency": "string",
            "invoices_paid": [
                {{
                    "invoice_number": "string",
                    "invoice_date": "YYYY-MM-DD or null",
                    "original_amount": number,
                    "payment_amount": number,
                    "discount_taken": number or null,
                    "balance_remaining": number or null
                }}
            ],
            "bank_details": {{
                "bank_name": "string or null",
                "account_number": "string or null",
                "routing_number": "string or null",
                "reference_number": "string or null"
            }}
        }}
        
        Remittance text:
        {text}
        """
        
        return self._extract_with_ai_fallback(prompt, text, self._extract_remittance_regex)
    
    def extract_pod_data(self, text: str) -> Dict[str, Any]:
        """Extract structured Proof of Delivery data"""
        
        prompt = f"""
        Extract structured Proof of Delivery data from the following text. Return ONLY a JSON object:
        
        {{
            "pod_number": "string",
            "delivery_date": "YYYY-MM-DD",
            "delivery_time": "HH:MM or null",
            "tracking_number": "string or null",
            "carrier": {{
                "name": "string",
                "driver_name": "string or null",
                "vehicle_id": "string or null"
            }},
            "shipper": {{
                "name": "string",
                "address": "string"
            }},
            "recipient": {{
                "name": "string",
                "address": "string",
                "contact_person": "string or null",
                "signature": "string or null"
            }},
            "items_delivered": [
                {{
                    "description": "string",
                    "quantity_shipped": number,
                    "quantity_delivered": number,
                    "unit": "string or null",
                    "condition": "string or null"
                }}
            ],
            "delivery_status": "string",
            "special_instructions": "string or null",
            "damages_noted": "string or null"
        }}
        
        POD text:
        {text}
        """
        
        return self._extract_with_ai_fallback(prompt, text, self._extract_pod_regex)
    
    def extract_contract_data(self, text: str) -> Dict[str, Any]:
        """Extract structured contract data"""
        
        prompt = f"""
        Extract structured contract data from the following text. Return ONLY a JSON object:
        
        {{
            "contract_number": "string",
            "contract_date": "YYYY-MM-DD",
            "effective_date": "YYYY-MM-DD or null",
            "expiration_date": "YYYY-MM-DD or null",
            "parties": [
                {{
                    "name": "string",
                    "role": "string",
                    "address": "string",
                    "contact_person": "string or null"
                }}
            ],
            "contract_value": number or null,
            "currency": "string or null",
            "payment_terms": "string or null",
            "key_terms": [
                "string"
            ],
            "renewal_terms": "string or null",
            "termination_clause": "string or null"
        }}
        
        Contract text:
        {text}
        """
        
        return self._extract_with_ai_fallback(prompt, text, self._extract_contract_regex)
    
    def _extract_with_ai_fallback(self, prompt: str, text: str, fallback_func) -> Dict[str, Any]:
        """Helper method to extract with AI and fallback to regex"""
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": "llama3.2",
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.9
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                ai_response = response.json()["response"]
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                    
        except Exception as e:
            print(f"AI extraction failed: {e}")
        
        # Fallback to regex
        return fallback_func(text)
    
    def _validate_invoice_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean invoice data"""
        # Ensure required fields exist
        required_fields = ["invoice_number", "total_amount", "vendor", "customer"]
        for field in required_fields:
            if field not in data or not data[field]:
                data[field] = None if field != "total_amount" else 0
        
        # Validate amounts are numeric
        numeric_fields = ["subtotal", "tax_amount", "total_amount"]
        for field in numeric_fields:
            if field in data and data[field]:
                try:
                    data[field] = float(data[field])
                except (ValueError, TypeError):
                    data[field] = 0
        
        # Validate line items
        if "line_items" in data and isinstance(data["line_items"], list):
            for item in data["line_items"]:
                for num_field in ["quantity", "unit_price", "total_amount"]:
                    if num_field in item:
                        try:
                            item[num_field] = float(item[num_field])
                        except (ValueError, TypeError):
                            item[num_field] = 0
        
        return data
    
    def _extract_invoice_regex(self, text: str) -> Dict[str, Any]:
        """Fallback regex-based invoice extraction"""
        data = {
            "invoice_number": None,
            "invoice_date": None,
            "due_date": None,
            "po_number": None,
            "vendor": {"name": None, "address": None},
            "customer": {"name": None, "address": None},
            "line_items": [],
            "subtotal": 0,
            "tax_amount": 0,
            "total_amount": 0,
            "currency": "USD",
            "payment_terms": None
        }
        
        # Extract invoice number
        inv_match = re.search(r'(?:invoice|inv)[\s#:]*([A-Z0-9-]+)', text, re.IGNORECASE)
        if inv_match:
            data["invoice_number"] = inv_match.group(1)
        
        # Extract dates
        date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
            r'([A-Za-z]+ \d{1,2}, \d{4})'
        ]
        
        for pattern in date_patterns:
            dates = re.findall(pattern, text)
            if dates and not data["invoice_date"]:
                data["invoice_date"] = dates[0]
            if len(dates) > 1 and not data["due_date"]:
                data["due_date"] = dates[1]
        
        # Extract amounts
        amount_patterns = [
            r'\$?([\d,]+\.?\d*)',
            r'total[:\s]*\$?([\d,]+\.?\d*)',
            r'amount[:\s]*\$?([\d,]+\.?\d*)'
        ]
        
        amounts = []
        for pattern in amount_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    amount = float(match.replace(',', ''))
                    amounts.append(amount)
                except ValueError:
                    continue
        
        if amounts:
            data["total_amount"] = max(amounts)  # Assume largest amount is total
        
        return data
    
    def _extract_remittance_regex(self, text: str) -> Dict[str, Any]:
        """Fallback regex-based remittance extraction"""
        return {
            "remittance_number": None,
            "payment_date": None,
            "payer": {"name": None},
            "payment_method": None,
            "total_payment_amount": 0,
            "currency": "USD",
            "invoices_paid": [],
            "bank_details": {}
        }
    
    def _extract_pod_regex(self, text: str) -> Dict[str, Any]:
        """Fallback regex-based POD extraction"""
        return {
            "pod_number": None,
            "delivery_date": None,
            "carrier": {"name": None},
            "recipient": {"name": None, "address": None},
            "items_delivered": [],
            "delivery_status": "Unknown"
        }
    
    def _extract_contract_regex(self, text: str) -> Dict[str, Any]:
        """Fallback regex-based contract extraction"""
        return {
            "contract_number": None,
            "contract_date": None,
            "parties": [],
            "contract_value": None,
            "key_terms": []
        }
    
    def extract_generic_business_data(self, text: str) -> Dict[str, Any]:
        """Extract generic business data for unknown document types"""
        return {
            "document_type": "Generic",
            "key_entities": self._extract_entities(text),
            "amounts": self._extract_amounts(text),
            "dates": self._extract_dates(text),
            "contact_info": self._extract_contact_info(text)
        }
    
    def _extract_entities(self, text: str) -> List[str]:
        """Extract business entities (companies, people)"""
        # Simple entity extraction - could be enhanced with NER
        entities = []
        
        # Company patterns
        company_patterns = [
            r'([A-Z][a-z]+ (?:Inc|LLC|Corp|Ltd|Company|Co)\.?)',
            r'([A-Z][A-Za-z\s]+ (?:Systems|Services|Solutions|Group))'
        ]
        
        for pattern in company_patterns:
            matches = re.findall(pattern, text)
            entities.extend(matches)
        
        return list(set(entities))
    
    def _extract_amounts(self, text: str) -> List[float]:
        """Extract monetary amounts"""
        amounts = []
        patterns = [
            r'\$[\d,]+\.?\d*',
            r'[\d,]+\.?\d*\s*(?:USD|dollars?)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    # Clean and convert to float
                    clean_amount = re.sub(r'[^\d.]', '', match)
                    if clean_amount:
                        amounts.append(float(clean_amount))
                except ValueError:
                    continue
        
        return amounts
    
    def _extract_dates(self, text: str) -> List[str]:
        """Extract dates from text"""
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{4}',
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',
            r'[A-Za-z]+ \d{1,2}, \d{4}',
            r'\d{1,2} [A-Za-z]+ \d{4}'
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            dates.extend(matches)
        
        return list(set(dates))
    
    def _extract_contact_info(self, text: str) -> Dict[str, List[str]]:
        """Extract contact information"""
        contact_info = {
            "emails": [],
            "phones": [],
            "addresses": []
        }
        
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        contact_info["emails"] = re.findall(email_pattern, text)
        
        # Phone pattern
        phone_pattern = r'(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
        phone_matches = re.findall(phone_pattern, text)
        contact_info["phones"] = [f"({match[0]}) {match[1]}-{match[2]}" for match in phone_matches]
        
        return contact_info

class ExcelRemittanceProcessor:
    """Process Excel remittance files"""
    
    def __init__(self):
        self.supported_formats = ['.xlsx', '.xls', '.csv']
    
    def process_excel_remittance(self, file_path: str) -> Dict[str, Any]:
        """Process Excel remittance file and extract structured data"""
        try:
            # Read Excel file
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
            
            # Detect remittance structure
            remittance_data = self._detect_remittance_structure(df)
            
            return {
                "file_type": "excel_remittance",
                "total_records": len(df),
                "remittance_data": remittance_data,
                "processing_status": "success"
            }
            
        except Exception as e:
            return {
                "file_type": "excel_remittance",
                "error": str(e),
                "processing_status": "error"
            }
    
    def _detect_remittance_structure(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect and extract remittance structure from DataFrame"""
        
        # Common remittance column patterns
        column_mappings = {
            'invoice_number': ['invoice', 'inv_no', 'invoice_no', 'invoice_number'],
            'payment_amount': ['amount', 'payment', 'paid_amount', 'payment_amount'],
            'payment_date': ['date', 'payment_date', 'paid_date', 'remit_date'],
            'customer': ['customer', 'payer', 'customer_name', 'client'],
            'reference': ['reference', 'ref', 'ref_no', 'payment_ref']
        }
        
        # Map columns
        mapped_columns = {}
        for standard_name, possible_names in column_mappings.items():
            for col in df.columns:
                if any(name.lower() in col.lower() for name in possible_names):
                    mapped_columns[standard_name] = col
                    break
        
        # Extract remittance records
        remittance_records = []
        for _, row in df.iterrows():
            record = {}
            for standard_name, excel_col in mapped_columns.items():
                if excel_col in df.columns:
                    record[standard_name] = row[excel_col]
            
            if record:  # Only add if we found some data
                remittance_records.append(record)
        
        return {
            "column_mappings": mapped_columns,
            "records": remittance_records,
            "total_payment_amount": sum(
                float(record.get('payment_amount', 0)) 
                for record in remittance_records 
                if record.get('payment_amount')
            )
        }