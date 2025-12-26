// Service Fulfillment Service - Projects, milestones, timesheets, deliverables

interface ServiceProject {
  id: string;
  company_id: string;
  name: string;
  customer_id: string;
  sales_order_id?: string;
  status: 'draft' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget_hours?: number;
  budget_amount?: number;
  billing_type: 'fixed' | 'time_materials' | 'milestone';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceMilestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  due_date?: string;
  amount?: number;
  percentage?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'invoiced';
  completed_at?: string;
  invoice_id?: string;
  created_at: string;
}

interface Timesheet {
  id: string;
  company_id: string;
  employee_id: string;
  project_id?: string;
  task_description?: string;
  date: string;
  hours: number;
  hourly_rate?: number;
  billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'invoiced' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  invoice_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ServiceDeliverable {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price?: number;
  status: 'pending' | 'delivered' | 'accepted' | 'rejected';
  delivered_at?: string;
  accepted_at?: string;
  accepted_by?: string;
  invoice_id?: string;
  created_at: string;
}

export async function createProject(
  db: D1Database,
  input: Omit<ServiceProject, 'id' | 'created_at' | 'updated_at'>
): Promise<ServiceProject> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO service_projects (
      id, company_id, name, customer_id, sales_order_id, status,
      start_date, end_date, budget_hours, budget_amount, billing_type,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.customer_id,
    input.sales_order_id || null,
    input.status,
    input.start_date || null,
    input.end_date || null,
    input.budget_hours || null,
    input.budget_amount || null,
    input.billing_type,
    input.is_active ? 1 : 0,
    now,
    now
  ).run();
  
  return { id, ...input, created_at: now, updated_at: now };
}

export async function getProject(db: D1Database, projectId: string): Promise<ServiceProject | null> {
  const result = await db.prepare(`
    SELECT * FROM service_projects WHERE id = ?
  `).bind(projectId).first();
  
  return result as ServiceProject | null;
}

export async function listProjects(
  db: D1Database,
  companyId: string,
  options: { customerId?: string; status?: string; limit?: number } = {}
): Promise<ServiceProject[]> {
  let query = 'SELECT * FROM service_projects WHERE company_id = ? AND is_active = 1';
  const params: (string | number)[] = [companyId];
  
  if (options.customerId) {
    query += ' AND customer_id = ?';
    params.push(options.customerId);
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
  return (results.results || []) as unknown as ServiceProject[];
}

export async function updateProjectStatus(
  db: D1Database,
  projectId: string,
  status: ServiceProject['status']
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE service_projects SET status = ?, updated_at = ? WHERE id = ?
  `).bind(status, now, projectId).run();
}

export async function createMilestone(
  db: D1Database,
  input: Omit<ServiceMilestone, 'id' | 'created_at'>
): Promise<ServiceMilestone> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO service_milestones (
      id, project_id, name, description, due_date, amount, percentage,
      status, completed_at, invoice_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.project_id,
    input.name,
    input.description || null,
    input.due_date || null,
    input.amount || null,
    input.percentage || null,
    input.status,
    input.completed_at || null,
    input.invoice_id || null,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function listMilestones(db: D1Database, projectId: string): Promise<ServiceMilestone[]> {
  const results = await db.prepare(`
    SELECT * FROM service_milestones WHERE project_id = ? ORDER BY due_date
  `).bind(projectId).all();
  
  return (results.results || []) as unknown as ServiceMilestone[];
}

export async function completeMilestone(
  db: D1Database,
  milestoneId: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE service_milestones SET status = 'completed', completed_at = ? WHERE id = ?
  `).bind(now, milestoneId).run();
}

export async function invoiceMilestone(
  db: D1Database,
  milestoneId: string,
  invoiceId: string
): Promise<void> {
  await db.prepare(`
    UPDATE service_milestones SET status = 'invoiced', invoice_id = ? WHERE id = ?
  `).bind(invoiceId, milestoneId).run();
}

export async function createTimesheet(
  db: D1Database,
  input: Omit<Timesheet, 'id' | 'created_at' | 'updated_at'>
): Promise<Timesheet> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO timesheets (
      id, company_id, employee_id, project_id, task_description, date,
      hours, hourly_rate, billable, status, approved_by, approved_at,
      invoice_id, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.employee_id,
    input.project_id || null,
    input.task_description || null,
    input.date,
    input.hours,
    input.hourly_rate || null,
    input.billable ? 1 : 0,
    input.status,
    input.approved_by || null,
    input.approved_at || null,
    input.invoice_id || null,
    input.notes || null,
    now,
    now
  ).run();
  
  return { id, ...input, created_at: now, updated_at: now };
}

