import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken, clearTokens, shouldRefreshToken } from './auth';

const API_BASE_URL = '/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Check if token needs refresh before making request
    if (shouldRefreshToken()) {
      await refreshAccessToken();
    }

    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 errors and retry with refreshed token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearTokens();
        window.location.href = '/login?session_expired=true';
        return Promise.reject(refreshError);
      }
    }

    // Handle other error statuses
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    } else if (error.response?.status === 404) {
      console.error('Resource not found:', error.response.data);
    } else if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

// Helper function for GET requests with error handling
export const apiGet = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const response = await apiClient.get<T>(url, { params });
  return response.data;
};

// Helper function for POST requests with error handling
export const apiPost = async <T>(url: string, data?: unknown): Promise<T> => {
  const response = await apiClient.post<T>(url, data);
  return response.data;
};

// Helper function for PUT requests with error handling
export const apiPut = async <T>(url: string, data?: unknown): Promise<T> => {
  const response = await apiClient.put<T>(url, data);
  return response.data;
};

// Helper function for DELETE requests with error handling
export const apiDelete = async <T>(url: string): Promise<T> => {
  const response = await apiClient.delete<T>(url);
  return response.data;
};

// Helper function for PATCH requests with error handling
export const apiPatch = async <T>(url: string, data?: unknown): Promise<T> => {
  const response = await apiClient.patch<T>(url, data);
  return response.data;
};

export default apiClient;
