"""
API Client for Testing
"""
import requests
from typing import Optional, Dict, Any
import time
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import BASE_URL, COMPANY_ID, TIMEOUT


class APIClient:
    """API client with authentication and company context"""
    
    def __init__(self, base_url: str = BASE_URL, token: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
        })
        if token:
            self.set_token(token)
        self.company_id = COMPANY_ID
        self.latencies = []
    
    def set_token(self, token: str):
        """Set authentication token"""
        self.session.headers['Authorization'] = f'Bearer {token}'
    
    def set_company_id(self, company_id: str):
        """Set company ID for requests"""
        self.company_id = company_id
    
    def _add_company_id(self, params: Optional[Dict] = None) -> Dict:
        """Add company_id to query parameters"""
        params = params or {}
        if self.company_id and 'company_id' not in params:
            params['company_id'] = self.company_id
        return params
    
    def _record_latency(self, duration_ms: float):
        """Record request latency"""
        self.latencies.append(duration_ms)
    
    def get(self, path: str, params: Optional[Dict] = None, **kwargs) -> requests.Response:
        """GET request with company_id"""
        url = f"{self.base_url}{path}"
        params = self._add_company_id(params)
        start = time.time()
        response = self.session.get(url, params=params, timeout=TIMEOUT, **kwargs)
        self._record_latency((time.time() - start) * 1000)
        return response
    
    def post(self, path: str, json: Optional[Dict] = None, **kwargs) -> requests.Response:
        """POST request"""
        url = f"{self.base_url}{path}"
        start = time.time()
        response = self.session.post(url, json=json, timeout=TIMEOUT, **kwargs)
        self._record_latency((time.time() - start) * 1000)
        return response
    
    def put(self, path: str, json: Optional[Dict] = None, **kwargs) -> requests.Response:
        """PUT request"""
        url = f"{self.base_url}{path}"
        start = time.time()
        response = self.session.put(url, json=json, timeout=TIMEOUT, **kwargs)
        self._record_latency((time.time() - start) * 1000)
        return response
    
    def delete(self, path: str, **kwargs) -> requests.Response:
        """DELETE request"""
        url = f"{self.base_url}{path}"
        start = time.time()
        response = self.session.delete(url, timeout=TIMEOUT, **kwargs)
        self._record_latency((time.time() - start) * 1000)
        return response
    
    def get_median_latency(self) -> float:
        """Get median latency in ms"""
        if not self.latencies:
            return 0.0
        sorted_latencies = sorted(self.latencies)
        mid = len(sorted_latencies) // 2
        if len(sorted_latencies) % 2 == 0:
            return (sorted_latencies[mid - 1] + sorted_latencies[mid]) / 2
        return sorted_latencies[mid]
    
    def get_p95_latency(self) -> float:
        """Get 95th percentile latency in ms"""
        if not self.latencies:
            return 0.0
        sorted_latencies = sorted(self.latencies)
        index = int(len(sorted_latencies) * 0.95)
        return sorted_latencies[min(index, len(sorted_latencies) - 1)]
