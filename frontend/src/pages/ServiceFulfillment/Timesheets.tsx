import { useState, useEffect } from 'react';
import { Clock, Plus, Search, Edit, Trash2, Calendar, User, Briefcase, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface Timesheet {
  id: string;
  project_id: string;
  project_name?: string;
  task_id?: string;
  task_name?: string;
  employee_id?: string;
  employee_name?: string;
  date: string;
  hours: number;
  description?: string;
  billable: boolean;
  billing_rate?: number;
  billing_amount?: number;
  status: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function Timesheets() {
  const navigate = useNavigate();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    description: '',
    billable: true,
    billing_rate: 0
  });

  useEffect(() => {
    loadTimesheets();
    loadProjects();
  }, []);

  useEffect(() => {
    loadTimesheets();
  }, [filterProject, filterDate]);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      let url = '/odoo/services/timesheets';
      const params = new URLSearchParams();
      if (filterProject) params.append('project_id', filterProject);
      if (filterDate) params.append('date', filterDate);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      const data = response.data.data || response.data || [];
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await api.get('/odoo/services/projects');
      const data = response.data.data || response.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        billing_amount: formData.billable ? formData.hours * formData.billing_rate : 0
      };
      if (editingTimesheet) {
        await api.put(`/odoo/services/timesheets/${editingTimesheet.id}`, payload);
      } else {
        await api.post('/odoo/services/timesheets', payload);
      }
      setShowForm(false);
      setEditingTimesheet(null);
      resetForm();
      loadTimesheets();
    } catch (error) {
      console.error('Error saving timesheet:', error);
      alert('Error saving timesheet. Please try again.');
    }
  };

  const handleEdit = (timesheet: Timesheet) => {
    setEditingTimesheet(timesheet);
    setFormData({
      project_id: timesheet.project_id,
      date: timesheet.date,
      hours: timesheet.hours,
      description: timesheet.description || '',
      billable: timesheet.billable,
      billing_rate: timesheet.billing_rate || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timesheet entry?')) return;
    try {
      await api.delete(`/odoo/services/timesheets/${id}`);
      loadTimesheets();
    } catch (error) {
      console.error('Error deleting timesheet:', error);
      alert('Error deleting timesheet. Please try again.');
    }
  };

    const resetForm = () => {
      setFormData({
        project_id: filterProject || '',
        date: new Date().toISOString().split('T')[0],
        hours: 0,
        description: '',
        billable: true,
        billing_rate: 0
      });
    };

    const createInvoiceLine = async (timesheet: Timesheet) => {
      if (!timesheet.billable || !timesheet.billing_amount) {
        alert('This timesheet entry is not billable');
        return;
      }
      try {
        const invoiceLineData = {
          description: `${timesheet.project_name || 'Project'} - ${timesheet.description || 'Time Entry'} (${timesheet.hours}h)`,
          quantity: timesheet.hours,
          unit_price: timesheet.billing_rate || 0,
          amount: timesheet.billing_amount,
          source_type: 'timesheet',
          source_id: timesheet.id,
          project_id: timesheet.project_id,
          date: timesheet.date
        };
        await api.post('/erp/order-to-cash/invoice-lines', invoiceLineData);
        await api.put(`/odoo/services/timesheets/${timesheet.id}`, { status: 'invoiced' });
        alert(`Invoice line created for timesheet entry`);
        loadTimesheets();
      } catch (error) {
        console.error('Error creating invoice line:', error);
        alert('Error creating invoice line. Please try again.');
      }
    };

    const filteredTimesheets = timesheets.filter(t =>
    (t.project_name && t.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.employee_name && t.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
  const billableHours = timesheets.filter(t => t.billable).reduce((sum, t) => sum + t.hours, 0);
  const totalBilling = timesheets.reduce((sum, t) => sum + (t.billing_amount || 0), 0);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    invoiced: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Clock size={28} className="text-indigo-500" />
          Timesheets
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track time spent on projects for billing and reporting</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Entries</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{timesheets.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Hours</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Number(totalHours ?? 0).toFixed(1)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Billable Hours</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{Number(billableHours ?? 0).toFixed(1)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Billing</div>
          <div className="text-2xl font-bold text-orange-600">
            R {Number(totalBilling ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search timesheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => { setEditingTimesheet(null); resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
          >
            <Plus size={16} />
            Log Time
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hours</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTimesheets.map((timesheet) => (
                <tr key={timesheet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {new Date(timesheet.date).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{timesheet.project_name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{timesheet.employee_name || 'Current User'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {timesheet.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-gray-900 dark:text-white">{Number(timesheet.hours ?? 0).toFixed(1)}h</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {timesheet.billable ? (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        R {(timesheet.billing_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Non-billable</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[timesheet.status]}`}>
                      {timesheet.status}
                    </span>
                  </td>
                                    <td className="px-6 py-4 text-right">
                                      {timesheet.billable && timesheet.status !== 'invoiced' && (
                                        <button
                                          onClick={() => createInvoiceLine(timesheet)}
                                          className="text-green-600 dark:text-green-400 hover:text-green-900 mr-2"
                                          title="Create Invoice Line"
                                        >
                                          <FileText size={16} />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleEdit(timesheet)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100 mr-2"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(timesheet.id)}
                                        className="text-red-600 dark:text-red-400 hover:text-red-900"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTimesheets.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {searchTerm || filterProject || filterDate 
                ? 'No timesheets found matching your criteria' 
                : 'No timesheets yet. Log your first time entry!'}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700-xl w-full max-w-md p-4">
            <h2 className="text-xl font-bold mb-4">
              {editingTimesheet ? 'Edit Time Entry' : 'Log Time'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours *</label>
                  <input
                    type="number"
                    required
                    step="0.25"
                    min="0"
                    max="24"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="What did you work on?"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.billable}
                    onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">Billable</span>
                </label>
              </div>
              {formData.billable && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Rate (R/hour)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.billing_rate}
                    onChange={(e) => setFormData({ ...formData, billing_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  {formData.hours > 0 && formData.billing_rate > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Total: R {(formData.hours * formData.billing_rate).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingTimesheet(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingTimesheet ? 'Update' : 'Log'} Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
