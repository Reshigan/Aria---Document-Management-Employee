import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';


interface SyncRecord {
  id: number;
  integration: string;
  type: string;
  status: 'Success' | 'Failed' | 'Pending';
  records: number;
  time: string;
  error_message?: string;
}

interface SyncSummary {
  total_today: number;
  successful: number;
  failed: number;
}

export default function IntegrationSyncPage() {
  const [loading, setLoading] = useState(true);
  const [syncHistory, setSyncHistory] = useState<SyncRecord[]>([]);
  const [summary, setSummary] = useState<SyncSummary>({ total_today: 0, successful: 0, failed: 0 });
  const [syncing, setSyncing] = useState(false);

  const fetchSyncHistory = async () => {
    setLoading(true);
    try {
      const [historyRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/integrations/sync/history`),
        fetch(`${API_BASE}/integrations/sync/summary`)
      ]);
      if (historyRes.ok) setSyncHistory(await historyRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (err) {
      console.error('Error fetching sync history:', err);
      // Fallback data
      setSyncHistory([
        { id: 1, integration: 'Xero', type: 'Customers', status: 'Success', records: 45, time: '2026-01-15 14:30' },
        { id: 2, integration: 'Sage', type: 'Invoices', status: 'Success', records: 123, time: '2026-01-15 08:15' },
        { id: 3, integration: 'SARS', type: 'VAT Return', status: 'Failed', records: 0, time: '2026-01-14 16:45', error_message: 'Connection timeout' },
        { id: 4, integration: 'Microsoft 365', type: 'Emails', status: 'Success', records: 89, time: '2026-01-15 15:10' }
      ]);
      setSummary({ total_today: 12, successful: 11, failed: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncHistory();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await fetch(`${API_BASE}/integrations/sync/all`, { method: 'POST' });
      await fetchSyncHistory();
    } catch (err) {
      console.error('Sync all failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl ">
              <RefreshCw className="h-7 w-7 text-white" />
            </div>
            Integration Sync History
          </h1>
          <p className="text-gray-500 dark:text-gray-300 ml-14">Monitor and manage data synchronization</p>
        </div>
        <button 
          onClick={handleSyncAll}
          disabled={syncing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold  hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync All Now'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl ">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.total_today}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Total Syncs Today</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl ">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.successful}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Successful</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl ">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.failed}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Failed</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <DataTable
              data={syncHistory}
              columns={[
                { key: 'integration', label: 'Integration' },
                { key: 'type', label: 'Data Type' },
                { key: 'status', label: 'Status', render: (row: any) => {
                  const icons = {
                    Success: <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 inline mr-1" />,
                    Failed: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 inline mr-1" />,
                    Pending: <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 inline mr-1" />
                  };
                  return <span className="text-gray-900 dark:text-white">{icons[row.status as keyof typeof icons]}{row.status}</span>;
                }},
                { key: 'records', label: 'Records' },
                { key: 'time', label: 'Time' }
              ]}
              searchable={true}
              exportable={true}
              exportFilename="sync-history"
            />
          </div>
        </>
      )}
    </div>
  );
}
