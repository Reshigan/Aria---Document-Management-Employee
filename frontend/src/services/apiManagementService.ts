import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types and Interfaces
export interface APIKey {
  id: number;
  name: string;
  key_prefix: string;
  description?: string;
  user_id: number;
  scopes: string[];
  rate_limit_requests: number;
  rate_limit_window: number;
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
}

export interface APIKeyWithSecret extends APIKey {
  api_key: string;
}

export interface APIKeyCreate {
  name: string;
  description?: string;
  user_id: number;
  scopes: string[];
  rate_limit_requests?: number;
  rate_limit_window?: number;
  expires_at?: string;
}

export interface APIKeyUpdate {
  name?: string;
  description?: string;
  scopes?: string[];
  rate_limit_requests?: number;
  rate_limit_window?: number;
  is_active?: boolean;
  expires_at?: string;
}

export interface APIUsageLog {
  id: number;
  api_key_id: number;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  ip_address: string;
  user_agent?: string;
  request_size: number;
  response_size: number;
  error_message?: string;
  error_type?: string;
  timestamp: string;
}

export interface APIEndpoint {
  id: number;
  path: string;
  method: string;
  name: string;
  description?: string;
  is_active: boolean;
  requires_auth: boolean;
  required_scopes: string[];
  custom_rate_limit?: number;
  custom_rate_window?: number;
  is_monitored: boolean;
  alert_on_errors: boolean;
  error_threshold: number;
  request_schema?: any;
  response_schema?: any;
  examples?: any;
  created_at: string;
  updated_at: string;
  created_by: number;
}

export interface APIEndpointCreate {
  path: string;
  method: string;
  name: string;
  description?: string;
  is_active?: boolean;
  requires_auth?: boolean;
  required_scopes?: string[];
  custom_rate_limit?: number;
  custom_rate_window?: number;
  is_monitored?: boolean;
  alert_on_errors?: boolean;
  error_threshold?: number;
  request_schema?: any;
  response_schema?: any;
  examples?: any;
  created_by: number;
}

export interface APIEndpointUpdate {
  path?: string;
  method?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
  requires_auth?: boolean;
  required_scopes?: string[];
  custom_rate_limit?: number;
  custom_rate_window?: number;
  is_monitored?: boolean;
  alert_on_errors?: boolean;
  error_threshold?: number;
  request_schema?: any;
  response_schema?: any;
  examples?: any;
}

export interface RateLimitStatus {
  api_key_id: number;
  current_window_start: string;
  current_window_end: string;
  requests_in_window: number;
  limit: number;
  remaining: number;
  reset_time: string;
  is_exceeded: boolean;
}

export interface APIUsageAnalytics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  error_rate: number;
  avg_response_time: number;
  p95_response_time: number;
  total_data_transfer: number;
  unique_api_keys: number;
  top_endpoints: Array<{
    endpoint: string;
    request_count: number;
    avg_response_time: number;
  }>;
  hourly_usage: Array<{
    hour: number;
    request_count: number;
  }>;
  daily_usage: Array<{
    date: string;
    request_count: number;
  }>;
}

