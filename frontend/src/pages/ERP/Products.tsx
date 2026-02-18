import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Eye, Package, TrendingUp, X, BarChart3, RefreshCw, AlertCircle, CheckCircle, Tag } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  is_active: boolean;
  is_service: boolean;
  track_inventory: boolean;
  reorder_level?: number;
  reorder_quantity?: number;
  supplier_id?: string;
  supplier_name?: string;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductStats {
  total_stock_value: number;
  total_on_hand: number;
  low_stock_items: number;
  total_sales_ytd: number;
  total_purchases_ytd: number;
  avg_margin_percent: number;
}

interface StockLevel {
  warehouse_id: string;
  warehouse_name: string;
  location_code?: string;
  on_hand: number;
  allocated: number;
  available: number;
}

interface PriceHistory {
  id: string;
  effective_date: string;
  cost_price: number;
  selling_price: number;
  changed_by: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  
    const [formData, setFormData] = useState<Partial<Product>>({
      name: '', description: '', category: '', unit_of_measure: 'EA',
      cost_price: 0, selling_price: 0, tax_rate: 15, is_active: true,
      is_service: false, track_inventory: true, reorder_level: 0, reorder_quantity: 0
    });

  useEffect(() => {
    loadProducts();
    loadProductStats();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/order-to-cash/products');
      const data = response.data?.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load products:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadProductStats = async () => {
    try {
      const response = await api.get('/erp/order-to-cash/products/stats');
      setProductStats(response.data);
    } catch (err) {
      console.error('Failed to load product stats:', err);
      setProductStats(null);
    }
  };

  const loadProductDetails = async (productId: string) => {
    try {
      const stockResponse = await api.get(`/api/erp/order-to-cash/products/${productId}/stock-levels`);
      setStockLevels(stockResponse.data || []);
      const priceResponse = await api.get(`/api/erp/order-to-cash/products/${productId}/price-history`);
      setPriceHistory(priceResponse.data || []);
    } catch (err) {
      console.error('Failed to load product details:', err);
      setStockLevels([]);
      setPriceHistory([]);
    }
  };

    const handleCreate = () => {
      setFormData({
        name: '', description: '', category: '', unit_of_measure: 'EA',
        cost_price: 0, selling_price: 0, tax_rate: 15, is_active: true,
        is_service: false, track_inventory: true, reorder_level: 0, reorder_quantity: 0
      });
      setShowCreateModal(true);
    };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData(product);
    setShowEditModal(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const handleViewDetail = async (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
    await loadProductDetails(product.id);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    try {
      await api.delete(`/api/erp/order-to-cash/products/${selectedProduct.id}`);
      setShowDeleteDialog(false);
      setSelectedProduct(null);
      loadProducts();
      loadProductStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.unit_of_measure) {
        setError('Product name and unit of measure are required');
        return;
      }
      if (showEditModal && selectedProduct) {
        await api.put(`/api/erp/order-to-cash/products/${selectedProduct.id}`, formData);
      } else {
        await api.post('/erp/order-to-cash/products', formData);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedProduct(null);
      setError(null);
      loadProducts();
      loadProductStats();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save product');
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    inactive: products.filter(p => !p.is_active).length,
    avgMargin: products.length > 0 ? products.reduce((sum, p) => sum + (p.selling_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100) : 0), 0) / products.length : 0
  };

  const marginPercent = (product: Product) => {
    const sp = Number(product.selling_price) || 0;
    const cp = Number(product.cost_price) || 0;
    if (sp === 0) return 0;
    return ((sp - cp) / sp * 100);
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowCreateModal(false);
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Package className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-xl font-semibold">{isEdit ? 'Edit Product' : 'Create Product'}</h2>
                  <p className="text-white/80 text-sm">Fill in the product details</p>
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
                  <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs">1</span>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name *</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" placeholder="Enter product name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                    <input type="text" value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} list="category-suggestions" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" placeholder="e.g., Electronics > Laptops" />
                    <datalist id="category-suggestions">{categories.map(cat => (<option key={cat} value={cat} />))}</datalist>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                    <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none" placeholder="Enter product description" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit of Measure *</label>
                    <select value={formData.unit_of_measure || 'EA'} onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all">
                      <option value="EA">Each (EA)</option>
                      <option value="KG">Kilogram (KG)</option>
                      <option value="L">Liter (L)</option>
                      <option value="M">Meter (M)</option>
                      <option value="BOX">Box</option>
                      <option value="PACK">Pack</option>
                      <option value="CASE">Case</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Barcode</label>
                    <input type="text" value={formData.barcode || ''} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" placeholder="Enter barcode" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs">2</span>
                  Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost Price (R)</label>
                    <input type="number" value={formData.cost_price || 0} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })} step="0.01" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selling Price (R)</label>
                    <input type="number" value={formData.selling_price || 0} onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })} step="0.01" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Rate (%)</label>
                    <input type="number" value={formData.tax_rate || 15} onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })} step="0.01" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Margin</label>
                    <div className="px-4 py-3 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300">
                      {formData.selling_price && formData.cost_price ? `${Number(((formData.selling_price - formData.cost_price) / formData.selling_price * 100) || 0).toFixed(2)}%` : '0.00%'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs">3</span>
                  Inventory Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reorder Level</label>
                    <input type="number" value={formData.reorder_level || 0} onChange={(e) => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) })} step="1" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reorder Quantity</label>
                    <input type="number" value={formData.reorder_quantity || 0} onChange={(e) => setFormData({ ...formData, reorder_quantity: parseFloat(e.target.value) })} step="1" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" />
                  </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Type</label>
                                      <div className="flex gap-3">
                                        <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${!formData.is_service ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                                          <input type="radio" name="item_type" checked={!formData.is_service} onChange={() => setFormData({ ...formData, is_service: false, track_inventory: true })} className="w-5 h-5 text-rose-600 border-gray-300 focus:ring-rose-500" />
                                          <div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">Stock Item</span>
                                            <p className="text-xs text-gray-500 dark:text-gray-300">Physical inventory that is tracked</p>
                                          </div>
                                        </label>
                                        <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.is_service ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                                          <input type="radio" name="item_type" checked={formData.is_service ?? false} onChange={() => setFormData({ ...formData, is_service: true, track_inventory: false })} className="w-5 h-5 text-rose-600 border-gray-300 focus:ring-rose-500" />
                                          <div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">Service Item</span>
                                            <p className="text-xs text-gray-500 dark:text-gray-300">Non-physical service or labor</p>
                                          </div>
                                        </label>
                                      </div>
                                    </div>
                                    <div className="md:col-span-2 flex flex-wrap gap-6">
                                      <label className={`flex items-center gap-3 cursor-pointer ${formData.is_service ? 'opacity-50' : ''}`}>
                                        <input type="checkbox" checked={formData.track_inventory ?? true} onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })} disabled={formData.is_service} className="w-5 h-5 text-rose-600 border-gray-300 rounded focus:ring-rose-500 disabled:opacity-50" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Track Inventory</span>
                                      </label>
                                      <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={formData.is_active ?? true} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 text-rose-600 border-gray-300 rounded focus:ring-rose-500" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Product</span>
                                      </label>
                                    </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-medium hover:from-rose-700 hover:to-pink-700 transition-all ">{isEdit ? 'Update Product' : 'Create Product'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedProduct || !showDetailModal) return null;

    const totalOnHand = stockLevels.reduce((sum, level) => sum + (level.on_hand || 0), 0);
    const totalAllocated = stockLevels.reduce((sum, level) => sum + (level.allocated || 0), 0);
    const totalAvailable = stockLevels.reduce((sum, level) => sum + (level.available || 0), 0);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedProduct.name}</h2>
                <p className="text-white/80 text-sm">{selectedProduct.code}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">On Hand</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{totalOnHand}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Allocated</div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">{totalAllocated}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">Available</div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{totalAvailable}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Margin</div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{marginPercent(selectedProduct).toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Product Details</h3>
                <div className="space-y-3">
                  <div><span className="text-xs text-gray-500 dark:text-gray-300">Category:</span><p className="font-medium text-gray-900 dark:text-white">{selectedProduct.category || '-'}</p></div>
                  <div><span className="text-xs text-gray-500 dark:text-gray-300">Unit:</span><p className="font-medium text-gray-900 dark:text-white">{selectedProduct.unit_of_measure}</p></div>
                  <div><span className="text-xs text-gray-500 dark:text-gray-300">Barcode:</span><p className="font-medium text-gray-900 dark:text-white">{selectedProduct.barcode || '-'}</p></div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Pricing</h3>
                <div className="space-y-3">
                  <div><span className="text-xs text-gray-500 dark:text-gray-300">Cost Price:</span><p className="font-medium text-gray-900 dark:text-white">R {Number(selectedProduct.cost_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                  <div><span className="text-xs text-gray-500 dark:text-gray-300">Selling Price:</span><p className="font-medium text-gray-900 dark:text-white">R {Number(selectedProduct.selling_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                  <div><span className="text-xs text-gray-500 dark:text-gray-300">Tax Rate:</span><p className="font-medium text-gray-900 dark:text-white">{selectedProduct.tax_rate}%</p></div>
                </div>
              </div>
            </div>

            {stockLevels.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Stock by Warehouse</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Warehouse</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">On Hand</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Allocated</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {stockLevels.map((level) => (
                        <tr key={level.warehouse_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{level.warehouse_name}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">{level.on_hand}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">{level.allocated}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">{level.available}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {priceHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Price History</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Cost</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Selling</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase">Changed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {priceHistory.map((history) => (
                        <tr key={history.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{(history.effective_date ? new Date(history.effective_date).toLocaleDateString() : "-")}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">R {Number(history.cost_price ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">R {Number(history.selling_price ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{history.changed_by}</td>
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
    <div className="bg-gradient-to-br from-gray-50 to-rose-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">Products</h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { loadProducts(); loadProductStats(); }} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-medium hover:from-rose-700 hover:to-pink-700 transition-all ">
              <Plus className="h-5 w-5" />New Product
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
              <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl "><Package className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p><p className="text-xs text-gray-500 dark:text-gray-300">Total Products</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl "><CheckCircle className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.active}</p><p className="text-xs text-gray-500 dark:text-gray-300">Active</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl "><Tag className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{categories.length}</p><p className="text-xs text-gray-500 dark:text-gray-300">Categories</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl "><TrendingUp className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold text-gray-900 dark:text-white">{Number(stats.avgMargin ?? 0).toFixed(1)}%</p><p className="text-xs text-gray-500 dark:text-gray-300">Avg Margin</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input type="text" placeholder="Search by name, code, or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" />
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all min-w-[160px]">
                <option value="all">All Categories</option>
                {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all min-w-[140px]">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-rose-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-300">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package className="h-8 w-8 text-gray-300" /></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
              <p className="text-gray-500 dark:text-gray-300 mb-6">{searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first product'}</p>
              {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                <button onClick={handleCreate} className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-medium hover:from-rose-700 hover:to-pink-700 transition-all">Add First Product</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Selling</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Margin</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div><p className="font-semibold text-gray-900 dark:text-white">{product.name}</p><p className="text-xs text-gray-500 dark:text-gray-300">{product.code}</p></div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{product.category || '-'}</td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">R {Number(product.cost_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">R {Number(product.selling_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${marginPercent(product) >= 30 ? 'text-green-600 dark:text-green-400' : marginPercent(product) >= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{marginPercent(product).toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>{product.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleViewDetail(product)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => handleEdit(product)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(product)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
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

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title="Delete Product" message={`Are you sure you want to delete ${selectedProduct?.name}? This action cannot be undone.`} confirmText="Delete" variant="danger" />
    </div>
  );
}
