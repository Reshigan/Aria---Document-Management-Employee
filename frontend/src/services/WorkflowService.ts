/**
 * Cross-Module Workflow Service
 * Handles business process workflows across modules in the ARIA ERP system
 */

import { apiClient } from '../utils/api';
import { emailNotificationService } from './EmailNotificationService';

// Workflow types
export type WorkflowType =
  | 'quote_to_order'
  | 'order_to_invoice'
  | 'order_to_delivery'
  | 'delivery_to_invoice'
  | 'invoice_to_payment'
  | 'po_to_receipt'
  | 'receipt_to_bill'
  | 'bill_to_payment'
  | 'requisition_to_po'
  | 'leave_request'
  | 'expense_claim'
  | 'budget_approval'
  | 'work_order_completion'
  | 'service_order_completion'
  | 'custom';

// Workflow status
export type WorkflowStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  type: 'action' | 'approval' | 'notification' | 'condition' | 'wait';
  config: {
    action?: string;
    approvers?: string[];
    approvalType?: 'any' | 'all' | 'sequential';
    notificationTemplate?: string;
    condition?: string;
    waitDuration?: number;
  };
  nextSteps?: string[];
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  completedAt?: string;
  completedBy?: string;
}

export interface WorkflowInstance {
  id: string;
  workflowType: WorkflowType;
  sourceModule: string;
  sourceRecordId: string;
  targetModule?: string;
  targetRecordId?: string;
  status: WorkflowStatus;
  currentStep?: string;
  steps: WorkflowStep[];
  variables: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WorkflowDefinition {
  id: string;
  type: WorkflowType;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isActive: boolean;
  version: number;
}

class WorkflowService {
  private baseUrl = '/api/workflows';

  /**
   * Start a new workflow instance
   */
  async startWorkflow(
    workflowType: WorkflowType,
    sourceModule: string,
    sourceRecordId: string,
    variables?: Record<string, unknown>
  ): Promise<WorkflowInstance> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/start`, {
        workflowType,
        sourceModule,
        sourceRecordId,
        variables,
      });
      return response.data;
    } catch (error) {
      console.error('Error starting workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow instance by ID
   */
  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/instances/${instanceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow instance:', error);
      return null;
    }
  }

  /**
   * Get workflow instances for a record
   */
  async getWorkflowsForRecord(
    module: string,
    recordId: string
  ): Promise<WorkflowInstance[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/instances`, {
        params: { module, recordId },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching workflows for record:', error);
      return [];
    }
  }

