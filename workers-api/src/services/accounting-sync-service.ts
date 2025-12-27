// Accounting Sync Service - QuickBooks/Xero integration

import { D1Database } from '@cloudflare/workers-types';

interface SyncMapping {
  id: string;
  company_id: string;
  connector_id: string;
  local_entity_type: string;
  local_entity_id: string;
  remote_entity_type: string;
  remote_entity_id: string;
  sync_direction: 'push' | 'pull' | 'bidirectional';
  last_synced_at?: string;
  sync_status: 'synced' | 'pending' | 'error' | 'conflict';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  company_id: string;
  connector_id: string;
  sync_type: 'full' | 'incremental' | 'entity';
  direction: 'push' | 'pull';
  entities_processed: number;
  entities_created: number;
  entities_updated: number;
  entities_failed: number;
  error_details?: string[];
  started_at?: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  created_at: string;
}

// Entity type mappings for different providers
const ENTITY_MAPPINGS: Record<string, Record<string, string>> = {
  quickbooks: {
    customer: 'Customer',
    supplier: 'Vendor',
    product: 'Item',
    invoice: 'Invoice',
    payment: 'Payment',
    account: 'Account',
    bill: 'Bill',
    journal: 'JournalEntry'
  },
  xero: {
    customer: 'Contact',
    supplier: 'Contact',
    product: 'Item',
    invoice: 'Invoice',
    payment: 'Payment',
    account: 'Account',
    bill: 'Invoice',
    journal: 'ManualJournal'
  }
};

// Create a sync mapping
export async function createSyncMapping(
  db: D1Database,
  input: Omit<SyncMapping, 'id' | 'created_at' | 'updated_at'>
): Promise<SyncMapping> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO accounting_sync_mappings (
      id, company_id, connector_id, local_entity_type, local_entity_id,
      remote_entity_type, remote_entity_id, sync_direction, last_synced_at,
      sync_status, error_message, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.connector_id,
    input.local_entity_type,
    input.local_entity_id,
    input.remote_entity_type,
    input.remote_entity_id,
    input.sync_direction,
    input.last_synced_at || null,
    input.sync_status,
    input.error_message || null,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    created_at: now,
    updated_at: now
  };
}

// Get sync mapping by local entity
export async function getSyncMappingByLocal(
  db: D1Database,
  connectorId: string,
  localEntityType: string,
  localEntityId: string
): Promise<SyncMapping | null> {
  const result = await db.prepare(`
    SELECT * FROM accounting_sync_mappings 
    WHERE connector_id = ? AND local_entity_type = ? AND local_entity_id = ?
  `).bind(connectorId, localEntityType, localEntityId).first();
  
  return result as SyncMapping | null;
}

// Get sync mapping by remote entity
export async function getSyncMappingByRemote(
  db: D1Database,
  connectorId: string,
  remoteEntityType: string,
  remoteEntityId: string
): Promise<SyncMapping | null> {
  const result = await db.prepare(`
    SELECT * FROM accounting_sync_mappings 
    WHERE connector_id = ? AND remote_entity_type = ? AND remote_entity_id = ?
  `).bind(connectorId, remoteEntityType, remoteEntityId).first();
  
  return result as SyncMapping | null;
}

// Update sync mapping status
export async function updateSyncMappingStatus(
  db: D1Database,
  mappingId: string,
  status: SyncMapping['sync_status'],
  errorMessage?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE accounting_sync_mappings 
    SET sync_status = ?, error_message = ?, last_synced_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(status, errorMessage || null, now, now, mappingId).run();
}

// Create sync log
export async function createSyncLog(
  db: D1Database,
  input: Omit<SyncLog, 'id' | 'created_at'>
): Promise<SyncLog> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO accounting_sync_logs (
      id, company_id, connector_id, sync_type, direction,
      entities_processed, entities_created, entities_updated, entities_failed,
      error_details, started_at, completed_at, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.connector_id,
    input.sync_type,
    input.direction,
    input.entities_processed,
    input.entities_created,
    input.entities_updated,
    input.entities_failed,
    input.error_details ? JSON.stringify(input.error_details) : null,
    input.started_at || null,
    input.completed_at || null,
    input.status,
    now
  ).run();
  
  return {
    id,
    ...input,
    created_at: now
  };
}