export interface APIHealthStatus {
  total_endpoints: number;
  active_endpoints: number;
  monitored_endpoints: number;
  endpoints_with_errors: number;
  avg_response_time: number;
  error_rate: number;
  total_api_keys: number;
  active_api_keys: number;
  rate_limited_keys: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// API Management Service
class APIManagementService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/api-management`;
  }

  // API Key Management
  async createAPIKey(data: APIKeyCreate): Promise<APIKeyWithSecret> {
    const response = await axios.post(`${this.baseURL}/api-keys`, data);
    return response.data;
  }

  async getAPIKeys(params?: {
    user_id?: number;
    is_active?: boolean;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<APIKey>> {
    const response = await axios.get(`${this.baseURL}/api-keys`, { params });
    return response.data;
  }

  async getAPIKey(id: number): Promise<APIKey> {
    const response = await axios.get(`${this.baseURL}/api-keys/${id}`);
    return response.data;
  }

  async updateAPIKey(id: number, data: APIKeyUpdate): Promise<APIKey> {
    const response = await axios.put(`${this.baseURL}/api-keys/${id}`, data);
    return response.data;
  }

  async deleteAPIKey(id: number): Promise<void> {
    await axios.delete(`${this.baseURL}/api-keys/${id}`);
  }

  async getRateLimitStatus(apiKeyId: number): Promise<RateLimitStatus> {
    const response = await axios.get(`${this.baseURL}/api-keys/${apiKeyId}/rate-limit`);
    return response.data;
  }

  // Usage Logging
  async getUsageLogs(params?: {
    api_key_id?: number;
    endpoint?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<APIUsageLog>> {
    const response = await axios.get(`${this.baseURL}/usage-logs`, { params });
    return response.data;
  }

  // API Endpoint Management
  async createAPIEndpoint(data: APIEndpointCreate): Promise<APIEndpoint> {
    const response = await axios.post(`${this.baseURL}/endpoints`, data);
    return response.data;
  }

  async getAPIEndpoints(params?: {
    is_active?: boolean;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<APIEndpoint>> {
    const response = await axios.get(`${this.baseURL}/endpoints`, { params });
    return response.data;
  }

  async getAPIEndpoint(id: number): Promise<APIEndpoint> {
    const response = await axios.get(`${this.baseURL}/endpoints/${id}`);
    return response.data;
  }

  async updateAPIEndpoint(id: number, data: APIEndpointUpdate): Promise<APIEndpoint> {
    const response = await axios.put(`${this.baseURL}/endpoints/${id}`, data);
    return response.data;
  }

  async deleteAPIEndpoint(id: number): Promise<void> {
    await axios.delete(`${this.baseURL}/endpoints/${id}`);
  }

  // Analytics and Monitoring
  async getAPIAnalytics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<APIUsageAnalytics> {
    const response = await axios.get(`${this.baseURL}/analytics`, { params });
    return response.data;
  }

  async getAPIHealth(): Promise<APIHealthStatus> {
    const response = await axios.get(`${this.baseURL}/health`);
    return response.data;
  }

  async getStatisticsSummary(): Promise<{
    health: APIHealthStatus;
    recent_analytics: APIUsageAnalytics;
    period: {
      start_date: string;
      end_date: string;
      days: number;
    };
  }> {
    const response = await axios.get(`${this.baseURL}/statistics/summary`);
    return response.data;
  }

  // Utility Methods
  formatDataSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000 * 10) / 10}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000 * 10) / 10}h`;
  }

  getStatusColor(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600';
    if (statusCode >= 300 && statusCode < 400) return 'text-blue-600';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600';
    if (statusCode >= 500) return 'text-red-600';
    return 'text-gray-600';
  }

  getMethodColor(method: string): string {
    switch (method.toLowerCase()) {
      case 'get': return 'text-green-600 bg-green-50';
      case 'post': return 'text-blue-600 bg-blue-50';
      case 'put': return 'text-yellow-600 bg-yellow-50';
      case 'delete': return 'text-red-600 bg-red-50';
      case 'patch': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  calculateErrorRate(successful: number, total: number): number {
    if (total === 0) return 0;
    return ((total - successful) / total) * 100;
  }

  generateAPIKeyName(): string {
    const adjectives = ['Fast', 'Secure', 'Smart', 'Quick', 'Reliable', 'Efficient'];
    const nouns = ['API', 'Key', 'Access', 'Token', 'Client', 'Service'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${adjective} ${noun} ${number}`;
  }

  getAvailableScopes(): Array<{ value: string; label: string; description: string }> {
    return [
      {
        value: 'documents:read',
        label: 'Documents Read',
        description: 'Read access to documents'
      },
      {
        value: 'documents:write',
        label: 'Documents Write',
        description: 'Create and update documents'
      },
      {
        value: 'documents:delete',
        label: 'Documents Delete',
        description: 'Delete documents'
      },
      {
        value: 'users:read',
        label: 'Users Read',
        description: 'Read user information'
      },
      {
        value: 'users:write',
        label: 'Users Write',
        description: 'Create and update users'
      },
      {
        value: 'analytics:read',
        label: 'Analytics Read',
        description: 'Access analytics data'
      },
      {
        value: 'admin:read',
        label: 'Admin Read',
        description: 'Administrative read access'
      },
      {
        value: 'admin:write',
        label: 'Admin Write',
        description: 'Administrative write access'
      }
    ];
  }

  getHTTPMethods(): string[] {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  }

  validateAPIKeyName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'API key name is required';
    }
    if (name.length < 3) {
      return 'API key name must be at least 3 characters';
    }
    if (name.length > 255) {
      return 'API key name must be less than 255 characters';
    }
    return null;
  }

  validateEndpointPath(path: string): string | null {
    if (!path || path.trim().length === 0) {
      return 'Endpoint path is required';
    }
    if (!path.startsWith('/')) {
      return 'Endpoint path must start with /';
    }
    if (path.length > 500) {
      return 'Endpoint path must be less than 500 characters';
    }
    return null;
  }

  validateRateLimit(requests: number, window: number): string | null {
    if (requests < 1) {
      return 'Rate limit requests must be at least 1';
    }
    if (window < 60) {
      return 'Rate limit window must be at least 60 seconds';
    }
    return null;
  }
}

export const apiManagementService = new APIManagementService();
export default apiManagementService;