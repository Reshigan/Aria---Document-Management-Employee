import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { 
  User, TokenResponse, Document, DocumentListResponse, UploadResponse, ExtractedData, DashboardStats,
  DocumentShare, DocumentShareCreate, ShareLinkCreate, ShareLinkResponse, SharedDocumentsResponse,
  Comment, CommentCreate, CommentUpdate, EnhancedTag, TagCreate, TagUpdate, TagBulkOperation, 
  TagSearchFilters, TagAnalytics, AutoTagRule, TagSuggestion, TagTemplate
} from '@/types';

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

// Export the api client for direct use
export const api = apiClient;

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
  list: async (parentId?: number, page?: number, pageSize?: number, search?: string): Promise<any> => {
    const params: any = {};
    if (parentId !== undefined) params.parent_id = parentId;
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;
    if (search) params.search = search;
    return apiClient.get('/api/v1/folders/', { params });
  },

  get: async (id: number): Promise<any> => {
    return apiClient.get(`/api/v1/folders/${id}`);
  },

  create: async (data: { 
    name: string; 
    parent_id?: number; 
    description?: string;
    color?: string;
    is_public?: boolean;
  }): Promise<any> => {
    return apiClient.post('/api/v1/folders/', data);
  },

  update: async (id: number, data: Partial<any>): Promise<any> => {
    return apiClient.put(`/api/v1/folders/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/folders/${id}`);
  },

  getTree: async (): Promise<any> => {
    return apiClient.get('/api/v1/folders/tree');
  },

  move: async (id: number, newParentId?: number): Promise<any> => {
    return apiClient.post(`/api/v1/folders/${id}/move`, { new_parent_id: newParentId });
  },

  // Bulk operations
  bulkOperations: async (operation: string, folderIds: number[], targetFolderId?: number): Promise<any> => {
    return apiClient.post('/api/v1/folders/bulk-operations', {
      operation,
      folder_ids: folderIds,
      target_folder_id: targetFolderId
    });
  },

  // Get folder statistics
  getStatistics: async (id: number, includeSubfolders: boolean = true): Promise<any> => {
    return apiClient.get(`/api/v1/folders/${id}/statistics`, {
      params: { include_subfolders: includeSubfolders }
    });
  },

  // Duplicate folder
  duplicate: async (id: number, targetParentId?: number, newName?: string, includeDocuments: boolean = true): Promise<any> => {
    return apiClient.post(`/api/v1/folders/${id}/duplicate`, {
      target_parent_id: targetParentId,
      new_name: newName,
      include_documents: includeDocuments
    });
  },

  // Folder permissions
  getPermissions: async (id: number): Promise<any> => {
    return apiClient.get(`/api/v1/folders/${id}/permissions`);
  },

  setPermissions: async (id: number, userId: number, permissions: {
    can_read?: boolean;
    can_write?: boolean;
    can_delete?: boolean;
    can_share?: boolean;
  }): Promise<any> => {
    return apiClient.post(`/api/v1/folders/${id}/permissions/${userId}`, permissions);
  },

  removePermissions: async (id: number, userId: number): Promise<any> => {
    return apiClient.delete(`/api/v1/folders/${id}/permissions/${userId}`);
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
  search: async (searchRequest: {
    query: string;
    document_type?: string;
    folder_id?: number;
    tags?: string[];
    date_from?: string;
    date_to?: string;
    file_size_min?: number;
    file_size_max?: number;
    uploaded_by?: number;
    include_content?: boolean;
    include_metadata?: boolean;
  }, page: number = 1, page_size: number = 20): Promise<any> => {
    return apiClient.post(`/search/?page=${page}&page_size=${page_size}`, searchRequest);
  },

  getSuggestions: async (query: string, limit: number = 10): Promise<any> => {
    return apiClient.get('/search/suggestions', { params: { q: query, limit } });
  },

  getHistory: async (page: number = 1, page_size: number = 20): Promise<any> => {
    return apiClient.get('/search/history', { params: { page, page_size } });
  },

  deleteHistoryItem: async (searchId: number): Promise<any> => {
    return apiClient.delete(`/search/history/${searchId}`);
  },

  clearHistory: async (): Promise<any> => {
    return apiClient.delete('/search/history');
  },

  getAnalytics: async (days: number = 30): Promise<any> => {
    return apiClient.get('/search/analytics', { params: { days } });
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

export const sharingAPI = {
  // Document sharing with users
  shareDocument: async (documentId: number, shareData: DocumentShareCreate): Promise<DocumentShare> => {
    return apiClient.post(`/api/v1/sharing/documents/${documentId}/share`, shareData);
  },

  getDocumentShares: async (documentId: number): Promise<DocumentShare[]> => {
    return apiClient.get(`/api/v1/sharing/documents/${documentId}/shares`);
  },

  revokeDocumentShare: async (documentId: number, shareId: number): Promise<void> => {
    return apiClient.delete(`/api/v1/sharing/documents/${documentId}/shares/${shareId}`);
  },

  getSharedWithMe: async (page: number = 1, pageSize: number = 20): Promise<SharedDocumentsResponse> => {
    return apiClient.get('/api/v1/sharing/shared-with-me', { 
      params: { page, page_size: pageSize } 
    });
  },

  // Share links
  createShareLink: async (documentId: number, linkData: ShareLinkCreate): Promise<ShareLinkResponse> => {
    return apiClient.post(`/api/v1/sharing/documents/${documentId}/share-links`, linkData);
  },

  getShareLinks: async (documentId: number): Promise<ShareLinkResponse[]> => {
    return apiClient.get(`/api/v1/sharing/documents/${documentId}/share-links`);
  },

  updateShareLink: async (linkId: number, linkData: Partial<ShareLinkCreate>): Promise<ShareLinkResponse> => {
    return apiClient.put(`/api/v1/sharing/share-links/${linkId}`, linkData);
  },

  deleteShareLink: async (linkId: number): Promise<void> => {
    return apiClient.delete(`/api/v1/sharing/share-links/${linkId}`);
  },

  accessSharedDocument: async (token: string, password?: string): Promise<any> => {
    return apiClient.get(`/api/v1/sharing/links/${token}`, { 
      params: password ? { password } : {} 
    });
  },
};

export const commentsAPI = {
  // Document comments
  createComment: async (documentId: number, commentData: CommentCreate): Promise<Comment> => {
    return apiClient.post(`/api/v1/comments/documents/${documentId}/comments`, commentData);
  },

  getDocumentComments: async (
    documentId: number, 
    page: number = 1, 
    pageSize: number = 50,
    includeResolved: boolean = true
  ): Promise<Comment[]> => {
    return apiClient.get(`/api/v1/comments/documents/${documentId}/comments`, {
      params: { page, page_size: pageSize, include_resolved: includeResolved }
    });
  },

  updateComment: async (commentId: number, commentData: CommentUpdate): Promise<Comment> => {
    return apiClient.put(`/api/v1/comments/comments/${commentId}`, commentData);
  },

  deleteComment: async (commentId: number): Promise<void> => {
    return apiClient.delete(`/api/v1/comments/comments/${commentId}`);
  },

  resolveComment: async (commentId: number): Promise<void> => {
    return apiClient.post(`/api/v1/comments/comments/${commentId}/resolve`);
  },

  unresolveComment: async (commentId: number): Promise<void> => {
    return apiClient.post(`/api/v1/comments/comments/${commentId}/unresolve`);
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

// Enhanced Tags API
export const enhancedTagsAPI = {
  // Basic CRUD operations
  list: async (params?: { skip?: number; limit?: number; search?: string; filters?: any }): Promise<EnhancedTag[]> => {
    return apiClient.get('/api/v1/enhanced-tags/', { params });
  },

  get: async (id: number): Promise<EnhancedTag> => {
    return apiClient.get(`/api/v1/enhanced-tags/${id}`);
  },

  create: async (data: TagCreate): Promise<EnhancedTag> => {
    return apiClient.post('/api/v1/enhanced-tags/', data);
  },

  update: async (id: number, data: TagUpdate): Promise<EnhancedTag> => {
    return apiClient.put(`/api/v1/enhanced-tags/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/enhanced-tags/${id}`);
  },

  // Hierarchy operations
  getHierarchy: async (rootId?: number): Promise<EnhancedTag[]> => {
    const params = rootId ? { root_id: rootId } : {};
    return apiClient.get('/api/v1/enhanced-tags/hierarchy', { params });
  },

  moveTag: async (tagId: number, newParentId?: number): Promise<EnhancedTag> => {
    return apiClient.post(`/api/v1/enhanced-tags/${tagId}/move`, { parent_id: newParentId });
  },

  // Search and filtering
  search: async (query: string, filters?: TagSearchFilters): Promise<EnhancedTag[]> => {
    return apiClient.get('/api/v1/enhanced-tags/search', { 
      params: { q: query, ...filters } 
    });
  },

  // Analytics
  getAnalytics: async (tagId: number): Promise<TagAnalytics> => {
    return apiClient.get(`/api/v1/enhanced-tags/${tagId}/analytics`);
  },

  getUsageStats: async (period?: string): Promise<any> => {
    return apiClient.get('/api/v1/enhanced-tags/usage-stats', { 
      params: { period } 
    });
  },

  // Auto-tagging rules
  getRules: async (): Promise<AutoTagRule[]> => {
    return apiClient.get('/api/v1/enhanced-tags/auto-tag-rules');
  },

  createRule: async (data: Omit<AutoTagRule, 'id' | 'created_at' | 'updated_at'>): Promise<AutoTagRule> => {
    return apiClient.post('/api/v1/enhanced-tags/auto-tag-rules', data);
  },

  updateRule: async (id: number, data: Partial<AutoTagRule>): Promise<AutoTagRule> => {
    return apiClient.put(`/api/v1/enhanced-tags/auto-tag-rules/${id}`, data);
  },

  deleteRule: async (id: number): Promise<void> => {
    return apiClient.delete(`/api/v1/enhanced-tags/auto-tag-rules/${id}`);
  },

  testRule: async (ruleId: number, documentId: number): Promise<{ matches: boolean; confidence: number }> => {
    return apiClient.post(`/api/v1/enhanced-tags/auto-tag-rules/${ruleId}/test`, { document_id: documentId });
  },

  // Tag suggestions
  getSuggestions: async (documentId: number): Promise<TagSuggestion[]> => {
    return apiClient.get(`/api/v1/enhanced-tags/suggestions/${documentId}`);
  },

  acceptSuggestion: async (suggestionId: number): Promise<void> => {
    return apiClient.post(`/api/v1/enhanced-tags/suggestions/${suggestionId}/accept`);
  },

  rejectSuggestion: async (suggestionId: number): Promise<void> => {
    return apiClient.post(`/api/v1/enhanced-tags/suggestions/${suggestionId}/reject`);
  },

  // Templates
  getTemplates: async (): Promise<TagTemplate[]> => {
    return apiClient.get('/api/v1/enhanced-tags/templates');
  },

  createTemplate: async (data: Omit<TagTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<TagTemplate> => {
    return apiClient.post('/api/v1/enhanced-tags/templates', data);
  },

  applyTemplate: async (templateId: number, documentIds: number[]): Promise<void> => {
    return apiClient.post(`/api/v1/enhanced-tags/templates/${templateId}/apply`, { document_ids: documentIds });
  },

  // Bulk operations
  bulkOperation: async (operation: TagBulkOperation): Promise<any> => {
    return apiClient.post('/api/v1/enhanced-tags/bulk', operation);
  },

  // Document tagging
  tagDocument: async (documentId: number, tagIds: number[]): Promise<void> => {
    return apiClient.post(`/api/v1/enhanced-tags/documents/${documentId}/tags`, { tag_ids: tagIds });
  },

  untagDocument: async (documentId: number, tagIds: number[]): Promise<void> => {
    return apiClient.delete(`/api/v1/enhanced-tags/documents/${documentId}/tags`, { data: { tag_ids: tagIds } });
  },

  getDocumentTags: async (documentId: number): Promise<EnhancedTag[]> => {
    return apiClient.get(`/api/v1/enhanced-tags/documents/${documentId}/tags`);
  },

  // Import/Export
  exportTags: async (format: 'json' | 'csv' = 'json'): Promise<Blob> => {
    return apiClient.get(`/api/v1/enhanced-tags/export?format=${format}`, { responseType: 'blob' });
  },

  importTags: async (file: File): Promise<{ imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/v1/enhanced-tags/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export default apiClient;
