import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (data: any) => 
    api.post('/auth/register', data),
  refresh: (refresh_token: string) => 
    api.post('/auth/refresh', { refresh_token }),
  me: () => 
    api.get('/auth/me'),
};

export const botsAPI = {
  list: () => 
    api.get('/bots'),
  get: (botName: string) =>
    api.get(`/bots/${botName}`),
  execute: (botName: string, data: any) => 
    api.post('/bots/execute', { bot_name: botName, data }),
  query: (botId: string, query: string) => 
    api.post(`/bots/${botId}/query`, { query }),
  status: (botId: string) => 
    api.get(`/bots/${botId}/status`),
};

export const erpAPI = {
  financial: () => 
    api.get('/erp/financial'),
  hr: () => 
    api.get('/erp/hr'),
  crm: () => 
    api.get('/erp/crm'),
  procurement: () => 
    api.get('/erp/procurement'),
  compliance: () => 
    api.get('/erp/compliance'),
};

export const healthAPI = {
  check: () =>
    axios.get(`${API_BASE_URL}/health`),
};

export const tenantsAPI = {
  getCurrent: () => 
    api.get('/tenants/me'),
  update: (data: any) => 
    api.patch('/tenants/me', data),
};

export const analyticsAPI = {
  dashboard: () => 
    api.get('/analytics/dashboard'),
};

export default api;
