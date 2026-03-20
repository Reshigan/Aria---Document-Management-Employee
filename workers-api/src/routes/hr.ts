/**
 * HR Routes
 * Employees, Departments, Time Entries, Leave Requests
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get company_id
async function getAuthenticatedCompanyId(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return (payload as any).company_id || null;
  } catch {
    return null;
  }
}

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// ==================== EMPLOYEES ====================

// List all employees
app.get('/employees', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
        departmentId = generateUUID();
        const deptCode = department.substring(0, 10).toUpperCase().replace(/\s+/g, '-');
        await c.env.DB.prepare(`
          INSERT INTO departments (id, company_id, department_code, department_name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(departmentId, companyId, deptCode, department, 1, new Date().toISOString(), new Date().toISOString()).run();
      }
    }
    
    const id = generateUUID();
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
        departmentId = generateUUID();
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const { name, code, description, manager_id } = body;
    
    if (!name) {
      return c.json({ error: 'Department name is required' }, 400);
    }
    
    const id = generateUUID();
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
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

export default app;
