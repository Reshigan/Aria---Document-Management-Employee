"""
Email Notification System
Provides email notifications for approvals, overdue items, and alerts
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os

class EmailNotificationService:
    """Service for sending email notifications"""
    
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "notifications@aria-erp.com")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "notifications@aria-erp.com")
    FROM_NAME = "Aria ERP System"
    
    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body (optional)
            attachments: List of file paths to attach (optional)
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{cls.FROM_NAME} <{cls.FROM_EMAIL}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            if body_text:
                part1 = MIMEText(body_text, 'plain')
                msg.attach(part1)
            
            part2 = MIMEText(body_html, 'html')
            msg.attach(part2)
            
            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, 'rb') as f:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(f.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename={os.path.basename(file_path)}'
                            )
                            msg.attach(part)
            
            with smtplib.SMTP(cls.SMTP_HOST, cls.SMTP_PORT) as server:
                server.starttls()
                if cls.SMTP_PASSWORD:
                    server.login(cls.SMTP_USER, cls.SMTP_PASSWORD)
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Failed to send email: {str(e)}")
            return False
    
    @classmethod
    def send_approval_request(
        cls,
        approver_email: str,
        document_type: str,
        document_number: str,
        document_id: str,
        amount: float,
        requester_name: str
    ) -> bool:
        """
        Send approval request notification
        
        Args:
            approver_email: Email of approver
            document_type: Type of document
            document_number: Document number
            document_id: Document ID
            amount: Document amount
            requester_name: Name of person requesting approval
            
        Returns:
            True if sent successfully
        """
        subject = f"Approval Required: {document_type} {document_number}"
        
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #2563eb;">Approval Required</h2>
                <p>Hello,</p>
                <p>A new document requires your approval:</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Document Type:</strong> {document_type}</p>
                    <p style="margin: 5px 0;"><strong>Document Number:</strong> {document_number}</p>
                    <p style="margin: 5px 0;"><strong>Amount:</strong> R {amount:,.2f}</p>
                    <p style="margin: 5px 0;"><strong>Requested by:</strong> {requester_name}</p>
                </div>
                
                <p>
                    <a href="https://aria.vantax.co.za/documents/{document_type}/{document_id}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
                        Review Document
                    </a>
                </p>
                
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated notification from Aria ERP System.
                </p>
            </div>
        </body>
        </html>
        """
        
        body_text = f"""
        Approval Required
        
        A new document requires your approval:
        
        Document Type: {document_type}
        Document Number: {document_number}
        Amount: R {amount:,.2f}
        Requested by: {requester_name}
        
        Review at: https://aria.vantax.co.za/documents/{document_type}/{document_id}
        """
        
        return cls.send_email(approver_email, subject, body_html, body_text)
    
    @classmethod
    def send_overdue_notification(
        cls,
        user_email: str,
        overdue_items: List[Dict[str, Any]]
    ) -> bool:
        """
        Send notification about overdue items
        
        Args:
            user_email: Email of user
            overdue_items: List of overdue items
            
        Returns:
            True if sent successfully
        """
        subject = f"Overdue Items Alert - {len(overdue_items)} items require attention"
        
        items_html = ""
        for item in overdue_items:
            items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">{item['type']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">{item['number']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">R {item['amount']:,.2f}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">{item['days_overdue']} days</td>
            </tr>
            """
        
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #dc2626;">Overdue Items Alert</h2>
                <p>Hello,</p>
                <p>You have {len(overdue_items)} overdue items that require attention:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Type</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Number</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Amount</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Days Overdue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <p>
                    <a href="https://aria.vantax.co.za/overdue" 
                       style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">
                        View All Overdue Items
                    </a>
                </p>
                
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated notification from Aria ERP System.
                </p>
            </div>
        </body>
        </html>
        """
        
        return cls.send_email(user_email, subject, body_html)
    
    @classmethod
    def send_document_posted_notification(
        cls,
        user_email: str,
        document_type: str,
        document_number: str,
        document_id: str
    ) -> bool:
        """
        Send notification when document is posted
        
        Args:
            user_email: Email of user
            document_type: Type of document
            document_number: Document number
            document_id: Document ID
            
        Returns:
            True if sent successfully
        """
        subject = f"Document Posted: {document_type} {document_number}"
        
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #16a34a;">Document Posted Successfully</h2>
                <p>Hello,</p>
                <p>The following document has been posted:</p>
                
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
                    <p style="margin: 5px 0;"><strong>Document Type:</strong> {document_type}</p>
                    <p style="margin: 5px 0;"><strong>Document Number:</strong> {document_number}</p>
                </div>
                
                <p>
                    <a href="https://aria.vantax.co.za/documents/{document_type}/{document_id}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">
                        View Document
                    </a>
                </p>
                
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated notification from Aria ERP System.
                </p>
            </div>
        </body>
        </html>
        """
        
        return cls.send_email(user_email, subject, body_html)
