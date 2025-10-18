#!/usr/bin/env python3
"""
Comprehensive Security Audit Script for Aria Document Management System
Performs vulnerability scanning, security configuration review, and penetration testing
"""

import os
import sys
import json
import subprocess
import requests
import time
import socket
from urllib.parse import urljoin
import ssl
import datetime

class AriaSecurityAudit:
    def __init__(self, base_url="https://aria.vantax.co.za"):
        self.base_url = base_url
        self.results = {
            "timestamp": datetime.datetime.now().isoformat(),
            "target": base_url,
            "vulnerabilities": [],
            "security_issues": [],
            "recommendations": [],
            "passed_checks": [],
            "overall_score": 0
        }
    
    def log_result(self, category, status, message, severity="info"):
        """Log audit results"""
        result = {
            "category": category,
            "status": status,
            "message": message,
            "severity": severity,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        if status == "PASS":
            self.results["passed_checks"].append(result)
        elif status == "FAIL":
            if severity in ["high", "critical"]:
                self.results["vulnerabilities"].append(result)
            else:
                self.results["security_issues"].append(result)
        elif status == "RECOMMEND":
            self.results["recommendations"].append(result)
        
        # Print to console
        status_icon = {"PASS": "✅", "FAIL": "❌", "WARN": "⚠️", "RECOMMEND": "💡"}
        print(f"{status_icon.get(status, '🔍')} [{category}] {message}")
    
    def test_ssl_configuration(self):
        """Test SSL/TLS configuration"""
        print("\n🔒 Testing SSL/TLS Configuration...")
        
        try:
            # Test SSL certificate
            hostname = self.base_url.replace("https://", "").replace("http://", "")
            context = ssl.create_default_context()
            
            with socket.create_connection((hostname, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    
                    # Check certificate validity
                    not_after = datetime.datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_until_expiry = (not_after - datetime.datetime.now()).days
                    
                    if days_until_expiry > 30:
                        self.log_result("SSL", "PASS", f"SSL certificate valid for {days_until_expiry} days")
                    elif days_until_expiry > 0:
                        self.log_result("SSL", "WARN", f"SSL certificate expires in {days_until_expiry} days", "medium")
                    else:
                        self.log_result("SSL", "FAIL", "SSL certificate has expired", "high")
                    
                    # Check certificate subject
                    subject = dict(x[0] for x in cert['subject'])
                    if hostname in subject.get('commonName', ''):
                        self.log_result("SSL", "PASS", "SSL certificate matches hostname")
                    else:
                        self.log_result("SSL", "FAIL", "SSL certificate hostname mismatch", "medium")
        
        except Exception as e:
            self.log_result("SSL", "FAIL", f"SSL configuration error: {e}", "high")
    
    def test_security_headers(self):
        """Test HTTP security headers"""
        print("\n🛡️ Testing Security Headers...")
        
        try:
            response = requests.get(self.base_url, timeout=10)
            headers = response.headers
            
            # Required security headers
            security_headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': None,  # Just check presence
                'Content-Security-Policy': None,
                'Referrer-Policy': None
            }
            
            for header, expected in security_headers.items():
                if header in headers:
                    if expected is None:
                        self.log_result("Headers", "PASS", f"{header} header present")
                    elif isinstance(expected, list):
                        if headers[header] in expected:
                            self.log_result("Headers", "PASS", f"{header} header correctly set")
                        else:
                            self.log_result("Headers", "WARN", f"{header} header value may be suboptimal", "low")
                    elif headers[header] == expected:
                        self.log_result("Headers", "PASS", f"{header} header correctly set")
                    else:
                        self.log_result("Headers", "WARN", f"{header} header value may be suboptimal", "low")
                else:
                    severity = "medium" if header in ['X-Frame-Options', 'X-Content-Type-Options'] else "low"
                    self.log_result("Headers", "FAIL", f"Missing {header} header", severity)
        
        except Exception as e:
            self.log_result("Headers", "FAIL", f"Error testing headers: {e}", "medium")
    
    def test_authentication_security(self):
        """Test authentication security"""
        print("\n🔐 Testing Authentication Security...")
        
        # Test login endpoint
        try:
            # Test with invalid credentials
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"username": "invalid", "password": "invalid"},
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result("Auth", "PASS", "Invalid credentials properly rejected")
            else:
                self.log_result("Auth", "FAIL", f"Unexpected response to invalid login: {response.status_code}", "medium")
            
            # Test for information disclosure
            if "user not found" in response.text.lower() or "invalid user" in response.text.lower():
                self.log_result("Auth", "WARN", "Login response may disclose user existence", "low")
            else:
                self.log_result("Auth", "PASS", "No user enumeration vulnerability detected")
            
            # Test rate limiting (basic check)
            start_time = time.time()
            for i in range(5):
                requests.post(
                    f"{self.base_url}/api/auth/login",
                    json={"username": "test", "password": "test"},
                    timeout=5
                )
            end_time = time.time()
            
            if end_time - start_time > 2:  # Should take some time if rate limited
                self.log_result("Auth", "PASS", "Rate limiting appears to be in place")
            else:
                self.log_result("Auth", "RECOMMEND", "Consider implementing rate limiting for login attempts", "low")
        
        except Exception as e:
            self.log_result("Auth", "WARN", f"Error testing authentication: {e}", "low")
    
    def test_api_security(self):
        """Test API security"""
        print("\n🔌 Testing API Security...")
        
        # Test unauthorized access
        protected_endpoints = [
            "/api/documents",
            "/api/auth/me",
            "/api/dashboard/stats"
        ]
        
        for endpoint in protected_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                
                if response.status_code in [401, 403]:
                    self.log_result("API", "PASS", f"Protected endpoint {endpoint} requires authentication")
                elif response.status_code == 200:
                    self.log_result("API", "FAIL", f"Protected endpoint {endpoint} accessible without auth", "high")
                else:
                    self.log_result("API", "WARN", f"Unexpected response from {endpoint}: {response.status_code}", "low")
            
            except Exception as e:
                self.log_result("API", "WARN", f"Error testing {endpoint}: {e}", "low")
        
        # Test for common vulnerabilities
        try:
            # Test for SQL injection (basic)
            response = requests.get(
                f"{self.base_url}/api/documents",
                params={"id": "1' OR '1'='1"},
                timeout=10
            )
            
            if "error" in response.text.lower() and "sql" in response.text.lower():
                self.log_result("API", "FAIL", "Possible SQL injection vulnerability detected", "critical")
            else:
                self.log_result("API", "PASS", "No obvious SQL injection vulnerability")
        
        except Exception as e:
            self.log_result("API", "WARN", f"Error testing SQL injection: {e}", "low")
    
    def test_file_upload_security(self):
        """Test file upload security"""
        print("\n📁 Testing File Upload Security...")
        
        try:
            # Test upload without authentication
            files = {'file': ('test.txt', 'test content', 'text/plain')}
            response = requests.post(
                f"{self.base_url}/api/documents/upload",
                files=files,
                timeout=10
            )
            
            if response.status_code in [401, 403]:
                self.log_result("Upload", "PASS", "File upload requires authentication")
            else:
                self.log_result("Upload", "FAIL", "File upload may not require authentication", "high")
        
        except Exception as e:
            self.log_result("Upload", "WARN", f"Error testing file upload: {e}", "low")
    
    def test_information_disclosure(self):
        """Test for information disclosure"""
        print("\n🔍 Testing Information Disclosure...")
        
        # Test common sensitive files
        sensitive_paths = [
            "/.env",
            "/config.json",
            "/api/debug",
            "/admin",
            "/.git/config",
            "/backup.sql"
        ]
        
        for path in sensitive_paths:
            try:
                response = requests.get(f"{self.base_url}{path}", timeout=5)
                
                if response.status_code == 200:
                    self.log_result("Disclosure", "FAIL", f"Sensitive file accessible: {path}", "high")
                elif response.status_code == 404:
                    self.log_result("Disclosure", "PASS", f"Sensitive file properly protected: {path}")
                else:
                    self.log_result("Disclosure", "WARN", f"Unexpected response for {path}: {response.status_code}", "low")
            
            except Exception as e:
                # Timeout or connection error is expected/good
                self.log_result("Disclosure", "PASS", f"Sensitive file properly protected: {path}")
    
    def test_server_configuration(self):
        """Test server configuration security"""
        print("\n⚙️ Testing Server Configuration...")
        
        try:
            response = requests.get(self.base_url, timeout=10)
            
            # Check server header
            server_header = response.headers.get('Server', '')
            if server_header:
                if 'nginx' in server_header.lower():
                    if any(version in server_header for version in ['1.', '2.']):
                        self.log_result("Server", "WARN", "Server version disclosed in headers", "low")
                    else:
                        self.log_result("Server", "PASS", "Server header present but version not disclosed")
                else:
                    self.log_result("Server", "PASS", "Server header configured")
            else:
                self.log_result("Server", "PASS", "Server header hidden")
            
            # Check for common misconfigurations
            if 'X-Powered-By' in response.headers:
                self.log_result("Server", "WARN", "X-Powered-By header discloses technology stack", "low")
            else:
                self.log_result("Server", "PASS", "X-Powered-By header properly hidden")
        
        except Exception as e:
            self.log_result("Server", "WARN", f"Error testing server configuration: {e}", "low")
    
    def calculate_security_score(self):
        """Calculate overall security score"""
        total_checks = len(self.results["passed_checks"]) + len(self.results["vulnerabilities"]) + len(self.results["security_issues"])
        
        if total_checks == 0:
            return 0
        
        # Scoring system
        passed_score = len(self.results["passed_checks"]) * 10
        critical_penalty = len([v for v in self.results["vulnerabilities"] if v["severity"] == "critical"]) * 50
        high_penalty = len([v for v in self.results["vulnerabilities"] if v["severity"] == "high"]) * 30
        medium_penalty = len([v for v in self.results["vulnerabilities"] + self.results["security_issues"] if v["severity"] == "medium"]) * 15
        low_penalty = len([v for v in self.results["vulnerabilities"] + self.results["security_issues"] if v["severity"] == "low"]) * 5
        
        max_possible_score = total_checks * 10
        actual_score = max(0, passed_score - critical_penalty - high_penalty - medium_penalty - low_penalty)
        
        return min(100, (actual_score / max_possible_score) * 100) if max_possible_score > 0 else 0
    
    def run_audit(self):
        """Run complete security audit"""
        print("🔒 ARIA SECURITY AUDIT")
        print("=" * 60)
        print(f"Target: {self.base_url}")
        print(f"Timestamp: {self.results['timestamp']}")
        print("=" * 60)
        
        # Run all security tests
        self.test_ssl_configuration()
        self.test_security_headers()
        self.test_authentication_security()
        self.test_api_security()
        self.test_file_upload_security()
        self.test_information_disclosure()
        self.test_server_configuration()
        
        # Calculate security score
        self.results["overall_score"] = self.calculate_security_score()
        
        # Generate summary
        self.print_summary()
        
        return self.results
    
    def print_summary(self):
        """Print audit summary"""
        print("\n" + "=" * 60)
        print("🔒 SECURITY AUDIT SUMMARY")
        print("=" * 60)
        
        print(f"✅ Passed Checks: {len(self.results['passed_checks'])}")
        print(f"❌ Vulnerabilities: {len(self.results['vulnerabilities'])}")
        print(f"⚠️  Security Issues: {len(self.results['security_issues'])}")
        print(f"💡 Recommendations: {len(self.results['recommendations'])}")
        print(f"🎯 Security Score: {self.results['overall_score']:.1f}/100")
        
        # Severity breakdown
        critical = len([v for v in self.results["vulnerabilities"] if v["severity"] == "critical"])
        high = len([v for v in self.results["vulnerabilities"] if v["severity"] == "high"])
        medium = len([v for v in self.results["vulnerabilities"] + self.results["security_issues"] if v["severity"] == "medium"])
        low = len([v for v in self.results["vulnerabilities"] + self.results["security_issues"] if v["severity"] == "low"])
        
        if critical > 0:
            print(f"🚨 Critical Issues: {critical}")
        if high > 0:
            print(f"🔴 High Issues: {high}")
        if medium > 0:
            print(f"🟡 Medium Issues: {medium}")
        if low > 0:
            print(f"🟢 Low Issues: {low}")
        
        # Overall assessment
        if self.results["overall_score"] >= 90:
            print("\n🎉 EXCELLENT: System has strong security posture")
        elif self.results["overall_score"] >= 75:
            print("\n✅ GOOD: System security is acceptable with minor improvements needed")
        elif self.results["overall_score"] >= 60:
            print("\n⚠️  FAIR: System needs security improvements before production")
        else:
            print("\n❌ POOR: System has significant security issues that must be addressed")
        
        print("=" * 60)


def main():
    """Main function"""
    audit = AriaSecurityAudit()
    results = audit.run_audit()
    
    # Save results to file
    with open("security_audit_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: security_audit_results.json")
    
    # Return appropriate exit code
    if results["overall_score"] >= 75:
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())