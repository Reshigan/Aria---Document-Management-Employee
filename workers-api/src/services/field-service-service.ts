// Field Service Service - Locations, technicians, work orders, scheduling, parts

interface FieldServiceLocation {
  id: string;
  company_id: string;
  customer_id?: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  access_instructions?: string;
  is_active: boolean;
  created_at: string;
}

interface FieldTechnician {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  skills?: string;
  certifications?: string;
  home_location_id?: string;
  max_jobs_per_day: number;
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
}

interface FieldServiceOrder {
  id: string;
  company_id: string;
  order_number: string;
  customer_id: string;
  location_id?: string;
  sales_order_id?: string;
  helpdesk_ticket_id?: string;
  service_type?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  estimated_duration_hours?: number;
  assigned_technician_id?: string;
  description?: string;
  customer_notes?: string;
  internal_notes?: string;
  started_at?: string;
  completed_at?: string;
  customer_signature?: string;
  rating?: number;
  rating_comment?: string;
  created_at: string;
  updated_at: string;
}

interface FieldServiceTask {
  id: string;
  order_id: string;
  name: string;
  description?: string;
  sequence: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  photo_urls?: string;
  created_at: string;
}

interface FieldServiceTimeEntry {
  id: string;
  order_id: string;
  technician_id: string;
  entry_type: 'travel' | 'work' | 'break';
  start_time: string;
  end_time?: string;
  duration_hours?: number;
  notes?: string;
  created_at: string;
}

interface FieldServicePart {
  id: string;
  order_id: string;
  variant_id?: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  from_inventory: boolean;
  warehouse_id?: string;
  notes?: string;
  created_at: string;
}

interface TechnicianAvailability {
  id: string;
  technician_id: string;
  date: string;
  available_from?: string;
  available_to?: string;
  is_available: boolean;
  notes?: string;
  created_at: string;
}

