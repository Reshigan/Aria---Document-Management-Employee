// Helpdesk Service - Teams, tickets, SLAs, messages, customer portal

interface HelpdeskTeam {
  id: string;
  company_id: string;
  name: string;
  email_alias?: string;
  description?: string;
  manager_id?: string;
  auto_assign: boolean;
  assignment_method: 'manual' | 'round_robin' | 'load_balanced';
  is_active: boolean;
  created_at: string;
}

interface HelpdeskStage {
  id: string;
  team_id: string;
  name: string;
  sequence: number;
  is_close_stage: boolean;
  fold: boolean;
  created_at: string;
}

interface SLAPolicy {
  id: string;
  team_id: string;
  name: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  ticket_type?: string;
  time_to_first_response_hours?: number;
  time_to_resolve_hours?: number;
  target_stage_id?: string;
  is_active: boolean;
  created_at: string;
}

interface HelpdeskTicket {
  id: string;
  company_id: string;
  team_id: string;
  ticket_number: string;
  subject: string;
  description?: string;
  customer_id?: string;
  customer_email?: string;
  customer_name?: string;
  contact_id?: string;
  assigned_to?: string;
  stage_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  ticket_type?: string;
  source: 'email' | 'web' | 'phone' | 'chat' | 'api';
  sla_policy_id?: string;
  sla_deadline?: string;
  sla_first_response_deadline?: string;
  sla_first_response_at?: string;
  sla_status: 'on_track' | 'at_risk' | 'breached' | 'achieved';
  closed_at?: string;
  closed_by?: string;
  rating?: number;
  rating_comment?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

interface HelpdeskMessage {
  id: string;
  ticket_id: string;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  message_type: 'comment' | 'internal_note' | 'email_in' | 'email_out';
  body: string;
  attachments?: string;
  is_internal: boolean;
  email_message_id?: string;
  created_at: string;
}

export async function createTeam(
  db: D1Database,
  input: Omit<HelpdeskTeam, 'id' | 'created_at'>
): Promise<HelpdeskTeam> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO helpdesk_teams (
      id, company_id, name, email_alias, description, manager_id,
      auto_assign, assignment_method, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.email_alias || null,
    input.description || null,
    input.manager_id || null,
    input.auto_assign ? 1 : 0,
    input.assignment_method,
    input.is_active ? 1 : 0,
    now
  ).run();
  
  const defaultStages = [
    { name: 'New', sequence: 0, is_close_stage: false },
    { name: 'In Progress', sequence: 1, is_close_stage: false },
    { name: 'Waiting on Customer', sequence: 2, is_close_stage: false },
    { name: 'Resolved', sequence: 3, is_close_stage: true }
  ];
  
  for (const stage of defaultStages) {
    await createStage(db, {
      team_id: id,
      name: stage.name,
      sequence: stage.sequence,
      is_close_stage: stage.is_close_stage,
      fold: stage.is_close_stage
    });
  }
  
  return { id, ...input, created_at: now };
}

export async function getTeam(db: D1Database, teamId: string): Promise<HelpdeskTeam | null> {
  const result = await db.prepare(`
    SELECT * FROM helpdesk_teams WHERE id = ?
  `).bind(teamId).first();
  
  return result as HelpdeskTeam | null;
}

export async function listTeams(db: D1Database, companyId: string): Promise<HelpdeskTeam[]> {
  const results = await db.prepare(`
    SELECT * FROM helpdesk_teams WHERE company_id = ? AND is_active = 1 ORDER BY name
  `).bind(companyId).all();
  
  return (results.results || []) as unknown as HelpdeskTeam[];
}

export async function addTeamMember(
  db: D1Database,
  teamId: string,
  userId: string,
  isLeader: boolean = false
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT OR REPLACE INTO helpdesk_team_members (id, team_id, user_id, is_leader, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, teamId, userId, isLeader ? 1 : 0, now).run();
}

