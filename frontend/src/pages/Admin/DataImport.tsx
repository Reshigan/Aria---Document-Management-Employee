import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, FileText, Table } from 'lucide-react';

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  total_rows: number;
  successful: number;
  failed: number;
  errors: ImportError[];
}

const DataImport: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>('customers');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const modules = [
    { value: 'customers', label: 'Customers', template: 'customers_template.csv' },
    { value: 'suppliers', label: 'Suppliers', template: 'suppliers_template.csv' },
    { value: 'products', label: 'Products', template: 'products_template.csv' },
    { value: 'chart_of_accounts', label: 'Chart of Accounts', template: 'coa_template.csv' },
    { value: 'journal_entries', label: 'Journal Entries', template: 'journal_entries_template.csv' },
    { value: 'invoices', label: 'Customer Invoices', template: 'invoices_template.csv' },
    { value: 'bills', label: 'Supplier Bills', template: 'bills_template.csv' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const downloadTemplate = async () => {
    const module = modules.find(m => m.value === selectedModule);
    if (!module) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/data-import/template/${selectedModule}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = module.template;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', selectedModule);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/data-import/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Import failed:', error);
      setResult({
        success: false,
        total_rows: 0,
        successful: 0,
        failed: 0,
        errors: [{ row: 0, field: 'system', message: 'Import failed: ' + String(error) }],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Data Import</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Import bulk data from CSV files into your ERP system
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Module
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            >
              {modules.map((module) => (
                <option key={module.value} value={module.value}>
                  {module.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 transition-colors"
            >
              <Download size={20} />
              Download Template
            </button>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload CSV File
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Upload size={20} />
              {importing ? 'Importing...' : 'Import Data'}
            </button>
          </div>
          {file && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Selected: {file.name} ({Number((file.size / 1024) || 0).toFixed(2)} KB)
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-md p-6">
          <div className="flex items-center gap-3 mb-4">
            {result.success ? (
              <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
            ) : (
              <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
            )}
            <h2 className="text-xl font-semibold">
              {result.success ? 'Import Completed' : 'Import Completed with Errors'}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rows</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.total_rows}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.successful}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.failed}</p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Table size={20} />
                Error Details
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Row
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Field
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Error Message
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {result.errors.map((error, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{error.row}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{error.field}</td>
                        <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Import Guidelines</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Download the template for your selected module first</li>
              <li>• Fill in the CSV file with your data following the template format</li>
              <li>• Ensure all required fields are populated</li>
              <li>• Date format should be YYYY-MM-DD</li>
              <li>• Amount fields should be numeric without currency symbols</li>
              <li>• The system will validate each row and report errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImport;
