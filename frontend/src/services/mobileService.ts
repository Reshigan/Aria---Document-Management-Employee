import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mobile API interfaces
export interface MobileDevice {
  id: number;
  device_id: string;
  device_name: string;
  device_type: string;
  platform_version?: string;
  app_version?: string;
  is_active: boolean;
  last_seen?: string;
  sync_enabled: boolean;
  offline_storage_limit: number;
  registration_date?: string;
  updated_at?: string;
}

export interface SyncSession {
  id: number;
  session_id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  total_items: number;
  synced_items: number;
  failed_items: number;
  data_transferred?: number;
}

export interface SyncItem {
  id: number;
  item_type: string;
  item_id: string;
  action: string;
  status: string;
  priority: number;
  retry_count: number;
  error_message?: string;
  size_bytes?: number;
  created_at: string;
}

export interface SyncConflict {
  id: number;
  item_type: string;
  item_id: string;
  conflict_type: string;
  server_version: any;
  client_version: any;
  resolution_strategy: string;
  created_at: string;
}

export interface OfflineDocument {
  id: number;
  document_id: number;
  download_status: string;
  download_priority: number;
  file_size?: number;
  downloaded_size: number;
  local_path?: string;
  expires_at?: string;
  created_at: string;
}

export interface PushNotification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  payload?: any;
  status: string;
  scheduled_at?: string;
  created_at: string;
}

export interface MobileAnalyticsEvent {
  id: number;
  event_type: string;
  event_data: any;
  session_id?: string;
  timestamp: string;
}

export interface StorageUsage {
  total_size: number;
  document_count: number;
  storage_limit: number;
  usage_percentage: number;
}

export interface SyncStatistics {
  total_sessions: number;
  successful_sessions: number;
  failed_sessions: number;
  success_rate: number;
  total_data_transferred: number;
}

export interface AppVersionInfo {
  version_number: string;
  platform: string;
  build_number?: string;
  release_date: string;
  is_required_update: boolean;
  download_url?: string;
  release_notes?: string;
  file_size?: number;
}

export interface UpdateCheckResult {
  update_required: boolean;
  update_available: boolean;
  latest_version?: string;
  download_url?: string;
  release_notes?: string;
}

