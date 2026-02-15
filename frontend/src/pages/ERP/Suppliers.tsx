import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Eye, TrendingUp, X, Award, FileText, RefreshCw, AlertCircle, CheckCircle, Building2, Truck } from 'lucide-react';

interface Supplier {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  tax_number?: string;
  payment_terms?: string;
  bbbee_level?: number;
  bbbee_certificate_number?: string;
  bbbee_expiry_date?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SupplierTransaction {
  id: string;
  type: 'purchase_order' | 'receipt' | 'bill' | 'payment';
  number: string;
  date: string;
  amount: number;
  status: string;
}

interface SupplierStats {
  total_purchase_orders: number;
  total_bills: number;
  total_payments: number;
  total_spend_ytd: number;
  outstanding_balance: number;
  last_purchase_date?: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bbbeeFilter, setBbbeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierTransactions, setSupplierTransactions] = useState<SupplierTransaction[]>([]);
  const [supplierStats, setSupplierStats] = useState<SupplierStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', email: '', phone: '', address: '', city: '', postal_code: '',
    country: 'South Africa', tax_number: '', payment_terms: 'Net 30',
    bbbee_level: undefined, bbbee_certificate_number: '', bbbee_expiry_date: '', is_active: true
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/master-data/suppliers');
      const data = response.data?.data || response.data || [];
      setSuppliers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load suppliers:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierDetails = async (supplierId: string) => {
    try {
      const transactionsResponse = await api.get(`/api/erp/master-data/suppliers/${supplierId}/transactions`);
      setSupplierTransactions(transactionsResponse.data || []);
      const statsResponse = await api.get(`/api/erp/master-data/suppliers/${supplierId}/stats`);
      setSupplierStats(statsResponse.data || null);
    } catch (err) {
      console.error('Failed to load supplier details:', err);
      setSupplierTransactions([]);
      setSupplierStats(null);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '', email: '', phone: '', address: '', city: '', postal_code: '',
      country: 'South Africa', tax_number: '', payment_terms: 'Net 30',
      bbbee_level: undefined, bbbee_certificate_number: '', bbbee_expiry_date: '', is_active: true
    });
    setShowCreateModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData(supplier);
    setShowEditModal(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteDialog(true);
  };

