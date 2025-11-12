import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/shared/DataTable';
import { Settings, Shield, Bell, Database, Key, Activity, Download, Upload, Trash2, Copy, Check, Plus, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string;
  action: string;
  resource: string;
  ip_address: string;
}

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [securitySettings, setSecuritySettings] = useState({
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_number: true,
    password_require_special: false,
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    two_factor_required: false,
    ip_whitelist_enabled: false,
    ip_whitelist: [] as string[]
  });
  const [newIP, setNewIP] = useState('');

  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    sms_enabled: false,
    whatsapp_enabled: true,
    slack_enabled: false,
    system_alerts: true,
    security_alerts: true,
    bot_alerts: true,
    error_alerts: true,
    daily_summary: true,
    weekly_report: true
  });

  const [backupSettings, setBackupSettings] = useState({
    auto_backup_enabled: true,
    backup_frequency: 'daily',
    backup_time: '02:00',
    retention_days: 30,
    backup_location: 's3://aria-backups',
    include_documents: true,
    include_database: true,
    encrypt_backups: true
  });

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const data = await api.get('/admin/audit-logs');
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/security-settings', securitySettings);
      alert('Security settings saved!');
    } catch (error) {
      console.error('Error saving security settings:', error);
      alert('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/notification-settings', notificationSettings);
      alert('Notification settings saved!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBackupSettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/backup-settings', backupSettings);
      alert('Backup settings saved!');
    } catch (error) {
      console.error('Error saving backup settings:', error);
      alert('Failed to save backup settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAPIKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const data = await api.post('/admin/api-keys', { name: newKeyName });
      setCopiedKey(data.key);
      setNewKeyName('');
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    }
  };

  const handleDeleteAPIKey = async (keyId: string) => {
    if (!confirm('Delete this API key?')) return;
    try {
      await api.delete(`/admin/api-keys/${keyId}`);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key');
    }
  };

  const auditColumns = [
    { key: 'timestamp', label: 'Date/Time', render: (log: AuditLog) => new Date(log.timestamp).toLocaleString() },
    { key: 'user', label: 'User', render: (log: AuditLog) => log.user_email },
    { key: 'action', label: 'Action', render: (log: AuditLog) => log.action },
    { key: 'resource', label: 'Resource', render: (log: AuditLog) => log.resource },
    { key: 'ip_address', label: 'IP Address', render: (log: AuditLog) => log.ip_address }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Settings className="h-8 w-8" />
        System Settings
      </h1>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'audit', label: 'Audit Logs', icon: Activity },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'backup', label: 'Backup', icon: Database },
            { id: 'api', label: 'API Keys', icon: Key }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Audit Logs</h2>
            <p className="text-sm text-gray-600 mt-1">Track all system activities and user actions</p>
          </div>
          <DataTable data={auditLogs} columns={auditColumns} searchable={true} exportable={true} exportFilename="audit-logs" />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Password Policy</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={securitySettings.password_require_uppercase} onChange={(e) => setSecuritySettings({...securitySettings, password_require_uppercase: e.target.checked})} className="w-4 h-4" />
                <span>Require uppercase letters</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={securitySettings.password_require_lowercase} onChange={(e) => setSecuritySettings({...securitySettings, password_require_lowercase: e.target.checked})} className="w-4 h-4" />
                <span>Require lowercase letters</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={securitySettings.password_require_number} onChange={(e) => setSecuritySettings({...securitySettings, password_require_number: e.target.checked})} className="w-4 h-4" />
                <span>Require at least one number</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={securitySettings.password_require_special} onChange={(e) => setSecuritySettings({...securitySettings, password_require_special: e.target.checked})} className="w-4 h-4" />
                <span>Require special characters (!@#$%)</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Password Length</label>
                <input type="number" min="6" max="32" value={securitySettings.password_min_length} onChange={(e) => setSecuritySettings({...securitySettings, password_min_length: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
          </div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Session Management</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                <input type="number" min="5" max="480" value={securitySettings.session_timeout_minutes} onChange={(e) => setSecuritySettings({...securitySettings, session_timeout_minutes: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                <input type="number" min="3" max="10" value={securitySettings.max_login_attempts} onChange={(e) => setSecuritySettings({...securitySettings, max_login_attempts: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
          </div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={securitySettings.two_factor_required} onChange={(e) => setSecuritySettings({...securitySettings, two_factor_required: e.target.checked})} className="w-4 h-4" />
              <span>Require 2FA for all users</span>
            </label>
          </div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">IP Whitelist</h3>
            <label className="flex items-center gap-3 mb-4">
              <input type="checkbox" checked={securitySettings.ip_whitelist_enabled} onChange={(e) => setSecuritySettings({...securitySettings, ip_whitelist_enabled: e.target.checked})} className="w-4 h-4" />
              <span>Enable IP whitelist</span>
            </label>
            {securitySettings.ip_whitelist_enabled && (
              <div>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={newIP} onChange={(e) => setNewIP(e.target.value)} placeholder="Enter IP address" className="flex-1 px-4 py-2 border border-gray-300 rounded-md" />
                  <Button onClick={() => { if (newIP.trim()) { setSecuritySettings({...securitySettings, ip_whitelist: [...securitySettings.ip_whitelist, newIP.trim()]}); setNewIP(''); }}} className="bg-blue-600 text-white">
                    <Plus className="h-4 w-4 mr-2" />Add IP
                  </Button>
                </div>
                <div className="space-y-2">
                  {securitySettings.ip_whitelist.map((ip, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <span className="font-mono text-sm">{ip}</span>
                      <button onClick={() => setSecuritySettings({...securitySettings, ip_whitelist: securitySettings.ip_whitelist.filter(i => i !== ip)})} className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveSecuritySettings} disabled={saving} className="bg-blue-600 text-white">
              {saving ? 'Saving...' : 'Save Security Settings'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.email_enabled} onChange={(e) => setNotificationSettings({...notificationSettings, email_enabled: e.target.checked})} className="w-4 h-4" />
                <span>Email Notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.sms_enabled} onChange={(e) => setNotificationSettings({...notificationSettings, sms_enabled: e.target.checked})} className="w-4 h-4" />
                <span>SMS Notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.whatsapp_enabled} onChange={(e) => setNotificationSettings({...notificationSettings, whatsapp_enabled: e.target.checked})} className="w-4 h-4" />
                <span>WhatsApp Notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.slack_enabled} onChange={(e) => setNotificationSettings({...notificationSettings, slack_enabled: e.target.checked})} className="w-4 h-4" />
                <span>Slack Notifications</span>
              </label>
            </div>
          </div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Alert Types</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.system_alerts} onChange={(e) => setNotificationSettings({...notificationSettings, system_alerts: e.target.checked})} className="w-4 h-4" />
                <span>System Alerts</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.security_alerts} onChange={(e) => setNotificationSettings({...notificationSettings, security_alerts: e.target.checked})} className="w-4 h-4" />
                <span>Security Alerts</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.bot_alerts} onChange={(e) => setNotificationSettings({...notificationSettings, bot_alerts: e.target.checked})} className="w-4 h-4" />
                <span>Bot Alerts</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.error_alerts} onChange={(e) => setNotificationSettings({...notificationSettings, error_alerts: e.target.checked})} className="w-4 h-4" />
                <span>Error Alerts</span>
              </label>
            </div>
          </div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Scheduled Reports</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.daily_summary} onChange={(e) => setNotificationSettings({...notificationSettings, daily_summary: e.target.checked})} className="w-4 h-4" />
                <span>Daily Summary (8:00 AM)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notificationSettings.weekly_report} onChange={(e) => setNotificationSettings({...notificationSettings, weekly_report: e.target.checked})} className="w-4 h-4" />
                <span>Weekly Report (Monday)</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveNotificationSettings} disabled={saving} className="bg-blue-600 text-white">
              {saving ? 'Saving...' : 'Save Notification Settings'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Automated Backups</h3>
            <label className="flex items-center gap-3 mb-4">
              <input type="checkbox" checked={backupSettings.auto_backup_enabled} onChange={(e) => setBackupSettings({...backupSettings, auto_backup_enabled: e.target.checked})} className="w-4 h-4" />
              <span>Enable automatic backups</span>
            </label>
            {backupSettings.auto_backup_enabled && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                  <select value={backupSettings.backup_frequency} onChange={(e) => setBackupSettings({...backupSettings, backup_frequency: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-md">
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backup Time</label>
                  <input type="time" value={backupSettings.backup_time} onChange={(e) => setBackupSettings({...backupSettings, backup_time: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Retention Period (days)</label>
                  <input type="number" min="1" max="365" value={backupSettings.retention_days} onChange={(e) => setBackupSettings({...backupSettings, retention_days: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backup Location</label>
                  <input type="text" value={backupSettings.backup_location} onChange={(e) => setBackupSettings({...backupSettings, backup_location: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-md" placeholder="s3://bucket-name" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Backup Contents</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={backupSettings.include_database} onChange={(e) => setBackupSettings({...backupSettings, include_database: e.target.checked})} className="w-4 h-4" />
                <span>Include Database</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={backupSettings.include_documents} onChange={(e) => setBackupSettings({...backupSettings, include_documents: e.target.checked})} className="w-4 h-4" />
                <span>Include Documents & Attachments</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={backupSettings.encrypt_backups} onChange={(e) => setBackupSettings({...backupSettings, encrypt_backups: e.target.checked})} className="w-4 h-4" />
                <span>Encrypt Backups (AES-256)</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveBackupSettings} disabled={saving} className="bg-blue-600 text-white">
              {saving ? 'Saving...' : 'Save Backup Settings'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium">API Keys</h3>
              <p className="text-sm text-gray-600 mt-1">Manage API keys for external integrations</p>
            </div>
            <Button onClick={() => setShowNewKeyModal(true)} className="bg-blue-600 text-white">
              <Plus className="h-4 w-4 mr-2" />Create API Key
            </Button>
          </div>
          {apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{key.name}</h4>
                    <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">{key.key.substring(0, 20)}...</code>
                  </div>
                  <button onClick={() => handleDeleteAPIKey(key.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No API keys created yet</p>
            </div>
          )}
          {showNewKeyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Create API Key</h2>
                {copiedKey ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-yellow-900">Save this API key now!</p>
                      <p className="text-sm text-yellow-700 mt-1">You won't be able to see it again.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                      <code className="block text-sm bg-gray-100 px-3 py-2 rounded font-mono break-all">{copiedKey}</code>
                    </div>
                    <Button onClick={() => { setShowNewKeyModal(false); setCopiedKey(''); }} className="bg-blue-600 text-white w-full">Done</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Key Name *</label>
                      <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g., Production API" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => { setShowNewKeyModal(false); setNewKeyName(''); }}>Cancel</Button>
                      <Button onClick={handleCreateAPIKey} disabled={!newKeyName.trim()} className="bg-blue-600 text-white">Create Key</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
