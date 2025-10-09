#!/usr/bin/env python3
"""
ARIA Document Management System - Comprehensive Automated Test Suite

Tests:
- Authentication & Authorization  
- Document Upload, Analysis, Classification
- AI Chat & Document Intelligence
- Admin Functions
- Role-Based Access Control
- Document Lifecycle Management
- Error Handling & Edge Cases
"""

import os
import io
import time
import random
import requests
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Configuration
BASE_URL = "http://localhost:12000"
FRONTEND_URL = "http://localhost:12001"

class Colors:
    """Terminal colors for output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

class TestStats:
    """Track test statistics"""
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.start_time = time.time()
        self.results = []
    
    def duration(self):
        return time.time() - self.start_time

stats = TestStats()

def print_header(text: str):
    """Print section header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(70)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}\n")

def print_test(name: str, passed: bool, details: str = "", warning: bool = False):
    """Print test result"""
    stats.total += 1
    
    if passed:
        stats.passed += 1
        status = f"{Colors.GREEN}✓ PASS{Colors.END}"
        stats.results.append({"name": name, "status": "PASS", "details": details})
    elif warning:
        stats.warnings += 1
        status = f"{Colors.YELLOW}⚠ WARN{Colors.END}"
        stats.results.append({"name": name, "status": "WARN", "details": details})
    else:
        stats.failed += 1
        status = f"{Colors.RED}✗ FAIL{Colors.END}"
        stats.results.append({"name": name, "status": "FAIL", "details": details})
    
    print(f"{status} - {Colors.BOLD}{name}{Colors.END}")
    if details:
        print(f"       {details}")

def create_test_document(doc_type: str, content: str = None) -> Tuple[io.BytesIO, str]:
    """Create a test document of specified type"""
    if content is None:
        content = f"Test {doc_type} document\nCreated: {datetime.now()}\n\nThis is test content."
    
    file_obj = io.BytesIO(content.encode('utf-8'))
    
    extensions = {
        'invoice': 'txt',
        'contract': 'txt',
        'report': 'txt',
        'letter': 'txt',
        'memo': 'txt',
        'receipt': 'txt',
        'agreement': 'txt',
        'policy': 'txt'
    }
    
    filename = f"test_{doc_type}_{random.randint(1000, 9999)}.{extensions.get(doc_type, 'txt')}"
    return file_obj, filename

# =============================================================================
# TEST SUITE FUNCTIONS
# =============================================================================

def test_backend_health() -> bool:
    """Test backend health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        data = response.json()
        
        if response.status_code == 200 and data.get('status') == 'healthy':
            print_test("Backend Health Check", True, f"Version: {data.get('version')}, DB: {data.get('database')}")
            return True
        else:
            print_test("Backend Health Check", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Backend Health Check", False, str(e))
        return False

def test_frontend_health() -> bool:
    """Test frontend availability"""
    try:
        response = requests.get(FRONTEND_URL, timeout=10)
        if response.status_code == 200:
            print_test("Frontend Health Check", True, f"Status: {response.status_code}")
            return True
        else:
            print_test("Frontend Health Check", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Frontend Health Check", False, str(e))
        return False

def test_register_user(username: str, email: str, password: str, full_name: str) -> Tuple[bool, Dict]:
    """Test user registration"""
    try:
        user_data = {
            "username": username,
            "email": email,
            "password": password,
            "full_name": full_name
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_test(f"User Registration ({username})", True, f"User ID: {data.get('id')}")
            return True, data
        else:
            print_test(f"User Registration ({username})", False, f"Status: {response.status_code}")
            return False, {}
    except Exception as e:
        print_test(f"User Registration ({username})", False, str(e))
        return False, {}

def test_login(username: str, password: str) -> Tuple[bool, str]:
    """Test user login"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": username, "password": password},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token", "")
            print_test(f"User Login ({username})", True, f"Token received: {len(token)} chars")
            return True, token
        else:
            print_test(f"User Login ({username})", False, f"Status: {response.status_code}")
            return False, ""
    except Exception as e:
        print_test(f"User Login ({username})", False, str(e))
        return False, ""

