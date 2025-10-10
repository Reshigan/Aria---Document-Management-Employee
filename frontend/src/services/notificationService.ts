import axios from 'axios';
import { 
  Notification, 
  NotificationPreference, 
  NotificationTemplate,
  NotificationSubscription,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationFilters
} from '../types/notification';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class NotificationService {
  // Notification CRUD operations
  static async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/api/notifications?${params.toString()}`);
    return response.data;
  }

  static async getNotification(id: number): Promise<Notification> {
    const response = await api.get(`/api/notifications/${id}`);
    return response.data;
  }

  static async createNotification(data: CreateNotificationRequest): Promise<Notification> {
    const response = await api.post('/api/notifications', data);
    return response.data;
  }

  static async updateNotification(id: number, data: UpdateNotificationRequest): Promise<Notification> {
    const response = await api.put(`/api/notifications/${id}`, data);
    return response.data;
  }

  static async deleteNotification(id: number): Promise<void> {
    await api.delete(`/api/notifications/${id}`);
  }

  static async markAsRead(id: number): Promise<Notification> {
    return this.updateNotification(id, { is_read: true });
  }

  static async markAsUnread(id: number): Promise<Notification> {
    return this.updateNotification(id, { is_read: false });
  }

  static async markAsArchived(id: number): Promise<Notification> {
    return this.updateNotification(id, { is_archived: true });
  }

  static async markAllAsRead(): Promise<void> {
    await api.post('/api/notifications/mark-all-read');
  }

  static async getUnreadCount(): Promise<number> {
    const response = await api.get('/api/notifications/unread-count');
    return response.data.count;
  }

  // Notification Preferences
  static async getNotificationPreferences(): Promise<NotificationPreference[]> {
    const response = await api.get('/api/notifications/preferences');
    return response.data;
  }

  static async updateNotificationPreference(id: number, data: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const response = await api.put(`/api/notifications/preferences/${id}`, data);
    return response.data;
  }

  static async createNotificationPreference(data: Omit<NotificationPreference, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationPreference> {
    const response = await api.post('/api/notifications/preferences', data);
    return response.data;
  }

  // Notification Templates
  static async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    const response = await api.get('/api/notifications/templates');
    return response.data;
  }

  static async getNotificationTemplate(id: number): Promise<NotificationTemplate> {
    const response = await api.get(`/api/notifications/templates/${id}`);
    return response.data;
  }

  static async createNotificationTemplate(data: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationTemplate> {
    const response = await api.post('/api/notifications/templates', data);
    return response.data;
  }

  static async updateNotificationTemplate(id: number, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const response = await api.put(`/api/notifications/templates/${id}`, data);
    return response.data;
  }

  static async deleteNotificationTemplate(id: number): Promise<void> {
    await api.delete(`/api/notifications/templates/${id}`);
  }

  // Notification Subscriptions
  static async getNotificationSubscriptions(): Promise<NotificationSubscription[]> {
    const response = await api.get('/api/notifications/subscriptions');
    return response.data;
  }

  static async createNotificationSubscription(data: Omit<NotificationSubscription, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationSubscription> {
    const response = await api.post('/api/notifications/subscriptions', data);
    return response.data;
  }

  static async updateNotificationSubscription(id: number, data: Partial<NotificationSubscription>): Promise<NotificationSubscription> {
    const response = await api.put(`/api/notifications/subscriptions/${id}`, data);
    return response.data;
  }

  static async deleteNotificationSubscription(id: number): Promise<void> {
    await api.delete(`/api/notifications/subscriptions/${id}`);
  }

  // Bulk operations
  static async bulkMarkAsRead(ids: number[]): Promise<void> {
    await api.post('/api/notifications/bulk-mark-read', { notification_ids: ids });
  }

  static async bulkArchive(ids: number[]): Promise<void> {
    await api.post('/api/notifications/bulk-archive', { notification_ids: ids });
  }

  static async bulkDelete(ids: number[]): Promise<void> {
    await api.post('/api/notifications/bulk-delete', { notification_ids: ids });
  }

  // Real-time notifications
  static async testNotification(data: CreateNotificationRequest): Promise<void> {
    await api.post('/api/notifications/test', data);
  }
}

export default NotificationService;