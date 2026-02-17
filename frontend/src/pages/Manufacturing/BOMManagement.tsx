import React, { useState, useEffect } from 'react';
import { Plus, Package, Edit, Trash2, X, CheckCircle, XCircle, Copy, Play, AlertTriangle, DollarSign, Layers, Clock, FileText } from 'lucide-react';

interface BOMItem {
  material_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

interface BOM {
  bom_id: string;
  product_id: string;
  product_name: string;
  version: string;
  status: 'draft' | 'approved' | 'active' | 'obsolete';
  items: BOMItem[];
  is_active: boolean;
  total_cost: number;
  created_at: string;
  updated_at: string;
  notes: string;
}

interface FormData {
  product_name: string;
  version: string;
  status: string;
  notes: string;
  items: BOMItem[];
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    obsolete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  return colors[status] || colors.draft;
};

const BOMManagement: React.FC = () => {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);
  const [formData, setFormData] = useState<FormData>({
    product_name: '',
    version: '1.0',
    status: 'draft',
    notes: '',
    items: [{ material_id: '', material_name: '', quantity: 1, unit: 'pcs', unit_cost: 0, total_cost: 0 }]
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchBOMs();
  }, []);

  const fetchBOMs = async () => {
    try {
      const response = await fetch('https://aria.vantax.co.za/api/erp/manufacturing/bom');
      const data = await response.json();
      setBOMs(data.boms || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      version: '1.0',
      status: 'draft',
      notes: '',
      items: [{ material_id: '', material_name: '', quantity: 1, unit: 'pcs', unit_cost: 0, total_cost: 0 }]
    });
    setEditingBom(null);
    setError(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (bom: BOM) => {
    setEditingBom(bom);
    setFormData({
      product_name: bom.product_name,
      version: bom.version,
      status: bom.status || 'draft',
      notes: bom.notes || '',
      items: bom.items?.length > 0 ? bom.items : [{ material_id: '', material_name: '', quantity: 1, unit: 'pcs', unit_cost: 0, total_cost: 0 }]
    });
    setShowModal(true);
  };

  const handleDelete = async (bomId: string) => {
    if (!confirm('Are you sure you want to delete this BOM?')) return;
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/manufacturing/bom/${bomId}`, {
        method: 'DELETE'
      });
      setSuccess('BOM deleted successfully');
      fetchBOMs();
    } catch (error) {
      setError('Failed to delete BOM');
    }
  };

  // Business Logic: Approve BOM (draft -> approved)
  const handleApprove = async (bom: BOM) => {
    if (bom.status !== 'draft') {
      setError('Only draft BOMs can be approved');
      return;
    }
    if (!bom.items || bom.items.length === 0) {
      setError('BOM must have at least one material item before approval');
      return;
    }
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/manufacturing/bom/${bom.bom_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bom, status: 'approved' })
      });
      setSuccess('BOM approved successfully');
      fetchBOMs();
    } catch (error) {
      setError('Failed to approve BOM');
    }
  };

  // Business Logic: Activate BOM (approved -> active)
  const handleActivate = async (bom: BOM) => {
    if (bom.status !== 'approved') {
      setError('Only approved BOMs can be activated');
      return;
    }
    // Deactivate any other active BOM for the same product
    const existingActive = boms.find(b => b.product_name === bom.product_name && b.status === 'active' && b.bom_id !== bom.bom_id);
    if (existingActive) {
      await fetch(`https://aria.vantax.co.za/api/erp/manufacturing/bom/${existingActive.bom_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...existingActive, status: 'obsolete' })
      });
    }
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/manufacturing/bom/${bom.bom_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bom, status: 'active', is_active: true })
      });
      setSuccess('BOM activated successfully. Previous active version marked as obsolete.');
      fetchBOMs();
    } catch (error) {
      setError('Failed to activate BOM');
    }
  };

  // Business Logic: Mark BOM as obsolete
  const handleObsolete = async (bom: BOM) => {
    if (!confirm('Are you sure you want to mark this BOM as obsolete? This cannot be undone.')) return;
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/manufacturing/bom/${bom.bom_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bom, status: 'obsolete', is_active: false })
      });
      setSuccess('BOM marked as obsolete');
      fetchBOMs();
    } catch (error) {
      setError('Failed to update BOM status');
    }
  };

  // Business Logic: Copy BOM to new version
  const handleCopyToNewVersion = async (bom: BOM) => {
    const currentVersion = parseFloat(bom.version) || 1.0;
    const newVersion = (currentVersion + 0.1).toFixed(1);
    try {
      await fetch('https://aria.vantax.co.za/api/erp/manufacturing/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: bom.product_name,
          product_id: bom.product_id,
          version: newVersion,
          status: 'draft',
          items: bom.items,
          notes: `Copied from version ${bom.version}`
        })
      });
      setSuccess(`New BOM version ${newVersion} created as draft`);
      fetchBOMs();
    } catch (error) {
      setError('Failed to copy BOM');
    }
  };

  // Business Logic: Create Work Order from BOM
  const handleCreateWorkOrder = async (bom: BOM) => {
    if (bom.status !== 'active') {
      setError('Only active BOMs can be used to create work orders');
      return;
    }
    try {
      await fetch('https://aria.vantax.co.za/api/erp/manufacturing/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bom_id: bom.bom_id,
          product_name: bom.product_name,
          quantity: 1,
          status: 'planned',
          priority: 'medium'
        })
      });
      setSuccess('Work order created successfully');
    } catch (error) {
      setError('Failed to create work order');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    if (!formData.product_name.trim()) {
      setError('Product name is required');
      return;
    }
    if (formData.items.length === 0 || !formData.items.some(item => item.material_name.trim())) {
      setError('At least one material item is required');
      return;
    }
    try {
      const url = editingBom 
        ? `https://aria.vantax.co.za/api/erp/manufacturing/bom/${editingBom.bom_id}`
        : 'https://aria.vantax.co.za/api/erp/manufacturing/bom';
      const method = editingBom ? 'PUT' : 'POST';
      
      // Calculate total cost
      const totalCost = formData.items.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0);
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, total_cost: totalCost })
      });
      
      setShowModal(false);
      resetForm();
      setSuccess(editingBom ? 'BOM updated successfully' : 'BOM created successfully');
      fetchBOMs();
    } catch (error) {
      setError('Failed to save BOM');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { material_id: '', material_name: '', quantity: 1, unit: 'pcs', unit_cost: 0, total_cost: 0 }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) {
      setError('BOM must have at least one material item');
      return;
    }
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: keyof BOMItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    // Auto-calculate total cost for the item
    if (field === 'quantity' || field === 'unit_cost') {
      newItems[index].total_cost = newItems[index].quantity * (newItems[index].unit_cost || 0);
    }
    setFormData({ ...formData, items: newItems });
  };

  // Calculate summary stats
  const stats = {
    total: boms.length,
    draft: boms.filter(b => b.status === 'draft').length,
    approved: boms.filter(b => b.status === 'approved').length,
    active: boms.filter(b => b.status === 'active').length,
    obsolete: boms.filter(b => b.status === 'obsolete').length,
  };

  // Filter BOMs
  const filteredBOMs = filter === 'all' ? boms : boms.filter(b => b.status === filter);

  // Calculate form total cost
  const formTotalCost = formData.items.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Bill of Materials (BOM)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage product BOMs, versions, and material requirements</p>
          </div>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700  transition-all"
          >
            <Plus size={20} />
            Create BOM
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} />
              {error}
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} />
              {success}
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">&times;</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <button onClick={() => setFilter('all')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'all' ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Layers className="text-blue-500" size={24} />
            </div>
          </button>
          <button onClick={() => setFilter('draft')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'draft' ? 'border-gray-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Draft</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.draft}</p>
              </div>
              <FileText className="text-gray-400" size={24} />
            </div>
          </button>
          <button onClick={() => setFilter('approved')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'approved' ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.approved}</p>
              </div>
              <CheckCircle className="text-blue-500" size={24} />
            </div>
          </button>
          <button onClick={() => setFilter('active')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'active' ? 'border-emerald-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
              </div>
              <Play className="text-emerald-500" size={24} />
            </div>
          </button>
          <button onClick={() => setFilter('obsolete')} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${filter === 'obsolete' ? 'border-red-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Obsolete</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.obsolete}</p>
              </div>
              <XCircle className="text-red-500" size={24} />
            </div>
          </button>
        </div>

        {/* BOM Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">BOM ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Version</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Items</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Cost</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td></tr>
                ) : filteredBOMs.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    No BOMs found {filter !== 'all' && `with status "${filter}"`}
                  </td></tr>
                ) : (
                  filteredBOMs.map((bom) => (
                    <tr key={bom.bom_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono">{bom.bom_id?.slice(0, 8) || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-medium">{bom.product_name}</td>
                      <td className="px-6 py-4 text-sm">v{bom.version}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bom.status || 'draft')}`}>
                          {bom.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{bom.items?.length || 0} items</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <span className="flex items-center gap-1">
                          <DollarSign size={14} className="text-gray-400" />
                          {(bom.total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(bom)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleCopyToNewVersion(bom)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Copy to New Version">
                            <Copy size={16} />
                          </button>
                          {bom.status === 'draft' && (
                            <button onClick={() => handleApprove(bom)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Approve">
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {bom.status === 'approved' && (
                            <button onClick={() => handleActivate(bom)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Activate">
                              <Play size={16} />
                            </button>
                          )}
                          {bom.status === 'active' && (
                            <>
                              <button onClick={() => handleCreateWorkOrder(bom)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Create Work Order">
                                <Package size={16} />
                              </button>
                              <button onClick={() => handleObsolete(bom)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Mark Obsolete">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          {(bom.status === 'draft' || bom.status === 'obsolete') && (
                            <button onClick={() => handleDelete(bom.bom_id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingBom ? 'Edit BOM' : 'Create BOM'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Materials</label>
                  <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-800 text-sm">+ Add Material</button>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Material Name"
                        value={item.material_name}
                        onChange={(e) => updateItem(index, 'material_name', e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="w-24 border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="pcs">pcs</option>
                        <option value="kg">kg</option>
                        <option value="m">m</option>
                        <option value="l">l</option>
                      </select>
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingBom ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOMManagement;
