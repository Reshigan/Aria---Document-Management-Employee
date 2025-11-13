/**
 * ERP Domain Types - Mirror backend Pydantic schemas
 * These types ensure payload parity between frontend and backend
 */


export interface Company {
  id: string;
  name: string;
  registration_number?: string;
  vat_number?: string;
  tax_number?: string;
  currency: string;
  vat_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description?: string;
  product_type: string;
  category?: string;
  unit_of_measure: string;
  standard_cost: number;
  selling_price: number;
  reorder_level: number;
  reorder_quantity: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  customer_code?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  payment_terms?: number;
  credit_limit?: number;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  supplier_code?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  payment_terms?: number;
  is_active: boolean;
  created_at: string;
}

export interface Warehouse {
  id: string;
  company_id: string;
  code: string;
  name: string;
  address_line1?: string;
  city?: string;
  country?: string;
  is_active: boolean;
  created_at: string;
}

export interface StorageLocation {
  id: string;
  company_id: string;
  warehouse_id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
}


export interface QuoteLine {
  id?: string;
  line_number: number;
  product_id: string;
  product_code?: string;
  product_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
}

export interface Quote {
  id: string;
  company_id: string;
  quote_number: string;
  customer_id?: string;
  customer_email?: string;
  customer_name?: string;
  quote_date: string;
  valid_until?: string;
  status: string;
  warehouse_id?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
  email_subject?: string;
  email_body?: string;
  email_message_id?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  accepted_at?: string;
  sales_order_id?: string;
  created_at: string;
  updated_at?: string;
  lines: QuoteLine[];
}

export interface QuoteCreate {
  customer_id?: string;
  customer_email?: string;
  customer_name?: string;
  quote_date: string;
  valid_until?: string;
  warehouse_id?: string;
  notes?: string;
  terms_and_conditions?: string;
  email_subject?: string;
  email_body?: string;
  lines: Omit<QuoteLine, 'id' | 'line_total'>[];
}

export interface SalesOrderLine {
  id?: string;
  line_number: number;
  product_id: string;
  product_code?: string;
  product_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
  quantity_delivered: number;
  quantity_invoiced: number;
}

export interface SalesOrder {
  id: string;
  company_id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  order_date: string;
  required_date?: string;
  status: string;
  warehouse_id?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  lines: SalesOrderLine[];
  gl_entry_id?: string;
}

export interface SalesOrderCreate {
  customer_id: string;
  order_date: string;
  required_date?: string;
  warehouse_id?: string;
  notes?: string;
  lines: Omit<SalesOrderLine, 'id' | 'line_total' | 'quantity_delivered' | 'quantity_invoiced'>[];
}

export interface DeliveryLine {
  id?: string;
  line_number: number;
  sales_order_line_id?: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  description?: string;
  quantity: number;
  storage_location_id?: string;
}

export interface Delivery {
  id: string;
  company_id: string;
  delivery_number: string;
  sales_order_id?: string;
  customer_id: string;
  customer_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  delivery_date: string;
  status: string;
  tracking_number?: string;
  carrier?: string;
  notes?: string;
  signed_document_url?: string;
  signed_at?: string;
  created_by?: string;
  created_at: string;
  lines: DeliveryLine[];
  gl_entry_id?: string;
}

export interface DeliveryCreate {
  sales_order_id?: string;
  customer_id: string;
  warehouse_id: string;
  delivery_date: string;
  tracking_number?: string;
  carrier?: string;
  notes?: string;
  lines: Omit<DeliveryLine, 'id'>[];
}


export interface PurchaseOrderLine {
  id?: string;
  line_number: number;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percentage: number;
  line_total: number;
  received_quantity: number;
}

export interface PurchaseOrder {
  id: string;
  company_id: string;
  supplier_id: string;
  supplier_name?: string;
  po_number: string;
  po_date: string;
  expected_delivery_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_terms?: string;
  delivery_address?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  lines: PurchaseOrderLine[];
  gl_entry_id?: string;
}

export interface PurchaseOrderCreate {
  supplier_id: string;
  po_date: string;
  expected_delivery_date?: string;
  payment_terms?: string;
  delivery_address?: string;
  notes?: string;
  lines: Omit<PurchaseOrderLine, 'id' | 'line_total' | 'received_quantity'>[];
}

export interface GoodsReceiptLine {
  id?: string;
  purchase_order_line_id?: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  description: string;
  quantity_received: number;
  storage_location_id?: string;
}

export interface GoodsReceipt {
  id: string;
  company_id: string;
  purchase_order_id?: string;
  supplier_id: string;
  supplier_name?: string;
  receipt_number: string;
  receipt_date: string;
  warehouse_id?: string;
  status: string;
  received_by?: string;
  created_at: string;
  lines: GoodsReceiptLine[];
  gl_entry_id?: string;
}

export interface GoodsReceiptCreate {
  purchase_order_id?: string;
  supplier_id: string;
  receipt_date: string;
  warehouse_id?: string;
  notes?: string;
  lines: Omit<GoodsReceiptLine, 'id'>[];
}

