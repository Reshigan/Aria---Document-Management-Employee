/**
 * ARIA v2.0 - Authenticated API Client
 * Complete API client with JWT authentication and agent/ERP integration
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';

// Types
export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  required_fields?: string[];
}

export interface BotExecutionRequest {
  bot_id: string;
  data: Record<string, any>;
}

export interface BotExecutionResult {
  success: boolean;
  execution_id: number;
  bot_id: string;
  bot_name: string;
  result: any;
  execution_time_ms: number;
  timestamp: string;
}

export interface BotExecution {
  id: number;
  bot_id: string;
  bot_name: string;
  input_data: string;
  output_data: string;
  status: string;
  execution_time_ms: number;
  created_at: string;
  error_message?: string;
}

export interface BotStatistics {
  total_executions: number;
  unique_bots: number;
  avg_execution_time: number;
  successful: number;
  failed: number;
}

export interface BOM {
  id?: number;
  product_name: string;
  product_code: string;
  version: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    cost?: number;
  }>;
  total_cost?: number;
  status?: string;
  created_at?: string;
}

export interface WorkOrder {
  id?: number;
  order_number: string;
  product_name: string;
  quantity: number;
  bom_id?: number;
  status?: string;
  priority?: string;
  start_date?: string;
  due_date?: string;
  assigned_to?: number;
  notes?: string;
  created_at?: string;
}

export interface QualityInspection {
  id?: number;
  inspection_number: string;
  product_name: string;
  inspection_type: string;
  batch_number?: string;
  inspector_id?: number;
  inspection_date?: string;
  status?: string;
  result?: string;
  defects_found?: number;
  notes?: string;
  created_at?: string;
}

class APIClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = authService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await authService.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout
            authService.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // AGENT ENDPOINTS
  // ============================================

  /**
   * Get all available agents
   */
  async getBots(): Promise<Agent[]> {
    const response = await this.api.get<{ agents: Agent[]; total: number }>('/agents');
    return response.data.agents;
  }

  /**
   * Execute a agent
   */
  async executeBot(request: BotExecutionRequest): Promise<BotExecutionResult> {
    const response = await this.api.post<BotExecutionResult>('/agents/execute', request);
    return response.data;
  }

  /**
   * Get agent execution history
   */
  async getBotHistory(limit: number = 50): Promise<{ executions: BotExecution[]; statistics: BotStatistics }> {
    const response = await this.api.get<{ executions: BotExecution[]; statistics: BotStatistics }>(`/agents/history?limit=${limit}`);
    return response.data;
  }

  // ============================================
  // MANUFACTURING ERP ENDPOINTS
  // ============================================

  /**
   * Create Bill of Materials
   */
  async createBOM(bom: BOM): Promise<{ success: boolean; bom_id: number }> {
    const response = await this.api.post<{ success: boolean; bom_id: number }>('/erp/manufacturing/bom', bom);
    return response.data;
  }

  /**
   * Get all BOMs
   */
  async getBOMs(): Promise<BOM[]> {
    const response = await this.api.get<{ boms: BOM[]; total: number }>('/erp/manufacturing/bom');
    return response.data.boms;
  }

  /**
   * Create work order
   */
  async createWorkOrder(workOrder: WorkOrder): Promise<{ success: boolean; work_order_id: number }> {
    const response = await this.api.post<{ success: boolean; work_order_id: number }>('/erp/manufacturing/work-orders', workOrder);
    return response.data;
  }

  /**
   * Get all work orders
   */
  async getWorkOrders(): Promise<WorkOrder[]> {
    const response = await this.api.get<{ work_orders: WorkOrder[]; total: number }>('/erp/manufacturing/work-orders');
    return response.data.work_orders;
  }

  // ============================================
  // QUALITY ERP ENDPOINTS
  // ============================================

  /**
   * Create quality inspection
   */
  async createInspection(inspection: QualityInspection): Promise<{ success: boolean; inspection_id: number }> {
    const response = await this.api.post<{ success: boolean; inspection_id: number }>('/erp/quality/inspections', inspection);
    return response.data;
  }

  /**
   * Get all quality inspections
   */
  async getInspections(): Promise<QualityInspection[]> {
    const response = await this.api.get<{ inspections: QualityInspection[]; total: number }>('/erp/quality/inspections');
    return response.data.inspections;
  }

  // ============================================
  // GENERIC METHODS
  // ============================================

  /**
   * Generic GET request
   */
  async get<T = any>(url: string): Promise<T> {
    const response = await this.api.get<T>(url);
    return response.data;
  }

  /**
   * Generic POST request
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(url, data);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(url, data);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(url: string): Promise<T> {
    const response = await this.api.delete<T>(url);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;
