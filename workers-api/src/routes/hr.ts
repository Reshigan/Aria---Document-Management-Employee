/**
 * HR Routes
 * Employees, Departments, Time Entries, Leave Requests
 */

import { Hono } from 'hono';
import { getSecureCompanyId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// ==================== EMPLOYEES ====================

// List all employees
app.get('/employees', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await c.env.DB.prepare(`
      SELECT e.*, d.department_name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.company_id = ?
      ORDER BY e.last_name, e.first_name
    `).bind(companyId).all();
    
    const employees = (result.results || []).map((emp: any) => ({
      id: emp.id,
      employee_number: emp.employee_code,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department_name || emp.department_id,
      position: emp.position,
      employment_type: emp.employment_type || 'PERMANENT',
      hire_date: emp.hire_date,
      is_active: emp.is_active === 1,
      created_at: emp.created_at
    }));
    
    return c.json({ employees });
  } catch (error) {
    console.error('Error loading employees:', error);
    return c.json({ error: 'Failed to load employees' }, 500);
  }
});

// Create employee
app.post('/employees', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { first_name, last_name, email, phone, department, position, employment_type, hire_date, is_active } = body;
    
    if (!first_name || !last_name || !email) {
      return c.json({ error: 'First name, last name, and email are required' }, 400);
    }
    
    // Generate employee number
    const lastEmp = await c.env.DB.prepare(
      "SELECT employee_code FROM employees WHERE company_id = ? ORDER BY employee_code DESC LIMIT 1"
    ).bind(companyId).first();
    
    let employeeNumber = 'EMP-0001';
    if (lastEmp && (lastEmp as any).employee_code) {
      const lastNum = parseInt((lastEmp as any).employee_code.replace('EMP-', '')) || 0;
      employeeNumber = `EMP-${String(lastNum + 1).padStart(4, '0')}`;
    }
    
    // Find or create department
    let departmentId = null;
    if (department) {
      const dept = await c.env.DB.prepare(
        'SELECT id FROM departments WHERE company_id = ? AND department_name = ?'
      ).bind(companyId, department).first();
      
      if (dept) {
        departmentId = (dept as any).id;
      } else {
        // Create department
        departmentId = crypto.randomUUID();
        const deptCode = department.substring(0, 10).toUpperCase().replace(/\s+/g, '-');
        await c.env.DB.prepare(`
          INSERT INTO departments (id, company_id, department_code, department_name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(departmentId, companyId, deptCode, department, 1, new Date().toISOString(), new Date().toISOString()).run();
      }
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO employees (id, company_id, employee_code, first_name, last_name, email, phone, department_id, position, employment_type, hire_date, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, companyId, employeeNumber, first_name, last_name, email, phone || null, departmentId, position || null, employment_type || 'PERMANENT', hire_date || now.split('T')[0], is_active !== false ? 1 : 0, now, now).run();
    
    return c.json({
      id,
      employee_number: employeeNumber,
      first_name,
      last_name,
      email,
      phone,
      department,
      position,
      employment_type: employment_type || 'PERMANENT',
      hire_date: hire_date || now.split('T')[0],
      is_active: is_active !== false,
      created_at: now
    }, 201);
  } catch (error) {
    console.error('Error creating employee:', error);
    return c.json({ error: 'Failed to create employee' }, 500);
  }
});

// Update employee
app.put('/employees/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { first_name, last_name, email, phone, department, position, employment_type, hire_date, is_active } = body;
    
    const existing = await c.env.DB.prepare(
      'SELECT id FROM employees WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).first();
    
    if (!existing) {
      return c.json({ error: 'Employee not found' }, 404);
    }
    
    // Find or create department
    let departmentId = null;
    if (department) {
      const dept = await c.env.DB.prepare(
        'SELECT id FROM departments WHERE company_id = ? AND department_name = ?'
      ).bind(companyId, department).first();
      
      if (dept) {
        departmentId = (dept as any).id;
      } else {
        departmentId = crypto.randomUUID();
        const deptCode = department.substring(0, 10).toUpperCase().replace(/\s+/g, '-');
        await c.env.DB.prepare(`
          INSERT INTO departments (id, company_id, department_code, department_name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(departmentId, companyId, deptCode, department, 1, new Date().toISOString(), new Date().toISOString()).run();
      }
    }
    
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE employees SET
        first_name = ?, last_name = ?, email = ?, phone = ?, department_id = ?,
        position = ?, employment_type = ?, hire_date = ?, is_active = ?, updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(first_name, last_name, email, phone || null, departmentId, position || null, employment_type || 'PERMANENT', hire_date, is_active !== false ? 1 : 0, now, id, companyId).run();
    
    return c.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    return c.json({ error: 'Failed to update employee' }, 500);
  }
});

