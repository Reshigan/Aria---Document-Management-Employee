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
      const response = await fetch('/api/reports/bots/invoice-reconciliation', {
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Invoice Reconciliation Report
      </h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Processed</div>
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">234</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Auto-Matched</div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">223</div>
          <div className="text-sm text-gray-600 mt-2">95.3% accuracy</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Pending Review</div>
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">8</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Unmatched</div>
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">3</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
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