  const handleViewDetail = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
    await loadSupplierDetails(supplier.id);
  };

  const confirmDelete = async () => {
    if (!selectedSupplier) return;
    try {
      await api.delete(`/api/erp/master-data/suppliers/${selectedSupplier.id}`);
      setShowDeleteDialog(false);
      setSelectedSupplier(null);
      loadSuppliers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete supplier');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.email) {
        setError('Supplier name and email are required');
        return;
      }
      if (showEditModal && selectedSupplier) {
        await api.put(`/api/erp/master-data/suppliers/${selectedSupplier.id}`, formData);
      } else {
        await api.post('/erp/master-data/suppliers', formData);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedSupplier(null);
      setError(null);
      loadSuppliers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.code && supplier.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBBBEE = bbbeeFilter === 'all' ||
      (bbbeeFilter === 'compliant' && supplier.bbbee_level && supplier.bbbee_level <= 4) ||
      (bbbeeFilter === 'non-compliant' && (!supplier.bbbee_level || supplier.bbbee_level > 4));
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && supplier.is_active) ||
      (statusFilter === 'inactive' && !supplier.is_active);
    return matchesSearch && matchesBBBEE && matchesStatus;
  });

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.is_active).length,
    inactive: suppliers.filter(s => !s.is_active).length,
    bbbeeCompliant: suppliers.filter(s => s.bbbee_level && s.bbbee_level <= 4).length
  };

  const getBBBEEBadge = (level?: number) => {
    if (!level) return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Not Rated</span>;
    if (level <= 2) return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Level {level}</span>;
    if (level <= 4) return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Level {level}</span>;
    if (level <= 6) return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Level {level}</span>;
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Level {level}</span>;
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Truck className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-semibold">{isEdit ? 'Edit Supplier' : 'Create Supplier'}</h2>
                  <p className="text-white/80 text-sm">Fill in the supplier details</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-4 space-y-3">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">1</span>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Supplier Name *</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="Enter supplier name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address *</label>
                    <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="supplier@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                    <input type="tel" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="+27 11 123 4567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">VAT/Tax Number</label>
                    <input type="text" value={formData.tax_number || ''} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="4123456789" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">2</span>
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Street Address</label>
                    <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="123 Main Street" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                    <input type="text" value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="Johannesburg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code</label>
                    <input type="text" value={formData.postal_code || ''} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="2000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                    <input type="text" value={formData.country || ''} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="South Africa" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">3</span>
                  BBBEE Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">BBBEE Level</label>
                    <select value={formData.bbbee_level || ''} onChange={(e) => setFormData({ ...formData, bbbee_level: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                      <option value="">Not Rated</option>
                      <option value="1">Level 1 (135%)</option>
                      <option value="2">Level 2 (125%)</option>
                      <option value="3">Level 3 (110%)</option>
                      <option value="4">Level 4 (100%)</option>
                      <option value="5">Level 5 (80%)</option>
                      <option value="6">Level 6 (60%)</option>
                      <option value="7">Level 7 (50%)</option>
                      <option value="8">Level 8 (10%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Certificate Number</label>
                    <input type="text" value={formData.bbbee_certificate_number || ''} onChange={(e) => setFormData({ ...formData, bbbee_certificate_number: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="Certificate number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiry Date</label>
                    <input type="date" value={formData.bbbee_expiry_date || ''} onChange={(e) => setFormData({ ...formData, bbbee_expiry_date: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">4</span>
                  Payment Terms
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Terms</label>
                    <select value={formData.payment_terms || 'Net 30'} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                      <option value="COD">Cash on Delivery</option>
                      <option value="Net 7">Net 7 Days</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Net 90">Net 90 Days</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formData.is_active ?? true} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Supplier</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all ">{isEdit ? 'Update Supplier' : 'Create Supplier'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedSupplier || !showDetailModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{selectedSupplier.name}</h2>
                  <p className="text-white/80 text-sm">{selectedSupplier.code}</p>
                </div>
                {getBBBEEBadge(selectedSupplier.bbbee_level)}
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {supplierStats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Purchase Orders</div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{supplierStats.total_purchase_orders}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">Total Bills</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{supplierStats.total_bills}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                  <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Payments</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{supplierStats.total_payments}</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">YTD Spend</div>
                  <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">R {Number(supplierStats.total_spend_ytd ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                  <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Outstanding</div>
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">R {Number(supplierStats.outstanding_balance ?? 0).toLocaleString()}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div><span className="text-xs text-gray-500 dark:text-gray-400">Email:</span><p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.email}</p></div>
                  <div><span className="text-xs text-gray-500 dark:text-gray-400">Phone:</span><p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.phone || '-'}</p></div>
                  <div><span className="text-xs text-gray-500 dark:text-gray-400">Address:</span><p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.address || '-'}, {selectedSupplier.city || ''} {selectedSupplier.postal_code || ''}</p></div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Payment & BBBEE</h3>
                <div className="space-y-3">
                  <div><span className="text-xs text-gray-500 dark:text-gray-400">Payment Terms:</span><p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.payment_terms || 'Net 30'}</p></div>
                  <div><span className="text-xs text-gray-500 dark:text-gray-400">BBBEE Level:</span><p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.bbbee_level ? `Level ${selectedSupplier.bbbee_level}` : 'Not Rated'}</p></div>
                  <div><span className="text-xs text-gray-500 dark:text-gray-400">VAT Number:</span><p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.tax_number || '-'}</p></div>
                </div>
              </div>
            </div>

            {supplierTransactions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Recent Transactions</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Number</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {supplierTransactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm capitalize text-gray-900 dark:text-white">{txn.type.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400">{txn.number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(txn.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">R {Number(txn.amount ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">{txn.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Suppliers</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your supplier database</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadSuppliers()} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all ">
              <Plus className="h-5 w-5" />New Supplier
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl "><Truck className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Suppliers</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-400">Active</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Award className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.bbbeeCompliant}</p><p className="text-xs text-gray-500 dark:text-gray-400">BBBEE Compliant</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl "><Building2 className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p><p className="text-xs text-gray-500 dark:text-gray-400">Inactive</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search by name, email, or code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
              </div>
              <select value={bbbeeFilter} onChange={(e) => setBbbeeFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-w-[160px]">
                <option value="all">All BBBEE</option>
                <option value="compliant">Compliant (1-4)</option>
                <option value="non-compliant">Non-Compliant</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-w-[140px]">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Truck className="h-8 w-8 text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No suppliers found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm || statusFilter !== 'all' || bbbeeFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first supplier'}</p>
              {!searchTerm && statusFilter === 'all' && bbbeeFilter === 'all' && (
                <button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all">Add First Supplier</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">BBBEE</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Terms</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div><p className="font-semibold text-gray-900 dark:text-white">{supplier.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{supplier.code}</p></div>
                      </td>
                      <td className="px-6 py-4">
                        <div><p className="text-gray-900 dark:text-white">{supplier.email}</p>{supplier.phone && (<p className="text-xs text-gray-500 dark:text-gray-400">{supplier.phone}</p>)}</div>
                      </td>
                      <td className="px-6 py-4">{getBBBEEBadge(supplier.bbbee_level)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{supplier.payment_terms || 'Net 30'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${supplier.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>{supplier.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleViewDetail(supplier)} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => handleEdit(supplier)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(supplier)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
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

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDetailModal()}

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title="Delete Supplier" message={`Are you sure you want to delete ${selectedSupplier?.name}? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  );
}
