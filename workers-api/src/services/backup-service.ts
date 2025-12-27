// Backup & Restore Service - D1 Database Backup Automation

import { D1Database } from '@cloudflare/workers-types';

interface BackupJob {
  id: string;
  company_id?: string;
  backup_type: 'full' | 'incremental' | 'schema' | 'data';
  status: 'pending' | 'running' | 'completed' | 'failed';
  storage_location?: string;
  file_size_bytes?: number;
  tables_included?: string[];
  tables_excluded?: string[];
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retention_days: number;
  created_at: string;
}

interface RestoreJob {
  id: string;
  backup_job_id: string;
  company_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tables_restored?: string[];
  rows_restored?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

interface BackupSchedule {
  id: string;
  company_id?: string;
  name: string;
  backup_type: BackupJob['backup_type'];
  schedule_cron: string;
  retention_days: number;
  tables_included?: string[];
  tables_excluded?: string[];
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

// Core tables that should always be backed up
const CORE_TABLES = [
  'companies',
  'users',
  'customers',
  'suppliers',
  'products',
  'invoices',
  'invoice_lines',
  'ap_invoices',
  'ap_invoice_lines',
  'sales_orders',
  'sales_order_lines',
  'purchase_orders',
  'purchase_order_lines',
  'gl_accounts',
  'gl_journal_entries',
  'gl_journal_lines',
  'inventory',
  'payments',
  'ar_receipts'
];

// Tables that can be excluded from backups (logs, temporary data)
const EXCLUDABLE_TABLES = [
  'audit_logs',
  'integration_jobs',
  'system_alerts',
  'marketing_posts',
  'marketing_analytics'
];

// Create a backup job
export async function createBackupJob(
  db: D1Database,
  input: {
    company_id?: string;
    backup_type: BackupJob['backup_type'];
    tables_included?: string[];
    tables_excluded?: string[];
    retention_days?: number;
  }
): Promise<BackupJob> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO backup_jobs (
      id, company_id, backup_type, status, tables_included, tables_excluded,
      retention_days, created_at
    ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id || null,
    input.backup_type,
    input.tables_included ? JSON.stringify(input.tables_included) : null,
    input.tables_excluded ? JSON.stringify(input.tables_excluded) : null,
    input.retention_days || 30,
    now
  ).run();
  
  return {
    id,
    company_id: input.company_id,
    backup_type: input.backup_type,
    status: 'pending',
    tables_included: input.tables_included,
    tables_excluded: input.tables_excluded,
    retention_days: input.retention_days || 30,
    created_at: now
  };
}

// Get backup job by ID
export async function getBackupJob(db: D1Database, jobId: string): Promise<BackupJob | null> {
  const result = await db.prepare(`
    SELECT * FROM backup_jobs WHERE id = ?
  `).bind(jobId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    tables_included: result.tables_included ? JSON.parse(result.tables_included as string) : undefined,
    tables_excluded: result.tables_excluded ? JSON.parse(result.tables_excluded as string) : undefined
  } as BackupJob;
}

// List backup jobs
export async function listBackupJobs(
  db: D1Database,
  options: {
    companyId?: string;
    status?: BackupJob['status'];
    limit?: number;
  } = {}
): Promise<BackupJob[]> {
  let query = 'SELECT * FROM backup_jobs WHERE 1=1';
  const params: (string | number)[] = [];
  
  if (options.companyId) {
    query += ' AND (company_id = ? OR company_id IS NULL)';
    params.push(options.companyId);
  }
  
  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    tables_included: row.tables_included ? JSON.parse(row.tables_included as string) : undefined,
    tables_excluded: row.tables_excluded ? JSON.parse(row.tables_excluded as string) : undefined
  })) as BackupJob[];
}