export interface SupplierInvoiceLine {
  id?: string;
  line_number: number;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percentage: number;
  line_total: number;
  tax_amount: number;
  discount_amount: number;
}

export interface SupplierInvoice {
  id: string;
  company_id: string;
  supplier_id: string;
  supplier_name?: string;
  invoice_number: string;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  balance_due: number;
  status: string;
  purchase_order_id?: string;
  receipt_id?: string;
  po_matched?: boolean;
  receipt_matched?: boolean;
  three_way_matched?: boolean;
  created_at: string;
  lines: SupplierInvoiceLine[];
  gl_entry_id?: string;
}

export interface SupplierInvoiceCreate {
  supplier_id: string;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date: string;
  purchase_order_id?: string;
  receipt_id?: string;
  lines: Omit<SupplierInvoiceLine, 'id' | 'line_total' | 'tax_amount' | 'discount_amount'>[];
}


export interface JournalLine {
  id?: string;
  line_number: number;
  account_code: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  cost_center?: string;
  department?: string;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  reference: string;
  entry_date: string;
  posting_date: string;
  description: string;
  source: string;
  source_document_name?: string;
  status: string;
  total_debit: number;
  total_credit: number;
  created_by?: string;
  created_at: string;
  posted_by?: string;
  posted_at?: string;
  lines: JournalLine[];
}

export interface JournalEntryCreate {
  company_id: string;
  reference: string;
  entry_date: string;
  posting_date: string;
  description: string;
  source?: string;
  source_document_hash?: string;
  source_document_name?: string;
  lines: Omit<JournalLine, 'id' | 'account_name'>[];
}

export interface ChartOfAccount {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_type: string;
  parent_account_id?: string;
  description?: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}


export interface ARInvoiceLine {
  id?: string;
  line_number: number;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

export interface ARInvoice {
  id: string;
  company_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  balance_due: number;
  status: string;
  sales_order_id?: string;
  notes?: string;
  created_at: string;
  lines: ARInvoiceLine[];
  gl_entry_id?: string;
}

export interface ARInvoiceCreate {
  customer_id: string;
  invoice_date: string;
  due_date: string;
  sales_order_id?: string;
  notes?: string;
  lines: Omit<ARInvoiceLine, 'id' | 'line_total'>[];
}

export interface Receipt {
  id: string;
  company_id: string;
  receipt_number: string;
  customer_id: string;
  customer_name?: string;
  receipt_date: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  status: string;
  created_at: string;
  gl_entry_id?: string;
}


export interface StockOnHand {
  id: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  storage_location_id?: string;
  location_name?: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  last_movement_date?: string;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  warehouse_id: string;
  storage_location_id?: string;
  movement_type: string;
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  transaction_date: string;
  notes?: string;
  created_by?: string;
}


export interface BOMComponent {
  id?: string;
  line_number: number;
  component_product_id: string;
  component_code?: string;
  component_name?: string;
  quantity: number;
  unit_of_measure: string;
  scrap_percentage: number;
}

export interface BOM {
  id: string;
  company_id: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  bom_number: string;
  version: number;
  status: string;
  effective_date: string;
  expiry_date?: string;
  notes?: string;
  created_at: string;
  components: BOMComponent[];
}

export interface WorkOrder {
  id: string;
  company_id: string;
  work_order_number: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  bom_id?: string;
  quantity_to_produce: number;
  quantity_produced: number;
  status: string;
  start_date: string;
  due_date?: string;
  completed_date?: string;
  warehouse_id?: string;
  notes?: string;
  created_at: string;
  gl_entry_id?: string;
}


export interface ServiceRequest {
  id: string;
  company_id: string;
  request_number: string;
  customer_id: string;
  customer_name?: string;
  request_date: string;
  priority: string;
  status: string;
  description: string;
  notes?: string;
  created_at: string;
}

export interface ServiceWorkOrder {
  id: string;
  company_id: string;
  work_order_number: string;
  service_request_id?: string;
  customer_id: string;
  customer_name?: string;
  technician_id?: string;
  technician_name?: string;
  scheduled_date?: string;
  completed_date?: string;
  status: string;
  description: string;
  notes?: string;
  created_at: string;
  gl_entry_id?: string;
}


export interface Bot {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
}

export interface BotExecution {
  id: string;
  bot_id: string;
  bot_name: string;
  document_type?: string;
  document_id?: string;
  status: string;
  started_at: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

export interface ARIAProcessLog {
  id: string;
  document_type: string;
  document_id: string;
  action: string;
  status: string;
  executed_at: string;
  bots_executed: string[];
  result?: any;
}


export interface GLPostingResult {
  status: string;
  message?: string;
  entry_id?: string;
  posted?: boolean;
  gl_posted?: boolean;
  gl_entry_id?: string;
}

export interface StatusTransitionResult {
  message: string;
  status: string;
  gl_posted?: boolean;
  gl_entry_id?: string;
}
