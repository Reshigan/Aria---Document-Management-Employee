import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Integrations() {
  const [integrations, setIntegrations] = useState({});
  const [healthStatus, setHealthStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState({});
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchIntegrationStatus();
    fetchHealthStatus();
    fetchIntegrationLogs();
  }, []);

  const fetchIntegrationStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/integrations/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || {});
      }
    } catch (err) {
      setError('Failed to load integration status');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/integrations/health', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch health status:', err);
    }
  };

  const fetchIntegrationLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proxy/integrations/logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch integration logs:', err);
    }
  };

  const testIntegration = async (integrationName) => {
    setTesting(prev => ({ ...prev, [integrationName]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/proxy/integrations/${integrationName}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        // Update health status with test result
        setHealthStatus(prev => ({
          ...prev,
          integrations: {
            ...prev.integrations,
            [integrationName]: result
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to test ${integrationName}:`, err);
    } finally {
      setTesting(prev => ({ ...prev, [integrationName]: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'degraded': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'unhealthy': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'disabled': return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getIntegrationIcon = (name) => {
    const icons = {
      'sap': '🏢',
      'sharepoint': '📁',
      'salesforce': '☁️',
      'docusign': '✍️',
      'aws': '☁️',
      'azure': '🔷',
      'slack': '💬',
      'teams': '👥',
      'oracle': '🔶',
      'servicenow': '🛠️'
    };
    return icons[name] || '🔗';
  };

  const integrationCategories = {
    'ERP Systems': ['sap', 'oracle'],
    'Cloud Storage': ['aws', 'azure', 'sharepoint'],
    'CRM & Sales': ['salesforce'],
    'Document Management': ['docusign', 'sharepoint'],
    'Communication': ['slack', 'teams'],
    'Service Management': ['servicenow']
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'configure', name: 'Configure', icon: '⚙️' },
    { id: 'logs', name: 'Activity Logs', icon: '📋' },
    { id: 'monitoring', name: 'Monitoring', icon: '📈' }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Overall Health */}
      <div className="vx-card vx-glass-yellow p-8 text-center">
        <div className="text-6xl font-bold vx-text-gradient mb-4">
          {healthStatus.overall_status === 'healthy' ? '✅' : 
           healthStatus.overall_status === 'degraded' ? '⚠️' : '❌'}
        </div>
        <div className="text-2xl font-bold text-white mb-2">
          System {healthStatus.overall_status || 'Unknown'}
        </div>
        <div className="text-sm text-gray-300">
          Last checked: {healthStatus.timestamp ? new Date(healthStatus.timestamp).toLocaleString() : 'Never'}
        </div>
      </div>

      {/* Integration Categories */}
      {Object.entries(integrationCategories).map(([category, integrationNames]) => (
        <div key={category} className="vx-card vx-glass p-8">
          <h3 className="text-xl font-bold text-white mb-6">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrationNames.map((name) => {
              const integration = healthStatus.integrations?.[name];
              const isEnabled = integrations[name]?.enabled;
              
              return (
                <div key={name} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getIntegrationIcon(name)}</span>
                      <span className="font-medium text-white capitalize">{name}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs border ${
                      isEnabled ? getStatusColor(integration?.status || 'unknown') : getStatusColor('disabled')
                    }`}>
                      {isEnabled ? (integration?.status || 'Unknown') : 'Disabled'}
                    </div>
                  </div>
                  
                  {isEnabled && integration && (
                    <div className="space-y-2">
                      {integration.response_time && (
                        <div className="text-sm text-gray-300">
                          Response: {integration.response_time}ms
                        </div>
                      )}
                      {integration.message && (
                        <div className="text-xs text-gray-400">
                          {integration.message}
                        </div>
                      )}
                      {integration.error && (
                        <div className="text-xs text-red-400">
                          Error: {integration.error}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() => testIntegration(name)}
                      disabled={testing[name] || !isEnabled}
                      className="vx-btn vx-btn-primary text-xs px-3 py-1 flex-1"
                    >
                      {testing[name] ? '🔄' : '🧪'} Test
                    </button>
                    <button
                      onClick={() => setActiveTab('configure')}
                      className="vx-btn vx-btn-secondary text-xs px-3 py-1"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderConfigure = () => (
    <div className="space-y-8">
      <div className="vx-card vx-glass p-8">
        <h3 className="text-xl font-bold text-white mb-6">🔧 Integration Configuration</h3>
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400">⚠️</span>
            <span className="text-yellow-100">
              Integration configuration is managed through environment variables and system settings.
            </span>
          </div>
        </div>
        
        <div className="space-y-6">
          {Object.entries(integrationCategories).map(([category, integrationNames]) => (
            <div key={category} className="space-y-4">
              <h4 className="text-lg font-medium text-white">{category}</h4>
              {integrationNames.map((name) => {
                const integration = integrations[name];
                return (
                  <div key={name} className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getIntegrationIcon(name)}</span>
                        <span className="font-medium text-white capitalize">{name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-300">
                          {integration?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${
                          integration?.enabled ? 'bg-green-400' : 'bg-gray-400'
                        }`}></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-300 mb-1">Configuration Status</div>
                        <div className="text-white">
                          {integration?.enabled ? 'Configured' : 'Not Configured'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-300 mb-1">Last Updated</div>
                        <div className="text-white">
                          {integration?.last_updated || 'Never'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button className="vx-btn vx-btn-secondary text-xs px-3 py-1">
                        📝 Edit Config
                      </button>
                      <button className="vx-btn vx-btn-secondary text-xs px-3 py-1">
                        📖 Documentation
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6">
      <div className="vx-card vx-glass p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">📋 Integration Activity Logs</h3>
          <button
            onClick={fetchIntegrationLogs}
            className="vx-btn vx-btn-secondary"
          >
            🔄 Refresh
          </button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <span className="text-lg">{getIntegrationIcon(log.integration)}</span>
                  <div>
                    <div className="font-medium text-white">{log.action}</div>
                    <div className="text-sm text-gray-300">{log.description}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {log.integration} • {log.timestamp}
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  log.status === 'success' ? 'text-green-400 bg-green-400/10' :
                  log.status === 'error' ? 'text-red-400 bg-red-400/10' :
                  'text-yellow-400 bg-yellow-400/10'
                }`}>
                  {log.status}
                </div>
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No integration activity logs available
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="space-y-8">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="vx-card vx-glass p-6">
          <div className="text-2xl font-bold text-green-400 mb-2">
            {Object.values(healthStatus.integrations || {}).filter(i => i.status === 'healthy').length}
          </div>
          <div className="text-sm text-gray-300">Healthy Integrations</div>
        </div>
        
        <div className="vx-card vx-glass p-6">
          <div className="text-2xl font-bold text-yellow-400 mb-2">
            {Object.values(healthStatus.integrations || {}).filter(i => i.status === 'degraded').length}
          </div>
          <div className="text-sm text-gray-300">Degraded Integrations</div>
        </div>
        
        <div className="vx-card vx-glass p-6">
          <div className="text-2xl font-bold text-red-400 mb-2">
            {Object.values(healthStatus.integrations || {}).filter(i => i.status === 'unhealthy').length}
          </div>
          <div className="text-sm text-gray-300">Unhealthy Integrations</div>
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="vx-card vx-glass p-8">
        <h3 className="text-xl font-bold text-white mb-6">📈 Response Time Monitoring</h3>
        <div className="space-y-4">
          {Object.entries(healthStatus.integrations || {}).map(([name, integration]) => (
            integration.response_time && (
              <div key={name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 capitalize flex items-center space-x-2">
                    <span>{getIntegrationIcon(name)}</span>
                    <span>{name}</span>
                  </span>
                  <span className="text-white">{integration.response_time}ms</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      integration.response_time > 1000 ? 'bg-red-400' : 
                      integration.response_time > 500 ? 'bg-yellow-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${Math.min((integration.response_time / 2000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="vx-card vx-glass p-8">
        <h3 className="text-xl font-bold text-white mb-6">🚨 Integration Alerts</h3>
        <div className="space-y-3">
          {Object.entries(healthStatus.integrations || {}).map(([name, integration]) => (
            integration.status === 'unhealthy' && (
              <div key={name} className="p-4 bg-red-400/10 border border-red-400/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-red-400">❌</span>
                  <div>
                    <div className="font-medium text-white capitalize">{name} Integration Down</div>
                    <div className="text-sm text-gray-300">{integration.error || 'Unknown error'}</div>
                  </div>
                </div>
              </div>
            )
          ))}
          
          {!Object.values(healthStatus.integrations || {}).some(i => i.status === 'unhealthy') && (
            <div className="text-center py-8 text-green-400">
              ✅ All integrations are operating normally
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(135deg, #000000 0%, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%, #000000 100%)",
      backgroundSize: "400% 400%",
      animation: "gradientShift 15s ease infinite"
    }}>
      {/* Header */}
      <div className="vx-glass border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="vx-logo">
                  <span className="text-black font-black text-xl">VX</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold vx-text-gradient">🔗 Enterprise Integrations</h1>
                  <p className="text-sm vx-text-muted">Connect with Fortune 500 enterprise systems</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchHealthStatus}
                className="vx-btn vx-btn-secondary"
              >
                <span>🔄</span>
                <span>Refresh Status</span>
              </button>
              <button
                onClick={() => router.push('/test')}
                className="vx-btn vx-btn-secondary"
              >
                <span>←</span>
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
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

        {/* Error Messages */}
        {error && (
          <div className="mb-6 vx-glass border border-red-400/30 text-red-100 px-6 py-4 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">❌</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading integration status...</p>
            </div>
          ) : (
            <div>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'configure' && renderConfigure()}
              {activeTab === 'logs' && renderLogs()}
              {activeTab === 'monitoring' && renderMonitoring()}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}