/**
 * API Client - Axios configuration
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token, company_id, and rewrite legacy API paths
api.interceptors.request.use((config) => {
  // Check both 'token' and 'access_token' for backwards compatibility
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const companyId = localStorage.getItem('aria_company_id');
  if (companyId) {
    config.headers['X-Company-ID'] = companyId;
    
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        company_id: companyId,
      };
    }
  }
  
  if (config.url) {
    config.url = config.url.replace(/^\/api\//, '/');
    
    config.url = config.url.replace(/\/erp\/procure-to-pay\/suppliers/, '/erp/master-data/suppliers');
    
    config.url = config.url.replace(/\/erp\/order-to-cash\/customers/, '/erp/master-data/customers');
    
    
    config.url = config.url.replace(/\/erp\/order-to-cash\/stock-on-hand/, '/inventory/stock-on-hand');
    config.url = config.url.replace(/\/erp\/order-to-cash\/warehouses/, '/inventory/warehouses');
  }
  
  return config;
});

let refreshPromise: Promise<string> | null = null;

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        if (!refreshPromise) {
          const refreshToken = localStorage.getItem('refresh_token');
          
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          refreshPromise = api.post('/auth/refresh', { refresh_token: refreshToken })
            .then(response => {
              const { access_token } = response.data;
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('token', access_token); // Backwards compatibility
              refreshPromise = null;
              return access_token;
            })
            .catch(err => {
              refreshPromise = null;
              throw err;
            });
        }
        
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// API functions
export const auth = {
  signup: (data: any) => api.post('/auth/signup', data),
  login: (data: any) => api.post('/auth/login', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
  me: () => api.get('/auth/me'),
};

export const aria = {
  chat: (message: string, context?: any) => 
    api.post('/aria/chat', { message, context }),
  
  voiceInteract: (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    return api.post('/aria/voice/interact', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getStatus: () => api.get('/aria/status'),
  
  delegateToBot: (botId: string, message: string) =>
    api.post('/aria/delegate', { bot_id: botId, message }),
  
  getGrowthOpportunities: () => api.get('/aria/growth/opportunities'),
  getEmbeddingScore: () => api.get('/aria/growth/embedding-score'),
  getHealthScore: () => api.get('/aria/growth/health'),
};

export const bots = {
  listTemplates: () => api.get('/bots'),
  getTemplate: (id: string) => api.get(`/bots/${id}`),
  chat: (data: any) => api.post('/aria/chat', data),
};

export const workflows = {
  list: () => api.get('/workflows'),
  create: (data: any) => api.post('/workflows', data),
  execute: (id: string, context?: any) => 
    api.post(`/workflows/${id}/execute`, { context }),
};