// Update sync log
export async function updateSyncLog(
  db: D1Database,
  logId: string,
  updates: Partial<Pick<SyncLog, 'entities_processed' | 'entities_created' | 'entities_updated' | 'entities_failed' | 'error_details' | 'completed_at' | 'status'>>
): Promise<void> {
  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (updates.entities_processed !== undefined) {
    setClauses.push('entities_processed = ?');
    values.push(updates.entities_processed);
  }
  if (updates.entities_created !== undefined) {
    setClauses.push('entities_created = ?');
    values.push(updates.entities_created);
  }
  if (updates.entities_updated !== undefined) {
    setClauses.push('entities_updated = ?');
    values.push(updates.entities_updated);
  }
  if (updates.entities_failed !== undefined) {
    setClauses.push('entities_failed = ?');
    values.push(updates.entities_failed);
  }
  if (updates.error_details !== undefined) {
    setClauses.push('error_details = ?');
    values.push(JSON.stringify(updates.error_details));
  }
  if (updates.completed_at !== undefined) {
    setClauses.push('completed_at = ?');
    values.push(updates.completed_at);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  
  if (setClauses.length === 0) return;
  
  values.push(logId);
  
  await db.prepare(`
    UPDATE accounting_sync_logs SET ${setClauses.join(', ')} WHERE id = ?
  `).bind(...values).run();
}

// Transform ARIA entity to QuickBooks format
export function transformToQuickBooks(entityType: string, entity: Record<string, unknown>): Record<string, unknown> {
  switch (entityType) {
    case 'customer':
      return {
        DisplayName: entity.name,
        PrimaryEmailAddr: entity.email ? { Address: entity.email } : undefined,
        PrimaryPhone: entity.phone ? { FreeFormNumber: entity.phone } : undefined,
        BillAddr: entity.address ? {
          Line1: (entity.address as Record<string, string>).line1,
          City: (entity.address as Record<string, string>).city,
          CountrySubDivisionCode: (entity.address as Record<string, string>).state,
          PostalCode: (entity.address as Record<string, string>).postal_code,
          Country: (entity.address as Record<string, string>).country
        } : undefined
      };
    
    case 'supplier':
      return {
        DisplayName: entity.name,
        PrimaryEmailAddr: entity.email ? { Address: entity.email } : undefined,
        PrimaryPhone: entity.phone ? { FreeFormNumber: entity.phone } : undefined
      };
    
    case 'product':
      return {
        Name: entity.name,
        Description: entity.description,
        Type: entity.type === 'service' ? 'Service' : 'Inventory',
        UnitPrice: entity.unit_price,
        PurchaseCost: entity.cost_price,
        TrackQtyOnHand: entity.type !== 'service',
        QtyOnHand: entity.quantity_on_hand || 0
      };
    
    case 'invoice':
      return {
        CustomerRef: { value: entity.customer_remote_id },
        TxnDate: entity.invoice_date,
        DueDate: entity.due_date,
        Line: (entity.lines as Array<Record<string, unknown>>)?.map((line, idx) => ({
          LineNum: idx + 1,
          Amount: line.amount,
          Description: line.description,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: line.product_remote_id },
            Qty: line.quantity,
            UnitPrice: line.unit_price
          }
        }))
      };
    
    default:
      return entity;
  }
}

