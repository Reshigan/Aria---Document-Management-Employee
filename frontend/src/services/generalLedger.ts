/**
 * General Ledger API Service
 * Centralized API calls for GL module
 */
import api from '../lib/api';
import type {
  JournalEntry,
  JournalEntryCreate,
  ChartOfAccount,
  StatusTransitionResult
} from '../types/erp';

const BASE_PATH = '/erp/gl';


export const journalEntriesService = {
  list: async (params?: { company_id?: string; status?: string; limit?: number; offset?: number }) => {
    const response = await api.get<{ entries: JournalEntry[]; total: number }>(`${BASE_PATH}/journal-entries`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<JournalEntry>(`${BASE_PATH}/journal-entries/${id}`);
    return response.data;
  },

  create: async (data: JournalEntryCreate) => {
    const response = await api.post<JournalEntry>(`${BASE_PATH}/journal-entries`, data);
    return response.data;
  },

  post: async (id: string, postedBy: string) => {
    const response = await api.post<StatusTransitionResult>(`${BASE_PATH}/journal-entries/${id}/post`, {
      posted_by: postedBy
    });
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`${BASE_PATH}/journal-entries/${id}`);
  }
};


export const chartOfAccountsService = {
  list: async (params?: { company_id?: string; is_active?: boolean }) => {
    const response = await api.get<ChartOfAccount[]>(`${BASE_PATH}/chart-of-accounts`, { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<ChartOfAccount>(`${BASE_PATH}/chart-of-accounts/${id}`);
    return response.data;
  },

  create: async (data: Omit<ChartOfAccount, 'id' | 'company_id' | 'current_balance' | 'created_at'>) => {
    const response = await api.post<ChartOfAccount>(`${BASE_PATH}/chart-of-accounts`, data);
    return response.data;
  },

  update: async (id: string, data: Partial<ChartOfAccount>) => {
    const response = await api.put<ChartOfAccount>(`${BASE_PATH}/chart-of-accounts/${id}`, data);
    return response.data;
  }
};
