/**
 * TypeScript types for ARIA application
 */

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  phone_number?: string;
  department?: string;
  job_title?: string;
  is_active?: boolean;
  is_superuser: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  roles?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  phone_number?: string;
  department?: string;
  job_title?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

export enum DocumentType {
  INVOICE = 'invoice',
  PURCHASE_ORDER = 'purchase_order',
  REMITTANCE = 'remittance',
  POD = 'pod',
  CREDIT_NOTE = 'credit_note',
  DEBIT_NOTE = 'debit_note',
  OTHER = 'other',
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  VALIDATED = 'validated',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  POSTED_TO_SAP = 'posted_to_sap',
  ERROR = 'error',
}

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: DocumentType;
  status: DocumentStatus;
  title?: string;
  description?: string;
  folder_id?: number;
  folder?: Folder;
  tags?: Tag[];
  is_favorite: boolean;
  version: number;
  checksum: string;
  invoice_number?: string;
  invoice_date?: string;
  vendor_name?: string;
  vendor_code?: string;
  total_amount?: number;
  currency?: string;
  confidence_score?: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  sap_document_number?: string;
  posted_to_sap: boolean;
  posted_to_sap_at?: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface UploadResponse {
  id: number;
  filename: string;
  file_size: number;
  status: DocumentStatus;
  message: string;
}

export interface ExtractedData {
  document_id: number;
  extracted_data: Record<string, any>;
  confidence_score?: number;
  ocr_text?: string;
}

export interface DashboardStats {
  total_documents: number;
  processed_documents: number;
  pending_documents: number;
  posted_to_sap: number;
  success_rate: number;
  avg_processing_time: number;
  total_users: number;
  active_workflows: number;
  storage_used: number;
  recent_activity: ActivityLog[];
}

// New types for enhanced features
export interface Folder {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  parent?: Folder;
  children?: Folder[];
  path: string;
  level: number;
  document_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  description?: string;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: number;
  name: string;
  description?: string;
  template_id?: number;
  document_id: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  current_step: number;
  steps: WorkflowStep[];
  created_by: number;
  assigned_to?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: number;
  workflow_id: number;
  step_number: number;
  name: string;
  description?: string;
  assigned_to?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  action_type: 'approval' | 'review' | 'notification' | 'custom';
  due_date?: string;
  completed_at?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  user?: User;
  action: string;
  resource_type: string;
  resource_id?: number;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ShareLink {
  id: number;
  document_id: number;
  token: string;
  permission: 'view' | 'download' | 'edit';
  expires_at?: string;
  password?: string;
  max_downloads?: number;
  download_count: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  query: string;
  filters: Record<string, any>;
  took: number;
}

export interface SavedSearch {
  id: number;
  name: string;
  query: string;
  filters: Record<string, any>;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: number;
  name: string;
  key: string;
  permissions: string[];
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsData {
  period: string;
  data: Array<{
    date: string;
    value: number;
    label?: string;
  }>;
  total: number;
  change: number;
  change_percentage: number;
}
