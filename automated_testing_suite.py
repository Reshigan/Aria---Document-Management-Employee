#!/usr/bin/env python3
"""
🧪 ARIA COMPREHENSIVE AUTOMATED TESTING SUITE
Tests every feature automatically before deployment
"""

import asyncio
import aiohttp
import json
import time
import os
import subprocess
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import tempfile
import io

class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    NC = '\033[0m'  # No Color

class AriaTestSuite:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.test_results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_categories": {},
            "detailed_results": []
        }
        self.auth_token = None
        self.test_user_credentials = {
            "admin": {"username": "admin@aria.vantax.co.za", "password": "admin123"},
            "demo": {"username": "demo@aria.vantax.co.za", "password": "demo123"}
        }

    def print_status(self, message: str, status: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        if status == "SUCCESS":
            print(f"{Colors.GREEN}✅ [{timestamp}] {message}{Colors.NC}")
        elif status == "ERROR":
            print(f"{Colors.RED}❌ [{timestamp}] {message}{Colors.NC}")
        elif status == "WARNING":
            print(f"{Colors.YELLOW}⚠️  [{timestamp}] {message}{Colors.NC}")
        elif status == "INFO":
            print(f"{Colors.BLUE}ℹ️  [{timestamp}] {message}{Colors.NC}")
        elif status == "TEST":
            print(f"{Colors.PURPLE}🧪 [{timestamp}] {message}{Colors.NC}")
        else:
            print(f"[{timestamp}] {message}")

    async def setup_session(self):
        """Setup HTTP session for testing"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(verify_ssl=False)
        )

    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()

    def record_test_result(self, category: str, test_name: str, success: bool, details: Dict = None):
        """Record test result"""
        self.test_results["total_tests"] += 1
        
        if success:
            self.test_results["passed_tests"] += 1
        else:
            self.test_results["failed_tests"] += 1
        
        if category not in self.test_results["test_categories"]:
            self.test_results["test_categories"][category] = {"passed": 0, "failed": 0, "tests": []}
        
        self.test_results["test_categories"][category]["tests"].append({
            "name": test_name,
            "success": success,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        })
        
        if success:
            self.test_results["test_categories"][category]["passed"] += 1
        else:
            self.test_results["test_categories"][category]["failed"] += 1

    async def test_backend_health(self) -> bool:
        """Test backend health endpoints"""
        self.print_status("Testing Backend Health Endpoints", "TEST")
        
        health_endpoints = [
            "/health",
            "/api/health",
            "/api/health/detailed",
            "/api/health/ready",
            "/api/health/live"
        ]
        
        all_passed = True
        
        for endpoint in health_endpoints:
            try:
                async with self.session.get(f"{self.base_url}{endpoint}") as response:
                    if response.status == 200:
                        data = await response.json()
                        if "status" in data and data["status"] in ["healthy", "ready", "alive"]:
                            self.print_status(f"  ✅ {endpoint}: {data.get('status', 'OK')}", "SUCCESS")
                            self.record_test_result("backend_health", f"health_{endpoint.replace('/', '_')}", True, {"status_code": response.status, "response": data})
                        else:
                            self.print_status(f"  ⚠️  {endpoint}: Unexpected response format", "WARNING")
                            self.record_test_result("backend_health", f"health_{endpoint.replace('/', '_')}", False, {"status_code": response.status, "response": data})
                            all_passed = False
                    else:
                        self.print_status(f"  ❌ {endpoint}: HTTP {response.status}", "ERROR")
                        self.record_test_result("backend_health", f"health_{endpoint.replace('/', '_')}", False, {"status_code": response.status})
                        all_passed = False
            except Exception as e:
                self.print_status(f"  ❌ {endpoint}: {str(e)}", "ERROR")
                self.record_test_result("backend_health", f"health_{endpoint.replace('/', '_')}", False, {"error": str(e)})
                all_passed = False
        
        return all_passed

    async def test_authentication_system(self) -> bool:
        """Test authentication system comprehensively"""
        self.print_status("Testing Authentication System", "TEST")
        
        all_passed = True
        
        # Test 1: Login with admin credentials
        try:
            login_data = aiohttp.FormData()
            login_data.add_field('username', self.test_user_credentials["admin"]["username"])
            login_data.add_field('password', self.test_user_credentials["admin"]["password"])
            
            async with self.session.post(f"{self.base_url}/api/auth/login", data=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    if "access_token" in data:
                        self.auth_token = data["access_token"]
                        self.print_status("  ✅ Admin login successful", "SUCCESS")
                        self.record_test_result("authentication", "admin_login", True, {"token_received": True})
                    else:
                        self.print_status("  ❌ Admin login: No access token received", "ERROR")
                        self.record_test_result("authentication", "admin_login", False, {"status_code": response.status, "response": data})
                        all_passed = False
                else:
                    self.print_status(f"  ❌ Admin login failed: HTTP {response.status}", "ERROR")
                    self.record_test_result("authentication", "admin_login", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ Admin login error: {str(e)}", "ERROR")
            self.record_test_result("authentication", "admin_login", False, {"error": str(e)})
            all_passed = False

        # Test 2: Test protected endpoint without token
        try:
            async with self.session.get(f"{self.base_url}/api/documents") as response:
                if response.status in [401, 403]:
                    self.print_status("  ✅ Protected endpoint properly secured", "SUCCESS")
                    self.record_test_result("authentication", "protected_endpoint_security", True, {"status_code": response.status})
                else:
                    self.print_status(f"  ❌ Protected endpoint not secured: HTTP {response.status}", "ERROR")
                    self.record_test_result("authentication", "protected_endpoint_security", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ Protected endpoint test error: {str(e)}", "ERROR")
            self.record_test_result("authentication", "protected_endpoint_security", False, {"error": str(e)})
            all_passed = False

        # Test 3: Test protected endpoint with token
        if self.auth_token:
            try:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                async with self.session.get(f"{self.base_url}/api/documents", headers=headers) as response:
                    if response.status == 200:
                        self.print_status("  ✅ Authenticated access working", "SUCCESS")
                        self.record_test_result("authentication", "authenticated_access", True, {"status_code": response.status})
                    else:
                        self.print_status(f"  ⚠️  Authenticated access: HTTP {response.status}", "WARNING")
                        self.record_test_result("authentication", "authenticated_access", False, {"status_code": response.status})
                        all_passed = False
            except Exception as e:
                self.print_status(f"  ❌ Authenticated access error: {str(e)}", "ERROR")
                self.record_test_result("authentication", "authenticated_access", False, {"error": str(e)})
                all_passed = False

        # Test 4: Test user info endpoint
        if self.auth_token:
            try:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                async with self.session.get(f"{self.base_url}/api/auth/me", headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        if "username" in data and "email" in data:
                            self.print_status("  ✅ User info endpoint working", "SUCCESS")
                            self.record_test_result("authentication", "user_info", True, {"status_code": response.status, "user_data": data})
                        else:
                            self.print_status("  ❌ User info: Invalid response format", "ERROR")
                            self.record_test_result("authentication", "user_info", False, {"status_code": response.status, "response": data})
                            all_passed = False
                    else:
                        self.print_status(f"  ❌ User info failed: HTTP {response.status}", "ERROR")
                        self.record_test_result("authentication", "user_info", False, {"status_code": response.status})
                        all_passed = False
            except Exception as e:
                self.print_status(f"  ❌ User info error: {str(e)}", "ERROR")
                self.record_test_result("authentication", "user_info", False, {"error": str(e)})
                all_passed = False

        return all_passed

    async def test_document_management(self) -> bool:
        """Test document management features"""
        self.print_status("Testing Document Management", "TEST")
        
        if not self.auth_token:
            self.print_status("  ❌ No auth token available for document tests", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        all_passed = True
        
        # Test 1: List documents
        try:
            async with self.session.get(f"{self.base_url}/api/documents", headers=headers) as response:
                if response.status == 200:
                    documents = await response.json()
                    self.print_status(f"  ✅ Document listing: {len(documents)} documents found", "SUCCESS")
                    self.record_test_result("document_management", "list_documents", True, {"status_code": response.status, "document_count": len(documents)})
                else:
                    self.print_status(f"  ❌ Document listing failed: HTTP {response.status}", "ERROR")
                    self.record_test_result("document_management", "list_documents", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ Document listing error: {str(e)}", "ERROR")
            self.record_test_result("document_management", "list_documents", False, {"error": str(e)})
            all_passed = False

        # Test 2: Upload document
        try:
            # Create a test file
            test_content = "This is a test document for automated testing."
            
            data = aiohttp.FormData()
            data.add_field('file', 
                          io.BytesIO(test_content.encode()), 
                          filename='test_document.txt',
                          content_type='text/plain')
            
            async with self.session.post(f"{self.base_url}/api/documents/upload", 
                                       headers=headers, 
                                       data=data) as response:
                if response.status == 200:
                    result = await response.json()
                    if "document_id" in result:
                        self.print_status(f"  ✅ Document upload successful: ID {result['document_id']}", "SUCCESS")
                        self.record_test_result("document_management", "upload_document", True, {"status_code": response.status, "document_id": result["document_id"]})
                        
                        # Store document ID for further tests
                        self.test_document_id = result["document_id"]
                    else:
                        self.print_status("  ❌ Document upload: No document ID returned", "ERROR")
                        self.record_test_result("document_management", "upload_document", False, {"status_code": response.status, "response": result})
                        all_passed = False
                else:
                    self.print_status(f"  ❌ Document upload failed: HTTP {response.status}", "ERROR")
                    self.record_test_result("document_management", "upload_document", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ Document upload error: {str(e)}", "ERROR")
            self.record_test_result("document_management", "upload_document", False, {"error": str(e)})
            all_passed = False

        # Test 3: Get document details
        if hasattr(self, 'test_document_id'):
            try:
                async with self.session.get(f"{self.base_url}/api/documents/{self.test_document_id}", headers=headers) as response:
                    if response.status == 200:
                        doc_details = await response.json()
                        if "id" in doc_details and "original_filename" in doc_details:
                            self.print_status(f"  ✅ Document details retrieved: {doc_details['original_filename']}", "SUCCESS")
                            self.record_test_result("document_management", "get_document_details", True, {"status_code": response.status, "document": doc_details})
                        else:
                            self.print_status("  ❌ Document details: Invalid response format", "ERROR")
                            self.record_test_result("document_management", "get_document_details", False, {"status_code": response.status, "response": doc_details})
                            all_passed = False
                    else:
                        self.print_status(f"  ❌ Document details failed: HTTP {response.status}", "ERROR")
                        self.record_test_result("document_management", "get_document_details", False, {"status_code": response.status})
                        all_passed = False
            except Exception as e:
                self.print_status(f"  ❌ Document details error: {str(e)}", "ERROR")
                self.record_test_result("document_management", "get_document_details", False, {"error": str(e)})
                all_passed = False

        # Test 4: Download document
        if hasattr(self, 'test_document_id'):
            try:
                async with self.session.get(f"{self.base_url}/api/documents/{self.test_document_id}/download", headers=headers) as response:
                    if response.status == 200:
                        download_info = await response.json()
                        if "status" in download_info:
                            self.print_status(f"  ✅ Document download info: {download_info['status']}", "SUCCESS")
                            self.record_test_result("document_management", "download_document", True, {"status_code": response.status, "download_info": download_info})
                        else:
                            self.print_status("  ❌ Document download: Invalid response format", "ERROR")
                            self.record_test_result("document_management", "download_document", False, {"status_code": response.status, "response": download_info})
                            all_passed = False
                    else:
                        self.print_status(f"  ❌ Document download failed: HTTP {response.status}", "ERROR")
                        self.record_test_result("document_management", "download_document", False, {"status_code": response.status})
                        all_passed = False
            except Exception as e:
                self.print_status(f"  ❌ Document download error: {str(e)}", "ERROR")
                self.record_test_result("document_management", "download_document", False, {"error": str(e)})
                all_passed = False

        return all_passed

    async def test_admin_features(self) -> bool:
        """Test admin-specific features"""
        self.print_status("Testing Admin Features", "TEST")
        
        if not self.auth_token:
            self.print_status("  ❌ No auth token available for admin tests", "ERROR")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        all_passed = True
        
        # Test 1: List all users (admin only)
        try:
            async with self.session.get(f"{self.base_url}/api/admin/users", headers=headers) as response:
                if response.status == 200:
                    users = await response.json()
                    self.print_status(f"  ✅ Admin user listing: {len(users)} users found", "SUCCESS")
                    self.record_test_result("admin_features", "list_all_users", True, {"status_code": response.status, "user_count": len(users)})
                elif response.status == 403:
                    self.print_status("  ⚠️  Admin user listing: Access denied (expected for non-admin)", "WARNING")
                    self.record_test_result("admin_features", "list_all_users", True, {"status_code": response.status, "note": "Access properly restricted"})
                else:
                    self.print_status(f"  ❌ Admin user listing failed: HTTP {response.status}", "ERROR")
                    self.record_test_result("admin_features", "list_all_users", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ Admin user listing error: {str(e)}", "ERROR")
            self.record_test_result("admin_features", "list_all_users", False, {"error": str(e)})
            all_passed = False

        # Test 2: System statistics
        try:
            async with self.session.get(f"{self.base_url}/api/admin/stats", headers=headers) as response:
                if response.status == 200:
                    stats = await response.json()
                    if "users" in stats and "documents" in stats:
                        self.print_status(f"  ✅ System stats: {stats['users']['total']} users, {stats['documents']['total']} documents", "SUCCESS")
                        self.record_test_result("admin_features", "system_stats", True, {"status_code": response.status, "stats": stats})
                    else:
                        self.print_status("  ❌ System stats: Invalid response format", "ERROR")
                        self.record_test_result("admin_features", "system_stats", False, {"status_code": response.status, "response": stats})
                        all_passed = False
                elif response.status == 403:
                    self.print_status("  ⚠️  System stats: Access denied (expected for non-admin)", "WARNING")
                    self.record_test_result("admin_features", "system_stats", True, {"status_code": response.status, "note": "Access properly restricted"})
                else:
                    self.print_status(f"  ❌ System stats failed: HTTP {response.status}", "ERROR")
                    self.record_test_result("admin_features", "system_stats", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ System stats error: {str(e)}", "ERROR")
            self.record_test_result("admin_features", "system_stats", False, {"error": str(e)})
            all_passed = False

        return all_passed

    async def test_performance_metrics(self) -> bool:
        """Test system performance"""
        self.print_status("Testing Performance Metrics", "TEST")
        
        all_passed = True
        performance_data = []
        
        # Test multiple endpoints for performance
        test_endpoints = [
            "/health",
            "/api/health",
            "/api/health/detailed"
        ]
        
        for endpoint in test_endpoints:
            try:
                start_time = time.time()
                async with self.session.get(f"{self.base_url}{endpoint}") as response:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                    
                    performance_data.append({
                        "endpoint": endpoint,
                        "response_time_ms": response_time,
                        "status_code": response.status
                    })
                    
                    if response_time < 1000:  # Less than 1 second
                        self.print_status(f"  ✅ {endpoint}: {response_time:.0f}ms", "SUCCESS")
                        self.record_test_result("performance", f"response_time_{endpoint.replace('/', '_')}", True, {"response_time_ms": response_time, "status_code": response.status})
                    else:
                        self.print_status(f"  ⚠️  {endpoint}: {response_time:.0f}ms (slow)", "WARNING")
                        self.record_test_result("performance", f"response_time_{endpoint.replace('/', '_')}", False, {"response_time_ms": response_time, "status_code": response.status})
                        all_passed = False
                        
            except Exception as e:
                self.print_status(f"  ❌ {endpoint} performance test error: {str(e)}", "ERROR")
                self.record_test_result("performance", f"response_time_{endpoint.replace('/', '_')}", False, {"error": str(e)})
                all_passed = False
        
        # Calculate average response time
        if performance_data:
            avg_response_time = sum(p["response_time_ms"] for p in performance_data) / len(performance_data)
            self.print_status(f"  📊 Average response time: {avg_response_time:.0f}ms", "INFO")
            self.record_test_result("performance", "average_response_time", avg_response_time < 500, {"average_response_time_ms": avg_response_time})
        
        return all_passed

    async def test_error_handling(self) -> bool:
        """Test error handling and edge cases"""
        self.print_status("Testing Error Handling", "TEST")
        
        all_passed = True
        
        # Test 1: Invalid endpoint
        try:
            async with self.session.get(f"{self.base_url}/api/nonexistent") as response:
                if response.status == 404:
                    self.print_status("  ✅ 404 error handling working", "SUCCESS")
                    self.record_test_result("error_handling", "404_handling", True, {"status_code": response.status})
                else:
                    self.print_status(f"  ❌ Invalid endpoint returned: HTTP {response.status}", "ERROR")
                    self.record_test_result("error_handling", "404_handling", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ 404 test error: {str(e)}", "ERROR")
            self.record_test_result("error_handling", "404_handling", False, {"error": str(e)})
            all_passed = False

        # Test 2: Invalid login credentials
        try:
            login_data = aiohttp.FormData()
            login_data.add_field('username', 'invalid@user.com')
            login_data.add_field('password', 'wrongpassword')
            
            async with self.session.post(f"{self.base_url}/api/auth/login", data=login_data) as response:
                if response.status == 401:
                    self.print_status("  ✅ Invalid login properly rejected", "SUCCESS")
                    self.record_test_result("error_handling", "invalid_login", True, {"status_code": response.status})
                else:
                    self.print_status(f"  ❌ Invalid login not properly handled: HTTP {response.status}", "ERROR")
                    self.record_test_result("error_handling", "invalid_login", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ Invalid login test error: {str(e)}", "ERROR")
            self.record_test_result("error_handling", "invalid_login", False, {"error": str(e)})
            all_passed = False

        # Test 3: Invalid token
        try:
            headers = {"Authorization": "Bearer invalid_token_12345"}
            async with self.session.get(f"{self.base_url}/api/documents", headers=headers) as response:
                if response.status in [401, 403]:
                    self.print_status("  ✅ Invalid token properly rejected", "SUCCESS")
                    self.record_test_result("error_handling", "invalid_token", True, {"status_code": response.status})
                else:
                    self.print_status(f"  ❌ Invalid token not properly handled: HTTP {response.status}", "ERROR")
                    self.record_test_result("error_handling", "invalid_token", False, {"status_code": response.status})
                    all_passed = False
        except Exception as e:
            self.print_status(f"  ❌ Invalid token test error: {str(e)}", "ERROR")
            self.record_test_result("error_handling", "invalid_token", False, {"error": str(e)})
            all_passed = False

        return all_passed

    def test_frontend_build(self) -> bool:
        """Test frontend build process"""
        self.print_status("Testing Frontend Build", "TEST")
        
        frontend_path = Path("frontend")
        if not frontend_path.exists():
            self.print_status("  ❌ Frontend directory not found", "ERROR")
            self.record_test_result("frontend", "directory_exists", False, {"error": "Frontend directory not found"})
            return False
        
        # Test 1: Check package.json exists
        package_json = frontend_path / "package.json"
        if package_json.exists():
            self.print_status("  ✅ package.json found", "SUCCESS")
            self.record_test_result("frontend", "package_json_exists", True)
        else:
            self.print_status("  ❌ package.json not found", "ERROR")
            self.record_test_result("frontend", "package_json_exists", False)
            return False
        
        # Test 2: Install dependencies
        try:
            self.print_status("  🔄 Installing frontend dependencies...", "INFO")
            result = subprocess.run(
                ["npm", "install"],
                cwd=frontend_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            if result.returncode == 0:
                self.print_status("  ✅ Dependencies installed successfully", "SUCCESS")
                self.record_test_result("frontend", "npm_install", True)
            else:
                self.print_status(f"  ❌ npm install failed: {result.stderr}", "ERROR")
                self.record_test_result("frontend", "npm_install", False, {"error": result.stderr})
                return False
        except subprocess.TimeoutExpired:
            self.print_status("  ❌ npm install timed out", "ERROR")
            self.record_test_result("frontend", "npm_install", False, {"error": "Timeout"})
            return False
        except Exception as e:
            self.print_status(f"  ❌ npm install error: {str(e)}", "ERROR")
            self.record_test_result("frontend", "npm_install", False, {"error": str(e)})
            return False
        
        # Test 3: Build frontend
        try:
            self.print_status("  🔄 Building frontend...", "INFO")
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=frontend_path,
                capture_output=True,
                text=True,
                timeout=600  # 10 minutes timeout
            )
            
            if result.returncode == 0:
                self.print_status("  ✅ Frontend build successful", "SUCCESS")
                self.record_test_result("frontend", "npm_build", True)
                
                # Check if dist directory was created
                dist_path = frontend_path / "dist"
                if dist_path.exists():
                    self.print_status("  ✅ Build output directory created", "SUCCESS")
                    self.record_test_result("frontend", "build_output", True)
                else:
                    self.print_status("  ⚠️  Build output directory not found", "WARNING")
                    self.record_test_result("frontend", "build_output", False)
                
                return True
            else:
                self.print_status(f"  ❌ Frontend build failed: {result.stderr}", "ERROR")
                self.record_test_result("frontend", "npm_build", False, {"error": result.stderr})
                return False
        except subprocess.TimeoutExpired:
            self.print_status("  ❌ Frontend build timed out", "ERROR")
            self.record_test_result("frontend", "npm_build", False, {"error": "Timeout"})
            return False
        except Exception as e:
            self.print_status(f"  ❌ Frontend build error: {str(e)}", "ERROR")
            self.record_test_result("frontend", "npm_build", False, {"error": str(e)})
            return False

    async def run_comprehensive_tests(self) -> bool:
        """Run all tests in the suite"""
        print(f"\n{Colors.WHITE}{'='*80}{Colors.NC}")
        print(f"{Colors.WHITE}🧪 ARIA COMPREHENSIVE AUTOMATED TESTING SUITE{Colors.NC}")
        print(f"{Colors.WHITE}{'='*80}{Colors.NC}")
        print(f"{Colors.CYAN}Target: {self.base_url}{Colors.NC}")
        print(f"{Colors.CYAN}Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}{Colors.NC}")
        print(f"{Colors.WHITE}{'='*80}{Colors.NC}\n")

        await self.setup_session()
        
        try:
            # Run all test categories
            test_categories = [
                ("Backend Health", self.test_backend_health),
                ("Authentication System", self.test_authentication_system),
                ("Document Management", self.test_document_management),
                ("Admin Features", self.test_admin_features),
                ("Performance Metrics", self.test_performance_metrics),
                ("Error Handling", self.test_error_handling),
            ]
            
            all_passed = True
            
            for category_name, test_function in test_categories:
                self.print_status(f"Running {category_name} tests...", "TEST")
                try:
                    result = await test_function()
                    if not result:
                        all_passed = False
                except Exception as e:
                    self.print_status(f"  ❌ {category_name} test suite failed: {str(e)}", "ERROR")
                    all_passed = False
                print()  # Add spacing between test categories
            
            # Run frontend tests (synchronous)
            self.print_status("Running Frontend Build tests...", "TEST")
            try:
                frontend_result = self.test_frontend_build()
                if not frontend_result:
                    all_passed = False
            except Exception as e:
                self.print_status(f"  ❌ Frontend test suite failed: {str(e)}", "ERROR")
                all_passed = False
            
            # Generate summary
            self.generate_test_summary()
            
            return all_passed
            
        finally:
            await self.cleanup_session()

    def generate_test_summary(self):
        """Generate and display test summary"""
        print(f"\n{Colors.WHITE}{'='*80}{Colors.NC}")
        print(f"{Colors.WHITE}📊 TEST SUMMARY{Colors.NC}")
        print(f"{Colors.WHITE}{'='*80}{Colors.NC}")
        
        total_tests = self.test_results["total_tests"]
        passed_tests = self.test_results["passed_tests"]
        failed_tests = self.test_results["failed_tests"]
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"{Colors.CYAN}Total Tests: {total_tests}{Colors.NC}")
        print(f"{Colors.GREEN}Passed: {passed_tests}{Colors.NC}")
        print(f"{Colors.RED}Failed: {failed_tests}{Colors.NC}")
        print(f"{Colors.YELLOW}Success Rate: {success_rate:.1f}%{Colors.NC}")
        print()
        
        # Category breakdown
        print(f"{Colors.WHITE}📋 CATEGORY BREAKDOWN:{Colors.NC}")
        for category, results in self.test_results["test_categories"].items():
            category_total = results["passed"] + results["failed"]
            category_rate = (results["passed"] / category_total * 100) if category_total > 0 else 0
            
            if category_rate >= 90:
                status_color = Colors.GREEN
                status_icon = "✅"
            elif category_rate >= 70:
                status_color = Colors.YELLOW
                status_icon = "⚠️"
            else:
                status_color = Colors.RED
                status_icon = "❌"
            
            print(f"  {status_icon} {status_color}{category.replace('_', ' ').title()}: {results['passed']}/{category_total} ({category_rate:.1f}%){Colors.NC}")
        
        print()
        
        # Overall assessment
        if success_rate >= 90:
            print(f"{Colors.GREEN}🎉 EXCELLENT: System ready for production deployment!{Colors.NC}")
        elif success_rate >= 75:
            print(f"{Colors.YELLOW}⚠️  GOOD: System mostly ready, minor issues to address{Colors.NC}")
        elif success_rate >= 50:
            print(f"{Colors.YELLOW}⚠️  FAIR: System needs improvements before deployment{Colors.NC}")
        else:
            print(f"{Colors.RED}❌ POOR: Critical issues prevent deployment{Colors.NC}")
        
        # Save results to file
        with open("automated_test_results.json", "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        self.print_status("Test results saved to automated_test_results.json", "INFO")

async def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Aria Automated Testing Suite")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL for testing")
    parser.add_argument("--production", action="store_true", help="Test production server")
    
    args = parser.parse_args()
    
    if args.production:
        base_url = "https://aria.vantax.co.za"
    else:
        base_url = args.url
    
    test_suite = AriaTestSuite(base_url)
    
    try:
        success = await test_suite.run_comprehensive_tests()
        
        if success:
            print(f"\n{Colors.GREEN}🎉 ALL TESTS PASSED - SYSTEM READY FOR DEPLOYMENT!{Colors.NC}")
            sys.exit(0)
        else:
            print(f"\n{Colors.YELLOW}⚠️  SOME TESTS FAILED - REVIEW RESULTS BEFORE DEPLOYMENT{Colors.NC}")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Testing interrupted by user{Colors.NC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Testing suite failed: {e}{Colors.NC}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())