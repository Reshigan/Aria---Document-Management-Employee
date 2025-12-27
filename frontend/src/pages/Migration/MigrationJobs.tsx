import { useState, useEffect } from 'react';
import { Database, Plus, Search, Play, Pause, RotateCcw, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Database size={28} className="text-purple-500" />
          Data Migration
        </h1>
        <p className="text-gray-600 mt-1">Import data from external systems into ARIA ERP</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Jobs</div>
          <div className="text-2xl font-bold text-purple-600">{jobs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Records</div>
          <div className="text-2xl font-bold text-blue-600">{totalRecords.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Successful</div>
          <div className="text-2xl font-bold text-green-600">{successRecords.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Errors</div>
          <div className="text-2xl font-bold text-red-600">{errorRecords.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
            className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700"
          >
            <Plus size={16} />
            New Migration
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{job.name}</div>
                    {job.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{job.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{job.source_system}</div>
                    <div className="text-xs text-gray-500">{job.source_type.toUpperCase()}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {job.target_module}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${job.status === 'failed' ? 'bg-red-600' : 'bg-purple-600'}`}
                          style={{ width: `${getProgress(job)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{getProgress(job)}%</span>
                    </div>
                    <div className="text-xs text-center text-gray-500 mt-1">
                      {job.processed_records || 0} / {job.total_records || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[job.status]}`}>
                      {job.status}
                    </span>
                    {job.error_records && job.error_records > 0 && (
                      <div className="text-xs text-red-500 mt-1">
                        {job.error_records} errors
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {job.status === 'pending' && (
                      <button
                        onClick={() => handleStart(job.id)}
                        className="text-green-600 hover:text-green-900 mr-2"
                        title="Start"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    {job.status === 'running' && (
                      <button
                        onClick={() => handlePause(job.id)}
                        className="text-yellow-600 hover:text-yellow-900 mr-2"
                        title="Pause"
                      >
                        <Pause size={16} />
                      </button>
                    )}
                    {(job.status === 'paused' || job.status === 'failed') && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        title="Retry"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || filterStatus 
                ? 'No migration jobs found matching your criteria' 
                : 'No migration jobs yet. Create your first one!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">New Migration Job</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Import Customers from Odoo"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source System</label>
                  <select
                    value={formData.source_system}
                    onChange={(e) => setFormData({ ...formData, source_system: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                  <select
                    value={formData.source_type}
                    onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="csv">CSV File</option>
                    <option value="xlsx">Excel File</option>
                    <option value="api">API Connection</option>
                    <option value="database">Database</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Module</label>
                <select
                  value={formData.target_module}
                  onChange={(e) => setFormData({ ...formData, target_module: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