// Execute backup job
export async function executeBackup(
  db: D1Database,
  jobId: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  const job = await getBackupJob(db, jobId);
  if (!job) throw new Error('Backup job not found');
  
  const now = new Date().toISOString();
  
  // Update job status to running
  await db.prepare(`
    UPDATE backup_jobs SET status = 'running', started_at = ? WHERE id = ?
  `).bind(now, jobId).run();
  
  try {
    // Determine which tables to backup
    let tablesToBackup = job.tables_included || CORE_TABLES;
    
    if (job.tables_excluded) {
      tablesToBackup = tablesToBackup.filter(t => !job.tables_excluded?.includes(t));
    }
    
    // For company-specific backups, filter data by company_id
    const companyFilter = job.company_id ? `WHERE company_id = '${job.company_id}'` : '';
    
    const backupData: Record<string, unknown[]> = {};
    let totalRows = 0;
    
    for (const table of tablesToBackup) {
      try {
        // Check if table has company_id column
        const tableInfo = await db.prepare(`PRAGMA table_info(${table})`).all();
        const hasCompanyId = (tableInfo.results || []).some((col: Record<string, unknown>) => col.name === 'company_id');
        
        let query = `SELECT * FROM ${table}`;
        if (job.company_id && hasCompanyId) {
          query += ` WHERE company_id = ?`;
        }
        
        const results = await db.prepare(query).bind(...(job.company_id && hasCompanyId ? [job.company_id] : [])).all();
        backupData[table] = results.results || [];
        totalRows += backupData[table].length;
      } catch (tableError) {
        // Table might not exist, skip it
        console.log(`Skipping table ${table}: ${tableError}`);
      }
    }
    
    // Create backup JSON
    const backupJson = JSON.stringify({
      version: '1.0',
      created_at: now,
      company_id: job.company_id,
      backup_type: job.backup_type,
      tables: tablesToBackup,
      data: backupData,
      row_count: totalRows
    });
    
    const fileSizeBytes = new TextEncoder().encode(backupJson).length;
    
    // In production, this would upload to R2 or external storage
    // For now, we'll store a reference
    const storageLocation = `backups/${job.company_id || 'system'}/${jobId}.json`;
    
    // Update job as completed
    await db.prepare(`
      UPDATE backup_jobs 
      SET status = 'completed', storage_location = ?, file_size_bytes = ?, completed_at = ?
      WHERE id = ?
    `).bind(storageLocation, fileSizeBytes, new Date().toISOString(), jobId).run();
    
    return { success: true, data: backupJson };
    
  } catch (error) {
    // Update job as failed
    await db.prepare(`
      UPDATE backup_jobs SET status = 'failed', error_message = ?, completed_at = ?
      WHERE id = ?
    `).bind(String(error), new Date().toISOString(), jobId).run();
    
    return { success: false, error: String(error) };
  }
}

// Create restore job
export async function createRestoreJob(
  db: D1Database,
  backupJobId: string,
  companyId?: string
): Promise<RestoreJob> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO restore_jobs (
      id, backup_job_id, company_id, status, created_at
    ) VALUES (?, ?, ?, 'pending', ?)
  `).bind(id, backupJobId, companyId || null, now).run();
  
  return {
    id,
    backup_job_id: backupJobId,
    company_id: companyId,
    status: 'pending',
    created_at: now
  };
}

// Execute restore job
export async function executeRestore(
  db: D1Database,
  restoreJobId: string,
  backupData: string
): Promise<{ success: boolean; tablesRestored?: string[]; rowsRestored?: number; error?: string }> {
  const now = new Date().toISOString();
  
  // Update job status to running
  await db.prepare(`
    UPDATE restore_jobs SET status = 'running', started_at = ? WHERE id = ?
  `).bind(now, restoreJobId).run();
  
  try {
    const backup = JSON.parse(backupData);
    const tablesRestored: string[] = [];
    let rowsRestored = 0;
    
    for (const [table, rows] of Object.entries(backup.data as Record<string, unknown[]>)) {
      if (!rows || rows.length === 0) continue;
      
      // Get column names from first row
      const columns = Object.keys(rows[0] as Record<string, unknown>);
      const placeholders = columns.map(() => '?').join(', ');
      
      for (const row of rows) {
        const values = columns.map(col => (row as Record<string, unknown>)[col]);
        
        try {
          // Use INSERT OR REPLACE to handle existing records
          await db.prepare(`
            INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
          `).bind(...values).run();
          
          rowsRestored++;
        } catch (rowError) {
          console.log(`Error restoring row in ${table}: ${rowError}`);
        }
      }
      
      tablesRestored.push(table);
    }
    
    // Update job as completed
    await db.prepare(`
      UPDATE restore_jobs 
      SET status = 'completed', tables_restored = ?, rows_restored = ?, completed_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(tablesRestored), rowsRestored, new Date().toISOString(), restoreJobId).run();
    
    return { success: true, tablesRestored, rowsRestored };
    
  } catch (error) {
    // Update job as failed
    await db.prepare(`
      UPDATE restore_jobs SET status = 'failed', error_message = ?, completed_at = ?
      WHERE id = ?
    `).bind(String(error), new Date().toISOString(), restoreJobId).run();
    
    return { success: false, error: String(error) };
  }
}