export async function getTimesheet(db: D1Database, timesheetId: string): Promise<Timesheet | null> {
  const result = await db.prepare(`
    SELECT * FROM timesheets WHERE id = ?
  `).bind(timesheetId).first();
  
  return result as Timesheet | null;
}

export async function listTimesheets(
  db: D1Database,
  companyId: string,
  options: { employeeId?: string; projectId?: string; status?: string; dateFrom?: string; dateTo?: string; limit?: number } = {}
): Promise<Timesheet[]> {
  let query = 'SELECT * FROM timesheets WHERE company_id = ?';
  const params: (string | number)[] = [companyId];
  
  if (options.employeeId) {
    query += ' AND employee_id = ?';
    params.push(options.employeeId);
  }
  
  if (options.projectId) {
    query += ' AND project_id = ?';
    params.push(options.projectId);
  }
  
  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  
  if (options.dateFrom) {
    query += ' AND date >= ?';
    params.push(options.dateFrom);
  }
  
  if (options.dateTo) {
    query += ' AND date <= ?';
    params.push(options.dateTo);
  }
  
  query += ' ORDER BY date DESC';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as Timesheet[];
}

export async function submitTimesheet(db: D1Database, timesheetId: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE timesheets SET status = 'submitted', updated_at = ? WHERE id = ?
  `).bind(now, timesheetId).run();
}

export async function approveTimesheet(
  db: D1Database,
  timesheetId: string,
  approvedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE timesheets SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?
  `).bind(approvedBy, now, now, timesheetId).run();
}

export async function rejectTimesheet(db: D1Database, timesheetId: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE timesheets SET status = 'rejected', updated_at = ? WHERE id = ?
  `).bind(now, timesheetId).run();
}

export async function invoiceTimesheets(
  db: D1Database,
  timesheetIds: string[],
  invoiceId: string
): Promise<void> {
  const now = new Date().toISOString();
  
  for (const id of timesheetIds) {
    await db.prepare(`
      UPDATE timesheets SET status = 'invoiced', invoice_id = ?, updated_at = ? WHERE id = ?
    `).bind(invoiceId, now, id).run();
  }
}

export async function createDeliverable(
  db: D1Database,
  input: Omit<ServiceDeliverable, 'id' | 'created_at'>
): Promise<ServiceDeliverable> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO service_deliverables (
      id, project_id, name, description, quantity, unit_price,
      status, delivered_at, accepted_at, accepted_by, invoice_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.project_id,
    input.name,
    input.description || null,
    input.quantity,
    input.unit_price || null,
    input.status,
    input.delivered_at || null,
    input.accepted_at || null,
    input.accepted_by || null,
    input.invoice_id || null,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function listDeliverables(db: D1Database, projectId: string): Promise<ServiceDeliverable[]> {
  const results = await db.prepare(`
    SELECT * FROM service_deliverables WHERE project_id = ? ORDER BY created_at
  `).bind(projectId).all();
  
  return (results.results || []) as unknown as ServiceDeliverable[];
}

export async function deliverDeliverable(db: D1Database, deliverableId: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE service_deliverables SET status = 'delivered', delivered_at = ? WHERE id = ?
  `).bind(now, deliverableId).run();
}

