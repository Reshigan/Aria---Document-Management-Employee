/**
 * Bots & ARIA Controller API Service
 * Centralized API calls for bot execution and ARIA orchestration
 */
import api from '../lib/api';
import type { Bot, BotExecution, ARIAProcessLog } from '../types/erp';


export const botsService = {
  listAvailable: async () => {
    const response = await api.get<Bot[]>('/bots/available');
    return response.data;
  },

  execute: async (botId: string, context: any) => {
    const response = await api.post<BotExecution>('/bots/execute', {
      bot_id: botId,
      context
    });
    return response.data;
  },

  listExecutions: async (params?: { bot_id?: string; document_id?: string; limit?: number }) => {
    const response = await api.get<BotExecution[]>('/bots/executions', { params });
    return response.data;
  },

  getExecution: async (id: string) => {
    const response = await api.get<BotExecution>(`/bots/executions/${id}`);
    return response.data;
  }
};


export const ariaControllerService = {
  process: async (documentType: string, documentId: string, action: string, context?: any) => {
    const response = await api.post<ARIAProcessLog>('/aria/process', {
      document_type: documentType,
      document_id: documentId,
      action,
      context
    });
    return response.data;
  },

  getLogs: async (params?: { document_type?: string; document_id?: string; limit?: number }) => {
    const response = await api.get<ARIAProcessLog[]>('/aria/logs', { params });
    return response.data;
  },

  getLog: async (id: string) => {
    const response = await api.get<ARIAProcessLog>(`/aria/logs/${id}`);
    return response.data;
  }
};


export async function getBotsForDocumentType(documentType: string): Promise<Bot[]> {
  const allBots = await botsService.listAvailable();
  
  const categoryMap: Record<string, string[]> = {
    'quote': ['sales', 'forecasting'],
    'sales_order': ['sales', 'demand_planning'],
    'invoice': ['ar', 'collections'],
    'purchase_order': ['procurement', 'supplier_performance'],
    'goods_receipt': ['inventory', 'procurement'],
    'supplier_invoice': ['ap', 'procurement']
  };

  const categories = categoryMap[documentType] || [];
  return allBots.filter(bot => categories.includes(bot.category));
}