// Create backup schedule
export async function createBackupSchedule(
  db: D1Database,
  input: Omit<BackupSchedule, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<BackupSchedule> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Calculate next run time based on cron
  const nextRunAt = calculateNextRun(input.schedule_cron);
  
  await db.prepare(`
    INSERT INTO backup_schedules (
      id, company_id, name, backup_type, schedule_cron, retention_days,
      tables_included, tables_excluded, is_active, next_run_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).bind(
    id,
    input.company_id || null,
    input.name,
    input.backup_type,
    input.schedule_cron,
    input.retention_days || 30,
    input.tables_included ? JSON.stringify(input.tables_included) : null,
    input.tables_excluded ? JSON.stringify(input.tables_excluded) : null,
    nextRunAt,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    next_run_at: nextRunAt,
    created_at: now,
    updated_at: now
  };
}

// Calculate next run time from cron expression (simplified)
function calculateNextRun(cronExpression: string): string {
  // Simplified cron parsing - in production use a proper cron library
  // Format: minute hour day month weekday
  const parts = cronExpression.split(' ');
  const now = new Date();
  
  // Default to next day at the specified time
  const nextRun = new Date(now);
  nextRun.setDate(nextRun.getDate() + 1);
  
  if (parts.length >= 2) {
    const minute = parts[0] === '*' ? 0 : parseInt(parts[0]);
    const hour = parts[1] === '*' ? 0 : parseInt(parts[1]);
    nextRun.setHours(hour, minute, 0, 0);
  }
  
  return nextRun.toISOString();
}

// Get backup schedules
export async function getBackupSchedules(
  db: D1Database,
  companyId?: string
): Promise<BackupSchedule[]> {
  let query = 'SELECT * FROM backup_schedules WHERE is_active = 1';
  const params: string[] = [];
  
  if (companyId) {
    query += ' AND (company_id = ? OR company_id IS NULL)';
    params.push(companyId);
  }
  
  query += ' ORDER BY name';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    tables_included: row.tables_included ? JSON.parse(row.tables_included as string) : undefined,
    tables_excluded: row.tables_excluded ? JSON.parse(row.tables_excluded as string) : undefined,
    is_active: Boolean(row.is_active)
  })) as BackupSchedule[];
}

// Run scheduled backups
export async function runScheduledBackups(db: D1Database): Promise<{ executed: number }> {
  const now = new Date().toISOString();
  
  // Get schedules due to run
  const dueSchedules = await db.prepare(`
    SELECT * FROM backup_schedules 
    WHERE is_active = 1 AND next_run_at <= ?
  `).bind(now).all();
  
  let executed = 0;
  
  for (const schedule of (dueSchedules.results || []) as unknown as BackupSchedule[]) {
    // Create backup job
    const job = await createBackupJob(db, {
      company_id: schedule.company_id,
      backup_type: schedule.backup_type,
      tables_included: schedule.tables_included,
      tables_excluded: schedule.tables_excluded,
      retention_days: schedule.retention_days
    });
    
    // Execute backup
    await executeBackup(db, job.id);
    
    // Update schedule
    const nextRunAt = calculateNextRun(schedule.schedule_cron);
    await db.prepare(`
      UPDATE backup_schedules 
      SET last_run_at = ?, next_run_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, nextRunAt, now, schedule.id).run();
    
    executed++;
  }
  
  return { executed };
}