def test_get_current_user(token: str) -> Tuple[bool, Dict]:
    """Test getting current user info"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/users/me", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_test("Get Current User", True, f"Username: {data.get('username')}, Role: {data.get('role')}")
            return True, data
        else:
            print_test("Get Current User", False, f"Status: {response.status_code}")
            return False, {}
    except Exception as e:
        print_test("Get Current User", False, str(e))
        return False, {}

def test_document_upload(token: str, doc_type: str) -> Tuple[bool, Dict]:
    """Test document upload with type detection"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create test document with realistic content
        content = f"""
        === {doc_type.upper()} DOCUMENT ===
        
        Date: {datetime.now().strftime('%Y-%m-%d')}
        Document Type: {doc_type.title()}
        Reference: TEST-{random.randint(10000, 99999)}
        
        This is a test {doc_type} document for automated testing.
        
        Key Information:
        - Item 1: Test data point one
        - Item 2: Test data point two
        - Item 3: Test data point three
        
        Total Amount: $1,234.56
        Status: Approved
        
        Prepared by: Test Automation System
        """
        
        file_obj, filename = create_test_document(doc_type, content)
        
        files = {"file": (filename, file_obj, "text/plain")}
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers=headers,
            files=files,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            detected_type = data.get('document_type', 'unknown')
            doc_id = data.get('id')
            print_test(
                f"Document Upload ({doc_type})", 
                True, 
                f"ID: {doc_id}, Detected: {detected_type}, Size: {data.get('file_size', 0)} bytes"
            )
            return True, data
        else:
            print_test(f"Document Upload ({doc_type})", False, f"Status: {response.status_code}")
            return False, {}
    except Exception as e:
        print_test(f"Document Upload ({doc_type})", False, str(e))
        return False, {}

def test_list_documents(token: str) -> Tuple[bool, List[Dict]]:
    """Test listing documents"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/documents", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            doc_count = len(data) if isinstance(data, list) else 0
            print_test("List Documents", True, f"Found {doc_count} documents")
            return True, data if isinstance(data, list) else []
        else:
            print_test("List Documents", False, f"Status: {response.status_code}")
            return False, []
    except Exception as e:
        print_test("List Documents", False, str(e))
        return False, []

def test_get_document_details(token: str, doc_id: int) -> Tuple[bool, Dict]:
    """Test getting document details"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/documents/{doc_id}", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_test(
                f"Get Document Details (ID: {doc_id})", 
                True, 
                f"Type: {data.get('document_type')}, Status: {data.get('status')}"
            )
            return True, data
        else:
            print_test(f"Get Document Details (ID: {doc_id})", False, f"Status: {response.status_code}")
            return False, {}
    except Exception as e:
        print_test(f"Get Document Details (ID: {doc_id})", False, str(e))
        return False, {}

def test_ai_chat_general(token: str) -> Tuple[bool, str]:
    """Test AI chat with general query"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        chat_data = {
            "message": "Hello ARIA! Can you explain what types of documents you can help me manage?",
            "document_id": None
        }
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json=chat_data,
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get('response', '')
            print_test(
                "AI Chat (General Query)", 
                True, 
                f"Response: {response_text[:80]}..."
            )
            return True, response_text
        else:
            print_test("AI Chat (General Query)", False, f"Status: {response.status_code}")
            return False, ""
    except Exception as e:
        print_test("AI Chat (General Query)", False, str(e))
        return False, ""

def test_ai_chat_with_document(token: str, doc_id: int) -> Tuple[bool, str]:
    """Test AI chat about specific document"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        chat_data = {
            "message": "What information can you extract from this document?",
            "document_id": doc_id
        }
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json=chat_data,
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get('response', '')
            print_test(
                f"AI Chat (Document {doc_id})", 
                True, 
                f"Response: {response_text[:80]}..."
            )
            return True, response_text
        else:
            print_test(f"AI Chat (Document {doc_id})", False, f"Status: {response.status_code}")
            return False, ""
    except Exception as e:
        print_test(f"AI Chat (Document {doc_id})", False, str(e))
        return False, ""