// Transform ARIA entity to Xero format
export function transformToXero(entityType: string, entity: Record<string, unknown>): Record<string, unknown> {
  switch (entityType) {
    case 'customer':
    case 'supplier':
      return {
        Name: entity.name,
        EmailAddress: entity.email,
        Phones: entity.phone ? [{ PhoneType: 'DEFAULT', PhoneNumber: entity.phone }] : [],
        Addresses: entity.address ? [{
          AddressType: 'STREET',
          AddressLine1: (entity.address as Record<string, string>).line1,
          City: (entity.address as Record<string, string>).city,
          Region: (entity.address as Record<string, string>).state,
          PostalCode: (entity.address as Record<string, string>).postal_code,
          Country: (entity.address as Record<string, string>).country
        }] : [],
        IsCustomer: entityType === 'customer',
        IsSupplier: entityType === 'supplier'
      };
    
    case 'product':
      return {
        Code: entity.sku || entity.id,
        Name: entity.name,
        Description: entity.description,
        PurchaseDescription: entity.description,
        PurchaseDetails: {
          UnitPrice: entity.cost_price
        },
        SalesDetails: {
          UnitPrice: entity.unit_price
        },
        IsTrackedAsInventory: entity.type !== 'service',
        QuantityOnHand: entity.quantity_on_hand || 0
      };
    
    case 'invoice':
      return {
        Type: 'ACCREC',
        Contact: { ContactID: entity.customer_remote_id },
        Date: entity.invoice_date,
        DueDate: entity.due_date,
        LineItems: (entity.lines as Array<Record<string, unknown>>)?.map(line => ({
          Description: line.description,
          Quantity: line.quantity,
          UnitAmount: line.unit_price,
          ItemCode: line.product_sku
        }))
      };
    
    default:
      return entity;
  }
}

// Transform QuickBooks entity to ARIA format
export function transformFromQuickBooks(entityType: string, entity: Record<string, unknown>): Record<string, unknown> {
  switch (entityType) {
    case 'Customer':
      return {
        name: entity.DisplayName,
        email: (entity.PrimaryEmailAddr as Record<string, string>)?.Address,
        phone: (entity.PrimaryPhone as Record<string, string>)?.FreeFormNumber,
        address: entity.BillAddr ? {
          line1: (entity.BillAddr as Record<string, string>).Line1,
          city: (entity.BillAddr as Record<string, string>).City,
          state: (entity.BillAddr as Record<string, string>).CountrySubDivisionCode,
          postal_code: (entity.BillAddr as Record<string, string>).PostalCode,
          country: (entity.BillAddr as Record<string, string>).Country
        } : undefined
      };
    
    case 'Vendor':
      return {
        name: entity.DisplayName,
        email: (entity.PrimaryEmailAddr as Record<string, string>)?.Address,
        phone: (entity.PrimaryPhone as Record<string, string>)?.FreeFormNumber
      };
    
    case 'Item':
      return {
        name: entity.Name,
        description: entity.Description,
        type: entity.Type === 'Service' ? 'service' : 'inventory',
        unit_price: entity.UnitPrice,
        cost_price: entity.PurchaseCost,
        quantity_on_hand: entity.QtyOnHand
      };
    
    default:
      return entity;
  }
}

// Transform Xero entity to ARIA format
export function transformFromXero(entityType: string, entity: Record<string, unknown>): Record<string, unknown> {
  switch (entityType) {
    case 'Contact':
      const phones = entity.Phones as Array<Record<string, string>> || [];
      const addresses = entity.Addresses as Array<Record<string, string>> || [];
      const defaultPhone = phones.find(p => p.PhoneType === 'DEFAULT');
      const streetAddress = addresses.find(a => a.AddressType === 'STREET');
      
      return {
        name: entity.Name,
        email: entity.EmailAddress,
        phone: defaultPhone?.PhoneNumber,
        address: streetAddress ? {
          line1: streetAddress.AddressLine1,
          city: streetAddress.City,
          state: streetAddress.Region,
          postal_code: streetAddress.PostalCode,
          country: streetAddress.Country
        } : undefined
      };
    
    case 'Item':
      return {
        sku: entity.Code,
        name: entity.Name,
        description: entity.Description,
        type: entity.IsTrackedAsInventory ? 'inventory' : 'service',
        unit_price: (entity.SalesDetails as Record<string, number>)?.UnitPrice,
        cost_price: (entity.PurchaseDetails as Record<string, number>)?.UnitPrice,
        quantity_on_hand: entity.QuantityOnHand
      };
    
    default:
      return entity;
  }
}

// Get entities pending sync
export async function getEntitiesPendingSync(
  db: D1Database,
  connectorId: string,
  entityType: string,
  limit: number = 100
): Promise<SyncMapping[]> {
  const results = await db.prepare(`
    SELECT * FROM accounting_sync_mappings 
    WHERE connector_id = ? AND local_entity_type = ? AND sync_status = 'pending'
    ORDER BY updated_at ASC
    LIMIT ?
  `).bind(connectorId, entityType, limit).all();
  
  return (results.results || []) as unknown as SyncMapping[];
}

