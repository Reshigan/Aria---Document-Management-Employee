"""
ARIA Office 365 Integration Service
Single mailbox (aria@vantax.com) for ALL email communication

Handles:
- Customer emails
- Supplier emails  
- Employee emails
- Automatic routing to appropriate bots
- Email responses

Example email addresses that route to Aria:
- aria@vantax.com (ONE mailbox for everything!)
- support@vantax.com (alias → aria@vantax.com)
- finance@vantax.com (alias → aria@vantax.com)
- sales@vantax.com (alias → aria@vantax.com)
- hr@vantax.com (alias → aria@vantax.com)
"""
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class Email:
    """Email message"""
    message_id: str
    from_address: str
    to_address: str
    subject: str
    body: str
    attachments: List[Dict]
    received_at: datetime


class Office365Service:
    """
    Office 365 / Outlook integration
    
    ONE MAILBOX FOR EVERYTHING: aria@vantax.com
    
    All other email addresses are ALIASES that forward to aria@vantax.com:
    - support@vantax.com → aria@vantax.com
    - finance@vantax.com → aria@vantax.com  
    - sales@vantax.com → aria@vantax.com
    - hr@vantax.com → aria@vantax.com
    - projects@vantax.com → aria@vantax.com
    
    Setup:
    1. Create shared mailbox: aria@vantax.com
    2. Register Azure AD app (get app_id, tenant_id, client_secret)
    3. Grant permissions: Mail.Read, Mail.Send, Mail.ReadWrite
    4. Set up email aliases (all forward to aria@vantax.com)
    5. Set up webhook (Microsoft Graph API) to receive emails
    
    Workflow:
    1. Email arrives at aria@vantax.com (or alias)
    2. Webhook triggers process_email()
    3. Identify sender type (customer/supplier/employee)
    4. Parse intent using AI
    5. Route to appropriate bot (via Meta-Bot)
    6. Bot processes request
    7. Send response email
    """
    
    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        mailbox: str = "aria@vantax.com"
    ):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.mailbox = mailbox
        self.access_token: Optional[str] = None
    
    async def authenticate(self) -> str:
        """
        Authenticate with Microsoft Graph API
        
        Returns access token for API calls
        """
        # OAuth 2.0 client credentials flow
        auth_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
        # Would make actual API call here
        # For now, placeholder
        self.access_token = "placeholder_token"
        
        logger.info(f"Authenticated with Office 365 for mailbox: {self.mailbox}")
        return self.access_token
    
    async def fetch_emails(self) -> List[Email]:
        """
        Fetch unread emails from aria@vantax.com
        
        Uses Microsoft Graph API:
        GET https://graph.microsoft.com/v1.0/users/{mailbox}/messages?$filter=isRead eq false
        """
        if not self.access_token:
            await self.authenticate()
        
        # Would make actual API call here
        # For now, return empty list
        emails = []
        
        logger.info(f"Fetched {len(emails)} unread emails")
        return emails
    
    async def process_email(self, email: Email) -> Dict:
        """
        Process incoming email
        
        Steps:
        1. Identify sender type (customer/supplier/employee)
        2. Identify intent (what does sender want?)
        3. Route to appropriate bot
        4. Get bot response
        5. Send reply email
        
        Args:
            email: Email message
        
        Returns:
            Processing result
        """
        logger.info(f"Processing email from {email.from_address}: {email.subject}")
        
        # Step 1: Identify sender
        sender_type = await self._identify_sender(email.from_address)
        
        # Step 2: Parse intent
        intent = await self._parse_intent(email, sender_type)
        
        # Step 3: Route to bot (via Meta-Bot)
        bot_name = await self._route_to_bot(intent)
        
        # Step 4: Get bot response
        response = await self._get_bot_response(bot_name, email, intent)
        
        # Step 5: Send reply
        await self.send_email(
            to=email.from_address,
            subject=f"RE: {email.subject}",
            body=response
        )
        
        return {
            "email_id": email.message_id,
            "sender_type": sender_type,
            "intent": intent,
            "bot": bot_name,
            "status": "processed"
        }
    
    async def _identify_sender(self, email_address: str) -> str:
        """
        Identify sender type
        
        Checks:
        1. Employee master data (is this an employee email?)
        2. Customer master data (is this a customer?)
        3. Supplier master data (is this a supplier?)
        4. Unknown (external)
        
        Returns:
            "employee", "customer", "supplier", or "unknown"
        """
        # Would query database here
        # For now, simple domain check
        if "@vantax.com" in email_address:
            return "employee"
        else:
            return "customer"  # Assume customer if external
    
    async def _parse_intent(self, email: Email, sender_type: str) -> Dict:
        """
        Parse email intent using AI
        
        Examples:
        - "Invoice attached" → AP Bot (process invoice)
        - "Where's my order?" → Customer Care Bot (order status)
        - "Need time off next week" → Leave Management Bot (PTO request)
        - "Project estimate needed" → Project Management Bot (create project)
        
        Returns:
            {
                "action": "process_invoice",
                "entities": {"invoice_number": "INV-12345"},
                "confidence": 0.95
            }
        """
        # Would use AI (Ollama) to parse intent
        # For now, simple keyword matching
        
        subject_lower = email.subject.lower()
        body_lower = email.body.lower()
        
        if "invoice" in subject_lower or "invoice" in body_lower:
            return {
                "action": "process_invoice",
                "entities": {},
                "confidence": 0.9
            }
        elif "order" in subject_lower:
            return {
                "action": "check_order_status",
                "entities": {},
                "confidence": 0.85
            }
        elif "pto" in body_lower or "time off" in body_lower or "leave" in body_lower:
            return {
                "action": "request_leave",
                "entities": {},
                "confidence": 0.9
            }
        else:
            return {
                "action": "general_inquiry",
                "entities": {},
                "confidence": 0.5
            }
    
    async def _route_to_bot(self, intent: Dict) -> str:
        """
        Route to appropriate bot based on intent
        
        Intent → Bot mapping:
        - process_invoice → Accounts Payable Bot
        - check_order_status → Customer Care Bot
        - request_leave → Leave Management Bot
        - create_quote → Quote Generation Bot
        - etc.
        """
        action = intent["action"]
        
        routing_map = {
            "process_invoice": "accounts_payable_bot",
            "check_order_status": "customer_care_bot",
            "request_leave": "leave_management_bot",
            "create_quote": "quote_generation_bot",
            "general_inquiry": "whatsapp_helpdesk_bot"
        }
        
        bot_name = routing_map.get(action, "whatsapp_helpdesk_bot")
        
        logger.info(f"Routing {action} to {bot_name}")
        return bot_name
    
    async def _get_bot_response(
        self,
        bot_name: str,
        email: Email,
        intent: Dict
    ) -> str:
        """
        Get response from bot
        
        Would actually call the specific bot here
        For now, generate generic response
        """
        if bot_name == "accounts_payable_bot":
            return """
Thank you for your invoice.

I've received your invoice and will process it shortly. You'll receive confirmation once it's approved for payment.

Best regards,
Aria (Vanta X AI Assistant)
            """.strip()
        
        elif bot_name == "customer_care_bot":
            return """
Thank you for contacting us.

I'm looking up your order information now. You should receive an update shortly.

Best regards,
Aria (Vanta X AI Assistant)
            """.strip()
        
        elif bot_name == "leave_management_bot":
            return """
Thank you for your leave request.

I've received your PTO request and will check your balance and calendar. You'll receive confirmation shortly.

Best regards,
Aria (Vanta X AI Assistant)
            """.strip()
        
        else:
            return """
Thank you for your email.

I've received your message and will respond shortly.

Best regards,
Aria (Vanta X AI Assistant)
            """.strip()
    
    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Send email via Office 365
        
        Uses Microsoft Graph API:
        POST https://graph.microsoft.com/v1.0/users/{mailbox}/sendMail
        
        Args:
            to: Recipient email
            subject: Email subject
            body: Email body
            cc: CC recipients (optional)
            attachments: Attachments (optional)
        
        Returns:
            Send result
        """
        if not self.access_token:
            await self.authenticate()
        
        logger.info(f"Sending email to {to}: {subject}")
        
        # Would make actual API call here
        # For now, just log
        
        return {
            "to": to,
            "subject": subject,
            "status": "sent",
            "timestamp": datetime.now()
        }
    
    async def setup_webhook(self, webhook_url: str):
        """
        Set up webhook to receive emails in real-time
        
        Uses Microsoft Graph API subscriptions:
        POST https://graph.microsoft.com/v1.0/subscriptions
        
        Webhook will be called whenever new email arrives at aria@vantax.com
        
        Args:
            webhook_url: Your webhook endpoint (e.g., https://aria.vantax.com/api/webhooks/email)
        """
        subscription = {
            "changeType": "created",
            "notificationUrl": webhook_url,
            "resource": f"users/{self.mailbox}/messages",
            "expirationDateTime": "2025-12-31T00:00:00Z",
            "clientState": "secret_validation_token"
        }
        
        logger.info(f"Setting up webhook for {self.mailbox}: {webhook_url}")
        
        # Would make actual API call here
        return {"status": "webhook_configured"}


# Example usage
if __name__ == "__main__":
    async def test():
        # Initialize service
        service = Office365Service(
            tenant_id="your-tenant-id",
            client_id="your-client-id",
            client_secret="your-client-secret",
            mailbox="aria@vantax.com"
        )
        
        # Authenticate
        await service.authenticate()
        
        # Simulate incoming email
        email = Email(
            message_id="MSG-001",
            from_address="vendor@acmecorp.com",
            to_address="finance@vantax.com",  # Alias → aria@vantax.com
            subject="Invoice INV-12345 for $5,000",
            body="Please find attached invoice for services rendered.",
            attachments=[{"name": "invoice.pdf", "size": 102400}],
            received_at=datetime.now()
        )
        
        # Process email
        result = await service.process_email(email)
        
        print(f"Email processed:")
        print(f"  Sender type: {result['sender_type']}")
        print(f"  Intent: {result['intent']}")
        print(f"  Routed to: {result['bot']}")
        print(f"  Status: {result['status']}")
    
    asyncio.run(test())
