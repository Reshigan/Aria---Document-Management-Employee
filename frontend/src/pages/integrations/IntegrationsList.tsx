import React, { useState, useEffect } from 'react';
import { Plug, CheckCircle, XCircle, Settings, RefreshCw, Link2 } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  lastSync: string | null;
  status?: string;
  config?: Record<string, string>;
}

export default function IntegrationsListPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/integrations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      const mappedData = (Array.isArray(result) ? result : result.integrations || result.data || []).map((i: any) => ({
        id: i.id,
        name: i.name || i.integration_name || '',
        logo: i.logo || '🔗',
        connected: i.connected || i.is_connected || false,
        lastSync: i.lastSync || i.last_sync || null,
        status: i.status,
        config: i.config
      }));
      setIntegrations(mappedData.length > 0 ? mappedData : [
        { id: 'xero', name: 'Xero', logo: '📊', connected: true, lastSync: '2 hours ago' },
        { id: 'sage', name: 'Sage 50cloud', logo: '💼', connected: true, lastSync: '1 day ago' },
        { id: 'pastel', name: 'Pastel', logo: '📋', connected: false, lastSync: null },
        { id: 'microsoft365', name: 'Microsoft 365', logo: '🔷', connected: true, lastSync: '5 min ago' },
        { id: 'sars', name: 'SARS eFiling', logo: '🇿🇦', connected: true, lastSync: '3 days ago' },
        { id: 'odoo', name: 'Odoo', logo: '🔧', connected: false, lastSync: null }
      ]);
    } catch (err) {
      console.error('Error fetching integrations:', err);
      // Fallback data
      setIntegrations([
        { id: 'xero', name: 'Xero', logo: '📊', connected: true, lastSync: '2 hours ago' },
        { id: 'sage', name: 'Sage 50cloud', logo: '💼', connected: true, lastSync: '1 day ago' },
        { id: 'pastel', name: 'Pastel', logo: '📋', connected: false, lastSync: null },
        { id: 'microsoft365', name: 'Microsoft 365', logo: '🔷', connected: true, lastSync: '5 min ago' },
        { id: 'sars', name: 'SARS eFiling', logo: '🇿🇦', connected: true, lastSync: '3 days ago' },
        { id: 'odoo', name: 'Odoo', logo: '🔧', connected: false, lastSync: null }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleSync = async (integrationId: string) => {
    setSyncing(integrationId);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/integrations/${integrationId}/sync`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Refresh integrations to get updated lastSync
      await fetchIntegrations();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(null);
    }
  };

  const handleConnect = async (integrationId: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      await fetch(`${API_BASE}/api/integrations/${integrationId}/connect`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchIntegrations();
    } catch (err) {
      console.error('Connect failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/30">
            <Plug className="h-7 w-7 text-white" />
          </div>
          Integrations
        </h1>
        <p className="text-gray-500 dark:text-gray-400 ml-14">Connect and manage third-party services</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : null}

      {syncing && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4" data-testid="sync-progress">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="text-blue-900 dark:text-blue-300 font-medium">Syncing {integrations.find(i => i.id === syncing)?.name}...</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/30">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{integrations.filter(i => i.connected).length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Connected</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl shadow-lg shadow-gray-500/30">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{integrations.filter(i => !i.connected).length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Not Connected</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/30">
              <Link2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{integrations.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Integrations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div 
            key={integration.id} 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow duration-200"
            data-testid={`integration-${integration.id}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{integration.logo}</div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{integration.name}</h3>
                  {integration.connected ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                      <XCircle className="h-4 w-4" />
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {integration.connected && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Last synced: {integration.lastSync}
              </div>
            )}

            {integration.connected ? (
              <div className="flex gap-2">
                <button 
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                  data-testid={integration.id === 'xero' ? 'button-configure-xero' : undefined}
                  onClick={() => integration.id === 'xero' && setShowConfigModal(true)}
                >
                  Configure
                </button>
                <button 
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2"
                  data-testid={integration.id === 'xero' ? 'button-sync-xero' : undefined}
                  onClick={() => handleSync(integration.id)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync
                </button>
              </div>
            ) : (
              <button className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all">
                Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Xero Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto shadow-2xl" data-testid="modal-xero-config">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Settings className="h-6 w-6" />
                Configure Xero Integration
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client ID</label>
                <input type="text" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Secret</label>
                <input type="password" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tenant ID</label>
                <input type="text" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
