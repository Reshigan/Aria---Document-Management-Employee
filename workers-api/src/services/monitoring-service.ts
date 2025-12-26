// Monitoring & Alerting Service

import { D1Database } from '@cloudflare/workers-types';

interface SystemAlert {
  id: string;
  company_id?: string;
  alert_type: 'error' | 'warning' | 'info' | 'critical';
  category: 'system' | 'integration' | 'job' | 'security' | 'performance' | 'business';
  title: string;
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}

interface AlertRule {
  id: string;
  company_id?: string;
  name: string;
  description?: string;
  category: SystemAlert['category'];
  condition_type: 'threshold' | 'pattern' | 'absence' | 'rate';
  condition_config: {
    metric?: string;
    operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold?: number;
    pattern?: string;
    time_window_minutes?: number;
    count_threshold?: number;
  };
  severity: SystemAlert['alert_type'];
  notification_channels: string[];
  cooldown_minutes: number;
  is_active: boolean;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms?: number;
  last_check: string;
  details?: Record<string, unknown>;
}

interface Metric {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: string;
}

// Create a system alert
export async function createAlert(
  db: D1Database,
  input: Omit<SystemAlert, 'id' | 'created_at' | 'status'>
): Promise<SystemAlert> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO system_alerts (
      id, company_id, alert_type, category, title, message, source,
      metadata, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).bind(
    id,
    input.company_id || null,
    input.alert_type,
    input.category,
    input.title,
    input.message,
    input.source || null,
    input.metadata ? JSON.stringify(input.metadata) : null,
    now
  ).run();
  
  return {
    id,
    ...input,
    status: 'active',
    created_at: now
  };
}

// Get active alerts
export async function getActiveAlerts(
  db: D1Database,
  companyId?: string,
  category?: SystemAlert['category']
): Promise<SystemAlert[]> {
  let query = 'SELECT * FROM system_alerts WHERE status = \'active\'';
  const params: string[] = [];
  
  if (companyId) {
    query += ' AND (company_id = ? OR company_id IS NULL)';
    params.push(companyId);
  }
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY CASE alert_type WHEN \'critical\' THEN 1 WHEN \'error\' THEN 2 WHEN \'warning\' THEN 3 ELSE 4 END, created_at DESC';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
  })) as SystemAlert[];
}

// Acknowledge an alert
export async function acknowledgeAlert(
  db: D1Database,
  alertId: string,
  acknowledgedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE system_alerts 
    SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = ?
    WHERE id = ?
  `).bind(acknowledgedBy, now, alertId).run();
}

// Resolve an alert
export async function resolveAlert(
  db: D1Database,
  alertId: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE system_alerts SET status = 'resolved', resolved_at = ? WHERE id = ?
  `).bind(now, alertId).run();
}

// Dismiss an alert
export async function dismissAlert(
  db: D1Database,
  alertId: string
): Promise<void> {
  await db.prepare(`
    UPDATE system_alerts SET status = 'dismissed' WHERE id = ?
  `).bind(alertId).run();
}

// Create an alert rule
export async function createAlertRule(
  db: D1Database,
  input: Omit<AlertRule, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<AlertRule> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO alert_rules (
      id, company_id, name, description, category, condition_type,
      condition_config, severity, notification_channels, cooldown_minutes,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id || null,
    input.name,
    input.description || null,
    input.category,
    input.condition_type,
    JSON.stringify(input.condition_config),
    input.severity,
    JSON.stringify(input.notification_channels),
    input.cooldown_minutes || 60,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get alert rules
export async function getAlertRules(
  db: D1Database,
  companyId?: string
): Promise<AlertRule[]> {
  let query = 'SELECT * FROM alert_rules WHERE is_active = 1';
  const params: string[] = [];
  
  if (companyId) {
    query += ' AND (company_id = ? OR company_id IS NULL)';
    params.push(companyId);
  }
  
  query += ' ORDER BY name';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    condition_config: JSON.parse(row.condition_config as string),
    notification_channels: JSON.parse(row.notification_channels as string),
    is_active: Boolean(row.is_active)
  })) as AlertRule[];
}

