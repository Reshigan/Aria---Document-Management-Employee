/**
 * Procure-to-Pay API Service
 * Centralized API calls for P2P module
 */
import api from '../lib/api';
import type {
  Supplier,
  PurchaseOrder,
  PurchaseOrderCreate,
  GoodsReceipt,
  GoodsReceiptCreate,
  SupplierInvoice,
  SupplierInvoiceCreate,
  StatusTransitionResult
} from '../types/erp';

const BASE_PATH = '/erp/procure-to-pay';

// Suppliers

export const suppliersService = {
  list: async (params?: { search?: string; is_active?: boolean; skip?: number; limit?: number }) => {
    const response = await api.get<Supplier[]>(`${BASE_PATH}/suppliers`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Supplier>(`${BASE_PATH}/suppliers/${id}`);
    return response.data;
  }
};

// Purchase Orders

export const purchaseOrdersService = {
  list: async (params?: { supplier_id?: string; status?: string; skip?: number; limit?: number }) => {
    const response = await api.get<PurchaseOrder[]>(`${BASE_PATH}/purchase-orders`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<PurchaseOrder>(`${BASE_PATH}/purchase-orders/${id}`);
    return response.data;
  },

  create: async (data: PurchaseOrderCreate) => {
    const response = await api.post<PurchaseOrder>(`${BASE_PATH}/purchase-orders`, data);
    return response.data;
  },

  approve: async (id: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/purchase-orders/${id}/approve`);
    return response.data;
  }
};


export const goodsReceiptsService = {
  list: async (params?: { purchase_order_id?: string; status?: string; skip?: number; limit?: number }) => {
    const response = await api.get<GoodsReceipt[]>(`${BASE_PATH}/goods-receipts`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<GoodsReceipt>(`${BASE_PATH}/goods-receipts/${id}`);
    return response.data;
  },

  create: async (data: GoodsReceiptCreate) => {
    const response = await api.post<GoodsReceipt>(`${BASE_PATH}/goods-receipts`, data);
    return response.data;
  },

  post: async (id: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/goods-receipts/${id}/post`);
    return response.data;
  }
};


export const supplierInvoicesService = {
  list: async (params?: { supplier_id?: string; status?: string; skip?: number; limit?: number }) => {
    const response = await api.get<SupplierInvoice[]>(`${BASE_PATH}/supplier-invoices`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<SupplierInvoice>(`${BASE_PATH}/supplier-invoices/${id}`);
    return response.data;
  },

  create: async (data: SupplierInvoiceCreate) => {
    const response = await api.post<SupplierInvoice>(`${BASE_PATH}/supplier-invoices`, data);
    return response.data;
  },

  post: async (id: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/supplier-invoices/${id}/post`);
    return response.data;
  }
};
