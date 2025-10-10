import { api } from '@/lib/api';

export interface Integration {
  id: number;
  name: string;
  type: 'sap' | 'email' | 'slack' | 'teams' | 'cloud_storage' | 'webhook';
  status: 'active' | 'inactive' | 'error' | 'pending';
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
  sync_status?: 'success' | 'failed' | 'in_progress';
  error_message?: string;
}

export interface IntegrationCreate {
  name: string;
  type: string;
  configuration: Record<string, any>;
}

export interface IntegrationUpdate {
  name?: string;
  configuration?: Record<string, any>;
  status?: string;
}

export interface TestConnectionRequest {
  type: string;
  configuration: Record<string, any>;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface SAPConnection {
  id: number;
  integration_id: number;
  server_host: string;
  server_port: number;
  client: string;
  system_number: string;
  username: string;
  connection_pool_size: number;
  timeout: number;
  is_active: boolean;
  last_connected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailConfiguration {
  id: number;
  integration_id: number;
  smtp_server: string;
  smtp_port: number;
  username: string;
  use_tls: boolean;
  use_ssl: boolean;
  from_email: string;
  from_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CloudStorageConnection {
  id: number;
  integration_id: number;
  provider: 'aws_s3' | 'google_drive' | 'onedrive' | 'dropbox';
  bucket_name?: string;
  region?: string;
  access_key_id?: string;
  folder_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackTeamsConnection {
  id: number;
  integration_id: number;
  platform: 'slack' | 'teams';
  workspace_id?: string;
  team_id?: string;
  bot_token?: string;
  webhook_url?: string;
  default_channel?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpoint {
  id: number;
  integration_id: number;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  events: string[];
  is_active: boolean;
  secret_key?: string;
  retry_count: number;
  timeout: number;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: number;
  integration_id: number;
  sync_type: string;
  status: 'success' | 'failed' | 'in_progress';
  records_processed: number;
  records_successful: number;
  records_failed: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
}

export interface EmailSendRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html_body?: string;
  attachments?: string[];
}

export interface NotificationSendRequest {
  platform: 'slack' | 'teams';
  channel?: string;
  message: string;
  attachments?: any[];
}

export interface SyncRequest {
  sync_type: string;
  filters?: Record<string, any>;
  options?: Record<string, any>;
}

class IntegrationService {
  // Integration CRUD operations
  async getIntegrations(): Promise<Integration[]> {
    const response = await api.get('/integrations/');
    return response.data;
  }

  async getIntegration(id: number): Promise<Integration> {
    const response = await api.get(`/integrations/${id}`);
    return response.data;
  }

  async createIntegration(data: IntegrationCreate): Promise<Integration> {
    const response = await api.post('/integrations/', data);
    return response.data;
  }

  async updateIntegration(id: number, data: IntegrationUpdate): Promise<Integration> {
    const response = await api.put(`/integrations/${id}`, data);
    return response.data;
  }

  async deleteIntegration(id: number): Promise<void> {
    await api.delete(`/integrations/${id}`);
  }

  // Connection testing
  async testConnection(data: TestConnectionRequest): Promise<TestConnectionResponse> {
    const response = await api.post('/integrations/test-connection', data);
    return response.data;
  }

  // SAP Integration
  async getSAPConnections(): Promise<SAPConnection[]> {
    const response = await api.get('/integrations/sap/connections');
    return response.data;
  }

  async createSAPConnection(data: any): Promise<SAPConnection> {
    const response = await api.post('/integrations/sap/connections', data);
    return response.data;
  }

  async updateSAPConnection(id: number, data: any): Promise<SAPConnection> {
    const response = await api.put(`/integrations/sap/connections/${id}`, data);
    return response.data;
  }

  async deleteSAPConnection(id: number): Promise<void> {
    await api.delete(`/integrations/sap/connections/${id}`);
  }

  async testSAPConnection(id: number): Promise<TestConnectionResponse> {
    const response = await api.post(`/integrations/sap/connections/${id}/test`);
    return response.data;
  }

  // Email Integration
  async getEmailConfigurations(): Promise<EmailConfiguration[]> {
    const response = await api.get('/integrations/email/configurations');
    return response.data;
  }

  async createEmailConfiguration(data: any): Promise<EmailConfiguration> {
    const response = await api.post('/integrations/email/configurations', data);
    return response.data;
  }

  async updateEmailConfiguration(id: number, data: any): Promise<EmailConfiguration> {
    const response = await api.put(`/integrations/email/configurations/${id}`, data);
    return response.data;
  }

  async deleteEmailConfiguration(id: number): Promise<void> {
    await api.delete(`/integrations/email/configurations/${id}`);
  }

  async testEmailConfiguration(id: number): Promise<TestConnectionResponse> {
    const response = await api.post(`/integrations/email/configurations/${id}/test`);
    return response.data;
  }

  async sendEmail(integrationId: number, data: EmailSendRequest): Promise<void> {
    await api.post(`/integrations/${integrationId}/send-email`, data);
  }

  // Cloud Storage Integration
  async getCloudStorageConnections(): Promise<CloudStorageConnection[]> {
    const response = await api.get('/integrations/cloud-storage/connections');
    return response.data;
  }

  async createCloudStorageConnection(data: any): Promise<CloudStorageConnection> {
    const response = await api.post('/integrations/cloud-storage/connections', data);
    return response.data;
  }

  async updateCloudStorageConnection(id: number, data: any): Promise<CloudStorageConnection> {
    const response = await api.put(`/integrations/cloud-storage/connections/${id}`, data);
    return response.data;
  }

  async deleteCloudStorageConnection(id: number): Promise<void> {
    await api.delete(`/integrations/cloud-storage/connections/${id}`);
  }

  async testCloudStorageConnection(id: number): Promise<TestConnectionResponse> {
    const response = await api.post(`/integrations/cloud-storage/connections/${id}/test`);
    return response.data;
  }

  // Slack/Teams Integration
  async getSlackTeamsConnections(): Promise<SlackTeamsConnection[]> {
    const response = await api.get('/integrations/slack-teams/connections');
    return response.data;
  }

  async createSlackTeamsConnection(data: any): Promise<SlackTeamsConnection> {
    const response = await api.post('/integrations/slack-teams/connections', data);
    return response.data;
  }

  async updateSlackTeamsConnection(id: number, data: any): Promise<SlackTeamsConnection> {
    const response = await api.put(`/integrations/slack-teams/connections/${id}`, data);
    return response.data;
  }

  async deleteSlackTeamsConnection(id: number): Promise<void> {
    await api.delete(`/integrations/slack-teams/connections/${id}`);
  }

  async testSlackTeamsConnection(id: number): Promise<TestConnectionResponse> {
    const response = await api.post(`/integrations/slack-teams/connections/${id}/test`);
    return response.data;
  }

  async sendNotification(integrationId: number, data: NotificationSendRequest): Promise<void> {
    await api.post(`/integrations/${integrationId}/send-notification`, data);
  }

  // Webhook Management
  async getWebhookEndpoints(): Promise<WebhookEndpoint[]> {
    const response = await api.get('/integrations/webhooks');
    return response.data;
  }

  async createWebhookEndpoint(data: any): Promise<WebhookEndpoint> {
    const response = await api.post('/integrations/webhooks', data);
    return response.data;
  }

  async updateWebhookEndpoint(id: number, data: any): Promise<WebhookEndpoint> {
    const response = await api.put(`/integrations/webhooks/${id}`, data);
    return response.data;
  }

  async deleteWebhookEndpoint(id: number): Promise<void> {
    await api.delete(`/integrations/webhooks/${id}`);
  }

  async testWebhookEndpoint(id: number): Promise<TestConnectionResponse> {
    const response = await api.post(`/integrations/webhooks/${id}/test`);
    return response.data;
  }

  // Sync Management
  async getSyncLogs(integrationId?: number, limit?: number): Promise<SyncLog[]> {
    const params = new URLSearchParams();
    if (integrationId) params.append('integration_id', integrationId.toString());
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get(`/integrations/sync-logs?${params.toString()}`);
    return response.data;
  }

  async triggerSync(integrationId: number, data: SyncRequest): Promise<void> {
    await api.post(`/integrations/${integrationId}/sync`, data);
  }

  async getSyncStatus(integrationId: number): Promise<any> {
    const response = await api.get(`/integrations/${integrationId}/sync-status`);
    return response.data;
  }

  // Integration Statistics
  async getIntegrationStats(): Promise<any> {
    const response = await api.get('/integrations/stats');
    return response.data;
  }

  async getIntegrationHealth(): Promise<any> {
    const response = await api.get('/integrations/health');
    return response.data;
  }
}

export const integrationService = new IntegrationService();