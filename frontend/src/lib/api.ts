import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { User, TokenResponse, Document, DocumentListResponse, UploadResponse, ExtractedData, DashboardStats } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }
}

const apiClient = new APIClient();

export const authAPI = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    return apiClient.post<TokenResponse>('/api/auth/login', {
      username: email,
      password: password,
    });
  },

  register: async (email: string, password: string, full_name: string): Promise<User> => {
    return apiClient.post<User>('/api/auth/register', {
      email,
      username: email,
      password,
      full_name,
    });
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient.get<User>('/api/auth/me');
  },

  logout: async (): Promise<void> => {
    return apiClient.post('/api/auth/logout');
  },
};

export const documentsAPI = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    document_type?: string;
    status?: string;
    search?: string;
  }): Promise<DocumentListResponse> => {
    return apiClient.get<DocumentListResponse>('/api/documents/', { params });
  },

  get: async (id: number): Promise<Document> => {
    return apiClient.get<Document>(`/api/documents/${id}`);
  },

  upload: async (file: File, documentType?: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) {
      formData.append('document_type', documentType);
    }

    return apiClient.post<UploadResponse>('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/documents/${id}`);
  },

  updateStatus: async (id: number, status: string): Promise<Document> => {
    return apiClient.patch<Document>(`/api/documents/${id}/status`, { status });
  },

  getExtractedData: async (id: number): Promise<ExtractedData> => {
    return apiClient.get<ExtractedData>(`/api/documents/${id}/extracted-data`);
  },

  reprocess: async (id: number): Promise<Document> => {
    return apiClient.post<Document>(`/api/documents/${id}/reprocess`);
  },

  download: async (id: number): Promise<Blob> => {
    const response = await axios.get(`${API_BASE_URL}/api/documents/${id}/download`, {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
      },
    });
    return response.data;
  },
};

export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    return apiClient.get<DashboardStats>('/api/dashboard/stats');
  },

  getRecentDocuments: async (limit: number = 10): Promise<Document[]> => {
    return apiClient.get<Document[]>('/api/dashboard/recent', { params: { limit } });
  },
};

export const adminAPI = {
  getUsers: async (): Promise<User[]> => {
    return apiClient.get<User[]>('/api/admin/users');
  },

  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    return apiClient.put<User>(`/api/admin/users/${id}`, data);
  },

  deleteUser: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/admin/users/${id}`);
  },

  getSystemStats: async (): Promise<any> => {
    return apiClient.get('/api/admin/stats');
  },
};

export const chatAPI = {
  sendMessage: async (message: string, documentId?: number): Promise<any> => {
    return apiClient.post('/api/chat/message', {
      message,
      document_id: documentId,
    });
  },

  getHistory: async (limit: number = 50): Promise<any[]> => {
    return apiClient.get('/api/chat/history', { params: { limit } });
  },
};

export default apiClient;