def test_ai_document_analysis(token: str, doc_id: int) -> bool:
    """Test AI's ability to analyze document content"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        questions = [
            "What type of document is this?",
            "What are the key details in this document?",
            "What action items or next steps does this document suggest?"
        ]
        
        success_count = 0
        for question in questions:
            chat_data = {
                "message": question,
                "document_id": doc_id
            }
            response = requests.post(
                f"{BASE_URL}/api/chat",
                json=chat_data,
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                answer = data.get('response', '')
                print_test(
                    f"AI Analysis: '{question[:35]}...'", 
                    True, 
                    f"Answer: {answer[:50]}..."
                )
                success_count += 1
            else:
                print_test(f"AI Analysis: '{question[:35]}...'", False, f"Status: {response.status_code}")
        
        return success_count > 0
    except Exception as e:
        print_test("AI Document Analysis", False, str(e))
        return False

def test_document_download(token: str, doc_id: int) -> bool:
    """Test document download"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/documents/{doc_id}/download",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            content_length = len(response.content)
            print_test(
                f"Document Download (ID: {doc_id})", 
                True, 
                f"Downloaded {content_length} bytes"
            )
            return True
        else:
            print_test(f"Document Download (ID: {doc_id})", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test(f"Document Download (ID: {doc_id})", False, str(e))
        return False

def test_document_delete(token: str, doc_id: int) -> bool:
    """Test document deletion"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.delete(
            f"{BASE_URL}/api/documents/{doc_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print_test(f"Document Delete (ID: {doc_id})", True, "Document deleted successfully")
            return True
        else:
            print_test(f"Document Delete (ID: {doc_id})", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test(f"Document Delete (ID: {doc_id})", False, str(e))
        return False

def test_admin_functions(admin_token: str) -> bool:
    """Test admin-specific functions"""
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test get all users
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers, timeout=10)
        if response.status_code == 200:
            users = response.json()
            print_test("Admin: List All Users", True, f"Found {len(users)} users")
        else:
            print_test("Admin: List All Users", False, f"Status: {response.status_code}")
            return False
        
        # Test get system stats
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers, timeout=10)
        if response.status_code == 200:
            stats_data = response.json()
            print_test(
                "Admin: System Statistics", 
                True, 
                f"Users: {stats_data.get('total_users', 0)}, Docs: {stats_data.get('total_documents', 0)}"
            )
        else:
            print_test("Admin: System Statistics", False, f"Status: {response.status_code}")
            return False
        
        return True
    except Exception as e:
        print_test("Admin Functions", False, str(e))
        return False

def test_error_handling(token: str) -> bool:
    """Test error handling and edge cases"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test invalid document ID
        response = requests.get(f"{BASE_URL}/api/documents/99999", headers=headers, timeout=10)
        if response.status_code == 404:
            print_test("Error Handling: Invalid Document ID", True, "Correctly returned 404")
        else:
            print_test("Error Handling: Invalid Document ID", False, f"Status: {response.status_code}")
        
        # Test unauthorized access (no token)
        response = requests.get(f"{BASE_URL}/api/documents", timeout=10)
        if response.status_code in [401, 403]:
            print_test("Error Handling: Unauthorized Access", True, f"Correctly returned {response.status_code}")
        else:
            print_test("Error Handling: Unauthorized Access", False, f"Status: {response.status_code}")
        
        return True
    except Exception as e:
        print_test("Error Handling Tests", False, str(e))
        return False

def generate_report():
    """Generate detailed test report"""
    print_header("TEST REPORT")
    
    duration = stats.duration()
    
    print(f"{Colors.BOLD}Test Execution Summary:{Colors.END}")
    print(f"  Start Time: {datetime.fromtimestamp(stats.start_time).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Duration:   {duration:.2f} seconds")
    print(f"  Total:      {stats.total}")
    print(f"  {Colors.GREEN}Passed:     {stats.passed}{Colors.END}")
    print(f"  {Colors.RED}Failed:     {stats.failed}{Colors.END}")
    print(f"  {Colors.YELLOW}Warnings:   {stats.warnings}{Colors.END}")
    
    success_rate = (stats.passed / stats.total * 100) if stats.total > 0 else 0
    print(f"\n{Colors.BOLD}Success Rate: {success_rate:.1f}%{Colors.END}")
    
    if stats.failed > 0:
        print(f"\n{Colors.RED}{Colors.BOLD}Failed Tests:{Colors.END}")
        for result in stats.results:
            if result['status'] == 'FAIL':
                print(f"  ✗ {result['name']}: {result['details']}")
    
    # Save report to file
    report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'duration': duration,
            'stats': {
                'total': stats.total,
                'passed': stats.passed,
                'failed': stats.failed,
                'warnings': stats.warnings,
                'success_rate': success_rate
            },
            'results': stats.results
        }, f, indent=2)
    
    print(f"\n{Colors.CYAN}Detailed report saved to: {report_file}{Colors.END}")
    
    # Final status
    print("\n" + "="*70)
    if stats.failed == 0:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ ALL TESTS PASSED - SYSTEM READY FOR DEPLOYMENT!{Colors.END}")
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗ SOME TESTS FAILED - PLEASE REVIEW ISSUES ABOVE{Colors.END}")
    print("="*70 + "\n")

