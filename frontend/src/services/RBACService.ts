/**
 * Role-Based Access Control (RBAC) Service
 * Handles permissions and access control across the ARIA ERP system
 */

import { apiClient } from '../utils/api';
import { getUserFromToken } from '../utils/auth';

// Permission actions
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'import' | 'admin';

// Resource types (modules)
export type ResourceType =
  | 'dashboard'
  | 'quotes'
  | 'sales_orders'
  | 'deliveries'
  | 'invoices'
  | 'customers'
  | 'suppliers'
  | 'purchase_orders'
  | 'bills'
  | 'payments'
  | 'receipts'
  | 'products'
  | 'inventory'
  | 'warehouses'
  | 'employees'
  | 'departments'
  | 'payroll'
  | 'leave'
  | 'attendance'
  | 'projects'
  | 'tasks'
  | 'timesheets'
  | 'work_orders'
  | 'bom'
  | 'production'
  | 'field_service'
  | 'helpdesk'
  | 'reports'
  | 'analytics'
  | 'settings'
  | 'users'
  | 'roles'
  | 'audit_trail'
  | 'integrations'
  | 'bots'
  | 'documents'
  | 'compliance'
  | 'tax'
  | 'banking'
  | 'fixed_assets'
  | 'budgets'
  | 'expense_claims'
  | 'all';

export interface Permission {
  id: string;
  resource: ResourceType;
  action: PermissionAction;
  conditions?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissions {
  userId: string;
  roles: Role[];
  directPermissions: Permission[];
  effectivePermissions: Permission[];
}

// Default system roles
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  SALES_REP: 'sales_rep',
  PURCHASING: 'purchasing',
  HR: 'hr',
  WAREHOUSE: 'warehouse',
  VIEWER: 'viewer',
} as const;

class RBACService {
  private baseUrl = '/api/rbac';
  private cachedPermissions: UserPermissions | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if current user has permission for an action on a resource
   */
  async hasPermission(resource: ResourceType, action: PermissionAction): Promise<boolean> {
    const permissions = await this.getCurrentUserPermissions();
    
    // Super admin has all permissions
    if (permissions.roles.some(r => r.name === SYSTEM_ROLES.SUPER_ADMIN)) {
      return true;
    }

    // Check effective permissions
    return permissions.effectivePermissions.some(
      p => (p.resource === resource || p.resource === 'all') && p.action === action
    );
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    checks: Array<{ resource: ResourceType; action: PermissionAction }>
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const check of checks) {
      const key = `${check.resource}:${check.action}`;
      results[key] = await this.hasPermission(check.resource, check.action);
    }
    
    return results;
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasRole(roleNames: string | string[]): Promise<boolean> {
    const permissions = await this.getCurrentUserPermissions();
    const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
    
    return permissions.roles.some(r => roles.includes(r.name));
  }

  /**
   * Get current user's permissions
   */
  async getCurrentUserPermissions(): Promise<UserPermissions> {
    // Check cache
    if (this.cachedPermissions && Date.now() < this.cacheExpiry) {
      return this.cachedPermissions;
    }

    try {
      const response = await apiClient.get(`${this.baseUrl}/my-permissions`);
      this.cachedPermissions = response.data;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return response.data;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Return default permissions based on token
      return this.getDefaultPermissions();
    }
  }

  /**
   * Clear permissions cache (call after role changes)
   */
  clearCache(): void {
    this.cachedPermissions = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get all roles
   */
  async getRoles(): Promise<Role[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/roles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching roles:', error);
      return this.getDefaultRoles();
    }
  }

