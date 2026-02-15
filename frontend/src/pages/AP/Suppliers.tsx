import { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Search, Edit, Trash2, Mail, Phone, Award } from 'lucide-react';
import api from '../../lib/api';

interface Supplier {
  id: string;
  code: string;
  name: string;
  supplier_type: string;
  email?: string;
  phone?: string;
  vat_number?: string;
  bbbee_level?: string;
  bbbee_certificate_number?: string;
  bbbee_expiry_date?: string;
  is_active: boolean;
  created_at: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    supplier_type: 'manufacturer',
    email: '',
    phone: '',
    vat_number: '',
    bbbee_level: '',
    bbbee_certificate_number: '',
    bbbee_expiry_date: ''
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (showForm && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [showForm]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/master-data/suppliers');
      const data = response.data?.data || response.data || [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const cleanedData = {
        ...formData,
        bbbee_certificate_expiry: formData.bbbee_certificate_expiry && formData.bbbee_certificate_expiry.trim() !== '' 
          ? formData.bbbee_certificate_expiry 
          : undefined
      };
      
      if (editingSupplier) {
        await api.put(`/erp/master-data/suppliers/${editingSupplier.id}`, cleanedData);
      } else {
        await api.post('/erp/master-data/suppliers', cleanedData);
      }
      setShowForm(false);
      setEditingSupplier(null);
      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error saving supplier. Please try again.');
    }
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowForm(false);
      setEditingSupplier(null);
      resetForm();
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      supplier_type: supplier.supplier_type,
      email: supplier.email || '',
      phone: supplier.phone || '',
      vat_number: supplier.vat_number || '',
      bbbee_level: supplier.bbbee_level || '',
      bbbee_certificate_number: supplier.bbbee_certificate_number || '',
      bbbee_expiry_date: supplier.bbbee_expiry_date || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await api.delete(`/erp/master-data/suppliers/${id}`);
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error deleting supplier. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      supplier_type: 'manufacturer',
      email: '',
      phone: '',
      vat_number: '',
      bbbee_level: '',
      bbbee_certificate_number: '',
      bbbee_expiry_date: ''
    });
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getBBBEEBadge = (level?: string) => {
    if (!level) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    const levelNum = parseInt(level.replace('level_', ''));
    if (levelNum <= 2) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (levelNum <= 4) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (levelNum <= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-gray-800 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl ">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            Suppliers
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage supplier master data and BBBEE compliance</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            resetForm();
            setShowForm(true);
          }}
          className="px-6 py-2.5 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl hover:from-slate-600 hover:to-gray-700 transition-all  flex items-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          Add Supplier
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl ">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{suppliers.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Suppliers</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl ">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{suppliers.filter(s => s.is_active).length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Suppliers</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl ">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{suppliers.filter(s => s.bbbee_level).length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">BBBEE Compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditingSupplier(null);
              resetForm();
            }
          }}
        >
          <div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onKeyDown={handleModalKeyDown}
            className="bg-white dark:bg-gray-800 rounded-2xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-r from-slate-500 to-gray-600 px-6 py-4">
              <h2 id="modal-title" className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supplier Code *
                  </label>
                  <input
                    ref={firstFocusableRef}
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier Type
                </label>
                <select
                  value={formData.supplier_type}
                  onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                >
                  <option value="manufacturer">Manufacturer</option>
                  <option value="distributor">Distributor</option>
                  <option value="service_provider">Service Provider</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  BBBEE Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      BBBEE Level
                    </label>
                    <select
                      value={formData.bbbee_level}
                      onChange={(e) => setFormData({ ...formData, bbbee_level: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    >
                      <option value="">Not Specified</option>
                      <option value="level_1">Level 1 (135%)</option>
                      <option value="level_2">Level 2 (125%)</option>
                      <option value="level_3">Level 3 (110%)</option>
                      <option value="level_4">Level 4 (100%)</option>
                      <option value="level_5">Level 5 (80%)</option>
                      <option value="level_6">Level 6 (60%)</option>
                      <option value="level_7">Level 7 (50%)</option>
                      <option value="level_8">Level 8 (10%)</option>
                      <option value="non_compliant">Non-Compliant (0%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Certificate Expiry
                    </label>
                    <input
                      type="date"
                      value={formData.bbbee_expiry_date}
                      onChange={(e) => setFormData({ ...formData, bbbee_expiry_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl font-medium hover:from-slate-600 hover:to-gray-700 transition-all "
                >
                  {editingSupplier ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No suppliers found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {searchTerm ? 'Try adjusting your search' : 'Start by adding your first supplier'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">BBBEE</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{supplier.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{supplier.name}</div>
                    {supplier.vat_number && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">VAT: {supplier.vat_number}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">
                    {supplier.supplier_type.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4">
                    {supplier.email && (
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-300">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-300">{supplier.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {supplier.bbbee_level ? (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getBBBEEBadge(supplier.bbbee_level)}`}>
                        {supplier.bbbee_level.replace('_', ' ').replace('level ', 'Level ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      supplier.is_active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {supplier.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
        )}
      </div>
    </div>
  );
}
