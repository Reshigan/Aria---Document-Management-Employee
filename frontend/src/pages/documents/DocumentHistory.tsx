import React from 'react';
import { FileText, Download, Mail, Eye } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

export default function DocumentHistoryPage() {
  const documents = [
    { id: 'INV-1234', type: 'Tax Invoice', customer: 'ABC Corp', date: '2025-10-20', amount: 15000, status: 'Sent' },
    { id: 'QTE-5678', type: 'Quote', customer: 'XYZ Ltd', date: '2025-10-19', amount: 25000, status: 'Draft' },
    { id: 'PO-9012', type: 'Purchase Order', customer: 'Supplier A', date: '2025-10-18', amount: 8500, status: 'Approved' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Document History
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <DataTable
          data={documents}
          columns={[
            { key: 'id', label: 'Document #' },
            { key: 'type', label: 'Type' },
            { key: 'customer', label: 'Customer/Supplier' },
            { key: 'date', label: 'Date' },
            { key: 'amount', label: 'Amount', render: (row: any) => `R ${row.amount.toLocaleString()}` },
            { key: 'status', label: 'Status' },
            {
              key: 'actions',
              label: 'Actions',
              render: (row: any) => (
                <div className="flex gap-2">
                  <button className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-900/30 rounded"><Eye className="h-4 w-4" /></button>
                  <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 rounded"><Download className="h-4 w-4" /></button>
                  <button className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/30 rounded"><Mail className="h-4 w-4" /></button>
                </div>
              )
            }
          ]}
          searchable={true}
          exportable={true}
          exportFilename="document-history"
        />
      </div>
    </div>
  );
}
