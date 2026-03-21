import { useState, useEffect } from 'react';
import { Upload, Database, RefreshCw, FileText, Check, AlertCircle } from 'lucide-react';
import { goLiveApi } from '../../services/goLiveApi';

const ENTITIES = ['customers', 'suppliers', 'products', 'invoices', 'employees'];

export default function DataMigration() {
  const [status, setStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('customers');
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<{ imported: number; errors: number; message: string } | null>(null);

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await goLiveApi.getMigrationStatus();
      setStatus(res.data?.data || {});
    } catch { /* empty */ }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(reader.result as string);
    reader.readAsText(file);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current.trim()); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map(line => {
      const values = parseCsvLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    setResult(null);
    try {
      const data = parseCsv(csvText);
      if (data.length === 0) {
        setResult({ imported: 0, errors: 0, message: 'No data found in CSV' });
        setImporting(false);
        return;
      }
      const res = await goLiveApi.importData({ entity: selectedEntity, data });
      setResult(res.data);
      fetchStatus();
    } catch (err: any) {
      setResult({ imported: 0, errors: 1, message: err.response?.data?.error || 'Import failed' });
    }
    setImporting(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Database className="h-6 w-6 text-indigo-600" />Data Migration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">Import real data from CSV files</p>
        </div>
        <button onClick={fetchStatus} className="p-2 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(status).map(([key, count]) => (
          <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{count}</p>
            <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="h-5 w-5 text-green-600" />Import Data</h2>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 text-sm">
            <FileText className="h-4 w-4" />Choose CSV File
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={6} placeholder={`Paste CSV data here, e.g.:\n${selectedEntity === 'customers' ? 'customer_name,email,phone\nAcme Corp,acme@test.com,0123456789' : selectedEntity === 'suppliers' ? 'supplier_name,email,phone\nSupplier Co,sup@test.com,0123456789' : selectedEntity === 'invoices' ? 'invoice_number,customer_id,total_amount,status\nINV-001,cust-uuid,1500,draft' : selectedEntity === 'employees' ? 'full_name,email,department,position\nJohn Doe,john@co.za,Finance,Accountant' : 'product_name,sku,unit_price,cost_price\nWidget A,WA-001,100,50'}`}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm font-mono" />
        <button onClick={handleImport} disabled={importing || !csvText.trim()}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
          {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Import {selectedEntity}
        </button>
        {result && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${result.errors > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {result.errors > 0 ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {result.message || `Imported ${result.imported} records`}
          </div>
        )}
      </div>
    </div>
  );
}
