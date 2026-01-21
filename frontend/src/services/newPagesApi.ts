/**
 * API Service for New Pages (60+ pages)
 * Covers Financial, Operations, People, Services, and Compliance modules
 */

import api from './api';

// ============================================
// FINANCIAL MODULE
// ============================================

// Budgets
export const budgetsApi = {
  getAll: () => api.get('/new-pages/budgets'),
  getById: (id: string) => api.get(`/new-pages/budgets/${id}`),
  create: (data: any) => api.post('/new-pages/budgets', data),
  update: (id: string, data: any) => api.put(`/new-pages/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/new-pages/budgets/${id}`),
};

// Cost Centers
export const costCentersApi = {
  getAll: () => api.get('/new-pages/cost-centers'),
  create: (data: any) => api.post('/new-pages/cost-centers', data),
  update: (id: string, data: any) => api.put(`/new-pages/cost-centers/${id}`, data),
  delete: (id: string) => api.delete(`/new-pages/cost-centers/${id}`),
};

// Payment Batches
export const paymentBatchesApi = {
  getAll: () => api.get('/new-pages/payment-batches'),
  getById: (id: string) => api.get(`/new-pages/payment-batches/${id}`),
  create: (data: any) => api.post('/new-pages/payment-batches', data),
  approve: (id: string) => api.put(`/new-pages/payment-batches/${id}/approve`),
  process: (id: string) => api.put(`/new-pages/payment-batches/${id}/process`),
};

// Expense Claims
export const expenseClaimsApi = {
  getAll: () => api.get('/new-pages/expense-claims'),
  getById: (id: string) => api.get(`/new-pages/expense-claims/${id}`),
  create: (data: any) => api.post('/new-pages/expense-claims', data),
  submit: (id: string) => api.put(`/new-pages/expense-claims/${id}/submit`),
  approve: (id: string) => api.put(`/new-pages/expense-claims/${id}/approve`),
  reject: (id: string, reason: string) => api.put(`/new-pages/expense-claims/${id}/reject`, { reason }),
};

// Credit Notes
export const creditNotesApi = {
  getAll: () => api.get('/new-pages/credit-notes'),
  create: (data: any) => api.post('/new-pages/credit-notes', data),
  issue: (id: string) => api.put(`/new-pages/credit-notes/${id}/issue`),
};

// Collections
export const collectionsApi = {
  getAll: () => api.get('/new-pages/collections'),
  create: (data: any) => api.post('/new-pages/collections', data),
};

// Cash Forecasts
export const cashForecastsApi = {
  getAll: () => api.get('/new-pages/cash-forecasts'),
  getById: (id: string) => api.get(`/new-pages/cash-forecasts/${id}`),
  create: (data: any) => api.post('/new-pages/cash-forecasts', data),
};

// Bank Transfers
export const bankTransfersApi = {
  getAll: () => api.get('/new-pages/bank-transfers'),
  create: (data: any) => api.post('/new-pages/bank-transfers', data),
  approve: (id: string) => api.put(`/new-pages/bank-transfers/${id}/approve`),
};

// ============================================
// OPERATIONS MODULE
// ============================================

// Price Lists
export const priceListsApi = {
  getAll: () => api.get('/new-pages/price-lists'),
  getById: (id: string) => api.get(`/new-pages/price-lists/${id}`),
  create: (data: any) => api.post('/new-pages/price-lists', data),
  update: (id: string, data: any) => api.put(`/new-pages/price-lists/${id}`, data),
  delete: (id: string) => api.delete(`/new-pages/price-lists/${id}`),
};

// Discounts
export const discountsApi = {
  getAll: () => api.get('/new-pages/discounts'),
  create: (data: any) => api.post('/new-pages/discounts', data),
  update: (id: string, data: any) => api.put(`/new-pages/discounts/${id}`, data),
  delete: (id: string) => api.delete(`/new-pages/discounts/${id}`),
};

// Sales Targets
export const salesTargetsApi = {
  getAll: () => api.get('/new-pages/sales-targets'),
  create: (data: any) => api.post('/new-pages/sales-targets', data),
  update: (id: string, data: any) => api.put(`/new-pages/sales-targets/${id}`, data),
};

