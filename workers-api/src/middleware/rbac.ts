/**
 * RBAC (Role-Based Access Control) Middleware
 * 
 * This middleware checks if the authenticated user has the required permissions
 * to perform an action on a resource.
 */

import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface Permission {
  can_create: number;
  can_read: number;
  can_update: number;
  can_delete: number;
  can_approve: number;
}

type Action = 'create' | 'read' | 'update' | 'delete' | 'approve';

/**
 * Get user's permissions for a specific permission code
 */
async function getUserPermissions(
  db: D1Database,
  userId: string,
  companyId: string,
  permissionCode: string
): Promise<Permission | null> {
  const result = await db.prepare(`
    SELECT 
      MAX(rp.can_create) as can_create,
      MAX(rp.can_read) as can_read,
      MAX(rp.can_update) as can_update,
      MAX(rp.can_delete) as can_delete,
      MAX(rp.can_approve) as can_approve
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = ? AND ur.company_id = ? AND p.permission_code = ?
  `).bind(userId, companyId, permissionCode).first();
  
  if (!result) return null;
  
  const r = result as Record<string, unknown>;
  return {
    can_create: Number(r.can_create) || 0,
    can_read: Number(r.can_read) || 0,
    can_update: Number(r.can_update) || 0,
    can_delete: Number(r.can_delete) || 0,
    can_approve: Number(r.can_approve) || 0
  };
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  db: D1Database,
  userId: string,
  companyId: string,
  permissionCode: string,
  action: Action
): Promise<boolean> {
  const permissions = await getUserPermissions(db, userId, companyId, permissionCode);
  
  if (!permissions) {
    // If no specific permissions found, check if user is admin
    const isAdmin = await db.prepare(`
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND ur.company_id = ? AND r.role_code = 'ADMIN'
    `).bind(userId, companyId).first();
    
    return !!isAdmin;
  }
  
  const actionMap: Record<Action, keyof Permission> = {
    create: 'can_create',
    read: 'can_read',
    update: 'can_update',
    delete: 'can_delete',
    approve: 'can_approve'
  };
  
  return permissions[actionMap[action]] === 1;
}

/**
 * RBAC middleware factory
 * Creates middleware that checks for specific permission and action
 * Note: This middleware is optional - routes can use it for fine-grained permission checks
 * For now, basic JWT auth is enforced at the route level
 */
export function requirePermission(permissionCode: string, action: Action) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    try {
      const env = c.env as Env;
      const token = authHeader.substring(7);
      const secretKey = new TextEncoder().encode(env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secretKey);
      
      const userId = (payload as any).sub;
      const companyId = (payload as any).company_id;
      
      if (!userId || !companyId) {
        return c.json({ error: 'Invalid token' }, 401);
      }
      
      // Check permission
      const allowed = await hasPermission(env.DB, userId, companyId, permissionCode, action);
      
      if (!allowed) {
        return c.json({ 
          error: 'Permission denied',
          required_permission: permissionCode,
          required_action: action
        }, 403);
      }
      
      await next();
    } catch (error) {
      console.error('RBAC error:', error);
      return c.json({ error: 'Authentication failed' }, 401);
    }
  };
}

/**
 * Get all permissions for a user
 */
export async function getAllUserPermissions(
  db: D1Database,
  userId: string,
  companyId: string
): Promise<Record<string, Permission>> {
  const result = await db.prepare(`
    SELECT 
      p.permission_code,
      MAX(rp.can_create) as can_create,
      MAX(rp.can_read) as can_read,
      MAX(rp.can_update) as can_update,
      MAX(rp.can_delete) as can_delete,
      MAX(rp.can_approve) as can_approve
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = ? AND ur.company_id = ?
    GROUP BY p.permission_code
  `).bind(userId, companyId).all();
  
  const permissions: Record<string, Permission> = {};
  for (const row of result.results || []) {
    const r = row as any;
    permissions[r.permission_code] = {
      can_create: r.can_create,
      can_read: r.can_read,
      can_update: r.can_update,
      can_delete: r.can_delete,
      can_approve: r.can_approve
    };
  }
  
  return permissions;
}

/**
 * Assign a role to a user
 */
export async function assignRole(
  db: D1Database,
  userId: string,
  roleId: string,
  companyId: string,
  assignedBy: string
): Promise<boolean> {
  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT OR REPLACE INTO user_roles (id, user_id, role_id, company_id, assigned_by, assigned_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, userId, roleId, companyId, assignedBy, new Date().toISOString()).run();
    return true;
  } catch (error) {
    console.error('Assign role error:', error);
    return false;
  }
}

/**
 * Remove a role from a user
 */
export async function removeRole(
  db: D1Database,
  userId: string,
  roleId: string,
  companyId: string
): Promise<boolean> {
  try {
    await db.prepare(`
      DELETE FROM user_roles WHERE user_id = ? AND role_id = ? AND company_id = ?
    `).bind(userId, roleId, companyId).run();
    return true;
  } catch (error) {
    console.error('Remove role error:', error);
    return false;
  }
}

export default {
  hasPermission,
  requirePermission,
  getAllUserPermissions,
  assignRole,
  removeRole
};
