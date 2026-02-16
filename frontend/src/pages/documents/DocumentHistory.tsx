import React, { useState, useEffect } from 'react';
import { FileText, Download, Mail, Eye, RefreshCw } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api';


interface Document {
  id: string;
  type: string;
  customer: string;
  date: string;
  amount: number;
  status: string;
}

export default function DocumentHistoryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const companyId = localStorage.getItem('selectedCompanyId');
      
      const response = await fetch(`${API_BASE}/documents/history?company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <FileText className="h-8 w-8" />
        Document History
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <DataTable
          data={documents}
          columns={[
            { key: 'id', label: 'Document #' },
            { key: 'type', label: 'Type' },
            { key: 'customer', label: 'Customer/Supplier' },
            { key: 'date', label: 'Date' },
            { key: 'amount', label: 'Amount', render: (row: any) => `R ${Number(row.amount ?? 0).toLocaleString()}` },
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
