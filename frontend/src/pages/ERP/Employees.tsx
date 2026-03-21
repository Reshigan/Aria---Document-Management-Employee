import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Search, Eye, Edit, Users, X, RefreshCw, AlertCircle, UserCheck, UserX, Clock, Briefcase, DollarSign } from 'lucide-react';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  hire_date: string;
  status: string;
  basic_salary?: number;
  date_of_birth?: string;
  id_number?: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hire_date: new Date().toISOString().split('T')[0],
    basic_salary: 0
  });

  useEffect(() => {
    loadEmployees();
  }, [searchTerm, statusFilter]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/erp/payroll/employees', { params });
      const d = response.data;
      setEmployees(Array.isArray(d) ? d : d.employees || d.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading employees:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      hire_date: new Date().toISOString().split('T')[0],
      basic_salary: 0
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      setError('Please enter first and last name');
      return;
    }
    try {
      await api.post('/erp/payroll/employees', formData);
      setShowCreateModal(false);
      loadEmployees();
      setError(null);
    } catch (err: unknown) {
      console.error('Error creating employee:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to create employee');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      INACTIVE: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
      ON_LEAVE: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      TERMINATED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return styles[status] || styles.INACTIVE;
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchTerm || 
      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'ACTIVE').length,
    on_leave: employees.filter(e => e.status === 'ON_LEAVE').length,
    inactive: employees.filter(e => e.status === 'INACTIVE').length,
    terminated: employees.filter(e => e.status === 'TERMINATED').length,
    totalSalary: employees.filter(e => e.status === 'ACTIVE').reduce((sum, e) => sum + (e.basic_salary || 0), 0)
  };

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Users className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-semibold">Add Employee</h2>
                  <p className="text-white/80 text-sm">Enter employee details</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-3">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 text-sm font-semibold">1</span>
                  <h3 className="font-semibold">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name *</label>
                    <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name *</label>
                    <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" placeholder="Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" placeholder="john.doe@company.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" placeholder="+27 12 345 6789" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 text-sm font-semibold">2</span>
                  <h3 className="font-semibold">Employment Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department</label>
                    <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" placeholder="Engineering" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position</label>
                    <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" placeholder="Software Developer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hire Date</label>
                    <input type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Basic Salary (R)</label>
                    <input type="number" min="0" value={formData.basic_salary} onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" placeholder="25000" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all ">Add Employee</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Employees</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage employee records and HR information</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadEmployees()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all ">
              <Plus className="h-5 w-5" />Add Employee
            </button>
          </div>
        </div>

        {error && !showCreateModal && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl "><Users className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Employees</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><UserCheck className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-300">Active</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Clock className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.on_leave}</p><p className="text-xs text-gray-500 dark:text-gray-300">On Leave</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl "><UserX className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.inactive + stats.terminated}</p><p className="text-xs text-gray-500 dark:text-gray-300">Inactive</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl "><DollarSign className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">R {Number((stats.totalSalary / 1000) || 0).toFixed(0)}k</p><p className="text-xs text-gray-500 dark:text-gray-300">Monthly Payroll</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input type="text" placeholder="Search by name, employee number, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all min-w-[150px]">
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-300">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="h-8 w-8 text-gray-300" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No employees found</h3>
              <p className="text-gray-500 dark:text-gray-300 mb-6">{searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by adding your first employee'}</p>
              {!searchTerm && !statusFilter && (
                <button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all">Add First Employee</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Employee #</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hire Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-violet-600 dark:text-violet-400">{emp.employee_number}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">{emp.first_name[0]}{emp.last_name[0]}</div>
                          <span className="text-gray-900 dark:text-white font-medium">{emp.first_name} {emp.last_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{emp.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{emp.department || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{emp.position || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{(emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : "-")}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(emp.status)}`}>{emp.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                          <button className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {renderCreateModal()}
    </div>
  );
}
