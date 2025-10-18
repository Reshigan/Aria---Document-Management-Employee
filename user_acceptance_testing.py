#!/usr/bin/env python3
"""
User Acceptance Testing (UAT) Script for Aria Document Management System
Comprehensive testing of all user-facing functionality and workflows
"""

import requests
import json
import time
import os
import tempfile
from datetime import datetime
from typing import Dict, List, Any

class AriaUATTester:
    def __init__(self, base_url="https://aria.vantax.co.za"):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        self.test_results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_details": [],
            "critical_issues": [],
            "recommendations": []
        }
    
    def log_test(self, test_name: str, status: str, message: str, severity: str = "info"):
        """Log test results"""
        self.test_results["total_tests"] += 1
        
        if status == "PASS":
            self.test_results["passed_tests"] += 1
            icon = "✅"
        else:
            self.test_results["failed_tests"] += 1
            icon = "❌"
            if severity == "critical":
                self.test_results["critical_issues"].append({
                    "test": test_name,
                    "message": message
                })
        
        result = {
            "test_name": test_name,
            "status": status,
            "message": message,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        }
        
        self.test_results["test_details"].append(result)
        print(f"{icon} [{test_name}] {message}")
    
    def test_system_accessibility(self):
        """Test basic system accessibility"""
        print("\n🌐 Testing System Accessibility...")
        
        try:
            # Test homepage
            response = self.session.get(self.base_url, timeout=10)
            if response.status_code == 200:
                self.log_test("Homepage Access", "PASS", "Homepage loads successfully")
            else:
                self.log_test("Homepage Access", "FAIL", f"Homepage returned {response.status_code}", "critical")
            
            # Test API health
            response = self.session.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code == 200:
                self.log_test("API Health", "PASS", "API health endpoint accessible")
            else:
                self.log_test("API Health", "FAIL", f"API health returned {response.status_code}", "critical")
            
            # Test dashboard page
            response = self.session.get(f"{self.base_url}/dashboard", timeout=10)
            if response.status_code == 200:
                self.log_test("Dashboard Page", "PASS", "Dashboard page loads successfully")
            else:
                self.log_test("Dashboard Page", "FAIL", f"Dashboard returned {response.status_code}", "high")
        
        except Exception as e:
            self.log_test("System Access", "FAIL", f"System accessibility error: {e}", "critical")
    
    def test_user_authentication(self):
        """Test user authentication workflows"""
        print("\n🔐 Testing User Authentication...")
        
        # Test login with demo credentials
        try:
            login_data = {
                "username": "demo@aria.vantax.co.za",
                "password": "demo123"
            }
            
            response = self.session.post(f"{self.base_url}/api/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                
                if self.token:
                    self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                    self.log_test("Demo Login", "PASS", "Demo user login successful")
                else:
                    self.log_test("Demo Login", "FAIL", "Login successful but no token received", "high")
            else:
                self.log_test("Demo Login", "FAIL", f"Demo login failed: {response.status_code}", "critical")
        
        except Exception as e:
            self.log_test("Demo Login", "FAIL", f"Login error: {e}", "critical")
        
        # Test invalid login
        try:
            invalid_login = {
                "username": "invalid@test.com",
                "password": "wrongpassword"
            }
            
            response = self.session.post(f"{self.base_url}/api/auth/login", json=invalid_login, timeout=10)
            
            if response.status_code == 401:
                self.log_test("Invalid Login", "PASS", "Invalid credentials properly rejected")
            else:
                self.log_test("Invalid Login", "FAIL", f"Invalid login returned {response.status_code}", "medium")
        
        except Exception as e:
            self.log_test("Invalid Login", "FAIL", f"Invalid login test error: {e}", "low")
        
        # Test user profile retrieval
        if self.token:
            try:
                response = self.session.get(f"{self.base_url}/api/auth/me", timeout=10)
                
                if response.status_code == 200:
                    user_data = response.json()
                    if user_data.get("email") == "demo@aria.vantax.co.za":
                        self.log_test("User Profile", "PASS", "User profile retrieved successfully")
                    else:
                        self.log_test("User Profile", "FAIL", "User profile data incorrect", "medium")
                else:
                    self.log_test("User Profile", "FAIL", f"Profile retrieval failed: {response.status_code}", "high")
            
            except Exception as e:
                self.log_test("User Profile", "FAIL", f"Profile test error: {e}", "medium")
    
    def test_document_management(self):
        """Test document management functionality"""
        print("\n📄 Testing Document Management...")
        
        if not self.token:
            self.log_test("Document Tests", "FAIL", "Cannot test documents - no authentication token", "critical")
            return
        
        # Test document listing
        try:
            response = self.session.get(f"{self.base_url}/api/documents", timeout=10)
            
            if response.status_code == 200:
                documents = response.json()
                if isinstance(documents, dict) and "documents" in documents:
                    doc_count = len(documents["documents"])
                    self.log_test("Document Listing", "PASS", f"Retrieved {doc_count} documents")
                else:
                    self.log_test("Document Listing", "FAIL", "Document list format incorrect", "medium")
            else:
                self.log_test("Document Listing", "FAIL", f"Document listing failed: {response.status_code}", "high")
        
        except Exception as e:
            self.log_test("Document Listing", "FAIL", f"Document listing error: {e}", "high")
        
        # Test document upload
        try:
            # Create a test file
            test_content = f"UAT Test Document - {datetime.now().isoformat()}"
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(test_content)
                temp_file_path = f.name
            
            # Upload the file
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('uat_test_document.txt', f, 'text/plain')}
                data = {
                    'auto_process': 'true',
                    'ocr_engine': 'tesseract'
                }
                
                response = self.session.post(
                    f"{self.base_url}/api/documents/upload",
                    files=files,
                    data=data,
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    upload_result = response.json()
                    if upload_result.get("id"):
                        self.log_test("Document Upload", "PASS", "Document uploaded successfully")
                        self.uploaded_doc_id = upload_result["id"]
                    else:
                        self.log_test("Document Upload", "FAIL", "Upload successful but no document ID", "medium")
                else:
                    self.log_test("Document Upload", "FAIL", f"Document upload failed: {response.status_code}", "high")
            
            # Clean up
            os.unlink(temp_file_path)
        
        except Exception as e:
            self.log_test("Document Upload", "FAIL", f"Document upload error: {e}", "high")
        
        # Test document search
        try:
            search_params = {"q": "test", "limit": 10}
            response = self.session.get(f"{self.base_url}/api/documents/search", params=search_params, timeout=10)
            
            if response.status_code == 200:
                search_results = response.json()
                self.log_test("Document Search", "PASS", f"Search returned {len(search_results.get('documents', []))} results")
            else:
                self.log_test("Document Search", "FAIL", f"Document search failed: {response.status_code}", "medium")
        
        except Exception as e:
            self.log_test("Document Search", "FAIL", f"Document search error: {e}", "medium")
    
    def test_dashboard_functionality(self):
        """Test dashboard and analytics"""
        print("\n📊 Testing Dashboard Functionality...")
        
        if not self.token:
            self.log_test("Dashboard Tests", "FAIL", "Cannot test dashboard - no authentication token", "critical")
            return
        
        # Test dashboard stats
        try:
            response = self.session.get(f"{self.base_url}/api/dashboard/stats", timeout=10)
            
            if response.status_code == 200:
                stats = response.json()
                if isinstance(stats, dict) and any(key in stats for key in ["total_documents", "recent_uploads", "user_activity"]):
                    self.log_test("Dashboard Stats", "PASS", "Dashboard statistics retrieved successfully")
                else:
                    self.log_test("Dashboard Stats", "FAIL", "Dashboard stats format incorrect", "medium")
            else:
                self.log_test("Dashboard Stats", "FAIL", f"Dashboard stats failed: {response.status_code}", "high")
        
        except Exception as e:
            self.log_test("Dashboard Stats", "FAIL", f"Dashboard stats error: {e}", "high")
    
    def test_user_interface_pages(self):
        """Test user interface pages"""
        print("\n🖥️ Testing User Interface Pages...")
        
        # Test key pages
        pages_to_test = [
            ("/", "Homepage"),
            ("/dashboard", "Dashboard"),
            ("/documents", "Documents Page"),
            ("/login", "Login Page"),
            ("/settings", "Settings Page")
        ]
        
        for path, page_name in pages_to_test:
            try:
                response = self.session.get(f"{self.base_url}{path}", timeout=10)
                
                if response.status_code == 200:
                    # Check if it's a proper HTML page
                    if "<!DOCTYPE html>" in response.text or "<html" in response.text:
                        self.log_test(f"UI - {page_name}", "PASS", f"{page_name} loads successfully")
                    else:
                        self.log_test(f"UI - {page_name}", "FAIL", f"{page_name} doesn't return proper HTML", "medium")
                else:
                    self.log_test(f"UI - {page_name}", "FAIL", f"{page_name} returned {response.status_code}", "medium")
            
            except Exception as e:
                self.log_test(f"UI - {page_name}", "FAIL", f"{page_name} error: {e}", "medium")
    
    def test_performance_metrics(self):
        """Test system performance"""
        print("\n⚡ Testing Performance Metrics...")
        
        # Test response times
        endpoints_to_test = [
            ("/api/health", "Health Check"),
            ("/", "Homepage"),
            ("/api/documents", "Document API")
        ]
        
        for endpoint, name in endpoints_to_test:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # Convert to ms
                
                if response_time < 1000:  # Less than 1 second
                    self.log_test(f"Performance - {name}", "PASS", f"Response time: {response_time:.1f}ms")
                elif response_time < 3000:  # Less than 3 seconds
                    self.log_test(f"Performance - {name}", "PASS", f"Response time: {response_time:.1f}ms (acceptable)")
                else:
                    self.log_test(f"Performance - {name}", "FAIL", f"Response time: {response_time:.1f}ms (too slow)", "medium")
            
            except Exception as e:
                self.log_test(f"Performance - {name}", "FAIL", f"Performance test error: {e}", "low")
    
    def test_error_handling(self):
        """Test error handling"""
        print("\n🚨 Testing Error Handling...")
        
        # Test 404 handling
        try:
            response = self.session.get(f"{self.base_url}/nonexistent-page", timeout=10)
            
            if response.status_code == 404:
                self.log_test("404 Handling", "PASS", "404 errors properly handled")
            else:
                self.log_test("404 Handling", "FAIL", f"404 handling returned {response.status_code}", "low")
        
        except Exception as e:
            self.log_test("404 Handling", "FAIL", f"404 test error: {e}", "low")
        
        # Test API error handling
        try:
            response = self.session.get(f"{self.base_url}/api/nonexistent-endpoint", timeout=10)
            
            if response.status_code in [404, 405]:
                self.log_test("API Error Handling", "PASS", "API errors properly handled")
            else:
                self.log_test("API Error Handling", "FAIL", f"API error handling returned {response.status_code}", "medium")
        
        except Exception as e:
            self.log_test("API Error Handling", "FAIL", f"API error test error: {e}", "medium")
    
    def generate_uat_report(self):
        """Generate comprehensive UAT report"""
        success_rate = (self.test_results["passed_tests"] / self.test_results["total_tests"]) * 100 if self.test_results["total_tests"] > 0 else 0
        
        print("\n" + "=" * 80)
        print("🎯 USER ACCEPTANCE TESTING REPORT")
        print("=" * 80)
        print(f"📅 Test Date: {self.test_results['timestamp']}")
        print(f"🌐 Target System: {self.base_url}")
        print(f"📊 Total Tests: {self.test_results['total_tests']}")
        print(f"✅ Passed: {self.test_results['passed_tests']}")
        print(f"❌ Failed: {self.test_results['failed_tests']}")
        print(f"🎯 Success Rate: {success_rate:.1f}%")
        
        # Critical issues
        if self.test_results["critical_issues"]:
            print(f"\n🚨 CRITICAL ISSUES ({len(self.test_results['critical_issues'])}):")
            for issue in self.test_results["critical_issues"]:
                print(f"  ❌ {issue['test']}: {issue['message']}")
        
        # Overall assessment
        if success_rate >= 95:
            status = "🎉 EXCELLENT - System ready for production"
        elif success_rate >= 85:
            status = "✅ GOOD - Minor issues to address"
        elif success_rate >= 70:
            status = "⚠️  FAIR - Several issues need attention"
        else:
            status = "❌ POOR - Major issues must be resolved"
        
        print(f"\n🏆 OVERALL ASSESSMENT: {status}")
        
        # Recommendations
        if success_rate < 100:
            print(f"\n💡 RECOMMENDATIONS:")
            if self.test_results["critical_issues"]:
                print("  1. Address all critical issues before go-live")
            if success_rate < 90:
                print("  2. Conduct additional testing after fixes")
            if success_rate < 80:
                print("  3. Consider delaying launch until issues resolved")
        
        print("=" * 80)
        
        return self.test_results
    
    def run_uat(self):
        """Run complete User Acceptance Testing"""
        print("🎯 ARIA USER ACCEPTANCE TESTING")
        print("=" * 80)
        print(f"Target: {self.base_url}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Run all test suites
        self.test_system_accessibility()
        self.test_user_authentication()
        self.test_document_management()
        self.test_dashboard_functionality()
        self.test_user_interface_pages()
        self.test_performance_metrics()
        self.test_error_handling()
        
        # Generate report
        results = self.generate_uat_report()
        
        # Save results
        with open("uat_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: uat_results.json")
        
        return results


def main():
    """Main function"""
    tester = AriaUATTester()
    results = tester.run_uat()
    
    # Return appropriate exit code
    success_rate = (results["passed_tests"] / results["total_tests"]) * 100 if results["total_tests"] > 0 else 0
    return 0 if success_rate >= 85 else 1


if __name__ == "__main__":
    exit(main())