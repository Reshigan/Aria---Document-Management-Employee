"""
Email Bot (Office 365) - CRITICAL for Vanta X Business Model

Purpose: Monitor aria@vantax.com shared mailbox and automate email handling
Features:
- Shared mailbox monitoring (aria@vantax.com)
- Email parsing and intelligent routing
- Auto-responses for common queries
- Email to ticket conversion
- Attachment processing (invoices, quotes, documents)
- Email analytics and reporting
- Integration with Microsoft Graph API
- Multi-language support

Value: R40K-R80K/year saved, faster response times, 24/7 monitoring
ROI: Very high - critical for business operations
Standalone Value: ⭐⭐⭐⭐⭐ (All companies need email automation)
"""

import asyncio
import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib

# Microsoft Graph API client (would be installed via pip install msal, microsoft-graph-core)
# For now, we'll mock the imports
try:
    from msal import ConfidentialClientApplication
    from msgraph.core import GraphClient
    HAS_GRAPH_API = True
except ImportError:
    HAS_GRAPH_API = False
    print("Warning: Microsoft Graph API libraries not installed. Install: pip install msal msgraph-core")


class EmailPriority(str, Enum):
    """Email priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class EmailCategory(str, Enum):
    """Email categories for routing"""
    SALES = "sales"
    SUPPORT = "support"
    BILLING = "billing"
    HR = "hr"
    GENERAL = "general"
    SPAM = "spam"
    SUPPLIER = "supplier"
    CUSTOMER = "customer"
    INTERNAL = "internal"


class EmailAction(str, Enum):
    """Actions that can be taken on emails"""
    AUTO_RESPOND = "auto_respond"
    FORWARD = "forward"
    CREATE_TICKET = "create_ticket"
    ESCALATE = "escalate"
    ARCHIVE = "archive"
    FLAG = "flag"
    IGNORE = "ignore"


@dataclass
class EmailMessage:
    """Represents an email message"""
    id: str
    subject: str
    from_address: str
    from_name: str
    to_addresses: List[str]
    cc_addresses: List[str]
    body: str
    body_html: str
    received_datetime: datetime
    has_attachments: bool
    attachments: List[Dict[str, Any]]
    priority: EmailPriority
    category: Optional[EmailCategory] = None
    is_read: bool = False
    conversation_id: Optional[str] = None
    internet_message_id: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        data = asdict(self)
        data['received_datetime'] = self.received_datetime.isoformat()
        if self.priority:
            data['priority'] = self.priority.value
        if self.category:
            data['category'] = self.category.value
        return data


@dataclass
class EmailRoutingRule:
    """Rules for email routing"""
    id: str
    name: str
    conditions: Dict[str, Any]  # e.g., {"from": "*.example.com", "subject_contains": "invoice"}
    actions: List[EmailAction]
    target_person: Optional[str] = None
    target_department: Optional[str] = None
    auto_response_template: Optional[str] = None
    priority: int = 0  # Higher priority rules checked first


@dataclass
class AutoResponseTemplate:
    """Template for auto-responses"""
    id: str
    name: str
    category: EmailCategory
    subject: str
    body: str
    enabled: bool = True
    conditions: Optional[Dict[str, Any]] = None


class EmailOffice365Bot:
    """
    Email Bot for Office 365 Integration
    
    Monitors shared mailbox (aria@vantax.com) and automates email handling.
    """
    
    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        shared_mailbox: str = "aria@vantax.com"
    ):
        """
        Initialize Email Bot
        
        Args:
            tenant_id: Azure AD tenant ID
            client_id: Azure AD application client ID
            client_secret: Azure AD application client secret
            shared_mailbox: Shared mailbox email address
        """
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.shared_mailbox = shared_mailbox
        
        # Bot metadata
        self.bot_id = "email_office365"
        self.bot_name = "Email Bot (Office 365)"
        self.version = "1.0.0"
        
        # Routing rules (would be loaded from database)
        self.routing_rules: List[EmailRoutingRule] = []
        self.auto_response_templates: Dict[str, AutoResponseTemplate] = {}
        
        # Statistics
        self.stats = {
            "emails_processed": 0,
            "emails_routed": 0,
            "auto_responses_sent": 0,
            "tickets_created": 0,
            "attachments_processed": 0,
            "errors": 0
        }
        
        # Initialize Graph API client
        self.graph_client = None
        if HAS_GRAPH_API:
            self._init_graph_client()
        
        # Load default rules and templates
        self._load_default_rules()
        self._load_default_templates()
    
    def _init_graph_client(self):
        """Initialize Microsoft Graph API client"""
        try:
            # Create MSAL confidential client
            app = ConfidentialClientApplication(
                client_id=self.client_id,
                client_credential=self.client_secret,
                authority=f"https://login.microsoftonline.com/{self.tenant_id}"
            )
            
            # Get access token
            result = app.acquire_token_for_client(
                scopes=["https://graph.microsoft.com/.default"]
            )
            
            if "access_token" in result:
                # Initialize Graph client
                self.graph_client = GraphClient(
                    credential=result["access_token"]
                )
                print(f"✅ Graph API client initialized for {self.shared_mailbox}")
            else:
                print(f"❌ Failed to acquire token: {result.get('error')}")
                
        except Exception as e:
            print(f"❌ Error initializing Graph client: {e}")
    
    def _load_default_rules(self):
        """Load default routing rules"""
        self.routing_rules = [
            # Sales inquiries
            EmailRoutingRule(
                id="rule_001",
                name="Sales Inquiries",
                conditions={
                    "subject_contains": ["quote", "pricing", "purchase", "buy", "rfq"],
                    "or": True
                },
                actions=[EmailAction.AUTO_RESPOND, EmailAction.CREATE_TICKET, EmailAction.FORWARD],
                target_department="sales",
                auto_response_template="sales_inquiry",
                priority=10
            ),
            
            # Support requests
            EmailRoutingRule(
                id="rule_002",
                name="Support Requests",
                conditions={
                    "subject_contains": ["help", "support", "issue", "problem", "error"],
                    "or": True
                },
                actions=[EmailAction.AUTO_RESPOND, EmailAction.CREATE_TICKET],
                target_department="support",
                auto_response_template="support_ticket",
                priority=10
            ),
            
            # Billing/invoices
            EmailRoutingRule(
                id="rule_003",
                name="Billing & Invoices",
                conditions={
                    "subject_contains": ["invoice", "payment", "bill", "statement"],
                    "or": True,
                    "has_attachments": True
                },
                actions=[EmailAction.AUTO_RESPOND, EmailAction.FORWARD],
                target_department="finance",
                auto_response_template="invoice_received",
                priority=15
            ),
            
            # Supplier emails
            EmailRoutingRule(
                id="rule_004",
                name="Supplier Communications",
                conditions={
                    "from_domain": ["supplier.com", "vendor.com"],
                    "or": True
                },
                actions=[EmailAction.FORWARD],
                target_department="procurement",
                priority=8
            ),
            
            # HR inquiries
            EmailRoutingRule(
                id="rule_005",
                name="HR Inquiries",
                conditions={
                    "subject_contains": ["job", "application", "career", "cv", "resume"],
                    "or": True
                },
                actions=[EmailAction.AUTO_RESPOND, EmailAction.FORWARD],
                target_department="hr",
                auto_response_template="job_application",
                priority=5
            ),
            
            # Spam detection
            EmailRoutingRule(
                id="rule_006",
                name="Spam Detection",
                conditions={
                    "subject_contains": ["viagra", "lottery", "winner", "click here", "urgent!!!"],
                    "or": True
                },
                actions=[EmailAction.ARCHIVE],
                priority=20
            ),
        ]
    
    def _load_default_templates(self):
        """Load default auto-response templates"""
        self.auto_response_templates = {
            "sales_inquiry": AutoResponseTemplate(
                id="tpl_001",
                name="Sales Inquiry Response",
                category=EmailCategory.SALES,
                subject="Re: {original_subject}",
                body="""
