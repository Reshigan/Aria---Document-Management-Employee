// Connector/Job Framework Service - Generic integration framework with retries, throttling, and audit

import { D1Database } from '@cloudflare/workers-types';

interface Connector {
  id: string;
  company_id: string;
  connector_type: 'bank' | 'accounting' | 'ecommerce' | 'shipping' | 'social' | 'payment';
  provider: string;
  name: string;
  config?: Record<string, unknown>;
  credentials_token_id?: string;
  status: 'pending' | 'connected' | 'error' | 'disabled';
  last_sync_at?: string;
  sync_frequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  error_message?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Job {
  id: string;
  company_id: string;
  connector_id?: string;
  job_type: 'sync' | 'export' | 'import' | 'post' | 'webhook';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error_message?: string;
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface ConnectorInput {
  company_id: string;
  connector_type: Connector['connector_type'];
  provider: string;
  name: string;
  config?: Record<string, unknown>;
  credentials_token_id?: string;
  sync_frequency?: Connector['sync_frequency'];
}

interface JobInput {
  company_id: string;
  connector_id?: string;
  job_type: Job['job_type'];
  priority?: number;
  payload?: Record<string, unknown>;
  max_attempts?: number;
}

// Retry backoff configuration
const RETRY_DELAYS = [60, 300, 900, 3600]; // 1min, 5min, 15min, 1hour

// Rate limits per provider (requests per hour)
const RATE_LIMITS: Record<string, number> = {
  linkedin: 100,
  facebook: 200,
  quickbooks: 500,
  xero: 1000,
  shopify: 2000,
  plaid: 100,
  stripe: 1000,
  default: 500
};

// Create a new connector
export async function createConnector(db: D1Database, input: ConnectorInput): Promise<Connector> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO integration_connectors (
      id, company_id, connector_type, provider, name, config, 
      credentials_token_id, status, sync_frequency, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.connector_type,
    input.provider,
    input.name,
    input.config ? JSON.stringify(input.config) : null,
    input.credentials_token_id || null,
    input.sync_frequency || 'hourly',
    now,
    now
  ).run();
  
  return {
    id,
    company_id: input.company_id,
    connector_type: input.connector_type,
    provider: input.provider,
    name: input.name,
    config: input.config,
    credentials_token_id: input.credentials_token_id,
    status: 'pending',
    sync_frequency: input.sync_frequency || 'hourly',
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get connector by ID
export async function getConnector(db: D1Database, connectorId: string): Promise<Connector | null> {
  const result = await db.prepare(`
    SELECT * FROM integration_connectors WHERE id = ?
  `).bind(connectorId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    config: result.config ? JSON.parse(result.config as string) : undefined,
    is_active: Boolean(result.is_active)
  } as Connector;
}

// List connectors for a company
export async function listConnectors(
  db: D1Database,
  companyId: string,
  connectorType?: Connector['connector_type']
): Promise<Connector[]> {
  let query = 'SELECT * FROM integration_connectors WHERE company_id = ?';
  const params: string[] = [companyId];
  
  if (connectorType) {
    query += ' AND connector_type = ?';
    params.push(connectorType);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    config: row.config ? JSON.parse(row.config as string) : undefined,
    is_active: Boolean(row.is_active)
  })) as Connector[];
}

// Update connector status
export async function updateConnectorStatus(
  db: D1Database,
  connectorId: string,
  status: Connector['status'],
  errorMessage?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE integration_connectors 
    SET status = ?, error_message = ?, updated_at = ?, last_sync_at = ?
    WHERE id = ?
  `).bind(status, errorMessage || null, now, status === 'connected' ? now : null, connectorId).run();
}

// Create a new job
export async function createJob(db: D1Database, input: JobInput): Promise<Job> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO integration_jobs (
      id, company_id, connector_id, job_type, status, priority, 
      payload, attempts, max_attempts, created_at
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, 0, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.connector_id || null,
    input.job_type,
    input.priority || 5,
    input.payload ? JSON.stringify(input.payload) : null,
    input.max_attempts || 3,
    now
  ).run();
  
  return {
    id,
    company_id: input.company_id,
    connector_id: input.connector_id,
    job_type: input.job_type,
    status: 'pending',
    priority: input.priority || 5,
    payload: input.payload,
    attempts: 0,
    max_attempts: input.max_attempts || 3,
    created_at: now
  };
}

// Get pending jobs ready to process
export async function getPendingJobs(db: D1Database, limit: number = 10): Promise<Job[]> {
  const now = new Date().toISOString();
  
  const results = await db.prepare(`
    SELECT * FROM integration_jobs 
    WHERE status = 'pending' 
      AND (next_retry_at IS NULL OR next_retry_at <= ?)
    ORDER BY priority ASC, created_at ASC
    LIMIT ?
  `).bind(now, limit).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    payload: row.payload ? JSON.parse(row.payload as string) : undefined,
    result: row.result ? JSON.parse(row.result as string) : undefined
  })) as Job[];
}

// Start processing a job
export async function startJob(db: D1Database, jobId: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE integration_jobs 
    SET status = 'running', started_at = ?, attempts = attempts + 1
    WHERE id = ?
  `).bind(now, jobId).run();
}

