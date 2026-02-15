import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Package, X, RefreshCw, AlertCircle, Warehouse, TrendingUp, AlertTriangle, ArrowUpDown } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
  created_at?: string;
}

interface StockOnHand {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  storage_location_id: string;
  location_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  last_movement_date: string;
}

interface WarehouseType {
  id: string;
  code: string;
  name: string;
}

interface StockMovement {
  id: string;
  movement_number: string;
  movement_type: string;
  product_code: string;
  product_name: string;
  quantity: number;
  from_location?: string;
  to_location?: string;
  movement_date: string;
  reference?: string;
}

export default function WMSStock() {
  const [activeTab, setActiveTab] = useState<'products' | 'stock' | 'movements'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockOnHand[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '', name: '', description: '', unit_of_measure: 'EA', cost_price: 0, selling_price: 0, is_active: true
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'products') loadProducts();
    else if (activeTab === 'stock') { loadStock(); loadWarehouses(); }
    else if (activeTab === 'movements') loadMovements();
  }, [activeTab, searchTerm, warehouseFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      const response = await api.get('/erp/order-to-cash/products', { params });
      const data = response.data?.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading products:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load products');
    } finally { setLoading(false); }
  };

  const loadStock = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      const response = await api.get('/erp/order-to-cash/stock-on-hand', { params });
      const data = response.data?.data || response.data || [];
      setStock(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading stock:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load stock');
    } finally { setLoading(false); }
  };

  const loadWarehouses = async () => {
    try {
      const response = await api.get('/erp/order-to-cash/warehouses');
      const data = response.data?.data || response.data || [];
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Error loading warehouses:', err); }
  };

  const loadMovements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/order-to-cash/stock-movements');
      const data = response.data?.data || response.data || [];
      setMovements(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Error loading movements:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load movements');
    } finally { setLoading(false); }
  };

  const handleCreate = () => {
    setFormData({ code: '', name: '', description: '', unit_of_measure: 'EA', cost_price: 0, selling_price: 0, is_active: true });
    setShowCreateModal(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({ code: product.code, name: product.name, description: product.description, unit_of_measure: product.unit_of_measure, cost_price: product.cost_price, selling_price: product.selling_price, is_active: product.is_active });
    setShowEditModal(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    try {
      await api.delete(`/erp/order-to-cash/products/${selectedProduct.id}`);
      loadProducts();
      setSelectedProduct(null);
    } catch (err: unknown) {
      console.error('Error deleting product:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) { setError('Please fill in all required fields'); return; }
    try {
      if (showEditModal && selectedProduct) await api.put(`/erp/order-to-cash/products/${selectedProduct.id}`, formData);
      else await api.post('/erp/order-to-cash/products', formData);
      loadProducts();
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedProduct(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Error saving product:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save product');
    }
  };

  const getTotalValue = () => stock.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    return sum + (item.quantity_on_hand * (product?.selling_price || 0));
  }, 0);

  const getLowStockCount = () => stock.filter(item => item.quantity_available < 10).length;

  const getMovementTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      receipt: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
      issue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      transfer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      adjustment: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return styles[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
  };

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.is_active).length,
    totalStock: stock.reduce((sum, s) => sum + s.quantity_on_hand, 0),
    lowStock: getLowStockCount(),
    totalValue: getTotalValue()
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Package className="h-6 w-6" /></div>
                <div><h2 className="text-xl font-semibold">{isEdit ? 'Edit Product' : 'Create Product'}</h2><p className="text-white/80 text-sm">Product details</p></div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p></div>)}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Code *</label><input type="text" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit of Measure *</label><select value={formData.unit_of_measure || 'EA'} onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"><option value="EA">Each (EA)</option><option value="KG">Kilogram (KG)</option><option value="L">Liter (L)</option><option value="M">Meter (M)</option><option value="BOX">Box</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name *</label><input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label><textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost Price</label><input type="number" min="0" step="0.01" value={formData.cost_price || 0} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selling Price *</label><input type="number" min="0" step="0.01" value={formData.selling_price || 0} onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.is_active || false} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span></label>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/30">{isEdit ? 'Update Product' : 'Create Product'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const getCreateButton = () => {
    if (activeTab === 'products') return <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/30"><Plus className="h-5 w-5" />New Product</button>;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">WMS - Inventory Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage products, stock levels, and inventory movements</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { if (activeTab === 'products') loadProducts(); else if (activeTab === 'stock') loadStock(); else loadMovements(); }} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700"><RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} /></button>
            {getCreateButton()}
          </div>
        </div>

        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500" /><p className="text-red-700 dark:text-red-300">{error}</p><button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><X className="h-4 w-4 text-red-500" /></button></div>)}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg shadow-teal-500/30"><Package className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30"><Warehouse className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(stats.totalStock ?? 0).toLocaleString()}</p><p className="text-sm text-gray-500 dark:text-gray-400">Total Stock</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"><AlertTriangle className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStock}</p><p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4"><div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/30"><TrendingUp className="h-6 w-6 text-white" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-white">R {Number(stats.totalValue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}</p><p className="text-sm text-gray-500 dark:text-gray-400">Stock Value</p></div></div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(['products', 'stock', 'movements'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium capitalize transition-all ${activeTab === tab ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>{tab === 'stock' ? 'Stock on Hand' : tab === 'movements' ? 'Stock Movements' : tab}</button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" /></div>
              {activeTab === 'stock' && (<select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all min-w-[180px]"><option value="">All Warehouses</option>{warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}</select>)}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>
          ) : activeTab === 'products' ? (
            products.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No products found</h3><p className="text-gray-500 dark:text-gray-400 mb-6">Get started by adding your first product</p><button onClick={handleCreate} className="px-5 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 transition-all">Add First Product</button></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">UOM</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selling</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-teal-600 dark:text-teal-400">{product.code}</td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{product.name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{product.unit_of_measure}</td>
                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">R {Number(product.cost_price ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {Number(product.selling_price ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${product.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>{product.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><button onClick={() => handleEdit(product)} className="p-2 hover:bg-teal-100 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button><button onClick={() => handleDelete(product)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'stock' ? (
            stock.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Warehouse className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No stock data</h3><p className="text-gray-500 dark:text-gray-400">No stock on hand to display</p></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Warehouse</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">On Hand</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reserved</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Available</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {stock.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4"><div><span className="font-semibold text-teal-600 dark:text-teal-400">{item.product_code}</span><p className="text-sm text-gray-500 dark:text-gray-400">{item.product_name}</p></div></td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{item.warehouse_name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.location_name}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{Number(item.quantity_on_hand ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-amber-600 dark:text-amber-400">{Number(item.quantity_reserved ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right"><span className={`font-semibold ${item.quantity_available < 10 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{Number(item.quantity_available ?? 0).toLocaleString()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            movements.length === 0 ? (<div className="p-12 text-center"><div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><ArrowUpDown className="h-8 w-8 text-gray-400" /></div><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No movements</h3><p className="text-gray-500 dark:text-gray-400">No stock movements to display</p></div>) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Movement #</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {movements.map(mov => (
                      <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-teal-600 dark:text-teal-400">{mov.movement_number}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border capitalize ${getMovementTypeBadge(mov.movement_type)}`}>{mov.movement_type}</span></td>
                        <td className="px-6 py-4"><div><span className="text-gray-900 dark:text-white">{mov.product_code}</span><p className="text-sm text-gray-500 dark:text-gray-400">{mov.product_name}</p></div></td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{Number(mov.quantity ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(mov.movement_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{mov.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {renderFormModal(false)}
      {renderFormModal(true)}
      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title="Delete Product" message={`Are you sure you want to delete ${selectedProduct?.name}? This action cannot be undone.`} confirmText="Delete" confirmVariant="danger" />
    </div>
  );
}