// Clean up old backups
export async function cleanupOldBackups(db: D1Database): Promise<{ deleted: number }> {
  const now = new Date();
  
  // Get expired backups
  const expiredBackups = await db.prepare(`
    SELECT id, storage_location, retention_days, created_at 
    FROM backup_jobs 
    WHERE status = 'completed'
  `).all();
  
  let deleted = 0;
  
  for (const backup of (expiredBackups.results || []) as Array<{ id: string; storage_location: string; retention_days: number; created_at: string }>) {
    const createdAt = new Date(backup.created_at);
    const expiryDate = new Date(createdAt);
    expiryDate.setDate(expiryDate.getDate() + backup.retention_days);
    
    if (now > expiryDate) {
      // In production, delete from R2 storage
      // For now, just mark as deleted
      await db.prepare(`
        DELETE FROM backup_jobs WHERE id = ?
      `).bind(backup.id).run();
      
      deleted++;
    }
  }
  
  return { deleted };
}

// Get backup summary
export async function getBackupSummary(
  db: D1Database,
  companyId?: string
): Promise<{
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  total_size_bytes: number;
  last_backup_at?: string;
  active_schedules: number;
}> {
  let whereClause = '';
  const params: string[] = [];
  
  if (companyId) {
    whereClause = 'WHERE (company_id = ? OR company_id IS NULL)';
    params.push(companyId);
  }
  
  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as total_backups,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_backups,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_backups,
      COALESCE(SUM(file_size_bytes), 0) as total_size_bytes,
      MAX(completed_at) as last_backup_at
    FROM backup_jobs ${whereClause}
  `).bind(...params).first();
  
  const schedules = await db.prepare(`
    SELECT COUNT(*) as count FROM backup_schedules 
    WHERE is_active = 1 ${companyId ? 'AND (company_id = ? OR company_id IS NULL)' : ''}
  `).bind(...(companyId ? [companyId] : [])).first<{ count: number }>();
  
  return {
    total_backups: (stats as Record<string, number>)?.total_backups || 0,
    successful_backups: (stats as Record<string, number>)?.successful_backups || 0,
    failed_backups: (stats as Record<string, number>)?.failed_backups || 0,
    total_size_bytes: (stats as Record<string, number>)?.total_size_bytes || 0,
    last_backup_at: (stats as Record<string, string>)?.last_backup_at,
    active_schedules: schedules?.count || 0
  };
}

// Export table schema
export async function exportTableSchema(
  db: D1Database,
  tableName: string
): Promise<string> {
  const result = await db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?
  `).bind(tableName).first<{ sql: string }>();
  
  return result?.sql || '';
}

// Export all schemas
export async function exportAllSchemas(db: D1Database): Promise<Record<string, string>> {
  const tables = await db.prepare(`
    SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  const schemas: Record<string, string> = {};
  
  for (const table of (tables.results || []) as Array<{ name: string; sql: string }>) {
    schemas[table.name] = table.sql;
  }
  
  return schemas;
}

// Verify backup integrity
export async function verifyBackupIntegrity(
  backupData: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    const backup = JSON.parse(backupData);
    
    // Check required fields
    if (!backup.version) errors.push('Missing version field');
    if (!backup.created_at) errors.push('Missing created_at field');
    if (!backup.data) errors.push('Missing data field');
    
    // Validate data structure
    if (backup.data && typeof backup.data === 'object') {
      for (const [table, rows] of Object.entries(backup.data)) {
        if (!Array.isArray(rows)) {
          errors.push(`Invalid data for table ${table}: expected array`);
        }
      }
    }
    
    // Check row count matches
    if (backup.row_count !== undefined) {
      let actualCount = 0;
      for (const rows of Object.values(backup.data as Record<string, unknown[]>)) {
        actualCount += (rows as unknown[]).length;
      }
      if (actualCount !== backup.row_count) {
        errors.push(`Row count mismatch: expected ${backup.row_count}, got ${actualCount}`);
      }
    }
    
  } catch (parseError) {
    errors.push(`Invalid JSON: ${parseError}`);
  }
  
  return { valid: errors.length === 0, errors };
}