  /**
   * Get a specific role
   */
  async getRole(roleId: string): Promise<Role | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/roles/${roleId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching role:', error);
      return null;
    }
  }

  /**
   * Create a new role
   */
  async createRole(role: Omit<Role, 'id' | 'isSystem' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const response = await apiClient.post(`${this.baseUrl}/roles`, role);
    return response.data;
  }

  /**
   * Update a role
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const response = await apiClient.put(`${this.baseUrl}/roles/${roleId}`, updates);
    this.clearCache();
    return response.data;
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/roles/${roleId}`);
    this.clearCache();
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/users/${userId}/roles`, { roleId });
    this.clearCache();
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/users/${userId}/roles/${roleId}`);
    this.clearCache();
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/users/${userId}/roles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  /**
   * Grant direct permission to user
   */
  async grantPermission(
    userId: string,
    resource: ResourceType,
    action: PermissionAction,
    conditions?: Record<string, unknown>
  ): Promise<void> {
    await apiClient.post(`${this.baseUrl}/users/${userId}/permissions`, {
      resource,
      action,
      conditions,
    });
    this.clearCache();
  }

  /**
   * Revoke direct permission from user
   */
  async revokePermission(userId: string, permissionId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/users/${userId}/permissions/${permissionId}`);
    this.clearCache();
  }

  /**
   * Get all available permissions
   */
  async getAvailablePermissions(): Promise<Array<{ resource: ResourceType; actions: PermissionAction[] }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/permissions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching available permissions:', error);
      return this.getDefaultAvailablePermissions();
    }
  }

  /**
   * Check if user can access a specific record
   */
  async canAccessRecord(
    resource: ResourceType,
    recordId: string,
    action: PermissionAction
  ): Promise<boolean> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/check-access`, {
        params: { resource, recordId, action },
      });
      return response.data.allowed;
    } catch (error) {
      console.error('Error checking record access:', error);
      // Fall back to general permission check
      return this.hasPermission(resource, action);
    }
  }

  /**
   * Get default permissions based on user token
   */
  private getDefaultPermissions(): UserPermissions {
    const user = getUserFromToken();
    const role = user?.role || 'viewer';

    const defaultRole = this.getDefaultRoles().find(r => r.name === role) || 
                        this.getDefaultRoles().find(r => r.name === 'viewer')!;

    return {
      userId: user?.id || '',
      roles: [defaultRole],
      directPermissions: [],
      effectivePermissions: defaultRole.permissions,
    };
  }

  /**
   * Get default roles
   */
  private getDefaultRoles(): Role[] {
    const now = new Date().toISOString();
    
    return [
      {
        id: 'super_admin',
        name: SYSTEM_ROLES.SUPER_ADMIN,
        description: 'Full system access',
        permissions: [{ id: 'all', resource: 'all', action: 'admin' }],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'admin',
        name: SYSTEM_ROLES.ADMIN,
        description: 'Administrative access',
        permissions: [
          { id: 'admin_read', resource: 'all', action: 'read' },
          { id: 'admin_create', resource: 'all', action: 'create' },
          { id: 'admin_update', resource: 'all', action: 'update' },
          { id: 'admin_delete', resource: 'all', action: 'delete' },
          { id: 'admin_approve', resource: 'all', action: 'approve' },
          { id: 'admin_export', resource: 'all', action: 'export' },
          { id: 'admin_import', resource: 'all', action: 'import' },
        ],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'manager',
        name: SYSTEM_ROLES.MANAGER,
        description: 'Department manager access',
        permissions: [
          { id: 'mgr_read', resource: 'all', action: 'read' },
          { id: 'mgr_create', resource: 'all', action: 'create' },
          { id: 'mgr_update', resource: 'all', action: 'update' },
          { id: 'mgr_approve', resource: 'all', action: 'approve' },
          { id: 'mgr_export', resource: 'reports', action: 'export' },
        ],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'accountant',
        name: SYSTEM_ROLES.ACCOUNTANT,
        description: 'Financial operations access',
        permissions: [
          { id: 'acc_invoices', resource: 'invoices', action: 'create' },
          { id: 'acc_invoices_read', resource: 'invoices', action: 'read' },
          { id: 'acc_invoices_update', resource: 'invoices', action: 'update' },
          { id: 'acc_bills', resource: 'bills', action: 'create' },
          { id: 'acc_bills_read', resource: 'bills', action: 'read' },
          { id: 'acc_payments', resource: 'payments', action: 'create' },
          { id: 'acc_receipts', resource: 'receipts', action: 'create' },
          { id: 'acc_reports', resource: 'reports', action: 'read' },
          { id: 'acc_reports_export', resource: 'reports', action: 'export' },
          { id: 'acc_banking', resource: 'banking', action: 'read' },
          { id: 'acc_tax', resource: 'tax', action: 'read' },
        ],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sales_rep',
        name: SYSTEM_ROLES.SALES_REP,
        description: 'Sales operations access',
        permissions: [
          { id: 'sales_quotes', resource: 'quotes', action: 'create' },
          { id: 'sales_quotes_read', resource: 'quotes', action: 'read' },
          { id: 'sales_quotes_update', resource: 'quotes', action: 'update' },
          { id: 'sales_orders', resource: 'sales_orders', action: 'create' },
          { id: 'sales_orders_read', resource: 'sales_orders', action: 'read' },
          { id: 'sales_customers', resource: 'customers', action: 'read' },
          { id: 'sales_customers_create', resource: 'customers', action: 'create' },
          { id: 'sales_products', resource: 'products', action: 'read' },
        ],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'viewer',
        name: SYSTEM_ROLES.VIEWER,
        description: 'Read-only access',
        permissions: [
          { id: 'viewer_dashboard', resource: 'dashboard', action: 'read' },
          { id: 'viewer_reports', resource: 'reports', action: 'read' },
        ],
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  /**
   * Get default available permissions
   */
  private getDefaultAvailablePermissions(): Array<{ resource: ResourceType; actions: PermissionAction[] }> {
    const resources: ResourceType[] = [
      'dashboard', 'quotes', 'sales_orders', 'deliveries', 'invoices',
      'customers', 'suppliers', 'purchase_orders', 'bills', 'payments',
      'receipts', 'products', 'inventory', 'warehouses', 'employees',
      'departments', 'payroll', 'leave', 'attendance', 'projects',
      'tasks', 'timesheets', 'work_orders', 'bom', 'production',
      'field_service', 'helpdesk', 'reports', 'analytics', 'settings',
      'users', 'roles', 'audit_trail', 'integrations', 'bots',
      'documents', 'compliance', 'tax', 'banking', 'fixed_assets',
      'budgets', 'expense_claims',
    ];

    const actions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'approve', 'export', 'import'];

    return resources.map(resource => ({
      resource,
      actions: resource === 'settings' || resource === 'users' || resource === 'roles'
        ? [...actions, 'admin']
        : actions,
    }));
  }
}

export const rbacService = new RBACService();
export default rbacService;

// React hook for permission checking
export function usePermission(resource: ResourceType, action: PermissionAction): {
  hasPermission: boolean;
  loading: boolean;
} {
  // This would be implemented as a React hook in a separate file
  // For now, return a placeholder
  return { hasPermission: true, loading: false };
}

// Higher-order component for permission-based rendering
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  resource: ResourceType,
  action: PermissionAction
): React.ComponentType<P> {
  // This would be implemented as an HOC in a separate file
  return WrappedComponent;
}
