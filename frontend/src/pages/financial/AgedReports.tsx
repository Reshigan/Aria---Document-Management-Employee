import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

export default function AgedReportsPage() {
  const [reportType, setReportType] = useState('debtors');

  const debtors = [
    { customer: 'ABC Corp', current: 15000, days30: 5000, days60: 0, days90: 0, total: 20000 },
    { customer: 'XYZ Ltd', current: 0, days30: 8000, days60: 3000, days90: 2000, total: 13000 }
  ];

  const creditors = [
    { supplier: 'Supplier A', current: 12000, days30: 0, days60: 0, days90: 0, total: 12000 },
    { supplier: 'Supplier B', current: 5000, days30: 3000, days60: 0, days90: 0, total: 8000 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="h-8 w-8" />
          Aged Reports
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setReportType('debtors')}
            className={`px-4 py-2 rounded-lg ${reportType === 'debtors' ? 'bg-blue-600 text-white' : 'border'}`}
          >
            Aged Debtors
          </button>
          <button
            onClick={() => setReportType('creditors')}
            className={`px-4 py-2 rounded-lg ${reportType === 'creditors' ? 'bg-blue-600 text-white' : 'border'}`}
          >
            Aged Creditors
          </button>
        </div>
      </div>

      {reportType === 'debtors' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <DataTable
            data={debtors}
            columns={[
              { key: 'customer', label: 'Customer' },
              { key: 'current', label: 'Current', render: (r: any) => `R ${r.current.toLocaleString()}` },
              { key: 'days30', label: '30 Days', render: (r: any) => `R ${r.days30.toLocaleString()}` },
              { key: 'days60', label: '60 Days', render: (r: any) => `R ${r.days60.toLocaleString()}` },
              { key: 'days90', label: '90+ Days', render: (r: any) => `R ${r.days90.toLocaleString()}` },
              { key: 'total', label: 'Total', render: (r: any) => <strong>R {r.total.toLocaleString()}</strong> }
            ]}
            searchable={true}
            exportable={true}
            exportFilename="aged-debtors"
          />
        </div>
      )}

      {reportType === 'creditors' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <DataTable
            data={creditors}
            columns={[
              { key: 'supplier', label: 'Supplier' },
              { key: 'current', label: 'Current', render: (r: any) => `R ${r.current.toLocaleString()}` },
              { key: 'days30', label: '30 Days', render: (r: any) => `R ${r.days30.toLocaleString()}` },
              { key: 'days60', label: '60 Days', render: (r: any) => `R ${r.days60.toLocaleString()}` },
              { key: 'days90', label: '90+ Days', render: (r: any) => `R ${r.days90.toLocaleString()}` },
              { key: 'total', label: 'Total', render: (r: any) => <strong>R {r.total.toLocaleString()}</strong> }
            ]}
            searchable={true}
            exportable={true}
            exportFilename="aged-creditors"
          />
        </div>
      )}
    </div>
  );
}
