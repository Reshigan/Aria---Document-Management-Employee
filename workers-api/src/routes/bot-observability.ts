import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// BOT EXECUTION LOGS
// ============================================================================

// List bot executions
app.get('/executions', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const db = c.env.DB;
    
    const botId = c.req.query('bot_id');
    const status = c.req.query('status');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let query = `
      SELECT * FROM bot_executions WHERE company_id = ?
    `;
    const params: any[] = [companyId];
    
    if (botId) {
      query += ' AND bot_id = ?';
      params.push(botId);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (startDate) {
      query += ' AND started_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND started_at <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const executions = await db.prepare(query).bind(...params).all();
    
    // Get summary stats
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        AVG(duration_ms) as avg_duration_ms,
        SUM(records_processed) as total_records_processed,
        SUM(records_created) as total_records_created,
        SUM(records_updated) as total_records_updated,
        SUM(records_failed) as total_records_failed
      FROM bot_executions
      WHERE company_id = ?
      AND started_at >= datetime('now', '-7 days')
    `).bind(companyId).first();
    
    return c.json({
      executions: executions.results,
      stats,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Bot executions list error:', error);
    return c.json({ error: error.message || 'Failed to list executions' }, 500);
  }
});

// Get execution details
app.get('/executions/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const executionId = c.req.param('id');
    const db = c.env.DB;
    
    const execution = await db.prepare(`
      SELECT * FROM bot_executions WHERE id = ? AND company_id = ?
    `).bind(executionId, companyId).first();
    
    if (!execution) {
      return c.json({ error: 'Execution not found' }, 404);
    }
    
    // Get related exceptions
    const exceptions = await db.prepare(`
      SELECT * FROM bot_exceptions WHERE execution_id = ? ORDER BY created_at DESC
    `).bind(executionId).all();
    
    return c.json({
      ...(execution as any),
      input: JSON.parse((execution as any).input_json || '{}'),
      output: JSON.parse((execution as any).output_json || '{}'),
      exceptions: exceptions.results
    });
  } catch (error: any) {
    console.error('Execution details error:', error);
    return c.json({ error: error.message || 'Failed to get execution details' }, 500);
  }
});

// Start bot execution (for tracking)
app.post('/executions', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const body = await c.req.json();
    const db = c.env.DB;
    
    const executionId = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO bot_executions (
        id, company_id, bot_id, bot_name, trigger_type, trigger_source,
        status, started_at, input_json, is_dry_run
      ) VALUES (?, ?, ?, ?, ?, ?, 'running', ?, ?, ?)
    `).bind(
      executionId,
      companyId,
      body.bot_id,
      body.bot_name,
      body.trigger_type || 'manual',
      body.trigger_source || null,
      new Date().toISOString(),
      JSON.stringify(body.input || {}),
      body.is_dry_run ? 1 : 0
    ).run();
    
    return c.json({ success: true, execution_id: executionId });
  } catch (error: any) {
    console.error('Start execution error:', error);
    return c.json({ error: error.message || 'Failed to start execution' }, 500);
  }
});

// Update execution status
app.patch('/executions/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const executionId = c.req.param('id');
    const body = await c.req.json();
    const db = c.env.DB;
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (body.status) {
      updates.push('status = ?');
      params.push(body.status);
    }
    
    if (body.status === 'completed' || body.status === 'failed') {
      updates.push('completed_at = ?');
      params.push(new Date().toISOString());
    }
    
    if (body.duration_ms !== undefined) {
      updates.push('duration_ms = ?');
      params.push(body.duration_ms);
    }
    
    if (body.output !== undefined) {
      updates.push('output_json = ?');
      params.push(JSON.stringify(body.output));
    }
    
    if (body.error_message) {
      updates.push('error_message = ?');
      params.push(body.error_message);
    }
    
    if (body.error_stack) {
      updates.push('error_stack = ?');
      params.push(body.error_stack);
    }
    
    if (body.records_processed !== undefined) {
      updates.push('records_processed = ?');
      params.push(body.records_processed);
    }
    
    if (body.records_created !== undefined) {
      updates.push('records_created = ?');
      params.push(body.records_created);
    }
    
    if (body.records_updated !== undefined) {
      updates.push('records_updated = ?');
      params.push(body.records_updated);
    }
    
    if (body.records_failed !== undefined) {
      updates.push('records_failed = ?');
      params.push(body.records_failed);
    }
    
    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400);
    }
    
    params.push(executionId, companyId);
    
    await db.prepare(`
      UPDATE bot_executions SET ${updates.join(', ')} WHERE id = ? AND company_id = ?
    `).bind(...params).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Update execution error:', error);
    return c.json({ error: error.message || 'Failed to update execution' }, 500);
  }
});

// ============================================================================
// BOT EXCEPTIONS (Human-in-the-loop inbox)
// ============================================================================

