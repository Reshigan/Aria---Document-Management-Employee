#!/usr/bin/env python3
"""
Comprehensive Launch Checklist for Aria Document Management System
Final pre-launch validation and go-live procedures
"""

import requests
import json
import subprocess
import os
import time
from datetime import datetime
from typing import Dict, List, Any

class AriaLaunchChecklist:
    def __init__(self, base_url="https://aria.vantax.co.za"):
        self.base_url = base_url
        self.checklist_results = {
            "timestamp": datetime.now().isoformat(),
            "system_status": "UNKNOWN",
            "categories": {
                "infrastructure": {"total": 0, "passed": 0, "items": []},
                "security": {"total": 0, "passed": 0, "items": []},
                "functionality": {"total": 0, "passed": 0, "items": []},
                "performance": {"total": 0, "passed": 0, "items": []},
                "monitoring": {"total": 0, "passed": 0, "items": []},
                "documentation": {"total": 0, "passed": 0, "items": []},
                "deployment": {"total": 0, "passed": 0, "items": []}
            },
            "critical_issues": [],
            "recommendations": [],
            "go_live_approved": False
        }
    
    def check_item(self, category: str, item_name: str, check_function, critical: bool = False):
        """Check a single item and record results"""
        try:
            result = check_function()
            status = "PASS" if result["status"] else "FAIL"
            
            item = {
                "name": item_name,
                "status": status,
                "message": result["message"],
                "critical": critical,
                "timestamp": datetime.now().isoformat()
            }
            
            self.checklist_results["categories"][category]["total"] += 1
            if status == "PASS":
                self.checklist_results["categories"][category]["passed"] += 1
                icon = "✅"
            else:
                icon = "❌"
                if critical:
                    self.checklist_results["critical_issues"].append(item)
            
            self.checklist_results["categories"][category]["items"].append(item)
            print(f"{icon} [{category.upper()}] {item_name}: {result['message']}")
            
            return result["status"]
        
        except Exception as e:
            item = {
                "name": item_name,
                "status": "ERROR",
                "message": f"Check failed: {e}",
                "critical": critical,
                "timestamp": datetime.now().isoformat()
            }
            
            self.checklist_results["categories"][category]["total"] += 1
            self.checklist_results["categories"][category]["items"].append(item)
            
            if critical:
                self.checklist_results["critical_issues"].append(item)
            
            print(f"❌ [{category.upper()}] {item_name}: Check failed - {e}")
            return False
    
    def check_infrastructure(self):
        """Check infrastructure readiness"""
        print("\n🏗️ INFRASTRUCTURE CHECKS")
        print("-" * 50)
        
        # Domain accessibility
        def check_domain():
            try:
                response = requests.get(self.base_url, timeout=10)
                return {"status": response.status_code == 200, "message": f"Domain accessible (HTTP {response.status_code})"}
            except Exception as e:
                return {"status": False, "message": f"Domain not accessible: {e}"}
        
        self.check_item("infrastructure", "Domain Accessibility", check_domain, critical=True)
        
        # SSL Certificate
        def check_ssl():
            try:
                response = requests.get(self.base_url, timeout=10)
                return {"status": response.url.startswith("https://"), "message": "SSL certificate active and valid"}
            except Exception as e:
                return {"status": False, "message": f"SSL check failed: {e}"}
        
        self.check_item("infrastructure", "SSL Certificate", check_ssl, critical=True)
        
        # API Health
        def check_api_health():
            try:
                response = requests.get(f"{self.base_url}/api/health", timeout=10)
                if response.status_code == 200:
                    health_data = response.json()
                    return {"status": True, "message": f"API healthy - {health_data.get('status', 'OK')}"}
                else:
                    return {"status": False, "message": f"API health check failed: HTTP {response.status_code}"}
            except Exception as e:
                return {"status": False, "message": f"API health check error: {e}"}
        
        self.check_item("infrastructure", "API Health", check_api_health, critical=True)
        
        # Database Connectivity
        def check_database():
            try:
                response = requests.get(f"{self.base_url}/api/health", timeout=10)
                if response.status_code == 200:
                    health_data = response.json()
                    db_status = health_data.get("database", {}).get("status", "unknown")
                    return {"status": db_status == "healthy", "message": f"Database status: {db_status}"}
                else:
                    return {"status": False, "message": "Cannot check database status"}
            except Exception as e:
                return {"status": False, "message": f"Database check error: {e}"}
        
        self.check_item("infrastructure", "Database Connectivity", check_database, critical=True)
    
    def check_security(self):
        """Check security implementation"""
        print("\n🔒 SECURITY CHECKS")
        print("-" * 50)
        
        # HTTPS Redirect
        def check_https_redirect():
            try:
                http_url = self.base_url.replace("https://", "http://")
                response = requests.get(http_url, timeout=10, allow_redirects=False)
                return {"status": response.status_code in [301, 302], "message": "HTTP to HTTPS redirect active"}
            except Exception as e:
                return {"status": False, "message": f"HTTPS redirect check failed: {e}"}
        
        self.check_item("security", "HTTPS Redirect", check_https_redirect, critical=True)
        
        # Security Headers
        def check_security_headers():
            try:
                response = requests.get(self.base_url, timeout=10)
                headers = response.headers
                
                required_headers = [
                    "X-Content-Type-Options",
                    "X-Frame-Options", 
                    "Strict-Transport-Security"
                ]
                
                missing_headers = [h for h in required_headers if h not in headers]
                
                if not missing_headers:
                    return {"status": True, "message": "All critical security headers present"}
                else:
                    return {"status": False, "message": f"Missing headers: {', '.join(missing_headers)}"}
            except Exception as e:
                return {"status": False, "message": f"Security headers check failed: {e}"}
        
        self.check_item("security", "Security Headers", check_security_headers, critical=True)
        
        # Authentication System
        def check_authentication():
            try:
                # Test invalid login
                response = requests.post(f"{self.base_url}/api/auth/login", 
                                       json={"username": "invalid", "password": "invalid"}, 
                                       timeout=10)
                
                if response.status_code == 401:
                    return {"status": True, "message": "Authentication system working correctly"}
                else:
                    return {"status": False, "message": f"Authentication check failed: HTTP {response.status_code}"}
            except Exception as e:
                return {"status": False, "message": f"Authentication check error: {e}"}
        
        self.check_item("security", "Authentication System", check_authentication, critical=True)
        
        # Protected Endpoints
        def check_protected_endpoints():
            try:
                response = requests.get(f"{self.base_url}/api/documents", timeout=10)
                
                if response.status_code in [401, 403]:
                    return {"status": True, "message": "Protected endpoints properly secured"}
                else:
                    return {"status": False, "message": f"Protected endpoints not secured: HTTP {response.status_code}"}
            except Exception as e:
                return {"status": False, "message": f"Protected endpoints check error: {e}"}
        
        self.check_item("security", "Protected Endpoints", check_protected_endpoints, critical=True)
    
    def check_functionality(self):
        """Check core functionality"""
        print("\n⚙️ FUNCTIONALITY CHECKS")
        print("-" * 50)
        
        # User Login
        def check_user_login():
            try:
                login_data = {"username": "demo@aria.vantax.co.za", "password": "demo123"}
                response = requests.post(f"{self.base_url}/api/auth/login", json=login_data, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("access_token"):
                        return {"status": True, "message": "User login working correctly"}
                    else:
                        return {"status": False, "message": "Login successful but no token received"}
                else:
                    return {"status": False, "message": f"User login failed: HTTP {response.status_code}"}
            except Exception as e:
                return {"status": False, "message": f"User login check error: {e}"}
        
        self.check_item("functionality", "User Login", check_user_login, critical=True)
        
        # Document Management
        def check_document_management():
            try:
                # First login to get token
                login_data = {"username": "demo@aria.vantax.co.za", "password": "demo123"}
                login_response = requests.post(f"{self.base_url}/api/auth/login", json=login_data, timeout=10)
                
                if login_response.status_code == 200:
                    token = login_response.json().get("access_token")
                    headers = {"Authorization": f"Bearer {token}"}
                    
                    # Test document listing
                    doc_response = requests.get(f"{self.base_url}/api/documents", headers=headers, timeout=10)
                    
                    if doc_response.status_code == 200:
                        return {"status": True, "message": "Document management system working"}
                    else:
                        return {"status": False, "message": f"Document listing failed: HTTP {doc_response.status_code}"}
                else:
                    return {"status": False, "message": "Cannot test documents - login failed"}
            except Exception as e:
                return {"status": False, "message": f"Document management check error: {e}"}
        
        self.check_item("functionality", "Document Management", check_document_management, critical=True)
        
        # Dashboard Access
        def check_dashboard():
            try:
                response = requests.get(f"{self.base_url}/dashboard", timeout=10)
                
                if response.status_code == 200:
                    return {"status": True, "message": "Dashboard accessible"}
                else:
                    return {"status": False, "message": f"Dashboard not accessible: HTTP {response.status_code}"}
            except Exception as e:
                return {"status": False, "message": f"Dashboard check error: {e}"}
        
        self.check_item("functionality", "Dashboard Access", check_dashboard)
    
    def check_performance(self):
        """Check performance metrics"""
        print("\n⚡ PERFORMANCE CHECKS")
        print("-" * 50)
        
        # Response Time
        def check_response_time():
            try:
                start_time = time.time()
                response = requests.get(self.base_url, timeout=10)
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # Convert to ms
                
                if response_time < 1000:  # Less than 1 second
                    return {"status": True, "message": f"Response time excellent: {response_time:.1f}ms"}
                elif response_time < 3000:  # Less than 3 seconds
                    return {"status": True, "message": f"Response time acceptable: {response_time:.1f}ms"}
                else:
                    return {"status": False, "message": f"Response time too slow: {response_time:.1f}ms"}
            except Exception as e:
                return {"status": False, "message": f"Response time check error: {e}"}
        
        self.check_item("performance", "Response Time", check_response_time)
        
        # API Performance
        def check_api_performance():
            try:
                start_time = time.time()
                response = requests.get(f"{self.base_url}/api/health", timeout=10)
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # Convert to ms
                
                if response_time < 500:  # Less than 500ms
                    return {"status": True, "message": f"API performance excellent: {response_time:.1f}ms"}
                elif response_time < 1000:  # Less than 1 second
                    return {"status": True, "message": f"API performance good: {response_time:.1f}ms"}
                else:
                    return {"status": False, "message": f"API performance poor: {response_time:.1f}ms"}
            except Exception as e:
                return {"status": False, "message": f"API performance check error: {e}"}
        
        self.check_item("performance", "API Performance", check_api_performance)
    
    def check_monitoring(self):
        """Check monitoring systems"""
        print("\n📊 MONITORING CHECKS")
        print("-" * 50)
        
        # Health Endpoint
        def check_health_endpoint():
            try:
                response = requests.get(f"{self.base_url}/api/health", timeout=10)
                
                if response.status_code == 200:
                    health_data = response.json()
                    if "status" in health_data:
                        return {"status": True, "message": "Health monitoring endpoint active"}
                    else:
                        return {"status": False, "message": "Health endpoint missing status information"}
                else:
                    return {"status": False, "message": f"Health endpoint not working: HTTP {response.status_code}"}
            except Exception as e:
                return {"status": False, "message": f"Health endpoint check error: {e}"}
        
        self.check_item("monitoring", "Health Endpoint", check_health_endpoint, critical=True)
        
        # Error Handling
        def check_error_handling():
            try:
                response = requests.get(f"{self.base_url}/api/nonexistent", timeout=10)
                
                if response.status_code in [404, 405]:
                    return {"status": True, "message": "Error handling working correctly"}
                else:
                    return {"status": False, "message": f"Error handling not working: HTTP {response.status_code}"}
            except Exception as e:
                return {"status": False, "message": f"Error handling check error: {e}"}
        
        self.check_item("monitoring", "Error Handling", check_error_handling)
    
    def check_documentation(self):
        """Check documentation availability"""
        print("\n📚 DOCUMENTATION CHECKS")
        print("-" * 50)
        
        # API Documentation
        def check_api_docs():
            try:
                response = requests.get(f"{self.base_url}/api/docs", timeout=10)
                
                if response.status_code == 200:
                    return {"status": True, "message": "API documentation accessible"}
                else:
                    return {"status": False, "message": f"API documentation not accessible: HTTP {response.status_code}"}
            except Exception as e:
                return {"status": False, "message": f"API documentation check error: {e}"}
        
        self.check_item("documentation", "API Documentation", check_api_docs)
        
        # User Documentation
        def check_user_docs():
            # Check if documentation files exist in the project
            doc_files = [
                "User_Guide.md",
                "Administrator_Guide.md", 
                "Quick_Start_Guide.md"
            ]
            
            existing_docs = []
            for doc_file in doc_files:
                if os.path.exists(doc_file):
                    existing_docs.append(doc_file)
            
            if len(existing_docs) >= 2:
                return {"status": True, "message": f"User documentation available: {', '.join(existing_docs)}"}
            else:
                return {"status": False, "message": "Insufficient user documentation"}
        
        self.check_item("documentation", "User Documentation", check_user_docs)
    
    def check_deployment(self):
        """Check deployment readiness"""
        print("\n🚀 DEPLOYMENT CHECKS")
        print("-" * 50)
        
        # Security Configuration Files
        def check_security_configs():
            security_files = [
                "nginx-security.conf",
                "security_middleware.py",
                "security_config.json"
            ]
            
            existing_configs = []
            for config_file in security_files:
                if os.path.exists(config_file):
                    existing_configs.append(config_file)
            
            if len(existing_configs) >= 2:
                return {"status": True, "message": f"Security configurations ready: {', '.join(existing_configs)}"}
            else:
                return {"status": False, "message": "Security configurations incomplete"}
        
        self.check_item("deployment", "Security Configurations", check_security_configs, critical=True)
        
        # Deployment Scripts
        def check_deployment_scripts():
            deployment_files = [
                "deploy_secure.sh",
                "security_hardening.py",
                "launch_checklist.py"
            ]
            
            existing_scripts = []
            for script_file in deployment_files:
                if os.path.exists(script_file):
                    existing_scripts.append(script_file)
            
            if len(existing_scripts) >= 2:
                return {"status": True, "message": f"Deployment scripts ready: {', '.join(existing_scripts)}"}
            else:
                return {"status": False, "message": "Deployment scripts incomplete"}
        
        self.check_item("deployment", "Deployment Scripts", check_deployment_scripts)
        
        # Testing Framework
        def check_testing_framework():
            testing_files = [
                "load_test.py",
                "security_audit.py",
                "user_acceptance_testing.py"
            ]
            
            existing_tests = []
            for test_file in testing_files:
                if os.path.exists(test_file):
                    existing_tests.append(test_file)
            
            if len(existing_tests) >= 2:
                return {"status": True, "message": f"Testing framework ready: {', '.join(existing_tests)}"}
            else:
                return {"status": False, "message": "Testing framework incomplete"}
        
        self.check_item("deployment", "Testing Framework", check_testing_framework)
    
    def calculate_readiness_score(self):
        """Calculate overall readiness score"""
        total_items = 0
        passed_items = 0
        critical_failures = 0
        
        for category, data in self.checklist_results["categories"].items():
            total_items += data["total"]
            passed_items += data["passed"]
            
            # Count critical failures
            for item in data["items"]:
                if item["critical"] and item["status"] != "PASS":
                    critical_failures += 1
        
        if total_items == 0:
            return 0, critical_failures
        
        readiness_score = (passed_items / total_items) * 100
        return readiness_score, critical_failures
    
    def generate_launch_report(self):
        """Generate comprehensive launch readiness report"""
        readiness_score, critical_failures = self.calculate_readiness_score()
        
        # Determine go-live approval
        if readiness_score >= 90 and critical_failures == 0:
            self.checklist_results["go_live_approved"] = True
            self.checklist_results["system_status"] = "READY"
            status_message = "🎉 SYSTEM READY FOR GO-LIVE"
        elif readiness_score >= 80 and critical_failures == 0:
            self.checklist_results["system_status"] = "READY_WITH_MINOR_ISSUES"
            status_message = "✅ SYSTEM READY (Minor issues to monitor)"
        elif critical_failures == 0:
            self.checklist_results["system_status"] = "NEEDS_IMPROVEMENT"
            status_message = "⚠️  SYSTEM NEEDS IMPROVEMENT"
        else:
            self.checklist_results["system_status"] = "NOT_READY"
            status_message = "❌ SYSTEM NOT READY - Critical issues must be resolved"
        
        print("\n" + "=" * 80)
        print("🚀 ARIA LAUNCH READINESS REPORT")
        print("=" * 80)
        print(f"📅 Assessment Date: {self.checklist_results['timestamp']}")
        print(f"🌐 Target System: {self.base_url}")
        print(f"🎯 Readiness Score: {readiness_score:.1f}%")
        print(f"🚨 Critical Issues: {critical_failures}")
        print(f"📊 Status: {status_message}")
        
        # Category breakdown
        print(f"\n📋 CATEGORY BREAKDOWN:")
        for category, data in self.checklist_results["categories"].items():
            if data["total"] > 0:
                category_score = (data["passed"] / data["total"]) * 100
                print(f"  {category.upper()}: {data['passed']}/{data['total']} ({category_score:.1f}%)")
        
        # Critical issues
        if self.checklist_results["critical_issues"]:
            print(f"\n🚨 CRITICAL ISSUES TO RESOLVE:")
            for issue in self.checklist_results["critical_issues"]:
                print(f"  ❌ {issue['name']}: {issue['message']}")
        
        # Recommendations
        if readiness_score < 100:
            print(f"\n💡 RECOMMENDATIONS:")
            if critical_failures > 0:
                print("  1. Resolve all critical issues before go-live")
            if readiness_score < 90:
                print("  2. Address remaining issues to improve system reliability")
            if readiness_score < 80:
                print("  3. Consider additional testing and validation")
        
        # Go-live decision
        if self.checklist_results["go_live_approved"]:
            print(f"\n🎉 GO-LIVE APPROVED!")
            print("  System meets all critical requirements for production deployment.")
        else:
            print(f"\n⏸️  GO-LIVE NOT APPROVED")
            print("  Please resolve critical issues before proceeding with launch.")
        
        print("=" * 80)
        
        return self.checklist_results
    
    def run_launch_checklist(self):
        """Run complete launch checklist"""
        print("🚀 ARIA LAUNCH CHECKLIST")
        print("=" * 80)
        print(f"Target: {self.base_url}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Run all checks
        self.check_infrastructure()
        self.check_security()
        self.check_functionality()
        self.check_performance()
        self.check_monitoring()
        self.check_documentation()
        self.check_deployment()
        
        # Generate report
        results = self.generate_launch_report()
        
        # Save results
        with open("launch_checklist_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: launch_checklist_results.json")
        
        return results


def main():
    """Main function"""
    checklist = AriaLaunchChecklist()
    results = checklist.run_launch_checklist()
    
    # Return appropriate exit code
    return 0 if results["go_live_approved"] else 1


if __name__ == "__main__":
    exit(main())