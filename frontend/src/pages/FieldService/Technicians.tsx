import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, CheckCircle, Clock, UserX, X } from 'lucide-react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface Technician {
  id: number;
  employee_number: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  status: 'AVAILABLE' | 'ON_JOB' | 'OFF_DUTY';
  active_orders: number;
  completed_orders: number;
}

const Technicians: React.FC = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [form, setForm] = useState({
    employee_number: '',
    name: '',
    email: '',
    phone: '',
    specialization: '',
    status: 'AVAILABLE' as 'AVAILABLE' | 'ON_JOB' | 'OFF_DUTY'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number; name: string }>({
    show: false,
    id: 0,
    name: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/field-service/technicians');
      setTechnicians(response.data.technicians || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load technicians');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTech(null);
    setForm({
      employee_number: '',
      name: '',
      email: '',
      phone: '',
      specialization: '',
      status: 'AVAILABLE'
    });
    setShowModal(true);
  };

  const handleEdit = (tech: Technician) => {
    setEditingTech(tech);
    setForm({
      employee_number: tech.employee_number,
      name: tech.name,
      email: tech.email,
      phone: tech.phone,
      specialization: tech.specialization,
      status: tech.status
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      if (editingTech) {
        await api.put(`/field-service/technicians/${editingTech.id}`, form);
      } else {
        await api.post('/field-service/technicians', form);
      }
      setShowModal(false);
      loadTechnicians();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save technician');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/field-service/technicians/${id}`);
      loadTechnicians();
      setDeleteConfirm({ show: false, id: 0, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete technician');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      AVAILABLE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      ON_JOB: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      OFF_DUTY: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status] || styles.OFF_DUTY}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading && technicians.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading technicians...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 lg:p-8" data-testid="field-service-technicians">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg shadow-teal-500/30">
            <Users className="h-7 w-7 text-white" />
          </div>
          Technicians
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage field service technicians and their assignments</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all duration-200"
          data-testid="create-button"
        >
          <Plus className="h-5 w-5" />
          New Technician
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/30">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{technicians.filter(t => t.status === 'AVAILABLE').length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{technicians.filter(t => t.status === 'ON_JOB').length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">On Job</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg shadow-teal-500/30">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{technicians.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Technicians</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="technicians-table">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee #</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Specialization</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Orders</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {technicians.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <UserX className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No technicians found</p>
                  </td>
                </tr>
              ) : (
                technicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{tech.employee_number}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{tech.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{tech.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{tech.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{tech.specialization}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{tech.active_orders}</td>
                    <td className="px-6 py-4">{getStatusBadge(tech.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(tech)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors mr-1"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ show: true, id: tech.id, name: tech.name })}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Users className="h-6 w-6" />
                {editingTech ? 'Edit Technician' : 'New Technician'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Employee Number *</label>
                  <input
                    type="text"
                    value={form.employee_number}
                    onChange={(e) => setForm({ ...form, employee_number: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Specialization *</label>
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_JOB">On Job</option>
                    <option value="OFF_DUTY">Off Duty</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Delete Technician"
        message={`Are you sure you want to delete technician ${deleteConfirm.name}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ show: false, id: 0, name: '' })}
      />
    </div>
  );
};

export default Technicians;
