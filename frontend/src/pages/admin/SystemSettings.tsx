import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/shared/DataTable';
import { Settings, Shield, Bell, Database, Key, Activity } from 'lucide-react';

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('audit');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs);
      }
    } finally {
      setLoading(false);
    }
  };

  const auditColumns = [
    { key: 'timestamp', label: 'Date/Time', render: (log: any) => new Date(log.timestamp).toLocaleString() },
    { key: 'user', label: 'User', render: (log: any) => log.user_email },
    { key: 'action', label: 'Action' },
    { key: 'resource', label: 'Resource' },
    { key: 'ip_address', label: 'IP Address' }
  ];

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
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
          <DataTable
            data={auditLogs}
            columns={auditColumns}
            searchable={true}
            exportable={true}
            exportFilename="audit-logs"
          />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Password Policy</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Require minimum 8 characters</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Require uppercase and lowercase</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Require at least one number</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              defaultValue="60"
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <Button className="bg-blue-600 text-white">Save Security Settings</Button>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Configure notification preferences for all users</p>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Configure automated backups</p>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Manage API keys for integrations</p>
        </div>
      )}
    </div>
  );
}
