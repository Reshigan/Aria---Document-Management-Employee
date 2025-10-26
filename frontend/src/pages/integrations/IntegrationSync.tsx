import React from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

export default function IntegrationSyncPage() {
  const syncHistory = [
    { id: 1, integration: 'Xero', type: 'Customers', status: 'Success', records: 45, time: '2025-10-25 14:30' },
    { id: 2, integration: 'Sage', type: 'Invoices', status: 'Success', records: 123, time: '2025-10-25 08:15' },
    { id: 3, integration: 'SARS', type: 'VAT Return', status: 'Failed', records: 0, time: '2025-10-24 16:45' },
    { id: 4, integration: 'Microsoft 365', type: 'Emails', status: 'Success', records: 89, time: '2025-10-25 15:10' }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <RefreshCw className="h-8 w-8" />
          Integration Sync History
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Sync All Now
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Syncs Today</div>
            <RefreshCw className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">12</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Successful</div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">11</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Failed</div>
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-600">1</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={syncHistory}
          columns={[
            { key: 'integration', label: 'Integration' },
            { key: 'type', label: 'Data Type' },
            { key: 'status', label: 'Status', render: (row: any) => {
              const icons = {
                Success: <CheckCircle className="h-4 w-4 text-green-600 inline mr-1" />,
                Failed: <XCircle className="h-4 w-4 text-red-600 inline mr-1" />,
                Pending: <Clock className="h-4 w-4 text-yellow-600 inline mr-1" />
              };
              return <span>{icons[row.status as keyof typeof icons]}{row.status}</span>;
            }},
            { key: 'records', label: 'Records' },
            { key: 'time', label: 'Time' }
          ]}
          searchable={true}
          exportable={true}
          exportFilename="sync-history"
        />
      </div>
    </div>
  );
}