export async function getTeamMembers(db: D1Database, teamId: string): Promise<Array<{ user_id: string; is_leader: boolean }>> {
  const results = await db.prepare(`
    SELECT user_id, is_leader FROM helpdesk_team_members WHERE team_id = ?
  `).bind(teamId).all();
  
  return (results.results || []) as unknown as Array<{ user_id: string; is_leader: boolean }>;
}

export async function createStage(
  db: D1Database,
  input: Omit<HelpdeskStage, 'id' | 'created_at'>
): Promise<HelpdeskStage> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO helpdesk_stages (id, team_id, name, sequence, is_close_stage, fold, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.team_id,
    input.name,
    input.sequence,
    input.is_close_stage ? 1 : 0,
    input.fold ? 1 : 0,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function listStages(db: D1Database, teamId: string): Promise<HelpdeskStage[]> {
  const results = await db.prepare(`
    SELECT * FROM helpdesk_stages WHERE team_id = ? ORDER BY sequence
  `).bind(teamId).all();
  
  return (results.results || []) as unknown as HelpdeskStage[];
}

export async function createSLAPolicy(
  db: D1Database,
  input: Omit<SLAPolicy, 'id' | 'created_at'>
): Promise<SLAPolicy> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO helpdesk_sla_policies (
      id, team_id, name, priority, ticket_type, time_to_first_response_hours,
      time_to_resolve_hours, target_stage_id, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.team_id,
    input.name,
    input.priority || null,
    input.ticket_type || null,
    input.time_to_first_response_hours || null,
    input.time_to_resolve_hours || null,
    input.target_stage_id || null,
    input.is_active ? 1 : 0,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function listSLAPolicies(db: D1Database, teamId: string): Promise<SLAPolicy[]> {
  const results = await db.prepare(`
    SELECT * FROM helpdesk_sla_policies WHERE team_id = ? AND is_active = 1 ORDER BY name
  `).bind(teamId).all();
  
  return (results.results || []) as unknown as SLAPolicy[];
}

async function generateTicketNumber(db: D1Database, companyId: string): Promise<string> {
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM helpdesk_tickets WHERE company_id = ?
  `).bind(companyId).first<{ count: number }>();
  
  const count = (result?.count || 0) + 1;
  return `TKT-${String(count).padStart(6, '0')}`;
}

async function findMatchingSLA(
  db: D1Database,
  teamId: string,
  priority: string,
  ticketType?: string
): Promise<SLAPolicy | null> {
  let query = `
    SELECT * FROM helpdesk_sla_policies 
    WHERE team_id = ? AND is_active = 1
    AND (priority IS NULL OR priority = ?)
  `;
  const params: (string | null)[] = [teamId, priority];
  
  if (ticketType) {
    query += ' AND (ticket_type IS NULL OR ticket_type = ?)';
    params.push(ticketType);
  } else {
    query += ' AND ticket_type IS NULL';
  }
  
  query += ' ORDER BY priority DESC, ticket_type DESC LIMIT 1';
  
  const result = await db.prepare(query).bind(...params).first();
  return result as SLAPolicy | null;
}

async function getNextAssignee(db: D1Database, teamId: string): Promise<string | null> {
  const team = await getTeam(db, teamId);
  if (!team || !team.auto_assign) return null;
  
  const members = await getTeamMembers(db, teamId);
  if (members.length === 0) return null;
  
  if (team.assignment_method === 'round_robin') {
    const lastAssigned = await db.prepare(`
      SELECT assigned_to FROM helpdesk_tickets 
      WHERE team_id = ? AND assigned_to IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `).bind(teamId).first<{ assigned_to: string }>();
    
    const lastIndex = lastAssigned 
      ? members.findIndex(m => m.user_id === lastAssigned.assigned_to)
      : -1;
    
    const nextIndex = (lastIndex + 1) % members.length;
    return members[nextIndex].user_id;
  }
  
  if (team.assignment_method === 'load_balanced') {
    const loads = await db.prepare(`
      SELECT assigned_to, COUNT(*) as count FROM helpdesk_tickets 
      WHERE team_id = ? AND assigned_to IS NOT NULL 
      AND stage_id NOT IN (SELECT id FROM helpdesk_stages WHERE team_id = ? AND is_close_stage = 1)
      GROUP BY assigned_to
    `).bind(teamId, teamId).all();
    
    const loadMap = new Map<string, number>();
    for (const row of (loads.results || []) as unknown as Array<{ assigned_to: string; count: number }>) {
      loadMap.set(row.assigned_to, row.count);
    }
    
    let minLoad = Infinity;
    let minMember = members[0].user_id;
    
    for (const member of members) {
      const load = loadMap.get(member.user_id) || 0;
      if (load < minLoad) {
        minLoad = load;
        minMember = member.user_id;
      }
    }
    
    return minMember;
  }
  
  return null;
}

export async function createTicket(
  db: D1Database,
  input: Omit<HelpdeskTicket, 'id' | 'ticket_number' | 'sla_deadline' | 'sla_first_response_deadline' | 'sla_status' | 'created_at' | 'updated_at'>
): Promise<HelpdeskTicket> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const ticketNumber = await generateTicketNumber(db, input.company_id);
  
  const stages = await listStages(db, input.team_id);
  const initialStage = stages.find(s => s.sequence === 0) || stages[0];
  
  const sla = await findMatchingSLA(db, input.team_id, input.priority, input.ticket_type);
  let slaDeadline: string | undefined;
  let slaFirstResponseDeadline: string | undefined;
  
  if (sla) {
    if (sla.time_to_resolve_hours) {
      const deadline = new Date(Date.now() + sla.time_to_resolve_hours * 60 * 60 * 1000);
      slaDeadline = deadline.toISOString();
    }
    if (sla.time_to_first_response_hours) {
      const deadline = new Date(Date.now() + sla.time_to_first_response_hours * 60 * 60 * 1000);
      slaFirstResponseDeadline = deadline.toISOString();
    }
  }
  
  let assignedTo = input.assigned_to;
  if (!assignedTo) {
    assignedTo = await getNextAssignee(db, input.team_id) || undefined;
  }
  
  await db.prepare(`
    INSERT INTO helpdesk_tickets (
      id, company_id, team_id, ticket_number, subject, description,
      customer_id, customer_email, customer_name, contact_id, assigned_to,
      stage_id, priority, ticket_type, source, sla_policy_id, sla_deadline,
      sla_first_response_deadline, sla_status, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on_track', ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.team_id,
    ticketNumber,
    input.subject,
    input.description || null,
    input.customer_id || null,
    input.customer_email || null,
    input.customer_name || null,
    input.contact_id || null,
    assignedTo || null,
    input.stage_id || initialStage?.id || null,
    input.priority,
    input.ticket_type || null,
    input.source,
    sla?.id || null,
    slaDeadline || null,
    slaFirstResponseDeadline || null,
    input.tags || null,
    now,
    now
  ).run();
  
  await logActivity(db, id, null, 'created', null, 'Ticket created');
  
  return {
    id,
    ...input,
    ticket_number: ticketNumber,
    stage_id: input.stage_id || initialStage?.id,
    assigned_to: assignedTo,
    sla_policy_id: sla?.id,
    sla_deadline: slaDeadline,
    sla_first_response_deadline: slaFirstResponseDeadline,
    sla_status: 'on_track',
    created_at: now,
    updated_at: now
  };
}

export async function getTicket(db: D1Database, ticketId: string): Promise<HelpdeskTicket | null> {
  const result = await db.prepare(`
    SELECT * FROM helpdesk_tickets WHERE id = ?
  `).bind(ticketId).first();
  
  return result as HelpdeskTicket | null;
}

export async function getTicketByNumber(db: D1Database, ticketNumber: string): Promise<HelpdeskTicket | null> {
  const result = await db.prepare(`
    SELECT * FROM helpdesk_tickets WHERE ticket_number = ?
  `).bind(ticketNumber).first();
  
  return result as HelpdeskTicket | null;
}

export async function listTickets(
  db: D1Database,
  companyId: string,
  options: {
    teamId?: string;
    stageId?: string;
    assignedTo?: string;
    customerId?: string;
    priority?: string;
    status?: 'open' | 'closed';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ tickets: HelpdeskTicket[]; total: number }> {
  let query = 'SELECT * FROM helpdesk_tickets WHERE company_id = ?';
  let countQuery = 'SELECT COUNT(*) as count FROM helpdesk_tickets WHERE company_id = ?';
  const params: (string | number)[] = [companyId];
  
  if (options.teamId) {
    query += ' AND team_id = ?';
    countQuery += ' AND team_id = ?';
    params.push(options.teamId);
  }
  
  if (options.stageId) {
    query += ' AND stage_id = ?';
    countQuery += ' AND stage_id = ?';
    params.push(options.stageId);
  }
  
  if (options.assignedTo) {
    query += ' AND assigned_to = ?';
    countQuery += ' AND assigned_to = ?';
    params.push(options.assignedTo);
  }
  
  if (options.customerId) {
    query += ' AND customer_id = ?';
    countQuery += ' AND customer_id = ?';
    params.push(options.customerId);
  }
  
  if (options.priority) {
    query += ' AND priority = ?';
    countQuery += ' AND priority = ?';
    params.push(options.priority);
  }
  
  if (options.status === 'open') {
    query += ' AND closed_at IS NULL';
    countQuery += ' AND closed_at IS NULL';
  } else if (options.status === 'closed') {
    query += ' AND closed_at IS NOT NULL';
    countQuery += ' AND closed_at IS NOT NULL';
  }
  
  const countResult = await db.prepare(countQuery).bind(...params).first<{ count: number }>();
  
  query += ' ORDER BY created_at DESC';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  
  return {
    tickets: (results.results || []) as unknown as HelpdeskTicket[],
    total: countResult?.count || 0
  };
}

export async function updateTicketStage(
  db: D1Database,
  ticketId: string,
  stageId: string,
  userId?: string
): Promise<void> {
  const ticket = await getTicket(db, ticketId);
  if (!ticket) throw new Error('Ticket not found');
  
  const now = new Date().toISOString();
  const stage = await db.prepare(`
    SELECT * FROM helpdesk_stages WHERE id = ?
  `).bind(stageId).first<HelpdeskStage>();
  
  let closedAt: string | null = null;
  let closedBy: string | null = null;
  let slaStatus = ticket.sla_status;
  
  if (stage?.is_close_stage) {
    closedAt = now;
    closedBy = userId || null;
    
    if (ticket.sla_deadline) {
      slaStatus = new Date(now) <= new Date(ticket.sla_deadline) ? 'achieved' : 'breached';
    }
  }
  
  await db.prepare(`
    UPDATE helpdesk_tickets 
    SET stage_id = ?, closed_at = ?, closed_by = ?, sla_status = ?, updated_at = ?
    WHERE id = ?
  `).bind(stageId, closedAt, closedBy, slaStatus, now, ticketId).run();
  
  await logActivity(db, ticketId, userId || null, 'stage_changed', ticket.stage_id || null, stageId);
}

export async function assignTicket(
  db: D1Database,
  ticketId: string,
  assignedTo: string,
  userId?: string
): Promise<void> {
  const ticket = await getTicket(db, ticketId);
  if (!ticket) throw new Error('Ticket not found');
  
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE helpdesk_tickets SET assigned_to = ?, updated_at = ? WHERE id = ?
  `).bind(assignedTo, now, ticketId).run();
  
  await logActivity(db, ticketId, userId || null, 'assigned', ticket.assigned_to || null, assignedTo);
}

export async function updateTicketPriority(
  db: D1Database,
  ticketId: string,
  priority: HelpdeskTicket['priority'],
  userId?: string
): Promise<void> {
  const ticket = await getTicket(db, ticketId);
  if (!ticket) throw new Error('Ticket not found');
  
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE helpdesk_tickets SET priority = ?, updated_at = ? WHERE id = ?
  `).bind(priority, now, ticketId).run();
  
  await logActivity(db, ticketId, userId || null, 'priority_changed', ticket.priority, priority);
}

export async function addMessage(
  db: D1Database,
  input: Omit<HelpdeskMessage, 'id' | 'created_at'>
): Promise<HelpdeskMessage> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO helpdesk_messages (
      id, ticket_id, author_id, author_name, author_email, message_type,
      body, attachments, is_internal, email_message_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.ticket_id,
    input.author_id || null,
    input.author_name || null,
    input.author_email || null,
    input.message_type,
    input.body,
    input.attachments || null,
    input.is_internal ? 1 : 0,
    input.email_message_id || null,
    now
  ).run();
  
  const ticket = await getTicket(db, input.ticket_id);
  if (ticket && !ticket.sla_first_response_at && !input.is_internal && input.author_id) {
    await db.prepare(`
      UPDATE helpdesk_tickets SET sla_first_response_at = ?, updated_at = ? WHERE id = ?
    `).bind(now, now, input.ticket_id).run();
  }
  
  return { id, ...input, created_at: now };
}

export async function listMessages(db: D1Database, ticketId: string, includeInternal: boolean = true): Promise<HelpdeskMessage[]> {
  let query = 'SELECT * FROM helpdesk_messages WHERE ticket_id = ?';
  
  if (!includeInternal) {
    query += ' AND is_internal = 0';
  }
  
  query += ' ORDER BY created_at ASC';
  
  const results = await db.prepare(query).bind(ticketId).all();
  return (results.results || []) as unknown as HelpdeskMessage[];
}

async function logActivity(
  db: D1Database,
  ticketId: string,
  userId: string | null,
  action: string,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO helpdesk_activity_log (id, ticket_id, user_id, action, old_value, new_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, ticketId, userId, action, oldValue, newValue, now).run();
}

export async function getTicketActivity(db: D1Database, ticketId: string): Promise<Array<{
  id: string;
  user_id?: string;
  action: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}>> {
  const results = await db.prepare(`
    SELECT * FROM helpdesk_activity_log WHERE ticket_id = ? ORDER BY created_at DESC
  `).bind(ticketId).all();
  
  return (results.results || []) as unknown as Array<{
    id: string;
    user_id?: string;
    action: string;
    old_value?: string;
    new_value?: string;
    created_at: string;
  }>;
}

export async function rateTicket(
  db: D1Database,
  ticketId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE helpdesk_tickets SET rating = ?, rating_comment = ?, updated_at = ? WHERE id = ?
  `).bind(rating, comment || null, now, ticketId).run();
}

export async function updateSLAStatus(db: D1Database): Promise<{ updated: number }> {
  const now = new Date().toISOString();
  
  const atRisk = await db.prepare(`
    UPDATE helpdesk_tickets 
    SET sla_status = 'at_risk', updated_at = ?
    WHERE closed_at IS NULL AND sla_status = 'on_track'
    AND sla_deadline IS NOT NULL 
    AND datetime(sla_deadline, '-1 hour') < datetime(?)
    AND datetime(sla_deadline) > datetime(?)
  `).bind(now, now, now).run();
  
  const breached = await db.prepare(`
    UPDATE helpdesk_tickets 
    SET sla_status = 'breached', updated_at = ?
    WHERE closed_at IS NULL AND sla_status IN ('on_track', 'at_risk')
    AND sla_deadline IS NOT NULL 
    AND datetime(sla_deadline) < datetime(?)
  `).bind(now, now).run();
  
  return { updated: (atRisk.meta?.changes || 0) + (breached.meta?.changes || 0) };
}

export async function getHelpdeskDashboard(
  db: D1Database,
  companyId: string,
  teamId?: string
): Promise<{
  open_tickets: number;
  unassigned_tickets: number;
  overdue_tickets: number;
  avg_first_response_hours: number;
  avg_resolution_hours: number;
  sla_compliance_percent: number;
  tickets_by_priority: Record<string, number>;
  tickets_by_stage: Array<{ stage_id: string; stage_name: string; count: number }>;
}> {
  let teamFilter = '';
  const params: string[] = [companyId];
  
  if (teamId) {
    teamFilter = ' AND team_id = ?';
    params.push(teamId);
  }
  
  const openTickets = await db.prepare(`
    SELECT COUNT(*) as count FROM helpdesk_tickets 
    WHERE company_id = ? ${teamFilter} AND closed_at IS NULL
  `).bind(...params).first<{ count: number }>();
  
  const unassignedTickets = await db.prepare(`
    SELECT COUNT(*) as count FROM helpdesk_tickets 
    WHERE company_id = ? ${teamFilter} AND closed_at IS NULL AND assigned_to IS NULL
  `).bind(...params).first<{ count: number }>();
  
  const now = new Date().toISOString();
  const overdueTickets = await db.prepare(`
    SELECT COUNT(*) as count FROM helpdesk_tickets 
    WHERE company_id = ? ${teamFilter} AND closed_at IS NULL 
    AND sla_deadline IS NOT NULL AND sla_deadline < ?
  `).bind(...params, now).first<{ count: number }>();
  
  const responseStats = await db.prepare(`
    SELECT 
      AVG((julianday(sla_first_response_at) - julianday(created_at)) * 24) as avg_first_response,
      AVG((julianday(closed_at) - julianday(created_at)) * 24) as avg_resolution
    FROM helpdesk_tickets 
    WHERE company_id = ? ${teamFilter} AND closed_at IS NOT NULL
  `).bind(...params).first();
  
  const slaStats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN sla_status = 'achieved' THEN 1 ELSE 0 END) as achieved
    FROM helpdesk_tickets 
    WHERE company_id = ? ${teamFilter} AND closed_at IS NOT NULL AND sla_policy_id IS NOT NULL
  `).bind(...params).first();
  
  const byPriority = await db.prepare(`
    SELECT priority, COUNT(*) as count FROM helpdesk_tickets 
    WHERE company_id = ? ${teamFilter} AND closed_at IS NULL
    GROUP BY priority
  `).bind(...params).all();
  
  const byStage = await db.prepare(`
    SELECT t.stage_id, s.name as stage_name, COUNT(*) as count 
    FROM helpdesk_tickets t
    LEFT JOIN helpdesk_stages s ON t.stage_id = s.id
    WHERE t.company_id = ? ${teamFilter} AND t.closed_at IS NULL
    GROUP BY t.stage_id, s.name
  `).bind(...params).all();
  
  const priorityMap: Record<string, number> = {};
  for (const row of (byPriority.results || []) as unknown as Array<{ priority: string; count: number }>) {
    priorityMap[row.priority] = row.count;
  }
  
  const total = (slaStats as Record<string, number>)?.total || 0;
  const achieved = (slaStats as Record<string, number>)?.achieved || 0;
  
  return {
    open_tickets: openTickets?.count || 0,
    unassigned_tickets: unassignedTickets?.count || 0,
    overdue_tickets: overdueTickets?.count || 0,
    avg_first_response_hours: Math.round(((responseStats as Record<string, number>)?.avg_first_response || 0) * 100) / 100,
    avg_resolution_hours: Math.round(((responseStats as Record<string, number>)?.avg_resolution || 0) * 100) / 100,
    sla_compliance_percent: total > 0 ? Math.round((achieved / total) * 100) : 100,
    tickets_by_priority: priorityMap,
    tickets_by_stage: (byStage.results || []) as unknown as Array<{ stage_id: string; stage_name: string; count: number }>
  };
}

export async function getCustomerTickets(
  db: D1Database,
  customerId: string,
  limit: number = 20
): Promise<HelpdeskTicket[]> {
  const results = await db.prepare(`
    SELECT * FROM helpdesk_tickets 
    WHERE customer_id = ? 
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(customerId, limit).all();
  
  return (results.results || []) as unknown as HelpdeskTicket[];
}

export async function searchTickets(
  db: D1Database,
  companyId: string,
  query: string,
  limit: number = 20
): Promise<HelpdeskTicket[]> {
  const searchPattern = `%${query}%`;
  
  const results = await db.prepare(`
    SELECT * FROM helpdesk_tickets 
    WHERE company_id = ? 
    AND (ticket_number LIKE ? OR subject LIKE ? OR description LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(companyId, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit).all();
  
  return (results.results || []) as unknown as HelpdeskTicket[];
}
