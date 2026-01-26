import { useState, useEffect } from 'react';
import { ShieldCheck, Search, CheckCircle, XCircle, AlertTriangle, FileText, Download } from 'lucide-react';
import api from '../../lib/api';

interface ValidationResult {
  id: string;
  job_id: string;
  job_name?: string;
  record_number: number;
  source_data?: Record<string, unknown>;
  validation_status: string;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  created_at: string;
}

interface ValidationError {
  field: string;
  message: string;
  value?: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  value?: string;
}

interface MigrationJob {
  id: string;
  name: string;
}

export default function MigrationValidation() {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedResult, setSelectedResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    loadJobs();
    loadResults();
  }, []);

  useEffect(() => {
    loadResults();
  }, [filterJob, filterStatus]);

  const loadJobs = async () => {
    try {
      const response = await api.get('/odoo/migration/jobs');
      const data = response.data.data || response.data || [];
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadResults = async () => {
    try {
      setLoading(true);
      let url = '/odoo/migration/validation';
      const params = new URLSearchParams();
      if (filterJob) params.append('job_id', filterJob);
      if (filterStatus) params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading validation results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportErrors = async () => {
    try {
      const errorResults = results.filter(r => r.validation_status === 'error');
      const csvContent = [
        ['Record #', 'Job', 'Status', 'Errors', 'Warnings'].join(','),
        ...errorResults.map(r => [
          r.record_number,
          r.job_name || r.job_id,
          r.validation_status,
          r.errors?.map(e => `${e.field}: ${e.message}`).join('; ') || '',
          r.warnings?.map(w => `${w.field}: ${w.message}`).join('; ') || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'validation_errors.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const filteredResults = results.filter(r =>
    (r.job_name && r.job_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    r.record_number.toString().includes(searchTerm)
  );

  const statusColors: Record<string, string> = {
    valid: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  };

  const statusIcons: Record<string, React.ReactNode> = {
    valid: <CheckCircle size={16} className="text-green-600 dark:text-green-400" />,
    warning: <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />,
    error: <XCircle size={16} className="text-red-600 dark:text-red-400" />
  };

  const validCount = results.filter(r => r.validation_status === 'valid').length;
  const warningCount = results.filter(r => r.validation_status === 'warning').length;
  const errorCount = results.filter(r => r.validation_status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <ShieldCheck size={28} className="text-purple-500" />
          Data Validation
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Review and fix data quality issues before migration</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Records</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{results.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <CheckCircle size={14} className="text-green-600 dark:text-green-400" /> Valid
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{validCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <AlertTriangle size={14} className="text-yellow-600 dark:text-yellow-400" /> Warnings
          </div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warningCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <XCircle size={14} className="text-red-600 dark:text-red-400" /> Errors
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{errorCount}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by job or record..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Jobs</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Status</option>
            <option value="valid">Valid</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          {errorCount > 0 && (
            <button
              onClick={handleExportErrors}
              className="px-4 py-2 border border-red-300 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 hover:bg-red-50 dark:bg-red-900/30"
            >
              <Download size={16} />
              Export Errors
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Record</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Job</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Issues</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredResults.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">#{result.record_number}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {result.job_name || result.job_id}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusColors[result.validation_status]}`}>
                      {statusIcons[result.validation_status]}
                      {result.validation_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {result.errors && result.errors.length > 0 && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {result.errors.length} error{result.errors.length > 1 ? 's' : ''}
                      </div>
                    )}
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">
                        {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
                      </div>
                    )}
                    {(!result.errors || result.errors.length === 0) && (!result.warnings || result.warnings.length === 0) && (
                      <span className="text-sm text-green-600 dark:text-green-400">No issues</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedResult(result)}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-900"
                    >
                      <FileText size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredResults.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchTerm || filterJob || filterStatus 
                ? 'No validation results found matching your criteria' 
                : 'No validation results yet. Run a migration job to see results.'}
            </div>
          )}
        </div>
      </div>

      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Record #{selectedResult.record_number}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedResult.job_name}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusColors[selectedResult.validation_status]}`}>
                {statusIcons[selectedResult.validation_status]}
                {selectedResult.validation_status}
              </span>
            </div>

            {selectedResult.errors && selectedResult.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                  <XCircle size={14} /> Errors ({selectedResult.errors.length})
                </h3>
                <div className="space-y-2">
                  {selectedResult.errors.map((error, idx) => (
                    <div key={idx} className="bg-red-50 dark:bg-red-900/30 border border-red-200 rounded p-3">
                      <div className="font-medium text-red-800 dark:text-red-300">{error.field}</div>
                      <div className="text-sm text-red-600 dark:text-red-400">{error.message}</div>
                      {error.value && (
                        <div className="text-xs text-red-500 mt-1">Value: {error.value}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedResult.warnings && selectedResult.warnings.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1">
                  <AlertTriangle size={14} /> Warnings ({selectedResult.warnings.length})
                </h3>
                <div className="space-y-2">
                  {selectedResult.warnings.map((warning, idx) => (
                    <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 rounded p-3">
                      <div className="font-medium text-yellow-800 dark:text-yellow-300">{warning.field}</div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">{warning.message}</div>
                      {warning.value && (
                        <div className="text-xs text-yellow-500 mt-1">Value: {warning.value}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedResult.source_data && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Data</h3>
                <pre className="bg-gray-50 dark:bg-gray-900 border rounded p-3 text-xs overflow-x-auto">
                  {JSON.stringify(selectedResult.source_data, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
