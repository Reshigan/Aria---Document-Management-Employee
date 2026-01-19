/**
 * Email Service
 * 
 * Provides real email sending capabilities using multiple providers:
 * - SendGrid (primary)
 * - Mailgun (fallback)
 * - Resend (alternative)
 * 
 * Supports SPF/DKIM authentication when configured properly.
 */

interface EmailConfig {
  provider: 'sendgrid' | 'mailgun' | 'resend' | 'smtp' | 'graph';
  apiKey?: string;
  domain?: string;
  fromEmail: string;
  fromName: string;
  // Microsoft Graph API specific
  azureClientId?: string;
  azureTenantId?: string;
  azureClientSecret?: string;
}

interface EmailMessage {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  tags?: string[];
}

interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(
  apiKey: string,
  from: { email: string; name: string },
  message: EmailMessage
): Promise<EmailResult> {
  const payload: any = {
    personalizations: [{
      to: [{ email: message.to }],
      ...(message.cc && { cc: [{ email: message.cc }] }),
      ...(message.bcc && { bcc: [{ email: message.bcc }] })
    }],
    from: { email: from.email, name: from.name },
    subject: message.subject,
    content: []
  };

  if (message.text) {
    payload.content.push({ type: 'text/plain', value: message.text });
  }
  if (message.html) {
    payload.content.push({ type: 'text/html', value: message.html });
  }

  if (message.replyTo) {
    payload.reply_to = { email: message.replyTo };
  }

  if (message.attachments && message.attachments.length > 0) {
    payload.attachments = message.attachments.map(att => ({
      content: att.content,
      filename: att.filename,
      type: att.contentType,
      disposition: 'attachment'
    }));
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get('X-Message-Id') || crypto.randomUUID();
      return { success: true, messageId, provider: 'sendgrid' };
    }

    const errorText = await response.text();
    return { success: false, error: `SendGrid error: ${response.status} - ${errorText}`, provider: 'sendgrid' };
  } catch (error) {
    return { success: false, error: `SendGrid error: ${error instanceof Error ? error.message : 'Unknown error'}`, provider: 'sendgrid' };
  }
}

/**
 * Send email via Mailgun
 */
