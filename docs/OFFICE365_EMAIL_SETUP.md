# Office365 Email Integration Setup

This document explains how to configure Office365 email integration for ARIA ERP to enable email polling and automated responses.

## Overview

ARIA can automatically poll the Office365 mailbox (aria@vantax.co.za) for incoming emails and respond intelligently using the same AI controller as the chat interface. This allows users to interact with ARIA via email just like they would through the web chat.

## Prerequisites

- Office365 Business or Enterprise account
- Azure AD application registration
- Admin access to configure app permissions

## Setup Steps

### 1. Register Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - Name: `ARIA ERP Email Integration`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: Leave blank (not needed for daemon apps)
5. Click **Register**

### 2. Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** > **Microsoft Graph** > **Application permissions**
3. Add the following permissions:
   - `Mail.Read` - Read mail in all mailboxes
   - `Mail.ReadWrite` - Read and write mail in all mailboxes
   - `Mail.Send` - Send mail as any user
4. Click **Grant admin consent** (requires admin privileges)

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `ARIA Email Polling`
4. Expires: Choose appropriate duration (12 months recommended)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (it won't be shown again)

### 4. Get Required Values

You'll need three values from Azure AD:

1. **Tenant ID**: 
   - Go to **Azure Active Directory** > **Overview**
   - Copy the **Tenant ID**

2. **Client ID (Application ID)**:
   - In your app registration, go to **Overview**
   - Copy the **Application (client) ID**

3. **Client Secret**:
   - The value you copied in step 3

### 5. Configure Environment Variables

Add these environment variables to your production server:

```bash
# Office365 Email Integration
OFFICE365_TENANT_ID=your-tenant-id-here
OFFICE365_CLIENT_ID=your-client-id-here
OFFICE365_CLIENT_SECRET=your-client-secret-here
OFFICE365_MAILBOX=aria@vantax.co.za
EMAIL_POLL_INTERVAL=60
```

#### Option A: Add to systemd service file

Edit `/etc/systemd/system/aria-backend.service`:

```ini
[Service]
Environment="OFFICE365_TENANT_ID=your-tenant-id-here"
Environment="OFFICE365_CLIENT_ID=your-client-id-here"
Environment="OFFICE365_CLIENT_SECRET=your-client-secret-here"
Environment="OFFICE365_MAILBOX=aria@vantax.co.za"
Environment="EMAIL_POLL_INTERVAL=60"
```

Then reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart aria-backend.service
```

#### Option B: Use environment file

Create `/var/www/aria/.env.email`:

```bash
OFFICE365_TENANT_ID=your-tenant-id-here
OFFICE365_CLIENT_ID=your-client-id-here
OFFICE365_CLIENT_SECRET=your-client-secret-here
OFFICE365_MAILBOX=aria@vantax.co.za
EMAIL_POLL_INTERVAL=60
```

Update systemd service to load it:
```ini
[Service]
EnvironmentFile=/var/www/aria/.env.email
```

### 6. Verify Setup

After configuring and restarting the service, check the logs:

```bash
sudo journalctl -u aria-backend.service -f
```

You should see:
```
📧 Email Polling: Enabled (interval: 60s)
🚀 Starting email polling service (interval: 60s)
```

## How It Works

1. **Email Polling**: Every 60 seconds (configurable), ARIA checks the mailbox for unread emails
2. **Processing**: Each email is processed through the Aria Controller Engine (same as chat)
3. **Response**: ARIA sends an intelligent reply based on the email content
4. **Attachments**: Documents attached to emails are processed through the document classification system
5. **Threading**: Responses maintain email threads for multi-turn conversations

## Email Response Examples

### Example 1: Simple Query
**User Email:**
```
Subject: System Status
Body: What is the current status of the ERP system?
```

**ARIA Response:**
```
Subject: RE: System Status
Body: Hello! I'm ARIA, your AI assistant. The ERP system is currently operational 
with 67 active bots processing transactions. All modules are functioning normally.

How can I assist you further?

Best regards,
ARIA 🤖
```

### Example 2: Document Processing
**User Email:**
```
Subject: Invoice Processing
Body: Please process the attached invoice
Attachment: invoice_12345.pdf
```

**ARIA Response:**
```
Subject: RE: Invoice Processing
Body: Your invoice has been processed successfully!

Document Classification: Invoice
Supplier: ABC Manufacturing (Pty) Ltd
Invoice Number: INV-12345
Total Amount: R 15,450.00
VAT Amount: R 2,317.50

The invoice has been created in the system and is ready for approval.

Best regards,
ARIA 🤖
```

## Troubleshooting

### Email polling not starting

Check logs for error messages:
```bash
sudo journalctl -u aria-backend.service | grep -i email
```

Common issues:
- Missing environment variables
- Invalid credentials
- Insufficient API permissions
- Network connectivity issues

### Authentication failures

If you see `401 Unauthorized` errors:
1. Verify the client secret hasn't expired
2. Check that admin consent was granted for API permissions
3. Ensure the tenant ID and client ID are correct

### No emails being processed

1. Check that emails are actually unread in the mailbox
2. Verify the mailbox address is correct
3. Check for errors in the logs
4. Ensure the service has been restarted after configuration

## Security Considerations

1. **Client Secret**: Store securely, never commit to git
2. **Permissions**: Use least privilege (only required Graph API permissions)
3. **Mailbox**: Use a dedicated service account (aria@vantax.co.za)
4. **Logging**: Ensure sensitive data is not logged
5. **Rate Limiting**: MS Graph API has rate limits (polling interval should be ≥60s)

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `OFFICE365_TENANT_ID` | Required | Azure AD tenant ID |
| `OFFICE365_CLIENT_ID` | Required | Application (client) ID |
| `OFFICE365_CLIENT_SECRET` | Required | Client secret value |
| `OFFICE365_MAILBOX` | `aria@vantax.co.za` | Email address to monitor |
| `EMAIL_POLL_INTERVAL` | `60` | Polling interval in seconds |

## Support

For issues or questions:
1. Check the logs: `sudo journalctl -u aria-backend.service -f`
2. Verify configuration: Ensure all environment variables are set
3. Test authentication: Check Azure AD app permissions
4. Contact support: Include relevant log excerpts

## Next Steps

After email integration is working:
1. Test by sending an email to aria@vantax.co.za
2. Monitor the logs to see email processing
3. Verify you receive an automated response
4. Test with document attachments
5. Configure additional users to interact via email