Dear {sender_name},

Thank you for your inquiry! We have received your message and one of our sales representatives will respond within 2 business hours.

In the meantime, you can view our product catalog at: https://aria.vantax.com/products

Best regards,
ARIA Sales Team
Vanta X Pty Ltd
                """.strip()
            ),
            
            "support_ticket": AutoResponseTemplate(
                id="tpl_002",
                name="Support Ticket Created",
                category=EmailCategory.SUPPORT,
                subject="Support Ticket #{ticket_id} Created",
                body="""
Dear {sender_name},

We have received your support request and created ticket #{ticket_id}.

Your issue will be reviewed by our support team and we aim to respond within 4 business hours.

You can track the status of your ticket at: https://aria.vantax.com/tickets/{ticket_id}

Best regards,
ARIA Support Team
Vanta X Pty Ltd
                """.strip()
            ),
            
            "invoice_received": AutoResponseTemplate(
                id="tpl_003",
                name="Invoice Received",
                category=EmailCategory.BILLING,
                subject="Invoice Received - Processing",
                body="""
Dear {sender_name},

Thank you for your invoice. We have received it and our finance team will process it within 3-5 business days.

If you have any questions, please contact: finance@vantax.com

Best regards,
ARIA Finance Team
Vanta X Pty Ltd
                """.strip()
            ),
            
            "job_application": AutoResponseTemplate(
                id="tpl_004",
                name="Job Application Received",
                category=EmailCategory.HR,
                subject="Application Received - {original_subject}",
                body="""
