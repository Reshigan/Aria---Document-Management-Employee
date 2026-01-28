import React, { useState, useEffect } from 'react';
import { 
  Settings, Database, CheckCircle, XCircle, RefreshCw, 
  Key, Link, AlertCircle, Save, TestTube, ExternalLink
} from 'lucide-react';
import api from '../../lib/api';

interface ERPConnection {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastSync?: string;
  config: {
    apiUrl?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    username?: string;
    password?: string;
    companyId?: string;
    environment?: string;
    customFields?: Record<string, string>;
  };
}

const ERP_SYSTEMS = [
  {
    id: 'xero',
    name: 'Xero',
    type: 'cloud',
    description: 'Cloud-based accounting software',
    logo: '🔵',
    fields: ['clientId', 'clientSecret', 'tenantId'],
    authType: 'OAuth 2.0'
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    type: 'cloud',
    description: 'Intuit QuickBooks cloud accounting',
    logo: '🟢',
    fields: ['clientId', 'clientSecret', 'companyId'],
    authType: 'OAuth 2.0'
  },
  {
    id: 'sage',
    name: 'Sage Business Cloud',
    type: 'cloud',
    description: 'Sage cloud accounting and ERP',
    logo: '🟢',
    fields: ['apiUrl', 'apiKey', 'companyId'],
    authType: 'API Key'
  },
  {
    id: 'odoo',
    name: 'Odoo',
    type: 'cloud',
    description: 'Open-source ERP and CRM',
    logo: '🟣',
    fields: ['apiUrl', 'username', 'password', 'database'],
    authType: 'Basic Auth'
  },
  {
    id: 'netsuite',
    name: 'NetSuite',
    type: 'cloud',
    description: 'Oracle NetSuite cloud ERP',
    logo: '🔴',
    fields: ['accountId', 'consumerKey', 'consumerSecret', 'tokenId', 'tokenSecret'],
    authType: 'OAuth 1.0'
  },
  {
    id: 'sap_ecc',
    name: 'SAP ECC',
    type: 'on-premise',
    description: 'SAP ERP Central Component (on-premise)',
    logo: '🔵',
    fields: ['apiUrl', 'username', 'password', 'client', 'systemId'],
    authType: 'Basic Auth / RFC'
  }
];

