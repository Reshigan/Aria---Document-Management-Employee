import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { User, TokenResponse, Document, DocumentListResponse, UploadResponse, ExtractedData, DashboardStats } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:12001';

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
    return apiClient.post<TokenResponse>('/api/v1/auth/login', {
      username: email,
      password: password,
    });
  },

  register: async (email: string, password: string, full_name: string): Promise<User> => {
    return apiClient.post<User>('/api/v1/auth/register', {
      email,
      username: email,
      password,
      full_name,
    });
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient.get<User>('/api/v1/auth/me');
  },

  logout: async (): Promise<void> => {
    return apiClient.post('/api/v1/auth/logout');
  },

  forgotPassword: async (email: string): Promise<void> => {
    return apiClient.post('/api/v1/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    return apiClient.post('/api/v1/auth/reset-password', { token, password });
  },

  refreshToken: async (): Promise<TokenResponse> => {
    return apiClient.post<TokenResponse>('/api/v1/auth/refresh');
  },
};

export const documentsAPI = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    folder_id?: number;
    document_type?: string;
    status?: string;
    search?: string;
    tags?: string[];
  }): Promise<DocumentListResponse> => {
    return apiClient.get<DocumentListResponse>('/api/v1/documents/', { params });
  },

  get: async (id: number): Promise<Document> => {
    return apiClient.get<Document>(`/api/v1/documents/${id}`);
  },

  upload: async (file: File, folderId?: number, documentType?: string, tags?: string[]): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId.toString());
    }
    if (documentType) {
      formData.append('document_type', documentType);
    }
    if (tags && tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }

    return apiClient.post<UploadResponse>('/api/v1/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  update: async (id: number, data: Partial<Document>): Promise<Document> => {
    return apiClient.put<Document>(`/api/v1/documents/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/documents/${id}`);
  },

  updateStatus: async (id: number, status: string): Promise<Document> => {
    return apiClient.patch<Document>(`/api/v1/documents/${id}/status`, { status });
  },

  getExtractedData: async (id: number): Promise<ExtractedData> => {
    return apiClient.get<ExtractedData>(`/api/v1/documents/${id}/extracted-data`);
  },

  reprocess: async (id: number): Promise<Document> => {
    return apiClient.post<Document>(`/api/v1/documents/${id}/reprocess`);
  },

  download: async (id: number): Promise<Blob> => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/documents/${id}/download`, {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
      },
    });
    return response.data;
  },

  addToFavorites: async (id: number): Promise<void> => {
    return apiClient.post(`/api/v1/documents/${id}/favorite`);
  },

  removeFromFavorites: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/documents/${id}/favorite`);
  },

  getVersions: async (id: number): Promise<any[]> => {
    return apiClient.get(`/api/v1/documents/${id}/versions`);
  },

  createVersion: async (id: number, file: File, comment?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (comment) {
      formData.append('comment', comment);
    }
    return apiClient.post(`/api/v1/documents/${id}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Folders API
export const foldersAPI = {
  list: async (parentId?: number): Promise<any[]> => {
    return apiClient.get('/api/v1/folders/', { params: { parent_id: parentId } });
  },

  get: async (id: number): Promise<any> => {
    return apiClient.get(`/api/v1/folders/${id}`);
  },

  create: async (data: { name: string; parent_id?: number; description?: string }): Promise<any> => {
    return apiClient.post('/api/v1/folders/', data);
  },

  update: async (id: number, data: Partial<any>): Promise<any> => {
    return apiClient.put(`/api/v1/folders/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/folders/${id}`);
  },

  getTree: async (): Promise<any[]> => {
    return apiClient.get('/api/v1/folders/tree');
  },

  move: async (id: number, newParentId?: number): Promise<any> => {
    return apiClient.post(`/api/v1/folders/${id}/move`, { new_parent_id: newParentId });
  },
};

// Tags API
export const tagsAPI = {
  list: async (): Promise<any[]> => {
    return apiClient.get('/api/v1/tags/');
  },

  create: async (data: { name: string; color?: string; description?: string }): Promise<any> => {
    return apiClient.post('/api/v1/tags/', data);
  },

  update: async (id: number, data: Partial<any>): Promise<any> => {
    return apiClient.put(`/api/v1/tags/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/tags/${id}`);
  },

  getPopular: async (limit: number = 10): Promise<any[]> => {
    return apiClient.get('/api/v1/tags/popular', { params: { limit } });
  },
};

// Search API
export const searchAPI = {
  search: async (params: {
    query?: string;
    document_type?: string;
    folder_id?: number;
    tags?: string[];
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<any> => {
    return apiClient.get('/api/v1/search/', { params });
  },

  saveSearch: async (data: { name: string; query: string; filters: any }): Promise<any> => {
    return apiClient.post('/api/v1/search/saved', data);
  },

  getSavedSearches: async (): Promise<any[]> => {
    return apiClient.get('/api/v1/search/saved');
  },

  getSearchHistory: async (limit: number = 10): Promise<any[]> => {
    return apiClient.get('/api/v1/search/history', { params: { limit } });
  },
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    return apiClient.get<DashboardStats>('/api/v1/analytics/dashboard');
  },

  getDocumentStats: async (period: string = '30d'): Promise<any> => {
    return apiClient.get('/api/v1/analytics/documents', { params: { period } });
  },

  getUserActivity: async (period: string = '30d'): Promise<any> => {
    return apiClient.get('/api/v1/analytics/users', { params: { period } });
  },

  getSystemHealth: async (): Promise<any> => {
    return apiClient.get('/api/v1/analytics/system');
  },

  getWorkflowStats: async (period: string = '30d'): Promise<any> => {
    return apiClient.get('/api/v1/analytics/workflows', { params: { period } });
  },
};

// Workflows API
export const workflowsAPI = {
  list: async (params?: { status?: string; document_id?: number }): Promise<any[]> => {
    return apiClient.get('/api/v1/workflows/', { params });
  },

  get: async (id: number): Promise<any> => {
    return apiClient.get(`/api/v1/workflows/${id}`);
  },

  create: async (data: any): Promise<any> => {
    return apiClient.post('/api/v1/workflows/', data);
  },

  update: async (id: number, data: Partial<any>): Promise<any> => {
    return apiClient.put(`/api/v1/workflows/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/workflows/${id}`);
  },

  start: async (id: number): Promise<any> => {
    return apiClient.post(`/api/v1/workflows/${id}/start`);
  },

  getTemplates: async (): Promise<any[]> => {
    return apiClient.get('/api/v1/workflows/templates');
  },

  createTemplate: async (data: any): Promise<any> => {
    return apiClient.post('/api/v1/workflows/templates', data);
  },
};

// Notifications API
export const notificationsAPI = {
  list: async (params?: { is_read?: boolean; page?: number; page_size?: number }): Promise<any> => {
    return apiClient.get('/api/v1/notifications/', { params });
  },

  markAsRead: async (id: number): Promise<void> => {
    return apiClient.patch(`/api/v1/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    return apiClient.post('/api/v1/notifications/mark-all-read');
  },

  getPreferences: async (): Promise<any> => {
    return apiClient.get('/api/v1/notifications/preferences');
  },

  updatePreferences: async (data: any): Promise<any> => {
    return apiClient.put('/api/v1/notifications/preferences', data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/notifications/${id}`);
  },
};

// Sharing API
export const sharingAPI = {
  shareDocument: async (documentId: number, data: { user_id: number; permission: string }): Promise<any> => {
    return apiClient.post(`/api/v1/sharing/documents/${documentId}/share`, data);
  },

  createShareLink: async (documentId: number, data: any): Promise<any> => {
    return apiClient.post(`/api/v1/sharing/documents/${documentId}/links`, data);
  },

  getShareLinks: async (documentId: number): Promise<any[]> => {
    return apiClient.get(`/api/v1/sharing/documents/${documentId}/links`);
  },

  updateShareLink: async (linkId: number, data: any): Promise<any> => {
    return apiClient.put(`/api/v1/sharing/links/${linkId}`, data);
  },

  deleteShareLink: async (linkId: number): Promise<void> => {
    return apiClient.delete(`/api/v1/sharing/links/${linkId}`);
  },

  getSharedDocuments: async (): Promise<any[]> => {
    return apiClient.get('/api/v1/sharing/shared-with-me');
  },
};

// Users API
export const usersAPI = {
  list: async (params?: { page?: number; page_size?: number; search?: string }): Promise<any> => {
    return apiClient.get('/api/v1/users/', { params });
  },

  get: async (id: number): Promise<User> => {
    return apiClient.get<User>(`/api/v1/users/${id}`);
  },

  update: async (id: number, data: Partial<User>): Promise<User> => {
    return apiClient.put<User>(`/api/v1/users/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/users/${id}`);
  },

  updateProfile: async (data: any): Promise<User> => {
    return apiClient.put<User>('/api/v1/users/profile', data);
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<void> => {
    return apiClient.post('/api/v1/users/change-password', data);
  },

  getActivity: async (limit: number = 50): Promise<any[]> => {
    return apiClient.get('/api/v1/users/activity', { params: { limit } });
  },
};

// Legacy APIs for backward compatibility
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    return analyticsAPI.getDashboardStats();
  },

  getRecentDocuments: async (limit: number = 10): Promise<Document[]> => {
    const response = await documentsAPI.list({ page_size: limit });
    return response.items || [];
  },
};

export const adminAPI = {
  getUsers: async (): Promise<User[]> => {
    const response = await usersAPI.list();
    return response.items || [];
  },

  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    return usersAPI.update(id, data);
  },

  deleteUser: async (id: number): Promise<void> => {
    return usersAPI.delete(id);
  },

  getSystemStats: async (): Promise<any> => {
    return analyticsAPI.getSystemHealth();
  },
};

export default apiClient;
