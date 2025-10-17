export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'viewer'
  avatar?: string
  department?: string
  lastLogin?: Date
}

export interface Document {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  uploadedBy: string
  status: 'processing' | 'processed' | 'failed'
  tags: string[]
  category?: string
  url?: string
  thumbnail?: string
  metadata?: Record<string, any>
}

export interface Settings {
  sapConfig: {
    server: string
    client: string
    username: string
    password: string
  }
  documentMappings: {
    invoices: string
    contracts: string
    reports: string
  }
  thresholds: {
    maxFileSize: number
    autoProcessing: boolean
    retentionDays: number
  }
  systemSettings: {
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: boolean
    autoBackup: boolean
  }
}

export interface DashboardStats {
  totalDocuments: number
  processingDocuments: number
  completedDocuments: number
  failedDocuments: number
  storageUsed: number
  storageLimit: number
  recentActivity: Activity[]
}

export interface Activity {
  id: string
  type: 'upload' | 'process' | 'download' | 'delete'
  description: string
  timestamp: Date
  user: string
  documentId?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
  expiresAt: Date
}