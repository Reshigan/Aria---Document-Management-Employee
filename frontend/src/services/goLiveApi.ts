import api from './api';

const BASE = '/go-live';

export const goLiveApi = {
  generatePdf: (docType: string, docId: string) => api.get(`${BASE}/pdf/${docType}/${docId}`, { responseType: 'blob' }),
  generateStatement: (customerId: string) => api.get(`${BASE}/pdf/statement/${customerId}`, { responseType: 'blob' }),

  sendDocumentEmail: (data: { doc_type: string; doc_id: string; recipient_email: string; subject?: string; message?: string }) => api.post(`${BASE}/email/send-document`, data),
  sendReminder: (data: { invoice_id: string; recipient_email: string }) => api.post(`${BASE}/email/send-reminder`, data),

  exportData: (entity: string, format?: string) => api.get(`${BASE}/export/${entity}?format=${format || 'csv'}`, { responseType: format === 'json' ? 'json' : 'blob' }),

  getAuditTrail: (params?: Record<string, string>) => api.get(`${BASE}/audit-trail`, { params }),

  getDashboardLive: () => api.get(`${BASE}/dashboard/live`),

  getSessions: () => api.get(`${BASE}/auth/sessions`),
  revokeSession: (sessionId: string) => api.post(`${BASE}/auth/revoke-session`, { session_id: sessionId }),
  changePassword: (data: { current_password: string; new_password: string }) => api.post(`${BASE}/auth/change-password`, data),

  convertInvoiceCurrency: (data: { invoice_id: string; target_currency: string }) => api.post(`${BASE}/currency/convert-invoice`, data),

  getBotSchedules: () => api.get(`${BASE}/bot-schedules`),
  saveBotSchedule: (data: { bot_id: string; schedule: string; enabled: boolean; config?: any }) => api.post(`${BASE}/bot-schedules`, data),
  deleteBotSchedule: (botId: string) => api.delete(`${BASE}/bot-schedules/${botId}`),

  get2faStatus: () => api.get(`${BASE}/auth/2fa/status`),
  setup2fa: () => api.post(`${BASE}/auth/2fa/setup`),
  verify2fa: (code: string) => api.post(`${BASE}/auth/2fa/verify`, { code }),
  disable2fa: () => api.post(`${BASE}/auth/2fa/disable`),

  importData: (data: { entity: string; data: any[] }) => api.post(`${BASE}/migration/import`, data),
  getMigrationStatus: () => api.get(`${BASE}/migration/status`),
};

export default goLiveApi;
