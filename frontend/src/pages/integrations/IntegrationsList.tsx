import React, { useState } from 'react';
import { Plug, CheckCircle, XCircle, Settings } from 'lucide-react';

const INTEGRATIONS = [
  { id: 'xero', name: 'Xero', logo: '📊', connected: true, lastSync: '2 hours ago' },
  { id: 'sage', name: 'Sage 50cloud', logo: '💼', connected: true, lastSync: '1 day ago' },
  { id: 'pastel', name: 'Pastel', logo: '📋', connected: false, lastSync: null },
  { id: 'microsoft365', name: 'Microsoft 365', logo: '🔷', connected: true, lastSync: '5 min ago' },
  { id: 'sars', name: 'SARS eFiling', logo: '🇿🇦', connected: true, lastSync: '3 days ago' },
  { id: 'odoo', name: 'Odoo', logo: '🔧', connected: false, lastSync: null }
];

export default function IntegrationsListPage() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [showConfigModal, setShowConfigModal] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Plug className="h-8 w-8" />
        Integrations
      </h1>

      <div className="grid grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div 
            key={integration.id} 
            className="bg-white rounded-lg shadow p-6"
            data-testid={`integration-${integration.id}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{integration.logo}</div>
                <div>
                  <h3 className="font-bold text-lg">{integration.name}</h3>
                  {integration.connected ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-600 text-sm">
                      <XCircle className="h-4 w-4" />
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {integration.connected && (
              <div className="text-sm text-gray-600 mb-4">
                Last synced: {integration.lastSync}
              </div>
            )}

            {integration.connected ? (
              <div className="flex gap-2">
                <button 
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  data-testid={integration.id === 'xero' ? 'button-configure-xero' : undefined}
                  onClick={() => integration.id === 'xero' && setShowConfigModal(true)}
                >
                  Configure
                </button>
                <button 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  data-testid={integration.id === 'xero' ? 'button-sync-xero' : undefined}
                >
                  Sync Now
                </button>
              </div>
            ) : (
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Xero Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" data-testid="modal-xero-config">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Configure Xero Integration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
                <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tenant ID</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
