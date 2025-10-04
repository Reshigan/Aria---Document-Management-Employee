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
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  roles: string[];
}

export interface LoginCredentials {
  username: string;
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
  refresh_token: string;
  token_type: string;
  expires_in: number;
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
  file_size: number;
  mime_type: string;
  document_type: DocumentType;
  status: DocumentStatus;
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
}
