"""
Bot API Client
Provides a unified interface for bots to interact with ERP APIs
Allows bots to work standalone (direct DB) or via API calls
"""
from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal
import requests
from sqlalchemy.orm import Session
from sqlalchemy import text


class BotAPIClient:
    """
    Unified API client for bots to interact with ERP modules
    
    Supports two modes:
    1. API mode: Makes HTTP requests to FastAPI endpoints
    2. Direct DB mode: Queries database directly (for standalone operation)
    """
    
    def __init__(
        self,
        mode: str = "api",
        api_base_url: str = "http://localhost:8000",
        api_token: Optional[str] = None,
        db_session: Optional[Session] = None,
        tenant_id: Optional[int] = None
    ):
        """
        Initialize bot API client
        
        Args:
            mode: "api" or "db" - determines how to access data
            api_base_url: Base URL for API calls (only used in API mode)
            api_token: JWT token for authentication (only used in API mode)
            db_session: Database session (only used in DB mode)
            tenant_id: Tenant ID for multi-tenancy (only used in DB mode)
        """
        self.mode = mode
        self.api_base_url = api_base_url.rstrip('/')
        self.api_token = api_token
        self.db = db_session
        self.tenant_id = tenant_id
        
        if mode == "api" and not api_token:
            raise ValueError("API token required for API mode")
        if mode == "db" and not db_session:
            raise ValueError("Database session required for DB mode")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers for API requests"""
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
    
    
    def get_bank_accounts(self, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get list of bank accounts"""
        if self.mode == "api":
            params = {}
            if is_active is not None:
                params["is_active"] = is_active
            
            response = requests.get(
                f"{self.api_base_url}/api/banking/accounts",
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            query = text("""
                SELECT id, account_name, account_number, account_type, bank_name,
                       current_balance, reconciled_balance, currency_code, is_active
                FROM bank_accounts
                WHERE tenant_id = :tenant_id
            """)
            
            if is_active is not None:
                query = text("""
                    SELECT id, account_name, account_number, account_type, bank_name,
                           current_balance, reconciled_balance, currency_code, is_active
                    FROM bank_accounts
                    WHERE tenant_id = :tenant_id AND is_active = :is_active
                """)
                result = self.db.execute(query, {"tenant_id": self.tenant_id, "is_active": is_active})
            else:
                result = self.db.execute(query, {"tenant_id": self.tenant_id})
            
            accounts = []
            for row in result:
                accounts.append({
                    "id": row[0],
                    "account_name": row[1],
                    "account_number": row[2],
                    "account_type": row[3],
                    "bank_name": row[4],
                    "current_balance": float(row[5]),
                    "reconciled_balance": float(row[6]),
                    "currency_code": row[7],
                    "is_active": row[8]
                })
            return accounts
    
    def get_bank_transactions(
        self,
        bank_account_id: Optional[int] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        reconciliation_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get list of bank transactions"""
        if self.mode == "api":
            params = {}
            if bank_account_id:
                params["bank_account_id"] = bank_account_id
            if from_date:
                params["from_date"] = from_date.isoformat()
            if to_date:
                params["to_date"] = to_date.isoformat()
            if reconciliation_status:
                params["reconciliation_status"] = reconciliation_status
            
            response = requests.get(
                f"{self.api_base_url}/api/banking/transactions",
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            conditions = ["tenant_id = :tenant_id"]
            params = {"tenant_id": self.tenant_id}
            
            if bank_account_id:
                conditions.append("bank_account_id = :bank_account_id")
                params["bank_account_id"] = bank_account_id
            if from_date:
                conditions.append("transaction_date >= :from_date")
                params["from_date"] = from_date
            if to_date:
                conditions.append("transaction_date <= :to_date")
                params["to_date"] = to_date
            if reconciliation_status:
                conditions.append("reconciliation_status = :reconciliation_status")
                params["reconciliation_status"] = reconciliation_status
            
            query = text(f"""
                SELECT id, bank_account_id, transaction_date, transaction_type,
                       description, debit_amount, credit_amount, balance,
                       reconciliation_status, is_posted
                FROM bank_transactions
                WHERE {' AND '.join(conditions)}
                ORDER BY transaction_date DESC
            """)
            
            result = self.db.execute(query, params)
            
            transactions = []
            for row in result:
                transactions.append({
                    "id": row[0],
                    "bank_account_id": row[1],
                    "transaction_date": row[2],
                    "transaction_type": row[3],
                    "description": row[4],
                    "debit_amount": float(row[5]),
                    "credit_amount": float(row[6]),
                    "balance": float(row[7]),
                    "reconciliation_status": row[8],
                    "is_posted": row[9]
                })
            return transactions
    
    
    def get_vendor_bills(
        self,
        vendor_id: Optional[int] = None,
        status: Optional[str] = None,
        payment_status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get list of vendor bills"""
        if self.mode == "api":
            params = {}
            if vendor_id:
                params["vendor_id"] = vendor_id
            if status:
                params["status"] = status
            if payment_status:
                params["payment_status"] = payment_status
            
            response = requests.get(
                f"{self.api_base_url}/api/ap/bills",
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            conditions = ["tenant_id = :tenant_id"]
            params = {"tenant_id": self.tenant_id}
            
            if vendor_id:
                conditions.append("vendor_id = :vendor_id")
                params["vendor_id"] = vendor_id
            if status:
                conditions.append("status = :status")
                params["status"] = status
            if payment_status:
                conditions.append("payment_status = :payment_status")
                params["payment_status"] = payment_status
            
            query = text(f"""
                SELECT id, bill_number, vendor_id, bill_date, due_date,
                       subtotal, tax_amount, total_amount, amount_paid,
                       amount_outstanding, status, payment_status
                FROM vendor_bills
                WHERE {' AND '.join(conditions)}
                ORDER BY bill_date DESC
            """)
            
            result = self.db.execute(query, params)
            
            bills = []
            for row in result:
                bills.append({
                    "id": row[0],
                    "bill_number": row[1],
                    "vendor_id": row[2],
                    "bill_date": row[3],
                    "due_date": row[4],
                    "subtotal": float(row[5]),
                    "tax_amount": float(row[6]),
                    "total_amount": float(row[7]),
                    "amount_paid": float(row[8]),
                    "amount_outstanding": float(row[9]),
                    "status": row[10],
                    "payment_status": row[11]
                })
            return bills
    
    def create_vendor_bill(self, bill_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new vendor bill"""
        if self.mode == "api":
            response = requests.post(
                f"{self.api_base_url}/api/ap/bills",
                headers=self._get_headers(),
                json=bill_data
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            raise NotImplementedError("Direct DB bill creation not implemented - use API mode")
    
    def approve_vendor_bill(self, bill_id: int) -> Dict[str, Any]:
        """Approve a vendor bill"""
        if self.mode == "api":
            response = requests.post(
                f"{self.api_base_url}/api/ap/bills/{bill_id}/approve",
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            query = text("""
                UPDATE vendor_bills
                SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP
                WHERE id = :bill_id AND tenant_id = :tenant_id
            """)
            self.db.execute(query, {"bill_id": bill_id, "tenant_id": self.tenant_id})
            self.db.commit()
            return {"success": True, "message": "Bill approved"}
    
    
    def get_vat_returns(
        self,
        year: Optional[int] = None,
        period: Optional[int] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get list of VAT returns"""
        if self.mode == "api":
            params = {}
            if year:
                params["year"] = year
            if period:
                params["period"] = period
            if status:
                params["status"] = status
            
            response = requests.get(
                f"{self.api_base_url}/api/vat/returns",
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            conditions = ["tenant_id = :tenant_id"]
            params = {"tenant_id": self.tenant_id}
            
            if year:
                conditions.append("year = :year")
                params["year"] = year
            if period:
                conditions.append("period = :period")
                params["period"] = period
            if status:
                conditions.append("status = :status")
                params["status"] = status
            
            query = text(f"""
                SELECT id, return_number, year, period, period_start, period_end,
                       output_vat, input_vat, net_vat, status
                FROM vat_returns
                WHERE {' AND '.join(conditions)}
                ORDER BY year DESC, period DESC
            """)
            
            result = self.db.execute(query, params)
            
            returns = []
            for row in result:
                returns.append({
                    "id": row[0],
                    "return_number": row[1],
                    "year": row[2],
                    "period": row[3],
                    "period_start": row[4],
                    "period_end": row[5],
                    "output_vat": float(row[6]),
                    "input_vat": float(row[7]),
                    "net_vat": float(row[8]),
                    "status": row[9]
                })
            return returns
    
    def create_vat_return(self, return_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new VAT return"""
        if self.mode == "api":
            response = requests.post(
                f"{self.api_base_url}/api/vat/returns",
                headers=self._get_headers(),
                json=return_data
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            raise NotImplementedError("Direct DB VAT return creation not implemented - use API mode")
    
    
    def get_trial_balance(
        self,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get trial balance report"""
        if self.mode == "api":
            params = {}
            if from_date:
                params["from_date"] = from_date.isoformat()
            if to_date:
                params["to_date"] = to_date.isoformat()
            
            response = requests.get(
                f"{self.api_base_url}/api/reports/trial-balance",
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            raise NotImplementedError("Direct DB trial balance not implemented - use API mode")
    
    def get_aged_receivables(self, as_of_date: Optional[date] = None) -> Dict[str, Any]:
        """Get aged receivables report"""
        if self.mode == "api":
            params = {}
            if as_of_date:
                params["as_of_date"] = as_of_date.isoformat()
            
            response = requests.get(
                f"{self.api_base_url}/api/reports/aged-receivables",
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            raise NotImplementedError("Direct DB aged receivables not implemented - use API mode")
    
    def get_aged_payables(self, as_of_date: Optional[date] = None) -> Dict[str, Any]:
        """Get aged payables report"""
        if self.mode == "api":
            params = {}
            if as_of_date:
                params["as_of_date"] = as_of_date.isoformat()
            
            response = requests.get(
                f"{self.api_base_url}/api/ap/reports/aged-payables",
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            return response.json()
        
        else:  # DB mode
            raise NotImplementedError("Direct DB aged payables not implemented - use API mode")