export async function createLocation(
  db: D1Database,
  input: Omit<FieldServiceLocation, 'id' | 'created_at'>
): Promise<FieldServiceLocation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO field_service_locations (
      id, company_id, customer_id, name, address, city, state, postal_code, country,
      latitude, longitude, contact_name, contact_phone, contact_email,
      access_instructions, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.customer_id || null,
    input.name,
    input.address || null,
    input.city || null,
    input.state || null,
    input.postal_code || null,
    input.country || null,
    input.latitude || null,
    input.longitude || null,
    input.contact_name || null,
    input.contact_phone || null,
    input.contact_email || null,
    input.access_instructions || null,
    input.is_active ? 1 : 0,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function getLocation(db: D1Database, locationId: string): Promise<FieldServiceLocation | null> {
  const result = await db.prepare(`
    SELECT * FROM field_service_locations WHERE id = ?
  `).bind(locationId).first();
  
  return result as FieldServiceLocation | null;
}

export async function listLocations(
  db: D1Database,
  companyId: string,
  customerId?: string
): Promise<FieldServiceLocation[]> {
  let query = 'SELECT * FROM field_service_locations WHERE company_id = ? AND is_active = 1';
  const params: string[] = [companyId];
  
  if (customerId) {
    query += ' AND customer_id = ?';
    params.push(customerId);
  }
  
  query += ' ORDER BY name';
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as FieldServiceLocation[];
}

export async function createTechnician(
  db: D1Database,
  input: Omit<FieldTechnician, 'id' | 'created_at'>
): Promise<FieldTechnician> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO field_technicians (
      id, company_id, user_id, name, email, phone, skills, certifications,
      home_location_id, max_jobs_per_day, hourly_rate, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.user_id,
    input.name,
    input.email || null,
    input.phone || null,
    input.skills || null,
    input.certifications || null,
    input.home_location_id || null,
    input.max_jobs_per_day,
    input.hourly_rate || null,
    input.is_active ? 1 : 0,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function getTechnician(db: D1Database, technicianId: string): Promise<FieldTechnician | null> {
  const result = await db.prepare(`
    SELECT * FROM field_technicians WHERE id = ?
  `).bind(technicianId).first();
  
  return result as FieldTechnician | null;
}

export async function listTechnicians(db: D1Database, companyId: string): Promise<FieldTechnician[]> {
  const results = await db.prepare(`
    SELECT * FROM field_technicians WHERE company_id = ? AND is_active = 1 ORDER BY name
  `).bind(companyId).all();
  
  return (results.results || []) as unknown as FieldTechnician[];
}

async function generateOrderNumber(db: D1Database, companyId: string): Promise<string> {
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM field_service_orders WHERE company_id = ?
  `).bind(companyId).first<{ count: number }>();
  
  const count = (result?.count || 0) + 1;
  return `FSO-${String(count).padStart(6, '0')}`;
}

export async function createOrder(
  db: D1Database,
  input: Omit<FieldServiceOrder, 'id' | 'order_number' | 'created_at' | 'updated_at'>
): Promise<FieldServiceOrder> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const orderNumber = await generateOrderNumber(db, input.company_id);
  
  await db.prepare(`
    INSERT INTO field_service_orders (
      id, company_id, order_number, customer_id, location_id, sales_order_id,
      helpdesk_ticket_id, service_type, priority, status, scheduled_date,
      scheduled_time_start, scheduled_time_end, estimated_duration_hours,
      assigned_technician_id, description, customer_notes, internal_notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    orderNumber,
    input.customer_id,
    input.location_id || null,
    input.sales_order_id || null,
    input.helpdesk_ticket_id || null,
    input.service_type || null,
    input.priority,
    input.status,
    input.scheduled_date || null,
    input.scheduled_time_start || null,
    input.scheduled_time_end || null,
    input.estimated_duration_hours || null,
    input.assigned_technician_id || null,
    input.description || null,
    input.customer_notes || null,
    input.internal_notes || null,
    now,
    now
  ).run();
  
  return { id, order_number: orderNumber, ...input, created_at: now, updated_at: now };
}

export async function getOrder(db: D1Database, orderId: string): Promise<FieldServiceOrder | null> {
  const result = await db.prepare(`
    SELECT * FROM field_service_orders WHERE id = ?
  `).bind(orderId).first();
  
  return result as FieldServiceOrder | null;
}

export async function listOrders(
  db: D1Database,
  companyId: string,
  options: {
    technicianId?: string;
    customerId?: string;
    status?: string;
    scheduledDate?: string;
    limit?: number;
  } = {}
): Promise<FieldServiceOrder[]> {
  let query = 'SELECT * FROM field_service_orders WHERE company_id = ?';
  const params: (string | number)[] = [companyId];
  
  if (options.technicianId) {
    query += ' AND assigned_technician_id = ?';
    params.push(options.technicianId);
  }
  
  if (options.customerId) {
    query += ' AND customer_id = ?';
    params.push(options.customerId);
  }
  
  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  
  if (options.scheduledDate) {
    query += ' AND scheduled_date = ?';
    params.push(options.scheduledDate);
  }
  
  query += ' ORDER BY scheduled_date, scheduled_time_start';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as FieldServiceOrder[];
}

export async function scheduleOrder(
  db: D1Database,
  orderId: string,
  technicianId: string,
  scheduledDate: string,
  scheduledTimeStart: string,
  scheduledTimeEnd: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE field_service_orders 
    SET assigned_technician_id = ?, scheduled_date = ?, scheduled_time_start = ?,
        scheduled_time_end = ?, status = 'scheduled', updated_at = ?
    WHERE id = ?
  `).bind(technicianId, scheduledDate, scheduledTimeStart, scheduledTimeEnd, now, orderId).run();
}

export async function dispatchOrder(db: D1Database, orderId: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE field_service_orders SET status = 'dispatched', updated_at = ? WHERE id = ?
  `).bind(now, orderId).run();
}

export async function startOrder(db: D1Database, orderId: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE field_service_orders SET status = 'in_progress', started_at = ?, updated_at = ? WHERE id = ?
  `).bind(now, now, orderId).run();
}

export async function completeOrder(
  db: D1Database,
  orderId: string,
  customerSignature?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE field_service_orders 
    SET status = 'completed', completed_at = ?, customer_signature = ?, updated_at = ?
    WHERE id = ?
  `).bind(now, customerSignature || null, now, orderId).run();
}