  /**
   * Approve a workflow step
   */
  async approveStep(
    instanceId: string,
    stepId: string,
    comments?: string
  ): Promise<WorkflowInstance> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/instances/${instanceId}/steps/${stepId}/approve`,
        { comments }
      );
      return response.data;
    } catch (error) {
      console.error('Error approving workflow step:', error);
      throw error;
    }
  }

  /**
   * Reject a workflow step
   */
  async rejectStep(
    instanceId: string,
    stepId: string,
    reason: string
  ): Promise<WorkflowInstance> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/instances/${instanceId}/steps/${stepId}/reject`,
        { reason }
      );
      return response.data;
    } catch (error) {
      console.error('Error rejecting workflow step:', error);
      throw error;
    }
  }

  /**
   * Cancel a workflow instance
   */
  async cancelWorkflow(instanceId: string, reason?: string): Promise<WorkflowInstance> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/instances/${instanceId}/cancel`,
        { reason }
      );
      return response.data;
    } catch (error) {
      console.error('Error canceling workflow:', error);
      throw error;
    }
  }

  /**
   * Get pending approvals for current user
   */
  async getPendingApprovals(): Promise<Array<{
    workflowInstance: WorkflowInstance;
    step: WorkflowStep;
    sourceRecord: Record<string, unknown>;
  }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/pending-approvals`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  }

  /**
   * Get workflow definitions
   */
  async getWorkflowDefinitions(type?: WorkflowType): Promise<WorkflowDefinition[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/definitions`, {
        params: type ? { type } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow definitions:', error);
      return this.getDefaultDefinitions(type);
    }
  }

  // Convenience methods for common workflows

  /**
   * Convert quote to sales order
   */
  async convertQuoteToOrder(quoteId: string): Promise<{
    success: boolean;
    salesOrderId?: string;
    workflowInstance?: WorkflowInstance;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/quotes/${quoteId}/convert-to-order`);
      
      // Start workflow tracking
      const workflow = await this.startWorkflow('quote_to_order', 'quotes', quoteId, {
        salesOrderId: response.data.salesOrderId,
      });

      return {
        success: true,
        salesOrderId: response.data.salesOrderId,
        workflowInstance: workflow,
      };
    } catch (error) {
      console.error('Error converting quote to order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  }

  /**
   * Convert sales order to invoice
   */
  async convertOrderToInvoice(orderId: string): Promise<{
    success: boolean;
    invoiceId?: string;
    workflowInstance?: WorkflowInstance;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/sales-orders/${orderId}/convert-to-invoice`);
      
      const workflow = await this.startWorkflow('order_to_invoice', 'sales_orders', orderId, {
        invoiceId: response.data.invoiceId,
      });

      return {
        success: true,
        invoiceId: response.data.invoiceId,
        workflowInstance: workflow,
      };
    } catch (error) {
      console.error('Error converting order to invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  }

  /**
   * Create delivery from sales order
   */
  async createDeliveryFromOrder(orderId: string): Promise<{
    success: boolean;
    deliveryId?: string;
    workflowInstance?: WorkflowInstance;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/sales-orders/${orderId}/create-delivery`);
      
      const workflow = await this.startWorkflow('order_to_delivery', 'sales_orders', orderId, {
        deliveryId: response.data.deliveryId,
      });

      return {
        success: true,
        deliveryId: response.data.deliveryId,
        workflowInstance: workflow,
      };
    } catch (error) {
      console.error('Error creating delivery from order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Creation failed',
      };
    }
  }

  /**
   * Convert requisition to purchase order
   */
  async convertRequisitionToPO(requisitionId: string): Promise<{
    success: boolean;
    purchaseOrderId?: string;
    workflowInstance?: WorkflowInstance;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/requisitions/${requisitionId}/convert-to-po`);
      
      const workflow = await this.startWorkflow('requisition_to_po', 'requisitions', requisitionId, {
        purchaseOrderId: response.data.purchaseOrderId,
      });

      return {
        success: true,
        purchaseOrderId: response.data.purchaseOrderId,
        workflowInstance: workflow,
      };
    } catch (error) {
      console.error('Error converting requisition to PO:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  }

  /**
   * Record payment against invoice
   */
  async recordPayment(
    invoiceId: string,
    amount: number,
    paymentMethod: string,
    reference?: string
  ): Promise<{
    success: boolean;
    paymentId?: string;
    remainingBalance?: number;
    workflowInstance?: WorkflowInstance;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/invoices/${invoiceId}/payments`, {
        amount,
        paymentMethod,
        reference,
      });
      
      const workflow = await this.startWorkflow('invoice_to_payment', 'invoices', invoiceId, {
        paymentId: response.data.paymentId,
        amount,
      });

      // Send payment confirmation email
      if (response.data.customerEmail) {
        await emailNotificationService.sendEmail({
          templateType: 'payment_received',
          recipients: [{ email: response.data.customerEmail }],
          variables: {
            invoiceNumber: response.data.invoiceNumber,
            amount: amount.toString(),
            paymentMethod,
          },
        });
      }

      return {
        success: true,
        paymentId: response.data.paymentId,
        remainingBalance: response.data.remainingBalance,
        workflowInstance: workflow,
      };
    } catch (error) {
      console.error('Error recording payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment recording failed',
      };
    }
  }

  /**
   * Submit expense claim for approval
   */
  async submitExpenseClaim(claimId: string): Promise<{
    success: boolean;
    workflowInstance?: WorkflowInstance;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/expense-claims/${claimId}/submit`);
      
      const workflow = await this.startWorkflow('expense_claim', 'expense_claims', claimId, {
        amount: response.data.totalAmount,
        employeeName: response.data.employeeName,
      });

      // Send approval request
      if (response.data.approverEmail) {
        await emailNotificationService.sendApprovalRequest(
          'Expense Claim',
          claimId,
          response.data.approverEmail,
          response.data.employeeName,
          `Expense claim for ${response.data.totalAmount}`
        );
      }

      return {
        success: true,
        workflowInstance: workflow,
      };
    } catch (error) {
      console.error('Error submitting expense claim:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed',
      };
    }
  }

  /**
   * Submit leave request for approval
   */
  async submitLeaveRequest(requestId: string): Promise<{
    success: boolean;
    workflowInstance?: WorkflowInstance;
    error?: string;
  }> {
    try {
      const response = await apiClient.post(`/api/leave-requests/${requestId}/submit`);
      
      const workflow = await this.startWorkflow('leave_request', 'leave_requests', requestId, {
        employeeName: response.data.employeeName,
        leaveType: response.data.leaveType,
        startDate: response.data.startDate,
        endDate: response.data.endDate,
      });

      // Send approval request
      if (response.data.approverEmail) {
        await emailNotificationService.sendApprovalRequest(
          'Leave Request',
          requestId,
          response.data.approverEmail,
          response.data.employeeName,
          `${response.data.leaveType} leave from ${response.data.startDate} to ${response.data.endDate}`
        );
      }

      return {
        success: true,
        workflowInstance: workflow,
      };
    } catch (error) {
      console.error('Error submitting leave request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed',
      };
    }
  }

  /**
   * Get default workflow definitions
   */
  private getDefaultDefinitions(type?: WorkflowType): WorkflowDefinition[] {
    const definitions: WorkflowDefinition[] = [
      {
        id: 'quote_to_order',
        type: 'quote_to_order',
        name: 'Quote to Sales Order',
        description: 'Convert accepted quote to sales order',
        steps: [
          {
            id: 'validate',
            name: 'Validate Quote',
            type: 'action',
            config: { action: 'validate_quote' },
          },
          {
            id: 'create_order',
            name: 'Create Sales Order',
            type: 'action',
            config: { action: 'create_sales_order' },
          },
          {
            id: 'notify',
            name: 'Send Confirmation',
            type: 'notification',
            config: { notificationTemplate: 'order_confirmation' },
          },
        ],
        isActive: true,
        version: 1,
      },
      {
        id: 'order_to_invoice',
        type: 'order_to_invoice',
        name: 'Sales Order to Invoice',
        description: 'Generate invoice from completed sales order',
        steps: [
          {
            id: 'validate',
            name: 'Validate Order',
            type: 'action',
            config: { action: 'validate_order' },
          },
          {
            id: 'create_invoice',
            name: 'Create Invoice',
            type: 'action',
            config: { action: 'create_invoice' },
          },
          {
            id: 'send_invoice',
            name: 'Send Invoice',
            type: 'notification',
            config: { notificationTemplate: 'invoice_sent' },
          },
        ],
        isActive: true,
        version: 1,
      },
      {
        id: 'expense_claim',
        type: 'expense_claim',
        name: 'Expense Claim Approval',
        description: 'Expense claim approval workflow',
        steps: [
          {
            id: 'manager_approval',
            name: 'Manager Approval',
            type: 'approval',
            config: {
              approvalType: 'any',
              approvers: ['manager'],
            },
          },
          {
            id: 'finance_approval',
            name: 'Finance Approval',
            type: 'approval',
            config: {
              approvalType: 'any',
              approvers: ['finance'],
              condition: 'amount > 5000',
            },
          },
          {
            id: 'process_payment',
            name: 'Process Payment',
            type: 'action',
            config: { action: 'process_expense_payment' },
          },
        ],
        isActive: true,
        version: 1,
      },
    ];

    return type ? definitions.filter((d) => d.type === type) : definitions;
  }
}

export const workflowService = new WorkflowService();
export default workflowService;
