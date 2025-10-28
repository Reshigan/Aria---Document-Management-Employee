/**
 * API Client - Axios configuration
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  // Check both 'token' and 'access_token' for backwards compatibility
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
  listTemplates: () => api.get('/bot/templates'),
  getTemplate: (id: string) => api.get(`/bot/templates/${id}`),
  chat: (data: any) => api.post('/bot/chat', data),
};

export const workflows = {
  list: () => api.get('/workflows'),
  create: (data: any) => api.post('/workflows', data),
  execute: (id: string, context?: any) => 
    api.post(`/workflows/${id}/execute`, { context }),
};