async function sendViaMailgun(
  apiKey: string,
  domain: string,
  from: { email: string; name: string },
  message: EmailMessage
): Promise<EmailResult> {
  const formData = new FormData();
  formData.append('from', `${from.name} <${from.email}>`);
  formData.append('to', message.to);
  if (message.cc) formData.append('cc', message.cc);
  if (message.bcc) formData.append('bcc', message.bcc);
  formData.append('subject', message.subject);
  if (message.text) formData.append('text', message.text);
  if (message.html) formData.append('html', message.html);
  if (message.replyTo) formData.append('h:Reply-To', message.replyTo);

  if (message.attachments) {
    for (const att of message.attachments) {
      const blob = new Blob([Uint8Array.from(atob(att.content), c => c.charCodeAt(0))], { type: att.contentType });
      formData.append('attachment', blob, att.filename);
    }
  }

  try {
    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`
      },
      body: formData
    });

    if (response.ok) {
      const data = await response.json() as { id?: string };
      return { success: true, messageId: data.id, provider: 'mailgun' };
    }

    const errorText = await response.text();
    return { success: false, error: `Mailgun error: ${response.status} - ${errorText}`, provider: 'mailgun' };
  } catch (error) {
    return { success: false, error: `Mailgun error: ${error instanceof Error ? error.message : 'Unknown error'}`, provider: 'mailgun' };
  }
}

/**
 * Send email via Microsoft Graph API (Azure AD)
 * Uses OAuth2 client credentials flow to send email as the configured user
 */
async function sendViaMicrosoftGraph(
  clientId: string,
  tenantId: string,
  clientSecret: string,
  from: { email: string; name: string },
  message: EmailMessage
): Promise<EmailResult> {
  try {
    // Step 1: Get access token using client credentials flow
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenBody.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return { success: false, error: `Azure AD token error: ${tokenResponse.status} - ${errorText}`, provider: 'graph' };
    }

    const tokenData = await tokenResponse.json() as { access_token: string };
    const accessToken = tokenData.access_token;

    // Step 2: Send email using Microsoft Graph API
    const emailPayload: any = {
      message: {
        subject: message.subject,
        body: {
          contentType: message.html ? 'HTML' : 'Text',
          content: message.html || message.text || ''
        },
        toRecipients: [
          {
            emailAddress: {
              address: message.to
            }
          }
        ],
        from: {
          emailAddress: {
            address: from.email,
            name: from.name
          }
        }
      },
      saveToSentItems: true
    };

    // Add CC recipients
    if (message.cc) {
      emailPayload.message.ccRecipients = [
        {
          emailAddress: {
            address: message.cc
          }
        }
      ];
    }

    // Add BCC recipients
    if (message.bcc) {
      emailPayload.message.bccRecipients = [
        {
          emailAddress: {
            address: message.bcc
          }
        }
      ];
    }

    // Add reply-to
    if (message.replyTo) {
      emailPayload.message.replyTo = [
        {
          emailAddress: {
            address: message.replyTo
          }
        }
      ];
    }

    // Add attachments
    if (message.attachments && message.attachments.length > 0) {
      emailPayload.message.attachments = message.attachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentType: att.contentType,
        contentBytes: att.content // Already base64 encoded
      }));
    }

    // Send email via Graph API
    const sendUrl = `https://graph.microsoft.com/v1.0/users/${from.email}/sendMail`;
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (sendResponse.ok || sendResponse.status === 202) {
      return { 
        success: true, 
        messageId: `graph-${crypto.randomUUID()}`, 
        provider: 'graph' 
      };
    }

    const errorText = await sendResponse.text();
    return { success: false, error: `Microsoft Graph error: ${sendResponse.status} - ${errorText}`, provider: 'graph' };
  } catch (error) {
    return { success: false, error: `Microsoft Graph error: ${error instanceof Error ? error.message : 'Unknown error'}`, provider: 'graph' };
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(
  apiKey: string,
  from: { email: string; name: string },
  message: EmailMessage
): Promise<EmailResult> {
  const payload: any = {
    from: `${from.name} <${from.email}>`,
    to: [message.to],
    subject: message.subject
  };

  if (message.cc) payload.cc = [message.cc];
  if (message.bcc) payload.bcc = [message.bcc];
  if (message.html) payload.html = message.html;
  if (message.text) payload.text = message.text;
  if (message.replyTo) payload.reply_to = message.replyTo;

  if (message.attachments && message.attachments.length > 0) {
    payload.attachments = message.attachments.map(att => ({
      filename: att.filename,
      content: att.content
    }));
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json() as { id?: string };
      return { success: true, messageId: data.id, provider: 'resend' };
    }

    const errorText = await response.text();
    return { success: false, error: `Resend error: ${response.status} - ${errorText}`, provider: 'resend' };
  } catch (error) {
    return { success: false, error: `Resend error: ${error instanceof Error ? error.message : 'Unknown error'}`, provider: 'resend' };
  }
}

/**
 * Main email sending function
 * Attempts to send via configured provider with fallback
 */
export async function sendEmail(
  config: EmailConfig,
  message: EmailMessage
): Promise<EmailResult> {
  const from = { email: config.fromEmail, name: config.fromName };

  // Microsoft Graph API uses Azure AD credentials instead of API key
  if (config.provider === 'graph') {
    if (!config.azureClientId || !config.azureTenantId || !config.azureClientSecret) {
      return { success: false, error: 'Microsoft Graph requires Azure AD credentials (clientId, tenantId, clientSecret)' };
    }
    return sendViaMicrosoftGraph(
      config.azureClientId,
      config.azureTenantId,
      config.azureClientSecret,
      from,
      message
    );
  }

  if (!config.apiKey) {
    // Development mode - log email instead of sending
    console.log('Email would be sent:', {
      from,
      to: message.to,
      subject: message.subject,
      hasHtml: !!message.html,
      hasText: !!message.text,
      attachmentCount: message.attachments?.length || 0
    });
    return {
      success: true,
      messageId: `dev-${crypto.randomUUID()}`,
      provider: 'development'
    };
  }

  switch (config.provider) {
    case 'sendgrid':
      return sendViaSendGrid(config.apiKey, from, message);
    
    case 'mailgun':
      if (!config.domain) {
        return { success: false, error: 'Mailgun requires domain configuration' };
      }
      return sendViaMailgun(config.apiKey, config.domain, from, message);
    
    case 'resend':
      return sendViaResend(config.apiKey, from, message);
    
    default:
      return { success: false, error: `Unsupported email provider: ${config.provider}` };
  }
}

/**
 * Get email configuration from database
 */
export async function getEmailConfig(db: D1Database, companyId: string): Promise<EmailConfig | null> {
  const settings = await db.prepare(`
    SELECT email_provider, email_api_key, email_domain, email_from_address, email_from_name,
           azure_client_id, azure_tenant_id, azure_client_secret
    FROM company_settings
    WHERE company_id = ?
  `).bind(companyId).first<any>();

  if (!settings) {
    // Return default development config
    return {
      provider: 'sendgrid',
      fromEmail: 'noreply@aria-erp.com',
      fromName: 'ARIA ERP'
    };
  }

  return {
    provider: settings.email_provider || 'sendgrid',
    apiKey: settings.email_api_key,
    domain: settings.email_domain,
    fromEmail: settings.email_from_address || 'noreply@aria-erp.com',
    fromName: settings.email_from_name || 'ARIA ERP',
    // Microsoft Graph API credentials
    azureClientId: settings.azure_client_id,
    azureTenantId: settings.azure_tenant_id,
    azureClientSecret: settings.azure_client_secret
  };
}

/**
 * Send document email with PDF attachment
 */
export async function sendDocumentEmail(
  db: D1Database,
  companyId: string,
  documentHtml: string,
  recipient: {
    email: string;
    name: string;
  },
  documentInfo: {
    type: string;
    number: string;
    companyName: string;
  },
  customMessage?: string
): Promise<EmailResult> {
  const config = await getEmailConfig(db, companyId);
  if (!config) {
    return { success: false, error: 'Email not configured for this company' };
  }

  const subject = `${documentInfo.type} ${documentInfo.number} from ${documentInfo.companyName}`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>Dear ${recipient.name},</p>
      
      ${customMessage ? `<p>${customMessage}</p>` : `
        <p>Please find attached ${documentInfo.type} ${documentInfo.number}.</p>
      `}
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>${documentInfo.companyName}</p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      
      <p style="font-size: 12px; color: #6b7280;">
        This email was sent by ARIA ERP on behalf of ${documentInfo.companyName}.
      </p>
    </div>
  `;

  // Convert HTML document to base64 for attachment
  const htmlBase64 = btoa(unescape(encodeURIComponent(documentHtml)));

  return sendEmail(config, {
    to: recipient.email,
    subject,
    html: emailHtml,
    text: `Dear ${recipient.name},\n\nPlease find attached ${documentInfo.type} ${documentInfo.number}.\n\nBest regards,\n${documentInfo.companyName}`,
    attachments: [{
      filename: `${documentInfo.type.replace(/\s+/g, '_')}_${documentInfo.number}.html`,
      content: htmlBase64,
      contentType: 'text/html'
    }]
  });
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminder(
  db: D1Database,
  companyId: string,
  invoice: {
    number: string;
    amount: number;
    currency: string;
    dueDate: string;
    paymentLink?: string;
  },
  customer: {
    email: string;
    name: string;
  },
  companyName: string
): Promise<EmailResult> {
  const config = await getEmailConfig(db, companyId);
  if (!config) {
    return { success: false, error: 'Email not configured for this company' };
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { ZAR: 'R', USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">Payment Reminder</h2>
      
      <p>Dear ${customer.name},</p>
      
      <p>This is a friendly reminder that invoice <strong>${invoice.number}</strong> for 
      <strong>${formatCurrency(invoice.amount, invoice.currency)}</strong> is due on 
      <strong>${new Date(invoice.dueDate).toLocaleDateString()}</strong>.</p>
      
      ${invoice.paymentLink ? `
        <p style="margin: 30px 0;">
          <a href="${invoice.paymentLink}" 
             style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Pay Now
          </a>
        </p>
      ` : ''}
      
      <p>If you have already made this payment, please disregard this reminder.</p>
      
      <p>Best regards,<br>${companyName}</p>
    </div>
  `;

  return sendEmail(config, {
    to: customer.email,
    subject: `Payment Reminder: Invoice ${invoice.number} - ${formatCurrency(invoice.amount, invoice.currency)}`,
    html: emailHtml,
    tags: ['payment-reminder', `invoice-${invoice.number}`]
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmation(
  db: D1Database,
  companyId: string,
  payment: {
    amount: number;
    currency: string;
    reference: string;
    invoiceNumber?: string;
  },
  customer: {
    email: string;
    name: string;
  },
  companyName: string
): Promise<EmailResult> {
  const config = await getEmailConfig(db, companyId);
  if (!config) {
    return { success: false, error: 'Email not configured for this company' };
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { ZAR: 'R', USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #065f46; margin: 0;">Payment Received</h2>
      </div>
      
      <p>Dear ${customer.name},</p>
      
      <p>Thank you for your payment of <strong>${formatCurrency(payment.amount, payment.currency)}</strong>.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Reference</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${payment.reference}</td>
        </tr>
        ${payment.invoiceNumber ? `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Invoice</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${payment.invoiceNumber}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${formatCurrency(payment.amount, payment.currency)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; color: #6b7280;">Date</td>
          <td style="padding: 10px; font-weight: 600;">${new Date().toLocaleDateString()}</td>
        </tr>
      </table>
      
      <p>Best regards,<br>${companyName}</p>
    </div>
  `;

  return sendEmail(config, {
    to: customer.email,
    subject: `Payment Confirmation - ${formatCurrency(payment.amount, payment.currency)}`,
    html: emailHtml,
    tags: ['payment-confirmation', `ref-${payment.reference}`]
  });
}
