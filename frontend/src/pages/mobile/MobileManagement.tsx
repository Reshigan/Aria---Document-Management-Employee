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

  const [stats, setStats] = useState({
    deviceCount: 1,
    syncSessions: 10,
    storageUsage: '125 MB',
    successRate: '80%',
    eventCount: 45
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
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Smartphone className="h-8 w-8" />
        Mobile Management
      </h1>

      {/* Mobile Analytics */}
      <div className="grid grid-cols-4 gap-6 mb-6" data-testid="mobile-analytics">
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
                onChange={(e) => setSyncEnabled(e.target.checked)}
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
    </div>
  );
}
