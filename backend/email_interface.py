"""
ARIA - Email Interface
Allows users to email Aria and receive intelligent responses
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import smtplib
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import re


class EmailConfig:
    """Email configuration"""
    def __init__(
        self,
        smtp_host: str = "smtp.gmail.com",
        smtp_port: int = 587,
        imap_host: str = "imap.gmail.com",
        imap_port: int = 993,
        email_address: str = "aria@yourcompany.com",
        password: str = "",
        use_tls: bool = True
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.imap_host = imap_host
        self.imap_port = imap_port
        self.email_address = email_address
        self.password = password
        self.use_tls = use_tls


class EmailInterface:
    """
    Email interface for Aria
    
    Allows users to:
    - Send requests to Aria via email
    - Receive intelligent responses
    - Have multi-turn conversations via email threads
    """
    
    def __init__(self, config: EmailConfig, aria_controller):
        self.config = config
        self.aria_controller = aria_controller
        self.processed_emails = set()
    
    async def send_email(
        self,
        to_address: str,
        subject: str,
        body: str,
        reply_to: Optional[str] = None
    ) -> bool:
        """
        Send an email from Aria
        
        Args:
            to_address: Recipient email
            subject: Email subject
            body: Email body (HTML supported)
            reply_to: Optional reply-to message ID
            
        Returns:
            True if sent successfully
        """
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"Aria AI <{self.config.email_address}>"
            msg['To'] = to_address
            msg['Subject'] = subject
            
            if reply_to:
                msg['In-Reply-To'] = reply_to
                msg['References'] = reply_to
            
            # Create plain text and HTML versions
            text_part = MIMEText(body, 'plain')
            html_body = self._format_html_email(body)
            html_part = MIMEText(html_body, 'html')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port) as server:
                if self.config.use_tls:
                    server.starttls()
                
                if self.config.password:
                    server.login(self.config.email_address, self.config.password)
                
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Error sending email: {e}")
            return False
    
    async def check_inbox(self) -> List[Dict[str, Any]]:
        """
        Check inbox for new emails to Aria
        
        Returns:
            List of new email messages
        """
        try:
            mail = imaplib.IMAP4_SSL(self.config.imap_host, self.config.imap_port)
            mail.login(self.config.email_address, self.config.password)
            mail.select('INBOX')
            
            # Search for unread emails
            _, message_numbers = mail.search(None, 'UNSEEN')
            
            emails = []
            
            for num in message_numbers[0].split():
                _, msg_data = mail.fetch(num, '(RFC822)')
                email_body = msg_data[0][1]
                email_message = email.message_from_bytes(email_body)
                
                # Parse email
                parsed_email = self._parse_email(email_message)
                
                # Skip if already processed
                if parsed_email['message_id'] in self.processed_emails:
                    continue
                
                emails.append(parsed_email)
                self.processed_emails.add(parsed_email['message_id'])
            
            mail.close()
            mail.logout()
            
            return emails
            
        except Exception as e:
            print(f"Error checking inbox: {e}")
            return []
    
    def _parse_email(self, email_message) -> Dict[str, Any]:
        """Parse email message"""
        subject = email_message.get('Subject', 'No Subject')
        from_address = email.utils.parseaddr(email_message.get('From', ''))[1]
        message_id = email_message.get('Message-ID', '')
        date = email_message.get('Date', '')
        
        # Get email body
        body = ""
        if email_message.is_multipart():
            for part in email_message.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    break
        else:
            body = email_message.get_payload(decode=True).decode('utf-8', errors='ignore')
        
        # Clean body (remove signatures, quoted text, etc.)
        body = self._clean_email_body(body)
        
        return {
            'message_id': message_id,
            'from': from_address,
            'subject': subject,
            'body': body,
            'date': date,
            'timestamp': datetime.now().isoformat()
        }
    
    def _clean_email_body(self, body: str) -> str:
        """Clean email body by removing signatures and quoted text"""
        # Remove common email signatures
        signature_markers = [
            r'--\s*\n',
            r'Sent from my',
            r'Best regards',
            r'Thanks,',
            r'Thank you,'
        ]
        
        for marker in signature_markers:
            body = re.split(marker, body, maxsplit=1)[0]
        
        # Remove quoted text (lines starting with >)
        lines = body.split('\n')
        cleaned_lines = [line for line in lines if not line.strip().startswith('>')]
        
        return '\n'.join(cleaned_lines).strip()
    
    async def process_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process an email and generate Aria's response
        
        Args:
            email_data: Parsed email data
            
        Returns:
            Aria's response
        """
        user_id = email_data['from']
        message = email_data['body']
        
        # Extract user name from email
        user_name = email_data['from'].split('@')[0].replace('.', ' ').title()
        
        # Process request through Aria
        response = await self.aria_controller.process_request(
            message=message,
            user_id=user_id,
            context={'source': 'email', 'auto_execute_workflows': True}
        )
        
        # Format response for email
        email_body = self._format_response_email(
            user_name=user_name,
            response=response
        )
        
        # Send response email
        subject = f"Re: {email_data['subject']}"
        
        await self.send_email(
            to_address=email_data['from'],
            subject=subject,
            body=email_body,
            reply_to=email_data['message_id']
        )
        
        return {
            'processed': True,
            'user': email_data['from'],
            'subject': subject,
            'response_sent': True,
            'timestamp': datetime.now().isoformat()
        }
    
    def _format_response_email(
        self,
        user_name: str,
        response: Dict[str, Any]
    ) -> str:
        """Format Aria's response as an email"""
        
        aria_says = response.get('aria_says', '')
        status = response.get('status', '')
        
        email_body = f"""Hi {user_name},

{aria_says}

"""
        
        # Add detailed results if available
        if status == 'success' and 'result' in response:
            result = response['result']
            
            email_body += "\n📊 DETAILED RESULTS:\n"
            email_body += "=" * 50 + "\n\n"
            
            for key, value in result.items():
                if key not in ['status', 'bot']:
                    email_body += f"{key.replace('_', ' ').title()}: {value}\n"
        
        # Add workflow results if available
        if response.get('workflow') and 'results' in response:
            email_body += "\n🔄 WORKFLOW STEPS:\n"
            email_body += "=" * 50 + "\n\n"
            
            for step_name, step_result in response['results'].items():
                status_emoji = "✅" if step_result.get('status') == 'success' else "❌"
                email_body += f"{status_emoji} {step_name.replace('_', ' ').title()}\n"
        
        # Add suggestions if clarification needed
        if status == 'needs_clarification':
            email_body += f"\n{response.get('clarification', '')}\n"
        
        # Add footer
        email_body += f"""

{'=' * 50}

Best regards,
Aria 🤖
Your AI Assistant

💡 TIP: You can reply to this email with follow-up questions!

Powered by Aria AI Controller v2.0
"""
        
        return email_body
    
    def _format_html_email(self, text_body: str) -> str:
        """Convert plain text to HTML email"""
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }}
        .content {{
            background: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
        }}
        .footer {{
            background: #333;
            color: #fff;
            padding: 15px;
            text-align: center;
            border-radius: 0 0 8px 8px;
            font-size: 12px;
        }}
        .result-box {{
            background: white;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 10px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h2>🤖 Aria AI Assistant</h2>
    </div>
    <div class="content">
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">{text_body}</pre>
    </div>
    <div class="footer">
        <p>Powered by Aria AI Controller v2.0</p>
        <p>© 2025 Your Company. All rights reserved.</p>
    </div>
</body>
</html>
"""
        return html
    
    async def start_email_listener(self, check_interval: int = 60):
        """
        Start email listener that checks inbox periodically
        
        Args:
            check_interval: Seconds between inbox checks
        """
        print(f"📧 Aria Email Listener started. Checking inbox every {check_interval}s...")
        
        while True:
            try:
                # Check for new emails
                new_emails = await self.check_inbox()
                
                # Process each email
                for email_data in new_emails:
                    print(f"📨 New email from {email_data['from']}: {email_data['subject']}")
                    
                    try:
                        result = await self.process_email(email_data)
                        print(f"✅ Processed and responded to {email_data['from']}")
                    except Exception as e:
                        print(f"❌ Error processing email: {e}")
                
                # Wait before checking again
                await asyncio.sleep(check_interval)
                
            except Exception as e:
                print(f"❌ Email listener error: {e}")
                await asyncio.sleep(check_interval)


def create_email_interface(
    config: EmailConfig,
    aria_controller
) -> EmailInterface:
    """Create email interface instance"""
    return EmailInterface(config, aria_controller)


# Example usage and configuration
def get_demo_config() -> EmailConfig:
    """Get demo email configuration (needs real credentials)"""
    return EmailConfig(
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        imap_host="imap.gmail.com",
        imap_port=993,
        email_address="aria@yourcompany.com",
        password="your_app_password_here",  # Use app-specific password
        use_tls=True
    )