export default function ERPConfigurationPage() {
  const [connections, setConnections] = useState<ERPConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const data = await api.get('/admin/erp-connections');
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Error fetching ERP connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConnection = (erpId: string, field: string, value: any) => {
    setConnections(connections.map(conn => {
      if (conn.id === erpId) {
        if (field === 'enabled') {
          return { ...conn, enabled: value };
        }
        return {
          ...conn,
          config: { ...conn.config, [field]: value }
        };
      }
      return conn;
    }));
  };

  const handleTestConnection = async (erpId: string) => {
    setTesting(erpId);
    try {
      const data = await api.post(`/admin/erp-connections/${erpId}/test`, {});
      setConnections(connections.map(conn => 
        conn.id === erpId 
          ? { ...conn, status: data.success ? 'connected' : 'error' }
          : conn
      ));
      alert(data.success ? 'Connection successful!' : `Connection failed: ${data.message}`);
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  const handleSaveConnection = async (erpId: string) => {
    setSaving(true);
    try {
      const connection = connections.find(c => c.id === erpId);
      await api.put(`/admin/erp-connections/${erpId}`, connection);
      alert('Connection saved successfully!');
    } catch (error) {
      console.error('Error saving connection:', error);
      alert('Error saving connection');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async (erpId: string) => {
    try {
      const data = await api.post(`/admin/erp-connections/${erpId}/sync`, {});
      alert(`Sync started: ${data.message}`);
      fetchConnections();
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error starting sync');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'testing':
        return <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      case 'testing':
        return 'Testing...';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          ERP Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure connections to external ERP systems (Xero, QuickBooks, Sage, Odoo, NetSuite, SAP ECC)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {ERP_SYSTEMS.map((erp) => {
          const connection = connections.find(c => c.id === erp.id) || {
            id: erp.id,
            name: erp.name,
            type: erp.type,
            enabled: false,
            status: 'disconnected' as const,
            config: {}
          };

          return (
            <div key={erp.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{erp.logo}</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{erp.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{erp.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {erp.authType}
                        </span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {erp.type === 'cloud' ? '☁️ Cloud' : '🏢 On-Premise'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(testing === erp.id ? 'testing' : connection.status)}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getStatusText(testing === erp.id ? 'testing' : connection.status)}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={connection.enabled}
                        onChange={(e) => handleUpdateConnection(erp.id, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-gray-800 after:border-gray-300 dark:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:bg-blue-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Configuration Form */}
              {connection.enabled && (
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {erp.id === 'xero' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Client ID
                          </label>
                          <input
                            type="text"
                            value={connection.config.clientId || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'clientId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Xero Client ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={connection.config.clientSecret || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'clientSecret', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Xero Client Secret"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tenant ID
                          </label>
                          <input
                            type="text"
                            value={connection.config.tenantId || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'tenantId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Xero Tenant ID"
                          />
                        </div>
                      </>
                    )}

                    {erp.id === 'quickbooks' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Client ID
                          </label>
                          <input
                            type="text"
                            value={connection.config.clientId || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'clientId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter QuickBooks Client ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={connection.config.clientSecret || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'clientSecret', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter QuickBooks Client Secret"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Company ID (Realm ID)
                          </label>
                          <input
                            type="text"
                            value={connection.config.companyId || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'companyId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter QuickBooks Company ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Environment
                          </label>
                          <select
                            value={connection.config.environment || 'production'}
                            onChange={(e) => handleUpdateConnection(erp.id, 'environment', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                          >
                            <option value="sandbox">Sandbox</option>
                            <option value="production">Production</option>
                          </select>
                        </div>
                      </>
                    )}

                    {erp.id === 'sage' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API URL
                          </label>
                          <input
                            type="text"
                            value={connection.config.apiUrl || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'apiUrl', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="https://api.sage.com/..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={connection.config.apiKey || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'apiKey', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Sage API Key"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Company ID
                          </label>
                          <input
                            type="text"
                            value={connection.config.companyId || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'companyId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Sage Company ID"
                          />
                        </div>
                      </>
                    )}

                    {erp.id === 'odoo' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API URL
                          </label>
                          <input
                            type="text"
                            value={connection.config.apiUrl || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'apiUrl', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="https://your-instance.odoo.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Database Name
                          </label>
                          <input
                            type="text"
                            value={connection.config.customFields?.database || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'database', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Odoo Database Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Username
                          </label>
                          <input
                            type="text"
                            value={connection.config.username || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'username', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Odoo Username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API Key / Password
                          </label>
                          <input
                            type="password"
                            value={connection.config.password || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'password', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Odoo API Key"
                          />
                        </div>
                      </>
                    )}

                    {erp.id === 'netsuite' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Account ID
                          </label>
                          <input
                            type="text"
                            value={connection.config.customFields?.accountId || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'accountId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter NetSuite Account ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Consumer Key
                          </label>
                          <input
                            type="text"
                            value={connection.config.customFields?.consumerKey || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'consumerKey', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Consumer Key"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Consumer Secret
                          </label>
                          <input
                            type="password"
                            value={connection.config.customFields?.consumerSecret || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'consumerSecret', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Consumer Secret"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Token ID
                          </label>
                          <input
                            type="text"
                            value={connection.config.customFields?.tokenId || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'tokenId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Token ID"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Token Secret
                          </label>
                          <input
                            type="password"
                            value={connection.config.customFields?.tokenSecret || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'tokenSecret', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter Token Secret"
                          />
                        </div>
                      </>
                    )}

                    {erp.id === 'sap_ecc' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API URL (Gateway)
                          </label>
                          <input
                            type="text"
                            value={connection.config.apiUrl || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'apiUrl', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="http://sap-server:8000/sap/opu/odata/sap/"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Client (Mandant)
                          </label>
                          <input
                            type="text"
                            value={connection.config.customFields?.client || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'client', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="e.g., 100, 800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            System ID
                          </label>
                          <input
                            type="text"
                            value={connection.config.customFields?.systemId || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'systemId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="e.g., PRD, DEV"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Username
                          </label>
                          <input
                            type="text"
                            value={connection.config.username || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'username', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter SAP Username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                          </label>
                          <input
                            type="password"
                            value={connection.config.password || ''}
                            onChange={(e) => handleUpdateConnection(erp.id, 'password', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            placeholder="Enter SAP Password"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sync Settings */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Sync Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Auto Sync
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
                          <option value="disabled">Disabled</option>
                          <option value="hourly">Every Hour</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Sync Direction
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
                          <option value="bidirectional">Bidirectional</option>
                          <option value="to_erp">ARIA → ERP Only</option>
                          <option value="from_erp">ERP → ARIA Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Last Sync
                        </label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400">
                          {connection.lastSync || 'Never'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTestConnection(erp.id)}
                      disabled={testing === erp.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      <TestTube className="h-4 w-4" />
                      {testing === erp.id ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      onClick={() => handleSaveConnection(erp.id)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      <Save className="h-4 w-4" />
                      Save Configuration
                    </button>
                    <button
                      onClick={() => handleSyncNow(erp.id)}
                      disabled={connection.status !== 'connected'}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Sync Now
                    </button>
                    <a
                      href={`/admin/erp-connections/${erp.id}/logs`}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Logs
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
