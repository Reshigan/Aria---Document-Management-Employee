import { useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, Check } from 'lucide-react';
import { goLiveApi } from '../../services/goLiveApi';

const ENTITIES = [
  { key: 'customers', label: 'Customers', icon: '👥' },
  { key: 'suppliers', label: 'Suppliers', icon: '🏭' },
  { key: 'products', label: 'Products', icon: '📦' },
  { key: 'invoices', label: 'Invoices', icon: '📄' },
  { key: 'quotes', label: 'Quotes', icon: '📋' },
  { key: 'sales-orders', label: 'Sales Orders', icon: '🛒' },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: '📑' },
  { key: 'employees', label: 'Employees', icon: '👤' },
  { key: 'journal-entries', label: 'Journal Entries', icon: '📒' },
  { key: 'stock-movements', label: 'Stock Movements', icon: '📊' },
];

export default function DataExport() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<string[]>([]);

  const handleExport = async (entity: string) => {
    setExporting(entity);
    try {
      const response = await goLiveApi.exportData(entity, 'csv');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(prev => [...prev, entity]);
    } catch {
      try {
        const response = await goLiveApi.exportData(entity, 'json');
        const data = response.data?.data || response.data;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entity}-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExported(prev => [...prev, entity]);
      } catch { /* silent */ }
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    for (const entity of ENTITIES) {
      await handleExport(entity.key);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-indigo-600" />Data Export</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Export data from any module as CSV</p>
        </div>
        <button onClick={handleExportAll} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Download className="h-4 w-4" />Export All
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {ENTITIES.map(entity => (
          <button key={entity.key} onClick={() => handleExport(entity.key)} disabled={exporting === entity.key}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:shadow-md transition-all">
            <span className="text-2xl">{entity.icon}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{entity.label}</span>
            {exporting === entity.key ? (
              <RefreshCw className="h-4 w-4 text-indigo-600 animate-spin" />
            ) : exported.includes(entity.key) ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Download className="h-4 w-4 text-gray-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