// Commissions
export const commissionsApi = {
  getAll: () => api.get('/new-pages/commissions'),
  create: (data: any) => api.post('/new-pages/commissions', data),
  calculate: (id: string) => api.put(`/new-pages/commissions/${id}/calculate`),
  approve: (id: string) => api.put(`/new-pages/commissions/${id}/approve`),
};

// Stock Adjustments
export const stockAdjustmentsApi = {
  getAll: () => api.get('/new-pages/stock-adjustments'),
  getById: (id: string) => api.get(`/new-pages/stock-adjustments/${id}`),
  create: (data: any) => api.post('/new-pages/stock-adjustments', data),
  approve: (id: string) => api.put(`/new-pages/stock-adjustments/${id}/approve`),
};

// Stock Transfers
export const stockTransfersApi = {
  getAll: () => api.get('/new-pages/stock-transfers'),
  getById: (id: string) => api.get(`/new-pages/stock-transfers/${id}`),
  create: (data: any) => api.post('/new-pages/stock-transfers', data),
  ship: (id: string) => api.put(`/new-pages/stock-transfers/${id}/ship`),
  receive: (id: string) => api.put(`/new-pages/stock-transfers/${id}/receive`),
};

// Reorder Points
export const reorderPointsApi = {
  getAll: () => api.get('/new-pages/reorder-points'),
  create: (data: any) => api.post('/new-pages/reorder-points', data),
  update: (id: string, data: any) => api.put(`/new-pages/reorder-points/${id}`, data),
  delete: (id: string) => api.delete(`/new-pages/reorder-points/${id}`),
};

// Requisitions
export const requisitionsApi = {
  getAll: () => api.get('/new-pages/requisitions'),
  getById: (id: string) => api.get(`/new-pages/requisitions/${id}`),
  create: (data: any) => api.post('/new-pages/requisitions', data),
  submit: (id: string) => api.put(`/new-pages/requisitions/${id}/submit`),
  approve: (id: string) => api.put(`/new-pages/requisitions/${id}/approve`),
  reject: (id: string, reason: string) => api.put(`/new-pages/requisitions/${id}/reject`, { reason }),
  convertToPO: (id: string) => api.put(`/new-pages/requisitions/${id}/convert-to-po`),
};

// RFQs
export const rfqsApi = {
  getAll: () => api.get('/new-pages/rfqs'),
  getById: (id: string) => api.get(`/new-pages/rfqs/${id}`),
  create: (data: any) => api.post('/new-pages/rfqs', data),
  send: (id: string) => api.put(`/new-pages/rfqs/${id}/send`),
  close: (id: string) => api.put(`/new-pages/rfqs/${id}/close`),
};

// Production Plans
export const productionPlansApi = {
  getAll: () => api.get('/new-pages/production-plans'),
  getById: (id: string) => api.get(`/new-pages/production-plans/${id}`),
  create: (data: any) => api.post('/new-pages/production-plans', data),
  update: (id: string, data: any) => api.put(`/new-pages/production-plans/${id}`, data),
};

// Machine Maintenance
export const machineMaintenanceApi = {
  getAll: () => api.get('/new-pages/machine-maintenance'),
  create: (data: any) => api.post('/new-pages/machine-maintenance', data),
  start: (id: string) => api.put(`/new-pages/machine-maintenance/${id}/start`),
  complete: (id: string) => api.put(`/new-pages/machine-maintenance/${id}/complete`),
};

// ============================================
// PEOPLE MODULE
// ============================================

// Positions
export const positionsApi = {
  getAll: () => api.get('/new-pages/positions'),
  create: (data: any) => api.post('/new-pages/positions', data),
  update: (id: string, data: any) => api.put(`/new-pages/positions/${id}`, data),
  delete: (id: string) => api.delete(`/new-pages/positions/${id}`),
};

// Salary Structures
export const salaryStructuresApi = {
  getAll: () => api.get('/new-pages/salary-structures'),
  create: (data: any) => api.post('/new-pages/salary-structures', data),
  update: (id: string, data: any) => api.put(`/new-pages/salary-structures/${id}`, data),
};

// Deductions
export const deductionsApi = {
  getAll: () => api.get('/new-pages/deductions'),
  create: (data: any) => api.post('/new-pages/deductions', data),
  update: (id: string, data: any) => api.put(`/new-pages/deductions/${id}`, data),
};

