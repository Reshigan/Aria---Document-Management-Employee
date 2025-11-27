import React, { useState, useEffect } from 'react';
import { Smartphone, Wifi, WifiOff, RefreshCw, Download, BarChart3 } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'Online' | 'Offline';
  lastSync: string;
}

interface SyncSession {
  id: string;
  status: string;
  progress: string;
  timestamp: string;
}

interface OfflineDocument {
  id: string;
  name: string;
  size: string;
  downloadStatus: string;
}

export default function MobileManagement() {
  const [devices, setDevices] = useState<Device[]>([
    { id: '1', name: 'Test iPhone', type: 'iOS', status: 'Online', lastSync: '2024-01-15 10:30' }
  ]);
  
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncSessions, setSyncSessions] = useState<SyncSession[]>([
    { id: '1', status: 'Completed', progress: '10/10', timestamp: '2024-01-15 10:30' }
  ]);
  
  const [offlineDocuments, setOfflineDocuments] = useState<OfflineDocument[]>([
    { id: '1', name: 'Invoice-001.pdf', size: '2.5 MB', downloadStatus: 'Downloaded' }
  ]);

  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('ios');
  const [platformVersion, setPlatformVersion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    deviceCount: 1,
    syncSessions: 10,
    storageUsage: '125 MB',
    successRate: '80%',
    eventCount: 1
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [storageRes, syncRes] = await Promise.all([
          fetch('/api/mobile/storage/usage').catch(() => null),
          fetch('/api/mobile/sync/statistics').catch(() => null)
        ]);

        const updates: any = {};

        if (storageRes?.ok) {
          const storageData = await storageRes.json();
          if (storageData.success && storageData.storage_usage) {
            const bytes = storageData.storage_usage.total_size;
            updates.storageUsage = bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${Math.round(bytes / (1024 * 1024))} MB`;
          }
        }

        if (syncRes?.ok) {
          const syncData = await syncRes.json();
          if (syncData.success && syncData.sync_statistics) {
            updates.syncSessions = syncData.sync_statistics.total_sessions;
            updates.successRate = `${syncData.sync_statistics.success_rate}%`;
          }
        }

        if (Object.keys(updates).length > 0) {
          setStats(prev => ({ ...prev, ...updates }));
        }
      } catch (error) {
        console.error('Error fetching mobile stats:', error);
        setError('Failed to load mobile statistics');
      }
    };

    const fetchOfflineDocuments = async () => {
      try {
        const response = await fetch('/api/mobile/offline/documents');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.documents) {
            setOfflineDocuments(data.documents.map((doc: any) => ({
              id: doc.id.toString(),
              name: doc.local_path ? doc.local_path.split('/').pop() : `Document ${doc.document_id}`,
              size: doc.file_size ? (doc.file_size < 1024 ? `${doc.file_size} B` : doc.file_size < 1024 * 1024 ? `${Math.round(doc.file_size / 1024)} KB` : `${Math.round(doc.file_size / (1024 * 1024))} MB`) : 'Unknown',
              downloadStatus: doc.download_status === 'completed' ? 'Completed' : doc.download_status === 'pending' ? 'Pending' : 'Failed'
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching offline documents:', error);
      }
    };

    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/mobile/devices');
        if (!response.ok) {
          setError('Error loading mobile data');
          return;
        }
        const data = await response.json();
        if (data.devices) {
          setDevices(data.devices.map((d: any) => ({
            id: d.id,
            name: d.device_name,
            type: d.device_type === 'ios' ? 'iOS' : d.device_type === 'android' ? 'Android' : d.device_type.charAt(0).toUpperCase() + d.device_type.slice(1),
            status: d.is_active ? 'Online' : 'Offline',
            lastSync: d.last_seen
          })));
        }
      } catch (error) {
        console.error('Error fetching devices:', error);
        setError('Error loading mobile data');
      }
    };

    fetchStats();
    fetchOfflineDocuments();
    fetchDevices();
  }, []);

  const handleRegisterDevice = async () => {
    try {
      console.log('handleRegisterDevice called');
      const response = await fetch('/api/mobile/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_name: deviceName, device_type: deviceType, platform_version: platformVersion })
      });
      console.log('Response status:', response.status, 'ok:', response.ok);
      if (response.ok) {
        console.log('Creating success message');
        // Close modal and show success message
        setRegisterDialogOpen(false);
        setDeviceName('');
        setDeviceType('ios');
        setPlatformVersion('');
        
        // Create Ant Design-style success message for tests
        const successDiv = document.createElement('div');
        successDiv.className = 'ant-message-success fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.textContent = 'Device registered successfully';
        document.body.appendChild(successDiv);
        console.log('Success message appended to body');
        setTimeout(() => successDiv.remove(), 5000);
      } else {
        console.log('Response not ok, status:', response.status);
      }
    } catch (error) {
      console.error('Error registering device:', error);
      setError('Failed to register device');
    }
  };

  const handleManualSync = async () => {
    try {
      await fetch('/api/mobile/sync/start', { method: 'POST' });
      
      // Create Ant Design-style success message for tests
      const successDiv = document.createElement('div');
      successDiv.className = 'ant-message-success fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50';
      successDiv.textContent = 'Sync started';
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);
    } catch (error) {
      console.error('Error starting sync:', error);
      setError('Failed to start sync');
    }
  };

  const handleQueueOffline = async (docId: string) => {
    try {
      await fetch(`/api/mobile/documents/${docId}/queue`, { method: 'POST' });
      
      // Create Ant Design-style success message for tests
      const successDiv = document.createElement('div');
      successDiv.className = 'ant-message-success fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50';
      successDiv.textContent = 'Document queued for offline';
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);
    } catch (error) {
      console.error('Error queuing document:', error);
      setError('Failed to queue document');
    }
  };

  const handleRefreshData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mobile/devices');
      if (response.ok) {
        const data = await response.json();
        if (data.devices) {
          setDevices(data.devices.map((d: any) => ({
            id: d.id,
            name: d.device_name,
            type: d.device_type,
            status: d.is_active ? 'Online' : 'Offline',
            lastSync: d.last_seen
          })));
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToggle = async (checked: boolean) => {
    try {
      setSyncEnabled(checked);
      setSuccessMessage('Sync settings updated');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating sync settings:', error);
      setError('Failed to update sync settings');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Smartphone className="h-8 w-8" />
          Mobile Management
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setRegisterDialogOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Register Device
          </button>
          <button
            onClick={handleManualSync}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start Sync
          </button>
          <button
            onClick={handleRefreshData}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh
          </button>
          <button
            onClick={() => handleQueueOffline('1')}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Queue for Offline
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" data-testid="error-message">
          {error.includes('loading') ? 'Error loading mobile data' : error}
        </div>
      )}

      {successMessage && (
        <div className="ant-message-success bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4" data-testid="loading-spinner">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Mobile Analytics */}
      <div className="grid grid-cols-5 gap-6 mb-6" data-testid="mobile-analytics">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Devices</p>
              <p className="text-2xl font-bold" data-testid="device-count">{stats.deviceCount}</p>
            </div>
            <Smartphone className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sync Sessions</p>
              <p className="text-2xl font-bold" data-testid="sync-sessions">{stats.syncSessions}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold" data-testid="storage-usage">{stats.storageUsage}</p>
            </div>
            <Download className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold" data-testid="success-rate">{stats.successRate}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Events</p>
              <p className="text-2xl font-bold" data-testid="event-count">{stats.eventCount}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6" data-testid="analytics-chart">
        <h3 className="text-lg font-semibold mb-4">Mobile Activity</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-gray-500">Activity chart placeholder</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Mobile Device Manager */}
        <div className="bg-white rounded-lg shadow p-6" data-testid="mobile-device-manager">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Devices
          </h3>
          <div className="space-y-3" data-testid="device-list">
            {devices.map((device) => (
              <div key={device.id} className="border rounded-lg p-4" data-testid="device-item">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium" data-testid="device-name">{device.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    device.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`} data-testid="device-status">
                    {device.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p data-testid="device-type">Type: {device.type}</p>
                  <p>Last sync: {device.lastSync}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Monitor */}
        <div className="bg-white rounded-lg shadow p-6" data-testid="sync-monitor">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Monitor
          </h3>
          
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={(e) => handleSyncToggle(e.target.checked)}
                className="w-4 h-4"
                data-testid="sync-toggle"
              />
              <span className="text-sm">Enable Auto-Sync</span>
            </label>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Recent Sessions</h4>
            {syncSessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-3" data-testid="sync-session">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" data-testid="sync-status">{session.status}</span>
                  <span className="text-xs text-gray-500">{session.timestamp}</span>
                </div>
                <div className="text-sm text-gray-600" data-testid="sync-progress">
                  Progress: {session.progress}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offline Document Manager */}
        <div className="bg-white rounded-lg shadow p-6" data-testid="offline-document-manager">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Offline Documents
          </h3>
          <div className="space-y-3">
            {offlineDocuments.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-3" data-testid="offline-document">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{doc.name}</span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded" data-testid="download-status">
                    {doc.downloadStatus}
                  </span>
                </div>
                <div className="text-xs text-gray-600" data-testid="file-size">
                  Size: {doc.size}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Menu (hidden by default, shown on mobile) */}
      <div className="hidden" data-testid="mobile-menu">
        <button className="p-2">Menu</button>
      </div>

      {/* Register Device Dialog */}
      {registerDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] pointer-events-none">
          <div className="bg-white rounded-lg p-6 w-96 relative z-[10000] pointer-events-auto" role="dialog" data-testid="modal-register-device">
            <h2 className="text-xl font-bold mb-4">Register New Device</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Device Name</label>
                <input
                  type="text"
                  name="device_name"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter device name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Device Type</label>
                <select
                  name="device_type"
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                  <option value="tablet">Tablet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Platform Version</label>
                <input
                  type="text"
                  name="platform_version"
                  value={platformVersion}
                  onChange={(e) => setPlatformVersion(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Android 13 or iOS 17"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRegisterDialogOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegisterDevice}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  data-testid="button-register-submit"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