// Complete a job successfully
export async function completeJob(
  db: D1Database,
  jobId: string,
  result?: Record<string, unknown>
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE integration_jobs 
    SET status = 'completed', completed_at = ?, result = ?
    WHERE id = ?
  `).bind(now, result ? JSON.stringify(result) : null, jobId).run();
}

// Fail a job (with retry logic)
export async function failJob(
  db: D1Database,
  jobId: string,
  errorMessage: string
): Promise<{ willRetry: boolean; nextRetryAt?: string }> {
  const job = await db.prepare(`
    SELECT * FROM integration_jobs WHERE id = ?
  `).bind(jobId).first() as Job | null;
  
  if (!job) {
    throw new Error('Job not found');
  }
  
  const now = new Date().toISOString();
  const attempts = job.attempts + 1;
  
  if (attempts >= job.max_attempts) {
    // Max retries reached, mark as failed
    await db.prepare(`
      UPDATE integration_jobs 
      SET status = 'failed', error_message = ?, completed_at = ?
      WHERE id = ?
    `).bind(errorMessage, now, jobId).run();
    
    return { willRetry: false };
  }
  
  // Calculate next retry time with exponential backoff
  const delaySeconds = RETRY_DELAYS[Math.min(attempts - 1, RETRY_DELAYS.length - 1)];
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
  
  await db.prepare(`
    UPDATE integration_jobs 
    SET status = 'pending', error_message = ?, next_retry_at = ?
    WHERE id = ?
  `).bind(errorMessage, nextRetryAt, jobId).run();
  
  return { willRetry: true, nextRetryAt };
}

// Cancel a job
export async function cancelJob(db: D1Database, jobId: string): Promise<void> {
  await db.prepare(`
    UPDATE integration_jobs SET status = 'cancelled' WHERE id = ?
  `).bind(jobId).run();
}

// Check rate limit for a provider
export async function checkRateLimit(
  db: D1Database,
  companyId: string,
  provider: string
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const limit = RATE_LIMITS[provider] || RATE_LIMITS.default;
  
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM integration_jobs 
    WHERE company_id = ? 
      AND connector_id IN (SELECT id FROM integration_connectors WHERE provider = ?)
      AND created_at > ?
  `).bind(companyId, provider, hourAgo).first<{ count: number }>();
  
  const count = result?.count || 0;
  const resetAt = new Date(Date.now() + 3600000).toISOString();
  
  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count),
    resetAt
  };
}

// Process jobs in batch (called by scheduled handler)
export async function processJobs(
  db: D1Database,
  executor: (job: Job, connector?: Connector) => Promise<Record<string, unknown>>
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const jobs = await getPendingJobs(db, 10);
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  for (const job of jobs) {
    processed++;
    
    try {
      await startJob(db, job.id);
      
      // Get connector if job has one
      let connector: Connector | undefined;
      if (job.connector_id) {
        connector = await getConnector(db, job.connector_id) || undefined;
      }
      
      // Execute the job
      const result = await executor(job, connector);
      await completeJob(db, job.id, result);
      succeeded++;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await failJob(db, job.id, errorMessage);
      failed++;
    }
  }
  
  return { processed, succeeded, failed };
}

// Get job statistics
export async function getJobStats(
  db: D1Database,
  companyId?: string
): Promise<{
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}> {
  let query = `
    SELECT 
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      COUNT(*) as total
    FROM integration_jobs
  `;
  
  if (companyId) {
    query += ' WHERE company_id = ?';
    const result = await db.prepare(query).bind(companyId).first();
    return result as { pending: number; running: number; completed: number; failed: number; total: number };
  }
  
  const result = await db.prepare(query).first();
  return result as { pending: number; running: number; completed: number; failed: number; total: number };
}

// Clean up old completed/failed jobs
export async function cleanupOldJobs(db: D1Database, daysOld: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 3600000).toISOString();
  
  const result = await db.prepare(`
    DELETE FROM integration_jobs 
    WHERE status IN ('completed', 'failed', 'cancelled') 
      AND created_at < ?
  `).bind(cutoff).run();
  
  return result.meta.changes || 0;
}

// Sync connector (trigger a sync job)
export async function triggerSync(
  db: D1Database,
  connectorId: string,
  syncType: 'full' | 'incremental' = 'incremental'
): Promise<Job> {
  const connector = await getConnector(db, connectorId);
  if (!connector) {
    throw new Error('Connector not found');
  }
  
  return createJob(db, {
    company_id: connector.company_id,
    connector_id: connectorId,
    job_type: 'sync',
    priority: syncType === 'full' ? 1 : 5,
    payload: { sync_type: syncType }
  });
}

// Get connectors due for sync
export async function getConnectorsDueForSync(db: D1Database): Promise<Connector[]> {
  const now = new Date();
  
  const results = await db.prepare(`
    SELECT * FROM integration_connectors 
    WHERE is_active = 1 AND status = 'connected'
    ORDER BY last_sync_at ASC NULLS FIRST
  `).all();
  
  return (results.results || []).filter((connector: Record<string, unknown>) => {
    const lastSync = connector.last_sync_at ? new Date(connector.last_sync_at as string) : null;
    const frequency = connector.sync_frequency as string;
    
    if (!lastSync) return true;
    
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / 3600000;
    
    switch (frequency) {
      case 'realtime': return hoursSinceSync >= 0.25; // 15 minutes
      case 'hourly': return hoursSinceSync >= 1;
      case 'daily': return hoursSinceSync >= 24;
      case 'manual': return false;
      default: return hoursSinceSync >= 1;
    }
  }).map((row: Record<string, unknown>) => ({
    ...row,
    config: row.config ? JSON.parse(row.config as string) : undefined,
    is_active: Boolean(row.is_active)
  })) as Connector[];
}
