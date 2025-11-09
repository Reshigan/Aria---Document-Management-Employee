import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://aria.vantax.co.za/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Financial API
  financial = {
    // Invoices
    getInvoices: (params?: any) => this.get('/financial/invoices', { params }),
    getInvoice: (id: number) => this.get(`/financial/invoices/${id}`),
    createInvoice: (data: any) => this.post('/financial/invoices', data),
    updateInvoice: (id: number, data: any) => this.put(`/financial/invoices/${id}`, data),
    deleteInvoice: (id: number) => this.delete(`/financial/invoices/${id}`),

    // Payments
    getPayments: (params?: any) => this.get('/financial/payments', { params }),
    createPayment: (data: any) => this.post('/financial/payments', data),

    // Reports
    getAgedReceivables: () => this.get('/financial/reports/aged-receivables'),
    getVATSummary: (params?: any) => this.get('/financial/reports/vat-summary', { params })
  };

  // CRM API
  crm = {
    // Customers
    getCustomers: (params?: any) => this.get('/crm/customers', { params }),
    getCustomer: (id: number) => this.get(`/crm/customers/${id}`),
    createCustomer: (data: any) => this.post('/crm/customers', data),
    updateCustomer: (id: number, data: any) => this.put(`/crm/customers/${id}`, data),

    // Leads
    getLeads: (params?: any) => this.get('/crm/leads', { params }),
    createLead: (data: any) => this.post('/crm/leads', data),

    // Opportunities
    getOpportunities: (params?: any) => this.get('/crm/opportunities', { params }),
    createOpportunity: (data: any) => this.post('/crm/opportunities', data),

    // Quotes
    getQuotes: (params?: any) => this.get('/crm/quotes', { params }),
    createQuote: (data: any) => this.post('/crm/quotes', data),

    // Reports
    getPipeline: () => this.get('/crm/reports/pipeline')
  };

  // Procurement API
  procurement = {
    // Suppliers
    getSuppliers: (params?: any) => this.get('/procurement/suppliers', { params }),
    getSupplier: (id: number) => this.get(`/procurement/suppliers/${id}`),
    createSupplier: (data: any) => this.post('/procurement/suppliers', data),

    // Products
    getProducts: (params?: any) => this.get('/procurement/products', { params }),
    getProduct: (id: number) => this.get(`/procurement/products/${id}`),
    createProduct: (data: any) => this.post('/procurement/products', data),
    updateProduct: (id: number, data: any) => this.put(`/procurement/products/${id}`, data),

    // Purchase Orders
    getPurchaseOrders: (params?: any) => this.get('/procurement/purchase-orders', { params }),
    createPurchaseOrder: (data: any) => this.post('/procurement/purchase-orders', data),

    // Reports
    getStockValuation: () => this.get('/procurement/reports/stock-valuation'),
    getReorderSuggestions: () => this.get('/procurement/reports/reorder-suggestions')
  };

  // HR API
  hr = {
    // Employees
    getEmployees: (params?: any) => this.get('/hr/employees', { params }),
    getEmployee: (id: number) => this.get(`/hr/employees/${id}`),
    createEmployee: (data: any) => this.post('/hr/employees', data),
    updateEmployee: (id: number, data: any) => this.put(`/hr/employees/${id}`, data),

    // Leave
    getLeaveRequests: (params?: any) => this.get('/hr/leave', { params }),
    createLeaveRequest: (data: any) => this.post('/hr/leave', data),
    approveLeave: (id: number) => this.post(`/hr/leave/${id}/approve`),

    // Payroll
    getPayroll: (params?: any) => this.get('/hr/payroll', { params }),
    runPayroll: (data: any) => this.post('/hr/payroll/run', data),

    // Reports
    getEMP201: (params?: any) => this.get('/hr/reports/emp201', { params })
  };

  // Document Processing API
  documents = {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return this.post('/document-processing/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    getDocuments: (params?: any) => this.get('/document-processing/documents', { params }),
    getDocument: (id: number) => this.get(`/document-processing/documents/${id}`),
    processDocument: (id: number) => this.post(`/document-processing/documents/${id}/process`),
    getAnalysis: (id: number) => this.get(`/document-processing/documents/${id}/analysis`)
  };

  // Bot API
  bots = {
    testBot: (botId: string, data: any) => this.post(`/bots/${botId}/test`, data),
    getBotStatus: (botId: string) => this.get(`/bots/${botId}/status`),
    getBotAccuracy: (botId: string) => this.get(`/bots/${botId}/accuracy`)
  };
}

export const apiClient = new APIClient();
export default apiClient;
