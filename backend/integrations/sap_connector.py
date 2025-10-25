"""
SAP Connector - Business One & S/4HANA Integration
"""
from typing import Dict, Any, Optional, List
import requests
import json
from datetime import datetime


class SAPConnector:
    """
    SAP Integration Connector
    
    Supports:
    - SAP Business One (REST API)
    - SAP S/4HANA (OData API)
    - SAP ECC (via RFC - optional)
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.system_type = config.get("system_type", "business_one")  # business_one, s4hana, ecc
        self.base_url = config.get("base_url")
        self.username = config.get("username")
        self.password = config.get("password")
        self.company_db = config.get("company_db")
        self.session = None
        self.session_id = None
        
    def connect(self) -> bool:
        """Establish connection to SAP"""
        try:
            if self.system_type == "business_one":
                return self._connect_business_one()
            elif self.system_type == "s4hana":
                return self._connect_s4hana()
            else:
                raise Exception(f"Unsupported SAP system type: {self.system_type}")
        except Exception as e:
            print(f"SAP connection failed: {str(e)}")
            return False
    
    def _connect_business_one(self) -> bool:
        """Connect to SAP Business One"""
        url = f"{self.base_url}/b1s/v1/Login"
        payload = {
            "CompanyDB": self.company_db,
            "UserName": self.username,
            "Password": self.password
        }
        
        response = requests.post(url, json=payload, verify=False)
        
        if response.status_code == 200:
            data = response.json()
            self.session_id = data.get("SessionId")
            self.session = requests.Session()
            self.session.cookies.set("B1SESSION", self.session_id)
            print(f"✅ Connected to SAP Business One (Session: {self.session_id})")
            return True
        else:
            print(f"❌ SAP B1 login failed: {response.status_code} - {response.text}")
            return False
    
    def _connect_s4hana(self) -> bool:
        """Connect to SAP S/4HANA"""
        # S/4HANA uses basic auth for OData services
        self.session = requests.Session()
        self.session.auth = (self.username, self.password)
        print(f"✅ Connected to SAP S/4HANA")
        return True
    
    def get_vendor(self, vendor_code: str) -> Optional[Dict]:
        """Get vendor master data"""
        try:
            if self.system_type == "business_one":
                url = f"{self.base_url}/b1s/v1/BusinessPartners('{vendor_code}')"
                response = self.session.get(url, verify=False)
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return None
            elif self.system_type == "s4hana":
                url = f"{self.base_url}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('{vendor_code}')"
                response = self.session.get(url, headers={"Accept": "application/json"})
                
                if response.status_code == 200:
                    return response.json().get("d")
                else:
                    return None
        except Exception as e:
            print(f"Vendor lookup failed: {str(e)}")
            return None
    
    def validate_po(self, po_number: str) -> bool:
        """Validate purchase order exists"""
        try:
            if self.system_type == "business_one":
                url = f"{self.base_url}/b1s/v1/PurchaseOrders({po_number})"
                response = self.session.get(url, verify=False)
                return response.status_code == 200
            elif self.system_type == "s4hana":
                url = f"{self.base_url}/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder('{po_number}')"
                response = self.session.get(url, headers={"Accept": "application/json"})
                return response.status_code == 200
        except Exception as e:
            print(f"PO validation failed: {str(e)}")
            return False
    
    def get_gl_account(self, account_code: str) -> Optional[Dict]:
        """Get GL account details"""
        try:
            if self.system_type == "business_one":
                url = f"{self.base_url}/b1s/v1/ChartOfAccounts('{account_code}')"
                response = self.session.get(url, verify=False)
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return None
        except Exception as e:
            print(f"GL account lookup failed: {str(e)}")
            return None
    
    def post_invoice(self, invoice_data: Dict) -> Dict[str, Any]:
        """Create invoice document in SAP"""
        try:
            if self.system_type == "business_one":
                return self._post_invoice_business_one(invoice_data)
            elif self.system_type == "s4hana":
                return self._post_invoice_s4hana(invoice_data)
        except Exception as e:
            print(f"Invoice posting failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _post_invoice_business_one(self, invoice_data: Dict) -> Dict:
        """Post invoice to SAP Business One"""
        url = f"{self.base_url}/b1s/v1/Invoices"
        
        # Transform to SAP B1 format
        sap_payload = {
            "CardCode": invoice_data.get("vendor_code"),
            "DocDate": invoice_data.get("invoice_date"),
            "DocDueDate": invoice_data.get("due_date"),
            "NumAtCard": invoice_data.get("invoice_number"),  # Vendor's invoice number
            "DocCurrency": invoice_data.get("currency", "USD"),
            "DocTotal": invoice_data.get("total_amount"),
            "DocumentLines": []
        }
        
        # Add line items
        for item in invoice_data.get("line_items", []):
            line = {
                "ItemDescription": item.get("description"),
                "Quantity": item.get("quantity", 1),
                "UnitPrice": item.get("unit_price"),
                "AccountCode": item.get("gl_account")
            }
            sap_payload["DocumentLines"].append(line)
        
        response = self.session.post(url, json=sap_payload, verify=False)
        
        if response.status_code in [200, 201]:
            result = response.json()
            return {
                "success": True,
                "sap_document_number": result.get("DocNum"),
                "sap_document_entry": result.get("DocEntry"),
                "posted_at": datetime.utcnow().isoformat()
            }
        else:
            return {
                "success": False,
                "error": f"SAP API error: {response.status_code} - {response.text}"
            }
    
    def _post_invoice_s4hana(self, invoice_data: Dict) -> Dict:
        """Post invoice to SAP S/4HANA"""
        url = f"{self.base_url}/sap/opu/odata/sap/API_SUPPLIERINVOICE_PROCESS_SRV/A_SupplierInvoice"
        
        # Transform to S/4HANA format
        sap_payload = {
            "SupplierInvoice": invoice_data.get("invoice_number"),
            "FiscalYear": str(datetime.now().year),
            "CompanyCode": self.config.get("company_code", "1000"),
            "DocumentDate": invoice_data.get("invoice_date"),
            "PostingDate": datetime.now().strftime("%Y-%m-%d"),
            "InvoicingParty": invoice_data.get("vendor_code"),
            "DocumentCurrency": invoice_data.get("currency", "USD"),
            "InvoiceGrossAmount": invoice_data.get("total_amount")
        }
        
        response = self.session.post(
            url,
            json=sap_payload,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            return {
                "success": True,
                "sap_document_number": result.get("d", {}).get("SupplierInvoice"),
                "posted_at": datetime.utcnow().isoformat()
            }
        else:
            return {
                "success": False,
                "error": f"SAP API error: {response.status_code} - {response.text}"
            }
    
    def disconnect(self):
        """Close SAP connection"""
        if self.system_type == "business_one" and self.session:
            try:
                url = f"{self.base_url}/b1s/v1/Logout"
                self.session.post(url, verify=False)
                print("✅ Disconnected from SAP")
            except:
                pass
        
        self.session = None
        self.session_id = None