export async function acceptDeliverable(
  db: D1Database,
  deliverableId: string,
  acceptedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE service_deliverables SET status = 'accepted', accepted_at = ?, accepted_by = ? WHERE id = ?
  `).bind(now, acceptedBy, deliverableId).run();
}

export async function rejectDeliverable(db: D1Database, deliverableId: string): Promise<void> {
  await db.prepare(`
    UPDATE service_deliverables SET status = 'rejected' WHERE id = ?
  `).bind(deliverableId).run();
}

export async function getProjectSummary(
  db: D1Database,
  projectId: string
): Promise<{
  project: ServiceProject | null;
  total_hours: number;
  billable_hours: number;
  approved_hours: number;
  invoiced_hours: number;
  total_amount: number;
  milestones_completed: number;
  milestones_total: number;
  deliverables_accepted: number;
  deliverables_total: number;
}> {
  const project = await getProject(db, projectId);
  
  const timesheetStats = await db.prepare(`
    SELECT 
      COALESCE(SUM(hours), 0) as total_hours,
      COALESCE(SUM(CASE WHEN billable = 1 THEN hours ELSE 0 END), 0) as billable_hours,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN hours ELSE 0 END), 0) as approved_hours,
      COALESCE(SUM(CASE WHEN status = 'invoiced' THEN hours ELSE 0 END), 0) as invoiced_hours,
      COALESCE(SUM(CASE WHEN billable = 1 THEN hours * COALESCE(hourly_rate, 0) ELSE 0 END), 0) as total_amount
    FROM timesheets WHERE project_id = ?
  `).bind(projectId).first();
  
  const milestoneStats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('completed', 'invoiced') THEN 1 ELSE 0 END) as completed
    FROM service_milestones WHERE project_id = ?
  `).bind(projectId).first();
  
  const deliverableStats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted
    FROM service_deliverables WHERE project_id = ?
  `).bind(projectId).first();
  
  return {
    project,
    total_hours: (timesheetStats as Record<string, number>)?.total_hours || 0,
    billable_hours: (timesheetStats as Record<string, number>)?.billable_hours || 0,
    approved_hours: (timesheetStats as Record<string, number>)?.approved_hours || 0,
    invoiced_hours: (timesheetStats as Record<string, number>)?.invoiced_hours || 0,
    total_amount: (timesheetStats as Record<string, number>)?.total_amount || 0,
    milestones_completed: (milestoneStats as Record<string, number>)?.completed || 0,
    milestones_total: (milestoneStats as Record<string, number>)?.total || 0,
    deliverables_accepted: (deliverableStats as Record<string, number>)?.accepted || 0,
    deliverables_total: (deliverableStats as Record<string, number>)?.total || 0
  };
}

export async function getServiceDashboard(
  db: D1Database,
  companyId: string
): Promise<{
  active_projects: number;
  pending_timesheets: number;
  hours_this_month: number;
  revenue_this_month: number;
  overdue_milestones: number;
}> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  
  const activeProjects = await db.prepare(`
    SELECT COUNT(*) as count FROM service_projects 
    WHERE company_id = ? AND status = 'in_progress' AND is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const pendingTimesheets = await db.prepare(`
    SELECT COUNT(*) as count FROM timesheets 
    WHERE company_id = ? AND status IN ('draft', 'submitted')
  `).bind(companyId).first<{ count: number }>();
  
  const monthlyStats = await db.prepare(`
    SELECT 
      COALESCE(SUM(hours), 0) as hours,
      COALESCE(SUM(CASE WHEN billable = 1 THEN hours * COALESCE(hourly_rate, 0) ELSE 0 END), 0) as revenue
    FROM timesheets 
    WHERE company_id = ? AND date >= ? AND status IN ('approved', 'invoiced')
  `).bind(companyId, monthStart).first();
  
  const overdueMilestones = await db.prepare(`
    SELECT COUNT(*) as count FROM service_milestones m
    JOIN service_projects p ON m.project_id = p.id
    WHERE p.company_id = ? AND m.status IN ('pending', 'in_progress') 
    AND m.due_date IS NOT NULL AND m.due_date < ?
  `).bind(companyId, today).first<{ count: number }>();
  
  return {
    active_projects: activeProjects?.count || 0,
    pending_timesheets: pendingTimesheets?.count || 0,
    hours_this_month: (monthlyStats as Record<string, number>)?.hours || 0,
    revenue_this_month: (monthlyStats as Record<string, number>)?.revenue || 0,
    overdue_milestones: overdueMilestones?.count || 0
  };
}

export async function getBillableItems(
  db: D1Database,
  projectId: string
): Promise<{
  timesheets: Timesheet[];
  milestones: ServiceMilestone[];
  deliverables: ServiceDeliverable[];
  total_amount: number;
}> {
  const timesheets = await db.prepare(`
    SELECT * FROM timesheets 
    WHERE project_id = ? AND billable = 1 AND status = 'approved'
    ORDER BY date
  `).bind(projectId).all();
  
  const milestones = await db.prepare(`
    SELECT * FROM service_milestones 
    WHERE project_id = ? AND status = 'completed' AND invoice_id IS NULL
    ORDER BY due_date
  `).bind(projectId).all();
  
  const deliverables = await db.prepare(`
    SELECT * FROM service_deliverables 
    WHERE project_id = ? AND status = 'accepted' AND invoice_id IS NULL
    ORDER BY created_at
  `).bind(projectId).all();
  
  let totalAmount = 0;
  
  for (const ts of (timesheets.results || []) as unknown as Timesheet[]) {
    totalAmount += ts.hours * (ts.hourly_rate || 0);
  }
  
  for (const ms of (milestones.results || []) as unknown as ServiceMilestone[]) {
    totalAmount += ms.amount || 0;
  }
  
  for (const del of (deliverables.results || []) as unknown as ServiceDeliverable[]) {
    totalAmount += del.quantity * (del.unit_price || 0);
  }
  
  return {
    timesheets: (timesheets.results || []) as unknown as Timesheet[],
    milestones: (milestones.results || []) as unknown as ServiceMilestone[],
    deliverables: (deliverables.results || []) as unknown as ServiceDeliverable[],
    total_amount: totalAmount
  };
}