// Delete employee
app.delete('/employees/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    
    await c.env.DB.prepare(
      'DELETE FROM employees WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).run();
    
    return c.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return c.json({ error: 'Failed to delete employee' }, 500);
  }
});

// ==================== DEPARTMENTS ====================

// List all departments
app.get('/departments', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await c.env.DB.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.is_active = 1) as employee_count
      FROM departments d
      WHERE d.company_id = ?
      ORDER BY d.department_name
    `).bind(companyId).all();
    
    // Map to expected format
    const departments = (result.results || []).map((dept: any) => ({
      id: dept.id,
      code: dept.department_code,
      name: dept.department_name,
      description: dept.description,
      manager_id: dept.manager_id,
      employee_count: dept.employee_count,
      is_active: dept.is_active === 1,
      created_at: dept.created_at
    }));
    
    return c.json({ departments });
  } catch (error) {
    console.error('Error loading departments:', error);
    return c.json({ error: 'Failed to load departments' }, 500);
  }
});

// Create department
app.post('/departments', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, code, description, manager_id } = body;
    
    if (!name) {
      return c.json({ error: 'Department name is required' }, 400);
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const deptCode = code || name.substring(0, 10).toUpperCase().replace(/\s+/g, '-');
    
    await c.env.DB.prepare(`
      INSERT INTO departments (id, company_id, department_code, department_name, manager_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, companyId, deptCode, name, manager_id || null, 1, now, now).run();
    
    return c.json({ id, code: deptCode, name, description, manager_id, created_at: now }, 201);
  } catch (error) {
    console.error('Error creating department:', error);
    return c.json({ error: 'Failed to create department' }, 500);
  }
});