// Evaluate alert rules
export async function evaluateAlertRules(
  db: D1Database,
  metrics: Metric[]
): Promise<SystemAlert[]> {
  const rules = await getAlertRules(db);
  const triggeredAlerts: SystemAlert[] = [];
  const now = new Date();
  
  for (const rule of rules) {
    // Check cooldown
    if (rule.last_triggered_at) {
      const lastTriggered = new Date(rule.last_triggered_at);
      const cooldownMs = rule.cooldown_minutes * 60 * 1000;
      if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
        continue;
      }
    }
    
    let shouldTrigger = false;
    let triggerMessage = '';
    
    switch (rule.condition_type) {
      case 'threshold':
        const metric = metrics.find(m => m.name === rule.condition_config.metric);
        if (metric) {
          const threshold = rule.condition_config.threshold || 0;
          const operator = rule.condition_config.operator || 'gt';
          
          switch (operator) {
            case 'gt':
              shouldTrigger = metric.value > threshold;
              break;
            case 'lt':
              shouldTrigger = metric.value < threshold;
              break;
            case 'eq':
              shouldTrigger = metric.value === threshold;
              break;
            case 'gte':
              shouldTrigger = metric.value >= threshold;
              break;
            case 'lte':
              shouldTrigger = metric.value <= threshold;
              break;
          }
          
          if (shouldTrigger) {
            triggerMessage = `${metric.name} is ${metric.value} (threshold: ${operator} ${threshold})`;
          }
        }
        break;
      
      case 'rate':
        // Check rate of change over time window
        // This would require historical data
        break;
      
      case 'absence':
        // Check if expected metric is missing
        const expectedMetric = metrics.find(m => m.name === rule.condition_config.metric);
        if (!expectedMetric) {
          shouldTrigger = true;
          triggerMessage = `Expected metric ${rule.condition_config.metric} is missing`;
        }
        break;
    }
    
    if (shouldTrigger) {
      const alert = await createAlert(db, {
        company_id: rule.company_id,
        alert_type: rule.severity,
        category: rule.category,
        title: rule.name,
        message: triggerMessage || rule.description || 'Alert triggered',
        source: 'alert_rule',
        metadata: { rule_id: rule.id }
      });
      
      triggeredAlerts.push(alert);
      
      // Update last triggered time
      await db.prepare(`
        UPDATE alert_rules SET last_triggered_at = ?, updated_at = ? WHERE id = ?
      `).bind(now.toISOString(), now.toISOString(), rule.id).run();
    }
  }
  
  return triggeredAlerts;
}

// Perform health checks
export async function performHealthChecks(
  db: D1Database
): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const now = new Date().toISOString();
  
  // Database health check
  try {
    const start = Date.now();
    await db.prepare('SELECT 1').first();
    const latency = Date.now() - start;
    
    checks.push({
      service: 'database',
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      latency_ms: latency,
      last_check: now
    });
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      last_check: now,
      details: { error: String(error) }
    });
  }
  
  // Integration connectors health check
  try {
    const connectors = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
      FROM integration_connectors WHERE is_active = 1
    `).first<{ total: number; active: number; error: number }>();
    
    const errorRate = connectors?.total ? (connectors.error || 0) / connectors.total : 0;
    
    checks.push({
      service: 'integrations',
      status: errorRate === 0 ? 'healthy' : errorRate < 0.1 ? 'degraded' : 'unhealthy',
      last_check: now,
      details: {
        total_connectors: connectors?.total || 0,
        active: connectors?.active || 0,
        in_error: connectors?.error || 0
      }
    });
  } catch (error) {
    checks.push({
      service: 'integrations',
      status: 'unhealthy',
      last_check: now,
      details: { error: String(error) }
    });
  }
  
  // Job queue health check
  try {
    const jobs = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' AND attempts >= max_attempts THEN 1 ELSE 0 END) as failed
      FROM integration_jobs 
      WHERE created_at > datetime('now', '-1 hour')
    `).first<{ total: number; pending: number; failed: number }>();
    
    const failureRate = jobs?.total ? (jobs.failed || 0) / jobs.total : 0;
    
    checks.push({
      service: 'job_queue',
      status: failureRate === 0 ? 'healthy' : failureRate < 0.1 ? 'degraded' : 'unhealthy',
      last_check: now,
      details: {
        jobs_last_hour: jobs?.total || 0,
        pending: jobs?.pending || 0,
        failed: jobs?.failed || 0
      }
    });
  } catch (error) {
    checks.push({
      service: 'job_queue',
      status: 'unhealthy',
      last_check: now,
      details: { error: String(error) }
    });
  }
  
  return checks;
}

