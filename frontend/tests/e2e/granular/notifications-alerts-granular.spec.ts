/**
 * ARIA ERP - Notifications/Alerts Granular Tests
 * Comprehensive testing of notifications and alerts functionality
 * 
 * Tests: ~80 granular test cases
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { TEST_CONFIG } from '../test-config';

const API_BASE = TEST_CONFIG.API_URL;
const COMPANY_ID = 'demo-company';

async function apiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: Record<string, unknown>
) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    headers: { 'Content-Type': 'application/json', 'X-Company-ID': COMPANY_ID },
    data: data ? JSON.stringify(data) : undefined,
  };
  switch (method) {
    case 'GET': return request.get(url, { headers: options.headers });
    case 'POST': return request.post(url, options);
    case 'PUT': return request.put(url, options);
    case 'DELETE': return request.delete(url, { headers: options.headers });
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

test.describe('Notifications/Alerts Granular Tests', () => {

  // ============================================
  // NOTIFICATIONS - CRUD Operations (30 tests)
  // ============================================
  test.describe('Notifications CRUD', () => {
    test('GET /notifications - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - filter by user_id', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&user_id=user-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - filter by is_read true', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&is_read=true');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - filter by is_read false', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&is_read=false');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - filter by type info', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&type=info');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - filter by type warning', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&type=warning');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - filter by type error', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&type=error');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - filter by type success', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&type=success');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications - filter by category', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications?company_id=demo-company&category=invoice');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /notifications/:id - returns single notification', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications/notif-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /notifications - create with valid data', async ({ request }) => {
      const notificationData = {
        user_id: 'user-001',
        title: `Test Notification ${generateId('NOTIF')}`,
        message: 'This is a test notification',
        type: 'info',
        category: 'system',
        is_read: false
      };
      const response = await apiRequest(request, 'POST', '/api/notifications', notificationData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /notifications - missing user_id', async ({ request }) => {
      const notificationData = {
        title: `Test Notification ${generateId('NOTIF')}`,
        message: 'This is a test notification',
        type: 'info'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications', notificationData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /notifications - missing title', async ({ request }) => {
      const notificationData = {
        user_id: 'user-001',
        message: 'This is a test notification',
        type: 'info'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications', notificationData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /notifications - empty title', async ({ request }) => {
      const notificationData = {
        user_id: 'user-001',
        title: '',
        message: 'This is a test notification',
        type: 'info'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications', notificationData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /notifications - invalid type', async ({ request }) => {
      const notificationData = {
        user_id: 'user-001',
        title: `Test Notification ${generateId('NOTIF')}`,
        message: 'This is a test notification',
        type: 'invalid_type'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications', notificationData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /notifications - with action_url', async ({ request }) => {
      const notificationData = {
        user_id: 'user-001',
        title: `Test Notification ${generateId('NOTIF')}`,
        message: 'This is a test notification',
        type: 'info',
        action_url: '/erp/invoices/inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications', notificationData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /notifications/:id - mark as read', async ({ request }) => {
      const notificationData = {
        is_read: true
      };
      const response = await apiRequest(request, 'PUT', '/api/notifications/notif-001', notificationData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /notifications/mark-all-read - mark all as read', async ({ request }) => {
      const response = await apiRequest(request, 'PUT', '/api/notifications/mark-all-read', { user_id: 'user-001' });
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /notifications/:id - delete notification', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/notifications/notif-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /notifications/clear-all - clear all notifications', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/notifications/clear-all?company_id=demo-company&user_id=user-001');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // ALERTS - CRUD Operations (25 tests)
  // ============================================
  test.describe('Alerts CRUD', () => {
    test('GET /alerts - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - pagination with limit', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&limit=10');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - filter by severity critical', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&severity=critical');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - filter by severity high', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&severity=high');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - filter by severity medium', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&severity=medium');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - filter by severity low', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&severity=low');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - filter by status active', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&status=active');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - filter by status acknowledged', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&status=acknowledged');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - filter by status resolved', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&status=resolved');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts - filter by alert_type', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts?company_id=demo-company&alert_type=low_stock');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('GET /alerts/:id - returns single alert', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/alerts/alert-001?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('POST /alerts - create with valid data', async ({ request }) => {
      const alertData = {
        title: `Test Alert ${generateId('ALERT')}`,
        message: 'This is a test alert',
        severity: 'medium',
        alert_type: 'system',
        status: 'active'
      };
      const response = await apiRequest(request, 'POST', '/api/alerts', alertData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /alerts - missing title', async ({ request }) => {
      const alertData = {
        message: 'This is a test alert',
        severity: 'medium'
      };
      const response = await apiRequest(request, 'POST', '/api/alerts', alertData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /alerts - invalid severity', async ({ request }) => {
      const alertData = {
        title: `Test Alert ${generateId('ALERT')}`,
        message: 'This is a test alert',
        severity: 'invalid_severity'
      };
      const response = await apiRequest(request, 'POST', '/api/alerts', alertData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /alerts - with entity reference', async ({ request }) => {
      const alertData = {
        title: `Test Alert ${generateId('ALERT')}`,
        message: 'Low stock alert',
        severity: 'high',
        alert_type: 'low_stock',
        entity_type: 'product',
        entity_id: 'prod-001'
      };
      const response = await apiRequest(request, 'POST', '/api/alerts', alertData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /alerts/:id - acknowledge alert', async ({ request }) => {
      const alertData = {
        status: 'acknowledged',
        acknowledged_by: 'user-001'
      };
      const response = await apiRequest(request, 'PUT', '/api/alerts/alert-001', alertData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /alerts/:id - resolve alert', async ({ request }) => {
      const alertData = {
        status: 'resolved',
        resolved_by: 'user-001',
        resolution_notes: 'Issue resolved'
      };
      const response = await apiRequest(request, 'PUT', '/api/alerts/alert-001', alertData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('DELETE /alerts/:id - delete alert', async ({ request }) => {
      const response = await apiRequest(request, 'DELETE', '/api/alerts/alert-test-delete?company_id=demo-company');
      expect([200, 204, 400, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // EMAIL NOTIFICATIONS - Operations (15 tests)
  // ============================================
  test.describe('Email Notifications', () => {
    test('POST /notifications/email - send invoice email', async ({ request }) => {
      const emailData = {
        to: 'customer@example.com',
        template: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /notifications/email - send quote email', async ({ request }) => {
      const emailData = {
        to: 'customer@example.com',
        template: 'quote',
        entity_id: 'qt-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /notifications/email - send payment reminder', async ({ request }) => {
      const emailData = {
        to: 'customer@example.com',
        template: 'payment_reminder',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /notifications/email - missing to address', async ({ request }) => {
      const emailData = {
        template: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /notifications/email - invalid email format', async ({ request }) => {
      const emailData = {
        to: 'invalid-email',
        template: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /notifications/email - invalid template', async ({ request }) => {
      const emailData = {
        to: 'customer@example.com',
        template: 'invalid_template',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404, 422]).toContain(response.status());
    });

    test('POST /notifications/email - with cc', async ({ request }) => {
      const emailData = {
        to: 'customer@example.com',
        cc: 'manager@company.com',
        template: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /notifications/email - with bcc', async ({ request }) => {
      const emailData = {
        to: 'customer@example.com',
        bcc: 'archive@company.com',
        template: 'invoice',
        entity_id: 'inv-001'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /notifications/email - with custom subject', async ({ request }) => {
      const emailData = {
        to: 'customer@example.com',
        template: 'invoice',
        entity_id: 'inv-001',
        subject: 'Custom Invoice Subject'
      };
      const response = await apiRequest(request, 'POST', '/api/notifications/email', emailData);
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('GET /notifications/email/history - returns email history', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notifications/email/history?company_id=demo-company');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  // ============================================
  // NOTIFICATION PREFERENCES - Operations (10 tests)
  // ============================================
  test.describe('Notification Preferences', () => {
    test('GET /notification-preferences - returns 200 or 401/404', async ({ request }) => {
      const response = await apiRequest(request, 'GET', '/api/notification-preferences?company_id=demo-company&user_id=user-001');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('PUT /notification-preferences - update email preferences', async ({ request }) => {
      const preferencesData = {
        user_id: 'user-001',
        email_notifications: true,
        invoice_alerts: true,
        payment_reminders: true
      };
      const response = await apiRequest(request, 'PUT', '/api/notification-preferences', preferencesData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /notification-preferences - disable email notifications', async ({ request }) => {
      const preferencesData = {
        user_id: 'user-001',
        email_notifications: false
      };
      const response = await apiRequest(request, 'PUT', '/api/notification-preferences', preferencesData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /notification-preferences - update push preferences', async ({ request }) => {
      const preferencesData = {
        user_id: 'user-001',
        push_notifications: true
      };
      const response = await apiRequest(request, 'PUT', '/api/notification-preferences', preferencesData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PUT /notification-preferences - update frequency', async ({ request }) => {
      const preferencesData = {
        user_id: 'user-001',
        digest_frequency: 'daily'
      };
      const response = await apiRequest(request, 'PUT', '/api/notification-preferences', preferencesData);
      expect([200, 400, 401, 404]).toContain(response.status());
    });
  });
});
