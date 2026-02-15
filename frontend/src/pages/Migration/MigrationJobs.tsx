import { useState, useEffect } from 'react';
import { Database, Plus, Search, Play, Pause, RotateCcw, Trash2, CheckCircle, XCircle, Clock, Upload, FileSpreadsheet, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface MigrationJob {
  id: string;
  name: string;
  description?: string;
  source_system: string;
  source_type: string;
  target_module: string;
  status: string;
  total_records?: number;
  processed_records?: number;
  success_records?: number;
  error_records?: number;
  started_at?: string;
  completed_at?: string;
  error_log?: string;
  created_at: string;
}

export default function MigrationJobs() {
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source_system: 'odoo',
    source_type: 'csv',
    target_module: 'customers'
  });

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [filterStatus]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      let url = '/odoo/migration/jobs';
      if (filterStatus) url += `?status=${filterStatus}`;
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading migration jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/odoo/migration/jobs', formData);
      setShowForm(false);
      resetForm();
      loadJobs();
    } catch (error) {
      console.error('Error creating migration job:', error);
      alert('Error creating migration job. Please try again.');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.post(`/odoo/migration/jobs/${id}/start`);
      loadJobs();
    } catch (error) {
      console.error('Error starting job:', error);
      alert('Error starting job. Please try again.');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/odoo/migration/jobs/${id}/pause`);
      loadJobs();
    } catch (error) {
      console.error('Error pausing job:', error);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await api.post(`/odoo/migration/jobs/${id}/retry`);
      loadJobs();
    } catch (error) {
      console.error('Error retrying job:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this migration job?')) return;
    try {
      await api.delete(`/odoo/migration/jobs/${id}`);
      loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Error deleting job. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      source_system: 'odoo',
      source_type: 'csv',
      target_module: 'customers'
    });
  };

  const filteredJobs = jobs.filter(j =>
    j.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.source_system.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.target_module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    validating: 'bg-blue-100 text-blue-800',
    running: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };

  const getProgress = (job: MigrationJob) => {
    if (!job.total_records || job.total_records === 0) return 0;
    return Math.round((job.processed_records || 0) / job.total_records * 100);
  };

  const totalRecords = jobs.reduce((sum, j) => sum + (j.total_records || 0), 0);
  const successRecords = jobs.reduce((sum, j) => sum + (j.success_records || 0), 0);
  const errorRecords = jobs.reduce((sum, j) => sum + (j.error_records || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/30">
            <Database className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Migration</h1>
            <p className="text-gray-600 dark:text-gray-400">Import data from external systems into ARIA ERP</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/30">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{jobs.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(totalRecords ?? 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(successRecords ?? 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-500/30">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(errorRecords ?? 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Errors</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="validating">Validating</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            New Migration
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Job</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{job.name}</div>
                    {job.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{job.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{job.source_system}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{job.source_type.toUpperCase()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {job.target_module}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${job.status === 'failed' ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                          style={{ width: `${getProgress(job)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{getProgress(job)}%</span>
                    </div>
                    <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                      {job.processed_records || 0} / {job.total_records || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${statusColors[job.status]} dark:bg-opacity-30`}>
                      {job.status}
                    </span>
                    {job.error_records && job.error_records > 0 && (
                      <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {job.error_records} errors
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.status === 'pending' && (
                        <button
                          onClick={() => handleStart(job.id)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Start"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {job.status === 'running' && (
                        <button
                          onClick={() => handlePause(job.id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                          title="Pause"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      {(job.status === 'paused' || job.status === 'failed') && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Retry"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="p-12 text-center">
              <Database className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterStatus 
                  ? 'No migration jobs found matching your criteria' 
                  : 'No migration jobs yet. Create your first one!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload className="h-5 w-5" />
                New Migration Job
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Import Customers from Odoo"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source System</label>
                  <select
                    value={formData.source_system}
                    onChange={(e) => setFormData({ ...formData, source_system: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="odoo">Odoo</option>
                    <option value="sage">Sage</option>
                    <option value="quickbooks">QuickBooks</option>
                    <option value="xero">Xero</option>
                    <option value="excel">Excel/CSV</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Type</label>
                  <select
                    value={formData.source_type}
                    onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="csv">CSV File</option>
                    <option value="xlsx">Excel File</option>
                    <option value="api">API Connection</option>
                    <option value="database">Database</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Module</label>
                <select
                  value={formData.target_module}
                  onChange={(e) => setFormData({ ...formData, target_module: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="customers">Customers</option>
                  <option value="suppliers">Suppliers</option>
                  <option value="products">Products</option>
                  <option value="inventory">Inventory</option>
                  <option value="sales_orders">Sales Orders</option>
                  <option value="purchase_orders">Purchase Orders</option>
                  <option value="invoices">Invoices</option>
                  <option value="payments">Payments</option>
                  <option value="employees">Employees</option>
                  <option value="chart_of_accounts">Chart of Accounts</option>
                  <option value="journal_entries">Journal Entries</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/30 font-medium"
                >
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
