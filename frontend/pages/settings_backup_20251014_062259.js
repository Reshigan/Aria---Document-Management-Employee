import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from "../components/Layout";

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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">SAP System Connection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Server Address</label>
            <input
              type="text"
              value={settings?.sap_connection?.server || ''}
              onChange={(e) => updateSapConnection('server', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="sap.company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Client</label>
            <input
              type="text"
              value={settings?.sap_connection?.client || ''}
              onChange={(e) => updateSapConnection('client', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Username</label>
            <input
              type="text"
              value={settings?.sap_connection?.username || ''}
              onChange={(e) => updateSapConnection('username', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="SAP username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
            <input
              type="password"
              value={settings?.sap_connection?.password || ''}
              onChange={(e) => updateSapConnection('password', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="SAP password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">System Number</label>
            <input
              type="text"
              value={settings?.sap_connection?.system_number || ''}
              onChange={(e) => updateSapConnection('system_number', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="00"
            />
          </div>
        </div>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Connection Status</h4>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span className="text-sm text-blue-800">Connection not tested</span>
        </div>
        <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          Test Connection
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
    <div className="min-h-screen bg-gray-900 text-white" style={{background: "#111827", color: "#ffffff"}}>
      <div className="bg-gray-800 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">VX</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">ARIA Settings</h1>
                  <p className="text-sm text-gray-300">System Configuration</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className="mb-6 bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-yellow-400 text-yellow-400'
                      : 'border-transparent text-gray-300 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          {activeTab === 'sap-connection' && renderSapConnectionTab()}
          {activeTab === 'document-mappings' && renderDocumentMappingsTab()}
          {activeTab === 'thresholds' && renderThresholdsTab()}
          {activeTab === 'system-settings' && renderSystemSettingsTab()}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