// List exceptions
app.get('/exceptions', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const db = c.env.DB;
    
    const status = c.req.query('status') || 'pending';
    const severity = c.req.query('severity');
    const botId = c.req.query('bot_id');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let query = `
      SELECT * FROM bot_exceptions WHERE company_id = ?
    `;
    const params: any[] = [companyId];
    
    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }
    
    if (botId) {
      query += ' AND bot_id = ?';
      params.push(botId);
    }
    
    query += ' ORDER BY CASE severity WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, created_at DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const exceptions = await db.prepare(query).bind(...params).all();
    
    // Get counts by status
    const counts = await db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM bot_exceptions
      WHERE company_id = ?
      GROUP BY status
    `).bind(companyId).all();
    
    // Get counts by severity for pending
    const severityCounts = await db.prepare(`
      SELECT 
        severity,
        COUNT(*) as count
      FROM bot_exceptions
      WHERE company_id = ? AND status = 'pending'
      GROUP BY severity
    `).bind(companyId).all();
    
    return c.json({
      exceptions: exceptions.results.map((e: any) => ({
        ...e,
        affected_record_data: JSON.parse(e.affected_record_data_json || '{}')
      })),
      counts: Object.fromEntries((counts.results as any[]).map(r => [r.status, r.count])),
      severity_counts: Object.fromEntries((severityCounts.results as any[]).map(r => [r.severity, r.count])),
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Exceptions list error:', error);
    return c.json({ error: error.message || 'Failed to list exceptions' }, 500);
  }
});

// Get exception details
app.get('/exceptions/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const exceptionId = c.req.param('id');
    const db = c.env.DB;
    
    const exception = await db.prepare(`
      SELECT * FROM bot_exceptions WHERE id = ? AND company_id = ?
    `).bind(exceptionId, companyId).first();
    
    if (!exception) {
      return c.json({ error: 'Exception not found' }, 404);
    }
    
    // Get related execution
    let execution = null;
    if ((exception as any).execution_id) {
      execution = await db.prepare(`
        SELECT * FROM bot_executions WHERE id = ?
      `).bind((exception as any).execution_id).first();
    }
    
    return c.json({
      ...(exception as any),
      affected_record_data: JSON.parse((exception as any).affected_record_data_json || '{}'),
      execution
    });
  } catch (error: any) {
    console.error('Exception details error:', error);
    return c.json({ error: error.message || 'Failed to get exception details' }, 500);
  }
});

// Create exception
app.post('/exceptions', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const body = await c.req.json();
    const db = c.env.DB;
    
    const exceptionId = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO bot_exceptions (
        id, company_id, execution_id, bot_id, bot_name,
        exception_type, severity, title, description,
        affected_record_type, affected_record_id, affected_record_data_json,
        suggested_action, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      exceptionId,
      companyId,
      body.execution_id || null,
      body.bot_id,
      body.bot_name,
      body.exception_type,
      body.severity || 'medium',
      body.title,
      body.description || null,
      body.affected_record_type || null,
      body.affected_record_id || null,
      JSON.stringify(body.affected_record_data || {}),
      body.suggested_action || null
    ).run();
    
    return c.json({ success: true, exception_id: exceptionId });
  } catch (error: any) {
    console.error('Create exception error:', error);
    return c.json({ error: error.message || 'Failed to create exception' }, 500);
  }
});

// Resolve exception
app.post('/exceptions/:id/resolve', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const exceptionId = c.req.param('id');
    const body = await c.req.json();
    const db = c.env.DB;
    const userId = await getSecureUserId(c);
    
    await db.prepare(`
      UPDATE bot_exceptions SET
        status = 'resolved',
        resolved_by = ?,
        resolved_at = ?,
        resolution_action = ?,
        resolution_notes = ?,
        updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      userId,
      new Date().toISOString(),
      body.resolution_action,
      body.resolution_notes || null,
      new Date().toISOString(),
      exceptionId,
      companyId
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Resolve exception error:', error);
    return c.json({ error: error.message || 'Failed to resolve exception' }, 500);
  }
});

// Assign exception
app.post('/exceptions/:id/assign', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const exceptionId = c.req.param('id');
    const body = await c.req.json();
    const db = c.env.DB;
    
    await db.prepare(`
      UPDATE bot_exceptions SET
        assigned_to = ?,
        status = 'in_progress',
        updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      body.assigned_to,
      new Date().toISOString(),
      exceptionId,
      companyId
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Assign exception error:', error);
    return c.json({ error: error.message || 'Failed to assign exception' }, 500);
  }
});

// Dismiss exception
app.post('/exceptions/:id/dismiss', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const exceptionId = c.req.param('id');
    const body = await c.req.json();
    const db = c.env.DB;
    const userId = await getSecureUserId(c);
    
    await db.prepare(`
      UPDATE bot_exceptions SET
        status = 'dismissed',
        resolved_by = ?,
        resolved_at = ?,
        resolution_notes = ?,
        updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(
      userId,
      new Date().toISOString(),
      body.reason || 'Dismissed by user',
      new Date().toISOString(),
      exceptionId,
      companyId
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Dismiss exception error:', error);
    return c.json({ error: error.message || 'Failed to dismiss exception' }, 500);
  }
});

