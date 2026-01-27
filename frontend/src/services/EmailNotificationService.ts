/**
 * Email Notification Service
 * Handles email notifications for all transaction types in the ARIA ERP system
 */

import { apiClient } from '../utils/api';

// Email template types
export type EmailTemplateType =
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_overdue'
  | 'invoice_paid'
  | 'quote_created'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'order_confirmation'
  | 'order_shipped'
  | 'order_delivered'
  | 'payment_received'
  | 'payment_reminder'
  | 'purchase_order_created'
  | 'purchase_order_approved'
  | 'goods_received'
  | 'approval_required'
  | 'approval_granted'
  | 'approval_rejected'
  | 'task_assigned'
  | 'task_completed'
  | 'leave_request'
  | 'leave_approved'
  | 'leave_rejected'
  | 'payslip_ready'
  | 'welcome_email'
  | 'password_reset'
  | 'account_locked'
  | 'custom';

export interface EmailRecipient {
  email: string;
  name?: string;
  type?: 'to' | 'cc' | 'bcc';
}

export interface EmailAttachment {
  filename: string;
  content?: string; // Base64 encoded
  contentType?: string;
  url?: string; // URL to fetch attachment from
}

export interface EmailOptions {
  templateType: EmailTemplateType;
  recipients: EmailRecipient[];
  subject?: string;
  variables?: Record<string, string | number | boolean>;
  attachments?: EmailAttachment[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  scheduledAt?: string;
}

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class EmailNotificationService {
  private baseUrl = '/api/email';

  /**
   * Send an email using a template
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/send`, options);
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    emails: EmailOptions[]
  ): Promise<{ results: EmailResult[]; successCount: number; failCount: number }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/bulk`, { emails });
      return response.data;
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      return {
        results: emails.map(() => ({
          success: false,
          error: 'Bulk send failed',
        })),
        successCount: 0,
        failCount: emails.length,
      };
    }
  }

  /**
   * Schedule an email for later delivery
   */
  async scheduleEmail(options: EmailOptions, scheduledAt: Date): Promise<EmailResult> {
    return this.sendEmail({
      ...options,
      scheduledAt,
    });
  }

  /**
   * Cancel a scheduled email
   */
  async cancelScheduledEmail(messageId: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/scheduled/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Error canceling scheduled email:', error);
      return { success: false };
    }
  }