// Get system metrics
export async function getSystemMetrics(
  db: D1Database,
  companyId?: string
): Promise<Metric[]> {
  const metrics: Metric[] = [];
  const now = new Date().toISOString();
  
  // Active users (last 24 hours)
  const activeUsers = await db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM audit_logs
    WHERE created_at > datetime('now', '-24 hours')
    ${companyId ? 'AND company_id = ?' : ''}
  `).bind(...(companyId ? [companyId] : [])).first<{ count: number }>();
  
  metrics.push({
    name: 'active_users_24h',
    value: activeUsers?.count || 0,
    unit: 'users',
    timestamp: now
  });
  
  // Pending jobs
  const pendingJobs = await db.prepare(`
    SELECT COUNT(*) as count FROM integration_jobs WHERE status = 'pending'
    ${companyId ? 'AND company_id = ?' : ''}
  `).bind(...(companyId ? [companyId] : [])).first<{ count: number }>();
  
  metrics.push({
    name: 'pending_jobs',
    value: pendingJobs?.count || 0,
    unit: 'jobs',
    timestamp: now
  });
  
  // Failed jobs (last hour)
  const failedJobs = await db.prepare(`
    SELECT COUNT(*) as count FROM integration_jobs 
    WHERE status = 'failed' AND completed_at > datetime('now', '-1 hour')
    ${companyId ? 'AND company_id = ?' : ''}
  `).bind(...(companyId ? [companyId] : [])).first<{ count: number }>();
  
  metrics.push({
    name: 'failed_jobs_1h',
    value: failedJobs?.count || 0,
    unit: 'jobs',
    timestamp: now
  });
  
  // Active alerts
  const activeAlerts = await db.prepare(`
    SELECT COUNT(*) as count FROM system_alerts WHERE status = 'active'
    ${companyId ? 'AND (company_id = ? OR company_id IS NULL)' : ''}
  `).bind(...(companyId ? [companyId] : [])).first<{ count: number }>();
  
  metrics.push({
    name: 'active_alerts',
    value: activeAlerts?.count || 0,
    unit: 'alerts',
    timestamp: now
  });
  
  // Invoices created today
  const invoicesToday = await db.prepare(`
    SELECT COUNT(*) as count FROM invoices 
    WHERE date(created_at) = date('now')
    ${companyId ? 'AND company_id = ?' : ''}
  `).bind(...(companyId ? [companyId] : [])).first<{ count: number }>();
  
  metrics.push({
    name: 'invoices_today',
    value: invoicesToday?.count || 0,
    unit: 'invoices',
    timestamp: now
  });
  
  // Revenue today
  const revenueToday = await db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices 
    WHERE date(created_at) = date('now') AND status = 'paid'
    ${companyId ? 'AND company_id = ?' : ''}
  `).bind(...(companyId ? [companyId] : [])).first<{ total: number }>();
  
  metrics.push({
    name: 'revenue_today',
    value: revenueToday?.total || 0,
    unit: 'currency',
    timestamp: now
  });
  
  return metrics;
}

// Get alert summary
export async function getAlertSummary(
  db: D1Database,
  companyId?: string
): Promise<{
  total_active: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  recent_alerts: SystemAlert[];
}> {
  let whereClause = 'WHERE status = \'active\'';
  const params: string[] = [];
  
  if (companyId) {
    whereClause += ' AND (company_id = ? OR company_id IS NULL)';
    params.push(companyId);
  }
  
  const totalActive = await db.prepare(`
    SELECT COUNT(*) as count FROM system_alerts ${whereClause}
  `).bind(...params).first<{ count: number }>();
  
  const bySeverity = await db.prepare(`
    SELECT alert_type, COUNT(*) as count FROM system_alerts ${whereClause} GROUP BY alert_type
  `).bind(...params).all();
  
  const byCategory = await db.prepare(`
    SELECT category, COUNT(*) as count FROM system_alerts ${whereClause} GROUP BY category
  `).bind(...params).all();
  
  const recentAlerts = await db.prepare(`
    SELECT * FROM system_alerts ${whereClause} ORDER BY created_at DESC LIMIT 10
  `).bind(...params).all();
  
  return {
    total_active: totalActive?.count || 0,
    by_severity: Object.fromEntries(
      (bySeverity.results || []).map((r: Record<string, unknown>) => [r.alert_type, r.count])
    ),
    by_category: Object.fromEntries(
      (byCategory.results || []).map((r: Record<string, unknown>) => [r.category, r.count])
    ),
    recent_alerts: (recentAlerts.results || []).map((row: Record<string, unknown>) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
    })) as SystemAlert[]
  };
}

// Create default alert rules
export async function createDefaultAlertRules(db: D1Database): Promise<void> {
  const defaultRules = [
    {
      name: 'High Job Failure Rate',
      description: 'Alert when job failure rate exceeds 10%',
      category: 'job' as const,
      condition_type: 'threshold' as const,
      condition_config: { metric: 'job_failure_rate', operator: 'gt' as const, threshold: 10 },
      severity: 'error' as const,
      notification_channels: ['email'],
      cooldown_minutes: 30
    },
    {
      name: 'Integration Connector Error',
      description: 'Alert when an integration connector enters error state',
      category: 'integration' as const,
      condition_type: 'threshold' as const,
      condition_config: { metric: 'connector_errors', operator: 'gt' as const, threshold: 0 },
      severity: 'warning' as const,
      notification_channels: ['email'],
      cooldown_minutes: 60
    },
    {
      name: 'Database Latency High',
      description: 'Alert when database latency exceeds 500ms',
      category: 'performance' as const,
      condition_type: 'threshold' as const,
      condition_config: { metric: 'db_latency_ms', operator: 'gt' as const, threshold: 500 },
      severity: 'warning' as const,
      notification_channels: ['email'],
      cooldown_minutes: 15
    },
    {
      name: 'Security: Multiple Failed Logins',
      description: 'Alert on multiple failed login attempts',
      category: 'security' as const,
      condition_type: 'threshold' as const,
      condition_config: { metric: 'failed_logins', operator: 'gt' as const, threshold: 5, time_window_minutes: 15 },
      severity: 'critical' as const,
      notification_channels: ['email', 'sms'],
      cooldown_minutes: 5
    }
  ];
  
  for (const rule of defaultRules) {
    // Check if rule already exists
    const existing = await db.prepare(`
      SELECT id FROM alert_rules WHERE name = ? AND company_id IS NULL
    `).bind(rule.name).first();
    
    if (!existing) {
      await createAlertRule(db, rule);
    }
  }
}
