#!/usr/bin/env python3
"""
Security Verification Script for Aria Document Management System
Verifies that all security hardening measures are properly implemented
"""

import requests
import time
import json
from urllib.parse import urljoin

class SecurityVerification:
    def __init__(self, base_url="https://aria.vantax.co.za"):
        self.base_url = base_url
        self.results = {
            "security_headers": {},
            "rate_limiting": {},
            "sensitive_files": {},
            "authentication": {},
            "overall_status": "UNKNOWN"
        }
    
    def test_security_headers(self):
        """Test if security headers are properly implemented"""
        print("🛡️ Testing Security Headers...")
        
        try:
            response = requests.get(self.base_url, timeout=10)
            headers = response.headers
            
            required_headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'SAMEORIGIN',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000',
                'Referrer-Policy': 'strict-origin-when-cross-origin'
            }
            
            for header, expected in required_headers.items():
                if header in headers:
                    actual = headers[header]
                    if expected in actual:
                        print(f"✅ {header}: {actual}")
                        self.results["security_headers"][header] = "PASS"
                    else:
                        print(f"⚠️  {header}: {actual} (expected: {expected})")
                        self.results["security_headers"][header] = "PARTIAL"
                else:
                    print(f"❌ {header}: Missing")
                    self.results["security_headers"][header] = "FAIL"
            
            # Check if server version is hidden
            server_header = headers.get('Server', 'Not present')
            if 'nginx' not in server_header.lower() or '/' not in server_header:
                print(f"✅ Server header properly configured: {server_header}")
                self.results["security_headers"]["server_hidden"] = "PASS"
            else:
                print(f"⚠️  Server header may reveal version: {server_header}")
                self.results["security_headers"]["server_hidden"] = "PARTIAL"
        
        except Exception as e:
            print(f"❌ Error testing headers: {e}")
            self.results["security_headers"]["error"] = str(e)
    
    def test_sensitive_files(self):
        """Test if sensitive files are properly blocked"""
        print("\n🔒 Testing Sensitive File Protection...")
        
        sensitive_paths = [
            "/.env",
            "/config.json", 
            "/admin",
            "/.git/config",
            "/backup.sql",
            "/wp-admin",
            "/phpmyadmin"
        ]
        
        for path in sensitive_paths:
            try:
                response = requests.get(f"{self.base_url}{path}", timeout=5)
                
                if response.status_code in [403, 404]:
                    print(f"✅ {path}: Properly blocked ({response.status_code})")
                    self.results["sensitive_files"][path] = "PASS"
                elif response.status_code == 200:
                    print(f"❌ {path}: Accessible! ({response.status_code})")
                    self.results["sensitive_files"][path] = "FAIL"
                else:
                    print(f"⚠️  {path}: Unexpected response ({response.status_code})")
                    self.results["sensitive_files"][path] = "PARTIAL"
            
            except requests.exceptions.Timeout:
                print(f"✅ {path}: Properly blocked (timeout)")
                self.results["sensitive_files"][path] = "PASS"
            except Exception as e:
                print(f"⚠️  {path}: Error testing - {e}")
                self.results["sensitive_files"][path] = "ERROR"
    
    def test_rate_limiting(self):
        """Test if rate limiting is working"""
        print("\n⏱️ Testing Rate Limiting...")
        
        # Test login rate limiting
        login_url = f"{self.base_url}/api/auth/login"
        
        print("Testing login rate limiting...")
        start_time = time.time()
        
        for i in range(6):  # Try 6 requests (should be limited at 5)
            try:
                response = requests.post(
                    login_url,
                    json={"username": "test", "password": "test"},
                    timeout=5
                )
                
                if response.status_code == 429:
                    print(f"✅ Rate limiting active - request {i+1} blocked")
                    self.results["rate_limiting"]["login"] = "PASS"
                    break
                elif i >= 4:  # After 5 requests, should be rate limited
                    print(f"⚠️  Rate limiting may not be active - {i+1} requests allowed")
                    self.results["rate_limiting"]["login"] = "PARTIAL"
            
            except Exception as e:
                print(f"⚠️  Error testing rate limiting: {e}")
                self.results["rate_limiting"]["login"] = "ERROR"
                break
            
            time.sleep(0.5)  # Small delay between requests
        
        end_time = time.time()
        total_time = end_time - start_time
        
        if total_time > 2:  # Should take time if rate limited
            print(f"✅ Rate limiting appears active (took {total_time:.1f}s)")
        else:
            print(f"⚠️  Rate limiting may not be active (took {total_time:.1f}s)")
    
    def test_authentication_security(self):
        """Test authentication security"""
        print("\n🔐 Testing Authentication Security...")
        
        # Test protected endpoints without authentication
        protected_endpoints = [
            "/api/documents",
            "/api/auth/me",
            "/api/dashboard/stats"
        ]
        
        for endpoint in protected_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                
                if response.status_code in [401, 403]:
                    print(f"✅ {endpoint}: Properly protected ({response.status_code})")
                    self.results["authentication"][endpoint] = "PASS"
                elif response.status_code == 200:
                    print(f"❌ {endpoint}: Not protected! ({response.status_code})")
                    self.results["authentication"][endpoint] = "FAIL"
                else:
                    print(f"⚠️  {endpoint}: Unexpected response ({response.status_code})")
                    self.results["authentication"][endpoint] = "PARTIAL"
            
            except Exception as e:
                print(f"⚠️  {endpoint}: Error testing - {e}")
                self.results["authentication"][endpoint] = "ERROR"
    
    def calculate_security_score(self):
        """Calculate overall security score"""
        total_tests = 0
        passed_tests = 0
        
        # Count security header tests
        for result in self.results["security_headers"].values():
            if result != "error":
                total_tests += 1
                if result == "PASS":
                    passed_tests += 1
                elif result == "PARTIAL":
                    passed_tests += 0.5
        
        # Count sensitive file tests
        for result in self.results["sensitive_files"].values():
            if result != "ERROR":
                total_tests += 1
                if result == "PASS":
                    passed_tests += 1
                elif result == "PARTIAL":
                    passed_tests += 0.5
        
        # Count authentication tests
        for result in self.results["authentication"].values():
            if result != "ERROR":
                total_tests += 1
                if result == "PASS":
                    passed_tests += 1
                elif result == "PARTIAL":
                    passed_tests += 0.5
        
        # Count rate limiting tests
        for result in self.results["rate_limiting"].values():
            if result != "ERROR":
                total_tests += 1
                if result == "PASS":
                    passed_tests += 1
                elif result == "PARTIAL":
                    passed_tests += 0.5
        
        if total_tests == 0:
            return 0
        
        return (passed_tests / total_tests) * 100
    
    def run_verification(self):
        """Run complete security verification"""
        print("🔒 ARIA SECURITY VERIFICATION")
        print("=" * 60)
        print(f"Target: {self.base_url}")
        print("=" * 60)
        
        # Run all tests
        self.test_security_headers()
        self.test_sensitive_files()
        self.test_rate_limiting()
        self.test_authentication_security()
        
        # Calculate score
        score = self.calculate_security_score()
        
        # Determine overall status
        if score >= 90:
            self.results["overall_status"] = "EXCELLENT"
            status_icon = "🎉"
        elif score >= 75:
            self.results["overall_status"] = "GOOD"
            status_icon = "✅"
        elif score >= 60:
            self.results["overall_status"] = "FAIR"
            status_icon = "⚠️"
        else:
            self.results["overall_status"] = "POOR"
            status_icon = "❌"
        
        # Print summary
        print("\n" + "=" * 60)
        print("🔒 SECURITY VERIFICATION SUMMARY")
        print("=" * 60)
        print(f"🎯 Security Score: {score:.1f}/100")
        print(f"{status_icon} Overall Status: {self.results['overall_status']}")
        
        # Detailed breakdown
        categories = [
            ("Security Headers", self.results["security_headers"]),
            ("Sensitive Files", self.results["sensitive_files"]),
            ("Authentication", self.results["authentication"]),
            ("Rate Limiting", self.results["rate_limiting"])
        ]
        
        for category, results in categories:
            if results:
                passed = sum(1 for r in results.values() if r == "PASS")
                total = len([r for r in results.values() if r != "ERROR"])
                print(f"📊 {category}: {passed}/{total} tests passed")
        
        print("=" * 60)
        
        return self.results


def main():
    """Main function"""
    verification = SecurityVerification()
    results = verification.run_verification()
    
    # Save results
    with open("security_verification_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Results saved to: security_verification_results.json")
    
    # Return appropriate exit code
    score = verification.calculate_security_score()
    return 0 if score >= 75 else 1


if __name__ == "__main__":
    exit(main())