// ============================================================================
// BOT METRICS & DASHBOARD
// ============================================================================

// Get bot performance metrics
app.get('/metrics', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const db = c.env.DB;
    const period = c.req.query('period') || '7d';
    
    let dateFilter = "datetime('now', '-7 days')";
    if (period === '24h') dateFilter = "datetime('now', '-1 day')";
    if (period === '30d') dateFilter = "datetime('now', '-30 days')";
    if (period === '90d') dateFilter = "datetime('now', '-90 days')";
    
    // Overall metrics
    const overall = await db.prepare(`
      SELECT 
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate,
        AVG(duration_ms) as avg_duration_ms,
        SUM(records_processed) as total_records_processed,
        SUM(records_created) as total_records_created,
        SUM(records_updated) as total_records_updated
      FROM bot_executions
      WHERE company_id = ? AND started_at >= ${dateFilter}
    `).bind(companyId).first();
    
    // Per-bot metrics
    const perBot = await db.prepare(`
      SELECT 
        bot_id,
        bot_name,
        COUNT(*) as executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate,
        AVG(duration_ms) as avg_duration_ms,
        SUM(records_processed) as records_processed,
        MAX(started_at) as last_run
      FROM bot_executions
      WHERE company_id = ? AND started_at >= ${dateFilter}
      GROUP BY bot_id, bot_name
      ORDER BY executions DESC
    `).bind(companyId).all();
    
    // Executions over time
    const timeline = await db.prepare(`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM bot_executions
      WHERE company_id = ? AND started_at >= ${dateFilter}
      GROUP BY DATE(started_at)
      ORDER BY date
    `).bind(companyId).all();
    
    // Error taxonomy
    const errors = await db.prepare(`
      SELECT 
        exception_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM bot_exceptions
      WHERE company_id = ? AND created_at >= ${dateFilter}
      GROUP BY exception_type
      ORDER BY count DESC
      LIMIT 10
    `).bind(companyId).all();
    
    // Pending exceptions count
    const pendingExceptions = await db.prepare(`
      SELECT COUNT(*) as count FROM bot_exceptions
      WHERE company_id = ? AND status = 'pending'
    `).bind(companyId).first<{ count: number }>();
    
    return c.json({
      period,
      overall,
      per_bot: perBot.results,
      timeline: timeline.results,
      error_taxonomy: errors.results,
      pending_exceptions: pendingExceptions?.count || 0
    });
  } catch (error: any) {
    console.error('Bot metrics error:', error);
    return c.json({ error: error.message || 'Failed to get bot metrics' }, 500);
  }
});

// Get bot health status
app.get('/health', async (c) => {
  const companyId = await getSecureCompanyId(c);
  

  try {
    const db = c.env.DB;
    
    // Check for recent failures
    const recentFailures = await db.prepare(`
      SELECT COUNT(*) as count FROM bot_executions
      WHERE company_id = ? AND status = 'failed' AND started_at >= datetime('now', '-1 hour')
    `).bind(companyId).first<{ count: number }>();
    
    // Check for stuck executions
    const stuckExecutions = await db.prepare(`
      SELECT COUNT(*) as count FROM bot_executions
      WHERE company_id = ? AND status = 'running' AND started_at <= datetime('now', '-30 minutes')
    `).bind(companyId).first<{ count: number }>();
    
    // Check for critical exceptions
    const criticalExceptions = await db.prepare(`
      SELECT COUNT(*) as count FROM bot_exceptions
      WHERE company_id = ? AND status = 'pending' AND severity = 'critical'
    `).bind(companyId).first<{ count: number }>();
    
    // Calculate health score
    let healthScore = 100;
    const issues: string[] = [];
    
    if ((recentFailures?.count || 0) > 5) {
      healthScore -= 30;
      issues.push(`${recentFailures?.count} failures in the last hour`);
    } else if ((recentFailures?.count || 0) > 0) {
      healthScore -= 10;
      issues.push(`${recentFailures?.count} failures in the last hour`);
    }
    
    if ((stuckExecutions?.count || 0) > 0) {
      healthScore -= 20;
      issues.push(`${stuckExecutions?.count} stuck executions`);
    }
    
    if ((criticalExceptions?.count || 0) > 0) {
      healthScore -= 25;
      issues.push(`${criticalExceptions?.count} critical exceptions pending`);
    }
    
    let status = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 75) status = 'degraded';
    else if (healthScore < 90) status = 'warning';
    
    return c.json({
      status,
      health_score: Math.max(0, healthScore),
      issues,
      recent_failures: recentFailures?.count || 0,
      stuck_executions: stuckExecutions?.count || 0,
      critical_exceptions: criticalExceptions?.count || 0
    });
  } catch (error: any) {
    console.error('Bot health error:', error);
    return c.json({ error: error.message || 'Failed to get bot health' }, 500);
  }
});

export default app;