  /**
   * Get email templates
   */
  async getTemplates(type?: EmailTemplateType): Promise<EmailTemplate[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/templates`, {
        params: type ? { type } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching email templates:', error);
      return this.getDefaultTemplates(type);
    }
  }

  /**
   * Get a specific template
   */
  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Update an email template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<EmailTemplate>
  ): Promise<EmailTemplate | null> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/templates/${templateId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating template:', error);
      return null;
    }
  }

  /**
   * Preview an email with variables substituted
   */
  async previewEmail(
    templateType: EmailTemplateType,
    variables: Record<string, string | number | boolean>
  ): Promise<{ subject: string; html: string; text?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/preview`, {
        templateType,
        variables,
      });
      return response.data;
    } catch (error) {
      console.error('Error previewing email:', error);
      const template = this.getDefaultTemplates(templateType)[0];
      return {
        subject: this.substituteVariables(template?.subject || '', variables),
        html: this.substituteVariables(template?.htmlBody || '', variables),
      };
    }
  }

  /**
   * Get email delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    timestamp?: string;
    details?: string;
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/status/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching delivery status:', error);
      return { status: 'pending' };
    }
  }

  /**
   * Get email history for a record
   */
  async getEmailHistory(
    recordType: string,
    recordId: string
  ): Promise<Array<{
    id: string;
    templateType: EmailTemplateType;
    recipients: string[];
    subject: string;
    sentAt: string;
    status: string;
  }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/history`, {
        params: { recordType, recordId },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching email history:', error);
      return [];
    }
  }

  // Convenience methods for common email types

  /**
   * Send invoice email
   */
  async sendInvoiceEmail(
    invoiceId: string,
    recipients: EmailRecipient[],
    attachPdf: boolean = true
  ): Promise<EmailResult> {
    return this.sendEmail({
      templateType: 'invoice_sent',
      recipients,
      variables: { invoiceId },
      attachments: attachPdf
        ? [{ filename: `invoice-${invoiceId}.pdf`, url: `/api/invoices/${invoiceId}/pdf` }]
        : undefined,
    });
  }

  /**
   * Send quote email
   */
  async sendQuoteEmail(
    quoteId: string,
    recipients: EmailRecipient[],
    attachPdf: boolean = true
  ): Promise<EmailResult> {
    return this.sendEmail({
      templateType: 'quote_sent',
      recipients,
      variables: { quoteId },
      attachments: attachPdf
        ? [{ filename: `quote-${quoteId}.pdf`, url: `/api/quotes/${quoteId}/pdf` }]
        : undefined,
    });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(
    invoiceId: string,
    recipients: EmailRecipient[],
    daysOverdue: number
  ): Promise<EmailResult> {
    return this.sendEmail({
      templateType: daysOverdue > 0 ? 'invoice_overdue' : 'payment_reminder',
      recipients,
      variables: { invoiceId, daysOverdue },
      priority: daysOverdue > 30 ? 'high' : 'normal',
    });
  }

  /**
   * Send approval request
   */
  async sendApprovalRequest(
    recordType: string,
    recordId: string,
    approverEmail: string,
    requestorName: string,
    description: string
  ): Promise<EmailResult> {
    return this.sendEmail({
      templateType: 'approval_required',
      recipients: [{ email: approverEmail }],
      variables: {
        recordType,
        recordId,
        requestorName,
        description,
        approvalUrl: `${window.location.origin}/actions?type=${recordType}&id=${recordId}`,
      },
      priority: 'high',
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    tempPassword?: string
  ): Promise<EmailResult> {
    return this.sendEmail({
      templateType: 'welcome_email',
      recipients: [{ email: userEmail, name: userName }],
      variables: {
        userName,
        userEmail,
        tempPassword: tempPassword || '',
        loginUrl: `${window.location.origin}/login`,
      },
    });
  }

  /**
   * Send payslip notification
   */
  async sendPayslipNotification(
    employeeEmail: string,
    employeeName: string,
    payPeriod: string,
    payslipId: string
  ): Promise<EmailResult> {
    return this.sendEmail({
      templateType: 'payslip_ready',
      recipients: [{ email: employeeEmail, name: employeeName }],
      variables: {
        employeeName,
        payPeriod,
        payslipUrl: `${window.location.origin}/payroll/payslips/${payslipId}`,
      },
      attachments: [
        { filename: `payslip-${payPeriod}.pdf`, url: `/api/payslips/${payslipId}/pdf` },
      ],
    });
  }

  /**
   * Substitute variables in template string
   */
  private substituteVariables(
    template: string,
    variables: Record<string, string | number | boolean>
  ): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    });
    return result;
  }

  /**
   * Get default templates for fallback
   */
  private getDefaultTemplates(type?: EmailTemplateType): EmailTemplate[] {
    const templates: EmailTemplate[] = [
      {
        id: 'invoice_sent',
        type: 'invoice_sent',
        name: 'Invoice Sent',
        subject: 'Invoice {{invoiceNumber}} from {{companyName}}',
        htmlBody: `
          <h2>Invoice {{invoiceNumber}}</h2>
          <p>Dear {{customerName}},</p>
          <p>Please find attached invoice {{invoiceNumber}} for {{amount}}.</p>
          <p>Payment is due by {{dueDate}}.</p>
          <p>Thank you for your business!</p>
        `,
        variables: ['invoiceNumber', 'customerName', 'amount', 'dueDate', 'companyName'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'quote_sent',
        type: 'quote_sent',
        name: 'Quote Sent',
        subject: 'Quotation {{quoteNumber}} from {{companyName}}',
        htmlBody: `
          <h2>Quotation {{quoteNumber}}</h2>
          <p>Dear {{customerName}},</p>
          <p>Please find attached our quotation {{quoteNumber}} for {{amount}}.</p>
          <p>This quote is valid until {{validUntil}}.</p>
          <p>Please let us know if you have any questions.</p>
        `,
        variables: ['quoteNumber', 'customerName', 'amount', 'validUntil', 'companyName'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'approval_required',
        type: 'approval_required',
        name: 'Approval Required',
        subject: 'Approval Required: {{recordType}} from {{requestorName}}',
        htmlBody: `
          <h2>Approval Required</h2>
          <p>{{requestorName}} has requested your approval for:</p>
          <p><strong>{{description}}</strong></p>
          <p><a href="{{approvalUrl}}">Click here to review and approve</a></p>
        `,
        variables: ['recordType', 'requestorName', 'description', 'approvalUrl'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'welcome_email',
        type: 'welcome_email',
        name: 'Welcome Email',
        subject: 'Welcome to {{companyName}}!',
        htmlBody: `
          <h2>Welcome, {{userName}}!</h2>
          <p>Your account has been created.</p>
          <p>Email: {{userEmail}}</p>
          <p><a href="{{loginUrl}}">Click here to login</a></p>
        `,
        variables: ['userName', 'userEmail', 'loginUrl', 'companyName'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    return type ? templates.filter((t) => t.type === type) : templates;
  }
}

export const emailNotificationService = new EmailNotificationService();
export default emailNotificationService;