export async function cancelOrder(db: D1Database, orderId: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE field_service_orders SET status = 'cancelled', updated_at = ? WHERE id = ?
  `).bind(now, orderId).run();
}

export async function rateOrder(
  db: D1Database,
  orderId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE field_service_orders SET rating = ?, rating_comment = ?, updated_at = ? WHERE id = ?
  `).bind(rating, comment || null, now, orderId).run();
}

export async function createTask(
  db: D1Database,
  input: Omit<FieldServiceTask, 'id' | 'created_at'>
): Promise<FieldServiceTask> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO field_service_tasks (
      id, order_id, name, description, sequence, is_required, is_completed,
      completed_at, completed_by, notes, photo_urls, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.order_id,
    input.name,
    input.description || null,
    input.sequence,
    input.is_required ? 1 : 0,
    input.is_completed ? 1 : 0,
    input.completed_at || null,
    input.completed_by || null,
    input.notes || null,
    input.photo_urls || null,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function listTasks(db: D1Database, orderId: string): Promise<FieldServiceTask[]> {
  const results = await db.prepare(`
    SELECT * FROM field_service_tasks WHERE order_id = ? ORDER BY sequence
  `).bind(orderId).all();
  
  return (results.results || []) as unknown as FieldServiceTask[];
}

export async function completeTask(
  db: D1Database,
  taskId: string,
  completedBy: string,
  notes?: string,
  photoUrls?: string[]
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE field_service_tasks 
    SET is_completed = 1, completed_at = ?, completed_by = ?, notes = ?, photo_urls = ?
    WHERE id = ?
  `).bind(now, completedBy, notes || null, photoUrls ? JSON.stringify(photoUrls) : null, taskId).run();
}

export async function createTimeEntry(
  db: D1Database,
  input: Omit<FieldServiceTimeEntry, 'id' | 'created_at'>
): Promise<FieldServiceTimeEntry> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO field_service_time_entries (
      id, order_id, technician_id, entry_type, start_time, end_time, duration_hours, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.order_id,
    input.technician_id,
    input.entry_type,
    input.start_time,
    input.end_time || null,
    input.duration_hours || null,
    input.notes || null,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function endTimeEntry(
  db: D1Database,
  entryId: string
): Promise<void> {
  const entry = await db.prepare(`
    SELECT start_time FROM field_service_time_entries WHERE id = ?
  `).bind(entryId).first<{ start_time: string }>();
  
  if (!entry) throw new Error('Time entry not found');
  
  const now = new Date();
  const startTime = new Date(entry.start_time);
  const durationHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  
  await db.prepare(`
    UPDATE field_service_time_entries SET end_time = ?, duration_hours = ? WHERE id = ?
  `).bind(now.toISOString(), Math.round(durationHours * 100) / 100, entryId).run();
}

export async function listTimeEntries(db: D1Database, orderId: string): Promise<FieldServiceTimeEntry[]> {
  const results = await db.prepare(`
    SELECT * FROM field_service_time_entries WHERE order_id = ? ORDER BY start_time
  `).bind(orderId).all();
  
  return (results.results || []) as unknown as FieldServiceTimeEntry[];
}

export async function addPart(
  db: D1Database,
  input: Omit<FieldServicePart, 'id' | 'total_price' | 'created_at'>
): Promise<FieldServicePart> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const totalPrice = input.quantity * (input.unit_price || 0);
  
  await db.prepare(`
    INSERT INTO field_service_parts (
      id, order_id, variant_id, product_name, quantity, unit_price, total_price,
      from_inventory, warehouse_id, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.order_id,
    input.variant_id || null,
    input.product_name,
    input.quantity,
    input.unit_price || null,
    totalPrice,
    input.from_inventory ? 1 : 0,
    input.warehouse_id || null,
    input.notes || null,
    now
  ).run();
  
  return { id, ...input, total_price: totalPrice, created_at: now };
}

export async function listParts(db: D1Database, orderId: string): Promise<FieldServicePart[]> {
  const results = await db.prepare(`
    SELECT * FROM field_service_parts WHERE order_id = ? ORDER BY created_at
  `).bind(orderId).all();
  
  return (results.results || []) as unknown as FieldServicePart[];
}

export async function setAvailability(
  db: D1Database,
  input: Omit<TechnicianAvailability, 'id' | 'created_at'>
): Promise<TechnicianAvailability> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    DELETE FROM technician_availability WHERE technician_id = ? AND date = ?
  `).bind(input.technician_id, input.date).run();
  
  await db.prepare(`
    INSERT INTO technician_availability (
      id, technician_id, date, available_from, available_to, is_available, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.technician_id,
    input.date,
    input.available_from || null,
    input.available_to || null,
    input.is_available ? 1 : 0,
    input.notes || null,
    now
  ).run();
  
  return { id, ...input, created_at: now };
}

