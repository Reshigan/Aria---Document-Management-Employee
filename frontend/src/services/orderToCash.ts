/**
 * Order-to-Cash API Service
 * Centralized API calls for O2C module
 */
import api from '../lib/api';
import type {
  Product,
  Customer,
  Quote,
  QuoteCreate,
  SalesOrder,
  SalesOrderCreate,
  Delivery,
  DeliveryCreate,
  StatusTransitionResult
} from '../types/erp';

const BASE_PATH = '/erp/order-to-cash';

// Products

export const productsService = {
  list: async (params?: { search?: string; is_active?: boolean; skip?: number; limit?: number }) => {
    const response = await api.get<Product[]>(`${BASE_PATH}/products`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Product>(`${BASE_PATH}/products/${id}`);
    return response.data;
  },

  create: async (data: Omit<Product, 'id' | 'company_id' | 'created_at'>) => {
    const response = await api.post<Product>(`${BASE_PATH}/products`, data);
    return response.data;
  },

  update: async (id: string, data: Partial<Product>) => {
    const response = await api.put<Product>(`${BASE_PATH}/products/${id}`, data);
    return response.data;
  }
};

// Customers

export const customersService = {
  list: async (params?: { search?: string; is_active?: boolean; skip?: number; limit?: number }) => {
    const response = await api.get<Customer[]>(`${BASE_PATH}/customers`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Customer>(`${BASE_PATH}/customers/${id}`);
    return response.data;
  }
};

// Quotes

export const quotesService = {
  list: async (params?: { search?: string; status?: string; skip?: number; limit?: number }) => {
    const response = await api.get<Quote[]>(`${BASE_PATH}/quotes`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Quote>(`${BASE_PATH}/quotes/${id}`);
    return response.data;
  },

  create: async (data: QuoteCreate) => {
    const response = await api.post<Quote>(`${BASE_PATH}/quotes`, data);
    return response.data;
  },

  update: async (id: string, data: Partial<QuoteCreate>) => {
    const response = await api.put<Quote>(`${BASE_PATH}/quotes/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`${BASE_PATH}/quotes/${id}`);
  },

  approve: async (id: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/quotes/${id}/approve`);
    return response.data;
  },

  send: async (id: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/quotes/${id}/send`);
    return response.data;
  },

  accept: async (id: string) => {
    const response = await api.post<{ sales_order_id: string; sales_order_number: string }>(`${BASE_PATH}/quotes/${id}/accept`);
    return response.data;
  },

  reject: async (id: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/quotes/${id}/reject`);
    return response.data;
  }
};


export const salesOrdersService = {
  list: async (params?: { customer_id?: string; status?: string; skip?: number; limit?: number }) => {
    const response = await api.get<SalesOrder[]>(`${BASE_PATH}/sales-orders`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<SalesOrder>(`${BASE_PATH}/sales-orders/${id}`);
    return response.data;
  },

  create: async (data: SalesOrderCreate) => {
    const response = await api.post<SalesOrder>(`${BASE_PATH}/sales-orders`, data);
    return response.data;
  },

  approve: async (id: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/sales-orders/${id}/approve`);
    return response.data;
  }
};


export const deliveriesService = {
  list: async (params?: { sales_order_id?: string; status?: string; skip?: number; limit?: number }) => {
    const response = await api.get<Delivery[]>(`${BASE_PATH}/deliveries`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Delivery>(`${BASE_PATH}/deliveries/${id}`);
    return response.data;
  },

  create: async (data: DeliveryCreate) => {
    const response = await api.post<Delivery>(`${BASE_PATH}/deliveries`, data);
    return response.data;
  },

  ship: async (id: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/deliveries/${id}/ship`);
    return response.data;
  }
};


export const warehousesService = {
  list: async () => {
    const response = await api.get(`${BASE_PATH}/warehouses`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post(`${BASE_PATH}/warehouses`, data);
    return response.data;
  }
};

export const storageLocationsService = {
  list: async (params?: { warehouse_id?: string }) => {
    const response = await api.get(`${BASE_PATH}/storage-locations`, { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post(`${BASE_PATH}/storage-locations`, data);
    return response.data;
  }
};

export const stockService = {
  listOnHand: async (params?: { warehouse_id?: string; product_id?: string }) => {
    const response = await api.get(`${BASE_PATH}/stock-on-hand`, { params });
    return response.data;
  },

  createMovement: async (data: any) => {
    const response = await api.post(`${BASE_PATH}/stock-movements`, data);
    return response.data;
  },

  listMovements: async (params?: { product_id?: string; warehouse_id?: string }) => {
    const response = await api.get(`${BASE_PATH}/stock-movements`, { params });
    return response.data;
  }
};