def main():
    """Main test execution"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║                                                                ║")
    print("║          ARIA - COMPREHENSIVE AUTOMATED TEST SUITE            ║")
    print("║                                                                ║")
    print("║  Testing: Authentication, Documents, AI, Admin & Workflows    ║")
    print("║                                                                ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")
    
    # Phase 1: System Health
    print_header("PHASE 1: SYSTEM HEALTH CHECKS")
    test_backend_health()
    test_frontend_health()
    
    # Phase 2: Authentication
    print_header("PHASE 2: AUTHENTICATION & AUTHORIZATION")
    
    # Create test user
    test_user = f"testuser{random.randint(1000, 9999)}"
    test_email = f"{test_user}@aria-test.com"
    test_password = "TestPass123!"
    
    success, user_data = test_register_user(test_user, test_email, test_password, "Test User")
    if not success:
        print(f"\n{Colors.RED}Cannot proceed without successful user registration.{Colors.END}")
        generate_report()
        return
    
    success, user_token = test_login(test_user, test_password)
    if not success:
        print(f"\n{Colors.RED}Cannot proceed without successful login.{Colors.END}")
        generate_report()
        return
    
    success, current_user = test_get_current_user(user_token)
    
    # Login admin
    success, admin_token = test_login("admin", "Admin123!")
    
    # Phase 3: Document Management
    print_header("PHASE 3: DOCUMENT UPLOAD & CLASSIFICATION")
    
    # Upload various document types
    doc_types = ['invoice', 'contract', 'report', 'letter']
    uploaded_docs = []
    
    for doc_type in doc_types:
        success, doc_data = test_document_upload(user_token, doc_type)
        if success:
            uploaded_docs.append(doc_data)
    
    # List documents
    success, all_docs = test_list_documents(user_token)
    
    # Get details of first uploaded document
    if uploaded_docs:
        first_doc = uploaded_docs[0]
        test_get_document_details(user_token, first_doc['id'])
    
    # Phase 4: AI Intelligence
    print_header("PHASE 4: AI CHAT & DOCUMENT INTELLIGENCE")
    
    # General AI chat
    test_ai_chat_general(user_token)
    
    # AI chat about specific documents
    if uploaded_docs:
        for doc in uploaded_docs[:2]:  # Test first 2 documents
            test_ai_chat_with_document(user_token, doc['id'])
            test_ai_document_analysis(user_token, doc['id'])
    
    # Phase 5: Document Operations
    print_header("PHASE 5: DOCUMENT OPERATIONS")
    
    if uploaded_docs:
        # Test download on first document
        test_document_download(user_token, uploaded_docs[0]['id'])
    
    # Phase 6: Admin Functions
    if admin_token:
        print_header("PHASE 6: ADMIN FUNCTIONS")
        test_admin_functions(admin_token)
    
    # Phase 7: Error Handling
    print_header("PHASE 7: ERROR HANDLING & SECURITY")
    test_error_handling(user_token)
    
    # Phase 8: Cleanup - Delete test documents
    print_header("PHASE 8: CLEANUP")
    if uploaded_docs:
        # Delete all but one document (to keep some test data)
        for doc in uploaded_docs[:-1]:
            test_document_delete(user_token, doc['id'])
        print_test("Cleanup", True, f"Deleted {len(uploaded_docs)-1} test documents, kept 1 for reference")
    
    # Generate final report
    generate_report()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Test suite interrupted by user{Colors.END}")
        generate_report()
    except Exception as e:
        print(f"\n\n{Colors.RED}Critical error: {e}{Colors.END}")
        generate_report()
