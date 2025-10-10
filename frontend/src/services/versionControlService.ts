import { api } from '../lib/api';

// Types
export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: string;
  branch_name: string;
  parent_version_id?: number;
  title: string;
  description?: string;
  status: 'DRAFT' | 'COMMITTED' | 'MERGED' | 'ARCHIVED';
  is_current: boolean;
  is_published: boolean;
  file_path: string;
  file_size: number;
  file_hash: string;
  mime_type: string;
  change_summary?: string;
  change_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'RENAME' | 'PERMISSION_CHANGE';
  changes_count: number;
  created_by: number;
  committed_by?: number;
  created_at: string;
  committed_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface DocumentBranch {
  id: number;
  document_id: number;
  name: string;
  description?: string;
  is_default: boolean;
  is_protected: boolean;
  is_active: boolean;
  source_version_id?: number;
  created_by: number;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export interface DocumentChange {
  id: number;
  version_id: number;
  change_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  line_number?: number;
  character_position?: number;
  section?: string;
  description?: string;
  impact_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_by: number;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface MergeRequest {
  id: number;
  document_id: number;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  source_version_id: number;
  target_version_id: number;
  source_branch: string;
  target_branch: string;
  merged_version_id?: number;
  has_conflicts: boolean;
  conflicts_resolved: boolean;
  auto_mergeable: boolean;
  created_by: number;
  assigned_to?: number;
  merged_by?: number;
  created_at: string;
  updated_at?: string;
  merged_at?: string;
  metadata?: Record<string, any>;
  merge_strategy: 'auto' | 'manual' | 'force';
}

export interface MergeConflict {
  id: number;
  merge_request_id: number;
  conflict_type: 'CONTENT' | 'METADATA' | 'PERMISSIONS' | 'STRUCTURE';
  field_name?: string;
  section?: string;
  source_value?: string;
  target_value?: string;
  resolved_value?: string;
  is_resolved: boolean;
  resolution_strategy?: 'source' | 'target' | 'manual' | 'custom';
  resolved_by?: number;
  created_at: string;
  resolved_at?: string;
  metadata?: Record<string, any>;
}

export interface VersionComparison {
  id: number;
  document_id: number;
  version_a_id: number;
  version_b_id: number;
  differences_count: number;
  similarity_score: number;
  summary?: string;
  created_at: string;
  expires_at?: string;
}

export interface VersionTag {
  id: number;
  document_id: number;
  version_id: number;
  name: string;
  description?: string;
  tag_type: 'release' | 'milestone' | 'snapshot' | 'backup';
  is_protected: boolean;
  color?: string;
  created_by: number;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface VersionControlStats {
  total_versions: number;
  total_branches: number;
  total_merge_requests: number;
  pending_merge_requests: number;
  total_conflicts: number;
  unresolved_conflicts: number;
  total_tags: number;
  recent_activity: Array<{
    type: string;
    version_id?: number;
    version_number?: string;
    created_at: string;
    created_by: number;
  }>;
}

export interface CreateVersionRequest {
  document_id: number;
  version_number: string;
  branch_name?: string;
  parent_version_id?: number;
  title: string;
  description?: string;
  status?: 'DRAFT' | 'COMMITTED' | 'MERGED' | 'ARCHIVED';
  is_published?: boolean;
  file_path: string;
  file_size: number;
  file_hash: string;
  mime_type: string;
  change_summary?: string;
  change_type?: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'RENAME' | 'PERMISSION_CHANGE';
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface CreateBranchRequest {
  document_id: number;
  name: string;
  description?: string;
  is_protected?: boolean;
  source_version_id?: number;
  metadata?: Record<string, any>;
}

export interface CreateMergeRequestRequest {
  document_id: number;
  title: string;
  description?: string;
  source_version_id: number;
  target_version_id: number;
  source_branch: string;
  target_branch: string;
  assigned_to?: number;
  merge_strategy?: 'auto' | 'manual' | 'force';
  metadata?: Record<string, any>;
}

export interface CreateVersionTagRequest {
  document_id: number;
  version_id: number;
  name: string;
  description?: string;
  tag_type?: 'release' | 'milestone' | 'snapshot' | 'backup';
  is_protected?: boolean;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

class VersionControlService {
  // Version Management
  async createVersion(data: CreateVersionRequest): Promise<DocumentVersion> {
    const response = await api.post('/api/v1/version-control/versions', data);
    return response.data;
  }

  async getVersion(versionId: number): Promise<DocumentVersion> {
    const response = await api.get(`/api/v1/version-control/versions/${versionId}`);
    return response.data;
  }

  async getDocumentVersions(
    documentId: number,
    options: {
      branch_name?: string;
      status?: string;
      page?: number;
      page_size?: number;
    } = {}
  ): Promise<ListResponse<DocumentVersion>> {
    const params = new URLSearchParams();
    if (options.branch_name) params.append('branch_name', options.branch_name);
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());

    const response = await api.get(
      `/api/v1/version-control/documents/${documentId}/versions?${params.toString()}`
    );
    return response.data;
  }

  async updateVersion(
    versionId: number,
    data: Partial<DocumentVersion>
  ): Promise<DocumentVersion> {
    const response = await api.put(`/api/v1/version-control/versions/${versionId}`, data);
    return response.data;
  }

  async deleteVersion(versionId: number): Promise<void> {
    await api.delete(`/api/v1/version-control/versions/${versionId}`);
  }

  // Branch Management
  async createBranch(data: CreateBranchRequest): Promise<DocumentBranch> {
    const response = await api.post('/api/v1/version-control/branches', data);
    return response.data;
  }

  async getDocumentBranches(documentId: number): Promise<DocumentBranch[]> {
    const response = await api.get(`/api/v1/version-control/documents/${documentId}/branches`);
    return response.data;
  }

  async updateBranch(
    branchId: number,
    data: Partial<DocumentBranch>
  ): Promise<DocumentBranch> {
    const response = await api.put(`/api/v1/version-control/branches/${branchId}`, data);
    return response.data;
  }

  async deleteBranch(branchId: number): Promise<void> {
    await api.delete(`/api/v1/version-control/branches/${branchId}`);
  }

  // Merge Request Management
  async createMergeRequest(data: CreateMergeRequestRequest): Promise<MergeRequest> {
    const response = await api.post('/api/v1/version-control/merge-requests', data);
    return response.data;
  }

  async getMergeRequests(options: {
    document_id?: number;
    status?: string;
    assigned_to?: number;
    page?: number;
    page_size?: number;
  } = {}): Promise<ListResponse<MergeRequest>> {
    const params = new URLSearchParams();
    if (options.document_id) params.append('document_id', options.document_id.toString());
    if (options.status) params.append('status', options.status);
    if (options.assigned_to) params.append('assigned_to', options.assigned_to.toString());
    if (options.page) params.append('page', options.page.toString());
    if (options.page_size) params.append('page_size', options.page_size.toString());

    const response = await api.get(`/api/v1/version-control/merge-requests?${params.toString()}`);
    return response.data;
  }

  async updateMergeRequest(
    mergeRequestId: number,
    data: Partial<MergeRequest>
  ): Promise<MergeRequest> {
    const response = await api.put(`/api/v1/version-control/merge-requests/${mergeRequestId}`, data);
    return response.data;
  }

  async mergeVersions(mergeRequestId: number): Promise<DocumentVersion> {
    const response = await api.post(`/api/v1/version-control/merge-requests/${mergeRequestId}/merge`);
    return response.data;
  }

  // Version Comparison
  async compareVersions(
    documentId: number,
    versionAId: number,
    versionBId: number
  ): Promise<VersionComparison> {
    const response = await api.post('/api/v1/version-control/compare', {
      document_id: documentId,
      version_a_id: versionAId,
      version_b_id: versionBId,
    });
    return response.data;
  }

  // Version Tags
  async createVersionTag(data: CreateVersionTagRequest): Promise<VersionTag> {
    const response = await api.post('/api/v1/version-control/tags', data);
    return response.data;
  }

  async getVersionTags(documentId: number): Promise<VersionTag[]> {
    const response = await api.get(`/api/v1/version-control/documents/${documentId}/tags`);
    return response.data;
  }

  // Statistics
  async getVersionControlStats(documentId?: number): Promise<VersionControlStats> {
    const params = documentId ? `?document_id=${documentId}` : '';
    const response = await api.get(`/api/v1/version-control/stats${params}`);
    return response.data;
  }

  // Bulk Operations
  async bulkVersionOperations(
    operation: 'delete' | 'archive' | 'publish' | 'unpublish' | 'tag',
    versionIds: number[],
    parameters?: Record<string, any>
  ): Promise<{
    operation: string;
    total_items: number;
    successful_items: number;
    failed_items: number;
    errors: string[];
    results: Array<Record<string, any>>;
  }> {
    const response = await api.post('/api/v1/version-control/versions/bulk', {
      operation,
      version_ids: versionIds,
      parameters,
    });
    return response.data;
  }

  // Utility Methods
  getVersionStatusColor(status: string): string {
    const colors = {
      DRAFT: '#faad14',
      COMMITTED: '#52c41a',
      MERGED: '#1890ff',
      ARCHIVED: '#8c8c8c',
    };
    return colors[status as keyof typeof colors] || '#d9d9d9';
  }

  getMergeStatusColor(status: string): string {
    const colors = {
      PENDING: '#faad14',
      IN_PROGRESS: '#1890ff',
      COMPLETED: '#52c41a',
      FAILED: '#ff4d4f',
      CANCELLED: '#8c8c8c',
    };
    return colors[status as keyof typeof colors] || '#d9d9d9';
  }

  getImpactLevelColor(level: string): string {
    const colors = {
      LOW: '#52c41a',
      MEDIUM: '#faad14',
      HIGH: '#ff7a45',
      CRITICAL: '#ff4d4f',
    };
    return colors[level as keyof typeof colors] || '#d9d9d9';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatVersionNumber(version: string): string {
    // Add 'v' prefix if not present
    return version.startsWith('v') ? version : `v${version}`;
  }

  generateVersionNumber(lastVersion?: string): string {
    if (!lastVersion) return '1.0';
    
    const parts = lastVersion.replace('v', '').split('.');
    const major = parseInt(parts[0] || '1');
    const minor = parseInt(parts[1] || '0');
    
    return `${major}.${minor + 1}`;
  }
}

export const versionControlService = new VersionControlService();