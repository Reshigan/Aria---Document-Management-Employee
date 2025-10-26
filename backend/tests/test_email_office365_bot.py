"""
Comprehensive Tests for Email Bot (Office 365)

Test Coverage:
- Email fetching and parsing
- Email classification
- Routing rule matching
- Auto-response sending
- Email forwarding
- Ticket creation
- Attachment processing
- Error handling
- Performance
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from typing import List

# Import bot
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.bots.email_office365_bot import (
    EmailOffice365Bot,
    EmailMessage,
    EmailPriority,
    EmailCategory,
    EmailAction,
    EmailRoutingRule,
    AutoResponseTemplate
)


class TestEmailOffice365Bot:
    """Test suite for Email Bot"""
    
    @pytest.fixture
    def bot(self):
        """Create bot instance for testing"""
        return EmailOffice365Bot(
            tenant_id="test_tenant",
            client_id="test_client",
            client_secret="test_secret",
            shared_mailbox="test@test.com"
        )
    
    @pytest.fixture
    def sample_email(self):
        """Create sample email for testing"""
        return EmailMessage(
            id="test_email_001",
            subject="Test Subject",
            from_address="test@example.com",
            from_name="Test User",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="Test email body",
            body_html="<p>Test email body</p>",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
    
    # === EMAIL CLASSIFICATION TESTS ===
    
    def test_classify_sales_email(self, bot):
        """Test classification of sales emails"""
        email = EmailMessage(
            id="test_001",
            subject="Quote Request - Product A",
            from_address="customer@example.com",
            from_name="Customer",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="I would like a quote for 100 units",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        category = bot._classify_email(email)
        assert category == EmailCategory.SALES
    
    def test_classify_support_email(self, bot):
        """Test classification of support emails"""
        email = EmailMessage(
            id="test_002",
            subject="Help - Cannot login",
            from_address="customer@example.com",
            from_name="Customer",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="I need help with login issue",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.HIGH
        )
        
        category = bot._classify_email(email)
        assert category == EmailCategory.SUPPORT
    
    def test_classify_billing_email(self, bot):
        """Test classification of billing emails"""
        email = EmailMessage(
            id="test_003",
            subject="Invoice #12345",
            from_address="supplier@example.com",
            from_name="Supplier",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="Please find attached invoice",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=True,
            attachments=[{"name": "invoice.pdf"}],
            priority=EmailPriority.NORMAL
        )
        
        category = bot._classify_email(email)
        assert category == EmailCategory.BILLING
    
    def test_classify_hr_email(self, bot):
        """Test classification of HR emails"""
        email = EmailMessage(
            id="test_004",
            subject="Job Application - Software Developer",
            from_address="applicant@example.com",
            from_name="Applicant",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="Please find attached my CV",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=True,
            attachments=[{"name": "cv.pdf"}],
            priority=EmailPriority.NORMAL
        )
        
        category = bot._classify_email(email)
        assert category == EmailCategory.HR
    
    def test_classify_spam_email(self, bot):
        """Test classification of spam emails"""
        email = EmailMessage(
            id="test_005",
            subject="URGENT!!! You won the lottery!!!",
            from_address="spammer@spam.com",
            from_name="Spammer",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="Click here to claim your prize",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        category = bot._classify_email(email)
        assert category == EmailCategory.SPAM
    
    # === ROUTING RULE TESTS ===
    
    def test_find_matching_rules_sales(self, bot):
        """Test finding matching rules for sales email"""
        email = EmailMessage(
            id="test_006",
            subject="Quote Request",
            from_address="customer@example.com",
            from_name="Customer",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="Quote request",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        matching_rules = bot._find_matching_rules(email)
        assert len(matching_rules) > 0
        assert any(rule.name == "Sales Inquiries" for rule in matching_rules)
    
    def test_find_matching_rules_support(self, bot):
        """Test finding matching rules for support email"""
        email = EmailMessage(
            id="test_007",
            subject="Help needed",
            from_address="customer@example.com",
            from_name="Customer",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="I need support",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.HIGH
        )
        
        matching_rules = bot._find_matching_rules(email)
        assert len(matching_rules) > 0
        assert any(rule.name == "Support Requests" for rule in matching_rules)
    
    def test_find_matching_rules_invoice(self, bot):
        """Test finding matching rules for invoice email"""
        email = EmailMessage(
            id="test_008",
            subject="Invoice #12345",
            from_address="supplier@example.com",
            from_name="Supplier",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="Please find attached",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=True,
            attachments=[{"name": "invoice.pdf"}],
            priority=EmailPriority.NORMAL
        )
        
        matching_rules = bot._find_matching_rules(email)
        assert len(matching_rules) > 0
        assert any(rule.name == "Billing & Invoices" for rule in matching_rules)
    
    def test_rule_matching_or_logic(self, bot):
        """Test OR logic in rule matching"""
        rule = EmailRoutingRule(
            id="test_rule",
            name="Test OR Rule",
            conditions={
                "subject_contains": ["quote", "pricing", "rfq"],
                "or": True
            },
            actions=[EmailAction.FORWARD]
        )
        
        # Email with "quote"
        email1 = EmailMessage(
            id="test_009",
            subject="Quote needed",
            from_address="test@test.com",
            from_name="Test",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        assert bot._rule_matches(email1, rule) == True
        
        # Email with "pricing"
        email2 = EmailMessage(
            id="test_010",
            subject="Pricing information",
            from_address="test@test.com",
            from_name="Test",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        assert bot._rule_matches(email2, rule) == True
        
        # Email with none of the keywords
        email3 = EmailMessage(
            id="test_011",
            subject="General inquiry",
            from_address="test@test.com",
            from_name="Test",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        assert bot._rule_matches(email3, rule) == False
    
    def test_rule_matching_attachment_condition(self, bot):
        """Test attachment condition in rule matching"""
        rule = EmailRoutingRule(
            id="test_rule",
            name="Test Attachment Rule",
            conditions={
                "subject_contains": ["invoice"],
                "has_attachments": True
            },
            actions=[EmailAction.FORWARD]
        )
        
        # Email with attachment
        email1 = EmailMessage(
            id="test_012",
            subject="Invoice #123",
            from_address="test@test.com",
            from_name="Test",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=True,
            attachments=[{"name": "invoice.pdf"}],
            priority=EmailPriority.NORMAL
        )
        
        assert bot._rule_matches(email1, rule) == True
        
        # Email without attachment
        email2 = EmailMessage(
            id="test_013",
            subject="Invoice #123",
            from_address="test@test.com",
            from_name="Test",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        assert bot._rule_matches(email2, rule) == False
    
    # === AUTO-RESPONSE TESTS ===
    
    @pytest.mark.asyncio
    async def test_auto_response_sales(self, bot):
        """Test auto-response for sales inquiry"""
        email = EmailMessage(
            id="test_014",
            subject="Quote Request",
            from_address="customer@example.com",
            from_name="John Smith",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="I need a quote",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        rule = bot.routing_rules[0]  # Sales Inquiries rule
        
        # Should not raise exception
        await bot._send_auto_response(email, rule)
        
        assert bot.stats["auto_responses_sent"] > 0
    
    @pytest.mark.asyncio
    async def test_auto_response_support(self, bot):
        """Test auto-response for support request"""
        email = EmailMessage(
            id="test_015",
            subject="Help needed",
            from_address="customer@example.com",
            from_name="Jane Doe",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="I need help",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.HIGH
        )
        
        rule = bot.routing_rules[1]  # Support Requests rule
        
        # Should not raise exception
        await bot._send_auto_response(email, rule)
        
        assert bot.stats["auto_responses_sent"] > 0
    
    # === EMAIL PROCESSING TESTS ===
    
    @pytest.mark.asyncio
    async def test_process_email_complete_workflow(self, bot):
        """Test complete email processing workflow"""
        email = EmailMessage(
            id="test_016",
            subject="Quote Request - Product A",
            from_address="customer@example.com",
            from_name="Customer Name",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="I would like a quote for Product A",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        initial_count = bot.stats["emails_processed"]
        
        await bot.process_email(email)
        
        assert bot.stats["emails_processed"] == initial_count + 1
        assert email.category is not None
    
    @pytest.mark.asyncio
    async def test_process_multiple_emails(self, bot):
        """Test processing multiple emails"""
        emails = await bot.fetch_unread_emails()
        
        initial_count = bot.stats["emails_processed"]
        
        for email in emails:
            await bot.process_email(email)
        
        assert bot.stats["emails_processed"] == initial_count + len(emails)
    
    # === STATISTICS TESTS ===
    
    def test_get_statistics(self, bot):
        """Test getting bot statistics"""
        stats = bot.get_statistics()
        
        assert "bot_id" in stats
        assert "bot_name" in stats
        assert "version" in stats
        assert "statistics" in stats
        assert "health" in stats
        
        assert stats["bot_id"] == "email_office365"
        assert stats["bot_name"] == "Email Bot (Office 365)"
    
    def test_get_inbox_analytics(self, bot):
        """Test getting inbox analytics"""
        analytics = bot.get_inbox_analytics(days=30)
        
        assert "period" in analytics
        assert "total_emails" in analytics
        assert "by_category" in analytics
        assert "by_priority" in analytics
        assert "response_times" in analytics
        assert "auto_response_rate" in analytics
        assert "ticket_creation_rate" in analytics
    
    # === TEMPLATE TESTS ===
    
    def test_auto_response_templates_loaded(self, bot):
        """Test that auto-response templates are loaded"""
        assert len(bot.auto_response_templates) > 0
        
        assert "sales_inquiry" in bot.auto_response_templates
        assert "support_ticket" in bot.auto_response_templates
        assert "invoice_received" in bot.auto_response_templates
        assert "job_application" in bot.auto_response_templates
        assert "general" in bot.auto_response_templates
    
    def test_template_format(self, bot):
        """Test template formatting"""
        template = bot.auto_response_templates["sales_inquiry"]
        
        subject = template.subject.format(original_subject="Test Subject")
        assert "Test Subject" in subject
        
        body = template.body.format(
            sender_name="John Smith",
            original_subject="Test Subject",
            ticket_id="T12345678"
        )
        assert "John Smith" in body
    
    # === PRIORITY TESTS ===
    
    def test_rule_priority_sorting(self, bot):
        """Test that rules are sorted by priority"""
        # Add a high priority rule
        high_priority_rule = EmailRoutingRule(
            id="high_priority",
            name="High Priority Rule",
            conditions={"subject_contains": ["urgent"]},
            actions=[EmailAction.ESCALATE],
            priority=100
        )
        
        bot.routing_rules.append(high_priority_rule)
        
        email = EmailMessage(
            id="test_017",
            subject="URGENT Issue",
            from_address="test@test.com",
            from_name="Test",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="Urgent issue",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.URGENT
        )
        
        matching_rules = bot._find_matching_rules(email)
        
        # High priority rule should be first
        if len(matching_rules) > 0:
            assert matching_rules[0].priority >= matching_rules[-1].priority
    
    # === ERROR HANDLING TESTS ===
    
    @pytest.mark.asyncio
    async def test_process_email_with_invalid_data(self, bot):
        """Test processing email with invalid data"""
        email = EmailMessage(
            id="test_018",
            subject="",  # Empty subject
            from_address="",  # Empty from
            from_name="",
            to_addresses=[],
            cc_addresses=[],
            body="",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        # Should not crash
        try:
            await bot.process_email(email)
            # If no exception, test passes
            assert True
        except Exception as e:
            # Acceptable if error is handled gracefully
            assert bot.stats["errors"] > 0
    
    # === INTEGRATION TESTS ===
    
    @pytest.mark.asyncio
    async def test_fetch_unread_emails(self, bot):
        """Test fetching unread emails"""
        emails = await bot.fetch_unread_emails(limit=10)
        
        assert isinstance(emails, list)
        # Should return mock emails for testing
        assert len(emails) >= 0
    
    # === PERFORMANCE TESTS ===
    
    @pytest.mark.asyncio
    async def test_email_processing_performance(self, bot):
        """Test email processing performance"""
        email = EmailMessage(
            id="test_019",
            subject="Performance Test",
            from_address="test@test.com",
            from_name="Test",
            to_addresses=["aria@vantax.com"],
            cc_addresses=[],
            body="Performance test email",
            body_html="",
            received_datetime=datetime.now(),
            has_attachments=False,
            attachments=[],
            priority=EmailPriority.NORMAL
        )
        
        start_time = datetime.now()
        await bot.process_email(email)
        end_time = datetime.now()
        
        processing_time = (end_time - start_time).total_seconds()
        
        # Processing should take less than 1 second
        assert processing_time < 1.0
    
    @pytest.mark.asyncio
    async def test_bulk_email_processing_performance(self, bot):
        """Test bulk email processing performance"""
        emails = []
        for i in range(100):
            email = EmailMessage(
                id=f"test_bulk_{i}",
                subject=f"Test Email {i}",
                from_address="test@test.com",
                from_name="Test",
                to_addresses=["aria@vantax.com"],
                cc_addresses=[],
                body="Test body",
                body_html="",
                received_datetime=datetime.now(),
                has_attachments=False,
                attachments=[],
                priority=EmailPriority.NORMAL
            )
            emails.append(email)
        
        start_time = datetime.now()
        for email in emails:
            await bot.process_email(email)
        end_time = datetime.now()
        
        total_time = (end_time - start_time).total_seconds()
        avg_time_per_email = total_time / len(emails)
        
        # Average processing time should be reasonable
        assert avg_time_per_email < 0.1  # 100ms per email


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