export async function getAvailability(
  db: D1Database,
  technicianId: string,
  dateFrom: string,
  dateTo: string
): Promise<TechnicianAvailability[]> {
  const results = await db.prepare(`
    SELECT * FROM technician_availability 
    WHERE technician_id = ? AND date >= ? AND date <= ?
    ORDER BY date
  `).bind(technicianId, dateFrom, dateTo).all();
  
  return (results.results || []) as unknown as TechnicianAvailability[];
}

export async function getAvailableTechnicians(
  db: D1Database,
  companyId: string,
  date: string,
  timeStart: string,
  timeEnd: string,
  requiredSkills?: string[]
): Promise<FieldTechnician[]> {
  let query = `
    SELECT t.* FROM field_technicians t
    LEFT JOIN technician_availability a ON t.id = a.technician_id AND a.date = ?
    WHERE t.company_id = ? AND t.is_active = 1
    AND (a.is_available IS NULL OR a.is_available = 1)
    AND (a.available_from IS NULL OR a.available_from <= ?)
    AND (a.available_to IS NULL OR a.available_to >= ?)
  `;
  
  const params: string[] = [date, companyId, timeStart, timeEnd];
  
  const results = await db.prepare(query).bind(...params).all();
  let technicians = (results.results || []) as unknown as FieldTechnician[];
  
  if (requiredSkills && requiredSkills.length > 0) {
    technicians = technicians.filter(tech => {
      if (!tech.skills) return false;
      const techSkills = tech.skills.split(',').map(s => s.trim().toLowerCase());
      return requiredSkills.every(skill => 
        techSkills.some(ts => ts.includes(skill.toLowerCase()))
      );
    });
  }
  
  const scheduledCounts = await db.prepare(`
    SELECT assigned_technician_id, COUNT(*) as count 
    FROM field_service_orders 
    WHERE company_id = ? AND scheduled_date = ? AND status NOT IN ('completed', 'cancelled')
    GROUP BY assigned_technician_id
  `).bind(companyId, date).all();
  
  const countMap = new Map<string, number>();
  for (const row of (scheduledCounts.results || []) as unknown as Array<{ assigned_technician_id: string; count: number }>) {
    countMap.set(row.assigned_technician_id, row.count);
  }
  
  return technicians.filter(tech => {
    const scheduled = countMap.get(tech.id) || 0;
    return scheduled < tech.max_jobs_per_day;
  });
}

export async function getTechnicianSchedule(
  db: D1Database,
  technicianId: string,
  date: string
): Promise<{
  technician: FieldTechnician | null;
  availability: TechnicianAvailability | null;
  orders: FieldServiceOrder[];
}> {
  const technician = await getTechnician(db, technicianId);
  
  const availability = await db.prepare(`
    SELECT * FROM technician_availability WHERE technician_id = ? AND date = ?
  `).bind(technicianId, date).first() as TechnicianAvailability | null;
  
  const orders = await db.prepare(`
    SELECT * FROM field_service_orders 
    WHERE assigned_technician_id = ? AND scheduled_date = ?
    ORDER BY scheduled_time_start
  `).bind(technicianId, date).all();
  
  return {
    technician,
    availability,
    orders: (orders.results || []) as unknown as FieldServiceOrder[]
  };
}