class MobileService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Device Management
  async registerDevice(deviceData: {
    device_id: string;
    device_name: string;
    device_type: string;
    platform_version?: string;
    app_version?: string;
    push_token?: string;
    device_info?: any;
    sync_enabled?: boolean;
    offline_storage_limit?: number;
  }): Promise<{ success: boolean; device: MobileDevice }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/mobile/devices/register`,
      deviceData,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getUserDevices(): Promise<{ success: boolean; devices: MobileDevice[] }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/mobile/devices`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async updateDevice(deviceId: number, deviceData: Partial<MobileDevice>): Promise<{ success: boolean; device: MobileDevice }> {
    const response = await axios.put(
      `${API_BASE_URL}/api/mobile/devices/${deviceId}`,
      deviceData,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async deactivateDevice(deviceId: number): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(
      `${API_BASE_URL}/api/mobile/devices/${deviceId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Sync Management
  async startSyncSession(deviceId: number, syncType: string = 'incremental'): Promise<{ success: boolean; session: SyncSession }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/mobile/sync/start`,
      { device_id: deviceId, sync_type: syncType },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSyncSessions(deviceId: number, limit: number = 50): Promise<{ success: boolean; sessions: SyncSession[] }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/mobile/sync/sessions?device_id=${deviceId}&limit=${limit}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async addSyncItems(sessionId: number, items: any[]): Promise<{ success: boolean; items_added: number }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/mobile/sync/${sessionId}/items`,
      items,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSyncItems(sessionId: number, status?: string): Promise<{ success: boolean; items: SyncItem[] }> {
    const url = status 
      ? `${API_BASE_URL}/api/mobile/sync/${sessionId}/items?status=${status}`
      : `${API_BASE_URL}/api/mobile/sync/${sessionId}/items`;
    
    const response = await axios.get(url, { headers: this.getAuthHeaders() });
    return response.data;
  }

  async updateSyncItemStatus(itemId: number, status: string, errorMessage?: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.put(
      `${API_BASE_URL}/api/mobile/sync/items/${itemId}/status`,
      { status, error_message: errorMessage },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async completeSyncSession(sessionId: number, status: string = 'completed'): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/mobile/sync/${sessionId}/complete`,
      { status },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Offline Document Management
  async queueDocumentForOffline(deviceId: number, documentId: number, priority: number = 0): Promise<{ success: boolean; offline_document: OfflineDocument }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/mobile/offline/documents`,
      { device_id: deviceId, document_id: documentId, priority },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getOfflineDocuments(deviceId: number, status?: string): Promise<{ success: boolean; documents: OfflineDocument[] }> {
    const url = status 
      ? `${API_BASE_URL}/api/mobile/offline/documents?device_id=${deviceId}&status=${status}`
      : `${API_BASE_URL}/api/mobile/offline/documents?device_id=${deviceId}`;
    
    const response = await axios.get(url, { headers: this.getAuthHeaders() });
    return response.data;
  }

  async updateOfflineDocumentStatus(
    offlineDocId: number, 
    status: string, 
    downloadedSize?: number, 
    localPath?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.put(
      `${API_BASE_URL}/api/mobile/offline/documents/${offlineDocId}/status`,
      { status, downloaded_size: downloadedSize, local_path: localPath },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Settings Management
  async getMobileSettings(deviceId?: number): Promise<{ success: boolean; settings: Record<string, any> }> {
    const url = deviceId 
      ? `${API_BASE_URL}/api/mobile/settings?device_id=${deviceId}`
      : `${API_BASE_URL}/api/mobile/settings`;
    
    const response = await axios.get(url, { headers: this.getAuthHeaders() });
    return response.data;
  }

  async updateMobileSetting(
    settingKey: string, 
    settingValue: any, 
    deviceId?: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.put(
      `${API_BASE_URL}/api/mobile/settings`,
      { setting_key: settingKey, setting_value: settingValue, device_id: deviceId },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Push Notifications
  async createPushNotification(
    deviceId: number, 
    notificationData: {
      notification_type: string;
      title: string;
      message: string;
      payload?: any;
      scheduled_at?: string;
    }
  ): Promise<{ success: boolean; notification: PushNotification }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/mobile/notifications`,
      { device_id: deviceId, ...notificationData },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getPendingNotifications(deviceId?: number): Promise<{ success: boolean; notifications: PushNotification[] }> {
    const url = deviceId 
      ? `${API_BASE_URL}/api/mobile/notifications?device_id=${deviceId}`
      : `${API_BASE_URL}/api/mobile/notifications`;
    
    const response = await axios.get(url, { headers: this.getAuthHeaders() });
    return response.data;
  }

  // Analytics
  async logMobileEvent(
    deviceId: number, 
    eventData: {
      event_type: string;
      event_data?: any;
      session_id?: string;
      timestamp?: string;
    }
  ): Promise<{ success: boolean; event_id: number }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/mobile/analytics/events`,
      { device_id: deviceId, ...eventData },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getMobileAnalytics(
    deviceId?: number, 
    eventType?: string, 
    days: number = 30
  ): Promise<{ success: boolean; events: MobileAnalyticsEvent[] }> {
    const params = new URLSearchParams();
    if (deviceId) params.append('device_id', deviceId.toString());
    if (eventType) params.append('event_type', eventType);
    params.append('days', days.toString());
    
    const response = await axios.get(
      `${API_BASE_URL}/api/mobile/analytics?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // App Version Management
  async checkAppUpdate(platform: string, currentVersion: string): Promise<{ success: boolean } & UpdateCheckResult> {
    const response = await axios.get(
      `${API_BASE_URL}/api/mobile/app-version/check?platform=${platform}&current_version=${currentVersion}`
    );
    return response.data;
  }

  async getLatestAppVersion(platform: string): Promise<{ success: boolean; version: AppVersionInfo }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/mobile/app-version/latest?platform=${platform}`
    );
    return response.data;
  }

  // Device Statistics
  async getDeviceStorageUsage(deviceId: number): Promise<{ success: boolean; storage_usage: StorageUsage }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/mobile/devices/${deviceId}/storage`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSyncStatistics(deviceId: number, days: number = 30): Promise<{ success: boolean; sync_statistics: SyncStatistics }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/mobile/devices/${deviceId}/sync-stats?days=${days}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Conflict Resolution
  async getUnresolvedConflicts(deviceId: number): Promise<{ success: boolean; conflicts: SyncConflict[] }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/mobile/sync/conflicts?device_id=${deviceId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async resolveConflict(
    conflictId: number, 
    resolutionData: any
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/mobile/sync/conflicts/${conflictId}/resolve`,
      resolutionData,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Utility Methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatSyncStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  formatDeviceType(deviceType: string): string {
    const typeMap: Record<string, string> = {
      'ios': 'iOS',
      'android': 'Android',
      'tablet': 'Tablet',
      'desktop': 'Desktop'
    };
    return typeMap[deviceType] || deviceType;
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'completed': 'success',
      'in_progress': 'info',
      'pending': 'warning',
      'failed': 'error',
      'cancelled': 'default'
    };
    return colorMap[status] || 'default';
  }

  calculateSyncProgress(syncedItems: number, totalItems: number): number {
    if (totalItems === 0) return 0;
    return Math.round((syncedItems / totalItems) * 100);
  }

  isDeviceOnline(lastSeen: string): boolean {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Consider online if seen within 5 minutes
  }

  getDeviceStatusText(device: MobileDevice): string {
    if (!device.is_active) return 'Inactive';
    if (!device.last_seen) return 'Never Connected';
    
    const isOnline = this.isDeviceOnline(device.last_seen);
    return isOnline ? 'Online' : 'Offline';
  }

  getDeviceStatusColor(device: MobileDevice): string {
    if (!device.is_active) return 'error';
    if (!device.last_seen) return 'warning';
    
    const isOnline = this.isDeviceOnline(device.last_seen);
    return isOnline ? 'success' : 'warning';
  }
}

export const mobileService = new MobileService();