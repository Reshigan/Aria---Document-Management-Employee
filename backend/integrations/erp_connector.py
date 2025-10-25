"""
Generic ERP/CRM Connector
Supports multiple systems with unified interface
"""
from typing import Dict, Any, Optional, List
import requests
import json
from datetime import datetime
from abc import ABC, abstractmethod


class BaseERPConnector(ABC):
    """Base class for ERP connectors"""
    
    @abstractmethod
    def connect(self) -> bool:
        pass
    
    @abstractmethod
    def get_customer(self, customer_id: str) -> Optional[Dict]:
        pass
    
    @abstractmethod
    def check_stock(self, product_sku: str) -> Optional[int]:
        pass
    
    @abstractmethod
    def check_credit_limit(self, customer_id: str) -> Dict:
        pass
    
    @abstractmethod
    def create_sales_order(self, order_data: Dict) -> Dict:
        pass
    
    @abstractmethod
    def get_pricing(self, product_sku: str, customer_id: Optional[str] = None) -> Optional[float]:
        pass


class SalesforceConnector(BaseERPConnector):
    """Salesforce CRM Connector"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.instance_url = config.get("instance_url")
        self.access_token = None
        
    def connect(self) -> bool:
        """Authenticate with Salesforce OAuth"""
        auth_url = "https://login.salesforce.com/services/oauth2/token"
        
        payload = {
            "grant_type": "password",
            "client_id": self.config.get("client_id"),
            "client_secret": self.config.get("client_secret"),
            "username": self.config.get("username"),
            "password": self.config.get("password") + self.config.get("security_token", "")
        }
        
        try:
            response = requests.post(auth_url, data=payload)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.instance_url = data["instance_url"]
                print("✅ Connected to Salesforce")
                return True
            else:
                print(f"❌ Salesforce auth failed: {response.text}")
                return False
        except Exception as e:
            print(f"Salesforce connection error: {str(e)}")
            return False
    
    def get_customer(self, customer_id: str) -> Optional[Dict]:
        """Get Account details"""
        url = f"{self.instance_url}/services/data/v58.0/sobjects/Account/{customer_id}"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
        except Exception as e:
            print(f"Get customer error: {str(e)}")
            return None
    
    def check_stock(self, product_sku: str) -> Optional[int]:
        """Query Product2 for stock (if custom field exists)"""
        url = f"{self.instance_url}/services/data/v58.0/query"
        
        query = f"SELECT Id, ProductCode, QuantityInStock__c FROM Product2 WHERE ProductCode = '{product_sku}'"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        try:
            response = requests.get(url, headers=headers, params={"q": query})
            
            if response.status_code == 200:
                data = response.json()
                if data["totalSize"] > 0:
                    return data["records"][0].get("QuantityInStock__c", 0)
            return None
        except Exception as e:
            print(f"Stock check error: {str(e)}")
            return None
    
    def check_credit_limit(self, customer_id: str) -> Dict:
        """Check customer credit limit"""
        customer = self.get_customer(customer_id)
        
        if customer:
            credit_limit = customer.get("CreditLimit__c", 0)
            outstanding = customer.get("OutstandingBalance__c", 0)
            
            return {
                "credit_limit": credit_limit,
                "outstanding_balance": outstanding,
                "available_credit": credit_limit - outstanding,
                "approved": True
            }
        else:
            return {"approved": False, "error": "Customer not found"}
    
    def create_sales_order(self, order_data: Dict) -> Dict:
        """Create Opportunity (Salesforce doesn't have native Order object)"""
        url = f"{self.instance_url}/services/data/v58.0/sobjects/Opportunity"
        
        payload = {
            "Name": f"Order {order_data.get('order_number', 'N/A')}",
            "AccountId": order_data.get("customer_id"),
            "StageName": "Closed Won",
            "Amount": order_data.get("total"),
            "CloseDate": datetime.now().strftime("%Y-%m-%d"),
            "Description": json.dumps(order_data.get("items", []))
        }
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 201:
                result = response.json()
                return {
                    "success": True,
                    "order_number": result["id"],
                    "created_at": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": f"Salesforce error: {response.text}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_pricing(self, product_sku: str, customer_id: Optional[str] = None) -> Optional[float]:
        """Get product pricing"""
        url = f"{self.instance_url}/services/data/v58.0/query"
        
        # Query PricebookEntry
        query = f"SELECT Id, UnitPrice FROM PricebookEntry WHERE Product2.ProductCode = '{product_sku}' AND IsActive = true LIMIT 1"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        try:
            response = requests.get(url, headers=headers, params={"q": query})
            
            if response.status_code == 200:
                data = response.json()
                if data["totalSize"] > 0:
                    return data["records"][0].get("UnitPrice")
            return None
        except Exception as e:
            print(f"Pricing error: {str(e)}")
            return None


class DynamicsConnector(BaseERPConnector):
    """Microsoft Dynamics 365 Connector"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.resource_url = config.get("resource_url")  # e.g., https://org.crm.dynamics.com
        self.access_token = None
        
    def connect(self) -> bool:
        """Authenticate with Azure AD"""
        auth_url = f"https://login.microsoftonline.com/{self.config.get('tenant_id')}/oauth2/v2.0/token"
        
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.config.get("client_id"),
            "client_secret": self.config.get("client_secret"),
            "scope": f"{self.resource_url}/.default"
        }
        
        try:
            response = requests.post(auth_url, data=payload)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                print("✅ Connected to Dynamics 365")
                return True
            else:
                print(f"❌ Dynamics auth failed: {response.text}")
                return False
        except Exception as e:
            print(f"Dynamics connection error: {str(e)}")
            return False
    
    def get_customer(self, customer_id: str) -> Optional[Dict]:
        """Get Account details"""
        url = f"{self.resource_url}/api/data/v9.2/accounts({customer_id})"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        }
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
        except Exception as e:
            print(f"Get customer error: {str(e)}")
            return None
    
    def check_stock(self, product_sku: str) -> Optional[int]:
        """Query products for stock"""
        url = f"{self.resource_url}/api/data/v9.2/products"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        params = {
            "$filter": f"productnumber eq '{product_sku}'",
            "$select": "productid,productnumber,quantityonhand"
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                if data["value"]:
                    return data["value"][0].get("quantityonhand", 0)
            return None
        except Exception as e:
            print(f"Stock check error: {str(e)}")
            return None
    
    def check_credit_limit(self, customer_id: str) -> Dict:
        """Check credit limit"""
        customer = self.get_customer(customer_id)
        
        if customer:
            credit_limit = customer.get("creditlimit", 0)
            # TODO: Calculate outstanding balance
            
            return {
                "credit_limit": credit_limit,
                "outstanding_balance": 0,
                "available_credit": credit_limit,
                "approved": True
            }
        else:
            return {"approved": False, "error": "Customer not found"}
    
    def create_sales_order(self, order_data: Dict) -> Dict:
        """Create Sales Order"""
        url = f"{self.resource_url}/api/data/v9.2/salesorders"
        
        payload = {
            "name": f"Order {order_data.get('order_number', '')}",
            "customerid_account@odata.bind": f"/accounts({order_data.get('customer_id')})",
            "totalamount": order_data.get("total"),
            "description": json.dumps(order_data.get("items", []))
        }
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 204:
                order_id = response.headers.get("OData-EntityId", "").split("(")[-1].rstrip(")")
                return {
                    "success": True,
                    "order_number": order_id,
                    "created_at": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": f"Dynamics error: {response.text}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_pricing(self, product_sku: str, customer_id: Optional[str] = None) -> Optional[float]:
        """Get product price"""
        url = f"{self.resource_url}/api/data/v9.2/products"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        params = {
            "$filter": f"productnumber eq '{product_sku}'",
            "$select": "price"
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                if data["value"]:
                    return data["value"][0].get("price")
            return None
        except Exception as e:
            print(f"Pricing error: {str(e)}")
            return None


class ERPConnectorFactory:
    """Factory to create ERP connectors"""
    
    @staticmethod
    def create(system_type: str, config: Dict[str, Any]) -> BaseERPConnector:
        """Create appropriate connector based on system type"""
        if system_type == "salesforce":
            return SalesforceConnector(config)
        elif system_type == "dynamics":
            return DynamicsConnector(config)
        else:
            raise Exception(f"Unsupported ERP system: {system_type}")