export async function getOrderSummary(
  db: D1Database,
  orderId: string
): Promise<{
  order: FieldServiceOrder | null;
  location: FieldServiceLocation | null;
  technician: FieldTechnician | null;
  tasks: FieldServiceTask[];
  time_entries: FieldServiceTimeEntry[];
  parts: FieldServicePart[];
  total_labor_hours: number;
  total_labor_cost: number;
  total_parts_cost: number;
  total_cost: number;
}> {
  const order = await getOrder(db, orderId);
  
  let location: FieldServiceLocation | null = null;
  let technician: FieldTechnician | null = null;
  
  if (order?.location_id) {
    location = await getLocation(db, order.location_id);
  }
  
  if (order?.assigned_technician_id) {
    technician = await getTechnician(db, order.assigned_technician_id);
  }
  
  const tasks = await listTasks(db, orderId);
  const timeEntries = await listTimeEntries(db, orderId);
  const parts = await listParts(db, orderId);
  
  let totalLaborHours = 0;
  let totalLaborCost = 0;
  
  for (const entry of timeEntries) {
    if (entry.entry_type === 'work' && entry.duration_hours) {
      totalLaborHours += entry.duration_hours;
      if (technician?.hourly_rate) {
        totalLaborCost += entry.duration_hours * technician.hourly_rate;
      }
    }
  }
  
  const totalPartsCost = parts.reduce((sum, part) => sum + (part.total_price || 0), 0);
  
  return {
    order,
    location,
    technician,
    tasks,
    time_entries: timeEntries,
    parts,
    total_labor_hours: Math.round(totalLaborHours * 100) / 100,
    total_labor_cost: Math.round(totalLaborCost * 100) / 100,
    total_parts_cost: Math.round(totalPartsCost * 100) / 100,
    total_cost: Math.round((totalLaborCost + totalPartsCost) * 100) / 100
  };
}

export async function getFieldServiceDashboard(
  db: D1Database,
  companyId: string
): Promise<{
  orders_today: number;
  orders_in_progress: number;
  orders_completed_today: number;
  technicians_active: number;
  avg_completion_time_hours: number;
  avg_rating: number;
  revenue_this_month: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const ordersToday = await db.prepare(`
    SELECT COUNT(*) as count FROM field_service_orders 
    WHERE company_id = ? AND scheduled_date = ?
  `).bind(companyId, today).first<{ count: number }>();
  
  const ordersInProgress = await db.prepare(`
    SELECT COUNT(*) as count FROM field_service_orders 
    WHERE company_id = ? AND status = 'in_progress'
  `).bind(companyId).first<{ count: number }>();
  
  const ordersCompletedToday = await db.prepare(`
    SELECT COUNT(*) as count FROM field_service_orders 
    WHERE company_id = ? AND status = 'completed' AND DATE(completed_at) = ?
  `).bind(companyId, today).first<{ count: number }>();
  
  const techniciansActive = await db.prepare(`
    SELECT COUNT(DISTINCT assigned_technician_id) as count FROM field_service_orders 
    WHERE company_id = ? AND scheduled_date = ? AND status IN ('dispatched', 'in_progress')
  `).bind(companyId, today).first<{ count: number }>();
  
  const completionStats = await db.prepare(`
    SELECT 
      AVG((julianday(completed_at) - julianday(started_at)) * 24) as avg_hours,
      AVG(rating) as avg_rating
    FROM field_service_orders 
    WHERE company_id = ? AND status = 'completed' AND started_at IS NOT NULL
  `).bind(companyId).first();
  
  const revenue = await db.prepare(`
    SELECT COALESCE(SUM(p.total_price), 0) as parts_revenue
    FROM field_service_parts p
    JOIN field_service_orders o ON p.order_id = o.id
    WHERE o.company_id = ? AND o.status = 'completed' AND DATE(o.completed_at) >= ?
  `).bind(companyId, monthStart).first<{ parts_revenue: number }>();
  
  return {
    orders_today: ordersToday?.count || 0,
    orders_in_progress: ordersInProgress?.count || 0,
    orders_completed_today: ordersCompletedToday?.count || 0,
    technicians_active: techniciansActive?.count || 0,
    avg_completion_time_hours: Math.round(((completionStats as Record<string, number>)?.avg_hours || 0) * 100) / 100,
    avg_rating: Math.round(((completionStats as Record<string, number>)?.avg_rating || 0) * 10) / 10,
    revenue_this_month: revenue?.parts_revenue || 0
  };
}
