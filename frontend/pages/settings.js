import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('sap-connection');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Fetch settings when component mounts    
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        setError('Failed to load settings');
      }
    } catch (err) {
      setError('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to save settings');
      }
    } catch (err) {
      setError('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSapConnection = (field, value) => {
    setSettings(prev => ({
      ...prev,
      sap_connection: {
        ...prev.sap_connection,
        [field]: value
      }
    }));
  };

  const updateDocumentMapping = (docType, field, value) => {
    setSettings(prev => ({
      ...prev,
      document_mappings: {
        ...prev.document_mappings,
        [docType]: {
          ...prev.document_mappings[docType],
          [field]: value
        }
      }
    }));
  };

  const updateThreshold = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: parseFloat(value)
    }));
  };

  const tabs = [
    { id: 'sap-connection', name: 'SAP Connection', icon: '🔗' },
    { id: 'document-mappings', name: 'Document Mappings', icon: '📋' },
    { id: 'thresholds', name: 'Thresholds', icon: '⚡' },
    { id: 'system-settings', name: 'System Settings', icon: '⚙️' }
  ];

  const renderSapConnectionTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="vx-subtitle mb-6">🔗 SAP System Connection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">Server Address</label>
            <input
              type="text"
              value={settings?.sap_connection?.server || ''}
              onChange={(e) => updateSapConnection('server', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              placeholder="sap.company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">Client</label>
            <input
              type="text"
              value={settings?.sap_connection?.client || ''}
              onChange={(e) => updateSapConnection('client', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">Username</label>
            <input
              type="text"
              value={settings?.sap_connection?.username || ''}
              onChange={(e) => updateSapConnection('username', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              placeholder="SAP username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">Password</label>
            <input
              type="password"
              value={settings?.sap_connection?.password || ''}
              onChange={(e) => updateSapConnection('password', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              placeholder="SAP password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">System Number</label>
            <input
              type="text"
              value={settings?.sap_connection?.system_number || ''}
              onChange={(e) => updateSapConnection('system_number', e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              placeholder="00"
            />
          </div>
        </div>
      </div>
      <div className="vx-glass-yellow p-6 rounded-xl">
        <h4 className="font-medium text-yellow-100 mb-4 flex items-center space-x-2">
          <span>📡</span>
          <span>Connection Status</span>
        </h4>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-yellow-100">Connection not tested</span>
        </div>
        <button className="vx-btn vx-btn-secondary">
          <span>🔍</span>
          <span>Test Connection</span>
        </button>
      </div>
    </div>
  );

  const renderDocumentMappingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Document Type Mappings</h3>
        <p className="text-sm text-gray-300 mb-6">Configure how different document types are processed and posted to SAP.</p>
        <div className="space-y-6">
          {settings?.document_mappings && Object.entries(settings.document_mappings).map(([docType, mapping]) => (
            <div key={docType} className="bg-gray-900 border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold text-sm">
                    {docType === 'Invoice' ? '📄' : docType === 'Receipt' ? '🧾' : docType === 'Contract' ? '📋' : docType === 'Purchase Order' ? '🛒' : '💳'}
                  </span>
                </div>
                <h4 className="font-medium text-white text-lg">{docType}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Standard Transaction</label>
                  <input
                    type="text"
                    value={mapping.transaction || ''}
                    onChange={(e) => updateDocumentMapping(docType, 'transaction', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="FB01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Document Type</label>
                  <input
                    type="text"
                    value={mapping.document_type || ''}
                    onChange={(e) => updateDocumentMapping(docType, 'document_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="KR"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Z Transaction (Custom)</label>
                  <input
                    type="text"
                    value={mapping.z_transaction || ''}
                    onChange={(e) => updateDocumentMapping(docType, 'z_transaction', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Z_CUSTOM_TXN"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderThresholdsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">AI Confidence Thresholds</h3>
        <p className="text-sm text-gray-300 mb-6">Configure confidence levels for document processing and automatic posting.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-yellow-600">⚠️</span>
              </div>
              <h4 className="font-medium text-white">Minimum Confidence Threshold</h4>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-200 mb-2">Threshold Percentage</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings?.confidence_threshold || 70}
                  onChange={(e) => updateThreshold('confidence_threshold', e.target.value)}
                  className="flex-1"
                />
                <div className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center font-medium">
                  {settings?.confidence_threshold || 70}%
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-300">Documents below this threshold will be flagged for manual review before processing.</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-green-600">🚀</span>
              </div>
              <h4 className="font-medium text-white">Auto-Post Threshold</h4>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-200 mb-2">Threshold Percentage</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings?.auto_post_threshold || 90}
                  onChange={(e) => updateThreshold('auto_post_threshold', e.target.value)}
                  className="flex-1"
                />
                <div className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center font-medium">
                  {settings?.auto_post_threshold || 90}%
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-300">Documents above this threshold can be automatically posted to SAP without manual review.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">System Configuration</h3>
        <p className="text-sm text-gray-300 mb-6">Additional system settings and preferences.</p>
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-medium text-white mb-4">Processing Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-200">Enable Auto-Processing</label>
                  <p className="text-sm text-gray-300">Automatically process uploaded documents</p>
                </div>
                <input type="checkbox" className="w-5 h-5 text-blue-600" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-200">Email Notifications</label>
                  <p className="text-sm text-gray-300">Send email alerts for processing events</p>
                </div>
                <input type="checkbox" className="w-5 h-5 text-blue-600" defaultChecked />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{background: "linear-gradient(135deg, #000000 0%, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%, #000000 100%)", backgroundSize: "400% 400%", animation: "gradientShift 15s ease infinite"}}>
      {/* Modern Header */}
      <div className="vx-glass border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="vx-logo">
                  <span className="text-black font-black text-xl">VX</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold vx-text-gradient">ARIA Settings</h1>
                  <p className="text-sm vx-text-muted">System Configuration & Management</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="vx-btn vx-btn-secondary"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {message && (
          <div className="mb-6 vx-glass-yellow border border-yellow-400/30 text-yellow-100 px-6 py-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">✅</span>
              <span>{message}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 vx-glass border border-red-400/30 text-red-100 px-6 py-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">❌</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Modern Tab Navigation */}
        <div className="mb-8">
          <div className="vx-glass rounded-xl p-2">
            <nav className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'vx-glass-yellow text-yellow-100 shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Modern Content Area */}
        <div className="vx-glass rounded-xl p-8">
          {activeTab === 'sap-connection' && renderSapConnectionTab()}
          {activeTab === 'document-mappings' && renderDocumentMappingsTab()}
          {activeTab === 'thresholds' && renderThresholdsTab()}
          {activeTab === 'system-settings' && renderSystemSettingsTab()}
        </div>

        {/* Modern Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="vx-btn vx-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
