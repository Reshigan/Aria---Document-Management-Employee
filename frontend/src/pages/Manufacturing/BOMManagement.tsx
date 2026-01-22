import React, { useState, useEffect } from 'react';
import { Plus, Package, Edit, Trash2, X } from 'lucide-react';

interface BOMItem {
  material_id: string;
  material_name: string;
  quantity: number;
  unit: string;
}

interface BOM {
  bom_id: string;
  product_id: string;
  product_name: string;
  version: string;
  items: BOMItem[];
  is_active: boolean;
}

interface FormData {
  product_name: string;
  version: string;
  items: BOMItem[];
}

const BOMManagement: React.FC = () => {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);
  const [formData, setFormData] = useState<FormData>({
    product_name: '',
    version: '1.0',
    items: [{ material_id: '', material_name: '', quantity: 1, unit: 'pcs' }]
  });
  const [error, setError] = useState<string | null>(null);

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
      items: [{ material_id: '', material_name: '', quantity: 1, unit: 'pcs' }]
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
      items: bom.items?.length > 0 ? bom.items : [{ material_id: '', material_name: '', quantity: 1, unit: 'pcs' }]
    });
    setShowModal(true);
  };

  const handleDelete = async (bomId: string) => {
    if (!confirm('Are you sure you want to delete this BOM?')) return;
    try {
      await fetch(`https://aria.vantax.co.za/api/erp/manufacturing/bom/${bomId}`, {
        method: 'DELETE'
      });
      fetchBOMs();
    } catch (error) {
      setError('Failed to delete BOM');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBom 
        ? `https://aria.vantax.co.za/api/erp/manufacturing/bom/${editingBom.bom_id}`
        : 'https://aria.vantax.co.za/api/erp/manufacturing/bom';
      const method = editingBom ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      setShowModal(false);
      resetForm();
      fetchBOMs();
    } catch (error) {
      setError('Failed to save BOM');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { material_id: '', material_name: '', quantity: 1, unit: 'pcs' }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: keyof BOMItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bill of Materials (BOM)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage product BOMs and material requirements</p>
          </div>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Create BOM
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button onClick={() => setError(null)} className="float-right">&times;</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total BOMs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{boms.length}</p>
              </div>
              <Package className="text-blue-600" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">BOM ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                ) : boms.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">No BOMs found</td></tr>
                ) : (
                  boms.map((bom) => (
                    <tr key={bom.bom_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">{bom.bom_id}</td>
                      <td className="px-6 py-4 text-sm">{bom.product_name}</td>
                      <td className="px-6 py-4 text-sm">{bom.version}</td>
                      <td className="px-6 py-4 text-sm">{bom.items?.length || 0}</td>
                      <td className="px-6 py-4 text-sm">
                        <button onClick={() => handleEdit(bom)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(bom.bom_id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingBom ? 'Edit BOM' : 'Create BOM'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