// PAYE Returns
export const payeReturnsApi = {
  getAll: () => api.get('/new-pages/paye-returns'),
  create: (data: any) => api.post('/new-pages/paye-returns', data),
  submit: (id: string) => api.put(`/new-pages/paye-returns/${id}/submit`),
};

// UIF Returns
export const uifReturnsApi = {
  getAll: () => api.get('/new-pages/uif-returns'),
  create: (data: any) => api.post('/new-pages/uif-returns', data),
  submit: (id: string) => api.put(`/new-pages/uif-returns/${id}/submit`),
};

// Job Postings
export const jobPostingsApi = {
  getAll: () => api.get('/new-pages/job-postings'),
  create: (data: any) => api.post('/new-pages/job-postings', data),
  update: (id: string, data: any) => api.put(`/new-pages/job-postings/${id}`, data),
  publish: (id: string) => api.put(`/new-pages/job-postings/${id}/publish`),
  close: (id: string) => api.put(`/new-pages/job-postings/${id}/close`),
};

// Applicants
export const applicantsApi = {
  getAll: () => api.get('/new-pages/applicants'),
  create: (data: any) => api.post('/new-pages/applicants', data),
  updateStage: (id: string, stage: string) => api.put(`/new-pages/applicants/${id}/stage`, { stage }),
};

// Onboarding Tasks
export const onboardingTasksApi = {
  getAll: () => api.get('/new-pages/onboarding-tasks'),
  create: (data: any) => api.post('/new-pages/onboarding-tasks', data),
  complete: (id: string) => api.put(`/new-pages/onboarding-tasks/${id}/complete`),
};

// Performance Reviews
export const performanceReviewsApi = {
  getAll: () => api.get('/new-pages/performance-reviews'),
  create: (data: any) => api.post('/new-pages/performance-reviews', data),
  submit: (id: string) => api.put(`/new-pages/performance-reviews/${id}/submit`),
  complete: (id: string, data: any) => api.put(`/new-pages/performance-reviews/${id}/complete`, data),
};

// Training Courses
export const trainingCoursesApi = {
  getAll: () => api.get('/new-pages/training-courses'),
  create: (data: any) => api.post('/new-pages/training-courses', data),
  update: (id: string, data: any) => api.put(`/new-pages/training-courses/${id}`, data),
};

// Training Sessions
export const trainingSessionsApi = {
  getAll: () => api.get('/new-pages/training-sessions'),
  create: (data: any) => api.post('/new-pages/training-sessions', data),
};

// Employee Skills
export const employeeSkillsApi = {
  getAll: () => api.get('/new-pages/employee-skills'),
  create: (data: any) => api.post('/new-pages/employee-skills', data),
  update: (id: string, data: any) => api.put(`/new-pages/employee-skills/${id}`, data),
};

// ============================================
// SERVICES MODULE
// ============================================

// Route Plans
export const routePlansApi = {
  getAll: () => api.get('/new-pages/route-plans'),
  getById: (id: string) => api.get(`/new-pages/route-plans/${id}`),
  create: (data: any) => api.post('/new-pages/route-plans', data),
  optimize: (id: string) => api.put(`/new-pages/route-plans/${id}/optimize`),
};

// Service Contracts
export const serviceContractsApi = {
  getAll: () => api.get('/new-pages/service-contracts'),
  create: (data: any) => api.post('/new-pages/service-contracts', data),
  renew: (id: string, data: any) => api.put(`/new-pages/service-contracts/${id}/renew`, data),
  terminate: (id: string) => api.put(`/new-pages/service-contracts/${id}/terminate`),
};

// Knowledge Base
export const knowledgeBaseApi = {
  getAll: (params?: { category?: string; search?: string }) => api.get('/new-pages/knowledge-base', { params }),
  create: (data: any) => api.post('/new-pages/knowledge-base', data),
  update: (id: string, data: any) => api.put(`/new-pages/knowledge-base/${id}`, data),
  publish: (id: string) => api.put(`/new-pages/knowledge-base/${id}/publish`),
};

// Project Milestones
export const projectMilestonesApi = {
  getAll: () => api.get('/new-pages/project-milestones'),
  create: (data: any) => api.post('/new-pages/project-milestones', data),
  complete: (id: string) => api.put(`/new-pages/project-milestones/${id}/complete`),
};

