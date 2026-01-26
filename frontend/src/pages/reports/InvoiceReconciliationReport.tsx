import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

export default function InvoiceReconciliationReportPage() {
  const [data, setData] = useState({ stats: {}, invoices: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/reports/agents/invoice-reconciliation', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        setData(await response.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'amount', label: 'Amount', render: (row: any) => `R ${row.amount.toFixed(2)}` },
    { key: 'status', label: 'Status', render: (row: any) => {
      const colors = {
        matched: 'text-green-600',
        pending: 'text-yellow-600',
        unmatched: 'text-red-600'
      };
      return <span className={colors[row.status as keyof typeof colors]}>{row.status}</span>;
    }},
    { key: 'confidence', label: 'Confidence', render: (row: any) => `${row.confidence}%` }
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Invoice Reconciliation Report
      </h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Processed</div>
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">234</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Auto-Matched</div>
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">223</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">95.3% accuracy</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</div>
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">8</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Unmatched</div>
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">3</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <DataTable
          data={data.invoices}
          columns={columns}
          searchable={true}
          exportable={true}
          exportFilename="invoice-reconciliation"
        />
      </div>
    </div>
  );
}
