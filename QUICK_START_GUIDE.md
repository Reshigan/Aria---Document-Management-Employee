# 🚀 ARIA ERP - QUICK START GUIDE

**For:** System Administrators & Business Users  
**Date:** October 29, 2025  
**Status:** Production Ready  

---

## 📋 TABLE OF CONTENTS

1. [First Login](#first-login)
2. [Configure Office 365 Mailbox](#configure-office-365-mailbox)
3. [Configure WhatsApp Business](#configure-whatsapp-business)
4. [Test the System](#test-the-system)
5. [User Guide](#user-guide)
6. [Troubleshooting](#troubleshooting)

---

## 🔐 FIRST LOGIN

### Step 1: Access the System

**Web Interface:**
```
URL: http://localhost:8000 (development)
URL: https://aria.vantax.co.za (production)
```

### Step 2: Default Credentials

**Admin Account:**
```
Email:    admin@vantax.co.za
Password: Admin@123
```

**Manager Account:**
```
Email:    manager@vantax.co.za
Password: Manager@123
```

**Employee Account:**
```
Email:    employee@vantax.co.za
Password: Employee@123
```

### Step 3: Change Default Password

⚠️ **IMPORTANT:** Change the default password on first login!

1. Click on your profile (top right)
2. Select "Change Password"
3. Enter new strong password
4. Save changes

---

## 📧 CONFIGURE OFFICE 365 MAILBOX

### Overview

Aria needs access to an Office 365 mailbox (aria@vantax.co.za) to receive and process emails automatically.

### Prerequisites

- ✅ Office 365 subscription
- ✅ Global Administrator access to Azure AD
- ✅ Email address for Aria (e.g., aria@vantax.co.za)

---

### STEP 1: Create Aria's Mailbox

#### 1.1 Go to Microsoft 365 Admin Center

1. Navigate to: https://admin.microsoft.com
2. Login with your admin credentials
3. Go to **Users** → **Active users**

#### 1.2 Create New User

Click **Add a user** and fill in:

```
First name:        Aria
Last name:         ERP Assistant
Display name:      Aria ERP Assistant
Username:          aria@vantax.co.za
Password:          [Create strong password - save this!]

☑ Automatically create password
☑ Require this user to change password on first sign-in (UNCHECK THIS)
☑ Send password in email upon completion (optional)
```

#### 1.3 Assign License

Select license type:
- ✅ **Exchange Online (Plan 1)** - Minimum required
- OR ✅ **Microsoft 365 Business Basic** - Recommended
- OR ✅ **Microsoft 365 Business Standard** - Full features

Click **Next** → **Finish adding**

#### 1.4 Verify Mailbox Created

1. Go to **Exchange Admin Center**: https://admin.exchange.microsoft.com
2. Navigate to **Recipients** → **Mailboxes**
3. Verify **aria@vantax.co.za** appears in the list
4. Click on it to view details

---

### STEP 2: Create Azure AD App Registration

#### 2.1 Navigate to Azure Portal

1. Go to: https://portal.azure.com
2. Login with your admin credentials
3. Navigate to **Azure Active Directory**

#### 2.2 Register New Application

1. Go to **App registrations** (left menu)
2. Click **New registration**
3. Fill in details:

```
Name:                    Aria ERP Automation
Supported account types: Accounts in this organizational directory only (Single tenant)
Redirect URI:            (Leave blank for now)
```

4. Click **Register**

#### 2.3 Note the Application Details

After registration, you'll see:

```
Application (client) ID:    [Copy this - you'll need it]
Directory (tenant) ID:      [Copy this - you'll need it]
```

**Save these values!** You'll need them for configuration.

---

### STEP 3: Create Client Secret

#### 3.1 Create Secret

1. In your app registration, go to **Certificates & secrets** (left menu)
2. Click **New client secret**
3. Fill in:

```
Description:    Aria ERP Secret
Expires:        24 months (or custom period)
```

4. Click **Add**

#### 3.2 Copy the Secret Value

⚠️ **CRITICAL:** Copy the secret **VALUE** immediately!

```
Secret Value:   [Copy this entire string - it won't be shown again!]
```

**Save this value securely!** You cannot retrieve it later.

---

### STEP 4: Configure API Permissions

#### 4.1 Add Microsoft Graph Permissions

1. Go to **API permissions** (left menu)
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (NOT Delegated)

#### 4.2 Add These Permissions

Search and add each of these:

```
☑ Mail.Read                  - Read mail in all mailboxes
☑ Mail.ReadWrite             - Read and write mail in all mailboxes
☑ Mail.Send                  - Send mail as any user
☑ Calendars.ReadWrite        - Read and write calendars in all mailboxes (optional)
```

#### 4.3 Grant Admin Consent

⚠️ **IMPORTANT:** After adding permissions:

1. Click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. Verify all permissions show **Granted** with green checkmark

---

### STEP 5: Configure Aria Application

#### 5.1 Update Environment Variables

Edit your `.env` file in the Aria installation directory:

```bash
# Office 365 Configuration
AZURE_TENANT_ID=your-tenant-id-from-step-2.3
AZURE_CLIENT_ID=your-client-id-from-step-2.3
AZURE_CLIENT_SECRET=your-secret-value-from-step-3.2
ARIA_EMAIL=aria@vantax.co.za

# OCR Engine (choose one)
OCR_ENGINE=azure  # Options: tesseract, azure, openai

# If using Azure Form Recognizer (recommended)
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-region.api.cognitive.microsoft.com
AZURE_FORM_RECOGNIZER_KEY=your-form-recognizer-key

# If using OpenAI (alternative)
OPENAI_API_KEY=your-openai-key
```

#### 5.2 Example .env File

```bash
# Database
DATABASE_URL=postgresql://aria:password@localhost:5432/aria_erp
REDIS_URL=redis://localhost:6379/0

# Office 365
AZURE_TENANT_ID=12345678-1234-1234-1234-123456789abc
AZURE_CLIENT_ID=87654321-4321-4321-4321-cba987654321
AZURE_CLIENT_SECRET=AbC123~dEf456-GhI789_JkL012
ARIA_EMAIL=aria@vantax.co.za

# OCR
OCR_ENGINE=azure
AZURE_FORM_RECOGNIZER_ENDPOINT=https://westeurope.api.cognitive.microsoft.com
AZURE_FORM_RECOGNIZER_KEY=your-32-character-key-here

# Application
SECRET_KEY=your-super-secret-key-change-this-in-production
ENVIRONMENT=production
DEBUG=false

# Admin
ADMIN_EMAIL=admin@vantax.co.za
EXECUTIVE_EMAIL=ceo@vantax.co.za
```

---

### STEP 6: Test Email Integration

#### 6.1 Test Authentication

Run this test script:

```bash
cd /opt/aria-erp/backend
python test_email.py
```

**test_email.py:**
```python
#!/usr/bin/env python3
import asyncio
import os
from automation.office365_integration import Office365Client

async def test_office365():
    print("Testing Office 365 Integration...")
    
    client = Office365Client(
        tenant_id=os.getenv("AZURE_TENANT_ID"),
        client_id=os.getenv("AZURE_CLIENT_ID"),
        client_secret=os.getenv("AZURE_CLIENT_SECRET"),
        mailbox_email=os.getenv("ARIA_EMAIL")
    )
    
    # Test authentication
    print("\n1. Testing authentication...")
    success = await client.authenticate()
    if success:
        print("   ✅ Authentication successful!")
    else:
        print("   ❌ Authentication failed!")
        return
    
    # Test reading emails
    print("\n2. Testing email reading...")
    emails = await client.read_new_emails(max_emails=5, mark_as_read=False)
    print(f"   ✅ Found {len(emails)} unread emails")
    
    for email in emails[:3]:
        print(f"   - From: {email['from']['email']}")
        print(f"     Subject: {email['subject']}")
    
    # Test sending email
    print("\n3. Testing email sending...")
    success = await client.send_email(
        to=["admin@vantax.co.za"],
        subject="Aria ERP - Test Email",
        body="<h1>Hello!</h1><p>This is a test email from Aria ERP system.</p>",
        is_html=True
    )
    if success:
        print("   ✅ Email sent successfully!")
    else:
        print("   ❌ Failed to send email!")
    
    print("\n✅ All tests completed!")

if __name__ == "__main__":
    asyncio.run(test_office365())
```

Run the test:
```bash
python test_email.py
```

Expected output:
```
Testing Office 365 Integration...

1. Testing authentication...
   ✅ Authentication successful!

2. Testing email reading...
   ✅ Found 3 unread emails
   - From: john@supplier.com
     Subject: Invoice #12345
   - From: mary@customer.com
     Subject: Purchase Order
   - From: admin@vantax.co.za
     Subject: Test message

3. Testing email sending...
   ✅ Email sent successfully!

✅ All tests completed!
```

---

### STEP 7: Start Email Poller

#### 7.1 Create Email Poller Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/aria-email-poller.service
```

Add this content:

```ini
[Unit]
Description=Aria ERP Email Poller
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=aria
Group=aria
WorkingDirectory=/opt/aria-erp/backend
Environment="PATH=/opt/aria-erp/venv/bin"
ExecStart=/opt/aria-erp/venv/bin/python -m automation.start_email_poller
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 7.2 Create Email Poller Script

Create file: `/opt/aria-erp/backend/automation/start_email_poller.py`

```python
#!/usr/bin/env python3
"""
Email Poller Service - Continuously monitors Aria's mailbox
"""
import asyncio
import os
import sys
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/aria-erp/email-poller.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

from automation.office365_integration import Office365Client, EmailPoller
from automation.aria_controller import aria_controller

async def process_email_callback(email):
    """Callback to process each email through Aria controller"""
    logger.info(f"Processing email: {email['subject']} from {email['from']['email']}")
    
    from automation.aria_controller import IncomingMessage, MessageChannel, Priority
    
    # Convert email to Aria message
    message = IncomingMessage(
        message_id=email['id'],
        channel=MessageChannel.EMAIL,
        sender=email['from']['name'],
        sender_email=email['from']['email'],
        sender_phone=None,
        subject=email['subject'],
        body=email['body'],
        attachments=email['attachments'],
        received_at=datetime.fromisoformat(email['received_at']),
        priority=Priority.MEDIUM
    )
    
    # Process through Aria controller
    result = await aria_controller.process_incoming_message(message)
    
    logger.info(f"Email processed: {result.get('status')}")
    return result

async def main():
    """Main email poller service"""
    logger.info("="*80)
    logger.info("Aria Email Poller Service Starting")
    logger.info("="*80)
    
    # Initialize Office 365 client
    client = Office365Client(
        tenant_id=os.getenv("AZURE_TENANT_ID"),
        client_id=os.getenv("AZURE_CLIENT_ID"),
        client_secret=os.getenv("AZURE_CLIENT_SECRET"),
        mailbox_email=os.getenv("ARIA_EMAIL", "aria@vantax.co.za")
    )
    
    # Authenticate
    logger.info("Authenticating with Office 365...")
    success = await client.authenticate()
    
    if not success:
        logger.error("Failed to authenticate with Office 365!")
        sys.exit(1)
    
    logger.info("✅ Authentication successful!")
    
    # Start email poller
    poller = EmailPoller(
        office365_client=client,
        poll_interval=30,  # Check every 30 seconds
        process_callback=process_email_callback
    )
    
    logger.info(f"✅ Email poller started (checking every {poller.poll_interval} seconds)")
    logger.info(f"📧 Monitoring: {client.mailbox_email}")
    logger.info("="*80)
    
    # Run forever
    try:
        await poller.start()
    except KeyboardInterrupt:
        logger.info("\n\nEmail poller stopped by user")
    except Exception as e:
        logger.error(f"Email poller error: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
```

#### 7.3 Start the Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable aria-email-poller

# Start service
sudo systemctl start aria-email-poller

# Check status
sudo systemctl status aria-email-poller

# View logs
sudo journalctl -u aria-email-poller -f
```

Expected output:
```
● aria-email-poller.service - Aria ERP Email Poller
     Loaded: loaded (/etc/systemd/system/aria-email-poller.service; enabled)
     Active: active (running) since Tue 2025-10-29 10:00:00 SAST; 5s ago
   Main PID: 12345 (python)
      Tasks: 2 (limit: 4915)
     Memory: 45.2M
        CPU: 1.234s
     CGroup: /system.slice/aria-email-poller.service
             └─12345 /opt/aria-erp/venv/bin/python -m automation.start_email_poller

Oct 29 10:00:00 server systemd[1]: Started Aria ERP Email Poller.
Oct 29 10:00:01 server python[12345]: ================================================================================
Oct 29 10:00:01 server python[12345]: Aria Email Poller Service Starting
Oct 29 10:00:01 server python[12345]: ================================================================================
Oct 29 10:00:02 server python[12345]: ✅ Authentication successful!
Oct 29 10:00:02 server python[12345]: ✅ Email poller started (checking every 30 seconds)
Oct 29 10:00:02 server python[12345]: 📧 Monitoring: aria@vantax.co.za
```

---

### STEP 8: Create Email Folders

Aria will automatically organize emails into folders. Let's create them:

#### 8.1 Via Outlook Web

1. Go to: https://outlook.office.com
2. Login as aria@vantax.co.za
3. Right-click **Inbox** → **Create new subfolder**
4. Create these folders:
   - ✅ **Processed** - Successfully processed emails
   - ✅ **Errors** - Failed emails requiring attention
   - ✅ **Archive** - Old processed emails

#### 8.2 Via API (Alternative)

Folders will be created automatically on first use.

---

### STEP 9: Setup Webhook (Optional - for instant delivery)

Instead of polling every 30 seconds, you can setup webhooks for instant email delivery.

#### 9.1 Create Webhook Subscription

Use Microsoft Graph API to create subscription:

```bash
curl -X POST "https://graph.microsoft.com/v1.0/subscriptions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "changeType": "created",
    "notificationUrl": "https://aria.vantax.co.za/api/v1/automation/webhooks/office365",
    "resource": "users/aria@vantax.co.za/mailFolders/inbox/messages",
    "expirationDateTime": "2025-12-31T18:23:45.9356913Z",
    "clientState": "aria-webhook-secret-123"
  }'
```

#### 9.2 Verify Webhook Endpoint

Your webhook endpoint is already configured in the code:
```
POST https://aria.vantax.co.za/api/v1/automation/webhooks/office365
```

---

## 📱 CONFIGURE WHATSAPP BUSINESS

### Overview

Aria can also receive and process documents via WhatsApp for mobile convenience.

### Prerequisites

- ✅ Meta Business Account
- ✅ WhatsApp Business API access
- ✅ Verified phone number

---

### STEP 1: Create Meta Business Account

1. Go to: https://business.facebook.com
2. Click **Create Account**
3. Fill in business details
4. Verify your business

---

### STEP 2: Setup WhatsApp Business API

#### 2.1 Create App

1. Go to: https://developers.facebook.com
2. Click **Create App**
3. Select type: **Business**
4. Fill in app details:
   ```
   App Name:        Aria ERP WhatsApp
   Contact Email:   admin@vantax.co.za
   Business Account: [Select your business]
   ```

#### 2.2 Add WhatsApp Product

1. In your app dashboard, click **Add Product**
2. Find **WhatsApp** and click **Set Up**
3. Complete business verification (Meta will review)

#### 2.3 Add Phone Number

1. Go to **WhatsApp** → **Getting Started**
2. Click **Add Phone Number**
3. Enter your phone number (e.g., +27 82 XXX XXXX)
4. Verify via SMS/Call
5. Complete verification

---

### STEP 3: Get Credentials

#### 3.1 Get Access Token

1. In WhatsApp section, go to **API Setup**
2. Copy the **Access Token** (temporary 24h token)
3. For permanent token:
   - Go to **Settings** → **Business Settings**
   - Navigate to **System Users**
   - Create system user
   - Generate permanent token
   - Save token securely

#### 3.2 Get Phone Number ID

In WhatsApp API Setup section:
```
Phone Number ID:    [Copy this number]
Business Account ID: [Copy this number]
```

---

### STEP 4: Configure Webhook

#### 4.1 Setup Webhook URL

1. In WhatsApp section, go to **Configuration**
2. Click **Edit** next to Webhook
3. Enter details:
   ```
   Callback URL:     https://aria.vantax.co.za/api/v1/automation/webhooks/whatsapp
   Verify Token:     aria_webhook_token
   ```
4. Click **Verify and Save**

#### 4.2 Subscribe to Webhook Fields

Select these fields:
- ☑ **messages** - Receive incoming messages
- ☑ **message_status** - Receive delivery status

---

### STEP 5: Create Message Templates

WhatsApp requires pre-approved templates for business messages.

#### 5.1 Go to Message Templates

1. In Meta Business Suite, go to **WhatsApp Manager**
2. Navigate to **Message Templates**
3. Click **Create Template**

#### 5.2 Create Templates

**Template 1: Invoice Processed**
```
Name:     invoice_processed
Category: TRANSACTIONAL
Language: English

Message:
Invoice {{1}} for R{{2}} has been processed successfully.

Variables:
- {{1}} = Invoice Number
- {{2}} = Amount
```

**Template 2: Approval Required**
```
Name:     approval_required
Category: TRANSACTIONAL
Language: English

Message:
Approval required for {{1}} {{2}} (R{{3}}). Please review.

Variables:
- {{1}} = Document Type
- {{2}} = Reference Number
- {{3}} = Amount
```

**Template 3: Exception Alert**
```
Name:     exception_alert
Category: ALERT_UPDATE
Language: English

Message:
ALERT: Failed to process {{1}} {{2}}. Reason: {{3}}

Variables:
- {{1}} = Document Type
- {{2}} = Reference Number
- {{3}} = Error Reason
```

**Template 4: Daily Summary**
```
Name:     daily_summary
Category: TRANSACTIONAL
Language: English

Message:
Daily Summary: {{1}} transactions processed, {{2}} exceptions, {{3}} awaiting approval.

Variables:
- {{1}} = Total Transactions
- {{2}} = Exceptions
- {{3}} = Pending Approvals
```

#### 5.3 Submit for Approval

Click **Submit** for each template. Meta will review (usually within 24 hours).

---

### STEP 6: Configure Aria Application

Update `.env` file:

```bash
# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-permanent-access-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_WEBHOOK_TOKEN=aria_webhook_token
```

---

### STEP 7: Test WhatsApp Integration

#### 7.1 Test Script

```python
#!/usr/bin/env python3
import asyncio
import os
from automation.whatsapp_integration import WhatsAppClient

async def test_whatsapp():
    print("Testing WhatsApp Integration...")
    
    client = WhatsAppClient(
        phone_number_id=os.getenv("WHATSAPP_PHONE_NUMBER_ID"),
        access_token=os.getenv("WHATSAPP_ACCESS_TOKEN"),
        business_account_id=os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
    )
    
    # Test sending message
    print("\n1. Sending test message...")
    success = await client.send_text_message(
        to="27821234567",  # Your test number
        message="Hello from Aria ERP! 🤖"
    )
    
    if success:
        print("   ✅ Message sent successfully!")
    else:
        print("   ❌ Failed to send message!")
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    asyncio.run(test_whatsapp())
```

Run:
```bash
python test_whatsapp.py
```

---

## 🧪 TEST THE SYSTEM

### Test 1: Send Email to Aria

1. Compose email to **aria@vantax.co.za**
2. Subject: "Test Invoice"
3. Attach a PDF invoice
4. Send

**Expected Result:**
- Aria receives email within 30 seconds
- Email is parsed and classified
- Document is processed
- You receive confirmation email
- Email moved to "Processed" folder

---

### Test 2: Send WhatsApp to Aria

1. Open WhatsApp
2. Send message to Aria's number
3. Message: "Test message from WhatsApp"

**Expected Result:**
- Aria receives message instantly
- Message is processed
- You receive confirmation reply

---

### Test 3: Upload Document via Web

1. Login to https://aria.vantax.co.za
2. Go to **Documents** → **Upload**
3. Select PDF invoice
4. Click **Submit**

**Expected Result:**
- Document uploaded successfully
- Processed within seconds
- Result visible in dashboard

---

## 👥 USER GUIDE

### For Employees

#### Submit Invoice via Email
```
To:      aria@vantax.co.za
Subject: Invoice from ABC Suppliers
Body:    Please process this invoice
Attach:  invoice.pdf
```

#### Submit Invoice via WhatsApp
1. Send invoice photo/PDF to Aria's WhatsApp
2. Add note: "Invoice from ABC Suppliers"

#### Request Leave via Email
```
To:      aria@vantax.co.za
Subject: Leave Request
Body:    I need leave from 15 Dec to 20 Dec 2025
```

---

### For Managers

#### Approve via Email
- Click **Approve** button in approval email
- OR reply with "APPROVE"

#### Approve via WhatsApp
- Tap **Approve** button
- OR reply with "APPROVE"

---

### For Executives

#### Daily Summary
- Received automatically at 6 PM daily
- Includes all KPIs and metrics
- AI-generated insights

---

## 🔧 TROUBLESHOOTING

### Email Not Processing

**Check 1: Email Poller Running?**
```bash
sudo systemctl status aria-email-poller
```

**Check 2: Authentication Working?**
```bash
python test_email.py
```

**Check 3: View Logs**
```bash
sudo journalctl -u aria-email-poller -f
```

---

### WhatsApp Not Working

**Check 1: Webhook Configured?**
```bash
curl https://aria.vantax.co.za/api/v1/automation/webhooks/whatsapp
```

**Check 2: Templates Approved?**
- Check Meta Business Manager
- Verify all templates have "Approved" status

**Check 3: Test Send**
```bash
python test_whatsapp.py
```

---

### Document Not Parsed

**Check 1: OCR Engine Configured?**
```bash
echo $OCR_ENGINE
```

**Check 2: Test Document Parser**
```python
from automation.document_parser import document_parser
result = await document_parser.parse_document(pdf_bytes, "invoice.pdf", "application/pdf")
print(result)
```

---

## 📞 SUPPORT

**Technical Support:**
- Email: support@vantax.co.za
- WhatsApp: +27 XX XXX XXXX

**Documentation:**
- Full Guide: ARIA_AUTOMATION_DEPLOYMENT.md
- API Docs: /api/docs
- User Manual: /docs

---

## ✅ CONFIGURATION CHECKLIST

- [ ] Created Aria mailbox (aria@vantax.co.za)
- [ ] Created Azure AD app registration
- [ ] Generated client secret
- [ ] Configured API permissions
- [ ] Granted admin consent
- [ ] Updated .env file with credentials
- [ ] Tested email authentication
- [ ] Started email poller service
- [ ] Created email folders
- [ ] (Optional) Setup webhook
- [ ] (Optional) Configured WhatsApp
- [ ] (Optional) Created message templates
- [ ] Sent test email
- [ ] Sent test WhatsApp
- [ ] Uploaded test document
- [ ] Verified processing
- [ ] Changed default passwords

---

🎉 **CONFIGURATION COMPLETE - SYSTEM READY FOR USE!** 🎉

*Last Updated: October 29, 2025*
