import axios from 'axios';

const API_BASE_URL = '/api/analytics';

export interface AnalyticsSummary {
  documentStats: {
    totalDocuments: number;
    documentsThisMonth: number;
    documentsGrowth: number;
    averageSize: number;
  };
  userActivity: {
    activeUsers: number;
    totalSessions: number;
    averageSessionTime: number;
    userGrowth: number;
  };
  systemMetrics: {
    storageUsed: number;
    storageLimit: number;
    apiCalls: number;
    responseTime: number;
  };
  workflowStats: {
    activeWorkflows: number;
    completedWorkflows: number;
    averageCompletionTime: number;
    workflowEfficiency: number;
  };
}

export interface ChartData {
  documentActivity: Array<{
    date: string;
    uploads: number;
    downloads: number;
    views: number;
  }>;
  userActivity: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    sessions: number;
  }>;
  documentTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  topDocuments: Array<{
    id: number;
    title: string;
    views: number;
    downloads: number;
    lastAccessed: string;
  }>;
  recentActivity: Array<{
    id: number;
    user: string;
    action: string;
    document: string;
    timestamp: string;
    avatar?: string;
  }>;
}

export interface ReportTemplate {
  id?: number;
  name: string;
  description: string;
  type: string;
  config: {
    metrics: string[];
    filters: any;
    groupBy: string[];
    dateRange: string;
    format: string;
  };
  schedule?: {
    frequency: string;
    time: string;
    recipients: string[];
  };
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface GeneratedReport {
  id: number;
  templateId: number;
  templateName: string;
  status: string;
  generatedAt: string;
  fileUrl?: string;
  error?: string;
}

export interface DashboardWidget {
  id?: number;
  title: string;
  type: string;
  config: {
    dataSource: string;
    chartType?: string;
    metrics: string[];
    filters?: any;
    refreshInterval: number;
    colors?: string[];
    size: { width: number; height: number };
    position: { x: number; y: number };
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertRule {
  id?: number;
  name: string;
  description: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: string;
  isActive: boolean;
  notifications: {
    email: boolean;
    webhook: boolean;
    inApp: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

class AnalyticsService {
  // Analytics Summary
  async getAnalyticsSummary(startDate?: string, endDate?: string): Promise<AnalyticsSummary> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await axios.get(`${API_BASE_URL}/summary?${params}`);
    return response.data;
  }

  // Chart Data
  async getChartData(startDate?: string, endDate?: string): Promise<ChartData> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await axios.get(`${API_BASE_URL}/charts?${params}`);
    return response.data;
  }

  // Document Analytics
  async trackDocumentView(documentId: number): Promise<void> {
    await axios.post(`${API_BASE_URL}/track/document/${documentId}/view`);
  }

  async trackDocumentDownload(documentId: number): Promise<void> {
    await axios.post(`${API_BASE_URL}/track/document/${documentId}/download`);
  }

  async trackDocumentShare(documentId: number, shareType: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/track/document/${documentId}/share`, {
      shareType
    });
  }

  async getDocumentAnalytics(documentId: number): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/documents/${documentId}`);
    return response.data;
  }

  // User Activity
  async getUserActivity(userId?: number, startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await axios.get(`${API_BASE_URL}/user-activity?${params}`);
    return response.data;
  }

  async trackUserActivity(action: string, resourceType?: string, resourceId?: number, metadata?: any): Promise<void> {
    await axios.post(`${API_BASE_URL}/track/user-activity`, {
      action,
      resourceType,
      resourceId,
      metadata
    });
  }

  // System Metrics
  async getSystemMetrics(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/system-metrics`);
    return response.data;
  }

  async getSystemHealth(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/system-health`);
    return response.data;
  }

  // Workflow Analytics
  async getWorkflowAnalytics(workflowId?: number): Promise<any> {
    const params = workflowId ? `?workflow_id=${workflowId}` : '';
    const response = await axios.get(`${API_BASE_URL}/workflows${params}`);
    return response.data;
  }

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    const response = await axios.get(`${API_BASE_URL}/report-templates`);
    return response.data;
  }

  async createReportTemplate(template: ReportTemplate): Promise<ReportTemplate> {
    const response = await axios.post(`${API_BASE_URL}/report-templates`, template);
    return response.data;
  }

  async updateReportTemplate(id: number, template: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const response = await axios.put(`${API_BASE_URL}/report-templates/${id}`, template);
    return response.data;
  }

  async deleteReportTemplate(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/report-templates/${id}`);
  }

  async previewReport(templateId: number): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/preview-report/${templateId}`);
    return response.data;
  }

  // Generated Reports
  async getGeneratedReports(): Promise<GeneratedReport[]> {
    const response = await axios.get(`${API_BASE_URL}/generated-reports`);
    return response.data;
  }

  async generateReport(templateId: number, params?: any): Promise<GeneratedReport> {
    const response = await axios.post(`${API_BASE_URL}/generate-report/${templateId}`, params);
    return response.data;
  }

  async downloadReport(reportId: number): Promise<Blob> {
    const response = await axios.get(`${API_BASE_URL}/download-report/${reportId}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Dashboard Widgets
  async getDashboardWidgets(): Promise<DashboardWidget[]> {
    const response = await axios.get(`${API_BASE_URL}/widgets`);
    return response.data;
  }

  async createWidget(widget: DashboardWidget): Promise<DashboardWidget> {
    const response = await axios.post(`${API_BASE_URL}/widgets`, widget);
    return response.data;
  }

  async updateWidget(id: number, widget: Partial<DashboardWidget>): Promise<DashboardWidget> {
    const response = await axios.put(`${API_BASE_URL}/widgets/${id}`, widget);
    return response.data;
  }

  async deleteWidget(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/widgets/${id}`);
  }

  async getWidgetData(widgetId: number): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/widgets/${widgetId}/data`);
    return response.data;
  }

  // Alert Rules
  async getAlertRules(): Promise<AlertRule[]> {
    const response = await axios.get(`${API_BASE_URL}/alert-rules`);
    return response.data;
  }

  async createAlertRule(rule: AlertRule): Promise<AlertRule> {
    const response = await axios.post(`${API_BASE_URL}/alert-rules`, rule);
    return response.data;
  }

  async updateAlertRule(id: number, rule: Partial<AlertRule>): Promise<AlertRule> {
    const response = await axios.put(`${API_BASE_URL}/alert-rules/${id}`, rule);
    return response.data;
  }

  async deleteAlertRule(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/alert-rules/${id}`);
  }

  async testAlertRule(id: number): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/alert-rules/${id}/test`);
    return response.data;
  }

  // Export Data
  async exportData(format: string, startDate?: string, endDate?: string, filters?: any): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (filters) params.append('filters', JSON.stringify(filters));
    
    const response = await axios.get(`${API_BASE_URL}/export?${params}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Real-time Data
  async subscribeToRealTimeUpdates(callback: (data: any) => void): Promise<() => void> {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll use polling as a fallback
    const interval = setInterval(async () => {
      try {
        const data = await this.getSystemMetrics();
        callback(data);
      } catch (error) {
        console.error('Error fetching real-time data:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }

  // Utility Methods
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;