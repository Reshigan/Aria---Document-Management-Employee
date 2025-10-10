export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'DOCUMENT_UPLOAD' | 'DOCUMENT_APPROVAL' | 'WORKFLOW_UPDATE' | 'SYSTEM_ALERT' | 'USER_MENTION' | 'DEADLINE_REMINDER' | 'SECURITY_ALERT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  recipient_id: number;
  sender_id?: number;
  is_read: boolean;
  is_archived: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  scheduled_at?: string;
  expires_at?: string;
  document_id?: number;
  workflow_id?: number;
  task_id?: number;
  notification_metadata?: string;
  action_url?: string;
}

export interface NotificationPreference {
  id: number;
  user_id: number;
  notification_type: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  type: string;
  subject_template: string;
  body_template: string;
  variables: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSubscription {
  id: number;
  user_id: number;
  entity_type: 'DOCUMENT' | 'WORKFLOW' | 'USER' | 'FOLDER';
  entity_id: number;
  notification_types: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationRequest {
  title: string;
  message: string;
  type: string;
  priority?: string;
  recipient_id: number;
  document_id?: number;
  workflow_id?: number;
  task_id?: number;
  notification_metadata?: string;
  action_url?: string;
  scheduled_at?: string;
  expires_at?: string;
}

export interface UpdateNotificationRequest {
  is_read?: boolean;
  is_archived?: boolean;
}

export interface NotificationFilters {
  is_read?: boolean;
  is_archived?: boolean;
  type?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}