// ============================================
// COMPLIANCE MODULE
// ============================================

// VAT Returns
export const vatReturnsApi = {
  getAll: () => api.get('/new-pages/vat-returns'),
  create: (data: any) => api.post('/new-pages/vat-returns', data),
  calculate: (id: string) => api.put(`/new-pages/vat-returns/${id}/calculate`),
  submit: (id: string) => api.put(`/new-pages/vat-returns/${id}/submit`),
};

// B-BBEE Scorecards
export const bbbeeScorecardsApi = {
  getAll: () => api.get('/new-pages/bbbee-scorecards'),
  create: (data: any) => api.post('/new-pages/bbbee-scorecards', data),
  update: (id: string, data: any) => api.put(`/new-pages/bbbee-scorecards/${id}`, data),
  submit: (id: string) => api.put(`/new-pages/bbbee-scorecards/${id}/submit`),
};

// Controlled Documents
export const controlledDocumentsApi = {
  getAll: () => api.get('/new-pages/controlled-documents'),
  create: (data: any) => api.post('/new-pages/controlled-documents', data),
  update: (id: string, data: any) => api.put(`/new-pages/controlled-documents/${id}`, data),
  approve: (id: string) => api.put(`/new-pages/controlled-documents/${id}/approve`),
  archive: (id: string) => api.put(`/new-pages/controlled-documents/${id}/archive`),
};

// Policy Acknowledgements
export const policyAcknowledgementsApi = {
  getAll: () => api.get('/new-pages/policy-acknowledgements'),
  create: (data: any) => api.post('/new-pages/policy-acknowledgements', data),
  acknowledge: (id: string) => api.put(`/new-pages/policy-acknowledgements/${id}/acknowledge`),
};

// Support Tickets
export const supportTicketsApi = {
  getAll: () => api.get('/new-pages/support-tickets'),
  getById: (id: string) => api.get(`/new-pages/support-tickets/${id}`),
  create: (data: any) => api.post('/new-pages/support-tickets', data),
  assign: (id: string, data: any) => api.put(`/new-pages/support-tickets/${id}/assign`, data),
  resolve: (id: string) => api.put(`/new-pages/support-tickets/${id}/resolve`),
  close: (id: string) => api.put(`/new-pages/support-tickets/${id}/close`),
};

// Asset Register
export const assetRegisterApi = {
  getAll: () => api.get('/new-pages/assets'),
  getById: (id: string) => api.get(`/new-pages/assets/${id}`),
  create: (data: any) => api.post('/new-pages/assets', data),
  update: (id: string, data: any) => api.put(`/new-pages/assets/${id}`, data),
  dispose: (id: string, data: any) => api.put(`/new-pages/assets/${id}/dispose`, data),
  delete: (id: string) => api.delete(`/new-pages/assets/${id}`),
};

// Audit Trail
export const auditTrailApi = {
  getAll: () => api.get('/new-pages/audit-trail'),
  search: (params: any) => api.get('/new-pages/audit-trail', { params }),
  export: (params: any) => api.get('/new-pages/audit-trail/export', { params }),
};

// Risk Register
export const riskRegisterApi = {
  getAll: () => api.get('/new-pages/risks'),
  getById: (id: string) => api.get(`/new-pages/risks/${id}`),
  create: (data: any) => api.post('/new-pages/risks', data),
  update: (id: string, data: any) => api.put(`/new-pages/risks/${id}`, data),
  mitigate: (id: string) => api.put(`/new-pages/risks/${id}/mitigate`),
  close: (id: string) => api.put(`/new-pages/risks/${id}/close`),
  delete: (id: string) => api.delete(`/new-pages/risks/${id}`),
};

// Policies
export const policiesApi = {
  getAll: () => api.get('/new-pages/policies'),
  getById: (id: string) => api.get(`/new-pages/policies/${id}`),
  create: (data: any) => api.post('/new-pages/policies', data),
  update: (id: string, data: any) => api.put(`/new-pages/policies/${id}`, data),
  publish: (id: string) => api.put(`/new-pages/policies/${id}/publish`),
  archive: (id: string) => api.put(`/new-pages/policies/${id}/archive`),
  delete: (id: string) => api.delete(`/new-pages/policies/${id}`),
};
