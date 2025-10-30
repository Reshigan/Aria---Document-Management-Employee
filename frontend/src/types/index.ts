export interface User {
  id: string
  email: string
  company_id: string
  full_name: string
  is_active: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  company_name: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface Customer {
  id: string
  company_id: string
  customer_code: string
  name: string
  email?: string
  phone?: string
  address?: string
  tax_number?: string
  payment_terms?: number
  credit_limit?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  company_id: string
  supplier_code: string
  name: string
  email?: string
  phone?: string
  address?: string
  tax_number?: string
  payment_terms?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  company_id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  customer_id?: string
  supplier_id?: string
  invoice_type: 'customer_invoice' | 'supplier_invoice'
  subtotal: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  company_id: string
  payment_number: string
  payment_date: string
  amount: number
  payment_method: string
  payment_type: 'customer_payment' | 'supplier_payment'
  reference?: string
  notes?: string
  status: string
  customer_id?: string
  supplier_id?: string
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  company_id: string
  account_code: string
  account_name: string
  account_type: string
  parent_account_id?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_receivables: number
  overdue_receivables: number
  current_receivables: number
  total_payables: number
  overdue_payables: number
  current_payables: number
  total_revenue: number
  revenue_growth: number
  total_expenses: number
  expense_growth: number
  cash_in: number
  cash_out: number
  net_cash_flow: number
  profit: number
}

export interface RecentActivity {
  recent_invoices: Invoice[]
  recent_payments: Payment[]
}
