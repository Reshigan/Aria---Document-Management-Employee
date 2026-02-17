import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if we had a token (i.e., session expired)
      // Don't redirect if we're already trying to login (no token = login failure)
      const hadToken = localStorage.getItem('access_token')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (hadToken && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const botsAPI = {
  list: () => api.get('/bots'),
  execute: (botName: string, data: Record<string, unknown> = {}) => api.post(`/bots/${botName}/execute`, data),
  getStatus: (botName: string) => api.get(`/bots/${botName}/status`),
  getHistory: (botName: string) => api.get(`/bots/${botName}/history`),
};

export const erpAPI = {
  getCustomers: () => api.get('/erp/master-data/customers'),
  getProducts: () => api.get('/erp/order-to-cash/products'),
  getInvoices: () => api.get('/erp/invoices'),
  getSalesOrders: () => api.get('/erp/order-to-cash/sales-orders'),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api