// Get sync logs for a connector
export async function getSyncLogs(
  db: D1Database,
  connectorId: string,
  limit: number = 50
): Promise<SyncLog[]> {
  const results = await db.prepare(`
    SELECT * FROM accounting_sync_logs 
    WHERE connector_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(connectorId, limit).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    error_details: row.error_details ? JSON.parse(row.error_details as string) : undefined
  })) as SyncLog[];
}

// Get sync summary for dashboard
export async function getSyncSummary(
  db: D1Database,
  companyId: string
): Promise<{
  total_mappings: number;
  synced: number;
  pending: number;
  errors: number;
  last_sync_at?: string;
  connectors: Array<{
    connector_id: string;
    provider: string;
    status: string;
    last_sync_at?: string;
  }>;
}> {
  const mappingStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_mappings,
      SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
      SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN sync_status = 'error' THEN 1 ELSE 0 END) as errors,
      MAX(last_synced_at) as last_sync_at
    FROM accounting_sync_mappings m
    JOIN integration_connectors c ON m.connector_id = c.id
    WHERE c.company_id = ? AND c.connector_type = 'accounting'
  `).bind(companyId).first();
  
  const connectors = await db.prepare(`
    SELECT c.id as connector_id, c.provider, c.status, c.last_sync_at
    FROM integration_connectors c
    WHERE c.company_id = ? AND c.connector_type = 'accounting' AND c.is_active = 1
  `).bind(companyId).all();
  
  return {
    total_mappings: (mappingStats as Record<string, number>)?.total_mappings || 0,
    synced: (mappingStats as Record<string, number>)?.synced || 0,
    pending: (mappingStats as Record<string, number>)?.pending || 0,
    errors: (mappingStats as Record<string, number>)?.errors || 0,
    last_sync_at: (mappingStats as Record<string, string>)?.last_sync_at,
    connectors: (connectors.results || []) as Array<{
      connector_id: string;
      provider: string;
      status: string;
      last_sync_at?: string;
    }>
  };
}

// Export data to CSV for accounting import
export async function exportToCSV(
  db: D1Database,
  companyId: string,
  entityType: 'customers' | 'suppliers' | 'products' | 'invoices' | 'bills',
  dateFrom?: string,
  dateTo?: string
): Promise<string> {
  let query: string;
  let params: string[] = [companyId];
  
  switch (entityType) {
    case 'customers':
      query = 'SELECT id, name, email, phone, address, created_at FROM customers WHERE company_id = ?';
      break;
    case 'suppliers':
      query = 'SELECT id, name, email, phone, address, created_at FROM suppliers WHERE company_id = ?';
      break;
    case 'products':
      query = 'SELECT id, sku, name, description, unit_price, cost_price, quantity_on_hand FROM products WHERE company_id = ?';
      break;
    case 'invoices':
      query = 'SELECT id, invoice_number, customer_id, invoice_date, due_date, total_amount, status FROM invoices WHERE company_id = ?';
      if (dateFrom) {
        query += ' AND invoice_date >= ?';
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ' AND invoice_date <= ?';
        params.push(dateTo);
      }
      break;
    case 'bills':
      query = 'SELECT id, invoice_number, supplier_id, invoice_date, due_date, total_amount, status FROM ap_invoices WHERE company_id = ?';
      if (dateFrom) {
        query += ' AND invoice_date >= ?';
        params.push(dateFrom);
      }
      if (dateTo) {
        query += ' AND invoice_date <= ?';
        params.push(dateTo);
      }
      break;
    default:
      throw new Error('Invalid entity type');
  }
  
  const results = await db.prepare(query).bind(...params).all();
  const rows = results.results || [];
  
  if (rows.length === 0) return '';
  
  // Get headers from first row
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  
  // Build CSV
  const csvLines = [headers.join(',')];
  
  for (const row of rows) {
    const values = headers.map(header => {
      const value = (row as Record<string, unknown>)[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csvLines.push(values.join(','));
  }
  
  return csvLines.join('\n');
}
