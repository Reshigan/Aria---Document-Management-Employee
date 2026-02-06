import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Download } from 'lucide-react';
import { DataTable } from '../../components/shared/DataTable';

interface AgedItem {
  id: string;
  name: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  total: number;
}

interface AgedData {
  as_of_date: string;
  debtors: AgedItem[];
  creditors: AgedItem[];
  debtors_totals: { current: number; days30: number; days60: number; days90: number; total: number };
  creditors_totals: { current: number; days30: number; days60: number; days90: number; total: number };
}

export default function AgedReportsPage() {
  const [reportType, setReportType] = useState('debtors');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AgedData | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchAgedReports = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/reports/aged?as_of_date=${asOfDate}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching aged reports:', err);
      // Fallback data
      setData({
        as_of_date: asOfDate,
        debtors: [
          { id: '1', name: 'ABC Corporation', current: 15000, days30: 5000, days60: 2500, days90: 1200, total: 23700 },
          { id: '2', name: 'XYZ Trading Ltd', current: 8500, days30: 12000, days60: 3000, days90: 2000, total: 25500 },
          { id: '3', name: 'Global Services Inc', current: 22000, days30: 0, days60: 0, days90: 0, total: 22000 },
          { id: '4', name: 'Tech Solutions SA', current: 0, days30: 8000, days60: 5500, days90: 4200, total: 17700 },
          { id: '5', name: 'Premier Holdings', current: 35000, days30: 15000, days60: 0, days90: 0, total: 50000 }
        ],
        creditors: [
          { id: '1', name: 'Supplier A - Raw Materials', current: 12000, days30: 0, days60: 0, days90: 0, total: 12000 },
          { id: '2', name: 'Supplier B - Equipment', current: 5000, days30: 3000, days60: 0, days90: 0, total: 8000 },
          { id: '3', name: 'Logistics Provider', current: 8500, days30: 2500, days60: 1500, days90: 0, total: 12500 },
          { id: '4', name: 'Office Supplies Co', current: 2200, days30: 800, days60: 0, days90: 0, total: 3000 }
        ],
        debtors_totals: { current: 80500, days30: 40000, days60: 11000, days90: 7400, total: 138900 },
        creditors_totals: { current: 27700, days30: 6300, days60: 1500, days90: 0, total: 35500 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgedReports();
  }, [asOfDate]);

  const handleExport = async (type: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/reports/aged/export?type=${type}&as_of_date=${asOfDate}&format=csv`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `aged-${type}-${asOfDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const debtors = data?.debtors.map(d => ({ customer: d.name, ...d })) || [];
  const creditors = data?.creditors.map(c => ({ supplier: c.name, ...c })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Calendar className="h-8 w-8 text-indigo-600" />
            Aged Reports
          </h1>
          <div className="flex gap-3 items-center">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={fetchAgedReports}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setReportType('debtors')}
              className={`px-4 py-2 rounded-lg transition-colors ${reportType === 'debtors' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Aged Debtors
            </button>
            <button
              onClick={() => setReportType('creditors')}
              className={`px-4 py-2 rounded-lg transition-colors ${reportType === 'creditors' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              Aged Creditors
            </button>
            <button
              onClick={() => handleExport(reportType)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            {['Current', '30 Days', '60 Days', '90+ Days', 'Total'].map((label, idx) => {
              const totals = reportType === 'debtors' ? data.debtors_totals : data.creditors_totals;
              const keys = ['current', 'days30', 'days60', 'days90', 'total'] as const;
              const value = totals[keys[idx]];
              return (
                <div key={label} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                  <p className={`text-xl font-bold ${idx === 4 ? 'text-indigo-600 dark:text-indigo-400' : idx >= 2 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    R {value.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {reportType === 'debtors' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <DataTable
                  data={debtors}
                  columns={[
                    { key: 'customer', label: 'Customer' },
                    { key: 'current', label: 'Current', render: (r: any) => `R ${r.current.toLocaleString()}` },
                    { key: 'days30', label: '30 Days', render: (r: any) => <span className={r.days30 > 0 ? 'text-yellow-600' : ''}>R {r.days30.toLocaleString()}</span> },
                    { key: 'days60', label: '60 Days', render: (r: any) => <span className={r.days60 > 0 ? 'text-orange-600' : ''}>R {r.days60.toLocaleString()}</span> },
                    { key: 'days90', label: '90+ Days', render: (r: any) => <span className={r.days90 > 0 ? 'text-red-600 font-medium' : ''}>R {r.days90.toLocaleString()}</span> },
                    { key: 'total', label: 'Total', render: (r: any) => <strong className="text-indigo-600">R {r.total.toLocaleString()}</strong> }
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
                    { key: 'days30', label: '30 Days', render: (r: any) => <span className={r.days30 > 0 ? 'text-yellow-600' : ''}>R {r.days30.toLocaleString()}</span> },
                    { key: 'days60', label: '60 Days', render: (r: any) => <span className={r.days60 > 0 ? 'text-orange-600' : ''}>R {r.days60.toLocaleString()}</span> },
                    { key: 'days90', label: '90+ Days', render: (r: any) => <span className={r.days90 > 0 ? 'text-red-600 font-medium' : ''}>R {r.days90.toLocaleString()}</span> },
                    { key: 'total', label: 'Total', render: (r: any) => <strong className="text-indigo-600">R {r.total.toLocaleString()}</strong> }
                  ]}
                  searchable={true}
                  exportable={true}
                  exportFilename="aged-creditors"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
