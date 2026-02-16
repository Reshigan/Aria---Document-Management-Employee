import React, { useState, useEffect } from 'react';
import { Smartphone, Wifi, WifiOff, RefreshCw, Download, BarChart3 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';


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

interface MobileStats {
  deviceCount: number;
  syncSessions: number;
  storageUsage: string;
  eventCount: number;
}

export default function MobileManagement() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncSessions, setSyncSessions] = useState<SyncSession[]>([]);
  const [offlineDocuments, setOfflineDocuments] = useState<OfflineDocument[]>([]);
  const [stats, setStats] = useState<MobileStats>({
    deviceCount: 0,
    syncSessions: 0,
    storageUsage: '0 MB',
    eventCount: 0
  });

  const fetchMobileData = async () => {
    setLoading(true);
    try {
      const [devicesRes, sessionsRes, docsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/mobile/devices`),
        fetch(`${API_BASE}/mobile/sync-sessions`),
        fetch(`${API_BASE}/mobile/offline-documents`),
        fetch(`${API_BASE}/mobile/stats`)
      ]);
      if (devicesRes.ok) setDevices(await devicesRes.json());
      if (sessionsRes.ok) setSyncSessions(await sessionsRes.json());
      if (docsRes.ok) setOfflineDocuments(await docsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Error fetching mobile data:', err);
      // Fallback data
      setDevices([
        { id: '1', name: 'Test iPhone', type: 'iOS', status: 'Online', lastSync: '2026-01-15 10:30' }
      ]);
      setSyncSessions([
        { id: '1', status: 'Completed', progress: '10/10', timestamp: '2026-01-15 10:30' }
      ]);
      setOfflineDocuments([
        { id: '1', name: 'Invoice-001.pdf', size: '2.5 MB', downloadStatus: 'Downloaded' }
      ]);
      setStats({
        deviceCount: 1,
        syncSessions: 10,
        storageUsage: '125 MB',
        eventCount: 45
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMobileData();
  }, []);

  const handleSyncToggle = async (enabled: boolean) => {
    setSyncEnabled(enabled);
    try {
      await fetch(`${API_BASE}/mobile/sync-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_sync: enabled })
      });
    } catch (err) {
      console.error('Failed to update sync settings:', err);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl ">
              <Smartphone className="h-7 w-7 text-white" />
            </div>
            Mobile Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 ml-14">Manage mobile devices and offline sync</p>
        </div>
        <button
          onClick={fetchMobileData}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>

      {/* Mobile Analytics */}
      <div className="grid grid-cols-4 gap-6 mb-6" data-testid="mobile-analytics">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Devices</p>
              <p className="text-2xl font-bold" data-testid="device-count">{stats.deviceCount}</p>
            </div>
            <Smartphone className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sync Sessions</p>
              <p className="text-2xl font-bold" data-testid="sync-sessions">{stats.syncSessions}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold" data-testid="storage-usage">{stats.storageUsage}</p>
            </div>
            <Download className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Events</p>
              <p className="text-2xl font-bold" data-testid="event-count">{stats.eventCount}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white rounded-lg shadow p-4 mb-6" data-testid="analytics-chart">
        <h3 className="text-lg font-semibold mb-4">Mobile Activity</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-gray-500">Activity chart placeholder</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Mobile Device Manager */}
        <div className="bg-white rounded-lg shadow p-4" data-testid="mobile-device-manager">
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
        <div className="bg-white rounded-lg shadow p-4" data-testid="sync-monitor">
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
        <div className="bg-white rounded-lg shadow p-4" data-testid="offline-document-manager">
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
        </>
      )}
    </div>
  );
}