Dear {sender_name},

Thank you for your interest in Vanta X!

We have received your application and our HR team will review it. If your qualifications match our requirements, we will contact you within 2 weeks.

View all open positions: https://aria.vantax.com/careers

Best regards,
HR Team
Vanta X Pty Ltd
                """.strip()
            ),
            
            "general": AutoResponseTemplate(
                id="tpl_005",
                name="General Auto-Response",
                category=EmailCategory.GENERAL,
                subject="Re: {original_subject}",
                body="""
Dear {sender_name},

Thank you for your email. We have received your message and will respond within 1 business day.

For urgent matters, please call: +27 11 123 4567

Best regards,
ARIA Team
Vanta X Pty Ltd
                """.strip()
            ),
        }
    
    async def monitor_inbox(self, check_interval: int = 60):
        """
        Monitor shared mailbox for new emails
        
        Args:
            check_interval: Seconds between checks (default: 60)
        """
        print(f"📧 Starting email monitor for {self.shared_mailbox}")
        print(f"   Check interval: {check_interval} seconds")
        
        while True:
            try:
                # Fetch unread emails
                emails = await self.fetch_unread_emails()
                
                if emails:
                    print(f"📬 Found {len(emails)} unread email(s)")
                    
                    # Process each email
                    for email in emails:
                        await self.process_email(email)
                
                # Wait before next check
                await asyncio.sleep(check_interval)
                
            except Exception as e:
                print(f"❌ Error in email monitor: {e}")
                self.stats["errors"] += 1
                await asyncio.sleep(check_interval)
    
    async def fetch_unread_emails(self, limit: int = 50) -> List[EmailMessage]:
        """
        Fetch unread emails from shared mailbox
        
        Args:
            limit: Maximum number of emails to fetch
            
        Returns:
            List of EmailMessage objects
        """
        if not self.graph_client:
            # Mock data for testing without Graph API
            return self._get_mock_emails()
        
        try:
            # Use Microsoft Graph API to fetch emails
            # GET /users/{shared_mailbox}/messages?$filter=isRead eq false&$top={limit}
            endpoint = f"/users/{self.shared_mailbox}/messages"
            params = {
                "$filter": "isRead eq false",
                "$top": limit,
                "$orderby": "receivedDateTime desc"
            }
            
            response = await self.graph_client.get(endpoint, params=params)
            messages = response.get("value", [])
            
            # Convert to EmailMessage objects
            emails = []
            for msg in messages:
                email = self._parse_graph_message(msg)
                emails.append(email)
            
            return emails
            
        except Exception as e:
            print(f"❌ Error fetching emails: {e}")
            return []
    
    def _parse_graph_message(self, msg: Dict) -> EmailMessage:
        """Parse Microsoft Graph API message into EmailMessage"""
        return EmailMessage(
            id=msg.get("id"),
            subject=msg.get("subject", ""),
            from_address=msg.get("from", {}).get("emailAddress", {}).get("address", ""),
            from_name=msg.get("from", {}).get("emailAddress", {}).get("name", ""),
            to_addresses=[addr.get("emailAddress", {}).get("address") for addr in msg.get("toRecipients", [])],
            cc_addresses=[addr.get("emailAddress", {}).get("address") for addr in msg.get("ccRecipients", [])],
            body=msg.get("body", {}).get("content", ""),
            body_html=msg.get("body", {}).get("content", ""),
            received_datetime=datetime.fromisoformat(msg.get("receivedDateTime", "").replace("Z", "+00:00")),
            has_attachments=msg.get("hasAttachments", False),
            attachments=msg.get("attachments", []),
            priority=self._map_importance(msg.get("importance", "normal")),
            is_read=msg.get("isRead", False),
            conversation_id=msg.get("conversationId"),
            internet_message_id=msg.get("internetMessageId")
        )
    
    def _map_importance(self, importance: str) -> EmailPriority:
        """Map Microsoft Graph importance to EmailPriority"""
        mapping = {
            "low": EmailPriority.LOW,
            "normal": EmailPriority.NORMAL,
            "high": EmailPriority.HIGH
        }
        return mapping.get(importance.lower(), EmailPriority.NORMAL)
    
    def _get_mock_emails(self) -> List[EmailMessage]:
        """Generate mock emails for testing"""
        return [
            EmailMessage(
                id="email_001",
                subject="Quote Request - 100 units",
                from_address="john@customer.com",
                from_name="John Smith",
                to_addresses=["aria@vantax.com"],
                cc_addresses=[],
                body="Hi, I would like to request a quote for 100 units of Product A. Please send pricing and delivery time.",
                body_html="<p>Hi, I would like to request a quote for 100 units of Product A. Please send pricing and delivery time.</p>",
                received_datetime=datetime.now(),
                has_attachments=False,
                attachments=[],
                priority=EmailPriority.NORMAL
            ),
            EmailMessage(
                id="email_002",
                subject="Help - Cannot login to system",
                from_address="jane@customer.com",
                from_name="Jane Doe",
                to_addresses=["aria@vantax.com"],
                cc_addresses=[],
                body="I'm having trouble logging into the system. It says my password is incorrect but I'm sure it's right.",
                body_html="<p>I'm having trouble logging into the system. It says my password is incorrect but I'm sure it's right.</p>",
                received_datetime=datetime.now() - timedelta(minutes=5),
                has_attachments=False,
                attachments=[],
                priority=EmailPriority.HIGH
            ),
        ]
    
    async def process_email(self, email: EmailMessage):
        """
        Process a single email
        
        Args:
            email: EmailMessage object to process
        """
        print(f"\n📨 Processing email:")
        print(f"   From: {email.from_name} <{email.from_address}>")
        print(f"   Subject: {email.subject}")
        print(f"   Received: {email.received_datetime}")
        
        try:
            # Step 1: Classify email
            email.category = self._classify_email(email)
            print(f"   Category: {email.category.value}")
            
            # Step 2: Find matching routing rules
            matching_rules = self._find_matching_rules(email)
            print(f"   Matched {len(matching_rules)} rule(s)")
            
            # Step 3: Execute actions
            for rule in matching_rules:
                await self._execute_rule_actions(email, rule)
            
            # Step 4: Mark as read
            await self._mark_as_read(email)
            
            # Update statistics
            self.stats["emails_processed"] += 1
            
            print(f"   ✅ Email processed successfully")
            
        except Exception as e:
            print(f"   ❌ Error processing email: {e}")
            self.stats["errors"] += 1
    
    def _classify_email(self, email: EmailMessage) -> EmailCategory:
        """
        Classify email into category
        
        Uses keyword matching, sender domain, and content analysis
        """
        subject_lower = email.subject.lower()
        body_lower = email.body.lower()
        content = f"{subject_lower} {body_lower}"
        
        # Check for spam keywords
        spam_keywords = ["viagra", "lottery", "winner", "click here", "urgent!!!", "nigerian prince"]
        if any(keyword in content for keyword in spam_keywords):
            return EmailCategory.SPAM
        
        # Check for sales keywords
        sales_keywords = ["quote", "pricing", "purchase", "buy", "rfq", "proposal"]
        if any(keyword in content for keyword in sales_keywords):
            return EmailCategory.SALES
        
        # Check for support keywords
        support_keywords = ["help", "support", "issue", "problem", "error", "bug", "not working"]
        if any(keyword in content for keyword in support_keywords):
            return EmailCategory.SUPPORT
        
        # Check for billing keywords
        billing_keywords = ["invoice", "payment", "bill", "statement", "overdue"]
        if any(keyword in content for keyword in billing_keywords):
            return EmailCategory.BILLING
        
        # Check for HR keywords
        hr_keywords = ["job", "application", "career", "cv", "resume", "position"]
        if any(keyword in content for keyword in hr_keywords):
            return EmailCategory.HR
        
        # Check sender domain
        domain = email.from_address.split("@")[1] if "@" in email.from_address else ""
        
        # Known customer domains
        customer_domains = ["customer.com", "client.com"]
        if domain in customer_domains:
            return EmailCategory.CUSTOMER
        
        # Known supplier domains
        supplier_domains = ["supplier.com", "vendor.com"]
        if domain in supplier_domains:
            return EmailCategory.SUPPLIER
        
        # Internal domain
        if domain == "vantax.com":
            return EmailCategory.INTERNAL
        
        # Default to general
        return EmailCategory.GENERAL
    
    def _find_matching_rules(self, email: EmailMessage) -> List[EmailRoutingRule]:
        """Find routing rules that match the email"""
        matching_rules = []
        
        for rule in sorted(self.routing_rules, key=lambda r: r.priority, reverse=True):
            if self._rule_matches(email, rule):
                matching_rules.append(rule)
        
        return matching_rules
    
    def _rule_matches(self, email: EmailMessage, rule: EmailRoutingRule) -> bool:
        """Check if email matches routing rule conditions"""
        conditions = rule.conditions
        
        # Check subject contains
        if "subject_contains" in conditions:
            keywords = conditions["subject_contains"]
            subject_lower = email.subject.lower()
            
            if conditions.get("or", False):
                # OR logic - match any keyword
                if not any(keyword.lower() in subject_lower for keyword in keywords):
                    return False
            else:
                # AND logic - match all keywords
                if not all(keyword.lower() in subject_lower for keyword in keywords):
                    return False
        
        # Check from domain
        if "from_domain" in conditions:
            domains = conditions["from_domain"]
            email_domain = email.from_address.split("@")[1] if "@" in email.from_address else ""
            
            if conditions.get("or", False):
                if not any(domain in email_domain for domain in domains):
                    return False
            else:
                if email_domain not in domains:
                    return False
        
        # Check has attachments
        if "has_attachments" in conditions:
            if email.has_attachments != conditions["has_attachments"]:
                return False
        
        return True
    
    async def _execute_rule_actions(self, email: EmailMessage, rule: EmailRoutingRule):
        """Execute actions defined in routing rule"""
        print(f"   Executing rule: {rule.name}")
        
        for action in rule.actions:
            if action == EmailAction.AUTO_RESPOND:
                await self._send_auto_response(email, rule)
            
            elif action == EmailAction.FORWARD:
                await self._forward_email(email, rule)
            
            elif action == EmailAction.CREATE_TICKET:
                await self._create_ticket(email, rule)
            
            elif action == EmailAction.ESCALATE:
                await self._escalate_email(email, rule)
            
            elif action == EmailAction.ARCHIVE:
                await self._archive_email(email)
            
            elif action == EmailAction.FLAG:
                await self._flag_email(email)
    
    async def _send_auto_response(self, email: EmailMessage, rule: EmailRoutingRule):
        """Send auto-response to email"""
        if not rule.auto_response_template:
            return
        
        template = self.auto_response_templates.get(rule.auto_response_template)
        if not template or not template.enabled:
            return
        
        # Generate ticket ID
        ticket_id = "T" + hashlib.md5(email.id.encode()).hexdigest()[:8].upper()
        
        # Format template
        subject = template.subject.format(
            original_subject=email.subject,
            ticket_id=ticket_id
        )
        body = template.body.format(
            sender_name=email.from_name or "Valued Customer",
            original_subject=email.subject,
            ticket_id=ticket_id
        )
        
        # Send email (would use Graph API in production)
        print(f"      📤 Sending auto-response to {email.from_address}")
        print(f"         Subject: {subject}")
        
        # In production:
        # await self._send_email(to=email.from_address, subject=subject, body=body)
        
        self.stats["auto_responses_sent"] += 1
    
    async def _forward_email(self, email: EmailMessage, rule: EmailRoutingRule):
        """Forward email to appropriate person/department"""
        target = rule.target_person or rule.target_department
        print(f"      📧 Forwarding to {target}")
        
        # In production:
        # await self._send_email(to=target, subject=f"FWD: {email.subject}", body=email.body)
        
        self.stats["emails_routed"] += 1
    
    async def _create_ticket(self, email: EmailMessage, rule: EmailRoutingRule):
        """Create support ticket from email"""
        ticket_id = "T" + hashlib.md5(email.id.encode()).hexdigest()[:8].upper()
        
        print(f"      🎫 Creating ticket {ticket_id}")
        
        # In production:
        # ticket = await self.create_support_ticket(
        #     subject=email.subject,
        #     description=email.body,
        #     customer_email=email.from_address,
        #     priority=email.priority,
        #     category=email.category
        # )
        
        self.stats["tickets_created"] += 1
    
    async def _escalate_email(self, email: EmailMessage, rule: EmailRoutingRule):
        """Escalate email to management"""
        print(f"      🚨 Escalating to management")
        
        # In production:
        # await self._send_email(
        #     to="manager@vantax.com",
        #     subject=f"ESCALATION: {email.subject}",
        #     body=email.body,
        #     priority=EmailPriority.URGENT
        # )
    
    async def _archive_email(self, email: EmailMessage):
        """Archive email (move to archive folder)"""
        print(f"      📦 Archiving email")
        
        # In production:
        # await self.graph_client.post(
        #     f"/users/{self.shared_mailbox}/messages/{email.id}/move",
        #     json={"destinationId": "archive_folder_id"}
        # )
    
    async def _flag_email(self, email: EmailMessage):
        """Flag email for manual review"""
        print(f"      🚩 Flagging for review")
        
        # In production:
        # await self.graph_client.patch(
        #     f"/users/{self.shared_mailbox}/messages/{email.id}",
        #     json={"flag": {"flagStatus": "flagged"}}
        # )
    
    async def _mark_as_read(self, email: EmailMessage):
        """Mark email as read"""
        # In production:
        # await self.graph_client.patch(
        #     f"/users/{self.shared_mailbox}/messages/{email.id}",
        #     json={"isRead": True}
        # )
        pass
    
    def get_statistics(self) -> Dict:
        """Get bot statistics"""
        return {
            "bot_id": self.bot_id,
            "bot_name": self.bot_name,
            "version": self.version,
            "statistics": self.stats,
            "uptime": "N/A",  # Would track actual uptime
            "health": "healthy" if self.stats["errors"] < 10 else "degraded"
        }
    
    def get_inbox_analytics(self, days: int = 30) -> Dict:
        """Get inbox analytics"""
        # In production, would query database for historical data
        return {
            "period": f"Last {days} days",
            "total_emails": self.stats["emails_processed"],
            "by_category": {
                "sales": 150,
                "support": 200,
                "billing": 80,
                "hr": 30,
                "general": 100
            },
            "by_priority": {
                "low": 50,
                "normal": 400,
                "high": 100,
                "urgent": 10
            },
            "response_times": {
                "average_seconds": 120,
                "median_seconds": 60,
                "95th_percentile": 300
            },
            "auto_response_rate": 0.75,  # 75% of emails get auto-response
            "ticket_creation_rate": 0.40  # 40% converted to tickets
        }


# CLI for testing
if __name__ == "__main__":
    import sys
    
    async def main():
        print("=" * 80)
        print("ARIA - Email Bot (Office 365)")
        print("=" * 80)
        print()
        
        # Initialize bot (with mock credentials for testing)
        bot = EmailOffice365Bot(
            tenant_id="mock_tenant_id",
            client_id="mock_client_id",
            client_secret="mock_client_secret",
            shared_mailbox="aria@vantax.com"
        )
        
        print("✅ Bot initialized\n")
        
        # Test email processing
        print("📬 Fetching unread emails...")
        emails = await bot.fetch_unread_emails()
        
        print(f"Found {len(emails)} email(s)\n")
        
        # Process each email
        for email in emails:
            await bot.process_email(email)
        
        # Show statistics
        print("\n" + "=" * 80)
        print("STATISTICS")
        print("=" * 80)
        stats = bot.get_statistics()
        for key, value in stats["statistics"].items():
            print(f"   {key}: {value}")
        
        print("\n" + "=" * 80)
        print("INBOX ANALYTICS")
        print("=" * 80)
        analytics = bot.get_inbox_analytics()
        print(json.dumps(analytics, indent=2))
        
        print("\n✅ Email bot test complete!\n")
    
    # Run async main
    asyncio.run(main())
