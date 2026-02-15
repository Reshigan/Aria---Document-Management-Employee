import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Plus, Search, Edit, Trash2, Eye, DollarSign, Users, Package, X } from 'lucide-react';

interface PriceList {
  id: string;
  name: string;
  description?: string;
  type: 'standard' | 'customer' | 'customer_group' | 'promotional' | 'volume';
  customer_id?: string;
  customer_name?: string;
  customer_group_id?: string;
  customer_group_name?: string;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

interface PriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  unit_price: number;
  min_quantity?: number;
  max_quantity?: number;
  discount_percent?: number;
}

interface Customer {
  id: string;
  code: string;
  name: string;
  parent_customer_id?: string;
  parent_customer_name?: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
}

export default function PriceLists() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<PriceList>>({
    name: '',
    description: '',
    type: 'standard',
    valid_from: new Date().toISOString().split('T')[0],
    is_active: true,
    priority: 1
  });

  const [itemFormData, setItemFormData] = useState<Partial<PriceListItem>>({
    product_id: '',
    unit_price: 0,
    min_quantity: 1,
    discount_percent: 0
  });

  useEffect(() => {
    loadPriceLists();
    loadMasterData();
  }, []);

  const loadPriceLists = async () => {
    try {
      setLoading(true);
      const response = await api.get('/erp/master-data/price-lists');
      setPriceLists(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load price lists:', error);
      setError(error.response?.data?.detail || 'Failed to load price lists');
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        api.get('/erp/master-data/customers'),
        api.get('/erp/order-to-cash/products')
      ]);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
    } catch (error: any) {
      console.error('Failed to load master data:', error);
    }
  };

  const loadPriceListItems = async (priceListId: string) => {
    try {
      const response = await api.get(`/api/erp/master-data/price-lists/${priceListId}/items`);
      setPriceListItems(response.data || []);
    } catch (error: any) {
      console.error('Failed to load price list items:', error);
      setPriceListItems([]);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      type: 'standard',
      valid_from: new Date().toISOString().split('T')[0],
      is_active: true,
      priority: 1
    });
    setShowCreateModal(true);
  };

  const handleEdit = (priceList: PriceList) => {
    setSelectedPriceList(priceList);
    setFormData(priceList);
    setShowEditModal(true);
  };

  const handleDelete = (priceList: PriceList) => {
    setSelectedPriceList(priceList);
    setShowDeleteDialog(true);
  };

  const handleViewDetail = async (priceList: PriceList) => {
    setSelectedPriceList(priceList);
    setShowDetailModal(true);
    await loadPriceListItems(priceList.id);
  };

  const confirmDelete = async () => {
    if (!selectedPriceList) return;
    
    try {
      await api.delete(`/api/erp/master-data/price-lists/${selectedPriceList.id}`);
      setShowDeleteDialog(false);
      setSelectedPriceList(null);
      loadPriceLists();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete price list');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.valid_from) {
        setError('Price list name and valid from date are required');
        return;
      }

      if (showEditModal && selectedPriceList) {
        await api.put(`/api/erp/master-data/price-lists/${selectedPriceList.id}`, formData);
      } else {
        await api.post('/erp/master-data/price-lists', formData);
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedPriceList(null);
      setError(null);
      loadPriceLists();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to save price list');
    }
  };

  const handleAddItem = async () => {
    if (!selectedPriceList || !itemFormData.product_id) {
      setError('Please select a product');
      return;
    }

    try {
      await api.post(`/api/erp/master-data/price-lists/${selectedPriceList.id}/items`, itemFormData);
      setItemFormData({
        product_id: '',
        unit_price: 0,
        min_quantity: 1,
        discount_percent: 0
      });
      await loadPriceListItems(selectedPriceList.id);
      setError(null);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedPriceList) return;

    try {
      await api.delete(`/api/erp/master-data/price-lists/${selectedPriceList.id}/items/${itemId}`);
      await loadPriceListItems(selectedPriceList.id);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to delete item');
    }
  };

  const filteredPriceLists = priceLists.filter(priceList => {
    const matchesSearch = 
      priceList.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (priceList.description && priceList.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (priceList.customer_name && priceList.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = 
      typeFilter === 'all' || priceList.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const activePriceLists = priceLists.filter(p => p.is_active).length;
  const inactivePriceLists = priceLists.filter(p => !p.is_active).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer': return <Users className="w-4 h-4" />;
      case 'customer_group': return <Users className="w-4 h-4" />;
      case 'promotional': return <DollarSign className="w-4 h-4" />;
      case 'volume': return <Package className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'customer_group': return 'bg-purple-100 text-purple-800';
      case 'promotional': return 'bg-green-100 text-green-800';
      case 'volume': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderFormModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {showEditModal ? 'Edit Price List' : 'Create New Price List'}
          </h2>
        </div>

        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price List Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter price list name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type *
              </label>
              <select
                value={formData.type || 'standard'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              >
                <option value="standard">Standard</option>
                <option value="customer">Customer-Specific</option>
                <option value="customer_group">Customer Group</option>
                <option value="promotional">Promotional</option>
                <option value="volume">Volume-Based</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter description"
                rows={3}
              />
            </div>

            {(formData.type === 'customer' || formData.type === 'customer_group') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {formData.type === 'customer' ? 'Customer' : 'Customer Group (Parent Customer)'}
                </label>
                <select
                  value={formData.customer_id || ''}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">Select customer...</option>
                  {customers
                    .filter(c => formData.type === 'customer_group' ? !c.parent_customer_id : true)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                        {c.parent_customer_name && ` (Group: ${c.parent_customer_name})`}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Validity Period</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valid From *
              </label>
              <input
                type="date"
                value={formData.valid_from || ''}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valid To (Optional)
              </label>
              <input
                type="date"
                value={formData.valid_to || ''}
                onChange={(e) => setFormData({ ...formData, valid_to: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority (1 = Highest)
              </label>
              <input
                type="number"
                value={formData.priority || 1}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                min="1"
                max="100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Price List</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedPriceList(null);
              setError(null);
            }}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showEditModal ? 'Update Price List' : 'Create Price List'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDetailModal = () => {
    if (!selectedPriceList) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{selectedPriceList.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedPriceList.type.charAt(0).toUpperCase() + selectedPriceList.type.slice(1)} Price List
              </p>
            </div>
            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedPriceList(null);
                setPriceListItems([]);
              }}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Price List Details</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(selectedPriceList.type)}`}>
                        {selectedPriceList.type.charAt(0).toUpperCase() + selectedPriceList.type.slice(1)}
                      </span>
                    </dd>
                  </div>
                  {selectedPriceList.customer_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</dt>
                      <dd className="text-sm text-gray-900 dark:text-white">{selectedPriceList.customer_name}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Valid From</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{new Date(selectedPriceList.valid_from).toLocaleDateString('en-ZA')}</dd>
                  </div>
                  {selectedPriceList.valid_to && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Valid To</dt>
                      <dd className="text-sm text-gray-900 dark:text-white">{new Date(selectedPriceList.valid_to).toLocaleDateString('en-ZA')}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{selectedPriceList.priority}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedPriceList.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPriceList.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Price List Item</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                    <select
                      value={itemFormData.product_id || ''}
                      onChange={(e) => {
                        const product = products.find(p => p.id === e.target.value);
                        setItemFormData({ 
                          ...itemFormData, 
                          product_id: e.target.value,
                          unit_price: product?.selling_price || 0
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <option value="">Select product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name} (R {Number(p.selling_price ?? 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (R)</label>
                      <input
                        type="number"
                        value={itemFormData.unit_price || 0}
                        onChange={(e) => setItemFormData({ ...itemFormData, unit_price: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Qty</label>
                      <input
                        type="number"
                        value={itemFormData.min_quantity || 1}
                        onChange={(e) => setItemFormData({ ...itemFormData, min_quantity: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        min="1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                    <input
                      type="number"
                      value={itemFormData.discount_percent || 0}
                      onChange={(e) => setItemFormData({ ...itemFormData, discount_percent: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                  <button
                    onClick={handleAddItem}
                    className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Price List Items ({priceListItems.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Min Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Discount %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {priceListItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No items in this price list
                        </td>
                      </tr>
                    ) : (
                      priceListItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {item.product_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            R {Number(item.unit_price ?? 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.min_quantity || 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.discount_percent ? `${item.discount_percent}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              onClick={() => handleEdit(selectedPriceList)}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Price List</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading price lists...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Price Lists</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage pricing by customer, customer group, or promotional campaigns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Price Lists</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mt-1">{priceLists.length}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Price Lists</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{activePriceLists}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inactive Price Lists</p>
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400 mt-1">{inactivePriceLists}</p>
            </div>
            <DollarSign className="w-8 h-8 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, description, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="customer">Customer-Specific</option>
              <option value="customer_group">Customer Group</option>
              <option value="promotional">Promotional</option>
              <option value="volume">Volume-Based</option>
            </select>

            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Price List</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valid From</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valid To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPriceLists.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No price lists found
                </td>
              </tr>
            ) : (
              filteredPriceLists.map((priceList) => (
                <tr key={priceList.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {priceList.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(priceList.type)}`}>
                      {priceList.type.charAt(0).toUpperCase() + priceList.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {priceList.customer_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(priceList.valid_from).toLocaleDateString('en-ZA')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {priceList.valid_to ? new Date(priceList.valid_to).toLocaleDateString('en-ZA') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {priceList.priority}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      priceList.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {priceList.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetail(priceList)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(priceList)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(priceList)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(showCreateModal || showEditModal) && renderFormModal()}
      {showDetailModal && renderDetailModal()}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Price List"
          message={`Are you sure you want to delete ${selectedPriceList?.name}? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => {
            setShowDeleteDialog(false);
            setSelectedPriceList(null);
          }}
        />
      )}
    </div>
  );
}
