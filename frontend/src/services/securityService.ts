import { api } from '@/lib/api';

// Security Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    username: string;
    email: string;
    full_name?: string;
    is_superuser: boolean;
  };
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface TwoFactorSetupResponse {
  secret_key: string;
  qr_code: string;
  backup_codes: string[];
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface TwoFactorStatus {
  is_enabled: boolean;
  backup_codes_count: number;
}

export interface APIKeyCreate {
  name: string;
  permissions: string[];
  rate_limit?: number;
  expires_at?: string;
}

export interface APIKeyResponse {
  id: number;
  name: string;
  permissions: string[];
  rate_limit: number;
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
}

export interface APIKeyWithSecret extends APIKeyResponse {
  key: string;
}

export interface UserSession {
  id: number;
  device_info: string;
  ip_address: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_current: boolean;
}

export interface SecurityEvent {
  id: number;
  event_type: string;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  resource: string;
  resource_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: string;
  user: {
    id: number;
    username: string;
  };
}

export interface SecurityDashboard {
  active_sessions: number;
  recent_logins: number;
  failed_attempts: number;
  security_events: number;
  two_factor_enabled: boolean;
  account_locked: boolean;
  password_last_changed: string;
  recent_events: SecurityEvent[];
}

export interface Role {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  permissions: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface UserRoleAssignment {
  user_id: number;
  role_id: number;
}

class SecurityService {
  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post('/api/security/login', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    await api.post('/api/security/logout');
  }

  async refreshToken(): Promise<LoginResponse> {
    const response = await api.post('/api/security/refresh');
    return response.data;
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.post('/api/security/change-password', data);
  }

  // Session Management
  async getSessions(): Promise<UserSession[]> {
    const response = await api.get('/api/security/sessions');
    return response.data;
  }

  async terminateSession(sessionId: number): Promise<void> {
    await api.delete(`/api/security/sessions/${sessionId}`);
  }

  async terminateAllSessions(): Promise<void> {
    await api.delete('/api/security/sessions');
  }

  // Two-Factor Authentication
  async setup2FA(): Promise<TwoFactorSetupResponse> {
    const response = await api.post('/api/security/2fa/setup');
    return response.data;
  }

  async verify2FA(data: TwoFactorVerifyRequest): Promise<void> {
    await api.post('/api/security/2fa/verify', data);
  }

  async disable2FA(data: TwoFactorVerifyRequest): Promise<void> {
    await api.post('/api/security/2fa/disable', data);
  }

  async get2FAStatus(): Promise<TwoFactorStatus> {
    const response = await api.get('/api/security/2fa/status');
    return response.data;
  }

  async regenerateBackupCodes(): Promise<string[]> {
    const response = await api.post('/api/security/2fa/regenerate-backup-codes');
    return response.data.backup_codes;
  }

  // API Key Management
  async createAPIKey(data: APIKeyCreate): Promise<APIKeyWithSecret> {
    const response = await api.post('/api/security/api-keys', data);
    return response.data;
  }

  async getAPIKeys(): Promise<APIKeyResponse[]> {
    const response = await api.get('/api/security/api-keys');
    return response.data;
  }

  async updateAPIKey(keyId: number, data: Partial<APIKeyCreate>): Promise<APIKeyResponse> {
    const response = await api.put(`/api/security/api-keys/${keyId}`, data);
    return response.data;
  }

  async deleteAPIKey(keyId: number): Promise<void> {
    await api.delete(`/api/security/api-keys/${keyId}`);
  }

  // Role Management (Admin)
  async getRoles(): Promise<Role[]> {
    const response = await api.get('/api/security/roles');
    return response.data;
  }

  async createRole(data: { name: string; description: string; permission_ids: number[] }): Promise<Role> {
    const response = await api.post('/api/security/roles', data);
    return response.data;
  }

  async updateRole(roleId: number, data: { name?: string; description?: string; permission_ids?: number[] }): Promise<Role> {
    const response = await api.put(`/api/security/roles/${roleId}`, data);
    return response.data;
  }

  async deleteRole(roleId: number): Promise<void> {
    await api.delete(`/api/security/roles/${roleId}`);
  }

  async getPermissions(): Promise<Permission[]> {
    const response = await api.get('/api/security/permissions');
    return response.data;
  }

  async assignUserRole(data: UserRoleAssignment): Promise<void> {
    await api.post('/api/security/user-roles', data);
  }

  async removeUserRole(userId: number, roleId: number): Promise<void> {
    await api.delete(`/api/security/user-roles/${userId}/${roleId}`);
  }

  // Security Dashboard
  async getSecurityDashboard(): Promise<SecurityDashboard> {
    const response = await api.get('/api/security/dashboard');
    return response.data;
  }

  // Audit Logs
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    resource?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ items: AuditLog[]; total: number; page: number; pages: number }> {
    const response = await api.get('/api/security/audit-logs', { params });
    return response.data;
  }

  // Security Events
  async getSecurityEvents(params?: {
    page?: number;
    limit?: number;
    event_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ items: SecurityEvent[]; total: number; page: number; pages: number }> {
    const response = await api.get('/api/security/events', { params });
    return response.data;
  }

  // Account Management
  async unlockAccount(userId: number): Promise<void> {
    await api.post(`/api/security/unlock-account/${userId}`);
  }

  async lockAccount(userId: number, reason: string): Promise<void> {
    await api.post(`/api/security/lock-account/${userId}`, { reason });
  }
}

export const securityService = new SecurityService();