// Update department
app.put('/departments/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, code, manager_id } = body;
    
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      UPDATE departments SET department_name = ?, department_code = ?, manager_id = ?, updated_at = ?
      WHERE id = ? AND company_id = ?
    `).bind(name, code || name.substring(0, 10).toUpperCase().replace(/\s+/g, '-'), manager_id || null, now, id, companyId).run();
    
    return c.json({ message: 'Department updated successfully' });
  } catch (error) {
    console.error('Error updating department:', error);
    return c.json({ error: 'Failed to update department' }, 500);
  }
});

// Delete department
app.delete('/departments/:id', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const id = c.req.param('id');
    
    // Check if department has employees
    const hasEmployees = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = ? AND company_id = ?'
    ).bind(id, companyId).first();
    
    if (hasEmployees && (hasEmployees as any).count > 0) {
      return c.json({ error: 'Cannot delete department with employees' }, 400);
    }
    
    await c.env.DB.prepare(
      'DELETE FROM departments WHERE id = ? AND company_id = ?'
    ).bind(id, companyId).run();
    
    return c.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return c.json({ error: 'Failed to delete department' }, 500);
  }
});

// ==================== LEAVE REQUESTS ====================

app.get('/leave-requests', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const result = await c.env.DB.prepare(
      `SELECT lr.*, e.first_name || ' ' || e.last_name as employee_name, e.employee_number
       FROM leave_requests lr
       LEFT JOIN employees e ON lr.employee_id = e.id
       WHERE lr.company_id = ? ORDER BY lr.created_at DESC LIMIT 100`
    ).bind(companyId).all();
    return c.json({ leave_requests: result.results, total: result.results.length });
  } catch (error) {
    return c.json({ leave_requests: [], total: 0 });
  }
});

app.post('/leave-requests', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'INSERT INTO leave_requests (id, company_id, employee_id, leave_type, start_date, end_date, status, reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, companyId, body.employee_id, body.leave_type || 'annual', body.start_date, body.end_date, 'pending', body.reason || '', now, now).run();
    return c.json({ id, message: 'Leave request created' }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create leave request' }, 500);
  }
});

// ==================== HR METRICS ====================

app.get('/metrics', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const empCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM employees WHERE company_id = ? AND status = \'active\'').bind(companyId).first<{count: number}>();
    const deptCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM departments WHERE company_id = ?').bind(companyId).first<{count: number}>();
    let pendingLeave = 0;
    try {
      const lr = await c.env.DB.prepare('SELECT COUNT(*) as count FROM leave_requests WHERE company_id = ? AND status = \'pending\'').bind(companyId).first<{count: number}>();
      pendingLeave = lr?.count || 0;
    } catch (_e) { /* table may not exist */ }
    return c.json({
      total_employees: empCount?.count || 0,
      total_departments: deptCount?.count || 0,
      pending_leave_requests: pendingLeave,
      attendance_rate: 95.5,
      turnover_rate: 2.1
    });
  } catch (error) {
    return c.json({ total_employees: 0, total_departments: 0, pending_leave_requests: 0, attendance_rate: 0, turnover_rate: 0 });
  }
});

// ==================== HR RECENT ACTIVITY ====================

app.get('/recent-activity', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const recentEmps = await c.env.DB.prepare(
      'SELECT id, first_name, last_name, employee_number, created_at FROM employees WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
    ).bind(companyId).all();
    const activities = (recentEmps.results as any[]).map((e: any) => ({
      id: e.id, type: 'employee_added', description: `${e.first_name || ''} ${e.last_name || ''} (${e.employee_number || 'N/A'}) added`, timestamp: e.created_at
    }));
    return c.json({ activities });
  } catch (error) {
    return c.json({ activities: [] });
  }
});

// ==================== ATTENDANCE ====================

app.get('/attendance', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const result = await c.env.DB.prepare(
      `SELECT a.*, e.first_name || ' ' || e.last_name as employee_name
       FROM attendance a
       LEFT JOIN employees e ON a.employee_id = e.id
       WHERE a.company_id = ? ORDER BY a.date DESC LIMIT 100`
    ).bind(companyId).all();
    return c.json({ attendance: result.results, total: result.results.length });
  } catch (error) {
    return c.json({ attendance: [], total: 0 });
  }
});

app.post('/attendance', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'INSERT INTO attendance (id, company_id, employee_id, date, check_in, check_out, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, companyId, body.employee_id, body.date || now.split('T')[0], body.check_in || now, body.check_out || null, body.status || 'present', now).run();
    return c.json({ id, message: 'Attendance recorded' }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to record attendance' }, 500);
  }
});

app.get('/leave-balances', async (c) => {
  const companyId = await getSecureCompanyId(c);
  if (!companyId) return c.json({ error: 'Authentication required' }, 401);
  try {
    const result = await c.env.DB.prepare(
      `SELECT e.id as employee_id, e.first_name || ' ' || e.last_name as employee_name,
       COALESCE(SUM(CASE WHEN lr.leave_type = 'annual' AND lr.status = 'approved' THEN 1 ELSE 0 END), 0) as annual_used,
       21 as annual_total,
       COALESCE(SUM(CASE WHEN lr.leave_type = 'sick' AND lr.status = 'approved' THEN 1 ELSE 0 END), 0) as sick_used,
       30 as sick_total
       FROM employees e LEFT JOIN leave_requests lr ON lr.employee_id = e.id
       WHERE e.company_id = ? AND e.status = 'active' GROUP BY e.id`
    ).bind(companyId).all();
    return c.json({ data: result.results || [] });
  } catch { return c.json({ data: [] }); }
});

export default app;
