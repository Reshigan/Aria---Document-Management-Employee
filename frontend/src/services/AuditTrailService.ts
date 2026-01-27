/**
 * Audit Trail Service
 * Comprehensive logging for all transactions and actions in the ARIA ERP system
 */

import { apiClient } from '../utils/api';
import { getUserFromToken } from '../utils/auth';

// Audit event types
export type AuditEventType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'permission_change'
  | 'export'
  | 'import'
  | 'print'
  | 'email'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'cancel'
  | 'void'
  | 'archive'
  | 'restore'
  | 'bulk_action'
  | 'system_event'
  | 'api_call'
  | 'error';

// Audit severity levels
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  module: string;
  resource: string;
  resourceId?: string;
  action: string;
  description: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

export interface AuditFilter {
  startDate?: string;
  endDate?: string;
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  userIds?: string[];
  modules?: string[];
  resources?: string[];
  resourceId?: string;
  searchTerm?: string;
  success?: boolean;
}

export interface AuditStats {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByModule: Record<string, number>;
  eventsByUser: Array<{ userId: string; userName: string; count: number }>;
  recentErrors: AuditEntry[];
  loginAttempts: { successful: number; failed: number };
}

class AuditTrailService {
  private baseUrl = '/api/audit';
  private sessionId: string;
  private pendingLogs: AuditEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushInterval();
  }

  /**
   * Log an audit event
   */
  async log(
    eventType: AuditEventType,
    module: string,
    resource: string,
    action: string,
    options: {
      resourceId?: string;
      description?: string;
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      severity?: AuditSeverity;
      success?: boolean;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    const user = getUserFromToken();
    
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity: options.severity || this.getSeverityForEventType(eventType),
      userId: user?.id || 'anonymous',
      userName: user?.name || 'Anonymous',
      userEmail: user?.email || '',
      userRole: user?.role,
      module,
      resource,
      resourceId: options.resourceId,
      action,
      description: options.description || this.generateDescription(eventType, resource, action),
      oldValues: options.oldValues,
      newValues: options.newValues,
      changedFields: this.getChangedFields(options.oldValues, options.newValues),
      metadata: options.metadata,
      sessionId: this.sessionId,
      success: options.success !== false,
      errorMessage: options.errorMessage,
    };

    // Add to pending logs for batch processing
    this.pendingLogs.push(entry);

    // Immediately flush critical events
    if (entry.severity === 'critical' || entry.severity === 'error') {
      await this.flush();
    }
  }

  /**
   * Log a create event
   */
  async logCreate(
    module: string,
    resource: string,
    resourceId: string,
    newValues: Record<string, unknown>,
    description?: string
  ): Promise<void> {
    await this.log('create', module, resource, 'Created', {
      resourceId,
      newValues,
      description: description || `Created ${resource} ${resourceId}`,
    });
  }

  /**
   * Log an update event
   */
  async logUpdate(
    module: string,
    resource: string,
    resourceId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    description?: string
  ): Promise<void> {
    await this.log('update', module, resource, 'Updated', {
      resourceId,
      oldValues,
      newValues,
      description: description || `Updated ${resource} ${resourceId}`,
    });
  }

  /**
   * Log a delete event
   */
  async logDelete(
    module: string,
    resource: string,
    resourceId: string,
    deletedValues?: Record<string, unknown>,
    description?: string
  ): Promise<void> {
    await this.log('delete', module, resource, 'Deleted', {
      resourceId,
      oldValues: deletedValues,
      description: description || `Deleted ${resource} ${resourceId}`,
      severity: 'warning',
    });
  }

  /**
   * Log a login event
   */
  async logLogin(success: boolean, email: string, errorMessage?: string): Promise<void> {
    await this.log(
      success ? 'login' : 'login_failed',
      'auth',
      'session',
      success ? 'Login successful' : 'Login failed',
      {
        description: success ? `User ${email} logged in` : `Failed login attempt for ${email}`,
        metadata: { email },
        success,
        errorMessage,
        severity: success ? 'info' : 'warning',
      }
    );
  }

  /**
   * Log a logout event
   */
  async logLogout(): Promise<void> {
    await this.log('logout', 'auth', 'session', 'Logout', {
      description: 'User logged out',
    });
  }

  /**
   * Log an approval event
   */
  async logApproval(
    module: string,
    resource: string,
    resourceId: string,
    approved: boolean,
    comments?: string
  ): Promise<void> {
    await this.log(
      approved ? 'approve' : 'reject',
      module,
      resource,
      approved ? 'Approved' : 'Rejected',
      {
        resourceId,
        description: `${approved ? 'Approved' : 'Rejected'} ${resource} ${resourceId}`,
        metadata: { comments },
      }
    );
  }

  /**
   * Log an export event
   */
  async logExport(
    module: string,
    resource: string,
    format: string,
    recordCount: number,
    filters?: Record<string, unknown>
  ): Promise<void> {
    await this.log('export', module, resource, 'Exported', {
      description: `Exported ${recordCount} ${resource} records as ${format}`,
      metadata: { format, recordCount, filters },
    });
  }

  /**
   * Log an import event
   */
  async logImport(
    module: string,
    resource: string,
    recordCount: number,
    successCount: number,
    errorCount: number
  ): Promise<void> {
    await this.log('import', module, resource, 'Imported', {
      description: `Imported ${successCount}/${recordCount} ${resource} records (${errorCount} errors)`,
      metadata: { recordCount, successCount, errorCount },
      success: errorCount === 0,
      severity: errorCount > 0 ? 'warning' : 'info',
    });
  }

  /**
   * Log an error event
   */
  async logError(
    module: string,
    resource: string,
    action: string,
    errorMessage: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log('error', module, resource, action, {
      description: `Error: ${errorMessage}`,
      errorMessage,
      metadata,
      success: false,
      severity: 'error',
    });
  }

  /**
   * Get audit entries with filtering
   */
  async getAuditEntries(
    filter: AuditFilter = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ entries: AuditEntry[]; total: number; page: number; pageSize: number }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/entries`, {
        params: {
          ...filter,
          page,
          pageSize,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit entries:', error);
      return { entries: [], total: 0, page, pageSize };
    }
  }

  /**
   * Get audit entries for a specific record
   */
  async getRecordHistory(
    module: string,
    resource: string,
    resourceId: string
  ): Promise<AuditEntry[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/history`, {
        params: { module, resource, resourceId },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching record history:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(
    startDate?: string,
    endDate?: string
  ): Promise<AuditStats> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats`, {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get user activity log
   */
  async getUserActivity(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AuditEntry[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/user-activity/${userId}`, {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }
  }

  /**
   * Export audit log
   */
  async exportAuditLog(
    filter: AuditFilter,
    format: 'csv' | 'json' | 'pdf' = 'csv'
  ): Promise<Blob> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/export`,
        { filter, format },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Error exporting audit log:', error);
      throw error;
    }
  }

  /**
   * Flush pending logs to server
   */
  async flush(): Promise<void> {
    if (this.pendingLogs.length === 0) return;

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      await apiClient.post(`${this.baseUrl}/batch`, { entries: logsToSend });
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      // Re-add failed logs to pending
      this.pendingLogs = [...logsToSend, ...this.pendingLogs];
    }
  }

  /**
   * Start periodic flush interval
   */
  private startFlushInterval(): void {
    if (this.flushInterval) return;
    
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Stop flush interval
   */
  stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get severity for event type
   */
  private getSeverityForEventType(eventType: AuditEventType): AuditSeverity {
    const severityMap: Record<AuditEventType, AuditSeverity> = {
      create: 'info',
      read: 'info',
      update: 'info',
      delete: 'warning',
      login: 'info',
      logout: 'info',
      login_failed: 'warning',
      password_change: 'warning',
      permission_change: 'warning',
      export: 'info',
      import: 'info',
      print: 'info',
      email: 'info',
      approve: 'info',
      reject: 'info',
      submit: 'info',
      cancel: 'warning',
      void: 'warning',
      archive: 'info',
      restore: 'info',
      bulk_action: 'warning',
      system_event: 'info',
      api_call: 'info',
      error: 'error',
    };
    return severityMap[eventType] || 'info';
  }

  /**
   * Generate description for event
   */
  private generateDescription(
    eventType: AuditEventType,
    resource: string,
    action: string
  ): string {
    return `${action} ${resource}`;
  }

  /**
   * Get changed fields between old and new values
   */
  private getChangedFields(
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
  ): string[] | undefined {
    if (!oldValues || !newValues) return undefined;

    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    allKeys.forEach((key) => {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changedFields.push(key);
      }
    });

    return changedFields.length > 0 ? changedFields : undefined;
  }

  /**
   * Get empty stats object
   */
  private getEmptyStats(): AuditStats {
    return {
      totalEvents: 0,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsBySeverity: {} as Record<AuditSeverity, number>,
      eventsByModule: {},
      eventsByUser: [],
      recentErrors: [],
      loginAttempts: { successful: 0, failed: 0 },
    };
  }
}

export const auditTrailService = new AuditTrailService();
export default auditTrailService;
