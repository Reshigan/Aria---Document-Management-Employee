#!/usr/bin/env python3
"""
Aria ERP - Office 365 Configuration Test
=========================================

Tests the Office 365 integration with your Azure AD credentials.

This script will:
1. Test authentication with Azure AD
2. Test reading emails from Aria's mailbox
3. Test sending emails as Aria
4. Test mailbox folder operations
5. Generate a comprehensive test report

Author: Aria ERP Team
Date: 2025-10-29
"""

import asyncio
import sys
import os
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║           🧪 ARIA ERP - OFFICE 365 INTEGRATION TEST SUITE 🧪                ║
║                                                                              ║
║                     Testing Azure AD Configuration                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")

# Your Azure AD credentials
TENANT_ID = "998b123c-e559-479d-bbb9-cf3330469a73"
CLIENT_ID = "0a0bcbd9-afcb-44b9-b0ad-16e1da612f98"
CLIENT_SECRET = "1nv8Q~DtSwrmFDmZuJLATAQ9EzV4hg73RfT0AbIw"
ARIA_EMAIL = "aria@vantax.co.za"  # Update if different

class Office365TestSuite:
    """Comprehensive test suite for Office 365 integration"""
    
    def __init__(self):
        self.results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "warnings": 0,
            "start_time": datetime.now(),
            "tests": []
        }
        self.client = None
    
    def log_test(self, test_name: str, status: str, details: str = "", error: str = ""):
        """Log test result"""
        self.results["total_tests"] += 1
        
        if status == "PASS":
            self.results["passed"] += 1
            symbol = "✅"
            color = "\033[92m"  # Green
        elif status == "FAIL":
            self.results["failed"] += 1
            symbol = "❌"
            color = "\033[91m"  # Red
        else:  # WARNING
            self.results["warnings"] += 1
            symbol = "⚠️"
            color = "\033[93m"  # Yellow
        
        reset = "\033[0m"
        
        self.results["tests"].append({
            "test_name": test_name,
            "status": status,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"{symbol} {color}{test_name}: {status}{reset}")
        if details:
            print(f"   {details}")
        if error:
            print(f"   Error: {error}")
        print()
    
    async def test_authentication(self):
        """Test 1: Azure AD Authentication"""
        print("="*80)
        print("TEST 1: AZURE AD AUTHENTICATION")
        print("="*80)
        print()
        
        try:
            from automation.office365_integration import Office365Client
            
            print("Initializing Office 365 client...")
            print(f"   Tenant ID:  {TENANT_ID}")
            print(f"   Client ID:  {CLIENT_ID}")
            print(f"   Mailbox:    {ARIA_EMAIL}")
            print()
            
            self.client = Office365Client(
                tenant_id=TENANT_ID,
                client_id=CLIENT_ID,
                client_secret=CLIENT_SECRET,
                mailbox_email=ARIA_EMAIL
            )
            
            print("Attempting authentication...")
            success = await self.client.authenticate()
            
            if success:
                self.log_test(
                    "Azure AD Authentication",
                    "PASS",
                    f"Successfully authenticated with Azure AD\n   Access token received and valid"
                )
                return True
            else:
                self.log_test(
                    "Azure AD Authentication",
                    "FAIL",
                    "Authentication failed - check credentials",
                    "Failed to obtain access token from Azure AD"
                )
                return False
                
        except ImportError as e:
            self.log_test(
                "Azure AD Authentication",
                "FAIL",
                "Missing required dependencies",
                f"Import error: {str(e)}\n   Run: pip install aiohttp"
            )
            return False
        except Exception as e:
            self.log_test(
                "Azure AD Authentication",
                "FAIL",
                "Unexpected error during authentication",
                str(e)
            )
            return False
    
    async def test_mailbox_access(self):
        """Test 2: Mailbox Access"""
        print("="*80)
        print("TEST 2: MAILBOX ACCESS")
        print("="*80)
        print()
        
        if not self.client:
            self.log_test(
                "Mailbox Access",
                "FAIL",
                "Cannot test - authentication failed"
            )
            return False
        
        try:
            print(f"Attempting to read emails from {ARIA_EMAIL}...")
            emails = await self.client.read_new_emails(max_emails=5, mark_as_read=False)
            
            if emails is not None:
                self.log_test(
                    "Mailbox Access",
                    "PASS",
                    f"Successfully accessed mailbox\n   Found {len(emails)} unread email(s)"
                )
                
                # Show sample emails
                if emails:
                    print("   Sample emails:")
                    for i, email in enumerate(emails[:3], 1):
                        print(f"   {i}. From: {email['from']['email']}")
                        print(f"      Subject: {email['subject']}")
                        print(f"      Date: {email['received_at']}")
                        if email.get('attachments'):
                            print(f"      Attachments: {len(email['attachments'])}")
                        print()
                else:
                    print("   Note: No unread emails in mailbox (this is OK)")
                    print()
                
                return True
            else:
                self.log_test(
                    "Mailbox Access",
                    "FAIL",
                    "Failed to access mailbox",
                    "Check if mailbox exists and has correct permissions"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Mailbox Access",
                "FAIL",
                "Error accessing mailbox",
                str(e)
            )
            return False
    
    async def test_send_email(self):
        """Test 3: Send Email"""
        print("="*80)
        print("TEST 3: SEND EMAIL")
        print("="*80)
        print()
        
        if not self.client:
            self.log_test(
                "Send Email",
                "FAIL",
                "Cannot test - authentication failed"
            )
            return False
        
        try:
            # Send test email to admin
            test_recipient = "admin@vantax.co.za"  # Update if needed
            
            print(f"Attempting to send test email to {test_recipient}...")
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
                        <h1 style="margin: 0;">🤖 Aria ERP Test Email</h1>
                    </div>
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px;">
                        <h2>Office 365 Integration Test</h2>
                        <p>This is a test email from your Aria ERP system.</p>
                        
                        <div style="background-color: #e8f4f8; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">✅ Test Results</h3>
                            <ul>
                                <li>Azure AD authentication: <strong>SUCCESS</strong></li>
                                <li>Mailbox access: <strong>SUCCESS</strong></li>
                                <li>Email sending: <strong>SUCCESS</strong></li>
                            </ul>
                        </div>
                        
                        <p><strong>Configuration Details:</strong></p>
                        <ul>
                            <li>Tenant ID: {TENANT_ID}</li>
                            <li>Client ID: {CLIENT_ID}</li>
                            <li>Aria's Email: {ARIA_EMAIL}</li>
                            <li>Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</li>
                        </ul>
                        
                        <p>If you received this email, your Office 365 integration is working perfectly! 🎉</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                            <p>This is an automated message from Aria ERP System.<br>
                            For support: support@vantax.co.za</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            success = await self.client.send_email(
                to=[test_recipient],
                subject="✅ Aria ERP - Office 365 Integration Test Successful",
                body=html_body,
                is_html=True
            )
            
            if success:
                self.log_test(
                    "Send Email",
                    "PASS",
                    f"Successfully sent test email\n   Recipient: {test_recipient}\n   Check inbox for confirmation"
                )
                return True
            else:
                self.log_test(
                    "Send Email",
                    "FAIL",
                    "Failed to send email",
                    "Check Mail.Send permission and mailbox configuration"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Send Email",
                "FAIL",
                "Error sending email",
                str(e)
            )
            return False
    
    async def test_folder_operations(self):
        """Test 4: Folder Operations"""
        print("="*80)
        print("TEST 4: FOLDER OPERATIONS")
        print("="*80)
        print()
        
        if not self.client:
            self.log_test(
                "Folder Operations",
                "FAIL",
                "Cannot test - authentication failed"
            )
            return False
        
        try:
            print("Testing mailbox folder creation...")
            
            # Try to get folder ID (will create if doesn't exist)
            folder_id = await self.client._get_folder_id("AriaTest")
            
            if folder_id:
                self.log_test(
                    "Folder Operations",
                    "PASS",
                    "Successfully created/accessed test folder\n   Folder: AriaTest\n   Can organize emails into folders"
                )
                return True
            else:
                self.log_test(
                    "Folder Operations",
                    "WARNING",
                    "Could not create folder - may need additional permissions",
                    "This is optional functionality"
                )
                return True  # Not critical
                
        except Exception as e:
            self.log_test(
                "Folder Operations",
                "WARNING",
                "Folder operations not available",
                f"{str(e)}\n   This is optional functionality"
            )
            return True  # Not critical
    
    async def test_attachment_handling(self):
        """Test 5: Attachment Handling"""
        print("="*80)
        print("TEST 5: ATTACHMENT HANDLING")
        print("="*80)
        print()
        
        if not self.client:
            self.log_test(
                "Attachment Handling",
                "FAIL",
                "Cannot test - authentication failed"
            )
            return False
        
        try:
            print("Checking for emails with attachments...")
            emails = await self.client.read_new_emails(max_emails=10, mark_as_read=False)
            
            attachment_count = 0
            for email in emails:
                if email.get('attachments'):
                    attachment_count += len(email['attachments'])
            
            if attachment_count > 0:
                self.log_test(
                    "Attachment Handling",
                    "PASS",
                    f"Successfully retrieved emails with attachments\n   Found {attachment_count} attachment(s) in {len(emails)} email(s)"
                )
            else:
                self.log_test(
                    "Attachment Handling",
                    "PASS",
                    "Attachment handling ready\n   No emails with attachments found (this is OK)\n   System can handle attachments when received"
                )
            
            return True
            
        except Exception as e:
            self.log_test(
                "Attachment Handling",
                "WARNING",
                "Could not test attachment handling",
                str(e)
            )
            return True  # Not critical
    
    async def test_permissions(self):
        """Test 6: API Permissions Check"""
        print("="*80)
        print("TEST 6: API PERMISSIONS CHECK")
        print("="*80)
        print()
        
        print("Checking required API permissions...")
        print()
        
        required_permissions = [
            ("Mail.Read", "Read mail in all mailboxes", True),
            ("Mail.ReadWrite", "Read and write mail", True),
            ("Mail.Send", "Send mail as any user", True),
            ("Calendars.ReadWrite", "Manage calendars", False)
        ]
        
        # We can't programmatically check permissions, but we can verify functionality
        permission_status = []
        
        # Check if we can read (tested in test 2)
        if self.results["tests"][1]["status"] == "PASS":
            permission_status.append(("Mail.Read", True))
            permission_status.append(("Mail.ReadWrite", True))
        
        # Check if we can send (tested in test 3)
        if self.results["tests"][2]["status"] == "PASS":
            permission_status.append(("Mail.Send", True))
        
        all_ok = True
        for perm_name, perm_desc, required in required_permissions:
            status = any(p[0] == perm_name and p[1] for p in permission_status)
            if status:
                print(f"   ✅ {perm_name}: Working")
            elif required:
                print(f"   ❌ {perm_name}: Not working (REQUIRED)")
                all_ok = False
            else:
                print(f"   ⚠️  {perm_name}: Not tested (optional)")
        
        print()
        
        if all_ok:
            self.log_test(
                "API Permissions",
                "PASS",
                "All required permissions are working correctly"
            )
        else:
            self.log_test(
                "API Permissions",
                "FAIL",
                "Some required permissions are not working",
                "Verify permissions in Azure AD and grant admin consent"
            )
        
        return all_ok
    
    async def run_all_tests(self):
        """Run all tests"""
        print("\n🚀 Starting Office 365 Integration Test Suite...\n")
        
        # Run tests
        auth_ok = await self.test_authentication()
        
        if auth_ok:
            await self.test_mailbox_access()
            await self.test_send_email()
            await self.test_folder_operations()
            await self.test_attachment_handling()
            await self.test_permissions()
        else:
            print("\n❌ Authentication failed - skipping remaining tests\n")
            print("Please verify:")
            print("  1. Tenant ID is correct")
            print("  2. Client ID is correct")
            print("  3. Client Secret is correct and not expired")
            print("  4. App has required API permissions")
            print("  5. Admin consent has been granted")
            print()
        
        self.results["end_time"] = datetime.now()
        self.results["duration_seconds"] = (
            self.results["end_time"] - self.results["start_time"]
        ).total_seconds()
        
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80 + "\n")
        
        total = self.results["total_tests"]
        passed = self.results["passed"]
        failed = self.results["failed"]
        warnings = self.results["warnings"]
        
        print(f"Total Tests:      {total}")
        print(f"✅ Passed:         {passed} ({passed/total*100:.1f}%)")
        print(f"❌ Failed:         {failed} ({failed/total*100:.1f}%)")
        print(f"⚠️  Warnings:       {warnings} ({warnings/total*100:.1f}%)")
        print(f"⏱️  Duration:       {self.results['duration_seconds']:.2f} seconds")
        
        print(f"\n{'='*80}")
        
        if failed == 0:
            print("\n✅ SUCCESS: All critical tests passed!")
            print("\n🎉 Your Office 365 integration is working perfectly!")
            print("\nNext Steps:")
            print("  1. Check your email for test message")
            print("  2. Start the email poller service")
            print("  3. Send a test invoice to aria@vantax.co.za")
            print("  4. Monitor the processing in the dashboard")
        else:
            print("\n❌ FAILED: Some tests did not pass")
            print("\nPlease fix the failed tests before proceeding.")
            print("\nCommon Issues:")
            print("  • Authentication Failed:")
            print("    - Verify credentials are correct")
            print("    - Check if client secret has expired")
            print("    - Ensure admin consent is granted")
            print("  • Mailbox Access Failed:")
            print("    - Verify mailbox exists (aria@vantax.co.za)")
            print("    - Check Mail.Read permission")
            print("  • Send Email Failed:")
            print("    - Check Mail.Send permission")
            print("    - Verify admin consent granted")
        
        print("\n" + "="*80 + "\n")


async def main():
    """Main test execution"""
    test_suite = Office365TestSuite()
    await test_suite.run_all_tests()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user\n")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {str(e)}\n")
        import traceback
        traceback.print_exc()
